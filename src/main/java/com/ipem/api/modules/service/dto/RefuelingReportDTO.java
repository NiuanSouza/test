package com.ipem.api.modules.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefuelingReportDTO {

    @JsonProperty("ID")
    private Long id;

    @JsonProperty("Veículo")
    private String carPrefix;

    @JsonProperty("Motorista")
    private String technicianName;

    @JsonProperty("Data")
    private String date;

    @JsonProperty("Posto")
    private String gasStationName;

    @JsonProperty("Litros")
    private Float liters;

    @JsonProperty("Valor Total")
    private String totalAmount;

    @JsonProperty("Preço por Litro")
    private String pricePerLiter;
}
