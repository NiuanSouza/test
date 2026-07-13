"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

type ToastContextType = {
  showToast: (message: string, type?: "error" | "success") => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success">("error");
  const [isVisible, setIsVisible] = useState(false);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToastMessage(message);
    setToastType(type);
    setIsVisible(true);
    setTimeout(() => setIsVisible(false), 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {isVisible && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          backgroundColor: toastType === "error" ? "#fee2e2" : "#dcfce7",
          color: toastType === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${toastType === "error" ? "#f87171" : "#4ade80"}`,
          padding: "12px 24px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          animation: "slideDown 0.3s ease-out forwards"
        }}>
          {toastType === "error" ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{toastMessage}</span>
          <button onClick={() => setIsVisible(false)} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", padding: 0, marginLeft: "8px", color: "inherit" }}>
            <X size={16} />
          </button>
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
