package com.ipem.api.modules.service.service;

import com.ipem.api.modules.service.repository.RecordRepository;
import com.ipem.api.modules.service.repository.RefuelingRepository;
import com.ipem.api.modules.service.repository.ServiceAddressesRepository;
import com.ipem.api.modules.service.repository.ServiceRepository;
import com.ipem.api.modules.user.repository.UserRepository;
import com.ipem.api.modules.vehicle.repository.CarRepository;
import jakarta.persistence.EntityManager;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
public class MapsService {

    private final ServiceRepository serviceRepository;
    private final ServiceAddressesRepository serviceAddressesRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final RecordRepository recordRepository;
    private final RefuelingRepository refuelingRepository;
    private final EntityManager entityManager;

    public MapsService(ServiceRepository serviceRepository,
                       ServiceAddressesRepository serviceAddressesRepository,
                       CarRepository carRepository,
                       UserRepository userRepository,
                       RecordRepository recordRepository,
                       RefuelingRepository refuelingRepository,
                       EntityManager entityManager) {

        this.serviceRepository = serviceRepository;
        this.serviceAddressesRepository = serviceAddressesRepository;
        this.carRepository = carRepository;
        this.userRepository = userRepository;
        this.recordRepository = recordRepository;
        this.refuelingRepository = refuelingRepository;
        this.entityManager = entityManager;
    }

    /**
     * Retorna os chamados recentes para o dashboard do gestor.
     */
    public List<Map<String, Object>> getRecentServices() {

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        return serviceRepository.findTop10ByOrderByDepartureTimeDesc()
                .stream()
                .map(service -> buildServiceMap(service, formatter))
                .collect(Collectors.toList());
    }

    /**
     * Retorna o histórico completo dos chamados.
     */
    public List<Map<String, Object>> getAllServices() {

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        return serviceRepository.findAllByOrderByDepartureTimeDesc()
                .stream()
                .map(service -> buildServiceMap(service, formatter))
                .collect(Collectors.toList());
    }

    /**
     * Monta os dados utilizados nas telas do gestor.
     */
    private Map<String, Object> buildServiceMap(
            com.ipem.api.modules.service.model.Service service,
            DateTimeFormatter formatter) {

        Map<String, Object> map = new HashMap<>();

        map.put("id", service.getId());

        map.put("carPrefix",
                service.getCar() != null
                        ? service.getCar().getPrefix()
                        : "");

        map.put("licensePlate",
                service.getCar() != null
                        ? service.getCar().getLicensePlate()
                        : "");

        map.put("technicianName",
                service.getUser() != null
                        ? service.getUser().getName()
                        : "");

        map.put("technicianRegistration",
                service.getUser() != null
                        ? service.getUser().getRegistration()
                        : "");

        map.put("description",
                service.getDescription());

        map.put("priority",
                service.getPriority() != null
                        ? service.getPriority().name()
                        : "MEDIUM");

        map.put("departureKm",
                service.getDepartureKm());

        map.put("arrivalKm",
                service.getArrivalKm());

        map.put("departureTime",
                service.getDepartureTime() != null
                        ? formatter.format(service.getDepartureTime())
                        : "");

        map.put("completionTime",
                service.getCompletionTime() != null
                        ? formatter.format(service.getCompletionTime())
                        : "");

        map.put("status",
                service.getCompletionTime() != null
                        ? "FINALIZADO"
                        : "EM_ANDAMENTO");

        map.put("destinationRequester",
                service.getDestinationRequester());

        return map;
    }
}