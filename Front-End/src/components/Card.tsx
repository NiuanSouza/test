import React from "react";
import styles from "./Card.module.css";
import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div 
      className={clsx(styles.card, className, onClick && styles.clickable)} 
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={clsx(styles.header, className)}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={styles.title}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={clsx(styles.content, className)}>{children}</div>;
}
