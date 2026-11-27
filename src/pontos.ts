import * as A from "astronomy-engine";
import { GRAUS, norm360 } from "./base";
import "./deltat";
import { direcaoAparente, efemeridesCobrem, estadoGeocentricoDaLua, nutacaoQueFalta } from "./efemerides/jpl";

/**
 * Posições dos pontos do mapa, sempre no zodíaco DA DATA (ECT), que é o
 * usado na astrologia tropical e no Solar Fire.
 */

export const CORPOS: { nome: string; corpo: A.Body; glifo: string }[] = [
  { nome: "Sol", corpo: A.Body.Sun, glifo: "☉" },
  { nome: "Lua", corpo: A.Body.Moon, glifo: "☽" },
  { nome: "Mercúrio", corpo: A.Body.Mercury, glifo: "☿" },
  { nome: "Vênus", corpo: A.Body.Venus, glifo: "♀" },
  { nome: "Marte", corpo: A.Body.Mars, glifo: "♂" },
  { nome: "Júpiter", corpo: A.Body.Jupiter, glifo: "♃" },
  { nome: "Saturno", corpo: A.Body.Saturn, glifo: "♄" },
  { nome: "Urano", corpo: A.Body.Uranus, glifo: "♅" },
  { nome: "Netuno", corpo: A.Body.Neptune, glifo: "♆" },
  { nome: "Plutão", corpo: A.Body.Pluto, glifo: "♇" },
];

const NOME_NAS_TABELAS = new Map<A.Body, string>([
  [A.Body.Sun, "Sol"], [A.Body.Moon, "Lua"], [A.Body.Mercury, "Mercúrio"], [A.Body.Venus, "Vênus"], [A.Body.Mars, "Marte"],
  [A.Body.Jupiter, "Júpiter"], [A.Body.Saturn, "Saturno"], [A.Body.Uranus, "Urano"], [A.Body.Neptune, "Netuno"], [A.Body.Pluto, "Plutão"],
]);

export function longitudeEcliptica(corpo: A.Body, tempo: A.AstroTime): number {
  // Com as tabelas da NASA carregadas ("motor-astro/completo"), a posição sai delas: precisão de Swiss Ephemeris.
  const nome = NOME_NAS_TABELAS.get(corpo);
  if (nome && efemeridesCobrem(tempo.tt)) {
    const [x, y, z] = direcaoAparente(nome, tempo.tt);
    const daData = A.RotateVector(A.Rotation_EQJ_ECT(tempo), new A.Vector(x, y, z, tempo));
    return norm360(Math.atan2(daData.y, daData.x) / GRAUS + nutacaoQueFalta(tempo.tt));
  }
  if (corpo === A.Body.Moon) return norm360(A.EclipticGeoMoon(tempo).lon);
  const vetor = A.GeoVector(corpo, tempo, true);
  const daData = A.RotateVector(A.Rotation_EQJ_ECT(tempo), vetor);
  return norm360(Math.atan2(daData.y, daData.x) / GRAUS);
}

/** Obliquidade verdadeira da data (inclinação da Terra), usada nas casas. */
export function obliquidadeVerdadeira(tempo: A.AstroTime): number {
  const polo = A.RotateVector(A.Rotation_EQD_ECT(tempo), new A.Vector(0, 0, 1, tempo));
  return Math.acos(Math.min(1, Math.max(-1, polo.z))) / GRAUS;
}

/** Ascensão reta do Meio do Céu: ponto de partida das casas. */
export function armcDoLugar(tempo: A.AstroTime, longitudeLugar: number): number {
  return norm360(A.SiderealTime(tempo) * 15 + longitudeLugar);
}

function vetorLuaDaData(tempo: A.AstroTime): A.Vector {
  return A.RotateVector(A.Rotation_EQJ_ECT(tempo), A.GeoMoon(tempo));
}

/**
 * Nodo Norte verdadeiro (osculador): onde o plano da órbita da Lua cruza
 * a eclíptica neste instante. Vem do movimento real da Lua, não de média.
 */
export function nodoNorteVerdadeiro(tempo: A.AstroTime): number {
  if (efemeridesCobrem(tempo.tt)) {
    // Com as tabelas da NASA: posição e velocidade exatas da Lua, sem diferença numérica.
    const e = estadoGeocentricoDaLua(tempo.tt);
    const rot = A.Rotation_EQJ_ECT(tempo);
    const r = A.RotateVector(rot, new A.Vector(e[0], e[1], e[2], tempo));
    const w = A.RotateVector(rot, new A.Vector(e[3], e[4], e[5], tempo));
    return norm360(Math.atan2(r.y * w.z - r.z * w.y, -(r.z * w.x - r.x * w.z)) / GRAUS + nutacaoQueFalta(tempo.tt));
  }
  const passo = 0.02; // dias
  const antes = vetorLuaDaData(tempo.AddDays(-passo / 2));
  const depois = vetorLuaDaData(tempo.AddDays(passo / 2));
  const posicao = vetorLuaDaData(tempo);
  const velocidade = {
    x: (depois.x - antes.x) / passo,
    y: (depois.y - antes.y) / passo,
    z: (depois.z - antes.z) / passo,
  };
  // h = posição × velocidade (normal do plano da órbita)
  const hx = posicao.y * velocidade.z - posicao.z * velocidade.y;
  const hy = posicao.z * velocidade.x - posicao.x * velocidade.z;
  // A linha dos nodos é perpendicular a h e ao eixo da eclíptica.
  return norm360(Math.atan2(hx, -hy) / GRAUS);
}

/**
 * Lilith (Lua Negra) média: o apogeu médio da órbita da Lua.
 * Fórmulas de Meeus para a longitude média e a anomalia média da Lua.
 */
export function lilithMedia(tempo: A.AstroTime): number {
  const T = tempo.tt / 36525;
  const longitudeMedia =
    218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2 + T ** 3 / 538841 - T ** 4 / 65194000;
  const anomaliaMedia =
    134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2 + T ** 3 / 69699 - T ** 4 / 14712000;
  // perigeu = longitude média - anomalia média; o apogeu fica no lado oposto
  return norm360(longitudeMedia - anomaliaMedia + 180);
}

/**
 * Parte da Fortuna, com a fórmula invertida para nascimento noturno
 * (decisão da Carol).
 */
export function parteDaFortuna(asc: number, sol: number, lua: number, deDia: boolean): number {
  return norm360(deDia ? asc + lua - sol : asc + sol - lua);
}

/** Um planeta está retrógrado quando a longitude anda para trás. */
export function estaRetrogrado(corpo: A.Body, tempo: A.AstroTime): boolean {
  if (corpo === A.Body.Sun || corpo === A.Body.Moon) return false;
  // Sentido do movimento neste instante: diferença em 3 minutos para cada lado. Até a versão 1.1.0 era meio dia para
  // cada lado, o que deslocava a hora da estação (o planeta já tinha virado e a média do dia ainda não).
  const antes = longitudeEcliptica(corpo, tempo.AddDays(-0.002));
  const depois = longitudeEcliptica(corpo, tempo.AddDays(0.002));
  let avanco = depois - antes;
  if (avanco > 180) avanco -= 360;
  if (avanco < -180) avanco += 360;
  return avanco < 0;
}
