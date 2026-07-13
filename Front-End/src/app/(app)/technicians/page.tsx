"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, Search, Save, X, Users, UserCheck, UserX, ShieldAlert, Download, Edit3, History } from "lucide-react";
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

export default function TechniciansPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  // Audit History State
  const [auditEntity, setAuditEntity] = useState<{ type: 'user', id: string } | null>(null);
  
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [showExportModal, setShowExportModal] = useState(false);
  
  const initialForm = {
    name: "",
    registration: "",
    password: "",
    email: "",
    permission: "MANAGER",
    phone: "",
    gender: "",
    birthDate: "",
    driverLicense: "",
    driverLicenseCategory: "",
    driverLicenseExpiration: ""
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch("http://localhost:8080/user/technicians", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("siva_token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.warn("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    try {
      if (editingUser) {
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password;
        await apiClient.patch(`/user/update/${editingUser}`, payload);
        showToast("Usuário atualizado com sucesso!", "success");
      } else {
        await apiClient.post("/user/register", formData);
        showToast("Usuário cadastrado com sucesso!", "success");
      }
      closeModal();
      loadUsers();
    } catch (error: any) {
      showToast(error.message || "Erro ao salvar usuário.", "error");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await apiClient.patch(`/user/update/${user.registration}`, { isActive: !user.isActive });
      showToast(`Usuário ${user.isActive ? 'inativado' : 'ativado'} com sucesso!`, "success");
      loadUsers();
    } catch (error: any) {
      showToast(error.message || "Erro ao alterar status.", "error");
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user.registration);
    setFormData({
      name: user.name || "",
      registration: user.registration || "",
      password: "",
      email: user.email || "",
      permission: user.permission || "MANAGER",
      phone: user.phone || "",
      gender: user.gender || "",
      birthDate: user.birthDate ? String(user.birthDate).split('T')[0] : "",
      driverLicense: user.driverLicense || "",
      driverLicenseCategory: user.driverLicenseCategory || "",
      driverLicenseExpiration: user.driverLicenseExpiration ? String(user.driverLicenseExpiration).split('T')[0] : ""
    });
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData(initialForm);
  };

  // ================= METRICS & FILTERS =================
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = users.filter(u => !u.isActive).length;
  const managersCount = users.filter(u => u.permission === "MANAGER" || u.permission === "ADMINISTRATOR").length;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || 
                          u.registration?.toLowerCase().includes(search.toLowerCase());
    
    let matchesRole = true;
    if (filterRole === "GESTOR") matchesRole = u.permission === "MANAGER" || u.permission === "ADMINISTRATOR";
    if (filterRole === "TECNICO") matchesRole = u.permission === "TECHNICIAN";

    let matchesStatus = true;
    if (filterStatus === "ATIVO") matchesStatus = u.isActive;
    if (filterStatus === "INATIVO") matchesStatus = !u.isActive;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className={listStyles.container}>
      <div className="dashboard-gestor-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1>Gerenciamento de Usuários</h1>
            <p>Administre os perfis de acesso, permissões e status dos colaboradores.</p>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn-primary" onClick={() => setShowForm(true)} style={{ background: "white", color: "var(--color-primary)" }}>
              <PlusCircle size={18} />
              Cadastrar Usuário
            </button>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card destaque-azul">
          <div className="kpi-content">
            <span className="kpi-label">Total Cadastrado</span>
            <strong className="kpi-value">{totalUsers}</strong>
            <span className="kpi-info">Todos os usuários do sistema</span>
          </div>
        </div>
        <div className="kpi-card destaque-verde">
          <div className="kpi-content">
            <span className="kpi-label">Usuários Ativos</span>
            <strong className="kpi-value">{activeUsers}</strong>
            <span className="kpi-info">Com permissão de acesso normal</span>
          </div>
        </div>
        <div className="kpi-card destaque-vermelho">
          <div className="kpi-content">
            <span className="kpi-label">Usuários Inativos</span>
            <strong className="kpi-value">{inactiveUsers}</strong>
            <span className="kpi-info">Acesso temporariamente bloqueado</span>
          </div>
        </div>
        <div className="kpi-card destaque-roxo">
          <div className="kpi-content">
            <span className="kpi-label">Gestores</span>
            <strong className="kpi-value">{managersCount}</strong>
            <span className="kpi-info">Com permissão administrativa</span>
          </div>
        </div>
      </div>

      <div className="data-section">
        <div className="data-section-header" style={{ display: "flex", gap: "16px", backgroundColor: "#f8fafc", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }} />
            <input 
              type="text" 
              placeholder="Buscar por matrícula ou nome..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 10px 10px 38px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" }}
            />
          </div>
          <div style={{ width: "180px" }}>
            <select 
              value={filterRole} 
              onChange={e => setFilterRole(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", backgroundColor: "white", color: "var(--color-text-secondary)" }}
            >
              <option value="TODOS">Todos os Perfis</option>
              <option value="GESTOR">Gestor / Admin</option>
              <option value="TECNICO">Técnico</option>
            </select>
          </div>
          <div style={{ width: "160px" }}>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", backgroundColor: "white", color: "var(--color-text-secondary)" }}
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
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
                <th>Matrícula</th>
                <th>Nome Completo</th>
                <th>Permissão</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? filteredUsers.map((u, i) => (
                <tr key={i} style={{ opacity: u.isActive ? 1 : 0.6 }}>
                  <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>{u.registration}</td>
                  <td>{u.name}</td>
                  <td>{u.permission === "MANAGER" || u.permission === "ADMINISTRATOR" ? "Gestor" : "Técnico"}</td>
                  <td>
                    <span className={clsx("badge", u.isActive ? "ativo" : "pendente")}>
                      {u.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="td-acoes" style={{ justifyContent: "flex-end" }}>
                      <button className="btn-icon history" title="Ver Histórico" onClick={() => setAuditEntity({ type: 'user', id: u.registration })}>
                        <History size={18} />
                      </button>
                      <button className="btn-icon" title="Editar" onClick={() => openEdit(u)}>
                        <Edit3 size={18} />
                      </button>
                      <button 
                        className="btn-action" 
                        onClick={() => handleToggleActive(u)}
                        style={{ backgroundColor: u.isActive ? "#fef2f2" : "#ecfdf5", color: u.isActive ? "var(--color-danger)" : "var(--color-success)" }}
                      >
                        {u.isActive ? "Inativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DownloadModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportUrlPath="/export/{format}/users/{fileName}"
        defaultFileName="usuarios"
      />

      <Modal isOpen={showForm} onClose={closeModal} title={editingUser ? "Editar Usuário" : "Cadastrar Novo Usuário"}>
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGrid}>
            <div className="auth-form-group">
              <input type="text" id="name" className="auth-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder=" " />
              <label htmlFor="name" className="auth-label">Nome Completo</label>
            </div>
            <div className="auth-form-group">
              <input type="email" id="email" className="auth-input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder=" " />
              <label htmlFor="email" className="auth-label">E-mail Corporativo</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="registration" className="auth-input" required value={formData.registration} disabled={!!editingUser} onChange={e => setFormData({...formData, registration: e.target.value})} placeholder=" " />
              <label htmlFor="registration" className="auth-label">Matrícula</label>
            </div>
            <div className="auth-form-group">
              <input type="password" id="password" className="auth-input" required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder=" " />
              <label htmlFor="password" className="auth-label">{editingUser ? "Nova Senha (opcional)" : "Senha de Acesso"}</label>
            </div>
            <div className="auth-form-group">
              <select id="permission" className="auth-input" value={formData.permission} onChange={e => setFormData({...formData, permission: e.target.value})}>
                <option value="MANAGER">Gestor</option>
                <option value="TECHNICIAN">Técnico</option>
                <option value="ADMINISTRATOR">Administrador</option>
              </select>
              <label htmlFor="permission" className="auth-label">Perfil de Acesso</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="phone" className="auth-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder=" " />
              <label htmlFor="phone" className="auth-label">Telefone</label>
            </div>
            <div className="auth-form-group">
              <select id="gender" className="auth-input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
              <label htmlFor="gender" className="auth-label">Gênero</label>
            </div>
            <div className="auth-form-group">
              <input type="date" id="birthDate" className="auth-input" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} placeholder=" " />
              <label htmlFor="birthDate" className="auth-label">Data de Nascimento</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="driverLicense" className="auth-input" value={formData.driverLicense} onChange={e => setFormData({...formData, driverLicense: e.target.value})} placeholder=" " />
              <label htmlFor="driverLicense" className="auth-label">CNH</label>
            </div>
            <div className="auth-form-group">
              <input type="text" id="driverLicenseCategory" className="auth-input" value={formData.driverLicenseCategory} onChange={e => setFormData({...formData, driverLicenseCategory: e.target.value})} placeholder=" " />
              <label htmlFor="driverLicenseCategory" className="auth-label">Categoria CNH</label>
            </div>
            <div className="auth-form-group">
              <input type="date" id="driverLicenseExpiration" className="auth-input" value={formData.driverLicenseExpiration} onChange={e => setFormData({...formData, driverLicenseExpiration: e.target.value})} placeholder=" " />
              <label htmlFor="driverLicenseExpiration" className="auth-label">Validade CNH</label>
            </div>
          </div>
          <div className={formStyles.formActions}>
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={loadingForm}>
              <X size={18} /> Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loadingForm}>
              <Save size={18} /> {editingUser ? "Salvar Alterações" : "Salvar Usuário"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========== POPUP: AUDIT HISTORY ========== */}
      {auditEntity && (
        <AuditHistoryModal
          isOpen={true}
          onClose={() => setAuditEntity(null)}
          entityType={auditEntity.type}
          entityId={auditEntity.id}
          title={`Usuário ${auditEntity.id}`}
        />
      )}
    </div>
  );
}
