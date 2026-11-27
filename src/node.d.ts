// O mínimo do Node que a entrada "completo" usa (o projeto não instala os tipos do Node).
declare module "node:fs" { export function readFileSync(caminho: string): Uint8Array; }
declare module "node:path" { export function dirname(caminho: string): string; export function join(...partes: string[]): string; }
declare module "node:url" { export function fileURLToPath(url: string): string; }
