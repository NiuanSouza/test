"use client";

import React, { useState } from "react";
import { Card, CardContent } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { MapPin, Navigation } from "lucide-react";
import styles from "../SharedList.module.css";

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Meus Chamados</h1>
          <p className={styles.subtitle}>Gerencie suas rotas e histórico</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <Button 
          variant={activeTab === "pending" ? "primary" : "secondary"} 
          onClick={() => setActiveTab("pending")}
        >
          Pendentes
        </Button>
        <Button 
          variant={activeTab === "history" ? "primary" : "secondary"} 
          onClick={() => setActiveTab("history")}
        >
          Histórico
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {activeTab === "pending" ? (
          <>
            {/* Ticket Card Example */}
            <Card>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px", color: "var(--color-primary)" }}>Chamado #1042</h3>
                  <p style={{ margin: "0 0 4px", fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
                    <MapPin size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                    Destino: Rua das Flores, 123 - Centro
                  </p>
                  <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
                    Veículo Solicitado: Categoria B
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <Button variant="info">Ver no Mapa</Button>
                  <Button variant="primary"><Navigation size={16} /> Aceitar e Iniciar Rota</Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-secondary)" }}>
            Nenhum histórico encontrado para este mês.
          </div>
        )}
      </div>
    </div>
  );
}
