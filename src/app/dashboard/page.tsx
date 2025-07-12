"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import PendingInvitations from "@/components/pending-invitations";
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
  }>;
  _count: {
    tasks: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects", {
        headers: {
          "x-user-id": session?.user?.id || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        setError("Failed to fetch projects");
      }
    } catch (error) {
      setError("An error occurred while fetching projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects([newProject, ...projects]);
        setShowCreateModal(false);
        setNewProjectName("");
        setNewProjectDescription("");
        setError(""); // Clear any previous errors
        toast.success("Project created successfully!");
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to create project";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while creating the project";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Separate owned and invited projects
  const ownedProjects = projects.filter(project => project.owner.id === session?.user?.id);
  const invitedProjects = projects.filter(project => project.owner.id !== session?.user?.id);

  // Filter projects based on search term
  const filterProjects = (projectList: Project[]) => {
    if (!searchTerm.trim()) return projectList;

    const searchLower = searchTerm.toLowerCase();
    return projectList.filter(project =>
      project.name.toLowerCase().includes(searchLower) ||
      (project.description && project.description.toLowerCase().includes(searchLower))
    );
  };

  const filteredOwnedProjects = filterProjects(ownedProjects);
  const filteredInvitedProjects = filterProjects(invitedProjects);

  const ProjectCard = ({ project, isOwned }: { project: Project; isOwned: boolean }) => (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 border-l-4 border-indigo-500">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {project.name}
            </h3>
            {isOwned ? (
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                Owner
              </span>
            ) : (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Member
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {project._count.tasks} tasks
          </span>
        </div>
        {project.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 space-y-1 sm:space-y-0">
          <span className="truncate">Owner: {project.owner.name}</span>
          <div className="text-right">
            <div className="text-xs">
              Created: {formatTimestamp(project.createdAt)}
            </div>
            <div className="text-xs">
              Updated: {formatTimestamp(project.updatedAt)}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
          <Link
            href={`/projects/${project.id}`}
            className="flex-1 bg-indigo-600 text-white text-center px-3 py-2 rounded-md hover:bg-indigo-700 text-sm cursor-pointer"
          >
            Project Detail
          </Link>
          {isOwned && (
            <Link
              href={`/projects/${project.id}/settings`}
              className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm cursor-pointer"
            >
              Settings
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="px-0 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <PendingInvitations onInvitationAccepted={fetchProjects} />

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects by name or description..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* My Projects Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  My Projects ({filteredOwnedProjects.length})
                </h2>
                {ownedProjects.length === 0 && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium cursor-pointer"
                  >
                    Create your first project
                  </button>
                )}
              </div>

              {filteredOwnedProjects.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {ownedProjects.length === 0 ? "No projects yet" : "No projects match your search"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {ownedProjects.length === 0
                      ? "Get started by creating your first project."
                      : "Try adjusting your search terms."
                    }
                  </p>
                  {ownedProjects.length === 0 && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 cursor-pointer"
                    >
                      Create your first project
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredOwnedProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} isOwned={true} />
                  ))}
                </div>
              )}
            </div>

            {/* Invited Projects Section */}
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                Invited Projects ({filteredInvitedProjects.length})
              </h2>

              {filteredInvitedProjects.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {invitedProjects.length === 0 ? "No invited projects" : "No invited projects match your search"}
                  </h3>
                  <p className="text-gray-600">
                    {invitedProjects.length === 0
                      ? "You haven't been invited to any projects yet."
                      : "Try adjusting your search terms."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredInvitedProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} isOwned={false} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 sm:w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Project
                </h3>
                <form onSubmit={handleCreateProject}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      {isCreating ? "Creating..." : "Create Project"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
