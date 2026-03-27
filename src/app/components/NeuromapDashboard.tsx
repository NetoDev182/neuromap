"use client";

/**
 * NeuroMap — Dashboard Principal (Versão Dinâmica)
 * Busca dados reais da API /api/analyze via polling.
 */

import { useState, useEffect, useCallback } from "react";
import DuvalRadarChart from "@/app/components/DuvalRadarChart";
import DiagnosisCard from "@/app/components/DiagnosisCard";
import { DiagnosisResult } from "@/app/types/neuromap";
import type { DiagnosisRecord } from "@/app/api/analyze/route";

// Converte DiagnosisRecord (API) → DiagnosisResult (componentes)
function toResult(r: DiagnosisRecord): DiagnosisResult {
  return {
    success: true,
    studentEmail: r.studentEmail,
    timestamp: r.timestamp,
    metrics: r.metrics,
    insight: r.insight,
  };
}

// Placeholder enquanto não há dados
function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl">
        🧠
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-100 mb-2">Aguardando primeira análise</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          Envie uma resposta pelo Google Forms. Assim que o aluno submeter, o diagnóstico
          aparecerá aqui automaticamente.
        </p>
      </div>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Verificar agora
      </button>
    </div>
  );
}

export default function NeuromapDashboard() {
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [pollingActive, setPollingActive] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/analyze", { cache: "no-store" });
      const json = await res.json();
      if (json.records && json.records.length > 0) {
        setRecords(json.records.reverse()); // mais recentes primeiro
        setActiveIndex(0);
      }
      setLastFetch(new Date());
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling automático a cada 15s enquanto não há dados, 60s depois
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (pollingActive) fetchData();
    }, records.length === 0 ? 15000 : 60000);
    return () => clearInterval(interval);
  }, [fetchData, pollingActive, records.length]);

  function handleGeneratePDF() {
    setIsGeneratingPDF(true);
    setTimeout(() => setIsGeneratingPDF(false), 2000);
  }

  const activeData = records.length > 0 ? toResult(records[activeIndex]) : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">

      {/* ══ Header ══ */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-indigo-600 rounded-lg rotate-6 opacity-60" />
              <div className="relative w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="3" fill="white" />
                  <path d="M10 2L10 5M10 15L10 18M2 10L5 10M15 10L18 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M4.5 4.5L6.7 6.7M13.3 13.3L15.5 15.5M4.5 15.5L6.7 13.3M13.3 6.7L15.5 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">NeuroMap</h1>
              <p className="text-xs text-indigo-400 font-medium leading-none mt-0.5">Diagnóstico por Teoria de Duval</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status de polling */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-1.5 h-1.5 rounded-full ${pollingActive ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
              {lastFetch ? `Atualizado ${lastFetch.toLocaleTimeString("pt-BR")}` : "Aguardando..."}
            </div>

            {/* Botão Atualizar */}
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Atualizar dados"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Botão PDF */}
            <button
              id="btn-generate-pdf"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF || !activeData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-900/40"
            >
              {isGeneratingPDF ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Gerando...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Gerar PDF</>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin w-10 h-10 text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-slate-400 text-sm">Carregando diagnósticos...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && records.length === 0 && (
          <EmptyState onRefresh={fetchData} />
        )}

        {/* Dashboard com dados */}
        {!loading && activeData && (
          <>
            {/* Seletor de submissão quando há múltiplos registros */}
            {records.length > 1 && (
              <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Submissões:</span>
                {records.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveIndex(i)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      i === activeIndex
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500/50"
                    }`}
                  >
                    {r.questionTitle?.substring(0, 25) || `Envio ${i + 1}`}
                    <span className="ml-1.5 text-slate-500 font-normal">
                      {new Date(r.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Título */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <span>Dashboard</span><span>›</span>
                <span className="text-slate-400">Análise Individual</span><span>›</span>
                <span className="text-indigo-400 font-medium">{activeData.studentEmail}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-1">Perfil de Aprendizagem Duval</h2>
              <p className="text-slate-400 text-sm max-w-xl">
                Diagnóstico das 4 categorias da TRRS extraídas automaticamente via análise de IA
                {records[activeIndex]?.questionTitle && (
                  <> — questão: <span className="text-indigo-400">"{records[activeIndex].questionTitle.substring(0, 50)}"</span></>
                )}
              </p>
            </div>

            {/* Grid: Radar + Card */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              <div className="lg:col-span-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-100">Gráfico de Teia — TRRS</h3>
                  <span className="text-xs px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded-full border border-indigo-700/40 font-medium">Duval 4D</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Escala de 1 (Insuficiente) a 4 (Ótimo) por dimensão</p>
                <DuvalRadarChart metrics={activeData.metrics} />
                <div className="flex flex-wrap gap-3 justify-center mt-4 pt-4 border-t border-slate-700/40">
                  {[{ n: 1, label: "Insuficiente", color: "#ef4444" }, { n: 2, label: "Regular", color: "#f59e0b" }, { n: 3, label: "Bom", color: "#3b82f6" }, { n: 4, label: "Ótimo", color: "#22c55e" }].map(({ n, label, color }) => (
                    <div key={n} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      N{n} — {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-100">Diagnóstico da IA</h3>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Análise real" />
                </div>
                <DiagnosisCard metrics={activeData.metrics} insight={activeData.insight} studentEmail={activeData.studentEmail} timestamp={activeData.timestamp} />
              </div>
            </div>

            {/* Cards de métricas rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {([
                { key: "assimilacao", label: "Assimilação", icon: "🔍" },
                { key: "tratamento",  label: "Tratamento",  icon: "🔧" },
                { key: "conversao",   label: "Conversão",   icon: "↔️" },
                { key: "coordenacao", label: "Coordenação", icon: "🧠" },
              ] as const).map(({ key, label, icon }) => {
                const level = activeData.metrics[key];
                const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
                const labels = ["", "Insuficiente", "Regular", "Bom", "Ótimo"];
                return (
                  <div key={key} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2 hover:border-indigo-500/40 transition-colors">
                    <span className="text-2xl">{icon}</span>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-3xl font-black leading-none" style={{ color: colors[level] }}>
                      {level}<span className="text-sm text-slate-500 font-medium">/4</span>
                    </p>
                    <p className="text-xs font-semibold" style={{ color: colors[level] }}>{labels[level]}</p>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
              <p>Metodologia: <span className="text-slate-500 font-medium">Duval, R. (2009). Semiósis e Pensamento Humano.</span></p>
              <p className="text-slate-700">NeuroMap MVP v0.2 · {records.length} análise(s) carregada(s)</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
