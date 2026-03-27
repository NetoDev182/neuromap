"use client";

/**
 * NeuroMap — Dashboard Principal
 * "O Rosto" — visualiza as métricas Duval com Radar Chart + Card de Diagnóstico.
 * Design: Clean Academic (Slate-900 + Indigo-600).
 */

import { useState } from "react";
import DuvalRadarChart from "@/app/components/DuvalRadarChart";
import DiagnosisCard from "@/app/components/DiagnosisCard";
import { DiagnosisResult } from "@/app/types/neuromap";

// ── Dados de demonstração (substitua por fetch real em produção) ─────────────
const DEMO_DATA: DiagnosisResult = {
  success: true,
  studentEmail: "ana.silva@escola.edu.br",
  timestamp: new Date().toISOString(),
  metrics: {
    assimilacao: 3,
    tratamento: 2,
    conversao: 1,
    coordenacao: 2,
  },
  insight:
    "O aluno demonstra boa compreensão inicial do enunciado (assimilação nível 3), mas apresenta dificuldade crítica na conversão entre registros semióticos. Recomenda-se trabalhar com representações algébricas e gráficas de forma integrada, especialmente em atividades que exijam transição entre tabelas e expressões algébricas.",
};

export default function NeuromapDashboard() {
  const [data] = useState<DiagnosisResult>(DEMO_DATA);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  /** Simula geração de PDF com feedback visual */
  function handleGeneratePDF() {
    setIsGeneratingPDF(true);
    // Em produção: chamar biblioteca como jsPDF ou puppeteer
    setTimeout(() => setIsGeneratingPDF(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">

      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-indigo-600 rounded-lg rotate-6 opacity-60" />
              <div className="relative w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="3" fill="white" />
                  <path d="M10 2 L10 5M10 15 L10 18M2 10 L5 10M15 10 L18 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M4.5 4.5 L6.7 6.7M13.3 13.3 L15.5 15.5M4.5 15.5 L6.7 13.3M13.3 6.7 L15.5 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">
                NeuroMap
              </h1>
              <p className="text-xs text-indigo-400 font-medium leading-none mt-0.5">
                Diagnóstico por Teoria de Duval
              </p>
            </div>
          </div>

          {/* Botão Gerar PDF */}
          <button
            id="btn-generate-pdf"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
              bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200 shadow-lg shadow-indigo-900/40
              focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900
            "
          >
            {isGeneratingPDF ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gerando PDF...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Gerar PDF de Evolução
              </>
            )}
          </button>
        </div>
      </header>

      {/* ══ Conteúdo Principal ══════════════════════════════════════════════ */}
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Breadcrumb / Metadado ── */}
        <div className="flex items-center gap-2 mb-8 text-xs text-slate-500">
          <span>Dashboard</span>
          <span>›</span>
          <span className="text-slate-400">Análise Individual</span>
          <span>›</span>
          <span className="text-indigo-400 font-medium">{data.studentEmail}</span>
        </div>

        {/* ── Título da seção ── */}
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-white mb-1">
            Perfil de Aprendizagem Duval
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Visualização das 4 categorias da Teoria de Representação Semiótica (TRRS) 
            extraídas automaticamente via análise de IA da resolução manuscrita.
          </p>
        </div>

        {/* ── Grid principal: Radar + Card ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">

          {/* Radar Chart — 3 colunas */}
          <div className="lg:col-span-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-100">Gráfico de Teia — TRRS</h3>
              <span className="text-xs px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded-full border border-indigo-700/40 font-medium">
                Duval 4D
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Escala de 1 (Insuficiente) a 4 (Ótimo) por dimensão
            </p>
            <DuvalRadarChart metrics={data.metrics} />

            {/* Legenda de níveis */}
            <div className="flex flex-wrap gap-3 justify-center mt-4 pt-4 border-t border-slate-700/40">
              {[
                { n: 1, label: "Insuficiente", color: "#ef4444" },
                { n: 2, label: "Regular", color: "#f59e0b" },
                { n: 3, label: "Bom", color: "#3b82f6" },
                { n: 4, label: "Ótimo", color: "#22c55e" },
              ].map(({ n, label, color }) => (
                <div key={n} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  N{n} — {label}
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis Card — 2 colunas */}
          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100">Diagnóstico da IA</h3>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Análise concluída" />
            </div>
            <DiagnosisCard
              metrics={data.metrics}
              insight={data.insight}
              studentEmail={data.studentEmail}
              timestamp={data.timestamp}
            />
          </div>
        </div>

        {/* ── Cards de referência rápida ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {(
            [
              { key: "assimilacao", label: "Assimilação",  icon: "🔍" },
              { key: "tratamento",  label: "Tratamento",   icon: "🔧" },
              { key: "conversao",   label: "Conversão",    icon: "↔️" },
              { key: "coordenacao", label: "Coordenação",  icon: "🧠" },
            ] as const
          ).map(({ key, label, icon }) => {
            const level = data.metrics[key];
            const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
            const labels = ["", "Insuficiente", "Regular", "Bom", "Ótimo"];
            return (
              <div
                key={key}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2 hover:border-indigo-500/40 transition-colors duration-200"
              >
                <span className="text-2xl">{icon}</span>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <p
                  className="text-3xl font-black leading-none"
                  style={{ color: colors[level] }}
                >
                  {level}
                  <span className="text-sm text-slate-500 font-medium">/4</span>
                </p>
                <p className="text-xs font-semibold" style={{ color: colors[level] }}>
                  {labels[level]}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Footer de referência teórica ── */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
          <p>
            Metodologia baseada em{" "}
            <span className="text-slate-500 font-medium">
              Duval, R. (2009). Semiósis e Pensamento Humano.
            </span>
          </p>
          <p className="text-slate-700">
            NeuroMap MVP v0.1 · Diagnóstico por DeepSeek Vision
          </p>
        </div>
      </main>
    </div>
  );
}
