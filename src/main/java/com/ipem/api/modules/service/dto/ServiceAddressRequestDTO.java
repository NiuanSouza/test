package com.ipem.api.modules.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ServiceAddressRequestDTO(

        @NotNull(message = "O ID do serviço é obrigatório.")
        Long serviceId,

        @NotBlank(message = "A rua é obrigatória.")
        @Size(max = 255, message = "A rua deve ter no máximo 255 caracteres.")
        String street,

        @Size(max = 20, message = "O número deve ter no máximo 20 caracteres.")
        String number,

        @Size(max = 100, message = "O bairro deve ter no máximo 100 caracteres.")
        String neighborhood,

        @NotBlank(message = "A cidade é obrigatória.")
        @Size(max = 100, message = "A cidade deve ter no máximo 100 caracteres.")
        String city,

        @NotBlank(message = "O estado é obrigatório.")
        @Size(min = 2, max = 2, message = "O estado deve conter exatamente 2 caracteres (Sigla).")
        String state,

        @Size(max = 15, message = "O CEP deve ter no máximo 15 caracteres.")
        String zipCode,

        @Size(max = 150, message = "O complemento deve ter no máximo 150 caracteres.")
        String complement

) {}