"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/Card";
import { DataTable, ColumnDef } from "../../../components/DataTable";
import { SearchBar } from "../../../components/SearchBar";
import { Button } from "../../../components/Button";
import { Select } from "../../../components/Select";
import { apiClient } from "../../../services/api";
import { RecentService } from "../../../types/dashboard";
import { useToast } from "../../../providers/ToastProvider";
import { Download } from "lucide-react";
import styles from "../SharedList.module.css";

export default function HistoryPage() {
  const [services, setServices] = useState<RecentService[]>([]);
  const [filtered, setFiltered] = useState<RecentService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Fetch full history - using recent for mockup
      const data = await apiClient.get<RecentService[]>("/service/recent");
      setServices(data);
      setFiltered(data);
    } catch (error) {
      toast.error("Erro ao carregar histórico.");
      const mockData: RecentService[] = [
        { id: 1, carPrefix: "V-01", technicianName: "João Silva", status: "Em Andamento", startTime: "08:30" },
        { id: 2, carPrefix: "V-05", technicianName: "Maria Souza", status: "Concluído", startTime: "07:15", endTime: "11:45" },
        { id: 3, carPrefix: "V-12", technicianName: "Carlos Silva", status: "Concluído", startTime: "Ontem 14:00", endTime: "Ontem 17:30" }
      ];
      setServices(mockData);
      setFiltered(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    const lower = term.toLowerCase();
    const result = services.filter(s => 
      s.carPrefix.toLowerCase().includes(lower) || 
      s.technicianName.toLowerCase().includes(lower) ||
      s.status.toLowerCase().includes(lower)
    );
    setFiltered(result);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Concluído": return <span className={styles.badgeSuccess}>Concluído</span>;
      case "Em Andamento": return <span className={styles.badgeWarning}>Em Andamento</span>;
      default: return <span>{status}</span>;
    }
  };

  const columns: ColumnDef<RecentService>[] = [
    { header: "ID", accessor: "id" },
    { header: "Veículo", accessor: "carPrefix" },
    { header: "Técnico", accessor: "technicianName" },
    { header: "Início", accessor: "startTime" },
    { header: "Fim", accessor: (row) => row.endTime || "-" },
    { header: "Status", accessor: (row) => getStatusBadge(row.status) },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Histórico de Chamados</h1>
          <p className={styles.subtitle}>Consulte todos os chamados realizados</p>
        </div>
        <Button variant="secondary" className={styles.addBtn}>
          <Download size={18} /> Exportar Excel
        </Button>
      </div>

      <Card>
        <CardHeader className={styles.cardHeader}>
          <CardTitle>Todos os Registros</CardTitle>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Select 
              label=""
              options={[
                { value: "ALL", label: "Todos os Status" },
                { value: "DONE", label: "Concluído" },
                { value: "IN_PROGRESS", label: "Em Andamento" }
              ]} 
              style={{ minWidth: '150px' }}
            />
            <SearchBar onSearch={handleSearch} placeholder="Buscar..." />
          </div>
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
