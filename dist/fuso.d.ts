/**
 * Fuso horário e horário de verão.
 *
 * Correção de 2026-10-16: a regra fixa anterior (verão do primeiro domingo
 * de novembro ao terceiro de fevereiro, numa lista fixa de estados) errava
 * centenas de dias por estado, porque as datas e os estados participantes
 * mudaram quase todo ano. Agora a hora local é convertida pela base de
 * fusos IANA, que vem embutida no Node e no navegador com todo o histórico
 * brasileiro. Exemplos que a regra antiga errava: São Paulo 20/10/2005
 * (tinha verão), São Paulo 01/12/2019 (não tinha), Salvador 01/12/2011
 * (tinha), Recife 01/12/1999 (tinha).
 */
export type ZonaDoLocal = {
    zona: string | null;
    aproximada: boolean;
};
/**
 * Zona IANA pelo estado e pela longitude. Amazonas (oeste: Eirunepé), Pará
 * (oeste: Santarém) e Pernambuco (Fernando de Noronha) têm mais de uma zona;
 * nos dois primeiros a divisa é aproximada e o resultado vem marcado.
 * Fora do Brasil, devolve zona nula: aí vale o fuso informado à mão.
 */
export declare function zonaDoLocal(uf?: string | null, longitude?: number | null): ZonaDoLocal;
export type AvisoDeHora = "repetida" | "inexistente";
/**
 * Converte a hora local para UTC pela zona IANA. Detecta a hora que não
 * existiu (início do horário de verão) e a hora que se repetiu (fim do
 * horário de verão); na repetida, usa a primeira ocorrência (ainda no verão).
 */
export declare function instanteNaZona(o: {
    ano: number;
    mes: number;
    dia: number;
    hora: number;
    minuto: number;
}, zona: string): {
    instante: Date;
    deslocamentoHoras: number;
    horarioDeVerao: boolean;
    aviso: AvisoDeHora | null;
};
/** Havia horário de verão nesta data e neste local? (consulta à base IANA) */
export declare function tinhaHorarioDeVerao(ano: number, mes: number, dia: number, uf?: string | null, longitude?: number | null): boolean;
/**
 * Instante exato (UTC) com fuso fixo informado à mão (cidades fora do
 * Brasil ou correção manual). fusoHoras é negativo no Brasil (-3 em
 * Brasília); o horário de verão adianta o relógio em 1 hora.
 */
export declare function instanteDoNascimento(opcoes: {
    ano: number;
    mes: number;
    dia: number;
    hora: number;
    minuto: number;
    fusoHoras: number;
    horarioDeVerao?: boolean;
}): Date;
/** A zona IANA existe na base de fusos do servidor? */
export declare function zonaValida(zona: string): boolean;
/**
 * Para cidades fora do Brasil: converte a zona escolhida no fuso padrão e no
 * horário de verão da data e hora de nascimento, que é o que o banco guarda
 * (fuso_horas e horario_verao). Sem hora, usa o meio-dia.
 */
export declare function fusoParaGravar(zona: string, dataIso: string, hora: string | null): {
    fuso_horas: number;
    horario_verao: boolean;
};
/** Fuso padrão de hoje para o estado, em horas (só para exibição). Fora do Brasil, -3. */
export declare function fusoPadraoPorUf(uf?: string | null): number;
