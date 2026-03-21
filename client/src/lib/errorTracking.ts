/**
 * Error tracking utility for sending client-side errors to the backend
 * which then forwards them to Slack for monitoring
 */

export interface ErrorContext {
  page?: string;
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

const apiUrl = process.env.VITE_API_URL || "";

/**
 * Send an error to the backend for Slack notification
 */
export async function trackError(
  error: Error | string,
  context?: ErrorContext
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    await fetch(`${apiUrl}/api/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Frontend Error",
        message,
        context: {
          stack: stack?.substring(0, 500), // Limit stack trace length
          ...context,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
        severity: "warning",
      }),
    }).catch(() => {
      // Silently fail if error tracking fails
      console.error("Failed to track error:", message);
    });
  } catch (err) {
    console.error("Error tracking failed:", err);
  }
}

/**
 * Global error handler for uncaught errors
 */
export function setupGlobalErrorHandler(): void {
  // Handle uncaught errors
  window.addEventListener("error", (event) => {
    trackError(event.error || event.message, {
      component: "Global Error Handler",
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    trackError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      {
        component: "Unhandled Promise Rejection",
      }
    );
  });
}

/**
 * Track a custom event/activity
 */
export async function trackActivity(
  type: "form_submission" | "navigation" | "feature_use" | string,
  details?: string
): Promise<void> {
  try {
    // Could be extended to send to activity webhook
    console.log(`📊 Activity tracked: ${type}`, details);
  } catch (err) {
    console.error("Activity tracking failed:", err);
  }
}
