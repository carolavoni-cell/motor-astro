/**
 * Posições pela efeméride da NASA (JPL DE440), a mesma base da Swiss Ephemeris e do Solar Fire.
 *
 * O astronomy-engine usa uma versão encurtada da teoria dos planetas e erra de 10 a 20 segundos de arco
 * (medido contra a Swiss Ephemeris em novembro de 2026). Isso não aparece num mapa natal, mas desloca o
 * horário de um trânsito em minutos ou horas e pode trocar o dia de um evento.
 *
 * Aqui ficam só a leitura e a conta. As tabelas (dados/efemerides-de440.bin, 1900 a 2100, cerca de 9 MB)
 * são montadas por scripts/montar-efemerides.mjs e carregadas por quem usa "motor-astro/completo".
 * Sem as tabelas, ou fora do período delas, o motor continua com o astronomy-engine.
 *
 * As tabelas ficam no objeto global, e não numa variável deste arquivo: assim o motor carregado por
 * "motor-astro" e por "motor-astro/completo" no mesmo programa enxergam as mesmas tabelas.
 */
/** Número de cada corpo nas tabelas (baricentro do sistema do planeta, como na Swiss Ephemeris). */
export declare const CORPO_JPL: Record<string, number>;
/** Carrega as tabelas (o conteúdo de dados/efemerides-de440.bin). Chamar uma vez, antes de calcular. */
export declare function instalarEfemerides(bytes: ArrayBuffer | Uint8Array): void;
/** Tira as tabelas (usado nos testes, para comparar com e sem elas). */
export declare function removerEfemerides(): void;
/** "completa" quando as tabelas da NASA estão carregadas; "básica" quando só há o astronomy-engine. */
export declare function precisaoDoMotor(): "completa" | "básica";
/** As tabelas cobrem este instante? tt em dias desde J2000 (tempo terrestre). Deixa dois dias de folga nas bordas. */
export declare function efemeridesCobrem(tt: number): boolean;
/**
 * Direção aparente de um corpo visto do centro da Terra, nos eixos equatoriais J2000 (os mesmos do astronomy-engine):
 * com o tempo que a luz leva para chegar e a aberração pelo movimento da Terra. tt em dias desde J2000.
 * nome: um planeta, "Sol" ou "Lua". Chamar só quando efemeridesCobrem(tt).
 */
export declare function direcaoAparente(nome: string, tt: number): [number, number, number];
/**
 * Nutação em longitude que falta no astronomy-engine, em graus. Ele usa os 5 maiores termos do modelo IAU 2000B;
 * aqui entram os 15 seguintes (cada um com até 0,07 segundo de arco). A nutação desloca todas as longitudes por igual,
 * então basta somar. tt em dias desde J2000.
 */
export declare function nutacaoQueFalta(tt: number): number;
/** Posição (km) e velocidade (km/s) da Lua em relação ao centro da Terra, eixos equatoriais J2000. */
export declare function estadoGeocentricoDaLua(tt: number): number[];
