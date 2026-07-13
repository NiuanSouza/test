package com.ipem.api.modules.vehicle.controller;

import com.ipem.api.modules.vehicle.dto.CarUpdateDTO;
import com.ipem.api.modules.vehicle.dto.VehicleKmResponseDTO;
import com.ipem.api.modules.vehicle.model.Car;
// import com.ipem.api.modules.vehicle.dto.CarRequestDTO; // Descomente se for usar o DTO
import com.ipem.api.modules.vehicle.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller responsável EXCLUSIVAMENTE pelo gerenciamento da Frota Física (Carros).
 * Operações de uso/serviço foram transferidas para o ServiceController.
 */
@RestController
@RequestMapping("/vehicle")
@CrossOrigin(origins = "*")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    // ===================================================================================
    // BUSCAS (GET)
    // ===================================================================================

    @GetMapping
    public ResponseEntity<?> listAllCars() {
        try {
            return ResponseEntity.ok(vehicleService.findAllCars());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/types/active")
    public ResponseEntity<?> listActiveCarTypes() {
        try {
            return ResponseEntity.ok(vehicleService.findAllActiveTypes());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/types")
    public ResponseEntity<?> listAllCarTypes() {
        try {
            return ResponseEntity.ok(vehicleService.findAllTypes());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{prefix}/last-final-km")
    public ResponseEntity<?> getLastFinalKm(@PathVariable String prefix) {
        try {
            Float lastKm = vehicleService.findLastFinalKmByPrefix(prefix.trim());
            return ResponseEntity.ok(new VehicleKmResponseDTO(lastKm));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===================================================================================
    // CADASTROS E ATUALIZAÇÕES (POST / PATCH)
    // ===================================================================================

    @PostMapping("/register")
    public ResponseEntity<?> registerCar(@RequestBody @Valid Car car) {
        try {
            var newCar = vehicleService.register(car);
            return ResponseEntity.ok(Map.of(
                    "message", "Veículo cadastrado com sucesso!",
                    "prefix", newCar.getPrefix()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{prefix}/update-data")
    public ResponseEntity<?> updateData(@PathVariable String prefix, @RequestBody @Valid CarUpdateDTO data) {
        try {
            vehicleService.updateKmAndObs(prefix.trim(), data.mileage(), data.observations());
            return ResponseEntity.ok(Map.of("message", "Dados do veículo atualizados com sucesso!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/update/{prefix}")
    public ResponseEntity<?> updateCarFields(@PathVariable String prefix, @RequestBody Map<String, Object> updates) {
        try {
            Car updatedCar = vehicleService.updateCarFields(prefix.trim(), updates);
            return ResponseEntity.ok(updatedCar);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/type")
    public ResponseEntity<?> registerCarType(@RequestBody @Valid com.ipem.api.modules.vehicle.model.CarType type) {
        try {
            var newType = vehicleService.createCarType(type);
            return ResponseEntity.ok(newType);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/type/update/{id}")
    public ResponseEntity<?> updateCarType(@PathVariable Integer id, @RequestBody Map<String, Object> updates) {
        try {
            var updatedType = vehicleService.updateCarType(id, updates);
            return ResponseEntity.ok(updatedType);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/type/{id}/active-cars")
    public ResponseEntity<?> getActiveCarsByType(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(vehicleService.getActiveCarsByType(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/type/{id}/inactivate-cascade")
    public ResponseEntity<?> inactivateTypeCascade(@PathVariable Integer id) {
        try {
            vehicleService.inactivateTypeAndCars(id);
            return ResponseEntity.ok(Map.of("message", "Tipo e veículos inativados com sucesso!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}