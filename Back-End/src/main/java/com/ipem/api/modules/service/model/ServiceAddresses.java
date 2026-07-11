package com.ipem.api.modules.service.model;

import com.ipem.api.infrastructure.models.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "service_addresses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLRestriction("is_active = true")
public class ServiceAddresses extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    @Column(nullable = false)
    private String street;

    @Column(length = 20)
    private String number;

    @Column(length = 100)
    private String neighborhood;

    @Column(length = 100, nullable = false)
    private String city;

    @Column(length = 2, nullable = false)
    private String state;

    @Column(name = "zip_code", length = 15)
    private String zipCode;

    @Column(length = 150)
    private String complement;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Builder.Default
    @Column(name = "is_active", columnDefinition = "boolean default true")
    private Boolean isActive = true;

}