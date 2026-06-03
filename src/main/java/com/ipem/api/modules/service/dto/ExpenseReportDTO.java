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
public class ExpenseReportDTO {

    @JsonProperty("ID")
    private Long id;

    @JsonProperty("Placa do Veículo")
    private String carPrefix;

    @JsonProperty("Técnico")
    private String technicianName;

    @JsonProperty("Tipo de Gasto")
    private String expenseType;

    @JsonProperty("Data do Gasto")
    private String date;

    @JsonProperty("Observação")
    private String note;
}
