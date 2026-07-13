import type { AuthSession } from "@sisg/types";
import type { IntakeSubmission, SubmissionStatus } from "../components/intake";

type RequestOptions = {
  baseUrl: string;
  session: AuthSession;
};

async function requestJson(path: string, options: RequestOptions, init?: RequestInit): Promise<any> {
  const url = new URL(path, options.baseUrl.endsWith("/") ? options.baseUrl : options.baseUrl + "/").toString();
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.session.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchIntakeSubmissions(options: RequestOptions): Promise<IntakeSubmission[]> {
  const payload = await requestJson("/api/admin/submissions", options);
  const submissions = Array.isArray(payload) ? payload : [];

  return submissions
    .map((submission: any) => ({
      id: String(submission.id),
      name: submission.name || "Unknown sender",
      email: submission.email || "",
      phone: submission.phone || null,
      subject: submission.subject || "No subject",
      message: submission.message || "",
      status: normalizeStatus(submission.status),
      createdAt: submission.createdAt || submission.date || new Date().toISOString(),
      updatedAt: submission.updatedAt || null,
    }))
    .sort((a: IntakeSubmission, b: IntakeSubmission) =>
      (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt),
    );
}

export async function updateIntakeSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  options: RequestOptions,
): Promise<IntakeSubmission> {
  const payload = await requestJson(`/api/admin/submissions/${submissionId}`, options, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

  return {
    id: String(payload.id),
    name: payload.name || "Unknown sender",
    email: payload.email || "",
    phone: payload.phone || null,
    subject: payload.subject || "No subject",
    message: payload.message || "",
    status: normalizeStatus(payload.status),
    createdAt: payload.createdAt || payload.date || new Date().toISOString(),
    updatedAt: payload.updatedAt || null,
  };
}

function normalizeStatus(value: unknown): SubmissionStatus {
  if (value === "reviewed" || value === "responded") {
    return value;
  }
  return "new";
}

