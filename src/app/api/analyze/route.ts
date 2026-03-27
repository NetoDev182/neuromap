/**
 * NeuroMap - API Route: /api/analyze
 * "O Cérebro" — recebe o POST do Google Apps Script,
 * baixa a imagem, converte em Base64 e chama o DeepSeek Vision.
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// ---------- Tipos de contrato ----------
interface AnalyzeRequest {
  studentEmail: string;
  imageUrl: string;
  timestamp: string;
}

interface DuvalMetrics {
  assimilacao: number;  // 1-4
  tratamento: number;
  conversao: number;
  coordenacao: number;
}

interface DeepSeekResponse {
  metrics: DuvalMetrics;
  insight: string;
}

// ---------- System Prompt da Teoria de Duval ----------
const DUVAL_SYSTEM_PROMPT = `Você é um PhD em Educação Matemática especialista na Teoria de Representação Semiótica de Raymond Duval (TRRS). 
Analise a imagem da resolução do aluno e identifique o desempenho em 4 categorias:
1. Assimilação - compreensão inicial do enunciado e identificação do que é pedido
2. Tratamento - manipulação de representações dentro de um mesmo registro semiótico
3. Conversão - transformação entre diferentes registros de representação (algébrico ↔ gráfico ↔ tabular)
4. Coordenação - articulação simultânea de múltiplos registros para resolver o problema

Atribua notas de 1 (Insuficiente) a 4 (Ótimo) para cada categoria com base nas evidências visíveis.
Responda ESTRITAMENTE em JSON válido, sem texto adicional:
{"metrics": {"assimilacao": N, "tratamento": N, "conversao": N, "coordenacao": N}, "insight": "string com diagnóstico pedagógico em português"}`;

// ---------- Handler principal ----------
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { studentEmail, imageUrl, timestamp } = body;

    if (!imageUrl || !studentEmail) {
      return NextResponse.json(
        { error: "imageUrl e studentEmail são obrigatórios" },
        { status: 400 }
      );
    }

    console.log(`[NeuroMap] Analisando submissão de ${studentEmail} às ${timestamp}`);

    // -------------------------------------------------------
    // ETAPA 1: Download da imagem como buffer binário
    // O arraybuffer é necessário para processar o binário bruto
    // da imagem antes de convertê-lo em Base64 para a API Vision.
    // -------------------------------------------------------
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "Accept": "image/*" },
    });

    // -------------------------------------------------------
    // ETAPA 2: Conversão Buffer → Base64
    // Buffer.from() aceita ArrayBuffer diretamente e .toString("base64")
    // produz a string que a API Vision espera no campo image_url.
    // -------------------------------------------------------
    const base64Image = Buffer.from(imageResponse.data as ArrayBuffer).toString("base64");
    const mimeType = (imageResponse.headers["content-type"] as string) || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // -------------------------------------------------------
    // ETAPA 3: Chamada à API DeepSeek Vision
    // O modelo suporta mensagens multimodais: texto + imagem.
    // A imagem é enviada como data URL base64 no content array.
    // -------------------------------------------------------
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      throw new Error("DEEPSEEK_API_KEY não configurada nas variáveis de ambiente");
    }

    const deepseekResponse = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-vision",
        messages: [
          {
            role: "system",
            content: DUVAL_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: "Analise esta resolução matemática segundo a Teoria de Duval e retorne o JSON de diagnóstico.",
              },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.2, // Baixa temperatura para respostas mais determinísticas/consistentes
      },
      {
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    // -------------------------------------------------------
    // ETAPA 4: Parse da resposta do modelo
    // O modelo retorna um JSON como string no campo content.
    // Fazemos parse seguro para garantir o contrato de dados.
    // -------------------------------------------------------
    const rawContent: string = deepseekResponse.data.choices[0].message.content;
    
    // Extrai o JSON mesmo que o modelo inclua markdown (```json ... ```)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Resposta inesperada do DeepSeek: ${rawContent}`);
    }
    
    const diagnosis: DeepSeekResponse = JSON.parse(jsonMatch[0]);

    // -------------------------------------------------------
    // ETAPA 5: Persistência (simulada com log estruturado)
    // Em produção, substitua por: await db.save({ studentEmail, timestamp, diagnosis })
    // -------------------------------------------------------
    console.log("[NeuroMap] [DB-MOCK] Diagnóstico salvo:", JSON.stringify({
      studentEmail,
      timestamp,
      metrics: diagnosis.metrics,
      insight: diagnosis.insight,
    }));

    return NextResponse.json({
      success: true,
      studentEmail,
      timestamp,
      ...diagnosis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[NeuroMap] Erro na análise:", message);

    return NextResponse.json(
      { error: "Falha na análise NeuroMap", details: message },
      { status: 500 }
    );
  }
}
