import { type AspectoCalculado } from "./aspectos";
import { type Posicao } from "./base";
import { type AvisoDeHora } from "./fuso";
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
export declare const VERSAO_DO_MAPA = 4;
export declare const GLIFOS_DOS_PONTOS: Record<string, string>;
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
export declare function instanteDoMapa(dados: DadosDoNascimento): InstanteDoMapa;
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
export declare function ceuNoInstante(instante: Date, lugar: {
    latitude: number;
    longitude: number;
}, comCasas: boolean): CeuNoInstante;
/**
 * Monta o mapa completo: posições, casas topocêntricas, pontos extras e
 * aspectos maiores. Sem hora de nascimento, calcula ao meio-dia local e
 * devolve o mapa sem casas, sem Ascendente e sem Parte da Fortuna.
 */
export declare function calcularMapa(dados: DadosDoNascimento): Mapa;
