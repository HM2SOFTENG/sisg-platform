export type SubmissionStatus = "new" | "reviewed" | "responded";

export interface IntakeSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface IntakeSummary {
  total: number;
  newCount: number;
  reviewedCount: number;
  respondedCount: number;
}

