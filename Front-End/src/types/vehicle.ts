export interface Car {
  id: number;
  prefix: string;
  licensePlate: string;
  type: CarType;
  year: number;
  color: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  mileage: number;
  observations?: string;
}

export interface CarType {
  id: number;
  brand: string;
  model: string;
  category: string;
}

export interface CarUpdateDTO {
  mileage: number;
  observations: string;
}

export interface VehicleKmResponseDTO {
  lastFinalKm: number;
}
