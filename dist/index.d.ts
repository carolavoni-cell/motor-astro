/**
 * Motor de cálculo astrológico da Carol Avoni.
 *
 * Um só motor para todos os projetos (portal, Mapa do dinheiro e os que
 * vierem). Só calcula: textos, telas e dados de clientes ficam em cada
 * projeto. Convenções (casas topocêntricas, orbes, Fortuna com inversão
 * noturna, fuso pela base IANA) explicadas no LEIA-ME.md.
 */
export * from "./versao";
export * from "./base";
export * from "./pontos";
export * from "./casas";
export * from "./aspectos";
export * from "./fuso";
export * from "./mapa";
export * from "./lua";
export * from "./tabela";
export { ABUNDANTIA } from "./efemerides/abundantia";
