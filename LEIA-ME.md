# Motor de cálculo astrológico (motor-astro)

Um só motor para todos os projetos de astrologia da Carol Avoni. Ele só
calcula: posições, casas, aspectos, fuso e horário de verão, Lua e
lunações e, desde a versão 1.1.0, a previsão (trânsitos, céu do dia,
ingressos, estações, retorno solar, profecção e progressões). Textos, telas
e dados de clientes ficam em cada projeto.

Este repositório é público: aqui entra só a matemática. **Nunca** colocar
aqui dados de clientes, textos de leitura ou chaves de acesso.

## Quem usa

| Projeto | Onde está a referência ao motor | Versão em uso |
|---|---|---|
| Portal do Acompanhamento | `portal/package.json`, linha `"motor-astro"` | v1.1.0 na pasta do projeto desde 24/11/2026; o site no ar segue na v1.0.0 até a próxima publicação do portal |
| Mapa do dinheiro | `package.json` da raiz, linha `"motor-astro"` (o `gerador/pacote_fatos.cjs` lê o motor instalado) | v1.1.0 |
| Planner 2027 | `package.json` da raiz, linha `"motor-astro"` (quem chama é o `cerebro/inventario.mjs`) | v1.1.0 |

Quando um projeto novo passar a usar o motor, acrescente uma linha aqui.

## Como um projeto usa o motor

**Projeto com Node (como o portal).** No `package.json`:

```json
"motor-astro": "github:carolavoni-cell/motor-astro#v1.1.0"
```

e no código:

```ts
import { calcularMapa, zonaDoLocal } from "motor-astro";
```

**Página HTML (como o Mapa do dinheiro).** Uma linha antes dos outros scripts:

```html
<script src="https://cdn.jsdelivr.net/gh/carolavoni-cell/motor-astro@v1.1.0/dist/motor-astro.js"></script>
```

Depois disso, tudo fica em `MotorAstro` (por exemplo
`MotorAstro.calcularMapa(...)`). O arquivo já traz o astronomy-engine dentro.
A página precisa de internet para carregar o motor.

**Nunca apontar um projeto para esta pasta do computador** (por exemplo
`../motor-astro/dist`). A pasta pode estar à frente da versão publicada, e
o projeto mudaria de resultado sem ninguém conferir. Sempre a versão
publicada, com o número.

O número depois de `#` ou `@` é a versão. Cada projeto escolhe a sua: uma
versão nova do motor não muda nada num projeto até alguém trocar esse número
lá e conferir.

## Como mudar o motor

1. Mudar o código em `src/`.
2. Rodar `npm run pronto`, que monta o motor e confere o gabarito.
   - Se o gabarito acusar diferença e a mudança **não** era para mudar
     resultado, o erro está na mudança: corrigir.
   - Se a mudança era para mudar resultado (regra nova aprovada pela Carol,
     correção conferida no Solar Fire), rodar `npm run gabarito:novo`,
     olhar as diferenças e subir `VERSAO_DO_MAPA` em `src/mapa.ts` (o
     portal recalcula os mapas guardados quando esse número muda).
3. Subir a versão em `package.json` (1.0.0 → 1.1.0; correção pequena que
   não muda resultado nenhum → 1.0.1) e rodar `npm run pronto` de novo.
4. Guardar no Git, marcar a versão e enviar:
   `git commit`, `git tag v1.1.0`, `git push --follow-tags`.
5. Em cada projeto da tabela acima: trocar o número da versão, conferir o
   projeto e atualizar a tabela.

## Previsão (desde a 1.1.0)

`src/previsao.ts` calcula o céu em movimento sobre um mapa. Veio do Planner
2027, onde os aspectos foram conferidos nos relatórios dinâmicos do Solar
Fire. Devolve datas e graus com precisão total: o fuso de exibição, o
arredondamento, o que entra no produto e o texto são de cada projeto.

- `amostrasDoCeu`: o céu dia a dia num período, base das buscas abaixo.
- `transitosSobrePontos`: cada trânsito de um planeta sobre um ponto do
  mapa, com entrada e saída da orbe no minuto, as passagens exatas, a menor
  distância e a menor distância dentro de uma janela (o ano, por exemplo).
  Sextil, quadratura e trígono são buscados nos dois sentidos.
- `aspectosNoCeu`: aspectos exatos entre os planetas do céu (céu do dia).
- `mudancasDeCasaESigno`: quando um planeta muda de casa no mapa e de signo.
- `estacoesDosPlanetas`: quando um planeta para e muda de sentido.
- `pontosTocados`: que pontos do mapa um grau toca (lunação, estação).
- `fimDaFaseCheia`: quando a Lua chega a 225° do Sol.
- `retornoSolar`, `idadeNaData`, `profeccaoAnual`, `casaPorSignosInteiros`.
- Progressões secundárias (um dia por ano trópico): `instanteProgredido`,
  `ceuProgredido`, `faseDaLunacao`, `mudancasProgredidas`,
  `mudancasDeFaseProgredida`, `aspectosProgredidos`.

## O gabarito

`gabarito/` tem 246 mapas de teste (datas de 1930 a 2030, capitais de todos
os estados e cidades de fora do Brasil, com e sem hora, fuso automático e
manual, horas de troca do horário de verão), 40 fases da Lua, lunações com
eclipses, a Lua passando pelas casas, a tabela da Abundantia e o fuso de cada
estado. O `esperado.json` saiu do cálculo do portal e do Mapa do dinheiro em
2026-10-24, antes de o motor ser separado: é o que os dois projetos já
mostravam. Os dois casos de previsão entraram com a versão 1.1.0, depois de
o Planner 2027 dar o mesmo resultado com o cálculo antigo dele e com o
motor. Nenhum caso usa dado de cliente.

## Convenções (decididas pela Carol)

- Zodíaco tropical da data, como no Solar Fire.
- Casas topocêntricas (Polich-Page). Sem hora de nascimento: sem casas,
  sem Ascendente, sem Fortuna.
- Nodo verdadeiro; Lilith média (Meeus); Quíron fora por enquanto.
- Parte da Fortuna com inversão noturna: de dia Asc + Lua − Sol; de noite
  Asc + Sol − Lua.
- Aspectos maiores com a tabela de orbes da astrologia psicológica:
  oposição aos ângulos até 5°; com Ascendente ou Meio do Céu vale a menor
  orbe; Sol e Lua têm prioridade nos demais; Nodos, Lilith, Fortuna e
  asteroides com 2°; aspecto fora de signo conta.
- Fuso e horário de verão pela base de fusos IANA, com todo o histórico
  brasileiro; fuso manual quando informado.
- Posições exibidas com os minutos cortados, sem arredondar.
- Fase da Lua pelo calendário brasileiro: cada fase começa no momento exato.

## Arquivos

- `src/`: o código do motor.
- `dist/`: o motor montado, que os projetos usam (não editar à mão; sai do
  `npm run build`).
- `gabarito/`: os casos de teste e o resultado esperado.
- `scripts/`: montagem do motor e do gabarito.
