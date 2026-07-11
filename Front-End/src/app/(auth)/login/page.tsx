"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";
import { apiClient } from "../../../services/api";
import { LoginRequest, LoginResponse } from "../../../types/auth";
import { TOKEN_KEY } from "../../../lib/constants";
import { useToast } from "../../../providers/ToastProvider";
import styles from "./Login.module.css";

export default function LoginPage() {
  const [registration, setRegistration] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: LoginRequest = { registration, password };
      const data = await apiClient.post<LoginResponse>("/auth/login", payload, { requireAuth: false });
      
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem("userName", data.name);
      localStorage.setItem("userRegistration", data.registration);
      localStorage.setItem("userPermission", data.permission);
      
      if (data.permission === "MANAGER" || data.permission === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/home");
      }
    } catch (error: any) {
      toast.error(error.message || "Matrícula ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginForm}>
      <div className={styles.logoContainer}>
        <Image src="/images/logosiva.png" alt="SIVA Logo" width={120} height={120} className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Bem-vindo</h1>
      <p className={styles.subtitle}>Faça login para continuar</p>

      <form onSubmit={handleLogin} className={styles.form}>
        <Input 
          label="Matrícula" 
          value={registration} 
          onChange={(e) => setRegistration(e.target.value)} 
          required 
        />
        
        <Input 
          label="Senha" 
          type="password"
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          showToggle
        />
        
        <div className={styles.forgotPassword}>
          <Link href="/reset-password">Esqueceu sua senha?</Link>
        </div>

        <Button type="submit" variant="primary" isLoading={isLoading} className={styles.submitBtn}>
          ENTRAR
        </Button>
      </form>
    </div>
  );
}
