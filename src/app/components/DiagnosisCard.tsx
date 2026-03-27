"use client";

/**
 * NeuroMap — Card de Diagnóstico da IA
 * Exibe o insight e os níveis individuais com cores dinâmicas por nível Duval.
 */

import { DuvalMetrics, LEVEL_CONFIG } from "@/app/types/neuromap";

interface DiagnosisCardProps {
  metrics: DuvalMetrics;
  insight: string;
  studentEmail: string;
  timestamp: string;
}

const CATEGORY_LABELS: Record<keyof DuvalMetrics, string> = {
  assimilacao: "Assimilação",
  tratamento: "Tratamento",
  conversao: "Conversão",
  coordenacao: "Coordenação",
};

const CATEGORY_DESCRIPTIONS: Record<keyof DuvalMetrics, string> = {
  assimilacao: "Leitura e compreensão do enunciado",
  tratamento:  "Operações dentro de um mesmo registro",
  conversao:   "Mudança entre registros semióticos",
  coordenacao: "Articulação de múltiplos registros",
};

/** Badge colorido de nível Duval */
function LevelBadge({ level }: { level: number }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg}`}
      style={{ color: cfg.color }}
    >
      N{level} — {cfg.label}
    </span>
  );
}

/** Barra de progresso de nível (1-4) */
function LevelBar({ level }: { level: number }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
  const pct = (level / 4) * 100;
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: cfg.color }}
      />
    </div>
  );
}

export default function DiagnosisCard({
  metrics,
  insight,
  studentEmail,
  timestamp,
}: DiagnosisCardProps) {
  const categories = Object.keys(CATEGORY_LABELS) as Array<keyof DuvalMetrics>;
  const avg = (
    (metrics.assimilacao + metrics.tratamento + metrics.conversao + metrics.coordenacao) / 4
  ).toFixed(1);

  const avgLevel = Math.round(Number(avg));
  const avgCfg = LEVEL_CONFIG[avgLevel] || LEVEL_CONFIG[1];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header: aluno + timestamp ── */}
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Aluno</p>
        <p className="text-slate-100 font-semibold truncate">{studentEmail}</p>
        <p className="text-xs text-slate-500">
          {new Date(timestamp).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>

      {/* ── Média geral ── */}
      <div
        className={`rounded-xl border px-4 py-3 flex items-center justify-between ${avgCfg.bg}`}
      >
        <span className="text-sm font-medium text-slate-300">Média Duval</span>
        <span className="text-2xl font-black" style={{ color: avgCfg.color }}>
          {avg} <span className="text-sm font-medium">/4</span>
        </span>
      </div>

      {/* ── Métricas individuais ── */}
      <div className="flex flex-col gap-3">
        {categories.map((key) => {
          const level = metrics[key];
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{CATEGORY_LABELS[key]}</p>
                  <p className="text-xs text-slate-500">{CATEGORY_DESCRIPTIONS[key]}</p>
                </div>
                <LevelBadge level={level} />
              </div>
              <LevelBar level={level} />
            </div>
          );
        })}
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-slate-700/60" />

      {/* ── Insight da IA ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            ✦ Insight NeuroMap
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}
