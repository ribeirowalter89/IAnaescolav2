export function sanitizeCpf(rawCpf: string): string {
  return rawCpf.replace(/\D/g, "");
}

export function isValidCpf(rawCpf: string): boolean {
  const cpf = sanitizeCpf(rawCpf);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  const calcCheck = (base: string, factor: number): number => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor;
      factor -= 1;
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calcCheck(cpf.substring(0, 9), 10);
  const d2 = calcCheck(cpf.substring(0, 10), 11);

  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}