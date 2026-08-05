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

  // URL do Web App do Google Apps Script (termina em /exec).
  // É o script VINCULADO à planilha (Extensões → Apps Script), que serve
  // só este app. O agendamento tem implantação própria e separada.
  ENDPOINT_APPS_SCRIPT: "https://script.google.com/macros/s/AKfycby6XB_N0NkWVqJTKfYUIu_7ifeTeTvJryNe5FIRvMtPpomkdRlVyJt5W4zl4OYAFpbc/exec",

  // URLs CSV de leitura (uma por aba)
  CSV_CANDIDATOS_URL: CSV_ABA + "CANDIDATOS",
  CSV_REGISTROS_URL:  CSV_ABA + "REGISTROS",
  CSV_RESULTADOS_URL: CSV_ABA + "RESULTADOS",

  // Intervalo do polling de leitura (ms) — atualização da visão agregada
  POLLING_MS: 12000,

  /* ================= REGRAS DO EDITAL (EDITÁVEIS) ============= */

  // Fórmula da nota final (MF). Interpretada dinamicamente.
  // Variáveis disponíveis: PONTUACAO_TEMPO, PENALIDADES
  FORMULA_NOTA: "(PONTUACAO_TEMPO * 1.75 + 100 - PENALIDADES) / 2.75",

  // Tempo máximo do percurso — acima disso o candidato é ELIMINADO
  TEMPO_MAXIMO: "04:06",

  // Base tempo → pontuação. Vale a PRIMEIRA faixa em que o tempo
  // couber (tempo <= "ate"). ⚠ VALORES DE EXEMPLO — ajustar ao edital.
  TABELA_TEMPO: [
    { ate: "02:30", pontos: 100 },
    { ate: "02:45", pontos: 90 },
    { ate: "03:00", pontos: 80 },
    { ate: "03:15", pontos: 70 },
    { ate: "03:30", pontos: 60 },
    { ate: "03:45", pontos: 50 },
    { ate: "04:00", pontos: 40 },
    { ate: "04:06", pontos: 30 }
  ],

  // Infração → pontos de penalidade. Use pontos: "ELIMINATORIO"
  // para infrações que eliminam o candidato.
  TABELA_PENALIDADES: [
    { key: "toque",          nome: "Toque em Cone",        pontos: 3 },
    { key: "derrubada",      nome: "Derrubada de Cone",    pontos: 10 },
    { key: "apagarViatura",  nome: "Apagar a Viatura",     pontos: 10 },
    { key: "desvioPercurso", nome: "Desvio de Percurso",   pontos: 100 },
    { key: "seguranca",      nome: "Falha de Segurança",   pontos: "ELIMINATORIO" }
  ],

  // Exercícios do percurso (referência para o avaliador)
  EXERCICIOS: [
    "INSPEÇÃO INICIAL DA VIATURA",
    "SLALOM ENTRE CONES",
    "BALIZA / ESTACIONAMENTO",
    "MARCHA À RÉ",
    "GARAGEM",
    "RAMPA / ACLIVE"
  ],

  // Ordem dos critérios de desempate (após a MF):
  // "tempo" = menor tempo | "penalidades" = menos pontos perdidos
  CRITERIOS_DESEMPATE: ["tempo", "penalidades"],

  /* ================= ACESSO =================
     PIN das telas do Chefe da Avaliação (cadastro de candidatos,
     dashboard/lançamento de tempo e configurações). É apenas um
     dificultador de acesso casual — o PIN fica visível no código-
     fonte do site (app estático, sem servidor de autenticação).
     Não protege contra alguém disposto a inspecionar o código. */
  PIN_CHEFE: "2026"
};
