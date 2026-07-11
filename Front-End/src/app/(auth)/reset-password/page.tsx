"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";
import { apiClient } from "../../../services/api";
import { useToast } from "../../../providers/ToastProvider";
import styles from "../login/Login.module.css"; // Reuse login styles

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor, preencha o e-mail.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { email }, { requireAuth: false });
      setSuccess(true);
      toast.success("Instruções enviadas para o seu e-mail!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar redefinição de senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginForm}>
      <div className={styles.logoContainer}>
        <Image src="/images/logosiva.png" alt="SIVA Logo" width={100} height={100} className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Recuperar Senha</h1>
      <p className={styles.subtitle}>Enviaremos instruções para o seu e-mail</p>

      {success ? (
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <p style={{ color: "var(--color-success)", fontWeight: 500 }}>
            E-mail enviado com sucesso! Verifique sua caixa de entrada.
          </p>
          <div style={{ marginTop: "24px" }}>
            <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Voltar ao Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className={styles.form}>
          <Input 
            label="E-mail" 
            type="email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          
          <Button type="submit" variant="primary" isLoading={isLoading} className={styles.submitBtn}>
            ENVIAR
          </Button>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href="/login" style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
              Lembrou da senha? <strong>Voltar ao Login</strong>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
