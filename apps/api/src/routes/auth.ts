import bcrypt from "bcryptjs";
import { Router } from "express";
import * as yup from "yup";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/security.js";
import { isValidCpf, sanitizeCpf } from "../utils/cpf.js";
import { signToken } from "../utils/jwt.js";

const registerSchema = yup.object({
  fullName: yup.string().min(3).required(),
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
  cpf: yup.string().required(),
  phone: yup.string().min(8).required()
});

const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().required()
});

const authRateLimit = createRateLimiter(15, 15 * 60 * 1000);

export const authRouter = Router();
authRouter.use(authRateLimit);

authRouter.post("/register", async (req, res) => {
  try {
    const payload = await registerSchema.validate(req.body, { abortEarly: false });
    const cpf = sanitizeCpf(payload.cpf);

    if (!isValidCpf(cpf)) {
      res.status(400).json({ message: "CPF inválido." });
      return;
    }

    const existing = await prisma.guardian.findFirst({
      where: {
        OR: [{ email: payload.email.toLowerCase() }, { cpf }]
      }
    });

    if (existing) {
      res.status(409).json({ message: "Email ou CPF já cadastrados." });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const guardian = await prisma.guardian.create({
      data: {
        fullName: payload.fullName,
        email: payload.email.toLowerCase(),
        passwordHash,
        cpf,
        phone: payload.phone
      }
    });

    const token = signToken({ guardianId: guardian.id, email: guardian.email });
    res.status(201).json({ token, guardian: { id: guardian.id, fullName: guardian.fullName, email: guardian.email } });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      return;
    }
    throw error;
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const payload = await loginSchema.validate(req.body, { abortEarly: false });
    const guardian = await prisma.guardian.findUnique({ where: { email: payload.email.toLowerCase() } });

    if (!guardian) {
      res.status(401).json({ message: "Credenciais inválidas." });
      return;
    }

    const validPassword = await bcrypt.compare(payload.password, guardian.passwordHash);
    if (!validPassword) {
      res.status(401).json({ message: "Credenciais inválidas." });
      return;
    }

    const token = signToken({ guardianId: guardian.id, email: guardian.email });
    res.json({ token, guardian: { id: guardian.id, fullName: guardian.fullName, email: guardian.email } });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      return;
    }
    throw error;
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const guardian = await prisma.guardian.findUnique({
    where: { id: req.auth!.guardianId },
    select: { id: true, fullName: true, email: true, cpf: true, phone: true }
  });
  res.json({ guardian });
});