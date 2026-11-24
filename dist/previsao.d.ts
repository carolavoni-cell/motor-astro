import { type CeuNoInstante } from "./mapa";
/** Os cinco aspectos maiores. */
export declare const ANGULOS_MAIORES: number[];
/**
 * Os mesmos aspectos, nos dois sentidos: sextil, quadratura e trígono
 * existem com o planeta à frente ou atrás do ponto. Conjunção e oposição
 * já são simétricas. Buscar só um sentido perde metade desses aspectos.
 */
export declare const ANGULOS_NOS_DOIS_SENTIDOS: number[];
/**
 * Afina um instante por bisseção: procura, entre `a` e `b`, o ponto em que
 * `f` muda de sinal. Para quando o intervalo fica menor que `passoMs`
 * (um minuto por padrão) e devolve o fim desse intervalo.
 */
export declare function refinarInstante(a: Date, b: Date, f: (d: Date) => number, passoMs?: number): Date;
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
export declare function amostrasDoCeu(de: Date, ate: Date, corpos: string[], passoMs?: number): AmostraDoCeu[];
export type PontoAlvo = {
    nome: string;
    lon: number;
};
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
export declare function transitosSobrePontos(opcoes: {
    amostras: AmostraDoCeu[];
    transitantes: string[];
    alvos: PontoAlvo[];
    orbe?: number;
    angulos?: number[];
    janela?: {
        de: Date;
        ate: Date;
    } | null;
}): TransitoCalculado[];
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
export declare function aspectosNoCeu(opcoes: {
    amostras: AmostraDoCeu[];
    pares: [string, string][];
    limite: number;
    de: Date;
    ate: Date;
    angulos?: number[];
}): AspectoNoCeu[];
export type MudancaEmTransito = {
    tipo: "casa";
    transitante: string;
    de: number;
    para: number;
    quando: Date;
    lon: number;
} | {
    tipo: "signo";
    transitante: string;
    indiceSigno: number;
    signo: string;
    quando: Date;
};
/**
 * Quando cada planeta muda de casa no mapa (cúspides informadas) e quando
 * muda de signo, de `de` até `ate`. Vem tudo numa lista só, na ordem em que
 * a busca encontra; quem usa filtra e ordena.
 */
export declare function mudancasDeCasaESigno(opcoes: {
    amostras: AmostraDoCeu[];
    transitantes: string[];
    cuspides: number[];
    de: Date;
    ate: Date;
}): MudancaEmTransito[];
export type EstacaoCalculada = {
    transitante: string;
    /** "retrógrada": o planeta para e passa a andar para trás. "direta": volta a andar para a frente. */
    sentido: "retrógrada" | "direta";
    quando: Date;
    lon: number;
};
/** As estações (o planeta para e muda de sentido) dentro das amostras. */
export declare function estacoesDosPlanetas(opcoes: {
    amostras: AmostraDoCeu[];
    transitantes: string[];
}): EstacaoCalculada[];
export type PontoTocado = {
    alvo: string;
    angulo: number;
    distancia: number;
};
/**
 * Que pontos do mapa um grau toca (uma lunação, uma estação, um planeta do
 * retorno solar): para cada alvo e cada ângulo pedido, a distância do
 * aspecto exato, quando ela é de até `orbe` graus.
 */
export declare function pontosTocados(lon: number, alvos: PontoAlvo[], angulos: number[], orbe: number): PontoTocado[];
/**
 * Fim da fase cheia: quando a Lua chega a 225° do Sol, cerca de três dias
 * e meio depois da Lua Cheia informada.
 */
export declare function fimDaFaseCheia(luaCheia: Date): Date;
/**
 * O instante em que o Sol volta ao grau exato do nascimento, procurado em
 * torno de `perto` (o aniversário daquele ano, ao meio-dia, por exemplo).
 * O mapa da revolução solar sai de `ceuNoInstante` nesse instante, no lugar
 * onde a pessoa passa o aniversário.
 */
export declare function retornoSolar(lonSolNatal: number, perto: Date, margemDias?: number): Date;
/** Idade completa numa data, a partir de "AAAA-MM-DD" (conta pelo dia em UTC). */
export declare function idadeNaData(dataDeNascimento: string, d: Date): number;
/** Regente tradicional de cada signo, de Áries a Peixes. */
export declare const REGENTES_TRADICIONAIS: string[];
/** Casa por signos inteiros: o signo do Ascendente inteiro é a casa 1. */
export declare function casaPorSignosInteiros(lon: number, lonAscendente: number): number;
export type Profeccao = {
    idade: number;
    casa: number;
    indiceSigno: number;
    signo: string;
    regente: string;
};
/**
 * Profecção anual: uma casa por ano de vida, por signos inteiros a partir
 * do Ascendente, com o regente tradicional do signo (o senhor do ano).
 */
export declare function profeccaoAnual(idade: number, lonAscendente: number): Profeccao;
/** Um dia depois do nascimento para cada ano trópico de vida. */
export declare const ANO_TROPICO_EM_DIAS = 365.2422;
/** O instante do céu que corresponde, por progressão secundária, à data `d`. */
export declare function instanteProgredido(nascimento: Date, d: Date): Date;
/** O céu progredido para a data `d` (posições e retrogradações, sem casas). */
export declare function ceuProgredido(nascimento: Date, d: Date): CeuNoInstante;
/** As oito fases do ciclo de lunação, de 45° em 45°. */
export declare const FASES_DA_LUNACAO: string[];
/** Fase do ciclo de lunação pela distância da Lua ao Sol. */
export declare function faseDaLunacao(lonSol: number, lonLua: number): string;
export type MudancaProgredida = {
    corpo: string;
    tipo: "signo";
    indiceSigno: number;
    signo: string;
    quando: Date;
} | {
    corpo: string;
    tipo: "casa";
    casa: number;
    quando: Date;
};
/** Quando cada corpo progredido muda de signo ou de casa natal, de `de` até `ate`. */
export declare function mudancasProgredidas(opcoes: {
    nascimento: Date;
    corpos: string[];
    cuspides: number[];
    de: Date;
    ate: Date;
}): MudancaProgredida[];
/** Quando a Lua progredida muda de fase (múltiplo de 45° do Sol progredido), de `de` até `ate`. */
export declare function mudancasDeFaseProgredida(opcoes: {
    nascimento: Date;
    de: Date;
    ate: Date;
}): {
    fase: string;
    quando: Date;
}[];
export type AspectoProgredido = {
    corpo: string;
    alvo: string;
    angulo: number;
    aspecto: number;
    quando: Date;
};
/**
 * Aspectos exatos dos corpos progredidos com os pontos do mapa, de `de` até
 * `ate`. Varre de 15 em 15 dias (o que anda mais depressa, a Lua, faz um
 * grau por mês) e afina no minuto.
 */
export declare function aspectosProgredidos(opcoes: {
    nascimento: Date;
    corpos: string[];
    alvos: PontoAlvo[];
    de: Date;
    ate: Date;
    angulos?: number[];
    passoDias?: number;
    limite?: number;
}): AspectoProgredido[];
