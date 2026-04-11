import { GradeLevel } from "@prisma/client";
import { Router } from "express";
import * as yup from "yup";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

const childSchema = yup.object({
  name: yup.string().min(2).required(),
  age: yup.number().min(5).max(18).required(),
  gradeLevel: yup.mixed<GradeLevel>().oneOf(Object.values(GradeLevel)).required(),
  subjectIds: yup.array().of(yup.string().required()).min(1).required(),
  hobbies: yup.array().of(yup.string().required()).default([])
});

const shareSchema = yup.object({
  guardianEmail: yup.string().email().required(),
  role: yup.string().default("SECUNDARIO")
});

export const childrenRouter = Router();
childrenRouter.use(requireAuth);

childrenRouter.get("/subjects", async (_req, res) => {
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  res.json({ subjects });
});

childrenRouter.get("/", async (req, res) => {
  const guardianId = req.auth!.guardianId;
  const children = await prisma.child.findMany({
    where: {
      OR: [
        { guardianId },
        { guardianAccess: { some: { guardianId } } }
      ]
    },
    include: {
      subjects: { include: { subject: true } },
      guardian: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json({ children });
});

childrenRouter.post("/", async (req, res) => {
  try {
    const payload = await childSchema.validate(req.body, { abortEarly: false });
    const child = await prisma.child.create({
      data: {
        guardianId: req.auth!.guardianId,
        name: payload.name,
        age: payload.age,
        gradeLevel: payload.gradeLevel,
        hobbies: payload.hobbies,
        subjects: {
          create: payload.subjectIds.map((subjectId) => ({ subjectId }))
        },
        guardianAccess: {
          create: [{ guardianId: req.auth!.guardianId, role: "PRINCIPAL" }]
        }
      },
      include: { subjects: { include: { subject: true } } }
    });

    res.status(201).json({ child });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ message: "Dados da criança inválidos.", errors: error.errors });
      return;
    }
    throw error;
  }
});

childrenRouter.put("/:childId", async (req, res) => {
  try {
    const payload = await childSchema.validate(req.body, { abortEarly: false });
    const child = await prisma.child.findFirst({
      where: {
        id: req.params.childId,
        OR: [
          { guardianId: req.auth!.guardianId },
          { guardianAccess: { some: { guardianId: req.auth!.guardianId } } }
        ]
      }
    });

    if (!child) {
      res.status(404).json({ message: "Criança não encontrada." });
      return;
    }

    const updated = await prisma.child.update({
      where: { id: req.params.childId },
      data: {
        name: payload.name,
        age: payload.age,
        gradeLevel: payload.gradeLevel,
        hobbies: payload.hobbies,
        subjects: {
          deleteMany: {},
          create: payload.subjectIds.map((subjectId) => ({ subjectId }))
        }
      },
      include: { subjects: { include: { subject: true } } }
    });

    res.json({ child: updated });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ message: "Dados da criança inválidos.", errors: error.errors });
      return;
    }
    throw error;
  }
});

childrenRouter.post("/:childId/share", async (req, res) => {
  try {
    const payload = await shareSchema.validate(req.body);

    const child = await prisma.child.findFirst({
      where: { id: req.params.childId, guardianId: req.auth!.guardianId }
    });

    if (!child) {
      res.status(403).json({ message: "Apenas o responsável principal pode compartilhar." });
      return;
    }

    const secondary = await prisma.guardian.findUnique({ where: { email: payload.guardianEmail.toLowerCase() } });
    if (!secondary) {
      res.status(404).json({ message: "Responsável secundário não encontrado." });
      return;
    }

    await prisma.childGuardian.upsert({
      where: { childId_guardianId: { childId: child.id, guardianId: secondary.id } },
      update: { role: payload.role },
      create: { childId: child.id, guardianId: secondary.id, role: payload.role }
    });

    res.json({ message: "Acesso compartilhado com sucesso." });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      return;
    }
    throw error;
  }
});