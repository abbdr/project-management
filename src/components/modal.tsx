"use client";

import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  showConfirmButton?: boolean;
  confirmText?: string;
  onConfirm?: () => void;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  showConfirmButton = false,
  confirmText = "OK",
  onConfirm,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: "✓",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-800",
          iconColor: "text-green-600",
        };
      case "error":
        return {
          icon: "✕",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-800",
          iconColor: "text-red-600",
        };
      case "warning":
        return {
          icon: "⚠",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-800",
          iconColor: "text-yellow-600",
        };
      default:
        return {
          icon: "ℹ",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-800",
          iconColor: "text-blue-600",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${styles.bgColor}`}>
            <span className={`text-2xl font-bold ${styles.iconColor}`}>
              {styles.icon}
            </span>
          </div>
          <div className="mt-3 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
            <div className="mt-2 px-7 py-3">
              <p className={`text-sm ${styles.textColor}`}>
                {message}
              </p>
            </div>
            <div className="flex justify-center space-x-3 mt-4">
              {showConfirmButton && onConfirm && (
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-2 rounded-md text-white text-sm font-medium cursor-pointer ${
                    type === "success"
                      ? "bg-green-600 hover:bg-green-700"
                      : type === "error"
                      ? "bg-red-600 hover:bg-red-700"
                      : type === "warning"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {confirmText}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer"
              >
                {showConfirmButton ? "Cancel" : "Close"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
