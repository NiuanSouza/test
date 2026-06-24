package com.ipem.api.modules.service.dto;

public record RefuelingRequestDTO(
        Float liters,
        Double pricePerLiter,
        Double totalAmount,
        Float recordKm,
        String invoice,
        String date,
        String gasStationName,
        String fuelType
) {
}