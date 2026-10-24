import { type Posicao } from "./base";
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
/** Longitude por interpolação de 4 pontos na tabela. Null fora do período. */
export declare function longitudeDaTabela(tabela: TabelaDeEfemeride, instante: Date): number | null;
export type PontoDaTabela = {
    nome: string;
    glifo: string;
    foraDoPeriodo: true;
} | {
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
export declare function pontoDaTabela(nome: string, glifo: string, tabela: TabelaDeEfemeride, instante: Date, cuspides: number[]): PontoDaTabela;
