package com.ipem.api.modules.service.repository;

import com.ipem.api.modules.service.model.Service;
import com.ipem.api.modules.vehicle.model.Car;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ServiceRepository extends JpaRepository<Service, Long> {

    @Query("SELECT a FROM Service a WHERE a.car.prefix = :prefix AND a.isActive = true")
    List<Service> findByCarPrefix(@Param("prefix") String prefix);

    List<Service> findByDepartureTimeBetweenAndIsActiveTrue(LocalDateTime start, LocalDateTime end);

    List<Service> findByCarPrefixAndCompletionTimeIsNull(String prefix);

    List<Service> findByCarAndCompletionTimeIsNullAndIsActiveTrue(Car car);

    List<Service> findByDepartureTimeBetween(LocalDateTime start, LocalDateTime end);

    Optional<Service> findFirstByCarAndCompletionTimeIsNullAndIsActiveTrueOrderByCreatedAtDesc(Car car);

    Optional<Service> findByUserRegistrationAndIsActiveTrue(String userRegistration);

    @Query("""
        SELECT s.arrivalKm
        FROM Service s
        WHERE s.car.prefix = :prefix
        AND s.completionTime IS NOT NULL
        AND s.isActive = true
        ORDER BY s.completionTime DESC
    """)
    List<Float> findLastFinalKmListByCarPrefix(@Param("prefix") String prefix);

    @Query(value = "SELECT * FROM service WHERE departure_time >= :start AND departure_time < :end", nativeQuery = true)
    List<Service> findAllHistoricalByDepartureTime(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Busca todos os chamados (ativos e finalizados) para o histórico completo, ordenados por data de criação (mais recentes primeiro)
    // Ignora o @SQLRestriction da entidade para exibir também os chamados finalizados (is_active = false)
    @Query(value = "SELECT * FROM service ORDER BY created_at DESC", nativeQuery = true,
           countQuery = "SELECT COUNT(*) FROM service")
    Page<Service> findAllForHistory(Pageable pageable);

    default Float findLastFinalKmByCarPrefix(String prefix) {
        List<Float> result = findLastFinalKmListByCarPrefix(prefix);
        return result.isEmpty() ? null : result.get(0);
    }

    /**
     * Dashboard do gestor.
     */
    List<Service> findTop10ByOrderByDepartureTimeDesc();

    /**
     * Histórico completo.
     */
    List<Service> findAllByOrderByDepartureTimeDesc();

    List<Service> findByDepartureTimeIsNullAndIsActiveTrue();
}