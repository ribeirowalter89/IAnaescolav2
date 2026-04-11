export type JwtPayload = {
  guardianId: string;
  email: string;
};

export type Question = {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
};