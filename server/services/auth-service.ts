import crypto from "crypto";
import type {
  AuthSession,
  CreateOperatorAccountRequest,
  OperatorAccount,
  UpdateOperatorAccountRequest,
} from "@sisg/types";
import {
  createPasswordRecord,
  getAuthRepository,
  hashPassword,
  hashToken,
  normalizeRoles,
  toAuthUser,
} from "./auth-store.js";

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toIso(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}

function newOpaqueToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function buildSessionResponse(params: {
  accessToken: string;
  refreshToken: string;
  issuedAt: string;
  expiresAt: string;
  user: ReturnType<typeof toAuthUser>;
}): AuthSession {
  return {
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    tokenType: "Bearer",
    roles: params.user.roles,
    user: params.user,
  };
}

function toOperatorAccount(user: {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  status: "active" | "disabled";
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}): OperatorAccount {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: normalizeRoles(user.roles),
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || null,
    lastLoginAt: user.lastLoginAt || null,
  };
}

export async function loginWithPassword(params: {
  email?: string;
  password: string;
  userAgent?: string;
  ip?: string;
}): Promise<AuthSession | null> {
  const repo = await getAuthRepository();
  const candidates = params.email ? [await repo.getUserByEmail(params.email)] : await repo.listUsers();
  const user = candidates.find(Boolean) || null;

  if (!user) {
    return null;
  }

  if (user.status !== "active") {
    return null;
  }

  const hashedInput = hashPassword(params.password, user.passwordSalt);
  const hashesMatch = crypto.timingSafeEqual(
    Buffer.from(user.passwordHash, "hex"),
    Buffer.from(hashedInput, "hex"),
  );

  if (!hashesMatch) {
    return null;
  }

  const accessToken = newOpaqueToken();
  const refreshToken = newOpaqueToken();
  const now = Date.now();
  const issuedAt = toIso(now);
  const accessExpiresAt = toIso(now + ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = toIso(now + REFRESH_TOKEN_TTL_MS);
  const storedSession = await repo.createSession({
    userId: user.id,
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
    accessExpiresAt,
    refreshExpiresAt,
    issuedAt,
    userAgent: params.userAgent,
    ip: params.ip,
  });

  await repo.touchUserLogin(user.id, issuedAt);

  return buildSessionResponse({
    accessToken,
    refreshToken,
    issuedAt: storedSession.issuedAt,
    expiresAt: storedSession.accessExpiresAt,
    user: toAuthUser(user),
  });
}

export async function verifyAccessToken(accessToken: string): Promise<AuthSession | null> {
  const repo = await getAuthRepository();
  const session = await repo.getSessionByAccessTokenHash(hashToken(accessToken));
  if (!session || session.revokedAt || new Date(session.accessExpiresAt).getTime() <= Date.now()) {
    return null;
  }

  const user = await repo.getUserById(session.userId);
  if (!user || user.status !== "active") {
    return null;
  }

  return {
    accessToken,
    issuedAt: session.issuedAt,
    expiresAt: session.accessExpiresAt,
    tokenType: "Bearer",
    roles: user.roles,
    user: toAuthUser(user),
  };
}

export async function refreshAccessSession(params: {
  refreshToken: string;
  userAgent?: string;
  ip?: string;
}): Promise<AuthSession | null> {
  const repo = await getAuthRepository();
  const priorSession = await repo.getSessionByRefreshTokenHash(hashToken(params.refreshToken));

  if (
    !priorSession ||
    priorSession.revokedAt ||
    priorSession.replacedBySessionId ||
    new Date(priorSession.refreshExpiresAt).getTime() <= Date.now()
  ) {
    return null;
  }

  const user = await repo.getUserById(priorSession.userId);
  if (!user || user.status !== "active") {
    await repo.revokeSession(priorSession.id);
    return null;
  }

  const accessToken = newOpaqueToken();
  const refreshToken = newOpaqueToken();
  const now = Date.now();
  const issuedAt = toIso(now);
  const nextSession = await repo.createSession({
    userId: user.id,
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
    accessExpiresAt: toIso(now + ACCESS_TOKEN_TTL_MS),
    refreshExpiresAt: toIso(now + REFRESH_TOKEN_TTL_MS),
    issuedAt,
    userAgent: params.userAgent,
    ip: params.ip,
  });
  await repo.replaceSession(priorSession.id, nextSession.id);
  await repo.touchUserLogin(user.id, issuedAt);

  return buildSessionResponse({
    accessToken,
    refreshToken,
    issuedAt: nextSession.issuedAt,
    expiresAt: nextSession.accessExpiresAt,
    user: toAuthUser(user),
  });
}

export async function revokeAccessToken(accessToken: string): Promise<void> {
  const repo = await getAuthRepository();
  const session = await repo.getSessionByAccessTokenHash(hashToken(accessToken));
  if (!session) {
    return;
  }
  await repo.revokeSession(session.id);
}

export async function cleanupExpiredAuthSessions(): Promise<void> {
  const repo = await getAuthRepository();
  await repo.deleteExpiredSessions(new Date().toISOString());
}

export async function listOperatorAccounts(): Promise<OperatorAccount[]> {
  const repo = await getAuthRepository();
  const users = await repo.listUsers();
  return users.map((user) => toOperatorAccount(user));
}

export async function createOperatorAccount(
  input: CreateOperatorAccountRequest,
): Promise<OperatorAccount> {
  const repo = await getAuthRepository();
  const existing = await repo.getUserByEmail(input.email);
  if (existing) {
    throw new Error("An operator account with that email already exists");
  }

  const now = new Date().toISOString();
  const passwordRecord = createPasswordRecord(input.password);
  const user = {
    id: crypto.randomUUID(),
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    roles: normalizeRoles(input.roles),
    status: "active" as const,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
    createdAt: now,
    updatedAt: now,
  };

  await repo.saveUser(user);
  return toOperatorAccount(user);
}

export async function updateOperatorAccount(
  accountId: string,
  input: UpdateOperatorAccountRequest,
): Promise<OperatorAccount | null> {
  const repo = await getAuthRepository();
  const existing = await repo.getUserById(accountId);
  if (!existing) {
    return null;
  }

  if (input.email && input.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
    const duplicate = await repo.getUserByEmail(input.email);
    if (duplicate && duplicate.id !== accountId) {
      throw new Error("An operator account with that email already exists");
    }
  }

  const nextPasswordRecord = input.password ? createPasswordRecord(input.password) : null;
  const updatedUser = {
    ...existing,
    email: input.email?.trim().toLowerCase() || existing.email,
    displayName: input.displayName?.trim() || existing.displayName,
    roles: input.roles ? normalizeRoles(input.roles) : existing.roles,
    status: input.status || existing.status,
    passwordHash: nextPasswordRecord?.hash || existing.passwordHash,
    passwordSalt: nextPasswordRecord?.salt || existing.passwordSalt,
    updatedAt: new Date().toISOString(),
  };

  await repo.saveUser(updatedUser);

  if ((input.status && input.status !== "active") || nextPasswordRecord) {
    await repo.revokeSessionsForUser(accountId);
  }

  return toOperatorAccount(updatedUser);
}
