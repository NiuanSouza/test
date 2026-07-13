"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../../services/api";
import { useToast } from "../../../providers/ToastProvider";
import { DownloadModal } from "../../../components/DownloadModal";
import { AuditHistoryModal } from "../../../components/AuditHistoryModal";
import { FileText, Calendar, Filter, PlusCircle, X, Download, History, Edit3, Power, Save } from "lucide-react";
import "./relatorios.css";
import { Modal } from "../../../components/Modal";
import formStyles from "../SharedForm.module.css";
import clsx from "clsx";

// ===================================================================
// TYPES
// ===================================================================

interface ReportEntry {
  id: number;
  carPrefix?: string;
  userName?: string;
  userRegistration?: string;
  description?: string;
  departureTime?: string;
  arrivalTime?: string;
  completionTime?: string;
  status?: string;
  departureKm?: number;
  arrivalKm?: number;
  destinationRequester?: string;
  refuelingInfo?: string;

  // Refueling specifics (Backend might return translated DTO keys)
  ID?: number;
  "Veículo"?: string;
  "Motorista"?: string;
  "Data"?: string;
  "Posto"?: string;
  "Litros"?: number;
  "Valor Total"?: string;
  "Preço por Litro"?: string;
  technicianName?: string;
  gasStationName?: string;
  liters?: number;
  totalAmount?: string;
  pricePerLiter?: string;
  date?: string;
}

interface MonthlyReport {
  monthLabel: string;
  year: number;
  totalCalls: number;
  completedCalls: number;
  openCalls: number;
  isCurrentMonth: boolean;
  status: string;
  entries: ReportEntry[];
}

interface ReportsResponse {
  reports: MonthlyReport[];
}

interface CustomDateResponse {
  entries: ReportEntry[];
}

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function ReportsPage() {
  const { showToast } = useToast();

  const [relatoriosDoBanco, setRelatoriosDoBanco] = useState<MonthlyReport[]>([]);
  const [selectedReportIndex, setSelectedReportIndex] = useState<number>(0);
  const [selectedCategoria, setSelectedCategoria] = useState<string>("Chamados");

  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: string | null;
    to: string | null;
  }>({ from: null, to: null });

  const [customDateReport, setCustomDateReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Popup states
  const [isPopupDatesOpen, setIsPopupDatesOpen] = useState<boolean>(false);
  const [isPopupExportOpen, setIsPopupExportOpen] = useState<boolean>(false);

  // Audit History state
  const [auditEntity, setAuditEntity] = useState<{ type: 'service' | 'refueling', id: string } | null>(null);

  // Edit states
  const [showEditService, setShowEditService] = useState(false);
  const [showEditRefueling, setShowEditRefueling] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState<any>({});
  const [refuelingForm, setRefuelingForm] = useState<any>({});
  const [loadingForm, setLoadingForm] = useState(false);

  // Date input states (local to popup)
  const [inputDataInicio, setInputDataInicio] = useState<string>("");
  const [inputDataFim, setInputDataFim] = useState<string>("");

  // ===================================================================
  // API DATA FETCHING
  // ===================================================================

  const buscarDadosParaCategoria = useCallback(
    async (inicio: string, fim: string, categoria: string) => {
      let endpoint = "/dashboard/reports-by-date";
      if (categoria === "Abastecimento") {
        endpoint = "/dashboard/supplies-by-date";
      }

      showToast(`Buscando ${categoria.toLowerCase()}...`, "success");

      try {
        const response = await apiClient.get<CustomDateResponse>(
          `${endpoint}?startDate=${inicio}&endDate=${fim}`
        );

        if (response && response.entries) {
          const entries = response.entries;

          const customReport: MonthlyReport = {
            monthLabel: "Período Personalizado",
            year: new Date().getFullYear(),
            totalCalls: entries.length,
            completedCalls: entries.filter((e) =>
              e.status?.includes("Finalizado")
            ).length,
            openCalls: entries.filter(
              (e) => e.status && !e.status.includes("Finalizado")
            ).length,
            isCurrentMonth: false,
            status: `Filtro: ${formatDate(inicio)} a ${formatDate(fim)}`,
            entries: entries,
          };

          setCustomDateReport(customReport);
        } else {
          showToast(`Erro ao buscar ${categoria.toLowerCase()}`, "error");
        }
      } catch (error) {
        console.error(error);
        showToast("Erro de conexão com o servidor.", "error");
      }
    },
    [showToast]
  );

  const carregarRelatoriosDaAPI = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<ReportsResponse>("/dashboard/reports");
      if (response && response.reports) {
        setRelatoriosDoBanco(response.reports);
      } else {
        setRelatoriosDoBanco([]);
        showToast("Falha ao carregar relatórios.", "error");
      }
    } catch (error) {
      console.error(error);
      setRelatoriosDoBanco([]);
      showToast("Erro de conexão com o servidor.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load initial reports & set year range
  useEffect(() => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const year = ontem.getFullYear();
    const pad = (n: number) => String(n).padStart(2, "0");

    const inicio = `${year}-01-01`;
    const fim = `${year}-${pad(ontem.getMonth() + 1)}-${pad(ontem.getDate())}`;

    setInputDataInicio(inicio);
    setInputDataFim(fim);
    setSelectedDateRange({ from: inicio, to: fim });

    carregarRelatoriosDaAPI().then(() => {
      buscarDadosParaCategoria(inicio, fim, "Chamados");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================================================================
  // ACTIONS & HANDLERS
  // ===================================================================

  const selecionarCategoria = async (categoria: string) => {
    setSelectedCategoria(categoria);
    if (selectedDateRange.from && selectedDateRange.to) {
      await buscarDadosParaCategoria(selectedDateRange.from, selectedDateRange.to, categoria);
    } else {
      // Se não houver range customizado, recarrega para o mês atual
      const report = relatoriosDoBanco[selectedReportIndex];
      if (report && categoria === "Abastecimento") {
        const range = obterDatasMes(report);
        await buscarDadosParaCategoria(range.start, range.end, categoria);
      }
    }
  };

  const selecionarRelatorio = async (index: number) => {
    setSelectedReportIndex(index);
    setSelectedDateRange({ from: null, to: null });
    setCustomDateReport(null);

    const report = relatoriosDoBanco[index];
    if (report) {
      if (selectedCategoria === "Abastecimento") {
        const range = obterDatasMes(report);
        await buscarDadosParaCategoria(range.start, range.end, "Abastecimento");
      }
    }
  };

  const confirmarPeriodoRelatorio = async () => {
    if (!inputDataInicio || !inputDataFim) {
      showToast("Escolha data de início e fim.", "error");
      return;
    }
    setSelectedDateRange({ from: inputDataInicio, to: inputDataFim });
    setIsPopupDatesOpen(false);
    await buscarDadosParaCategoria(inputDataInicio, inputDataFim, selectedCategoria);
  };

  const inativarRegistro = async (tipo: 'service' | 'refueling', id: number) => {
    try {
      const endpoint = tipo === 'service' ? `/service/toggle-active/${id}` : `/service/refueling/toggle-active/${id}`;
      const res: any = await apiClient.patch(endpoint, {});
      showToast(res.message || "Status alterado com sucesso", "success");
      
      // Reload current tab
      if (selectedDateRange.from && selectedDateRange.to) {
        await buscarDadosParaCategoria(selectedDateRange.from, selectedDateRange.to, selectedCategoria);
      } else {
        await carregarRelatoriosDaAPI();
        if (selectedCategoria === "Abastecimento") {
          const report = relatoriosDoBanco[selectedReportIndex];
          if (report) {
            const range = obterDatasMes(report);
            await buscarDadosParaCategoria(range.start, range.end, "Abastecimento");
          }
        }
      }
    } catch (e: any) {
      showToast(e.message || "Erro ao inativar registro", "error");
    }
  };

  const openEditService = (entry: ReportEntry) => {
    setEditingId(entry.id);
    setServiceForm({
      description: entry.description || "",
      departureKm: entry.departureKm || "",
      arrivalKm: entry.arrivalKm || "",
      destinationRequester: entry.destinationRequester || "",
      carPrefix: entry.carPrefix || "",
      userRegistration: entry.userRegistration || ""
    });
    setShowEditService(true);
  };

  const openEditRefueling = (entry: ReportEntry) => {
    setEditingId(entry.id || entry.ID || null);

    const extractNumber = (val: any) => {
      if (!val) return "";
      if (typeof val === "number") return val.toString();
      return val.replace(/[R$\s]/g, "").replace(",", ".");
    };

    setRefuelingForm({
      gasStationName: entry.gasStationName || entry["Posto"] || "",
      liters: extractNumber(entry.liters || entry["Litros"]),
      totalAmount: extractNumber(entry.totalAmount || entry["Valor Total"]),
      pricePerLiter: extractNumber(entry.pricePerLiter || entry["Preço por Litro"])
    });
    setShowEditRefueling(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    try {
      await apiClient.patch(`/service/update-details/${editingId}`, {
        description: serviceForm.description,
        departureKm: serviceForm.departureKm ? parseFloat(serviceForm.departureKm) : null,
        arrivalKm: serviceForm.arrivalKm ? parseFloat(serviceForm.arrivalKm) : null,
        destinationRequester: serviceForm.destinationRequester,
        carPrefix: serviceForm.carPrefix,
        userRegistration: serviceForm.userRegistration
      });
      showToast("Chamado atualizado com sucesso!", "success");
      setShowEditService(false);
      // Reload current tab
      if (selectedDateRange.from && selectedDateRange.to) {
        await buscarDadosParaCategoria(selectedDateRange.from, selectedDateRange.to, selectedCategoria);
      } else {
        await carregarRelatoriosDaAPI();
      }
    } catch (error: any) {
      showToast(error.message || "Erro ao atualizar chamado.", "error");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleSaveRefueling = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    try {
      await apiClient.patch(`/service/refueling/update/${editingId}`, {
        gasStationName: refuelingForm.gasStationName,
        liters: refuelingForm.liters ? parseFloat(refuelingForm.liters) : null,
        totalAmount: refuelingForm.totalAmount ? parseFloat(refuelingForm.totalAmount) : null,
        pricePerLiter: refuelingForm.pricePerLiter ? parseFloat(refuelingForm.pricePerLiter) : null
      });
      showToast("Abastecimento atualizado com sucesso!", "success");
      setShowEditRefueling(false);
      // Reload
      if (selectedDateRange.from && selectedDateRange.to) {
        await buscarDadosParaCategoria(selectedDateRange.from, selectedDateRange.to, selectedCategoria);
      } else {
        const report = relatoriosDoBanco[selectedReportIndex];
        if (report) {
          const range = obterDatasMes(report);
          await buscarDadosParaCategoria(range.start, range.end, "Abastecimento");
        }
      }
    } catch (error: any) {
      showToast(error.message || "Erro ao atualizar abastecimento.", "error");
    } finally {
      setLoadingForm(false);
    }
  };

  // ===================================================================
  // HELPERS
  // ===================================================================

  const obterDatasMes = (report: MonthlyReport) => {
    const mapMeses: Record<string, number> = {
      janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
      julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
    };
    const monthIndex = mapMeses[report.monthLabel.toLowerCase()] ?? new Date().getMonth();
    const year = report.year;
    const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
      lastDay
    ).padStart(2, "0")}`;
    return { start, end };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("pt-BR");
  };

  const isRelatorioParcial = (report: MonthlyReport | null) => {
    if (!report) return false;
    return report.isCurrentMonth;
  };

  const report = customDateReport || relatoriosDoBanco[selectedReportIndex];

  // Render header columns
  const getHeaderRow = () => {
    if (selectedCategoria === "Abastecimento") {
      return (
        <tr>
          <th>ID</th>
          <th>Veículo</th>
          <th>Motorista</th>
          <th>Posto</th>
          <th>Litros</th>
          <th>Valor Total</th>
          <th>Data</th>
          <th style={{ textAlign: "right" }}>Ações</th>
        </tr>
      );
    }

    return (
      <tr>
        <th>ID</th>
        <th>Veículo</th>
        <th>Técnico</th>
        <th>Descrição</th>
        <th>Saída</th>
        <th>Conclusão</th>
        <th>Status</th>
        <th style={{ textAlign: "right" }}>Ações</th>
      </tr>
    );
  };

  // Render row data
  const renderRow = (entry: ReportEntry, index: number) => {
    if (selectedCategoria === "Abastecimento") {
      const displayId = entry.id || entry.ID;
      const displayCar = entry.carPrefix || entry["Veículo"] || "-";
      const displayTech = entry.technicianName || entry["Motorista"] || "-";
      const displayStation = entry.gasStationName || entry["Posto"] || "-";
      const displayLiters = entry.liters || entry["Litros"] ? `${entry.liters || entry["Litros"]} L` : "-";
      const displayAmount = entry.totalAmount || entry["Valor Total"] || "-";
      const displayDate = entry.date || entry["Data"] || "-";

      return (
        <tr key={index}>
          <td>{displayId}</td>
          <td>{displayCar}</td>
          <td>{displayTech}</td>
          <td>{displayStation}</td>
          <td>{displayLiters}</td>
          <td>{displayAmount}</td>
          <td>{displayDate}</td>
          <td style={{ textAlign: "right" }}>
            <div className="td-acoes" style={{ justifyContent: "flex-end" }}>
              <button className="btn-icon history" title="Ver Histórico" onClick={() => setAuditEntity({ type: 'refueling', id: String(displayId) })}>
                <History size={18} />
              </button>
              <button className="btn-icon" title="Editar" onClick={() => openEditRefueling(entry)}>
                <Edit3 size={18} />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    let statusClass = "status-indicar";
    if (entry.status === "Finalizado") statusClass = "status-finalizado";
    else if (entry.status === "Em andamento") statusClass = "status-andamento";

    return (
      <tr key={index}>
        <td>{entry.id}</td>
        <td>{entry.carPrefix || "-"}</td>
        <td>{entry.userName || "-"}</td>
        <td>{entry.description || "-"}</td>
        <td>{entry.departureTime || "-"}</td>
        <td>{entry.completionTime || "-"}</td>
        <td>
          <span className={`status-chip ${statusClass}`}>{entry.status || "-"}</span>
        </td>
        <td style={{ textAlign: "right" }}>
            <div className="td-acoes" style={{ justifyContent: "flex-end" }}>
              <button className="btn-icon history" title="Ver Histórico" onClick={() => setAuditEntity({ type: 'service', id: String(entry.id) })}>
                <History size={18} />
              </button>
              <button className="btn-icon" title="Editar" onClick={() => openEditService(entry)}>
                <Edit3 size={18} />
              </button>
            </div>
        </td>
      </tr>
    );
  };

  return (
    <main className="relatorios-container">
      {/* ========== DASHBOARD METRICS ========== */}
      <section className="relatorios-dashboard">
        <div className="relatorios-dashboard-topo">
          <div>
            <h1>Relatórios por mês</h1>
            <p>Visão de chamados organizada por mês e status do período atual.</p>
          </div>
        </div>

        <div className="relatorios-kpis">
          <article className="relatorios-kpi">
            <span>Status atual</span>
            <strong>{loading ? "Carregando..." : report?.status || "Nenhum dado"}</strong>
            <small>Relatório do período selecionado.</small>
          </article>
          <article className="relatorios-kpi">
            <span>Chamados no mês</span>
            <strong>{loading ? "..." : report?.totalCalls ?? 0}</strong>
            <small>Chamados registrados neste período.</small>
          </article>
          <article className="relatorios-kpi">
            <span>Concluídos</span>
            <strong>{loading ? "..." : report?.completedCalls ?? 0}</strong>
            <small>Atendimentos finalizados com sucesso.</small>
          </article>
          <article className="relatorios-kpi">
            <span>Em aberto</span>
            <strong>{loading ? "..." : report?.openCalls ?? 0}</strong>
            <small>Chamados em andamento para fechamento.</small>
          </article>
        </div>
      </section>

      {/* ========== MAIN PANEL ========== */}
      <section className="relatorios-panel">
        <div className="relatorios-panel-topo">
          <div>
            <h2>Relatórios personalizados</h2>
            <p>Escolha a categoria e defina um período para gerar relatórios completos ou parciais.</p>
          </div>
          <div className="relatorios-panel-actions">
            <button
              className="btn-limpar-filtro"
              type="button"
              onClick={() => setIsPopupDatesOpen(true)}
            >
              Escolher datas
            </button>
            <button
              className="btn-acao-filtrar"
              type="button"
              onClick={() => setIsPopupExportOpen(true)}
            >
              {isRelatorioParcial(report) ? "Gerar relatório parcial" : "Gerar relatório completo"}
            </button>
          </div>
        </div>

        {/* CATEGORY SWITCHERS */}
        <div className="gestao-tabs" style={{ marginBottom: "16px" }}>
          {["Chamados", "Abastecimento"].map((cat) => (
            <button
              key={cat}
              type="button"
              className={clsx("gestao-tab", cat === selectedCategoria ? "active" : "")}
              onClick={() => selecionarCategoria(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* MONTH CHIPS */}
        {!selectedDateRange.from && !selectedDateRange.to && (
          <div className="gestao-tabs" style={{ marginBottom: "16px", flexWrap: "wrap" }}>
            {relatoriosDoBanco.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className={clsx("gestao-tab", idx === selectedReportIndex ? "active" : "")}
                onClick={() => selecionarRelatorio(idx)}
              >
                {item.monthLabel} {item.year}
              </button>
            ))}
          </div>
        )}

        {/* BANNER RANGE */}
        <div className="relatorios-periodo-info">
          {selectedDateRange.from && selectedDateRange.to
            ? `Período selecionado: ${formatDate(selectedDateRange.from)} até ${formatDate(selectedDateRange.to)}`
            : report
            ? `Período atual: ${report.monthLabel} ${report.year}`
            : `Período atual: ${selectedCategoria}`}
        </div>

        {/* DATA TABLE */}
        <div className="relatorios-table-wrapper">
          <table className="relatorios-table">
            <thead>{getHeaderRow()}</thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={selectedCategoria === "Chamados" ? 8 : 7} style={{ textAlign: "center", padding: "28px" }}>
                    Carregando dados...
                  </td>
                </tr>
              ) : !report || !report.entries || report.entries.length === 0 ? (
                <tr>
                  <td colSpan={selectedCategoria === "Chamados" ? 8 : 7} style={{ textAlign: "center", color: "#67717b", padding: "28px 0" }}>
                    Nenhum registro de {selectedCategoria.toLowerCase()} disponível para este período.
                  </td>
                </tr>
              ) : (
                report.entries.map((entry, idx) => renderRow(entry, idx))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========== POPUP: DATE CHOOSER ========== */}
      <div className={`popup-relatorio-datas ${isPopupDatesOpen ? "aberto" : ""}`}>
        <div className="popup-card">
          <div className="popup-header">
            <h2 className="popup-titulo">Escolher período do relatório</h2>
            <button className="popup-close" type="button" onClick={() => setIsPopupDatesOpen(false)}>
              ×
            </button>
          </div>

          <div className="popup-conteudo">
            <div className="input-group">
              <label htmlFor="relatorio-data-inicio">Data de início</label>
              <input
                id="relatorio-data-inicio"
                type="date"
                className="input"
                value={inputDataInicio}
                onChange={(e) => setInputDataInicio(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="relatorio-data-fim">Data de fim</label>
              <input
                id="relatorio-data-fim"
                type="date"
                className="input"
                value={inputDataFim}
                onChange={(e) => setInputDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="popup-actions">
            <button type="button" className="btn-acao-filtrar" onClick={confirmarPeriodoRelatorio}>
              Confirmar
            </button>
            <button type="button" className="btn-limpar-filtro" onClick={() => setIsPopupDatesOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* ========== POPUP: EXPORT (Now Unified DownloadModal) ========== */}
      <DownloadModal
        isOpen={isPopupExportOpen}
        onClose={() => setIsPopupExportOpen(false)}
        exportUrlPath={`/export/{format}/${selectedCategoria === "Abastecimento" ? "supplies-by-date" : "reports-by-date"}/{fileName}`}
        defaultFileName={`Relatorio_${selectedCategoria}`}
        extraParams={
          (selectedDateRange.from && selectedDateRange.to) 
            ? { startDate: selectedDateRange.from, endDate: selectedDateRange.to } 
            : (() => {
                if (report) {
                  const range = obterDatasMes(report);
                  return { startDate: range.start, endDate: range.end };
                }
                return undefined;
              })()
        }
      />

      {/* ========== POPUP: AUDIT HISTORY ========== */}
      {auditEntity && (
        <AuditHistoryModal
          isOpen={true}
          onClose={() => setAuditEntity(null)}
          entityType={auditEntity.type}
          entityId={auditEntity.id}
          title={auditEntity.type === 'service' ? `Chamado #${auditEntity.id}` : `Abastecimento #${auditEntity.id}`}
        />
      )}

      {/* ========== MODAL: EDIT SERVICE ========== */}
      <Modal isOpen={showEditService} onClose={() => setShowEditService(false)} title="Editar Chamado">
        <form onSubmit={handleSaveService} className={formStyles.form}>
          <div className={formStyles.formGrid}>
            <div className="auth-form-group">
              <input type="text" id="dest" className="auth-input" value={serviceForm.destinationRequester} onChange={e => setServiceForm({...serviceForm, destinationRequester: e.target.value})} placeholder=" " />
              <label htmlFor="dest" className="auth-label">Destino / Solicitante</label>
            </div>
            <div className="auth-form-group">
              <input type="number" id="depKm" className="auth-input" value={serviceForm.departureKm} onChange={e => setServiceForm({...serviceForm, departureKm: e.target.value})} placeholder=" " />
              <label htmlFor="depKm" className="auth-label">KM Saída</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="arrKm" className="auth-input" value={serviceForm.arrivalKm} onChange={e => setServiceForm({...serviceForm, arrivalKm: e.target.value})} placeholder=" " />
              <label htmlFor="arrKm" className="auth-label">KM Chegada</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="carPrefix" className="auth-input" value={serviceForm.carPrefix} onChange={e => setServiceForm({...serviceForm, carPrefix: e.target.value})} placeholder=" " />
              <label htmlFor="carPrefix" className="auth-label">Prefixo do Veículo</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="userReg" className="auth-input" value={serviceForm.userRegistration} onChange={e => setServiceForm({...serviceForm, userRegistration: e.target.value})} placeholder=" " />
              <label htmlFor="userReg" className="auth-label">Matrícula do Motorista</label>
            </div>
            <div className="auth-form-group" style={{ gridColumn: "1 / -1" }}>
              <textarea id="desc" className="auth-input" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} placeholder=" " style={{ minHeight: "80px", paddingTop: "12px" }} />
              <label htmlFor="desc" className="auth-label">Descrição</label>
            </div>
          </div>
          <div className={formStyles.formActions}>
            <button type="button" className="btn-secondary" onClick={() => setShowEditService(false)} disabled={loadingForm}>
              <X size={18} /> Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loadingForm}>
              <Save size={18} /> Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>

      {/* ========== MODAL: EDIT REFUELING ========== */}
      <Modal isOpen={showEditRefueling} onClose={() => setShowEditRefueling(false)} title="Editar Abastecimento">
        <form onSubmit={handleSaveRefueling} className={formStyles.form}>
          <div className={formStyles.formGrid}>
            <div className="auth-form-group" style={{ gridColumn: "1 / -1" }}>
              <input type="text" id="gasStation" className="auth-input" required value={refuelingForm.gasStationName} onChange={e => setRefuelingForm({...refuelingForm, gasStationName: e.target.value})} placeholder=" " />
              <label htmlFor="gasStation" className="auth-label">Nome do Posto</label>
            </div>
            <div className="auth-form-group">
              <input type="number" step="0.1" id="liters" className="auth-input" value={refuelingForm.liters} onChange={e => setRefuelingForm({...refuelingForm, liters: e.target.value})} placeholder=" " />
              <label htmlFor="liters" className="auth-label">Litros</label>
            </div>
            <div className="auth-form-group">
              <input type="number" step="0.01" id="price" className="auth-input" value={refuelingForm.pricePerLiter} onChange={e => setRefuelingForm({...refuelingForm, pricePerLiter: e.target.value})} placeholder=" " />
              <label htmlFor="price" className="auth-label">Preço por Litro (R$)</label>
            </div>
            <div className="auth-form-group">
              <input type="number" step="0.01" id="total" className="auth-input" value={refuelingForm.totalAmount} onChange={e => setRefuelingForm({...refuelingForm, totalAmount: e.target.value})} placeholder=" " />
              <label htmlFor="total" className="auth-label">Valor Total (R$)</label>
            </div>
          </div>
          <div className={formStyles.formActions}>
            <button type="button" className="btn-secondary" onClick={() => setShowEditRefueling(false)} disabled={loadingForm}>
              <X size={18} /> Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loadingForm}>
              <Save size={18} /> Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
