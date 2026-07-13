import { useEffect, useMemo, useState } from "react";
import { IntakeSurface, type IntakeSubmission, type IntakeSummary, type SubmissionStatus } from "../../components/intake";
import { useAuth } from "../../lib/auth";
import { fetchIntakeSubmissions, updateIntakeSubmissionStatus } from "../../lib/intake-submissions";

const emptySummary: IntakeSummary = {
  total: 0,
  newCount: 0,
  reviewedCount: 0,
  respondedCount: 0,
};

export default function IntakeRoute() {
  const { apiBaseUrl, session } = useAuth();
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSubmissions() {
      if (!session) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const nextSubmissions = await fetchIntakeSubmissions({
          baseUrl: apiBaseUrl,
          session,
        });

        if (!cancelled) {
          setSubmissions(nextSubmissions);
        }
      } catch (error) {
        if (!cancelled) {
          setSubmissions([]);
          setErrorMessage(error instanceof Error ? error.message : "Failed to load submissions");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSubmissions();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, reloadKey, session]);

  const summary = useMemo<IntakeSummary>(() => {
    return {
      total: submissions.length,
      newCount: submissions.filter((submission) => submission.status === "new").length,
      reviewedCount: submissions.filter((submission) => submission.status === "reviewed").length,
      respondedCount: submissions.filter((submission) => submission.status === "responded").length,
    };
  }, [submissions]);

  async function handleUpdateStatus(submissionId: string, status: SubmissionStatus) {
    if (!session) {
      return;
    }

    setUpdatingId(submissionId);
    setErrorMessage(null);

    try {
      const updated = await updateIntakeSubmissionStatus(submissionId, status, {
        baseUrl: apiBaseUrl,
        session,
      });

      setSubmissions((current) =>
        current.map((submission) => (submission.id === submissionId ? updated : submission)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update submission");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <IntakeSurface
      submissions={submissions}
      summary={summary || emptySummary}
      isLoading={loading}
      isUpdating={updatingId}
      errorMessage={errorMessage}
      onRefresh={() => {
        setLoading(true);
        setReloadKey((current) => current + 1);
      }}
      onUpdateStatus={handleUpdateStatus}
    />
  );
}

