package com.ipem.api.modules.service.service;

import com.ipem.api.modules.service.dto.DashboardMetricsDTO;
import com.ipem.api.modules.service.dto.ServiceReportEntryDTO;
import com.ipem.api.modules.service.dto.ServiceReportMonthDTO;
import com.ipem.api.modules.service.model.Incident;
import com.ipem.api.modules.service.model.Record;
import com.ipem.api.modules.service.model.Refueling;
import com.ipem.api.modules.service.repository.IncidentRepository;
import com.ipem.api.modules.service.repository.RecordRepository;
import com.ipem.api.modules.service.repository.RefuelingRepository;
import com.ipem.api.modules.service.repository.ServiceRepository;
import com.ipem.api.modules.user.model.enums.EmployeeStatus;
import com.ipem.api.modules.user.repository.UserRepository;
import com.ipem.api.modules.vehicle.model.enums.VehicleStatus;
import com.ipem.api.modules.vehicle.repository.CarRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionType;
import org.hibernate.envers.query.AuditEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Serviço de Inteligência e Analítica.
 * Centraliza métricas, relatórios gerenciais e histórico de auditoria.
 */
@Service
public class DashboardService {

    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final RefuelingRepository refuelingRepository;
    private final ServiceRepository serviceRepository;
    private final RecordRepository recordRepository;
    private final IncidentRepository incidentRepository;
    private final EntityManager entityManager;

    public DashboardService(CarRepository carRepository, UserRepository userRepository,
                            RefuelingRepository refuelingRepository, ServiceRepository serviceRepository,
                            RecordRepository recordRepository, IncidentRepository incidentRepository,
                            EntityManager entityManager) {
        this.carRepository = carRepository;
        this.userRepository = userRepository;
        this.refuelingRepository = refuelingRepository;
        this.serviceRepository = serviceRepository;
        this.recordRepository = recordRepository;
        this.incidentRepository = incidentRepository;
        this.entityManager = entityManager;
    }

    /**
     * Consolida os KPIs principais para os cards do Dashboard.
     */
    public DashboardMetricsDTO getMetrics() {
        Double spend = refuelingRepository.sumMonthlyFuelSpend();
        Double avgPrice = refuelingRepository.avgMonthlyPricePerLiter();
        Double liters = refuelingRepository.sumMonthlyLiters();

        return new DashboardMetricsDTO(
                Optional.ofNullable(carRepository.countByStatus(VehicleStatus.AVAILABLE)).orElse(0L),
                Optional.ofNullable(carRepository.countByStatus(VehicleStatus.MAINTENANCE)).orElse(0L),
                Optional.ofNullable(carRepository.countByStatus(VehicleStatus.IN_USE)).orElse(0L),
                userRepository.countTechniciansByStatus(EmployeeStatus.AVAILABLE),
                userRepository.countTechniciansByStatus(EmployeeStatus.ON_DUTY),
                Optional.ofNullable(spend).orElse(0.0),
                Optional.ofNullable(avgPrice).orElse(0.0),
                Optional.ofNullable(liters).orElse(0.0)
        );
    }

    /**
     * Recupera a linha do tempo de alterações (Auditoria) dos serviços.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getServiceAuditHistory() {
        AuditReader auditReader = AuditReaderFactory.get(entityManager);

        List<?> revisions = auditReader.createQuery()
                .forRevisionsOfEntity(com.ipem.api.modules.service.model.Service.class, false, true)
                .addOrder(AuditEntity.revisionNumber().desc())
                .setMaxResults(100)
                .getResultList();

        List<Map<String, Object>> historyList = new ArrayList<>();

        for (Object item : revisions) {
            Object[] revision = (Object[]) item;
            com.ipem.api.modules.service.model.Service entity = (com.ipem.api.modules.service.model.Service) revision[0];
            DefaultRevisionEntity revisionEntity = (DefaultRevisionEntity) revision[1];
            RevisionType revisionType = (RevisionType) revision[2];

            Map<String, Object> dto = new HashMap<>();
            Map<String, Object> entityData = new HashMap<>();

            entityData.put("id", entity.getId());
            entityData.put("departureTime", entity.getDepartureTime());
            entityData.put("completionTime", entity.getCompletionTime());
            entityData.put("description", entity.getDescription());

            if (entity.getCar() != null) entityData.put("car", Map.of("prefix", entity.getCar().getPrefix()));
            if (entity.getUser() != null) entityData.put("user", Map.of("name", entity.getUser().getName(), "registration", entity.getUser().getRegistration()));

            dto.put("entity", entityData);
            dto.put("revisionType", revisionType.name());
            dto.put("revisionDate", revisionEntity.getRevisionDate());

            historyList.add(dto);
        }
        return historyList;
    }

    // ===================================================================
    // HISTÓRICO COMPLETO DE AÇÕES POR CHAMADO (Novo endpoint)
    // ===================================================================

    /**
     * Monta o histórico completo de um chamado com todos os seus eventos
     * (check-in, abastecimento, incidente, check-out) em ordem cronológica.
     * Inclui chamados ativos (is_active = true) e finalizados (is_active = false).
     *
     * @param page Número da página (base 0).
     * @param size Quantidade de chamados por página.
     * @return Mapa contendo a lista de chamados com eventos + metadados de paginação.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getFullServiceHistory(int page, int size) {
        // Busca paginada ignorando o soft-delete (retorna ativos e finalizados)
        Page<com.ipem.api.modules.service.model.Service> paginaServicos =
                serviceRepository.findAllForHistory(PageRequest.of(page, size));

        List<Map<String, Object>> chamados = new ArrayList<>();

        for (com.ipem.api.modules.service.model.Service service : paginaServicos.getContent()) {

            // --- Monta os eventos a partir dos records (linha do tempo do chamado) ---
            List<Record> records = recordRepository.findByServiceIdAndIsActiveTrueOrderByRecordDateAsc(service.getId());
            List<Map<String, Object>> eventos = new ArrayList<>();

            // Adiciona Check-out dinâmico (Saída da frota) se houver departureTime e não existir no banco
            boolean hasDepartureRecord = records.stream().anyMatch(r -> com.ipem.api.modules.service.model.enums.RecordType.CHECK_OUT.equals(r.getRecordType()));
            if (service.getDepartureTime() != null && !hasDepartureRecord) {
                Map<String, Object> checkOut = new LinkedHashMap<>();
                checkOut.put("type", "CHECK_OUT");
                checkOut.put("label", "Início do serviço / Saída");
                checkOut.put("date", service.getDepartureTime());
                checkOut.put("km", service.getDepartureKm());
                checkOut.put("note", "Abertura do chamado");
                eventos.add(checkOut);
            }

            for (Record record : records) {
                Map<String, Object> evento = new LinkedHashMap<>();
                evento.put("type", record.getRecordType() != null ? record.getRecordType().name() : "UNKNOWN");
                evento.put("label", traduzirTipoRecord(record.getRecordType()));
                evento.put("date", record.getRecordDate());
                evento.put("km", record.getRecordKm());
                evento.put("note", record.getNote());
                
                // Se for abastecimento, traz os dados específicos do refueling
                if (record.getRecordType() == com.ipem.api.modules.service.model.enums.RecordType.REFUELING) {
                    refuelingRepository.findById(record.getId()).ifPresent(ref -> {
                        evento.put("liters", ref.getLiters());
                        evento.put("pricePerLiter", ref.getPricePerLiter());
                        evento.put("totalAmount", ref.getTotalAmount());
                        evento.put("fuelType", ref.getFuelType() != null ? ref.getFuelType().name() : null);
                        evento.put("gasStationName", ref.getGasStationName());
                        evento.put("invoice", ref.getInvoice());
                    });
                }
                
                eventos.add(evento);
            }

            // --- Monta os eventos a partir dos incidentes (cancelamentos e defeitos) ---
            List<Incident> incidentes = incidentRepository.findByServiceIdAndIsActiveTrue(service.getId());

            for (Incident incident : incidentes) {
                Map<String, Object> evento = new LinkedHashMap<>();
                evento.put("type", "INCIDENT");
                
                String labelStr = "Incidente relatado";
                if (incident.getIncidentType() != null) {
                    labelStr = switch (incident.getIncidentType()) {
                        case CANCELLATION -> "Cancelamento registrado";
                        case DEFECT -> "Falha mecânica / Defeito";
                    };
                }
                evento.put("label", labelStr);
                
                evento.put("date", incident.getCreatedAt());
                evento.put("km", null);
                evento.put("note", incident.getDescription());
                evento.put("severity", incident.getSeverity() != null ? incident.getSeverity().name() : null);
                evento.put("resolved", incident.getResolved());
                evento.put("incidentType", incident.getIncidentType() != null ? incident.getIncidentType().name() : null);
                eventos.add(evento);
            }

            // Adiciona Check-in dinâmico (Retorno à base) se houver completionTime e não existir no banco
            boolean hasReturnRecord = records.stream().anyMatch(r -> com.ipem.api.modules.service.model.enums.RecordType.CHECK_IN.equals(r.getRecordType()));
            if (service.getCompletionTime() != null && !hasReturnRecord) {
                Map<String, Object> checkIn = new LinkedHashMap<>();
                checkIn.put("type", "CHECK_IN");
                checkIn.put("label", "Fim do serviço / Retorno");
                checkIn.put("date", service.getCompletionTime());
                checkIn.put("km", service.getArrivalKm());
                checkIn.put("note", "Encerramento do chamado");
                eventos.add(checkIn);
            }

            // Ordena todos os eventos pela data (records + incidentes juntos)
            eventos.sort(Comparator.comparing(
                    e -> e.get("date") != null ? e.get("date").toString() : ""
            ));

            // --- Monta o objeto do chamado com os dados principais + eventos ---
            Map<String, Object> chamado = new LinkedHashMap<>();
            chamado.put("serviceId", service.getId());
            chamado.put("isActive", service.getIsActive()); // true = em andamento, false = finalizado
            chamado.put("priority", service.getPriority() != null ? service.getPriority().name() : "MEDIUM");
            chamado.put("departureKm", service.getDepartureKm());
            chamado.put("arrivalKm", service.getArrivalKm());
            chamado.put("destinationRequester", service.getDestinationRequester());
            chamado.put("description", service.getDescription());
            chamado.put("departureTime", service.getDepartureTime());
            chamado.put("arrivalTime", service.getArrivalTime());
            chamado.put("completionTime", service.getCompletionTime());
            chamado.put("hasIncidents", !incidentes.isEmpty());

            // Dados do técnico responsável
            if (service.getUser() != null) {
                chamado.put("technician", Map.of(
                        "registration", service.getUser().getRegistration(),
                        "name", service.getUser().getName()
                ));
            } else {
                chamado.put("technician", null);
            }

            // Dados da viatura
            if (service.getCar() != null) {
                Map<String, Object> veiculo = new LinkedHashMap<>();
                veiculo.put("prefix", service.getCar().getPrefix());
                veiculo.put("licensePlate", service.getCar().getLicensePlate());
                if (service.getCar().getType() != null) {
                    veiculo.put("model", service.getCar().getType().getModel());
                    veiculo.put("brand", service.getCar().getType().getBrand());
                }
                chamado.put("vehicle", veiculo);
            } else {
                chamado.put("vehicle", null);
            }

            chamado.put("events", eventos);
            chamados.add(chamado);
        }

        // --- Monta a resposta com os dados de paginação junto ---
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("content", chamados);
        resposta.put("page", paginaServicos.getNumber());
        resposta.put("size", paginaServicos.getSize());
        resposta.put("totalElements", paginaServicos.getTotalElements());
        resposta.put("totalPages", paginaServicos.getTotalPages());
        resposta.put("last", paginaServicos.isLast());

        return resposta;
    }

    /**
     * Traduz o enum RecordType para um label legível em português.
     */
    private String traduzirTipoRecord(com.ipem.api.modules.service.model.enums.RecordType tipo) {
        if (tipo == null) return "Evento desconhecido";
        return switch (tipo) {
            case CHECK_OUT           -> "Saída registrada";
            case CHECK_IN            -> "Retorno confirmado";
            case REFUELING           -> "Abastecimento";
            case INCIDENT            -> "Incidente";
            case ARRIVAL_AT_LOCATION -> "Chegada no local";
            case SERVICE_COMPLETION  -> "Serviço concluído";
            case RETURN_TRIP         -> "Viagem de retorno";
        };
    }

    /**
     * Gera os dados para os relatórios mensais de forma completa.
     */
    public List<ServiceReportMonthDTO> getMonthlyServiceReports(int months) {
        var formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        var reports = new ArrayList<ServiceReportMonthDTO>();
        var localePT = new Locale("pt", "BR");

        for (int offset = months - 1; offset >= 0; offset--) {
            YearMonth yearMonth = YearMonth.now().minusMonths(offset);
            var start = yearMonth.atDay(1).atStartOfDay();
            var end = yearMonth.atEndOfMonth().plusDays(1).atStartOfDay();

            var services = serviceRepository.findAllHistoricalByDepartureTime(start, end);

            int completedCalls = 0;
            int openCalls = 0;
            var entries = new ArrayList<ServiceReportEntryDTO>();

            for (var s : services) {
                String statusStr;

                if (s.getCompletionTime() != null) {
                    statusStr = "Finalizado";
                    completedCalls++;
                } else if (s.getArrivalTime() == null) {
                    statusStr = "Em andamento";
                    openCalls++;
                } else {
                    statusStr = "Em aberto";
                    openCalls++;
                }

                List<Refueling> abastecimentos =
                        refuelingRepository.findByServiceId(s.getId());

                String refuelingInfo = abastecimentos.isEmpty()
                        ? "-"
                        : abastecimentos.stream()
                        .map(ref -> String.format(
                                "Litros: %s | Preço/L: R$ %.2f | Total: R$ %.2f | NF: %s | Combustível: %s | Posto: %s",
                                ref.getLiters() != null ? ref.getLiters() : "-",
                                ref.getPricePerLiter() != null ? ref.getPricePerLiter() : 0.0,
                                ref.getTotalAmount() != null ? ref.getTotalAmount() : 0.0,
                                ref.getInvoice() != null ? ref.getInvoice() : "-",
                                ref.getFuelType() != null ? ref.getFuelType().name() : "-",
                                ref.getGasStationName() != null ? ref.getGasStationName() : "-"
                        ))
                        .reduce((a, b) -> a + " || " + b)
                        .orElse("-");

                entries.add(new ServiceReportEntryDTO(
                        s.getId(),
                        s.getCar() != null ? s.getCar().getPrefix() : "-",
                        s.getUser() != null ? s.getUser().getRegistration() : "-",
                        s.getUser() != null ? s.getUser().getName() : "-",
                        s.getDescription(),
                        s.getDepartureTime() != null ? formatter.format(s.getDepartureTime()) : "-",
                        s.getArrivalTime() != null ? formatter.format(s.getArrivalTime()) : "-",
                        s.getCompletionTime() != null ? formatter.format(s.getCompletionTime()) : "-",
                        statusStr,
                        s.getDepartureKm(),
                        s.getArrivalKm(),
                        s.getDestinationRequester(),
                        refuelingInfo
                ));
            }

            String monthName = yearMonth.getMonth().getDisplayName(TextStyle.FULL, localePT);
            String formattedMonthLabel = monthName.substring(0, 1).toUpperCase() + monthName.substring(1);

            boolean isCurrentMonth = yearMonth.equals(YearMonth.now());
            String reportStatus = isCurrentMonth ? "Mês em andamento" : "Mês fechado";

            reports.add(new ServiceReportMonthDTO(
                    formattedMonthLabel,
                    yearMonth.getYear(),
                    services.size(),
                    completedCalls,
                    openCalls,
                    isCurrentMonth,
                    reportStatus,
                    entries
            ));
        }
        return reports;
    }

    public List<com.ipem.api.modules.service.dto.ServiceReportEntryDTO> getServiceReportsByDateRange(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        var formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        var services = serviceRepository.findAllHistoricalByDepartureTime(start, end);
        var entries = new java.util.ArrayList<com.ipem.api.modules.service.dto.ServiceReportEntryDTO>();

        for (var s : services) {
            String statusStr;
            if (s.getCompletionTime() != null) {
                statusStr = "Finalizado";
            } else if (s.getArrivalTime() == null) {
                statusStr = "Em andamento";
            } else {
                statusStr = "Em aberto";
            }

            java.util.List<com.ipem.api.modules.service.model.Refueling> abastecimentos =
                    refuelingRepository.findByServiceId(s.getId());

            String refuelingInfo = abastecimentos.isEmpty()
                    ? "-"
                    : abastecimentos.stream()
                    .map(ref -> String.format(
                            "Litros: %s | Preço/L: R$ %.2f | Total: R$ %.2f | NF: %s | Combustível: %s | Posto: %s",
                            ref.getLiters() != null ? ref.getLiters() : "-",
                            ref.getPricePerLiter() != null ? ref.getPricePerLiter() : 0.0,
                            ref.getTotalAmount() != null ? ref.getTotalAmount() : 0.0,
                            ref.getInvoice() != null ? ref.getInvoice() : "-",
                            ref.getFuelType() != null ? ref.getFuelType().name() : "-",
                            ref.getGasStationName() != null ? ref.getGasStationName() : "-"
                    ))
                    .reduce((a, b) -> a + " || " + b)
                    .orElse("-");

            entries.add(new com.ipem.api.modules.service.dto.ServiceReportEntryDTO(
                    s.getId(),
                    s.getCar() != null ? s.getCar().getPrefix() : "-",
                    s.getUser() != null ? s.getUser().getRegistration() : "-",
                    s.getUser() != null ? s.getUser().getName() : "-",
                    s.getDescription(),
                    s.getDepartureTime() != null ? formatter.format(s.getDepartureTime()) : "-",
                    s.getArrivalTime() != null ? formatter.format(s.getArrivalTime()) : "-",
                    s.getCompletionTime() != null ? formatter.format(s.getCompletionTime()) : "-",
                    statusStr,
                    s.getDepartureKm(),
                    s.getArrivalKm(),
                    s.getDestinationRequester(),
                    refuelingInfo
            ));
        }
        return entries;
    }

    public List<com.ipem.api.modules.service.dto.RefuelingReportDTO> getRefuelingReportsByDateRange(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        List<Refueling> refuelings = refuelingRepository.findByRecordDateBetweenAndIsActiveTrue(start, end);
        
        return refuelings.stream().map(refueling -> {
            String carPrefix = refueling.getRecord() != null && refueling.getRecord().getService() != null && refueling.getRecord().getService().getCar() != null 
                    ? refueling.getRecord().getService().getCar().getPrefix() : "-";
            String technicianName = refueling.getRecord() != null && refueling.getRecord().getService() != null && refueling.getRecord().getService().getUser() != null 
                    ? refueling.getRecord().getService().getUser().getName() : "-";
            String date = refueling.getRecord() != null && refueling.getRecord().getRecordDate() != null 
                    ? refueling.getRecord().getRecordDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "-";
            
            return com.ipem.api.modules.service.dto.RefuelingReportDTO.builder()
                    .id(refueling.getRecordId())
                    .carPrefix(carPrefix)
                    .technicianName(technicianName)
                    .date(date)
                    .gasStationName(refueling.getGasStationName() != null ? refueling.getGasStationName() : "-")
                    .liters(refueling.getLiters() != null ? refueling.getLiters() : 0.0f)
                    .totalAmount(refueling.getTotalAmount() != null ? String.format("R$ %.2f", refueling.getTotalAmount()) : "R$ 0,00")
                    .pricePerLiter(refueling.getPricePerLiter() != null ? String.format("R$ %.2f", refueling.getPricePerLiter()) : "R$ 0,00")
                    .build();
        }).toList();
    }

    public List<com.ipem.api.modules.service.dto.IncidentReportDTO> getIncidentReportsByDateRange(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        List<Incident> incidents = incidentRepository.findByCreatedAtBetweenAndIsActiveTrue(start, end);
        
        return incidents.stream().map(incident -> {
            String carPrefix = incident.getService() != null && incident.getService().getCar() != null ? incident.getService().getCar().getPrefix() : "-";
            String technicianName = incident.getService() != null && incident.getService().getUser() != null ? incident.getService().getUser().getName() : "-";
            String date = incident.getCreatedAt() != null ? incident.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "-";
            
            return com.ipem.api.modules.service.dto.IncidentReportDTO.builder()
                    .id(incident.getId())
                    .carPrefix(carPrefix)
                    .technicianName(technicianName)
                    .incidentType(incident.getIncidentType() != null ? incident.getIncidentType().name() : "-")
                    .severity(incident.getSeverity() != null ? incident.getSeverity().name() : "-")
                    .description(incident.getDescription() != null ? incident.getDescription() : "-")
                    .date(date)
                    .status(incident.getResolved() != null && incident.getResolved() ? "Resolvido" : "Aberto")
                    .build();
        }).toList();
    }

    public List<com.ipem.api.modules.service.dto.ExpenseReportDTO> getExpenseReportsByDateRange(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        List<Record> records = recordRepository.findByRecordDateBetweenAndIsActiveTrue(start, end);
        
        return records.stream().map(record -> {
            String carPrefix = record.getService() != null && record.getService().getCar() != null ? record.getService().getCar().getPrefix() : "-";
            String technicianName = record.getService() != null && record.getService().getUser() != null ? record.getService().getUser().getName() : "-";
            String date = record.getRecordDate() != null ? record.getRecordDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "-";
            
            return com.ipem.api.modules.service.dto.ExpenseReportDTO.builder()
                    .id(record.getId())
                    .carPrefix(carPrefix)
                    .technicianName(technicianName)
                    .expenseType(record.getRecordType() != null ? record.getRecordType().name() : "Desconhecido")
                    .date(date)
                    .note(record.getNote() != null && !record.getNote().isEmpty() ? record.getNote() : "-")
                    .build();
        }).toList();
    }
}