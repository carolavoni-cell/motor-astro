import { casaDoGrau, norm360, posicaoNoSigno, type Posicao } from "./base";

/**
 * Pontos que o astronomy-engine não calcula (asteroides como Abundantia),
 * lidos de uma tabela de efeméride baixada do NASA/JPL Horizons.
 */

export type TabelaDeEfemeride = {
  /** Instante do primeiro valor, em UTC ("1930-01-01T00:00:00Z"). */
  inicio: string;
  /** Distância em dias entre um valor e o seguinte. */
  passoDias: number;
  /** Longitudes eclípticas (zodíaco da data), em graus. */
  lon: number[];
};

const DIA_MS = 86_400_000;

/** Longitude por interpolação de 4 pontos na tabela. Null fora do período. */
export function longitudeDaTabela(tabela: TabelaDeEfemeride, instante: Date): number | null {
  const dias = (instante.getTime() - Date.parse(tabela.inicio)) / DIA_MS;
  const pos = dias / tabela.passoDias;
  const k = Math.floor(pos);
  if (k < 1 || k + 2 >= tabela.lon.length) return null;
  const x = pos - k;
  // Desenrola a passagem por 0° de Áries antes de interpolar.
  const y = [tabela.lon[k - 1], tabela.lon[k], tabela.lon[k + 1], tabela.lon[k + 2]];
  for (let i = 1; i < 4; i++) {
    while (y[i] - y[i - 1] > 180) y[i] -= 360;
    while (y[i] - y[i - 1] < -180) y[i] += 360;
  }
  const [a, b, c, d] = y;
  const v =
    a * ((-x * (x - 1) * (x - 2)) / 6) +
    b * (((x + 1) * (x - 1) * (x - 2)) / 2) +
    c * ((-(x + 1) * x * (x - 2)) / 2) +
    d * (((x + 1) * x * (x - 1)) / 6);
  return norm360(v);
}

export type PontoDaTabela =
  | { nome: string; glifo: string; foraDoPeriodo: true }
  | {
      nome: string;
      glifo: string;
      lon: number;
      posicao: Posicao;
      signo: string;
      casa: number;
      retrogrado: boolean;
      foraDoPeriodo?: undefined;
    };

/** O ponto num mapa: posição, casa e se está retrógrado (anda para trás em um dia). */
export function pontoDaTabela(
  nome: string,
  glifo: string,
  tabela: TabelaDeEfemeride,
  instante: Date,
  cuspides: number[],
): PontoDaTabela {
  const lon = longitudeDaTabela(tabela, instante);
  if (lon === null) return { nome, glifo, foraDoPeriodo: true };
  const antes = longitudeDaTabela(tabela, new Date(instante.getTime() - DIA_MS / 2));
  const depois = longitudeDaTabela(tabela, new Date(instante.getTime() + DIA_MS / 2));
  let avanco = (depois ?? lon) - (antes ?? lon);
  if (avanco > 180) avanco -= 360;
  if (avanco < -180) avanco += 360;
  const posicao = posicaoNoSigno(lon);
  return {
    nome,
    glifo,
    lon,
    posicao,
    signo: posicao.signo,
    casa: casaDoGrau(lon, cuspides),
    retrogrado: avanco < 0,
  };
}
