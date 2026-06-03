package com.ipem.api.modules.service.service;

import com.ipem.api.modules.service.dto.DashboardMetricsDTO;
import com.ipem.api.modules.service.repository.IncidentRepository;
import com.ipem.api.modules.service.repository.RecordRepository;
import com.ipem.api.modules.service.repository.RefuelingRepository;
import com.ipem.api.modules.service.repository.ServiceRepository;
import com.ipem.api.modules.user.model.enums.EmployeeStatus;
import com.ipem.api.modules.user.repository.UserRepository;
import com.ipem.api.modules.vehicle.model.enums.VehicleStatus;
import com.ipem.api.modules.vehicle.repository.CarRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private CarRepository carRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RefuelingRepository refuelingRepository;
    @Mock
    private ServiceRepository serviceRepository;
    @Mock
    private RecordRepository recordRepository;
    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void shouldReturnCorrectMetrics() {
        // Arrange
        when(refuelingRepository.sumMonthlyFuelSpend()).thenReturn(1500.0);
        when(refuelingRepository.avgMonthlyPricePerLiter()).thenReturn(5.5);
        when(refuelingRepository.sumMonthlyLiters()).thenReturn(272.72);

        when(carRepository.countByStatus(VehicleStatus.AVAILABLE)).thenReturn(10L);
        when(carRepository.countByStatus(VehicleStatus.MAINTENANCE)).thenReturn(2L);
        when(carRepository.countByStatus(VehicleStatus.IN_USE)).thenReturn(3L);

        when(userRepository.countTechniciansByStatus(EmployeeStatus.AVAILABLE)).thenReturn(5L);
        when(userRepository.countTechniciansByStatus(EmployeeStatus.ON_DUTY)).thenReturn(2L);

        // Act
        DashboardMetricsDTO metrics = dashboardService.getMetrics();

        // Assert
        assertEquals(1500.0, metrics.monthlyFuelSpend());
        assertEquals(5.5, metrics.averagePricePerLiter());
        assertEquals(272.72, metrics.totalLitersRefueled());
        assertEquals(10L, metrics.availableCars());
        assertEquals(2L, metrics.maintenanceCars());
        assertEquals(3L, metrics.inUseCars());
        assertEquals(5L, metrics.availableTechnicians());
        assertEquals(2L, metrics.onDutyTechnicians());
    }
}
