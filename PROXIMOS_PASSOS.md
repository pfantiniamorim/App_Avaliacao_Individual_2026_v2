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

### 3. ✅ Valores do edital 047/2026 transcritos — resta a fórmula da MF

Transcrito em 05/08/2026 para `js/config.js`, a partir do item 8 do
**edital nº 047/2026-CBMDF/DIREN/SEITC (3º CECEM/2026)**:

- `TABELA_TEMPO` — **96 faixas**, segundo a segundo, do quadro "DO TEMPO":
  02:30 = 100,00 … 04:05 = 10,00.
- `TEMPO_MAXIMO` = **04:05** ("o tempo máximo para execução do TPP será de
  04:05:00"). O rodapé do quadro diz "> 04:06:00 ELIMINADO", mas não há
  pontuação para 04:06 — prevalece o texto do item.
- `TABELA_PENALIDADES` — toque em cone/balizador 3, derrubada 10,
  interromper o motor 10, desvio/erro de percurso 100, atentar contra a
  segurança ELIMINATÓRIO.
- `EXERCICIOS` — os 7 do item 8.1.1 (slalom de alta, baliza, slalom de
  baixa, corredor "N", marcha ré, garagem balizada, "oito").
- `CRITERIOS_DESEMPATE` — menor tempo → menos penalidades → **antiguidade
  militar** (o edital reintroduziu o 3º critério).

**⚠ Falta a fórmula da MF.** O trecho recebido tem "A média final (MF) será
determinada da seguinte forma:" e emenda no quadro do tempo — a fórmula em
si não veio (provavelmente é uma imagem no PDF). `FORMULA_NOTA` continua com
a do edital anterior,
`(PONTUACAO_TEMPO * 1.75 + 100 - PENALIDADES) / 2.75`, que é coerente com o
item 8.2.1 ("o candidato iniciará com 100 pontos, sendo descontados os
pontos das infrações") mas **precisa ser conferida no Anexo antes da prova
oficial**.

Conferir também, sem alterar por conta própria: as **datas da seletiva** na
aba `Faixas` da planilha (hoje 10–13/08/2026, enquanto o curso está previsto
para 28/09–28/10/2026) e as **60 vagas de agendamento** (4/4/4/3 por faixa)
contra os 56 convocados cadastrados.

### 3.1. Coluna `ANTIGUIDADE` (opcional) — 3º critério de desempate

O edital exige antiguidade militar como último desempate. O app lê uma
coluna **`ANTIGUIDADE`** na aba `CANDIDATOS`, número, **menor = mais
antigo** — a ser preenchida direto na planilha pelo Chefe (não há campo para
ela no `participantes.html`, e o app **nunca escreve** nessa coluna:
`salvarCandidato` grava só as 4 primeiras).

É a **5ª coluna**, depois de `ATIVO` — acrescentar no fim não desloca nada e
não afeta o app de agendamento, que lê pelo nome da coluna. Coluna vazia = o
critério não desempata nada e a decisão fica com o Chefe.

### 3.2. ✅ Vagas por categoria — implementado

O quadro "DISTRIBUIÇÃO DAS VAGAS" virou `CFG.VAGAS` em `js/config.js`
(QOBM 2 · QBMG-2 14 · QBMG-3 2 · Externas 2 · GBMOT 4 = 24) e
`AppUtils.distribuirVagas()` faz a apuração. A tela de classificação
(`ranking.html`) mostra, por destinação, quem ficou com cada vaga.

Como funciona: cada destinação chama os seus melhores colocados até encher;
o que sobrar vai para quem o edital mandou herdar; e repete enquanto uma
herança criar vaga nova.

**Duas decisões que o edital não fecha, tomadas assim e configuráveis:**

1. **GBMOT preenche por último.** O militar do GBMOT concorre primeiro na
   vaga da própria graduação e, só se não entrar lá, disputa uma das 4
   reservadas — assim a reserva nunca prejudica quem ela existe para
   proteger. Para inverter, mova a linha do GBMOT para o topo de
   `CFG.VAGAS`.
2. **Sobra de QBMG-3 e do GBMOT não é redistribuída.** O edital só manda
   redistribuir QOBM e Externas, ambas para QBMG-2. As outras aparecem como
   vaga não preenchida, para decisão da comissão, em vez de o app inventar
   regra. Para mudar, preencha `redistribuiPara` na destinação.

As heranças são calculadas **antes** da distribuição, de propósito: se
chegassem depois, alguém do GBMOT ocuparia uma vaga reservada enquanto ainda
havia vaga herdada na própria graduação.

### 3.3. ✅ Relatório individual — `relatorio.html`

Comprovante A4 por candidato, alcançável pelo item **RELATÓRIO** da navegação
ou pelo botão no memorial de cálculo do ranking. Enxuto a pedido da Chefia,
tem só quatro blocos:

1. **Identificação** — nome de guerra, matrícula, destinação da vaga e
   reserva do GBMOT.
2. **Execução do percurso** — tempo executado e pontuação de tempo.
3. **Penalidades apuradas** — uma linha por infração, com valor unitário,
   ocorrências e pontos, mais o total descontado.
4. **Média final (MF)** — fórmula do edital, memorial de cálculo e a nota
   (ou `ELIMINADO`, com o motivo no memorial).

**Sem campos de assinatura**: a assinatura é digital, feita no SEI.

Duas saídas, na barra do topo:

- **Imprimir / Salvar PDF** — o CSS de impressão esconde a barra e o
  indicador de sincronização.
- **Baixar .docx (SEI)** — gera um `.docx` de verdade no próprio navegador
  (`js/docx.js`), para abrir no Word e colar no editor do SEI.

### 3.4. `js/docx.js` — gerador de .docx sem dependência

Um `.docx` é um ZIP de XML (OOXML). O arquivo monta o ZIP à mão no modo
STORE (sem compressão, o único possível sem um compressor) e escreve o
`word/document.xml`. Sem biblioteca, sem build — cabe no app estático.

**Duas armadilhas do OOXML que estão resolvidas ali, e que voltam a morder
quem for editar o arquivo:**

- **A ordem dos filhos de `<w:rPr>` e `<w:pPr>` não é livre.** O schema
  (CT_RPr / CT_PPrBase) fixa a sequência; campo novo entra no lugar certo
  dela, não no fim.
- **`<w:tblGrid>` é obrigatório** em toda tabela, logo depois de
  `<w:tblPr>`.

Nos dois casos o XML fica *bem formado* e mesmo assim inválido, então
validar com um parser de XML não pega o problema. A conferência que vale é
abrir o arquivo com um leitor de OOXML de verdade (`python-docx`, Word).

> ⚠ **O LibreOffice desta máquina de desenvolvimento está quebrado** — não
> abre nem um `.docx` que ele mesmo gera, e responde sempre
> "Error: source file could not be loaded". Ele **não serve** para validar
> nada aqui; o erro dele não diz nada sobre o arquivo.

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
