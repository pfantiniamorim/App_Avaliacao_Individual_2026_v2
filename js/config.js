/* =========================================================
   Configuração central — TESTE DE SELEÇÃO DE CONDUTORES DE
   VIATURA (CBMDF/GBMOT).

   Modelo MULTI-AVALIADOR EM TEMPO REAL: até 15 avaliadores
   marcam penalidades do MESMO candidato ao mesmo tempo; o log
   de cada candidato é a SOMA de todas as marcações + o tempo
   de prova. Tudo auditável na planilha Google.

   TUDO o que muda por edital fica NESTE arquivo — a lógica
   nunca precisa ser alterada.

   Carregar em toda página ANTES de js/utils.js.
   ========================================================= */
/* ID da planilha "Selecao_Condutores_2026" — a MESMA usada pelo app de
   agendamento (pfantiniamorim/painel-de-agendamento), que lê a aba
   CANDIDATOS como lista de militares. Trocar aqui troca as 3 URLs. */
var SHEET_ID = "18GTuzXfIRfwwHrq_DODcuv0NFxRkdq_wvum0REJvS_g";
var CSV_ABA = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&sheet=";

window.APP_CONFIG = {

  /* ================= INTEGRAÇÃO COM A PLANILHA =================
     Passo a passo completo em CONFIGURAR_PLANILHA.md
     (mesma planilha, 3 abas: CANDIDATOS, REGISTROS, RESULTADOS) */

  /* URL do Web App do Google Apps Script (termina em /exec) — implantação
     EXCLUSIVA deste app. O agendamento tem a dele, separada.

     ⚠ Trocada em 07/08/2026. A URL anterior (`AKfycby6…`) continuava
     servindo uma VERSÃO ANTIGA da implantação, com o código do agendamento,
     mesmo depois de o código certo ser colado e salvo no editor — no Apps
     Script, salvar não muda o que o /exec entrega; só criar uma NOVA VERSÃO
     (ou uma nova implantação) muda. O sintoma era toda marcação de
     penalidade voltar com "Ação inválida: undefined" e ficar presa na fila.

     Como saber qual código está atrás de uma URL: abra-a no navegador.
       {"ok":true,"servico":"Seleção de Condutores CBMDF"}  → este app ✅
       {"ok":false,…,"codigo":"ACAO_INVALIDA"}              → agendamento ❌ */
  ENDPOINT_APPS_SCRIPT: "https://script.google.com/macros/s/AKfycbzbuMD8b8Y5BVqyAJkVyyB8US4sPzfnWg_ga37S64VIH1Wp3NTM_9vrktpUmGReXIYp/exec",

  // URLs CSV de leitura (uma por aba)
  CSV_CANDIDATOS_URL: CSV_ABA + "CANDIDATOS",
  CSV_REGISTROS_URL:  CSV_ABA + "REGISTROS",
  CSV_RESULTADOS_URL: CSV_ABA + "RESULTADOS",

  // Intervalo do polling de leitura (ms) — atualização da visão agregada
  POLLING_MS: 12000,

  /* ================= REGRAS DO EDITAL (EDITÁVEIS) =================
     Fonte: EDITAL Nº 047/2026-CBMDF/DIREN/SEITC — 3º CECEM/2026,
     item 8 (Teste Profissional Prático). Transcrito em 05/08/2026. */

  /* Identificação do certame. Alimenta os títulos das telas e o
     cabeçalho do relatório individual — a nomenclatura do edital fica
     num lugar só, e um certame novo se resolve editando este bloco. */
  EDITAL: {
    numero: "Edital nº 047/2026-CBMDF/DIREN/SEITC",
    curso: "3º CECEM/2026",
    cursoExtenso: "3º Curso de Especialização para Condutores de Veículos de Emergência",
    prova: "Teste Profissional Prático",
    provaSigla: "TPP",
    unidade: "CBMDF · DIREN · GBMOT",
    local: "15º GBM",
    viatura: "Sprinter MB 415 CDI short ou similar",
    uniforme: "3º A"
  },

  /* Fórmula da Média Final (MF), confirmada pela Chefia da Avaliação:
         MF = [(PONTUACAO_TEMPO × 1,75) + (100 − PENALIDADES)] ÷ 2,75
     Média ponderada da pontuação de tempo (peso 1,75) com a pontuação de
     condução (peso 1,00), sendo a de condução 100 menos os pontos das
     infrações — item 8.2.1: "o candidato iniciará o TPP com 100 pontos,
     sendo descontados os pontos correspondentes às infrações cometidas".
     Variáveis disponíveis: PONTUACAO_TEMPO, PENALIDADES */
  FORMULA_NOTA: "(PONTUACAO_TEMPO * 1.75 + 100 - PENALIDADES) / 2.75",

  /* Tempo máximo do TPP. Até 04:05 o candidato pontua (04:05 = 10,00);
     ao atingir 04:06 é ELIMINADO. Centésimos de segundo são
     desconsiderados — o tempo é lançado em MM:SS. */
  TEMPO_MAXIMO: "04:05",

  /* Base tempo → pontuação (item 8.2, "DO TEMPO"). Vale a PRIMEIRA faixa
     em que o tempo couber (tempo <= "ate"). Segundo a segundo, exatamente
     como no quadro do edital: 02:30 = 100,00 … 04:05 = 10,00. */
  TABELA_TEMPO: [
    { ate: "02:30", pontos: 100    }, { ate: "02:31", pontos: 99     }, { ate: "02:32", pontos: 98     }, { ate: "02:33", pontos: 97     },
    { ate: "02:34", pontos: 96     }, { ate: "02:35", pontos: 95     }, { ate: "02:36", pontos: 94     }, { ate: "02:37", pontos: 93     },
    { ate: "02:38", pontos: 92     }, { ate: "02:39", pontos: 90     }, { ate: "02:40", pontos: 87.5   }, { ate: "02:41", pontos: 85     },
    { ate: "02:42", pontos: 82.5   }, { ate: "02:43", pontos: 80     }, { ate: "02:44", pontos: 77.5   }, { ate: "02:45", pontos: 75     },
    { ate: "02:46", pontos: 72.5   }, { ate: "02:47", pontos: 70     }, { ate: "02:48", pontos: 68.8   }, { ate: "02:49", pontos: 67.6   },
    { ate: "02:50", pontos: 66.4   }, { ate: "02:51", pontos: 65.2   }, { ate: "02:52", pontos: 64     }, { ate: "02:53", pontos: 62.8   },
    { ate: "02:54", pontos: 61.6   }, { ate: "02:55", pontos: 60.6   }, { ate: "02:56", pontos: 60     }, { ate: "02:57", pontos: 59.4   },
    { ate: "02:58", pontos: 58.8   }, { ate: "02:59", pontos: 58.2   }, { ate: "03:00", pontos: 57.6   }, { ate: "03:01", pontos: 57     },
    { ate: "03:02", pontos: 56.4   }, { ate: "03:03", pontos: 55.8   }, { ate: "03:04", pontos: 55.2   }, { ate: "03:05", pontos: 54.6   },
    { ate: "03:06", pontos: 54     }, { ate: "03:07", pontos: 53.4   }, { ate: "03:08", pontos: 52.8   }, { ate: "03:09", pontos: 52.2   },
    { ate: "03:10", pontos: 51.6   }, { ate: "03:11", pontos: 51     }, { ate: "03:12", pontos: 50.4   }, { ate: "03:13", pontos: 49.8   },
    { ate: "03:14", pontos: 49.2   }, { ate: "03:15", pontos: 48.6   }, { ate: "03:16", pontos: 48     }, { ate: "03:17", pontos: 47.4   },
    { ate: "03:18", pontos: 46.8   }, { ate: "03:19", pontos: 46.2   }, { ate: "03:20", pontos: 45.6   }, { ate: "03:21", pontos: 45     },
    { ate: "03:22", pontos: 44.4   }, { ate: "03:23", pontos: 43.8   }, { ate: "03:24", pontos: 43.2   }, { ate: "03:25", pontos: 42.6   },
    { ate: "03:26", pontos: 42     }, { ate: "03:27", pontos: 41.4   }, { ate: "03:28", pontos: 40.8   }, { ate: "03:29", pontos: 40.2   },
    { ate: "03:30", pontos: 39.6   }, { ate: "03:31", pontos: 39     }, { ate: "03:32", pontos: 38.4   }, { ate: "03:33", pontos: 37.8   },
    { ate: "03:34", pontos: 37.2   }, { ate: "03:35", pontos: 36.6   }, { ate: "03:36", pontos: 36     }, { ate: "03:37", pontos: 35.4   },
    { ate: "03:38", pontos: 34.8   }, { ate: "03:39", pontos: 34.2   }, { ate: "03:40", pontos: 33.6   }, { ate: "03:41", pontos: 33     },
    { ate: "03:42", pontos: 32.4   }, { ate: "03:43", pontos: 31.8   }, { ate: "03:44", pontos: 31.2   }, { ate: "03:45", pontos: 30.6   },
    { ate: "03:46", pontos: 30     }, { ate: "03:47", pontos: 29.4   }, { ate: "03:48", pontos: 28.8   }, { ate: "03:49", pontos: 28.2   },
    { ate: "03:50", pontos: 27.6   }, { ate: "03:51", pontos: 27     }, { ate: "03:52", pontos: 26.4   }, { ate: "03:53", pontos: 25.8   },
    { ate: "03:54", pontos: 25.2   }, { ate: "03:55", pontos: 24.6   }, { ate: "03:56", pontos: 24     }, { ate: "03:57", pontos: 23.4   },
    { ate: "03:58", pontos: 22.8   }, { ate: "03:59", pontos: 22.2   }, { ate: "04:00", pontos: 21.6   }, { ate: "04:01", pontos: 21     },
    { ate: "04:02", pontos: 20.4   }, { ate: "04:03", pontos: 19.8   }, { ate: "04:04", pontos: 15     }, { ate: "04:05", pontos: 10     }
  ],

  /* Quadro de infrações e penalidades (item 8.2.2). O candidato começa com
     100 pontos e perde os pontos de cada infração cometida. Use
     pontos: "ELIMINATORIO" para as que eliminam o candidato. */
  TABELA_PENALIDADES: [
    { key: "toque",          nome: "Toque em Cone/Balizador",      pontos: 3 },
    { key: "derrubada",      nome: "Derrubada de Cone/Balizador",  pontos: 10 },
    { key: "apagarViatura",  nome: "Interromper o Motor",          pontos: 10 },
    { key: "desvioPercurso", nome: "Desvio/Erro de Percurso",      pontos: 100 },
    { key: "seguranca",      nome: "Atentar Contra a Segurança",   pontos: "ELIMINATORIO" }
  ],

  // Os 7 exercícios do percurso, na ordem do edital (item 8.1.1).
  // Croqui no Anexo "D"; execução no vídeo do item 8.1.2.
  EXERCICIOS: [
    "I — SLALOM DE ALTA",
    "II — BALIZA",
    "III — SLALOM DE BAIXA",
    "IV — CORREDOR \"N\"",
    "V — MARCHA RÉ",
    "VI — GARAGEM BALIZADA",
    "VII — \"OITO\""
  ],

  /* Ordem dos critérios de desempate, após a MF (item 8.1.10):
     menor tempo → menos penalidades → antiguidade militar.
     "antiguidade" lê a coluna opcional ANTIGUIDADE da aba CANDIDATOS
     (número; menor = mais antigo). Coluna vazia = critério não desempata
     nada, e a decisão fica com o Chefe da Avaliação. */
  CRITERIOS_DESEMPATE: ["tempo", "penalidades", "antiguidade"],

  /* ========== DISTRIBUIÇÃO DAS VAGAS DO CURSO (24 no total) ==========
     Quadro "DISTRIBUIÇÃO DAS VAGAS" do edital. Cada candidato traz sua
     destinação na coluna CATEGORIA da aba CANDIDATOS (QOBM, QBMG-2,
     QBMG-3 ou EXTERNA) e, se for do GBMOT, SIM na coluna GBMOT.

     A ORDEM desta lista é a ordem de preenchimento. O GBMOT vem por
     último de propósito: o militar do GBMOT concorre primeiro na vaga da
     própria graduação e, se não entrar lá, ainda disputa uma das 4
     reservadas — assim a reserva nunca prejudica quem ela existe para
     proteger. Para inverter (GBMOT disputa primeiro as 4 reservadas),
     basta mover a linha do GBMOT para o topo desta lista.

     redistribuiPara: destino que herda as vagas não preenchidas, conforme
     "REDISTRIBUIÇÃO DE VAGAS". O edital só manda redistribuir QOBM e
     Externas, ambas para QBMG-2 — e proíbe vaga do CBMDF ir para o
     público externo. Sobra de QBMG-3 ou do GBMOT o edital não trata: fica
     como VAGA REMANESCENTE, para decisão da comissão, em vez de o app
     inventar uma regra que o edital não escreveu.

     reserva: true = preenchida pela coluna GBMOT, não pela CATEGORIA. */
  VAGAS: [
    { key: "QOBM",    nome: "QOBM/Comb.", postos: "Maj, Cap, Ten",  quantidade: 2,  redistribuiPara: "QBMG-2" },
    { key: "QBMG-2",  nome: "QBMG-2",     postos: "Sd/1 à Sub Ten", quantidade: 14, redistribuiPara: null },
    { key: "QBMG-3",  nome: "QBMG-3",     postos: "Sd/1 à Sub Ten", quantidade: 2,  redistribuiPara: null },
    { key: "EXTERNA", nome: "Externas",   postos: "Todos",          quantidade: 2,  redistribuiPara: "QBMG-2" },
    { key: "GBMOT",   nome: "GBMOT",      postos: "—",              quantidade: 4,  redistribuiPara: null, reserva: true }
  ],

  /* Grafias aceitas na coluna CATEGORIA da planilha → chave em VAGAS.
     A comparação ignora maiúsculas, acentos, espaços e pontuação. */
  ALIAS_CATEGORIA: {
    "QOBM": "QOBM", "QOBMCOMB": "QOBM", "QOBMCOMBATENTE": "QOBM", "OFICIAL": "QOBM",
    "QBMG2": "QBMG-2", "QBMG3": "QBMG-3",
    "EXTERNA": "EXTERNA", "EXTERNO": "EXTERNA", "EXTERNAS": "EXTERNA"
  },

  /* ================= ACESSO =================
     PIN das telas do Chefe da Avaliação (cadastro de candidatos,
     dashboard/lançamento de tempo e configurações). É apenas um
     dificultador de acesso casual — o PIN fica visível no código-
     fonte do site (app estático, sem servidor de autenticação).
     Não protege contra alguém disposto a inspecionar o código. */
  PIN_CHEFE: "2026"
};
