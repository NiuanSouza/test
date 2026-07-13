import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { apiClient } from "../../services/api";
import { useToast } from "../../providers/ToastProvider";
import { AlertCircle, MapPin, Search } from "lucide-react";
import "../../app/(app)/service-requests/mapa-chamados.css";
import { VehicleSelectionModal } from "../modals/VehicleSelectionModal";

interface Ticket {
  id?: number;
  endereco: string;
  cep: string;
  tipoServico: string;
  status: string;
  observacoes: string;
  latitude: number;
  longitude: number;
  tecnicoResponsavel: string;
  tipoCNH: string;
  dataCriacao: string;
}

const CENTRO_PADRAO_MAPA = [-23.5567, -46.6457] as [number, number];

function FitBounds({ chamados }: { chamados: Ticket[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = chamados.filter(c => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map(c => [c.latitude, c.longitude]));
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView(CENTRO_PADRAO_MAPA, 13);
    }
  }, [chamados, map]);
  return null;
}

function MapFocus({ focusLocation }: { focusLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (focusLocation) {
      map.flyTo([focusLocation.lat, focusLocation.lng], 16, { duration: 1.5 });
    }
  }, [focusLocation, map]);
  return null;
}

export default function MapChamados() {
  const [chamados, setChamados] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [searchFilter, setSearchFilter] = useState("");

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [selectedTicketForAction, setSelectedTicketForAction] = useState<number | null>(null);
  
  // Details Modal
  const [selectedDetailsTicket, setSelectedDetailsTicket] = useState<Ticket | null>(null);

  const [focusLocation, setFocusLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    fetchChamados();
    fetchVeiculos();
  }, []);

  const fetchChamados = async () => {
    try {
      const response = await apiClient.get<any[]>("/service/pending");
      if (Array.isArray(response)) {
        
        let currentUserName = "";
        const userString = localStorage.getItem("siva_user");
        if (userString) {
          try {
            const u = JSON.parse(userString);
            currentUserName = u.name || u.nome || "";
          } catch(e){}
        }

        const normalized = response.map(c => ({
          id: c.id,
          endereco: c.endereco || c.title || "Endereço não informado",
          cep: c.cep || "",
          tipoServico: c.tipoServico || c.serviceType || "Serviço não informado",
          latitude: Number(c.latitude ?? c.lat),
          longitude: Number(c.longitude ?? c.lng),
          observacoes: c.observacoes || c.observacao || "",
          status: c.status || "novo",
          tecnicoResponsavel: c.tecnicoResponsavel || c.tecnico || "Não Atribuído",
          tipoCNH: c.tipoCNH || c.cnhType || "Não informado",
          dataCriacao: c.dataCriacao || c.createdAt || new Date().toLocaleString()
        }));

        // Filter by Technician (only assigned to me or unassigned)
        const filteredForMe = normalized.filter(c => {
          const tec = c.tecnicoResponsavel?.toLowerCase() || "";
          if (tec === "não atribuído" || tec === "não informado" || tec === "qualquer um" || !tec) return true;
          if (currentUserName && tec.includes(currentUserName.toLowerCase())) return true;
          return false;
        });

        setChamados(filteredForMe);
      }
    } catch (err) {
      console.warn("API de chamados falhou", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVeiculos = async () => {
    try {
      const response = await apiClient.get<any[]>("/vehicle");
      if (Array.isArray(response)) {
        setVeiculos(response.filter(v => v.vehicleStatus === "AVAILABLE"));
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleOpenDetails = (ticket: Ticket) => {
    setSelectedDetailsTicket(ticket);
  };

  const handleAceitarFromDetails = (ticketId: number) => {
    setSelectedTicketForAction(ticketId);
    setSelectedDetailsTicket(null);
    setShowVehicleModal(true);
  };

  const confirmarCheckIn = async (vehicle: any, km: string) => {
    if (!vehicle || !km) {
      showToast("Selecione um veículo e informe a KM inicial.", "error");
      return;
    }
    
    const userString = localStorage.getItem("siva_user");
    let reg = "ana-paula"; // fallback
    if (userString) {
      try {
        const u = JSON.parse(userString);
        reg = u.registration || u.matricula || reg;
      } catch(e){}
    }

    try {
      await apiClient.post("/service/start", {
        serviceId: selectedTicketForAction,
        carPrefix: vehicle.prefix,
        userRegistration: reg,
        recordKm: parseFloat(km),
        note: "Iniciando atendimento"
      });
      showToast("Chamado aceito e serviço iniciado!", "success");
      setShowVehicleModal(false);
      setSelectedTicketForAction(null);
      fetchChamados();
    } catch (e) {
      console.error(e);
      showToast("Erro ao iniciar o serviço.", "error");
    }
  };

  const obterCorStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "novo": return "#FFD700";
      case "pendente": return "#FF9800";
      case "ativo": case "em andamento": return "#4CAF50";
      default: return "#9E9E9E";
    }
  };

  const chamadosFiltrados = useMemo(() => {
    if (!searchFilter) return chamados;
    const lowerSearch = searchFilter.toLowerCase();
    return chamados.filter(c => 
      c.endereco.toLowerCase().includes(lowerSearch) || 
      c.tipoServico.toLowerCase().includes(lowerSearch) ||
      c.status.toLowerCase().includes(lowerSearch)
    );
  }, [chamados, searchFilter]);

  return (
    <div className="chamados-container">
      {/* MAPA */}
      <div className="mapa-card">
        <h2 className="mapa-titulo">Mapa de Chamados Pendentes</h2>
        <div className="mapa-container">
          <MapContainer center={CENTRO_PADRAO_MAPA} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds chamados={chamadosFiltrados} />
            <MapFocus focusLocation={focusLocation} />
            
            {chamadosFiltrados.map((c, i) => (
              Number.isFinite(c.latitude) && Number.isFinite(c.longitude) ? (
                <CircleMarker
                  key={`m-${c.id || i}`}
                  center={[c.latitude, c.longitude]}
                  radius={8}
                  pathOptions={{ fillColor: obterCorStatus(c.status), color: "#fff", weight: 2, fillOpacity: 0.85 }}
                >
                  <Popup>
                    <div className="popup-mapa" style={{ fontFamily: "sans-serif", fontSize: "13px" }}>
                      <strong style={{ display: "block", marginBottom: "2px" }}>{c.endereco}</strong>
                      <small style={{ color: "#555", fontWeight: 600 }}>{c.tipoServico}</small><br/>
                      <span style={{ display: "inline-block", marginTop: "5px" }}><strong>Status:</strong> {c.status}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null
            ))}
          </MapContainer>
        </div>
        <div className="mapa-instrucoes">
          Clique nos marcadores para ver os detalhes rápidos.
        </div>
      </div>

      {/* LISTA */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)", margin: 0 }}>
            Lista de Serviços ({chamadosFiltrados.length})
          </h2>
          
          <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", width: "100%", maxWidth: "320px" }}>
            <Search size={16} color="#64748b" style={{ marginRight: "8px" }} />
            <input 
              type="text" 
              placeholder="Filtrar por endereço, serviço ou status..." 
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }}
            />
          </div>
        </div>
        
        {loading ? (
          <p style={{ textAlign: "center", padding: "20px" }}>Buscando chamados...</p>
        ) : chamadosFiltrados.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Nenhum chamado encontrado.</p>
        ) : (
          <div className="grid-chamados">
            {chamadosFiltrados.map((c) => (
              <div key={c.id} className="card-chamado">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4>{c.endereco}</h4>
                  <span className={`card-chamado-badge badge-${c.status.toLowerCase()}`}>{c.status.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "#64748b", fontSize: "13px" }}>
                  <AlertCircle size={14} /> {c.tipoServico}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "#64748b", fontSize: "13px" }}>
                  <MapPin size={14} /> CEP: {c.cep || "N/A"}
                </div>
                <div className="acoes-chamado">
                  <button className="btn-detalhes" onClick={() => {
                    if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
                      setFocusLocation({ lat: c.latitude, lng: c.longitude });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      showToast("Localização indisponível", "error");
                    }
                  }}>
                    Ver no mapa
                  </button>
                  <button className="btn-aceitar" onClick={() => handleOpenDetails(c)}>
                    Detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES DO CHAMADO */}
      {selectedDetailsTicket && (
        <div className="modal-veiculos">
          <div className="modal-content">
            <h2 style={{ color: "#002080", fontSize: "1.25rem", marginBottom: "16px" }}>Detalhes do Chamado</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              <div><strong>Endereço:</strong> {selectedDetailsTicket.endereco}</div>
              <div><strong>CEP:</strong> {selectedDetailsTicket.cep}</div>
              <div><strong>Serviço:</strong> {selectedDetailsTicket.tipoServico}</div>
              <div><strong>CNH Exigida:</strong> {selectedDetailsTicket.tipoCNH}</div>
              <div><strong>Técnico:</strong> {selectedDetailsTicket.tecnicoResponsavel}</div>
              <div><strong>Status:</strong> {selectedDetailsTicket.status}</div>
              <div><strong>Data de Criação:</strong> {selectedDetailsTicket.dataCriacao}</div>
              <div><strong>Observações:</strong> {selectedDetailsTicket.observacoes || "Nenhuma"}</div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setSelectedDetailsTicket(null)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: 600 }}
              >
                Fechar
              </button>
              <button 
                onClick={() => selectedDetailsTicket.id && handleAceitarFromDetails(selectedDetailsTicket.id)}
                className="btn-aceitar"
                style={{ padding: "10px 16px", fontWeight: 600 }}
              >
                Aceitar Chamado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UNIFICADO DE SELEÇÃO DE VEÍCULO */}
      <VehicleSelectionModal
        isOpen={showVehicleModal}
        onClose={() => {
          setShowVehicleModal(false);
          setSelectedTicketForAction(null);
        }}
        vehicles={veiculos}
        onConfirm={confirmarCheckIn}
      />

    </div>
  );
}
