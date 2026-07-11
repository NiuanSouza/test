export interface DashboardMetrics {
  availableVehicles: number;
  maintenanceVehicles: number;
  inUseVehicles: number;
  availableTechnicians: number;
  activeTechnicians: number;
  monthlyFuelExpense: number;
  averagePricePerLiter: number;
  totalLiters: number;
}

export interface RecentService {
  id: number;
  carPrefix: string;
  technicianName: string;
  status: string;
  startTime: string;
  endTime?: string;
}
