"use client";

import React, { InputHTMLAttributes, useState } from "react";
import clsx from "clsx";
import styles from "./Input.module.css";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showToggle?: boolean;
}

export function Input({
  label,
  error,
  showToggle,
  className,
  type = "text",
  required,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const isPassword = type === "password";
  const currentType = isPassword && isPasswordVisible ? "text" : type;

  return (
    <div className={clsx(styles.group, className)}>
      <div className={styles.inputContainer}>
        <input
          type={currentType}
          className={clsx(styles.input, error && styles.hasError, isPassword && showToggle && styles.hasToggle)}
          placeholder=" "
          required={required}
          {...props}
        />
        <label className={styles.label}>
          {label} {required && "*"}
        </label>
        
        {isPassword && showToggle && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            tabIndex={-1}
          >
            {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
