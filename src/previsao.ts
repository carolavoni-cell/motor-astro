import { casaDoGrau, distanciaAngular, norm360, SIGNOS } from "./base";
import { ceuNoInstante, type CeuNoInstante } from "./mapa";

/**
 * Previsão: o céu em movimento sobre um mapa. Trânsitos, aspectos do céu,
 * mudanças de casa e de signo, estações, retorno solar, profecção e
 * progressões secundárias.
 *
 * Tudo aqui só calcula e devolve datas (Date) e graus com precisão total.
 * Quem usa decide o fuso de exibição, o arredondamento, o que entra no
 * produto e o texto. Veio do Cérebro do Planner 2027 (novembro de 2026),
 * com os aspectos conferidos nos relatórios dinâmicos do Solar Fire.
 */

const DIA = 86_400_000;
const HORA = 3_600_000;
/** Sem casas, o lugar não entra na conta das posições. */
const SEM_LUGAR = { latitude: 0, longitude: 0 };
const ceu = (d: Date) => ceuNoInstante(d, SEM_LUGAR, false);

/** Os cinco aspectos maiores. */
export const ANGULOS_MAIORES = [0, 60, 90, 120, 180];
/**
 * Os mesmos aspectos, nos dois sentidos: sextil, quadratura e trígono
 * existem com o planeta à frente ou atrás do ponto. Conjunção e oposição
 * já são simétricas. Buscar só um sentido perde metade desses aspectos.
 */
export const ANGULOS_NOS_DOIS_SENTIDOS = [0, 60, 90, 120, 180, -60, -90, -120];

/** Desvio com sinal em relação ao aspecto exato, de -180 a 180. */
const desvioAssinado = (lon: number, lonAlvo: number, angulo: number) =>
  (((lon - lonAlvo - angulo) % 360) + 540) % 360 - 180;

/**
 * Afina um instante por bisseção: procura, entre `a` e `b`, o ponto em que
 * `f` muda de sinal. Para quando o intervalo fica menor que `passoMs`
 * e devolve o meio desse intervalo. Desde a versão 1.2.0 o padrão é um segundo (antes, um minuto):
 * com as tabelas da NASA a posição é precisa o bastante para o horário valer até o segundo.
 */
export function refinarInstante(a: Date, b: Date, f: (d: Date) => number, passoMs = 1_000): Date {
  let ta = a.getTime();
  let tb = b.getTime();
  let fa = f(new Date(ta));
  while (tb - ta > passoMs) {
    // Milissegundo inteiro, como o Date guarda.
    const tm = Math.trunc((ta + tb) / 2);
    const fm = f(new Date(tm));
    if (fm > 0 === fa > 0) {
      ta = tm;
      fa = fm;
    } else tb = tm;
  }
  return new Date(Math.trunc((ta + tb) / 2));
}

/* ------------------------------------------------------------------ */
/* Amostras do céu                                                     */
/* ------------------------------------------------------------------ */

export type AmostraDoCeu = {
  d: Date;
  lon: Record<string, number>;
  rx: Record<string, boolean>;
};

/**
 * O céu amostrado de `de` até `ate` (um ponto por dia, por padrão). É a
 * base das buscas abaixo: cada uma varre as amostras e afina no minuto.
 * Para pegar o que começa antes ou termina depois do período de interesse,
 * amostre com folga (o Planner usa 31 dias de cada lado).
 */
export function amostrasDoCeu(de: Date, ate: Date, corpos: string[], passoMs = DIA): AmostraDoCeu[] {
  const amostras: AmostraDoCeu[] = [];
  for (let t = de.getTime(); t <= ate.getTime(); t += passoMs) {
    const d = new Date(t);
    const c = ceu(d);
    amostras.push({
      d,
      lon: Object.fromEntries(corpos.map((n) => [n, c.longitudes.get(n)!])),
      rx: Object.fromEntries(corpos.map((n) => [n, c.retrogrados.get(n)!])),
    });
  }
  return amostras;
}

/* ------------------------------------------------------------------ */
/* Trânsitos sobre os pontos de um mapa                                */
/* ------------------------------------------------------------------ */

export type PontoAlvo = { nome: string; lon: number };

export type TransitoCalculado = {
  transitante: string;
  alvo: string;
  /** Ângulo buscado, com sinal (-90 e 90 são as duas quadraturas). */
  angulo: number;
  /** O aspecto, sem sinal: 0, 60, 90, 120 ou 180. */
  aspecto: number;
  /** Entrada na orbe, no minuto. Quando `vemDeAntes`, é só a primeira amostra. */
  inicio: Date;
  /** Saída da orbe, no minuto. Null quando ainda está na orbe na última amostra. */
  fim: Date | null;
  /** Já estava na orbe na primeira amostra: o começo real não é conhecido. */
  vemDeAntes: boolean;
  /** Ainda estava na orbe na última amostra. */
  segueDepois: boolean;
  /** Cada passagem exata (uma, ou três quando o planeta retrograda sobre o ponto). */
  exatos: Date[];
  /** Menor distância do aspecto exato em todo o intervalo, e quando. */
  distanciaMinima: number;
  maisPerto: Date;
  /** O mesmo, só dentro da janela pedida. Null sem janela ou quando o intervalo não a toca. */
  distanciaMinimaNaJanela: number | null;
  maisPertoNaJanela: Date | null;
};

/**
 * Todos os trânsitos dos planetas pedidos sobre os pontos de um mapa: cada
 * vez que um planeta fica a até `orbe` graus de um aspecto maior com um ponto.
 *
 * `janela` é o período de interesse (o ano do relatório, por exemplo): serve
 * para saber a menor distância que aconteceu dentro dele, sem contar uma
 * aproximação de antes ou de depois.
 */
export function transitosSobrePontos(opcoes: {
  amostras: AmostraDoCeu[];
  transitantes: string[];
  alvos: PontoAlvo[];
  orbe?: number;
  angulos?: number[];
  janela?: { de: Date; ate: Date } | null;
}): TransitoCalculado[] {
  const { amostras, transitantes, alvos, janela = null } = opcoes;
  const orbe = opcoes.orbe ?? 3;
  const angulos = opcoes.angulos ?? ANGULOS_NOS_DOIS_SENTIDOS;
  if (!amostras.length) return [];
  const ultimaAmostra = amostras[amostras.length - 1].d;

  type Aberto = {
    tr: string;
    lonAlvo: number;
    alvo: string;
    ang: number;
    iInicio: number;
    iFim: number;
    inicio: Date;
    fim: Date | null;
    minimo: number;
    minimoD: Date;
    exatos: Date[];
    ultimoSinal: number;
  };
  const achados: Aberto[] = [];

  // 1. Varre dia a dia: abre o intervalo ao entrar na orbe, marca cada
  //    troca de sinal (passagem exata) e fecha ao sair.
  for (const tr of transitantes) {
    for (const alvo of alvos) {
      const lonAlvo = alvo.lon;
      for (const ang of angulos) {
        let aberto: Aberto | null = null;
        for (let i = 0; i < amostras.length; i++) {
          const dv = desvioAssinado(amostras[i].lon[tr], lonAlvo, ang);
          const dentro = Math.abs(dv) <= orbe;
          if (dentro && !aberto) {
            aberto = {
              tr, alvo: alvo.nome, lonAlvo, ang, iInicio: i, iFim: -1,
              inicio: amostras[i].d, fim: null,
              minimo: Math.abs(dv), minimoD: amostras[i].d, exatos: [], ultimoSinal: Math.sign(dv),
            };
          }
          if (aberto) {
            if (Math.abs(dv) < aberto.minimo) {
              aberto.minimo = Math.abs(dv);
              aberto.minimoD = amostras[i].d;
            }
            const s = Math.sign(dv);
            if (i > 0 && s !== aberto.ultimoSinal && s !== 0) {
              aberto.exatos.push(
                refinarInstante(amostras[i - 1].d, amostras[i].d, (d) => desvioAssinado(ceu(d).longitudes.get(tr)!, lonAlvo, ang)),
              );
            }
            if (s !== 0) aberto.ultimoSinal = s;
            if (!dentro) {
              aberto.fim = amostras[i].d;
              aberto.iFim = i;
              achados.push(aberto);
              aberto = null;
            }
          }
        }
        if (aberto) achados.push(aberto);
      }
    }
  }

  return achados.map((a) => {
    const distancia = (d: Date) => Math.abs(desvioAssinado(ceu(d).longitudes.get(a.tr)!, a.lonAlvo, a.ang));

    // 2. Afina a hora da maior aproximação (a amostra é diária; perto de
    //    uma estação a diferença chega a um dia).
    let melhor = a.minimoD;
    let menor = a.minimo;
    for (let t = a.minimoD.getTime() - 36 * HORA; t <= a.minimoD.getTime() + 36 * HORA; t += HORA) {
      const d = new Date(t);
      const v = distancia(d);
      if (v < menor) {
        menor = v;
        melhor = d;
      }
    }

    // 3. Começo e fim no minuto.
    const vemDeAntes = a.iInicio === 0;
    const segueDepois = !a.fim;
    const inicio = vemDeAntes
      ? a.inicio
      : refinarInstante(amostras[a.iInicio - 1].d, amostras[a.iInicio].d, (d) => distancia(d) - orbe);
    const fim = a.fim ? refinarInstante(amostras[a.iFim - 1].d, amostras[a.iFim].d, (d) => orbe - distancia(d)) : null;

    // 4. A menor distância só dentro da janela.
    let minimoNaJanela: number | null = null;
    let maisPertoNaJanela: Date | null = null;
    if (janela) {
      const t0 = Math.max(inicio.getTime(), janela.de.getTime());
      const t1 = Math.min((fim ?? ultimaAmostra).getTime(), janela.ate.getTime());
      if (t0 <= t1) {
        let m = Infinity;
        let quando: Date | null = null;
        const testa = (d: Date, v: number) => {
          if (v < m) {
            m = v;
            quando = d;
          }
        };
        testa(new Date(t0), distancia(new Date(t0)));
        testa(new Date(t1), distancia(new Date(t1)));
        for (const ex of a.exatos) if (ex.getTime() >= t0 && ex.getTime() <= t1) testa(ex, 0);
        for (let i = a.iInicio; i < amostras.length && amostras[i].d.getTime() <= t1; i++) {
          const t = amostras[i].d.getTime();
          if (t >= t0) testa(amostras[i].d, distancia(amostras[i].d));
        }
        if (m > 0) {
          const c = (quando as unknown as Date).getTime();
          for (let t = Math.max(t0, c - 36 * HORA); t <= Math.min(t1, c + 36 * HORA); t += HORA) {
            const d = new Date(t);
            testa(d, distancia(d));
          }
        }
        minimoNaJanela = m;
        maisPertoNaJanela = quando;
      }
    }

    return {
      transitante: a.tr,
      alvo: a.alvo,
      angulo: a.ang,
      aspecto: Math.abs(a.ang),
      inicio,
      fim,
      vemDeAntes,
      segueDepois,
      exatos: a.exatos,
      distanciaMinima: menor,
      maisPerto: melhor,
      distanciaMinimaNaJanela: minimoNaJanela,
      maisPertoNaJanela,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Aspectos exatos entre planetas do céu                               */
/* ------------------------------------------------------------------ */

export type AspectoNoCeu = {
  p1: string;
  p2: string;
  angulo: number;
  aspecto: number;
  quando: Date;
  /** Onde cada planeta está no instante exato. */
  lon1: number;
  lon2: number;
};

/**
 * Aspectos exatos entre os pares de planetas pedidos, de `de` até `ate`.
 * `limite` é a distância máxima, em graus, que as duas amostras vizinhas
 * podem ter do aspecto: evita confundir a virada de 180° com uma passagem.
 */
export function aspectosNoCeu(opcoes: {
  amostras: AmostraDoCeu[];
  pares: [string, string][];
  limite: number;
  de: Date;
  ate: Date;
  angulos?: number[];
}): AspectoNoCeu[] {
  const { amostras, pares, limite, de, ate } = opcoes;
  const angulos = opcoes.angulos ?? ANGULOS_NOS_DOIS_SENTIDOS;
  const lista: AspectoNoCeu[] = [];
  for (const [p1, p2] of pares) {
    for (const ang of angulos) {
      for (let k = 1; k < amostras.length; k++) {
        const d0 = desvioAssinado(amostras[k - 1].lon[p1], amostras[k - 1].lon[p2], ang);
        const d1 = desvioAssinado(amostras[k].lon[p1], amostras[k].lon[p2], ang);
        if (Math.sign(d0) !== Math.sign(d1) && Math.abs(d0) < limite && Math.abs(d1) < limite) {
          const quando = refinarInstante(amostras[k - 1].d, amostras[k].d, (d) => {
            const c = ceu(d);
            return desvioAssinado(c.longitudes.get(p1)!, c.longitudes.get(p2)!, ang);
          });
          if (quando >= de && quando <= ate) {
            const c = ceu(quando);
            lista.push({ p1, p2, angulo: ang, aspecto: Math.abs(ang), quando, lon1: c.longitudes.get(p1)!, lon2: c.longitudes.get(p2)! });
          }
        }
      }
    }
  }
  return lista;
}

/* ------------------------------------------------------------------ */
/* Mudança de casa e de signo                                          */
/* ------------------------------------------------------------------ */

export type MudancaEmTransito =
  | { tipo: "casa"; transitante: string; de: number; para: number; quando: Date; lon: number }
  | { tipo: "signo"; transitante: string; indiceSigno: number; signo: string; quando: Date };

/**
 * Quando cada planeta muda de casa no mapa (cúspides informadas) e quando
 * muda de signo, de `de` até `ate`. Vem tudo numa lista só, na ordem em que
 * a busca encontra; quem usa filtra e ordena.
 */
export function mudancasDeCasaESigno(opcoes: {
  amostras: AmostraDoCeu[];
  transitantes: string[];
  cuspides: number[];
  de: Date;
  ate: Date;
}): MudancaEmTransito[] {
  const { amostras, transitantes, cuspides, de, ate } = opcoes;
  const lista: MudancaEmTransito[] = [];
  for (const tr of transitantes) {
    let anterior: { casa: number; signo: number } | null = null;
    for (let i = 0; i < amostras.length; i++) {
      const casa = casaDoGrau(amostras[i].lon[tr], cuspides);
      const signo = Math.floor(amostras[i].lon[tr] / 30);
      if (anterior !== null && casa !== anterior.casa) {
        const casaAntes = anterior.casa;
        const d = refinarInstante(amostras[i - 1].d, amostras[i].d, (x) => (casaDoGrau(ceu(x).longitudes.get(tr)!, cuspides) === casaAntes ? -1 : 1));
        if (d >= de && d <= ate) lista.push({ tipo: "casa", transitante: tr, de: casaAntes, para: casa, quando: d, lon: ceu(d).longitudes.get(tr)! });
      }
      if (anterior !== null && signo !== anterior.signo) {
        const signoAntes = anterior.signo;
        const d = refinarInstante(amostras[i - 1].d, amostras[i].d, (x) => (Math.floor(ceu(x).longitudes.get(tr)! / 30) === signoAntes ? -1 : 1));
        if (d >= de && d <= ate) lista.push({ tipo: "signo", transitante: tr, indiceSigno: signo, signo: SIGNOS[signo], quando: d });
      }
      anterior = { casa, signo };
    }
  }
  return lista;
}

/* ------------------------------------------------------------------ */
/* Estações                                                            */
/* ------------------------------------------------------------------ */

export type EstacaoCalculada = {
  transitante: string;
  /** "retrógrada": o planeta para e passa a andar para trás. "direta": volta a andar para a frente. */
  sentido: "retrógrada" | "direta";
  quando: Date;
  lon: number;
};

/** As estações (o planeta para e muda de sentido) dentro das amostras. */
export function estacoesDosPlanetas(opcoes: { amostras: AmostraDoCeu[]; transitantes: string[] }): EstacaoCalculada[] {
  const { amostras, transitantes } = opcoes;
  const lista: EstacaoCalculada[] = [];
  for (const tr of transitantes) {
    for (let i = 1; i < amostras.length; i++) {
      if (amostras[i].rx[tr] !== amostras[i - 1].rx[tr]) {
        const antes = amostras[i - 1].rx[tr];
        const quando = refinarInstante(amostras[i - 1].d, amostras[i].d, (d) => (ceu(d).retrogrados.get(tr) === antes ? -1 : 1));
        lista.push({ transitante: tr, sentido: amostras[i].rx[tr] ? "retrógrada" : "direta", quando, lon: ceu(quando).longitudes.get(tr)! });
      }
    }
  }
  return lista;
}

/* ------------------------------------------------------------------ */
/* Um grau do céu tocando os pontos do mapa                            */
/* ------------------------------------------------------------------ */

export type PontoTocado = { alvo: string; angulo: number; distancia: number };

/**
 * Que pontos do mapa um grau toca (uma lunação, uma estação, um planeta do
 * retorno solar): para cada alvo e cada ângulo pedido, a distância do
 * aspecto exato, quando ela é de até `orbe` graus.
 */
export function pontosTocados(lon: number, alvos: PontoAlvo[], angulos: number[], orbe: number): PontoTocado[] {
  const lista: PontoTocado[] = [];
  for (const alvo of alvos) {
    for (const angulo of angulos) {
      const distancia = Math.abs(distanciaAngular(lon, alvo.lon) - angulo);
      if (distancia <= orbe) lista.push({ alvo: alvo.nome, angulo, distancia });
    }
  }
  return lista;
}

/* ------------------------------------------------------------------ */
/* Lua                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Fim da fase cheia: quando a Lua chega a 225° do Sol, cerca de três dias
 * e meio depois da Lua Cheia informada.
 */
export function fimDaFaseCheia(luaCheia: Date): Date {
  const f = (x: Date) => {
    const c = ceu(x);
    return norm360(c.longitudes.get("Lua")! - c.longitudes.get("Sol")!) - 225;
  };
  return refinarInstante(new Date(luaCheia.getTime() + 2 * DIA), new Date(luaCheia.getTime() + 5.5 * DIA), f);
}

/* ------------------------------------------------------------------ */
/* Retorno solar e profecção                                           */
/* ------------------------------------------------------------------ */

/**
 * O instante em que o Sol volta ao grau exato do nascimento, procurado em
 * torno de `perto` (o aniversário daquele ano, ao meio-dia, por exemplo).
 * O mapa da revolução solar sai de `ceuNoInstante` nesse instante, no lugar
 * onde a pessoa passa o aniversário.
 */
export function retornoSolar(lonSolNatal: number, perto: Date, margemDias = 2): Date {
  const f = (d: Date) => {
    const x = ceu(d).longitudes.get("Sol")! - lonSolNatal;
    return ((x % 360) + 540) % 360 - 180;
  };
  return refinarInstante(new Date(perto.getTime() - margemDias * DIA), new Date(perto.getTime() + margemDias * DIA), f);
}

/** Idade completa numa data, a partir de "AAAA-MM-DD" (conta pelo dia em UTC). */
export function idadeNaData(dataDeNascimento: string, d: Date): number {
  const [ano, mes, dia] = dataDeNascimento.split("-").map(Number);
  let idade = d.getUTCFullYear() - ano;
  const m = d.getUTCMonth() + 1;
  if (m < mes || (m === mes && d.getUTCDate() < dia)) idade--;
  return idade;
}

/** Regente tradicional de cada signo, de Áries a Peixes. */
export const REGENTES_TRADICIONAIS = [
  "Marte", "Vênus", "Mercúrio", "Lua", "Sol", "Mercúrio",
  "Vênus", "Marte", "Júpiter", "Saturno", "Saturno", "Júpiter",
];

/** Casa por signos inteiros: o signo do Ascendente inteiro é a casa 1. */
export function casaPorSignosInteiros(lon: number, lonAscendente: number): number {
  return ((Math.floor(lon / 30) - Math.floor(lonAscendente / 30) + 12) % 12) + 1;
}

export type Profeccao = { idade: number; casa: number; indiceSigno: number; signo: string; regente: string };

/**
 * Profecção anual: uma casa por ano de vida, por signos inteiros a partir
 * do Ascendente, com o regente tradicional do signo (o senhor do ano).
 */
export function profeccaoAnual(idade: number, lonAscendente: number): Profeccao {
  const casa = (idade % 12) + 1;
  const indiceSigno = (Math.floor(lonAscendente / 30) + casa - 1) % 12;
  return { idade, casa, indiceSigno, signo: SIGNOS[indiceSigno], regente: REGENTES_TRADICIONAIS[indiceSigno] };
}

/* ------------------------------------------------------------------ */
/* Progressões secundárias                                             */
/* ------------------------------------------------------------------ */

/** Um dia depois do nascimento para cada ano trópico de vida. */
export const ANO_TROPICO_EM_DIAS = 365.2422;

/** O instante do céu que corresponde, por progressão secundária, à data `d`. */
export function instanteProgredido(nascimento: Date, d: Date): Date {
  return new Date(nascimento.getTime() + ((d.getTime() - nascimento.getTime()) / (ANO_TROPICO_EM_DIAS * DIA)) * DIA);
}

/** O céu progredido para a data `d` (posições e retrogradações, sem casas). */
export function ceuProgredido(nascimento: Date, d: Date): CeuNoInstante {
  return ceu(instanteProgredido(nascimento, d));
}

/** As oito fases do ciclo de lunação, de 45° em 45°. */
export const FASES_DA_LUNACAO = [
  "nova", "crescente", "quarto crescente", "gibosa",
  "cheia", "disseminadora", "quarto minguante", "balsâmica",
];

/** Fase do ciclo de lunação pela distância da Lua ao Sol. */
export function faseDaLunacao(lonSol: number, lonLua: number): string {
  return FASES_DA_LUNACAO[Math.floor(norm360(lonLua - lonSol) / 45)];
}

export type MudancaProgredida =
  | { corpo: string; tipo: "signo"; indiceSigno: number; signo: string; quando: Date }
  | { corpo: string; tipo: "casa"; casa: number; quando: Date };

/** Quando cada corpo progredido muda de signo ou de casa natal, de `de` até `ate`. */
export function mudancasProgredidas(opcoes: {
  nascimento: Date;
  corpos: string[];
  cuspides: number[];
  de: Date;
  ate: Date;
}): MudancaProgredida[] {
  const { nascimento, corpos, cuspides, de, ate } = opcoes;
  const lon = (corpo: string, d: Date) => ceuProgredido(nascimento, d).longitudes.get(corpo)!;
  const lista: MudancaProgredida[] = [];
  for (const corpo of corpos) {
    let anterior: { signo: number; casa: number } | null = null;
    for (let t = de.getTime(); t <= ate.getTime(); t += DIA) {
      const d = new Date(t);
      const l = lon(corpo, d);
      const atual = { signo: Math.floor(l / 30), casa: casaDoGrau(l, cuspides) };
      if (anterior) {
        const antes = anterior;
        if (atual.signo !== antes.signo) {
          const quando = refinarInstante(new Date(t - DIA), d, (x) => (Math.floor(lon(corpo, x) / 30) === antes.signo ? -1 : 1));
          lista.push({ corpo, tipo: "signo", indiceSigno: atual.signo, signo: SIGNOS[atual.signo], quando });
        }
        if (atual.casa !== antes.casa) {
          const quando = refinarInstante(new Date(t - DIA), d, (x) => (casaDoGrau(lon(corpo, x), cuspides) === antes.casa ? -1 : 1));
          lista.push({ corpo, tipo: "casa", casa: atual.casa, quando });
        }
      }
      anterior = atual;
    }
  }
  return lista;
}

/** Quando a Lua progredida muda de fase (múltiplo de 45° do Sol progredido), de `de` até `ate`. */
export function mudancasDeFaseProgredida(opcoes: { nascimento: Date; de: Date; ate: Date }): { fase: string; quando: Date }[] {
  const { nascimento, de, ate } = opcoes;
  const solELua = (d: Date) => {
    const c = ceuProgredido(nascimento, d);
    return { sol: c.longitudes.get("Sol")!, lua: c.longitudes.get("Lua")! };
  };
  const lista: { fase: string; quando: Date }[] = [];
  const p0 = solELua(de);
  let faseAnterior = faseDaLunacao(p0.sol, p0.lua);
  for (let t = de.getTime(); t <= ate.getTime(); t += DIA) {
    const p = solELua(new Date(t));
    const fase = faseDaLunacao(p.sol, p.lua);
    if (fase !== faseAnterior) {
      const limite = FASES_DA_LUNACAO.indexOf(fase) * 45;
      const quando = refinarInstante(new Date(t - DIA), new Date(t), (d) => {
        const q = solELua(d);
        return ((norm360(q.lua - q.sol) - limite + 180) % 360 + 360) % 360 - 180;
      });
      lista.push({ fase, quando });
      faseAnterior = fase;
    }
  }
  return lista;
}

export type AspectoProgredido = { corpo: string; alvo: string; angulo: number; aspecto: number; quando: Date };

/**
 * Aspectos exatos dos corpos progredidos com os pontos do mapa, de `de` até
 * `ate`. Varre de 15 em 15 dias (o que anda mais depressa, a Lua, faz um
 * grau por mês) e afina no minuto.
 */
export function aspectosProgredidos(opcoes: {
  nascimento: Date;
  corpos: string[];
  alvos: PontoAlvo[];
  de: Date;
  ate: Date;
  angulos?: number[];
  passoDias?: number;
  limite?: number;
}): AspectoProgredido[] {
  const { nascimento, corpos, alvos, de, ate } = opcoes;
  const angulos = opcoes.angulos ?? ANGULOS_NOS_DOIS_SENTIDOS;
  const passo = (opcoes.passoDias ?? 15) * DIA;
  const limite = opcoes.limite ?? 3;
  const lista: AspectoProgredido[] = [];
  for (const corpo of corpos) {
    for (const alvo of alvos) {
      for (const ang of angulos) {
        const dv = (d: Date) => desvioAssinado(ceuProgredido(nascimento, d).longitudes.get(corpo)!, alvo.lon, ang);
        let anterior = dv(de);
        for (let t = de.getTime() + passo; t <= ate.getTime(); t += passo) {
          const d = new Date(t);
          const atual = dv(d);
          if (Math.sign(atual) !== Math.sign(anterior) && Math.abs(atual) < limite && Math.abs(anterior) < limite) {
            lista.push({ corpo, alvo: alvo.nome, angulo: ang, aspecto: Math.abs(ang), quando: refinarInstante(new Date(t - passo), d, dv) });
          }
          anterior = atual;
        }
      }
    }
  }
  return lista;
}
