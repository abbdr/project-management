"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { use } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import Modal from "@/components/modal";
import toast from "react-hot-toast";

interface Project {
  id: string;
  name: string;
  description: string | null;
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

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuggestions, setInviteSuggestions] = useState<string[]>([]);

  // Project editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDeletingMember, setIsDeletingMember] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

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

  useEffect(() => {
    if (session?.user?.id) {
      fetchProject();
    }
  }, [id, session]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          "x-user-id": session?.user?.id || "",
        },
      });

      if (response.ok) {
        const projectData = await response.json();
        setProject(projectData);
        setEditName(projectData.name);
        setEditDescription(projectData.description || "");
      } else {
        setError("Failed to fetch project");
      }
    } catch (error) {
      setError("An error occurred while fetching project data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const response = await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
        },
        body: JSON.stringify({
          email: inviteEmail,
        }),
      });

      if (response.ok) {
        setInviteEmail("");
        fetchProject(); // Refresh project data
        setError(""); // Clear any previous errors
        toast.success("Invitation sent successfully!");
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to invite member";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while inviting member";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      if (response.ok) {
        const updatedProject = await response.json();
        setProject(updatedProject);
        setIsEditing(false);
        setSuccessMessage("Project updated successfully!");
        toast.success("Project updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to update project";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while updating project";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setMemberToRemove(memberId);
    setShowRemoveModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsDeletingMember(memberToRemove);
    try {
      const response = await fetch(`/api/projects/${id}/members/${memberToRemove}`, {
        method: "DELETE",
        headers: {
          "x-user-id": session?.user?.id || "",
        },
      });

      if (response.ok) {
        fetchProject(); // Refresh project data
        setSuccessMessage("Member removed successfully!");
        toast.success("Member removed successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to remove member";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while removing member";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeletingMember(null);
      setShowRemoveModal(false);
      setMemberToRemove(null);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeletingProject(true);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": session?.user?.id || "",
        },
      });

      if (response.ok) {
        // Redirect to dashboard after successful deletion
        window.location.href = "/dashboard";
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete project");
      }
    } catch (error) {
      setError("An error occurred while deleting project");
    } finally {
      setIsDeletingProject(false);
      setShowDeleteProjectModal(false);
    }
  };

  const isOwner = project?.owner.id === session?.user?.id;

  // Redirect non-owners to project page
  if (!isLoading && project && !isOwner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            Only project owners can access settings.
          </p>
          <Link
            href={`/projects/${id}`}
            className="text-indigo-600 hover:text-indigo-500 cursor-pointer"
          >
            Back to Project
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project settings...</p>
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
            className="text-indigo-600 hover:text-indigo-500 cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-6">
              <Link
                href={`/projects/${id}`}
                className="text-indigo-600 hover:text-indigo-500 mb-2 inline-block cursor-pointer"
              >
                ← Back to Project
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Project Settings</h1>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Project Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Project Information
                  </h2>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-indigo-600 hover:text-indigo-500 text-sm font-medium cursor-pointer"
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleEditProject} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Enter project description"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(project.name);
                          setEditDescription(project.description || "");
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Name
                      </label>
                      <p className="text-gray-900">{project.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <p className="text-gray-900">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Owner
                      </label>
                      <p className="text-gray-900">{project.owner.name}</p>
                    </div>
                  </div>
                )}

                {/* Delete Project Section - Owner Only */}
                {isOwner && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Delete Project</h4>
                          <p className="text-sm text-red-600 mt-1">
                            Once you delete a project, there is no going back. Please be certain.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDeleteProjectModal(true)}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                        >
                          Delete Project
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Team Members
                </h2>

                {/* Invite Member Form - Owner Only */}
                {isOwner && (
                  <form onSubmit={handleInviteMember} className="mb-6">
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        required
                        placeholder="Type to search..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        list="invite-suggestions"
                      />
                      <datalist id="invite-suggestions">
                        {inviteSuggestions.map(email => (
                          <option key={email} value={email} />
                        ))}
                      </datalist>
                      <button
                        type="submit"
                        disabled={isInviting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isInviting ? "Inviting..." : "Invite"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Members List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900">{project.owner.name}</p>
                      <p className="text-sm text-gray-600">{project.owner.email}</p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                      Owner
                    </span>
                  </div>

                  {project.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">{member.user.name}</p>
                        <p className="text-sm text-gray-600">{member.user.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {member.role}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isDeletingMember === member.id}
                          className="text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer disabled:opacity-50"
                        >
                          {isDeletingMember === member.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {project.members.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No team members yet. Invite someone to get started!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Modal */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setMemberToRemove(null);
        }}
        title="Remove Member"
        message="Are you sure you want to remove this member from the project? This action cannot be undone."
        type="warning"
        showConfirmButton={true}
        confirmText="Remove"
        onConfirm={confirmRemoveMember}
      />

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={showDeleteProjectModal}
        onClose={() => setShowDeleteProjectModal(false)}
        title="Delete Project"
        message={`Are you sure you want to delete "${project?.name}"? This action cannot be undone and will permanently remove the project and all its tasks.`}
        type="error"
        showConfirmButton={true}
        confirmText={isDeletingProject ? "Deleting..." : "Delete Project"}
        onConfirm={handleDeleteProject}
      />
    </ProtectedRoute>
  );
}
