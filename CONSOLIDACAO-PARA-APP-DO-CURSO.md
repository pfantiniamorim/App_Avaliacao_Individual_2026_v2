# Consolidação — Seletiva 3º CECEM/2026

> Documento de transferência. Reúne tudo que foi construído e aprendido nos dois apps da
> seletiva, para servir de base a um app semelhante voltado ao **curso**.
>
> Escrito em 02/09/2026, ao fim da seletiva; **atualizado em 29/09/2026**, depois de o app
> ser reaberto para a turma do curso. Fonte: repositórios
> `App_Avaliacao_Individual_2026_v2` e `painel-de-agendamento`, mais a planilha
> `Selecao_Condutores_2026` lida ao vivo.
>
> **A fórmula da nota NÃO se aproveita** — o curso terá outra formação. Tudo o mais
> (arquitetura, modelo de dados, telas, armadilhas, operação) se aproveita inteiro.
>
> **Para começar o app do curso, leia nesta ordem:** §8 (armadilhas — o que não repetir),
> §11 (como operar um ciclo) e §13 (o que decidir antes da primeira linha de código).

---

## 1. O que foi construído

Dois apps que compartilham **uma única planilha** do Google.

```
[Convocação]  →  painel-de-agendamento  →  App_Avaliacao_Individual  →  Relatórios (SEI)
                 quem vai, quando           o que cada um pontuou        classificação, vagas
```

| App | Papel | Repositório | Hospedagem |
|---|---|---|---|
| **Agendamento** | Militar escolhe data/horário; comissão acompanha ocupação | `painel-de-agendamento` | Netlify (`seletivacecem.netlify.app`) |
| **Avaliação** | Banca marca penalidades em tempo real; gera nota, ranking e relatórios | `App_Avaliacao_Individual_2026_v2` | GitHub Pages |

**Resultado em produção:** 62 candidatos convocados, 52 executaram o teste, 24 vagas
distribuídas, 4 dias de prova, até 5 avaliadores simultâneos em campo.

---

## 2. Arquitetura — custo R$ 0,00

| Camada | Escolha | Por quê |
|---|---|---|
| Banco de dados | **Google Sheets** | Já é a ferramenta da comissão; auditável; a comissão corrige à mão quando precisa |
| API de escrita | **Apps Script** Web App (`doPost`) | Sem servidor, sem cartão de crédito |
| API de leitura | **CSV via `gviz/tq?tqx=out:csv`** | Leitura direta da planilha, sem passar pelo Apps Script (mais rápido e sem cota) |
| Front-end | **HTML + JS puro, sem build** | Sem dependência, sem `npm`, abre até em `file://` |
| Atualização | **Polling** a cada 12s | Simples e suficiente; não há push gratuito confiável |

### Regras que essa escolha impõe

- **POST com `Content-Type: text/plain`** — evita o *preflight* CORS, que o Apps Script
  não responde. Requisição "simples" é a única que funciona.
- **Leitura e escrita por caminhos diferentes**: ler por CSV, escrever por `doPost`. Ler
  pelo Apps Script estoura a cota (~20.000 chamadas/dia) com 15 aparelhos em polling.
- **Uma planilha admite UM script vinculado.** Se dois apps precisam escrever nela, o
  segundo tem de ser *standalone* com `SpreadsheetApp.openById(ID)`. Ver §8.

---

## 3. Modelo de dados (abas da planilha)

| Aba | Colunas | Dono | Observação |
|---|---|---|---|
| `CANDIDATOS` | `ID · NOME_GUERRA · MATRICULA · ATIVO · ANTIGUIDADE · CATEGORIA · GBMOT` | Avaliação | `MATRICULA` é a chave única entre os dois apps |
| `REGISTROS` | `TS · DATA_HORA · AVALIADOR · CANDIDATO_ID · CANDIDATO · TIPO_PENALIDADE · PONTOS` | Avaliação | **1 linha por penalidade** — log auditável, nunca agregado |
| `RESULTADOS` | `CANDIDATO_ID · TEMPO · STATUS · DATA_HORA` | Avaliação | 1 linha por candidato; `DATA_HORA` é o carimbo de quando o tempo foi lançado |
| `Telefones` | `matricula · telefone` | Agendamento | Login do militar = matrícula + telefone |
| `Faixas` | `id · etapa · data · inicio · fim · vagasTotal · ativa` | Agendamento | Cada faixa é um bloco de 1 hora |
| `Agendamentos` | `matricula · faixaId · protocolo · registradoEm · status · emailStatus` | Agendamento | `status` ATIVO/CANCELADO — remarcação cancela e cria nova linha |
| `Config` | `chave · valor` (lido **por posição**, coluna A e B) | Agendamento | Título, local, abertura da agenda, e-mail do chefe |

### Decisões de modelagem que valeram a pena

1. **`REGISTROS` como log, não como saldo.** Uma linha por marcação, com o avaliador que
   marcou. Permite auditar, desfazer item a item, e descobrir *quem* marcou o quê. Se
   fosse um contador agregado, nada disso seria possível.
2. **`MATRICULA` como chave única.** Começou com um `ID` gerado pelo app e um `MATRICULA`
   à parte — os dois apps enxergavam populações diferentes. Unificar em `MATRICULA`
   resolveu de vez.
3. **Colunas que o app só LÊ.** `ANTIGUIDADE`, `CATEGORIA` e `GBMOT` são preenchidas à mão
   na planilha; o app nunca escreve nelas. `salvarCandidato` grava só as 4 primeiras
   colunas, então o que a comissão digitou é preservado.
4. **Carimbo de data em `RESULTADOS`.** Sem ele, um candidato que faz percurso limpo (zero
   penalidades) não deixa **nenhum** rastro de em que dia executou — não há linha em
   `REGISTROS`. Isso quebrou o relatório diário. Ver §8.

---

## 4. Telas

### App de avaliação (11 telas)

| Tela | Papel | Função |
|---|---|---|
| `index.html` | — | Porta de entrada, escolhe o perfil |
| `selecao.html` | Avaliador | Identificação (nome digitado, sem senha) |
| `avaliacao.html` | Avaliador | **Tela de campo.** Botões grandes de penalidade, um por tipo; escolhe candidato; lista "minhas marcações" com desfazer |
| `logs.html` | Avaliador | Registro do que aquele avaliador marcou |
| `dashboard.html` | Chefe (PIN) | Estatísticas, pódio, **lançamento do tempo por candidato**, feed de auditoria |
| `participantes.html` | Chefe (PIN) | Cadastro de candidatos |
| `configuracoes.html` | Chefe (PIN) | Fórmula, tabelas, testar fórmula |
| `ranking.html` | Comissão | **Classificação ao vivo**, memorial de cálculo por candidato, distribuição das vagas, ausentes |
| `relatorio.html` | Comissão | Relatório individual imprimível + `.docx` |
| `relatorio-dia.html` | Comissão | Relatório do dia (quem executou, adiantados, faltantes) + `.docx` |
| `relatorio-ranking.html` | Comissão | **Classificação final completa** + `.docx` para o SEI |

### App de agendamento (5 telas)

| Tela | Função |
|---|---|
| `tela-1-entrada.html` | Login: matrícula + telefone |
| `tela-2-grade.html` | Grade de horários, com vagas restantes por faixa |
| `tela-3-confirmacao.html` | Confirmação da escolha |
| `tela-4-comprovante.html` | Comprovante com protocolo `SEL-2026-XXX` |
| `painel-…befd.html` | Painel da comissão (URL com sufixo aleatório como "senha") |

### As quatro telas de classificação — o que cada uma resolve

Isto foi aprendido na marra, com retrabalho. São **públicos diferentes**:

| Tela | Público | Mostra posição? | Formato |
|---|---|---|---|
| `ranking.html` | Comissão, ao vivo | Sim | Tela, atualiza sozinha |
| `relatorio.html` | **O candidato** | **Não** | Papel/`.docx`, uma pessoa |
| `relatorio-dia.html` | Processo diário | Não | Papel/`.docx`, um dia |
| `relatorio-ranking.html` | SEI / processo final | Sim | Papel/`.docx`, todos |

> **Regra que emergiu:** o relatório individual é mostrado ao próprio candidato na
> tela — por isso não pode exibir posição nem lista de concorrentes. O dropdown de
> seleção também teve de sair da ordem de classificação para ordem alfabética, porque
> os candidatos ficavam lendo a classificação alheia por cima do ombro.

---

## 5. Regras de negócio

### 5.1 Nota — **vai mudar no curso, não reaproveitar**

O que **deve** ser reaproveitado é a *arquitetura* da regra, não os valores:

```js
// js/config.js — TUDO configurável, nada fixo na lógica
FORMULA_NOTA: "(PONTUACAO_TEMPO * 1.75 + 100 - PENALIDADES) / 2.75",
TEMPO_MAXIMO: "04:05",
TABELA_TEMPO: [ { ate: "02:30", pontos: 100 }, … ],   // 96 faixas, segundo a segundo
TABELA_PENALIDADES: [
  { key: "toque",          nome: "Toque em Cone/Balizador",     pontos: 3 },
  { key: "derrubada",      nome: "Derrubada de Cone/Balizador", pontos: 10 },
  { key: "apagarViatura",  nome: "Interromper o Motor",         pontos: 10 },
  { key: "desvioPercurso", nome: "Desvio/Erro de Percurso",     pontos: 100 },
  { key: "seguranca",      nome: "Atentar Contra a Segurança",  pontos: "ELIMINATORIO" }
],
CRITERIOS_DESEMPATE: ["tempo", "penalidades", "antiguidade"],
```

**O acerto a repetir:** a fórmula é uma *string* avaliada em tempo de execução
(`AppUtils.avaliarFormula`), e há um botão "Testar fórmula" em `configuracoes.html`. Quando
a chefia mudou a fórmula da MF a três dias da prova, foi uma linha de configuração — não
uma alteração de código.

**O que o curso precisa decidir antes de começar:** quais são as variáveis da nota, se há
critério eliminatório, e quais os desempates. O resto do app não muda.

### 5.2 Distribuição de vagas (aproveitável quase inteiro)

24 vagas por destinação, com **herança**: o que sobra numa destinação passa para outra
conforme o edital.

```js
VAGAS: [
  { key: "QOBM",    quantidade: 2,  redistribuiPara: "QBMG-2" },
  { key: "QBMG-2",  quantidade: 14, redistribuiPara: null },
  { key: "QBMG-3",  quantidade: 2,  redistribuiPara: null },
  { key: "EXTERNA", quantidade: 2,  redistribuiPara: "QBMG-2" },
  { key: "GBMOT",   quantidade: 4,  redistribuiPara: null, reserva: true }
],
```

Duas sutilezas que custaram tempo e devem ser preservadas:

1. **Heranças primeiro, distribuição depois.** Como cada candidato tem uma só categoria, dá
   para calcular as sobras antes de alocar. Se a herança viesse depois, um militar do GBMOT
   ocuparia uma das 4 vagas reservadas enquanto ainda havia vaga na graduação dele —
   exatamente o oposto do que a reserva existe para fazer.
2. **A reserva vem por último na ordem.** O militar do GBMOT concorre primeiro pela própria
   graduação e só depois disputa a reserva.

---

## 6. Requisitos funcionais consolidados

### Agendamento
- Login por **matrícula + telefone** conferidos contra a planilha (não é senha, é conferência)
- Grade mostra apenas faixas com vaga; faixa lotada some
- Uma matrícula ocupa **uma** vaga por etapa
- Comprovante com protocolo sequencial `SEL-AAAA-NNN`
- E-mail de confirmação (com coluna `emailStatus` para saber o que não saiu)
- Remarcação controlada por chave em `Config` (`remarcacaoAberta`)
- Painel da comissão: ocupação por faixa, quem falta agendar, **quem já executou (riscado)**
- Abertura programada da agenda (`agendaAbreEm`)

### Avaliação
- **Multi-avaliador simultâneo**: N avaliadores marcam o mesmo candidato; a nota é a soma
- Marcação em **um toque**, botão grande, funciona de luva e sol forte
- **Fila offline**: sem rede, a marcação fica no aparelho e sobe sozinha depois
- Desfazer marcação individual (o avaliador só desfaz o que ele mesmo marcou)
- Confirmação obrigatória para penalidade eliminatória
- Lançamento do tempo pelo chefe, separado da marcação de penalidades
- Cálculo da nota, ranking com desempate, distribuição de vagas
- Relatórios imprimíveis e em `.docx` (sem biblioteca externa — ver §7)
- Detecção de ausentes (agendado, horário vencido, sem tempo lançado)

### Não-funcionais
- **Mobile-first obrigatório** — a marcação acontece na pista, no celular, na rede móvel
- Custo R$ 0,00
- Sem build, sem dependência de `npm`
- Tolerância a rede intermitente é **requisito**, não melhoria

---

## 7. Peças reaproveitáveis diretamente

| Arquivo | O que faz | Reaproveita? |
|---|---|---|
| `js/docx.js` (300 linhas) | Gera `.docx` do zero — ZIP + CRC32 + OOXML, **sem nenhuma biblioteca** | **Sim, inteiro.** Independente do domínio |
| `js/utils.js` — fila offline | Fila em `localStorage`, reenvio, quarentena | **Sim**, com as correções de §8 |
| `js/utils.js` — polling CSV | `baixarAba`, `csvParaObjetos` | Sim |
| `apps_script/Code.gs` — `doPost` | Roteador por `tipo`, `LockService`, idempotência por TS | Sim |
| `js/config.js` | Padrão "tudo configurável num arquivo" | **Sim, o padrão.** Os valores, não |
| `FormularioAvaliacao.gs` | Gera o Forms de avaliação do processo | Sim, trocando as perguntas |
| `Code.gs` — funções de manutenção | Ciclo de vida da planilha (§11) | **Sim, inteiro.** É o que faltava na seletiva |

### Funções de manutenção do `Code.gs`

Não ficam expostas no `doPost`: rodam à mão pelo editor do Apps Script. Foram surgindo
conforme a operação exigiu, e hoje são o que permite reusar a mesma planilha em vários
ciclos sem perder histórico.

| Função | O que faz |
|---|---|
| `arquivarEZerarAvaliacoes()` | Copia `REGISTROS` e `RESULTADOS` para abas de arquivo, **confere célula a célula** e só então zera as originais. Falhou a conferência, nada é apagado |
| `listarCiclosArquivados()` | Lista os ciclos já guardados na planilha |
| `manterApenasATurma()` | Deixa ativos só os militares de uma relação; os demais viram `ATIVO = NÃO`. Ninguém é apagado |
| `reativarTodosOsCandidatos()` | Desfaz a filtragem acima |
| `removerLinhasDuplicadas()` | Apaga linhas com o mesmo `TS` em `REGISTROS`, com modo relatório antes de apagar |
| `limparMarcacoesDeOutrosDias()` | Remove marcações de dias anteriores, preservando o dia corrente |
| `limparRegistrosDeTeste()` | Zera `REGISTROS` por completo (sem arquivar — preferir `arquivarEZerarAvaliacoes`) |

**O padrão que emergiu e deve ser repetido:** operação destrutiva faz **arquivar → conferir
→ apagar**, nessa ordem, e aborta sem apagar se a conferência falhar. Operação de grande
alcance tem modo relatório antes do modo que altera.

---

## 8. Armadilhas — a parte mais valiosa deste documento

Cada item abaixo custou tempo de produção. **Ler antes de escrever a primeira linha do app
do curso.**

### 8.1 Uma planilha, um script vinculado
Colar o `Code.gs` do app B no script vinculado apaga o `doPost` do app A. Os dois apps
ficaram com a mesma URL `/exec` e a avaliação parou de gravar, respondendo `ACAO_INVALIDA`.
**Solução:** o segundo app vira *standalone*, com `SpreadsheetApp.openById(SPREADSHEET_ID)`.

### 8.2 Editar o código não muda o que está no ar
No Apps Script, salvar o arquivo **não** altera o que a URL `/exec` serve. É preciso
*Implantar → Gerenciar implantações → ✏️ → Nova versão*. Duas correções ficaram semanas no
repositório sem efeito nenhum em produção por causa disso — inclusive a que evitava as
linhas duplicadas.

### 8.3 Coluna nova em aba que já existe fica sem nome
`obterAba()` só escrevia o cabeçalho quando a aba era nova. Ao acrescentar `DATA_HORA` a
`RESULTADOS`, o valor era gravado na coluna D mas **D1 ficava vazio** — e coluna sem nome
chega ao front-end sem chave no CSV. O dado estava lá e o app não via.
**Regra:** ao acrescentar coluna, preencher o cabeçalho de aba existente.

### 8.4 Reenvio de fila sem trava = linha duplicada
`reenviarPendentes()` era disparada sem `await` a cada ciclo de polling. Com a rede
oscilando, dois ciclos mandavam os mesmos itens. Resultado real: 8 linhas repetidas para um
candidato, 52 pontos a mais, 18,91 de MF a menos.
**Regra:** trava de reenvio simultâneo no cliente **e** idempotência por TS no servidor. Os
dois, não um.

### 8.5 Retrato de fila gravado por cima apaga marcação
A função lia a fila, enviava pela rede, e no fim gravava o retrato antigo de volta. Uma
penalidade marcada durante o envio era sobrescrita — o avaliador via "NA FILA" para algo que
já não existia. É a explicação de "marquei e não gravou".
**Regra:** nunca guardar um retrato de estado compartilhado através de um `await`. Reler,
alterar, gravar.

### 8.6 Nunca adivinhar o dia de uma execução
O relatório diário inferia o dia comparando a faixa agendada com a data do relatório. Essa
condição é verdadeira para **todo** dia anterior ao dia real — o mesmo candidato aparecia em
dois relatórios com a mesma nota.
**Regra:** só sinal medido (carimbo em `REGISTROS` ou em `RESULTADOS`) atribui um dia. Sem
carimbo, o candidato vai para uma lista "sem data confirmada", visível, nunca chutado.

### 8.7 Posição só para quem tem nota
A tela de classificação numerava pela posição no array, dando 55º, 57º e 60º lugar a
candidatos que nunca executaram, e ainda pulando números.
**Regra:** contador próprio, atribuído só a quem tem nota apurada, sequencial.

### 8.8 Erro de rede e erro de servidor são coisas opostas
Toda falha aparecia como "SEM CONEXÃO". Quem via a tela ia procurar sinal — e a causa real
era a implantação errada. Separar as duas mensagens fez o problema seguinte ser diagnosticado
em minutos.
**Regra:** a mensagem de erro deve dizer o que fazer, e falha de rede e recusa do servidor
se resolvem de formas opostas.

### 8.9 Fila offline sem validade contamina outro dia
Uma marcação de teste ficou 5 dias presa na fila de um aparelho e subiu no meio da prova
quando a implantação foi corrigida.
**Regra:** marcação com mais de N horas vai para quarentena, com aviso, nunca para a planilha.

### 8.10 Fuso horário do Apps Script
`Utilities.formatDate` com timezone fixo, e o fuso do **projeto** do Apps Script (não o da
planilha), fecharam a agenda na hora errada. **Regra:** perguntar o fuso à planilha
(`ss.getSpreadsheetTimeZone()`), nunca fixar.

### 8.11 Remover marcação que já está subindo
Se o avaliador tocasse em "Remover" enquanto aquela marcação estava em trânsito, ela saía só
da fila local — e a linha ficava na planilha contando ponto contra o candidato, sem nada no
aparelho para removê-la depois.
**Regra:** quando o item removido é o que está no ar, mandar a remoção também ao servidor. Lá
é no-op se a linha não existir.

### 8.12 Repositório privado derruba o GitHub Pages
No plano gratuito, Pages só funciona em repositório **público**. Ao tornar o repositório
privado, o site é despublicado — e a queda passa despercebida até alguém tentar abrir.
**Pior:** religar o Pages **não republica sozinho**. O repositório fica com
`has_pages: true`, o que dá falsa segurança, mas nada é servido até que um **push novo**
dispare o build. O site ficou 4 semanas fora por isso.
**Regra:** depois de mexer em visibilidade ou em configuração do Pages, faça um push (um
commit vazio serve) e confira em `/actions/runs` se o `pages build and deployment` rodou.
Alternativa sem essa armadilha: Netlify, que serve repositório privado no plano gratuito.

### 8.13 Sem autenticação real
O PIN do chefe está no código-fonte e o painel da comissão se protege por uma URL com
sufixo aleatório. Em app estático gratuito **não há** como esconder segredo — F12 mostra
tudo. Foi aceito conscientemente. Se o app do curso lidar com dado mais sensível, isso
precisa mudar de patamar (Apps Script validando o PIN no servidor).

---

## 9. Ranking final — 3º CECEM/2026

Apurado em 02/09/2026 a partir da planilha, pela tela `relatorio-ranking.html`.

**62 convocados · 52 executaram · 10 não executaram · 0 eliminados**

| # | Nome de guerra | Matrícula | Categoria | Tempo | Pts tempo | Penal. | MF |
|---|---|---|---|---|---|---|---|
| 1 | WILTON | 1920175 | QBMG-2 | 02:23 | 100,00 | 0 | **100,00** |
| 2 | LEANDRO HENRIQUE | 1002481 | QBMG-3 | 02:29 | 100,00 | -3 | 98,91 |
| 3 | RAMADÃ | 1054557 | GBMOT | 02:30 | 100,00 | -3 | 98,91 |
| 4 | MICHEL | 1298610 | QBMG-2 | 02:32 | 98,00 | -3 | 97,64 |
| 5 | JACKSON | 1298231 | QBMG-3 | 02:30 | 100,00 | -10 | 96,36 |
| 6 | ELVIS | 1720187 | QBMG-2 | 02:37 | 93,00 | 0 | 95,55 |
| 7 | LUCAS MOURA | 1038525 | GBMOT | 02:31 | 99,00 | -19 | 92,45 |
| 8 | LEMES | 1142544 | QBMG-3 | 02:40 | 87,50 | 0 | 92,05 |
| 9 | RAPHAEL LOPES | 1924819 | QBMG-2 | 02:40 | 87,50 | 0 | 92,05 |
| 10 | FRANCISCO JUNIOR | 1299509 | QBMG-2 | 02:36 | 94,00 | -12 | 91,82 |
| 11 | MATHEUS BARRETO | 1142612 | GBMOT | 02:27 | 100,00 | -23 | 91,64 |
| 12 | ALVES JÚNIOR | 1299196 | QBMG-2 | 02:31 | 99,00 | -22 | 91,36 |
| 13 | ANDRÉ VALERIANO | 2504839 | EXTERNA | 02:37 | 93,00 | -13 | 90,82 |
| 14 | RUAN YORDAN | 1185981 | GBMOT | 02:29 | 100,00 | -26 | 90,55 |
| 15 | FERNANDO LIMA | 1142893 | QBMG-2 | 02:39 | 90,00 | -10 | 90,00 |
| 16 | RENATO | 1298199 | QBMG-2 | 02:29 | 100,00 | -29 | 89,45 |
| 17 | RAFAEL | 1299056 | QBMG-2 | 02:17 | 100,00 | -32 | 88,36 |
| 18 | BASÍLIO | 1415943 | GBMOT | 02:28 | 100,00 | -33 | 88,00 |
| 19 | V. RAMOS | 1037288 | QBMG-2 | 02:44 | 77,50 | -13 | 80,95 |
| 20 | RICARDO FARIAS | 1215776 | QBMG-2 | 02:47 | 70,00 | 0 | 80,91 |
| 21 | S. JESUS | 1266840 | QBMG-2 | 02:50 | 66,40 | 0 | 78,62 |
| 22 | ROBSON | 1298178 | QBMG-2 | 02:48 | 68,80 | -6 | 77,96 |
| 23 | JENNIFER | 1054670 | GBMOT | 02:38 | 92,00 | -49 | 77,09 |
| 24 | BRUNO VIEIRA | 1265983 | QBMG-2 | 02:32 | 98,00 | -62 | 76,18 |
| 25 | MURILO | 1889609 | QBMG-2 | 02:48 | 68,80 | -13 | 75,42 |
| 26 | RAFAEL MOURA | 1267092 | QBMG-2 | 02:47 | 70,00 | -16 | 75,09 |
| 27 | RANGEL | 1299051 | QBMG-2 | 02:23 | 100,00 | -69 | 74,91 |
| 28 | ANDESSEN | 1297908 | QBMG-2 | 02:48 | 68,80 | -20 | 72,87 |
| 29 | MARCOS FERREIRA | 1592274 | QBMG-2 | 02:47 | 70,00 | -25 | 71,82 |
| 30 | ELIZEFAN | 1267892 | QBMG-2 | 02:41 | 85,00 | -52 | 71,55 |
| 31 | FELIX | 1910490 | QBMG-2 | 03:00 | 57,60 | -6 | 70,84 |
| 32 | PAULO VIANA | 1296115 | QBMG-3 | 03:04 | 55,20 | -3 | 70,40 |
| 33 | BRUNO BEZERRA | 1298649 | QBMG-2 | 02:53 | 62,80 | -19 | 69,42 |
| 34 | MURILO FERREIRA | 1266364 | QBMG-2 | 03:01 | 57,00 | -12 | 68,27 |
| 35 | BRYAN | 1266842 | QBMG-2 | 02:50 | 66,40 | -29 | 68,07 |
| 36 | CANEDO | 1216097 | QBMG-2 | 02:29 | 100,00 | -95 | 65,45 |
| 37 | ABÍLIO NETO | 1267881 | QBMG-2 | 02:57 | 59,40 | -25 | 65,07 |
| 38 | VALBER | 1297916 | QBMG-2 | 02:48 | 68,80 | -56 | 59,78 |
| 39 | ABITBOL | 1053370 | QBMG-2 | 02:45 | 75,00 | -68 | 59,36 |
| 40 | R. MENEZES | 1266064 | QBMG-2 | 02:50 | 66,40 | -55 | 58,62 |
| 41 | VICTOR MICHEL | 1266799 | QBMG-2 | 02:23 | 100,00 | -116 | 57,82 |
| 42 | YAGO FALCAO | 1024985 | QBMG-2 | 03:21 | 45,00 | -22 | 57,00 |
| 43 | JOYCE | 1266682 | QBMG-2 | 03:08 | 52,80 | -36 | 56,87 |
| 44 | LUCIANA FERNANDES | 1215512 | QBMG-2 | 03:12 | 50,40 | -39 | 54,25 |
| 45 | THIAGO | 1102809 | QOBM | 03:10 | 51,60 | -57 | 48,47 |
| 46 | B. FERREIRA | 1179588 | QOBM | 02:57 | 59,40 | -79 | 45,44 |
| 47 | C. SILVA | 1038158 | QBMG-2 | 03:12 | 50,40 | -66 | 44,44 |
| 48 | DURVAL | 1142917 | QBMG-2 | 03:00 | 57,60 | -82 | 43,20 |
| 49 | JAIRO JUNIOR | 1038510 | GBMOT | 02:53 | 62,80 | -162 | 17,42 |
| 50 | W. PORTO | 1843399 | QBMG-2 | 03:05 | 54,60 | -152 | 15,84 |
| 51 | V. FERNANDO | 1267126 | QBMG-2 | 03:41 | 33,00 | -118 | 14,45 |
| 52 | FELIPE ANTONIO | 1797651 | QBMG-2 | 03:14 | 49,20 | -475 | 0,00 |

**Não executaram (10):** AMORIM, ARTUR FAGUNDES, FRAGA, KARIZIA, L. SOUZA, LAVAREDA, LUAN,
PARENTE, PEDRO, TIAGO CAMPOS.

### Distribuição das 24 vagas — todas preenchidas

| Destinação | Vagas | Classificados |
|---|---|---|
| **QOBM/Comb.** | 2/2 | THIAGO, B. FERREIRA |
| **QBMG-2** | 15/15 (14 + 1 herdada) | WILTON, MICHEL, ELVIS, RAPHAEL LOPES, FRANCISCO JUNIOR, ALVES JÚNIOR, FERNANDO LIMA, RENATO, RAFAEL, V. RAMOS, RICARDO FARIAS, S. JESUS, ROBSON, BRUNO VIEIRA, MURILO |
| **QBMG-3** | 2/2 | LEANDRO HENRIQUE, JACKSON |
| **Externas** | 1/1 | ANDRÉ VALERIANO |
| **GBMOT (reserva)** | 4/4 | RAMADÃ, LUCAS MOURA, MATHEUS BARRETO, RUAN YORDAN |

### Ressalvas sobre estes números

1. **V. FERNANDO (51º)** tem 8 linhas duplicadas em `REGISTROS` — 52 pontos a mais. A MF
   correta seria **33,36** (49º lugar), não 14,45. Mantido a pedido. Não altera a
   distribuição das vagas: ele está fora das 24 em qualquer cenário.
2. **Marcação de 20/08 por CB FANTINI** contra ABITBOL (Toque, 3 pts), duas semanas depois
   da prova — provável teste. Sem ela a MF dele seria 60,45; a posição (39º) não muda.
3. **Empate em 92,05** entre LEMES (8º) e RAPHAEL LOPES (9º): mesmo tempo, zero penalidades,
   `ANTIGUIDADE` em branco. Os três critérios do edital se esgotaram e o desempate caiu no
   alfabético, que **não é critério do edital**. São de categorias diferentes e não disputam
   a mesma vaga, mas se a ordem entre eles importar, é decisão da comissão.
4. **AMORIM (2688344)** tem linha em `RESULTADOS` com tempo em branco.

---

## 10. Recomendações para o app do curso

**Repetir:**
- Toda a arquitetura (Sheets + Apps Script + HTML puro + polling)
- `MATRICULA` como chave única desde o primeiro dia
- Log de eventos (uma linha por lançamento), nunca saldo agregado
- Regras de nota em arquivo de configuração, com botão de testar
- Fila offline — **com** trava de reenvio e idempotência por TS desde o início
- Telas separadas por público, decidindo cedo quem vê posição e quem não vê

**Fazer diferente:**
- **Um script standalone por app, desde o começo.** Não usar o slot vinculado.
- **Escrever o cabeçalho completo da aba na criação**, e conferir cabeçalho a cada escrita.
- **Carimbo de data em todo lançamento**, sem exceção. Foi o que faltou e quebrou relatório.
- **PIN validado no servidor**, se o dado for mais sensível que penalidade de cone.
- **Checklist de implantação** visível na tela: um `doGet` que devolve a versão implantada,
  para conferir num relance se o que está no ar é o que está no repositório.

**Decidir antes de começar:**
- Qual a formação da nota do curso (variáveis, pesos, eliminatórios, desempates)
- Se há frequência/presença a controlar — isso não existia na seletiva e muda o modelo
- Se o aluno vê a própria nota, e quando
- Quantas turmas/módulos simultâneos (a seletiva tinha um único evento)

---

## 11. Operação de um ciclo de avaliação

Isto **não existia** na seletiva e foi construído na marra quando o app precisou ser reaberto
para o curso. É a peça que faltava: a mesma planilha e o mesmo app servem a vários ciclos,
desde que o ciclo anterior seja arquivado antes.

### A sequência

```
1. ARQUIVAR o ciclo anterior     arquivarEZerarAvaliacoes()
2. DEFINIR quem participa         manterApenasATurma()
3. AJUSTAR as regras              js/config.js  (infrações, fórmula, desempates)
4. AVALIAR                        avaliacao.html, em campo
5. RELATAR                        relatorio-dia.html / relatorio-ranking.html → .docx
6. volta ao 1 no ciclo seguinte
```

### Passo 1 — Arquivar

`arquivarEZerarAvaliacoes()` copia `REGISTROS` e `RESULTADOS` para abas com rótulo do ciclo
(`REGISTROS_SELETIVA_2026-08`), confere célula a célula e só então zera as originais.
Recusa rótulo já usado, para não sobrescrever arquivo anterior. `CANDIDATOS` não é tocada.

> **Por que arquivar e não apagar:** os dados da seletiva sustentam o relatório da comissão.
> Apagar sem cópia destruiria a prova de um processo seletivo já homologado.

### Passo 2 — Definir a turma

`manterApenasATurma()` marca `ATIVO = NÃO` em quem não está na relação. O app esconde
inativos em todas as telas, e o histórico de quem saiu permanece na planilha.
`reativarTodosOsCandidatos()` desfaz.

### Passo 3 — Ajustar as regras

Tudo em `js/config.js`: `TABELA_PENALIDADES` (os botões da tela de campo saem daqui),
`FORMULA_NOTA`, `TABELA_TEMPO`, `CRITERIOS_DESEMPATE`, `VAGAS`, `EDITAL`.

> **Armadilha de ciclo:** zerar as avaliações **não** troca as regras. Se o ciclo novo tiver
> outras infrações e outra fórmula e ninguém editar o `config.js`, a avaliação sai com os
> botões e a nota do ciclo anterior — e ninguém percebe, porque o app funciona normalmente.

### Passo 4 — Avaliar

Distribuir o guia do avaliador (§12). Conferir antes do primeiro candidato: o app lista a
turma certa, os botões são as infrações certas, e o indicador de status fica verde ao marcar.

### Passo 5 — Relatar

`relatorio-dia.html` ao fim de cada dia; `relatorio-ranking.html` ao fim do ciclo. Os dois
exportam `.docx` para o SEI.

---

## 12. Entregáveis já produzidos

Modelos prontos, para adaptar em vez de refazer do zero:

| Documento | Conteúdo | Onde |
|---|---|---|
| Relatório final da comissão | 7 seções + anexo: metodologia, execução dia a dia, resultados, intercorrências, assinaturas | Gerado com `python-docx` |
| Relatório dos selecionados | Relação com nome completo, lotação, tempo e memória de cálculo | Gerado com `python-docx` |
| Guia rápido do avaliador | 7 passos ilustrados, leitura do indicador de status, o que fazer sem rede | Gerado com `python-docx` |
| Relatórios do app | Individual, do dia e de classificação | `relatorio*.html`, `.docx` via `js/docx.js` |
| Formulário de avaliação do processo | 31 perguntas, anônimo, respostas em planilha própria | `apps_script/FormularioAvaliacao.gs` |

Dois geradores de `.docx` convivem, por motivos diferentes: **`js/docx.js`** roda no
navegador, sem biblioteca, e serve os relatórios que a comissão emite sozinha pelo app;
**`python-docx`** serve as peças que exigem layout mais elaborado e são montadas fora do app.

---

## 13. O que decidir antes da primeira linha de código do app do curso

A seletiva era um evento único, com uma prova e uma nota. Um curso é outra coisa, e estas
quatro decisões mudam o modelo de dados — mudar depois custa caro:

1. **Qual a formação da nota?** Variáveis, pesos, o que é eliminatório, critérios de
   desempate. É o único bloco que não se aproveita.
2. **Há mais de uma avaliação por aluno?** A seletiva tinha uma execução por candidato, e o
   modelo assume isso: `RESULTADOS` tem **uma linha por candidato**. Um curso com várias
   atividades avaliadas precisa de `ATIVIDADE` como coluna — ou seja, uma linha por
   *aluno × atividade*, não por aluno. **Esta é a decisão mais estrutural das quatro.**
3. **Há frequência ou presença a controlar?** Não existia na seletiva. Se existir, é uma aba
   nova e uma tela nova.
4. **O aluno vê a própria nota, e quando?** Define se o relatório individual ganha link
   próprio por aluno e o que ele pode exibir (§4 — o relatório individual não mostra posição).

E uma decisão de infraestrutura: **a mesma planilha ou uma nova?** Reusar mantém o cadastro e
o histórico juntos, ao custo de a planilha crescer a cada ciclo. Separar deixa cada curso
isolado, ao custo de recadastrar os alunos. Para um curso de 25 alunos com várias atividades,
recomendo **planilha nova**, com `CANDIDATOS` copiada — o modelo de `RESULTADOS` vai mudar
(item 2) e conviver com o formato antigo na mesma aba só gera confusão.

---

## 14. Onde está cada coisa

```
App_Avaliacao_Individual_2026_v2/
├── index.html · selecao.html · avaliacao.html · logs.html
├── dashboard.html · participantes.html · configuracoes.html
├── ranking.html · relatorio.html · relatorio-dia.html · relatorio-ranking.html
├── js/config.js      ← TODAS as regras do edital
├── js/utils.js       ← núcleo: polling, fila offline, cálculo, ranking, vagas
├── js/docx.js        ← gerador .docx sem dependência (reaproveitável)
├── apps_script/Code.gs                  ← backend vinculado à planilha + manutenção (§7)
├── apps_script/FormularioAvaliacao.gs   ← gerador do Forms de avaliação
├── PROXIMOS_PASSOS.md · CONFIGURAR_PLANILHA.md · README.md
├── CONSOLIDACAO-PARA-APP-DO-CURSO.md    ← este documento

painel-de-agendamento/
├── frontend/  (fonte)  ·  docs/  (o que o Netlify serve — manter idênticos)
├── backend/Code.gs     ← standalone, SpreadsheetApp.openById
├── VISAO.md · MVP.md · DESIGN.md · BACKEND.md · PROGRESSO.md · DESAFIOS.md
```

Planilha: `Selecao_Condutores_2026` — ID `18GTuzXfIRfwwHrq_DODcuv0NFxRkdq_wvum0REJvS_g`

> `DESAFIOS.md` do agendamento é o diário de erros da construção. Vale a leitura antes de
> repetir qualquer decisão de arquitetura.
