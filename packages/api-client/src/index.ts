import {
  authUserSchema,
  authSessionSchema,
  authStatusSchema,
  createOperatorAccountRequestSchema,
  dashboardSummarySchema,
  loginResponseSchema,
  operatorAccountSchema,
  updateOperatorAccountRequestSchema,
} from "@sisg/schemas";
import type {
  ApiEnvelope,
  AuthStatus,
  AuthSession,
  CreateOperatorAccountRequest,
  DashboardSummary,
  LoginResponse,
  OperatorAccount,
  UpdateOperatorAccountRequest,
} from "@sisg/types";

export interface ApiClientOptions {
  accessToken?: string;
  baseUrl: string;
}

export interface RefreshSessionOptions {
  baseUrl: string;
  refreshToken: string;
}

const operatorAccountsSchema = {
  parse: (value: unknown) => operatorAccountSchema.array().parse(value),
};

function buildApiUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function parseJson<T>(response: Response): Promise<ApiEnvelope<T> | T> {
  return (await response.json()) as ApiEnvelope<T> | T;
}

async function requestJson<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  init: RequestInit,
  options: ApiClientOptions,
): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(buildApiUrl(options.baseUrl, path), {
    ...init,
    headers,
  });

  const payload = await parseJson<T>(response);

  if (!response.ok) {
    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      throw new Error(payload.error);
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    !("error" in payload && payload.error)
  ) {
    return schema.parse(payload.data);
  }

  return schema.parse(payload);
}

export async function loginAdmin(
  credentials: { email?: string; password: string },
  options: ApiClientOptions,
): Promise<LoginResponse> {
  return requestJson(
    "/api/admin/login",
    loginResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
    options,
  );
}

export async function verifyAdminSession(options: ApiClientOptions): Promise<AuthStatus> {
  return requestJson(
    "/api/admin/verify",
    authStatusSchema,
    {
      method: "GET",
    },
    options,
  );
}

export async function fetchDashboardSummary(options: ApiClientOptions): Promise<DashboardSummary> {
  return requestJson(
    "/api/admin/stats",
    dashboardSummarySchema,
    {
      method: "GET",
    },
    options,
  );
}

export async function refreshAdminSession(
  options: RefreshSessionOptions,
): Promise<AuthSession> {
  return requestJson(
    "/api/admin/refresh",
    authSessionSchema,
    {
      method: "POST",
      body: JSON.stringify({ refreshToken: options.refreshToken }),
    },
    {
      baseUrl: options.baseUrl,
    },
  );
}

export async function logoutAdminSession(options: ApiClientOptions): Promise<{ success: true }> {
  return requestJson(
    "/api/admin/logout",
    {
      parse: (value: unknown) => value as { success: true },
    },
    {
      method: "POST",
    },
    options,
  );
}

export async function fetchCurrentOperator(options: ApiClientOptions) {
  return requestJson(
    "/api/admin/me",
    {
      parse: (value: unknown) =>
        ({
          user: authUserSchema.parse((value as { user: unknown }).user),
          roles: authUserSchema.shape.roles.parse((value as { roles: unknown }).roles),
        }),
    },
    {
      method: "GET",
    },
    options,
  );
}

export async function fetchOperatorAccounts(options: ApiClientOptions): Promise<OperatorAccount[]> {
  return requestJson(
    "/api/admin/auth/accounts",
    operatorAccountsSchema,
    {
      method: "GET",
    },
    options,
  );
}

export async function createAdminOperatorAccount(
  payload: CreateOperatorAccountRequest,
  options: ApiClientOptions,
): Promise<OperatorAccount> {
  const body = createOperatorAccountRequestSchema.parse(payload);
  return requestJson(
    "/api/admin/auth/accounts",
    operatorAccountSchema,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    options,
  );
}

export async function updateAdminOperatorAccount(
  accountId: string,
  payload: UpdateOperatorAccountRequest,
  options: ApiClientOptions,
): Promise<OperatorAccount> {
  const body = updateOperatorAccountRequestSchema.parse(payload);
  return requestJson(
    `/api/admin/auth/accounts/${accountId}`,
    operatorAccountSchema,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    options,
  );
}
