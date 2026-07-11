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
public class IncidentReportDTO {

    @JsonProperty("ID")
    private Long id;

    @JsonProperty("Placa do Veículo")
    private String carPrefix;

    @JsonProperty("Técnico")
    private String technicianName;

    @JsonProperty("Tipo de Ocorrência")
    private String incidentType;

    @JsonProperty("Gravidade")
    private String severity;

    @JsonProperty("Descrição")
    private String description;

    @JsonProperty("Data da Ocorrência")
    private String date;

    @JsonProperty("Status")
    private String status;
}
