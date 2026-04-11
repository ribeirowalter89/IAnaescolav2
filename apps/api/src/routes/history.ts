import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const historyRouter = Router();
historyRouter.use(requireAuth);

async function ensureChildAccess(childId: string, guardianId: string): Promise<boolean> {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [{ guardianId }, { guardianAccess: { some: { guardianId } } }]
    }
  });
  return Boolean(child);
}

historyRouter.get("/:childId", async (req, res) => {
  const childId = req.params.childId;

  const hasAccess = await ensureChildAccess(childId, req.auth!.guardianId);
  if (!hasAccess) {
    res.status(403).json({ message: "Sem acesso." });
    return;
  }

  const sessions = await prisma.testSession.findMany({
    where: { childId },
    include: { uploadedContent: { include: { subject: true } } },
    orderBy: { createdAt: "asc" }
  });

  const progression = sessions.map((item) => ({
    date: item.createdAt,
    scorePercent: item.scorePercent,
    subject: item.uploadedContent.subject.name
  }));

  const average = sessions.length
    ? Number((sessions.reduce((acc, item) => acc + item.scorePercent, 0) / sessions.length).toFixed(2))
    : 0;

  res.json({
    sessions,
    progression,
    metrics: {
      totalTests: sessions.length,
      averageScore: average,
      bestScore: sessions.length ? Math.max(...sessions.map((s) => s.scorePercent)) : 0
    }
  });
});