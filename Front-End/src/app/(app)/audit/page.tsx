"use client";

import React, { useState, useEffect } from "react";
import { DataTable, ColumnDef } from "../../../components/DataTable";
import { useToast } from "../../../providers/ToastProvider";
import { History, Activity, Edit3, Plus, Trash2, Search, RefreshCw } from "lucide-react";
import "../shared-gestao.css";

interface AuditHistoryDTO {
  revisionId: number;
  revisionDate: string;
  revisionType: "ADD" | "MOD" | "DEL";
  entityData: Record<string, any>;
}

export default function GlobalHistoryPage() {
  const [history, setHistory] = useState<AuditHistoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/audit/history/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("siva_token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Falha ao buscar histórico de modificações globais");
      }
      const data = await response.json();
      setHistory(data);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getRevisionIcon = (type: string) => {
    switch (type) {
      case "ADD":
        return <Plus size={14} />;
      case "MOD":
        return <Edit3 size={14} />;
      case "DEL":
        return <Trash2 size={14} />;
      default:
        return <Activity size={14} />;
    }
  };

  const getRevisionLabel = (type: string) => {
    switch (type) {
      case "ADD":
        return "Criação";
      case "MOD":
        return "Alteração";
      case "DEL":
        return "Exclusão";
      default:
        return type;
    }
  };

  const formatEntityData = (data: any) => {
    const skipKeys = [
      "_entityType",
      "id",
      "password",
      "photo",
      "image_url",
      "rev",
      "revtype",
    ];
    const entries = Object.entries(data)
      .filter(([k, v]) => !skipKeys.includes(k) && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${v}`);

    if (entries.length === 0) return "-";

    return (
      <div
        style={{
          fontSize: "0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {entries.slice(0, 3).map((line, i) => (
          <span
            key={i}
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "280px",
            }}
          >
            {line}
          </span>
        ))}
        {entries.length > 3 && (
          <span
            style={{
              color: "var(--color-primary)",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            +{entries.length - 3} campos
          </span>
        )}
      </div>
    );
  };

  const filtered = history.filter((row) => {
    const term = search.toLowerCase();
    return (
      row.revisionType?.toLowerCase().includes(term) ||
      row.entityData?._entityType?.toLowerCase().includes(term) ||
      String(
        row.entityData?.prefix ||
          row.entityData?.registration ||
          row.entityData?.id ||
          ""
      )
        .toLowerCase()
        .includes(term)
    );
  });

  const columns: ColumnDef<AuditHistoryDTO>[] = [
    {
      header: "Ação",
      accessor: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            className={`history-icon ${row.revisionType}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px",
              borderRadius: "6px",
            }}
          >
            {getRevisionIcon(row.revisionType)}
          </span>
          <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>
            {getRevisionLabel(row.revisionType)}
          </span>
        </div>
      ),
    },
    {
      header: "Data / Hora",
      accessor: (row) =>
        row.revisionDate
          ? new Date(row.revisionDate).toLocaleString("pt-BR")
          : "-",
    },
    {
      header: "Módulo",
      accessor: (row) => (
        <span className="badge-campo">
          {row.entityData?._entityType || "Desconhecido"}
        </span>
      ),
    },
    {
      header: "Identificador",
      accessor: (row) => {
        const id =
          row.entityData?.prefix ||
          row.entityData?.registration ||
          row.entityData?.id;
        return id ? <strong>{id}</strong> : "-";
      },
    },
    {
      header: "Campos Alterados",
      accessor: (row) => formatEntityData(row.entityData),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        animation: "fadeIn 0.4s ease",
      }}
    >
      {/* Hero Banner */}
      <div className="dashboard-gestor-hero">
        <h1
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "0 0 8px 0",
          }}
        >
          <History size={32} />
          Auditoria Global
        </h1>
        <p>
          Acompanhe todas as modificações realizadas no sistema, incluindo
          criação, alteração e inativação de registros.
        </p>
      </div>

      {/* White Panel */}
      <div className="gestao-panel">
        {/* Topo do painel */}
        <div className="gestao-panel-topo">
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={20} />
            Histórico de Modificações
          </h2>
          <div className="gestao-panel-actions">
            <button
              onClick={fetchHistory}
              style={{
                padding: "8px 14px",
                gap: "6px",
                display: "flex",
                alignItems: "center",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "white",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                fontSize: "0.9rem",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--color-primary)";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--color-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "white";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--color-text-secondary)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--color-border)";
              }}
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Barra de pesquisa */}
        <div className="gestao-filters">
          <div className="gestao-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por ação, módulo ou identificador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span
            style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}
          >
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabela */}
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "var(--color-text-secondary)",
            }}
          >
            <p>Carregando registros de auditoria...</p>
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            keyExtractor={(row) => `${row.revisionId}-${row.revisionDate}`}
            emptyMessage="Nenhuma modificação registrada no sistema ainda."
          />
        )}
      </div>
    </div>
  );
}
