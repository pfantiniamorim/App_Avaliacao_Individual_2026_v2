/* =====================================================================
   GERADOR DO FORMULÁRIO DE AVALIAÇÃO DA SELETIVA — 3º CECEM/2026
   Edital nº 047/2026-CBMDF/DIREN/SEITC

   O QUE FAZ
   Cria, no Drive de quem executar, um Google Formulário completo para os
   militares que participaram da seletiva avaliarem o PROCESSO (não a
   própria nota): agendamento, comunicação, dia da prova e organização.
   Cria também a planilha de respostas e já vincula as duas.

   COMO USAR (uma vez só)
   1. script.google.com → Novo projeto
   2. Cole este arquivo inteiro
   3. Selecione a função `criarFormularioAvaliacao` e clique em Executar
   4. Autorize na primeira vez
   5. Os links (público e de edição) saem no Registro de execução —
      Ver → Registros, ou Ctrl+Enter

   POR QUE SCRIPT SEPARADO, E NÃO O SCRIPT DA PLANILHA
   Isto é um gerador de uso único e não tem relação com o app de
   avaliação. Rodar num projeto standalone mantém intocado o script
   vinculado à planilha — que é quem responde a URL /exec dos dois apps.

   As perguntas seguem a jornada real dos dois apps: convocação → login
   por matrícula e telefone → escolha da faixa de horário → comprovante
   com protocolo → (eventual remarcação) → comparecimento ao 15º GBM →
   briefing do percurso → execução do TPP → ciência do resultado.
   ===================================================================== */

var CFG_FORM = {
  titulo: 'Avaliação do Processo Seletivo — 3º CECEM/2026',
  nomePlanilha: 'Avaliacao_Seletiva_2026 (respostas)',
  local: '15º GBM',
  viatura: 'Sprinter MB 415 CDI',
  uniforme: '3º A',
  edital: 'Edital nº 047/2026-CBMDF/DIREN/SEITC',
  // Dias em que houve execução do TPP (aba Faixas da Selecao_Condutores_2026).
  dias: ['11/08 (terça)', '12/08 (quarta)', '13/08 (quinta)', '14/08 (sexta)'],
  categorias: ['QOBM/Combatente', 'QBMG-2', 'QBMG-3', 'GBMOT', 'Vaga externa']
};

/* Escala de concordância de 1 a 5 usada na maior parte do formulário.
   Uma escala só, repetida, deixa o preenchimento mais rápido e permite
   comparar as etapas entre si na hora de tabular. */
function escala(form, titulo, ajuda, obrigatoria) {
  var item = form.addScaleItem()
    .setTitle(titulo)
    .setBounds(1, 5)
    .setLabels('Muito ruim', 'Muito bom')
    .setRequired(obrigatoria !== false);
  if (ajuda) item.setHelpText(ajuda);
  return item;
}

function secao(form, titulo, descricao) {
  var p = form.addPageBreakItem().setTitle(titulo);
  if (descricao) p.setHelpText(descricao);
  return p;
}

function criarFormularioAvaliacao() {
  var form = FormApp.create(CFG_FORM.titulo);

  form.setDescription(
    'Esta pesquisa avalia o PROCESSO da seletiva do 3º CECEM/2026 — agendamento, ' +
    'comunicação e organização do dia da prova. Não avalia o seu desempenho nem ' +
    'altera a sua nota.\n\n' +
    'A resposta é ANÔNIMA e leva cerca de 5 minutos. Sua opinião será usada para ' +
    'corrigir o que não funcionou nas próximas seletivas.\n\n' + CFG_FORM.edital);

  // Anônimo de verdade: sem coleta de e-mail e sem limite por conta, senão
  // o militar precisa se identificar no Google para responder.
  form.setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false)
    .setProgressBar(true)
    .setShowLinkToRespondAgain(false)
    .setConfirmationMessage(
      'Resposta registrada. Obrigado por contribuir com a melhoria do processo seletivo.');

  /* ---------------- 1. Perfil ---------------- */
  secao(form, '1. Identificação (sem nome)',
    'Serve apenas para separar as respostas por grupo e por dia. Ninguém é identificado.');

  form.addMultipleChoiceItem()
    .setTitle('Qual a sua destinação de vaga?')
    .setChoiceValues(CFG_FORM.categorias)
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Em que dia você executou o TPP?')
    .setChoiceValues(CFG_FORM.dias.concat(['Não cheguei a executar']))
    .setRequired(true);

  /* ---------------- 2. Agendamento ---------------- */
  secao(form, '2. Agendamento do horário',
    'Sobre o sistema em que você escolheu a data e o horário da sua prova.');

  escala(form, 'Facilidade para entrar no sistema de agendamento',
    'Acesso com matrícula e telefone.');
  escala(form, 'Clareza das instruções sobre COMO agendar');
  escala(form, 'Facilidade para escolher a data e o horário');

  form.addMultipleChoiceItem()
    .setTitle('Quanto tempo você levou para concluir o agendamento?')
    .setChoiceValues(['Menos de 2 minutos', 'De 2 a 5 minutos', 'De 5 a 15 minutos',
      'Mais de 15 minutos', 'Não consegui sozinho — precisei de ajuda'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Você recebeu o comprovante com o número de protocolo (SEL-2026-xxx)?')
    .setChoiceValues(['Sim, recebi e estava correto', 'Recebi, mas com alguma informação errada',
      'Não recebi', 'Não me lembro'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Você enfrentou algum destes problemas ao agendar?')
    .setHelpText('Pode marcar mais de uma opção.')
    .setChoiceValues([
      'Nenhum problema',
      'Meu telefone ou matrícula não era aceito',
      'O horário que eu queria já estava cheio',
      'O sistema travou ou não carregou',
      'Não entendi o que fazer na tela',
      'Não recebi o e-mail de confirmação',
      'Tive dificuldade no celular'])
    .showOtherOption(true)
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Você precisou remarcar seu horário?')
    .setChoiceValues(['Não precisei', 'Sim, e foi fácil remarcar',
      'Sim, e tive dificuldade', 'Sim, e não consegui pelo sistema — resolvi por outro meio'])
    .setRequired(true);

  /* ---------------- 3. Comunicação ---------------- */
  secao(form, '3. Informações e comunicação',
    'Sobre o que foi informado antes da prova.');

  escala(form, 'Clareza da convocação para a seletiva');
  escala(form, 'Antecedência com que você foi avisado');
  escala(form, 'Clareza das informações práticas',
    'Local (' + CFG_FORM.local + '), horário e uniforme (' + CFG_FORM.uniforme + ').');
  escala(form, 'Clareza sobre COMO você seria avaliado',
    'Percurso, infrações que descontam ponto e cálculo da nota final.');

  form.addMultipleChoiceItem()
    .setTitle('Antes de executar, você sabia quais eram os 7 exercícios do percurso?')
    .setChoiceValues(['Sim, sabia todos', 'Sabia mais ou menos', 'Não sabia',
      'Só descobri no dia da prova'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Por onde você recebeu as informações sobre a seletiva?')
    .setHelpText('Pode marcar mais de uma opção.')
    .setChoiceValues(['WhatsApp', 'E-mail', 'Minha chefia imediata',
      'Sistema de agendamento', 'Colegas de trabalho', 'Boletim Geral'])
    .showOtherOption(true)
    .setRequired(false);

  /* ---------------- 4. Dia da prova ---------------- */
  /* Nenhuma pergunta desta seção é obrigatória: quem não chegou a
     executar precisa conseguir enviar o formulário mesmo deixando tudo
     aqui em branco. Campo obrigatório numa seção que se manda pular
     trava o envio e faz perder a resposta inteira. */
  secao(form, '4. Dia da seletiva',
    'Sobre a organização no ' + CFG_FORM.local + ' e a execução do TPP. ' +
    'Se você não chegou a executar, deixe esta seção em branco e siga para a próxima.');

  escala(form, 'Pontualidade no início das atividades', null, false);

  form.addMultipleChoiceItem()
    .setTitle('Quanto tempo você esperou desde a chegada até executar o TPP?')
    .setChoiceValues(['Menos de 15 minutos', 'De 15 a 30 minutos', 'De 30 minutos a 1 hora',
      'De 1 a 2 horas', 'Mais de 2 horas'])
    .setRequired(false);

  escala(form, 'Clareza da explicação do percurso antes da execução', null, false);
  escala(form, 'Organização e postura da banca avaliadora', null, false);
  escala(form, 'Imparcialidade da avaliação', null, false);
  escala(form, 'Condições da viatura utilizada', CFG_FORM.viatura + '.', false);
  escala(form, 'Sinalização e montagem do percurso',
    'Cones, balizadores e demarcação da pista.', false);
  escala(form, 'Estrutura de apoio no local',
    'Espera, água, banheiro e sombra.', false);

  form.addMultipleChoiceItem()
    .setTitle('Você teve oportunidade de tirar dúvidas antes de executar?')
    .setChoiceValues(['Sim, e as dúvidas foram esclarecidas',
      'Sim, mas as respostas não foram claras', 'Não tive oportunidade',
      'Não tive dúvidas'])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Você tomou ciência do seu tempo e da sua pontuação?')
    .setChoiceValues(['Sim, no mesmo dia', 'Sim, alguns dias depois',
      'Não fui informado', 'Tive de procurar por conta própria'])
    .setRequired(false);

  /* ---------------- 5. Avaliação geral ---------------- */
  secao(form, '5. Avaliação geral e sugestões');

  form.addScaleItem()
    .setTitle('De 0 a 10, que nota você dá para o processo seletivo como um todo?')
    .setBounds(0, 10)
    .setLabels('Péssimo', 'Excelente')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Comparado a outros processos seletivos do CBMDF de que você já participou, este foi:')
    .setChoiceValues(['Muito melhor', 'Melhor', 'Igual', 'Pior', 'Muito pior',
      'Foi meu primeiro processo seletivo'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Qual etapa MAIS precisa melhorar?')
    .setChoiceValues(['Convocação e divulgação', 'Agendamento do horário',
      'Informações sobre a avaliação', 'Organização do dia da prova',
      'Execução e avaliação do TPP', 'Divulgação do resultado',
      'Nenhuma — o processo está adequado'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('O que funcionou BEM e deve ser mantido?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('O que NÃO funcionou e precisa ser corrigido?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Sugestões, críticas ou qualquer coisa que não foi perguntada')
    .setRequired(false);

  /* ---------------- Planilha de respostas ----------------
     Planilha própria, separada da Selecao_Condutores_2026: os dois apps
     leem aquela planilha em polling, e uma aba nova crescendo ali não
     tem por que dividir espaço com dado de avaliação. */
  var planilha = SpreadsheetApp.create(CFG_FORM.nomePlanilha);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());

  var msg = '\n=====================================================\n' +
    'FORMULÁRIO CRIADO NO SEU DRIVE\n' +
    '=====================================================\n' +
    'Link para enviar aos militares:\n' + form.getPublishedUrl() + '\n\n' +
    'Link para editar o formulário:\n' + form.getEditUrl() + '\n\n' +
    'Planilha de respostas:\n' + planilha.getUrl() + '\n' +
    '=====================================================';
  Logger.log(msg);
  return msg;
}

/* Link curto para colar no WhatsApp. Rode DEPOIS de criar o formulário,
   com o nome exato do arquivo — evita ter de abrir o Drive só para
   copiar o endereço. */
function mostrarLinkDoFormulario() {
  var arquivos = DriveApp.getFilesByName(CFG_FORM.titulo);
  if (!arquivos.hasNext()) {
    Logger.log('Nenhum formulário com o nome "' + CFG_FORM.titulo +
      '". Rode criarFormularioAvaliacao() primeiro.');
    return;
  }
  var form = FormApp.openById(arquivos.next().getId());
  Logger.log('Link público: ' + form.getShortUrl());
  Logger.log('Respostas até agora: ' + form.getResponses().length);
}
