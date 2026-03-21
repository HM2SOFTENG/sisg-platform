import axios from "axios";

export interface SlackMessage {
  text?: string;
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
    [key: string]: any;
  }>;
  attachments?: Array<{
    color?: string;
    title?: string;
    text?: string;
    fields?: Array<{ title: string; value: string; short?: boolean }>;
    [key: string]: any;
  }>;
}

type SlackChannel = "alerts" | "forms" | "activity" | "deployments";

const getWebhookUrl = (channel: SlackChannel): string => {
  const webhooks: Record<SlackChannel, string> = {
    alerts: process.env.SLACK_ALERTS_WEBHOOK || "",
    forms: process.env.SLACK_FORMS_WEBHOOK || "",
    activity: process.env.SLACK_ACTIVITY_WEBHOOK || "",
    deployments: process.env.SLACK_DEPLOYMENTS_WEBHOOK || "",
  };

  const webhook = webhooks[channel];
  if (!webhook) {
    console.warn(
      `⚠️  Slack webhook not configured for channel: ${channel}`
    );
  }
  return webhook;
};

export const slack = {
  /**
   * Send a notification to a Slack channel
   */
  async notify(channel: SlackChannel, message: SlackMessage): Promise<void> {
    const webhookUrl = getWebhookUrl(channel);
    if (!webhookUrl) return;

    try {
      await axios.post(webhookUrl, message, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });
    } catch (error) {
      console.error(`Failed to send Slack notification to ${channel}:`, error);
      // Don't throw - we don't want notification failures to break the app
    }
  },

  /**
   * Notify about form submission
   */
  async notifyFormSubmission(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Promise<void> {
    await this.notify("forms", {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📧 New Contact Form Submission",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Name:*\n${data.name}`,
            },
            {
              type: "mrkdwn",
              text: `*Email:*\n${data.email}`,
            },
            {
              type: "mrkdwn",
              text: `*Subject:*\n${data.subject}`,
            },
            ...(data.phone
              ? [
                  {
                    type: "mrkdwn",
                    text: `*Phone:*\n${data.phone}`,
                  },
                ]
              : []),
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n${data.message}`,
          },
        },
        {
          type: "divider",
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_Submitted at: ${new Date().toLocaleString()}_`,
            },
          ],
        },
      ],
    });
  },

  /**
   * Notify about system errors/alerts
   */
  async notifyError(error: {
    title: string;
    message: string;
    severity?: "critical" | "warning" | "info";
    context?: Record<string, string>;
  }): Promise<void> {
    const severityEmoji = {
      critical: "🚨",
      warning: "⚠️",
      info: "ℹ️",
    };

    const severityColor = {
      critical: "FF0000",
      warning: "FFA500",
      info: "0099FF",
    };

    const severity = error.severity || "warning";

    await this.notify("alerts", {
      attachments: [
        {
          color: severityColor[severity],
          title: `${severityEmoji[severity]} ${error.title}`,
          text: error.message,
          fields: error.context
            ? Object.entries(error.context).map(([key, value]) => ({
                title: key,
                value: value,
                short: true,
              }))
            : undefined,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  },

  /**
   * Notify about user activity
   */
  async notifyUserActivity(activity: {
    type: "signup" | "login" | "profile_update" | "other";
    user: {
      id?: string;
      email: string;
      name?: string;
    };
    details?: string;
  }): Promise<void> {
    const activityEmoji = {
      signup: "🎉",
      login: "🔓",
      profile_update: "✏️",
      other: "📝",
    };

    await this.notify("activity", {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${activityEmoji[activity.type]} *${activity.type.replace(/_/g, " ").toUpperCase()}*`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Email:*\n${activity.user.email}`,
            },
            ...(activity.user.name
              ? [
                  {
                    type: "mrkdwn",
                    text: `*Name:*\n${activity.user.name}`,
                  },
                ]
              : []),
          ],
        },
        ...(activity.details
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Details:*\n${activity.details}`,
                },
              },
            ]
          : []),
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_${new Date().toLocaleString()}_`,
            },
          ],
        },
      ],
    });
  },

  /**
   * Notify about deployment
   */
  async notifyDeployment(deployment: {
    status: "success" | "failure";
    commit?: string;
    branch?: string;
    message?: string;
    duration?: string;
    error?: string;
  }): Promise<void> {
    const statusEmoji = deployment.status === "success" ? "✅" : "❌";
    const statusColor = deployment.status === "success" ? "36A64F" : "FF0000";

    await this.notify("deployments", {
      attachments: [
        {
          color: statusColor,
          title: `${statusEmoji} Deployment ${deployment.status.toUpperCase()}`,
          text: deployment.message,
          fields: [
            ...(deployment.branch
              ? [
                  {
                    title: "Branch",
                    value: deployment.branch,
                    short: true,
                  },
                ]
              : []),
            ...(deployment.commit
              ? [
                  {
                    title: "Commit",
                    value: deployment.commit.substring(0, 7),
                    short: true,
                  },
                ]
              : []),
            ...(deployment.duration
              ? [
                  {
                    title: "Duration",
                    value: deployment.duration,
                    short: true,
                  },
                ]
              : []),
            ...(deployment.error
              ? [
                  {
                    title: "Error",
                    value: deployment.error,
                    short: false,
                  },
                ]
              : []),
          ],
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  },
};
