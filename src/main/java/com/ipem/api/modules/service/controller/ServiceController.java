package com.ipem.api.modules.service.controller;

import com.ipem.api.modules.service.dto.CheckInOutRequestDTO;
import com.ipem.api.modules.service.service.ServiceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import com.ipem.api.modules.service.dto.PendingServiceRequestDTO;

@RestController
@RequestMapping("/service")
@CrossOrigin(origins = "*")
public class ServiceController {

    private final ServiceService serviceService;

    public ServiceController(ServiceService serviceService) {
        this.serviceService = serviceService;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startService(@RequestBody CheckInOutRequestDTO dto) {
        var service = serviceService.startService(dto);
        return ResponseEntity.ok(Map.of("serviceId", service.getId(), "message", "Check-in ok"));
    }

    @PostMapping("/finalize/{id}")
    public ResponseEntity<?> finalizeService(@PathVariable Long id, @RequestBody CheckInOutRequestDTO dto) {
        serviceService.finishService(id, dto.recordKm());
        return ResponseEntity.ok(Map.of("message", "Check-out ok"));
    }

    @PostMapping("/{id}/fuel")
    public ResponseEntity<?> registerFuel(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        serviceService.registerFuel(id,
                Double.valueOf(payload.get("amount").toString()),
                Double.valueOf(payload.get("totalValue").toString()),
                (String) payload.get("date"));
        return ResponseEntity.ok(Map.of("message", "Abastecimento ok"));
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActive() {
        String registration = SecurityContextHolder.getContext().getAuthentication().getName();
        var service = serviceService.findActiveServiceByUser(registration);
        if (service != null) {
            return ResponseEntity.ok(Map.of(
                    "active", true, "serviceId", service.getId(),
                    "carPrefix", service.getCar().getPrefix(),
                    "departureTime", service.getDepartureTime(),
                    "model", service.getCar().getType().getModel(),
                    "licensePlate", service.getCar().getLicensePlate(),
                    "departureKm", service.getDepartureKm(),
                    "description", Optional.ofNullable(service.getDescription()).orElse("")
            ));
        }
        return ResponseEntity.ok(Map.of("active", false));
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingServices() {
        return ResponseEntity.ok(serviceService.getPendingServicesDTOs());
    }

    @PostMapping("/create-pending")
    public ResponseEntity<?> createPendingService(@RequestBody PendingServiceRequestDTO dto) {
        var service = serviceService.createPendingService(dto);
        return ResponseEntity.ok(Map.of("serviceId", service.getId(), "message", "Chamado pendente criado com sucesso"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteService(@PathVariable Long id) {
        serviceService.deleteService(id);
        return ResponseEntity.ok(Map.of("message", "Chamado deletado com sucesso"));
    }

    /**
     * REGISTRAR OCORRÊNCIA (Defeito durante o serviço)
     * Cria um Incident vinculado ao serviço sem cancelá-lo.
     */
    @PostMapping("/{id}/incident")
    public ResponseEntity<?> registerIncident(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String description = (String) payload.getOrDefault("description", "");
        String incidentType = (String) payload.getOrDefault("incidentType", "DEFECT");
        String severity = (String) payload.getOrDefault("severity", "MEDIUM");
        Boolean requestSupport = (Boolean) payload.getOrDefault("requestSupport", false);

        var incident = serviceService.registerIncident(id, description, incidentType, severity, requestSupport);
        return ResponseEntity.ok(Map.of("message", "Ocorrência registrada com sucesso", "incidentId", incident.getId()));
    }

    /**
     * CANCELAR SERVIÇO (Pós check-in)
     * Registra uma ocorrência do tipo CANCELLATION e encerra o serviço, liberando o veículo.
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelService(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String motivo = (String) payload.getOrDefault("description", "Cancelamento sem motivo informado");
        serviceService.cancelService(id, motivo);
        return ResponseEntity.ok(Map.of("message", "Serviço cancelado com sucesso"));
    }
}