import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import type { AuthUser, AuthUserStatus, SisgRole } from "@sisg/types";

const DATA_DIR = path.resolve(process.cwd(), "data");
const USERS_PATH = path.join(DATA_DIR, "auth_users.json");
const SESSIONS_PATH = path.join(DATA_DIR, "auth_sessions.json");

type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  roles: SisgRole[];
  status: AuthUserStatus;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
};

type StoredSession = {
  id: string;
  userId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  issuedAt: string;
  rotatedAt?: string;
  revokedAt?: string;
  replacedBySessionId?: string;
  userAgent?: string;
  ip?: string;
};

type NewSessionRecord = {
  userId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  issuedAt: string;
  userAgent?: string;
  ip?: string;
};

type AuthRepository = {
  initialize(): Promise<void>;
  getUserByEmail(email: string): Promise<StoredUser | null>;
  getUserById(id: string): Promise<StoredUser | null>;
  listUsers(): Promise<StoredUser[]>;
  saveUser(user: StoredUser): Promise<void>;
  createSession(record: NewSessionRecord): Promise<StoredSession>;
  getSessionByAccessTokenHash(hash: string): Promise<StoredSession | null>;
  getSessionByRefreshTokenHash(hash: string): Promise<StoredSession | null>;
  revokeSession(sessionId: string): Promise<void>;
  revokeSessionsForUser(userId: string): Promise<void>;
  replaceSession(sessionId: string, nextSessionId: string): Promise<void>;
  touchUserLogin(userId: string, at: string): Promise<void>;
  deleteExpiredSessions(nowIso: string): Promise<void>;
};

function normalizeUserStatus(input: unknown): AuthUserStatus {
  return input === "disabled" ? "disabled" : "active";
}

export function normalizeRoles(input: unknown): SisgRole[] {
  const allowed = new Set<SisgRole>(["admin", "operator", "manager", "analyst", "viewer"]);
  if (!Array.isArray(input)) {
    return ["viewer"];
  }

  const roles = input.filter((role): role is SisgRole => typeof role === "string" && allowed.has(role as SisgRole));
  return roles.length ? roles : ["viewer"];
}

function normalizeStoredUser(user: Omit<StoredUser, "status" | "roles"> & { status?: unknown; roles?: unknown }): StoredUser {
  return {
    ...user,
    roles: normalizeRoles(user.roles),
    status: normalizeUserStatus(user.status),
  };
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}

function writeJsonFile<T>(filePath: string, value: T[]): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

class FileAuthRepository implements AuthRepository {
  async initialize(): Promise<void> {
    ensureDataDir();
    if (!fs.existsSync(USERS_PATH)) {
      writeJsonFile(USERS_PATH, []);
    }
    if (!fs.existsSync(SESSIONS_PATH)) {
      writeJsonFile(SESSIONS_PATH, []);
    }
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const user = readJsonFile<StoredUser>(USERS_PATH).find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase(),
    );
    return user ? normalizeStoredUser(user) : null;
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    const user = readJsonFile<StoredUser>(USERS_PATH).find((entry) => entry.id === id);
    return user ? normalizeStoredUser(user) : null;
  }

  async listUsers(): Promise<StoredUser[]> {
    return readJsonFile<StoredUser>(USERS_PATH).map((user) => normalizeStoredUser(user));
  }

  async saveUser(user: StoredUser): Promise<void> {
    const users = readJsonFile<StoredUser>(USERS_PATH);
    const index = users.findIndex((entry) => entry.id === user.id);
    const normalizedUser = normalizeStoredUser(user);
    if (index === -1) {
      users.push(normalizedUser);
    } else {
      users[index] = normalizedUser;
    }
    writeJsonFile(USERS_PATH, users);
  }

  async createSession(record: NewSessionRecord): Promise<StoredSession> {
    const sessions = readJsonFile<StoredSession>(SESSIONS_PATH);
    const session: StoredSession = {
      id: crypto.randomUUID(),
      ...record,
    };
    sessions.push(session);
    writeJsonFile(SESSIONS_PATH, sessions);
    return session;
  }

  async getSessionByAccessTokenHash(hash: string): Promise<StoredSession | null> {
    return readJsonFile<StoredSession>(SESSIONS_PATH).find(
      (session) => session.accessTokenHash === hash,
    ) || null;
  }

  async getSessionByRefreshTokenHash(hash: string): Promise<StoredSession | null> {
    return readJsonFile<StoredSession>(SESSIONS_PATH).find(
      (session) => session.refreshTokenHash === hash,
    ) || null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const sessions = readJsonFile<StoredSession>(SESSIONS_PATH).map((session) =>
      session.id === sessionId ? { ...session, revokedAt: new Date().toISOString() } : session,
    );
    writeJsonFile(SESSIONS_PATH, sessions);
  }

  async revokeSessionsForUser(userId: string): Promise<void> {
    const sessions = readJsonFile<StoredSession>(SESSIONS_PATH).map((session) =>
      session.userId === userId ? { ...session, revokedAt: session.revokedAt || new Date().toISOString() } : session,
    );
    writeJsonFile(SESSIONS_PATH, sessions);
  }

  async replaceSession(sessionId: string, nextSessionId: string): Promise<void> {
    const sessions = readJsonFile<StoredSession>(SESSIONS_PATH).map((session) =>
      session.id === sessionId
        ? {
            ...session,
            revokedAt: session.revokedAt || new Date().toISOString(),
            rotatedAt: new Date().toISOString(),
            replacedBySessionId: nextSessionId,
          }
        : session,
    );
    writeJsonFile(SESSIONS_PATH, sessions);
  }

  async touchUserLogin(userId: string, at: string): Promise<void> {
    const users = readJsonFile<StoredUser>(USERS_PATH).map((user) =>
      user.id === userId ? { ...user, lastLoginAt: at, updatedAt: at } : user,
    );
    writeJsonFile(USERS_PATH, users);
  }

  async deleteExpiredSessions(nowIso: string): Promise<void> {
    const now = new Date(nowIso).getTime();
    const sessions = readJsonFile<StoredSession>(SESSIONS_PATH).filter((session) => {
      const refreshExpiry = new Date(session.refreshExpiresAt).getTime();
      return Number.isFinite(refreshExpiry) && refreshExpiry > now;
    });
    writeJsonFile(SESSIONS_PATH, sessions);
  }
}

class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        roles JSONB NOT NULL DEFAULT '["viewer"]'::jsonb,
        status TEXT NOT NULL DEFAULT 'active',
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ
      );
    `);

    await this.pool.query(
      "ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';",
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        access_token_hash TEXT NOT NULL UNIQUE,
        refresh_token_hash TEXT NOT NULL UNIQUE,
        access_expires_at TIMESTAMPTZ NOT NULL,
        refresh_expires_at TIMESTAMPTZ NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL,
        rotated_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        replaced_by_session_id UUID,
        user_agent TEXT,
        ip TEXT
      );
    `);

    await this.pool.query(
      "CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);",
    );
    await this.pool.query(
      "CREATE INDEX IF NOT EXISTS auth_sessions_refresh_expires_at_idx ON auth_sessions(refresh_expires_at);",
    );
  }

  private mapUser(row: any): StoredUser {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      roles: normalizeRoles(Array.isArray(row.roles) ? row.roles : ["viewer"]),
      status: normalizeUserStatus(row.status),
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined,
    };
  }

  private mapSession(row: any): StoredSession {
    return {
      id: row.id,
      userId: row.user_id,
      accessTokenHash: row.access_token_hash,
      refreshTokenHash: row.refresh_token_hash,
      accessExpiresAt: new Date(row.access_expires_at).toISOString(),
      refreshExpiresAt: new Date(row.refresh_expires_at).toISOString(),
      issuedAt: new Date(row.issued_at).toISOString(),
      rotatedAt: row.rotated_at ? new Date(row.rotated_at).toISOString() : undefined,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : undefined,
      replacedBySessionId: row.replaced_by_session_id || undefined,
      userAgent: row.user_agent || undefined,
      ip: row.ip || undefined,
    };
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const result = await this.pool.query("SELECT * FROM auth_users WHERE lower(email) = lower($1) LIMIT 1", [email]);
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    const result = await this.pool.query("SELECT * FROM auth_users WHERE id = $1 LIMIT 1", [id]);
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async listUsers(): Promise<StoredUser[]> {
    const result = await this.pool.query("SELECT * FROM auth_users ORDER BY created_at ASC");
    return result.rows.map((row: any) => this.mapUser(row));
  }

  async saveUser(user: StoredUser): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_users (
        id, email, display_name, roles, status, password_hash, password_salt, created_at, updated_at, last_login_at
      ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        roles = EXCLUDED.roles,
        status = EXCLUDED.status,
        password_hash = EXCLUDED.password_hash,
        password_salt = EXCLUDED.password_salt,
        updated_at = EXCLUDED.updated_at,
        last_login_at = EXCLUDED.last_login_at`,
      [
        user.id,
        user.email,
        user.displayName,
        JSON.stringify(user.roles),
        user.status,
        user.passwordHash,
        user.passwordSalt,
        user.createdAt,
        user.updatedAt || null,
        user.lastLoginAt || null,
      ],
    );
  }

  async createSession(record: NewSessionRecord): Promise<StoredSession> {
    const sessionId = crypto.randomUUID();
    const result = await this.pool.query(
      `INSERT INTO auth_sessions (
        id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at, issued_at, user_agent, ip
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        sessionId,
        record.userId,
        record.accessTokenHash,
        record.refreshTokenHash,
        record.accessExpiresAt,
        record.refreshExpiresAt,
        record.issuedAt,
        record.userAgent || null,
        record.ip || null,
      ],
    );
    return this.mapSession(result.rows[0]);
  }

  async getSessionByAccessTokenHash(hash: string): Promise<StoredSession | null> {
    const result = await this.pool.query(
      "SELECT * FROM auth_sessions WHERE access_token_hash = $1 LIMIT 1",
      [hash],
    );
    return result.rows[0] ? this.mapSession(result.rows[0]) : null;
  }

  async getSessionByRefreshTokenHash(hash: string): Promise<StoredSession | null> {
    const result = await this.pool.query(
      "SELECT * FROM auth_sessions WHERE refresh_token_hash = $1 LIMIT 1",
      [hash],
    );
    return result.rows[0] ? this.mapSession(result.rows[0]) : null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.pool.query(
      "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1",
      [sessionId],
    );
  }

  async revokeSessionsForUser(userId: string): Promise<void> {
    await this.pool.query(
      "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1",
      [userId],
    );
  }

  async replaceSession(sessionId: string, nextSessionId: string): Promise<void> {
    await this.pool.query(
      "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()), rotated_at = NOW(), replaced_by_session_id = $2 WHERE id = $1",
      [sessionId, nextSessionId],
    );
  }

  async touchUserLogin(userId: string, at: string): Promise<void> {
    await this.pool.query(
      "UPDATE auth_users SET last_login_at = $2, updated_at = $2 WHERE id = $1",
      [userId, at],
    );
  }

  async deleteExpiredSessions(nowIso: string): Promise<void> {
    await this.pool.query("DELETE FROM auth_sessions WHERE refresh_expires_at <= $1::timestamptz", [nowIso]);
  }
}

function buildPool(): Pool | null {
  const provider = String(process.env.DB_PROVIDER || "").trim().toLowerCase();

  if (provider && provider !== "postgres") {
    return null;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST;

  if (!databaseUrl && !dbHost) {
    return null;
  }

  const sslEnabled = String(process.env.DB_SSL || "true").toLowerCase() !== "false";
  const caPath = process.env.DATABASE_CA_CERT_PATH;
  const ssl =
    sslEnabled
      ? {
          rejectUnauthorized: true,
          ca: caPath ? fs.readFileSync(path.resolve(process.cwd(), caPath), "utf-8") : undefined,
        }
      : false;

  if (databaseUrl) {
    return new Pool({
      connectionString: databaseUrl,
      ssl,
    });
  }

  return new Pool({
    host: dbHost,
    port: Number(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
  });
}

export function isFileAuthMode(): boolean {
  const provider = String(process.env.DB_PROVIDER || "").trim().toLowerCase();
  if (provider && provider !== "postgres") {
    return true;
  }

  return !process.env.DATABASE_URL && !process.env.DB_HOST;
}

let repository: AuthRepository | null = null;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function createPasswordRecord(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    salt,
    hash: hashPassword(password, salt),
  };
}

export function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: normalizeRoles(user.roles),
    status: normalizeUserStatus(user.status),
  };
}

export async function getAuthRepository(): Promise<AuthRepository> {
  if (repository) {
    return repository;
  }

  const pool = buildPool();
  repository = pool ? new PostgresAuthRepository(pool) : new FileAuthRepository();
  await repository.initialize();
  return repository;
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const repo = await getAuthRepository();
  const bootstrapPassword = process.env.AUTH_BOOTSTRAP_PASSWORD || process.env.ADMIN_PIN;
  if (!bootstrapPassword) {
    console.warn("[AUTH] No bootstrap auth user created because AUTH_BOOTSTRAP_PASSWORD and ADMIN_PIN are unset.");
    return;
  }

  const localFileAuthMode = isFileAuthMode();

  if (!process.env.AUTH_BOOTSTRAP_PASSWORD && process.env.ADMIN_PIN) {
    if (process.env.NODE_ENV === "production" && !localFileAuthMode) {
      throw new Error("ADMIN_PIN bootstrap fallback is not allowed in production. Set AUTH_BOOTSTRAP_PASSWORD instead.");
    }
    console.warn("[AUTH] Using legacy ADMIN_PIN bootstrap fallback in local/file-auth mode. Set AUTH_BOOTSTRAP_PASSWORD to remove this fallback.");
  }

  const email = process.env.AUTH_BOOTSTRAP_EMAIL || "admin@sentinelintegratedgroup.com";
  const displayName = process.env.AUTH_BOOTSTRAP_DISPLAY_NAME || "SISG Admin";
  const passwordRecord = createPasswordRecord(bootstrapPassword);
  const now = new Date().toISOString();
  const existingBootstrapUser = await repo.getUserByEmail(email);
  const isProduction = process.env.NODE_ENV === "production" && !localFileAuthMode;

  if (existingBootstrapUser && !isProduction) {
    await repo.saveUser({
      ...existingBootstrapUser,
      email,
      displayName,
      roles: ["admin"],
      status: "active",
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      updatedAt: now,
    });

    console.warn(`[AUTH] Synchronized local bootstrap admin user for ${email}.`);
    return;
  }

  if (existingBootstrapUser) {
    return;
  }

  const users = await repo.listUsers();
  if (users.length > 0 && isProduction) {
    return;
  }

  await repo.saveUser({
    id: crypto.randomUUID(),
    email,
    displayName,
    roles: ["admin"],
    status: "active",
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
    createdAt: now,
    updatedAt: now,
  });

  console.warn(`[AUTH] Seeded bootstrap admin user for ${email}. Replace this bootstrap credential with managed operator accounts.`);
}
