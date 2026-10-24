/**
 * Efeméride de 151 Abundantia: longitude eclíptica geocêntrica aparente,
 * do equinócio e eclíptica da data, em graus (mesmo referencial do motor).
 * Fonte: NASA/JPL Horizons (quantidade 31, centro 500@399), baixada em
 * 2026-10-14, solução orbital de 2026-06-05. Um valor a cada 5 dias às
 * 00:00 UT, de 1930-01-01 a 2030-12-31. Interpolação de 4 pontos no motor:
 * erro máximo medido contra a tabela diária de 0,94 segundo de arco.
 * Conferência do referencial: Marte do motor x Horizons, diferença < 4".
 */
import type { TabelaDeEfemeride } from "../tabela";
export declare const ABUNDANTIA: TabelaDeEfemeride;
