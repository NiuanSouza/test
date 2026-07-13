"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../services/api";
import { TOKEN_KEY } from "../../../lib/constants";
import { LoginRequest, LoginResponse } from "../../../types/auth";
import { useToast } from "../../../providers/ToastProvider";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [registration, setRegistration] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!registration || !password) {
      showToast("Por favor, preencha todos os campos.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: LoginRequest = { registration, password };
      // O endpoint original era /user/login, vamos manter conforme o legacy auth.js.
      const data = await apiClient.post<LoginResponse>("/user/login", payload, { requireAuth: false });

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem("userName", data.name);
      localStorage.setItem("userRegistration", data.registration);
      localStorage.setItem("userPermission", data.permission);

      if (data.permission === "MANAGER" || data.permission === "ADMINISTRATOR" || data.permission === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/home");
      }
    } catch (error: any) {
      showToast(error.message || "Matrícula ou senha incorretos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!recoveryEmail) {
      showToast("Informe um e-mail válido!", "error");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
        showToast("Insira um e-mail válido", "error");
        return;
    }

    try {
      await apiClient.post("/user/reset-password", { email: recoveryEmail }, { requireAuth: false });
      showToast("E-mail enviado com sucesso! Verifique sua caixa de entrada.", "success");
      setShowModal(false);
    } catch (error: any) {
      showToast(error.message || "Erro ao recuperar senha", "error");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logosiva.png" alt="Logo SIVA" className="auth-logo" />
        </div>

        <form onSubmit={handleLogin}>
          <div className="auth-form-group">
            <input
              type="text"
              id="matricula"
              className="auth-input"
              required
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              placeholder=" "
            />
            <label htmlFor="matricula" className="auth-label">Matrícula</label>
          </div>

          <div className="auth-form-group">
            <input
              type={showPassword ? "text" : "password"}
              id="senha"
              className="auth-input"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
            />
            <label htmlFor="senha" className="auth-label">Senha</label>
            <div 
              className="auth-input-icon" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>

          <div className="auth-links">
            <span className="auth-link" onClick={() => setShowModal(true)}>
              Esqueceu a senha?
            </span>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : "Entrar"}
          </button>
        </form>
      </div>

      <div className="demo-card" style={{ width: "90%", maxWidth: "500px", padding: "20px", backgroundColor: "rgba(240, 253, 244, 0.95)", border: "1px solid #bbf7d0", borderRadius: "16px", fontSize: "14px", color: "#166534", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", zIndex: 10 }}>
        <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "16px" }}>
           ℹ️ Ambiente de Demonstração
        </strong>
        <p style={{ margin: "10px 0" }}>Este é um sistema de testes. Os dados são <strong>apagados automaticamente após 24 horas</strong>.</p>
        <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #dcfce7", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#15803d", textTransform: "uppercase", fontWeight: "bold" }}>Matrícula Gestor</span>
            <p style={{ margin: "4px 0", fontSize: "15px", fontFamily: "monospace" }}>10006</p>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#15803d", textTransform: "uppercase", fontWeight: "bold" }}>Senha Padrão</span>
            <p style={{ margin: "4px 0", fontSize: "15px", fontFamily: "monospace" }}>Troca123</p>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowModal(false);
        }}>
          <div className="modal-content">
            <h2 className="modal-title">Recuperar Senha</h2>
            <div className="modal-body">
              Informe seu e-mail vinculado para receber o link de recuperação de senha.
              
              <div className="auth-form-group" style={{ marginTop: "24px", marginBottom: 0 }}>
                <input
                  type="email"
                  id="email-recuperacao"
                  className="auth-input"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder=" "
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRecovery();
                    }
                  }}
                />
                <label htmlFor="email-recuperacao" className="auth-label">E-mail</label>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-action" onClick={handleRecovery} style={{ padding: "10px 24px", fontSize: "0.875rem" }}>
                Enviar link
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
