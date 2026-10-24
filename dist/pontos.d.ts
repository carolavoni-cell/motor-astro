import * as A from "astronomy-engine";
/**
 * Posições dos pontos do mapa, sempre no zodíaco DA DATA (ECT), que é o
 * usado na astrologia tropical e no Solar Fire.
 */
export declare const CORPOS: {
    nome: string;
    corpo: A.Body;
    glifo: string;
}[];
export declare function longitudeEcliptica(corpo: A.Body, tempo: A.AstroTime): number;
/** Obliquidade verdadeira da data (inclinação da Terra), usada nas casas. */
export declare function obliquidadeVerdadeira(tempo: A.AstroTime): number;
/** Ascensão reta do Meio do Céu: ponto de partida das casas. */
export declare function armcDoLugar(tempo: A.AstroTime, longitudeLugar: number): number;
/**
 * Nodo Norte verdadeiro (osculador): onde o plano da órbita da Lua cruza
 * a eclíptica neste instante. Vem do movimento real da Lua, não de média.
 */
export declare function nodoNorteVerdadeiro(tempo: A.AstroTime): number;
/**
 * Lilith (Lua Negra) média: o apogeu médio da órbita da Lua.
 * Fórmulas de Meeus para a longitude média e a anomalia média da Lua.
 */
export declare function lilithMedia(tempo: A.AstroTime): number;
/**
 * Parte da Fortuna, com a fórmula invertida para nascimento noturno
 * (decisão da Carol).
 */
export declare function parteDaFortuna(asc: number, sol: number, lua: number, deDia: boolean): number;
/** Um planeta está retrógrado quando a longitude anda para trás. */
export declare function estaRetrogrado(corpo: A.Body, tempo: A.AstroTime): boolean;
