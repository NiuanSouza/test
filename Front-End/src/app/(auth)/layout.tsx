import React from "react";
import styles from "./Auth.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authWrapper}>
        {children}
      </div>
    </div>
  );
}
