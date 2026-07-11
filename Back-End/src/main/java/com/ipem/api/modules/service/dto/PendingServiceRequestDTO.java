package com.ipem.api.modules.service.dto;

public record PendingServiceRequestDTO(
    String endereco,
    String cep,
    String tipoServico,
    String tipoCNH,
    String tecnico,
    Double latitude,
    Double longitude,
    String observacoes
) {}
