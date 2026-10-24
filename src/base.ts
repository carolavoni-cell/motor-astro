/** Peças básicas do cálculo: graus, signos e casas. */

export const SIGNOS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
] as const;

export const GLIFOS_SIGNO = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export const GRAUS = Math.PI / 180;

export function norm360(x: number): number {
  const v = x % 360;
  return v < 0 ? v + 360 : v;
}

/** Menor distância entre dois graus do zodíaco (0 a 180). */
export function distanciaAngular(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
}

export type Posicao = {
  signo: string;
  glifo: string;
  indiceSigno: number;
  grau: number;
  minuto: number;
  texto: string;
};

/** 282,5 -> 12°30' de Capricórnio */
export function posicaoNoSigno(lon: number): Posicao {
  const total = norm360(lon);
  const indice = Math.floor(total / 30);
  // Minutos cortados, sem arredondar (como os programas de astrologia):
  // arredondar fazia 29°59'56" virar "30°00'", um grau que não existe.
  // Só a exibição muda; a longitude guarda a precisão total.
  const totalMinutos = Math.min(1799, Math.floor((total - indice * 30) * 60 + 1e-9));
  const grau = Math.floor(totalMinutos / 60);
  const minuto = totalMinutos % 60;
  return {
    signo: SIGNOS[indice],
    glifo: GLIFOS_SIGNO[indice],
    indiceSigno: indice,
    grau,
    minuto,
    texto: `${grau}°${String(minuto).padStart(2, "0")}' de ${SIGNOS[indice]}`,
  };
}

/**
 * Em que casa cai um grau. As cúspides vêm na ordem das casas 1 a 12.
 * Mesmo critério do artefato de casas da Carol.
 */
export function casaDoGrau(lon: number, cuspides: number[]): number {
  const grau = norm360(lon);
  for (let i = 0; i < 12; i++) {
    const inicio = cuspides[i];
    const fim = cuspides[(i + 1) % 12];
    const tamanho = norm360(fim - inicio);
    const posicao = norm360(grau - inicio);
    if (posicao < tamanho || tamanho === 0) return i + 1;
  }
  return 12;
}
