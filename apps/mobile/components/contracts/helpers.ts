import { formatCompactCurrency } from "@sisg/utils";

import type {
  ContractDetailData,
  ContractHealth,
  ContractListItem,
  ContractStage,
  ContractsSummary,
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

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getStageTone(stage: ContractStage): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} {
  switch (stage) {
    case "Active":
      return {
        backgroundColor: "rgba(16, 185, 129, 0.16)",
        borderColor: "rgba(16, 185, 129, 0.4)",
        textColor: "#6ee7b7",
      };
    case "Signature":
      return {
        backgroundColor: "rgba(34, 211, 238, 0.16)",
        borderColor: "rgba(34, 211, 238, 0.36)",
        textColor: "#67e8f9",
      };
    case "Negotiation":
      return {
        backgroundColor: "rgba(37, 99, 235, 0.18)",
        borderColor: "rgba(37, 99, 235, 0.42)",
        textColor: "#93c5fd",
      };
    case "Review":
      return {
        backgroundColor: "rgba(245, 158, 11, 0.16)",
        borderColor: "rgba(245, 158, 11, 0.38)",
        textColor: "#fcd34d",
      };
    case "Intake":
    default:
      return {
        backgroundColor: "rgba(148, 163, 184, 0.14)",
        borderColor: "rgba(148, 163, 184, 0.32)",
        textColor: "#cbd5e1",
      };
  }
}

export function getHealthTone(health: ContractHealth): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} {
  switch (health) {
    case "On Track":
      return {
        backgroundColor: "rgba(16, 185, 129, 0.16)",
        borderColor: "rgba(16, 185, 129, 0.4)",
        textColor: "#6ee7b7",
      };
    case "Watch":
      return {
        backgroundColor: "rgba(245, 158, 11, 0.16)",
        borderColor: "rgba(245, 158, 11, 0.38)",
        textColor: "#fcd34d",
      };
    case "Blocked":
      return {
        backgroundColor: "rgba(239, 68, 68, 0.16)",
        borderColor: "rgba(239, 68, 68, 0.4)",
        textColor: "#fca5a5",
      };
    case "At Risk":
    default:
      return {
        backgroundColor: "rgba(251, 113, 133, 0.18)",
        borderColor: "rgba(251, 113, 133, 0.42)",
        textColor: "#fda4af",
      };
  }
}

export function getContractsSummary(contracts: ContractListItem[]): ContractsSummary {
  const pipelineValue = contracts.reduce((sum, contract) => sum + contract.totalValue, 0);
  const securedValue = contracts.reduce((sum, contract) => sum + contract.securedValue, 0);
  const liveContracts = contracts.filter((contract) => contract.stage === "Active").length;
  const signaturesPending = contracts.filter((contract) => contract.stage === "Signature").length;
  const atRiskCount = contracts.filter(
    (contract) => contract.health === "At Risk" || contract.health === "Blocked",
  ).length;
  const averageCycleDays =
    contracts.length === 0
      ? 0
      : Math.round(
          contracts.reduce((sum, contract) => {
            return sum + (contract.salesCycleDays ?? 45);
          }, 0) / contracts.length,
        );

  return {
    liveContracts,
    signaturesPending,
    atRiskCount,
    pipelineValue,
    securedValue,
    averageCycleDays,
  };
}

export function formatContractValue(contract: ContractListItem | ContractDetailData): string {
  return formatCompactCurrency(contract.totalValue);
}
