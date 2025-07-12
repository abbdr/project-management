import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTaskSchema = z.object({
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  title: z.string().min(1, "Task title is required").optional(),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
});

// PATCH - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const { projectId, taskId } = await params;
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

    // Find the task to update
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: projectId,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData = updateTaskSchema.parse(body);

    // Check if user is owner or assigned member
    const isOwner = project.ownerId === userId;
    const isAssignedMember = task.assignedToId === userId;

    // Allow owners to edit any task, assigned members to edit only their assigned tasks
    if (!isOwner && !isAssignedMember) {
      return NextResponse.json(
        { error: "Only project owners and assigned members can edit tasks" },
        { status: 403 }
      );
    }

    // If user is assigned member, only allow status updates (not title, description, or assignee)
    if (isAssignedMember && !isOwner) {
      const allowedUpdates = ['status'];
      const attemptedUpdates = Object.keys(updateData);
      const hasUnauthorizedUpdates = attemptedUpdates.some(key => !allowedUpdates.includes(key));

      if (hasUnauthorizedUpdates) {
        return NextResponse.json(
          { error: "Assigned members can only update task status" },
          { status: 403 }
        );
      }
    }

    // Validate assignee if provided
    if (updateData.assignedToId) {
      const assignee = await prisma.projectMember.findFirst({
        where: {
          projectId: projectId,
          userId: updateData.assignedToId,
        },
      });

      if (!assignee) {
        return NextResponse.json(
          { error: "Assignee must be a project member" },
          { status: 400 }
        );
      }
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const { projectId, taskId } = await params;
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

    // Find the task to delete
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: projectId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Delete the task
    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    // Create notification for the assigned user if they exist
    if (task.assignedTo) {
      // Temporarily comment out notification creation to fix the issue
      // await prisma.notification.create({
      //   data: {
      //     userId: task.assignedTo.id,
      //     type: "task_deleted",
      //     title: "Task Deleted",
      //     message: `The task "${task.title}" has been deleted from project "${project.name}"`,
      //     data: JSON.stringify({
      //       projectId: projectId,
      //       projectName: project.name,
      //       taskId: taskId,
      //       taskTitle: task.title,
      //   }),
      //   },
      // });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
