"use client";

/**
 * NeuroMap — RadarChart de Duval
 * Visualiza as 4 dimensões da TRRS em um gráfico de teia elegante.
 * Usa Recharts com design "Clean Academic" (Slate-900 + Indigo-600).
 */

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DuvalMetrics, RadarDataPoint } from "@/app/types/neuromap";

interface DuvalRadarChartProps {
  metrics: DuvalMetrics;
}

/** Converte o objeto de métricas em array de pontos para o Recharts */
function metricsToRadarData(metrics: DuvalMetrics): RadarDataPoint[] {
  return [
    { category: "Assimilação", value: metrics.assimilacao, fullMark: 4 },
    { category: "Tratamento",  value: metrics.tratamento,  fullMark: 4 },
    { category: "Conversão",   value: metrics.conversao,   fullMark: 4 },
    { category: "Coordenação", value: metrics.coordenacao, fullMark: 4 },
  ];
}

// Tooltip customizado para exibir nível e label descritivo
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarDataPoint }> }) {
  if (!active || !payload?.length) return null;
  const { category, value } = payload[0].payload;
  const labels: Record<number, string> = { 1: "Insuficiente", 2: "Regular", 3: "Bom", 4: "Ótimo" };
  return (
    <div className="bg-slate-800 border border-indigo-500/40 rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-indigo-300 font-semibold">{category}</p>
      <p className="text-white">
        Nível {value} — <span className="text-indigo-400">{labels[value]}</span>
      </p>
    </div>
  );
}

export default function DuvalRadarChart({ metrics }: DuvalRadarChartProps) {
  const data = metricsToRadarData(metrics);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid
          stroke="#334155"        /* slate-700 */
          strokeDasharray="3 3"
        />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }} /* slate-400 */
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 4]}
          tickCount={5}
          tick={{ fill: "#475569", fontSize: 10 }} /* slate-600 */
          axisLine={false}
        />
        <Radar
          name="Duval"
          dataKey="value"
          stroke="#6366f1"          /* indigo-500 */
          fill="#6366f1"
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }}
          activeDot={{ fill: "#818cf8", r: 6, stroke: "#c7d2fe", strokeWidth: 2 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
