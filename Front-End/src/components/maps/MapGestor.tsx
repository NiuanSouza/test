import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { apiClient } from "../../services/api";
import { useToast } from "../../providers/ToastProvider";
import "../../app/(app)/service-requests/mapa-gestor.css";

// Interface for Ticket
interface Ticket {
  id?: number;
  endereco: string;
  cep: string;
  tipoServico: string;
  tipoCNH: string;
  tecnicoResponsavel: string;
  tecnico?: string; // used by backend sometimes
  latitude: number;
  longitude: number;
  observacoes: string;
  status: string;
  dataCriacao?: string;
}

const CENTRO_PADRAO_MAPA = [-23.5567, -46.6457] as [number, number];

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ chamados }: { chamados: Ticket[] }) {
  const map = useMap();
  useEffect(() => {
    const validChamados = chamados.filter(c => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
    if (validChamados.length > 0) {
      const bounds = L.latLngBounds(validChamados.map(c => [c.latitude, c.longitude]));
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

export default function MapGestor() {
  const [chamados, setChamados] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<{registration: string, name: string}[]>([]);
  
  // Form State
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [tipoServico, setTipoServico] = useState("");
  const [tipoCNH, setTipoCNH] = useState("");
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Map Selection State
  const [localizacaoSelecionada, setLocalizacaoSelecionada] = useState<{lat: number, lng: number} | null>(null);
  const [refCepSelecionado, setRefCepSelecionado] = useState("");
  const [searchingCep, setSearchingCep] = useState(false);
  const [focusLocation, setFocusLocation] = useState<{lat: number, lng: number} | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchChamados();
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const response = await apiClient.get<any[]>("/user/technicians/active");
      if (Array.isArray(response)) {
        setTechnicians(response.map(t => ({ registration: t.registration, name: t.name })));
      }
    } catch (err) {
      console.error("Falha ao carregar técnicos", err);
    }
  };

  const fetchChamados = async () => {
    try {
      const response = await apiClient.get<any[]>("/service/pending");
      if (Array.isArray(response)) {
        const normalized = response.map(c => ({
          id: c.id,
          endereco: c.endereco || c.title || "Endereço não informado",
          cep: c.cep || "",
          tipoServico: c.tipoServico || c.serviceType || "Serviço não informado",
          tipoCNH: c.tipoCNH || c.cnhType || "Não informado",
          tecnicoResponsavel: c.tecnicoResponsavel || c.tecnico || "Não atribuído",
          tecnico: c.tecnicoResponsavel || c.tecnico || "Não atribuído",
          latitude: Number(c.latitude ?? c.lat),
          longitude: Number(c.longitude ?? c.lng),
          observacoes: c.observacoes || c.observacao || "",
          status: c.status || "novo",
          dataCriacao: c.dataCriacao || c.createdAt || new Date().toLocaleString()
        }));
        setChamados(normalized);
      }
    } catch (err) {
      console.warn("API de chamados falhou", err);
    } finally {
      setLoading(false);
    }
  };

  const buscarLocalizacaoPorCep = async (exibirToast = true) => {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) {
      if (exibirToast) showToast("Informe um CEP válido com 8 dígitos.", "error");
      return false;
    }

    setSearchingCep(true);
    try {
      // 1. ViaCEP
      const resCep = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const dadosCep = await resCep.json();
      if (dadosCep.erro) throw new Error("CEP não encontrado");

      let endAtual = endereco.trim();
      if (!endAtual) {
        endAtual = [dadosCep.logradouro, dadosCep.bairro, `${dadosCep.localidade} - ${dadosCep.uf}`].filter(Boolean).join(", ");
        setEndereco(endAtual);
      }

      // 2. Nominatim
      const consultas = [
        `${limpo}, Brasil`,
        [dadosCep.logradouro, dadosCep.localidade, dadosCep.uf, "Brasil"].filter(Boolean).join(", "),
        [dadosCep.bairro, dadosCep.localidade, dadosCep.uf, "Brasil"].filter(Boolean).join(", "),
        [endAtual, dadosCep.localidade, dadosCep.uf, "Brasil"].filter(Boolean).join(", ")
      ];

      let coords = null;
      for (const q of consultas) {
        const resNom = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`);
        const resultNom = await resNom.json();
        if (resultNom && resultNom.length > 0) {
          coords = { lat: Number(resultNom[0].lat), lng: Number(resultNom[0].lon) };
          break;
        }
      }

      if (coords) {
        setLocalizacaoSelecionada(coords);
        setRefCepSelecionado(limpo);
        if (exibirToast) showToast("CEP localizado com sucesso.", "success");
        return true;
      }
      throw new Error("CEP não localizado no mapa");
    } catch (error) {
      console.error(error);
      if (exibirToast) showToast("Não foi possível localizar esse CEP.", "error");
      return false;
    } finally {
      setSearchingCep(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLocalizacaoSelecionada({ lat, lng });
    setRefCepSelecionado("manual");
    showToast("Ponto ajustado manualmente no mapa.", "success");
  };

  const formatCep = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatCep(e.target.value);
    setCep(val);
    const limpo = val.replace(/\D/g, "");
    if (localizacaoSelecionada && limpo !== refCepSelecionado && refCepSelecionado !== "manual") {
      setLocalizacaoSelecionada(null);
      setRefCepSelecionado("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = cep.replace(/\D/g, "");
    if (!endereco || limpo.length !== 8 || !tipoServico || !tipoCNH || !tecnicoResponsavel) {
      showToast("Preencha os campos obrigatórios.", "error");
      return;
    }

    if (!localizacaoSelecionada || (refCepSelecionado !== limpo && refCepSelecionado !== "manual")) {
      showToast("Por favor, busque o CEP ou clique no mapa para definir o local.", "error");
      return;
    }

    const payload = {
      endereco,
      cep: limpo,
      tipoServico,
      tipoCNH,
      tecnico: tecnicoResponsavel,
      observacoes,
      latitude: localizacaoSelecionada.lat,
      longitude: localizacaoSelecionada.lng
    };

    try {
      await apiClient.post("/service/create-pending", payload);
      showToast("Chamado criado com sucesso!", "success");
      
      // Reset Form
      setCep("");
      setEndereco("");
      setTipoServico("");
      setTipoCNH("");
      setTecnicoResponsavel("");
      setObservacoes("");
      setLocalizacaoSelecionada(null);
      setRefCepSelecionado("");

      fetchChamados();
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar chamado na API.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este chamado?")) {
      try {
        await apiClient.delete(`/service/${id}`);
        showToast("Chamado excluído com sucesso.", "success");
        fetchChamados();
      } catch (err) {
        showToast("Erro ao excluir chamado.", "error");
      }
    }
  };

  const obterCorStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "novo": return "#FFD700";
      case "pendente": return "#FF9800";
      case "ativo": case "em andamento": return "#4CAF50";
      case "concluido": return "#2196F3";
      default: return "#9E9E9E";
    }
  };

  return (
    <div className="container-mapa-gestor">
      {/* MAP PANEL */}
      <div className="painel-mapa">
        <h2 className="mapa-titulo">Mapa de Chamados</h2>
        <div className="mapa-container">
          <MapContainer center={CENTRO_PADRAO_MAPA} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents onMapClick={handleMapClick} />
            <FitBounds chamados={chamados} />
            <MapFocus focusLocation={focusLocation} />
            
            {/* Registered Tickets */}
            {chamados.map((c, i) => (
              Number.isFinite(c.latitude) && Number.isFinite(c.longitude) ? (
                <CircleMarker
                  key={`marker-${c.id || i}`}
                  center={[c.latitude, c.longitude]}
                  radius={8}
                  pathOptions={{
                    fillColor: obterCorStatus(c.status),
                    color: "#fff",
                    weight: 2,
                    fillOpacity: 0.85
                  }}
                >
                  <Popup>
                    <div className="popup-mapa" style={{ fontFamily: "sans-serif", fontSize: "13px" }}>
                      <strong style={{ display: "block", marginBottom: "2px", color: "#1a3c6d" }}>{c.endereco}</strong>
                      <small style={{ color: "#555", fontWeight: 600 }}>{c.tipoServico}</small><br/>
                      <span style={{ display: "inline-block", marginTop: "5px" }}><strong>Status:</strong> {c.status}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null
            ))}

            {/* Selection Marker */}
            {localizacaoSelecionada && (
              <CircleMarker
                center={[localizacaoSelecionada.lat, localizacaoSelecionada.lng]}
                radius={9}
                pathOptions={{
                  fillColor: "#002080",
                  color: "#ffffff",
                  weight: 3,
                  fillOpacity: 0.95
                }}
              >
                <Popup>
                  {refCepSelecionado === "manual" ? "Local ajustado manualmente." : "Local definido pelo CEP."}
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>
        <div className="mapa-legenda">
          <span className="legenda-item"><i className="marcador-novo"></i> Novo</span>
          <span className="legenda-item"><i className="marcador-pendente"></i> Pendente</span>
          <span className="legenda-item"><i className="marcador-ativo"></i> Ativo</span>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="painel-inferior">
        
        {/* FORM */}
        <div className="card-formulario">
          <h3 className="titulo-formulario">Novo Chamado</h3>
          <form className="formulario-chamado-grid" onSubmit={handleSubmit}>
            <div className="campo-grupo campo-cep">
              <label>CEP *</label>
              <div className="campo-cep-linha">
                <input 
                  type="text" 
                  value={cep} 
                  onChange={handleCepChange} 
                  maxLength={9} 
                  placeholder="00000-000" 
                  required 
                />
                <button type="button" className="btn-marcar-mapa" onClick={() => buscarLocalizacaoPorCep()} disabled={searchingCep}>
                  {searchingCep ? "Buscando..." : "Buscar"}
                </button>
              </div>
              <p className={`resumo-localizacao ${localizacaoSelecionada ? "ativo" : ""}`}>
                {localizacaoSelecionada ? "Ponto definido." : "Clique no mapa ou busque o CEP."}
              </p>
            </div>

            <div className="campo-grupo">
              <label>Endereço *</label>
              <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, numero, complemento" required />
            </div>

            <div className="campo-grupo">
              <label>Tipo de Serviço *</label>
              <select value={tipoServico} onChange={e => setTipoServico(e.target.value)} required>
                <option value="">Selecione...</option>
                <option value="Manutenção Corretiva">Manutenção Corretiva</option>
                <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                <option value="Inspeção">Inspeção</option>
                <option value="Instalação">Instalação</option>
                <option value="Reparo">Reparo</option>
              </select>
            </div>

            <div className="campo-grupo">
              <label>Tipo de CNH Exigida *</label>
              <select value={tipoCNH} onChange={e => setTipoCNH(e.target.value)} required>
                <option value="">Selecione...</option>
                <option value="A">Categoria A</option>
                <option value="B">Categoria B</option>
                <option value="C">Categoria C</option>
                <option value="D">Categoria D</option>
                <option value="E">Categoria E</option>
                <option value="Nenhuma">Nenhuma</option>
              </select>
            </div>

            <div className="campo-grupo">
              <label>Técnico Responsável *</label>
              <select value={tecnicoResponsavel} onChange={e => setTecnicoResponsavel(e.target.value)} required>
                <option value="">Selecione...</option>
                <option value="Não Atribuído">Qualquer um</option>
                {technicians.map(t => (
                  <option key={t.registration} value={t.registration}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="campo-grupo">
              <label>Observações</label>
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Informações adicionais" rows={2}></textarea>
            </div>

            <div className="acoes-formulario">
              <button type="submit" className="btn-criar">Criar Chamado</button>
              <button type="button" className="btn-limpar" onClick={() => {
                setCep(""); setEndereco(""); setTipoServico(""); setTipoCNH(""); setTecnicoResponsavel(""); setObservacoes("");
                setLocalizacaoSelecionada(null); setRefCepSelecionado("");
              }}>Limpar</button>
            </div>
          </form>
        </div>

        {/* LIST */}
        <div className="lista-chamados-container">
          <div className="lista-header">
            <h3>Chamados Criados ({chamados.length})</h3>
          </div>
          
          <div className="lista-chamados-horizontal">
            {loading ? (
              <p className="lista-vazia">Carregando...</p>
            ) : chamados.length === 0 ? (
              <p className="lista-vazia">Nenhum chamado criado.</p>
            ) : (
              chamados.map(c => (
                <div key={c.id} className="card-chamado-horizontal">
                  <div className="card-header">
                    <h4>{c.endereco}</h4>
                    <span className={`badge status-${c.status?.toLowerCase() || 'novo'}`}>
                      {(c.status || "novo").toUpperCase()}
                    </span>
                  </div>
                  <div className="card-body">
                    <p><span>CEP:</span> {c.cep || "Não informado"}</p>
                    <p><span>Serviço:</span> {c.tipoServico}</p>
                    <p><span>CNH:</span> {c.tipoCNH}</p>
                    <p><span>Técnico:</span> {c.tecnico}</p>
                  </div>
                  <div className="card-footer">
                    <button className="btn-secundario" onClick={() => {
                      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
                        setFocusLocation({ lat: c.latitude, lng: c.longitude });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        showToast("Localização indisponível", "error");
                      }
                    }}>Mapa</button>
                    <button className="btn-perigo" onClick={() => c.id && handleDelete(c.id)}>Excluir</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
