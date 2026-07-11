import React, { InputHTMLAttributes } from "react";
import styles from "./SearchBar.module.css";
import { Search } from "lucide-react";
import clsx from "clsx";

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export function SearchBar({ onSearch, className, onChange, ...props }: SearchBarProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <div className={clsx(styles.searchContainer, className)}>
      <Search className={styles.icon} size={20} />
      <input
        type="text"
        className={styles.input}
        onChange={handleChange}
        placeholder={props.placeholder || "Pesquisar..."}
        {...props}
      />
    </div>
  );
}
