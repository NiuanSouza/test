import React from "react";
import styles from "./DataTable.module.css";
import clsx from "clsx";

export interface ColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string | number;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  keyExtractor, 
  className,
  emptyMessage = "Nenhum dado encontrado." 
}: DataTableProps<T>) {
  
  return (
    <div className={clsx(styles.tableContainer, className)}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyState}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)}>
                {columns.map((col, idx) => (
                  <td key={idx} className={col.className}>
                    {typeof col.accessor === "function" 
                      ? col.accessor(row) 
                      : (row[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
