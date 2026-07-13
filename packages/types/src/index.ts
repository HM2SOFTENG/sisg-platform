export type SisgRole = "admin" | "operator" | "manager" | "analyst" | "viewer";
export type AuthUserStatus = "active" | "disabled";

export interface ApiSuccess<T> {
  data: T;
  error?: undefined;
}

export interface ApiFailure {
  data?: undefined;
  error: string;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: SisgRole[];
  status: AuthUserStatus;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  issuedAt: string;
  tokenType: "Bearer";
  roles: SisgRole[];
  user: AuthUser;
}

export interface LoginRequest {
  email?: string;
  password: string;
}

export interface AuthStatus extends Partial<AuthSession> {
  authenticated: boolean;
}

export interface LoginResponse extends AuthSession {
  success: true;
}

export interface OperatorAccount {
  id: string;
  email: string;
  displayName: string;
  roles: SisgRole[];
  status: AuthUserStatus;
  createdAt: string;
  updatedAt: string | null;
  lastLoginAt: string | null;
}

export interface CreateOperatorAccountRequest {
  email: string;
  displayName: string;
  password: string;
  roles?: SisgRole[];
}

export interface UpdateOperatorAccountRequest {
  email?: string;
  displayName?: string;
  password?: string;
  roles?: SisgRole[];
  status?: AuthUserStatus;
}

export interface DashboardSummary {
  submissions: number;
  contracts: number;
  team: number;
  projects: number;
  marketing: number;
  partnerships: number;
  content: number;
  activity: number;
  activeProjects: number;
  contractsTotal: number;
}
