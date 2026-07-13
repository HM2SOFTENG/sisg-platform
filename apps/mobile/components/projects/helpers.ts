import { formatCompactCurrency } from "@sisg/utils";

import type {
  ProjectDetailData,
  ProjectHealth,
  ProjectListItem,
  ProjectsSummary,
  ProjectStatus,
} from "./types";

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", options).format(new Date(value));
}

export function formatShortDate(value: string): string {
  return formatDate(value, {
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(value: string): string {
  return formatDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getProjectStatusTone(status: ProjectStatus): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} {
  switch (status) {
    case "Active":
      return {
        backgroundColor: "rgba(16, 185, 129, 0.16)",
        borderColor: "rgba(16, 185, 129, 0.36)",
        textColor: "#6ee7b7",
      };
    case "Mobilizing":
      return {
        backgroundColor: "rgba(34, 211, 238, 0.16)",
        borderColor: "rgba(34, 211, 238, 0.36)",
        textColor: "#67e8f9",
      };
    case "Closing":
      return {
        backgroundColor: "rgba(37, 99, 235, 0.18)",
        borderColor: "rgba(37, 99, 235, 0.4)",
        textColor: "#93c5fd",
      };
    case "Delayed":
      return {
        backgroundColor: "rgba(239, 68, 68, 0.16)",
        borderColor: "rgba(239, 68, 68, 0.38)",
        textColor: "#fca5a5",
      };
    case "Planning":
    default:
      return {
        backgroundColor: "rgba(148, 163, 184, 0.12)",
        borderColor: "rgba(148, 163, 184, 0.24)",
        textColor: "#cbd5e1",
      };
  }
}

export function getProjectHealthTone(health: ProjectHealth): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} {
  switch (health) {
    case "On Track":
      return {
        backgroundColor: "rgba(16, 185, 129, 0.16)",
        borderColor: "rgba(16, 185, 129, 0.38)",
        textColor: "#6ee7b7",
      };
    case "Watch":
      return {
        backgroundColor: "rgba(245, 158, 11, 0.16)",
        borderColor: "rgba(245, 158, 11, 0.38)",
        textColor: "#fcd34d",
      };
    case "Critical":
      return {
        backgroundColor: "rgba(239, 68, 68, 0.16)",
        borderColor: "rgba(239, 68, 68, 0.38)",
        textColor: "#fca5a5",
      };
    case "At Risk":
    default:
      return {
        backgroundColor: "rgba(251, 113, 133, 0.16)",
        borderColor: "rgba(251, 113, 133, 0.38)",
        textColor: "#fda4af",
      };
  }
}

export function getProjectsSummary(projects: ProjectListItem[]): ProjectsSummary {
  const revenueInFlight = projects.reduce((sum, project) => sum + project.revenue, 0);
  const averageProgressPercent =
    projects.length === 0
      ? 0
      : Math.round(
          projects.reduce((sum, project) => sum + project.progressPercent, 0) / projects.length,
        );
  const staffingFillPercent =
    projects.length === 0
      ? 0
      : Math.round(
          projects.reduce((sum, project) => sum + project.staffingFillPercent, 0) / projects.length,
        );

  return {
    activeProjects: projects.filter((project) => project.status === "Active").length,
    criticalProjects: projects.filter(
      (project) => project.health === "Critical" || project.health === "At Risk",
    ).length,
    averageProgressPercent,
    revenueInFlight,
    staffingFillPercent,
    closingSoon: projects.filter((project) => project.status === "Closing").length,
  };
}

export function formatProjectRevenue(project: ProjectListItem | ProjectDetailData): string {
  return formatCompactCurrency(project.revenue);
}
