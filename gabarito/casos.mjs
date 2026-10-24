/**
 * Os casos do gabarito: mapas de teste, sem nenhum dado de cliente.
 *
 * A lista é sorteada, mas sempre igual (a semente é fixa): datas de 1930 a
 * 2030, capitais de todos os estados e cidades de fora do Brasil, com e sem
 * hora de nascimento, com fuso pela base IANA e com fuso informado à mão.
 * Entram também casos escolhidos a dedo: as horas que não existiram e as
 * que se repetiram nas trocas do horário de verão, e latitudes altas.
 */

const CIDADES = [
  { uf: "SP", latitude: -23.5505, longitude: -46.6333 },
  { uf: "SP", latitude: -22.9056, longitude: -47.0608 },
  { uf: "RJ", latitude: -22.9068, longitude: -43.1729 },
  { uf: "MG", latitude: -19.9167, longitude: -43.9345 },
  { uf: "ES", latitude: -20.3155, longitude: -40.3128 },
  { uf: "PR", latitude: -25.4284, longitude: -49.2733 },
  { uf: "SC", latitude: -27.5954, longitude: -48.548 },
  { uf: "RS", latitude: -30.0346, longitude: -51.2177 },
  { uf: "DF", latitude: -15.7939, longitude: -47.8828 },
  { uf: "GO", latitude: -16.6869, longitude: -49.2648 },
  { uf: "MT", latitude: -15.601, longitude: -56.0974 },
  { uf: "MS", latitude: -20.4697, longitude: -54.6201 },
  { uf: "BA", latitude: -12.9777, longitude: -38.5016 },
  { uf: "PE", latitude: -8.0476, longitude: -34.877 },
  { uf: "PE", latitude: -3.8547, longitude: -32.4247 },
  { uf: "CE", latitude: -3.7319, longitude: -38.5267 },
  { uf: "RN", latitude: -5.7945, longitude: -35.211 },
  { uf: "PB", latitude: -7.1195, longitude: -34.845 },
  { uf: "AL", latitude: -9.6498, longitude: -35.7089 },
  { uf: "SE", latitude: -10.9472, longitude: -37.0731 },
  { uf: "MA", latitude: -2.5307, longitude: -44.3068 },
  { uf: "PI", latitude: -5.0892, longitude: -42.8019 },
  { uf: "PA", latitude: -1.4558, longitude: -48.4902 },
  { uf: "PA", latitude: -2.4385, longitude: -54.6996 },
  { uf: "AM", latitude: -3.119, longitude: -60.0217 },
  { uf: "AM", latitude: -6.6603, longitude: -69.8738 },
  { uf: "RO", latitude: -8.7612, longitude: -63.9004 },
  { uf: "AC", latitude: -9.9754, longitude: -67.8249 },
  { uf: "RR", latitude: 2.8235, longitude: -60.6758 },
  { uf: "AP", latitude: 0.0349, longitude: -51.0694 },
  { uf: "TO", latitude: -10.2491, longitude: -48.3243 },
  { uf: "", latitude: 38.7223, longitude: -9.1393, zona: "Europe/Lisbon", fusoHoras: 0 },
  { uf: "", latitude: 39.0997, longitude: -94.5786, zona: "America/Chicago", fusoHoras: -6 },
  { uf: "", latitude: 40.7128, longitude: -74.006, zona: "America/New_York", fusoHoras: -5 },
  { uf: "", latitude: 59.9139, longitude: 10.7522, zona: "Europe/Oslo", fusoHoras: 1 },
  { uf: "", latitude: 64.1466, longitude: -21.9426, zona: "Atlantic/Reykjavik", fusoHoras: 0 },
  { uf: "", latitude: -34.6037, longitude: -58.3816, zona: "America/Argentina/Buenos_Aires", fusoHoras: -3 },
  { uf: "", latitude: -33.8688, longitude: 151.2093, zona: "Australia/Sydney", fusoHoras: 10 },
  { uf: "", latitude: 35.6762, longitude: 139.6503, zona: "Asia/Tokyo", fusoHoras: 9 },
];

/** Sorteio com semente fixa (mulberry32): a lista sai sempre igual. */
function sorteador(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dois = (n) => String(n).padStart(2, "0");

/**
 * Entradas de calcularMapa. `zona` é preenchida por quem usa o caso
 * (o gabarito chama zonaDoLocal do próprio motor para as cidades do Brasil).
 */
export function casosDeMapa() {
  const r = sorteador(20261024);
  const casos = [];
  const inicio = Date.UTC(1930, 0, 1);
  const fim = Date.UTC(2030, 11, 31);
  for (let i = 0; i < 240; i++) {
    const cidade = CIDADES[Math.floor(r() * CIDADES.length)];
    const dia = new Date(inicio + Math.floor(r() * ((fim - inicio) / 86_400_000)) * 86_400_000);
    const data = `${dia.getUTCFullYear()}-${dois(dia.getUTCMonth() + 1)}-${dois(dia.getUTCDate())}`;
    const hora = `${dois(Math.floor(r() * 24))}:${dois(Math.floor(r() * 60))}`;
    const sorte = r();
    const modo = sorte < 0.7 ? "zona" : sorte < 0.85 ? "manual" : "sem-hora";
    casos.push({
      nome: `sorteado-${i + 1}`,
      modo,
      uf: cidade.uf,
      zona: cidade.zona ?? null,
      dados: {
        data,
        hora: modo === "sem-hora" ? null : hora,
        horaConhecida: modo !== "sem-hora",
        latitude: cidade.latitude,
        longitude: cidade.longitude,
        fusoHoras: cidade.fusoHoras ?? (cidade.uf === "AC" ? -5 : ["AM", "RO", "RR", "MT", "MS"].includes(cidade.uf) ? -4 : -3),
        horarioDeVerao: modo === "manual" ? r() < 0.4 : false,
      },
    });
  }

  // Escolhidos a dedo: trocas do horário de verão em São Paulo.
  const sp = CIDADES[0];
  const aDedo = [
    ["verao-inexistente-2018", "2018-11-04", "00:30"],
    ["verao-repetida-2019", "2019-02-16", "23:30"],
    ["verao-sp-2005", "2005-10-20", "12:00"],
    ["sem-verao-sp-2019", "2019-12-01", "12:00"],
    ["meia-noite-virada-ano", "1999-12-31", "23:59"],
    ["meio-dia-1930", "1930-01-01", "12:00"],
  ];
  for (const [nome, data, hora] of aDedo) {
    casos.push({
      nome,
      modo: "zona",
      uf: sp.uf,
      zona: null,
      dados: { data, hora, horaConhecida: true, latitude: sp.latitude, longitude: sp.longitude, fusoHoras: -3, horarioDeVerao: false },
    });
  }
  return casos;
}

/** Instantes para a fase da Lua e as lunações. */
export function instantesDaLua() {
  const r = sorteador(9112026);
  const lista = [];
  const inicio = Date.UTC(1990, 0, 1);
  const fim = Date.UTC(2035, 0, 1);
  for (let i = 0; i < 40; i++) lista.push(new Date(inicio + Math.floor(r() * (fim - inicio))).toISOString());
  return lista;
}

/** Instantes para a tabela de efeméride (Abundantia), dentro e fora do período. */
export function instantesDaTabela() {
  const r = sorteador(151);
  const lista = ["1929-06-01T00:00:00.000Z", "1930-01-03T00:00:00.000Z", "2030-12-30T00:00:00.000Z", "2031-06-01T00:00:00.000Z"];
  const inicio = Date.UTC(1930, 1, 1);
  const fim = Date.UTC(2030, 10, 1);
  for (let i = 0; i < 30; i++) lista.push(new Date(inicio + Math.floor(r() * (fim - inicio))).toISOString());
  return lista;
}

export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO", "",
];
