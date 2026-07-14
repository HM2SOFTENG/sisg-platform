import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let baseUrl = "";
let server: { close: (cb: (err?: Error | null) => void) => void } | null = null;
const originalCwd = process.cwd();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sisg-smoke-"));

async function api(pathname: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  let body: any = null;
  const raw = await response.text();
  body = raw ? JSON.parse(raw) : null;
  return { response, body };
}

before(async () => {
  process.chdir(tempDir);
  process.env.NODE_ENV = "test";
  process.env.AUTH_BOOTSTRAP_EMAIL = "admin@example.com";
  process.env.AUTH_BOOTSTRAP_PASSWORD = "TestPass123!";
  delete process.env.DATABASE_URL;
  delete process.env.SLACK_ALERTS_WEBHOOK;
  delete process.env.SLACK_FORMS_WEBHOOK;
  delete process.env.SLACK_ACTIVITY_WEBHOOK;
  delete process.env.SLACK_DEPLOYMENTS_WEBHOOK;

  const [{ buildApp }, { ensureBootstrapAdmin }, { ensurePublicContentSeeds }] = await Promise.all([
    import("./app.ts"),
    import("./services/auth-store.ts"),
    import("./services/public-content-seeds.ts"),
  ]);

  await ensureBootstrapAdmin();
  ensurePublicContentSeeds();

  const built = buildApp({ includeStatic: false });
  server = built.server;

  await new Promise<void>((resolve) => {
    built.server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = built.server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind smoke test server");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((err) => (err ? reject(err) : resolve()));
  });
  process.chdir(originalCwd);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("contact form rejects invalid payloads", async () => {
  const { response, body } = await api("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Brian" }),
  });

  assert.equal(response.status, 400);
  assert.match(body.error, /Missing required fields/);
});

test("contact form persists successful submissions", async () => {
  const { response, body } = await api("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Brian",
      email: "brian@example.com",
      phone: "555-0100",
      org: "SISG",
      subject: "Platform review",
      message: "Need follow-up on remediation status.",
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  const submissions = JSON.parse(fs.readFileSync(path.join(tempDir, "data", "submissions.json"), "utf8"));
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].subject, "Platform review");
});

test("public content feeds are seeded and available", async () => {
  const [projects, team] = await Promise.all([
    api("/api/public/projects"),
    api("/api/public/team"),
  ]);

  assert.equal(projects.response.status, 200);
  assert.equal(team.response.status, 200);
  assert.ok(Array.isArray(projects.body));
  assert.ok(Array.isArray(team.body));
  assert.ok(projects.body.length >= 3);
  assert.ok(team.body.length >= 3);
});

test("admin auth and dashboard API contracts succeed", async () => {
  const login = await api("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "TestPass123!" }),
  });

  assert.equal(login.response.status, 200);
  assert.equal(login.body.success, true);
  assert.ok(login.body.accessToken);

  const headers = { Authorization: `Bearer ${login.body.accessToken}` };
  const [verify, financials, config] = await Promise.all([
    api("/api/admin/verify", { headers }),
    api("/api/admin/financials", { headers }),
    api("/api/admin/config", { headers }),
  ]);

  assert.equal(verify.response.status, 200);
  assert.equal(verify.body.authenticated, true);
  assert.equal(financials.response.status, 200);
  assert.equal(typeof financials.body.totalRevenue, "number");
  assert.ok(Array.isArray(financials.body.monthlyData));
  assert.equal(config.response.status, 200);
  assert.equal(config.body.companyName, "SISG Platform");
});
