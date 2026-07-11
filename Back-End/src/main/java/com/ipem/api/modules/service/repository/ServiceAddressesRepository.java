package com.ipem.api.modules.service.repository;

import com.ipem.api.modules.service.model.ServiceAddresses;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceAddressesRepository
        extends JpaRepository<ServiceAddresses, Long> {
    java.util.List<ServiceAddresses> findByServiceId(Long serviceId);
}