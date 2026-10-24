import { norm360 } from "./base";

/**
 * Casas topocêntricas (Polich e Page), portadas do artefato de casas da
 * Carol, que já foi validado contra o Solar Fire.
 *
 * armc: ascensão reta do Meio do Céu, em graus.
 * lat: latitude do lugar. eps: obliquidade verdadeira da data.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const sen = (g: number) => Math.sin(g * D2R);
const cos = (g: number) => Math.cos(g * D2R);
const tan = (g: number) => Math.tan(g * D2R);
const atanGraus = (x: number) => Math.atan(x) * R2D;

function ascAuxiliar(x: number, f: number, sene: number, cose: number): number {
  let ass = -tan(f) * sene + cose * cos(x);
  if (Math.abs(ass) < 1e-9) ass = 0;
  let senx = sen(x);
  if (Math.abs(senx) < 1e-9) senx = 0;
  if (senx === 0) ass = ass < 0 ? -1e-9 : 1e-9;
  else if (ass === 0) ass = senx < 0 ? -90 : 90;
  else ass = atanGraus(senx / ass);
  if (ass < 0) ass = 180 + ass;
  return ass;
}

function ascPorQuadrante(x1: number, f: number, sene: number, cose: number): number {
  const x = norm360(x1);
  const quadrante = Math.floor(x / 90) + 1;
  if (quadrante === 1) return norm360(ascAuxiliar(x, f, sene, cose));
  if (quadrante === 2) return norm360(180 - ascAuxiliar(180 - x, -f, sene, cose));
  if (quadrante === 3) return norm360(180 + ascAuxiliar(x - 180, -f, sene, cose));
  return norm360(360 - ascAuxiliar(360 - x, f, sene, cose));
}

/** Devolve as 12 cúspides, da casa 1 à 12. */
export function cuspidesTopocentricas(armc: number, lat: number, eps: number): number[] {
  const sene = sen(eps);
  const cose = cos(eps);
  const tanLat = tan(lat);

  let mc: number;
  if (Math.abs(armc - 90) > 1e-6 && Math.abs(armc - 270) > 1e-6) {
    mc = atanGraus(tan(armc) / cose);
    if (armc > 90 && armc <= 270) mc = norm360(mc + 180);
  } else {
    mc = Math.abs(armc - 90) <= 1e-6 ? 90 : 270;
  }
  mc = norm360(mc);

  const asc = ascPorQuadrante(armc + 90, lat, sene, cose);
  // A divisão topocêntrica usa um terço e dois terços da tangente da latitude.
  const f1 = atanGraus(tanLat / 3);
  const f2 = atanGraus((tanLat * 2) / 3);

  const c: number[] = new Array(12);
  c[0] = asc; // casa 1
  c[9] = mc; // casa 10
  c[10] = ascPorQuadrante(30 + armc, f1, sene, cose); // casa 11
  c[11] = ascPorQuadrante(60 + armc, f2, sene, cose); // casa 12
  c[1] = ascPorQuadrante(120 + armc, f2, sene, cose); // casa 2
  c[2] = ascPorQuadrante(150 + armc, f1, sene, cose); // casa 3
  c[3] = norm360(c[9] + 180); // casa 4
  c[4] = norm360(c[10] + 180); // casa 5
  c[5] = norm360(c[11] + 180); // casa 6
  c[6] = norm360(c[0] + 180); // casa 7
  c[7] = norm360(c[1] + 180); // casa 8
  c[8] = norm360(c[2] + 180); // casa 9
  return c;
}
