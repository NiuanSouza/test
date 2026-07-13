package com.ipem.api.modules.service.controller;

import com.ipem.api.modules.service.dto.CheckInOutRequestDTO;
import com.ipem.api.modules.service.service.ServiceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import com.ipem.api.modules.service.dto.PendingServiceRequestDTO;
import com.ipem.api.modules.service.repository.ServiceAddressesRepository;
import com.ipem.api.modules.service.model.enums.RecordType;

@RestController
@RequestMapping("/service")
@CrossOrigin(origins = "*")
public class ServiceController {

    private final ServiceService serviceService;
    private final ServiceAddressesRepository serviceAddressesRepository;

    public ServiceController(ServiceService serviceService, ServiceAddressesRepository serviceAddressesRepository) {
        this.serviceService = serviceService;
        this.serviceAddressesRepository = serviceAddressesRepository;
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
    public ResponseEntity<?> registerFuel(@PathVariable Long id, @RequestBody com.ipem.api.modules.service.dto.RefuelingRequestDTO dto) {
        serviceService.registerFuel(id, dto);
        return ResponseEntity.ok(Map.of("message", "Abastecimento ok"));
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActive() {
        String registration = SecurityContextHolder.getContext().getAuthentication().getName();
        var service = serviceService.findActiveServiceByUser(registration);
        if (service != null) {
            var address = serviceAddressesRepository.findByServiceId(service.getId()).stream().findFirst().orElse(null);
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("active", true);
            response.put("serviceId", service.getId());
            response.put("carPrefix", service.getCar().getPrefix());
            response.put("departureTime", service.getDepartureTime());
            response.put("model", service.getCar().getType().getModel());
            response.put("licensePlate", service.getCar().getLicensePlate());
            response.put("departureKm", service.getDepartureKm());
            response.put("description", Optional.ofNullable(service.getDescription()).orElse(""));
            response.put("latitude", address != null ? address.getLatitude() : null);
            response.put("longitude", address != null ? address.getLongitude() : null);
            response.put("destinationRequester", service.getDestinationRequester() != null ? service.getDestinationRequester() : "");
            return ResponseEntity.ok(response);
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

    @PatchMapping("/update-details/{id}")
    public ResponseEntity<?> updateServiceDetails(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        var updated = serviceService.updateServiceDetails(id, payload);
        return ResponseEntity.ok(Map.of("message", "Chamado atualizado com sucesso", "serviceId", updated.getId()));
    }

    @PatchMapping("/toggle-active/{id}")
    public ResponseEntity<?> toggleActiveService(@PathVariable Long id) {
        var service = serviceService.toggleServiceActive(id);
        return ResponseEntity.ok(Map.of("message", "Status do chamado alterado com sucesso", "isActive", service.getIsActive()));
    }

    @PatchMapping("/refueling/update/{recordId}")
    public ResponseEntity<?> updateRefueling(@PathVariable Long recordId, @RequestBody Map<String, Object> payload) {
        var updated = serviceService.updateRefueling(recordId, payload);
        return ResponseEntity.ok(Map.of("message", "Abastecimento atualizado com sucesso"));
    }

    @PatchMapping("/refueling/toggle-active/{recordId}")
    public ResponseEntity<?> toggleActiveRefueling(@PathVariable Long recordId) {
        var refueling = serviceService.toggleRefuelingActive(recordId);
        return ResponseEntity.ok(Map.of("message", "Status do abastecimento alterado com sucesso", "isActive", refueling.getIsActive()));
    }

    @PostMapping("/{id}/event")
    public ResponseEntity<?> registerEvent(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String typeStr = payload.get("type");
        String note = payload.getOrDefault("note", "");
        RecordType type = RecordType.valueOf(typeStr);
        serviceService.recordServiceEvent(id, type, note);
        return ResponseEntity.ok(Map.of("message", "Evento registrado com sucesso"));
    }
}