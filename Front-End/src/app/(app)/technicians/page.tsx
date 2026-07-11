"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/Card";
import { DataTable, ColumnDef } from "../../../components/DataTable";
import { SearchBar } from "../../../components/SearchBar";
import { Button } from "../../../components/Button";
import { apiClient } from "../../../services/api";
import { User } from "../../../types/user";
import { useToast } from "../../../providers/ToastProvider";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import styles from "../SharedList.module.css";

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      // Mock data for development visually matching the original
      const data: User[] = [
        { id: 1, name: "João Silva", email: "joao@ipem.br", registration: "1001", permission: "TECHNICIAN", status: "ACTIVE" },
        { id: 2, name: "Maria Souza", email: "maria@ipem.br", registration: "1002", permission: "TECHNICIAN", status: "ACTIVE" },
      ];
      setTechnicians(data);
      setFiltered(data);
    } catch (error) {
      toast.error("Erro ao carregar técnicos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    const lower = term.toLowerCase();
    const result = technicians.filter(t => 
      t.name.toLowerCase().includes(lower) || 
      t.registration.toLowerCase().includes(lower)
    );
    setFiltered(result);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este técnico?")) return;
    try {
      await apiClient.delete(`/user/${id}`);
      toast.success("Técnico excluído com sucesso.");
      fetchTechnicians();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir técnico.");
    }
  };

  const columns: ColumnDef<User>[] = [
    { header: "Nome", accessor: "name" },
    { header: "Matrícula", accessor: "registration" },
    { header: "E-mail", accessor: "email" },
    { 
      header: "Status", 
      accessor: (row) => (
        <span className={row.status === "ACTIVE" ? styles.badgeSuccess : styles.badgeError}>
          {row.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </span>
      ) 
    },
    {
      header: "Ações",
      accessor: (row) => (
        <Button variant="danger" onClick={() => handleDelete(row.id)} title="Excluir">
          <Trash2 size={16} />
        </Button>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Técnicos</h1>
          <p className={styles.subtitle}>Gerenciamento de equipe técnica</p>
        </div>
        <Button onClick={() => router.push("/register/user")} className={styles.addBtn}>
          <Plus size={18} /> Novo Técnico
        </Button>
      </div>

      <Card>
        <CardHeader className={styles.cardHeader}>
          <CardTitle>Lista de Técnicos</CardTitle>
          <SearchBar onSearch={handleSearch} placeholder="Buscar por nome ou matrícula..." />
        </CardHeader>
        <CardContent>
          <DataTable 
            data={filtered}
            columns={columns}
            keyExtractor={(item) => item.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
