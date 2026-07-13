"use client";

import React, { useState, useEffect } from "react";
import { User, Bell, Shield, Smartphone, Monitor, Loader2, Camera } from "lucide-react";
import { apiClient } from "../../../services/api";
import { useToast } from "../../../providers/ToastProvider";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("perfil");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>({});
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    driverLicenseCategory: "",
    password: "",
    registration: "",
    permission: "",
    gender: "",
    birthDate: "",
    driverLicense: "",
    driverLicenseExpiration: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const registration = localStorage.getItem("userRegistration");
      if (!registration) return;
      try {
        const data = await apiClient.get<any>(`/user/${registration}`);
        setUser(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          driverLicenseCategory: data.driverLicenseCategory || "",
          password: "",
          registration: data.registration || "",
          permission: data.permission || "",
          gender: data.gender || "",
          birthDate: data.birthDate ? String(data.birthDate).split('T')[0] : "",
          driverLicense: data.driverLicense || "",
          driverLicenseExpiration: data.driverLicenseExpiration ? String(data.driverLicenseExpiration).split('T')[0] : ""
        });
        if (data.photo && data.photo.length > 5) {
           setPreviewUrl(data.photo.startsWith("data:image") ? data.photo : `data:image/jpeg;base64,${data.photo}`);
        }
      } catch (error) {
        showToast("Erro ao carregar dados do perfil.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const registration = localStorage.getItem("userRegistration");
    
    try {
      const payload: any = {};
      if (formData.name !== user.name) payload.name = formData.name;
      if (formData.email !== user.email) payload.email = formData.email;
      if (formData.phone !== user.phone) payload.phone = formData.phone;
      if (formData.driverLicenseCategory !== user.driverLicenseCategory) payload.driverLicenseCategory = formData.driverLicenseCategory;
      if (formData.gender !== user.gender) payload.gender = formData.gender;
      
      const userBirthDateStr = user.birthDate ? String(user.birthDate).split('T')[0] : "";
      if (formData.birthDate !== userBirthDateStr) payload.birthDate = formData.birthDate;
      
      if (formData.driverLicense !== user.driverLicense) payload.driverLicense = formData.driverLicense;
      
      const userExpDateStr = user.driverLicenseExpiration ? String(user.driverLicenseExpiration).split('T')[0] : "";
      if (formData.driverLicenseExpiration !== userExpDateStr) payload.driverLicenseExpiration = formData.driverLicenseExpiration;
      
      if (formData.password) payload.password = formData.password;

      if (Object.keys(payload).length > 0) {
        await apiClient.patch(`/user/update/${registration}`, payload);
      }

      if (selectedFile) {
        const form = new FormData();
        form.append("foto", selectedFile);
        
        const token = localStorage.getItem("siva_token");
        await fetch(`http://localhost:8080/user/upload-photo/${registration}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: form
        });
      }

      showToast("Configurações salvas com sucesso!", "success");
      setFormData(prev => ({ ...prev, password: "" }));
      
      setUser((prev: any) => ({ ...prev, ...payload }));
    } catch (error) {
      showToast("Erro ao salvar configurações.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
            Configurações
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Gerencie suas preferências de conta, notificações e segurança.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        
        <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          <button 
            className={`sidebar-item ${activeTab === "perfil" ? "active" : ""}`}
            onClick={() => setActiveTab("perfil")}
            style={{ width: "100%", justifyContent: "flex-start", background: activeTab === "perfil" ? "var(--color-accent-light)" : "transparent" }}
          >
            <User size={18} /> Perfil
          </button>
          <button 
            className={`sidebar-item ${activeTab === "notificacoes" ? "active" : ""}`}
            onClick={() => setActiveTab("notificacoes")}
            style={{ width: "100%", justifyContent: "flex-start", background: activeTab === "notificacoes" ? "var(--color-accent-light)" : "transparent" }}
          >
            <Bell size={18} /> Notificações
          </button>
          <button 
            className={`sidebar-item ${activeTab === "seguranca" ? "active" : ""}`}
            onClick={() => setActiveTab("seguranca")}
            style={{ width: "100%", justifyContent: "flex-start", background: activeTab === "seguranca" ? "var(--color-accent-light)" : "transparent" }}
          >
            <Shield size={18} /> Segurança
          </button>
          <button 
            className={`sidebar-item ${activeTab === "aparencia" ? "active" : ""}`}
            onClick={() => setActiveTab("aparencia")}
            style={{ width: "100%", justifyContent: "flex-start", background: activeTab === "aparencia" ? "var(--color-accent-light)" : "transparent" }}
          >
            <Monitor size={18} /> Aparência
          </button>
        </div>

        <div className="data-section" style={{ flex: 1, padding: "32px" }}>
          {activeTab === "perfil" && (
            <form onSubmit={handleSave}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--color-primary)", marginBottom: "24px" }}>Informações do Perfil</h3>
              
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><Loader2 className="animate-spin" /></div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--color-accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent)", overflow: "hidden", position: "relative" }}>
                      {previewUrl ? (
                        <img src={previewUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <User size={40} />
                      )}
                    </div>
                    <div>
                      <input type="file" id="foto-upload" style={{ display: "none" }} accept="image/*" onChange={handleFileChange} />
                      <label htmlFor="foto-upload" className="btn-secondary" style={{ marginBottom: "8px", display: "inline-flex", cursor: "pointer" }}>
                        <Camera size={16} /> Alterar Foto
                      </label>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>JPG, GIF ou PNG. Máximo de 2MB.</p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "800px" }}>
                    <div className="auth-form-group">
                      <input type="text" id="registration" className="auth-input" value={formData.registration} readOnly placeholder=" " style={{ backgroundColor: "#f8fafc", color: "#64748b" }} />
                      <label htmlFor="registration" className="auth-label">Matrícula</label>
                    </div>
                    <div className="auth-form-group">
                      <input type="text" id="permission" className="auth-input" value={formData.permission === "MANAGER" || formData.permission === "ADMINISTRATOR" ? "Gestor" : (formData.permission ? "Técnico" : "")} readOnly placeholder=" " style={{ backgroundColor: "#f8fafc", color: "#64748b" }} />
                      <label htmlFor="permission" className="auth-label">Permissão</label>
                    </div>
                    <div className="auth-form-group">
                      <input type="text" id="nome" className="auth-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder=" " required />
                      <label htmlFor="nome" className="auth-label">Nome Completo</label>
                    </div>
                    <div className="auth-form-group">
                      <input type="email" id="email" className="auth-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder=" " required />
                      <label htmlFor="email" className="auth-label">E-mail Corporativo</label>
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
                      <input type="text" id="cnh" className="auth-input" value={formData.driverLicenseCategory} onChange={e => setFormData({...formData, driverLicenseCategory: e.target.value})} placeholder=" " />
                      <label htmlFor="cnh" className="auth-label">Categoria CNH</label>
                    </div>
                    <div className="auth-form-group">
                      <input type="date" id="driverLicenseExpiration" className="auth-input" value={formData.driverLicenseExpiration} onChange={e => setFormData({...formData, driverLicenseExpiration: e.target.value})} placeholder=" " />
                      <label htmlFor="driverLicenseExpiration" className="auth-label">Validade CNH</label>
                    </div>
                    <div className="auth-form-group" style={{ gridColumn: "1 / -1", maxWidth: "calc(50% - 12px)" }}>
                      <input type="password" id="senha" className="auth-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder=" " />
                      <label htmlFor="senha" className="auth-label">Nova Senha (opcional)</label>
                    </div>
                  </div>
                  
                  <button type="submit" className="btn-primary" style={{ width: "auto", padding: "10px 24px", marginTop: "24px" }} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                  </button>
                </>
              )}
            </form>
          )}

          {activeTab !== "perfil" && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-tertiary)" }}>
              <Monitor size={48} style={{ opacity: 0.5, margin: "0 auto 16px" }} />
              <p>Configurações de {activeTab} estão em desenvolvimento e estarão disponíveis na próxima versão.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
