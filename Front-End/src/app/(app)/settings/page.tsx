"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { useAuth } from "../../../providers/AuthProvider";
import { useToast } from "../../../providers/ToastProvider";
import styles from "../SharedList.module.css";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Configurações</h1>
          <p className={styles.subtitle}>Preferências da sua conta</p>
        </div>
      </div>

      <Card style={{ maxWidth: "600px" }}>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Nome Completo" defaultValue={user?.name} required />
            <Input label="Matrícula" defaultValue={user?.registration} disabled />
            <Input label="Nova Senha" type="password" showToggle />
            <Input label="Confirmar Nova Senha" type="password" showToggle />
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <Button type="submit" variant="primary">
                <Save size={18} /> Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
