"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Select } from "../../../components/Select";
import { Input } from "../../../components/Input";
import { FileText, Download } from "lucide-react";
import styles from "../SharedList.module.css";

export default function ReportsPage() {
  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate export
    alert("Exportação iniciada...");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Relatórios</h1>
          <p className={styles.subtitle}>Exporte os dados do sistema</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        <Card>
          <CardHeader>
            <CardTitle>Exportar Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleExport} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Select 
                label="Mês de Referência" 
                options={[
                  { value: "1", label: "Janeiro" },
                  { value: "2", label: "Fevereiro" },
                  { value: "3", label: "Março" },
                  { value: "4", label: "Abril" },
                  { value: "5", label: "Maio" },
                  { value: "6", label: "Junho" },
                ]}
                required
              />
              <Input type="number" label="Ano" placeholder="2026" required defaultValue={new Date().getFullYear()} />
              <Button type="submit" variant="primary" style={{ width: "100%", marginTop: "8px" }}>
                <FileText size={18} /> Gerar Relatório de Gastos
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exportar Chamados</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleExport} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input type="date" label="Data Início" required />
              <Input type="date" label="Data Fim" required />
              <Button type="submit" variant="primary" style={{ width: "100%", marginTop: "8px" }}>
                <Download size={18} /> Exportar Histórico (Excel)
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
