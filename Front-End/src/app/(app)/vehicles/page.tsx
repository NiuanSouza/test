"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, Search, Save, X, CarFront, ListTree, AlertTriangle, Download, Car, Activity, Wrench, Edit3, Power, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../services/api";
import { useToast } from "../../../providers/ToastProvider";
import { Modal } from "../../../components/Modal";
import { DownloadModal } from "../../../components/DownloadModal";
import { AuditHistoryModal } from "../../../components/AuditHistoryModal";
import listStyles from "../SharedList.module.css";
import formStyles from "../SharedForm.module.css";
import "../shared-gestao.css";
import clsx from "clsx";

export default function VehiclesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"vehicles" | "types">("vehicles");
  
  // --- VEHICLES STATE ---
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);

  // Audit History State
  const [auditEntity, setAuditEntity] = useState<{ type: 'vehicle' | 'cartype', id: string } | null>(null);

  
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [showExportModal, setShowExportModal] = useState(false);
  
  const initialForm = {
    placa: "",
    prefixo: "",
    typeId: "",
    cor: "",
    fuel: "",
    tankCapacity: "",
    renavam: "",
    chassi: "",
    requiredLicense: "",
    observations: ""
  };
  const [formData, setFormData] = useState(initialForm);

  // --- CAR TYPES STATE ---
  const [carTypes, setCarTypes] = useState<any[]>([]);
  const [activeCarTypes, setActiveCarTypes] = useState<any[]>([]);
  const [searchType, setSearchType] = useState("");
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<number | null>(null);
  const initialTypeForm = {
    brand: "",
    model: "",
    year: "",
    category: "passenger"
  };
  const [typeFormData, setTypeFormData] = useState(initialTypeForm);
  
  // Cascade Inactivation State
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [typeToInactivate, setTypeToInactivate] = useState<any>(null);
  const [activeCarsForType, setActiveCarsForType] = useState<any[]>([]);

  useEffect(() => {
    loadVehicles();
    loadCarTypes();
    loadActiveCarTypes();
  }, []);

  // ================= FETCH DATA =================
  const loadVehicles = async () => {
    try {
      const response = await fetch("http://localhost:8080/vehicle", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("siva_token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
    }
  };

  const loadCarTypes = async () => {
    try {
      const response = await fetch("http://localhost:8080/vehicle/types", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("siva_token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCarTypes(data);
      }
    } catch (error) {
      console.error("Error loading car types:", error);
    }
  };

  const loadActiveCarTypes = async () => {
    try {
      const response = await fetch("http://localhost:8080/vehicle/types/active", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("siva_token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveCarTypes(data);
      }
    } catch (error) {
      console.error("Error loading active car types:", error);
    }
  };

  // ================= VEHICLE LOGIC =================
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.typeId) {
      showToast("Selecione um Tipo de Veículo", "error");
      return;
    }

    setLoadingForm(true);
    try {
      if (editingVehicle) {
        const payload = {
          licensePlate: formData.placa.trim(),
          color: formData.cor || "Não informada",
          fuel: formData.fuel,
          tankCapacity: formData.tankCapacity ? parseFloat(formData.tankCapacity) : null,
          renavam: formData.renavam,
          chassi: formData.chassi,
          requiredLicense: formData.requiredLicense,
          observations: formData.observations,
          type: { id: parseInt(formData.typeId) }
        };
        await apiClient.patch(`/vehicle/update/${editingVehicle}`, payload);
        showToast("Veículo atualizado com sucesso!", "success");
      } else {
        const payload = {
          prefix: formData.prefixo.trim(),
          licensePlate: formData.placa.trim(),
          color: formData.cor || "Não informada",
          fuel: formData.fuel,
          tankCapacity: formData.tankCapacity ? parseFloat(formData.tankCapacity) : null,
          renavam: formData.renavam,
          chassi: formData.chassi,
          requiredLicense: formData.requiredLicense,
          observations: formData.observations,
          available: true,
          currentKm: 0.0,
          type: { id: parseInt(formData.typeId) }
        };
        await apiClient.post("/vehicle/register", payload);
        showToast("Veículo cadastrado com sucesso!", "success");
      }
      closeVehicleModal();
      loadVehicles();
    } catch (error: any) {
      showToast(error.message || "Erro ao salvar veículo.", "error");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleToggleActiveVehicle = async (v: any) => {
    if (v.isActive && v.vehicleStatus === "IN_USE") {
      showToast("Não é possível inativar um veículo em uso.", "error");
      return;
    }
    try {
      await apiClient.patch(`/vehicle/update/${v.prefix || v.prefixo}`, { isActive: !v.isActive });
      showToast(`Veículo ${v.isActive ? 'inativado' : 'ativado'} com sucesso!`, "success");
      loadVehicles();
    } catch (error: any) {
      showToast(error.message || "Erro ao alterar status.", "error");
    }
  };

  const openEditVehicle = (v: any) => {
    setEditingVehicle(v.prefix || v.prefixo);
    setFormData({
      placa: v.licensePlate || v.placa || "",
      prefixo: v.prefix || v.prefixo || "",
      typeId: v.type?.id ? String(v.type.id) : "",
      cor: v.color || v.cor || "",
      fuel: v.fuel || "",
      tankCapacity: v.tankCapacity ? String(v.tankCapacity) : "",
      renavam: v.renavam || "",
      chassi: v.chassi || "",
      requiredLicense: v.requiredLicense || "",
      observations: v.observations || ""
    });
    setShowForm(true);
  };

  const closeVehicleModal = () => {
    setShowForm(false);
    setEditingVehicle(null);
    setFormData(initialForm);
  };

  // ================= CAR TYPE LOGIC =================
  const handleSaveCarType = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    try {
      const payload = {
        brand: typeFormData.brand.trim(),
        model: typeFormData.model.trim(),
        year: parseInt(typeFormData.year),
        category: typeFormData.category
      };

      if (editingType) {
        await apiClient.patch(`/vehicle/type/update/${editingType}`, payload);
        showToast("Tipo atualizado com sucesso!", "success");
      } else {
        const response: any = await apiClient.post("/vehicle/type", payload);
        showToast("Tipo de veículo cadastrado com sucesso!", "success");
        if (showForm) {
           setFormData(prev => ({ ...prev, typeId: String(response.id) }));
        }
      }
      closeTypeModal();
      loadCarTypes();
      loadActiveCarTypes();
    } catch (error: any) {
      showToast(error.message || "Erro ao salvar tipo.", "error");
    } finally {
      setLoadingForm(false);
    }
  };

  const checkTypeInactivation = async (t: any) => {
    if (!t.isActive) {
      try {
        await apiClient.patch(`/vehicle/type/update/${t.id}`, { isActive: true });
        showToast("Tipo ativado com sucesso!", "success");
        loadCarTypes();
        loadActiveCarTypes();
      } catch (error: any) {
        showToast(error.message, "error");
      }
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/vehicle/type/${t.id}/active-cars`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("siva_token")}` }
      });
      if (response.ok) {
        const activeCars = await response.json();
        if (activeCars.length > 0) {
          setTypeToInactivate(t);
          setActiveCarsForType(activeCars);
          setShowCascadeModal(true);
        } else {
          await apiClient.patch(`/vehicle/type/update/${t.id}`, { isActive: false });
          showToast("Tipo inativado com sucesso!", "success");
          loadCarTypes();
          loadActiveCarTypes();
        }
      }
    } catch (error: any) {
      showToast("Erro ao verificar dependências", "error");
    }
  };

  const confirmCascadeInactivation = async () => {
    try {
      await apiClient.post(`/vehicle/type/${typeToInactivate.id}/inactivate-cascade`, {});
      showToast("Tipo e veículos dependentes inativados!", "success");
      setShowCascadeModal(false);
      setTypeToInactivate(null);
      setActiveCarsForType([]);
      loadCarTypes();
      loadActiveCarTypes();
      loadVehicles();
    } catch (error: any) {
      showToast(error.message || "Erro ao inativar", "error");
    }
  };

  const openEditType = (t: any) => {
    setEditingType(t.id);
    setTypeFormData({
      brand: t.brand,
      model: t.model,
      year: String(t.year),
      category: t.category
    });
    setShowTypeForm(true);
  };

  const closeTypeModal = () => {
    setShowTypeForm(false);
    setEditingType(null);
    setTypeFormData(initialTypeForm);
  };

  const openTypeFormFromVehicle = () => {
    setShowTypeForm(true);
  };

  // ================= METRICS & FILTERS =================
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.isActive).length;
  const inUseVehicles = vehicles.filter(v => v.vehicleStatus === "IN_USE").length;
  const maintenanceVehicles = vehicles.filter(v => v.vehicleStatus === "MAINTENANCE").length;

  const totalTypes = carTypes.length;
  const passeios = carTypes.filter(t => t.category === "passenger").length;
  const utilitarios = carTypes.filter(t => t.category === "utility").length;

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.licensePlate?.toLowerCase().includes(search.toLowerCase()) || 
       v.prefix?.toLowerCase().includes(search.toLowerCase()) ||
       v.type?.model?.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === "AVAILABLE") matchesStatus = v.vehicleStatus === "AVAILABLE";
    if (filterStatus === "IN_USE") matchesStatus = v.vehicleStatus === "IN_USE";
    if (filterStatus === "MAINTENANCE") matchesStatus = v.vehicleStatus === "MAINTENANCE";
    if (filterStatus === "INACTIVE") matchesStatus = !v.isActive;

    return matchesSearch && matchesStatus;
  });

  const filteredTypes = carTypes.filter(t => 
    (t.brand?.toLowerCase().includes(searchType.toLowerCase()) || 
     t.model?.toLowerCase().includes(searchType.toLowerCase()))
  );

  return (
    <div className={listStyles.container}>
      {/* HEADER & TABS */}
      <div className="dashboard-gestor-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1>Frota e Veículos</h1>
            <p>Administre a frota e os tipos de veículos do sistema.</p>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            {activeTab === "vehicles" ? (
              <button className="btn-primary" onClick={() => setShowForm(true)} style={{ background: "white", color: "var(--color-primary)" }}>
                <PlusCircle size={18} />
                Cadastrar Veículo
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setShowTypeForm(true)} style={{ background: "white", color: "var(--color-primary)" }}>
                <PlusCircle size={18} />
                Cadastrar Tipo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="gestao-tabs" style={{ marginBottom: "24px", borderBottom: "1px solid var(--color-border)", paddingBottom: "12px" }}>
        <button 
          className={clsx("gestao-tab", activeTab === "vehicles" ? "active" : "")}
          onClick={() => setActiveTab("vehicles")}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <CarFront size={20} />
          Veículos
        </button>
        <button 
          className={clsx("gestao-tab", activeTab === "types" ? "active" : "")}
          onClick={() => setActiveTab("types")}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <ListTree size={20} />
          Tipos de Veículo
        </button>
      </div>

      {/* ================= TAB 1: VEÍCULOS ================= */}
      {activeTab === "vehicles" && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card destaque-azul">
              <div className="kpi-content">
                <span className="kpi-label">Viaturas registradas</span>
                <strong className="kpi-value">{totalVehicles}</strong>
                <span className="kpi-info">Total na base de dados</span>
              </div>
            </div>
            <div className="kpi-card destaque-verde">
              <div className="kpi-content">
                <span className="kpi-label">Viaturas disponíveis</span>
                <strong className="kpi-value">{activeVehicles}</strong>
                <span className="kpi-info">Prontas para uso imediato</span>
              </div>
            </div>
            <div className="kpi-card destaque-amarelo">
              <div className="kpi-content">
                <span className="kpi-label">Viaturas em uso</span>
                <strong className="kpi-value">{inUseVehicles}</strong>
                <span className="kpi-info">Em rondas e operações ativas</span>
              </div>
            </div>
            <div className="kpi-card destaque-vermelho">
              <div className="kpi-content">
                <span className="kpi-label">Viaturas em manutenção</span>
                <strong className="kpi-value">{maintenanceVehicles}</strong>
                <span className="kpi-info">Em oficina ou revisão preventiva</span>
              </div>
            </div>
          </div>

          <div className="data-section">
            <div className="data-section-header" style={{ display: "flex", gap: "16px", backgroundColor: "#f8fafc", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }} />
                <input 
                  type="text" 
                  placeholder="Buscar por placa, prefixo ou modelo..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "10px 10px 10px 38px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }}
                />
              </div>
              <div style={{ width: "220px" }}>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", backgroundColor: "white", color: "var(--color-text-secondary)" }}
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="AVAILABLE">Disponível</option>
                  <option value="IN_USE">Em Uso</option>
                  <option value="MAINTENANCE">Em Manutenção</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>
              <button className="btn-secondary" onClick={() => setShowExportModal(true)} style={{ marginLeft: "auto", height: "42px", padding: "0 16px" }}>
                <Download size={18} /> Exportar
              </button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Prefixo</th>
                    <th>Marca/Modelo</th>
                    <th>Ano</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.length > 0 ? filteredVehicles.map((v, i) => {
                    const isEmUso = v.vehicleStatus === "IN_USE" || v.status === "Em uso";
                    const isManutencao = v.vehicleStatus === "MAINTENANCE" || v.status === "Manutenção";
                    const badgeClass = !v.isActive ? "pendente" : (isManutencao ? "novo" : (isEmUso ? "ativo" : "concluido"));
                    const statusText = !v.isActive ? "Inativo" : (v.vehicleStatus === "AVAILABLE" ? "Disponível" : (v.vehicleStatus === "IN_USE" ? "Em uso" : (v.vehicleStatus === "MAINTENANCE" ? "Manutenção" : v.status)));

                    return (
                      <tr key={i} style={{ opacity: v.isActive ? 1 : 0.6 }}>
                        <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>{v.licensePlate || v.placa}</td>
                        <td>{v.prefix || v.prefixo}</td>
                        <td>{v.type?.brand || v.marca} {v.type?.model || v.modelo}</td>
                        <td>{v.type?.year || v.ano}</td>
                        <td>
                          <span className={clsx("badge", badgeClass)}>
                            {statusText}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="td-acoes" style={{ justifyContent: "flex-end" }}>
                            <button className="btn-icon history" title="Ver Histórico" onClick={() => setAuditEntity({ type: 'vehicle', id: v.prefix || v.prefixo })}>
                              <History size={18} />
                            </button>
                            <button className="btn-icon" title="Editar" onClick={() => openEditVehicle(v)}>
                              <Edit3 size={18} />
                            </button>
                            <button 
                              className="btn-action" 
                              onClick={() => handleToggleActiveVehicle(v)}
                              disabled={v.isActive && isEmUso}
                              title={v.isActive && isEmUso ? "Não é possível inativar veículo em uso" : ""}
                              style={{ 
                                backgroundColor: v.isActive && isEmUso ? "#f1f5f9" : (v.isActive ? "#fef2f2" : "#ecfdf5"), 
                                color: v.isActive && isEmUso ? "#94a3b8" : (v.isActive ? "var(--color-danger)" : "var(--color-success)"),
                                cursor: v.isActive && isEmUso ? "not-allowed" : "pointer"
                              }}
                            >
                              {v.isActive ? "Inativar" : "Ativar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "24px" }}>Nenhum veículo encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= TAB 2: TIPOS ================= */}
      {activeTab === "types" && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card destaque-roxo">
              <div className="kpi-content">
                <span className="kpi-label">Tipos registrados</span>
                <strong className="kpi-value">{totalTypes}</strong>
                <span className="kpi-info">Modelos diferentes na frota</span>
              </div>
            </div>
            <div className="kpi-card destaque-verde">
              <div className="kpi-content">
                <span className="kpi-label">Veículos de Passeio</span>
                <strong className="kpi-value">{passeios}</strong>
                <span className="kpi-info">Carros comuns e leves</span>
              </div>
            </div>
            <div className="kpi-card destaque-amarelo">
              <div className="kpi-content">
                <span className="kpi-label">Veículos Utilitários</span>
                <strong className="kpi-value">{utilitarios}</strong>
                <span className="kpi-info">Caminhonetes e transporte de carga</span>
              </div>
            </div>
          </div>

          <div className="data-section">
          <div className="data-section-header" style={{ display: "flex", gap: "16px", backgroundColor: "#f8fafc" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }} />
              <input 
                type="text" 
                placeholder="Buscar por marca ou modelo..." 
                value={searchType}
                onChange={e => setSearchType(e.target.value)}
                style={{ width: "100%", padding: "10px 10px 10px 38px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }}
              />
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Ano</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.length > 0 ? filteredTypes.map((t, i) => {
                  return (
                    <tr key={i} style={{ opacity: t.isActive ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>#{t.id}</td>
                      <td>{t.brand}</td>
                      <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>{t.model}</td>
                      <td>{t.year}</td>
                      <td>
                        <span className={clsx("badge", "concluido")}>
                          {t.category === 'passenger' ? 'Passeio' : 'Utilitário'}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="td-acoes" style={{ justifyContent: "flex-end" }}>
                          <button className="btn-icon history" title="Ver Histórico" onClick={() => setAuditEntity({ type: 'cartype', id: String(t.id) })}>
                            <History size={18} />
                          </button>
                          <button className="btn-icon" title="Editar" onClick={() => openEditType(t)}>
                            <Edit3 size={18} />
                          </button>
                          <button 
                            className="btn-action" 
                            onClick={() => checkTypeInactivation(t)}
                            style={{ 
                              backgroundColor: t.isActive ? "#fef2f2" : "#ecfdf5", 
                              color: t.isActive ? "var(--color-danger)" : "var(--color-success)"
                            }}
                          >
                            {t.isActive ? "Inativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "24px" }}>Nenhum tipo encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      <DownloadModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportUrlPath="/export/{format}/vehicle/{fileName}"
        defaultFileName="veiculos"
      />

      {/* ================= MODAL DE VEÍCULO ================= */}
      <Modal isOpen={showForm} onClose={closeVehicleModal} title={editingVehicle ? "Editar Veículo" : "Cadastrar Novo Veículo"}>
        <form onSubmit={handleSaveVehicle} className={formStyles.form}>
          <div className={formStyles.formGrid}>
            <div className="auth-form-group">
              <input type="text" id="placa" className="auth-input" required value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} placeholder=" " />
              <label htmlFor="placa" className="auth-label">Placa</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="prefixo" className="auth-input" required disabled={!!editingVehicle} value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} placeholder=" " />
              <label htmlFor="prefixo" className="auth-label">Prefixo Corporativo</label>
            </div>
            
            <div className="auth-form-group" style={{ gridColumn: "1 / -1", display: "flex", gap: "12px", alignItems: "center", marginBottom: "0" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <select id="typeId" className="auth-input" required value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})}>
                  <option value="" disabled hidden></option>
                  {activeCarTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.brand} {t.model} ({t.year}) - {t.category === 'passenger' ? 'Passeio' : 'Utilitário'}</option>
                  ))}
                </select>
                <label htmlFor="typeId" className="auth-label">Tipo de Veículo</label>
              </div>
              <button 
                type="button" 
                onClick={openTypeFormFromVehicle}
                style={{ 
                  height: "48px", 
                  width: "48px", 
                  borderRadius: "20px", 
                  backgroundColor: "var(--color-accent-light)", 
                  color: "var(--color-accent)", 
                  border: "none", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0
                }}
                title="Cadastrar Novo Tipo"
              >
                <PlusCircle size={24} />
              </button>
            </div>

            <div className="auth-form-group">
              <input type="text" id="cor" className="auth-input" required value={formData.cor} onChange={e => setFormData({...formData, cor: e.target.value})} placeholder=" " />
              <label htmlFor="cor" className="auth-label">Cor</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="fuel" className="auth-input" value={formData.fuel} onChange={e => setFormData({...formData, fuel: e.target.value})} placeholder=" " />
              <label htmlFor="fuel" className="auth-label">Combustível</label>
            </div>
            <div className="auth-form-group">
              <input type="number" step="0.1" id="tankCapacity" className="auth-input" value={formData.tankCapacity} onChange={e => setFormData({...formData, tankCapacity: e.target.value})} placeholder=" " />
              <label htmlFor="tankCapacity" className="auth-label">Capacidade Tanque (L)</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="renavam" className="auth-input" value={formData.renavam} onChange={e => setFormData({...formData, renavam: e.target.value})} placeholder=" " />
              <label htmlFor="renavam" className="auth-label">Renavam</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="chassi" className="auth-input" value={formData.chassi} onChange={e => setFormData({...formData, chassi: e.target.value})} placeholder=" " />
              <label htmlFor="chassi" className="auth-label">Chassi</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="requiredLicense" className="auth-input" value={formData.requiredLicense} onChange={e => setFormData({...formData, requiredLicense: e.target.value})} placeholder=" " />
              <label htmlFor="requiredLicense" className="auth-label">CNH Exigida</label>
            </div>
            <div className="auth-form-group" style={{ gridColumn: "1 / -1" }}>
              <textarea id="observations" className="auth-input" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder=" " style={{ minHeight: "80px", paddingTop: "12px" }} />
              <label htmlFor="observations" className="auth-label">Observações</label>
            </div>
          </div>
          <div className={formStyles.formActions}>
            <button type="button" className="btn-secondary" onClick={closeVehicleModal} disabled={loadingForm}>
              <X size={18} /> Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loadingForm}>
              <Save size={18} /> {editingVehicle ? "Salvar Alterações" : "Salvar Veículo"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL DE TIPO DE VEÍCULO ================= */}
      <Modal isOpen={showTypeForm} onClose={closeTypeModal} title={editingType ? "Editar Tipo" : "Cadastrar Tipo de Veículo"}>
        <form onSubmit={handleSaveCarType} className={formStyles.form}>
          <div className={formStyles.formGrid}>
            <div className="auth-form-group">
              <input type="text" id="typeBrand" className="auth-input" required value={typeFormData.brand} onChange={e => setTypeFormData({...typeFormData, brand: e.target.value})} placeholder=" " />
              <label htmlFor="typeBrand" className="auth-label">Marca</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="typeModel" className="auth-input" required value={typeFormData.model} onChange={e => setTypeFormData({...typeFormData, model: e.target.value})} placeholder=" " />
              <label htmlFor="typeModel" className="auth-label">Modelo</label>
            </div>
            <div className="auth-form-group">
              <input type="number" id="typeYear" className="auth-input" required value={typeFormData.year} onChange={e => setTypeFormData({...typeFormData, year: e.target.value})} placeholder=" " />
              <label htmlFor="typeYear" className="auth-label">Ano de Fabricação</label>
            </div>
            <div className="auth-form-group">
              <select id="typeCat" className="auth-input" required value={typeFormData.category} onChange={e => setTypeFormData({...typeFormData, category: e.target.value})}>
                <option value="passenger">Passeio</option>
                <option value="utility">Utilitário</option>
              </select>
              <label htmlFor="typeCat" className="auth-label">Categoria</label>
            </div>
          </div>
          <div className={formStyles.formActions}>
            <button type="button" className="btn-secondary" onClick={closeTypeModal} disabled={loadingForm}>
              <X size={18} /> Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loadingForm}>
              <Save size={18} /> {editingType ? "Salvar Alterações" : "Salvar Tipo"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL CASCATA ================= */}
      <Modal isOpen={showCascadeModal} onClose={() => setShowCascadeModal(false)} title="Aviso de Inativação">
        <div style={{ color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--color-danger)", marginBottom: "16px", fontWeight: "bold", fontSize: "1.1rem" }}>
            <AlertTriangle size={24} />
            Existem Veículos Ativos
          </div>
          <p>
            O tipo <strong>{typeToInactivate?.brand} {typeToInactivate?.model} ({typeToInactivate?.year})</strong> está vinculado a <strong>{activeCarsForType.length} veículos ativos</strong> na frota.
          </p>
          <p style={{ marginTop: "12px", marginBottom: "16px" }}>
            Para inativar este modelo, todos os veículos associados a ele também precisam ser inativados. Deseja inativar tudo em cascata?
          </p>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", padding: "12px" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeCarsForType.map(c => (
                <li key={c.prefix} style={{ fontSize: "0.875rem" }}>🚗 Placa: <strong>{c.licensePlate}</strong> - Prefixo: <strong>{c.prefix}</strong></li>
              ))}
            </ul>
          </div>
        </div>
        <div className={formStyles.formActions} style={{ marginTop: "24px" }}>
          <button type="button" className="btn-secondary" onClick={() => setShowCascadeModal(false)}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={confirmCascadeInactivation} style={{ backgroundColor: "var(--color-danger)" }}>
            Inativar Tudo
          </button>
        </div>
      </Modal>

      <DownloadModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportUrlPath="/export/{format}/vehicle/{fileName}"
        defaultFileName="veiculos"
      />

      {/* ========== POPUP: AUDIT HISTORY ========== */}
      {auditEntity && (
        <AuditHistoryModal
          isOpen={true}
          onClose={() => setAuditEntity(null)}
          entityType={auditEntity.type}
          entityId={auditEntity.id}
          title={auditEntity.type === 'vehicle' ? `Veículo ${auditEntity.id}` : `Tipo Veículo #${auditEntity.id}`}
        />
      )}
    </div>
  );
}
