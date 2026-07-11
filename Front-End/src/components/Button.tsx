import React, { ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import styles from "./Button.module.css";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "info";
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = "primary", 
  isLoading = false, 
  className,
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={clsx(styles.button, styles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className={styles.spinner} size={18} /> : children}
    </button>
  );
}
