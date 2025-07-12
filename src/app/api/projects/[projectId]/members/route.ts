import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// GET - Get all members of a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const members = await prisma.projectMember.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Send invitation to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is the owner of this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email } = inviteMemberSchema.parse(body);

    // Find user by email
    const userToInvite = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToInvite) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is trying to invite themselves
    if (userToInvite.id === userId) {
      return NextResponse.json(
        { error: "You cannot invite yourself to your own project" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: userToInvite.id,
          projectId: projectId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const existingPendingInvitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId: projectId,
        inviteeId: userToInvite.id,
        status: "pending",
      },
    });

    if (existingPendingInvitation) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this user" },
        { status: 400 }
      );
    }

    // Create invitation
    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId: projectId,
        inviterId: userId,
        inviteeId: userToInvite.id,
        status: "pending",
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
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

    // Create notification for invitee
    await prisma.notification.create({
      data: {
        userId: userToInvite.id,
        type: "invitation_received",
        title: "Project Invitation",
        message: `${project.owner.name} invited you to join project "${project.name}"`,
        data: JSON.stringify({
          invitationId: invitation.id,
          projectId: projectId,
          projectName: project.name,
          inviterName: project.owner.name,
        }),
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error sending invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
