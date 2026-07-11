"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { useAuth } from "../../../providers/AuthProvider";
import { useToast } from "../../../providers/ToastProvider";
import { apiClient } from "../../../services/api";
import { ActiveServiceResponse, CheckInOutRequest } from "../../../types/service";
import styles from "./Home.module.css";
import { CarFront, LogIn, LogOut, MapPin } from "lucide-react";

export default function TechnicianHomePage() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [activeService, setActiveService] = useState<ActiveServiceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [carPrefix, setCarPrefix] = useState("");
  const [recordKm, setRecordKm] = useState("");
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState("");
  const [priority, setPriority] = useState("LOW");

  useEffect(() => {
    fetchActiveService();
  }, []);

  const fetchActiveService = async () => {
    try {
      const data = await apiClient.get<ActiveServiceResponse>("/service/active");
      setActiveService(data);
    } catch (error) {
      // Ignore if none found
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carPrefix || !recordKm || !destination) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const payload: CheckInOutRequest = {
        carPrefix,
        userRegistration: user?.registration || "",
        recordKm: Number(recordKm),
        note,
        destinationRequester: destination,
        priority: priority as any
      };
      
      await apiClient.post("/service/check-in", payload);
      toast.success("Check-in realizado com sucesso!");
      fetchActiveService();
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar check-in");
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordKm) {
      toast.error("Informe a quilometragem atual.");
      return;
    }

    try {
      const payload: CheckInOutRequest = {
        serviceId: activeService?.serviceId,
        carPrefix: activeService?.carPrefix || "",
        userRegistration: user?.registration || "",
        recordKm: Number(recordKm),
        note,
        destinationRequester: "Check-out",
        priority: "LOW"
      };
      
      await apiClient.post("/service/check-out", payload);
      toast.success("Check-out realizado com sucesso!");
      setActiveService(null);
      setRecordKm("");
      setNote("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar check-out");
    }
  };

  if (isLoading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Olá, {user?.name?.split(' ')[0]}</h1>
        <p className={styles.subtitle}>O que você vai fazer hoje?</p>
      </div>

      <div className={styles.content}>
        {activeService?.active ? (
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>
                <div className={styles.cardTitle}>
                  <LogOut className={styles.iconRed} /> Check-out de Veículo
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.activeInfo}>
                <p><strong>Veículo:</strong> {activeService.carPrefix} - {activeService.model}</p>
                <p><strong>Placa:</strong> {activeService.licensePlate}</p>
                <p><strong>Destino:</strong> {activeService.description}</p>
                <p><strong>Horário de Saída:</strong> {activeService.departureTime}</p>
                <p><strong>KM Inicial:</strong> {activeService.departureKm}</p>
              </div>

              <form onSubmit={handleCheckOut} className={styles.form}>
                <Input 
                  label="Quilometragem Final" 
                  type="number" 
                  value={recordKm} 
                  onChange={(e) => setRecordKm(e.target.value)} 
                  required 
                />
                <Input 
                  label="Observações (opcional)" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                />
                
                <Button type="submit" variant="primary" className={styles.submitBtn}>
                  Finalizar Uso
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>
                <div className={styles.cardTitle}>
                  <LogIn className={styles.iconPrimary} /> Check-in de Veículo
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckIn} className={styles.form}>
                <div className={styles.formGrid}>
                  <Input 
                    label="Prefixo do Veículo (ex: V-01)" 
                    value={carPrefix} 
                    onChange={(e) => setCarPrefix(e.target.value)} 
                    required 
                  />
                  <Input 
                    label="Quilometragem Inicial" 
                    type="number" 
                    value={recordKm} 
                    onChange={(e) => setRecordKm(e.target.value)} 
                    required 
                  />
                  <Input 
                    label="Destino" 
                    value={destination} 
                    onChange={(e) => setDestination(e.target.value)} 
                    required 
                  />
                  <Select 
                    label="Prioridade" 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)} 
                    options={[
                      { value: "LOW", label: "Baixa" },
                      { value: "MEDIUM", label: "Média" },
                      { value: "HIGH", label: "Alta" },
                      { value: "CRITICAL", label: "Crítica" }
                    ]}
                    required 
                  />
                </div>
                <Input 
                  label="Observações (opcional)" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                />
                
                <Button type="submit" variant="primary" className={styles.submitBtn}>
                  Iniciar Uso
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className={styles.quickLinks}>
          <Card className={styles.linkCard}>
            <MapPin className={styles.linkIcon} />
            <h3>Meus Chamados</h3>
            <p>Ver histórico e chamados atribuídos</p>
            <Button variant="secondary" onClick={() => window.location.href = "/tickets"}>Acessar</Button>
          </Card>
          
          <Card className={styles.linkCard}>
            <CarFront className={styles.linkIcon} />
            <h3>Abastecimento</h3>
            <p>Registrar nota de abastecimento</p>
            <Button variant="secondary">Acessar</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
