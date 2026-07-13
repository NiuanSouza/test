package com.ipem.api.modules.service.service;

import com.ipem.api.modules.service.dto.CheckInOutRequestDTO;
import com.ipem.api.modules.service.dto.ServiceReportEntryDTO;
import com.ipem.api.modules.service.dto.ServiceReportMonthDTO;
import com.ipem.api.modules.service.model.Service;
import com.ipem.api.modules.service.model.Record;
import com.ipem.api.modules.service.model.Refueling;
import com.ipem.api.modules.service.model.enums.Priority;
import com.ipem.api.modules.service.model.enums.RecordType;
import com.ipem.api.modules.service.repository.RecordRepository;
import com.ipem.api.modules.service.repository.RefuelingRepository;
import com.ipem.api.modules.service.repository.ServiceRepository;
import com.ipem.api.modules.user.repository.UserRepository;
import com.ipem.api.modules.vehicle.model.enums.VehicleStatus;
import com.ipem.api.modules.vehicle.repository.CarRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionType;
import org.hibernate.envers.query.AuditEntity;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Camada de serviço (Regra de Negócio) para a gestão de Chamados da Frota.
 * Responsável por controlar check-ins, check-outs, abastecimentos,
 * geração de relatórios mensais e auditoria do histórico (Envers).
 */
import com.ipem.api.modules.service.dto.PendingServiceRequestDTO;
import com.ipem.api.modules.service.dto.PendingServiceResponseDTO;
import com.ipem.api.modules.service.model.ServiceAddresses;
import com.ipem.api.modules.service.repository.ServiceAddressesRepository;

@org.springframework.stereotype.Service
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final ServiceAddressesRepository serviceAddressesRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final RecordRepository recordRepository;
    private final RefuelingRepository refuelingRepository;
    private final com.ipem.api.modules.service.repository.IncidentRepository incidentRepository;
    private final EntityManager entityManager;

    /**
     * Injeção de dependências via construtor (Melhor prática do Spring, garante imutabilidade).
     */
    public ServiceService(ServiceRepository serviceRepository, 
                          ServiceAddressesRepository serviceAddressesRepository,
                          CarRepository carRepository, 
                          UserRepository userRepository, 
                          RecordRepository recordRepository,
                          RefuelingRepository refuelingRepository, 
                          com.ipem.api.modules.service.repository.IncidentRepository incidentRepository,
                          EntityManager entityManager) {
        this.serviceRepository = serviceRepository;
        this.serviceAddressesRepository = serviceAddressesRepository;
        this.carRepository = carRepository;
        this.userRepository = userRepository;
        this.recordRepository = recordRepository;
        this.refuelingRepository = refuelingRepository;
        this.incidentRepository = incidentRepository;
        this.entityManager = entityManager;
    }

    /**
     * INICIAR SERVIÇO (Check-in)
     * Registra a saída de um veículo.
     * @param dto DTO contendo os dados iniciais informados pelo técnico.
     * @return O serviço criado e persistido no banco.
     */
    @Transactional
    public Service startService(CheckInOutRequestDTO dto) {
        // Valida se o carro e o usuário existem no banco de dados
        var car = carRepository.findById(dto.carPrefix())
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado."));
        var user = userRepository.findById(dto.userRegistration())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));

        car.setVehicleStatus(VehicleStatus.IN_USE);
        car.setAvailable(false);
        carRepository.save(car); // Guardamos a alteração usando o repositório que já existe

        Service newService;

        // Se o front-end mandou um serviceId, significa que o técnico aceitou um chamado já existente!
        if (dto.serviceId() != null) {
            newService = serviceRepository.findById(dto.serviceId())
                    .orElseThrow(() -> new RuntimeException("Chamado pendente não encontrado."));
            newService.setCar(car);
            newService.setUser(user);
            newService.setDepartureTime(LocalDateTime.now()); // Carimba a hora atual de saída
            newService.setDepartureKm(dto.recordKm());

            // Concatena a observação do técnico com a descrição original do gestor
            if (dto.note() != null && !dto.note().isBlank()) {
                String descAtual = newService.getDescription() != null ? newService.getDescription() : "";
                newService.setDescription(descAtual + "\n[Obs Técnico]: " + dto.note());
            }
        } else {
            // Se não mandou, é um chamado "avulso" criado na hora pelo próprio técnico
            // Monta a nova entidade usando o padrão Builder
            newService = Service.builder()
                    .car(car)
                    .user(user)
                    .departureTime(LocalDateTime.now()) // Carimba a hora atual de saída
                    .departureKm(dto.recordKm())
                    .description(dto.note())
                    .priority(dto.priority() != null ? dto.priority() : Priority.MEDIUM)
                    .build();
        }

        newService.setIsActive(true); // Marca o serviço como "Em Andamento"
        return serviceRepository.save(newService);
    }

    /**
     * FINALIZAR SERVIÇO (Check-out)
     * Registra o retorno de um veículo e o libera no sistema.
     * @param serviceId ID do chamado a ser encerrado.
     * @param kmFinal Quilometragem de chegada.
     * @return O serviço atualizado e encerrado.
     */
    @Transactional
    public Service finishService(Long serviceId, Float kmFinal) {
        // Recupera o serviço ativo
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado."));

        // Preenche os dados de conclusão
        service.setArrivalTime(LocalDateTime.now());
        service.setCompletionTime(LocalDateTime.now());
        service.setArrivalKm(kmFinal);
        service.setIsActive(false); // Remove o status de "Em andamento"

        // Atualiza a viatura: Registra a nova KM e libera o status dela
        var car = service.getCar();
        car.setCurrentKm(kmFinal);
        car.setVehicleStatus(VehicleStatus.AVAILABLE);
        carRepository.save(car);

        return serviceRepository.save(service);
    }

    /**
     * REGISTRO DE ABASTECIMENTO VINCULADO AO SERVIÇO
     * Cria um registro duplo: Um "Record" genérico na linha do tempo do serviço
     * e uma entidade "Refueling" contendo os dados financeiros.
     */
    @Transactional
    public void registerFuel(Long serviceId, com.ipem.api.modules.service.dto.RefuelingRequestDTO dto) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Serviço ativo não encontrado."));

        if (!Boolean.TRUE.equals(service.getIsActive())) {
            throw new RuntimeException("Este serviço já foi encerrado.");
        }

        // Converte a data enviada pelo Frontend ou usa a data atual como fallback
        LocalDateTime fuelDate = dto.date() != null ? LocalDateTime.parse(dto.date()) : LocalDateTime.now();

        // Usa a KM informada pelo técnico no formulário, com fallback para a KM do carro no banco
        Float km = dto.recordKm() != null ? dto.recordKm()
                : (service.getCar() != null ? service.getCar().getCurrentKm() : null);

        if (km == null || km <= 0) {
            throw new IllegalArgumentException("A valid kilometer reading is required.");
        }

        if (dto.liters() == null || dto.liters() <= 0) {
            throw new IllegalArgumentException("A quantidade de litros deve ser maior que zero.");
        }

        Double totalAmount = dto.totalAmount() != null ? dto.totalAmount()
                : (double) (dto.liters() * (dto.pricePerLiter() != null ? dto.pricePerLiter() : 0.0));
        if (totalAmount <= 0) {
            throw new IllegalArgumentException("O valor total deve ser maior que zero.");
        }

        // 1. Cria o evento genérico na linha do tempo do serviço
        Record record = new Record();
        record.setService(service);
        record.setRecordType(RecordType.REFUELING);
        record.setRecordDate(fuelDate);
        record.setRecordKm(km);
        record.setNote("Abastecimento em serviço");
        record = recordRepository.save(record);

        // 2. Cria o registro financeiro e volumétrico do abastecimento
        Refueling fuel = new Refueling();
        fuel.setRecord(record);
        fuel.setLiters(dto.liters());
        fuel.setInvoice(dto.invoice());
        fuel.setGasStationName(dto.gasStationName());

        if (dto.fuelType() != null && !dto.fuelType().isBlank()) {
            fuel.setFuelType(com.ipem.api.modules.service.model.enums.FuelType.valueOf(dto.fuelType()));
        }

        // Usa o valor total já validado acima
        fuel.setTotalAmount(totalAmount);

        if (dto.pricePerLiter() != null) {
            fuel.setPricePerLiter(dto.pricePerLiter());
        } else if (dto.liters() != null && dto.liters() > 0 && fuel.getTotalAmount() != null) {
            fuel.setPricePerLiter(fuel.getTotalAmount() / dto.liters());
        }

        refuelingRepository.save(fuel);
    }

    /**
     * GERAÇÃO DE RELATÓRIOS MENSAIS
     * Vasculha o banco retroativamente para agrupar os chamados mês a mês.
     * @param months Quantos meses para trás devem ser gerados.
     * @return Lista de relatórios formatados para a tabela do Frontend.
     */
    public List<ServiceReportMonthDTO> getMonthlyServiceReports(int months) {
        var formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        var monthNameFormatter = DateTimeFormatter.ofPattern("MMMM", new Locale("pt", "BR"));
        var reports = new ArrayList<ServiceReportMonthDTO>();

        // Loop que anda de trás para frente (Ex: de 6 meses atrás até o mês 0 [atual])
        for (int offset = months - 1; offset >= 0; offset--) {
            YearMonth yearMonth = YearMonth.now().minusMonths(offset);

            // Define a janela de tempo: Dia 1 às 00:00 até o último dia do mês
            var start = yearMonth.atDay(1).atStartOfDay();
            var end = yearMonth.atEndOfMonth().plusDays(1).atStartOfDay();

            // Busca os chamados que ocorreram nesta janela de tempo
            List<Service> services = serviceRepository.findByDepartureTimeBetweenAndIsActiveTrue(start, end);

            // Cálculos de KPIs daquele mês
            int totalCalls = services.size();
            int completedCalls = (int) services.stream().filter(s -> s.getCompletionTime() != null).count();
            int openCalls = totalCalls - completedCalls;

            // Transforma "maio" em "Maio"
            String monthLabel = yearMonth.format(monthNameFormatter);
            monthLabel = monthLabel.substring(0, 1).toUpperCase() + monthLabel.substring(1);

            boolean isCurrentMonth = yearMonth.equals(YearMonth.now());

            // Gera um texto de status amigável sobre o fechamento do mês
            String status = isCurrentMonth
                    ? openCalls > 0 ? String.format("O mês de %s ainda não foi fechado", monthLabel) : String.format("O mês de %s foi fechado", monthLabel)
                    : openCalls > 0 ? String.format("Mês de %s com %d chamados em aberto", monthLabel, openCalls) : String.format("Mês de %s fechado", monthLabel);

            // Converte a lista de Entidades do banco para a lista de DTOs do Frontend
            var entries = new ArrayList<ServiceReportEntryDTO>();
            for (var service : services) {
                entries.add(new ServiceReportEntryDTO(
                        service.getId(),
                        service.getCar() != null ? service.getCar().getPrefix() : "",
                        service.getUser() != null ? service.getUser().getRegistration() : "",
                        service.getUser() != null ? service.getUser().getName() : "",
                        service.getDescription(),
                        service.getDepartureTime() != null ? formatter.format(service.getDepartureTime()) : "",
                        service.getArrivalTime() != null ? formatter.format(service.getArrivalTime()) : "",
                        service.getCompletionTime() != null ? formatter.format(service.getCompletionTime()) : "",
                        service.getCompletionTime() != null ? "Finalizado" : "Em andamento",
                        service.getDepartureKm(),
                        service.getArrivalKm(),
                        service.getDestinationRequester(),
                        "-"
                ));
            }
            // Adiciona o mês processado à lista final
            reports.add(new ServiceReportMonthDTO(monthLabel, yearMonth.getYear(), totalCalls, completedCalls, openCalls, isCurrentMonth, status, entries));
        }
        return reports;
    }

    /**
     * HISTÓRICO DE AUDITORIA (Envers)
     * Busca os últimos registros criados/alterados na tabela 'service_aud'.
     * @return Lista de mapas contendo os dados da auditoria (data, tipo, entidade).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getServiceAuditHistory() {
        AuditReader auditReader = AuditReaderFactory.get(entityManager);

        // Cria a query para buscar as revisões da entidade Service
        List<?> revisions = auditReader.createQuery()
                .forRevisionsOfEntity(Service.class, false, true)
                .addOrder(AuditEntity.revisionNumber().desc()) // Ordem Decrescente (Mais recentes no topo)
                .setMaxResults(100) // Limite de performance
                .getResultList();

        List<Map<String, Object>> historyList = new ArrayList<>();

        for (Object item : revisions) {
            Object[] revision = (Object[]) item;

            // Posição 0: A entidade com os dados naquele momento do tempo
            Service entity = (Service) revision[0];
            // Posição 1: O objeto de revisão (contém data e hora da alteração)
            DefaultRevisionEntity revisionEntity = (DefaultRevisionEntity) revision[1];
            // Posição 2: O tipo de revisão (ADD, MOD, DEL)
            RevisionType revisionType = (RevisionType) revision[2];

            Map<String, Object> dto = new HashMap<>();
            Map<String, Object> entityData = new HashMap<>();

            // Preenchimento manual de dados para evitar problemas de proxy do Hibernate
            entityData.put("id", entity.getId());
            entityData.put("departureTime", entity.getDepartureTime());
            entityData.put("completionTime", entity.getCompletionTime());
            entityData.put("destinationRequester", entity.getDestinationRequester());
            entityData.put("description", entity.getDescription());

            if (entity.getPriority() != null) {
                entityData.put("priority", entity.getPriority().name());
            }

            if (entity.getCar() != null) {
                entityData.put("car", Map.of("prefix", entity.getCar().getPrefix()));
            }

            if (entity.getUser() != null) {
                entityData.put("user", Map.of(
                        "registration", entity.getUser().getRegistration(),
                        "name", entity.getUser().getName()
                ));
            }

            // Anexa os metadados da auditoria junto com os dados da entidade
            dto.put("entity", entityData);
            dto.put("revisionType", revisionType.name());
            dto.put("revisionDate", revisionEntity.getRevisionDate());

            historyList.add(dto);
        }
        return historyList;
    }

    /**
     * BUSCA DE SERVIÇO ATIVO DO USUÁRIO
     * Usado na inicialização do Frontend para restaurar a tela do técnico
     * caso ele tenha um serviço não finalizado.
     */
    public Service findActiveServiceByUser(String registration) {
        return serviceRepository.findByUserRegistrationAndIsActiveTrue(registration).orElse(null);
    }

    public List<Service> getPendingServices() {
        return serviceRepository.findByDepartureTimeIsNullAndIsActiveTrue();
    }

    @Transactional
    public Service createPendingService(PendingServiceRequestDTO dto) {
        com.ipem.api.modules.user.model.User assignedUser = null;
        if (dto.tecnico() != null && !dto.tecnico().isBlank() && !dto.tecnico().equalsIgnoreCase("Não Atribuído")) {
            assignedUser = userRepository.findById(dto.tecnico()).orElse(null);
        }

        Service service = Service.builder()
                .destinationRequester(dto.endereco())
                .description(dto.observacoes() != null ? dto.observacoes() : dto.tipoServico())
                .serviceType(dto.tipoServico())
                .cnhType(dto.tipoCNH())
                .user(assignedUser)
                .isActive(true)
                .build();
        
        service = serviceRepository.save(service);

        ServiceAddresses address = ServiceAddresses.builder()
                .service(service)
                .street(dto.endereco() != null ? dto.endereco() : "Não informado")
                .zipCode(dto.cep())
                .latitude(dto.latitude())
                .longitude(dto.longitude())
                .city("São Paulo") // default
                .state("SP") // default
                .build();
        
        serviceAddressesRepository.save(address);
        return service;
    }

    public List<PendingServiceResponseDTO> getPendingServicesDTOs() {
        List<Service> services = getPendingServices();
        return services.stream().map(service -> {
            ServiceAddresses address = serviceAddressesRepository.findByServiceId(service.getId()).stream().findFirst().orElse(null);
            String tecnicoName = service.getUser() != null ? service.getUser().getName() : "Não atribuído";
            return new PendingServiceResponseDTO(
                    service.getId(),
                    address != null ? address.getStreet() : service.getDestinationRequester(),
                    address != null ? address.getZipCode() : "",
                    service.getServiceType() != null ? service.getServiceType() : "Não informado",
                    service.getCnhType() != null ? service.getCnhType() : "Nenhuma",
                    tecnicoName,
                    address != null ? address.getLatitude() : null,
                    address != null ? address.getLongitude() : null,
                    service.getDescription(),
                    "pendente",
                    service.getCreatedAt()
            );
        }).toList();
    }

    @Transactional
    public void deleteService(Long id) {
        serviceAddressesRepository.findByServiceId(id).forEach(serviceAddressesRepository::delete);
        serviceRepository.deleteById(id);
    }

    // ===================================================================
    // OCORRÊNCIAS / INCIDENTES
    // ===================================================================


    /**
     * REGISTRAR OCORRÊNCIA (Defeito ou outro incidente durante o serviço)
     * Cria um Incident vinculado ao serviço ativo sem cancelá-lo.
     */
    @Transactional
    public com.ipem.api.modules.service.model.Incident registerIncident(
            Long serviceId, String description, String incidentType, String severity, Boolean requestSupport) {

        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado."));

        com.ipem.api.modules.service.model.Incident incident = com.ipem.api.modules.service.model.Incident.builder()
                .service(service)
                .incidentType(com.ipem.api.modules.service.model.enums.IncidentType.valueOf(incidentType))
                .severity(com.ipem.api.modules.service.model.enums.Severity.valueOf(severity))
                .description(description)
                .requestSupport(requestSupport)
                .isActive(true)
                .resolved(false)
                .build();

        // Registra também na linha do tempo do serviço (Record)
        Record record = new Record();
        record.setService(service);
        record.setRecordType(RecordType.INCIDENT);
        record.setRecordDate(LocalDateTime.now());
        record.setRecordKm(service.getCar() != null ? service.getCar().getCurrentKm() : 0f);
        record.setNote("Ocorrência: " + description);
        recordRepository.save(record);

        return incidentRepository.save(incident);
    }

    /**
     * CANCELAR SERVIÇO (Pós check-in)
     * Registra um incidente do tipo CANCELLATION, encerra o serviço e libera o veículo.
     */
    @Transactional
    public void cancelService(Long serviceId, String motivo) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado."));

        // 1. Registra a ocorrência de cancelamento
        registerIncident(serviceId, motivo, "CANCELLATION", "MEDIUM", false);

        // 2. Encerra o serviço
        service.setCompletionTime(LocalDateTime.now());
        service.setIsActive(false);
        serviceRepository.save(service);

        // 3. Libera o veículo
        if (service.getCar() != null) {
            var car = service.getCar();
            car.setVehicleStatus(VehicleStatus.AVAILABLE);
            car.setAvailable(true);
            carRepository.save(car);
        }
    }

    @Transactional
    public Service updateServiceDetails(Long serviceId, java.util.Map<String, Object> payload) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado."));

        if (payload.containsKey("destinationRequester")) service.setDestinationRequester((String) payload.get("destinationRequester"));
        if (payload.containsKey("description")) service.setDescription((String) payload.get("description"));
        if (payload.containsKey("serviceType")) service.setServiceType((String) payload.get("serviceType"));
        if (payload.containsKey("cnhType")) service.setCnhType((String) payload.get("cnhType"));
        if (payload.containsKey("priority")) service.setPriority(com.ipem.api.modules.service.model.enums.Priority.valueOf((String) payload.get("priority")));
        if (payload.containsKey("departureKm") && payload.get("departureKm") != null) service.setDepartureKm(Float.parseFloat(payload.get("departureKm").toString()));
        if (payload.containsKey("arrivalKm") && payload.get("arrivalKm") != null) service.setArrivalKm(Float.parseFloat(payload.get("arrivalKm").toString()));
        
        if (payload.containsKey("userRegistration")) {
            String userReg = (String) payload.get("userRegistration");
            var user = userRepository.findById(userReg).orElseThrow(() -> new RuntimeException("Usuário não encontrado."));
            service.setUser(user);
        }

        if (payload.containsKey("carPrefix")) {
            String prefix = (String) payload.get("carPrefix");
            var car = carRepository.findById(prefix).orElseThrow(() -> new RuntimeException("Veículo não encontrado."));
            service.setCar(car);
        }

        return serviceRepository.save(service);
    }

    @Transactional
    public Service toggleServiceActive(Long serviceId) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado."));
        service.setIsActive(!service.getIsActive());
        return serviceRepository.save(service);
    }

    @Transactional
    public Refueling updateRefueling(Long recordId, java.util.Map<String, Object> payload) {
        Refueling refueling = refuelingRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Abastecimento não encontrado."));

        if (payload.containsKey("liters")) refueling.setLiters(Float.parseFloat(payload.get("liters").toString()));
        if (payload.containsKey("pricePerLiter")) refueling.setPricePerLiter(Double.parseDouble(payload.get("pricePerLiter").toString()));
        if (payload.containsKey("totalAmount")) refueling.setTotalAmount(Double.parseDouble(payload.get("totalAmount").toString()));
        if (payload.containsKey("gasStationName")) refueling.setGasStationName((String) payload.get("gasStationName"));
        if (payload.containsKey("invoice")) refueling.setInvoice((String) payload.get("invoice"));
        if (payload.containsKey("fuelType")) refueling.setFuelType(com.ipem.api.modules.service.model.enums.FuelType.valueOf((String) payload.get("fuelType")));

        return refuelingRepository.save(refueling);
    }

    @Transactional
    public Refueling toggleRefuelingActive(Long recordId) {
        Refueling refueling = refuelingRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Abastecimento não encontrado."));
        refueling.setIsActive(!refueling.getIsActive());
        return refuelingRepository.save(refueling);
    }

    @Transactional
    public void recordServiceEvent(Long serviceId, RecordType recordType, String note) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado."));
        if (!Boolean.TRUE.equals(service.getIsActive())) {
            throw new RuntimeException("Este serviço já foi encerrado.");
        }
        Record record = new Record();
        record.setService(service);
        record.setRecordType(recordType);
        record.setRecordDate(LocalDateTime.now());
        record.setRecordKm(service.getCar() != null ? service.getCar().getCurrentKm() : 0f);
        record.setNote(note);
        recordRepository.save(record);
    }
}