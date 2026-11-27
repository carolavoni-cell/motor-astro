import * as A from "astronomy-engine";
import { calcularAspectos, type AspectoCalculado } from "./aspectos";
import { casaDoGrau, norm360, posicaoNoSigno, type Posicao } from "./base";
import { cuspidesTopocentricas } from "./casas";
import { instanteDoNascimento, instanteNaZona, type AvisoDeHora } from "./fuso";
import {
  armcDoLugar,
  CORPOS,
  estaRetrogrado,
  lilithMedia,
  longitudeEcliptica,
  nodoNorteVerdadeiro,
  obliquidadeVerdadeira,
  parteDaFortuna,
} from "./pontos";

export type PontoDoMapa = {
  nome: string;
  glifo: string;
  lon: number;
  posicao: Posicao;
  casa: number | null;
  retrogrado: boolean;
};

export type Mapa = {
  versao: number;
  calculadoEm: string;
  horaConhecida: boolean;
  /** Instante exato usado no cálculo. */
  instanteUtc: string;
  asc: number | null;
  mc: number | null;
  cuspides: number[] | null;
  pontos: PontoDoMapa[];
  aspectos: AspectoCalculado[];
  /** Zona IANA usada (null quando o fuso foi informado à mão). */
  zona?: string | null;
  /** A hora caiu na hora repetida ou inexistente de uma troca de horário de verão. */
  avisoDeHora?: AvisoDeHora | null;
};

export type DadosDoNascimento = {
  /** "1983-08-09" */
  data: string;
  /** "10:52" ou null quando a hora é desconhecida */
  hora: string | null;
  horaConhecida: boolean;
  latitude: number;
  longitude: number;
  /**
   * Zona IANA do local (ex.: "America/Sao_Paulo"). Quando existe, fuso e
   * horário de verão vêm da base de fusos e fusoHoras/horarioDeVerao são ignorados.
   */
  zona?: string | null;
  /** Fuso fixo em horas (Brasília = -3), usado só quando não há zona. */
  fusoHoras: number;
  horarioDeVerao?: boolean;
};

/** Versão do cálculo: muda quando a regra muda, para recalcular o que está guardado. */
// 2: oposição aos ângulos até 5° e menor orbe quando um dos lados é ângulo (2026-10-02).
// 3: fuso e horário de verão pela base IANA; a regra fixa antiga errava muitas datas (2026-10-16).
// 4: minutos das posições cortados, sem arredondar (evita "30°00'") (2026-10-17).
export const VERSAO_DO_MAPA = 5;

export const GLIFOS_DOS_PONTOS: Record<string, string> = {
  ...Object.fromEntries(CORPOS.map((c) => [c.nome, c.glifo])),
  "Nodo Norte": "☊",
  "Nodo Sul": "☋",
  Lilith: "⚸",
  Ascendente: "AC",
  "Meio do Céu": "MC",
  "Parte da Fortuna": "⊗",
};

export type InstanteDoMapa = {
  instante: Date;
  avisoDeHora: AvisoDeHora | null;
  /** Deslocamento total para UTC usado no cálculo, em horas (Brasília no verão = -2). */
  deslocamentoHoras: number;
  horarioDeVerao: boolean;
};

/**
 * Primeira parte do mapa: o instante exato (UTC) do nascimento. Com zona,
 * pela base de fusos IANA; sem zona, pelo fuso informado à mão. Sem hora de
 * nascimento, usa o meio-dia local e não avisa nada.
 */
export function instanteDoMapa(dados: DadosDoNascimento): InstanteDoMapa {
  const [ano, mes, dia] = dados.data.split("-").map(Number);
  const [hora, minuto] = (dados.horaConhecida && dados.hora ? dados.hora : "12:00")
    .split(":")
    .map(Number);

  if (dados.zona) {
    const r = instanteNaZona({ ano, mes, dia, hora, minuto }, dados.zona);
    return {
      instante: r.instante,
      // Sem hora de nascimento, o meio-dia é só uma referência: não há o que avisar.
      avisoDeHora: dados.horaConhecida ? r.aviso : null,
      deslocamentoHoras: r.deslocamentoHoras,
      horarioDeVerao: r.horarioDeVerao,
    };
  }
  const horarioDeVerao = Boolean(dados.horarioDeVerao);
  return {
    instante: instanteDoNascimento({ ano, mes, dia, hora, minuto, fusoHoras: dados.fusoHoras, horarioDeVerao }),
    avisoDeHora: null,
    deslocamentoHoras: dados.fusoHoras + (horarioDeVerao ? 1 : 0),
    horarioDeVerao,
  };
}

export type CeuNoInstante = {
  /** Longitude de cada ponto, com precisão total, na ordem em que o mapa mostra. */
  longitudes: Map<string, number>;
  retrogrados: Map<string, boolean>;
  /** Cúspides das casas 1 a 12, com precisão total (null sem hora). */
  cuspides: number[] | null;
  /** Sol acima do horizonte (casas 7 a 12). Null sem hora. */
  diurno: boolean | null;
};

/**
 * Segunda parte do mapa: o céu num instante e num lugar. Planetas, Nodos,
 * Lilith e, com hora, Ascendente, Meio do Céu, casas topocêntricas e Parte
 * da Fortuna. Os números saem com precisão total; quem mostra decide como
 * arredondar.
 */
export function ceuNoInstante(
  instante: Date,
  lugar: { latitude: number; longitude: number },
  comCasas: boolean,
): CeuNoInstante {
  const tempo = A.MakeTime(instante);

  const longitudes = new Map<string, number>();
  for (const corpo of CORPOS) longitudes.set(corpo.nome, longitudeEcliptica(corpo.corpo, tempo));

  const nodoNorte = nodoNorteVerdadeiro(tempo);
  longitudes.set("Nodo Norte", nodoNorte);
  longitudes.set("Nodo Sul", norm360(nodoNorte + 180));
  longitudes.set("Lilith", lilithMedia(tempo));

  let cuspides: number[] | null = null;
  let diurno: boolean | null = null;

  if (comCasas) {
    const armc = armcDoLugar(tempo, lugar.longitude);
    const eps = obliquidadeVerdadeira(tempo);
    cuspides = cuspidesTopocentricas(armc, lugar.latitude, eps);
    const asc = cuspides[0];
    longitudes.set("Ascendente", asc);
    longitudes.set("Meio do Céu", cuspides[9]);

    // Fortuna: de dia (Sol acima do horizonte, casas 7 a 12) a fórmula muda.
    const sol = longitudes.get("Sol")!;
    const lua = longitudes.get("Lua")!;
    diurno = casaDoGrau(sol, cuspides) >= 7;
    longitudes.set("Parte da Fortuna", parteDaFortuna(asc, sol, lua, diurno));
  }

  const retrogrados = new Map(CORPOS.map((c) => [c.nome, estaRetrogrado(c.corpo, tempo)]));
  return { longitudes, retrogrados, cuspides, diurno };
}

/**
 * Monta o mapa completo: posições, casas topocêntricas, pontos extras e
 * aspectos maiores. Sem hora de nascimento, calcula ao meio-dia local e
 * devolve o mapa sem casas, sem Ascendente e sem Parte da Fortuna.
 */
export function calcularMapa(dados: DadosDoNascimento): Mapa {
  const { instante, avisoDeHora } = instanteDoMapa(dados);
  const { longitudes, retrogrados, cuspides } = ceuNoInstante(instante, dados, dados.horaConhecida);

  const pontos: PontoDoMapa[] = [...longitudes.entries()].map(([nome, lon]) => ({
    nome,
    glifo: GLIFOS_DOS_PONTOS[nome] ?? "",
    lon: Number(lon.toFixed(4)),
    posicao: posicaoNoSigno(lon),
    casa: cuspides ? casaDoGrau(lon, cuspides) : null,
    retrogrado: retrogrados.get(nome) ?? false,
  }));

  return {
    versao: VERSAO_DO_MAPA,
    calculadoEm: new Date().toISOString(),
    horaConhecida: dados.horaConhecida,
    instanteUtc: instante.toISOString(),
    asc: cuspides ? cuspides[0] : null,
    mc: cuspides ? cuspides[9] : null,
    cuspides: cuspides ? cuspides.map((c) => Number(c.toFixed(4))) : null,
    pontos,
    aspectos: calcularAspectos(pontos.map((p) => ({ nome: p.nome, lon: p.lon }))),
    zona: dados.zona ?? null,
    avisoDeHora,
  };
}
