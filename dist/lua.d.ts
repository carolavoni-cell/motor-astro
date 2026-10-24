/** Fases da Lua, lunações e eclipses, no mesmo referencial do mapa. */
export type FaseDaLua = "nova" | "crescente" | "cheia" | "minguante";
export declare const NOMES_FASE: Record<FaseDaLua, string>;
/** Longitude da Lua (zodíaco da data) num instante. */
export declare function longitudeDaLua(data: Date): number;
export type LuaDoMomento = {
    fase: FaseDaLua;
    nome: string;
    signo: string;
    iluminada: number;
};
/**
 * Fase como no calendário brasileiro: cada fase vai do seu momento exato até
 * o começo da seguinte (a Nova dura da Lua Nova até a Crescente, e assim por
 * diante). É o mesmo critério das lunações da agenda.
 */
export declare function faseDaLua(agora?: Date): LuaDoMomento;
export type LunacaoCalculada = {
    fase: "nova" | "cheia";
    quando: string;
    signo: string;
    eclipse: boolean;
};
/** A Lua Nova ou Cheia desta data é eclipse? (pico a menos de um dia) */
export declare function haEclipse(fase: "nova" | "cheia", data: Date): boolean;
/** Luas Novas e Cheias a partir de uma data (as crescentes e minguantes ficam de fora). */
export declare function proximasLunacoes(quantas?: number, desde?: Date): LunacaoCalculada[];
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
export declare function luaNasCasas(cuspides: number[], agora?: Date, zonaDoDia?: string): LuaNasCasas;
