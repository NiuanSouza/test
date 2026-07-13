"use client";

import React from "react";
import dynamic from "next/dynamic";

const MapChamados = dynamic(() => import("../../../components/maps/MapChamados"), {
  ssr: false,
  loading: () => <div style={{ padding: "40px", textAlign: "center" }}>Carregando mapa...</div>
});

export default function ChamadosPage() {
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>Chamados Disponíveis</h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>Acompanhe e selecione os chamados pendentes da sua região.</p>
      </div>
      <MapChamados />
    </div>
  );
}
