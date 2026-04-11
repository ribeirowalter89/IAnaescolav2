import { Router } from "express";
import * as yup from "yup";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { generateQuiz } from "../services/aiService.js";
import { generateSuggestions } from "../services/recommendationService.js";
import { GRADE_LABELS } from "../utils/complexity.js";

const generateSchema = yup.object({
  contentId: yup.string().required(),
  questionCount: yup.number().min(5).max(50).required()
});

const submitSchema = yup.object({
  contentId: yup.string().required(),
  answers: yup.array().of(yup.number().min(0).max(3).required()).required()
});

export const testsRouter = Router();
testsRouter.use(requireAuth);

async function ensureChildAccess(childId: string, guardianId: string): Promise<boolean> {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [{ guardianId }, { guardianAccess: { some: { guardianId } } }]
    }
  });
  return Boolean(child);
}

testsRouter.post("/generate", async (req, res) => {
  try {
    const payload = await generateSchema.validate(req.body, { abortEarly: false });
    const content = await prisma.uploadedContent.findUnique({
      where: { id: payload.contentId },
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

    const existing = await prisma.quizQuestion.findMany({
      where: { uploadedContentId: payload.contentId },
      take: payload.questionCount
    });

    let questions = existing;
    if (existing.length < payload.questionCount) {
      const generated = await generateQuiz({
        text: content.extractedText,
        subject: content.subject.name,
        gradeLabel: GRADE_LABELS[content.child.gradeLevel],
        questionCount: payload.questionCount
      });

      await prisma.quizQuestion.deleteMany({ where: { uploadedContentId: payload.contentId } });
      await prisma.quizQuestion.createMany({
        data: generated.map((item) => ({
          uploadedContentId: payload.contentId,
          question: item.question,
          options: item.options,
          correctOption: item.correctOption,
          explanation: item.explanation
        }))
      });

      questions = await prisma.quizQuestion.findMany({
        where: { uploadedContentId: payload.contentId },
        take: payload.questionCount
      });
    }

    res.json({
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options
      }))
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      return;
    }
    throw error;
  }
});

testsRouter.post("/submit", async (req, res) => {
  try {
    const payload = await submitSchema.validate(req.body, { abortEarly: false });
    const content = await prisma.uploadedContent.findUnique({
      where: { id: payload.contentId },
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

    const questions = await prisma.quizQuestion.findMany({ where: { uploadedContentId: payload.contentId } });
    const limited = questions.slice(0, payload.answers.length);

    const feedback = limited.map((q, index) => {
      const selected = payload.answers[index];
      const correct = selected === q.correctOption;
      return {
        question: q.question,
        selected,
        correctOption: q.correctOption,
        correct,
        explanation: q.explanation,
        reason: correct
          ? "Resposta correta com bom raciocínio!"
          : `Resposta incorreta: ${q.explanation}`
      };
    });

    const correctCount = feedback.filter((f) => f.correct).length;
    const scorePercent = Number(((correctCount / Math.max(feedback.length, 1)) * 100).toFixed(2));

    const wrongTopics = feedback
      .filter((f) => !f.correct)
      .map((f) => f.question)
      .slice(0, 3)
      .join("; ");

    const remediation = wrongTopics
      ? await generateSuggestions({
          topic: wrongTopics,
          gradeLabel: GRADE_LABELS[content.child.gradeLevel],
          subject: content.subject.name
        })
      : [];

    await prisma.testSession.create({
      data: {
        childId: content.childId,
        uploadedContentId: content.id,
        totalQuestions: feedback.length,
        scorePercent,
        answersJson: payload.answers,
        feedbackJson: feedback
      }
    });

    res.json({
      scorePercent,
      feedback,
      remediation
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      return;
    }
    throw error;
  }
});