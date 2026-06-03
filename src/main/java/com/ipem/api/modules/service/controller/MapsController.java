package com.ipem.api.modules.service.controller;

import com.ipem.api.modules.service.service.MapsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/maps")
@CrossOrigin(origins = "*")
public class MapsController {

    private final MapsService mapsService;

    public MapsController(MapsService mapsService) {
        this.mapsService = mapsService;
    }

    /**
     * Lista os chamados recentes para a tela inicial do gestor.
     */
    @GetMapping("/recent-services")
    public ResponseEntity<?> getRecentServices() {
        return ResponseEntity.ok(mapsService.getRecentServices());
    }

    /**
     * Lista completa do histórico de chamados.
     */
    @GetMapping("/all-services")
    public ResponseEntity<?> getAllServices() {
        return ResponseEntity.ok(mapsService.getAllServices());
    }
}