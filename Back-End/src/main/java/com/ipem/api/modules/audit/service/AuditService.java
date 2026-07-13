package com.ipem.api.modules.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ipem.api.modules.audit.dto.AuditHistoryDTO;
import com.ipem.api.modules.service.model.Service;
import com.ipem.api.modules.service.model.Refueling;
import com.ipem.api.modules.user.model.User;
import com.ipem.api.modules.vehicle.model.Car;
import com.ipem.api.modules.vehicle.model.CarType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.query.AuditEntity;
import org.hibernate.envers.query.AuditQuery;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Component
public class AuditService {

    @PersistenceContext
    private EntityManager entityManager;

    public List<AuditHistoryDTO> getAuditHistory(String entityType, Object entityId) {
        Class<?> clazz = getEntityClass(entityType);
        if (clazz == null) {
            throw new IllegalArgumentException("Tipo de entidade não suportado para auditoria: " + entityType);
        }

        AuditReader reader = AuditReaderFactory.get(entityManager);
        AuditQuery query = reader.createQuery()
                .forRevisionsOfEntity(clazz, false, true)
                .add(AuditEntity.id().eq(entityId))
                .addOrder(AuditEntity.revisionNumber().desc());

        List<Object[]> results = query.getResultList();
        List<AuditHistoryDTO> history = new ArrayList<>();

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());

        for (Object[] result : results) {
            Object entity = result[0];
            Object revisionEntity = result[1];
            Object revisionType = result[2];

            Number revisionId = null;
            LocalDateTime revisionDate = null;
            
            try {
                // By default Envers uses DefaultRevisionEntity which has id and timestamp properties
                revisionId = (Number) revisionEntity.getClass().getMethod("getId").invoke(revisionEntity);
                long timestamp = (long) revisionEntity.getClass().getMethod("getTimestamp").invoke(revisionEntity);
                revisionDate = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
            } catch (Exception e) {
                // Ignore if custom revision entity doesn't follow the pattern
            }

            Map<String, Object> entityData = safeExtract(entity);
            
            // Clean up some unnecessary data
            entityData.remove("password"); 
            entityData.remove("photo"); 
            entityData.remove("image_url"); 

            history.add(AuditHistoryDTO.builder()
                    .revisionId(revisionId)
                    .revisionDate(revisionDate)
                    .revisionType(revisionType != null ? revisionType.toString() : "UNKNOWN")
                    .entityData(entityData)
                    .build());
        }

        return history;
    }

    public List<AuditHistoryDTO> getAllAuditHistory() {
        AuditReader reader = AuditReaderFactory.get(entityManager);
        List<AuditHistoryDTO> allHistory = new ArrayList<>();

        Class<?>[] classesToAudit = {Car.class, User.class, Service.class, CarType.class, Refueling.class};

        for (Class<?> clazz : classesToAudit) {
            AuditQuery query = reader.createQuery()
                    .forRevisionsOfEntity(clazz, false, true)
                    .addOrder(AuditEntity.revisionNumber().desc())
                    .setMaxResults(100);

            List<Object[]> results = query.getResultList();
            
            for (Object[] result : results) {
                Object entity = result[0];
                Object revisionEntity = result[1];
                Object revisionType = result[2];

                Number revisionId = null;
                LocalDateTime revisionDate = null;

                try {
                    revisionId = (Number) revisionEntity.getClass().getMethod("getId").invoke(revisionEntity);
                    long timestamp = (long) revisionEntity.getClass().getMethod("getTimestamp").invoke(revisionEntity);
                    revisionDate = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
                } catch (Exception e) { }

                Map<String, Object> entityData = safeExtract(entity);
                entityData.remove("password");
                entityData.remove("photo");
                entityData.remove("image_url");
                entityData.put("_entityType", clazz.getSimpleName());

                allHistory.add(AuditHistoryDTO.builder()
                        .revisionId(revisionId)
                        .revisionDate(revisionDate)
                        .revisionType(revisionType != null ? revisionType.toString() : "UNKNOWN")
                        .entityData(entityData)
                        .build());
            }
        }

        // Sort by date descending
        allHistory.sort((a, b) -> {
            if (a.getRevisionDate() == null) return 1;
            if (b.getRevisionDate() == null) return -1;
            return b.getRevisionDate().compareTo(a.getRevisionDate());
        });

        return allHistory.size() > 100 ? allHistory.subList(0, 100) : allHistory;
    }

    private Class<?> getEntityClass(String entityType) {
        switch (entityType.toLowerCase()) {
            case "service": return Service.class;
            case "vehicle": 
            case "car": return Car.class;
            case "user": return User.class;
            case "cartype":
            case "car_type": return CarType.class;
            case "refueling": return Refueling.class;
            default: return null;
        }
    }

    private Map<String, Object> safeExtract(Object entity) {
        Map<String, Object> map = new HashMap<>();
        if (entity == null) return map;
        Class<?> clazz = entity.getClass();
        while (clazz != null && clazz != Object.class) {
            for (java.lang.reflect.Field field : clazz.getDeclaredFields()) {
                field.setAccessible(true);
                try {
                    Object value = field.get(entity);
                    if (value == null) continue;
                    if (value instanceof Collection) continue;
                    
                    if (value.getClass().getName().contains("HibernateProxy")) {
                        // Skip proxy serialization to avoid EntityNotFoundException
                        continue;
                    }
                    if (value.getClass().getPackage() != null && 
                        value.getClass().getPackage().getName().startsWith("com.ipem.api.modules")) {
                        // Nested entity, skip
                        continue;
                    }
                    map.put(field.getName(), value);
                } catch (Exception e) {
                   // ignore
                }
            }
            clazz = clazz.getSuperclass();
        }
        return map;
    }
}
