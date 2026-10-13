# Proposta de critérios de desempate — 3º CECEM/2026

Para a metodologia nova do curso:

```
Tempo Total   = Tempo de Execução + Segundos de Penalidades
Nota da Etapa = nota correspondente ao Tempo Total (tabela 2:25 = 100 … 1 pt/s)
Nota Final    = (Nota Etapa 1 + Nota Etapa 2) / 2
```

Documento de apoio à decisão da Comissão. **Nada aqui está implementado** —
`js/config.js` continua com as regras da seletiva (Edital 047/2026).

---

## 1. Por que isso mudou de importância

Na seletiva, a MF saía de uma divisão por 2,75 e tinha duas casas decimais —
uma escala quase contínua. Empate era exceção: **2 pares em 52 militares
(7,7%)** — MF 98,91 (LEANDRO × RAMADÃ) e MF 92,05 (LEMES × RAPHAEL LOPES).

Na metodologia nova a nota da etapa é um número inteiro que vem direto da
tabela, 1 ponto por segundo. Aplicando-a aos tempos reais dos 25 alunos da
turma, em uma única etapa e sem nenhuma penalidade:

| Nota | Alunos empatados |
|---|---|
| 100 | WILTON (2:23) · RAFAEL (2:17) — **empate de platô, tempos diferentes** |
| 96 | LEANDRO HENRIQUE · RUAN YORDAN · RENATO (todos 2:29) |
| 95 | RAMADÃ · JACKSON (2:30) |
| 94 | LUCAS MOURA · ALVES JÚNIOR (2:31) |
| 93 | BRUNO VIEIRA · MICHEL (2:32) |
| 85 | RAPHAEL LOPES · LEMES (2:40) |
| 77 | ROBSON · MURILO (2:48) |

**9 pares, 15 dos 25 alunos (60%) empatados.** A média das duas etapas melhora,
porque a nota final passa a andar de meio em meio ponto: o esperado cai para
**~5 pares**. Ainda assim, o desempate deixa de ser exceção e passa a ser
rotina — inclusive no 1º lugar, que é o nome do elogio em boletim e da
indicação à medalha.

---

## 2. Antes de qualquer critério: cronometrar em décimos

A causa do empate não é a inclinação da tabela — é a **resolução da medida**.
Com qualquer tabela monotônica, dois alunos com o mesmo tempo total tiram a
mesma nota. Trocar 1 pt/s por 0,75 pt/s não muda nada.

| Cronometragem | Passo da nota | Pares esperados (1 etapa) | Pares (2 etapas) |
|---|---|---|---|
| segundo inteiro | 1,0 pt | 7,3 | 5,2 |
| **décimo de segundo** | **0,1 pt** | **0,73** | **0,52** |
| centésimo | 0,01 pt | 0,07 | 0,05 |

Cronometrar em décimos derruba o empate esperado de ~9 pares para menos de 1
na turma inteira, **sem mexer na tabela, na fórmula nem na penalidade** — a
nota vira `245 − tempo_total` com uma casa decimal. É a medida mais barata
deste documento e resolve o problema em vez de arbitrá-lo.

Os critérios abaixo continuam necessários: eles cobrem o empate de platô (que
nenhuma resolução resolve) e o residual.

---

## 3. A cascata proposta

> **Art. X** — Em caso de igualdade na Nota Final, a classificação será
> definida, sucessivamente, por:
>
> **I** — menor gravidade acumulada das penalidades das duas etapas,
> considerando-se, nesta ordem, o menor número de derrubadas de cone ou
> balizador e o menor número de toques;
>
> **II** — menor tempo de execução somado das duas etapas, **desconsiderados**
> os segundos de penalidade;
>
> **III** — maior nota obtida na Etapa 2;
>
> **IV** — maior antiguidade militar;
>
> **V** — persistindo a igualdade, decisão fundamentada da Comissão de
> Avaliação, registrada em ata.
>
> **§ 1º** Fica vedado o desempate por ordem alfabética.

### Por que nesta ordem

**I — penalidades primeiro, e não o tempo.** A fórmula nova não tem componente
de condução: a nota é só a tabela. O desempate é o único lugar onde a
qualidade da condução volta a pesar. Entre dois alunos com a mesma nota, um
que fez o percurso limpo e um que derrubou cone, prevalece o limpo.

A hierarquia derrubada → toque é a mesma que o Edital 047/2026 já publicou
(toque 3 pontos, derrubada 10): um balizador no chão é erro mais grave que um
roçar. Usá-la **apenas como desempate** mantém a gravidade no sistema sem
reintroduzir pontos na nota.

**II — tempo bruto depois, nunca antes.** Aqui está o ponto que inverte o
critério atual do app. Como `nota = 245 − tempo_total`, nota igual significa
tempo **total** igual por construção — o critério "menor tempo" não desempata
nada. E se ele olhar o tempo de execução **bruto** vindo antes das
penalidades, premia justamente quem derrubou o cone:

| Aluno | Execução | Derrubadas | + seg | Tempo total | Nota |
|---|---|---|---|---|---|
| A | 2:30 | 1 | 3 | 2:33 | 92 |
| B | 2:33 | 0 | 0 | 2:33 | 92 |
| C | 2:27 | 2 | 6 | 2:33 | 92 |

Os três tiram 92. Pelo critério de hoje (menor tempo primeiro), a ordem seria
**C, A, B** — exatamente a ordem inversa da qualidade de condução. Com a
cascata proposta: **B, A, C**.

O tempo bruto tem o que dizer num caso só, e é por isso que ele fica em II: o
**empate de platô**. RAFAEL (2:17) e WILTON (2:23) tiram 100 os dois, ambos
limpos, com 6 segundos de diferença real. O critério I não separa; o II separa
e coloca RAFAEL na frente.

**III — a Etapa 2.** Privilegia a técnica consolidada ao fim do curso, não a
do começo. É objetivo, já está apurado e não exige dado novo.
*Alternativa*, se a Comissão preferir premiar constância em vez de evolução:
"menor diferença absoluta entre as notas das duas etapas".

**IV — antiguidade.** Mantém a continuidade com o item 8.1.10 do Edital
047/2026, já está codificada no app e **nunca empata** — desde que a coluna
esteja preenchida.

**V — ata.** O par MF 92,05 da seletiva (LEMES × RAPHAEL LOPES, mesmo tempo,
zero penalidades, `ANTIGUIDADE` em branco) esgotou os três critérios do edital
e caiu, em silêncio, na **ordem alfabética** — que não é critério de edital
nenhum. Um empate que sobra deve aparecer como empate e subir para decisão
registrada, não ser resolvido por acaso de nome.

---

## 4. O que precisa acontecer antes da primeira execução

1. **Preencher a coluna `ANTIGUIDADE`** da aba `CANDIDATOS` para os 25 alunos
   (número, menor = mais antigo). Sem ela o critério IV não desempata nada e o
   problema do LEMES × RAPHAEL LOPES se repete.
2. **Definir a tabela de gravidade das penalidades do curso.** Até aqui só a
   derrubada foi definida (3 segundos). O critério I precisa saber quais
   infrações existem e qual a ordem de gravidade entre elas.
3. **Escrever a cascata no plano de avaliação** antes da atividade. O 1º lugar
   tem consequência documental; critério de desempate decidido depois do
   resultado é critério contestável.

### Mudanças no app, quando a regra estiver decidida

| Arquivo | O que muda |
|---|---|
| `js/config.js` | `CRITERIOS_DESEMPATE: ["gravidade", "tempo", "etapa2", "antiguidade"]` |
| `js/utils.js` | `classificarRanking()`: implementar `gravidade` e `etapa2`; o ramo `tempo` passa a usar o tempo **bruto**, não o total |
| `js/utils.js` | trocar o `localeCompare(nome)` final por marcação de **empate não resolvido** |
| `ranking.html`, `relatorio-ranking.html` | rótulos dos critérios novos e aviso visível de empate não resolvido |

O desempate por etapa (`etapa2`) depende do modelo de `RESULTADOS` com uma
linha por *aluno × atividade*, em vez de uma linha por aluno — a decisão
registrada no item 2 da seção 13 da consolidação.
