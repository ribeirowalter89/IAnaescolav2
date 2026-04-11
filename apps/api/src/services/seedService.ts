import { prisma } from "../prisma.js";

const subjects = [
  { name: "Português", folderPath: "linguagens/portugues" },
  { name: "Matemática", folderPath: "exatas/matematica" },
  { name: "Ciências", folderPath: "naturais/ciencias" },
  { name: "História", folderPath: "humanas/historia" },
  { name: "Geografia", folderPath: "humanas/geografia" },
  { name: "Inglês", folderPath: "linguagens/ingles" },
  { name: "Física", folderPath: "exatas/fisica" },
  { name: "Química", folderPath: "exatas/quimica" },
  { name: "Biologia", folderPath: "naturais/biologia" }
];

export async function ensureSubjects(): Promise<void> {
  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { name: subject.name },
      update: { folderPath: subject.folderPath },
      create: subject
    });
  }
}