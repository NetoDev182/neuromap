/**
 * NeuroMap — Definições de tipos compartilhados
 */

export interface DuvalMetrics {
  assimilacao: number;  // 1-4
  tratamento: number;
  conversao: number;
  coordenacao: number;
}

export interface DiagnosisResult {
  success: boolean;
  studentEmail: string;
  timestamp: string;
  metrics: DuvalMetrics;
  insight: string;
}

/** Dados formatados para o RadarChart do Recharts */
export interface RadarDataPoint {
  category: string;
  value: number;
  fullMark: 4;
}

/** Mapeamento de nível Duval para cor e label */
export const LEVEL_CONFIG: Record<number, { color: string; label: string; bg: string }> = {
  1: { color: "#ef4444", label: "Insuficiente", bg: "bg-red-500/15 border-red-500/30" },
  2: { color: "#f59e0b", label: "Regular",      bg: "bg-amber-500/15 border-amber-500/30" },
  3: { color: "#3b82f6", label: "Bom",           bg: "bg-blue-500/15 border-blue-500/30" },
  4: { color: "#22c55e", label: "Ótimo",         bg: "bg-green-500/15 border-green-500/30" },
};
