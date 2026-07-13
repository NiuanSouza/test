"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../../providers/ToastProvider";
import { apiClient } from "../../../services/api";
import { VehicleSelectionModal } from "../../../components/modals/VehicleSelectionModal";
import { AlertCircle, MapPin } from "lucide-react";

// Importações do Leaflet (Renderizadas apenas no Client)
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

// Para evitar erro de window/document no SSR do Next
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// O controle de rota precisa importar o JS real apenas no cliente
const RoutingComponent = dynamic(() => import('./RoutingComponent'), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Data states
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [pendingServices, setPendingServices] = useState<any[]>([]);
  const [activeService, setActiveService] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // GPS State
  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null);

  // Interaction states
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedDetailsTicket, setSelectedDetailsTicket] = useState<any>(null);
  
  // Active Action Modals
  const [activeActionModal, setActiveActionModal] = useState<"NONE" | "INCIDENT" | "FUEL" | "CANCEL" | "SWITCH">("NONE");
  const [switchingTicket, setSwitchingTicket] = useState<any>(null);
  const [switchKm, setSwitchKm] = useState("");

  // Form states (Checkin/Checkout)
  const [initialKm, setInitialKm] = useState("");
  const [checkinDate, setCheckinDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkinTime, setCheckinTime] = useState(new Date().toTimeString().slice(0,5));
  const [checkinObservation, setCheckinObservation] = useState("");
  const [checkoutKm, setCheckoutKm] = useState("");

  // Other form states
  const [fuelData, setFuelData] = useState({ 
    liters: "", 
    pricePerLiter: "", 
    invoice: "", 
    recordKm: "", 
    date: new Date().toISOString().split("T")[0], 
    time: new Date().toTimeString().slice(0,5),
    oilChangeDate: "",
    lastOilChangeKm: "",
    nextOilChangeKm: ""
  });
  const [incidentData, setIncidentData] = useState({ incidentType: "DEFECT", severity: "MEDIUM", description: "", requestSupport: false });
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setGpsLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn("GPS Error", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const activeRes = await apiClient.get<any>("/service/active");
      if (activeRes && activeRes.active) {
        setActiveService(activeRes);
        setSelectedVehicle({
          prefix: activeRes.carPrefix,
          licensePlate: activeRes.licensePlate,
          type: { model: activeRes.model }
        });
        setInitialKm(activeRes.departureKm?.toString() || "");
      } else {
        setActiveService(null);
        setSelectedVehicle(null);
        const vehData = await apiClient.get<any[]>("/vehicle");
        if (Array.isArray(vehData)) {
          setVehicles(vehData.filter(v => v.vehicleStatus === "AVAILABLE"));
        }
      }

      const pendingData = await apiClient.get<any[]>("/service/pending");
      if (Array.isArray(pendingData)) {
        setPendingServices(pendingData);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const openVehicleSelection = () => {
    setSwitchingTicket(null);
    setShowVehicleModal(true);
  };

  const handleAcceptTicket = (ticket: any) => {
    setSwitchingTicket(ticket);
    if (activeService) {
      // Already has car, just switch
      setActiveActionModal("SWITCH");
    } else {
      // Needs car
      setShowVehicleModal(true);
    }
  };

  const submitCheckin = async (vehiclePrefix: string, km: string, serviceId?: number) => {
    if (!km) {
      showToast("Preencha a quilometragem obrigatória!", "error");
      return;
    }
    
    let reg = localStorage.getItem("userRegistration");
    if (!reg) {
      const userString = localStorage.getItem("siva_user");
      if (userString) {
        try {
          const u = JSON.parse(userString);
          reg = u.registration || u.matricula;
        } catch(e){}
      }
    }
    if (!reg) reg = "ana-paula"; // Final fallback

    try {
      const payload = {
        carPrefix: vehiclePrefix,
        userRegistration: reg,
        recordKm: parseFloat(km),
        note: checkinObservation,
        serviceId: serviceId,
        priority: "MEDIUM",
        destinationRequester: "Não informado"
      };
      await apiClient.post("/service/start", payload);
      showToast(serviceId ? "Chamado aceito com sucesso!" : "Check-in realizado com sucesso!", "success");
      setSwitchingTicket(null);
      setShowVehicleModal(false);
      await loadInitialData();
    } catch (error: any) {
      console.error("ERRO NO CHECKIN:", error);
      showToast(error.message || "Erro ao realizar check-in.", "error");
      setShowVehicleModal(false); // Force close even on error so they aren't stuck
    }
  };

  const submitSwitchTicket = async () => {
    if (!switchKm) {
      showToast("Digite a quilometragem atual.", "error");
      return;
    }
    
    let reg = localStorage.getItem("userRegistration");
    if (!reg) {
      const userString = localStorage.getItem("siva_user");
      if (userString) {
        try {
          const u = JSON.parse(userString);
          reg = u.registration || u.matricula;
        } catch(e){}
      }
    }
    if (!reg) reg = "ana-paula"; // Final fallback

    try {
      // 1. Finalize current
      await apiClient.post(`/service/finalize/${activeService.serviceId}`, { recordKm: parseFloat(switchKm) });
      // 2. Start new
      await apiClient.post("/service/start", {
        carPrefix: activeService.carPrefix,
        userRegistration: reg,
        recordKm: parseFloat(switchKm),
        serviceId: switchingTicket.id,
        priority: "MEDIUM",
        destinationRequester: "Não informado"
      });
      showToast("Trocado de chamado com sucesso!", "success");
      setActiveActionModal("NONE");
      setSwitchingTicket(null);
      setSwitchKm("");
      await loadInitialData();
    } catch (error: any) {
      console.error("ERRO NO SWITCH:", error);
      showToast(error.message || "Erro ao trocar de chamado.", "error");
    }
  };

  const submitCheckout = async () => {
    if (!checkoutKm) {
      showToast("Digite a quilometragem final.", "error");
      return;
    }
    try {
      await apiClient.post(`/service/finalize/${activeService.serviceId}`, { recordKm: parseFloat(checkoutKm) });
      showToast("Check-out realizado com sucesso!", "success");
      setCheckoutKm("");
      await loadInitialData();
    } catch (error: any) {
      showToast(error.message || "Erro no check-out.", "error");
    }
  };

  const sendEvent = async (type: string) => {
    try {
      await apiClient.post(`/service/${activeService.serviceId}/event`, { type, note: "" });
      showToast("Status atualizado com sucesso!", "success");
    } catch (error: any) {
      showToast(error.message || "Erro ao atualizar status.", "error");
    }
  };

  const submitFuel = async () => {
    try {
      const payload = {
        liters: parseFloat(fuelData.liters),
        pricePerLiter: parseFloat(fuelData.pricePerLiter),
        invoice: fuelData.invoice,
        recordKm: parseFloat(fuelData.recordKm),
        date: fuelData.date
      };
      await apiClient.post(`/service/${activeService.serviceId}/fuel`, payload);
      showToast("Abastecimento registrado com sucesso!", "success");
      setActiveActionModal("NONE");
      setFuelData({ 
        liters: "", 
        pricePerLiter: "", 
        invoice: "", 
        recordKm: "", 
        date: new Date().toISOString().split("T")[0], 
        time: new Date().toTimeString().slice(0,5),
        oilChangeDate: "",
        lastOilChangeKm: "",
        nextOilChangeKm: ""
      });
    } catch (error: any) {
      showToast(error.message || "Erro ao registrar abastecimento.", "error");
    }
  };

  const submitIncident = async () => {
    try {
      await apiClient.post(`/service/${activeService.serviceId}/incident`, incidentData);
      showToast("Ocorrência registrada com sucesso!", "success");
      setActiveActionModal("NONE");
      setIncidentData({ incidentType: "DEFECT", severity: "MEDIUM", description: "", requestSupport: false });
    } catch (error: any) {
      showToast(error.message || "Erro ao registrar ocorrência.", "error");
    }
  };

  const submitCancel = async () => {
    if(!cancelReason) return;
    try {
      await apiClient.post(`/service/${activeService.serviceId}/cancel`, { description: cancelReason });
      showToast("Cancelamento realizado com sucesso.", "success");
      setActiveActionModal("NONE");
      setCancelReason("");
      await loadInitialData();
    } catch (error: any) {
      showToast(error.message || "Erro ao cancelar.", "error");
    }
  };

  if (loadingInitial) return <div style={{ padding: "40px", textAlign: "center" }}>Carregando dados...</div>;

  const destinationLat = activeService?.latitude;
  const destinationLng = activeService?.longitude;

  return (
    <div className="pagina-telainicial">
      
      {/* MAPA GPS SUPERIOR (Se houver chamado ativo) */}
      {activeService && (
        <div className="mapa-gps-container">
          <MapContainer center={gpsLocation || [-23.5567, -46.6457]} zoom={14} style={{ height: "300px", width: "100%", borderRadius: "16px", marginBottom: "20px" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* Componente de Rotas do OSRM */}
            {gpsLocation && destinationLat && destinationLng && (
              <RoutingComponent source={gpsLocation} destination={[Number(destinationLat), Number(destinationLng)]} />
            )}
          </MapContainer>
        </div>
      )}

      <div className="quadros-container">
        
        {/* QUADRO ESQUERDO: Check-in / Operação */}
        <div className="quadro-esquerdo">
          <h3>Informações da Viagem</h3>

          {!activeService && !selectedVehicle && (
            <div id="container-checkin-botao" style={{ marginTop: "20px" }}>
              <button id="check-in-veiculo" onClick={openVehicleSelection}>Pegar Veículo Avulso</button>
            </div>
          )}

          {selectedVehicle && (
            <div id="info-veiculo-dados" style={{ marginBottom: "20px" }}>
              <p><strong>Modelo:</strong> <span>{selectedVehicle.type?.model}</span></p>
              <p><strong>Placa:</strong> <span>{selectedVehicle.licensePlate}</span> | <strong>Prefixo:</strong> <span>{selectedVehicle.prefix}</span></p>
            </div>
          )}

          {activeService && (
            <div className="chamado-info-ativo">
               <p><strong>Destino:</strong> {activeService.destinationRequester || "Não informado"}</p>
            </div>
          )}

          {selectedVehicle && (
            <div className="campos-adicionais" id="secao-pos-checkin">
              <div id="grupo-km-inicial">
                <label>Quilometragem Inicial:</label>
                <div className="input-group-km">
                  <input type="number" id="quilometragem-inicial" value={initialKm} onChange={e => setInitialKm(e.target.value)} disabled={!!activeService} placeholder="Digite a quilometragem" />
                </div>
              </div>

              {activeService && (
                <div id="grupo-km-final">
                  <label>Quilometragem Atual / Final (Checkout):</label>
                  <input type="number" id="quilometragem-final" value={checkoutKm} onChange={e => setCheckoutKm(e.target.value)} placeholder="Digite a quilometragem final" />
                </div>
              )}

              <div className="acoes-veiculo">
                {!activeService ? (
                  <>
                    <button id="btn-cancelar-veiculo" onClick={() => setSelectedVehicle(null)}>Cancelar</button>
                    <button id="btn-salvar-veiculo" onClick={() => submitCheckin(selectedVehicle.prefix, initialKm)}>Confirmar Saída</button>
                  </>
                ) : (
                  <>
                    <button className="btn-lifecycle" style={{backgroundColor: '#6a0dad'}} onClick={() => sendEvent("ARRIVAL_AT_LOCATION")}>📍 Cheguei no Local</button>
                    <button className="btn-lifecycle" style={{backgroundColor: '#14804a'}} onClick={() => sendEvent("SERVICE_COMPLETION")}>✅ Concluir Serviço</button>
                    <button className="btn-lifecycle" style={{backgroundColor: '#002080'}} onClick={() => sendEvent("RETURN_TRIP")}>🔷 Iniciar Retorno</button>
                    
                    <button id="btn-ocorrencia-veiculo" onClick={() => setActiveActionModal("INCIDENT")}>Ocorrência</button>
                    <button id="btn-abs-veiculo" onClick={() => setActiveActionModal("FUEL")}>Abastecimento</button>
                    <button id="btn-cancelar-veiculo2" onClick={() => setActiveActionModal("CANCEL")}>Cancelar Chamado</button>
                    <button id="btn-checkout" onClick={submitCheckout}>Fazer Check-out Final</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QUADRO DIREITO: Chamados Pendentes */}
        <div className="quadro-direito">
          <h3>Chamados Disponíveis</h3>
          <div id="lista-chamados-container">
            {pendingServices.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666" }}>Nenhum chamado disponível...</p>
            ) : (
              pendingServices.map((svc, i) => (
              <div key={i} className="card-chamado">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4>{svc.endereco || svc.title || `Chamado #${svc.id}`}</h4>
                  <span className={`card-chamado-badge badge-${svc.status?.toLowerCase() || 'novo'}`}>{(svc.status || "NOVO").toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "#64748b", fontSize: "13px" }}>
                  <AlertCircle size={14} /> {svc.tipoServico || "Serviço não informado"}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "#64748b", fontSize: "13px" }}>
                  <MapPin size={14} /> CEP: {svc.cep || "N/A"}
                </div>
                <div className="acoes-chamado">
                  <button className="btn-aceitar" onClick={() => setSelectedDetailsTicket(svc)}>Detalhes</button>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL UNIFICADO DE SELEÇÃO DE VEÍCULO */}
      <VehicleSelectionModal
        isOpen={showVehicleModal}
        onClose={() => {
            setShowVehicleModal(false);
            setSwitchingTicket(null);
        }}
        vehicles={vehicles}
        onConfirm={(vehicle, km) => {
          setSelectedVehicle(vehicle);
          setInitialKm(km);
          if (switchingTicket) {
             submitCheckin(vehicle.prefix, km, switchingTicket.id);
          } else {
             submitCheckin(vehicle.prefix, km, undefined);
          }
        }}
      />

      {/* MODAL TROCA DE CHAMADO (Opção B) */}
      {activeActionModal === "SWITCH" && (
        <div className="popup" style={{ display: "flex" }}>
          <div className="popup-content">
            <h2>Aceitar novo chamado</h2>
            <p>Você já está com a viatura <strong>{activeService?.carPrefix}</strong>. Informe a KM atual para finalizar o registro anterior e iniciar a nova rota automaticamente.</p>

            <label><strong>Quilometragem Atual:</strong></label>
            <input type="number" value={switchKm} onChange={e => setSwitchKm(e.target.value)} placeholder="Ex: 50200" required />

            <div className="popup-buttons">
                <button type="button" className="btn-voltar" onClick={() => { setActiveActionModal("NONE"); setSwitchingTicket(null); }}>Cancelar</button>
                <button type="button" className="btn-aceitar" onClick={submitSwitchTicket}>Confirmar Troca</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE OCORRÊNCIA */}
      {activeActionModal === "INCIDENT" && (
        <div className="popup" style={{ display: "flex" }}>
          <div className="popup-content">
            <h2>Registrar Ocorrência</h2>
            <p>Descreva o problema encontrado durante o serviço.</p>

            <label><strong>Gravidade:</strong></label>
            <select value={incidentData.severity} onChange={e => setIncidentData({...incidentData, severity: e.target.value})} required>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="CRITICAL">Crítica</option>
            </select>

            <label><strong>Descrição da ocorrência:</strong></label>
            <textarea placeholder="Ex: Pneu furado..." value={incidentData.description} onChange={e => setIncidentData({...incidentData, description: e.target.value})} required></textarea>

            <div className="checkbox-group" style={{ margin: "10px 0" }}>
                <input type="checkbox" id="sup" checked={incidentData.requestSupport} onChange={e => setIncidentData({...incidentData, requestSupport: e.target.checked})} />
                <label htmlFor="sup">Solicitar suporte/apoio</label>
            </div>

            <div className="popup-buttons">
                <button type="button" className="btn-voltar" onClick={() => setActiveActionModal("NONE")}>Voltar</button>
                <button type="button" className="btn-aceitar" onClick={submitIncident}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ABASTECIMENTO PREMIUM */}
      {activeActionModal === "FUEL" && (
        <div className="popup" style={{ display: "flex", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)", zIndex: 9999 }}>
          <div className="popup-content" style={{ 
            maxWidth: "520px", width: "100%", padding: "32px", borderRadius: "24px", 
            background: "linear-gradient(145deg, #ffffff, #f8fafc)", 
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.5)",
            animation: "modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards" 
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
              <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "14px", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22L15 22"/><path d="M4 9H14V22H4V9Z"/><path d="M14 11H17C18.1046 11 19 11.8954 19 13V16C19 17.1046 18.1046 18 17 18H14"/><path d="M4 5C4 3.89543 4.89543 3 6 3H12C13.1046 3 14 3.89543 14 5V9H4V5Z"/><path d="M8 22V6"/></svg>
              </div>
              <div>
                <h2 style={{ color: "#0f172a", fontSize: "22px", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Abastecimento</h2>
                <p style={{ color: "#64748b", fontSize: "14px", margin: "4px 0 0 0" }}>Registre os dados do cupom fiscal</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Litros</label>
                    <input type="number" step="0.01" placeholder="0.00" 
                      className="premium-input"
                      value={fuelData.liters} onChange={e => setFuelData({...fuelData, liters: e.target.value})} required />
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Preço (R$)</label>
                    <input type="number" step="0.001" placeholder="0.00" 
                      className="premium-input"
                      value={fuelData.pricePerLiter} onChange={e => setFuelData({...fuelData, pricePerLiter: e.target.value})} required />
                </div>
            </div>

            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>KM Atual</label>
                    <input type="number" placeholder="Km do painel" 
                      className="premium-input"
                      value={fuelData.recordKm} onChange={e => setFuelData({...fuelData, recordKm: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nº da Nota</label>
                    <input type="text" placeholder="Cupom fiscal" 
                      className="premium-input"
                      value={fuelData.invoice} onChange={e => setFuelData({...fuelData, invoice: e.target.value})} required />
                </div>
            </div>

            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Data</label>
                    <input type="date" 
                      className="premium-input"
                      value={fuelData.date} onChange={e => setFuelData({...fuelData, date: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hora</label>
                    <input type="time" 
                      className="premium-input"
                      value={fuelData.time} onChange={e => setFuelData({...fuelData, time: e.target.value})} required />
                </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "28px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#334155", margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Troca de Óleo (Opcional)
                </h3>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ flex: 1 }}>
                        <input type="date" className="premium-input-small" value={fuelData.oilChangeDate} onChange={e => setFuelData({...fuelData, oilChangeDate: e.target.value})} />
                    </div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                        <input type="number" placeholder="KM Última Troca" className="premium-input-small" value={fuelData.lastOilChangeKm} onChange={e => setFuelData({...fuelData, lastOilChangeKm: e.target.value})} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <input type="number" placeholder="KM Próxima Troca" className="premium-input-small" value={fuelData.nextOilChangeKm} onChange={e => setFuelData({...fuelData, nextOilChangeKm: e.target.value})} />
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", gap: "14px", marginTop: "16px" }}>
                <button 
                  onClick={() => setActiveActionModal("NONE")}
                  className="premium-btn-cancel"
                >
                  Cancelar
                </button>
                <button 
                  onClick={submitFuel}
                  className="premium-btn-save"
                >
                  Salvar Registro
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO CHAMADO */}
      {selectedDetailsTicket && (
        <div className="sobreposicao">
          <div className="popup-content" style={{ maxWidth: "500px" }}>
            <h2 style={{ color: "#002080", fontSize: "1.25rem", marginBottom: "16px" }}>Detalhes do Chamado</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px", fontSize: "15px" }}>
              <div><strong>Endereço:</strong> {selectedDetailsTicket.endereco || selectedDetailsTicket.title}</div>
              <div><strong>CEP:</strong> {selectedDetailsTicket.cep || "Não informado"}</div>
              <div><strong>Serviço:</strong> {selectedDetailsTicket.tipoServico || selectedDetailsTicket.serviceType || "Não informado"}</div>
              <div><strong>CNH Exigida:</strong> {selectedDetailsTicket.tipoCNH || selectedDetailsTicket.cnhType || "Não informado"}</div>
              <div><strong>Técnico:</strong> {selectedDetailsTicket.tecnicoResponsavel || selectedDetailsTicket.tecnico || "Não Atribuído"}</div>
              <div><strong>Status:</strong> {selectedDetailsTicket.status || "NOVO"}</div>
              <div><strong>Data de Criação:</strong> {selectedDetailsTicket.dataCriacao || selectedDetailsTicket.date || "Hoje"}</div>
              <div><strong>Observações:</strong> {selectedDetailsTicket.observacoes || selectedDetailsTicket.observacao || "Nenhuma"}</div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setSelectedDetailsTicket(null)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: 600, color: "#333" }}
              >
                Voltar
              </button>
              <button 
                onClick={() => {
                  handleAcceptTicket(selectedDetailsTicket);
                  setSelectedDetailsTicket(null);
                }}
                className="btn-aceitar"
                style={{ padding: "10px 16px", fontWeight: 600, flex: "none" }}
              >
                Aceitar Chamado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CANCELAMENTO */}
      {activeActionModal === "CANCEL" && (
        <div className="popup" style={{ display: "flex" }}>
          <div className="popup-content">
            <h2>Qual o motivo do cancelamento?</h2>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} required></textarea>
            <div className="popup-buttons">
                <button className="btn-voltar" onClick={() => setActiveActionModal("NONE")}>Voltar</button>
                <button className="btn-aceitar" onClick={submitCancel}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(-30px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .premium-input {
            width: 100%;
            padding: 12px 14px;
            border-radius: 12px;
            border: 2px solid #e2e8f0;
            background: #f8fafc;
            font-size: 15px;
            color: #1e293b;
            transition: all 0.25s ease;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
            margin: 0 !important;
        }
        .premium-input:focus {
            background: #ffffff;
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
            outline: none;
        }
        .premium-input-small {
            width: 100%;
            padding: 10px 12px;
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            background: #ffffff;
            font-size: 14px;
            color: #1e293b;
            transition: all 0.25s ease;
            margin: 0 !important;
        }
        .premium-input-small:focus {
            border-color: #3b82f6;
            outline: none;
        }
        .premium-btn-cancel {
            flex: 1;
            padding: 14px;
            border-radius: 14px;
            border: 2px solid #e2e8f0;
            background: white;
            cursor: pointer;
            font-weight: 700;
            color: #64748b;
            font-size: 15px;
            transition: all 0.2s;
        }
        .premium-btn-cancel:hover {
            background: #f1f5f9;
            color: #334155;
            transform: translateY(-1px);
        }
        .premium-btn-save {
            flex: 2;
            padding: 14px;
            border-radius: 14px;
            border: none;
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
            cursor: pointer;
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 10px 20px -10px rgba(59, 130, 246, 0.5);
            transition: all 0.2s;
        }
        .premium-btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 25px -10px rgba(59, 130, 246, 0.6);
        }

        .pagina-telainicial {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 14px 18px 40px;
            width: 100%;
        }
        .mapa-gps-container {
            width: 100%;
            background: white;
            padding: 8px;
            border-radius: 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .quadros-container {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 12px;
            align-items: stretch;
        }
        .quadro-esquerdo, .quadro-direito {
            background-color: white;
            border-radius: 16px;
            padding: 24px 26px;
            box-shadow: 0 16px 34px rgba(0, 0, 0, 0.16);
            min-height: 455px;
        }
        .quadro-esquerdo h3, .quadro-direito h3 {
            margin-bottom: 12px;
            color: #12308f;
            font-size: 20px;
            border: none;
            padding-bottom: 0;
        }
        .chamado-info-ativo {
            background: #f4f7ff;
            border-left: 4px solid #12308f;
            padding: 10px 14px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        #info-veiculo-dados {
            font-size: 18px;
            line-height: 1.35;
            font-weight: 700;
        }
        #info-veiculo-dados p {
            margin-bottom: 2px;
        }
        .campos-adicionais {
            margin-top: 12px;
        }
        .campos-adicionais label {
            display: block;
            margin-bottom: 6px;
            font-weight: 700;
            font-size: 18px;
            margin-top: 15px;
        }
        .campos-adicionais input, .campos-adicionais textarea {
            width: 100%;
            padding: 13px 14px;
            margin-bottom: 12px;
            border: 1px solid #d7d7d7;
            border-radius: 4px;
            background: #fff;
            font-size: 17px;
        }
        .campos-adicionais textarea {
            height: 90px;
            resize: vertical;
        }
        .acoes-veiculo {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        #btn-salvar-veiculo, #btn-cancelar-veiculo, #btn-checkout, #btn-abs-veiculo, #btn-ocorrencia-veiculo, #btn-cancelar-veiculo2, #check-in-veiculo, .btn-lifecycle {
            background-color: #12308f;
            color: white;
            border: none;
            min-height: 38px;
            padding: 9px 14px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            flex: 1;
            font-weight: normal;
            box-shadow: 0 3px 8px rgba(18, 48, 143, 0.2);
            text-align: center;
        }
        #btn-salvar-veiculo:hover, #btn-cancelar-veiculo:hover, #btn-checkout:hover, #btn-abs-veiculo:hover, #btn-ocorrencia-veiculo:hover, #btn-cancelar-veiculo2:hover, #check-in-veiculo:hover, .btn-lifecycle:hover {
            opacity: 0.9;
        }
        .btn-aceitar-ticket {
            background: #14804a;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
            width: 100%;
            font-weight: bold;
        }
        .btn-aceitar-ticket:hover {
            background: #0e6036;
        }
        .sobreposicao, .popup {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(2px);
        }
        .popup-card, .popup-content {
            background-color: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            width: min(90%, 560px);
            max-height: 90vh;
            overflow-y: auto;
        }
        .popup-titulo, .popup-content h2 {
            color: #12308f;
            font-size: 28px;
            margin-bottom: 18px;
            font-weight: bold;
            border-bottom: none;
            margin-top: 0;
        }
        .popup-conteudo, .popup-content {
            color: #333;
            font-size: 18px;
            line-height: 1.5;
        }
        .popup-conteudo p, .popup-content p {
            margin-bottom: 10px;
        }
        .popup-detalhes-layout {
            display: grid;
            grid-template-columns: minmax(0, 1.3fr) 220px;
            gap: 24px;
            align-items: start;
        }
        @media (max-width: 768px) {
            .quadros-container {
                grid-template-columns: 1fr;
            }
            .popup-detalhes-layout {
                grid-template-columns: 1fr;
            }
            .acoes-veiculo {
                flex-direction: column;
            }
            #btn-salvar-veiculo, #btn-cancelar-veiculo, #btn-checkout, #btn-abs-veiculo, #btn-ocorrencia-veiculo, #btn-cancelar-veiculo2, #check-in-veiculo, .btn-lifecycle {
                width: 100%;
                min-height: 48px;
            }
            .btn-container, .popup-buttons {
                flex-direction: column;
            }
            .btn-voltar, .btn-aceitar {
                width: 100%;
                min-height: 48px;
            }
            .popup-card, .popup-content {
                padding: 16px;
            }
        }
        .btn-container, .popup-buttons {
            display: flex;
            gap: 10px;
            margin-top: 16px;
        }
        .btn-voltar {
            background-color: #d8d8d8;
            color: #333;
            padding: 15px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border: none;
            flex: 1;
        }
        .btn-aceitar {
            background-color: #12308f;
            color: white;
            padding: 15px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border: none;
            flex: 1;
        }
        .btn-aceitar:hover { background-color: #0e2877; }
        .popup-content input, .popup-content select, .popup-content textarea {
            width: 100%;
            margin-top: 5px;
            padding: 12px;
            border: 1px solid #d7d7d7;
            border-radius: 4px;
            font-size: 17px;
        }
        .card-chamado {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 12px;
        }
        .card-chamado h4 {
            color: #0f172a;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 4px 0;
            max-width: 80%;
        }
        .card-chamado-badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            display: inline-block;
        }
        .badge-novo { background: #fffdf0; color: #b79500; border: 1px solid #ffecb3; }
        .badge-pendente { background: #fff7ed; color: #c05621; border: 1px solid #feebc8; }
        .badge-ativo { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .acoes-chamado {
            display: flex;
            gap: 8px;
            margin-top: 4px;
            padding-top: 12px;
            border-top: 1px solid #f1f5f9;
        }
        .btn-aceitar {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            background: linear-gradient(135deg, #002080 0%, #0d36b1 100%);
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(13, 54, 177, 0.2);
        }
        .btn-aceitar:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(13, 54, 177, 0.3);
        }
        
        @media (max-width: 980px) {
            .quadros-container { grid-template-columns: 1fr; }
            .popup-detalhes-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
