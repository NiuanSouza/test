"use client";

import React, { useState } from "react";
import { TopBar } from "../../components/TopBar";
import { Sidebar } from "../../components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main style={{
        flex: 1,
        width: "var(--layout-width)",
        margin: "0 auto",
        paddingBottom: "32px"
      }}>
        {children}
      </main>
    </div>
  );
}
