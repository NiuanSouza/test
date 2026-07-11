package com.ipem.api.modules.service.dto;

import com.ipem.api.modules.service.model.enums.Priority;

public record CheckInOutRequestDTO(
        Long serviceId,
        String carPrefix,
        String userRegistration,
        Float recordKm,
        String note,
        Priority priority
) {
}