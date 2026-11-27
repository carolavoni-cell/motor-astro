import * as A from "astronomy-engine";
import { casaDoGrau, posicaoNoSigno } from "./base";
import { longitudeEcliptica } from "./pontos";

/** Fases da Lua, lunações e eclipses, no mesmo referencial do mapa. */

export type FaseDaLua = "nova" | "crescente" | "cheia" | "minguante";

export const NOMES_FASE: Record<FaseDaLua, string> = {
  nova: "Lua Nova",
  crescente: "Lua Crescente",
  cheia: "Lua Cheia",
  minguante: "Lua Minguante",
};

/** Longitude da Lua (zodíaco da data) num instante. */
export function longitudeDaLua(data: Date): number {
  return longitudeEcliptica(A.Body.Moon, A.MakeTime(data));
}

export type LuaDoMomento = {
  fase: FaseDaLua;
  nome: string;
  signo: string;
  iluminada: number; // 0 a 100
};

/**
 * Fase como no calendário brasileiro: cada fase vai do seu momento exato até
 * o começo da seguinte (a Nova dura da Lua Nova até a Crescente, e assim por
 * diante). É o mesmo critério das lunações da agenda.
 */
export function faseDaLua(agora = new Date()): LuaDoMomento {
  const tempo = A.MakeTime(agora);
  const angulo = A.MoonPhase(tempo);
  const fase: FaseDaLua = angulo < 90 ? "nova" : angulo < 180 ? "crescente" : angulo < 270 ? "cheia" : "minguante";
  const iluminada = Math.round(A.Illumination(A.Body.Moon, tempo).phase_fraction * 100);
  return {
    fase,
    nome: NOMES_FASE[fase],
    signo: posicaoNoSigno(longitudeEcliptica(A.Body.Moon, tempo)).signo,
    iluminada,
  };
}

export type LunacaoCalculada = { fase: "nova" | "cheia"; quando: string; signo: string; eclipse: boolean };

const UM_DIA = 24 * 3_600_000;

/** A Lua Nova ou Cheia desta data é eclipse? (pico a menos de um dia) */
export function haEclipse(fase: "nova" | "cheia", data: Date): boolean {
  const inicio = A.MakeTime(new Date(data.getTime() - 2 * UM_DIA));
  const pico =
    fase === "nova" ? A.SearchGlobalSolarEclipse(inicio).peak.date : A.SearchLunarEclipse(inicio).peak.date;
  return Math.abs(pico.getTime() - data.getTime()) < UM_DIA;
}

/**
 * O instante exato da Lua Nova ou Cheia: a Lua a 0° ou a 180° do Sol, nas posições aparentes dos dois
 * (as mesmas do mapa). A busca do astronomy-engine usa outra convenção e fica cerca de 40 segundos adiantada
 * em relação à Swiss Ephemeris e ao Solar Fire; aqui ela só dá o ponto de partida.
 */
function instanteDaLunacao(perto: Date, fase: "nova" | "cheia"): Date {
  const alvo = fase === "nova" ? 0 : 180;
  const desvio = (t: number) => {
    const tempo = A.MakeTime(new Date(t));
    const d = longitudeEcliptica(A.Body.Moon, tempo) - longitudeEcliptica(A.Body.Sun, tempo) - alvo;
    return ((d % 360) + 540) % 360 - 180;
  };
  let a = perto.getTime() - 20 * 60_000, b = perto.getTime() + 20 * 60_000;
  if (desvio(a) > 0 || desvio(b) < 0) return perto; // não deveria acontecer: fica o instante do astronomy-engine
  while (b - a > 1_000) {
    const m = Math.trunc((a + b) / 2);
    if (desvio(m) < 0) a = m; else b = m;
  }
  return new Date(Math.trunc((a + b) / 2));
}

/** Luas Novas e Cheias a partir de uma data (as crescentes e minguantes ficam de fora). */
export function proximasLunacoes(quantas = 6, desde = new Date()): LunacaoCalculada[] {
  const lista: LunacaoCalculada[] = [];
  let quarto = A.SearchMoonQuarter(A.MakeTime(desde));
  while (lista.length < quantas) {
    if (quarto.quarter === 0 || quarto.quarter === 2) {
      const fase = quarto.quarter === 0 ? "nova" : "cheia";
      const data = instanteDaLunacao(quarto.time.date, fase);
      lista.push({
        fase,
        quando: data.toISOString(),
        signo: posicaoNoSigno(longitudeEcliptica(A.Body.Moon, A.MakeTime(data))).signo,
        eclipse: haEclipse(fase, data),
      });
    }
    quarto = A.NextMoonQuarter(quarto);
  }
  return lista;
}

export type LuaNasCasas = {
  casa: number;
  signo: string;
  /** Quando a Lua passa para a casa seguinte (no máximo 4 dias à frente). */
  ate: Date | null;
  /** A casa seguinte, quando a troca acontece ainda hoje (no dia da zona informada). */
  depoisHoje: number | null;
};

/**
 * A Lua de agora passando pelas casas de um mapa (só com hora de
 * nascimento: sem ela não há casas). "Hoje" é o dia na zona informada,
 * Brasília por padrão.
 */
export function luaNasCasas(cuspides: number[], agora = new Date(), zonaDoDia = "America/Sao_Paulo"): LuaNasCasas {
  const diaNaZona = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zonaDoDia }).format(d);
  const lon = longitudeDaLua(agora);
  const casa = casaDoGrau(lon, cuspides);

  // Anda de meia em meia hora até a casa mudar, e depois afina no minuto.
  const PASSO = 30 * 60_000;
  const partida = agora.getTime();
  let ate: Date | null = null;
  for (let t = partida + PASSO; t <= partida + 4 * 24 * 3_600_000; t += PASSO) {
    if (casaDoGrau(longitudeDaLua(new Date(t)), cuspides) !== casa) {
      let inicio = t - PASSO;
      let fim = t;
      while (fim - inicio > 60_000) {
        const meio = (inicio + fim) / 2;
        if (casaDoGrau(longitudeDaLua(new Date(meio)), cuspides) === casa) inicio = meio;
        else fim = meio;
      }
      ate = new Date(fim);
      break;
    }
  }

  const depoisHoje = ate && diaNaZona(ate) === diaNaZona(agora) ? (casa % 12) + 1 : null;
  return { casa, signo: posicaoNoSigno(lon).signo, ate, depoisHoje };
}
