"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredToken } from "../../lib/jwt";
import { Menu, LogOut, User } from "lucide-react";

import { apiClient } from "../../services/api";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Usuário");
  const [userRole, setUserRole] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "Usuário");
    const role = localStorage.getItem("userPermission") || "";
    setUserRole(role === "ADMINISTRATOR" || role === "MANAGER" ? "Gestor" : "Técnico");

    const fetchPhoto = async () => {
      const registration = localStorage.getItem("userRegistration");
      if (registration && registration !== "undefined" && registration !== "null") {
        try {
          const data = await apiClient.get<any>(`/user/${registration}`);
          if (data.photo && data.photo.length > 5) {
            setUserPhoto(data.photo.startsWith("data:image") ? data.photo : `data:image/jpeg;base64,${data.photo}`);
          }
        } catch (e) {
          console.error("Failed to load user photo", e);
        }
      }
    };
    fetchPhoto();
  }, []);

  const getTitle = () => {
    if (!pathname) return "SIVA";
    if (pathname.includes("dashboard") || pathname === "/home") return "Visão Geral";
    if (pathname.includes("vehicles")) return "Gerenciar Veículos";
    if (pathname.includes("technicians")) return "Gerenciar Usuários";
    if (pathname.includes("register/vehicle")) return "Cadastrar Veículo";
    if (pathname.includes("register/user")) return "Cadastrar Usuário";
    if (pathname.includes("history")) return "Histórico de Chamados";
    if (pathname.includes("reports")) return "Relatórios Gerenciais";
    if (pathname.includes("service-requests")) return "Mapa de Ocorrências";
    if (pathname.includes("chamados")) return "Meus Chamados";
    if (pathname.includes("settings")) return "Configurações do Sistema";
    return "SIVA";
  };

  const handleLogout = () => {
    clearStoredToken();
    window.location.href = "/login";
  };

  return (
    <header className="top-header" style={{ zIndex: 500 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button className="btn-icon mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <h1 className="header-title">{getTitle()}</h1>
      </div>

      <div className="header-actions">
        <div 
          className="user-profile" 
          onClick={() => router.push("/settings")} 
          style={{ cursor: "pointer", transition: "opacity 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          title="Acessar configurações"
        >
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userRole}</span>
          </div>
          <div className="avatar" style={{ overflow: "hidden" }}>
            {userPhoto ? (
               <img src={userPhoto} alt="User Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
               userName && userName !== "Usuário" ? userName.charAt(0).toUpperCase() : <User size={20} />
            )}
          </div>
        </div>
        <div style={{ width: "1px", height: "24px", backgroundColor: "#e2e8f0", margin: "0 8px" }}></div>
        <button className="btn-icon" onClick={handleLogout} title="Sair do sistema">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
