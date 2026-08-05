# Próximos Passos — Teste de Seleção de Condutores

Backlog técnico para retomar em sessões futuras. Atualizado em 2026-08-05.

## 2026-08-05 — Sincronização com o app de agendamento (3º CECEM/2026)

O edital nº 047/2026-CBMDF/DIREN/SEITC foi publicado e a planilha
`Selecao_Condutores_2026` passou a ser compartilhada com o
[`painel-de-agendamento`](https://github.com/pfantiniamorim/painel-de-agendamento).
Diagnóstico e correções desta sessão:

| Achado | Situação |
|---|---|
| **Escrita do app quebrada**: os dois apps apontavam para a MESMA URL `/exec`. Como a planilha só admite um script vinculado, colar o `Code.gs` do agendamento por cima apagou o `doPost` daqui — penalidade, tempo e cadastro respondiam `ACAO_INVALIDA` | ✅ Resolvido: o script vinculado volta a ser **exclusivo deste app**; o agendamento virou projeto independente com implantação própria. `ENDPOINT_APPS_SCRIPT` não mudou |
| **Cadastro duplo**: este app chaveava por `ID`, o agendamento por `MATRICULA`, e 54 dos 56 candidatos estavam sem `ID` — o app enxergava só 2 pessoas | ✅ Resolvido: a chave passou a ser a `MATRICULA` (`parseCandidatos`), com o `ID` legado como reserva. Os 56 aparecem nos dois apps |
| `ATIVO = "NÃO"` (com til) não desativava aqui, mas desativava no agendamento | ✅ Resolvido: `AppUtils.candidatoAtivo()` normaliza o acento |
| Pontuação ainda com valores de exemplo | 🔶 Pendente do PDF do edital (ver item 3 abaixo) |

**Reimplantar é obrigatório** depois de colar o `apps_script/Code.gs` novo:
Implantar → Gerenciar implantações → ✏️ → Versão: **Nova versão** → Implantar.
Sem isso a URL continua servindo o código antigo.

## Estado atual (o que já está pronto e publicado)

- App estático (HTML + `js/config.js` + `js/utils.js`, sem build) publicado no
  **GitHub Pages** a partir do repositório
  `pfantiniamorim/App_Avaliacao_Individual_2026_v2` (branch `main`).
- Persistência em **Google Sheets** via **Apps Script** (`apps_script/Code.gs`),
  3 abas: `CANDIDATOS`, `REGISTROS` (log auditável, 1 linha por penalidade),
  `RESULTADOS` (tempo por candidato). Leitura por polling de CSV a cada
  `POLLING_MS` (`js/config.js`).
- **Modelo multi-avaliador em tempo real**: até 15 avaliadores marcam
  penalidades do mesmo candidato; o resultado é a soma de todas as marcações
  (`AppUtils.montarCandidatos` em `js/utils.js`).
- Papéis: **Avaliador** (`selecao.html` → `avaliacao.html` → `logs.html`, sem
  senha) e **Chefe da Avaliação** (`participantes.html`, `dashboard.html`,
  `configuracoes.html`, protegidos por PIN em `js/config.js` →
  `AppUtils.pedirPin()`).
- Fórmula da nota (MF), tabela de tempo, tabela de penalidades, tempo máximo
  e critérios de desempate — tudo configurável em `js/config.js`, nada fixo
  na lógica (`AppUtils.calcularResultado`).

## Pendências decididas, ainda não implementadas

Discutidas e aprovadas em conversa, mas o código ainda não foi alterado —
retomar quando houver disponibilidade:

### 1. Mover o PIN do Chefe para o Apps Script (prioridade: segurança)

Hoje `PIN_CHEFE` fica em texto puro em `js/config.js`, visível a quem abrir o
site e inspecionar o código-fonte (F12). Plano:

- `apps_script/Code.gs`: guardar o PIN em
  `PropertiesService.getScriptProperties().getProperty('PIN_CHEFE')` (painel
  do Apps Script, nunca no código publicado). Nova ação `login` que recebe
  `{pin}` e responde `{ok:true}` ou erro.
- As ações administrativas que alteram dados de configuração —
  `candidato`, `removerCandidato`, `tempo` — passam a exigir o `pin` no
  payload e são recusadas pelo servidor se não bater.
- `penalidade` (marcar) e `removerPenalidade` (desfazer) continuam **sem**
  PIN — são as ações que os avaliadores usam em campo, sem login.
- `js/config.js`: remover a chave `PIN_CHEFE`.
- `js/utils.js`: `pedirPin()` passa a validar via POST à ação `login`; ao
  acertar, guarda o PIN em `localStorage` para reenviar nas chamadas
  administrativas; `sairChefe()` limpa esse valor.
- Documentar em `CONFIGURAR_PLANILHA.md` como cadastrar a propriedade
  `PIN_CHEFE` (Apps Script → ⚙ Configurações do projeto → Propriedades do
  script) e lembrar de **reimplantar** (Gerenciar implantações → Editar →
  Nova versão) depois de colar o `Code.gs` atualizado.

**Limite honesto que continua existindo:** a ação `penalidade` seguirá aberta
(alguém que inspecione o código consegue montar e enviar uma marcação falsa
sem PIN) e as URLs CSV de leitura continuam públicas — inerente a um app sem
login e custo zero. O ganho real desta mudança é tirar o PIN do código-fonte
e blindar as ações que alteram cadastro/configuração.

### 2. Corrigir a persistência da lista "Minhas marcações" (bug confirmado)

**Sintoma relatado:** depois de recarregar a página ou trocar de candidato em
`avaliacao.html`, o botão "Remover" desaparece e não há mais como desfazer
uma marcação — mesmo que ela continue na planilha.

**Causa:** a lista `minhasMarcacoes` (variável em memória, `avaliacao.html`)
é zerada a cada troca de candidato/recarregamento; ela nunca foi lida de
volta da planilha.

**Correção combinada:**
- A tabela "MINHAS MARCAÇÕES NESTE CANDIDATO" passa a ser alimentada pelo
  **polling** (`data.registros` filtrado por `candidatoId` selecionado +
  `avaliador` desta sessão), não mais por uma lista em memória — assim ela
  **sobrevive a recarregar a página**.
- O botão "Remover" continua chamando `AppUtils.removerPenalidade(ts)` (já
  existe, sem PIN), **sempre com `confirm()`** antes de remover.
- Por desenho, cada avaliador só remove **as próprias marcações** naquele
  candidato — evita apagar por engano o que outro avaliador marcou.
- Para corrigir a marcação de **outro** avaliador (ex.: quem marcou já foi
  embora), o Chefe ganha um botão **Remover** em cada linha do "Log de
  Auditoria" do `dashboard.html`, chamando a mesma `removerPenalidade(ts)`
  com confirmação — tela já protegida por PIN.

### 3. Valores de exemplo a substituir pelo edital real ⚠ PENDENTE

O **edital nº 047/2026-CBMDF/DIREN/SEITC (3º CECEM/2026)** já está publicado
em [ensino.cbm.df.gov.br](https://ensino.cbm.df.gov.br/edital-no-047-2026-cbmdf-diren-seitc-referente-a-abertura-do-processo-seletivo-para-o-3o-curso-de-especializacao-para-condutores-de-veiculos-de-emergencia-3o-cecem-2026/),
mas o domínio é bloqueado pela política de saída das sessões do Claude Code
(403 no CONNECT do proxy). **A transcrição depende do PDF ser enviado no
chat ou pelo Google Drive.**

A substituir em `js/config.js`, e só ali:

- `TABELA_TEMPO` — faixas de exemplo (100→02:30, 90→02:45 …).
- `TABELA_PENALIDADES` — toque=3, derrubada=10, apagar viatura=10,
  desvio=100, segurança=ELIMINATÓRIO.
- `TEMPO_MAXIMO` (`04:06`), `FORMULA_NOTA`
  (`(PONTUACAO_TEMPO * 1.75 + 100 - PENALIDADES) / 2.75`),
  `CRITERIOS_DESEMPATE` e `EXERCICIOS`.

Conferir também contra o edital, sem alterar por conta própria: as **datas
da seletiva** na aba `Faixas` da planilha (hoje 10–13/08/2026, enquanto o
curso está previsto para 28/09–28/10/2026), o **local** (`15º GBM`) e as
**60 vagas** (4/4/4/3 por faixa) contra os 56 convocados cadastrados.

## Achados do /code-review (2026-07-24) — simplificação e otimização

Revisão do código atual (`js/utils.js`, `js/config.js`, `apps_script/Code.gs`,
todas as telas). Todos os 8 itens abaixo foram **verificados linha a linha**
contra o código real antes de entrar aqui. Nenhum foi corrigido ainda —
ordenados do mais para o menos importante.

### Risco real (corrigir antes do próximo teste com muitos avaliadores)

1. ✅ **RESOLVIDO em 2026-08-05** — **`apps_script/Code.gs`** `doPost()` chamava
   `lock.tryLock(15000)` sem conferir o retorno booleano. Se o lock falhasse sob
   disputa (vários avaliadores marcando ao mesmo tempo), a leitura-e-escrita de
   `gravarTempo`/`salvarCandidato`/`removerPorColuna` rodava sem proteção real e
   podia corromper/sobrescrever um registro. Agora responde
   "Servidor ocupado, tente de novo em instantes." e o app reenvia pela fila.
2. **`js/utils.js:342`** (`iniciarPolling`) — o `setInterval` não trava contra
   execução sobreposta, e `reenviarPendentes()` é chamado sem `await`. Em
   conexão lenta, dois ciclos podem ler e reenviar a mesma fila offline,
   duplicando uma penalidade em `REGISTROS`. **Fix:** guardar um flag
   "ciclo em andamento" e pular o tick se o anterior ainda não terminou; ou
   trocar `setInterval` por um laço que só reagenda após o `tick()` anterior
   resolver.

### Código morto

3. ✅ **RESOLVIDO em 2026-08-05** — **`js/utils.js`** o critério de desempate
   `"antiguidade"` em `classificarRanking()` comparava um campo que não existe
   mais em lugar nenhum. Ramo removido. Também saiu `idCurto()`, que perdeu o
   último uso quando a matrícula virou a chave do cadastro.

### Duplicação (manutenção)

4. **Ordenação por `ts` decrescente copiada 3x** — `dashboard.html:155`,
   `dashboard.html:183` e `logs.html:114` repetem a mesma expressão de sort.
   **Fix:** extrair para `AppUtils.ordenarPorTsDesc(lista)` em `js/utils.js`.
5. **Guarda "campo em foco" duplicada** — `dashboard.html:132`
   (`algumTempoEmFoco`) e `participantes.html:110` (`algumCampoEmFoco`)
   reimplementam a mesma checagem via `document.activeElement`. **Fix:**
   `AppUtils.algumCampoComClasseEmFoco(classe)` genérico em `js/utils.js`.
6. ✅ **RESOLVIDO em 2026-08-05** — **ID da planilha repetido 3x** em
   `js/config.js`, contradizendo o comentário que dizia bastar trocar "o ID".
   Agora há uma constante `SHEET_ID` e as 3 URLs são montadas a partir dela.

### Eficiência (baixo impacto, fácil de aplicar)

7. **`js/utils.js:317`** — `tick()` sempre busca as 3 abas (CANDIDATOS,
   REGISTROS, RESULTADOS) mesmo em telas que só usam uma (`logs.html` só usa
   registros; `participantes.html` só usa candidatos). Com 15 avaliadores
   sondando a cada 12s, é banda e cota do Google desperdiçadas.
8. **`dashboard.html:233`** — `ligarInputsDeTempo()` reconsulta todos os
   `.time-input` com `querySelectorAll` numa passagem separada, quando
   `renderTempos()` já tinha a referência do `input` recém-criado no laço.
   **Fix:** anexar os listeners direto ali, sem a segunda passagem.

## Limitações conhecidas (aceitas para manter custo zero)

- App 100% estático: qualquer visitante consegue ler o código-fonte via F12
  (inclusive URLs do Apps Script e das planilhas). Não há como evitar isso
  em nenhuma hospedagem gratuita — Netlify grátis também não protege por
  senha (isso é recurso pago, plano Pro).
- Sem autenticação real de avaliador: qualquer um com o link consegue enviar
  uma marcação de penalidade sem se identificar de verdade (o campo
  "avaliador" é apenas um texto digitado).
- Leitura por polling (não é push instantâneo): mudanças levam até
  `POLLING_MS` (12s por padrão) para aparecer em outra tela.

## Como limpar os dados de teste (sem mexer no código)

Apagar as linhas das abas **REGISTROS** e **RESULTADOS** da planilha
(preservando a linha 1, do cabeçalho). O app recarrega zerado no próximo
ciclo de sincronização (~12s). Não usar o app para isso — não há botão de
limpeza em massa por decisão de projeto (menor risco de apagar tudo sem
querer).
