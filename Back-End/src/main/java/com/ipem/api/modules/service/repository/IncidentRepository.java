package com.ipem.api.modules.service.repository;

import com.ipem.api.modules.service.model.Incident;
import com.ipem.api.modules.service.model.enums.IncidentType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    List<Incident> findByIncidentTypeAndIsActiveTrue(IncidentType type);

    List<Incident> findByRequestSupportTrueAndIsActiveTrue();

    // Busca todos os incidentes vinculados a um chamado específico (para o histórico completo)
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM incidents WHERE service_id = :serviceId AND is_active = true ORDER BY created_at ASC", nativeQuery = true)
    List<Incident> findByServiceIdAndIsActiveTrue(@org.springframework.data.repository.query.Param("serviceId") Long serviceId);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM Incident i WHERE i.createdAt BETWEEN :start AND :end AND i.isActive = true ORDER BY i.createdAt DESC")
    List<Incident> findByCreatedAtBetweenAndIsActiveTrue(@org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start, @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
}