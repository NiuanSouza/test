export interface LoginRequest {
  registration: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  registration: string;
  permission: string;
  name: string;
}

export interface ResetPasswordRequest {
  email: string;
}
