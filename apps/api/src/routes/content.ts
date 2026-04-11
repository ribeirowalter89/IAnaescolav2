import fs from "node:fs/promises";
import path from "node:path";
import { GradeLevel } from "@prisma/client";
import { Router } from "express";
import mime from "mime-types";
import multer from "multer";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import {
  classifyTopicComplexity,
  generateImageFromPrompt,
  generateQuiz,
  generateStudyMaterials
} from "../services/aiService.js";
import { extractText } from "../services/contentExtractor.js";
import { generateSuggestions } from "../services/recommendationService.js";
import { GRADE_LABELS, inferComplexityByGrade } from "../utils/complexity.js";

const storage = multer.diskStorage({
  destination: async (_req, file, cb) => {
    try {
      await fs.mkdir(config.uploadDir, { recursive: true });
      cb(null, config.uploadDir);
    } catch (error) {
      cb(error as Error, config.uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = mime.extension(file.mimetype) || path.extname(file.originalname) || "bin";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

async function ensureChildAccess(childId: string, guardianId: string): Promise<boolean> {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [{ guardianId }, { guardianAccess: { some: { guardianId } } }]
    }
  });
  return Boolean(child);
}

export const contentRouter = Router();
contentRouter.use(requireAuth);

contentRouter.post("/process", upload.single("file"), async (req, res) => {
  const { childId, subjectId } = req.body as { childId?: string; subjectId?: string };

  if (!req.file || !childId || !subjectId) {
    res.status(400).json({ message: "Arquivo, criança e matéria são obrigatórios." });
    return;
  }

  const hasAccess = await ensureChildAccess(childId, req.auth!.guardianId);
  if (!hasAccess) {
    res.status(403).json({ message: "Sem acesso a essa criança." });
    return;
  }

  const child = await prisma.child.findUnique({ where: { id: childId } });
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!child || !subject) {
    res.status(404).json({ message: "Criança ou matéria não encontrada." });
    return;
  }

  const folderPath = path.join(config.uploadDir, child.id, subject.folderPath.replace(/\//g, path.sep));
  await fs.mkdir(folderPath, { recursive: true });

  const finalPath = path.join(folderPath, req.file.filename);
  await fs.rename(req.file.path, finalPath);

  const extractedText = await extractText(finalPath, req.file.mimetype);
  const hasText = extractedText.trim().length > 0;
  const fallbackText = hasText
    ? extractedText
    : "Arquivo sem texto detectável. A criança deve revisar manualmente e complementar com fotos mais nítidas.";

  const guidePack = await generateStudyMaterials({
    text: fallbackText,
    childName: child.name,
    gradeLevel: child.gradeLevel,
    hobbies: child.hobbies,
    subject: subject.name
  });

  const aiComplexity = hasText
    ? await classifyTopicComplexity({ text: fallbackText, gradeLabel: GRADE_LABELS[child.gradeLevel as GradeLevel] })
    : inferComplexityByGrade(child.gradeLevel);

  const imageUrl = await generateImageFromPrompt(guidePack.imagePrompt);

  const content = await prisma.uploadedContent.create({
    data: {
      childId,
      subjectId,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      filePath: finalPath,
      extractedText: fallbackText,
      complexityLevel: aiComplexity,
      summaryForKid: guidePack.summary,
      detailedGuide: guidePack.guide,
      mermaidFlowchart: guidePack.mermaid,
      generatedImageUrl: imageUrl,
      referencesJson: guidePack.references,
      rawAiResponseJson: guidePack
    }
  });

  const quizQuestions = await generateQuiz({
    text: fallbackText,
    subject: subject.name,
    gradeLabel: GRADE_LABELS[child.gradeLevel],
    questionCount: 10
  });

  if (quizQuestions.length) {
    await prisma.quizQuestion.createMany({
      data: quizQuestions.map((q) => ({
        uploadedContentId: content.id,
        question: q.question,
        options: q.options,
        correctOption: q.correctOption,
        explanation: q.explanation
      }))
    });
  }

  const suggestions = await generateSuggestions({
    topic: subject.name,
    gradeLabel: GRADE_LABELS[child.gradeLevel],
    subject: subject.name
  });

  if (suggestions.length) {
    await prisma.recommendation.createMany({
      data: suggestions.map((item) => ({
        uploadedContentId: content.id,
        type: item.type,
        title: item.title,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        relevanceScore: item.relevanceScore,
        source: item.source
      }))
    });
  }

  res.status(201).json({
    contentId: content.id,
    hadExtractedText: hasText
  });
});

contentRouter.get("/child/:childId", async (req, res) => {
  const hasAccess = await ensureChildAccess(req.params.childId, req.auth!.guardianId);
  if (!hasAccess) {
    res.status(403).json({ message: "Sem acesso." });
    return;
  }

  const contents = await prisma.uploadedContent.findMany({
    where: { childId: req.params.childId },
    include: {
      subject: true,
      recommendations: { orderBy: { relevanceScore: "desc" } },
      quizQuestions: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ contents });
});

contentRouter.get("/:contentId", async (req, res) => {
  const content = await prisma.uploadedContent.findUnique({
    where: { id: req.params.contentId },
    include: {
      child: true,
      subject: true,
      quizQuestions: true,
      recommendations: { orderBy: { relevanceScore: "desc" } }
    }
  });

  if (!content) {
    res.status(404).json({ message: "Conteúdo não encontrado." });
    return;
  }

  const hasAccess = await ensureChildAccess(content.childId, req.auth!.guardianId);
  if (!hasAccess) {
    res.status(403).json({ message: "Sem acesso." });
    return;
  }

  res.json({ content });
});

contentRouter.post("/:contentId/more-details", async (req, res) => {
  const content = await prisma.uploadedContent.findUnique({
    where: { id: req.params.contentId },
    include: { child: true, subject: true }
  });

  if (!content) {
    res.status(404).json({ message: "Conteúdo não encontrado." });
    return;
  }

  const hasAccess = await ensureChildAccess(content.childId, req.auth!.guardianId);
  if (!hasAccess) {
    res.status(403).json({ message: "Sem acesso." });
    return;
  }

  const detail = await generateStudyMaterials({
    text: `${content.extractedText}\n\nAprofunde com referências bibliográficas e 3 mini quizzes.`,
    childName: content.child.name,
    gradeLevel: content.child.gradeLevel,
    hobbies: content.child.hobbies,
    subject: content.subject.name
  });

  res.json({
    details: detail.guide,
    references: detail.references,
    miniQuiz: await generateQuiz({
      text: content.extractedText,
      subject: content.subject.name,
      gradeLabel: GRADE_LABELS[content.child.gradeLevel],
      questionCount: 3
    })
  });
});