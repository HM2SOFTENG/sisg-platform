export type ProfileSettingKind = "navigation" | "status";

export type ProfileActivityTone = "default" | "positive" | "warning";

export interface ProfileOperator {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  baseLabel: string;
  shiftLabel: string;
  statusLabel: string;
  completionPercent: number;
  summary: string;
}

export interface ProfileStat {
  id: string;
  label: string;
  value: string;
}

export interface ProfileSettingItem {
  id: string;
  label: string;
  description: string;
  valueLabel: string;
  kind: ProfileSettingKind;
}

export interface ProfileSettingSection {
  id: string;
  title: string;
  items: ProfileSettingItem[];
}

export interface ProfileActivityItem {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone?: ProfileActivityTone;
}
