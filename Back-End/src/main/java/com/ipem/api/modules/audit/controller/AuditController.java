package com.ipem.api.modules.audit.controller;

import com.ipem.api.modules.audit.dto.AuditHistoryDTO;
import com.ipem.api.modules.audit.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/audit")
@CrossOrigin(origins = "*")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/history/all")
    public ResponseEntity<?> getAllHistory() {
        try {
            List<AuditHistoryDTO> history = auditService.getAllAuditHistory();
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Erro ao buscar histórico global: " + e.getMessage()));
        }
    }

    @GetMapping("/history/{entityType}/{id}")
    public ResponseEntity<?> getHistory(@PathVariable String entityType, @PathVariable String id) {
        try {
            // Check if it's a numeric ID or a string ID
            Object entityId;
            try {
                // If it's a number (Long/Integer), try to parse it
                if (entityType.equalsIgnoreCase("service") || 
                    entityType.equalsIgnoreCase("refueling") ||
                    entityType.equalsIgnoreCase("cartype") ||
                    entityType.equalsIgnoreCase("car_type")) {
                    entityId = Long.parseLong(id);
                } else {
                    entityId = id; // User registration or Car prefix are strings
                }
            } catch (NumberFormatException e) {
                entityId = id;
            }

            List<AuditHistoryDTO> history = auditService.getAuditHistory(entityType, entityId);
            return ResponseEntity.ok(history);
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Erro ao buscar histórico: " + e.getMessage()));
        }
    }
}
