import crypto from "node:crypto";
import OpenAI from "openai";
import { GradeLevel } from "@prisma/client";
import { config } from "../config.js";
import { redis } from "../redis.js";
import { GRADE_LABELS } from "../utils/complexity.js";

const openai = config.openAiApiKey
  ? new OpenAI({ apiKey: config.openAiApiKey })
  : null;

const groqClient = config.groqApiKey
  ? new OpenAI({
      apiKey: config.groqApiKey,
      baseURL: "https://api.groq.com/openai/v1"
    })
  : null;

function hashPayload(payload: string): string {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function getCached(key: string): Promise<string | null> {
  if (!redis) return null;
  return redis.get(key);
}

async function setCached(key: string, value: string): Promise<void> {
  if (!redis) return;
  await redis.set(key, value, "EX", 60 * 60 * 24);
}

async function askLlm(prompt: string, jsonMode = true): Promise<string> {
  const cacheKey = `ia:${hashPayload(prompt)}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  if (openai) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      messages: [{ role: "user", content: prompt }]
    });

    const output = response.choices[0]?.message?.content ?? "{}";
    await setCached(cacheKey, output);
    return output;
  }

  if (groqClient) {
    const response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }]
    });
    const output = response.choices[0]?.message?.content ?? "{}";
    await setCached(cacheKey, output);
    return output;
  }

  return JSON.stringify({
    summary:
      "Não consegui acessar a IA agora, mas já identifiquei o tema para continuar estudando com calma. ??",
    guide: "Modo offline: revise os conceitos principais em blocos curtos de 10 minutos.",
    mermaid: "flowchart LR\nA[Leia o enunciado] --> B[Identifique palavras-chave] --> C[Resolva passo a passo]",
    references: ["Material didático da escola", "Khan Academy Brasil"],
    imagePrompt: "Ilustração educativa infantil"
  });
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function generateStudyMaterials(params: {
  text: string;
  childName: string;
  gradeLevel: GradeLevel;
  hobbies: string[];
  subject: string;
}): Promise<{
  summary: string;
  guide: string;
  mermaid: string;
  references: string[];
  imagePrompt: string;
}> {
  const gradeLabel = GRADE_LABELS[params.gradeLevel];
  const prompt = `Você é tutor educacional infantil. Retorne JSON com chaves summary, guide, mermaid, references, imagePrompt.
Regras:
- summary em portugues, maximo 200 palavras, lúdico, com emojis, analogias do dia a dia.
- personalize com hobbies: ${params.hobbies.join(", ") || "sem hobbies"}.
- guide passo a passo com seções curtas.
- mermaid deve ser um fluxograma válido.
- references lista de 3 a 5 referências.
Contexto:
- nome: ${params.childName}
- série: ${gradeLabel}
- matéria: ${params.subject}
Conteúdo extraído:
${params.text.slice(0, 10000)}
`;

  const parsed = safeJson(
    await askLlm(prompt),
    {
      summary: "Resumo indisponível no momento.",
      guide: "Guia indisponível no momento.",
      mermaid: "flowchart LR\nA[Início] --> B[Estudo]",
      references: ["Khan Academy"],
      imagePrompt: "Ilustração educativa"
    }
  );

  return parsed;
}

export async function generateQuiz(params: {
  text: string;
  subject: string;
  gradeLabel: string;
  questionCount: number;
}): Promise<
  Array<{
    question: string;
    options: string[];
    correctOption: number;
    explanation: string;
  }>
> {
  const prompt = `Gere um teste em JSON com chave questions (array) para ${params.subject}, ${params.gradeLabel}.
- ${params.questionCount} questões de múltipla escolha.
- Cada item com question, options(4), correctOption (0-3), explanation.
- Linguagem simples.
Conteúdo base:
${params.text.slice(0, 8000)}
`;

  const parsed = safeJson(await askLlm(prompt), { questions: [] as Array<{ question: string; options: string[]; correctOption: number; explanation: string }> });
  return (parsed.questions ?? []).slice(0, params.questionCount);
}

export async function classifyTopicComplexity(params: {
  text: string;
  gradeLabel: string;
}): Promise<"BASICO" | "MEDIO" | "AVANCADO"> {
  const prompt = `Classifique o nível de complexidade em BASICO, MEDIO ou AVANCADO baseado no texto e na série (${params.gradeLabel}). Retorne JSON {"complexity":"..."}.
Texto:
${params.text.slice(0, 4000)}
`;
  const parsed = safeJson(await askLlm(prompt), { complexity: "MEDIO" });
  if (["BASICO", "MEDIO", "AVANCADO"].includes(parsed.complexity)) {
    return parsed.complexity;
  }
  return "MEDIO";
}

export async function generateImageFromPrompt(prompt: string): Promise<string | null> {
  if (!openai) return null;
  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });
    return response.data?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

export async function createEmbedding(text: string): Promise<number[]> {
  if (!openai) return [];
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 4000)
  });
  return response.data[0]?.embedding ?? [];
}