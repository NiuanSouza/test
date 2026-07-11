"use client";

import React, { SelectHTMLAttributes } from "react";
import clsx from "clsx";
import styles from "./Input.module.css"; // Reuse input styles for layout

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: SelectOption[];
}

export function Select({
  label,
  error,
  options,
  className,
  required,
  ...props
}: SelectProps) {
  return (
    <div className={clsx(styles.group, className)}>
      <div className={styles.inputContainer}>
        <select
          className={clsx(styles.input, error && styles.hasError)}
          required={required}
          {...props}
        >
          <option value="" disabled hidden></option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className={styles.label}>
          {label} {required && "*"}
        </label>
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
