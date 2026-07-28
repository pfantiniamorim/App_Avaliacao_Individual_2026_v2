# Próximos Passos — Teste de Seleção de Condutores

Backlog técnico para retomar em sessões futuras. Atualizado em 2026-07-24.

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

### 3. Valores de exemplo a substituir pelo edital real

- `TABELA_TEMPO` em `js/config.js` está com faixas de exemplo (100→02:30,
  90→02:45 …). Substituir pelos valores reais do edital antes de uma prova
  oficial.
- `TABELA_PENALIDADES` (toque=3, derrubada=10, apagar viatura=10,
  desvio=100, segurança=ELIMINATÓRIO) — conferir se batem com o edital
  vigente; pode mudar de teste para teste.

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
