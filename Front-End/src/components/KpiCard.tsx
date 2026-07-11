import React from "react";
import styles from "./KpiCard.module.css";
import clsx from "clsx";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function KpiCard({ title, value, icon, subtitle, className }: KpiCardProps) {
  return (
    <div className={clsx(styles.kpiCard, className)}>
      <div className={styles.iconContainer}>{icon}</div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.value}>{value}</p>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}
