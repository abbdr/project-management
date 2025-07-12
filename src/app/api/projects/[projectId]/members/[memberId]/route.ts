import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE - Remove a member from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  try {
    const { projectId, memberId } = await params;
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
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Find the member to remove
    const member = await prisma.projectMember.findFirst({
      where: {
        id: memberId,
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

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Remove the member
    await prisma.projectMember.delete({
      where: {
        id: memberId,
      },
    });

    // Create notification for the removed member
    await prisma.notification.create({
      data: {
        userId: member.user.id,
        type: "member_removed",
        title: "Removed from Project",
        message: `You have been removed from project "${project.name}"`,
        data: JSON.stringify({
          projectId: projectId,
          projectName: project.name,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
