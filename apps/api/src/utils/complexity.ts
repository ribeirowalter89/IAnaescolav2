import { ComplexityLevel, GradeLevel } from "@prisma/client";

const beginner = new Set<GradeLevel>([
  "ANO_1_FUND",
  "ANO_2_FUND",
  "ANO_3_FUND",
  "ANO_4_FUND",
  "ANO_5_FUND"
]);

const intermediate = new Set<GradeLevel>([
  "ANO_6_FUND",
  "ANO_7_FUND",
  "ANO_8_FUND",
  "ANO_9_FUND",
  "ANO_1_MEDIO"
]);

export function inferComplexityByGrade(grade: GradeLevel): ComplexityLevel {
  if (beginner.has(grade)) return "BASICO";
  if (intermediate.has(grade)) return "MEDIO";
  return "AVANCADO";
}

export const GRADE_LABELS: Record<GradeLevel, string> = {
  ANO_1_FUND: "1º ano fundamental",
  ANO_2_FUND: "2º ano fundamental",
  ANO_3_FUND: "3º ano fundamental",
  ANO_4_FUND: "4º ano fundamental",
  ANO_5_FUND: "5º ano fundamental",
  ANO_6_FUND: "6º ano fundamental",
  ANO_7_FUND: "7º ano fundamental",
  ANO_8_FUND: "8º ano fundamental",
  ANO_9_FUND: "9º ano fundamental",
  ANO_1_MEDIO: "1º ano médio",
  ANO_2_MEDIO: "2º ano médio",
  ANO_3_MEDIO: "3º ano médio"
};