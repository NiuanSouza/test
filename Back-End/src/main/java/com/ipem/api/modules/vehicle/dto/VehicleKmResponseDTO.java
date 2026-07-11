package com.ipem.api.modules.vehicle.dto;

public class VehicleKmResponseDTO {
    private Float lastFinalKm;

    public VehicleKmResponseDTO(Float lastFinalKm) {
        this.lastFinalKm = lastFinalKm;
    }

    public Float getLastFinalKm() {
        return lastFinalKm;
    }

    public void setLastFinalKm(Float lastFinalKm) {
        this.lastFinalKm = lastFinalKm;
    }
}