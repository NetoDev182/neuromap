import type { Metadata } from "next";
import NeuromapDashboard from "@/app/components/NeuromapDashboard";

export const metadata: Metadata = {
  title: "NeuroMap — Diagnóstico Matemático por Teoria de Duval",
  description:
    "Sistema de diagnóstico de erros matemáticos baseado na Teoria de Representação Semiótica de Raymond Duval, com análise de IA via DeepSeek Vision.",
};

export default function Home() {
  return <NeuromapDashboard />;
}
