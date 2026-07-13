"use client";

import React from "react";
import dynamic from "next/dynamic";

const MapGestor = dynamic(() => import("../../../components/maps/MapGestor"), {
  ssr: false,
  loading: () => <div style={{ padding: "40px", textAlign: "center" }}>Carregando mapa...</div>
});

export default function ServiceRequestsPage() {
  return (
    <div style={{ marginTop: "16px" }}>
      <MapGestor />
    </div>
  );
}
