export interface User {
  id: number;
  name: string;
  email: string;
  registration: string;
  phone?: string;
  cnhCategory?: string;
  sector?: string;
  permission: 'TECHNICIAN' | 'MANAGER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  photo?: string; // Base64
}

export interface RegisterRequest {
  name: string;
  email: string;
  registration: string;
  password?: string; // Server handles this if null
  phone?: string;
  sector?: string;
  permission: 'TECHNICIAN' | 'MANAGER' | 'ADMIN';
}
