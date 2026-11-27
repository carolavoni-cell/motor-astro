/**
 * Entrada "motor-astro/completo", para programas que rodam no Node (o servidor do Portal, o Planner):
 * carrega as tabelas da NASA (dados públicos do JPL, 1900 a 2100) e devolve o mesmo motor.
 * Com elas, as posições batem com a Swiss Ephemeris e o Solar Fire em frações de segundo de arco,
 * e o horário de trânsitos, lunações e estações pode ser usado como está.
 * Basta importar daqui uma vez, no começo do programa; quem importar "motor-astro" depois já usa as tabelas.
 * Páginas no navegador usam "motor-astro" (sem as tabelas, que pesam 9 MB): bom para mapa natal, não para horário de evento.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { instalarEfemerides } from "./efemerides/jpl";

declare const __dirname: string | undefined;
const aqui = typeof __dirname === "string" ? __dirname : dirname(fileURLToPath(import.meta.url));
instalarEfemerides(readFileSync(join(aqui, "efemerides-de440.bin")));

export * from "./index";
