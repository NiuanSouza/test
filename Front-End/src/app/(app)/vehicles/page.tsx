"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/Card";
import { DataTable, ColumnDef } from "../../../components/DataTable";
import { SearchBar } from "../../../components/SearchBar";
import { Button } from "../../../components/Button";
import { apiClient } from "../../../services/api";
import { Car } from "../../../types/vehicle";
import { useToast } from "../../../providers/ToastProvider";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import styles from "../SharedList.module.css";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Car[]>([]);
  const [filtered, setFiltered] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      // Mock data for development visually matching the original
      const data: Car[] = [
        { id: 1, prefix: "V-01", licensePlate: "ABC-1234", type: { id: 1, brand: "Fiat", model: "Uno", category: "B" }, year: 2018, color: "Branco", status: "AVAILABLE", mileage: 45000 },
        { id: 2, prefix: "V-02", licensePlate: "XYZ-9876", type: { id: 2, brand: "VW", model: "Gol", category: "B" }, year: 2020, color: "Prata", status: "IN_USE", mileage: 23000 },
      ];
      setVehicles(data);
      setFiltered(data);
    } catch (error) {
      toast.error("Erro ao carregar veículos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    const lower = term.toLowerCase();
    const result = vehicles.filter(v => 
      v.prefix.toLowerCase().includes(lower) || 
      v.licensePlate.toLowerCase().includes(lower)
    );
    setFiltered(result);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este veículo?")) return;
    try {
      await apiClient.delete(`/vehicle/${id}`);
      toast.success("Veículo excluído com sucesso.");
      fetchVehicles();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir veículo.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "AVAILABLE": return <span className={styles.badgeSuccess}>Disponível</span>;
      case "IN_USE": return <span className={styles.badgeWarning}>Em Uso</span>;
      case "MAINTENANCE": return <span className={styles.badgeError}>Manutenção</span>;
      default: return <span>{status}</span>;
    }
  };

  const columns: ColumnDef<Car>[] = [
    { header: "Prefixo", accessor: "prefix" },
    { header: "Placa", accessor: "licensePlate" },
    { header: "Modelo", accessor: (row) => `${row.type.brand} ${row.type.model}` },
    { header: "KM Atual", accessor: (row) => `${row.mileage} km` },
    { header: "Status", accessor: (row) => getStatusBadge(row.status) },
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
          <h1 className={styles.title}>Veículos</h1>
          <p className={styles.subtitle}>Gerenciamento da frota</p>
        </div>
        <Button onClick={() => router.push("/register/vehicle")} className={styles.addBtn}>
          <Plus size={18} /> Novo Veículo
        </Button>
      </div>

      <Card>
        <CardHeader className={styles.cardHeader}>
          <CardTitle>Lista de Veículos</CardTitle>
          <SearchBar onSearch={handleSearch} placeholder="Buscar por prefixo ou placa..." />
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
