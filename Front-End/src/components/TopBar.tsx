"use client";

import React from "react";
import styles from "./TopBar.module.css";
import { useAuth } from "../providers/AuthProvider";
import { Bell, LogOut, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={onMenuClick} aria-label="Menu">
          <Menu size={24} />
        </button>
        <Link href={user?.permission === "TECHNICIAN" ? "/home" : "/dashboard"} className={styles.logoContainer}>
          <Image src="/images/logoipem.png" alt="IPEM Logo" width={60} height={60} className={styles.logo} />
        </Link>
      </div>

      <div className={styles.center}>
        {/* Title was originally just a space, but we can add something if needed */}
      </div>

      <div className={styles.right}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            <Image src="/images/bell.png" alt="User avatar" width={32} height={32} />
          </div>
          <span className={styles.userName}>{user?.name}</span>
        </div>
        
        <button className={styles.actionButton} aria-label="Notificações">
          <Bell size={24} />
        </button>
        
        <button className={styles.actionButton} onClick={logout} aria-label="Sair">
          <LogOut size={24} />
        </button>
      </div>
    </header>
  );
}
