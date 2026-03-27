/**
 * NeuroMap - API Route: /api/analyze
 * POST: recebe do Apps Script, analisa com DeepSeek, salva na memória
 * GET:  retorna os últimos diagnósticos para o Dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// ---------- Tipos ----------
interface AnalyzeRequest {
  studentEmail?: string;
  fileId: string;    // ID real do arquivo
  driveToken: string; // Token OAuth do Apps Script
  questionTitle?: string;
  timestamp: string;
}

interface DuvalMetrics {
  assimilacao: number;
  tratamento: number;
  conversao: number;
  coordenacao: number;
}

export interface DiagnosisRecord {
  id: string;
  studentEmail: string;
  questionTitle: string;
  timestamp: string;
  metrics: DuvalMetrics;
  insight: string;
}

// ---------- In-memory store (MVP sem banco de dados) ----------
// Em produção, substitua por: Supabase, Prisma, Vercel KV, etc.
// Este store persiste enquanto a instância serverless estiver ativa.
declare global {
  // eslint-disable-next-line no-var
  var __neuromapStore: DiagnosisRecord[];
}
if (!global.__neuromapStore) global.__neuromapStore = [];

// ---------- System Prompt Duval ----------
const DUVAL_SYSTEM_PROMPT = `Você é um PhD em Educação Matemática especialista na Teoria de Representação Semiótica de Raymond Duval (TRRS).
Analise a imagem da resolução do aluno e identifique o desempenho em 4 categorias:
1. Assimilação - compreensão inicial do enunciado e identificação do que é pedido
2. Tratamento - manipulação de representações dentro de um mesmo registro semiótico
3. Conversão - transformação entre diferentes registros de representação (algébrico ↔ gráfico ↔ tabular)
4. Coordenação - articulação simultânea de múltiplos registros para resolver o problema

Atribua notas de 1 (Insuficiente) a 4 (Ótimo) para cada categoria com base nas evidências visíveis.
Responda ESTRITAMENTE em JSON válido, sem texto adicional:
{"metrics": {"assimilacao": N, "tratamento": N, "conversao": N, "coordenacao": N}, "insight": "string com diagnóstico pedagógico em português"}`;

// ---------- GET: retorna diagnósticos salvos ----------
export async function GET() {
  const records = global.__neuromapStore;
  return NextResponse.json({
    count: records.length,
    records: records.slice(-20), // últimos 20
  });
}

// ---------- POST: processa nova submissão ----------
export async function POST(request: NextRequest) {
  const body: AnalyzeRequest = await request.json();
  const { fileId, driveToken, timestamp } = body;
  const studentEmail = body.studentEmail || "anonimo@aluno.com";
  const questionTitle = body.questionTitle || "Sem título";

  if (!fileId || !driveToken) {
    return NextResponse.json({ error: "fileId e driveToken são obrigatórios" }, { status: 400 });
  }

  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  // ── Se não tiver API key, retorna diagnóstico simulado (útil para testes) ──
  if (!deepseekApiKey) {
    console.warn("[NeuroMap] DEEPSEEK_API_KEY não configurada — retornando diagnóstico simulado.");
    const mock: DiagnosisRecord = {
      id: Date.now().toString(),
      studentEmail,
      questionTitle,
      timestamp,
      metrics: { assimilacao: 3, tratamento: 2, conversao: 1, coordenacao: 2 },
      insight:
        "⚠️ Diagnóstico simulado (API key ausente). Configure DEEPSEEK_API_KEY na Vercel para análise real.",
    };
    global.__neuromapStore.push(mock);
    return NextResponse.json({ success: true, ...mock });
  }

  try {
    console.log(`[NeuroMap] Analisando: ${studentEmail} | ${questionTitle}`);

    // Etapa 1: Download seguro e direto pela Google Drive API
    // Vantagem: Ignora limite de Vercel de 4.5MB e não muda permissões públicas
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const imageResponse = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { 
        Authorization: `Bearer ${driveToken}`,
        Accept: "image/*" 
      },
    });

    // Etapa 2: Converte para Base64 no backend (a Vercel suporta até 50MB aqui)
    const base64Image = Buffer.from(imageResponse.data as ArrayBuffer).toString("base64");
    const mimeType = (imageResponse.headers["content-type"] as string) || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Etapa 3: Chamada DeepSeek Vision
    const deepseekResponse = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-vl2",
        messages: [
          { role: "system", content: DUVAL_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              {
                type: "text",
                text: `Questão: "${questionTitle}"\n\nAnalise a resolução acima segundo a Teoria de Duval e retorne o JSON de diagnóstico.`,
              },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 45000,
      }
    );

    // Etapa 4: Parse da resposta
    const rawContent: string = deepseekResponse.data.choices[0].message.content;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Resposta inesperada do DeepSeek: ${rawContent}`);
    const diagnosis = JSON.parse(jsonMatch[0]);

    // Etapa 5: Salvar no store
    const record: DiagnosisRecord = {
      id: Date.now().toString(),
      studentEmail,
      questionTitle,
      timestamp,
      metrics: diagnosis.metrics,
      insight: diagnosis.insight,
    };
    global.__neuromapStore.push(record);
    console.log("[NeuroMap] Salvo:", record.id);

    return NextResponse.json({ success: true, ...record });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[NeuroMap] Erro:", message);

    // Retorna 200 com erro descrito para o Apps Script poder registrar na planilha
    return NextResponse.json(
      { success: false, error: message, metrics: null, insight: null },
      { status: 200 } // 200 propositalmente para o Apps Script reconhecer
    );
  }
}
