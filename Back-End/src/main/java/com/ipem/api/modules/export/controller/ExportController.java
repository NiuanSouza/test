package com.ipem.api.modules.export.controller;

import com.ipem.api.modules.export.service.ExportService;
import com.ipem.api.modules.service.dto.ServiceReportMonthDTO;
import com.ipem.api.modules.service.service.DashboardService;
import com.ipem.api.modules.user.service.UserService;
import com.ipem.api.modules.vehicle.service.VehicleService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/export")
public class ExportController {

    private final ExportService exportService;
    private final UserService userService;
    private final VehicleService vehicleService;
    private final DashboardService dashboardService;


    public ExportController(ExportService exportService, DashboardService dashboardService, UserService userService, VehicleService vehicleService) {
        this.exportService = exportService;
        this.userService = userService;
        this.vehicleService = vehicleService;
        this.dashboardService = dashboardService;
    }

    /**
     * Método auxiliar para construir a resposta HTTP de download de forma padronizada.
     */
    private ResponseEntity<byte[]> buildResponse(byte[] fileBytes, String format, String fileName) {
        HttpHeaders headers = new HttpHeaders();

        // Tratamento para garantir que o arquivo tenha a extensão correta caso o usuário não envie na URL
        String finalFileName = fileName.toLowerCase().endsWith("." + format.toLowerCase())
                ? fileName
                : fileName + "." + format;

        // Configura o Content-Disposition com o nome dinâmico vindo da URL
        headers.setContentDispositionFormData("attachment", finalFileName);

        // Define o tipo MIME correto baseado no formato solicitado
        MediaType mediaType = switch (format.toLowerCase()) {
            case "csv" -> MediaType.valueOf("text/csv");
            case "excel", "xlsx" -> MediaType.valueOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "pdf" -> MediaType.APPLICATION_PDF;
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };

        headers.setContentType(mediaType);

        return new ResponseEntity<>(fileBytes, headers, HttpStatus.OK);
    }

    // /export/csv/users/dows

    /**
     * Endpoint para exportar todos os usuários.
     */
    @GetMapping("/{format}/users/{fileName}")
    public ResponseEntity<byte[]> downloadUsers(@PathVariable String format, @PathVariable String fileName) {
        List<?> data = userService.findAllUsers();

        byte[] file = exportService.exportData(format, data);
        return buildResponse(file, format, fileName);
    }

    /**
     * Endpoint para exportar todos os veículos.
     */
    @GetMapping("/{format}/vehicle/{fileName}")
    public ResponseEntity<byte[]> downloadVehicles(@PathVariable String format, @PathVariable String fileName) {
        List<?> data = vehicleService.findAllCars();

        byte[] file = exportService.exportData(format, data);
        return buildResponse(file, format, fileName);
    }

    /**
     * Endpoint para exportar os relatórios Mensais.
     */
    @GetMapping("/{format}/reports/{fileName}")
    public ResponseEntity<byte[]> downloadReports(@PathVariable String format, @PathVariable String fileName, @RequestParam(defaultValue = "6") int months) {
        List<?> data = dashboardService.getMonthlyServiceReports(months);
        byte[] file = exportService.exportData(format, data);
        return buildResponse(file, format, fileName);
    }

    /**
     * Endpoint para exportar os relatórios por período (data inicial e data final).
     */
    @GetMapping("/{format}/reports-by-date/{fileName}")
    public ResponseEntity<byte[]> downloadReportsByDate(@PathVariable String format, @PathVariable String fileName, @RequestParam String startDate, @RequestParam String endDate) {
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.LocalDateTime start = java.time.LocalDate.parse(startDate, formatter).atStartOfDay();
        java.time.LocalDateTime end = java.time.LocalDate.parse(endDate, formatter).atTime(java.time.LocalTime.MAX);
        
        List<?> data = dashboardService.getServiceReportsByDateRange(start, end);
        byte[] file = exportService.exportData(format, data);
        return buildResponse(file, format, fileName);
    }

    @GetMapping("/{format}/supplies-by-date/{fileName}")
    public ResponseEntity<byte[]> downloadSuppliesByDate(@PathVariable String format, @PathVariable String fileName, @RequestParam String startDate, @RequestParam String endDate) {
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.LocalDateTime start = java.time.LocalDate.parse(startDate, formatter).atStartOfDay();
        java.time.LocalDateTime end = java.time.LocalDate.parse(endDate, formatter).atTime(java.time.LocalTime.MAX);
        
        List<?> data = dashboardService.getRefuelingReportsByDateRange(start, end);
        byte[] file = exportService.exportData(format, data);
        return buildResponse(file, format, fileName);
    }

    @GetMapping("/{format}/incidents-by-date/{fileName}")
    public ResponseEntity<byte[]> downloadIncidentsByDate(@PathVariable String format, @PathVariable String fileName, @RequestParam String startDate, @RequestParam String endDate) {
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.LocalDateTime start = java.time.LocalDate.parse(startDate, formatter).atStartOfDay();
        java.time.LocalDateTime end = java.time.LocalDate.parse(endDate, formatter).atTime(java.time.LocalTime.MAX);
        
        List<?> data = dashboardService.getIncidentReportsByDateRange(start, end);
        byte[] file = exportService.exportData(format, data);
        return buildResponse(file, format, fileName);
    }

    @GetMapping("/{format}/expenses-by-date/{fileName}")
    public ResponseEntity<byte[]> downloadExpensesByDate(@PathVariable String format, @PathVariable String fileName, @RequestParam String startDate, @RequestParam String endDate) {
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.LocalDateTime start = java.time.LocalDate.parse(startDate, formatter).atStartOfDay();
        java.time.LocalDateTime end = java.time.LocalDate.parse(endDate, formatter).atTime(java.time.LocalTime.MAX);
        
        List<?> data = dashboardService.getExpenseReportsByDateRange(start, end);
        byte[] file = exportService.exportData(format, data);
        return buildResponse(file, format, fileName);
    }
}