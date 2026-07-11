"use client";

import React from "react";
import styles from "./Sidebar.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";
import clsx from "clsx";
import { 
  LayoutDashboard, 
  Map, 
  History, 
  FileText, 
  Users, 
  Car, 
  Settings, 
  MapPin,
  CarFront,
  UserPlus
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isManager = user?.permission === "MANAGER" || user?.permission === "ADMIN";

  const getLinks = () => {
    if (isManager) {
      return [
        { href: "/dashboard", label: "Página Inicial", icon: <LayoutDashboard size={20} /> },
        { href: "/service-requests", label: "Mapa - Chamados", icon: <Map size={20} /> },
        { href: "/history", label: "Histórico de Chamados", icon: <History size={20} /> },
        { href: "/reports", label: "Relatórios", icon: <FileText size={20} /> },
        { href: "/technicians", label: "Técnicos", icon: <Users size={20} /> },
        { href: "/vehicles", label: "Veículos", icon: <Car size={20} /> },
        { href: "/settings", label: "Configurações", icon: <Settings size={20} /> },
        { href: "/register/user", label: "Cadastro - Usuário", icon: <UserPlus size={20} /> },
        { href: "/register/vehicle", label: "Cadastro - Veículos", icon: <CarFront size={20} /> },
      ];
    } else {
      return [
        { href: "/home", label: "Página Inicial", icon: <LayoutDashboard size={20} /> },
        { href: "/tickets", label: "Meus Chamados", icon: <MapPin size={20} /> },
        { href: "/settings", label: "Configurações", icon: <Settings size={20} /> },
      ];
    }
  };

  const links = getLinks();

  return (
    <>
      <div 
        className={clsx(styles.overlay, isOpen && styles.overlayOpen)} 
        onClick={onClose}
      />
      <aside className={clsx(styles.sidebar, isOpen && styles.sidebarOpen)}>
        <nav className={styles.nav}>
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={clsx(styles.link, isActive && styles.active)}
                onClick={onClose}
              >
                <span className={styles.icon}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
