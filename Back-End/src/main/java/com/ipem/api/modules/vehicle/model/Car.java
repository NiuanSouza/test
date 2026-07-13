package com.ipem.api.modules.vehicle.model;

import com.ipem.api.infrastructure.models.BaseEntity;
import com.ipem.api.modules.vehicle.model.enums.VehicleStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.envers.Audited;
import org.hibernate.envers.RelationTargetAuditMode;

@Entity
@Audited
@Table(name = "cars")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Car extends BaseEntity {
    @Id
    @Column(length = 20)
    private String prefix;
    private String licensePlate;

    @ManyToOne
    @JoinColumn(name = "type_id")
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private CarType type;

    private String fuel;
    private Float currentKm;
    private Float nextOilChangeKm;

    private Boolean available;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @Column(columnDefinition = "TEXT")
    private String image_url;

    private String color;
    private String requiredLicense;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_status")
    private VehicleStatus vehicleStatus;

    @Column(name = "is_active", columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean isActive = true;

    private Float tankCapacity;
    @Column(unique = true)
    private String renavam;
    @Column(unique = true)
    private String chassi;
}