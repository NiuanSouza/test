"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Select } from "../../../../components/Select";
import { apiClient } from "../../../../services/api";
import { useToast } from "../../../../providers/ToastProvider";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import styles from "../../SharedForm.module.css";

export default function RegisterVehiclePage() {
  const [formData, setFormData] = useState({
    prefix: "",
    licensePlate: "",
    brand: "",
    model: "",
    category: "B",
    year: "",
    color: "",
    initialMileage: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        prefix: formData.prefix,
        licensePlate: formData.licensePlate,
        type: {
          brand: formData.brand,
          model: formData.model,
          category: formData.category
        },
        year: parseInt(formData.year),
        color: formData.color,
        mileage: parseInt(formData.initialMileage)
      };
      await apiClient.post("/vehicle", payload);
      toast.success("Veículo cadastrado com sucesso!");
      router.push("/vehicles");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar veículo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" onClick={() => router.back()} className={styles.backBtn}>
          <ArrowLeft size={20} /> Voltar
        </Button>
        <h1 className={styles.title}>Cadastro de Veículo</h1>
      </div>

      <Card className={styles.formCard}>
        <CardHeader>
          <CardTitle>Dados do Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <Input 
                name="prefix"
                label="Prefixo (ex: V-01)" 
                value={formData.prefix} 
                onChange={handleChange} 
                required 
              />
              <Input 
                name="licensePlate"
                label="Placa" 
                value={formData.licensePlate} 
                onChange={handleChange} 
                required 
              />
              <Input 
                name="brand"
                label="Marca" 
                value={formData.brand} 
                onChange={handleChange} 
                required 
              />
              <Input 
                name="model"
                label="Modelo" 
                value={formData.model} 
                onChange={handleChange} 
                required 
              />
              <Select 
                name="category"
                label="Categoria Exigida (CNH)" 
                value={formData.category} 
                onChange={handleChange}
                options={[
                  { value: "A", label: "A (Moto)" },
                  { value: "B", label: "B (Carro)" },
                  { value: "C", label: "C (Caminhão)" },
                  { value: "D", label: "D (Ônibus)" },
                  { value: "E", label: "E (Articulados)" }
                ]}
                required 
              />
              <Input 
                name="year"
                type="number"
                label="Ano" 
                value={formData.year} 
                onChange={handleChange} 
                required 
              />
              <Input 
                name="color"
                label="Cor" 
                value={formData.color} 
                onChange={handleChange} 
                required 
              />
              <Input 
                name="initialMileage"
                type="number"
                label="Quilometragem Atual" 
                value={formData.initialMileage} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading}>
                <Save size={18} /> Salvar Veículo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
