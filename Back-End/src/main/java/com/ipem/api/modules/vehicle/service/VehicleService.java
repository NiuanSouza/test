package com.ipem.api.modules.vehicle.service;

import com.ipem.api.modules.service.model.Service;
import com.ipem.api.modules.service.model.Record;
import com.ipem.api.modules.service.model.Refueling;
import com.ipem.api.modules.service.model.enums.RecordType;
import com.ipem.api.modules.service.repository.RefuelingRepository;
import com.ipem.api.modules.service.repository.ServiceRepository;
import com.ipem.api.modules.vehicle.model.Car;
import com.ipem.api.modules.vehicle.model.CarType;
import com.ipem.api.modules.vehicle.repository.CarRepository;
import com.ipem.api.modules.vehicle.repository.CarTypeRepository;
import com.ipem.api.modules.vehicle.model.enums.VehicleStatus;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@org.springframework.stereotype.Service
public class VehicleService {

    private final CarRepository carRepository;
    private final CarTypeRepository carTypeRepository;
    private final RefuelingRepository refuelingRepository;
    private final ServiceRepository serviceRepository;

    public VehicleService(CarRepository carRepository,
                          CarTypeRepository carTypeRepository,
                          RefuelingRepository refuelingRepository,
                          ServiceRepository serviceRepository) {
        this.carRepository = carRepository;
        this.carTypeRepository = carTypeRepository;
        this.refuelingRepository = refuelingRepository;
        this.serviceRepository = serviceRepository;
    }

    @Transactional(readOnly = true)
    public Float findLastFinalKmByPrefix(String prefix) {
        Car car = carRepository.findById(prefix)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado com o prefixo: " + prefix));

        Float lastKm = serviceRepository.findLastFinalKmByCarPrefix(car.getPrefix());

        return (lastKm != null) ? lastKm : car.getCurrentKm();
    }

    @Transactional
    public void updateKmAndObs(String prefix, Float km, String obs) {
        Car car = carRepository.findById(prefix)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado com o prefixo: " + prefix));

        car.setCurrentKm(km);
        car.setObservations(obs);
        carRepository.save(car);
    }

    @Transactional
    public Car register(Car car) {
        if (car.getType() != null) {
            if (car.getType().getId() == null) {
                carTypeRepository.save(car.getType());
            } else {
                CarType existingType = carTypeRepository.findById(car.getType().getId())
                        .orElseThrow(() -> new RuntimeException("Tipo de veículo inválido"));
                car.setType(existingType);
            }
        }
        car.setAvailable(true);
        car.setCurrentKm(0.0f);
        car.setIsActive(true);
        return carRepository.save(car);
    }

    @Transactional
    public void registerFuel(String prefix, Double value, String dateStr) {
        Car car = carRepository.findById(prefix)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado"));

        Service currentService = serviceRepository.findFirstByCarAndCompletionTimeIsNullAndIsActiveTrueOrderByCreatedAtDesc(car)
                .orElseThrow(() -> new RuntimeException("Não há serviço em aberto para realizar o abastecimento"));

        Record record = new Record();
        record.setService(currentService);
        record.setRecordType(RecordType.REFUELING);
        record.setRecordDate(LocalDateTime.now());
        record.setRecordKm(car.getCurrentKm());
        record.setIsActive(true);

        Refueling refueling = new Refueling();
        refueling.setRecord(record);
        refueling.setTotalAmount(value);
        refueling.setIsActive(true);

        refuelingRepository.save(refueling);
    }

    public Map<String, Object> getCurrentService() {
        Map<String, Object> chamado = new HashMap<>();
        chamado.put("id", 1);
        chamado.put("description", "Atendimento em rota - Fiscalização");
        chamado.put("status", "EM_ANDAMENTO");
        return chamado;
    }

    @Transactional
    public void deleteCar(String prefix) {
        Car car = carRepository.findById(prefix)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado"));
        car.setIsActive(false);
        carRepository.save(car);
    }

    public List<CarType> findAllActiveTypes() {
        try {
            return carTypeRepository.findByIsActiveTrue();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao buscar tipos ativos de veículos: " + e.getMessage());
        }
    }

    public List<CarType> findAllTypes() {
        try {
            return carTypeRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao buscar tipos de veículos: " + e.getMessage());
        }
    }

    public List<Car> findAllCars() {
        try {
            return carRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao buscar veículos: " + e.getMessage());
        }
    }

    @Transactional
    public Car updateCarFields(String prefix, Map<String, Object> updates) {
        Car car = carRepository.findById(prefix)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado com o prefixo: " + prefix));

        updates.forEach((key, value) -> {
            if (value == null) return;
            switch (key) {
                case "licensePlate":
                    car.setLicensePlate((String) value);
                    break;
                case "color":
                    car.setColor((String) value);
                    break;
                case "observations":
                    car.setObservations((String) value);
                    break;
                case "fuel":
                    car.setFuel((String) value);
                    break;
                case "tankCapacity":
                    car.setTankCapacity(Float.valueOf(value.toString()));
                    break;
                case "renavam":
                    car.setRenavam((String) value);
                    break;
                case "chassi":
                    car.setChassi((String) value);
                    break;
                case "requiredLicense":
                    car.setRequiredLicense((String) value);
                    break;
                case "isActive":
                    boolean isActive = (Boolean) value;
                    if (!isActive && car.getVehicleStatus() == VehicleStatus.IN_USE) {
                        throw new RuntimeException("Não é possível inativar um veículo em uso.");
                    }
                    car.setIsActive(isActive);
                    break;
                case "type":
                    Map<String, Object> typeUpdates = (Map<String, Object>) value;
                    CarType type = car.getType();
                    if (type != null) {
                        if (typeUpdates.containsKey("brand")) type.setBrand((String) typeUpdates.get("brand"));
                        if (typeUpdates.containsKey("model")) type.setModel((String) typeUpdates.get("model"));
                        if (typeUpdates.containsKey("year")) type.setYear(Integer.valueOf(typeUpdates.get("year").toString()));
                        if (typeUpdates.containsKey("category")) type.setCategory((String) typeUpdates.get("category"));
                        carTypeRepository.save(type);
                    }
                    break;
            }
        });

        return carRepository.save(car);
    }

    @Transactional
    public CarType createCarType(CarType type) {
        type.setIsActive(true);
        return carTypeRepository.save(type);
    }

    @Transactional
    public CarType updateCarType(Integer id, Map<String, Object> updates) {
        CarType type = carTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tipo de veículo não encontrado com ID: " + id));

        updates.forEach((key, value) -> {
            if (value == null) return;
            switch (key) {
                case "brand":
                    type.setBrand((String) value);
                    break;
                case "model":
                    type.setModel((String) value);
                    break;
                case "year":
                    type.setYear(Integer.valueOf(value.toString()));
                    break;
                case "category":
                    type.setCategory((String) value);
                    break;
                case "isActive":
                    type.setIsActive((Boolean) value);
                    break;
            }
        });

        return carTypeRepository.save(type);
    }

    public List<Car> getActiveCarsByType(Integer typeId) {
        return carRepository.findByTypeIdAndIsActiveTrue(typeId);
    }

    @Transactional
    public void inactivateTypeAndCars(Integer typeId) {
        CarType type = carTypeRepository.findById(typeId)
                .orElseThrow(() -> new RuntimeException("Tipo de veículo não encontrado"));
        
        type.setIsActive(false);
        carTypeRepository.save(type);

        List<Car> cars = carRepository.findByTypeIdAndIsActiveTrue(typeId);
        for (Car car : cars) {
            if (car.getVehicleStatus() == VehicleStatus.IN_USE) {
                throw new RuntimeException("Não é possível inativar o tipo. O veículo " + car.getLicensePlate() + " está em uso.");
            }
            car.setIsActive(false);
            carRepository.save(car);
        }
    }
}