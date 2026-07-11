"use client";

import React, { useState } from "react";
import { Card, CardContent } from "../../../components/Card";
import { SearchBar } from "../../../components/SearchBar";
import { Map as MapIcon, Navigation } from "lucide-react";
import styles from "../SharedList.module.css";

export default function ServiceRequestsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className={styles.container} style={{ height: "calc(100vh - 120px)" }}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mapa de Chamados (Gestor)</h1>
          <p className={styles.subtitle}>Visão geral dos técnicos e chamados ativos</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "24px", height: "100%" }}>
        {/* Sidebar for Active Services */}
        <Card style={{ width: "350px", display: "flex", flexDirection: "column" }}>
          <CardContent style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            <SearchBar 
              placeholder="Buscar chamado..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            
            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ padding: "16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "var(--color-primary)" }}>V-01 (João Silva)</p>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>Destino: Centro</p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", color: "var(--color-success)", fontSize: "0.85rem", fontWeight: 600 }}>
                  <Navigation size={14} /> Em Rota
                </div>
              </div>
              <div style={{ padding: "16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "var(--color-primary)" }}>V-05 (Maria Souza)</p>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>Destino: Zona Sul</p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", color: "var(--color-warning)", fontSize: "0.85rem", fontWeight: 600 }}>
                  <Navigation size={14} /> Parado
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Area Placeholder */}
        <Card style={{ flex: 1 }}>
          <CardContent style={{ padding: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-md)" }}>
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              <MapIcon size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
              <p>Integração com Google Maps pendente.</p>
              <p style={{ fontSize: "0.85rem" }}>O componente de mapa será renderizado aqui.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
