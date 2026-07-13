"use client";

import React, { useState } from "react";
import { Header } from "../../components/layout/Header";
import { Sidebar } from "../../components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="main-wrapper">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
