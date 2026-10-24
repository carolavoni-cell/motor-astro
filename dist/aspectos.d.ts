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
export declare const ASPECTOS: {
    nome: string;
    angulo: number;
    glifo: string;
    qualidade: Qualidade;
}[];
export declare function orbeDoPar(pontoA: string, pontoB: string, angulo: number): number;
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
export declare function calcularAspectos(pontos: {
    nome: string;
    lon: number;
}[]): AspectoCalculado[];
