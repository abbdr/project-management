"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "./modal";
import toast from "react-hot-toast";

interface Invitation {
  id: string;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  inviter: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface PendingInvitationsProps {
  onInvitationAccepted?: () => void;
}

export default function PendingInvitations({ onInvitationAccepted }: PendingInvitationsProps) {
  const { data: session } = useSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchInvitations();
    }
  }, [session]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/invitations", {
        headers: {
          "x-user-id": session?.user?.id || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const handleInvitationResponse = async (invitationId: string, action: "accept" | "reject") => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

        // If invitation was accepted, notify parent component to refresh projects
        if (action === "accept" && onInvitationAccepted) {
          onInvitationAccepted();
          toast.success("Invitation accepted! The project has been added to your dashboard.");
        } else if (action === "reject") {
          toast.success("Invitation rejected successfully.");
        }
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Failed to respond to invitation";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast.error("An error occurred while responding to the invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">
          Pending Invitations ({invitations.length})
        </h3>

        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {invitation.project.name}
                  </h4>
                  {invitation.project.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {invitation.project.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Invited by {invitation.inviter.name} • {formatTimestamp(invitation.createdAt)}
                  </p>
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, "accept")}
                    disabled={isLoading}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, "reject")}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </>
  );
}
