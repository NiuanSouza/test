package com.ipem.api.modules.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditHistoryDTO {
    private Number revisionId;
    private LocalDateTime revisionDate;
    private String revisionType; // ADD, MOD, DEL
    private Map<String, Object> entityData;
}
