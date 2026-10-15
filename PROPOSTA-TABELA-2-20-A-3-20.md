# Proposta — tabela 2:20 a 3:20 e penalidades em segundos

Janela alargada para absorver o acréscimo de tempo da chuva, com toque de
1 segundo e derrubada de 3 segundos.

Tabela completa, segundo a segundo: **`TABELA-NOTAS-CURSO-2-20-A-3-20.csv`**
(101 linhas, de 2:20 a 4:00).

Documento de apoio à decisão. **Nada aqui está implementado** — `js/config.js`
continua com a tabela, a fórmula e as penalidades do Edital 047/2026.

---

## 1. A regra, em três linhas

```
Tempo Total   = Tempo de Execução + Segundos de Penalidades
Nota da Etapa = 240 − Tempo Total em segundos        (satura em 100 até 2:20)
Nota Final    = (Nota Etapa 1 + Nota Etapa 2) / 2
```

Marcos da janela publicada:

| Tempo total | 2:20 | 2:30 | 2:40 | 2:50 | 3:00 | 3:10 | 3:20 |
|---|---|---|---|---|---|---|---|
| **Nota** | **100** | 90 | 80 | 70 | 60 | 50 | **40** |

A reta continua fora da janela, sem degrau, até **4:00 = 0** — 5 segundos mais
exigente que o tempo máximo da seletiva (4:05).

---

## 2. As penalidades

| Infração | Segundos | Nota da etapa | Nota final | Na seletiva custava |
|---|---|---|---|---|
| Toque em cone/balizador | +1 s | −1,0 | **−0,50** | −1,09 na MF |
| Derrubada de cone/balizador | +3 s | −3,0 | **−1,50** | −3,64 na MF |

A derrubada fica **2,4× mais branda** que na seletiva e o toque **2,2× mais
brando** — é a penalização branda pedida.

Como a tabela anda exatamente 1 ponto por segundo, **o segundo de penalidade
é o ponto perdido**. Não há fator de conversão, não há peso: o aluno consegue
conferir a própria nota de cabeça, e a conferência da comissão é uma subtração.

Falta definir as demais infrações em segundos — interromper o motor, desvio de
percurso e atentar contra a segurança (esta, eliminatória na seletiva).

---

## 3. Por que 1 ponto por segundo, e não outra inclinação

A janela de 60 segundos admite três desenhos:

| | pt/s | 2:20 | 2:50 | 3:20 | Nota 0 em | Toque | Derrubada |
|---|---|---|---|---|---|---|---|
| **A (proposta)** | **1,000** | 100 | 70 | **40** | 4:00 | **1,0** | **3,0** |
| B | 1,667 | 100 | 50 | 0 | 3:20 | 1,7 | 5,0 |
| C | 0,833 | 100 | 75 | 50 | 4:20 | 0,8 | 2,5 |

A opção **B** (100 a 0 dentro da janela) parece natural, mas faz 3:20 virar
nota zero — mais severo que a seletiva, justamente no cenário de chuva em que
os tempos sobem — e encarece a derrubada para 5 pontos, o contrário de brando.
A **C** é mais branda ainda, mas quebra a equivalência de 1 s = 1 ponto e
empurra o zero para 4:20.

A **A** é a única que mantém as duas propriedades que já estavam decididas: a
penalidade em segundos valendo exatamente o mesmo em pontos, e o alcance da
reta além da janela.

---

## 4. A janela contra a turma real

Tempos de tempo seco dos 25 alunos (TPP da seletiva — percurso diferente, mas
é a única distribuição real disponível). Média 2:37, desvio padrão 11,6 s:

| Janela | Abaixo | Dentro | Acima | z do início | z do fim |
|---|---|---|---|---|---|
| 2:25 – 2:55 (anterior) | 2 | 21 (84%) | 2 | −1,01 | +1,58 |
| **2:20 – 3:20** | **1** | **24 (96%)** | **0** | **−1,45** | **+3,74** |

Dois ganhos concretos:

1. **O platô encolhe.** Com o topo em 2:20, WILTON (2:23) sai da saturação e
   passa a tirar 97 em vez de 100. Sobra RAFAEL (2:17) sozinho em 100 — e o
   **empate de 1º lugar da tabela anterior desaparece** nos dados reais.
2. **Ninguém acima do fim da tabela.** O mais lento em tempo seco é THIAGO
   (3:10), com 10 segundos de folga até 3:20.

---

## 5. A chuva — o que a janela resolve e o que ela não resolve

### Resolve: ninguém sai da escala

| Acréscimo da chuva | Média da turma | Acima de 3:20 | Menor nota | Nota zero |
|---|---|---|---|---|
| +0 s | 83,2 | 0 | 50 | 0 |
| +10 s | 73,3 | 0 | 40 | 0 |
| +20 s | 63,3 | 1 | 30 | 0 |
| +45 s | 38,3 | 12 | 5 | 0 |

A janela absorve **+10 s de chuva com a turma inteira dentro dela**. Acima
disso os mais lentos saem da janela publicada, mas não caem a zero, porque a
reta segue até 4:00 — só com +45 s alguém zeraria. **A extensão da reta
protege mais que a largura da janela.**

### Não resolve: o nível absoluto da nota

A chuva desloca a turma toda para baixo, e é aí que a nota mínima de aprovação
passa a ser a restrição que manda. Quantos dos 25 alcançam cada corte:

| Acréscimo | Mín. 50 | Mín. 60 | Mín. 70 | Mín. 80 |
|---|---|---|---|---|
| +0 s | 25/25 | 24/25 | 23/25 | 19/25 |
| +10 s | 24/25 | 23/25 | 19/25 | 9/25 |
| **+15 s** | 23/25 | 19/25 | **13/25** | 2/25 |
| +20 s | 23/25 | 19/25 | 9/25 | 1/25 |

Se a nota mínima do curso for **70**, uma chuva que acrescente 15 segundos
leva a aprovação de 23 para **13 dos 25** — dez alunos reprovados pelo tempo
que fez, não pela condução. Alargar a janela não muda isso: a nota cai do
mesmo jeito, só não sai da tabela.

### A inequidade real só aparece dentro da mesma etapa

Se a turma inteira executa a Etapa 1 no mesmo dia e na mesma condição, a chuva
desloca todos igualmente: **a ordem de classificação não muda**, só o nível.
O problema aparece em dois casos:

- **chuva no meio da sessão** — parte da turma seca, parte molhada;
- **execução de segunda chamada** em outro dia, com tempo diferente.

Nesses casos o custo é alto: +10 s de pista molhada valem 10 pontos na etapa e
**5 pontos na nota final — 3,3 vezes o custo de uma derrubada**. O tempo que
fez pesaria mais que a técnica.

### Três encaminhamentos possíveis

1. **Registrar a condição de cada execução** (coluna `CONDICAO`:
   SECO / PISTA MOLHADA / CHUVA). É barato, não muda regra nenhuma e é o que
   permite qualquer correção depois. **Recomendo fazer desde a primeira
   execução, independente do que se decida sobre o resto.**
2. **Exigir condição única por etapa.** Se chover no meio da sessão, suspende
   e retoma, ou refaz os atingidos. É a solução que não mexe na nota.
3. **Abatimento de chuva em segundos**, fixado no plano de avaliação antes da
   atividade. Hoje não há dado para calibrar o valor — a seletiva foi em tempo
   seco. Com a condição registrada (item 1), a primeira sessão molhada dá o
   deslocamento real da turma e o número sai dos dados, não do chute.

---

## 6. O que isso muda no desempate

A escolha de 1 s para toque e 3 s para derrubada cria uma coincidência exata:

```
3 toques = 1 derrubada = 3 segundos = 3 pontos
```

Mesma nota, condução bem diferente. É exatamente o caso em que o 1º critério
proposto em `PROPOSTA-DESEMPATE-CURSO.md` — **menos derrubadas antes de menos
toques** — deixa de ser detalhe e passa a decidir posição.

O resto daquele documento continua valendo. Em particular: com 1 pt/s e
cronômetro em segundos inteiros, nota igual continua significando tempo total
igual, e o empate segue sendo regra — **8 pares e 13 dos 25 alunos** nesta
tabela, contra 9 pares e 15 alunos na anterior. A cronometragem em décimos
segue sendo a medida que resolve.

---

## 7. Implementação, quando a regra estiver decidida

| Arquivo | O que muda |
|---|---|
| `js/config.js` | `TABELA_TEMPO`: 2:20 = 100 … 4:00 = 0. Sendo perfeitamente linear, é melhor gerada por laço (âncora 2:20, inclinação 1 pt/s) do que escrita em 101 linhas literais |
| `js/config.js` | `TABELA_PENALIDADES`: trocar `pontos` por `segundos` — toque 1, derrubada 3 |
| `js/config.js` | `FORMULA_NOTA: "PONTUACAO_TEMPO"` — sem componente de condução, sem peso |
| `js/config.js` | `TEMPO_MAXIMO`: decidir se acima de 4:00 é **nota 0** ou **eliminação**. São coisas diferentes: eliminado não ocupa vaga nem média |
| `js/utils.js` | `calcularResultado()`: os segundos de penalidade têm de entrar no tempo **antes** da consulta à tabela. Hoje a penalidade não toca o tempo |
| `js/utils.js` | `pontuacaoTempo()`: hoje devolve 0 para tudo além da última faixa. Com a reta indo até 4:00 isso deixa de ser degrau, mas o retorno acima de 4:00 precisa ser o que o item acima decidir |
| aba `RESULTADOS` | coluna `CONDICAO` e uma linha por *aluno × atividade* (item 2 da seção 13 da consolidação) |

Duas perguntas abertas que mudam o desenho:

- **Qual a nota mínima de aprovação do curso?** É ela, e não a borda da
  tabela, que determina o efeito prático da chuva (seção 5).
- **Acima de 4:00: nota zero ou eliminação?**
