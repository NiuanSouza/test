"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../services/api";
import { useToast } from "../../../providers/ToastProvider";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    if (urlToken) {
      setToken(urlToken);
    } else {
      showToast("Token não encontrado na URL.", "error");
    }
  }, [showToast]);

  const handleConfirm = async () => {
    if (!token) return;
    setLoading(true);

    try {
      await apiClient.post(`/user/reset-password-confirm`, { token }, { requireAuth: false });
      showToast("Senha redefinida com sucesso para: Troca123", "success");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      showToast(error.message || "Token inválido ou expirado.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-logo-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logosiva.png" alt="Logo SIVA" className="auth-logo" />
        </div>

        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-primary)", marginBottom: "16px" }}>
          Redefinição de Senha
        </h2>
        
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px", lineHeight: 1.6 }}>
          Clique no botão abaixo para redefinir sua senha padrão temporária para <strong>Troca123</strong>.
        </p>

        <button 
          onClick={handleConfirm} 
          disabled={!token || loading}
          className="btn-primary"
          style={{ marginBottom: "24px" }}
        >
          {loading ? <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : "Confirmar Redefinição"}
        </button>

        <div className="auth-links" style={{ justifyContent: "center" }}>
          <span className="auth-link" onClick={() => router.push("/login")}>
            Voltar ao Login
          </span>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
