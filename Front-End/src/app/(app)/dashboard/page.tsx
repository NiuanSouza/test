"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../services/api";
import "./dashboard-gestor.css";

// ===================================================================
// TYPES
// ===================================================================

interface DashboardMetrics {
  availableCars: number;
  maintenanceCars: number;
  inUseCars: number;
  availableTechnicians: number;
  onDutyTechnicians: number;
  monthlyFuelSpend: number;
  averagePricePerLiter: number;
  totalLitersRefueled: number;
}

interface HistoryRevision {
  entity: {
    id: number;
    departureTime: string | null;
    completionTime: string | null;
    description: string | null;
    destinationRequester: string | null;
    car?: { prefix: string };
    user?: { name: string; registration: string };
    priority?: string;
  };
  revisionType: string;
  revisionDate: string;
}

// ===================================================================
// HELPERS
// ===================================================================

function formatarMoeda(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

// ===================================================================
// PAGE COMPONENT
// ===================================================================

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [history, setHistory] = useState<HistoryRevision[]>([]);
  const [resumoAtivos, setResumoAtivos] = useState(0);
  const [resumoConcluidos, setResumoConcluidos] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [metricsRes, historyRes] = await Promise.all([
          apiClient.get<DashboardMetrics>("/dashboard/metrics"),
          apiClient.get<HistoryRevision[]>("/dashboard/history"),
        ]);

        if (metricsRes) setMetrics(metricsRes);

        if (historyRes && Array.isArray(historyRes)) {
          // Remover revisões duplicadas do mesmo chamado (manter só a mais recente)
          const uniqueHistory = [];
          const seenIds = new Set();
          for (const rev of historyRes) {
            if (rev.entity && !seenIds.has(rev.entity.id)) {
              seenIds.add(rev.entity.id);
              uniqueHistory.push(rev);
            }
          }

          setHistory(uniqueHistory.slice(0, 5));
          setResumoAtivos(
            historyRes.filter(
              (rev) => rev.entity && rev.entity.completionTime === null
            ).length
          );
          setResumoConcluidos(
            historyRes.filter(
              (rev) => rev.entity && rev.entity.completionTime !== null
            ).length
          );
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <>
      {/* ========== DASHBOARD HERO ========== */}
      <section className="dashboard-gestor-hero">
        <div className="dashboard-topo">
          <h2>Dashboard da frota e equipe</h2>
          <p>
            Painel inicial com os principais indicadores de viaturas, técnicos e
            abastecimento.
          </p>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-card destaque-disponivel">
            <span className="dashboard-label">Viaturas disponíveis</span>
            <strong className="dashboard-valor">
              {loading ? "..." : metrics?.availableCars ?? 0}
            </strong>
            <span className="dashboard-info">
              Prontas para atendimento imediato
            </span>
          </article>

          <article className="dashboard-card destaque-manutencao">
            <span className="dashboard-label">Viaturas em manutenção</span>
            <strong className="dashboard-valor">
              {loading ? "..." : metrics?.maintenanceCars ?? 0}
            </strong>
            <span className="dashboard-info">
              Em oficina ou revisão preventiva
            </span>
          </article>

          <article className="dashboard-card destaque-uso">
            <span className="dashboard-label">Viaturas em uso</span>
            <strong className="dashboard-valor">
              {loading ? "..." : metrics?.inUseCars ?? 0}
            </strong>
            <span className="dashboard-info">
              Em rondas e operações ativas
            </span>
          </article>

          <article className="dashboard-card destaque-tecnicos">
            <span className="dashboard-label">Técnicos disponíveis</span>
            <strong className="dashboard-valor">
              {loading ? "..." : metrics?.availableTechnicians ?? 0}
            </strong>
            <span className="dashboard-info">Aguardando nova alocação</span>
          </article>

          <article className="dashboard-card destaque-servico">
            <span className="dashboard-label">Técnicos em serviço</span>
            <strong className="dashboard-valor">
              {loading ? "..." : metrics?.onDutyTechnicians ?? 0}
            </strong>
            <span className="dashboard-info">
              Atendendo chamados neste momento
            </span>
          </article>

          <article className="dashboard-card destaque-combustivel">
            <span className="dashboard-label">Gasto de combustível mensal</span>
            <strong className="dashboard-valor">
              {loading
                ? "..."
                : metrics?.monthlyFuelSpend !== undefined
                ? formatarMoeda(metrics.monthlyFuelSpend)
                : "R$ 0,00"}
            </strong>
            <span className="dashboard-info">
              Total registrado no mês atual
            </span>
          </article>

          <article className="dashboard-card destaque-preco">
            <span className="dashboard-label">Preço médio por litro</span>
            <strong className="dashboard-valor">
              {loading
                ? "..."
                : metrics?.averagePricePerLiter !== undefined
                ? formatarMoeda(metrics.averagePricePerLiter)
                : "R$ 0,00"}
            </strong>
            <span className="dashboard-info">
              Média consolidada dos abastecimentos
            </span>
          </article>

          <article className="dashboard-card destaque-litros">
            <span className="dashboard-label">Total de litros abastecidos</span>
            <strong className="dashboard-valor">
              {loading
                ? "..."
                : metrics?.totalLitersRefueled !== undefined
                ? `${formatarNumero(metrics.totalLitersRefueled)} L`
                : "0 L"}
            </strong>
            <span className="dashboard-info">Volume acumulado no mês</span>
          </article>
        </div>
      </section>

      {/* ========== HISTÓRICO RECENTE ========== */}
      <section className="card-historico-gestor">
        <div className="card-historico-topo">
          <div>
            <h2>Histórico de chamados</h2>
            <p>
              Últimos atendimentos com prioridade, status, responsável e prazo.
            </p>
          </div>

          <div className="historico-resumo">
            <article className="historico-resumo-card">
              <span>Chamados ativos</span>
              <strong>{loading ? "..." : resumoAtivos}</strong>
            </article>
            <article className="historico-resumo-card">
              <span>Concluídos hoje</span>
              <strong>{loading ? "..." : resumoConcluidos}</strong>
            </article>
            <article className="historico-resumo-card">
              <span>Tempo médio</span>
              <strong>...</strong>
            </article>
          </div>
        </div>

        <div className="lista-chamados-gestor-dash">
          {loading ? (
            <div className="nenhum-registro-dash">
              Carregando histórico...
            </div>
          ) : history.length === 0 ? (
            <div className="nenhum-registro-dash">
              Nenhum chamado registrado no histórico.
            </div>
          ) : (
            history.map((rev, i) => {
              if (!rev.entity) return null;

              const isFinalizado = rev.entity.completionTime !== null;
              const statusStr = isFinalizado ? "finalizado" : "andamento";
              const statusLabelStr = isFinalizado
                ? "Finalizado"
                : "Em andamento";

              const dataAbertura = new Date(
                rev.revisionDate ||
                  rev.entity.departureTime ||
                  new Date().toISOString()
              );
              const horaStr = `${String(dataAbertura.getHours()).padStart(
                2,
                "0"
              )}:${String(dataAbertura.getMinutes()).padStart(2, "0")}`;

              const titulo =
                rev.revisionType === "ADD"
                  ? "Abertura de Chamado"
                  : "Atualização de Chamado";
              const prefixo = rev.entity.car?.prefix || "N/A";
              const tecnico = rev.entity.user?.name || "N/A";
              const destino =
                rev.entity.destinationRequester || "Local não informado";

              return (
                <article
                  key={i}
                  className={`item-chamado-dash item-${statusStr}-dash`}
                >
                  <div className="item-chamado-principal">
                    <div className="item-chamado-topo">
                      <span className="chamado-numero">
                        N° {rev.entity.id}
                      </span>
                      <span
                        className={`status-chip-dash status-${statusStr}-dash`}
                      >
                        {statusLabelStr}
                      </span>
                    </div>
                    <h3>{titulo}</h3>
                    <div className="dados-veiculo">
                      Viatura {prefixo} | Técnico: {tecnico}
                    </div>
                    <div className="meta-chamado-dash">
                      <span>{destino}</span>
                      <span>Horário: {horaStr}</span>
                    </div>
                  </div>
                  <button
                    className={`btn-status-dash status-${statusStr}-dash`}
                    onClick={() => router.push("/history")}
                  >
                    Ver histórico
                  </button>
                </article>
              );
            })
          )}
        </div>

        <button
          className="btn-historico-completo"
          onClick={() => router.push("/history")}
        >
          Visualizar histórico completo
        </button>
      </section>
    </>
  );
}
