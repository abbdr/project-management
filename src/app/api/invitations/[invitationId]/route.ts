import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInvitationSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

// PATCH - Accept or reject an invitation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find the invitation
    const invitation = await prisma.projectInvitation.findUnique({
      where: {
        id: invitationId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invitee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the invitee
    if (invitation.inviteeId !== userId) {
      return NextResponse.json(
        { error: "You can only respond to invitations sent to you" },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation has already been responded to" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = updateInvitationSchema.parse(body);

    if (action === "accept") {
      // Add user to project
      await prisma.projectMember.create({
        data: {
          userId: userId,
          projectId: invitation.projectId,
          role: "member",
        },
      });

      // Update invitation status
      await prisma.projectInvitation.update({
        where: {
          id: invitationId,
        },
        data: {
          status: "accepted",
        },
      });

      // Create notification for inviter
      await prisma.notification.create({
        data: {
          userId: invitation.inviterId,
          type: "invitation_accepted",
          title: "Invitation Accepted",
          message: `${invitation.invitee.name} accepted your invitation to join project "${invitation.project.name}"`,
          data: JSON.stringify({
            invitationId: invitationId,
            projectId: invitation.projectId,
            projectName: invitation.project.name,
            inviteeName: invitation.invitee.name,
          }),
        },
      });
    } else if (action === "reject") {
      // Update invitation status
      await prisma.projectInvitation.update({
        where: {
          id: invitationId,
        },
        data: {
          status: "rejected",
        },
      });

      // Create notification for inviter
      await prisma.notification.create({
        data: {
          userId: invitation.inviterId,
          type: "invitation_rejected",
          title: "Invitation Rejected",
          message: `${invitation.invitee.name} rejected your invitation to join project "${invitation.project.name}"`,
          data: JSON.stringify({
            invitationId: invitationId,
            projectId: invitation.projectId,
            projectName: invitation.project.name,
            inviteeName: invitation.invitee.name,
          }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
