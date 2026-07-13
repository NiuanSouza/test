"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../../services/api";
import "./historico.css";

// ===================================================================
// TYPES
// ===================================================================

interface TimelineEvent {
  type: string;
  label: string;
  date: string | null;
  km: number | null;
  note: string | null;
  // Refueling extras
  liters?: number;
  pricePerLiter?: number;
  totalAmount?: number;
  fuelType?: string;
  gasStationName?: string;
  invoice?: string;
  // Incident extras
  severity?: string;
  resolved?: boolean;
  incidentType?: string;
}

interface Technician {
  registration: string;
  name: string;
}

interface Vehicle {
  prefix: string;
  licensePlate?: string;
  model?: string;
  brand?: string;
}

interface Chamado {
  serviceId: number;
  isActive: boolean;
  priority: string;
  departureKm: number | null;
  arrivalKm: number | null;
  destinationRequester: string | null;
  description: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  completionTime: string | null;
  hasIncidents: boolean;
  technician: Technician | null;
  vehicle: Vehicle | null;
  events: TimelineEvent[];
}

interface PaginatedResponse {
  content: Chamado[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// ===================================================================
// HELPERS
// ===================================================================

function formatarData(dataString: string | null): string {
  if (!dataString) return "";
  return new Date(dataString).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function traduzirPrioridade(raw: string): { label: string; cls: string } {
  const mapa: Record<string, { label: string; cls: string }> = {
    HIGH: { label: "Alta", cls: "prioridade-alta" },
    MEDIUM: { label: "Média", cls: "prioridade-media" },
    LOW: { label: "Baixa", cls: "prioridade-baixa" },
    SCHEDULED: { label: "Agendado", cls: "prioridade-baixa" },
  };
  return mapa[raw] || { label: "Média", cls: "prioridade-media" };
}

function obterConfigEvento(type: string): { icon: string; color: string } {
  const mapa: Record<string, { icon: string; color: string }> = {
    CHECK_IN: { icon: "🟢", color: "#14804a" },
    CHECK_OUT: { icon: "🔵", color: "#0d36b1" },
    REFUELING: { icon: "🟡", color: "#8d6200" },
    INCIDENT: { icon: "🔴", color: "#d40000" },
    ARRIVAL_AT_LOCATION: { icon: "🟣", color: "#6a0dad" },
    SERVICE_COMPLETION: { icon: "✅", color: "#14804a" },
    RETURN_TRIP: { icon: "🔷", color: "#002080" },
  };
  return mapa[type] || { icon: "⚪", color: "#546583" };
}

// ===================================================================
// TIMELINE COMPONENT
// ===================================================================

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <p className="historico-observacao" style={{ fontStyle: "italic" }}>
        Nenhuma ação registrada ainda.
      </p>
    );
  }

  return (
    <ul className="timeline-list">
      {events.map((ev, i) => {
        const cfg = obterConfigEvento(ev.type);
        const hora = ev.date ? formatarData(ev.date) : "—";
        const km = ev.km ? ` • ${ev.km} km` : "";

        return (
          <li key={i} className="timeline-item">
            <span className="timeline-icon">{cfg.icon}</span>
            <div className="timeline-content">
              <strong className="timeline-label" style={{ color: cfg.color }}>
                {ev.label}
              </strong>
              <small className="timeline-date">
                {hora}
                {km}
              </small>
              {ev.note && <small className="timeline-note">{ev.note}</small>}

              {ev.type === "REFUELING" && (
                <div className="timeline-refueling-detail">
                  <span>
                    ⛽ <strong>{ev.fuelType || "Combustível"}</strong>
                  </span>
                  {ev.liters && <span>💧 {ev.liters.toFixed(2)}L</span>}
                  {ev.pricePerLiter && (
                    <span>🏷️ R$ {ev.pricePerLiter.toFixed(2)}/L</span>
                  )}
                  {ev.totalAmount && (
                    <span>
                      💰 <strong>Total: R$ {ev.totalAmount.toFixed(2)}</strong>
                    </span>
                  )}
                  {ev.gasStationName && <span>🏢 {ev.gasStationName}</span>}
                  {ev.invoice && <span>📄 NF: {ev.invoice}</span>}
                </div>
              )}

              {ev.type === "INCIDENT" && (
                <div className="timeline-incident-detail">
                  <span
                    className={
                      ev.severity === "CRITICAL"
                        ? "severity-critical"
                        : ev.severity === "LOW"
                        ? "severity-low"
                        : "severity-medium"
                    }
                  >
                    <strong>
                      Severidade:{" "}
                      {ev.severity === "CRITICAL"
                        ? "Crítica"
                        : ev.severity === "MEDIUM"
                        ? "Média"
                        : "Baixa"}
                    </strong>
                  </span>
                  <span>{ev.resolved ? "🟢 Resolvido" : "🔴 Pendente"}</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ===================================================================
// DETAIL MODAL COMPONENT
// ===================================================================

function DetalhePopup({
  chamado,
  onClose,
}: {
  chamado: Chamado | null;
  onClose: () => void;
}) {
  if (!chamado) return null;

  const ativo = chamado.isActive;
  const statusLabel = ativo ? "Em andamento" : "Finalizado";
  const tecnico = chamado.technician?.name || "Desconhecido";
  const matricula = chamado.technician?.registration || "—";
  const viatura = chamado.vehicle
    ? `${chamado.vehicle.prefix} — ${chamado.vehicle.brand || ""} ${
        chamado.vehicle.model || ""
      }`.trim()
    : "Não informada";
  const { label: prioLabel } = traduzirPrioridade(chamado.priority);

  return (
    <div className="sobreposicao aberto" onClick={onClose}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>
          ×
        </button>
        <h2 className="popup-titulo">
          Chamado #{chamado.serviceId} • {statusLabel}
        </h2>

        <div className="popup-grid">
          <DetalheBloco label="Técnico" value={tecnico} />
          <DetalheBloco label="Matrícula" value={matricula} />
          <DetalheBloco label="Viatura" value={viatura} />
          <DetalheBloco
            label="Saída"
            value={formatarData(chamado.departureTime) || "—"}
          />
          <DetalheBloco
            label="KM Saída"
            value={chamado.departureKm ? `${chamado.departureKm} km` : "—"}
          />
          <DetalheBloco
            label="KM Chegada"
            value={chamado.arrivalKm ? `${chamado.arrivalKm} km` : "—"}
          />
          <DetalheBloco
            label="Destino"
            value={chamado.destinationRequester || "—"}
          />
          <DetalheBloco label="Prioridade" value={prioLabel} />
          {!ativo && (
            <DetalheBloco
              label="Conclusão"
              value={formatarData(chamado.completionTime) || "—"}
            />
          )}
        </div>

        <div className="popup-obs">
          <strong>Descrição:</strong>
          <p>{chamado.description || "Sem descrição registrada."}</p>
        </div>

        <div style={{ marginTop: 18 }}>
          <strong style={{ fontSize: 14, color: "#1f2d48" }}>
            Linha do tempo — {chamado.events?.length || 0} ações registradas
          </strong>
          <Timeline events={chamado.events} />
        </div>

        <button
          type="button"
          className="popup-fechar-btn"
          style={{ marginTop: 18 }}
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function DetalheBloco({ label, value }: { label: string; value: string }) {
  return (
    <div className="detalhe-bloco">
      <span className="detalhe-label">{label}</span>
      <strong>{value || "Não informado"}</strong>
    </div>
  );
}

// ===================================================================
// MAIN PAGE
// ===================================================================

const ITENS_POR_PAGINA = 10;

export default function HistoryPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [paginacao, setPaginacao] = useState({
    totalPages: 0,
    totalElements: 0,
    isLast: true,
  });
  const [chamadoDetalhe, setChamadoDetalhe] = useState<Chamado | null>(null);

  const carregarPagina = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const data = await apiClient.get<PaginatedResponse>(
        `/dashboard/history/full?page=${page}&size=${ITENS_POR_PAGINA}`
      );
      if (data && data.content) {
        const sorted = [...data.content].sort(
          (a, b) => (b.serviceId || 0) - (a.serviceId || 0)
        );
        setChamados(sorted);
        setPaginacao({
          totalPages: data.totalPages,
          totalElements: data.totalElements,
          isLast: data.last,
        });
        setPaginaAtual(data.page);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarPagina(0);
  }, [carregarPagina]);

  // Filtro local
  const filteredChamados = chamados.filter((c) => {
    if (!searchTerm.trim()) return true;
    const busca = searchTerm.toLowerCase();
    const tecnico = (c.technician?.name || "").toLowerCase();
    const matricula = (c.technician?.registration || "").toLowerCase();
    const prefixo = (c.vehicle?.prefix || "").toLowerCase();
    const destino = (c.destinationRequester || "").toLowerCase();
    return (
      tecnico.includes(busca) ||
      matricula.includes(busca) ||
      prefixo.includes(busca) ||
      destino.includes(busca) ||
      String(c.serviceId).includes(busca)
    );
  });

  // KPI calculations
  const kpiTotal = paginacao.totalElements;
  const kpiFinalizados = chamados.filter((c) => !c.isActive).length;
  const kpiAndamento = chamados.filter((c) => c.isActive).length;
  const kpiIncidentes = chamados.filter((c) => c.hasIncidents).length;

  const irParaPagina = async (page: number) => {
    if (page < 0 || page >= paginacao.totalPages) return;
    setSearchTerm("");
    await carregarPagina(page);
  };

  return (
    <>
      {/* DASHBOARD HERO */}
      <section className="historico-dashboard">
        <div className="historico-dashboard-topo">
          <div>
            <h1>Painel completo de chamados</h1>
            <p>
              Acompanhe os atendimentos finalizados e em andamento com dados de
              prazo, viatura, responsável, prioridade e observações.
            </p>
          </div>
        </div>

        <div className="historico-kpis">
          <article className="historico-kpi">
            <span>Total no período</span>
            <strong>{loading ? "..." : kpiTotal}</strong>
            <small>Chamados registrados</small>
          </article>
          <article className="historico-kpi">
            <span>Finalizados</span>
            <strong>{loading ? "..." : kpiFinalizados}</strong>
            <small>Concluídos com sucesso</small>
          </article>
          <article className="historico-kpi">
            <span>Em andamento</span>
            <strong>{loading ? "..." : kpiAndamento}</strong>
            <small>Em operação de campo</small>
          </article>
          <article className="historico-kpi">
            <span>Com Incidentes</span>
            <strong>{loading ? "..." : kpiIncidentes}</strong>
            <small>Chamados com ocorrências</small>
          </article>
        </div>
      </section>

      {/* PAINEL COM BUSCA E LISTA */}
      <section className="painel-historico">
        <div className="painel-historico-topo">
          <div>
            <h2>Histórico de chamados realizados</h2>
          </div>
          <div className="filtros-historico">
            <span className="filtro-chip filtro-ativo">Base: todas</span>
            <span className="filtro-chip">Prioridade: todas</span>
          </div>
        </div>

        <div className="historico-busca-panel">
          <span className="historico-busca-label">
            Buscar técnico por nome, matrícula ou prefixo da viatura
          </span>
          <div className="historico-busca-input">
            <input
              type="text"
              placeholder="Digite nome, matrícula ou prefixo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  /* filtro local já é instantâneo */
                }
              }}
            />
          </div>
        </div>

        {/* LISTA DE CHAMADOS */}
        <div className="historico-lista">
          {loading ? (
            <div className="nenhum-registro">Carregando histórico...</div>
          ) : filteredChamados.length === 0 ? (
            <div className="nenhum-registro">
              Nenhum chamado encontrado para os filtros aplicados.
            </div>
          ) : (
            filteredChamados.map((chamado) => {
              const ativo = chamado.isActive === true;
              const statusLabel = ativo ? "Em andamento" : "Finalizado";
              const statusClass = ativo
                ? "status-andamento"
                : "status-finalizado";
              const itemClass = ativo ? "item-andamento" : "item-finalizado";
              const { label: prioLabel, cls: prioClass } = traduzirPrioridade(
                chamado.priority
              );

              const tecnico = chamado.technician?.name || "Não informado";
              const viatura = chamado.vehicle
                ? `${chamado.vehicle.prefix} — ${
                    chamado.vehicle.brand || ""
                  } ${chamado.vehicle.model || ""}`.trim()
                : "Não informada";
              const saida = formatarData(chamado.departureTime) || "—";
              const conclusao = formatarData(chamado.completionTime) || "—";
              const destino =
                chamado.destinationRequester || "Não informado";
              const descricao =
                chamado.description || "Sem descrição registrada.";

              return (
                <article
                  key={chamado.serviceId}
                  className={`historico-item ${itemClass}`}
                >
                  <div className="historico-item-topo">
                    <div>
                      <div className="historico-header-linha">
                        <span className="historico-numero">
                          Chamado #{chamado.serviceId}
                        </span>
                        <span className={`status-chip ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {ativo && (
                          <span className="badge-campo">🔔 Em campo</span>
                        )}
                        {chamado.hasIncidents && (
                          <span className="status-chip status-indicar" style={{ fontSize: 11, marginLeft: 6 }}>
                            ⚠ Incidente
                          </span>
                        )}
                      </div>
                      <h3>
                        {ativo
                          ? "Chamado em Andamento"
                          : "Chamado Finalizado"}
                      </h3>
                      <p className="historico-subtitulo">
                        {viatura} • {tecnico}
                      </p>
                    </div>
                    <div className={`historico-prioridade ${prioClass}`}>
                      {prioLabel}
                    </div>
                  </div>

                  <div className="historico-detalhes">
                    <DetalheBloco label="Responsável" value={tecnico} />
                    <DetalheBloco label="Viatura" value={viatura} />
                    <DetalheBloco label="Saída" value={saida} />
                    <DetalheBloco label="Destino" value={destino} />
                    {!ativo && (
                      <DetalheBloco label="Conclusão" value={conclusao} />
                    )}
                  </div>

                  <p className="historico-observacao">{descricao}</p>

                  <div style={{ marginTop: 12 }}>
                    <strong
                      style={{
                        fontSize: 13,
                        color: "#1f2d48",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Linha do tempo ({chamado.events?.length || 0} ações)
                    </strong>
                    <Timeline events={chamado.events} />
                  </div>

                  <button
                    type="button"
                    className="btn-detalhes"
                    style={{ marginTop: 14 }}
                    onClick={() => setChamadoDetalhe(chamado)}
                  >
                    Ver detalhes completos
                  </button>
                </article>
              );
            })
          )}
        </div>

        {/* PAGINAÇÃO */}
        {paginacao.totalPages > 1 && (
          <div className="historico-paginacao">
            <button
              className="btn-pag-anterior"
              onClick={() => irParaPagina(paginaAtual - 1)}
              disabled={paginaAtual === 0}
            >
              ← Anterior
            </button>
            <span className="pag-indicador">
              Página {paginaAtual + 1} de {paginacao.totalPages}
              <small>({paginacao.totalElements} chamados no total)</small>
            </span>
            <button
              className="btn-pag-proximo"
              onClick={() => irParaPagina(paginaAtual + 1)}
              disabled={paginacao.isLast}
            >
              Próxima →
            </button>
          </div>
        )}
      </section>

      {/* MODAL DE DETALHES */}
      <DetalhePopup
        chamado={chamadoDetalhe}
        onClose={() => setChamadoDetalhe(null)}
      />
    </>
  );
}
