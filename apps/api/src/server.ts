import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { ensureSubjects } from "./services/seedService.js";

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  await ensureSubjects();

  app.listen(config.port, () => {
    console.log(`EstudoIA Kids API online na porta ${config.port}`);
  });
}

bootstrap().catch(async (error) => {
  console.error("Falha ao iniciar API", error);
  await prisma.$disconnect();
  process.exit(1);
});