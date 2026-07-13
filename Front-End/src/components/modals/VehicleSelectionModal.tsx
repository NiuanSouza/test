import React, { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import "./VehicleSelectionModal.css";
import { apiClient } from "../../services/api";

interface VehicleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: any[];
  onConfirm: (vehicle: any, km: string) => void;
  title?: string;
}

export function VehicleSelectionModal({
  isOpen,
  onClose,
  vehicles,
  onConfirm,
  title = "Veículos Disponíveis",
}: VehicleSelectionModalProps) {
  // Navigation State
  const [step, setStep] = useState<"LIST" | "DETAILS">("LIST");
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Selection State
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [km, setKm] = useState<string>("");

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("TODOS");
  const [filterBrand, setFilterBrand] = useState("TODOS");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.prefix?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.type?.model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const typeMap: Record<string, string> = {
        "PASSEIO": "passenger",
        "UTILITÁRIO": "utility"
      };
      
      const apiCategory = v.type?.category?.toLowerCase() || v.type?.description?.toLowerCase();
      const expectedCategory = typeMap[filterType];
      
      const matchesType = filterType === "TODOS" || apiCategory === expectedCategory;
      const matchesBrand = filterBrand === "TODOS" || v.type?.brand?.toUpperCase() === filterBrand;
      
      return matchesSearch && matchesType && matchesBrand;
    });
  }, [vehicles, searchTerm, filterType, filterBrand]);

  // Derived options for dropdowns (Dynamic)
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    vehicles.forEach((v) => {
      const matchesBrand = filterBrand === "TODOS" || v.type?.brand?.toUpperCase() === filterBrand;
      if (matchesBrand) {
        const cat = v.type?.category?.toLowerCase() || v.type?.description?.toLowerCase();
        if (cat === "passenger") types.add("PASSEIO");
        else if (cat === "utility") types.add("UTILITÁRIO");
      }
    });
    return Array.from(types);
  }, [vehicles, filterBrand]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    vehicles.forEach((v) => {
      const apiCategory = v.type?.category?.toLowerCase() || v.type?.description?.toLowerCase();
      const typeMap: Record<string, string> = { "PASSEIO": "passenger", "UTILITÁRIO": "utility" };
      const expectedCategory = typeMap[filterType];
      const matchesType = filterType === "TODOS" || apiCategory === expectedCategory;
      
      if (matchesType && v.type?.brand) {
        brands.add(v.type.brand.toUpperCase());
      }
    });
    return Array.from(brands).sort();
  }, [vehicles, filterType]);

  // Auto-reset filters if they become invalid due to cross-filtering
  useEffect(() => {
    if (filterType !== "TODOS" && !availableTypes.includes(filterType)) {
      setFilterType("TODOS");
    }
  }, [availableTypes, filterType]);

  useEffect(() => {
    if (filterBrand !== "TODOS" && !availableBrands.includes(filterBrand)) {
      setFilterBrand("TODOS");
    }
  }, [availableBrands, filterBrand]);

  const handleSelectVehicle = async (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setStep("DETAILS");
    
    // Auto-fetch last KM
    try {
      const res = await apiClient.get<any>(`/vehicle/${vehicle.prefix}/last-final-km`, { requireAuth: true });
      if (res && res.lastFinalKm !== undefined && res.lastFinalKm !== null) {
        setKm(String(res.lastFinalKm));
      } else {
        setKm("");
      }
    } catch (e) {
      setKm("");
    }
  };

  const handleConfirm = () => {
    if (!km) {
      alert("Por favor, insira a quilometragem inicial.");
      return;
    }
    onConfirm(selectedVehicle, km);
    
    // Reset state for next time
    setStep("LIST");
    setSelectedVehicle(null);
    setKm("");
    setSearchTerm("");
  };

  const handleClose = () => {
    setStep("LIST");
    setSelectedVehicle(null);
    setKm("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {step === "LIST" && (
        <div className="modal-sobreposicao" onClick={handleClose}>
          <div className="modal-popup-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-popup-titulo">{title}</h2>

            <div className="modal-container-pesquisa">
              <input
                type="text"
                placeholder="Pesquisar por nome ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                className="modal-btn-filtro-abrir"
                onClick={() => setShowFilterModal(true)}
                title="Filtros Avançados"
              >
                <img src="https://cdn-icons-png.flaticon.com/512/57/57164.png" alt="Filtro" style={{ width: "20px", opacity: 0.7 }} />
              </button>
            </div>

            <div className="modal-lista-veiculos">
              {filteredVehicles.length === 0 && (
                <p style={{ textAlign: "center", color: "#64748b", marginTop: "20px" }}>
                  Nenhum veículo encontrado.
                </p>
              )}
              {filteredVehicles.map((v, i) => (
                <div key={i} className="modal-veiculo-item-lista" onClick={() => handleSelectVehicle(v)}>
                  <strong>{v.prefix}</strong>
                  <div>
                    {v.type?.model} ({v.licensePlate})
                  </div>
                </div>
              ))}
            </div>
            
            <div className="modal-btn-container" style={{ marginTop: "16px" }}>
              <button className="modal-btn-voltar" onClick={handleClose}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS AVANÇADOS (Z-INDEX SUPERIOR) */}
      {showFilterModal && step === "LIST" && (
        <div className="modal-sobreposicao" style={{ zIndex: 10005 }}>
          <div className="modal-popup-card modal-popup-filtro-menor">
            <h2 className="modal-popup-titulo">Filtros</h2>

            <div className="modal-grupo-filtro">
              <label>Tipo de Veículo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="TODOS">Todos os tipos</option>
                {availableTypes.includes("PASSEIO") && <option value="PASSEIO">Passeio</option>}
                {availableTypes.includes("UTILITÁRIO") && <option value="UTILITÁRIO">Utilitário</option>}
              </select>
            </div>

            <div className="modal-grupo-filtro">
              <label>Marca</label>
              <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
                <option value="TODOS">Todas as marcas</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand.charAt(0) + brand.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-btn-container">
              <button className="modal-btn-voltar" onClick={() => setShowFilterModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES E KM */}
      {step === "DETAILS" && selectedVehicle && (
        <div className="modal-sobreposicao" onClick={handleClose}>
          <div className="modal-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-popup-detalhes-layout">
              <h2 className="modal-popup-titulo">Confirmar Veículo</h2>

              <div className="modal-popup-conteudo">
                <p>
                  <strong>Modelo:</strong> {selectedVehicle.type?.model}
                </p>
                <p>
                  <strong>Marca:</strong> {selectedVehicle.type?.brand}
                </p>
                <p>
                  <strong>Prefixo:</strong> {selectedVehicle.prefix}
                </p>
                <p>
                  <strong>Placa:</strong> {selectedVehicle.licensePlate}
                </p>
              </div>

              <div style={{ marginTop: "20px", marginBottom: "8px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#12308f",
                  }}
                >
                  KM Inicial do Painel *
                </label>
                <input
                  type="number"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  placeholder="Ex: 12500"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "16px",
                    outline: "none",
                  }}
                />
              </div>

              <div className="modal-btn-container">
                <button
                  className="modal-btn-voltar"
                  onClick={() => {
                    setStep("LIST");
                    setSelectedVehicle(null);
                  }}
                >
                  ← Escolher outro
                </button>
                <button className="modal-btn-aceitar" onClick={handleConfirm}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
