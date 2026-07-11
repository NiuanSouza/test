export interface CheckInOutRequest {
  serviceId?: number;
  carPrefix: string;
  userRegistration: string;
  recordKm: number;
  note: string;
  destinationRequester: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RefuelingRequest {
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  recordKm: number;
  date: string;
  invoice?: string;
  gasStationName?: string;
  fuelType?: string;
}

export interface IncidentRequest {
  description: string;
  incidentType: string;
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  requestSupport: boolean;
}

export interface PendingServiceRequest {
  carPrefix: string;
  technicianRegistration: string;
  destinationRequester: string;
  note: string;
  priority: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  requiredCnhCategory?: string;
}

export interface ActiveServiceResponse {
  active: boolean;
  serviceId?: number;
  carPrefix?: string;
  departureTime?: string;
  model?: string;
  licensePlate?: string;
  departureKm?: number;
  description?: string;
}
