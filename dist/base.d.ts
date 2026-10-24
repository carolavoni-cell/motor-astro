/** Peças básicas do cálculo: graus, signos e casas. */
export declare const SIGNOS: readonly ["Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem", "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"];
export declare const GLIFOS_SIGNO: string[];
export declare const GRAUS: number;
export declare function norm360(x: number): number;
/** Menor distância entre dois graus do zodíaco (0 a 180). */
export declare function distanciaAngular(a: number, b: number): number;
export type Posicao = {
    signo: string;
    glifo: string;
    indiceSigno: number;
    grau: number;
    minuto: number;
    texto: string;
};
/** 282,5 -> 12°30' de Capricórnio */
export declare function posicaoNoSigno(lon: number): Posicao;
/**
 * Em que casa cai um grau. As cúspides vêm na ordem das casas 1 a 12.
 * Mesmo critério do artefato de casas da Carol.
 */
export declare function casaDoGrau(lon: number, cuspides: number[]): number;
