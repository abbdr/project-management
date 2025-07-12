"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { use } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import Modal from "@/components/modal";
import TaskAnalytics from "@/components/task-analytics";
import ExportProject from "@/components/export-project";
import { realtimeService } from "@/lib/realtime";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import toast from "react-hot-toast";

// Helper function to format timestamps
const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 168) { // 7 days
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    role: string;
  }>;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSuggestions, setInviteSuggestions] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState<"todo" | "in-progress" | "done">("todo");
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>("");
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Fetch email suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inviteEmail.length < 2) {
        setInviteSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/users?query=${encodeURIComponent(inviteEmail)}`, {
          headers: { "x-user-id": session?.user?.id || "" },
        });
        if (res.ok) {
          const data = await res.json();
          setInviteSuggestions(data.map((u: any) => u.email));
        }
      } catch {}
    };
    fetchSuggestions();
  }, [inviteEmail, session]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
        },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (res.ok) {
        setInviteSuccess("Invitation sent successfully!");
        setInviteEmail("");
        setInviteSuggestions([]);
        toast.success("Invitation sent successfully!");
        // Close the modal after successful invitation
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteSuccess("");
          setInviteError("");
        }, 1500); // Show success message for 1.5 seconds then close
      } else {
        const data = await res.json();
        const errorMessage = data.error || "Failed to send invitation";
        setInviteError(errorMessage);
        toast.error(errorMessage);
      }
    } catch {
      const errorMessage = "An error occurred while inviting the member";
      setInviteError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchProjectAndTasks();

      // Connect to real-time service
      realtimeService.connect(id, session.user.id);

      // Set up real-time event listeners
      realtimeService.onTaskUpdate((updatedTask) => {
        setTasks(prev => prev.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        ));
      });

      realtimeService.onTaskCreated((newTask) => {
        setTasks(prev => [...prev, newTask]);
      });

      realtimeService.onTaskDeleted((taskId) => {
        setTasks(prev => prev.filter(task => task.id !== taskId));
      });

      realtimeService.onMemberUpdate((memberData) => {
        // Refresh project data to get updated member list
        fetchProjectAndTasks();
      });

      // Cleanup on unmount
      return () => {
        realtimeService.disconnect();
      };
    }
  }, [id, session]);

  const fetchProjectAndTasks = async () => {
    try {
      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${id}`, {
        headers: {
          "x-user-id": session?.user?.id || "",
        },
      });

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData);
        setHasAccess(true);
      } else if (projectResponse.status === 404 || projectResponse.status === 403) {
        setHasAccess(false);
        setProject(null);
        setTasks([]);
      } else {
        setError("Failed to fetch project");
        setHasAccess(false);
      }

      // Only fetch tasks if user has access to the project
      if (hasAccess !== false) {
        const tasksResponse = await fetch(`/api/projects/${id}/tasks`, {
          headers: {
            "x-user-id": session?.user?.id || "",
          },
        });

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData);
        } else {
          setError("Failed to fetch tasks");
        }
      }
    } catch (error) {
      setError("An error occurred while fetching project data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          status: "todo",
          assignedToId: newTaskAssignee || undefined,
        }),
      });

      if (response.ok) {
        const newTask = await response.json();
        setTasks([...tasks, newTask]);

        // Emit real-time event
        realtimeService.emitTaskCreated(newTask);

        setShowCreateTaskModal(false);
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskAssignee("");
        toast.success("Task created successfully!");
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to create task";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while creating the task";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteTaskModal(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    setIsDeletingTask(true);
    try {
      const response = await fetch(`/api/projects/${id}/tasks/${taskToDelete.id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": session?.user?.id || "",
        },
      });

      if (response.ok) {
        // Remove the task from the local state
        setTasks(tasks.filter(task => task.id !== taskToDelete.id));

        // Emit real-time event
        realtimeService.emitTaskDeleted(taskToDelete.id);

        setTaskToDelete(null);
        setShowDeleteTaskModal(false);
        toast.success("Task deleted successfully!");
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to delete task";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while deleting task";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || "");
    setEditTaskStatus(task.status);
    setEditTaskAssignee(task.assignedTo?.id || "");
    setShowEditTaskModal(true);
  };

  const confirmEditTask = async () => {
    if (!taskToEdit) return;

    setIsEditingTask(true);
    try {
      const response = await fetch(`/api/projects/${id}/tasks/${taskToEdit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
        },
        body: JSON.stringify({
          title: editTaskTitle,
          description: editTaskDescription,
          status: editTaskStatus,
          assignedToId: editTaskAssignee || undefined,
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(task => task.id === taskToEdit.id ? updatedTask : task));

        // Emit real-time event
        realtimeService.emitTaskUpdate(updatedTask);

        setTaskToEdit(null);
        setShowEditTaskModal(false);
        setEditTaskTitle("");
        setEditTaskDescription("");
        setEditTaskStatus("todo");
        setEditTaskAssignee("");
        toast.success("Task updated successfully!");
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to update task";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while updating task";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsEditingTask(false);
    }
  };

  // Drag and drop handler
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const taskId = draggableId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Allow owners and assigned members to drag and drop
    const isOwner = project?.owner.id === session?.user?.id;
    const isAssignedMember = task.assignedTo?.id === session?.user?.id;

    if (!isOwner && !isAssignedMember) {
      return;
    }

    const statusMap = {
      todo: 'todo',
      'in-progress': 'in-progress',
      done: 'done',
    };
    const newStatus = destination.droppableId as 'todo' | 'in-progress' | 'done';

    // Optimistically update UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // Persist change to backend
    const response = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': session?.user?.id || '',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      const updatedTask = await response.json();
      // Emit real-time event
      realtimeService.emitTaskUpdate(updatedTask);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-red-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You do not have access to this project.
          </p>
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-500 cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Project not found
          </h2>
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Kanban columns
  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="px-0 sm:px-0">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6 space-y-4 lg:space-y-0">
              <div>
                <Link
                  href="/dashboard"
                  className="text-indigo-600 hover:text-indigo-500 mb-2 inline-block cursor-pointer"
                >
                  ← Back to Dashboard
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 mt-2">{project.description}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                {/* Export button - available to all members */}
                {project && <ExportProject project={project} tasks={tasks} />}

                {project.owner.id === session?.user?.id && (
                  <>
                    <Link
                      href={`/projects/${id}/settings`}
                      className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer text-center"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      Add Task
                    </button>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
                    >
                      Invite Member
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Kanban Board */}
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {columns.map(col => (
                  <Droppable
                    droppableId={col.id}
                    key={col.id}
                    isDropDisabled={false}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`bg-white rounded-lg shadow p-4 sm:p-6 min-h-[200px] ${col.id === 'todo' ? '' : col.id === 'in-progress' ? '' : ''}`}
                      >
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                          {col.title} ({getTasksByStatus(col.id).length})
                        </h3>
                        <div className="space-y-3">
                          {getTasksByStatus(col.id).map((task, idx) => (
                            <Draggable
                              draggableId={task.id}
                              index={idx}
                              key={task.id}
                              isDragDisabled={project?.owner.id !== session?.user?.id && task.assignedTo?.id !== session?.user?.id}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-${col.id === 'todo' ? 'gray' : col.id === 'in-progress' ? 'blue' : 'green'}-50 rounded-lg p-3 sm:p-4 border border-${col.id === 'todo' ? 'gray' : col.id === 'in-progress' ? 'blue' : 'green'}-200 ${project?.owner.id !== session?.user?.id && task.assignedTo?.id !== session?.user?.id ? 'cursor-default' : ''}`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                                      {task.title}
                                    </h4>
                                    <div className="flex items-center space-x-2">
                                      {project.owner.id === session?.user?.id && (
                                        <button
                                          onClick={() => handleEditTask(task)}
                                          className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer"
                                          title="Edit task"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                      )}
                                      {project.owner.id === session?.user?.id && (
                                        <button
                                          onClick={() => handleDeleteTask(task)}
                                          className="text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer"
                                          title="Delete task"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {task.description && (
                                    <p className="text-gray-600 text-xs sm:text-sm mb-2">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                    <div className="flex items-center space-x-2">
                                      {task.assignedTo ? (
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                          👤 {task.assignedTo.name}
                                        </span>
                                      ) : (
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                          📋 Unassigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right text-xs">
                                      <div>Created: {formatTimestamp(task.createdAt)}</div>
                                      <div>Updated: {formatTimestamp(task.updatedAt)}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>

            {/* Task Analytics */}
            <div className="mb-8">
              <TaskAnalytics tasks={tasks} />
            </div>

            {/* Project Members Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Project Members ({project.members.length + 1})
              </h3>

              <div className="space-y-3">
                {/* Project Owner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-indigo-50 rounded-md border border-indigo-200 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {project.owner.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{project.owner.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{project.owner.email}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded self-start sm:self-auto">
                    Owner
                  </span>
                </div>

                {/* Project Members */}
                {project.members.map((member) => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm sm:text-base">{member.user.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{member.user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded self-start sm:self-auto">
                      {member.role}
                    </span>
                  </div>
                ))}

                {project.members.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p>No team members yet. Invite someone to get started!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Task Modal */}
        {showCreateTaskModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 sm:w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Task
                </h3>
                <form onSubmit={handleCreateTask}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task Title
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Enter task title"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Enter task description"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign to (optional)
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {project?.members.map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.name} ({member.user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateTaskModal(false);
                        setNewTaskTitle("");
                        setNewTaskDescription("");
                        setNewTaskAssignee("");
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isCreating ? "Creating..." : "Create Task"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 sm:w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Member</h3>
                <form onSubmit={handleInvite}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">User Email</label>
                    <input
                      type="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="Type to search..."
                      list="invite-suggestions"
                    />
                    <datalist id="invite-suggestions">
                      {inviteSuggestions.map(email => (
                        <option key={email} value={email} />
                      ))}
                    </datalist>
                  </div>
                  {inviteError && <div className="text-red-600 mb-2">{inviteError}</div>}
                  {inviteSuccess && <div className="text-green-600 mb-2">{inviteSuccess}</div>}
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteSuggestions([]); setInviteError(""); setInviteSuccess(""); }}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {isInviting ? "Inviting..." : "Invite"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Task Modal */}
        <Modal
          isOpen={showDeleteTaskModal}
          onClose={() => {
            setShowDeleteTaskModal(false);
            setTaskToDelete(null);
          }}
          title="Delete Task"
          message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
          type="warning"
          showConfirmButton={true}
          confirmText={isDeletingTask ? "Deleting..." : "Delete Task"}
          onConfirm={confirmDeleteTask}
        />

        {/* Edit Task Modal */}
        {showEditTaskModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Edit Task
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    value={editTaskDescription}
                    onChange={(e) => setEditTaskDescription(e.target.value)}
                    placeholder="Enter task description"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value as "todo" | "in-progress" | "done")}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to (optional)
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    value={editTaskAssignee}
                    onChange={(e) => setEditTaskAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {project?.members.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name} ({member.user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTaskModal(false);
                      setTaskToEdit(null);
                      setEditTaskTitle("");
                      setEditTaskDescription("");
                      setEditTaskStatus("todo");
                      setEditTaskAssignee("");
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmEditTask}
                    disabled={isEditingTask}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {isEditingTask ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
