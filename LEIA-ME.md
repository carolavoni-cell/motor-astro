# Motor de cálculo astrológico (motor-astro)

Um só motor para todos os projetos de astrologia da Carol Avoni. Ele só
calcula: posições, casas, aspectos, fuso e horário de verão, Lua e
lunações. Textos, telas e dados de clientes ficam em cada projeto.

Este repositório é público: aqui entra só a matemática. **Nunca** colocar
aqui dados de clientes, textos de leitura ou chaves de acesso.

## Quem usa

| Projeto | Onde está a referência ao motor | Versão em uso |
|---|---|---|
| Portal do Acompanhamento | `portal/package.json`, linha `"motor-astro"` | v1.0.0 |
| Mapa do dinheiro | `index.html`, linha do `<script>` do motor | v1.0.0 |

Quando um projeto novo passar a usar o motor, acrescente uma linha aqui.

## Como um projeto usa o motor

**Projeto com Node (como o portal).** No `package.json`:

```json
"motor-astro": "github:carolavoni-cell/motor-astro#v1.0.0"
```

e no código:

```ts
import { calcularMapa, zonaDoLocal } from "motor-astro";
```

**Página HTML (como o Mapa do dinheiro).** Uma linha antes dos outros scripts:

```html
<script src="https://cdn.jsdelivr.net/gh/carolavoni-cell/motor-astro@v1.0.0/dist/motor-astro.js"></script>
```

Depois disso, tudo fica em `MotorAstro` (por exemplo
`MotorAstro.calcularMapa(...)`). O arquivo já traz o astronomy-engine dentro.
A página precisa de internet para carregar o motor.

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

## O gabarito

`gabarito/` tem 246 mapas de teste (datas de 1930 a 2030, capitais de todos
os estados e cidades de fora do Brasil, com e sem hora, fuso automático e
manual, horas de troca do horário de verão), 40 fases da Lua, lunações com
eclipses, a Lua passando pelas casas, a tabela da Abundantia e o fuso de cada
estado. O `esperado.json` saiu do cálculo do portal e do Mapa do dinheiro em
2026-10-24, antes de o motor ser separado: é o que os dois projetos já
mostravam. Nenhum caso usa dado de cliente.

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
