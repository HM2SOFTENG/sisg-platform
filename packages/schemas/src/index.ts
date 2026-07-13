import { z } from "zod";

export const sisgRoleSchema = z.enum(["admin", "operator", "manager", "analyst", "viewer"]);
export const authUserStatusSchema = z.enum(["active", "disabled"]);

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(sisgRoleSchema).default(["viewer"]),
  status: authUserStatusSchema.default("active"),
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  tokenType: z.literal("Bearer"),
  roles: z.array(sisgRoleSchema).default(["viewer"]),
  user: authUserSchema,
});

export const loginRequestSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1),
});

export const loginResponseSchema = authSessionSchema.extend({
  success: z.literal(true),
});

export const authStatusSchema = z.discriminatedUnion("authenticated", [
  z.object({
    authenticated: z.literal(false),
  }),
  authSessionSchema.extend({
    authenticated: z.literal(true),
  }),
]);

export const refreshSessionRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([jsonPrimitiveSchema, z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

const reservedStorageKeys = new Set(["id", "createdAt", "updatedAt"]);

export const storageMutationPayloadSchema = z
  .record(z.string().min(1), jsonValueSchema)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .refine((value) => Object.keys(value).every((key) => !reservedStorageKeys.has(key)), {
    message: "Reserved fields cannot be supplied",
  });

export const userPostCreateRequestSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const userPostLikeToggleRequestSchema = z.object({
  userId: z.string().trim().min(1).max(200),
});

export const operatorAccountSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(sisgRoleSchema).default(["viewer"]),
  status: authUserStatusSchema.default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
  lastLoginAt: z.string().datetime().nullable(),
});

export const createOperatorAccountRequestSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  password: z.string().min(8),
  roles: z.array(sisgRoleSchema).default(["viewer"]),
});

export const updateOperatorAccountRequestSchema = z
  .object({
    email: z.string().email().optional(),
    displayName: z.string().min(1).optional(),
    password: z.string().min(8).optional(),
    roles: z.array(sisgRoleSchema).optional(),
    status: authUserStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const dashboardSummarySchema = z.object({
  submissions: z.number().int().nonnegative(),
  contracts: z.number().int().nonnegative(),
  team: z.number().int().nonnegative(),
  projects: z.number().int().nonnegative(),
  marketing: z.number().int().nonnegative(),
  partnerships: z.number().int().nonnegative(),
  content: z.number().int().nonnegative(),
  activity: z.number().int().nonnegative(),
  activeProjects: z.number().int().nonnegative(),
  contractsTotal: z.number().nonnegative(),
});
