package com.ipem.api.modules.service.repository;

import com.ipem.api.modules.service.model.Record;
import com.ipem.api.modules.service.model.enums.RecordType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {

    @Query(value = "SELECT * FROM records WHERE service_id = :serviceId AND is_active = true ORDER BY record_date ASC", nativeQuery = true)
    List<Record> findByServiceIdAndIsActiveTrueOrderByRecordDateAsc(@org.springframework.data.repository.query.Param("serviceId") Long serviceId);

    List<Record> findByServiceIdAndRecordTypeAndIsActiveTrue(Long serviceId, RecordType type);

    @Query("SELECT r FROM Record r WHERE r.recordDate BETWEEN :start AND :end AND r.isActive = true ORDER BY r.recordDate DESC")
    List<Record> findByRecordDateBetweenAndIsActiveTrue(@org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start, @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
}