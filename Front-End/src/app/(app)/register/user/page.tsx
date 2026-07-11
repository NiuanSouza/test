"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Select } from "../../../../components/Select";
import { apiClient } from "../../../../services/api";
import { RegisterRequest } from "../../../../types/user";
import { useToast } from "../../../../providers/ToastProvider";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import styles from "../../SharedForm.module.css";

export default function RegisterUserPage() {
  const [formData, setFormData] = useState<RegisterRequest>({
    name: "",
    email: "",
    registration: "",
    permission: "TECHNICIAN",
    phone: "",
    sector: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.post("/auth/register", formData);
      toast.success("Usuário cadastrado com sucesso!");
      router.push("/technicians");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar usuário.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" onClick={() => router.back()} className={styles.backBtn}>
          <ArrowLeft size={20} /> Voltar
        </Button>
        <h1 className={styles.title}>Cadastro de Usuário</h1>
      </div>

      <Card className={styles.formCard}>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <Input 
                name="name"
                label="Nome Completo" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
              <Input 
                name="registration"
                label="Matrícula" 
                value={formData.registration} 
                onChange={handleChange} 
                required 
              />
              <Input 
                name="email"
                type="email"
                label="E-mail" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
              <Select 
                name="permission"
                label="Perfil de Acesso" 
                value={formData.permission} 
                onChange={handleChange}
                options={[
                  { value: "TECHNICIAN", label: "Técnico" },
                  { value: "MANAGER", label: "Gestor" },
                  { value: "ADMIN", label: "Administrador" }
                ]}
                required 
              />
              <Input 
                name="phone"
                label="Telefone (Opcional)" 
                value={formData.phone || ""} 
                onChange={handleChange} 
              />
              <Input 
                name="sector"
                label="Setor (Opcional)" 
                value={formData.sector || ""} 
                onChange={handleChange} 
              />
            </div>
            
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading}>
                <Save size={18} /> Salvar Usuário
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
