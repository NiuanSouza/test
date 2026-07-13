"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CarFront, 
  Wrench, 
  ClipboardList, 
  History, 
  PieChart, 
  Users, 
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Truck,
  Activity
} from "lucide-react";

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [permission, setPermission] = useState("");
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const perm = localStorage.getItem("userPermission") || "";
    setPermission(perm.trim().toUpperCase().replace("ROLE_", ""));
  }, []);

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu]
    );
  };

  const isActive = (path: string) => pathname === path;
  const isGestor = permission === "ADMINISTRATOR" || permission === "MANAGER";

  return (
    <>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 35 }}></div>
      )}
      
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button id="btnx" className="close-btn" type="button" aria-label="Fechar menu" onClick={onClose}>
          &times;
        </button>
        
        <div className="sidebar-header">
          <span className="sidebar-kicker">SIVA</span>
          <strong className="sidebar-title">
            {isGestor ? "Painel do Gestor" : "Painel do Técnico"}
          </strong>
          <p className="sidebar-subtitle">
            {isGestor 
              ? "Acompanhe equipe, chamados e cadastros em um só lugar." 
              : "Navegue rapidamente entre as telas operacionais."}
          </p>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-nav-group">
            <div className="sidebar-nav-title">Menu Principal</div>
            
            {isGestor ? (
              <>
                <Link onClick={onClose} href="/dashboard" className={`sidebar-item ${isActive("/dashboard") ? "active" : ""}`}>
                  <LayoutDashboard className="sidebar-icon" />
                  <span>Dashboard</span>
                </Link>
                <Link onClick={onClose} href="/home" className={`sidebar-item ${isActive("/home") ? "active" : ""}`}>
                  <CarFront className="sidebar-icon" />
                  <span>Selecionar Veículo</span>
                </Link>
                <Link onClick={onClose} href="/chamados" className={`sidebar-item ${isActive("/chamados") ? "active" : ""}`}>
                  <Wrench className="sidebar-icon" />
                  <span>Selecionar Chamados</span>
                </Link>
                <Link onClick={onClose} href="/service-requests" className={`sidebar-item ${isActive("/service-requests") ? "active" : ""}`}>
                  <ClipboardList className="sidebar-icon" />
                  <span>Gerenciar Chamados</span>
                </Link>
                <Link onClick={onClose} href="/history" className={`sidebar-item ${isActive("/history") ? "active" : ""}`}>
                  <History className="sidebar-icon" />
                  <span>Histórico</span>
                </Link>
                <Link onClick={onClose} href="/reports" className={`sidebar-item ${isActive("/reports") ? "active" : ""}`}>
                  <PieChart className="sidebar-icon" />
                  <span>Relatórios</span>
                </Link>

                <div style={{ marginTop: "24px" }} className="sidebar-nav-title">Administração</div>
                
                {/* Submenu Gerenciamento */}
                <div>
                  <div 
                    className="sidebar-item" 
                    onClick={() => toggleSubmenu("gerenciamento")}
                    style={{ justifyContent: "space-between" }}
                  >
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <Truck className="sidebar-icon" />
                      <span>Gerenciamento</span>
                    </div>
                    {openSubmenus.includes("gerenciamento") ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  
                  {openSubmenus.includes("gerenciamento") && (
                    <div style={{ paddingLeft: "32px", marginTop: "4px", marginBottom: "8px" }}>
                      <Link onClick={onClose} href="/vehicles" className={`sidebar-item ${isActive("/vehicles") ? "active" : ""}`} style={{ padding: "8px 12px", fontSize: "0.875rem" }}>
                        Veículos
                      </Link>
                      <Link onClick={onClose} href="/technicians" className={`sidebar-item ${isActive("/technicians") ? "active" : ""}`} style={{ padding: "8px 12px", fontSize: "0.875rem" }}>
                        Usuários
                      </Link>
                    </div>
                  )}
                </div>
                <Link onClick={onClose} href="/audit" className={`sidebar-item ${isActive("/audit") ? "active" : ""}`}>
                  <Activity className="sidebar-icon" />
                  <span>Auditoria</span>
                </Link>

                <div style={{ marginTop: "24px" }} className="sidebar-nav-title">Opções</div>
                <Link onClick={onClose} href="/settings" className={`sidebar-item ${isActive("/settings") ? "active" : ""}`}>
                  <Settings className="sidebar-icon" />
                  <span>Configurações</span>
                </Link>
              </>
            ) : (
              <>
                <Link onClick={onClose} href="/home" className={`sidebar-item ${isActive("/home") ? "active" : ""}`}>
                  <CarFront className="sidebar-icon" />
                  <span>Tela Inicial</span>
                </Link>
                <Link onClick={onClose} href="/chamados" className={`sidebar-item ${isActive("/chamados") ? "active" : ""}`}>
                  <Wrench className="sidebar-icon" />
                  <span>Chamados</span>
                </Link>
                
                <div style={{ marginTop: "24px" }} className="sidebar-nav-title">Opções</div>
                <Link onClick={onClose} href="/settings" className={`sidebar-item ${isActive("/settings") ? "active" : ""}`}>
                  <Settings className="sidebar-icon" />
                  <span>Configurações</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
