"use client";

import React, { useEffect, useState } from "react";
import { KpiCard } from "../../../components/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/Card";
import { DataTable } from "../../../components/DataTable";
import { apiClient } from "../../../services/api";
import { DashboardMetrics, RecentService } from "../../../types/dashboard";
import { useToast } from "../../../providers/ToastProvider";
import { Car, Users, Wrench, CheckCircle, Droplet, Fuel } from "lucide-react";
import styles from "./Dashboard.module.css";
import Link from "next/link";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentServices, setRecentServices] = useState<RecentService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsData, recentServicesData] = await Promise.all([
          apiClient.get<DashboardMetrics>("/dashboard/metrics"),
          apiClient.get<RecentService[]>("/service/recent")
        ]);
        
        setMetrics(metricsData);
        setRecentServices(recentServicesData);
      } catch (error) {
        toast.error("Erro ao carregar os dados do dashboard.");
        // Fallback mock data for development visually matching the original
        setMetrics({
          availableVehicles: 12,
          inUseVehicles: 4,
          maintenanceVehicles: 2,
          availableTechnicians: 8,
          activeTechnicians: 3,
          monthlyFuelExpense: 2450.50,
          averagePricePerLiter: 5.89,
          totalLiters: 416
        });
        setRecentServices([
          { id: 1, carPrefix: "V-01", technicianName: "João Silva", status: "Em Andamento", startTime: "08:30" },
          { id: 2, carPrefix: "V-05", technicianName: "Maria Souza", status: "Concluído", startTime: "07:15", endTime: "11:45" }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  if (isLoading) {
    return <div className={styles.loading}>Carregando painel de controle...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Painel de Controle</h1>
        <p className={styles.subtitle}>Visão geral do sistema de frotas e chamados</p>
      </div>

      <div className={styles.grid}>
        <KpiCard 
          title="Veículos Disponíveis" 
          value={metrics?.availableVehicles || 0} 
          icon={<Car size={32} />} 
          className={styles.kpiBlue}
        />
        <KpiCard 
          title="Veículos em Uso" 
          value={metrics?.inUseVehicles || 0} 
          icon={<Car size={32} />} 
          className={styles.kpiOrange}
        />
        <KpiCard 
          title="Veículos em Manutenção" 
          value={metrics?.maintenanceVehicles || 0} 
          icon={<Wrench size={32} />} 
          className={styles.kpiRed}
        />
        <KpiCard 
          title="Técnicos Disponíveis" 
          value={metrics?.availableTechnicians || 0} 
          icon={<Users size={32} />} 
          className={styles.kpiGreen}
        />
      </div>

      <div className={styles.lowerGrid}>
        <Card className={styles.chartCard}>
          <CardHeader>
            <CardTitle>Chamados Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={recentServices}
              columns={[
                { header: "Veículo", accessor: "carPrefix" },
                { header: "Técnico", accessor: "technicianName" },
                { header: "Início", accessor: "startTime" },
                { 
                  header: "Status", 
                  accessor: (row) => (
                    <span className={row.status === "Concluído" ? styles.statusBadgeSuccess : styles.statusBadgeWarning}>
                      {row.status}
                    </span>
                  )
                }
              ]}
              keyExtractor={(item) => item.id}
            />
            <div className={styles.viewAll}>
              <Link href="/history">Ver todos os chamados</Link>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.fuelCard}>
          <CardHeader>
            <CardTitle>Resumo de Abastecimento (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.fuelStats}>
              <div className={styles.fuelStat}>
                <div className={styles.fuelIcon}><Fuel size={24} /></div>
                <div>
                  <p className={styles.fuelLabel}>Gasto Total</p>
                  <p className={styles.fuelValue}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.monthlyFuelExpense || 0)}
                  </p>
                </div>
              </div>
              <div className={styles.fuelStat}>
                <div className={styles.fuelIcon}><Droplet size={24} /></div>
                <div>
                  <p className={styles.fuelLabel}>Total de Litros</p>
                  <p className={styles.fuelValue}>{metrics?.totalLiters || 0} L</p>
                </div>
              </div>
              <div className={styles.fuelStat}>
                <div className={styles.fuelIcon}><CheckCircle size={24} /></div>
                <div>
                  <p className={styles.fuelLabel}>Preço Médio (L)</p>
                  <p className={styles.fuelValue}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.averagePricePerLiter || 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
