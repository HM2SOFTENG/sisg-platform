const LOCAL_DEV_FALLBACK_API_KEY = "clawbot-sisg-2026";

function isProductionLike(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getClawbotApiKey(): string {
  const configured = process.env.CLAWBOT_API_KEY?.trim();
  if (configured) {
    return configured;
  }

  if (isProductionLike()) {
    throw new Error("CLAWBOT_API_KEY must be configured in production");
  }

  return LOCAL_DEV_FALLBACK_API_KEY;
}

export function hasConfiguredClawbotApiKey(): boolean {
  return Boolean(process.env.CLAWBOT_API_KEY?.trim());
}

export function validateClawbotApiKey(input: unknown): boolean {
  return typeof input === "string" && input === getClawbotApiKey();
}
