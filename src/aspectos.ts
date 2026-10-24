import { distanciaAngular } from "./base";

/**
 * Aspectos maiores e orbes da astrologia psicológica (tabela da Carol).
 * Convenções registradas em mapa-sistema/20-motor-de-calculo-convencoes.md:
 *   - Nodos, Quíron, Lilith e Parte da Fortuna: orbe de 2°.
 *   - Com Ascendente ou Meio do Céu, vale a MENOR orbe, mesmo com Sol ou Lua.
 *   - Nos demais casos, Sol e Lua têm prioridade: vale a orbe deles.
 *   - Entre os outros, vale a MENOR das duas orbes.
 *   - O aspecto conta pela distância em graus, mesmo em signos diferentes.
 */

export type Qualidade = "harmônico" | "tenso" | "variável";

export const ASPECTOS = [
  { nome: "Conjunção", angulo: 0, glifo: "☌", qualidade: "variável" as Qualidade },
  { nome: "Sextil", angulo: 60, glifo: "✶", qualidade: "harmônico" as Qualidade },
  { nome: "Quadratura", angulo: 90, glifo: "□", qualidade: "tenso" as Qualidade },
  { nome: "Trígono", angulo: 120, glifo: "△", qualidade: "harmônico" as Qualidade },
  { nome: "Oposição", angulo: 180, glifo: "☍", qualidade: "tenso" as Qualidade },
];

type Grupo = "luminares" | "pessoais" | "sociais" | "transpessoais" | "angulos" | "pontos";

const GRUPO_DO_PONTO: Record<string, Grupo> = {
  Sol: "luminares",
  Lua: "luminares",
  Mercúrio: "pessoais",
  Vênus: "pessoais",
  Marte: "pessoais",
  Júpiter: "sociais",
  Saturno: "sociais",
  Urano: "transpessoais",
  Netuno: "transpessoais",
  Plutão: "transpessoais",
  Ascendente: "angulos",
  "Meio do Céu": "angulos",
  "Nodo Norte": "pontos",
  "Nodo Sul": "pontos",
  Lilith: "pontos",
  Quíron: "pontos",
  "Parte da Fortuna": "pontos",
};

/** Orbe por aspecto e grupo, exatamente como na tabela da Carol. */
const ORBES: Record<number, Record<Grupo, number>> = {
  0: { luminares: 12, pessoais: 8, sociais: 8, transpessoais: 8, angulos: 12, pontos: 2 },
  60: { luminares: 6, pessoais: 6, sociais: 6, transpessoais: 6, angulos: 6, pontos: 2 },
  90: { luminares: 7, pessoais: 6, sociais: 6, transpessoais: 6, angulos: 6, pontos: 2 },
  120: { luminares: 8, pessoais: 6, sociais: 6, transpessoais: 6, angulos: 6, pontos: 2 },
  // Oposição aos ângulos limitada a 5° (a tabela original dizia 10°).
  180: { luminares: 12, pessoais: 8, sociais: 8, transpessoais: 8, angulos: 5, pontos: 2 },
};

export function orbeDoPar(pontoA: string, pontoB: string, angulo: number): number {
  const tabela = ORBES[angulo];
  const grupoA = GRUPO_DO_PONTO[pontoA] ?? "pontos";
  const grupoB = GRUPO_DO_PONTO[pontoB] ?? "pontos";
  if (grupoA === "pontos" || grupoB === "pontos") return tabela.pontos;
  // Nos ângulos, um erro pequeno na hora de nascimento já desloca o grau:
  // vale a orbe mais estreita, mesmo quando o outro lado é Sol ou Lua.
  if (grupoA === "angulos" || grupoB === "angulos") return Math.min(tabela[grupoA], tabela[grupoB]);
  if (grupoA === "luminares" || grupoB === "luminares") return tabela.luminares;
  return Math.min(tabela[grupoA], tabela[grupoB]);
}

export type AspectoCalculado = {
  de: string;
  para: string;
  aspecto: string;
  glifo: string;
  qualidade: Qualidade;
  /** Distância do aspecto exato, em graus. */
  orbe: number;
  aplicativo: boolean;
};

/** Todos os aspectos maiores entre os pontos informados. */
export function calcularAspectos(pontos: { nome: string; lon: number }[]): AspectoCalculado[] {
  const encontrados: AspectoCalculado[] = [];
  for (let i = 0; i < pontos.length; i++) {
    for (let j = i + 1; j < pontos.length; j++) {
      const a = pontos[i];
      const b = pontos[j];
      // Nodo Norte e Nodo Sul são sempre opostos: não vale como aspecto.
      if (a.nome.startsWith("Nodo") && b.nome.startsWith("Nodo")) continue;
      const distancia = distanciaAngular(a.lon, b.lon);
      for (const aspecto of ASPECTOS) {
        const orbeMaxima = orbeDoPar(a.nome, b.nome, aspecto.angulo);
        const diferenca = Math.abs(distancia - aspecto.angulo);
        if (diferenca <= orbeMaxima) {
          encontrados.push({
            de: a.nome,
            para: b.nome,
            aspecto: aspecto.nome,
            glifo: aspecto.glifo,
            qualidade: aspecto.qualidade,
            orbe: Number(diferenca.toFixed(2)),
            aplicativo: false,
          });
          break;
        }
      }
    }
  }
  return encontrados.sort((x, y) => x.orbe - y.orbe);
}
