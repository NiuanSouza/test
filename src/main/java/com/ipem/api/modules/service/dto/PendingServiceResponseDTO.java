package com.ipem.api.modules.service.dto;

import java.time.LocalDateTime;

public record PendingServiceResponseDTO(
    Long id,
    String endereco,
    String cep,
    String tipoServico,
    String tipoCNH,
    String tecnico,
    Double latitude,
    Double longitude,
    String observacoes,
    String status,
    LocalDateTime dataCriacao
) {}
