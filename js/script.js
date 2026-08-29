// --- MODAL DE AVISO / CONFIRMAÇÃO GENÉRICO ---
// Substitui os antigos alert()/confirm() nativos do navegador (que abrem
// como popup do sistema, fora do layout do app) por uma janela flutuante
// no mesmo estilo visual dos outros modais do Estude+. mostrarAlerta()
// resolve a Promise quando o usuário fecha o aviso; mostrarConfirmacao()
// resolve com true/false conforme o botão clicado — ambas devem ser usadas
// com "await" no lugar de alert(...)/confirm(...).
let _resolverModalAviso = null;

function _fecharModalAvisoInterno(resultado) {
  const modal = document.getElementById("modal-aviso-generico");
  if (modal) modal.style.display = "none";
  if (_resolverModalAviso) {
    const resolver = _resolverModalAviso;
    _resolverModalAviso = null;
    resolver(resultado);
  }
}

function _confirmarModalAviso() {
  _fecharModalAvisoInterno(true);
}

function _cancelarModalAviso() {
  _fecharModalAvisoInterno(false);
}

// Clicar no fundo escurecido fora da caixa do modal equivale a cancelar.
function fecharModalAvisoSeClicouFora(event) {
  if (event.target === event.currentTarget) {
    _cancelarModalAviso();
  }
}

function _prepararModalAviso(mensagem, opcoes, modoConfirmacao) {
  const modal = document.getElementById("modal-aviso-generico");
  if (!modal) return null;

  document.getElementById("modal-aviso-icone").textContent =
    opcoes.icone || (modoConfirmacao ? "❓" : "ℹ️");
  document.getElementById("modal-aviso-titulo").textContent =
    opcoes.titulo || (modoConfirmacao ? "Confirmar ação" : "Aviso");
  document.getElementById("modal-aviso-mensagem").textContent =
    String(mensagem);

  const btnCancelar = document.getElementById("modal-aviso-btn-cancelar");
  const btnConfirmar = document.getElementById("modal-aviso-btn-confirmar");
  const botoesContainer = document.querySelector(".modal-aviso-botoes");

  btnCancelar.style.display = modoConfirmacao ? "" : "none";
  if (botoesContainer) {
    botoesContainer.classList.toggle("somente-ok", !modoConfirmacao);
  }
  btnCancelar.textContent = opcoes.textoCancelar || "Cancelar";
  btnConfirmar.textContent = modoConfirmacao
    ? opcoes.textoConfirmar || "Confirmar"
    : "OK";
  btnConfirmar.classList.toggle("btn-aviso-perigo", !!opcoes.perigo);

  modal.style.display = "flex";
  return modal;
}

// Substitui window.alert(mensagem). Ex: await mostrarAlerta("Perfil salvo.")
function mostrarAlerta(mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const modal = _prepararModalAviso(mensagem, opcoes, false);
    if (!modal) {
      resolve();
      return;
    }
    _resolverModalAviso = () => resolve();
  });
}

// Substitui window.confirm(mensagem). Ex:
// const ok = await mostrarConfirmacao("Excluir isso?", { perigo: true });
function mostrarConfirmacao(mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const modal = _prepararModalAviso(mensagem, opcoes, true);
    if (!modal) {
      resolve(false);
      return;
    }
    _resolverModalAviso = resolve;
  });
}

// --- MODAL GENÉRICO: "VER DETALHES" DOS CARDS DE ANÁLISE ---
// Vários cards de análise (Desempenho, Radar, Matriz de Prioridade,
// Caderno de Erros, etc.) viraram um card-resumo compacto na página + o
// conteúdo completo (gráficos, tabelas) num modal, aberto sob demanda —
// em vez de ficarem todos empilhados e poluindo a aba. Um único par de
// funções abre/fecha qualquer um desses modais pelo id.
// Gráficos Chart.js criados enquanto o card ainda está escondido (dentro
// de um modal fechado, ou de um card-resumo no modo compacto) nascem com
// largura zero e não se ajustam sozinhos quando o card aparece depois —
// por isso ficavam pequenos/espremidos ao abrir o "Ver Detalhes" ou trocar
// de modo de visualização. Forçar um resize() em todos os gráficos ativos
// logo após o card ficar visível resolve isso.
function redimensionarGraficosVisiveis() {
  if (typeof Chart === "undefined" || !Chart.instances) return;
  requestAnimationFrame(() => {
    Object.values(Chart.instances).forEach((instancia) => {
      try {
        instancia.resize();
      } catch (erro) {
        // Gráfico pode já ter sido destruído entre o agendamento e a
        // execução do frame — ignora com segurança.
      }
    });
  });
}

function abrirModalDetalheCard(idModal) {
  const modal = document.getElementById(idModal);
  if (modal) modal.style.display = "flex";
  redimensionarGraficosVisiveis();
}

function fecharModalDetalheCard(idModal) {
  const modal = document.getElementById(idModal);
  if (modal) modal.style.display = "none";
}

function fecharModalDetalheCardSeClicouFora(event, idModal) {
  if (event.target.id === idModal) {
    fecharModalDetalheCard(idModal);
  }
}

// --- MODO DE VISUALIZAÇÃO DOS CARDS DE ANÁLISE (compacto x expandido) ---
// "Compacto" (padrão): cada card de análise é um resumo pequeno com botão
// "Ver Detalhes" que abre o conteúdo completo num modal. "Expandido": volta
// ao formato anterior à conversão, com tudo sempre visível direto na
// página. A preferência fica salva e some/aparece revezando entre os dois
// layouts via uma classe no <body> — nenhum conteúdo é duplicado, então
// gráficos/canvas continuam com um único id cada.
const IDS_CARDS_DETALHE_COM_VISIBILIDADE_CONDICIONAL = [
  "card-radar-competencias",
  "card-matriz-prioridade",
  "card-caderno-erros",
  "card-desempenho-banca",
  "card-avulsas-vs-simulados",
  "card-comparativo-provas",
  "card-evolucao-temporal",
  "card-heatmap-horario",
  "card-questoes-evolucao",
  "card-simulados-evolucao",
  "card-sessoes-por-tipo",
  "card-nota-estimada",
];

function obterModoVisualizacaoCards() {
  return localStorage.getItem("modoVisualizacaoCards") || "compacto";
}

function alternarMenuModoVisualizacao() {
  const menu = document.getElementById("menu-modo-visualizacao");
  if (!menu) return;
  const abrindo = menu.style.display === "none" || !menu.style.display;
  menu.style.display = abrindo ? "block" : "none";
}

function fecharMenuModoVisualizacao() {
  const menu = document.getElementById("menu-modo-visualizacao");
  if (menu) menu.style.display = "none";
}

// Clicar fora do menu suspenso fecha ele, igual aos outros menus/modais
// do app.
document.addEventListener("click", (event) => {
  const wrapper = document.getElementById("menu-modo-visualizacao-wrapper");
  const menu = document.getElementById("menu-modo-visualizacao");
  if (!wrapper || !menu || menu.style.display !== "block") return;
  if (!wrapper.contains(event.target)) fecharMenuModoVisualizacao();
});

function selecionarModoVisualizacaoCards(modo) {
  aplicarModoVisualizacaoCards(modo);
  fecharMenuModoVisualizacao();
}

function aplicarModoVisualizacaoCards(modo) {
  document.body.classList.toggle("modo-cards-expandido", modo === "expandido");
  localStorage.setItem("modoVisualizacaoCards", modo);
  sincronizarVisibilidadeCardsDetalhe();
  atualizarBotoesModoVisualizacaoCards();
  redimensionarGraficosVisiveis();
}

function atualizarBotoesModoVisualizacaoCards() {
  const modoAtual = obterModoVisualizacaoCards();
  document.querySelectorAll(".opcao-modo-visualizacao").forEach((btn) => {
    btn.classList.toggle("opcao-modo-ativa", btn.dataset.modo === modoAtual);
  });
}

// Espelha o display do card-resumo (controlado pelas funções renderizarX()
// já existentes, que escondem o card quando ainda não há dado suficiente)
// pro card de detalhe correspondente — assim, no modo expandido, o card de
// detalhe some/aparece exatamente como sumia/aparecia antes dessa conversão
// pra modal, em vez de ficar sempre visível mesmo sem dado nenhum.
function sincronizarVisibilidadeCardsDetalhe() {
  IDS_CARDS_DETALHE_COM_VISIBILIDADE_CONDICIONAL.forEach((idResumo) => {
    const resumo = document.getElementById(idResumo);
    const detalhe = document.getElementById(
      idResumo.replace("card-", "modal-"),
    );
    if (!resumo || !detalhe) return;
    detalhe.dataset.temDados = resumo.style.display === "none" ? "nao" : "sim";
  });
}

// Observa mudanças no atributo "style" de cada card-resumo condicional —
// assim, sempre que uma função renderizarX() escondê-lo/mostrá-lo (o que já
// acontecia antes dessa conversão), o card de detalhe no modo expandido
// acompanha automaticamente, sem precisar mexer em nenhuma dessas funções.
function iniciarObservadorVisibilidadeCardsDetalhe() {
  IDS_CARDS_DETALHE_COM_VISIBILIDADE_CONDICIONAL.forEach((idResumo) => {
    const resumo = document.getElementById(idResumo);
    if (!resumo) return;
    const observer = new MutationObserver(sincronizarVisibilidadeCardsDetalhe);
    observer.observe(resumo, { attributes: true, attributeFilter: ["style"] });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  aplicarModoVisualizacaoCards(obterModoVisualizacaoCards());
  iniciarObservadorVisibilidadeCardsDetalhe();
  sincronizarVisibilidadeCardsDetalhe();
});

// --- MODAL: SUGESTÕES E RECLAMAÇÕES ---
function abrirModalFeedback() {
  const modal = document.getElementById("modal-feedback");
  if (modal) modal.style.display = "flex";
}

function fecharModalFeedback() {
  const modal = document.getElementById("modal-feedback");
  if (modal) modal.style.display = "none";
}

function fecharModalFeedbackSeClicouFora(event) {
  if (event.target === event.currentTarget) fecharModalFeedback();
}

async function copiarEmailFeedback() {
  const email = "studypluspomoapp@gmail.com";
  try {
    await navigator.clipboard.writeText(email);
    await mostrarAlerta("Email copiado! Cola no seu app de email preferido.", {
      icone: "📋",
    });
  } catch {
    await mostrarAlerta(`Email de contato: ${email}`);
  }
}

// --- VARIÁVEIS DE ESTADO (LOCALSTORAGE) ---
let historicoEstudos =
  JSON.parse(localStorage.getItem("historicoEstudos")) || {};
let materias = JSON.parse(localStorage.getItem("materias")) || [];
migrarMateriasParaMultiMeta(materias);
let anotacoesFlashcards =
  JSON.parse(localStorage.getItem("anotacoesFlashcards")) || [];
let lembretes = JSON.parse(localStorage.getItem("lembretes")) || [];
let totalRevisoesFlashcards =
  parseInt(localStorage.getItem("totalRevisoesFlashcards"), 10) || 0;
let metas = JSON.parse(localStorage.getItem("metas")) || [];

// Analisador de Edital (IA): retirado temporariamente pra manutenção (ver
// changelog). Essa variável fica pronta pro cadastro de cargos manual/
// futuro reaproveitar o mesmo fluxo de "prova" quando a função voltar.
let cargosExtraidosEditalPendentes = null;

let tempoPorMateria = JSON.parse(localStorage.getItem("tempoPorMateria")) || {};
let logsSessoes = JSON.parse(localStorage.getItem("logsSessoes")) || [];

// --- CONQUISTAS FANTASMA (easter eggs) ---
// Flags permanentes pra segredos que não dá pra derivar só olhando os
// dados normais (tipo "abriu o app numa data especial" ou "digitou um
// código secreto") — uma vez marcado true, fica true pra sempre, mesmo
// que a condição (a data de hoje, por exemplo) deixe de valer amanhã.
let easterEggFlags = JSON.parse(localStorage.getItem("easterEggFlags")) || {};
function marcarEasterEgg(chave) {
  if (easterEggFlags[chave]) return; // já marcado, não faz nada
  easterEggFlags[chave] = true;
  localStorage.setItem("easterEggFlags", JSON.stringify(easterEggFlags));
}

// --- MOOD TRACKER (Tier 1: check-in + check-out) ---
// Guarda as respostas do check-in (preenchido antes de começar a focar)
// até a sessão terminar, quando finalmente são anexadas ao registro em
// logsSessoes — não persiste sozinho em localStorage, é só um rascunho
// de trabalho enquanto a sessão está rolando.
let moodCheckinAtual = null;
let checkinHumorSelecionado = null;
let checkinEnergiaSelecionada = null;
let checkinSonoSelecionado = null;

// Mesma lógica pro check-out (preenchido na Auditoria de Foco, ao final).
let checkoutCumpridoSelecionado = null;
let checkoutHumorDepoisSelecionado = null;
let checkoutEstrelasSelecionadas = null;

// Tipo de Sessão (opcional, escolhido ANTES de iniciar o foco): formato do
// material estudado (leitura em PDF, videoaula, audioaula ou questões).
// Diferente de "ra-tipo" no formulário de Registrar Sessão avulsa (que é
// Teoria/Revisão/Questão — fase do estudo, não o formato do material) —
// são dimensões diferentes de propósito. Vai junto no registro da sessão
// em logsSessoes[].tipoSessao (ver salvarProgressoGeral) e alimenta o
// card de análise "Sessões por Tipo" na aba Desempenho.
let tipoSessaoSelecionado = null;

// Controla o lembrete de "esqueceu de marcar o humor" nos modais de
// check-in/check-out: fica false ao abrir o modal e vira true assim que o
// lembrete é mostrado uma vez, pra não bloquear pra sempre quem realmente
// quer confirmar sem marcar humor (é opcional, não obrigatório).
let checkinLembreteHumorMostrado = false;
let checkoutLembreteHumorMostrado = false;

let dadosPerfil = JSON.parse(localStorage.getItem("dadosPerfil")) || {
  nome: "Estudante",
  cargo: "Foco em Aprovação",
  bio: "",
};
let totalOvertimeGeralMinutos =
  parseInt(localStorage.getItem("totalOvertimeGeralMinutos")) || 0;
// Foto de perfil (opcional): guardada já redimensionada e comprimida em
// base64, pra caber tranquilo no localStorage e ser sincronizada com a
// nuvem sem pesar. null = sem foto, usa as iniciais do nome.
let fotoPerfilBase64 = localStorage.getItem("fotoPerfilBase64") || null;
let bancoDistracoes = JSON.parse(localStorage.getItem("bancoDistracoes")) || {
  Celular: 0,
  Filhos: 0,
  Barulho: 0,
  Família: 0,
  Pets: 0,
  Televisão: 0,
};

// Meta de Horas Semanais (recorrente, independente de prova) + Congelamento
// de Sequência (1 "perdão" por semana pra não estudar 1 dia sem quebrar o
// streak). Ambos guardados no localStorage pra persistir entre sessões.
let metaHorasSemanaisAlvo =
  parseInt(localStorage.getItem("metaHorasSemanaisAlvo"), 10) || 10; // horas
let freezesDisponiveis = (() => {
  const salvo = JSON.parse(localStorage.getItem("freezesDisponiveis"));
  return salvo === null || salvo === undefined ? 1 : salvo;
})();
let semanaReferenciaFreeze =
  localStorage.getItem("semanaReferenciaFreeze") || "";
let diasCongeladosStreak =
  JSON.parse(localStorage.getItem("diasCongeladosStreak")) || [];

// Simulado Cronometrado: cronômetro regressivo do tempo total de uma prova,
// em tela cheia. Persistido no localStorage (não só em variável) porque uma
// prova real dura horas — se a pessoa recarregar a página ou fechar o
// navegador sem querer no meio do caminho, o cronômetro precisa continuar
// de onde parou (ou já finalizar sozinho, se o tempo tiver esgotado
// enquanto o app estava fechado).
let simuladoCronIntervalId = null;
let simuladoCronDados =
  JSON.parse(localStorage.getItem("simuladoCronDados")) || null; // { timestampAlvo, nome, metaVinculada, total }

// Prova por Questão: outro modo de cronômetro em tela cheia, mas mede o
// tempo de CADA questão individualmente em vez de um total regressivo. O
// usuário aperta Espaço (ou o botão na tela) sempre que termina uma
// questão: o tempo dela é registrado e o cronômetro reinicia do zero pra
// próxima. Também persistido no localStorage pelo mesmo motivo do
// Simulado Cronometrado acima (sobreviver a um recarregamento no meio da
// prova).
let provaPorQuestaoIntervalId = null;
let provaPorQuestaoDados =
  JSON.parse(localStorage.getItem("provaPorQuestaoDados")) || null; // { nome, metaVinculada, totalEsperado, tempos: [segundos,...], inicioQuestaoAtual }
// Resultado já calculado (tempo total, média, questão mais demorada),
// esperando confirmação no modal de resultado antes de virar registro.
let provaPorQuestaoResultadoPendente = null;
// Depois que o resultado é confirmado, guarda os dados de tempo aqui até
// registrarSimulado() salvar o registro correspondente e anexá-los nele.
let provaPorQuestaoParaRegistrar = null;

// --- VARIÁVEIS GLOBAIS DE EXECUÇÃO ---
let cacheMinutosSessaoAtual = 0;
let cacheMateriaSessaoAtual = "";

// Sessão de Estudo Planejada (Bloco de Estudos): quando ativo, guarda a fila
// de matérias/pomodoros e a pausa escolhida, e o app passa a escolher
// sozinho a próxima matéria e a duração da pausa a cada ciclo — sem exigir
// clique em nenhum seletor entre os pomodoros.
// Formato: { itens: [{materia, total, feitos}], indiceAtual, pausaMinutos }
let planoEstudo = null;
let contadorItensBloco = 0;
let emEstadoDeFocoAtivo = false;
let timer = null;
let tempoRestante = 25 * 60;
let emPausaConfig = false;
let emOvertime = false;
let pausadoManualmente = false;
let timestampPausaManualInicio = null;
let tempoOvertimeAcumulado = 0;
let tempoBaseEscolhidoMinutos = 25;
// Trava contra duplo-clique/duplo-disparo: true enquanto uma sessão está no
// meio do processo de ser encerrada (persistindo no histórico e decidindo o
// que vem a seguir). Sem isso, cliques repetidos em "Finalizar"/"Completar
// Sessão" antes da tela reagir geravam mais de um registro no histórico
// para a mesma sessão. É liberada de volta em resetTimer() e em
// iniciarPausaComDuracao() — os dois pontos em que o fluxo de encerramento
// termina e o controle volta pro usuário.
let processandoFinalizacaoSessao = false;
let timestampAlvo = null; // instante (epoch ms) em que a contagem regressiva zera
let timestampInicioOvertime = null; // instante (epoch ms) em que o overtime começou
let meuGrafico = null;
let graficoQuestoesPorMateria = null;
let graficoMatrizPrioridade = null;
let graficoQuestoesPorTopico = null;
let graficoAvulsasVsSimulados = null;
let graficoRadarCompetencias = null;
let registrosQuestoesFiltroAtual = [];
let audioCtx = null;

// Timer de Preparação: conta antes do foco começar de verdade (tanto no
// pomodoro comum quanto no primeiro pomodoro de uma Sessão Planejada), para
// dar um tempo de transição antes de mergulhar no estudo. Não conta como
// tempo de foco e pode ser pulado ou cancelado a qualquer momento.
let tempoPreparoMinutos =
  parseInt(localStorage.getItem("tempoPreparoMinutos"), 10) || 0;
let emPreparacao = false;
let timerPreparo = null;
let timestampAlvoPreparo = null;
let acaoAposPreparo = null;
let alarmePendente = false; // true quando o timer zerou e o alarme ainda não foi reproduzido com sucesso

// Variáveis Heatmap & Calendário
let modoAtual = "github";
let mesesParaExibir = 1;
// --- Evita repetição consecutiva de frases e dicas ---
let ultimoIndiceFrase = -1;
let ultimoIndiceDica = -1;

// Ordenada em sequência de arco-íris (vermelhos → laranjas → amarelos →
// verdes → turquesas/ciano → azuis → índigos/roxos → rosas → neutros) pra
// ficar visualmente organizada na grade de seleção — nenhum hex existente
// foi alterado ou removido (só reordenado), então matérias já cadastradas
// com uma dessas cores continuam funcionando normalmente. As 8 marcadas
// como "novo" foram adicionadas pra cobrir lacunas que deixavam cores
// vizinhas parecidas demais, dando fôlego pra quem cadastra muitas
// matérias/tópicos/subtópicos e precisa de cores bem distintas entre si.
const paletaCores = [
  // Vermelhos
  { nome: "🔴 Vermelho", hex: "#ef4444", familia: "vermelhos" },
  { nome: "🍷 Vinho", hex: "#be123c", familia: "vermelhos" },
  { nome: "🌅 Salmão", hex: "#fb7185", familia: "vermelhos" },
  // Laranjas
  { nome: "🔥 Ferrugem", hex: "#c2410c", familia: "laranjas" },
  { nome: "🍑 Pêssego", hex: "#fdba74", familia: "laranjas" }, // novo
  { nome: "🟠 Laranja", hex: "#f97316", familia: "laranjas" },
  { nome: "🟤 Marrom", hex: "#92400e", familia: "laranjas" },
  { nome: "🍫 Chocolate", hex: "#78350f", familia: "laranjas" },
  // Amarelos
  { nome: "🌻 Girassol", hex: "#eab308", familia: "amarelos" },
  { nome: "🍯 Amarelo", hex: "#f59e0b", familia: "amarelos" },
  { nome: "🌾 Trigo", hex: "#ca8a04", familia: "amarelos" }, // novo
  // Verdes
  { nome: "🥝 Kiwi", hex: "#a3e635", familia: "verdes" },
  { nome: "🍏 Lima", hex: "#84cc16", familia: "verdes" },
  { nome: "🌿 Musgo", hex: "#4d7c0f", familia: "verdes" },
  { nome: "🌲 Floresta", hex: "#15803d", familia: "verdes" }, // novo
  { nome: "🟢 Verde", hex: "#10b981", familia: "verdes" },
  { nome: "🍈 Menta", hex: "#34d399", familia: "verdes" },
  // Turquesas / Ciano
  { nome: "🌊 Turquesa", hex: "#14b8a6", familia: "turquesas" },
  { nome: "🦚 Petróleo", hex: "#0e7490", familia: "turquesas" },
  { nome: "🐳 Ciano", hex: "#06b6d4", familia: "turquesas" },
  // Azuis
  { nome: "❄️ Gelo", hex: "#7dd3fc", familia: "azuis" }, // novo
  { nome: "🌤️ Azul Céu", hex: "#0ea5e9", familia: "azuis" },
  { nome: "🔵 Azul", hex: "#3b82f6", familia: "azuis" },
  { nome: "⚓ Marinho", hex: "#1e40af", familia: "azuis" },
  // Índigos / Roxos
  { nome: "🟣 Índigo", hex: "#6366f1", familia: "roxos" },
  { nome: "🌌 Anil", hex: "#4338ca", familia: "roxos" },
  { nome: "🌙 Meia-Noite", hex: "#1e1b4b", familia: "roxos" }, // novo
  { nome: "🔮 Roxo", hex: "#8b5cf6", familia: "roxos" },
  { nome: "🍇 Uva", hex: "#7c3aed", familia: "roxos" },
  { nome: "🍬 Lilás", hex: "#c084fc", familia: "roxos" },
  { nome: "🎆 Fúcsia", hex: "#d946ef", familia: "roxos" }, // novo
  // Rosas
  { nome: "🌸 Rosa", hex: "#ec4899", familia: "rosas" },
  // Neutros
  { nome: "🏖️ Areia", hex: "#a8a29e", familia: "neutros" }, // novo
  { nome: "⚪ Cinza", hex: "#64748b", familia: "neutros" },
  { nome: "🩶 Grafite", hex: "#334155", familia: "neutros" },
  { nome: "⬛ Ardósia", hex: "#1e293b", familia: "neutros" }, // novo
];

// --- COR AUTOMÁTICA DE MATÉRIA ---
// Toda matéria nova ganha uma cor sozinha, sem precisar escolher numa
// lista. A ideia: manter saturação e luminosidade FIXAS (é isso que faz
// as cores parecerem "de uma mesma família", harmônicas entre si — igual
// a paletas de design system) e variar só o matiz (hue), escolhendo
// sempre o matiz mais distante de todas as cores já em uso no momento
// (estratégia "maximin": entre vários candidatos espalhados na roda de
// cores, pega o que maximiza a menor distância até qualquer cor
// existente). Isso funciona tanto pra quem já tem 2 matérias quanto pra
// quem já tem 30 — a cor nova sempre tenta abrir o maior espaço livre
// disponível na roda, em vez de repetir ou quase-repetir uma cor vizinha.
const COR_AUTO_SATURACAO = 68; // %
const COR_AUTO_LUMINOSIDADE = 56; // % — claro o bastante pra aparecer bem no tema escuro
const COR_AUTO_NUM_CANDIDATOS = 24; // passos de 15° ao redor da roda de cores

function hexParaHsl(hex) {
  const limpo = (hex || "").replace("#", "");
  if (limpo.length !== 6) return null;
  const r = parseInt(limpo.slice(0, 2), 16) / 255;
  const g = parseInt(limpo.slice(2, 4), 16) / 255;
  const b = parseInt(limpo.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslParaHex(h, s, l) {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n) =>
    lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const paraHex = (n) =>
    Math.round(f(n) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${paraHex(0)}${paraHex(8)}${paraHex(4)}`;
}

// Distância circular entre dois matizes (0-360°), sempre pelo caminho
// mais curto na roda de cores (ex: 350° e 10° estão a 20° de distância,
// não 340°).
function distanciaCircular(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Gera uma cor nova, harmônica com o resto (mesma saturação/luminosidade
// da paleta automática) e o mais distinta possível de todas as cores já
// em uso. `nomeParaIgnorar` deixa de fora a própria matéria sendo editada,
// pra "sugerir outra cor" não ficar competindo com a cor atual dela.
function gerarCorAutomaticaMateria(nomeParaIgnorar) {
  const coresEmUso = materias
    .filter((m) => m.nome !== nomeParaIgnorar)
    .map((m) => hexParaHsl(m.cor))
    .filter(Boolean);

  let melhorHue = 0;
  let melhorDistancia = -1;
  for (let i = 0; i < COR_AUTO_NUM_CANDIDATOS; i++) {
    const hue = (i * (360 / COR_AUTO_NUM_CANDIDATOS)) % 360;
    const distanciaMinima =
      coresEmUso.length === 0
        ? 999
        : Math.min(...coresEmUso.map((c) => distanciaCircular(hue, c.h)));
    if (distanciaMinima > melhorDistancia) {
      melhorDistancia = distanciaMinima;
      melhorHue = hue;
    }
  }
  return hslParaHex(melhorHue, COR_AUTO_SATURACAO, COR_AUTO_LUMINOSIDADE);
}

// --- FRASES MOTIVACIONAIS E PROVÉRBIOS (exibidas no modo foco) ---
const FRASES_MOTIVACIONAIS = [
  {
    texto: "A jornada de mil quilômetros começa com um único passo.",
    autor: "Provérbio chinês",
  },
  {
    texto: "O bambu que se curva é mais forte que o carvalho que resiste.",
    autor: "Provérbio japonês",
  },
  {
    texto:
      "Não é o quanto você faz, mas o quanto de amor você coloca no que faz.",
    autor: "Madre Teresa de Calcutá",
  },
  {
    texto: "Quem se levanta a cada queda, no fim, nunca é vencido.",
    autor: "Provérbio japonês",
  },
  {
    texto:
      "Não é o mais forte que sobrevive, e sim o que melhor se adapta às mudanças.",
    autor: "Ideia atribuída a Charles Darwin",
  },
  {
    texto: "A queda não é fracasso. Fracasso é ficar onde caiu.",
    autor: "Provérbio chinês",
  },
  {
    texto:
      "O que fazemos repetidamente é quem nós somos. A excelência não é um ato, é um hábito.",
    autor: "Aristóteles",
  },
  {
    texto: "Não tenhas medo de ir devagar, tenha medo apenas de ficar parado.",
    autor: "Provérbio chinês",
  },
  {
    texto:
      "Quem quer chegar longe cuida das suas forças; quem quer chegar rápido corre e se cansa antes da metade.",
    autor: "Provérbio oriental",
  },
  { texto: "A persistência é o caminho do êxito.", autor: "Charles Chaplin" },
  {
    texto:
      "Um vaso só se torna útil pelo espaço vazio que carrega dentro; o valor está no que ainda cabe aprender.",
    autor: "Ideia de Lao-Tsé",
  },
  {
    texto:
      "O sábio não é quem sabe muitas coisas, mas quem persiste em aprender.",
    autor: "Provérbio oriental",
  },
  {
    texto: "Antes de vencer os outros, é preciso vencer a si mesmo.",
    autor: "Provérbio japonês",
  },
  {
    texto:
      "A gota de água perfura a pedra não pela força, mas pela constância.",
    autor: "Provérbio chinês",
  },
  {
    texto:
      "Você não precisa ser grandioso para começar, mas precisa começar para ser grandioso.",
    autor: "Zig Ziglar",
  },
  {
    texto:
      "O único lugar onde o sucesso vem antes do trabalho é no dicionário.",
    autor: "Provérbio popular",
  },
  {
    texto:
      "Ainda que ande devagar, quem caminha todos os dias chega mais longe do que quem corre e para.",
    autor: "Provérbio oriental",
  },
  {
    texto: "A disciplina é a ponte entre metas e realizações.",
    autor: "Jim Rohn",
  },
  {
    texto: "Cada estudo de hoje é um tijolo na casa do seu futuro.",
    autor: "Provérbio popular",
  },
  {
    texto: "Um homem que move montanhas começa carregando pequenas pedras.",
    autor: "Provérbio chinês",
  },
];

// --- DICAS DE DESCANSO E SAÚDE (exibidas durante a pausa) ---
const DICAS_DESCANSO_SAUDE = [
  "💧 Beba um copo d'água agora — mesmo a desidratação leve já reduz sua concentração e sua memória de curto prazo.",
  "🧍 Levante e alongue o corpo por 1 minuto. Ficar sentado por muito tempo sobrecarrega a coluna e a circulação.",
  "👀 Olhe pra algo distante por 20 segundos. A tela de perto por tempo demais cansa a vista e causa dor de cabeça.",
  "🌬️ Respire fundo 5 vezes, bem devagar. Isso ajuda a reduzir o estresse acumulado da sessão de foco.",
  "🚶 Se der, caminhe um pouco. Movimento leve ajuda o cérebro a consolidar o que você acabou de estudar.",
  "😴 Presta atenção em quanto você dormiu essa noite — estudar cansado rende muito menos do que estudar descansado.",
  "🍎 Prefira um lanche leve (fruta, castanhas, iogurte) a algo muito açucarado — evita o pico de energia seguido de queda.",
  "☕ Cuidado com café e energéticos: o limite seguro geral é de até ~400mg de cafeína por dia (mais ou menos 4 xícaras de café). Passar disso pode causar ansiedade, insônia e taquicardia — se já tomou bastante hoje, prefira água ou um chá leve agora.",
  "🌙 Energéticos combinados com pouco sono viram um ciclo ruim: eles mascaram o cansaço em vez de resolver ele, e cobram a conta depois. Descanso de verdade rende mais que estimulante.",
  "🧠 Sua mente também descansa: evite encher a pausa com outra tela cheia de estímulo (redes sociais, notícias). Um intervalo de verdade ajuda o cérebro a guardar o que foi estudado.",
  "🪟 Se puder, dê uma olhada pra fora, pegue um pouco de luz natural. Isso ajuda a regular o sono e o humor.",
  "🤲 Solte os ombros, relaxe o maxilar e as mãos. Tensão muscular acumulada de horas de estudo passa despercebida até doer.",
  "🍵 Se quiser algo quente, um chá sem cafeína é uma alternativa mais leve que outro café — seu corpo agradece.",
  "📵 Evite decisões importantes ou mensagens estressantes durante a pausa. O objetivo aqui é recarregar, não abrir outra fonte de cansaço mental.",
];

// --- TEMA (CLARO / ESCURO) ---
// O tema já é aplicado de forma síncrona no <head> do index.html (antes do
// CSS pintar a tela) pra não piscar o tema errado. Aqui só sincronizamos o
// texto do botão com o estado atual assim que o DOM carrega.
function obterTemaAtual() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function atualizarBotaoTema() {
  const btn = document.getElementById("btn-alternar-tema");
  if (!btn) return;
  const tema = obterTemaAtual();
  btn.innerText = tema === "light" ? "☀️ Claro" : "🌙 Escuro";
}

function alternarTema() {
  const novoTema = obterTemaAtual() === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", novoTema);
  localStorage.setItem("temaApp", novoTema);
  atualizarBotaoTema();

  // Easter egg: primeira vez no tema claro. renderizarTodoOPainel() logo
  // abaixo já chama renderizarGamificacao(), então não precisa de mais
  // nada aqui pra desbloquear/mostrar o toast.
  if (novoTema === "light") marcarEasterEgg("temaClaro");

  // Os gráficos (Chart.js) leem as cores direto das variáveis CSS no
  // momento em que são desenhados, então precisam ser recriados para
  // refletir o novo tema — renderizarTodoOPainel() já faz isso, além de
  // manter todo o resto do painel em sincronia.
  if (typeof renderizarTodoOPainel === "function") {
    try {
      renderizarTodoOPainel();
    } catch (err) {
      console.error("Erro ao re-renderizar painel após trocar tema:", err);
    }
  }
}

document.addEventListener("DOMContentLoaded", atualizarBotaoTema);

function selecionarItemAleatorio(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}
function selecionarItemAleatorioComEvitacao(lista, ultimoIndice) {
  if (!lista || lista.length === 0) return null;
  if (lista.length === 1) return { item: lista[0], indice: 0 };
  let idx;
  let tentativas = 0;
  const maxTentativas = 50;
  do {
    idx = Math.floor(Math.random() * lista.length);
    tentativas++;
  } while (idx === ultimoIndice && tentativas < maxTentativas);
  if (idx === ultimoIndice && lista.length > 1) {
    idx = (ultimoIndice + 1) % lista.length;
  }
  return { item: lista[idx], indice: idx };
}
function exibirFraseMotivacional() {
  const container = document.getElementById("frase-do-dia");
  if (!container) return;
  const resultado = selecionarItemAleatorioComEvitacao(
    FRASES_MOTIVACIONAIS,
    ultimoIndiceFrase,
  );
  if (!resultado) return;
  ultimoIndiceFrase = resultado.indice;
  const frase = resultado.item;
  container.className = "frase-foco-container tema-motivacional";
  container.innerHTML = `
    <p class="frase-texto">"${escapeHtml(frase.texto)}"</p>
    <span class="frase-autor">— ${escapeHtml(frase.autor)}</span>
  `;
}

// Mostra uma orientação de descanso/saúde aleatória no início da pausa.
function exibirDicaDescanso() {
  const container = document.getElementById("frase-do-dia");
  if (!container) return;
  const resultado = selecionarItemAleatorioComEvitacao(
    DICAS_DESCANSO_SAUDE,
    ultimoIndiceDica,
  );
  if (!resultado) return;
  ultimoIndiceDica = resultado.indice;
  const dica = resultado.item;
  container.className = "frase-foco-container tema-saude";
  container.innerHTML = `<p class="frase-texto">${dica}</p>`;
}

// --- NAVEGAÇÃO ---
function navegarPara(pagina) {
  document.getElementById("pagina-painel").style.display =
    pagina === "painel" ? "block" : "none";
  document.getElementById("pagina-estudos").style.display =
    pagina === "estudos" ? "block" : "none";
  document.getElementById("pagina-modoprova").style.display =
    pagina === "modoprova" ? "block" : "none";
  document.getElementById("pagina-perfil").style.display =
    pagina === "perfil" ? "block" : "none";
  document
    .getElementById("nav-painel")
    .classList.toggle("active", pagina === "painel");
  document
    .getElementById("nav-estudos")
    .classList.toggle("active", pagina === "estudos");
  document
    .getElementById("nav-modoprova")
    .classList.toggle("active", pagina === "modoprova");
  document
    .getElementById("nav-perfil")
    .classList.toggle("active", pagina === "perfil");
  if (pagina === "painel" || pagina === "estudos") {
    renderizarTodoOPainel();
  } else if (pagina === "modoprova") {
    renderizarSeletorMateriaModoProva();
    renderizarInsightTempoPorQuestao();
  } else {
    calcularEMostrarEstatisticas();
    carregarDadosPerfil();
    renderizarAnaliseEstudos();
    renderizarGamificacao();
  }
}

// --- SUB-ABAS DA PÁGINA ESTUDOS (Cadastro / Hoje & Registros / Análises) ---
// Puramente visual: só troca qual grupo de cards aparece. Nenhum dado ou
// função muda de comportamento, é a mesma coisa de antes, só organizada.
function mostrarSubAbaEstudos(subaba) {
  const grupos = {
    cadastro: "estudos-sub-cadastro",
    registros: "estudos-sub-registros",
    desempenho: "estudos-sub-desempenho",
    analises: "estudos-sub-analises",
    retafinal: "estudos-sub-retafinal",
    diario: "estudos-sub-diario",
    flashcards: "estudos-sub-flashcards",
  };

  Object.entries(grupos).forEach(([chave, idGrupo]) => {
    const painel = document.getElementById(idGrupo);
    const botao = document.getElementById(`${idGrupo}-btn`);
    if (painel) {
      // "Hoje & Registros" tem agrupamento fixo em 2 colunas (ver
      // .registros-linha-colunas/.registros-col no style.css), por isso
      // usa flex-column pra empilhar essa linha + o card largo de
      // Questões Resolvidas; os demais painéis continuam em grid normal.
      const exibir = idGrupo === "estudos-sub-registros" ? "flex" : "grid";
      painel.style.display = chave === subaba ? exibir : "none";
    }
    if (botao) botao.classList.toggle("active", chave === subaba);
  });

  // No modo expandido, os cards de gráfico dessa subaba estavam escondidos
  // até agora — sem isso os gráficos apareciam pequenos/espremidos na
  // primeira vez que a aba é aberta (ver redimensionarGraficosVisiveis).
  redimensionarGraficosVisiveis();

  if (subaba === "flashcards") {
    popularMateriasFlashcard();
    renderizarListaFlashcards();
    renderizarListaLembretes();
  }
}

// --- ÁUDIO (ALARME) ---
function iniciarAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function ticarSom(tipo) {
  iniciarAudioContext();
  if (!audioCtx) return;

  function dispararNota(
    freq,
    inicio,
    duracao,
    oscType = "sine",
    volume = 0.15,
  ) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + inicio);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime + inicio);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + inicio + duracao,
    );
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + inicio);
    osc.stop(audioCtx.currentTime + inicio + duracao);
  }

  if (tipo === "sino") {
    for (let r = 0; r < 3; r++) {
      let atrasoLoop = r * 1.2;
      dispararNota(880, atrasoLoop + 0.0, 1.0, "sine", 0.15);
      dispararNota(1320, atrasoLoop + 0.05, 1.0, "sine", 0.12);
    }
  } else if (tipo === "harpa") {
    const notasHarpa = [523.25, 659.25, 783.99, 1046.5];
    for (let r = 0; r < 3; r++) {
      let atrasoLoop = r * 1.5;
      notasHarpa.forEach((freq, i) => {
        dispararNota(freq, atrasoLoop + i * 0.08, 1.0, "triangle", 0.12);
      });
    }
  } else if (tipo === "gong") {
    for (let r = 0; r < 2; r++) {
      let atrasoLoop = r * 2.5;
      dispararNota(220, atrasoLoop, 2.2, "sine", 0.22);
      dispararNota(440, atrasoLoop, 1.6, "sine", 0.06);
    }
  }
}

function testarSomAtual() {
  const somEscolhido = document.getElementById("pomo-som").value;
  ticarSom(somEscolhido);
}

// --- SONS AMBIENTE (mixer de sons para foco) ---
// Todos os ruídos (chuva, escritório, biblioteca, ruído branco/rosa/marrom)
// são sintetizados na hora pelo Web Audio API — não dependem de internet nem
// de arquivos de áudio, e continuam tocando mesmo com o modal fechado.
//
// Chuva/Escritório/Biblioteca não são só "ruído rosa com um filtro": um
// filtro estático sozinho vira só um chiado uniforme, sem a textura do
// ambiente real. Por isso cada um também pode ter uma "modulacao" (uma ou
// mais LFOs de frequência bem baixa somadas, que fazem o volume variar
// devagar e de forma meio imprevisível — como rajadas de chuva ou o
// compressor do ar-condicionado ciclando) e/ou um "hum" (um tom grave puro
// somado por baixo, como o zumbido elétrico de um ambiente de escritório).
const SONS_AMBIENTE_CONFIG = {
  // Chuva de verdade tem um "corpo" de chiado de banda larga (não só agudo)
  // e a intensidade varia em rajadas — nunca é um som perfeitamente
  // constante. Passa-baixas suave em 5kHz mantém o chiado cheio (em vez de
  // isolar só o agudo fino de antes) e a modulação de duas LFOs fora de
  // fase simula essas rajadas de vento/chuva sem virar um "tremolo" robótico
  // e previsível de uma LFO só.
  chuva: {
    label: "🌧️ Chuva",
    cor: "rosa",
    filtro: { tipo: "lowpass", freq: 5000, Q: 0.4 },
    modulacao: {
      base: 0.72,
      profundidade: 0.28,
      lfos: [{ freq: 0.07 }, { freq: 0.13 }],
    },
  },
  // Escritório real é o zumbido baixo do ar-condicionado (que cicla ligando
  // e desligando de forma bem lenta e regular — daí uma única LFO bem
  // devagar) somado a um murmúrio de médio-agudo (mantido com um corte de
  // filtro menos agressivo que antes) e um zumbido elétrico grave e quase
  // imperceptível ao fundo (o "hum", um tom puro de 57Hz bem baixinho).
  escritorio: {
    label: "🏢 Escritório",
    cor: "rosa",
    filtro: { tipo: "lowpass", freq: 2200, Q: 0.5 },
    modulacao: { base: 0.82, profundidade: 0.18, lfos: [{ freq: 0.035 }] },
    hum: { freq: 57, volume: 0.05 },
  },
  // Biblioteca é o ambiente mais silencioso dos três na vida real: quase
  // silêncio total, com um chiado bem suave e abafado ao fundo — sem
  // variação nenhuma (por isso, sem "modulacao"). Corte de frequência bem
  // mais baixo que os outros dois e volume máximo bem reduzido, pra ficar
  // sutil mesmo no volume máximo do controle.
  biblioteca: {
    label: "📚 Biblioteca",
    cor: "rosa",
    filtro: { tipo: "lowpass", freq: 350, Q: 0.3 },
    volumeMax: 0.22,
  },
  branco: { label: "⚪ Ruído Branco", cor: "branco" },
  rosa: { label: "🌸 Ruído Rosa", cor: "rosa" },
  marrom: { label: "🟤 Ruído Marrom", cor: "marrom" },
};

let sonsAmbienteNodes = {}; // { chave: { source, gain, filtro, extras } }
let sonsAmbienteVolumes =
  JSON.parse(localStorage.getItem("sonsAmbienteVolumes")) || {};

// Gera um buffer de ruído de 2s (tocado em loop) na cor pedida. "Branco" é
// aleatório puro; "rosa" usa a aproximação clássica de Paul Kellet a partir
// de ruído branco; "marrom" integra o ruído branco (passeio aleatório),
// resultando num som mais grave e "encorpado".
function criarBufferRuido(cor) {
  const duracao = 2;
  const sampleRate = audioCtx.sampleRate;
  const tamanho = sampleRate * duracao;
  const buffer = audioCtx.createBuffer(1, tamanho, sampleRate);
  const dados = buffer.getChannelData(0);

  if (cor === "branco") {
    for (let i = 0; i < tamanho; i++) dados[i] = Math.random() * 2 - 1;
  } else if (cor === "rosa") {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < tamanho; i++) {
      const branco = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + branco * 0.0555179;
      b1 = 0.99332 * b1 + branco * 0.0750759;
      b2 = 0.969 * b2 + branco * 0.153852;
      b3 = 0.8665 * b3 + branco * 0.3104856;
      b4 = 0.55 * b4 + branco * 0.5329522;
      b5 = -0.7616 * b5 - branco * 0.016898;
      const rosa = b0 + b1 + b2 + b3 + b4 + b5 + b6 + branco * 0.5362;
      b6 = branco * 0.115926;
      dados[i] = rosa * 0.11;
    }
  } else if (cor === "marrom") {
    let ultimo = 0;
    for (let i = 0; i < tamanho; i++) {
      const branco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * branco) / 1.02;
      dados[i] = ultimo * 3.5;
    }
  }
  return buffer;
}

// Monta o estágio de "modulação de amplitude" de um som ambiente: um
// GainNode cujo volume-base é cfgMod.base, com uma ou mais LFOs (osciladores
// bem lentos, na faixa de 0.03 a 0.15Hz — abaixo do que o ouvido percebe
// como "tremolo" e mais perto de uma variação orgânica e lenta) somadas em
// cima pra variar esse volume ao longo do tempo. Duas LFOs em frequências
// não-relacionadas (ex: 0.07Hz e 0.13Hz) batendo fora de fase uma da outra
// já produz um padrão bem mais imprevisível do que uma LFO só — sem precisar
// de AudioWorklet ou de gerar ruído de baixa frequência à parte.
function criarModuladorAmplitude(cfgMod) {
  const moduladorGain = audioCtx.createGain();
  moduladorGain.gain.value = cfgMod.base;

  const extras = [moduladorGain];
  const profundidadePorLfo = cfgMod.profundidade / cfgMod.lfos.length;

  cfgMod.lfos.forEach((lfoCfg) => {
    const lfo = audioCtx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = lfoCfg.freq;

    // Escala a saída da LFO (que varia de -1 a +1) pra profundidade
    // desejada antes de somar no ganho — sem isso a modulação seria forte
    // demais (o volume chegaria a zero ou dobraria).
    const escala = audioCtx.createGain();
    escala.gain.value = profundidadePorLfo;

    lfo.connect(escala);
    escala.connect(moduladorGain.gain);
    lfo.start();

    extras.push(lfo, escala);
  });

  return { moduladorGain, extras };
}

function alternarSomAmbiente(chave) {
  iniciarAudioContext();
  if (sonsAmbienteNodes[chave]) {
    pararSomAmbiente(chave);
  } else {
    iniciarSomAmbiente(chave);
  }
  atualizarBotaoSomAmbiente(chave);
}

function iniciarSomAmbiente(chave) {
  const cfg = SONS_AMBIENTE_CONFIG[chave];
  if (!cfg || !audioCtx) return;

  const source = audioCtx.createBufferSource();
  source.buffer = criarBufferRuido(cfg.cor);
  source.loop = true;

  const gain = audioCtx.createGain();
  const volumeSalvo = sonsAmbienteVolumes[chave];
  const volumeInicial = volumeSalvo !== undefined ? volumeSalvo : 0.4;
  gain.gain.value = volumeInicial * (cfg.volumeMax || 1);

  let filtro = null;
  let ultimoNode = source;
  if (cfg.filtro) {
    filtro = audioCtx.createBiquadFilter();
    filtro.type = cfg.filtro.tipo;
    filtro.frequency.value = cfg.filtro.freq;
    filtro.Q.value = cfg.filtro.Q || 1;
    ultimoNode.connect(filtro);
    ultimoNode = filtro;
  }

  // Nós extras (LFOs de modulação, oscilador de hum) que precisam ser
  // parados e desconectados junto quando o som for desligado — sem isso
  // ficariam tocando pra sempre "invisíveis", vazando memória/CPU.
  let extras = [];

  if (cfg.modulacao) {
    const { moduladorGain, extras: extrasModulacao } = criarModuladorAmplitude(
      cfg.modulacao,
    );
    ultimoNode.connect(moduladorGain);
    ultimoNode = moduladorGain;
    extras = extras.concat(extrasModulacao);
  }

  ultimoNode.connect(gain);

  if (cfg.hum) {
    const humOsc = audioCtx.createOscillator();
    humOsc.type = "sine";
    humOsc.frequency.value = cfg.hum.freq;
    const humGain = audioCtx.createGain();
    humGain.gain.value = cfg.hum.volume;
    humOsc.connect(humGain);
    humGain.connect(gain);
    humOsc.start();
    extras.push(humOsc, humGain);
  }

  gain.connect(audioCtx.destination);
  source.start();

  sonsAmbienteNodes[chave] = { source, gain, filtro, extras };
}

function pararSomAmbiente(chave) {
  const nodes = sonsAmbienteNodes[chave];
  if (!nodes) return;
  try {
    nodes.source.stop();
  } catch (err) {
    /* já parado, ignora */
  }
  nodes.source.disconnect();
  nodes.gain.disconnect();
  if (nodes.filtro) nodes.filtro.disconnect();
  (nodes.extras || []).forEach((node) => {
    try {
      if (typeof node.stop === "function") node.stop();
    } catch (err) {
      /* já parado, ignora */
    }
    try {
      node.disconnect();
    } catch (err) {
      /* já desconectado, ignora */
    }
  });
  delete sonsAmbienteNodes[chave];
}

function ajustarVolumeSomAmbiente(chave, valor) {
  const volume = parseInt(valor, 10) / 100;
  sonsAmbienteVolumes[chave] = volume;
  localStorage.setItem(
    "sonsAmbienteVolumes",
    JSON.stringify(sonsAmbienteVolumes),
  );
  const cfg = SONS_AMBIENTE_CONFIG[chave];
  if (sonsAmbienteNodes[chave]) {
    sonsAmbienteNodes[chave].gain.gain.value = volume * (cfg.volumeMax || 1);
  }
}

function atualizarBotaoSomAmbiente(chave) {
  const btn = document.getElementById(`btn-som-${chave}`);
  if (btn) btn.classList.toggle("som-ativo", !!sonsAmbienteNodes[chave]);
}

// Monta a grade de botões+volume a partir de SONS_AMBIENTE_CONFIG (evita
// repetir a mesma marcação 6 vezes no index.html).
function renderizarGradeSonsAmbiente() {
  const grade = document.getElementById("grade-sons-ambiente");
  if (!grade) return;
  grade.innerHTML = "";
  Object.keys(SONS_AMBIENTE_CONFIG).forEach((chave) => {
    const cfg = SONS_AMBIENTE_CONFIG[chave];
    const volumeSalvo =
      sonsAmbienteVolumes[chave] !== undefined
        ? Math.round(sonsAmbienteVolumes[chave] * 100)
        : 40;
    const item = document.createElement("div");
    item.className = "item-som-ambiente";
    item.innerHTML = `
      <button type="button" id="btn-som-${chave}" class="btn-som-ambiente" onclick="alternarSomAmbiente('${chave}')">${cfg.label}</button>
      <input type="range" min="0" max="100" value="${volumeSalvo}" oninput="ajustarVolumeSomAmbiente('${chave}', this.value)" title="Volume" />
    `;
    grade.appendChild(item);
  });
}

// --- SONS NEURAIS (BATIDAS BINAURAIS) ---
// Toca uma frequência levemente diferente em cada ouvido (ex: 200Hz na
// esquerda, 218Hz na direita = "batida" de 18Hz). O cérebro percebe essa
// diferença como uma pulsação, associada a diferentes estados de atenção.
// Só faz sentido com fones de ouvido — sem eles os dois canais se misturam
// no ar e o efeito se perde.
const PRESETS_BINAURAL = {
  relaxado: { label: "🌊 Alerta Relaxado (Alpha 10Hz)", batida: 10 },
  foco: { label: "🎯 Foco (Beta 18Hz)", batida: 18 },
  concentracao: { label: "🧠 Concentração Profunda (Gamma 40Hz)", batida: 40 },
};
let presetBinauralAtual = localStorage.getItem("presetBinauralAtual") || "foco";
let binauralNodes = null; // { oscEsq, oscDir, merger, gain }

function alternarSomNeural() {
  iniciarAudioContext();
  if (binauralNodes) {
    pararSomNeural();
  } else {
    iniciarSomNeural();
  }
  atualizarBotaoSomNeural();
}

function iniciarSomNeural() {
  if (!audioCtx) return;
  const preset = PRESETS_BINAURAL[presetBinauralAtual];
  const freqBase = 200;

  const oscEsq = audioCtx.createOscillator();
  oscEsq.type = "sine";
  oscEsq.frequency.value = freqBase;

  const oscDir = audioCtx.createOscillator();
  oscDir.type = "sine";
  oscDir.frequency.value = freqBase + preset.batida;

  const merger = audioCtx.createChannelMerger(2);
  const gain = audioCtx.createGain();
  const volumeInput = document.getElementById("volume-som-neural");
  const volumeSalvo = volumeInput ? parseInt(volumeInput.value, 10) : 30;
  gain.gain.value = (volumeSalvo / 100) * 0.25; // teto baixo: tom contínuo cansa o ouvido em volume alto

  oscEsq.connect(merger, 0, 0);
  oscDir.connect(merger, 0, 1);
  merger.connect(gain);
  gain.connect(audioCtx.destination);

  oscEsq.start();
  oscDir.start();

  binauralNodes = { oscEsq, oscDir, merger, gain };
}

function pararSomNeural() {
  if (!binauralNodes) return;
  try {
    binauralNodes.oscEsq.stop();
    binauralNodes.oscDir.stop();
  } catch (err) {
    /* já parado, ignora */
  }
  binauralNodes.oscEsq.disconnect();
  binauralNodes.oscDir.disconnect();
  binauralNodes.merger.disconnect();
  binauralNodes.gain.disconnect();
  binauralNodes = null;
}

function ajustarVolumeSomNeural(valor) {
  localStorage.setItem("volumeSomNeural", valor);
  if (binauralNodes) {
    binauralNodes.gain.gain.value = (parseInt(valor, 10) / 100) * 0.25;
  }
}

// Trocar o preset reinicia o som (se estiver tocando) já na nova frequência.
function trocarPresetBinaural(preset) {
  presetBinauralAtual = preset;
  localStorage.setItem("presetBinauralAtual", preset);
  document.querySelectorAll(".aba-binaural").forEach((btn) => {
    btn.classList.toggle("aba-ativa", btn.dataset.preset === preset);
  });
  if (binauralNodes) {
    pararSomNeural();
    iniciarSomNeural();
  }
}

function atualizarBotaoSomNeural() {
  const btn = document.getElementById("btn-som-neural");
  if (btn) btn.classList.toggle("som-ativo", !!binauralNodes);
}

// --- RÁDIO LOFI / JAZZ / INSTRUMENTAL (streaming via YouTube) ---
// Música de verdade (lofi, jazz, remixes de jogos etc.) não dá pra
// sintetizar nem embutir como arquivo — em vez disso, incorpora o player
// oficial do YouTube via iframe. Isso não grava nem redistribui o áudio, só
// reproduz o stream público de quem publicou o vídeo/live.
function extrairIdYoutube(url) {
  if (!url) return null;
  const padroes = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const regex of padroes) {
    const match = url.match(regex);
    if (match) return match[1];
  }
  return null;
}

function tocarRadioLofi(videoId) {
  const container = document.getElementById("lofi-player-container");
  if (!container) return;
  container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="Player de música" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  container.style.display = "block";
}

async function tocarRadioLofiPorUrl() {
  const campo = document.getElementById("lofi-url-custom");
  if (!campo) return;
  const id = extrairIdYoutube(campo.value.trim());
  if (!id) {
    await mostrarAlerta(
      "Não consegui identificar um vídeo do YouTube nesse link. Cole a URL completa (ex: https://www.youtube.com/watch?v=...).",
    );
    return;
  }
  tocarRadioLofi(id);
}

function fecharRadioLofi() {
  const container = document.getElementById("lofi-player-container");
  if (!container) return;
  container.innerHTML = "";
  container.style.display = "none";
}

function abrirModalSonsAmbiente() {
  renderizarGradeSonsAmbiente();
  const volumeInput = document.getElementById("volume-som-neural");
  if (volumeInput) {
    const volumeSalvo = parseInt(localStorage.getItem("volumeSomNeural"), 10);
    volumeInput.value = isNaN(volumeSalvo) ? 30 : volumeSalvo;
  }
  document.querySelectorAll(".aba-binaural").forEach((btn) => {
    btn.classList.toggle(
      "aba-ativa",
      btn.dataset.preset === presetBinauralAtual,
    );
  });
  atualizarBotaoSomNeural();
  Object.keys(SONS_AMBIENTE_CONFIG).forEach(atualizarBotaoSomAmbiente);
  document.getElementById("modal-sons-ambiente").style.display = "flex";
}

// Fechar o modal NÃO para os sons — a ideia é eles continuarem tocando de
// fundo enquanto o usuário estuda, sem precisar deixar o modal aberto.
function fecharModalSonsAmbiente() {
  document.getElementById("modal-sons-ambiente").style.display = "none";
}

// --- SESSÃO DE ESTUDO PLANEJADA (BLOCO DE ESTUDOS) ---

// O peso (1 a 5 estrelas) definido no cadastro da matéria vira prioridade
// de verdade em vários pontos do app: as matérias de maior peso aparecem
// primeiro nos seletores e na lista, e servem de base para o preenchimento
// automático do Bloco de Estudos (mais abaixo).
function obterMateriasOrdenadasPorPeso() {
  return [...materias].sort((a, b) => (b.peso || 1) - (a.peso || 1));
}

// Monta as <option> de matéria para uma linha do bloco, com "Estudo Geral"
// como opção padrão (igual ao seletor principal de matéria da sessão).
function opcoesMateriaBlocoHTML(valorSelecionado) {
  let html = `<option value="Estudo Geral">Estudo Geral</option>`;
  obterMateriasOrdenadasPorPeso().forEach((m) => {
    const selecionado = m.nome === valorSelecionado ? "selected" : "";
    html += `<option value="${escapeHtml(m.nome)}" ${selecionado}>${escapeHtml(m.nome)}</option>`;
  });
  return html;
}

// Abre o modal de montagem do bloco já com dois itens de exemplo prontos
// (ex: 2 pomodoros de uma matéria + 1 de outra), para o usuário só ajustar.
function abrirModalBlocoEstudos() {
  const lista = document.getElementById("bloco-estudos-itens-lista");
  if (!lista) return;
  lista.innerHTML = "";
  contadorItensBloco = 0;
  adicionarItemBloco(2);
  adicionarItemBloco(1);
  document.getElementById("modal-bloco-estudos").style.display = "flex";
}

function fecharModalBlocoEstudos() {
  const modal = document.getElementById("modal-bloco-estudos");
  if (modal) modal.style.display = "none";
}

// Adiciona uma linha (matéria + quantidade de pomodoros) ao formulário do
// bloco. quantidadeInicial e materiaPreselecionada permitem pré-preencher
// (usado pelos 2 itens de exemplo abertos junto com o modal, e pelo
// preenchimento automático por prioridade, logo abaixo).
function adicionarItemBloco(quantidadeInicial, materiaPreselecionada) {
  const lista = document.getElementById("bloco-estudos-itens-lista");
  if (!lista) return;
  const idx = contadorItensBloco++;
  const linha = document.createElement("div");
  linha.className = "bloco-item-row";
  linha.dataset.idx = idx;
  linha.innerHTML = `
    <select class="bloco-item-materia">${opcoesMateriaBlocoHTML(materiaPreselecionada)}</select>
    <input type="number" class="bloco-item-qtd" min="1" max="10" value="${quantidadeInicial || 1}" title="Quantidade de pomodoros" />
    <span class="bloco-item-label">pomodoro(s)</span>
    <button type="button" class="bloco-item-remover" onclick="removerItemBloco(${idx})" title="Remover matéria do bloco">✕</button>
  `;
  lista.appendChild(linha);
}

// Preenche o bloco sozinho, usando o peso (prioridade) de cada matéria
// cadastrada: quanto maior o peso, mais pomodoros seguidos ela recebe.
// Essa é a principal utilidade prática do campo "Peso da Matéria" no app —
// ele deixa de ser só uma informação guardada e passa a decidir quanto
// tempo de estudo cada matéria puxa pra si quando você pede uma sugestão.
async function preencherBlocoPorPrioridade() {
  if (materias.length === 0) {
    await mostrarAlerta(
      "Cadastre pelo menos uma matéria (com o peso de prioridade que preferir) antes de usar o preenchimento automático.",
    );
    return;
  }

  // No máximo 5 matérias no bloco sugerido, pra não virar uma maratona
  // absurda — as de maior prioridade entram primeiro.
  const prioritarias = obterMateriasOrdenadasPorPeso().slice(0, 5);

  const lista = document.getElementById("bloco-estudos-itens-lista");
  lista.innerHTML = "";
  contadorItensBloco = 0;

  prioritarias.forEach((m) => {
    const peso = m.peso || 1;
    // peso 1-2 → 1 pomodoro | peso 3-4 → 2 pomodoros | peso 5 → 3 pomodoros
    const pomodorosSugeridos = Math.ceil(peso / 2);
    adicionarItemBloco(pomodorosSugeridos, m.nome);
  });

  mostrarToastGamificacao(
    "🎯",
    "Bloco preenchido por prioridade",
    "Ajuste as quantidades se quiser antes de iniciar",
  );
}

function removerItemBloco(idx) {
  const lista = document.getElementById("bloco-estudos-itens-lista");
  if (!lista) return;
  const linhas = lista.querySelectorAll(".bloco-item-row");
  if (linhas.length <= 1) return; // sempre mantém pelo menos 1 item no bloco
  const alvo = lista.querySelector(`.bloco-item-row[data-idx="${idx}"]`);
  if (alvo) alvo.remove();
}

// Lê o formulário, valida e inicia o bloco: define a fila de matérias, a
// pausa automática, e já dispara o primeiro pomodoro (economizando o
// clique em "Iniciar Foco" também para o primeiro item da sequência).
async function iniciarBlocoEstudos() {
  const linhas = document.querySelectorAll(
    "#bloco-estudos-itens-lista .bloco-item-row",
  );
  const itens = [];
  linhas.forEach((linha) => {
    const materia = linha.querySelector(".bloco-item-materia").value;
    const qtd = parseInt(linha.querySelector(".bloco-item-qtd").value, 10) || 0;
    if (qtd > 0) itens.push({ materia, total: qtd, feitos: 0 });
  });

  if (itens.length === 0) {
    await mostrarAlerta(
      "Adicione ao menos uma matéria com quantidade de pomodoros maior que zero.",
    );
    return;
  }

  if (emEstadoDeFocoAtivo || emPausaConfig) {
    await mostrarAlerta(
      "Finalize ou resete a sessão atual antes de iniciar uma nova Sessão de Estudo Planejada.",
    );
    return;
  }

  const pausaMinutos = parseInt(
    document.getElementById("bloco-pausa-select").value,
    10,
  );

  planoEstudo = { itens, indiceAtual: 0, pausaMinutos };

  fecharModalBlocoEstudos();
  aplicarMateriaDoItemAtualDoBloco();
  atualizarPainelBlocoEstudos();
  mostrarToastGamificacao(
    "📚",
    "Sessão Planejada iniciada",
    `${itens.length} matéria(s) na fila · pausas de ${pausaMinutos} min`,
  );

  iniciarFocoComPreparacaoSeConfigurada(startTimer);
}

// Aplica no seletor de matéria da sessão o item atual do bloco.
function aplicarMateriaDoItemAtualDoBloco() {
  if (!planoEstudo) return;
  const item = planoEstudo.itens[planoEstudo.indiceAtual];
  if (!item) return;
  const select = document.getElementById("pomo-materia");
  if (select) select.value = item.materia;
}

// Atualiza o banner de progresso do bloco (matéria/pomodoro atual + fila
// restante) e trava o seletor de matéria enquanto o bloco estiver ativo,
// já que quem escolhe a matéria de cada ciclo passa a ser o próprio bloco.
function atualizarPainelBlocoEstudos() {
  const painel = document.getElementById("bloco-estudos-status");
  const selectMateria = document.getElementById("pomo-materia");
  if (!painel) return;

  if (!planoEstudo) {
    painel.style.display = "none";
    if (selectMateria) selectMateria.disabled = false;
    return;
  }

  painel.style.display = "block";
  if (selectMateria) selectMateria.disabled = true;

  const item = planoEstudo.itens[planoEstudo.indiceAtual];
  const textoAtual = document.getElementById("bloco-estudos-atual-texto");
  const textoFila = document.getElementById("bloco-estudos-fila-texto");

  if (item && textoAtual) {
    textoAtual.innerText = `➡️ ${item.materia}: pomodoro ${item.feitos + 1}/${item.total} · pausa automática de ${planoEstudo.pausaMinutos} min`;
  }

  if (textoFila) {
    const filaTexto = planoEstudo.itens
      .map((it, i) => {
        const restantes = it.total - it.feitos;
        if (restantes <= 0) return null;
        const marcador = i === planoEstudo.indiceAtual ? "▶" : "•";
        return `${marcador} ${it.materia} (${restantes}x)`;
      })
      .filter(Boolean)
      .join("   ");
    textoFila.innerText = `Fila: ${filaTexto}`;
  }
}

// Interrupção manual do bloco (botão "Cancelar Bloco" no banner). A sessão
// em andamento continua rodando normalmente — só a automação da fila e das
// pausas é desligada, devolvendo o controle manual ao usuário.
async function cancelarBlocoEstudos() {
  if (!planoEstudo) return;
  const confirmado = await mostrarConfirmacao(
    "Cancelar a Sessão de Estudo Planejada? A sessão atual continua rodando normalmente, mas a fila de matérias e as pausas automáticas serão interrompidas.",
    { icone: "🛑", textoConfirmar: "Cancelar sessão" },
  );
  if (!confirmado) return;
  planoEstudo = null;
  atualizarPainelBlocoEstudos();
  mostrarToastGamificacao("🛑", "Bloco cancelado", "Voltando ao modo manual");
}

// Chamada ao concluir um pomodoro (dentro de abrirSeletorPausa, já com a
// sessão persistida) enquanto um bloco está ativo. Avança o contador do
// item atual, pula para a próxima matéria quando o item é concluído, e
// informa se o bloco continua (com a pausa a usar) ou se terminou.
function avancarBlocoEstudosAposPomodoro() {
  if (!planoEstudo) return { emAndamento: false };

  const item = planoEstudo.itens[planoEstudo.indiceAtual];
  if (item) item.feitos += 1;

  if (item && item.feitos < item.total) {
    atualizarPainelBlocoEstudos();
    return { emAndamento: true, pausaMinutos: planoEstudo.pausaMinutos };
  }

  planoEstudo.indiceAtual += 1;
  while (
    planoEstudo.indiceAtual < planoEstudo.itens.length &&
    planoEstudo.itens[planoEstudo.indiceAtual].feitos >=
      planoEstudo.itens[planoEstudo.indiceAtual].total
  ) {
    planoEstudo.indiceAtual += 1;
  }

  if (planoEstudo.indiceAtual < planoEstudo.itens.length) {
    aplicarMateriaDoItemAtualDoBloco();
    atualizarPainelBlocoEstudos();
    return { emAndamento: true, pausaMinutos: planoEstudo.pausaMinutos };
  }

  // Bloco inteiro concluído.
  const pausaMinutos = planoEstudo.pausaMinutos;
  planoEstudo = null;
  atualizarPainelBlocoEstudos();
  mostrarToastGamificacao(
    "🎉",
    "Bloco de estudos concluído!",
    "Você terminou toda a sessão planejada.",
  );
  return { emAndamento: false, pausaMinutos };
}

// --- ABAS DE TEMPO (Foco e Preparação) ---
// Troca o tempo de foco (25/30/40/50 min) enquanto nenhuma sessão está em
// andamento. Trocar durante o foco/pausa/preparação não faz sentido (o
// tempo já está contando), então essas trocas ficam bloqueadas.
function selecionarTempoFoco(minutos) {
  if (emEstadoDeFocoAtivo || emPausaConfig || emPreparacao) return;
  tempoBaseEscolhidoMinutos = minutos;
  tempoRestante = minutos * 60;
  atualizarDisplay(tempoRestante);
  document.querySelectorAll(".aba-tempo-foco").forEach((btn) => {
    btn.classList.toggle(
      "aba-ativa",
      parseInt(btn.dataset.min, 10) === minutos,
    );
  });
}

// Troca a duração do Timer de Preparação (0 = sem preparo, 5/10/15 min). A
// escolha fica salva no navegador e vale tanto para o pomodoro comum quanto
// para o primeiro pomodoro de uma Sessão Planejada.
function selecionarTempoPreparo(minutos) {
  if (emPreparacao) return;
  tempoPreparoMinutos = minutos;
  localStorage.setItem("tempoPreparoMinutos", minutos);
  document.querySelectorAll(".aba-tempo-preparo").forEach((btn) => {
    btn.classList.toggle(
      "aba-ativa",
      parseInt(btn.dataset.min, 10) === minutos,
    );
  });
}

// --- TIMER DE PREPARAÇÃO ---
// Ponto único de entrada para começar um foco: se houver um Timer de
// Preparação selecionado, conta ele antes; senão, começa o foco direto.
// Usado tanto pelo botão/atalho de teclado do pomodoro comum quanto pelo
// início de uma Sessão Planejada.
function iniciarFocoComPreparacaoSeConfigurada(callback) {
  if (tempoPreparoMinutos > 0) {
    iniciarPreparacao(callback);
  } else {
    callback();
  }
}

function iniciarPreparacao(callback) {
  clearInterval(timerPreparo);
  emPreparacao = true;
  acaoAposPreparo = callback;

  iniciarAudioContext();

  const conteudoNormal = document.getElementById("conteudo-foco-normal");
  const painelPreparo = document.getElementById("painel-preparacao");
  const grupoBotoes = document.querySelector(".btn-group");
  if (conteudoNormal) conteudoNormal.style.display = "none";
  if (grupoBotoes) grupoBotoes.style.display = "none";
  if (painelPreparo) painelPreparo.style.display = "flex";

  document
    .querySelectorAll(".aba-tempo-foco, .aba-tempo-preparo")
    .forEach((b) => (b.disabled = true));

  const status = document.getElementById("pomodoro-status");
  if (status) status.innerText = "🧘 Preparando para o foco...";

  const materiaTexto = document.getElementById("preparacao-materia-texto");
  if (materiaTexto) {
    const selectMateria = document.getElementById("pomo-materia");
    const materia = selectMateria ? selectMateria.value : "";
    materiaTexto.innerText = materia ? `Próxima matéria: ${materia}` : "";
  }

  timestampAlvoPreparo = Date.now() + tempoPreparoMinutos * 60 * 1000;
  atualizarDisplayPreparo(tempoPreparoMinutos * 60);
  timerPreparo = setInterval(tickPreparo, 250);
}

function tickPreparo() {
  const restante = Math.round((timestampAlvoPreparo - Date.now()) / 1000);
  if (restante > 0) {
    atualizarDisplayPreparo(restante);
  } else {
    atualizarDisplayPreparo(0);
    concluirPreparacao();
  }
}

function atualizarDisplayPreparo(s) {
  const display = document.getElementById("preparacao-display");
  if (!display) return;
  const minutos = Math.floor(s / 60);
  const segundos = s % 60;
  display.innerText = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
}

// Restaura a interface do card ao estado normal (some com o painel de
// preparação, volta o conteúdo do timer e o grupo de botões).
function restaurarPainelNormalPosPreparacao() {
  const conteudoNormal = document.getElementById("conteudo-foco-normal");
  const painelPreparo = document.getElementById("painel-preparacao");
  const grupoBotoes = document.querySelector(".btn-group");
  if (conteudoNormal) conteudoNormal.style.display = "";
  if (grupoBotoes) grupoBotoes.style.display = "";
  if (painelPreparo) painelPreparo.style.display = "none";
}

// Preparação terminou (zerou sozinha ou foi pulada): toca um aviso curto e
// dispara a ação combinada (iniciar o pomodoro comum ou o primeiro da
// Sessão Planejada).
function concluirPreparacao() {
  clearInterval(timerPreparo);
  timerPreparo = null;
  emPreparacao = false;

  restaurarPainelNormalPosPreparacao();
  ticarSom("sino");

  const cb = acaoAposPreparo;
  acaoAposPreparo = null;
  if (cb) cb();
}

function pularPreparacao() {
  if (!emPreparacao) return;
  concluirPreparacao();
}

// Cancela a preparação sem chegar a iniciar o foco, voltando a interface ao
// repouso normal. Se isso aconteceu logo no início de uma Sessão Planejada,
// desfaz o plano também (senão ele ficaria "fantasma", sem timer rodando).
function cancelarPreparacao() {
  if (!emPreparacao) return;
  clearInterval(timerPreparo);
  timerPreparo = null;
  emPreparacao = false;
  acaoAposPreparo = null;

  if (planoEstudo) {
    planoEstudo = null;
    atualizarPainelBlocoEstudos();
  }

  restaurarPainelNormalPosPreparacao();
  document
    .querySelectorAll(".aba-tempo-foco, .aba-tempo-preparo")
    .forEach((b) => (b.disabled = false));

  const status = document.getElementById("pomodoro-status");
  if (status) status.innerText = "Pronto para iniciar!";
}

// --- MODO FOCO: entrar/sair da tela cheia ---
//
// O fundo (#app-conteudo) usa "filter: blur()" + opacity reduzida pra ficar
// desfocado atrás do timer. O problema: filter/opacity em CSS são aplicados
// ao elemento E a toda a sua descendência como um grupo só renderizado em
// conjunto — um filho não consegue "desfazer" isso com filter:none/opacity:1,
// porque o pai já compôs a imagem borrada incluindo o filho dentro dela. Como
// o card #modulo-pomodoro (timer, meta de pomodoros, etc.) ficava dentro de
// #app-conteudo, ele acabava borrado/apagado junto — por isso o modo foco
// aparecia todo escuro, sem mostrar timer nem meta.
//
// A correção: ao entrar no modo foco, o card sai fisicamente de dentro de
// #app-conteudo e passa a ser filho direto do <body> (fora da árvore
// borrada), ficando nítido por cima do fundo desfocado. Ao sair, ele volta
// pro lugar original, guiado pelo marcador #modulo-pomodoro-placeholder.
function moverPomodoroParaTelaCheia() {
  const card = document.getElementById("modulo-pomodoro");
  if (!card || card.parentElement === document.body) return;
  document.body.appendChild(card);
}

function restaurarPomodoroNaPosicaoOriginal() {
  const card = document.getElementById("modulo-pomodoro");
  const marcador = document.getElementById("modulo-pomodoro-placeholder");
  if (!card || !marcador) return;
  if (card.parentElement === document.body) {
    marcador.parentElement.insertBefore(card, marcador.nextSibling);
  }
}

// O seletor de matéria (#pomo-materia) fica escondido por CSS durante o
// modo foco (.vinculo-materia-container some) — sem isso, a única forma de
// ver/trocar a matéria era um texto estático que não reagia a nada. Em vez
// de duplicar o <select> (o que criaria dois IDs iguais e risco de
// ficarem dessincronizados), o MESMO elemento é movido pra dentro do
// título da tela cheia enquanto o foco está ativo, e devolvido pro lugar
// original ao sair — igual já era feito com o card inteiro do pomodoro.
function moverSeletorMateriaParaTelaCheia() {
  const select = document.getElementById("pomo-materia");
  const destino = document.getElementById("pomo-texto-sub");
  if (!select || !destino || select.parentElement === destino) return;
  destino.innerHTML = "";
  destino.appendChild(select);
  select.classList.add("pomo-materia-tela-cheia");
}

function restaurarSeletorMateriaNaPosicaoOriginal() {
  const select = document.getElementById("pomo-materia");
  const marcador = document.getElementById("pomo-materia-placeholder");
  if (!select || !marcador) return;
  if (select.parentElement !== marcador.parentElement) {
    select.classList.remove("pomo-materia-tela-cheia");
    marcador.parentElement.insertBefore(select, marcador.nextSibling);
  }
}

// Disparado quando a matéria é trocada (seja na tela normal, seja dentro
// do modo foco, já que agora é o mesmo <select> nos dois lugares). Mantém
// o título "Foco absoluto" visível e, se houver uma sessão em andamento,
// atualiza na hora o estado salvo — pra uma troca de matéria no meio da
// sessão não se perder se o app fechar logo depois.
function aoMudarMateriaSessao() {
  const elTop = document.getElementById("pomo-texto-top");
  if (elTop && emEstadoDeFocoAtivo && !emPausaConfig) {
    elTop.innerText = "Foco absoluto";
  }
  if (emEstadoDeFocoAtivo) salvarEstadoSessaoAtiva();
}

// --- TELA CHEIA REAL (Fullscreen API) ---
// O modo foco sempre cobriu a tela via CSS (position: fixed), mas isso
// não esconde a barra de tarefas do sistema operacional — só o navegador
// em tela cheia DE VERDADE faz isso. Pedimos a API nativa como reforço;
// se o navegador recusar (ex: não foi um gesto direto do usuário) ou não
// suportar, o modo CSS continua cobrindo a tela sozinho, então nada
// quebra — é só uma camada a mais quando disponível.
function solicitarTelaCheiaReal() {
  const el = document.documentElement;
  const pedir =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (!pedir) return;
  try {
    const resultado = pedir.call(el);
    if (resultado && typeof resultado.catch === "function") {
      resultado.catch(() => {});
    }
  } catch {
    // Navegador mais antigo pode lançar erro em vez de rejeitar a
    // Promise — ignora do mesmo jeito, o modo CSS já cobre a tela.
  }
}

function elementoEmTelaCheiaReal() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function sairDaTelaCheiaReal() {
  const sair =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (!sair || !elementoEmTelaCheiaReal()) return;
  try {
    const resultado = sair.call(document);
    if (resultado && typeof resultado.catch === "function") {
      resultado.catch(() => {});
    }
  } catch {
    // ignora — o objetivo é só garantir que não fica preso em tela cheia
  }
}

// Se a pessoa sair da tela cheia nativa direto (tecla Esc, gesto do SO)
// sem passar pelo botão "Sair da tela cheia" do app, sincroniza os dois
// estados — sem isso, ficaria uma "tela cheia falsa" em CSS rodando
// depois que a de verdade já fechou.
function aoMudarEstadoTelaCheiaNativa() {
  if (
    !elementoEmTelaCheiaReal() &&
    document.body.classList.contains("modo-isolamento-ativo")
  ) {
    desativarModoIsolamento();
    if (typeof atualizarBotaoVoltarModoFoco === "function") {
      atualizarBotaoVoltarModoFoco();
    }
  }
}
[
  "fullscreenchange",
  "webkitfullscreenchange",
  "mozfullscreenchange",
  "MSFullscreenChange",
].forEach((evento) =>
  document.addEventListener(evento, aoMudarEstadoTelaCheiaNativa),
);

function ativarModoIsolamento() {
  document.body.classList.add("modo-isolamento-ativo");
  moverPomodoroParaTelaCheia();
  moverSeletorMateriaParaTelaCheia();
  solicitarTelaCheiaReal();
}

function desativarModoIsolamento() {
  document.body.classList.remove("modo-isolamento-ativo");
  restaurarPomodoroNaPosicaoOriginal();
  restaurarSeletorMateriaNaPosicaoOriginal();
  sairDaTelaCheiaReal();
}

// --- TIMING / POMODORO ---
function gerenciarBotaoFocoPrincipal() {
  if (emPreparacao) return;
  if (!emEstadoDeFocoAtivo && !emPausaConfig) {
    abrirModalCheckinHumor();
  } else {
    finalizarSessao();
  }
}

// --- MOOD TRACKER: CHECK-IN ---
// Abre o mini-formulário "como você está agora" antes de começar a focar.
// Sempre com saída rápida (Pular) — isso não pode virar fricção pra quem
// só quer apertar Iniciar e focar.
function abrirModalCheckinHumor() {
  checkinHumorSelecionado = null;
  checkinEnergiaSelecionada = null;
  checkinSonoSelecionado = null;
  checkinLembreteHumorMostrado = false;

  const modal = document.getElementById("modal-checkin-humor");
  if (!modal) {
    // Modal não existe por algum motivo — não trava o fluxo de foco por
    // causa de uma funcionalidade opcional.
    iniciarFocoComPreparacaoSeConfigurada(startTimer);
    return;
  }

  modal
    .querySelectorAll(".checkin-chip-emoji, .checkin-chip-texto")
    .forEach((btn) => btn.classList.remove("chip-ativa"));

  const lembreteCheckin = document.getElementById("checkin-lembrete-humor");
  if (lembreteCheckin) lembreteCheckin.style.display = "none";

  document.getElementById("checkin-ansiedade").value = 5;
  document.getElementById("checkin-motivacao").value = 5;
  atualizarLabelSliderCheckin("checkin-ansiedade", "checkin-ansiedade-valor");
  atualizarLabelSliderCheckin("checkin-motivacao", "checkin-motivacao-valor");
  document.getElementById("checkin-pensamento").value = "";

  modal.style.display = "flex";
}

// Seletor de chip genérico, reaproveitado pelo check-in (humor/energia/
// sono) e pelo check-out (% cumprido/humor depois) — cada grupo marca só
// um botão ativo por vez, escopado pelo próprio modal em que ele está
// (assim os dois modais podem ter grupos com o mesmo nome, ex. "humor",
// sem um interferir no outro).
function selecionarChipCheckin(grupo, valor, elemento) {
  const modalPai = elemento.closest(".modal-conteudo");
  const escopo = modalPai || document;
  escopo
    .querySelectorAll(`[data-grupo="${grupo}"]`)
    .forEach((b) => b.classList.remove("chip-ativa"));
  elemento.classList.add("chip-ativa");

  if (grupo === "humor") checkinHumorSelecionado = valor;
  if (grupo === "energia") checkinEnergiaSelecionada = valor;
  if (grupo === "sono") checkinSonoSelecionado = valor;
  if (grupo === "cumprido") checkoutCumpridoSelecionado = parseInt(valor, 10);
  if (grupo === "humor-depois") checkoutHumorDepoisSelecionado = valor;
}

// Tipo de Sessão: chip opcional escolhido antes de "Iniciar Foco" — clicar
// de novo no mesmo chip já ativo desmarca (volta a "nenhum"), já que o
// campo é opcional e não obrigatório como os outros grupos de chip.
function selecionarTipoSessao(tipo, elemento) {
  const grid = document.getElementById("pomo-tipo-sessao-grid");
  if (!grid) return;
  const jaAtiva = elemento.classList.contains("chip-ativa");

  grid
    .querySelectorAll(".checkin-chip-texto")
    .forEach((b) => b.classList.remove("chip-ativa"));

  if (jaAtiva) {
    tipoSessaoSelecionado = null;
  } else {
    elemento.classList.add("chip-ativa");
    tipoSessaoSelecionado = tipo;
  }
}

function atualizarLabelSliderCheckin(idSlider, idLabel) {
  const slider = document.getElementById(idSlider);
  const label = document.getElementById(idLabel);
  if (slider && label) label.textContent = slider.value;
}

function pularCheckinHumor() {
  moodCheckinAtual = null;
  const modal = document.getElementById("modal-checkin-humor");
  if (modal) modal.style.display = "none";
  iniciarFocoComPreparacaoSeConfigurada(startTimer);
}

// Acende um lembrete sutil (pulso na borda + texto) no grupo de carinhas
// de humor, sem travar o fluxo — só um "ei, esqueceu?" antes de confirmar
// sem humor marcado. Reaproveitado pelo check-in e pelo check-out (cada
// um passa seu próprio prefixo de id: "checkin" ou "checkout").
function destacarLembreteHumor(prefixo) {
  const grupo = document.getElementById(`${prefixo}-grupo-humor`);
  const texto = document.getElementById(`${prefixo}-lembrete-humor`);
  if (texto) texto.style.display = "block";
  if (grupo) {
    grupo.classList.remove("checkin-grupo-pulso");
    // Força reflow pra poder re-disparar a animação, mesmo se ela já
    // tiver rodado antes (troca de classe sem isso não reinicia o CSS).
    void grupo.offsetWidth;
    grupo.classList.add("checkin-grupo-pulso");
  }
}

function confirmarCheckinHumor() {
  // Primeira tentativa de confirmar sem nenhuma carinha marcada: mostra
  // o lembrete e não fecha o modal ainda. Na tentativa seguinte, respeita
  // a escolha da pessoa e segue salvando normalmente — o check-in é
  // opcional, isso é só um empurrãozinho, não uma trava.
  if (!checkinHumorSelecionado && !checkinLembreteHumorMostrado) {
    checkinLembreteHumorMostrado = true;
    destacarLembreteHumor("checkin");
    return;
  }

  const ansiedade = parseInt(
    document.getElementById("checkin-ansiedade").value,
    10,
  );
  const motivacao = parseInt(
    document.getElementById("checkin-motivacao").value,
    10,
  );
  const pensamento = document.getElementById("checkin-pensamento").value.trim();

  // Só grava check-in se a pessoa realmente tocou em algo — um check-in
  // 100% vazio (só ansiedade/motivação no valor padrão 5, sem tocar em
  // nada) não agrega nada à análise depois.
  const tocouEmAlgo =
    checkinHumorSelecionado ||
    checkinEnergiaSelecionada ||
    checkinSonoSelecionado ||
    ansiedade !== 5 ||
    motivacao !== 5 ||
    pensamento;

  moodCheckinAtual = tocouEmAlgo
    ? {
        humor: checkinHumorSelecionado,
        energia: checkinEnergiaSelecionada,
        sono: checkinSonoSelecionado,
        ansiedade,
        motivacao,
        pensamento: pensamento || null,
        horario: new Date().toISOString(),
      }
    : null;

  const modal = document.getElementById("modal-checkin-humor");
  if (modal) modal.style.display = "none";
  iniciarFocoComPreparacaoSeConfigurada(startTimer);
}

// --- MOOD TRACKER: CHECK-OUT ---
function selecionarEstrelaCheckout(valor) {
  checkoutEstrelasSelecionadas = valor;
  document
    .querySelectorAll("#checkout-estrelas-container .checkout-estrela")
    .forEach((btn) => {
      btn.classList.toggle(
        "estrela-ativa",
        parseInt(btn.dataset.valor, 10) <= valor,
      );
    });
}

// --- PERSISTÊNCIA DA SESSÃO ATIVA (foco/pausa em andamento) ---
// Sem isso, fechar o app (ou reiniciar o PC) NO MEIO de um ciclo de foco ou
// de uma pausa perdia esse progresso: o timer só existia em variáveis na
// memória, não em localStorage — ao reabrir, tudo voltava zerado. Isso é
// diferente do bug de sessão-não-salva corrigido antes (que era sobre uma
// sessão JÁ FINALIZADA falhando ao persistir); aqui é sobre uma sessão
// AINDA EM ANDAMENTO no momento em que o app fecha. Mesmo padrão usado pelo
// Simulado Cronometrado (verificarSimuladoCronometradoEmAndamento), só que
// pro pomodoro normal. Fica só neste aparelho (não sincroniza entre
// dispositivos — cada aparelho tem seu próprio timer rodando ou não).
function salvarEstadoSessaoAtiva() {
  if (!emEstadoDeFocoAtivo) {
    limparEstadoSessaoAtiva();
    return;
  }
  const seletorMateria = document.getElementById("pomo-materia");
  const estado = {
    fase: emPausaConfig ? "pausa" : "foco",
    materia: seletorMateria ? seletorMateria.value : "",
    tempoBaseEscolhidoMinutos,
    emOvertime,
    pausadoManualmente,
    timestampAlvo: pausadoManualmente ? null : timestampAlvo,
    timestampInicioOvertime: pausadoManualmente
      ? null
      : timestampInicioOvertime,
    tempoRestanteCongelado:
      pausadoManualmente && !emOvertime ? tempoRestante : null,
    tempoOvertimeCongelado:
      pausadoManualmente && emOvertime ? tempoOvertimeAcumulado : null,
    planoEstudo: planoEstudo,
  };
  try {
    localStorage.setItem("sessaoTimerAtiva", JSON.stringify(estado));
  } catch (err) {
    console.error("Erro ao salvar estado da sessão ativa:", err);
  }
}

function limparEstadoSessaoAtiva() {
  localStorage.removeItem("sessaoTimerAtiva");
}

// Roda uma vez, ao abrir o app: se havia um foco ou uma pausa em andamento
// quando o app foi fechado, retoma exatamente de onde parou (os alvos são
// baseados em Date.now(), então o tempo passado de verdade enquanto o app
// estava fechado conta normalmente — inclusive virando overtime sozinho se
// o ciclo já teria zerado nesse meio tempo).
function restaurarSessaoAtivaSalva() {
  let estado;
  try {
    estado = JSON.parse(localStorage.getItem("sessaoTimerAtiva"));
  } catch {
    estado = null;
  }
  if (!estado) return;

  const agora = Date.now();
  tempoBaseEscolhidoMinutos =
    estado.tempoBaseEscolhidoMinutos || tempoBaseEscolhidoMinutos;
  if (estado.planoEstudo) {
    planoEstudo = estado.planoEstudo;
    atualizarPainelBlocoEstudos();
  }

  const seletorMateria = document.getElementById("pomo-materia");
  if (seletorMateria && estado.materia) {
    const existeOpcao = Array.from(seletorMateria.options).some(
      (o) => o.value === estado.materia,
    );
    if (existeOpcao) seletorMateria.value = estado.materia;
  }

  emEstadoDeFocoAtivo = true;
  processandoFinalizacaoSessao = false;

  if (estado.fase === "pausa") {
    emPausaConfig = true;
    emOvertime = false;

    if (estado.pausadoManualmente) {
      tempoRestante = estado.tempoRestanteCongelado || 0;
      if (tempoRestante <= 0) {
        limparEstadoSessaoAtiva();
        resetTimer();
        return;
      }
      timestampAlvo = agora + tempoRestante * 1000;
      pausadoManualmente = true;
      timestampPausaManualInicio = agora;
    } else {
      const restante = Math.round((estado.timestampAlvo - agora) / 1000);
      if (restante <= 0) {
        // A pausa já teria terminado enquanto o app estava fechado. Pausa
        // não guarda minutos de estudo em risco, então só volta pro estado
        // "pronto pra começar" — sem precisar do app aberto o tempo todo.
        limparEstadoSessaoAtiva();
        resetTimer();
        return;
      }
      tempoRestante = restante;
      timestampAlvo = estado.timestampAlvo;
      pausadoManualmente = false;
    }

    const display = document.getElementById("timer-display");
    ativarModoIsolamento();
    if (display) {
      display.classList.remove("overtime");
      display.classList.add("pausa-ativa");
    }
    document
      .querySelectorAll(".aba-tempo-foco, .aba-tempo-preparo")
      .forEach((b) => (b.disabled = true));
    const pomoPausaSel = document.getElementById("pomo-pausa");
    if (pomoPausaSel) pomoPausaSel.disabled = true;

    const btnPrincipal = document.getElementById("btn-start");
    if (btnPrincipal) {
      btnPrincipal.innerText = "Finalizar";
      btnPrincipal.style.background = "var(--danger)";
    }
    const btnPause = document.getElementById("btn-pause");
    if (btnPause)
      btnPause.innerText = pausadoManualmente ? "Retomar" : "Pausar";
    const status = document.getElementById("pomodoro-status");
    if (status) {
      status.innerText = pausadoManualmente
        ? "⏸️ Pausa em espera (retome quando quiser)"
        : "☕ Pausa em andamento...";
    }

    atualizarBotaoVoltarModoFoco();
    atualizarBotaoCompletarSessao();

    if (!pausadoManualmente) timer = setInterval(tickTimer, 250);
    mostrarToastGamificacao(
      "☕",
      "Pausa retomada",
      "Continuando de onde parou.",
    );
    return;
  }

  // fase === "foco"
  emPausaConfig = false;

  if (estado.pausadoManualmente) {
    if (estado.emOvertime) {
      emOvertime = true;
      tempoOvertimeAcumulado = estado.tempoOvertimeCongelado || 0;
      timestampInicioOvertime = agora - tempoOvertimeAcumulado * 1000;
    } else {
      emOvertime = false;
      tempoRestante = estado.tempoRestanteCongelado || 0;
      timestampAlvo = agora + tempoRestante * 1000;
    }
    pausadoManualmente = true;
    timestampPausaManualInicio = agora;
  } else if (estado.emOvertime) {
    emOvertime = true;
    timestampInicioOvertime = estado.timestampInicioOvertime || agora;
    tempoOvertimeAcumulado = Math.max(
      0,
      Math.round((agora - timestampInicioOvertime) / 1000),
    );
    pausadoManualmente = false;
  } else {
    const restante = Math.round((estado.timestampAlvo - agora) / 1000);
    if (restante <= 0) {
      // O ciclo já teria zerado enquanto o app estava fechado — entra
      // direto em overtime, com o tempo excedente já calculado a partir do
      // instante em que teria zerado.
      emOvertime = true;
      timestampInicioOvertime = estado.timestampAlvo;
      tempoOvertimeAcumulado = Math.round(
        (agora - estado.timestampAlvo) / 1000,
      );
    } else {
      tempoRestante = restante;
      timestampAlvo = estado.timestampAlvo;
    }
    pausadoManualmente = false;
  }

  ativarModoIsolamento();
  const headerTitulo = document.getElementById("pomodoro-header-titulo");
  if (headerTitulo) headerTitulo.style.display = "none";
  // NÃO mexer em #pomo-texto-sub diretamente aqui: ativarModoIsolamento()
  // (linha acima) já chama moverSeletorMateriaParaTelaCheia(), que move o
  // <select id="pomo-materia"> de verdade pra dentro desse container. Setar
  // innerText nele por cima substituiria o <select> por texto estático,
  // quebrando o vínculo entre o que aparece na tela cheia e a matéria
  // realmente selecionada (e as estatísticas registradas depois).
  const elTop = document.getElementById("pomo-texto-top");
  if (elTop) elTop.innerText = "Foco absoluto";
  const containerTitulos = document.getElementById("pomo-container-titulos");
  if (containerTitulos) containerTitulos.style.display = "flex";

  document
    .querySelectorAll(".aba-tempo-foco, .aba-tempo-preparo")
    .forEach((b) => (b.disabled = true));
  const pomoPausaSel2 = document.getElementById("pomo-pausa");
  if (pomoPausaSel2) pomoPausaSel2.disabled = true;

  const btnPrincipal2 = document.getElementById("btn-start");
  if (btnPrincipal2) {
    btnPrincipal2.innerText = "Finalizar";
    btnPrincipal2.style.background = "var(--danger)";
  }
  const btnPause2 = document.getElementById("btn-pause");
  if (btnPause2)
    btnPause2.innerText = pausadoManualmente ? "Retomar" : "Pausar";

  const display2 = document.getElementById("timer-display");
  if (display2) {
    display2.classList.remove("pausa-ativa");
    display2.classList.toggle("overtime", emOvertime);
  }

  atualizarBotaoCompletarSessao();
  atualizarBotaoVoltarModoFoco();

  if (!pausadoManualmente) timer = setInterval(tickTimer, 250);
  mostrarToastGamificacao(
    "⏱️",
    "Sessão retomada",
    "Continuando de onde você parou.",
  );
}

// --- REORDENAR CARDS DO PAINEL (arrastar e soltar) ---
// Só os 3 cards da coluna lateral (Alvo/Meta, Meta de Horas, Tarefas) são
// reordenáveis — o card do pomodoro em si fica fixo, já que tem tratamento
// especial pro modo foco em tela cheia (ver moverPomodoroParaTelaCheia).
let elementoArrastadoWidget = null;

function iniciarArrastoWidget(event) {
  const card = event.target.closest(".widget-arrastavel");
  if (!card) return;
  elementoArrastadoWidget = card;
  event.dataTransfer.effectAllowed = "move";
  // Alguns navegadores exigem um setData real pro drag funcionar de fato.
  event.dataTransfer.setData("text/plain", card.id);
  card.classList.add("widget-sendo-arrastado");
}

function finalizarArrastoWidget(event) {
  const card = event.target.closest(".widget-arrastavel");
  if (card) card.classList.remove("widget-sendo-arrastado");
  document
    .querySelectorAll(".widget-arrastavel.widget-drop-alvo")
    .forEach((el) => el.classList.remove("widget-drop-alvo"));
  elementoArrastadoWidget = null;
}

function permitirDropWidget(event) {
  event.preventDefault();
  const alvo = event.currentTarget;
  if (!elementoArrastadoWidget || alvo === elementoArrastadoWidget) return;
  alvo.classList.add("widget-drop-alvo");
}

function soltarWidget(event) {
  event.preventDefault();
  const alvo = event.currentTarget;
  alvo.classList.remove("widget-drop-alvo");
  if (!elementoArrastadoWidget || alvo === elementoArrastadoWidget) return;

  const container = alvo.parentElement;
  const cards = Array.from(container.querySelectorAll(".widget-arrastavel"));
  const indiceArrastado = cards.indexOf(elementoArrastadoWidget);
  const indiceAlvo = cards.indexOf(alvo);
  if (indiceArrastado === -1 || indiceAlvo === -1) return;

  if (indiceArrastado < indiceAlvo) {
    alvo.after(elementoArrastadoWidget);
  } else {
    alvo.before(elementoArrastadoWidget);
  }

  salvarOrdemWidgetsPainel();
}

function salvarOrdemWidgetsPainel() {
  const container = document.querySelector(".coluna-lateral-pomo");
  if (!container) return;
  const ordem = Array.from(
    container.querySelectorAll(".widget-arrastavel"),
  ).map((el) => el.id);
  try {
    localStorage.setItem("ordemWidgetsPainel", JSON.stringify(ordem));
  } catch (err) {
    console.error("Erro ao salvar ordem dos widgets:", err);
  }
}

function restaurarOrdemWidgetsPainel() {
  const container = document.querySelector(".coluna-lateral-pomo");
  if (!container) return;
  let ordem;
  try {
    ordem = JSON.parse(localStorage.getItem("ordemWidgetsPainel"));
  } catch {
    ordem = null;
  }
  if (!Array.isArray(ordem) || ordem.length === 0) return;
  ordem.forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.parentElement === container) container.appendChild(el);
  });
}

function startTimer() {
  iniciarAudioContext();
  clearInterval(timer);
  emEstadoDeFocoAtivo = true;
  pausadoManualmente = false;
  const btnPause = document.getElementById("btn-pause");
  if (btnPause) btnPause.innerText = "Pausar";

  const btnPrincipal = document.getElementById("btn-start");
  btnPrincipal.innerText = "Finalizar";
  btnPrincipal.style.background = "var(--danger)";

  document
    .querySelectorAll(".aba-tempo-foco, .aba-tempo-preparo")
    .forEach((b) => (b.disabled = true));
  document.getElementById("pomo-pausa").disabled = true;

  if (!emPausaConfig) {
    solicitarPermissaoNotificacao();
    ativarModoIsolamento();
    document.getElementById("pomodoro-header-titulo").style.display = "none";
    document.getElementById("pomo-texto-top").innerText = "Foco absoluto";
    document.getElementById("pomo-container-titulos").style.display = "flex";
    exibirFraseMotivacional();

    // Registra que um novo ciclo de foco genuíno começou agora — usado só
    // pra calcular a taxa de conclusão (iniciados x completos) depois.
    registrarPomodoroIniciado();

    // Novo ciclo de foco genuíno: limpa a legenda da sessão anterior e
    // qualquer destaque vermelho de pausa que tenha sobrado.
    const legenda = document.getElementById("legenda-tempo-concluido");
    if (legenda) legenda.style.display = "none";
    document.getElementById("timer-display").classList.remove("pausa-ativa");
    atualizarBotaoCompletarSessao();
  }

  // Define o instante-alvo com base no relógio real (Date.now()), em vez de
  // contar quantas vezes o setInterval disparou. Isso mantém a contagem
  // correta mesmo se o navegador atrasar/pausar os ticks com a aba minimizada
  // ou em segundo plano — ao voltar, o tempo se autocorrige na hora.
  if (!emOvertime) {
    timestampAlvo = Date.now() + tempoRestante * 1000;
  } else {
    timestampInicioOvertime = Date.now() - tempoOvertimeAcumulado * 1000;
  }

  // Intervalo curto (250ms) só para deixar a UI mais responsiva; a precisão
  // real não depende mais da frequência do tick, e sim do Date.now().
  timer = setInterval(tickTimer, 250);

  atualizarBotaoVoltarModoFoco();
  salvarEstadoSessaoAtiva();
}

// Sai da tela cheia do modo foco SEM finalizar o pomodoro — a contagem
// continua rodando normalmente em segundo plano (o setInterval não é afetado
// por isso, ele só depende da classe CSS que muda a aparência da tela).
function sairDoModoFoco() {
  desativarModoIsolamento();
  atualizarBotaoVoltarModoFoco();
}

// Clicar no fundo (fora do conteúdo central) da tela cheia também sai do
// modo foco — igual fechar um modal clicando fora dele.
function cliqueForaDoConteudoModoFoco(event) {
  if (!document.body.classList.contains("modo-isolamento-ativo")) return;
  if (event.target === event.currentTarget) {
    sairDoModoFoco();
  }
}

// Volta para a tela cheia do modo foco sem reiniciar a contagem (o timer
// já está rodando desde startTimer(), aqui só reaplicamos o visual).
function entrarNoModoFoco() {
  if (!emEstadoDeFocoAtivo) return;
  ativarModoIsolamento();
  atualizarBotaoVoltarModoFoco();
}

// Mostra o botão "Voltar ao Modo Foco" só quando existe uma sessão ativa e a
// tela cheia está fechada no momento.
function atualizarBotaoVoltarModoFoco() {
  const btn = document.getElementById("btn-voltar-modo-foco");
  if (!btn) return;
  const emTelaCheia = document.body.classList.contains("modo-isolamento-ativo");
  btn.style.display =
    emEstadoDeFocoAtivo && !emTelaCheia ? "inline-block" : "none";
}

// Mostra o botão "Completar Sessão" só durante o overtime (ciclo já cumprido
// na íntegra). Fora do overtime ele fica escondido.
function atualizarBotaoCompletarSessao() {
  const btn = document.getElementById("btn-completar-sessao");
  if (!btn) return;
  btn.style.display = emOvertime && !emPausaConfig ? "inline-block" : "none";
}

// Clique em "Completar Sessão": persiste a sessão (conta na meta na hora),
// mostra a legenda com o tempo concluído e abre o seletor de pausa — tudo
// sem sair da tela de foco.
async function abrirSeletorPausa() {
  // Trava contra duplo-clique: se já tem uma finalização em andamento
  // (por exemplo, o usuário clicou em "Finalizar" e em "Completar Sessão"
  // em sequência rápida, ou clicou duas vezes no mesmo botão), ignora a
  // chamada extra — evita registrar a mesma sessão mais de uma vez no
  // histórico.
  if (processandoFinalizacaoSessao) return;
  processandoFinalizacaoSessao = true;

  let minOver = Math.floor(tempoOvertimeAcumulado / 60);
  let minutosEstudados = tempoBaseEscolhidoMinutos + minOver;
  if (minutosEstudados < 1) minutosEstudados = 1;

  cacheMinutosSessaoAtual = minutosEstudados;
  cacheMateriaSessaoAtual = document.getElementById("pomo-materia").value;

  // Persiste o tempo estudado e soma +1 na meta imediatamente (o ciclo já
  // foi cumprido na íntegra, chegou a entrar em overtime).
  //
  // IMPORTANTE: se isso falhar (ex: localStorage cheio/quota excedida),
  // avisa a pessoa NA HORA em vez de só logar no console e seguir como se
  // nada tivesse acontecido — um erro engolido em silêncio aqui já causou
  // sessão inteira perdida sem nenhum aviso.
  try {
    persistirSessaoFinalizada();
  } catch (err) {
    console.error("Erro ao persistir sessão:", err);
    await mostrarAlerta(
      `Não consegui salvar essa sessão de estudo (${minutosEstudados} min). Erro: ${err && err.message ? err.message : err}.\n\nAnote o tempo estudado por segurança e, se o problema persistir, tente exportar/verificar seu backup em Perfil → Dados.`,
      { icone: "⚠️", titulo: "Sessão não foi salva" },
    );
  }
  limparEstadoSessaoAtiva();

  // Essa sessão já foi contada acima. Zera o overtime aqui — sem isso, se
  // o fluxo cair na Auditoria de Foco logo abaixo (meta batida) ou o
  // usuário clicar em "Finalizar" logo em seguida, o mesmo overtime seria
  // visto como "ainda não contado" e a meta levava +1 extra (contagem
  // duplicada).
  emOvertime = false;
  tempoOvertimeAcumulado = 0;

  // Esconde o botão "Completar Sessão" (e o "Finalizar" some junto, já que
  // ambos dependem de emOvertime) imediatamente — antes ele continuava
  // visível e clicável enquanto o modal de pausa aparecia, então cliques
  // repetidos geravam um novo registro no histórico a cada clique.
  atualizarBotaoCompletarSessao();

  const legenda = document.getElementById("legenda-tempo-concluido");
  if (legenda) {
    legenda.innerText = `✅ Sessão concluída: ${minutosEstudados} min`;
    legenda.style.display = "block";
  }

  clearInterval(timer);

  // Sessão de Estudo Planejada ativa: pula a escolha manual de pausa (o
  // seletor de 5/10/15... min) e decide sozinho a próxima etapa — nova
  // pausa automática com a duração já configurada, ou fim do bloco. Se o
  // bloco terminou agora, o fluxo cai para baixo e segue como uma sessão
  // normal (checa meta diária / auditoria).
  if (planoEstudo) {
    const resultado = avancarBlocoEstudosAposPomodoro();
    if (resultado.emAndamento) {
      iniciarPausaComDuracao(resultado.pausaMinutos, true);
      return;
    }
  }

  // Se essa sessão bateu a meta diária de pomodoros, encerra tudo e manda
  // para a Auditoria de Foco em vez de sugerir mais uma pausa/ciclo.
  const hojeStr = obterDataLocalString(new Date());
  const pomosPorDia = JSON.parse(localStorage.getItem("pomosPorDia")) || {};
  const pomosConcluidos = pomosPorDia[hojeStr] || 0;
  const metaDiaria = obterMetaPomodorosDiaria();

  if (metaDiaria > 0 && pomosConcluidos >= metaDiaria) {
    desativarModoIsolamento();
    document.getElementById("pomo-container-titulos").style.display = "none";
    document.getElementById("pomodoro-header-titulo").style.display = "block";
    document.getElementById("timer-display").classList.remove("overtime");
    abrirModalDistracao();
    return;
  }

  document.getElementById("modal-pausa-sugerida").style.display = "flex";

  // A cada 4 pomodoros completos no dia, sugere uma pausa mais longa
  // (técnica clássica do Pomodoro), destacando 15/20/30 min no seletor.
  const aviso = document.getElementById("pausa-longa-aviso");
  const botoesLongos = ["btn-pausa-15", "btn-pausa-20", "btn-pausa-30"];
  const cicloDeQuatro = pomosConcluidos > 0 && pomosConcluidos % 4 === 0;

  if (aviso) aviso.style.display = cicloDeQuatro ? "block" : "none";
  botoesLongos.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle("recomendada", cicloDeQuatro);
  });
}

// Clique numa das opções de pausa (5/10/15/20/30/45/60 min): fecha o
// seletor e inicia a pausa imediatamente, sem sair da tela de foco (a
// classe "modo-isolamento-ativo" não é tocada aqui).
function iniciarPausaComDuracao(minutos, automatica) {
  document.getElementById("modal-pausa-sugerida").style.display = "none";

  tempoRestante = minutos * 60;
  // NÃO mexe em tempoBaseEscolhidoMinutos aqui: essa variável guarda a
  // duração do FOCO (25/30/40/50 min), não a da pausa. Sobrescrevê-la com a
  // duração da pausa corrompia o "tempo base" do ciclo — daí o timer voltar
  // errado pra home depois: resetTimer() usa tempoBaseEscolhidoMinutos para
  // recalcular o próximo pomodoro, e ficava usando a duração da pausa em vez
  // da duração de foco escolhida.
  emOvertime = false;
  tempoOvertimeAcumulado = 0;
  emPausaConfig = true;
  processandoFinalizacaoSessao = false;

  const display = document.getElementById("timer-display");
  display.classList.remove("overtime");
  display.classList.add("pausa-ativa");

  const status = document.getElementById("pomodoro-status");
  if (status) status.innerText = `☕ Pausa de ${minutos} min em andamento...`;

  // Pausa disparada sozinha pela Sessão de Estudo Planejada (sem passar
  // pelo seletor manual) — avisa com um toast pra não ficar silencioso.
  if (automatica) {
    mostrarToastGamificacao(
      "☕",
      "Pausa automática do bloco",
      `${minutos} min`,
    );
  }

  exibirDicaDescanso();
  atualizarBotaoCompletarSessao();
  startTimer();
}

function tickTimer() {
  if (!emOvertime && !emPausaConfig) {
    const restante = Math.round((timestampAlvo - Date.now()) / 1000);
    if (restante > 0) {
      tempoRestante = restante;
      atualizarDisplay(tempoRestante);
    } else {
      tempoRestante = 0;
      atualizarDisplay(0);

      // Só dispara o alarme se ainda não foi disparado (evita repetição ao voltar)
      if (!alarmePendente) {
        alarmePendente = true;
        // Tenta tocar o som agora (pode não funcionar se a aba estiver oculta)
        testarSomAtual();
        // Notificação do sistema (funciona mesmo em segundo plano)
        notificarSeEmSegundoPlano(
          "🎉 Foco concluído!",
          "Você terminou o ciclo de foco. Hora de uma pausa.",
        );
      }

      emOvertime = true;
      tempoOvertimeAcumulado = 0;
      timestampInicioOvertime = Date.now();
      document.getElementById("timer-display").classList.add("overtime");
      atualizarBotaoCompletarSessao();
      salvarEstadoSessaoAtiva();
    }
  } else if (emOvertime) {
    tempoOvertimeAcumulado = Math.floor(
      (Date.now() - timestampInicioOvertime) / 1000,
    );
    atualizarDisplay(tempoOvertimeAcumulado);
  } else if (emPausaConfig) {
    const restante = Math.round((timestampAlvo - Date.now()) / 1000);
    if (restante > 0) {
      tempoRestante = restante;
      atualizarDisplay(tempoRestante);
    } else {
      tempoRestante = 0;
      clearInterval(timer);
      ticarSom("sino");
      notificarSeEmSegundoPlano(
        "☕ Pausa terminada!",
        "Hora de voltar ao foco.",
      );
      emPausaConfig = false;
      resetTimer();

      // Sessão de Estudo Planejada ativa: a pausa era automática, então o
      // próximo pomodoro (já com a matéria certa selecionada) também começa
      // sozinho — sem precisar clicar em "Iniciar Foco" de novo.
      if (planoEstudo) {
        const item = planoEstudo.itens[planoEstudo.indiceAtual];
        atualizarPainelBlocoEstudos();
        mostrarToastGamificacao(
          "▶️",
          "Bloco de estudos",
          item ? `Retomando: ${item.materia}` : "Continuando bloco",
        );
        startTimer();
      }
    }
  }
}

// --- NOTIFICAÇÕES (aba em segundo plano) ---
const tituloOriginalPagina = document.title;
let intervaloBlinkTitulo = null;

// Rótulo curto do que está rodando agora, reaproveitado no título da aba e
// na janela flutuante — um único lugar decide o texto certo pra cada estado.
function obterRotuloStatusAtual() {
  if (emPausaConfig) return "Pausa";
  if (emOvertime) return "Overtime";
  if (emEstadoDeFocoAtivo) return "Foco";
  return "Pronto";
}

// Mantém o título da aba do navegador contando o tempo junto (ex.: "24:22 -
// Foco"), pra dar pra acompanhar o pomodoro sem precisar deixar a aba em
// primeiro plano. Só mexe no título enquanto uma sessão de foco ou pausa
// está de fato rodando; fora disso, devolve o título original da página.
function atualizarTituloAbaComTimer(textoFormatado) {
  // Não disputa com o "🔔 ..." piscando quando um ciclo termina em segundo
  // plano (ver iniciarBlinkTitulo/pararBlinkTitulo) — os dois mexem no
  // document.title e só um pode vencer por vez.
  if (intervaloBlinkTitulo) return;

  if (!emEstadoDeFocoAtivo && !emPausaConfig) {
    if (document.title !== tituloOriginalPagina) {
      document.title = tituloOriginalPagina;
    }
    return;
  }

  document.title = `${textoFormatado} - ${obterRotuloStatusAtual()}`;
}

function iniciarBlinkTitulo(mensagem) {
  pararBlinkTitulo();
  let mostrandoAlerta = false;
  intervaloBlinkTitulo = setInterval(() => {
    document.title = mostrandoAlerta ? tituloOriginalPagina : mensagem;
    mostrandoAlerta = !mostrandoAlerta;
  }, 1000);
}

function pararBlinkTitulo() {
  if (intervaloBlinkTitulo) {
    clearInterval(intervaloBlinkTitulo);
    intervaloBlinkTitulo = null;
    document.title = tituloOriginalPagina;
  }
}

// Pede permissão de notificação uma única vez, na primeira interação real
// do usuário (clicar em "Iniciar Foco") — navegadores exigem um gesto do
// usuário pra esse prompt funcionar bem.
function solicitarPermissaoNotificacao() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// Só notifica (aviso do sistema + título piscando) se a aba estiver em
// segundo plano — se o usuário já está olhando a tela, o alarme sonoro e
// o visual já bastam, notificação extra só atrapalharia.
function notificarSeEmSegundoPlano(titulo, corpo) {
  if (!document.hidden) return;

  iniciarBlinkTitulo(`🔔 ${titulo}`);

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(titulo, { body: corpo });
    } catch (err) {
      console.error("Erro ao mostrar notificação:", err);
    }
  }
}

// --- JANELA FLUTUANTE DO POMODORO (Picture-in-Picture) ---
// Usa a Document Picture-in-Picture API (Chrome, Edge e outros navegadores
// baseados em Chromium) pra abrir uma janelinha sempre-visível com o timer,
// que o usuário pode arrastar pra fora do navegador e deixar por cima de
// qualquer outro app (PDF do edital, apostila, videoaula...). A janela
// compartilha o mesmo contexto JS da aba principal — dá pra montar o DOM
// dela e escutar cliques direto daqui, sem precisar de postMessage.
let janelaPip = null;

// Copia só as variáveis de cor do tema atual (claro/escuro), em vez da
// folha de estilo inteira do app — mantém a janelinha leve e sem herdar
// regras (como o padding do body) que não fazem sentido numa janela tão
// pequena.
function obterVariaveisTemaAtual() {
  const estilos = getComputedStyle(document.documentElement);
  const nomes = [
    "--bg-color",
    "--card-bg",
    "--primary",
    "--text-main",
    "--text-muted",
    "--border",
    "--accent-text",
  ];
  return nomes
    .map((nome) => `${nome}: ${estilos.getPropertyValue(nome).trim()};`)
    .join(" ");
}

async function abrirJanelaPip() {
  if (!("documentPictureInPicture" in window)) {
    await mostrarAlerta(
      "Essa janela flutuante depende de um recurso (Picture-in-Picture) disponível no Chrome, Edge e outros navegadores baseados em Chromium.",
      { icone: "⚠️" },
    );
    return;
  }

  if (janelaPip) {
    janelaPip.focus();
    return;
  }

  try {
    janelaPip = await documentPictureInPicture.requestWindow({
      width: 280,
      height: 190,
    });
  } catch (err) {
    console.error("Erro ao abrir a janela flutuante:", err);
    return;
  }

  const estilo = document.createElement("style");
  estilo.textContent = `
    :root { ${obterVariaveisTemaAtual()} }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      height: 100%;
      background: var(--bg-color);
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }
    .pip-pomodoro {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: var(--text-main);
      user-select: none;
    }
    .pip-status {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--accent-text);
    }
    .pip-timer {
      font-size: 3rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .pip-botoes {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }
    .pip-botoes button {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-main);
      width: 38px;
      height: 38px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pip-botoes button:hover {
      border-color: var(--accent-text);
    }
  `;
  janelaPip.document.head.appendChild(estilo);

  const textoAtual =
    document.getElementById("timer-display")?.innerText || "00:00";
  janelaPip.document.body.innerHTML = `
    <div class="pip-pomodoro">
      <span class="pip-status" id="pip-status">${obterRotuloStatusAtual()}</span>
      <div class="pip-timer" id="pip-timer">${textoAtual}</div>
      <div class="pip-botoes">
        <button type="button" id="pip-btn-pause" title="Pausar/Retomar">⏸️</button>
        <button type="button" id="pip-btn-reset" title="Resetar">↺</button>
      </div>
    </div>
  `;

  janelaPip.document.getElementById("pip-btn-pause").onclick = () => {
    if (emEstadoDeFocoAtivo || emPausaConfig) pauseTimer();
  };
  janelaPip.document.getElementById("pip-btn-reset").onclick = () => {
    confirmarEResetar();
  };

  // O usuário também pode fechar pelo X nativo da janela (ver imagem de
  // referência) — esse evento cobre esse caso, não só o nosso botão.
  janelaPip.addEventListener("pagehide", () => {
    janelaPip = null;
    atualizarBotaoPip();
  });

  atualizarJanelaPip(textoAtual);
  atualizarBotaoPip();
}

function fecharJanelaPip() {
  if (janelaPip) {
    janelaPip.close();
    janelaPip = null;
  }
  atualizarBotaoPip();
}

async function alternarJanelaPip() {
  if (janelaPip) {
    fecharJanelaPip();
  } else {
    await abrirJanelaPip();
  }
}

function atualizarBotaoPip() {
  const btn = document.getElementById("btn-pip-pomodoro");
  if (!btn) return;
  btn.classList.toggle("pip-ativo", !!janelaPip);
  btn.innerText = janelaPip
    ? "🗗 Fechar Janela Flutuante"
    : "🖼️ Janela Flutuante";
}

// Chamado a cada tick (via atualizarDisplay) pra manter a janelinha em
// sincronia com o timer principal — só faz algo se ela estiver aberta.
function atualizarJanelaPip(textoFormatado) {
  if (!janelaPip) return;

  const elTimer = janelaPip.document.getElementById("pip-timer");
  if (elTimer) elTimer.innerText = textoFormatado;

  const elStatus = janelaPip.document.getElementById("pip-status");
  if (elStatus) elStatus.innerText = obterRotuloStatusAtual();

  const elBtnPause = janelaPip.document.getElementById("pip-btn-pause");
  if (elBtnPause) elBtnPause.innerText = pausadoManualmente ? "▶️" : "⏸️";
}

// Quando a aba volta a ficar visível, força uma atualização imediata em vez
// de esperar o próximo tick agendado (que o navegador pode ter atrasado
// bastante enquanto a aba estava em segundo plano), e para o título de
// piscar.
// Sincroniza a aba ativa do Timer de Preparação com o valor salvo no
// navegador assim que a página carrega (a aba de Tempo de Foco já nasce
// certa no HTML, então só precisamos ajustar a de Preparação aqui).
// Sincroniza a aba ativa do Timer de Preparação com o valor atual de
// tempoPreparoMinutos. Não pode rodar só uma vez no DOMContentLoaded: se
// o usuário estiver logado, a sincronização com a nuvem só termina DEPOIS
// do DOMContentLoaded (é assíncrona) e pode trazer um tempoPreparoMinutos
// diferente do salvo neste aparelho — sem repetir essa sincronização
// depois que os dados da nuvem chegam, a aba destacada fica desatualizada
// mesmo com o valor certo em memória. Era exatamente isso que fazia o
// Timer de Preparação rodar de verdade (5/10/15 min) enquanto a aba
// mostrava "Sem preparo" como se estivesse selecionada.
function sincronizarAbaTimerPreparo() {
  document.querySelectorAll(".aba-tempo-preparo").forEach((btn) => {
    btn.classList.toggle(
      "aba-ativa",
      parseInt(btn.dataset.min, 10) === tempoPreparoMinutos,
    );
  });
}

document.addEventListener("DOMContentLoaded", sincronizarAbaTimerPreparo);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    // Se o timer expirou enquanto a aba estava oculta, toca o som agora
    if (alarmePendente && emOvertime) {
      iniciarAudioContext(); // reativa o áudio
      testarSomAtual();
      alarmePendente = false; // não toca de novo
    }
    pararBlinkTitulo();
    if (timer) tickTimer();
  }
});

// Atalhos de teclado: Espaço inicia/pausa/retoma o pomodoro, Esc sai da
// tela cheia do modo foco (sem finalizar a sessão). Ignorado enquanto o
// usuário está digitando em algum campo, pra não atrapalhar formulários.
document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  const estaDigitando =
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    e.target.isContentEditable;
  if (estaDigitando) return;

  // Prova por Questão em andamento: Espaço marca a questão atual (e
  // reinicia o cronômetro pra próxima), em vez de controlar o pomodoro.
  const telaProvaPorQuestao = document.getElementById("tela-prova-por-questao");
  if (
    e.code === "Space" &&
    telaProvaPorQuestao &&
    telaProvaPorQuestao.style.display === "flex"
  ) {
    e.preventDefault();
    marcarQuestaoProvaPorQuestao();
    return;
  }

  if (e.code === "Space") {
    e.preventDefault();
    if (emPreparacao) return; // usa os botões do painel de preparação
    if (!emEstadoDeFocoAtivo && !emPausaConfig) {
      iniciarFocoComPreparacaoSeConfigurada(startTimer);
    } else {
      pauseTimer();
    }
  } else if (e.key === "Escape") {
    if (document.body.classList.contains("modo-isolamento-ativo")) {
      sairDoModoFoco();
    }
  }
});

function finalizarSessao() {
  // Trava contra duplo-clique: se já tem uma finalização em andamento (ex:
  // o usuário clicou de novo antes da tela reagir), ignora o clique extra
  // em vez de gerar um segundo registro da mesma sessão no histórico.
  if (processandoFinalizacaoSessao) return;

  // A sessão foi cumprida na íntegra (o ciclo já entrou em overtime): trata
  // exatamente como o clique em "Completar Sessão" — persiste e oferece a
  // escolha da duração da pausa, em vez de pular direto pra Auditoria de
  // Foco sem nunca dar a opção de pausa e sem contar o tempo extra igual.
  if (emOvertime && !emPausaConfig) {
    abrirSeletorPausa();
    return;
  }

  processandoFinalizacaoSessao = true;
  clearInterval(timer);
  limparEstadoSessaoAtiva();

  // Clicar em "Finalizar" manualmente é uma intervenção direta do usuário
  // no meio do fluxo automático — devolve o controle a ele cancelando o
  // resto da fila do bloco, em vez de continuar decidindo sozinho por trás.
  if (planoEstudo) {
    planoEstudo = null;
    atualizarPainelBlocoEstudos();
    mostrarToastGamificacao(
      "🛑",
      "Bloco de estudos interrompido",
      "Sessão finalizada manualmente",
    );
  }

  if (emPausaConfig) {
    emPausaConfig = false;
    resetTimer();
    return;
  }

  let minOver = Math.floor(tempoOvertimeAcumulado / 60);
  if (minOver > 0) {
    totalOvertimeGeralMinutos += minOver;
    localStorage.setItem(
      "totalOvertimeGeralMinutos",
      totalOvertimeGeralMinutos,
    );
  }

  let calculoLíquido = emOvertime
    ? tempoBaseEscolhidoMinutos
    : Math.floor((tempoBaseEscolhidoMinutos * 60 - tempoRestante) / 60);
  let minutosEstudadosTotais = calculoLíquido + minOver;
  if (minutosEstudadosTotais < 1) minutosEstudadosTotais = 1;

  cacheMinutosSessaoAtual = minutosEstudadosTotais;
  cacheMateriaSessaoAtual = document.getElementById("pomo-materia").value;

  desativarModoIsolamento();
  document.getElementById("pomo-container-titulos").style.display = "none";
  document.getElementById("pomodoro-header-titulo").style.display = "block";
  document.getElementById("timer-display").classList.remove("overtime");

  abrirModalDistracao();
}

function abrirModalDistracao() {
  const checkboxes = document.querySelectorAll(
    '#modal-distracao-container input[type="checkbox"]',
  );
  checkboxes.forEach((cb) => (cb.checked = false));

  // Reseta também os campos do check-out (mood tracker) — sem isso, a
  // seleção da sessão anterior ficaria marcada por engano na próxima.
  checkoutCumpridoSelecionado = null;
  checkoutHumorDepoisSelecionado = null;
  checkoutEstrelasSelecionadas = null;
  checkoutLembreteHumorMostrado = false;
  const modalDistracao = document.getElementById("modal-distracao-container");
  modalDistracao
    .querySelectorAll(".checkin-chip-texto, .checkin-chip-emoji")
    .forEach((btn) => btn.classList.remove("chip-ativa"));
  modalDistracao
    .querySelectorAll(".checkout-estrela")
    .forEach((btn) => btn.classList.remove("estrela-ativa"));

  const lembreteCheckout = document.getElementById("checkout-lembrete-humor");
  if (lembreteCheckout) lembreteCheckout.style.display = "none";

  modalDistracao.style.display = "flex";
}

function fecharModalDistracao() {
  document.getElementById("modal-distracao-container").style.display = "none";
  tempoRestante = parseInt(document.getElementById("pomo-pausa").value) * 60;
  emOvertime = false;
  emPausaConfig = true;
  tempoOvertimeAcumulado = 0;
  startTimer();
}

// Persiste os dados da sessão que acabou de terminar: salva os minutos
// estudados no histórico geral e, se o ciclo completo foi cumprido (chegou
// a entrar em overtime), soma +1 na meta diária de pomodoros.
function persistirSessaoFinalizada(distracoes) {
  const campoNota = document.getElementById("pomo-nota");
  const nota = campoNota ? campoNota.value.trim() : "";

  const temCheckout =
    checkoutEstrelasSelecionadas != null ||
    checkoutCumpridoSelecionado != null ||
    checkoutHumorDepoisSelecionado != null ||
    (distracoes && distracoes.length > 0);

  const mood =
    moodCheckinAtual || temCheckout
      ? {
          checkin: moodCheckinAtual,
          checkout: temCheckout
            ? {
                foco: checkoutEstrelasSelecionadas,
                percentualCumprido: checkoutCumpridoSelecionado,
                humorDepois: checkoutHumorDepoisSelecionado,
                atrapalhou: distracoes || [],
              }
            : null,
        }
      : null;

  salvarProgressoGeral(
    cacheMateriaSessaoAtual,
    cacheMinutosSessaoAtual,
    nota,
    mood,
    tipoSessaoSelecionado,
  );

  if (campoNota) campoNota.value = "";

  moodCheckinAtual = null;
  checkoutEstrelasSelecionadas = null;
  checkoutCumpridoSelecionado = null;
  checkoutHumorDepoisSelecionado = null;

  // Reseta o chip de Tipo de Sessão (opcional) pra próxima sessão não
  // herdar a escolha da anterior sem querer.
  tipoSessaoSelecionado = null;
  const gridTipoSessao = document.getElementById("pomo-tipo-sessao-grid");
  if (gridTipoSessao) {
    gridTipoSessao
      .querySelectorAll(".checkin-chip-texto")
      .forEach((b) => b.classList.remove("chip-ativa"));
  }

  if (emOvertime) {
    registrarPomodoroConcluido();
  }

  cacheMinutosSessaoAtual = 0;
  cacheMateriaSessaoAtual = "";
}

async function pularRegistroDistracao() {
  // 1. Limpa qualquer checkbox que possa ter sido marcado por engano
  const checkboxes = document.querySelectorAll(
    ".grade-checkbox-distracao input",
  );
  checkboxes.forEach((cb) => (cb.checked = false));

  // 2. Define o registro como foco limpo (exemplo de lógica)
  console.log("Foco 100% limpo registrado!");
  localStorage.setItem("ultimaAuditoria", JSON.stringify([]));

  // 3. Persiste a sessão e reseta o timer para a próxima. Se falhar, avisa
  // a pessoa visivelmente em vez de só logar no console — sem isso, uma
  // sessão inteira podia sumir sem nenhum sinal de que algo deu errado.
  const minutosDaSessao = cacheMinutosSessaoAtual;
  try {
    persistirSessaoFinalizada([]);
  } catch (err) {
    console.error("Erro ao persistir sessão:", err);
    await mostrarAlerta(
      `Não consegui salvar essa sessão de estudo (${minutosDaSessao} min). Erro: ${err && err.message ? err.message : err}.\n\nAnote o tempo estudado por segurança e, se o problema persistir, tente exportar/verificar seu backup em Perfil → Dados.`,
      { icone: "⚠️", titulo: "Sessão não foi salva" },
    );
  }
  resetTimer();

  // 4. Fecha o modal
  const modal = document.getElementById("modal-distracao-container");
  if (modal) {
    modal.style.display = "none";
  }

  // 5. Atualiza a interface do painel
  renderizarTodoOPainel();
}

async function confirmarRegistroDistracao() {
  // Primeira tentativa de confirmar sem nenhuma carinha de humor marcada:
  // mostra o lembrete e não fecha o modal ainda. Na tentativa seguinte,
  // segue salvando normalmente — é um lembrete, não uma trava (quem quer
  // pular o humor de propósito ainda pode, sem ficar preso no modal).
  if (!checkoutHumorDepoisSelecionado && !checkoutLembreteHumorMostrado) {
    checkoutLembreteHumorMostrado = true;
    destacarLembreteHumor("checkout");
    return;
  }

  // 1. Capturar distrações selecionadas
  const checkboxes = document.querySelectorAll(
    ".grade-checkbox-distracao input:checked",
  );
  const distracoes = Array.from(checkboxes).map((cb) => cb.value);

  // 2. Persistir os dados: vai dentro de logsSessoes via
  // persistirSessaoFinalizada → salvarProgressoGeral (campo
  // mood.checkout.atrapalhou). É de lá que o card "Maior Vilão" (ver
  // calcularEMostrarEstatisticas) e as tags do histórico diário (ver
  // renderizarHistorico7Dias) leem essa informação.

  // 3. Persiste a sessão (tempo estudado + meta de pomodoros) e reseta o
  // estado do Pomodoro (isso zera o display). Se falhar, avisa a pessoa
  // visivelmente em vez de só logar no console — sem isso, uma sessão
  // inteira podia sumir sem nenhum sinal de que algo deu errado.
  const minutosDaSessao = cacheMinutosSessaoAtual;
  try {
    persistirSessaoFinalizada(distracoes);
  } catch (err) {
    console.error("Erro ao persistir sessão:", err);
    await mostrarAlerta(
      `Não consegui salvar essa sessão de estudo (${minutosDaSessao} min). Erro: ${err && err.message ? err.message : err}.\n\nAnote o tempo estudado por segurança e, se o problema persistir, tente exportar/verificar seu backup em Perfil → Dados.`,
      { icone: "⚠️", titulo: "Sessão não foi salva" },
    );
  }
  resetTimer();

  // 4. Fechar o modal
  const modal = document.getElementById("modal-distracao-container");
  if (modal) {
    modal.style.display = "none";
  }

  // 5. Limpar checkboxes para o próximo uso
  checkboxes.forEach((cb) => (cb.checked = false));

  // 6. Atualizar a interface do painel
  renderizarTodoOPainel();
}

// Só pede confirmação quando resetar realmente descartaria progresso: uma
// sessão de foco (não pausa) com pelo menos 2 minutos decorridos. Resetar
// no início ou durante uma pausa não precisa de confirmação.
async function confirmarEResetar() {
  const emSessaoDeFoco = emEstadoDeFocoAtivo && !emPausaConfig;
  const elapsedSegundos = emOvertime
    ? tempoBaseEscolhidoMinutos * 60 + tempoOvertimeAcumulado
    : tempoBaseEscolhidoMinutos * 60 - tempoRestante;

  const progressoSignificativo = emSessaoDeFoco && elapsedSegundos >= 120;

  if (progressoSignificativo || planoEstudo) {
    let mensagem = "";
    if (progressoSignificativo) {
      mensagem +=
        "Você já estudou alguns minutos nesta sessão. Resetar agora descarta esse progresso sem salvar. ";
    }
    if (planoEstudo) {
      mensagem +=
        "Isso também vai cancelar a Sessão de Estudo Planejada em andamento, junto com o restante da fila de matérias e pausas automáticas. ";
    }
    mensagem += "Quer mesmo resetar?";
    const confirmado = await mostrarConfirmacao(mensagem, {
      icone: "🔄",
      titulo: "Resetar sessão",
      textoConfirmar: "Resetar",
      perigo: true,
    });
    if (!confirmado) return;
  }

  if (planoEstudo) {
    planoEstudo = null;
    atualizarPainelBlocoEstudos();
  }

  resetTimer();
}

function resetTimer() {
  limparEstadoSessaoAtiva();

  // Interrompe o contador
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  // Reseta a variável de tempo para o valor original da configuração (a aba
  // de Tempo de Foco selecionada — tempoBaseEscolhidoMinutos já reflete isso).
  tempoRestante = tempoBaseEscolhidoMinutos * 60;

  // Reseta as flags de estado — sem isso, a 2ª sessão em diante herdava
  // "emOvertime = true" da sessão anterior e o timer nunca mais contava certo.
  emOvertime = false;
  emEstadoDeFocoAtivo = false;
  emPausaConfig = false;
  tempoOvertimeAcumulado = 0;
  timestampAlvo = null;
  timestampInicioOvertime = null;
  pausadoManualmente = false;
  timestampPausaManualInicio = null;
  processandoFinalizacaoSessao = false;

  // Atualiza o display visual
  atualizarDisplay(tempoRestante);
  document.getElementById("timer-display").classList.remove("overtime");
  document.getElementById("timer-display").classList.remove("pausa-ativa");

  // Reseta botões e status
  document.getElementById("btn-start").innerText = "Iniciar Foco";
  document.getElementById("btn-pause").innerText = "Pausar";
  document.getElementById("pomodoro-status").innerText = "Pronto para iniciar!";
  document.getElementById("btn-salvar-parcial").style.display = "none";

  // Reabilita os seletores de configuração (ficavam travados após a 1ª sessão)
  document
    .querySelectorAll(".aba-tempo-foco, .aba-tempo-preparo")
    .forEach((b) => (b.disabled = false));
  document.getElementById("pomo-pausa").disabled = false;

  atualizarBotaoVoltarModoFoco();
  atualizarBotaoCompletarSessao();
}

// Alterna entre pausar e retomar o timer (foco, overtime ou pausa — os três
// contam por timestamp, então retomar só precisa deslocar o alvo pelo
// tempo em que ficou parado).
function pauseTimer() {
  const btn = document.getElementById("btn-pause");

  if (pausadoManualmente) {
    const duracaoParado = Date.now() - timestampPausaManualInicio;
    if (timestampAlvo) timestampAlvo += duracaoParado;
    if (timestampInicioOvertime) timestampInicioOvertime += duracaoParado;

    timer = setInterval(tickTimer, 250);
    pausadoManualmente = false;
    if (btn) btn.innerText = "Pausar";
  } else {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    timestampPausaManualInicio = Date.now();
    pausadoManualmente = true;
    if (btn) btn.innerText = "Retomar";
  }
  salvarEstadoSessaoAtiva();
}
function salvarSessaoIncompleta() {
  // Calcula quanto tempo passou desde o início (exemplo usando uma variável global 'tempoInicio')
  const duracao = Math.floor((new Date() - window.tempoInicio) / 60000);
  const materia = document.getElementById("pomo-materia").value;

  if (duracao > 0) {
    salvarSessaoNoHistorico(duracao, materia);
  }

  resetTimer();
}
function salvarSessaoNoHistorico(minutosFocados, materia) {
  let historico = JSON.parse(localStorage.getItem("historicoFoco") || "[]");

  // Adiciona o registro, mesmo que tenha poucos minutos
  historico.push({
    data: new Date().toISOString(),
    minutos: minutosFocados,
    materia: materia,
  });

  localStorage.setItem("historicoFoco", JSON.stringify(historico));

  // Alimenta também o histórico real usado pelo streak, heatmap e pelo
  // gráfico de distribuição de tempo — sem isso, sessões salvas como
  // "parcial" desapareciam de todas as estatísticas. salvarProgressoGeral()
  // já re-renderiza o painel inteiro (inclusive o gráfico) sozinha.
  if (materia) {
    salvarProgressoGeral(materia, minutosFocados);
  }
}
function obterDataLocalString(d) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function atualizarDisplay(s) {
  const display = document.getElementById("timer-display");
  if (!display) return;

  const minutos = Math.floor(s / 60);
  const segundos = s % 60;

  // Formatação mais limpa e legível
  const textoFormatado = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
  display.innerText = textoFormatado;

  atualizarTituloAbaComTimer(textoFormatado);
  atualizarJanelaPip(textoFormatado);
}

// --- FORMULARIOS DO PERFIL E ESTATISTICAS ---
async function salvarDadosPerfil(e) {
  if (e) e.preventDefault();
  const nome = document.getElementById("perf-nome");
  const cargo = document.getElementById("perf-cargo");
  const bio = document.getElementById("perf-bio");
  if (!nome || !cargo || !bio) return;

  dadosPerfil.nome = nome.value.trim() || dadosPerfil.nome;
  dadosPerfil.cargo = cargo.value.trim() || dadosPerfil.cargo;
  dadosPerfil.bio = bio.value.trim() || dadosPerfil.bio;
  localStorage.setItem("dadosPerfil", JSON.stringify(dadosPerfil));

  // Limpa o formulário ANTES de recarregar, senão o reset() apagava de
  // volta o valor que carregarDadosPerfil() acabou de preencher no campo
  // de bio.
  document.getElementById("perfil-form").reset();
  carregarDadosPerfil();
  calcularEMostrarEstatisticas();
  fecharModalEditarPerfil();
  await mostrarAlerta("Perfil salvo com sucesso.", { icone: "✅" });
}
function carregarDadosPerfil() {
  document.getElementById("lbl-nome-usuario").innerText = dadosPerfil.nome;
  document.getElementById("lbl-cargo-usuario").innerText = dadosPerfil.cargo;
  document.getElementById("perf-nome").placeholder =
    "Nome atual: " + dadosPerfil.nome;
  document.getElementById("perf-cargo").placeholder =
    "Cargo atual: " + dadosPerfil.cargo;

  // O campo de bio mantém o valor salvo visível (em vez de só um
  // placeholder fantasma) pra dar pra editar incrementalmente, já que é
  // um texto mais longo — diferente de nome/cargo, que são curtos.
  const campoBio = document.getElementById("perf-bio");
  campoBio.value = dadosPerfil.bio || "";
  campoBio.placeholder = "Escreva suas notas de motivação aqui...";

  // Exibe a bio de verdade no cartão do perfil — antes ela só ficava
  // guardada no placeholder do formulário e nunca aparecia em lugar nenhum.
  const exibicaoBio = document.getElementById("perfil-bio-exibicao");
  if (exibicaoBio) {
    if (dadosPerfil.bio) {
      exibicaoBio.innerText = `"${dadosPerfil.bio}"`;
      exibicaoBio.style.display = "block";
    } else {
      exibicaoBio.style.display = "none";
    }
  }

  let inc = dadosPerfil.nome.substring(0, 2).toUpperCase();
  document.getElementById("avatar-letras").innerText = inc || "ST";
  aplicarFotoPerfilNaTela();
}

// --- FOTO DE PERFIL ---
// Lê o arquivo escolhido, recorta um quadrado central e redimensiona pra
// 256x256 antes de salvar — assim a imagem fica leve o bastante pra caber
// no localStorage e ser sincronizada com a nuvem sem pesar, não importa
// quão grande era a foto original.
async function selecionarFotoPerfil(event) {
  const arquivo = event.target.files && event.target.files[0];
  if (!arquivo) return;

  if (!arquivo.type.startsWith("image/")) {
    await mostrarAlerta("Escolha um arquivo de imagem (JPG, PNG, etc.).");
    event.target.value = "";
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image();
    img.onload = () => {
      const TAMANHO = 256;
      const canvas = document.createElement("canvas");
      canvas.width = TAMANHO;
      canvas.height = TAMANHO;
      const ctx = canvas.getContext("2d");

      const lado = Math.min(img.width, img.height);
      const origemX = (img.width - lado) / 2;
      const origemY = (img.height - lado) / 2;
      ctx.drawImage(img, origemX, origemY, lado, lado, 0, 0, TAMANHO, TAMANHO);

      fotoPerfilBase64 = canvas.toDataURL("image/jpeg", 0.85);
      localStorage.setItem("fotoPerfilBase64", fotoPerfilBase64);
      aplicarFotoPerfilNaTela();
    };
    img.onerror = async () => {
      await mostrarAlerta(
        "Não consegui abrir essa imagem. Tente outro arquivo.",
      );
    };
    img.src = leitor.result;
  };
  leitor.onerror = async () => {
    await mostrarAlerta("Não consegui ler esse arquivo. Tente novamente.");
  };
  leitor.readAsDataURL(arquivo);

  // Permite escolher o mesmo arquivo de novo depois (ex: trocar, remover,
  // trocar pela mesma foto original) sem o navegador ignorar por já ter
  // sido "selecionado" antes.
  event.target.value = "";
}

async function removerFotoPerfil() {
  const confirmado = await mostrarConfirmacao(
    "Remover a foto de perfil e voltar a mostrar as iniciais do nome?",
    { icone: "🖼️", textoConfirmar: "Remover" },
  );
  if (!confirmado) return;

  fotoPerfilBase64 = null;
  localStorage.removeItem("fotoPerfilBase64");
  aplicarFotoPerfilNaTela();
}

function aplicarFotoPerfilNaTela() {
  const img = document.getElementById("avatar-foto");
  const letras = document.getElementById("avatar-letras");
  const btnRemover = document.getElementById("btn-remover-foto-perfil");
  if (!img || !letras) return;

  if (fotoPerfilBase64) {
    img.src = fotoPerfilBase64;
    img.style.display = "block";
    letras.style.display = "none";
    if (btnRemover) btnRemover.style.display = "inline-block";
  } else {
    img.style.display = "none";
    img.removeAttribute("src");
    letras.style.display = "block";
    if (btnRemover) btnRemover.style.display = "none";
  }
}

function calcularEMostrarEstatisticas() {
  // 1. Horas focadas totais
  let minTot = 0;
  Object.values(historicoEstudos).forEach((v) => (minTot += v));
  document.getElementById("stat-horas-focadas").innerText =
    `${Math.floor(minTot / 60)}h ${(minTot % 60).toString().padStart(2, "0")}m`;

  // 2. Maior Distração ("Maior Vilão"): conta as ocorrências de cada tipo
  // de distração marcada no checkout, olhando o histórico real de sessões
  // (logsSessoes[].mood.checkout.atrapalhou) — que é onde
  // confirmarRegistroDistracao() de fato salva essa informação (ver
  // persistirSessaoFinalizada em script.js).
  //
  // Antes esse card lia de `bancoDistracoes`, um objeto separado que
  // nunca era incrementado em lugar nenhum do código — só existia lido
  // (e nunca escrito) do localStorage, então ficava sempre travado no
  // valor de uma versão antiga do app (ou zerado, pra quem nunca teve
  // esse objeto salvo). `bancoDistracoes` continua na lista de backup
  // (CHAVES_BACKUP) só por compatibilidade com backups antigos que ainda
  // tenham essa chave — não é mais a fonte de dados daqui.
  const contagemDistracoes = {};
  logsSessoes.forEach((log) => {
    const atrapalhou = log.mood?.checkout?.atrapalhou;
    if (!Array.isArray(atrapalhou)) return;
    atrapalhou.forEach((motivo) => {
      contagemDistracoes[motivo] = (contagemDistracoes[motivo] || 0) + 1;
    });
  });
  let mSabotador = "Nenhum";
  let maxOco = 0;
  let totInt = 0;
  Object.keys(contagemDistracoes).forEach((k) => {
    totInt += contagemDistracoes[k];
    if (contagemDistracoes[k] > maxOco) {
      maxOco = contagemDistracoes[k];
      mSabotador = k;
    }
  });
  document.getElementById("stat-maior-distracao").innerText =
    maxOco > 0 ? mSabotador : "Nenhum";
  document.getElementById("stat-maior-distracao-sub").innerText =
    `${totInt} interrupções salvas`;

  // 3. Matéria Líder
  let matLider = "Nenhuma";
  let maxMat = 0;
  Object.keys(tempoPorMateria).forEach((k) => {
    if (tempoPorMateria[k] > maxMat) {
      maxMat = tempoPorMateria[k];
      matLider = k;
    }
  });
  document.getElementById("stat-materia-lider").innerText = matLider;
  document.getElementById("stat-materia-lider-tempo").innerText =
    `${maxMat} min`;

  // 4. Dias Consecutivos
  document.getElementById("stat-dias-consecutivos").innerText =
    document.getElementById("streak-contador-val").innerText;

  // 5. Pico de Produtividade (NOVO)
  let turnos = {
    "🌅 Manhã": 0,
    "☀️ Tarde": 0,
    "🌙 Noite": 0,
    "🦉 Madrugada": 0,
  };
  logsSessoes.forEach((log) => {
    if (log.hora) {
      let horaStr = log.hora.split(":")[0];
      let h = parseInt(horaStr);
      if (h >= 5 && h < 12) turnos["🌅 Manhã"] += log.duracao;
      else if (h >= 12 && h < 18) turnos["☀️ Tarde"] += log.duracao;
      else if (h >= 18 && h < 24) turnos["🌙 Noite"] += log.duracao;
      else turnos["🦉 Madrugada"] += log.duracao;
    }
  });
  let turnoPico = "Nenhum";
  let maxMinTurno = 0;
  Object.keys(turnos).forEach((t) => {
    if (turnos[t] > maxMinTurno) {
      maxMinTurno = turnos[t];
      turnoPico = t;
    }
  });
  document.getElementById("stat-pico-horario").innerText =
    maxMinTurno > 0 ? turnoPico : "Nenhum";

  // 6. Tempo Extra (NOVO E CORRIGIDO)
  document.getElementById("stat-tempo-extra").innerText =
    `${totalOvertimeGeralMinutos} min`;

  // 7. Eficiência Semanal (NOVO)
  let minUltimos7 = 0;
  for (let i = 0; i < 7; i++) {
    let d = new Date();
    d.setDate(new Date().getDate() - i);
    minUltimos7 += historicoEstudos[obterDataLocalString(d)] || 0;
  }
  // Base de cálculo para 100%: Mínimo de 30 min focados por dia na semana (210 min no total)
  let eficiencia =
    minUltimos7 > 0 ? Math.min(100, Math.round((minUltimos7 / 210) * 100)) : 0;
  document.getElementById("stat-eficiencia-semanal").innerText =
    eficiencia + "%";

  // 8. Sessões Totais: quantidade de sessões de estudo registradas
  // (logsSessoes já é a fonte usada pelo resto dessas estatísticas, ver
  // itens 2 e 5 acima) + duração média por sessão, como complemento de
  // "Horas Focadas" (total de tempo) com a contagem de quantas vezes esse
  // tempo foi construído.
  const elSessoesTotais = document.getElementById("stat-sessoes-totais");
  const elSessoesTotaisSub = document.getElementById("stat-sessoes-totais-sub");
  if (elSessoesTotais && elSessoesTotaisSub) {
    const qtdSessoes = logsSessoes.length;
    elSessoesTotais.innerText = qtdSessoes.toLocaleString("pt-BR");
    if (qtdSessoes > 0) {
      const mediaMin = Math.round(minTot / qtdSessoes);
      elSessoesTotaisSub.innerText = `Média de ${mediaMin} min/sessão`;
    } else {
      elSessoesTotaisSub.innerText = "Nenhuma sessão registrada";
    }
  }
}

// --- CONGELAMENTO DE SEQUÊNCIA (streak freeze) ---
// Repõe 1 congelamento por semana (segunda a segunda). Se o dia de ontem
// não teve estudo mas havia um streak rolando até anteontem, consome 1
// congelamento automaticamente e marca ontem como "protegido" — o streak
// não quebra, mas nenhum minuto de estudo é inventado nas estatísticas.
function obterSegundaFeiraDaSemana(data) {
  const d = new Date(data);
  const diaSemana = d.getDay(); // 0 = domingo
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function verificarEAplicarFreezeDeStreak() {
  const hoje = new Date();
  const chaveSemanaAtual = obterDataLocalString(
    obterSegundaFeiraDaSemana(hoje),
  );

  if (semanaReferenciaFreeze !== chaveSemanaAtual) {
    // Virou a semana: repõe o congelamento (não acumula além de 1).
    freezesDisponiveis = 1;
    semanaReferenciaFreeze = chaveSemanaAtual;
    localStorage.setItem(
      "freezesDisponiveis",
      JSON.stringify(freezesDisponiveis),
    );
    localStorage.setItem("semanaReferenciaFreeze", semanaReferenciaFreeze);
  }

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const ontemStr = obterDataLocalString(ontem);

  const anteontem = new Date(hoje);
  anteontem.setDate(anteontem.getDate() - 2);
  const anteontemStr = obterDataLocalString(anteontem);

  const ontemFoiEstudado = historicoEstudos[ontemStr] > 0;
  const ontemJaCongelado = diasCongeladosStreak.includes(ontemStr);
  const haviaStreakAntesDeOntem =
    historicoEstudos[anteontemStr] > 0 ||
    diasCongeladosStreak.includes(anteontemStr);

  if (
    !ontemFoiEstudado &&
    !ontemJaCongelado &&
    haviaStreakAntesDeOntem &&
    freezesDisponiveis > 0
  ) {
    diasCongeladosStreak.push(ontemStr);
    freezesDisponiveis -= 1;
    localStorage.setItem(
      "diasCongeladosStreak",
      JSON.stringify(diasCongeladosStreak),
    );
    localStorage.setItem(
      "freezesDisponiveis",
      JSON.stringify(freezesDisponiveis),
    );
    if (typeof mostrarToastGamificacao === "function") {
      mostrarToastGamificacao(
        "❄️",
        "Sequência protegida!",
        "Você não estudou ontem, mas o congelamento semanal salvou seu streak.",
      );
    }
  }

  // Limpeza: mantém só os últimos 60 dias no registro de congelados.
  if (diasCongeladosStreak.length > 0) {
    const limite = new Date();
    limite.setDate(limite.getDate() - 60);
    const antesLen = diasCongeladosStreak.length;
    diasCongeladosStreak = diasCongeladosStreak.filter(
      (d) => new Date(d) >= limite,
    );
    if (diasCongeladosStreak.length !== antesLen) {
      localStorage.setItem(
        "diasCongeladosStreak",
        JSON.stringify(diasCongeladosStreak),
      );
    }
  }
}

function atualizarIndicadorFreeze() {
  const el = document.getElementById("streak-freeze-indicador");
  if (!el) return;
  if (freezesDisponiveis > 0) {
    el.classList.add("freeze-disponivel");
    el.classList.remove("freeze-usado");
    el.title =
      "Congelamento de sequência disponível: se faltar um dia essa semana, seu streak continua.";
  } else {
    el.classList.remove("freeze-disponivel");
    el.classList.add("freeze-usado");
    el.title = "Congelamento já usado essa semana — repõe na próxima segunda.";
  }
}

function atualizarCalculoStreak() {
  verificarEAplicarFreezeDeStreak();
  atualizarIndicadorFreeze();

  const contaComoEstudado = (dataStr) =>
    historicoEstudos[dataStr] > 0 || diasCongeladosStreak.includes(dataStr);

  let hoje = new Date();
  let streak = 0;
  let verificandoData = new Date(hoje);
  let dataStrHoje = obterDataLocalString(verificandoData);
  verificandoData.setDate(verificandoData.getDate() - 1);
  let dataStrOntem = obterDataLocalString(verificandoData);

  if (!contaComoEstudado(dataStrHoje) && !contaComoEstudado(dataStrOntem)) {
    document.getElementById("streak-contador-val").innerText = `0 dias`;
    return 0;
  }
  verificandoData = contaComoEstudado(dataStrHoje)
    ? new Date(hoje)
    : verificandoData;
  while (true) {
    let dataCheckStr = obterDataLocalString(verificandoData);
    if (contaComoEstudado(dataCheckStr)) {
      streak++;
      verificandoData.setDate(verificandoData.getDate() - 1);
    } else {
      break;
    }
  }
  document.getElementById("streak-contador-val").innerText =
    `${streak} ${streak === 1 ? "dia" : "dias"}`;
  return streak;
}

// --- META DE HORAS SEMANAIS (recorrente, independente de prova) ---
function calcularMinutosSemanaCalendario() {
  const segunda = obterSegundaFeiraDaSemana(new Date());
  const hoje = new Date();
  let minutos = 0;
  for (let d = new Date(segunda); d <= hoje; d.setDate(d.getDate() + 1)) {
    minutos += historicoEstudos[obterDataLocalString(d)] || 0;
  }
  return minutos;
}

function calcularMinutosMesAtual() {
  const hoje = new Date();
  let minutos = 0;
  Object.keys(historicoEstudos).forEach((dataStr) => {
    const partes = dataStr.split("-").map(Number);
    const ano = partes[0];
    const mes = partes[1];
    if (ano === hoje.getFullYear() && mes === hoje.getMonth() + 1) {
      minutos += historicoEstudos[dataStr] || 0;
    }
  });
  return minutos;
}

function atualizarMetaHorasSemanais() {
  const elAtual = document.getElementById("meta-horas-atual");
  const elAlvo = document.getElementById("meta-horas-alvo-texto");
  const elFill = document.getElementById("meta-horas-barra-fill");
  const elMes = document.getElementById("meta-horas-mes-total");
  if (!elAtual || !elAlvo || !elFill) return;

  const minutosSemana = calcularMinutosSemanaCalendario();
  const horasAtual = Math.floor(minutosSemana / 60);
  const minRestoAtual = minutosSemana % 60;

  elAtual.innerText =
    horasAtual > 0
      ? `${horasAtual}h ${minRestoAtual.toString().padStart(2, "0")}min`
      : `${minRestoAtual}min`;
  elAlvo.innerText = `${metaHorasSemanaisAlvo}h`;

  const minutosAlvo = metaHorasSemanaisAlvo * 60;
  const pct =
    minutosAlvo > 0
      ? Math.min(100, Math.round((minutosSemana / minutosAlvo) * 100))
      : 0;
  elFill.style.width = pct + "%";
  elFill.classList.toggle("meta-horas-completa", pct >= 100);

  if (elMes) {
    const horasMes = Math.floor(calcularMinutosMesAtual() / 60);
    elMes.innerText = `Total do mês: ${horasMes}h`;
  }

  const input = document.getElementById("input-meta-horas-semanais");
  if (input && document.activeElement !== input) {
    input.value = metaHorasSemanaisAlvo;
  }
}

function alternarEdicaoMetaHoras() {
  const editor = document.getElementById("meta-horas-editor");
  if (!editor) return;
  const abrindo = editor.style.display === "none" || !editor.style.display;
  editor.style.display = abrindo ? "block" : "none";
  if (abrindo) {
    const input = document.getElementById("input-meta-horas-semanais");
    if (input) {
      input.value = metaHorasSemanaisAlvo;
      input.focus();
    }
  }
}

async function salvarMetaHorasSemanais(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("input-meta-horas-semanais");
  if (!input) return;
  const valor = parseInt(input.value, 10);
  if (!valor || valor <= 0) {
    await mostrarAlerta("Informe um número de horas maior que zero.");
    return;
  }
  metaHorasSemanaisAlvo = valor;
  localStorage.setItem("metaHorasSemanaisAlvo", String(metaHorasSemanaisAlvo));
  const editor = document.getElementById("meta-horas-editor");
  if (editor) editor.style.display = "none";
  atualizarMetaHorasSemanais();
}

function salvarProgressoGeral(materia, minutos, nota, mood, tipoSessao) {
  if (minutos <= 0) return;
  let agora = new Date();
  let hojeStr = obterDataLocalString(agora);
  let horaStr = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  let nomeMateriaFinal = materia || "Estudo Geral";

  historicoEstudos[hojeStr] = (historicoEstudos[hojeStr] || 0) + minutos;
  localStorage.setItem("historicoEstudos", JSON.stringify(historicoEstudos));

  if (materia) {
    tempoPorMateria[materia] = (tempoPorMateria[materia] || 0) + minutos;
    localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));
  }

  logsSessoes.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: hojeStr,
    hora: horaStr,
    materia: nomeMateriaFinal,
    duracao: minutos,
    nota: (nota || "").trim(),
    mood: mood || null,
    tipoSessao: tipoSessao || null,
  });
  localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));

  renderizarTodoOPainel();
}

async function adicionarNovaMateria(e) {
  e.preventDefault();
  let nome = document.getElementById("mat-only-nome").value.trim();
  let metasVinculadas = lerChecklistVinculoMetas("mat-vinc-meta-lista");
  let peso = parseInt(document.getElementById("mat-only-peso").value, 10) || 1;

  if (!nome) return;

  const duplicada = materias.some(
    (m) => m.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (duplicada) {
    await mostrarAlerta(
      `Já existe uma matéria chamada "${nome}". Escolha outro nome ou edite a existente na lista abaixo.`,
    );
    return;
  }

  // A cor é escolhida sozinha (ver gerarCorAutomaticaMateria) — sem
  // formulário de cor pra preencher. Dá pra trocar depois clicando em
  // ✏️ editar na lista de Matérias Cadastradas.
  const cor = gerarCorAutomaticaMateria();

  materias.push({ nome, metasVinculadas, cor, peso });
  localStorage.setItem("materias", JSON.stringify(materias));
  if (!tempoPorMateria[nome]) tempoPorMateria[nome] = 0;
  localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));

  document.getElementById("materia-only-form").reset();
  document.getElementById("mat-only-peso").value = 1;
  renderizarEstrelasPeso(
    "peso-estrelas-container",
    "mat-only-peso",
    1,
    validarFormularioMateria,
  );
  atualizarContadorNomeMateria();
  validarFormularioMateria();

  mostrarToastGamificacao("✅", "Matéria Cadastrada", nome);

  renderizarTodoOPainel();
}

// Constrói os 5 botões de estrela e liga o clique deles ao campo oculto de
// peso, reaproveitado tanto no cadastro quanto na edição de matéria.
function renderizarEstrelasPeso(
  containerId,
  hiddenInputId,
  valorAtual,
  aoMudar,
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "estrela-peso" + (i <= valorAtual ? " ativa" : "");
    btn.textContent = "★";
    btn.title = `Peso ${i}`;
    btn.addEventListener("click", () => {
      document.getElementById(hiddenInputId).value = i;
      renderizarEstrelasPeso(containerId, hiddenInputId, i, aoMudar);
      if (aoMudar) aoMudar();
    });
    container.appendChild(btn);
  }
}

function atualizarContadorNomeMateria() {
  const input = document.getElementById("mat-only-nome");
  const contador = document.getElementById("contador-nome-materia");
  if (input && contador) {
    contador.innerText = `${input.value.length} / 40`;
  }
}

function validarFormularioMateria() {
  const nome = document.getElementById("mat-only-nome").value.trim();
  const btn = document.getElementById("btn-adicionar-materia");
  if (btn) btn.disabled = !nome;
}

// Lista de matérias cadastradas, com editar/excluir
function renderizarMateriasCadastradas() {
  const container = document.getElementById("materias-cadastradas-lista");
  if (!container) return;

  if (materias.length === 0) {
    container.innerHTML =
      '<p class="sessoes-hoje-vazio">Nenhuma matéria cadastrada ainda.</p>';
    return;
  }

  const filtro = obterMetaFiltroAtiva();
  const itensFiltrados = materias
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => !filtro || materiaVinculadaAMeta(m, filtro));

  if (itensFiltrados.length === 0) {
    container.innerHTML =
      '<p class="sessoes-hoje-vazio">Nenhuma matéria vinculada a essa prova ainda.</p>';
    return;
  }

  container.innerHTML = itensFiltrados
    .sort((a, b) => (b.m.peso || 1) - (a.m.peso || 1))
    .map(({ m, i }) => {
      const peso = m.peso || 1;
      const estrelas = "★".repeat(peso) + "☆".repeat(5 - peso);
      const vinculo =
        (m.metasVinculadas || []).length > 0
          ? m.metasVinculadas.map((nm) => `🎯 ${escapeHtml(nm)}`).join(" ")
          : "Isolada";
      const topicos = m.topicos || [];
      const progressoTopicos =
        topicos.length > 0
          ? `<span class="materia-cadastrada-topicos">📋 ${topicos.filter((t) => t.concluido).length}/${topicos.length} tópicos</span>`
          : "";
      return `
        <div class="materia-cadastrada-card">
          <span class="materia-cadastrada-dot" style="background:${m.cor || "#64748b"}"></span>
          <div class="materia-cadastrada-info">
            <span class="materia-cadastrada-nome">${escapeHtml(m.nome)}</span>
            <span class="materia-cadastrada-meta">${estrelas} • ${vinculo}</span>
            ${progressoTopicos}
          </div>
          <div class="materia-cadastrada-acoes">
            <button type="button" title="Editar" onclick="abrirModalEditarMateria(${i})">✏️</button>
            <button type="button" title="Excluir" onclick="excluirMateria(${i})">✕</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// --- REVISÃO ESPAÇADA (algoritmo SM-2, estilo Anki) ---
// Cada TÓPICO (dentro de uma matéria) vira um "cartão" com seu próprio
// fator de facilidade, intervalo e número de repetições — exatamente como
// no Anki. Toda vez que você avalia uma revisão ("Não lembrei" / "Foi
// difícil" / "Lembrei bem"), o intervalo até a próxima revisão aumenta ou
// volta pro início, dependendo de quão bem você lembrou.
// <--- MELHORIA: agora recebe o peso da matéria para ajustar o fator de facilidade
const SRS_PADRAO = (peso = 1) => {
  const fatorBase = Math.max(1.3, 2.5 - (peso - 1) * 0.15);
  return {
    easeFactor: fatorBase,
    interval: 1,
    repeticoes: 0,
    ultimaRevisao: null,
    proximaRevisao: obterDataLocalString(new Date()),
  };
};

// Localiza um tópico pelo id em qualquer matéria (mais robusto que guardar
// índice de matéria, que pode mudar se alguma for excluída).
function encontrarTopicoPorId(topicoId) {
  for (const m of materias) {
    if (!m.topicos) continue;
    const topico = m.topicos.find((t) => t.id === topicoId);
    if (topico) return { materia: m, topico };
  }
  return null;
}

// Tópicos concluídos que ainda não tinham dado de SRS (cadastrados antes
// dessa função existir) ganham um cartão novo, agendado pra revisar hoje —
// assim ninguém fica de fora do sistema novo.
function garantirSrsEmTopicosConcluidos() {
  let mudou = false;
  materias.forEach((m) => {
    (m.topicos || []).forEach((t) => {
      if (t.concluido && !t.srs) {
        t.srs = SRS_PADRAO(m.peso || 1);
        mudou = true;
      }
    });
  });
  if (mudou) localStorage.setItem("materias", JSON.stringify(materias));
}

// Núcleo do SM-2. qualidade: 0 = não lembrei, 3 = foi difícil, 5 = lembrei bem.
function aplicarSM2(srs, qualidade) {
  if (qualidade < 3) {
    srs.repeticoes = 0;
    srs.interval = 1;
  } else {
    if (srs.repeticoes === 0) srs.interval = 1;
    else if (srs.repeticoes === 1) srs.interval = 6;
    else srs.interval = Math.round(srs.interval * srs.easeFactor);
    srs.repeticoes += 1;
  }

  srs.easeFactor = Math.max(
    1.3,
    srs.easeFactor + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02)),
  );

  const hoje = new Date();
  srs.ultimaRevisao = obterDataLocalString(hoje);
  const proxima = new Date(hoje);
  proxima.setDate(proxima.getDate() + srs.interval);
  srs.proximaRevisao = obterDataLocalString(proxima);
}

// Chamada pelos botões de avaliação no card "Revisão Pendente".
function avaliarRevisaoTopico(topicoId, qualidade) {
  const achado = encontrarTopicoPorId(topicoId);
  if (!achado || !achado.topico.srs) return;

  aplicarSM2(achado.topico.srs, qualidade);
  localStorage.setItem("materias", JSON.stringify(materias));

  const legendas = {
    0: "Vamos revisar de novo logo",
    3: "Um pouco mais",
    5: "Ótimo!",
  };
  mostrarToastGamificacao(
    qualidade >= 5 ? "🧠" : qualidade >= 3 ? "🙂" : "🔁",
    `Próxima revisão em ${achado.topico.srs.interval} dia(s)`,
    legendas[qualidade] || "",
  );

  renderizarRevisaoPendente();
}

function calcularTopicosParaRevisar() {
  garantirSrsEmTopicosConcluidos();
  const hojeStr = obterDataLocalString(new Date());
  const resultado = [];

  obterMateriasDoFiltroAtivo().forEach((m) => {
    (m.topicos || []).forEach((t) => {
      if (t.concluido && t.srs && t.srs.proximaRevisao <= hojeStr) {
        const diasAtraso = Math.floor(
          (new Date(hojeStr + "T00:00:00") -
            new Date(t.srs.proximaRevisao + "T00:00:00")) /
            86400000,
        );
        resultado.push({ materia: m, topico: t, diasAtraso });
      }
    });
  });

  resultado.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return resultado;
}

// Marca uma matéria (sem tópicos cadastrados) como revisada manualmente —
// pra quando o usuário estudou por fora do Pomodoro (livro, vídeo, resumo
// no caderno etc.) e não quer que o lembrete continue ativo à toa.
function marcarRevisaoManual(nomeMateria) {
  const materia = materias.find((m) => m.nome === nomeMateria);
  if (!materia) return;

  materia.ultimaRevisaoManual = obterDataLocalString(new Date());
  localStorage.setItem("materias", JSON.stringify(materias));

  mostrarToastGamificacao(
    "✅",
    "Revisão marcada!",
    `${nomeMateria} — contagem reiniciada`,
  );

  renderizarRevisaoPendente();
}

// Heurística antiga, mantida como reserva pra matérias que ainda não têm
// nenhum tópico cadastrado — assim quem não usa sub-tópicos ainda continua
// recebendo algum lembrete, baseado no peso de prioridade da matéria.
function calcularRevisoesPendentes() {
  const hoje = new Date();
  const resultado = [];

  obterMateriasDoFiltroAtivo().forEach((m) => {
    if ((m.topicos || []).length > 0) return; // essa matéria já usa o SM-2 por tópico

    const sessoesDaMateria = logsSessoes.filter((l) => l.materia === m.nome);
    const datasCandidatas = sessoesDaMateria.map((l) => l.data);
    if (m.ultimaRevisaoManual) datasCandidatas.push(m.ultimaRevisaoManual);
    if (datasCandidatas.length === 0) return;

    const dataMaisRecente = datasCandidatas.reduce(
      (max, d) => (d > max ? d : max),
      datasCandidatas[0],
    );
    const dataUltima = new Date(dataMaisRecente + "T00:00:00");
    const diasDesde = Math.floor((hoje - dataUltima) / 86400000);

    const peso = m.peso || 1;
    let limiteDias;
    if (peso >= 4) limiteDias = 3;
    else if (peso === 3) limiteDias = 7;
    else limiteDias = 14;

    if (diasDesde >= limiteDias) {
      resultado.push({ materia: m, diasDesde, limiteDias });
    }
  });

  resultado.sort(
    (a, b) => b.diasDesde - b.limiteDias - (a.diasDesde - a.limiteDias),
  );
  return resultado;
}

function renderizarRevisaoPendente() {
  const card = document.getElementById("card-revisao-pendente");
  const containerTopicos = document.getElementById("revisao-topicos-lista");
  const containerMaterias = document.getElementById("revisao-pendente-lista");
  if (!card || !containerTopicos || !containerMaterias) return;

  const topicosDevidos = calcularTopicosParaRevisar();
  const materiasSemTopicos = calcularRevisoesPendentes();
  const materiasDoFiltro = obterMateriasDoFiltroAtivo();

  const existeAlgumTopicoConcluido = materiasDoFiltro.some((m) =>
    (m.topicos || []).some((t) => t.concluido),
  );
  const algumaMateriaJaEstudada = materiasDoFiltro.some(
    (m) =>
      logsSessoes.some((l) => l.materia === m.nome) || m.ultimaRevisaoManual,
  );

  if (!existeAlgumTopicoConcluido && !algumaMateriaJaEstudada) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  // Tópicos com SM-2 (o sistema "de verdade")
  if (topicosDevidos.length === 0) {
    containerTopicos.innerHTML = existeAlgumTopicoConcluido
      ? '<p class="sessoes-hoje-vazio">Nenhum tópico vencido pra revisar agora. 🎉</p>'
      : "";
  } else {
    containerTopicos.innerHTML = topicosDevidos
      .map(({ materia, topico, diasAtraso }) => {
        const rotuloAtraso =
          diasAtraso <= 0
            ? "Revisar hoje"
            : `Atrasado ${diasAtraso} dia${diasAtraso === 1 ? "" : "s"}`;
        return `
          <div class="revisao-item revisao-item-topico">
            <span class="revisao-dot" style="background:${materia.cor || "#64748b"}"></span>
            <div class="revisao-info">
              <span class="revisao-nome">${escapeHtml(topico.nome)}</span>
              <span class="revisao-dias">${escapeHtml(materia.nome)} · ${rotuloAtraso}</span>
              ${topico.nota ? `<span class="revisao-nota">📝 ${escapeHtml(topico.nota)}</span>` : ""}
            </div>
            <div class="revisao-avaliacao">
              <button type="button" class="revisao-btn-sm2 revisao-btn-ruim" title="Não lembrei" onclick="avaliarRevisaoTopico('${topico.id}', 0)">😵</button>
              <button type="button" class="revisao-btn-sm2 revisao-btn-medio" title="Foi difícil" onclick="avaliarRevisaoTopico('${topico.id}', 3)">😐</button>
              <button type="button" class="revisao-btn-sm2 revisao-btn-bom" title="Lembrei bem" onclick="avaliarRevisaoTopico('${topico.id}', 5)">😄</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Fallback pra matérias sem tópicos cadastrados
  if (materiasSemTopicos.length === 0) {
    containerMaterias.innerHTML = "";
  } else {
    containerMaterias.innerHTML = materiasSemTopicos
      .map(({ materia, diasDesde }) => {
        const nomeEscapado = escapeHtml(materia.nome).replace(/'/g, "\\'");
        return `
          <div class="revisao-item">
            <span class="revisao-dot" style="background:${materia.cor || "#64748b"}"></span>
            <div class="revisao-info">
              <span class="revisao-nome">${escapeHtml(materia.nome)}</span>
              <span class="revisao-dias">Sem revisão há ${diasDesde} dia${diasDesde === 1 ? "" : "s"} · sem tópicos cadastrados</span>
            </div>
            <div class="revisao-acoes">
              <button
                type="button"
                class="revisao-btn-check"
                title="Já revisei isso fora do Pomodoro"
                onclick="marcarRevisaoManual('${nomeEscapado}')"
              >
                ✅
              </button>
              <button
                type="button"
                class="revisao-btn-estudar"
                onclick="iniciarRevisaoRapida('${nomeEscapado}')"
              >
                ▶️ Revisar
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  if (
    topicosDevidos.length === 0 &&
    materiasSemTopicos.length === 0 &&
    existeAlgumTopicoConcluido
  ) {
    containerTopicos.innerHTML =
      '<p class="sessoes-hoje-vazio">Tudo em dia! Nenhuma revisão pendente agora. 🎉</p>';
  }
}

// Atalho de um clique: já seleciona a matéria no timer e começa o foco.
async function iniciarRevisaoRapida(nomeMateria) {
  if (emEstadoDeFocoAtivo || emPausaConfig) {
    await mostrarAlerta(
      "Finalize ou resete a sessão atual antes de iniciar uma revisão rápida.",
    );
    return;
  }
  const select = document.getElementById("pomo-materia");
  if (select) select.value = nomeMateria;

  const cardPomodoro = document.getElementById("modulo-pomodoro");
  if (cardPomodoro) {
    cardPomodoro.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  startTimer();
}

// --- QUESTÕES RESOLVIDAS ---
// --- CADERNO DE ERROS (diagnóstico de causa) ---
// Tradição chinesa de preparação pro Gaokao (错题本): não classifica só
// QUANTO a pessoa errou, mas POR QUÊ — isso muda o plano de ação. Os
// registros de questões (tanto em "Hoje & Registros" quanto no Modo
// Prova) ganham um campo opcional "causasErro" com a contagem de erros
// por motivo; quem não preencher, simplesmente não entra nessa análise.
const LABELS_CAUSA_ERRO = {
  naoSabia: { label: "Não sabia o conteúdo", cor: "#ef4444", icone: "📕" },
  confundiuConceito: {
    label: "Confundi conceitos",
    cor: "#f97316",
    icone: "🔀",
  },
  erroLeitura: {
    label: "Erro de leitura/interpretação",
    cor: "#eab308",
    icone: "👁️",
  },
  faltaAtencao: {
    label: "Falta de atenção/pressa",
    cor: "#8b5cf6",
    icone: "💭",
  },
};

// Lê os 4 campos de diagnóstico de um formulário ("questoes" ou
// "modoprova") e devolve a contagem por causa, a soma total e se a
// pessoa preencheu pelo menos um campo (pra saber se vale a pena
// gravar "causasErro" no registro ou deixar de fora).
function lerCausasErroDoFormulario(prefixo) {
  const camposPorChave = {
    naoSabia: `${prefixo}-erro-nao-sabia`,
    confundiuConceito: `${prefixo}-erro-confundiu`,
    erroLeitura: `${prefixo}-erro-leitura`,
    faltaAtencao: `${prefixo}-erro-atencao`,
  };

  const causas = {};
  let soma = 0;
  let algumPreenchido = false;

  Object.entries(camposPorChave).forEach(([chave, id]) => {
    const el = document.getElementById(id);
    if (el && el.value !== "") algumPreenchido = true;
    const valor = el ? parseInt(el.value, 10) : NaN;
    const n = !isNaN(valor) && valor > 0 ? valor : 0;
    causas[chave] = n;
    soma += n;
  });

  return { causas, soma, algumPreenchido };
}

// Alterna a exibição do campo de texto livre quando a pessoa escolhe
// "Outra..." no select de banca — mesma UX usada em outros selects com
// opção livre no app.
function alternarBancaOutra(prefixo) {
  const select = document.getElementById(`${prefixo}-banca`);
  const outraInput = document.getElementById(`${prefixo}-banca-outra`);
  if (!select || !outraInput) return;
  outraInput.style.display = select.value === "outra" ? "block" : "none";
  if (select.value !== "outra") outraInput.value = "";
}

// Lê o valor final da banca escolhida num formulário ("questoes" ou
// "modoprova") — resolve o "Outra..." pro texto digitado, e devolve null
// quando nada foi especificado (não polui a análise com registros vazios).
function lerBancaDoFormulario(prefixo) {
  const select = document.getElementById(`${prefixo}-banca`);
  if (!select || !select.value) return null;
  if (select.value === "outra") {
    const outraInput = document.getElementById(`${prefixo}-banca-outra`);
    const texto = outraInput ? outraInput.value.trim() : "";
    return texto || null;
  }
  return select.value;
}

// --- REGISTRO DE QUESTÕES: distribuição por banca (multi-linha) ---
// O formulário de "Questões Resolvidas" pede o total da sessão uma vez só
// e deixa a pessoa quebrar esse total em uma linha por banca (banca +
// questões + acertos). Cada linha vira um registro próprio em
// registrosQuestoes, todas com a mesma matéria/tópico/data — é isso que
// faz o Desempenho por Banca Examinadora ficar correto mesmo quando a
// sessão de estudo misturou bancas diferentes, sem precisar preencher o
// formulário inteiro de novo pra cada uma.
let contadorLinhaDistribuicaoQuestoes = 1;

const OPCOES_BANCA_HTML = `
  <option value="">Não especificar</option>
  <option value="CESPE/Cebraspe">CESPE/Cebraspe</option>
  <option value="FGV">FGV</option>
  <option value="FCC">FCC</option>
  <option value="Vunesp">Vunesp</option>
  <option value="IBFC">IBFC</option>
  <option value="IADES">IADES</option>
  <option value="AOCP">AOCP</option>
  <option value="Quadrix">Quadrix</option>
  <option value="IDECAN">IDECAN</option>
  <option value="Instituto Consulplan">Instituto Consulplan</option>
  <option value="outra">Outra...</option>
`;

function criarLinhaDistribuicaoQuestoesHtml(id) {
  return `
    <div class="questoes-distribuicao-linha" data-linha-id="${id}">
      <select
        id="questoes-linha-banca-${id}"
        onchange="alternarBancaOutraLinha(${id})"
      >
        ${OPCOES_BANCA_HTML}
      </select>
      <input
        type="text"
        id="questoes-linha-banca-outra-${id}"
        class="questoes-linha-banca-outra"
        placeholder="Nome da banca"
        style="display: none"
        oninput="atualizarResumoDistribuicaoQuestoes()"
      />
      <input
        type="number"
        id="questoes-linha-total-${id}"
        class="questoes-linha-total"
        min="0"
        placeholder="0"
        oninput="atualizarResumoDistribuicaoQuestoes()"
      />
      <input
        type="number"
        id="questoes-linha-acertos-${id}"
        class="questoes-linha-acertos"
        min="0"
        placeholder="0"
        oninput="atualizarResumoDistribuicaoQuestoes()"
      />
      <button
        type="button"
        class="questoes-linha-remover"
        onclick="removerLinhaDistribuicaoQuestoes(${id})"
        title="Remover banca"
      >
        ✕
      </button>
    </div>
  `;
}

function adicionarLinhaDistribuicaoQuestoes() {
  const container = document.getElementById("questoes-distribuicao-linhas");
  if (!container) return;
  contadorLinhaDistribuicaoQuestoes += 1;
  container.insertAdjacentHTML(
    "beforeend",
    criarLinhaDistribuicaoQuestoesHtml(contadorLinhaDistribuicaoQuestoes),
  );
  atualizarResumoDistribuicaoQuestoes();
}

// Sempre mantém pelo menos 1 linha — não faz sentido "Registrar" sem
// nenhuma linha de distribuição.
function removerLinhaDistribuicaoQuestoes(id) {
  const container = document.getElementById("questoes-distribuicao-linhas");
  if (!container) return;
  if (container.children.length <= 1) return;
  const linha = container.querySelector(`[data-linha-id="${id}"]`);
  if (linha) linha.remove();
  atualizarResumoDistribuicaoQuestoes();
}

function alternarBancaOutraLinha(id) {
  const select = document.getElementById(`questoes-linha-banca-${id}`);
  const outraInput = document.getElementById(
    `questoes-linha-banca-outra-${id}`,
  );
  if (!select || !outraInput) return;
  outraInput.style.display = select.value === "outra" ? "block" : "none";
  if (select.value !== "outra") outraInput.value = "";
  atualizarResumoDistribuicaoQuestoes();
}

// Volta a distribuição pra 1 única linha vazia — chamado depois de
// registrar. A matéria/tópico ficam selecionados (ver registrarQuestoes),
// mas a distribuição de bancas é específica de cada sessão, então essa
// parte reinicia do zero.
function reiniciarLinhasDistribuicaoQuestoes() {
  const container = document.getElementById("questoes-distribuicao-linhas");
  if (!container) return;
  container.innerHTML = "";
  contadorLinhaDistribuicaoQuestoes = 0;
  adicionarLinhaDistribuicaoQuestoes();
}

// Lê todas as linhas com questões > 0 (linhas em branco são ignoradas
// silenciosamente — deixa sobrar uma linha vazia no fim sem dar erro), já
// com o valor final da banca resolvido (trata "Outra...").
function lerLinhasDistribuicaoQuestoes() {
  const container = document.getElementById("questoes-distribuicao-linhas");
  if (!container) return [];
  return [...container.querySelectorAll(".questoes-distribuicao-linha")]
    .map((linha) => {
      const id = linha.dataset.linhaId;
      const selectBanca = document.getElementById(`questoes-linha-banca-${id}`);
      const outraInput = document.getElementById(
        `questoes-linha-banca-outra-${id}`,
      );
      const total = parseInt(
        document.getElementById(`questoes-linha-total-${id}`).value,
        10,
      );
      const acertos = parseInt(
        document.getElementById(`questoes-linha-acertos-${id}`).value,
        10,
      );

      let banca = null;
      if (selectBanca && selectBanca.value) {
        banca =
          selectBanca.value === "outra"
            ? (outraInput ? outraInput.value.trim() : "") || null
            : selectBanca.value;
      }

      return {
        banca,
        total: !isNaN(total) && total > 0 ? total : 0,
        acertos: !isNaN(acertos) && acertos > 0 ? acertos : 0,
      };
    })
    .filter((linha) => linha.total > 0);
}

// Atualiza em tempo real o resumo "Questões distribuídas: X / Y" (com ✓
// quando bate com o total declarado) e o "Aproveitamento geral" — feedback
// visual pra pessoa conferir a distribuição antes de tentar registrar.
function atualizarResumoDistribuicaoQuestoes() {
  const totalDeclarado =
    parseInt(document.getElementById("questoes-total").value, 10) || 0;
  const linhas = lerLinhasDistribuicaoQuestoes();
  const totalDistribuido = linhas.reduce((s, l) => s + l.total, 0);
  const acertosDistribuidos = linhas.reduce((s, l) => s + l.acertos, 0);

  // As questões que sobram da distribuição (total - distribuído) só têm
  // pra onde ir se o Diagnóstico dos erros classificar exatamente essa
  // diferença — elas são, por definição, erros sem banca associada. É
  // esse "fechamento" que faz o total de 50 bater levando em conta tanto
  // os acertos distribuídos quanto os erros diagnosticados.
  const restante = Math.max(totalDeclarado - totalDistribuido, 0);
  const { soma: somaDiagnostico } = lerCausasErroDoFormulario("questoes");
  const diagnosticoFechaRestante = restante > 0 && somaDiagnostico === restante;

  const elStatus = document.getElementById("questoes-distribuicao-status");
  if (elStatus) {
    const bate =
      totalDeclarado > 0 &&
      (totalDistribuido === totalDeclarado || diagnosticoFechaRestante);
    let texto = `Questões distribuídas: ${totalDistribuido} / ${totalDeclarado}`;
    if (totalDistribuido < totalDeclarado && somaDiagnostico > 0) {
      texto += ` (+${somaDiagnostico} no diagnóstico)`;
    }
    texto += bate ? " ✓" : "";
    elStatus.textContent = texto;
    elStatus.classList.toggle("questoes-distribuicao-status-ok", bate);
    elStatus.classList.toggle(
      "questoes-distribuicao-status-pendente",
      !bate && (totalDistribuido > 0 || somaDiagnostico > 0),
    );
  }

  const elAproveitamento = document.getElementById(
    "questoes-distribuicao-aproveitamento",
  );
  if (elAproveitamento) {
    // Se o diagnóstico já fecha o total, o aproveitamento real da sessão
    // usa o total declarado como base (os "restante" são todos errados) —
    // caso contrário, mostra o aproveitamento só do que já foi distribuído.
    if (diagnosticoFechaRestante) {
      elAproveitamento.textContent = `Aproveitamento geral: ${acertosDistribuidos}/${totalDeclarado} → ${(
        (acertosDistribuidos / totalDeclarado) *
        100
      )
        .toFixed(1)
        .replace(".", ",")}%`;
    } else if (totalDistribuido > 0) {
      elAproveitamento.textContent = `Aproveitamento geral: ${acertosDistribuidos}/${totalDistribuido} → ${(
        (acertosDistribuidos / totalDistribuido) *
        100
      )
        .toFixed(1)
        .replace(".", ",")}%`;
    } else {
      elAproveitamento.textContent = "";
    }
  }
}

async function registrarQuestoes(event) {
  event.preventDefault();

  const materia =
    document.getElementById("questoes-materia").value || "Estudo Geral";
  const topicoEl = document.getElementById("questoes-topico");
  const topico = topicoEl && topicoEl.value ? topicoEl.value : null;
  const totalDeclarado = parseInt(
    document.getElementById("questoes-total").value,
    10,
  );

  if (!totalDeclarado || totalDeclarado <= 0) {
    await mostrarAlerta(
      "Informe a quantidade total de questões (maior que zero).",
    );
    return;
  }

  const linhas = lerLinhasDistribuicaoQuestoes();
  if (linhas.length === 0) {
    await mostrarAlerta(
      "Preencha ao menos uma linha da distribuição, com a quantidade de questões dessa banca.",
    );
    return;
  }

  const totalDistribuido = linhas.reduce((s, l) => s + l.total, 0);
  if (totalDistribuido > totalDeclarado) {
    await mostrarAlerta(
      `A soma das linhas de distribuição (${totalDistribuido}) não pode ser maior que o total de questões informado (${totalDeclarado}).`,
    );
    return;
  }

  const linhaComAcertoInvalido = linhas.find((l) => l.acertos > l.total);
  if (linhaComAcertoInvalido) {
    await mostrarAlerta(
      "Os acertos de uma linha não podem ser maiores que as questões dessa mesma linha.",
    );
    return;
  }

  const acertosTotais = linhas.reduce((s, l) => s + l.acertos, 0);
  const { causas, soma, algumPreenchido } =
    lerCausasErroDoFormulario("questoes");

  // O que não foi distribuído por banca só fecha o total de duas formas:
  // ou a distribuição já soma o total sozinha (restante = 0), ou o
  // Diagnóstico dos erros classifica exatamente essa diferença — esse
  // restante é, por definição, todo formado por questões erradas sem
  // banca associada.
  const restante = totalDeclarado - totalDistribuido;
  if (restante > 0) {
    if (soma !== restante) {
      await mostrarAlerta(
        soma === 0
          ? `Faltam ${restante} questões para completar o total de ${totalDeclarado}. Adicione uma linha de distribuição (pode ser "Não especificar") ou classifique essas ${restante} no Diagnóstico dos erros.`
          : `A distribuição soma ${totalDistribuido} e o Diagnóstico dos erros soma ${soma}, mas juntos precisam somar exatamente o total declarado (${totalDeclarado}). Ajuste um dos dois — falta${restante - soma === 1 ? "" : "m"} ${Math.abs(restante - soma)} questõe${Math.abs(restante - soma) === 1 ? "" : "s"}.`,
      );
      return;
    }
  } else {
    // Distribuição já fechou o total sozinha: o diagnóstico, se
    // preenchido, só pode classificar até o total de erros já embutido
    // nas linhas (acertos < total de cada linha).
    const errosTotais = totalDeclarado - acertosTotais;
    if (algumPreenchido && soma > errosTotais) {
      await mostrarAlerta(
        `A soma dos motivos de erro (${soma}) não pode ser maior que o total de erros dessa sessão (${errosTotais}).`,
      );
      return;
    }
  }

  // Registro retroativo: se a pessoa escolher uma data no campo, o
  // lançamento (e, consequentemente, o gráfico de Evolução de Questões e
  // as estatísticas "hoje/no total") passam a valer pra aquele dia — não
  // pro dia em que ela abriu o app. Campo vazio cai no comportamento
  // antigo (hoje). Datas futuras não são aceitas.
  const hojeStr = obterDataLocalString(new Date());
  const campoDataQuestoes = document.getElementById("questoes-data");
  const dataEscolhida = campoDataQuestoes ? campoDataQuestoes.value : "";
  if (dataEscolhida && dataEscolhida > hojeStr) {
    await mostrarAlerta(
      "A data do registro não pode ser no futuro. Escolha hoje ou um dia anterior.",
    );
    return;
  }
  const dataRegistro = dataEscolhida || hojeStr;

  // Uma linha de distribuição = um registro próprio (mesma matéria/tópico/
  // data), cada um com sua banca e seu total/acertos — é o que faz o
  // Desempenho por Banca Examinadora ficar correto mesmo numa sessão com
  // várias bancas misturadas.
  linhas.forEach((linha) => {
    registrosQuestoes.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      data: dataRegistro,
      materia,
      topico,
      total: linha.total,
      acertos: linha.acertos,
      banca: linha.banca,
      causasErro: null,
    });
  });

  // O diagnóstico de erros vale pra sessão inteira, não pra uma banca
  // específica (é um só campo no formulário — ver wireframe).
  if (restante > 0) {
    // Essas questões não entraram em nenhuma linha de distribuição — o
    // Diagnóstico classificou exatamente essa diferença, e por definição
    // são todas erradas (banca=null = "Não especificar"). Total > 0 aqui é
    // essencial: é o que faz elas contarem no total geral, no % de
    // acerto, em metas e streaks — além de entrarem no Caderno de Erros.
    registrosQuestoes.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      data: dataRegistro,
      materia,
      topico,
      total: restante,
      acertos: 0,
      banca: null,
      causasErro: causas,
    });
  } else if (algumPreenchido) {
    // Distribuição já soma o total sozinha: o diagnóstico só classifica o
    // motivo de erros que já estão embutidos nas linhas acima, então esse
    // registro fica com total=0 de propósito — não deve contar de novo.
    registrosQuestoes.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      data: dataRegistro,
      materia,
      topico,
      total: 0,
      acertos: 0,
      banca: null,
      causasErro: causas,
    });
  }

  localStorage.setItem("registrosQuestoes", JSON.stringify(registrosQuestoes));

  // Reset: total e distribuição (volta a 1 linha vazia) e diagnóstico.
  // Matéria/tópico ficam selecionados — a próxima sessão da mesma matéria
  // é rápida de registrar de novo.
  document.getElementById("questoes-total").value = "";
  if (campoDataQuestoes) campoDataQuestoes.value = hojeStr;
  reiniciarLinhasDistribuicaoQuestoes();
  ["nao-sabia", "confundiu", "leitura", "atencao"].forEach((sufixo) => {
    const campo = document.getElementById(`questoes-erro-${sufixo}`);
    if (campo) campo.value = "";
  });
  atualizarResumoDistribuicaoQuestoes();

  mostrarToastGamificacao(
    "📝",
    "Questões registradas",
    topico
      ? `${acertosTotais}/${totalDeclarado} acertos em ${materia} › ${topico}`
      : `${acertosTotais}/${totalDeclarado} acertos em ${materia}`,
  );
  renderizarQuestoesResolvidas();
  renderizarMatrizPrioridade();
  renderizarComparativoAvulsasSimulados();
  renderizarRadarCompetencias();
  renderizarCadernoDeErros();
  renderizarDesempenhoPorBanca();
  // Easter egg: fechou a sessão com exatamente 100 questões no total.
  if (totalDeclarado === 100) marcarEasterEgg("cemRedondo");
  // Recalcula XP/nível e checa conquistas (inclusive as de volume de
  // questões) com os novos registros já somados — sem isso, um lançamento
  // (retroativo ou não) só refletia em Conquistas depois de outra ação
  // disparar renderizarTodoOPainel(), então o desbloqueio/toast podia
  // demorar a aparecer ou nem aparecer.
  renderizarGamificacao();
  document.getElementById("questoes-total").focus();
}

// --- REGISTRO DE SESSÃO AVULSA ---
// Registro manual de uma sessão de estudo já concluída (sem passar pelo
// pomodoro/cronômetro). Alimenta as mesmas fontes de dados usadas pelo
// resto do app (historicoEstudos, tempoPorMateria, logsSessoes,
// registrosQuestoes) pra que horas, streak, matéria líder, questões etc.
// contem essa sessão normalmente — e opcionalmente marca o assunto como
// concluído, entrando na fila de revisão espaçada (SM-2).
let contadorVideosRegistroSessao = 0;

function abrirModalRegistrarSessao() {
  const modal = document.getElementById("modal-registrar-sessao");
  if (!modal) return;

  document.getElementById("form-registrar-sessao").reset();
  document.getElementById("ra-videos-lista").innerHTML = "";
  contadorVideosRegistroSessao = 0;

  const campoData = document.getElementById("ra-data");
  if (campoData) campoData.value = obterDataLocalString(new Date());

  popularDisciplinasRegistroSessao();
  atualizarAssuntosRegistroSessao();

  modal.style.display = "flex";
}

function fecharModalRegistrarSessao() {
  const modal = document.getElementById("modal-registrar-sessao");
  if (modal) modal.style.display = "none";
}

function fecharModalRegistrarSessaoSeClicouFora(event) {
  if (event.target.id === "modal-registrar-sessao") {
    fecharModalRegistrarSessao();
  }
}

// Preenche a lista de sugestões de disciplina com as matérias já
// cadastradas — mas o campo continua sendo texto livre (dá pra digitar
// qualquer nome, inclusive uma disciplina ainda não cadastrada).
function popularDisciplinasRegistroSessao() {
  const lista = document.getElementById("ra-lista-disciplinas");
  if (!lista) return;
  lista.innerHTML = obterMateriasOrdenadasPorPeso()
    .map((m) => `<option value="${escapeHtml(m.nome)}"></option>`)
    .join("");
}

// Quando a disciplina digitada bate com uma matéria cadastrada, sugere os
// tópicos/subtópicos dela no campo de assunto — mesmo espírito do
// "Não especificar" nos formulários de questões, só que aqui como texto
// livre em vez de select (a disciplina também pode não estar cadastrada).
function atualizarAssuntosRegistroSessao() {
  const lista = document.getElementById("ra-lista-assuntos");
  const campoDisciplina = document.getElementById("ra-disciplina");
  if (!lista || !campoDisciplina) return;

  const materia = materias.find(
    (m) =>
      m.nome.trim().toLowerCase() ===
      campoDisciplina.value.trim().toLowerCase(),
  );
  const topicos = materia ? materia.topicos || [] : [];
  lista.innerHTML = topicos
    .map((t) => `<option value="${escapeHtml(t.nome)}"></option>`)
    .join("");
}

// Adiciona uma linha de videoaula (nome opcional + duração em H/Min).
function adicionarLinhaVideoRegistroSessao() {
  const lista = document.getElementById("ra-videos-lista");
  if (!lista) return;
  const idx = contadorVideosRegistroSessao++;
  const linha = document.createElement("div");
  linha.className = "ra-video-linha";
  linha.dataset.idx = idx;
  linha.innerHTML = `
    <div class="ra-video-linha-topo">
      <span class="ra-video-numero"></span>
      <input type="text" class="ra-video-nome" placeholder="Nome do Vídeo (Opcional)" />
      <button type="button" class="ra-video-remover" onclick="removerLinhaVideoRegistroSessao(${idx})">Remover</button>
    </div>
    <div class="ra-video-linha-baixo">
      <input type="url" class="ra-video-link" placeholder="🔗 Link do vídeo (opcional)" />
      <input type="number" class="ra-video-horas" min="0" placeholder="H" title="Horas" />
      <input type="number" class="ra-video-min" min="0" max="59" placeholder="Min" title="Minutos" />
    </div>
  `;
  lista.appendChild(linha);
  renumerarVideosRegistroSessao();
}

function removerLinhaVideoRegistroSessao(idx) {
  const lista = document.getElementById("ra-videos-lista");
  if (!lista) return;
  const alvo = lista.querySelector(`.ra-video-linha[data-idx="${idx}"]`);
  if (alvo) alvo.remove();
  renumerarVideosRegistroSessao();
}

// Os rótulos ("Vídeo 1:", "Vídeo 2:"...) são só posicionais — recalculados
// toda vez que uma linha é adicionada ou removida.
function renumerarVideosRegistroSessao() {
  const linhas = document.querySelectorAll("#ra-videos-lista .ra-video-linha");
  linhas.forEach((linha, i) => {
    const numero = linha.querySelector(".ra-video-numero");
    if (numero) numero.innerText = `Vídeo ${i + 1}:`;
  });
}

// Localiza (ou cria) um tópico numa matéria, pra marcar "Estudo Terminado"
// mesmo quando o assunto digitado ainda não existia como subtópico
// cadastrado — mesmo espírito do "+ novo subtópico" dos formulários de
// questões, só que automático aqui.
function encontrarOuCriarTopicoRegistroSessao(materiaObj, nomeAssunto) {
  if (!materiaObj.topicos) materiaObj.topicos = [];
  let topico = materiaObj.topicos.find(
    (t) => t.nome.trim().toLowerCase() === nomeAssunto.trim().toLowerCase(),
  );
  if (!topico) {
    topico = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome: nomeAssunto.trim(),
      concluido: false,
    };
    materiaObj.topicos.push(topico);
  }
  return topico;
}

async function registrarSessaoAvulsa(event) {
  if (event) event.preventDefault();

  const disciplina = document.getElementById("ra-disciplina").value.trim();
  const assunto = document.getElementById("ra-assunto").value.trim();
  const tipo = document.getElementById("ra-tipo").value;
  const dataSessao =
    document.getElementById("ra-data").value ||
    obterDataLocalString(new Date());

  if (!disciplina) {
    await mostrarAlerta("Informe a disciplina da sessão.");
    return;
  }

  const horas = parseInt(document.getElementById("ra-horas").value, 10) || 0;
  const min = parseInt(document.getElementById("ra-min").value, 10) || 0;
  const seg = parseInt(document.getElementById("ra-seg").value, 10) || 0;
  const minutos = Math.round((horas * 3600 + min * 60 + seg) / 60);

  if (minutos <= 0) {
    await mostrarAlerta("Informe a duração da sessão (maior que zero).");
    return;
  }

  const questoesTotalRaw = document.getElementById("ra-questoes-total").value;
  const questoesAcertosRaw = document.getElementById(
    "ra-questoes-acertos",
  ).value;
  const questoesTotal = questoesTotalRaw ? parseInt(questoesTotalRaw, 10) : 0;
  const questoesAcertos = questoesAcertosRaw
    ? parseInt(questoesAcertosRaw, 10)
    : 0;

  if (questoesTotal > 0 && (isNaN(questoesAcertos) || questoesAcertos < 0)) {
    await mostrarAlerta("Informe quantas questões você acertou (0 ou mais).");
    return;
  }
  if (questoesAcertos > questoesTotal) {
    await mostrarAlerta(
      "Acertos não pode ser maior que a quantidade de questões.",
    );
    return;
  }

  const paginasRaw = document.getElementById("ra-paginas").value;
  const paginasLidas = paginasRaw ? parseInt(paginasRaw, 10) : null;
  const materialApoio = document.getElementById("ra-material").value.trim();
  const materialApoioLink = normalizarLinkSessao(
    document.getElementById("ra-material-link").value,
  );
  const comentarios = document.getElementById("ra-comentarios").value.trim();
  const estudoTerminado = document.getElementById("ra-concluido").checked;

  const videoaulas = [];
  document
    .querySelectorAll("#ra-videos-lista .ra-video-linha")
    .forEach((linha) => {
      const nome = linha.querySelector(".ra-video-nome").value.trim();
      const link = normalizarLinkSessao(
        linha.querySelector(".ra-video-link").value,
      );
      const h = parseInt(linha.querySelector(".ra-video-horas").value, 10) || 0;
      const m = parseInt(linha.querySelector(".ra-video-min").value, 10) || 0;
      const duracaoMin = h * 60 + m;
      if (nome || link || duracaoMin > 0) {
        videoaulas.push({ nome: nome || "Vídeo sem nome", link, duracaoMin });
      }
    });

  // Se a disciplina digitada bate com uma matéria cadastrada, o tempo e as
  // questões entram vinculados a ela (mesmo tratamento de "Estudo Geral"
  // usado no resto do app quando não há vínculo).
  const materiaObj = materias.find(
    (m) => m.nome.trim().toLowerCase() === disciplina.toLowerCase(),
  );
  const nomeMateriaFinal = materiaObj ? materiaObj.nome : disciplina;

  historicoEstudos[dataSessao] = (historicoEstudos[dataSessao] || 0) + minutos;
  localStorage.setItem("historicoEstudos", JSON.stringify(historicoEstudos));

  tempoPorMateria[nomeMateriaFinal] =
    (tempoPorMateria[nomeMateriaFinal] || 0) + minutos;
  localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));

  const horaAtual = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  logsSessoes.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: dataSessao,
    hora: horaAtual,
    materia: nomeMateriaFinal,
    duracao: minutos,
    nota: comentarios,
    mood: null,
    tipo,
    assunto: assunto || null,
    questoesTotal: questoesTotal || null,
    questoesAcertos: questoesTotal ? questoesAcertos : null,
    paginasLidas,
    materialApoio: materialApoio || null,
    materialApoioLink,
    videoaulas: videoaulas.length ? videoaulas : null,
  });
  localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));

  if (questoesTotal > 0) {
    registrosQuestoes.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      data: dataSessao,
      materia: nomeMateriaFinal,
      topico: assunto || null,
      total: questoesTotal,
      acertos: questoesAcertos,
      banca: null,
      causasErro: null,
    });
    localStorage.setItem(
      "registrosQuestoes",
      JSON.stringify(registrosQuestoes),
    );
  }

  let avisoRevisao = "";
  if (estudoTerminado) {
    if (materiaObj && assunto) {
      const topico = encontrarOuCriarTopicoRegistroSessao(materiaObj, assunto);
      topico.concluido = true;
      topico.concluidoEm = obterDataLocalString(new Date());
      if (!topico.srs) {
        topico.srs = SRS_PADRAO(materiaObj.peso || 1);
      }
      localStorage.setItem("materias", JSON.stringify(materias));
    } else if (!materiaObj) {
      avisoRevisao =
        " A disciplina digitada ainda não está cadastrada, então o assunto não entrou na fila de revisões — cadastre a disciplina para isso funcionar.";
    } else if (!assunto) {
      avisoRevisao =
        " Informe o assunto para marcá-lo como concluído e entrar na fila de revisões.";
    }
  }

  fecharModalRegistrarSessao();
  mostrarToastGamificacao(
    "",
    "Sessão registrada",
    `${nomeMateriaFinal} · ${minutos} min${avisoRevisao}`,
  );
  renderizarTodoOPainel();
}

// --- LEMBRETES (bilhetes rápidos, sem revisão espaçada) ---
// Diferente do flashcard, o lembrete não tem "frente/verso" nem entra no
// SM-2 — é só um bilhete que fica batendo na tela de boas-vindas até você
// marcar como concluído (ou excluir direto na aba Flashcards). Pode ter
// prioridade "urgente" e/ou uma data associada (prazo de inscrição, data
// da prova...), com destaque visual quando essa data estiver perto.
function criarLembrete(event) {
  if (event) event.preventDefault();

  const input = document.getElementById("lembrete-texto");
  const dataInput = document.getElementById("lembrete-data");
  const prioridadeInput = document.getElementById("lembrete-prioridade");
  const texto = input.value.trim();
  if (!texto) return;

  lembretes.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    texto,
    data: dataInput.value || null,
    prioridade: prioridadeInput.value === "urgente" ? "urgente" : "normal",
    criadoEm: obterDataLocalString(new Date()),
  });
  localStorage.setItem("lembretes", JSON.stringify(lembretes));

  input.value = "";
  dataInput.value = "";
  prioridadeInput.value = "normal";
  renderizarListaLembretes();
  mostrarToastGamificacao("📌", "Lembrete criado", texto.slice(0, 60));
}

function excluirLembrete(id) {
  lembretes = lembretes.filter((l) => l.id !== id);
  localStorage.setItem("lembretes", JSON.stringify(lembretes));
  renderizarListaLembretes();
}

// Urgente sempre primeiro; entre os não-urgentes, quem tem data vem antes
// de quem não tem (ordenado pela mais próxima); sem data nenhuma, o mais
// recente primeiro.
function ordenarLembretes(lista) {
  return lista.slice().sort((a, b) => {
    const aUrgente = a.prioridade === "urgente";
    const bUrgente = b.prioridade === "urgente";
    if (aUrgente !== bUrgente) return aUrgente ? -1 : 1;
    if (a.data && b.data) return a.data.localeCompare(b.data);
    if (a.data && !b.data) return -1;
    if (!a.data && b.data) return 1;
    return (b.criadoEm || "").localeCompare(a.criadoEm || "");
  });
}

// Monta o texto e o nível de urgência visual da data do lembrete (vencido
// / hoje-amanhã-em breve / normal), pra destacar quando estiver próxima.
function formatarBadgeDataLembrete(dataStr) {
  if (!dataStr) return null;
  const hoje = new Date(obterDataLocalString(new Date()) + "T00:00:00");
  const data = new Date(dataStr + "T00:00:00");
  const dias = Math.round((data - hoje) / 86400000);
  const dataFormatada = data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  if (dias < 0)
    return { texto: `Venceu em ${dataFormatada}`, urgencia: "vencido" };
  if (dias === 0) return { texto: "Hoje", urgencia: "proximo" };
  if (dias === 1) return { texto: "Amanhã", urgencia: "proximo" };
  if (dias <= 3) return { texto: `Em ${dias} dias`, urgencia: "proximo" };
  return { texto: dataFormatada, urgencia: "normal" };
}

function montarBadgesLembrete(l) {
  const badgeData = formatarBadgeDataLembrete(l.data);
  let html = "";
  if (l.prioridade === "urgente") {
    html += `<span class="lembrete-badge lembrete-badge-urgente">🔴 Urgente</span>`;
  }
  if (badgeData) {
    const classeExtra =
      badgeData.urgencia === "vencido"
        ? "lembrete-badge-vencido"
        : badgeData.urgencia === "proximo"
          ? "lembrete-badge-proximo"
          : "";
    html += `<span class="lembrete-badge lembrete-badge-data ${classeExtra}">📅 ${badgeData.texto}</span>`;
  }
  return html;
}

function renderizarListaLembretes() {
  const container = document.getElementById("lembretes-lista");
  const vazio = document.getElementById("lembretes-vazio");
  if (!container || !vazio) return;

  if (lembretes.length === 0) {
    vazio.style.display = "block";
    container.innerHTML = "";
    return;
  }
  vazio.style.display = "none";

  container.innerHTML = ordenarLembretes(lembretes)
    .map((l) => {
      const badgeData = formatarBadgeDataLembrete(l.data);
      const destaque =
        l.prioridade === "urgente" ||
        (badgeData && badgeData.urgencia !== "normal");
      return `
        <div class="lembrete-item ${destaque ? "lembrete-item-destaque" : ""}">
          <div class="lembrete-item-conteudo">
            <span class="lembrete-item-texto">${escapeHtml(l.texto)}</span>
            <div class="lembrete-item-badges">${montarBadgesLembrete(l)}</div>
          </div>
          <button
            type="button"
            class="lembrete-item-excluir"
            onclick="excluirLembrete('${l.id}')"
          >
            ✓ Concluído
          </button>
        </div>
      `;
    })
    .join("");
}

// --- IMPORTAR / EXPORTAR FLASHCARDS (CSV e formato Anki) ---
// Pra quem já tem baralhos prontos em outro app ou quer migrar pro Anki e
// continuar usando de lá. O formato CSV é o "nativo" do Estude+ (com
// coluna de matéria); o .txt separado por tab é o formato que o Anki
// entende direto na tela de importação dele.

function baixarArquivoTexto(conteudo, nomeArquivo, tipoMime, comBom) {
  const texto = comBom ? "\uFEFF" + conteudo : conteudo;
  const blob = new Blob([texto], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escaparCampoCsv(valor) {
  const texto = String(valor ?? "");
  if (/[",\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

function exportarFlashcardsCsv() {
  if (anotacoesFlashcards.length === 0) {
    mostrarAlerta("Você ainda não tem nenhum flashcard pra exportar.");
    return;
  }
  const linhas = ["frente,verso,materia,criadoEm"];
  anotacoesFlashcards.forEach((fc) => {
    linhas.push(
      [
        escaparCampoCsv(fc.frente),
        escaparCampoCsv(fc.verso),
        escaparCampoCsv(fc.materia || ""),
        escaparCampoCsv(fc.criadoEm || ""),
      ].join(","),
    );
  });
  // BOM (\uFEFF) ajuda Excel/Numbers a detectar UTF-8 certo e não
  // bagunçar os acentos.
  baixarArquivoTexto(
    linhas.join("\n"),
    "estude-mais-flashcards.csv",
    "text/csv;charset=utf-8",
    true,
  );
  mostrarToastGamificacao(
    "📤",
    "Flashcards exportados",
    `${anotacoesFlashcards.length} card${anotacoesFlashcards.length === 1 ? "" : "s"} em CSV.`,
  );
}

function exportarFlashcardsAnki() {
  if (anotacoesFlashcards.length === 0) {
    mostrarAlerta("Você ainda não tem nenhum flashcard pra exportar.");
    return;
  }
  // Anki lê frente/verso separados por tab; quebras de linha viram <br>
  // (Anki entende HTML simples nos campos) e um tab dentro do texto vira
  // espaço, pra não confundir com o separador de coluna.
  const linhas = anotacoesFlashcards.map((fc) => {
    const frente = (fc.frente || "").replace(/\t/g, " ").replace(/\n/g, "<br>");
    const verso = (fc.verso || "").replace(/\t/g, " ").replace(/\n/g, "<br>");
    return `${frente}\t${verso}`;
  });
  baixarArquivoTexto(
    linhas.join("\n"),
    "estude-mais-flashcards-anki.txt",
    "text/plain;charset=utf-8",
    false,
  );
  mostrarToastGamificacao(
    "📤",
    "Flashcards exportados",
    `${anotacoesFlashcards.length} card${anotacoesFlashcards.length === 1 ? "" : "s"} prontos pra importar no Anki.`,
  );
}

// Parser de CSV com suporte a campos entre aspas (vírgula/quebra de linha
// dentro do campo, aspas duplicadas pra escapar aspas literais) — um
// split(",") simples quebraria em respostas que contêm vírgula.
function analisarLinhasCsv(texto) {
  const linhas = [];
  let linhaAtual = [];
  let campoAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campoAtual += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campoAtual += c;
      }
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === ",") {
      linhaAtual.push(campoAtual);
      campoAtual = "";
    } else if (c === "\n") {
      linhaAtual.push(campoAtual);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campoAtual = "";
    } else if (c !== "\r") {
      campoAtual += c;
    }
  }
  if (campoAtual !== "" || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual);
    linhas.push(linhaAtual);
  }
  return linhas;
}

// Remove marcação HTML comum em exports do Anki (campos lá aceitam HTML)
// e decodifica entidades básicas, pra não sobrar "&lt;div&gt;" literal no
// meio do texto importado.
function limparTextoImportado(texto) {
  return texto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

async function importarArquivoFlashcards(event) {
  const input = event.target;
  const arquivo = input.files && input.files[0];
  if (!arquivo) return;

  const texto = await arquivo.text();
  input.value = ""; // permite selecionar o mesmo arquivo de novo depois

  const linhasBrutas = texto
    .split(/\r\n|\n/)
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));

  if (linhasBrutas.length === 0) {
    await mostrarAlerta("Esse arquivo está vazio.");
    return;
  }

  // Detecta o separador: tab é o padrão do Anki, ponto-e-vírgula é a
  // alternativa mais comum, vírgula (com suporte a aspas) é o padrão CSV.
  const primeiraLinha = linhasBrutas[0];
  let delimitador = ",";
  if (primeiraLinha.includes("\t")) delimitador = "\t";
  else if (!primeiraLinha.includes(",") && primeiraLinha.includes(";"))
    delimitador = ";";

  let linhas;
  if (delimitador === ",") {
    linhas = analisarLinhasCsv(linhasBrutas.join("\n"));
  } else {
    linhas = linhasBrutas.map((l) => l.split(delimitador));
  }

  // Descarta a primeira linha se for claramente um cabeçalho.
  const rotulosFrente = ["frente", "front", "pergunta", "question"];
  const rotulosVerso = ["verso", "back", "resposta", "answer"];
  if (
    linhas.length > 0 &&
    rotulosFrente.includes((linhas[0][0] || "").trim().toLowerCase()) &&
    rotulosVerso.includes((linhas[0][1] || "").trim().toLowerCase())
  ) {
    linhas = linhas.slice(1);
  }

  const existentes = new Set(
    anotacoesFlashcards.map(
      (fc) =>
        `${fc.frente.trim().toLowerCase()}|${fc.verso.trim().toLowerCase()}`,
    ),
  );
  const vistosNesseArquivo = new Set();
  const novos = [];

  linhas.forEach((cols, idx) => {
    const frente = limparTextoImportado((cols[0] || "").trim());
    const verso = limparTextoImportado((cols[1] || "").trim());
    const materia = limparTextoImportado((cols[2] || "").trim());
    if (!frente || !verso) return;

    const chave = `${frente.toLowerCase()}|${verso.toLowerCase()}`;
    if (existentes.has(chave) || vistosNesseArquivo.has(chave)) return;
    vistosNesseArquivo.add(chave);

    novos.push({
      id:
        Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + idx,
      frente,
      verso,
      materia: materia || null,
      criadoEm: obterDataLocalString(new Date()),
      srs: SRS_PADRAO(1),
    });
  });

  const ignorados = linhas.length - novos.length;

  if (novos.length === 0) {
    await mostrarAlerta(
      ignorados > 0
        ? "Todos os flashcards desse arquivo já existem na sua lista."
        : "Nenhum flashcard válido encontrado nesse arquivo. Confira se cada linha tem pelo menos frente e verso.",
    );
    return;
  }

  const confirmou = await mostrarConfirmacao(
    `Encontramos ${novos.length} flashcard${novos.length === 1 ? "" : "s"} novo${novos.length === 1 ? "" : "s"} nesse arquivo${ignorados > 0 ? ` (${ignorados} já existia${ignorados === 1 ? "" : "m"} e foi${ignorados === 1 ? "" : "ram"} ignorado${ignorados === 1 ? "" : "s"})` : ""}. Importar?`,
    { icone: "📥", titulo: "Importar flashcards" },
  );
  if (!confirmou) return;

  anotacoesFlashcards.push(...novos);
  localStorage.setItem(
    "anotacoesFlashcards",
    JSON.stringify(anotacoesFlashcards),
  );
  renderizarListaFlashcards();
  mostrarToastGamificacao(
    "📥",
    "Flashcards importados",
    `${novos.length} novo${novos.length === 1 ? "" : "s"} adicionado${novos.length === 1 ? "" : "s"}.`,
  );
}

// --- FLASHCARDS (anotações próprias, em formato pergunta/resposta) ---
// Alimentam a "Lista de Flashcards" na aba Estudos e, junto com a fila de
// revisão espaçada e as provas mais próximas, a tela de boas-vindas exibida
// toda vez que o app é aberto (ver exibirBoasVindasComFlashcards).
function popularMateriasFlashcard() {
  const lista = document.getElementById("flashcard-lista-materias");
  if (!lista) return;
  lista.innerHTML = obterMateriasOrdenadasPorPeso()
    .map((m) => `<option value="${escapeHtml(m.nome)}"></option>`)
    .join("");
}

function criarFlashcard(event) {
  if (event) event.preventDefault();

  const frenteInput = document.getElementById("flashcard-frente");
  const versoInput = document.getElementById("flashcard-verso");
  const materiaInput = document.getElementById("flashcard-materia");

  const frente = frenteInput.value.trim();
  const verso = versoInput.value.trim();
  const materia = materiaInput.value.trim();

  if (!frente || !verso) return;

  anotacoesFlashcards.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    frente,
    verso,
    materia: materia || null,
    criadoEm: obterDataLocalString(new Date()),
    srs: SRS_PADRAO(1),
  });
  localStorage.setItem(
    "anotacoesFlashcards",
    JSON.stringify(anotacoesFlashcards),
  );

  document.getElementById("form-flashcard").reset();
  renderizarListaFlashcards();
  mostrarToastGamificacao("🗂️", "Flashcard criado", frente.slice(0, 60));
}

async function excluirFlashcard(id) {
  const confirmou = await mostrarConfirmacao("Excluir esse flashcard?", {
    perigo: true,
  });
  if (!confirmou) return;

  anotacoesFlashcards = anotacoesFlashcards.filter((fc) => fc.id !== id);
  localStorage.setItem(
    "anotacoesFlashcards",
    JSON.stringify(anotacoesFlashcards),
  );
  renderizarListaFlashcards();
}

function renderizarListaFlashcards() {
  garantirSrsEmFlashcards();

  const container = document.getElementById("flashcards-lista");
  const vazio = document.getElementById("flashcards-vazio");
  const contagemEl = document.getElementById("flashcards-revisar-contagem");
  const btnRevisar = document.getElementById("flashcards-btn-revisar-agora");

  if (contagemEl && btnRevisar) {
    if (anotacoesFlashcards.length === 0) {
      contagemEl.innerText = "Nenhum flashcard cadastrado ainda.";
      btnRevisar.disabled = true;
    } else {
      const devidos = calcularFlashcardsParaRevisar().length;
      contagemEl.innerText =
        devidos === 0
          ? "Nenhum flashcard pendente de revisão hoje. 🎉"
          : `${devidos} flashcard${devidos === 1 ? "" : "s"} pendente${devidos === 1 ? "" : "s"} de revisão hoje.`;
      btnRevisar.disabled = devidos === 0;
    }
  }

  if (!container || !vazio) return;

  if (anotacoesFlashcards.length === 0) {
    vazio.style.display = "block";
    container.innerHTML = "";
    return;
  }
  vazio.style.display = "none";

  container.innerHTML = anotacoesFlashcards
    .slice()
    .reverse()
    .map(
      (fc) => `
        <div class="flashcard-gerenciar-item">
          <div class="flashcard-gerenciar-frente">${escapeHtml(fc.frente)}</div>
          <div class="flashcard-gerenciar-verso">${escapeHtml(fc.verso)}</div>
          <div class="flashcard-gerenciar-rodape">
            <div class="flashcard-gerenciar-tags">
              ${
                fc.materia
                  ? `<span class="flashcard-gerenciar-materia">${escapeHtml(fc.materia)}</span>`
                  : ""
              }
              <span class="flashcard-gerenciar-status">${rotuloStatusSrsFlashcard(fc.srs)}</span>
            </div>
            <button
              type="button"
              class="flashcard-gerenciar-excluir"
              onclick="excluirFlashcard('${fc.id}')"
            >
              Excluir
            </button>
          </div>
        </div>
      `,
    )
    .join("");
}

// --- REVISÃO ESPAÇADA DOS FLASHCARDS (SM-2, estilo Anki) ---
// Reaproveita o mesmíssimo motor SM-2 (SRS_PADRAO / aplicarSM2) já usado
// pelos tópicos das matérias — cada flashcard vira um "cartão" com seu
// próprio fator de facilidade, intervalo e número de repetições.

// Flashcards criados antes desse recurso existir ainda não têm o campo
// "srs" — ganham um cartão novo aqui, agendado pra hoje.
function garantirSrsEmFlashcards() {
  let mudou = false;
  anotacoesFlashcards.forEach((fc) => {
    if (!fc.srs) {
      fc.srs = SRS_PADRAO(1);
      mudou = true;
    }
  });
  if (mudou) {
    localStorage.setItem(
      "anotacoesFlashcards",
      JSON.stringify(anotacoesFlashcards),
    );
  }
}

function calcularFlashcardsParaRevisar() {
  garantirSrsEmFlashcards();
  const hojeStr = obterDataLocalString(new Date());
  const resultado = [];

  anotacoesFlashcards.forEach((fc) => {
    if (fc.srs.proximaRevisao <= hojeStr) {
      const diasAtraso = Math.floor(
        (new Date(hojeStr + "T00:00:00") -
          new Date(fc.srs.proximaRevisao + "T00:00:00")) /
          86400000,
      );
      resultado.push({ flashcard: fc, diasAtraso });
    }
  });

  resultado.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return resultado;
}

function rotuloStatusSrsFlashcard(srs) {
  if (!srs) return "Novo";
  const hojeStr = obterDataLocalString(new Date());
  if (srs.proximaRevisao <= hojeStr) {
    const diasAtraso = Math.floor(
      (new Date(hojeStr + "T00:00:00") -
        new Date(srs.proximaRevisao + "T00:00:00")) /
        86400000,
    );
    return diasAtraso <= 0 ? "Revisar hoje" : `Atrasado ${diasAtraso}d`;
  }
  const diasFaltam = Math.floor(
    (new Date(srs.proximaRevisao + "T00:00:00") -
      new Date(hojeStr + "T00:00:00")) /
      86400000,
  );
  return `Revisar em ${diasFaltam}d`;
}

let filaRevisaoFlashcards = [];

async function iniciarRevisaoFlashcards() {
  filaRevisaoFlashcards = calcularFlashcardsParaRevisar().map(
    (x) => x.flashcard,
  );
  if (filaRevisaoFlashcards.length === 0) {
    await mostrarAlerta("Nenhum flashcard pendente de revisão agora. 🎉");
    return;
  }
  document.getElementById("modal-revisar-flashcards").style.display = "flex";
  renderizarCardRevisaoFlashcard();
}

function renderizarCardRevisaoFlashcard() {
  const fc = filaRevisaoFlashcards[0];
  if (!fc) return;

  const restantes = filaRevisaoFlashcards.length;
  document.getElementById("revisar-flashcard-contador").innerText =
    `${restantes} flashcard${restantes === 1 ? "" : "s"} restante${restantes === 1 ? "" : "s"}`;
  document.getElementById("revisar-flashcard-materia").innerText =
    fc.materia || "Sem matéria";
  document.getElementById("revisar-flashcard-frente").innerText = fc.frente;
  document.getElementById("revisar-flashcard-verso").innerText = fc.verso;

  document.getElementById("revisar-flashcard-resposta-area").style.display =
    "none";
  document.getElementById("revisar-flashcard-btn-mostrar").style.display =
    "block";
  document.getElementById("revisar-flashcard-avaliacao").style.display = "none";

  atualizarPreviewIntervalosRevisaoFlashcard(fc);
}

function mostrarRespostaRevisaoFlashcard() {
  document.getElementById("revisar-flashcard-resposta-area").style.display =
    "block";
  document.getElementById("revisar-flashcard-btn-mostrar").style.display =
    "none";
  document.getElementById("revisar-flashcard-avaliacao").style.display = "grid";
}

// Simula, sem aplicar de verdade, qual seria o próximo intervalo pra cada
// uma das 4 avaliações — exatamente como o Anki mostra o número de dias
// embaixo de cada botão antes de você clicar nele.
function atualizarPreviewIntervalosRevisaoFlashcard(fc) {
  const qualidades = { errei: 0, dificil: 3, bom: 4, facil: 5 };
  Object.entries(qualidades).forEach(([chave, qualidade]) => {
    const clone = JSON.parse(JSON.stringify(fc.srs));
    aplicarSM2(clone, qualidade);
    const el = document.getElementById(`preview-intervalo-${chave}`);
    if (el)
      el.innerText = `${clone.interval} dia${clone.interval === 1 ? "" : "s"}`;
  });
}

function avaliarRevisaoFlashcard(qualidade) {
  const fc = filaRevisaoFlashcards[0];
  if (!fc) return;

  aplicarSM2(fc.srs, qualidade);
  localStorage.setItem(
    "anotacoesFlashcards",
    JSON.stringify(anotacoesFlashcards),
  );

  // Cada avaliação (independente da nota) conta como uma revisão de
  // verdade pra fins de XP — revisar 20 cards é esforço real, igual
  // completar pomodoros ou acumular minutos estudados.
  totalRevisoesFlashcards++;
  localStorage.setItem(
    "totalRevisoesFlashcards",
    String(totalRevisoesFlashcards),
  );
  // Atualiza XP/nível/conquistas em tempo real (dispara toast de "subiu de
  // nível" ou de conquista nova na hora, sem esperar o próximo carregamento
  // do painel).
  renderizarGamificacao();

  filaRevisaoFlashcards.shift();
  if (filaRevisaoFlashcards.length === 0) {
    mostrarToastGamificacao(
      "🎉",
      "Revisão concluída!",
      "Você revisou todos os flashcards pendentes de hoje.",
    );
    fecharModalRevisarFlashcards();
    return;
  }
  renderizarCardRevisaoFlashcard();
}

function fecharModalRevisarFlashcards() {
  const modal = document.getElementById("modal-revisar-flashcards");
  if (modal) modal.style.display = "none";
  renderizarListaFlashcards();
}

// --- TELA DE BOAS-VINDAS: cards que "você não pode esquecer" ---
// Reúne, num único carrossel viradável (estilo flashcard de verdade), três
// fontes diferentes: (1) tópicos vencidos da revisão espaçada — a fila
// SM-2 que já existia no app —, (2) provas agendadas que estão chegando, e
// (3) os flashcards que a própria pessoa escreveu. Aparece toda vez que o
// app é aberto; se não houver nada relevante pra mostrar, simplesmente não
// abre (não faz sentido incomodar à toa).
let boasVindasCards = [];
let boasVindasIndice = 0;

function montarCardsBoasVindas() {
  const cards = [];

  // 1) Tópicos vencidos da revisão espaçada (até 4, do mais atrasado)
  calcularTopicosParaRevisar()
    .slice(0, 4)
    .forEach(({ materia, topico, diasAtraso }) => {
      cards.push({
        tipo: "revisao",
        rotulo: "🧠 Revisão",
        cor: materia.cor || "#64748b",
        frente: topico.nome,
        subtitulo: materia.nome,
        verso:
          diasAtraso <= 0
            ? "Hoje é o dia de revisar esse tópico."
            : `Atrasado ${diasAtraso} dia${diasAtraso === 1 ? "" : "s"} — bora recuperar o ritmo.`,
      });
    });

  // 2) Provas agendadas nos próximos 21 dias (até 3, da mais próxima)
  const hoje = new Date(obterDataLocalString(new Date()) + "T00:00:00");
  metas
    .filter((m) => m.dataLimite)
    .map((m) => ({
      meta: m,
      dias: Math.round(
        (new Date(m.dataLimite + "T00:00:00") - hoje) / 86400000,
      ),
    }))
    .filter(({ dias }) => dias >= 0 && dias <= 21)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 3)
    .forEach(({ meta, dias }) => {
      cards.push({
        tipo: "prova",
        rotulo: "🎯 Prova Agendada",
        cor: "#ef4444",
        frente: meta.objetivoNome,
        subtitulo:
          dias === 0 ? "É hoje!" : `Faltam ${dias} dia${dias === 1 ? "" : "s"}`,
        verso:
          dias === 0
            ? "É hoje! Respira, você chegou até aqui — boa prova! 🍀"
            : `Faltam ${dias} dia${dias === 1 ? "" : "s"} pra "${meta.objetivoNome}". Bora aproveitar bem esse tempo.`,
      });
    });

  // 3) Flashcards próprios — prioriza os que estão devidos pela revisão
  // espaçada (igual à lógica dos tópicos); se não houver nenhum devido
  // ainda, cai pra uma amostra embaralhada dos cadastrados.
  const flashcardsDevidos = calcularFlashcardsParaRevisar().map(
    (x) => x.flashcard,
  );
  const amostraFlashcards =
    flashcardsDevidos.length > 0
      ? flashcardsDevidos.slice(0, 3)
      : [...anotacoesFlashcards].sort(() => Math.random() - 0.5).slice(0, 3);

  amostraFlashcards.forEach((fc) => {
    cards.push({
      tipo: "flashcard",
      rotulo: "🗂️ Flashcard",
      cor: "#8b5cf6",
      frente: fc.frente,
      subtitulo: fc.materia || "Anotação própria",
      verso: fc.verso,
    });
  });

  return cards;
}

function exibirBoasVindasComFlashcards() {
  boasVindasCards = montarCardsBoasVindas();
  renderizarLembretesBoasVindas();

  if (boasVindasCards.length === 0 && lembretes.length === 0) return;

  document.getElementById("boas-vindas-nome").innerText =
    dadosPerfil.nome || "Estudante";

  const secaoCards = document.getElementById("boas-vindas-cards-secao");
  if (boasVindasCards.length > 0) {
    secaoCards.style.display = "block";
    boasVindasIndice = 0;
    renderizarCardBoasVindas();
  } else {
    secaoCards.style.display = "none";
  }

  document.getElementById("modal-boas-vindas").style.display = "flex";
}

// Lista de lembretes dentro da própria tela de boas-vindas — cada um pode
// ser marcado como concluído ali mesmo, sem precisar sair da tela pra ir
// até a aba Flashcards.
function renderizarLembretesBoasVindas() {
  const secao = document.getElementById("boas-vindas-lembretes-secao");
  const lista = document.getElementById("boas-vindas-lembretes-lista");
  if (!secao || !lista) return;

  if (lembretes.length === 0) {
    secao.style.display = "none";
    return;
  }
  secao.style.display = "block";

  lista.innerHTML = ordenarLembretes(lembretes)
    .map((l) => {
      const badgeData = formatarBadgeDataLembrete(l.data);
      const destaque =
        l.prioridade === "urgente" ||
        (badgeData && badgeData.urgencia !== "normal");
      const badges = montarBadgesLembrete(l);
      return `
        <div class="boas-vindas-lembrete-item ${destaque ? "boas-vindas-lembrete-destaque" : ""}">
          <div class="boas-vindas-lembrete-conteudo">
            <span class="boas-vindas-lembrete-texto">${escapeHtml(l.texto)}</span>
            ${badges ? `<div class="lembrete-item-badges">${badges}</div>` : ""}
          </div>
          <button
            type="button"
            class="boas-vindas-lembrete-concluir"
            onclick="concluirLembreteBoasVindas('${l.id}')"
            title="Marcar como concluído"
          >
            ✓
          </button>
        </div>
      `;
    })
    .join("");
}

function concluirLembreteBoasVindas(id) {
  lembretes = lembretes.filter((l) => l.id !== id);
  localStorage.setItem("lembretes", JSON.stringify(lembretes));
  renderizarLembretesBoasVindas();
  renderizarListaLembretes();

  // Se essa era a última coisa na tela (sem lembretes e sem cards), fecha
  // sozinha em vez de deixar o modal vazio na cara da pessoa.
  if (lembretes.length === 0 && boasVindasCards.length === 0) {
    fecharModalBoasVindas();
  }
}

function renderizarCardBoasVindas() {
  const total = boasVindasCards.length;
  const card = boasVindasCards[boasVindasIndice];
  if (!card) return;

  document
    .getElementById("boas-vindas-flip")
    .classList.remove("boas-vindas-flip-virado");
  document.getElementById("boas-vindas-tipo-rotulo").innerText = card.rotulo;
  document.getElementById("boas-vindas-frente-texto").innerText = card.frente;
  document.getElementById("boas-vindas-frente-sub").innerText = card.subtitulo;
  document.getElementById("boas-vindas-verso-texto").innerText = card.verso;
  document.getElementById("boas-vindas-frente").style.background = card.cor;
  document.getElementById("boas-vindas-contador").innerText =
    `${boasVindasIndice + 1} / ${total}`;
  document.getElementById("boas-vindas-anterior").disabled =
    boasVindasIndice === 0;
  document.getElementById("boas-vindas-proximo").innerText =
    boasVindasIndice === total - 1 ? "Concluir ✓" : "Próximo ▸";
}

function virarCardBoasVindas() {
  document
    .getElementById("boas-vindas-flip")
    .classList.toggle("boas-vindas-flip-virado");
}

function cardBoasVindasAnterior() {
  if (boasVindasIndice > 0) {
    boasVindasIndice--;
    renderizarCardBoasVindas();
  }
}

function cardBoasVindasProximo() {
  if (boasVindasIndice < boasVindasCards.length - 1) {
    boasVindasIndice++;
    renderizarCardBoasVindas();
  } else {
    fecharModalBoasVindas();
  }
}

function fecharModalBoasVindas() {
  const modal = document.getElementById("modal-boas-vindas");
  if (modal) modal.style.display = "none";
}

// Preenche o select de tópico com o conteúdo programático já cadastrado
// pra matéria escolhida (o mesmo usado na revisão espaçada). Sem tópicos
// cadastrados nessa matéria, esconde o campo — não faz sentido obrigar
// a pessoa a criar tópicos só pra registrar uma questão avulsa.
// Popula o select de tópico/subtópico de um formulário de questões
// ("questoes" = Hoje & Registros, "modoprova" = Modo Prova) — as duas
// telas usam a mesma estrutura de matéria+tópico, então compartilham essa
// lógica em vez de duplicar. Preserva a seleção atual quando possível
// (importante depois de cadastrar um subtópico novo: sem isso, o
// re-render geral do painel resetaria a escolha que a pessoa acabou de
// fazer).
function atualizarOpcoesTopico(prefixo) {
  const selectMateria = document.getElementById(`${prefixo}-materia`);
  const wrapper = document.getElementById(`${prefixo}-topico-wrapper`);
  const selectTopico = document.getElementById(`${prefixo}-topico`);
  if (!selectMateria || !wrapper || !selectTopico) return;

  const materia = materias.find((m) => m.nome === selectMateria.value);

  // "Estudo Geral" não é uma matéria cadastrada de verdade — não tem onde
  // vincular um tópico/subtópico, então esconde o bloco inteiro.
  if (!materia) {
    wrapper.style.display = "none";
    selectTopico.innerHTML = '<option value="">Não especificar</option>';
    const bloco = document.getElementById(`${prefixo}-novo-subtopico-bloco`);
    if (bloco) bloco.style.display = "none";
    return;
  }

  const topicos = materia.topicos || [];
  const valorAtual = selectTopico.value;

  // Mostra o bloco mesmo com zero tópicos ainda — é justamente aqui que
  // mora o botão "+ novo", pra cadastrar o primeiro subtópico da matéria.
  wrapper.style.display = "block";
  selectTopico.innerHTML =
    '<option value="">Não especificar</option>' +
    topicos
      .map(
        (t) =>
          `<option value="${escapeHtml(t.nome)}">${escapeHtml(t.nome)}</option>`,
      )
      .join("");

  if ([...selectTopico.options].some((o) => o.value === valorAtual)) {
    selectTopico.value = valorAtual;
  }
}

// Mantidas por compatibilidade com os onclick/onchange já espalhados pelo
// HTML — cada uma só delega pra função genérica acima.
function atualizarOpcoesTopicoQuestoes() {
  atualizarOpcoesTopico("questoes");
}

function alternarNovoSubtopico(prefixo) {
  const bloco = document.getElementById(`${prefixo}-novo-subtopico-bloco`);
  if (!bloco) return;
  const estaAberto = bloco.style.display === "flex";
  bloco.style.display = estaAberto ? "none" : "flex";
  if (!estaAberto) {
    const input = document.getElementById(`${prefixo}-novo-subtopico-input`);
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

// Cadastra um novo subtópico na matéria selecionada, sem sair da tela de
// registro de questões — é o mesmo tipo de item usado no edital (SM-2,
// checklist), só que criado no meio do fluxo de registrar questões em vez
// de precisar abrir "editar matéria" antes.
async function adicionarSubtopicoRapido(prefixo) {
  const selectMateria = document.getElementById(`${prefixo}-materia`);
  const input = document.getElementById(`${prefixo}-novo-subtopico-input`);
  if (!selectMateria || !input) return;

  const materia = materias.find((m) => m.nome === selectMateria.value);
  if (!materia) {
    await mostrarAlerta(
      "Selecione uma matéria cadastrada antes de adicionar um subtópico (não dá pra vincular a 'Estudo Geral').",
    );
    return;
  }

  const nomeSubtopico = input.value.trim();
  if (!nomeSubtopico) {
    await mostrarAlerta("Digite o nome do subtópico.");
    return;
  }

  if (!materia.topicos) materia.topicos = [];
  const jaExiste = materia.topicos.some(
    (t) => t.nome.trim().toLowerCase() === nomeSubtopico.toLowerCase(),
  );
  if (jaExiste) {
    await mostrarAlerta(`"${nomeSubtopico}" já existe em ${materia.nome}.`);
    return;
  }

  materia.topicos.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nome: nomeSubtopico,
    concluido: false,
  });
  localStorage.setItem("materias", JSON.stringify(materias));

  const bloco = document.getElementById(`${prefixo}-novo-subtopico-bloco`);
  if (bloco) bloco.style.display = "none";

  // Repopula o select já com o subtópico novo selecionado antes do
  // re-render geral — o preserve-de-seleção do atualizarOpcoesTopico
  // garante que ele sobrevive ao renderizarTodoOPainel() logo abaixo.
  atualizarOpcoesTopico(prefixo);
  const selectTopico = document.getElementById(`${prefixo}-topico`);
  if (selectTopico) selectTopico.value = nomeSubtopico;

  mostrarToastGamificacao(
    "➕",
    "Subtópico adicionado",
    `"${nomeSubtopico}" agora faz parte de ${materia.nome}`,
  );

  // Outras telas também dependem da lista de tópicos de cada matéria
  // (edital em Cadastro, Matriz de Prioridade, Ritmo Sugerido, Reta
  // Final...) — atualiza tudo de uma vez, no mesmo padrão já usado no
  // resto do app.
  renderizarTodoOPainel();
}

// --- MODO PROVA: cronômetro + insight de tempo médio por questão ---
// Técnica usada em hagwons coreanos e jukus japoneses: treinar velocidade
// sob pressão, não só acumular conteúdo. O tempo cronometrado aqui é
// gravado como um campo opcional (tempoSegundos) dentro do MESMO
// registrosQuestoes usado no resto do app — não é um dataset separado, é
// só uma forma mais completa de registrar um lote de questões, então esses
// registros também entram nas análises normais (Desempenho, Matriz de
// Prioridade etc.).
let cronometroProvaSegundos = 0;
let cronometroProvaIntervalo = null;
let cronometroProvaRodando = false;

function formatarSegundosParaRelogio(totalSegundos) {
  const segundos = Math.max(0, Math.round(totalSegundos));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Aceita "mm:ss", "h:mm:ss" ou só um número (minutos), devolve segundos.
function interpretarTempoDigitado(texto) {
  if (!texto) return null;
  const partes = texto
    .trim()
    .split(":")
    .map((p) => parseInt(p, 10));
  if (partes.some((p) => isNaN(p))) return null;
  if (partes.length === 1) return partes[0] * 60;
  if (partes.length === 2) return partes[0] * 60 + partes[1];
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  return null;
}

function atualizarDisplayCronometroProva() {
  const display = document.getElementById("cronometro-prova-tempo");
  if (display) {
    display.textContent = formatarSegundosParaRelogio(cronometroProvaSegundos);
  }
  const campoManual = document.getElementById("modoprova-tempo-manual");
  if (campoManual) {
    campoManual.value = formatarSegundosParaRelogio(cronometroProvaSegundos);
  }
  atualizarMediaCronometroProva();
}

function atualizarMediaCronometroProva() {
  const mediaEl = document.getElementById("cronometro-prova-media");
  const totalInput = document.getElementById("modoprova-total");
  if (!mediaEl || !totalInput) return;
  const total = parseInt(totalInput.value, 10);
  if (!total || total <= 0 || cronometroProvaSegundos <= 0) {
    mediaEl.textContent = "";
    return;
  }
  const mediaPorQuestao = cronometroProvaSegundos / total;
  mediaEl.textContent = `· ${formatarSegundosParaRelogio(mediaPorQuestao)} por questão`;
}

function iniciarCronometroProva() {
  if (cronometroProvaRodando) return;
  cronometroProvaRodando = true;
  document.getElementById("cronometro-prova-iniciar-btn").style.display =
    "none";
  document.getElementById("cronometro-prova-pausar-btn").style.display =
    "inline-block";
  document.getElementById("cronometro-prova-retomar-btn").style.display =
    "none";
  cronometroProvaIntervalo = setInterval(() => {
    cronometroProvaSegundos += 1;
    atualizarDisplayCronometroProva();
  }, 1000);
}

function pausarCronometroProva() {
  cronometroProvaRodando = false;
  clearInterval(cronometroProvaIntervalo);
  document.getElementById("cronometro-prova-pausar-btn").style.display = "none";
  document.getElementById("cronometro-prova-retomar-btn").style.display =
    "inline-block";
}

function retomarCronometroProva() {
  iniciarCronometroProva();
}

function zerarCronometroProva() {
  cronometroProvaRodando = false;
  clearInterval(cronometroProvaIntervalo);
  cronometroProvaSegundos = 0;
  document.getElementById("cronometro-prova-iniciar-btn").style.display =
    "inline-block";
  document.getElementById("cronometro-prova-pausar-btn").style.display = "none";
  document.getElementById("cronometro-prova-retomar-btn").style.display =
    "none";
  atualizarDisplayCronometroProva();
  const campoManual = document.getElementById("modoprova-tempo-manual");
  if (campoManual) campoManual.value = "";
}

function renderizarSeletorMateriaModoProva() {
  const seletor = document.getElementById("modoprova-materia");
  if (!seletor) return;
  const valorAtual = seletor.value;
  seletor.innerHTML = '<option value="Estudo Geral">Estudo Geral</option>';
  obterMateriasOrdenadasPorPeso().forEach((m) => {
    seletor.innerHTML += `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`;
  });
  if ([...seletor.options].some((o) => o.value === valorAtual)) {
    seletor.value = valorAtual;
  }
  atualizarOpcoesTopicoModoProva();

  const alvoInput = document.getElementById("modoprova-tempo-alvo");
  if (alvoInput) alvoInput.value = obterTempoAlvoModoProva();
}

function atualizarOpcoesTopicoModoProva() {
  atualizarOpcoesTopico("modoprova");
}

// Tempo de referência por questão pra classificar "rápido" x "lento".
// Padrão de 180s (3min) é uma referência comum de concurso, mas fica
// configurável porque cada banca/prova tem seu próprio ritmo.
function obterTempoAlvoModoProva() {
  const salvo = parseInt(
    localStorage.getItem("modoProvaTempoAlvoSegundos"),
    10,
  );
  return !isNaN(salvo) && salvo > 0 ? salvo : 180;
}

function salvarTempoAlvoModoProva() {
  const input = document.getElementById("modoprova-tempo-alvo");
  const valor = parseInt(input.value, 10);
  if (!isNaN(valor) && valor > 0) {
    localStorage.setItem("modoProvaTempoAlvoSegundos", String(valor));
  }
  renderizarInsightTempoPorQuestao();
}

async function registrarModoProva(event) {
  event.preventDefault();

  const materia =
    document.getElementById("modoprova-materia").value || "Estudo Geral";
  const topicoEl = document.getElementById("modoprova-topico");
  const topico = topicoEl && topicoEl.value ? topicoEl.value : null;
  const total = parseInt(document.getElementById("modoprova-total").value, 10);
  const acertos = parseInt(
    document.getElementById("modoprova-acertos").value,
    10,
  );
  const tempoTexto = document.getElementById("modoprova-tempo-manual").value;
  const tempoSegundos = interpretarTempoDigitado(tempoTexto);

  if (!total || total <= 0) {
    await mostrarAlerta(
      "Informe a quantidade total de questões (maior que zero).",
    );
    return;
  }
  if (isNaN(acertos) || acertos < 0) {
    await mostrarAlerta("Informe quantas você acertou (0 ou mais).");
    return;
  }
  if (acertos > total) {
    await mostrarAlerta("Acertos não pode ser maior que o total de questões.");
    return;
  }
  if (tempoTexto && tempoSegundos === null) {
    await mostrarAlerta(
      'Não entendi o tempo digitado. Use o formato mm:ss (ex: "45:00").',
    );
    return;
  }

  const erros = total - acertos;
  const { causas, soma, algumPreenchido } =
    lerCausasErroDoFormulario("modoprova");
  if (algumPreenchido && soma > erros) {
    await mostrarAlerta(
      `A soma dos motivos de erro (${soma}) não pode ser maior que o total de erros dessa questão (${erros}).`,
    );
    return;
  }

  registrosQuestoes.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: obterDataLocalString(new Date()),
    materia,
    topico,
    total,
    acertos,
    tempoSegundos: tempoSegundos || null,
    banca: lerBancaDoFormulario("modoprova"),
    causasErro: algumPreenchido ? causas : null,
  });
  localStorage.setItem("registrosQuestoes", JSON.stringify(registrosQuestoes));

  zerarCronometroProva();
  document.getElementById("form-modo-prova").reset();
  alternarBancaOutra("modoprova");
  atualizarOpcoesTopicoModoProva();

  const pct = Math.round((acertos / total) * 100);
  const tempoMsg = tempoSegundos
    ? ` em ${formatarSegundosParaRelogio(tempoSegundos)} (${formatarSegundosParaRelogio(tempoSegundos / total)}/questão)`
    : "";
  mostrarToastGamificacao(
    "⏱️",
    "Lote registrado",
    `${acertos}/${total} acertos (${pct}%)${tempoMsg}`,
  );

  // Mesmo dataset do resto do app — então essas análises também precisam
  // ser atualizadas agora.
  renderizarQuestoesResolvidas();
  renderizarMatrizPrioridade();
  renderizarComparativoAvulsasSimulados();
  renderizarRadarCompetencias();
  renderizarCadernoDeErros();
  renderizarDesempenhoPorBanca();
  renderizarInsightTempoPorQuestao();
}

// Cruza tempo médio por questão x % de acerto, por matéria, e classifica
// em 4 diagnósticos — esse cruzamento é o que separa "não sabe o
// conteúdo" de "sabe, mas é lento demais pro tempo de prova".
function calcularInsightTempoPorQuestao() {
  const tempoAlvo = obterTempoAlvoModoProva();
  const porMateria = {};

  registrosQuestoes
    .filter((r) => r.tempoSegundos != null && r.tempoSegundos > 0)
    .forEach((r) => {
      if (!porMateria[r.materia]) {
        porMateria[r.materia] = { total: 0, acertos: 0, tempoSegundos: 0 };
      }
      porMateria[r.materia].total += r.total;
      porMateria[r.materia].acertos += r.acertos;
      porMateria[r.materia].tempoSegundos += r.tempoSegundos;
    });

  return Object.keys(porMateria)
    .map((nome) => {
      const d = porMateria[nome];
      const pct = Math.round((d.acertos / d.total) * 100);
      const tempoMedio = d.tempoSegundos / d.total;
      const rapido = tempoMedio <= tempoAlvo;
      const preciso = pct >= 70;

      let diagnostico, classe, icone;
      if (preciso && rapido) {
        diagnostico = "Rápido e preciso — ponto forte consolidado";
        classe = "status-pausa";
        icone = "🚀";
      } else if (preciso && !rapido) {
        diagnostico =
          "Sabe o conteúdo, mas é lento — treine velocidade, não teoria";
        classe = "status-atencao";
        icone = "🐢";
      } else if (!preciso && rapido) {
        diagnostico =
          "Responde rápido, mas errando — cuidado com chute ou pressa";
        classe = "status-atencao";
        icone = "⚡";
      } else {
        diagnostico = "Nem sabe, nem tem tempo — prioridade máxima de revisão";
        classe = "status-overtime";
        icone = "🚨";
      }

      return { nome, pct, tempoMedio, diagnostico, classe, icone };
    })
    .sort((a, b) => a.pct - b.pct);
}

function renderizarInsightTempoPorQuestao() {
  const lista = document.getElementById("modoprova-insight-lista");
  if (!lista) return;

  const dados = calcularInsightTempoPorQuestao();

  if (dados.length === 0) {
    lista.innerHTML = `
      <div class="modoprova-vazio">
        <div class="modoprova-vazio-icone">⏱️</div>
        <h3>Ainda não há nada pra mostrar aqui</h3>
        <p>
          Esse painel só se preenche depois que você registrar pelo menos um
          lote de questões <strong>com o tempo informado</strong> — use o
          cronômetro acima (▶️ Iniciar) enquanto resolve as questões, ou
          digite o tempo manualmente no campo "Tempo total gasto" ao
          registrar. Sem essa informação, não tem como calcular o tempo
          médio por questão nem comparar com o % de acerto.
        </p>
      </div>`;
    return;
  }

  lista.innerHTML = dados
    .map(
      (d) => `
      <div class="materia-item" style="border-left: 5px solid var(--border)">
        <strong>${d.icone} ${escapeHtml(d.nome)}</strong>
        <div class="prova-card-linha" style="margin-top: 6px">
          <span>% de acerto</span><strong>${d.pct}%</strong>
        </div>
        <div class="prova-card-linha">
          <span>Tempo médio/questão</span><strong>${formatarSegundosParaRelogio(d.tempoMedio)}</strong>
        </div>
        <span class="status-badge ${d.classe}" style="display: inline-block; margin-top: 6px">${d.diagnostico}</span>
      </div>`,
    )
    .join("");
}

function excluirRegistroQuestoes(id) {
  registrosQuestoes = registrosQuestoes.filter((r) => r.id !== id);
  localStorage.setItem("registrosQuestoes", JSON.stringify(registrosQuestoes));
  renderizarQuestoesResolvidas();
  renderizarMatrizPrioridade();
  renderizarComparativoAvulsasSimulados();
  renderizarRadarCompetencias();
  renderizarCadernoDeErros();
  renderizarDesempenhoPorBanca();
  renderizarInsightTempoPorQuestao();
  renderizarGamificacao();
}

function renderizarQuestoesResolvidas() {
  const seletorMateria = document.getElementById("questoes-materia");
  if (seletorMateria) {
    const valorAtual = seletorMateria.value;
    seletorMateria.innerHTML =
      '<option value="Estudo Geral">Estudo Geral</option>';
    obterMateriasOrdenadasPorPeso().forEach((m) => {
      seletorMateria.innerHTML += `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`;
    });
    if ([...seletorMateria.options].some((o) => o.value === valorAtual)) {
      seletorMateria.value = valorAtual;
    }
  }
  atualizarOpcoesTopicoQuestoes();

  // Com uma prova em foco, considera só as questões de matérias vinculadas
  // a ela (mais "Estudo Geral", que não pertence a nenhuma prova específica
  // e por isso não teria como ser filtrado por uma).
  const filtroProva = obterMetaFiltroAtiva();
  const nomesFiltro = filtroProva
    ? new Set(obterMateriasDoFiltroAtivo().map((m) => m.nome))
    : null;
  const registrosDoFiltro = nomesFiltro
    ? registrosQuestoes.filter((r) => nomesFiltro.has(r.materia))
    : registrosQuestoes;

  const hoje = obterDataLocalString(new Date());
  const registrosHoje = registrosDoFiltro.filter((r) => r.data === hoje);
  const totalHoje = registrosHoje.reduce((s, r) => s + r.total, 0);
  const acertosHoje = registrosHoje.reduce((s, r) => s + r.acertos, 0);
  const totalGeral = registrosDoFiltro.reduce((s, r) => s + r.total, 0);
  const acertosGeral = registrosDoFiltro.reduce((s, r) => s + r.acertos, 0);

  const elHoje = document.getElementById("questoes-stat-hoje");
  if (elHoje) {
    elHoje.innerText =
      totalHoje > 0
        ? `${totalHoje} hoje · ${Math.round((acertosHoje / totalHoje) * 100)}% de acerto`
        : "Nenhuma hoje ainda";
  }

  const elGeral = document.getElementById("questoes-stat-geral");
  if (elGeral) {
    elGeral.innerText =
      totalGeral > 0
        ? `${totalGeral} no total · ${Math.round((acertosGeral / totalGeral) * 100)}% de acerto`
        : "Nenhuma registrada ainda";
  }

  const lista = document.getElementById("questoes-lista-recente");
  if (!lista) return;

  // Ordena pela data do registro (não pela ordem de inserção): com
  // lançamentos retroativos, o mais recente digitado pode ser de um dia
  // passado, então a lista precisa refletir a data real, do dia mais
  // novo pro mais velho (empate = o que foi inserido por último primeiro).
  const recentes = registrosDoFiltro
    .map((r, indiceOriginal) => ({ r, indiceOriginal }))
    .filter(({ r }) => r.total > 0)
    .sort((a, b) => {
      if (a.r.data !== b.r.data) return a.r.data < b.r.data ? 1 : -1;
      return b.indiceOriginal - a.indiceOriginal;
    })
    .slice(0, 8)
    .map(({ r }) => r);
  if (recentes.length === 0) {
    lista.innerHTML = filtroProva
      ? '<p class="sessoes-hoje-vazio">Nenhuma questão registrada para essa prova ainda.</p>'
      : '<p class="sessoes-hoje-vazio">Nenhuma questão registrada ainda.</p>';
    return;
  }

  lista.innerHTML = recentes
    .map((r) => {
      const pct = Math.round((r.acertos / r.total) * 100);
      const materiaLabel = r.topico
        ? `${escapeHtml(r.materia)} › ${escapeHtml(r.topico)}`
        : escapeHtml(r.materia);
      const bancaTag = r.banca
        ? `<span class="questoes-item-banca">${escapeHtml(r.banca)}</span>`
        : "";
      return `
        <div class="questoes-item">
          <div class="questoes-item-info">
            <span class="questoes-item-materia">${materiaLabel}${bancaTag}</span>
            <span class="questoes-item-detalhe">${r.acertos}/${r.total} acertos (${pct}%) · ${r.data.split("-").reverse().join("/")}</span>
          </div>
          <button type="button" onclick="excluirRegistroQuestoes('${r.id}')" title="Excluir registro">✕</button>
        </div>
      `;
    })
    .join("");

  renderizarDesempenhoQuestoes(registrosDoFiltro);
}

// --- DESEMPENHO POR MATÉRIA (questões) ---
// Agrupa os registros de questões por matéria e devolve, pra cada uma, o
// total resolvido, os acertos e o % de acerto — ordenado do pior pro
// melhor desempenho, porque o que a pessoa mais precisa ver de cara é
// onde ela está errando mais, não onde já vai bem.
function calcularDesempenhoPorMateria(registros) {
  const mapa = {};
  registros.forEach((r) => {
    if (!mapa[r.materia]) mapa[r.materia] = { total: 0, acertos: 0 };
    mapa[r.materia].total += r.total;
    mapa[r.materia].acertos += r.acertos;
  });

  return Object.entries(mapa)
    .map(([materia, dados]) => ({
      materia,
      total: dados.total,
      acertos: dados.acertos,
      pct: Math.round((dados.acertos / dados.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);
}

// Renderiza o gráfico de barras horizontais com o % de acerto por matéria
// e destaca, em texto, a matéria com pior desempenho — só quando ela já
// tem um número mínimo de questões resolvidas, pra não apontar "ponto
// fraco" em cima de uma amostra pequena demais (tipo 1 acerto em 1).
function renderizarDesempenhoQuestoes(registrosDoFiltro) {
  registrosQuestoesFiltroAtual = registrosDoFiltro;
  const bloco = document.getElementById("questoes-desempenho-bloco");
  const canvas = document.getElementById("chartQuestoesPorMateria");
  const alerta = document.getElementById("questoes-desempenho-alerta");
  const vazio = document.getElementById("questoes-desempenho-vazio");
  if (!bloco || !canvas) return;

  const desempenho = calcularDesempenhoPorMateria(registrosDoFiltro);

  // Com 0 ou 1 matéria não há o que comparar — esconde o bloco inteiro.
  if (desempenho.length < 2) {
    bloco.style.display = "none";
    if (vazio) vazio.style.display = "block";
    if (graficoQuestoesPorMateria) {
      graficoQuestoesPorMateria.destroy();
      graficoQuestoesPorMateria = null;
    }
    return;
  }
  bloco.style.display = "block";
  if (vazio) vazio.style.display = "none";

  const AMOSTRA_MINIMA = 5;
  const maisFraca = desempenho.find((d) => d.total >= AMOSTRA_MINIMA);
  if (maisFraca && maisFraca.pct < 70) {
    alerta.style.display = "block";
    alerta.innerHTML = `⚠️ Seu menor rendimento é em <strong>${escapeHtml(maisFraca.materia)}</strong>: ${maisFraca.pct}% de acerto em ${maisFraca.total} questões. Pode valer a pena reforçar essa matéria.`;
  } else {
    alerta.style.display = "none";
  }

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  // Altura dinâmica: cada matéria precisa de espaço próprio na barra
  // horizontal, senão o Chart.js espreme tudo numa faixa ilegível.
  canvas.parentElement.style.height = `${Math.max(120, desempenho.length * 42)}px`;

  const cores = desempenho.map((d) => {
    if (d.pct < 60) return "#ef4444";
    if (d.pct < 80) return "#f59e0b";
    return "#10b981";
  });

  if (graficoQuestoesPorMateria) {
    graficoQuestoesPorMateria.destroy();
  }

  graficoQuestoesPorMateria = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: desempenho.map((d) => d.materia),
      datasets: [
        {
          label: "% de acerto",
          data: desempenho.map((d) => d.pct),
          backgroundColor: cores,
          borderRadius: 6,
          maxBarThickness: 22,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (v) => `${v}%`,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        y: {
          ticks: { color: corTextoMuted, font: { family: fonteApp } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) => {
              const d = desempenho[ctx.dataIndex];
              return ` ${d.acertos}/${d.total} acertos (${d.pct}%)`;
            },
          },
        },
      },
    },
  });

  atualizarSelectTopicoDetalhe(registrosDoFiltro);
}

// Só oferece o drill-down por tópico pras matérias que já têm ao menos
// um registro de questão marcado com tópico — não faz sentido oferecer
// a opção pra uma matéria onde tudo foi lançado como "Não especificar".
function atualizarSelectTopicoDetalhe(registrosDoFiltro) {
  const wrapper = document.getElementById("questoes-topico-detalhe-wrapper");
  const select = document.getElementById("questoes-topico-detalhe-select");
  if (!wrapper || !select) return;

  const materiasComTopico = [
    ...new Set(registrosDoFiltro.filter((r) => r.topico).map((r) => r.materia)),
  ].sort();

  if (materiasComTopico.length === 0) {
    wrapper.style.display = "none";
    if (graficoQuestoesPorTopico) {
      graficoQuestoesPorTopico.destroy();
      graficoQuestoesPorTopico = null;
    }
    return;
  }

  wrapper.style.display = "block";
  const valorAtual = select.value;
  select.innerHTML =
    '<option value="">Selecione uma matéria</option>' +
    materiasComTopico
      .map(
        (nome) =>
          `<option value="${escapeHtml(nome)}">${escapeHtml(nome)}</option>`,
      )
      .join("");
  if (materiasComTopico.includes(valorAtual)) {
    select.value = valorAtual;
    renderizarDesempenhoPorTopico(valorAtual);
  }
}

// Mesmo cálculo do desempenho por matéria, só que agrupando por tópico
// dentro de UMA matéria só — reaproveita a mesma lógica de ordenação
// (pior desempenho primeiro).
function calcularDesempenhoPorTopico(materiaNome, registros) {
  const registrosComTopico = registros.filter(
    (r) => r.materia === materiaNome && r.topico,
  );
  const mapa = {};
  registrosComTopico.forEach((r) => {
    if (!mapa[r.topico]) mapa[r.topico] = { total: 0, acertos: 0 };
    mapa[r.topico].total += r.total;
    mapa[r.topico].acertos += r.acertos;
  });

  return Object.entries(mapa)
    .map(([topico, dados]) => ({
      topico,
      total: dados.total,
      acertos: dados.acertos,
      pct: Math.round((dados.acertos / dados.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);
}

function renderizarDesempenhoPorTopico(materiaNome) {
  const wrapperChart = document.getElementById("questoes-topico-chart-wrapper");
  const canvas = document.getElementById("chartQuestoesPorTopico");
  const alerta = document.getElementById("questoes-topico-alerta");
  if (!wrapperChart || !canvas || !alerta) return;

  if (!materiaNome) {
    wrapperChart.style.display = "none";
    alerta.style.display = "none";
    if (graficoQuestoesPorTopico) {
      graficoQuestoesPorTopico.destroy();
      graficoQuestoesPorTopico = null;
    }
    return;
  }

  const desempenho = calcularDesempenhoPorTopico(
    materiaNome,
    registrosQuestoesFiltroAtual,
  );

  if (desempenho.length === 0) {
    wrapperChart.style.display = "none";
    alerta.style.display = "none";
    return;
  }
  wrapperChart.style.display = "block";

  const AMOSTRA_MINIMA = 3;
  const maisFraco = desempenho.find((d) => d.total >= AMOSTRA_MINIMA);
  if (maisFraco && maisFraco.pct < 70) {
    alerta.style.display = "block";
    alerta.innerHTML = `⚠️ Dentro de <strong>${escapeHtml(materiaNome)}</strong>, o tópico com pior rendimento é <strong>${escapeHtml(maisFraco.topico)}</strong>: ${maisFraco.pct}% de acerto em ${maisFraco.total} questões.`;
  } else {
    alerta.style.display = "none";
  }

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  wrapperChart.style.height = `${Math.max(100, desempenho.length * 40)}px`;

  const cores = desempenho.map((d) => {
    if (d.pct < 60) return "#ef4444";
    if (d.pct < 80) return "#f59e0b";
    return "#10b981";
  });

  if (graficoQuestoesPorTopico) {
    graficoQuestoesPorTopico.destroy();
  }

  graficoQuestoesPorTopico = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: desempenho.map((d) => d.topico),
      datasets: [
        {
          label: "% de acerto",
          data: desempenho.map((d) => d.pct),
          backgroundColor: cores,
          borderRadius: 6,
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (v) => `${v}%`,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        y: {
          ticks: { color: corTextoMuted, font: { family: fonteApp } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) => {
              const d = desempenho[ctx.dataIndex];
              return ` ${d.acertos}/${d.total} acertos (${d.pct}%)`;
            },
          },
        },
      },
    },
  });
}
// A ideia é simples mas costuma faltar em app de estudo pra concurso:
// nem toda fraqueza importa igual. Uma matéria que cai pouco na prova
// não compete, em prioridade, com uma que cai muito — então em vez de
// só rankear por % de acerto, cruza com o peso que a pessoa já dá pra
// cada matéria (o mesmo peso usado no ritmo sugerido e na ordenação de
// matérias).
// --- NOTA ESTIMADA / SIMULAÇÃO DE APROVAÇÃO ---
// Junta o peso de cada matéria (o mesmo campo usado na Matriz de
// Prioridade) com o % de acerto dela (a mesma base do Radar de
// Competências) numa média ponderada — a resposta prática de "se a prova
// fosse hoje, eu passaria?", comparada com a nota de corte cadastrada na
// prova. Só entram na conta matérias com amostra mínima de questões, pra
// não deixar uma matéria mal-testada distorcer a estimativa.
function renderizarNotaEstimada() {
  const card = document.getElementById("card-nota-estimada");
  const vazio = document.getElementById("nota-estimada-vazio");
  const corpo = document.getElementById("nota-estimada-corpo");
  if (!card) return;

  // Mesmo fallback do widget "Alvo e Meta": com filtro ativo usa a prova
  // escolhida, sem filtro usa a meta mais recente cadastrada.
  const filtroAtivo = obterMetaFiltroAtiva();
  const metaAtiva =
    (filtroAtivo && metas.find((m) => m.objetivoNome === filtroAtivo)) ||
    metas[metas.length - 1];

  if (!metaAtiva) {
    card.style.display = "none";
    return;
  }

  const materiasDaProva = materias.filter((m) =>
    materiaVinculadaAMeta(m, metaAtiva.objetivoNome),
  );

  const AMOSTRA_MINIMA = 5;
  const desempenho = calcularDesempenhoPorMateria(registrosQuestoes);

  const pontosComDados = [];
  const materiasSemDados = [];
  materiasDaProva.forEach((m) => {
    const d = desempenho.find((x) => x.materia === m.nome);
    if (d && d.total >= AMOSTRA_MINIMA) {
      pontosComDados.push({
        materia: m.nome,
        peso: m.peso || 1,
        pct: d.pct,
      });
    } else {
      materiasSemDados.push(m.nome);
    }
  });

  card.style.display = "block";

  if (pontosComDados.length === 0) {
    if (vazio) vazio.style.display = "block";
    if (corpo) corpo.style.display = "none";
    return;
  }
  if (vazio) vazio.style.display = "none";
  if (corpo) corpo.style.display = "block";

  const somaPeso = pontosComDados.reduce((s, p) => s + p.peso, 0);
  const somaPesoPct = pontosComDados.reduce((s, p) => s + p.peso * p.pct, 0);
  const notaEstimada = somaPeso > 0 ? somaPesoPct / somaPeso : 0;
  const notaCorte = metaAtiva.notaCorte;
  const aprovado = notaCorte != null ? notaEstimada >= notaCorte : null;
  const corResultado =
    aprovado === null
      ? "var(--text-main)"
      : aprovado
        ? "var(--success)"
        : "var(--danger)";

  const elValor = document.getElementById("nota-estimada-valor");
  if (elValor) {
    elValor.innerText = `${notaEstimada.toFixed(1).replace(".", ",")}%`;
    elValor.style.color = corResultado;
  }

  const elCorteValor = document.getElementById("nota-estimada-corte-valor");
  if (elCorteValor) {
    elCorteValor.innerText =
      notaCorte != null ? `${notaCorte}%` : "Não definida";
  }

  const elSituacao = document.getElementById("nota-estimada-situacao");
  if (elSituacao) {
    elSituacao.innerText =
      aprovado === null ? "—" : aprovado ? "✅ Passaria" : "❌ Não passaria";
    elSituacao.style.color = corResultado;
  }

  // Barra de progresso: preenchimento = nota estimada; marcador vertical =
  // nota de corte (só aparece se ela estiver cadastrada), pra comparação
  // visual direta dos dois números.
  const barra = document.getElementById("nota-estimada-barra");
  if (barra) {
    barra.style.width = `${Math.min(100, Math.max(0, notaEstimada))}%`;
    barra.style.background = corResultado;
  }
  const marcadorCorte = document.getElementById(
    "nota-estimada-barra-corte-marcador",
  );
  if (marcadorCorte) {
    if (notaCorte != null) {
      marcadorCorte.style.display = "block";
      marcadorCorte.style.left = `${Math.min(100, Math.max(0, notaCorte))}%`;
    } else {
      marcadorCorte.style.display = "none";
    }
  }

  // Cobertura: deixa explícito que a nota é uma estimativa PARCIAL — só
  // cobre o que já tem amostra suficiente, não o edital inteiro.
  const elCobertura = document.getElementById("nota-estimada-cobertura");
  if (elCobertura) {
    const totalMaterias = materiasDaProva.length;
    elCobertura.innerHTML =
      materiasSemDados.length > 0
        ? `📊 Baseado em <strong>${pontosComDados.length} de ${totalMaterias}</strong> matérias com questões suficientes (mínimo 5). Ainda sem dados: ${materiasSemDados.map((n) => escapeHtml(n)).join(", ")}.`
        : `📊 Baseado em todas as <strong>${totalMaterias}</strong> matérias vinculadas a essa prova.`;
  }

  // Tabela de contribuição, da matéria que mais pesa na média pra baixo —
  // explica "por que" a nota deu esse número.
  const tabela = document.getElementById("nota-estimada-tabela");
  if (tabela) {
    const linhasOrdenadas = [...pontosComDados].sort(
      (a, b) => b.peso * b.pct - a.peso * a.pct,
    );
    tabela.innerHTML = linhasOrdenadas
      .map((p) => {
        const corPct =
          p.pct >= 70
            ? "var(--success)"
            : p.pct >= 50
              ? "var(--warning)"
              : "var(--danger)";
        return `
        <div class="nota-estimada-tabela-linha">
          <span class="nota-estimada-tabela-materia">${escapeHtml(p.materia)}</span>
          <span class="nota-estimada-tabela-peso" title="Peso ${p.peso}">${"★".repeat(p.peso)}</span>
          <span class="nota-estimada-tabela-pct" style="color: ${corPct}">${p.pct}%</span>
        </div>`;
      })
      .join("");
  }
}

function renderizarMatrizPrioridade() {
  const card = document.getElementById("card-matriz-prioridade");
  const canvas = document.getElementById("chartMatrizPrioridade");
  const legenda = document.getElementById("matriz-prioridade-legenda");
  if (!card || !canvas) return;

  const desempenho = calcularDesempenhoPorMateria(registrosQuestoes);
  const AMOSTRA_MINIMA = 5;

  // Só entra na matriz quem já tem amostra mínima de questões — um ponto
  // solto com 1 questão erraria o diagnóstico e poluiria o gráfico.
  const pontos = desempenho
    .filter((d) => d.total >= AMOSTRA_MINIMA)
    .map((d) => {
      const materia = materias.find((m) => m.nome === d.materia);
      return {
        materia: d.materia,
        pct: d.pct,
        peso: (materia && materia.peso) || 1,
        total: d.total,
        acertos: d.acertos,
      };
    });

  if (pontos.length < 2) {
    card.style.display = "none";
    if (graficoMatrizPrioridade) {
      graficoMatrizPrioridade.destroy();
      graficoMatrizPrioridade = null;
    }
    return;
  }
  card.style.display = "block";

  // Limiar de desempenho: a própria média geral do usuário, não um número
  // fixo — assim o diagnóstico é relativo ao nível dele mesmo, não a uma
  // meta arbitrária.
  const totalGeral = pontos.reduce((s, p) => s + p.total, 0);
  const acertosGeral = pontos.reduce((s, p) => s + p.acertos, 0);
  const limiarPct = totalGeral > 0 ? (acertosGeral / totalGeral) * 100 : 70;
  const limiarPeso = 3.5;

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  const corPonto = (p) => {
    if (p.peso >= limiarPeso && p.pct < limiarPct) return "#ef4444"; // prioridade máxima
    if (p.peso >= limiarPeso && p.pct >= limiarPct) return "#10b981"; // ponto forte estratégico
    if (p.peso < limiarPeso && p.pct < limiarPct) return "#f59e0b"; // fraqueza, mas pode esperar
    return "#3b82f6"; // já domina, baixo risco
  };

  if (graficoMatrizPrioridade) {
    graficoMatrizPrioridade.destroy();
  }

  // Plugin próprio (sem depender de biblioteca extra) só pra pintar o
  // fundo dos 4 quadrantes antes dos pontos serem desenhados por cima.
  const pluginQuadrantes = {
    id: "pluginQuadrantes",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const xPix = scales.x.getPixelForValue(limiarPct);
      const yPix = scales.y.getPixelForValue(limiarPeso);
      ctx.save();
      ctx.fillStyle = "rgba(239,68,68,0.07)"; // topo-esquerda: prioridade máxima
      ctx.fillRect(
        chartArea.left,
        chartArea.top,
        xPix - chartArea.left,
        yPix - chartArea.top,
      );
      ctx.fillStyle = "rgba(16,185,129,0.07)"; // topo-direita: ponto forte estratégico
      ctx.fillRect(
        xPix,
        chartArea.top,
        chartArea.right - xPix,
        yPix - chartArea.top,
      );
      ctx.fillStyle = "rgba(245,158,11,0.06)"; // baixo-esquerda: fraqueza, pode esperar
      ctx.fillRect(
        chartArea.left,
        yPix,
        xPix - chartArea.left,
        chartArea.bottom - yPix,
      );
      ctx.fillStyle = "rgba(59,130,246,0.06)"; // baixo-direita: já domina
      ctx.fillRect(xPix, yPix, chartArea.right - xPix, chartArea.bottom - yPix);
      ctx.restore();
    },
  };

  graficoMatrizPrioridade = new Chart(canvas.getContext("2d"), {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Matérias",
          data: pontos.map((p) => ({ x: p.pct, y: p.peso })),
          backgroundColor: pontos.map(corPonto),
          pointRadius: 8,
          pointHoverRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "% de acerto",
            color: corTextoMuted,
            font: { family: fonteApp },
          },
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (v) => `${v}%`,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        y: {
          min: 0.5,
          max: 5.5,
          title: {
            display: true,
            text: "Peso na prova",
            color: corTextoMuted,
            font: { family: fonteApp },
          },
          ticks: {
            stepSize: 1,
            color: corTextoMuted,
            font: { family: fonteApp },
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            title: (ctx) => pontos[ctx[0].dataIndex].materia,
            label: (ctx) => {
              const p = pontos[ctx.dataIndex];
              return [
                `${p.acertos}/${p.total} acertos (${p.pct}%)`,
                `Peso: ${p.peso}★`,
              ];
            },
          },
        },
      },
    },
    plugins: [pluginQuadrantes],
  });

  if (legenda) {
    legenda.innerHTML = `
      <div class="matriz-legenda-item"><span class="matriz-legenda-dot" style="background:#ef4444"></span>Prioridade máxima (peso alto, desempenho baixo)</div>
      <div class="matriz-legenda-item"><span class="matriz-legenda-dot" style="background:#10b981"></span>Ponto forte estratégico (peso alto, desempenho alto)</div>
      <div class="matriz-legenda-item"><span class="matriz-legenda-dot" style="background:#f59e0b"></span>Fraqueza, mas pode esperar (peso baixo, desempenho baixo)</div>
      <div class="matriz-legenda-item"><span class="matriz-legenda-dot" style="background:#3b82f6"></span>Já domina (peso baixo, desempenho alto)</div>
    `;
  }
}

// --- RADAR DE COMPETÊNCIAS ---
// Mostra o % de acerto de cada matéria numa única visão em teia — o
// formato do polígono já entrega o diagnóstico: redondo (todas as pontas
// parecidas) é preparo equilibrado; com picos e vales bem marcados são os
// pontos fortes e fracos aparecendo de cara, sem precisar ler uma lista de
// números. Recurso comum em diagnósticos de hagwons coreanos e apps de
// prep asiáticos, que costumam expor o "shape" do desempenho, não só a
// média geral.
function renderizarRadarCompetencias() {
  const card = document.getElementById("card-radar-competencias");
  const canvas = document.getElementById("chartRadarCompetencias");
  if (!card || !canvas) return;

  // Respeita a mesma "Prova em foco" que o resto da aba Desempenho usa —
  // só considera questões das matérias vinculadas à prova selecionada.
  const filtroProva = obterMetaFiltroAtiva();
  const nomesFiltro = filtroProva
    ? new Set(obterMateriasDoFiltroAtivo().map((m) => m.nome))
    : null;
  const registrosDoFiltro = nomesFiltro
    ? registrosQuestoes.filter((r) => nomesFiltro.has(r.materia))
    : registrosQuestoes;

  const AMOSTRA_MINIMA = 5;
  const pontos = calcularDesempenhoPorMateria(registrosDoFiltro).filter(
    (d) => d.total >= AMOSTRA_MINIMA,
  );

  // Um radar com menos de 3 pontas não forma polígono nenhum — vira só uma
  // linha ou um ponto, sem nenhum valor visual sobre o "formato".
  if (pontos.length < 3) {
    card.style.display = "none";
    if (graficoRadarCompetencias) {
      graficoRadarCompetencias.destroy();
      graficoRadarCompetencias = null;
    }
    return;
  }
  card.style.display = "block";

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const corTextoMain =
    estiloRaiz.getPropertyValue("--text-main").trim() || "#f1f5f9";
  const corPrimaria =
    estiloRaiz.getPropertyValue("--primary").trim() || "#3b82f6";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  if (graficoRadarCompetencias) {
    graficoRadarCompetencias.destroy();
  }

  graficoRadarCompetencias = new Chart(canvas.getContext("2d"), {
    type: "radar",
    data: {
      labels: pontos.map((p) => p.materia),
      datasets: [
        {
          label: "% de acerto",
          data: pontos.map((p) => p.pct),
          backgroundColor: `${corPrimaria}33`,
          borderColor: corPrimaria,
          borderWidth: 2,
          pointBackgroundColor: corPrimaria,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            backdropColor: "transparent",
            color: corTextoMuted,
            font: { family: fonteApp },
          },
          pointLabels: {
            color: corTextoMain,
            font: { family: fonteApp, size: 12 },
          },
          grid: { color: "rgba(148,163,184,0.2)" },
          angleLines: { color: "rgba(148,163,184,0.2)" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) => {
              const p = pontos[ctx.dataIndex];
              return `${p.acertos}/${p.total} acertos (${p.pct}%)`;
            },
          },
        },
      },
    },
  });
}

// --- CADERNO DE ERROS (diagnóstico de causa) ---
// Cruza a distribuição de causas de erro (só dos registros onde a pessoa
// preencheu o diagnóstico) e aponta, além do gráfico, qual matéria mais
// puxa cada tipo de causa — é isso que muda o plano de ação: uma matéria
// dominada por "não sabia" pede revisão de teoria; uma dominada por
// "falta de atenção" pede treino sob pressão (Modo Prova), não mais
// estudo de conteúdo.
function calcularCadernoDeErros() {
  const filtroProva = obterMetaFiltroAtiva();
  const nomesFiltro = filtroProva
    ? new Set(obterMateriasDoFiltroAtivo().map((m) => m.nome))
    : null;
  const registrosDoFiltro = nomesFiltro
    ? registrosQuestoes.filter((r) => nomesFiltro.has(r.materia))
    : registrosQuestoes;

  const registrosComCausas = registrosDoFiltro.filter((r) => r.causasErro);

  const totais = {
    naoSabia: 0,
    confundiuConceito: 0,
    erroLeitura: 0,
    faltaAtencao: 0,
  };
  const porMateria = {};

  registrosComCausas.forEach((r) => {
    if (!porMateria[r.materia]) {
      porMateria[r.materia] = {
        naoSabia: 0,
        confundiuConceito: 0,
        erroLeitura: 0,
        faltaAtencao: 0,
      };
    }
    Object.keys(totais).forEach((chave) => {
      const n = r.causasErro[chave] || 0;
      totais[chave] += n;
      porMateria[r.materia][chave] += n;
    });
  });

  const totalClassificado = Object.values(totais).reduce((a, b) => a + b, 0);

  function materiaComMaisDe(chave) {
    let melhor = null;
    Object.entries(porMateria).forEach(([nome, dados]) => {
      if (dados[chave] > 0 && (!melhor || dados[chave] > melhor.valor)) {
        melhor = { nome, valor: dados[chave] };
      }
    });
    return melhor;
  }

  return {
    totais,
    totalClassificado,
    materiaMaisConteudo: materiaComMaisDe("naoSabia"),
    materiaMaisAtencao: materiaComMaisDe("faltaAtencao"),
  };
}

let graficoCadernoErros = null;

function renderizarCadernoDeErros() {
  const card = document.getElementById("card-caderno-erros");
  const canvas = document.getElementById("chartCadernoErros");
  const vazio = document.getElementById("caderno-erros-vazio");
  const corpo = document.querySelector(".caderno-erros-corpo");
  const insight = document.getElementById("caderno-erros-insight");
  if (!card || !canvas) return;

  card.style.display = "block";
  const dados = calcularCadernoDeErros();

  if (dados.totalClassificado === 0) {
    if (vazio) vazio.style.display = "block";
    if (corpo) corpo.style.display = "none";
    if (graficoCadernoErros) {
      graficoCadernoErros.destroy();
      graficoCadernoErros = null;
    }
    return;
  }

  if (vazio) vazio.style.display = "none";
  if (corpo) corpo.style.display = "flex";

  const entradas = Object.entries(LABELS_CAUSA_ERRO)
    .map(([chave, meta]) => ({ chave, valor: dados.totais[chave], ...meta }))
    .filter((e) => e.valor > 0);

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMain =
    estiloRaiz.getPropertyValue("--text-main").trim() || "#f1f5f9";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  if (graficoCadernoErros) {
    graficoCadernoErros.destroy();
  }

  graficoCadernoErros = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: entradas.map((e) => `${e.icone} ${e.label}`),
      datasets: [
        {
          data: entradas.map((e) => e.valor),
          backgroundColor: entradas.map((e) => e.cor),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: corTextoMain,
            font: { family: fonteApp, size: 11 },
            padding: 10,
          },
        },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) => {
              const pct = Math.round(
                (ctx.parsed / dados.totalClassificado) * 100,
              );
              return ` ${ctx.parsed} erro${ctx.parsed === 1 ? "" : "s"} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  const RECOMENDACAO_POR_CAUSA = {
    naoSabia:
      "a prioridade é revisar teoria — voltar pro material antes de fazer mais questões novas.",
    confundiuConceito:
      "vale revisar lado a lado os conceitos que você anda confundindo.",
    erroLeitura:
      "o conteúdo provavelmente está OK — o ganho está em ler o enunciado com mais calma.",
    faltaAtencao:
      "o problema não é teoria — é treinar sob pressão de tempo (o Modo Prova ajuda nisso).",
  };

  const dominante = entradas.reduce((a, b) => (b.valor > a.valor ? b : a));
  const pctDominante = Math.round(
    (dominante.valor / dados.totalClassificado) * 100,
  );

  let textoInsight = `<strong>${dominante.icone} ${escapeHtml(dominante.label)}</strong> é a causa mais comum dos seus erros (${pctDominante}% de ${dados.totalClassificado} classificados): ${RECOMENDACAO_POR_CAUSA[dominante.chave]}`;

  if (dados.materiaMaisConteudo) {
    textoInsight += `<br><br>📕 Maior lacuna de conteúdo: <strong>${escapeHtml(dados.materiaMaisConteudo.nome)}</strong>.`;
  }
  if (
    dados.materiaMaisAtencao &&
    (!dados.materiaMaisConteudo ||
      dados.materiaMaisAtencao.nome !== dados.materiaMaisConteudo.nome ||
      dados.materiaMaisAtencao.valor !== dados.materiaMaisConteudo.valor)
  ) {
    textoInsight += `<br>💭 Maior perda por falta de atenção: <strong>${escapeHtml(dados.materiaMaisAtencao.nome)}</strong>.`;
  }

  if (insight) insight.innerHTML = textoInsight;
}

// --- DESEMPENHO POR BANCA EXAMINADORA ---
// Cada banca tem um estilo de cobrança diferente (CESPE certo/errado,
// FGV e FCC múltipla escolha, cada uma com sua "pegadinha" típica).
// Segmentar o % de acerto por banca — e, mais importante, comparar a
// MESMA matéria entre bancas diferentes — separa "não domino o
// conteúdo" de "não me adaptei ao estilo dessa banca".
let graficoDesempenhoBanca = null;
const AMOSTRA_MINIMA_BANCA = 3;

function calcularDesempenhoPorBanca() {
  const filtroProva = obterMetaFiltroAtiva();
  const nomesFiltro = filtroProva
    ? new Set(obterMateriasDoFiltroAtivo().map((m) => m.nome))
    : null;
  const registrosDoFiltro = nomesFiltro
    ? registrosQuestoes.filter((r) => nomesFiltro.has(r.materia))
    : registrosQuestoes;

  const registrosComBanca = registrosDoFiltro.filter((r) => r.banca);

  const porBanca = {};
  const porMateriaBanca = {};

  registrosComBanca.forEach((r) => {
    if (!porBanca[r.banca]) porBanca[r.banca] = { total: 0, acertos: 0 };
    porBanca[r.banca].total += r.total;
    porBanca[r.banca].acertos += r.acertos;

    if (!porMateriaBanca[r.materia]) porMateriaBanca[r.materia] = {};
    if (!porMateriaBanca[r.materia][r.banca]) {
      porMateriaBanca[r.materia][r.banca] = { total: 0, acertos: 0 };
    }
    porMateriaBanca[r.materia][r.banca].total += r.total;
    porMateriaBanca[r.materia][r.banca].acertos += r.acertos;
  });

  const bancas = Object.entries(porBanca)
    .map(([banca, d]) => ({
      banca,
      total: d.total,
      acertos: d.acertos,
      pct: Math.round((d.acertos / d.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  // Só entram matérias com dados em 2+ bancas diferentes, cada uma com
  // amostra mínima — é essa comparação lado a lado que revela o "gap de
  // estilo" entre bancas pra uma mesma matéria.
  const comparativos = Object.entries(porMateriaBanca)
    .map(([materia, bancasDaMateria]) => {
      const linhas = Object.entries(bancasDaMateria)
        .filter(([, d]) => d.total >= AMOSTRA_MINIMA_BANCA)
        .map(([banca, d]) => ({
          banca,
          total: d.total,
          acertos: d.acertos,
          pct: Math.round((d.acertos / d.total) * 100),
        }))
        .sort((a, b) => b.pct - a.pct);

      if (linhas.length < 2) return null;
      return {
        materia,
        linhas,
        diferenca: linhas[0].pct - linhas[linhas.length - 1].pct,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.diferenca - a.diferenca);

  return { bancas, comparativos };
}

function renderizarDesempenhoPorBanca() {
  const card = document.getElementById("card-desempenho-banca");
  const canvas = document.getElementById("chartDesempenhoBanca");
  const vazio = document.getElementById("desempenho-banca-vazio");
  const corpo = document.getElementById("desempenho-banca-corpo");
  const comparativoEl = document.getElementById("desempenho-banca-comparativo");
  if (!card || !canvas) return;

  card.style.display = "block";
  const dados = calcularDesempenhoPorBanca();

  if (dados.bancas.length === 0) {
    if (vazio) vazio.style.display = "block";
    if (corpo) corpo.style.display = "none";
    if (graficoDesempenhoBanca) {
      graficoDesempenhoBanca.destroy();
      graficoDesempenhoBanca = null;
    }
    return;
  }

  if (vazio) vazio.style.display = "none";
  if (corpo) corpo.style.display = "block";

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  canvas.parentElement.style.height = `${Math.max(120, dados.bancas.length * 42)}px`;

  const cores = dados.bancas.map((d) => {
    if (d.pct < 60) return "#ef4444";
    if (d.pct < 80) return "#f59e0b";
    return "#10b981";
  });

  if (graficoDesempenhoBanca) {
    graficoDesempenhoBanca.destroy();
  }

  graficoDesempenhoBanca = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: dados.bancas.map((d) => d.banca),
      datasets: [
        {
          label: "% de acerto",
          data: dados.bancas.map((d) => d.pct),
          backgroundColor: cores,
          borderRadius: 6,
          maxBarThickness: 22,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (v) => `${v}%`,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        y: {
          ticks: { color: corTextoMuted, font: { family: fonteApp } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) => {
              const d = dados.bancas[ctx.dataIndex];
              return ` ${d.acertos}/${d.total} acertos (${d.pct}%)`;
            },
          },
        },
      },
    },
  });

  if (comparativoEl) {
    if (dados.comparativos.length === 0) {
      comparativoEl.innerHTML = `
        <p class="campo-ajuda" style="margin-top: 14px">
          Registre questões da mesma matéria em pelo menos 2 bancas
          diferentes (com ${AMOSTRA_MINIMA_BANCA}+ questões cada) pra ver
          aqui o comparativo direto — é ele que separa "não sei o
          conteúdo" de "não me adaptei ao estilo dessa banca".
        </p>`;
    } else {
      comparativoEl.innerHTML = `
        <p class="campo-ajuda" style="margin-top: 14px; margin-bottom: 10px">
          <strong>Mesma matéria, bancas diferentes</strong> — quando o gap
          é grande, o problema costuma ser estilo de prova, não conteúdo:
        </p>
        ${dados.comparativos
          .map((c) => {
            const alerta = c.diferenca >= 20;
            return `
            <div class="banca-comparativo-item">
              <div class="banca-comparativo-cabecalho">
                <strong>${escapeHtml(c.materia)}</strong>
                ${alerta ? `<span class="status-badge status-atencao">⚠️ gap de ${c.diferenca} pontos</span>` : `<span class="campo-ajuda">gap de ${c.diferenca} pontos</span>`}
              </div>
              ${c.linhas
                .map(
                  (l) =>
                    `<div class="banca-comparativo-linha"><span>${escapeHtml(l.banca)}</span><strong>${l.pct}% <small>(${l.acertos}/${l.total})</small></strong></div>`,
                )
                .join("")}
            </div>`;
          })
          .join("")}`;
    }
  }
}

// completos medem conteúdo + gestão de tempo + ansiedade de prova real.
// Um gap grande entre os dois pede um tipo de correção diferente de
// simplesmente "estudar mais" — pede treino em condição de prova.
function renderizarComparativoAvulsasSimulados() {
  const card = document.getElementById("card-avulsas-vs-simulados");
  const canvas = document.getElementById("chartAvulsasVsSimulados");
  const elMediaAvulsas = document.getElementById(
    "avulsas-simulados-media-avulsas",
  );
  const elMediaSimulados = document.getElementById(
    "avulsas-simulados-media-simulados",
  );
  const diagnostico = document.getElementById("avulsas-simulados-diagnostico");
  if (!card || !canvas) return;

  // Respeita a mesma prova em foco usada no resto da tela: avulsas filtra
  // pelas matérias vinculadas a ela, simulados filtra pelo próprio vínculo.
  const filtroProva = obterMetaFiltroAtiva();
  const nomesFiltro = filtroProva
    ? new Set(obterMateriasDoFiltroAtivo().map((m) => m.nome))
    : null;
  const avulsasFiltradas = nomesFiltro
    ? registrosQuestoes.filter((r) => nomesFiltro.has(r.materia))
    : registrosQuestoes;
  const simuladosFiltrados = filtroProva
    ? registrosSimulados.filter((r) => r.metaVinculada === filtroProva)
    : registrosSimulados;

  const totalAvulsas = avulsasFiltradas.reduce((s, r) => s + r.total, 0);
  const acertosAvulsas = avulsasFiltradas.reduce((s, r) => s + r.acertos, 0);

  if (totalAvulsas === 0 || simuladosFiltrados.length === 0) {
    card.style.display = "none";
    if (graficoAvulsasVsSimulados) {
      graficoAvulsasVsSimulados.destroy();
      graficoAvulsasVsSimulados = null;
    }
    return;
  }
  card.style.display = "block";

  const mediaAvulsas = Math.round((acertosAvulsas / totalAvulsas) * 100);

  const simuladosOrdenados = [...simuladosFiltrados].sort((a, b) =>
    a.data.localeCompare(b.data),
  );
  const totalSimulados = simuladosOrdenados.reduce((s, r) => s + r.total, 0);
  const acertosSimulados = simuladosOrdenados.reduce(
    (s, r) => s + r.acertos,
    0,
  );
  const mediaSimulados = Math.round((acertosSimulados / totalSimulados) * 100);

  elMediaAvulsas.textContent = `${mediaAvulsas}%`;
  elMediaSimulados.textContent = `${mediaSimulados}%`;

  const diff = mediaAvulsas - mediaSimulados;
  if (diff >= 10) {
    diagnostico.style.display = "block";
    diagnostico.innerHTML = `⚠️ Seu % de acerto cai <strong>${diff} pontos</strong> nos simulados em relação às questões soltas. Isso costuma indicar dificuldade de gestão de tempo ou ansiedade em condição de prova real — vale treinar mais simulados cronometrados, não necessariamente mais teoria.`;
  } else if (diff <= -10) {
    diagnostico.style.display = "block";
    diagnostico.innerHTML = `📌 Curioso: seu desempenho é <strong>${Math.abs(diff)} pontos maior</strong> nos simulados do que nas questões soltas. Pode ser que o contexto de prova completa ajude seu foco, ou que os simulados registrados sejam de um período diferente das questões avulsas.`;
  } else {
    diagnostico.style.display = "block";
    diagnostico.innerHTML = `✅ Seu desempenho se mantém consistente entre questões soltas e simulados completos (diferença de ${Math.abs(diff)} pontos). Bom sinal — o que você sabe estudando se sustenta sob prova real.`;
  }

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  const labels = simuladosOrdenados.map(
    (r) => `${r.nome} (${r.data.split("-").reverse().join("/")})`,
  );
  const pctsSimulados = simuladosOrdenados.map((r) =>
    Math.round((r.acertos / r.total) * 100),
  );
  const coresBarras = pctsSimulados.map((pct) =>
    pct >= mediaAvulsas ? "#10b981" : "#ef4444",
  );

  if (graficoAvulsasVsSimulados) {
    graficoAvulsasVsSimulados.destroy();
  }

  graficoAvulsasVsSimulados = new Chart(canvas.getContext("2d"), {
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "% no simulado",
          data: pctsSimulados,
          backgroundColor: coresBarras,
          borderRadius: 6,
          maxBarThickness: 70,
          order: 2,
        },
        {
          type: "line",
          label: `Média em questões avulsas (${mediaAvulsas}%)`,
          data: labels.map(() => mediaAvulsas),
          borderColor: "#6366f1",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (v) => `${v}%`,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        x: {
          ticks: { color: corTextoMuted, font: { family: fonteApp } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: corTextoMuted,
            font: { family: fonteApp, size: 12 },
          },
        },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
        },
      },
    },
  });
}

// --- SIMULADOS E PROVAS COMPLETAS ---
// Separado das "questões do dia a dia" (registrosQuestoes) de propósito:
// um simulado é um evento só, com nota final, que faz sentido acompanhar
// como uma série própria ao longo do tempo — não misturado com questões
// avulsas resolvidas estudando.
async function registrarSimulado(event) {
  event.preventDefault();

  const nome = document.getElementById("simulado-nome").value.trim();
  const metaVinculada = document.getElementById("simulado-meta").value;
  const total = parseInt(document.getElementById("simulado-total").value, 10);
  const acertos = parseInt(
    document.getElementById("simulado-acertos").value,
    10,
  );

  if (!nome) {
    await mostrarAlerta(
      "Dê um nome pro simulado (ex: 'Simulado SEDES 2026 - 2ª aplicação').",
    );
    return;
  }
  if (!total || total <= 0) {
    await mostrarAlerta(
      "Informe o total de questões do simulado (maior que zero).",
    );
    return;
  }
  if (isNaN(acertos) || acertos < 0) {
    await mostrarAlerta("Informe quantas você acertou (0 ou mais).");
    return;
  }
  if (acertos > total) {
    await mostrarAlerta("Acertos não pode ser maior que o total de questões.");
    return;
  }

  const novoRegistroSimulado = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: obterDataLocalString(new Date()),
    nome,
    metaVinculada: metaVinculada || null,
    total,
    acertos,
  };

  // Se esse registro veio de uma Prova por Questão (mesmo nome que o
  // formulário já foi preenchido automaticamente), anexa tempo total,
  // média por questão e a questão mais demorada — ver
  // finalizarProvaPorQuestao() e salvarResultadoProvaPorQuestao().
  if (
    provaPorQuestaoParaRegistrar &&
    provaPorQuestaoParaRegistrar.nome === nome
  ) {
    novoRegistroSimulado.provaPorQuestao = {
      tempoTotalSegundos: provaPorQuestaoParaRegistrar.tempoTotalSegundos,
      duracaoMediaSegundos: provaPorQuestaoParaRegistrar.duracaoMediaSegundos,
      questaoMaisDemorada: provaPorQuestaoParaRegistrar.questaoMaisDemorada,
      temposPorQuestaoSegundos: provaPorQuestaoParaRegistrar.tempos,
    };
    provaPorQuestaoParaRegistrar = null;
  }

  registrosSimulados.push(novoRegistroSimulado);
  localStorage.setItem(
    "registrosSimulados",
    JSON.stringify(registrosSimulados),
  );

  document.getElementById("form-simulado").reset();
  const pct = Math.round((acertos / total) * 100);
  mostrarToastGamificacao(
    "🎓",
    "Simulado registrado",
    `${nome}: ${pct}% de acerto`,
  );
  renderizarSimulados();
  renderizarComparativoAvulsasSimulados();
  renderizarEvolucaoSimulados();
  renderizarEvolucaoQuestoes();
}

function excluirRegistroSimulado(id) {
  registrosSimulados = registrosSimulados.filter((r) => r.id !== id);
  localStorage.setItem(
    "registrosSimulados",
    JSON.stringify(registrosSimulados),
  );
  renderizarSimulados();
  renderizarComparativoAvulsasSimulados();
  renderizarEvolucaoSimulados();
  renderizarEvolucaoQuestoes();
}

// --- SIMULADO CRONOMETRADO ---
// Reaproveita o mesmo select de metas usado no formulário de registro
// manual, só que aplicado a um <select> arbitrário (o do modal de
// configuração e o da lista de simulados têm o mesmo formato de opções).
function preencherSelectDeMetas(idSelect) {
  const seletor = document.getElementById(idSelect);
  if (!seletor) return;
  const valorAtual = seletor.value;
  seletor.innerHTML = '<option value="">Sem prova vinculada</option>';
  metas.forEach((m) => {
    seletor.innerHTML += `<option value="${escapeHtml(m.objetivoNome)}">${escapeHtml(m.objetivoNome)}</option>`;
  });
  if ([...seletor.options].some((o) => o.value === valorAtual)) {
    seletor.value = valorAtual;
  }
}

function abrirModalIniciarSimulado() {
  preencherSelectDeMetas("simcron-meta");
  document.getElementById("modal-iniciar-simulado").style.display = "flex";
}

function fecharModalIniciarSimulado() {
  document.getElementById("modal-iniciar-simulado").style.display = "none";
}

async function iniciarSimuladoCronometrado(event) {
  event.preventDefault();

  const nome = document.getElementById("simcron-nome").value.trim();
  const metaVinculada = document.getElementById("simcron-meta").value;
  const horas =
    parseInt(document.getElementById("simcron-horas").value, 10) || 0;
  const minutos =
    parseInt(document.getElementById("simcron-minutos").value, 10) || 0;
  const totalStr = document.getElementById("simcron-total").value;
  const total = totalStr ? parseInt(totalStr, 10) : null;

  if (!nome) {
    await mostrarAlerta("Dê um nome pro simulado.");
    return;
  }
  const duracaoSegundos = horas * 3600 + minutos * 60;
  if (duracaoSegundos <= 0) {
    await mostrarAlerta("Informe a duração total da prova (maior que zero).");
    return;
  }

  simuladoCronDados = {
    timestampAlvo: Date.now() + duracaoSegundos * 1000,
    nome,
    metaVinculada,
    total,
  };
  localStorage.setItem("simuladoCronDados", JSON.stringify(simuladoCronDados));

  fecharModalIniciarSimulado();
  iniciarAudioContext(); // gesto do usuário: garante que o alarme final vai poder tocar
  solicitarPermissaoNotificacao();
  mostrarTelaSimuladoCronometro();
}

function mostrarTelaSimuladoCronometro() {
  if (!simuladoCronDados) return;

  document.getElementById("simulado-cron-nome-exibido").innerText =
    simuladoCronDados.nome;
  document.getElementById("tela-simulado-cronometro").style.display = "flex";

  atualizarDisplaySimuladoCronometro();
  clearInterval(simuladoCronIntervalId);
  simuladoCronIntervalId = setInterval(
    atualizarDisplaySimuladoCronometro,
    1000,
  );
}

function atualizarDisplaySimuladoCronometro() {
  if (!simuladoCronDados) return;

  const restanteMs = simuladoCronDados.timestampAlvo - Date.now();
  const display = document.getElementById("simulado-cron-tempo");
  const sub = document.getElementById("simulado-cron-sub");

  if (restanteMs <= 0) {
    if (display) display.innerText = "00:00:00";
    if (sub) sub.innerText = "tempo esgotado!";
    finalizarSimuladoCronometrado(true);
    return;
  }

  const totalSegundos = Math.floor(restanteMs / 1000);
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, "0");

  if (display) display.innerText = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (sub) sub.innerText = "tempo restante";
}

// porTempoEsgotado = true quando o cronômetro zerou sozinho; false quando a
// pessoa clicou em "Finalizar Agora" antes do tempo acabar.
function finalizarSimuladoCronometrado(porTempoEsgotado) {
  if (!simuladoCronDados) return;

  clearInterval(simuladoCronIntervalId);
  simuladoCronIntervalId = null;
  document.getElementById("tela-simulado-cronometro").style.display = "none";

  if (porTempoEsgotado) {
    ticarSom(document.getElementById("pomo-som")?.value || "sino");
    notificarSeEmSegundoPlano(
      "🎓 Tempo esgotado!",
      `O tempo do "${simuladoCronDados.nome}" acabou. Registre seu resultado.`,
    );
  }

  const dadosParaPreencher = simuladoCronDados;
  simuladoCronDados = null;
  localStorage.removeItem("simuladoCronDados");

  preencherFormularioSimuladoApósCronometro(dadosParaPreencher);
}

async function cancelarSimuladoCronometrado() {
  const confirmado = await mostrarConfirmacao(
    "Cancelar o simulado cronometrado? O tempo contado até agora não será registrado em lugar nenhum.",
    { icone: "🛑", textoConfirmar: "Cancelar simulado" },
  );
  if (!confirmado) return;

  clearInterval(simuladoCronIntervalId);
  simuladoCronIntervalId = null;
  simuladoCronDados = null;
  localStorage.removeItem("simuladoCronDados");
  document.getElementById("tela-simulado-cronometro").style.display = "none";
}

// Depois que o cronômetro acaba (ou é finalizado manualmente), leva a
// pessoa direto pra aba Estudos, já com nome/prova/total preenchidos no
// formulário de registro — só falta digitar os acertos.
function preencherFormularioSimuladoApósCronometro(dados) {
  navegarPara("estudos");

  setTimeout(() => {
    preencherSelectDeMetas("simulado-meta");

    const campoNome = document.getElementById("simulado-nome");
    const campoMeta = document.getElementById("simulado-meta");
    const campoTotal = document.getElementById("simulado-total");
    const campoAcertos = document.getElementById("simulado-acertos");

    if (campoNome) campoNome.value = dados.nome;
    if (campoMeta && dados.metaVinculada) campoMeta.value = dados.metaVinculada;
    if (campoTotal && dados.total) campoTotal.value = dados.total;

    const cartaoSimulado = document.getElementById("card-simulados");
    if (cartaoSimulado) {
      cartaoSimulado.scrollIntoView({ behavior: "smooth", block: "center" });
      cartaoSimulado.classList.add("form-simulado-destaque");
      setTimeout(
        () => cartaoSimulado.classList.remove("form-simulado-destaque"),
        2600,
      );
    }
    if (campoAcertos) campoAcertos.focus();
  }, 150);
}

// Ao abrir o app, retoma um simulado cronometrado que já estava em
// andamento (ex: a pessoa recarregou a página no meio da prova). Se o
// tempo já tiver esgotado enquanto o app estava fechado, finaliza direto.
function verificarSimuladoCronometradoEmAndamento() {
  if (!simuladoCronDados || !simuladoCronDados.timestampAlvo) return;

  if (simuladoCronDados.timestampAlvo - Date.now() <= 0) {
    finalizarSimuladoCronometrado(true);
  } else {
    mostrarTelaSimuladoCronometro();
  }
}

// ============================================================
// PROVA POR QUESTÃO
// ============================================================
// Cronômetro em tela cheia que mede o tempo de CADA questão
// individualmente (em vez de um tempo total regressivo, como no Simulado
// Cronometrado acima). O usuário aperta Espaço — ou o botão "Marcar
// Questão" na tela — sempre que termina uma questão: o tempo dela entra
// na lista, o cronômetro reinicia do zero e passa a contar a próxima. Ao
// finalizar, mostra tempo total, duração média por questão e qual foi a
// mais demorada, com a chance de deixar uma observação nela antes de
// mandar pro formulário de Registrar Simulado (que só pede os acertos).

function abrirModalProvaPorQuestao() {
  preencherSelectDeMetas("ppq-meta");
  document.getElementById("modal-iniciar-prova-por-questao").style.display =
    "flex";
}

function fecharModalProvaPorQuestao() {
  document.getElementById("modal-iniciar-prova-por-questao").style.display =
    "none";
}

async function iniciarProvaPorQuestao(event) {
  event.preventDefault();

  const nome = document.getElementById("ppq-nome").value.trim();
  const metaVinculada = document.getElementById("ppq-meta").value;
  const totalEsperadoStr = document.getElementById("ppq-total-esperado").value;
  const totalEsperado = totalEsperadoStr
    ? parseInt(totalEsperadoStr, 10)
    : null;

  if (!nome) {
    await mostrarAlerta("Dê um nome pra prova.");
    return;
  }

  provaPorQuestaoDados = {
    nome,
    metaVinculada,
    totalEsperado,
    tempos: [],
    inicioQuestaoAtual: Date.now(),
  };
  salvarProvaPorQuestaoDados();

  fecharModalProvaPorQuestao();
  iniciarAudioContext(); // gesto do usuário: libera áudio pro app em geral
  mostrarTelaProvaPorQuestao();
}

function salvarProvaPorQuestaoDados() {
  localStorage.setItem(
    "provaPorQuestaoDados",
    JSON.stringify(provaPorQuestaoDados),
  );
}

function mostrarTelaProvaPorQuestao() {
  if (!provaPorQuestaoDados) return;

  document.getElementById("ppq-nome-exibido").innerText =
    provaPorQuestaoDados.nome;
  document.getElementById("tela-prova-por-questao").style.display = "flex";

  atualizarDisplayProvaPorQuestao();
  renderizarListaTemposProvaPorQuestao();
  clearInterval(provaPorQuestaoIntervalId);
  provaPorQuestaoIntervalId = setInterval(
    atualizarDisplayProvaPorQuestao,
    1000,
  );
}

function atualizarDisplayProvaPorQuestao() {
  if (!provaPorQuestaoDados) return;

  const decorridoSegundos = Math.floor(
    (Date.now() - provaPorQuestaoDados.inicioQuestaoAtual) / 1000,
  );
  const numeroQuestao = provaPorQuestaoDados.tempos.length + 1;

  const displayTempo = document.getElementById("ppq-tempo");
  const displayNumero = document.getElementById("ppq-questao-numero");

  if (displayTempo)
    displayTempo.innerText = formatarSegundosParaRelogio(decorridoSegundos);
  if (displayNumero) {
    displayNumero.innerText = provaPorQuestaoDados.totalEsperado
      ? `Questão ${numeroQuestao} de ${provaPorQuestaoDados.totalEsperado}`
      : `Questão ${numeroQuestao}`;
  }
}

// Registra o tempo da questão atual e reinicia o cronômetro pra próxima.
// Chamada tanto pelo botão "Marcar Questão" quanto pelo atalho de
// teclado (Espaço, ver o listener de keydown mais abaixo no arquivo).
function marcarQuestaoProvaPorQuestao() {
  if (!provaPorQuestaoDados) return;

  const decorridoSegundos = Math.max(
    1,
    Math.round((Date.now() - provaPorQuestaoDados.inicioQuestaoAtual) / 1000),
  );
  const numeroQuestao = provaPorQuestaoDados.tempos.length + 1;

  provaPorQuestaoDados.tempos.push(decorridoSegundos);
  provaPorQuestaoDados.inicioQuestaoAtual = Date.now();
  salvarProvaPorQuestaoDados();

  atualizarDisplayProvaPorQuestao();
  renderizarListaTemposProvaPorQuestao();

  mostrarToastGamificacao(
    "⏱️",
    `Questão ${numeroQuestao} registrada`,
    formatarSegundosParaRelogio(decorridoSegundos),
  );
}

function renderizarListaTemposProvaPorQuestao() {
  const container = document.getElementById("ppq-lista-tempos");
  if (!container || !provaPorQuestaoDados) return;

  const tempos = provaPorQuestaoDados.tempos;
  if (tempos.length === 0) {
    container.innerHTML = "";
    return;
  }
  const maiorValor = Math.max(...tempos);
  container.innerHTML = tempos
    .map((seg, i) => {
      const classe =
        seg === maiorValor ? "ppq-pill ppq-pill-lenta" : "ppq-pill";
      return `<span class="${classe}">Q${i + 1}: ${formatarSegundosParaRelogio(seg)}</span>`;
    })
    .join("");
}

function finalizarProvaPorQuestao() {
  if (!provaPorQuestaoDados) return;

  // A questão em andamento no momento de finalizar também conta — não
  // precisa apertar Espaço na última questão só pra poder finalizar.
  const decorridoAtual = Math.round(
    (Date.now() - provaPorQuestaoDados.inicioQuestaoAtual) / 1000,
  );
  const tempos = [...provaPorQuestaoDados.tempos];
  if (decorridoAtual > 0) {
    tempos.push(decorridoAtual);
  }

  if (tempos.length === 0) {
    mostrarAlerta("Marque pelo menos uma questão antes de finalizar.");
    return;
  }

  clearInterval(provaPorQuestaoIntervalId);
  provaPorQuestaoIntervalId = null;
  document.getElementById("tela-prova-por-questao").style.display = "none";

  const tempoTotalSegundos = tempos.reduce((s, t) => s + t, 0);
  const duracaoMediaSegundos = tempoTotalSegundos / tempos.length;
  const maiorValor = Math.max(...tempos);
  const maiorIndice = tempos.indexOf(maiorValor);
  const nomeProva = provaPorQuestaoDados.nome;

  provaPorQuestaoResultadoPendente = {
    nome: nomeProva,
    metaVinculada: provaPorQuestaoDados.metaVinculada,
    tempos,
    tempoTotalSegundos,
    duracaoMediaSegundos,
    questaoMaisDemorada: {
      numero: maiorIndice + 1,
      segundos: maiorValor,
      observacao: "",
    },
  };

  provaPorQuestaoDados = null;
  localStorage.removeItem("provaPorQuestaoDados");

  // Registra o tempo total da prova no histórico de estudos — o mesmo
  // caminho (salvarProgressoGeral) usado quando um pomodoro comum é
  // finalizado — como UMA sessão única (não dividida em ciclos), pra
  // aparecer somada no total do dia e na lista "Sessões de Hoje". Não usa
  // "materia" (fica como "Estudo Geral" e não mexe em tempoPorMateria,
  // já que uma prova completa normalmente cobre várias matérias de uma
  // vez) — o nome da prova e o resumo do tempo vão na nota da sessão.
  // tipoSessao "questoes" também alimenta o card "Sessões por Tipo".
  const minutosEstudados = Math.max(1, Math.round(tempoTotalSegundos / 60));
  salvarProgressoGeral(
    null,
    minutosEstudados,
    `⏱️ Prova por Questão: "${nomeProva}" — ${tempos.length} questão(ões), tempo total ${formatarSegundosParaRelogio(tempoTotalSegundos)}, média ${formatarSegundosParaRelogio(duracaoMediaSegundos)}/questão`,
    null,
    "questoes",
  );
  provaPorQuestaoResultadoPendente.minutosRegistrados = minutosEstudados;

  mostrarModalResultadoProvaPorQuestao();
}

async function cancelarProvaPorQuestao() {
  const confirmado = await mostrarConfirmacao(
    "Cancelar a prova por questão? Os tempos registrados até agora serão perdidos.",
    { icone: "🛑", textoConfirmar: "Cancelar prova" },
  );
  if (!confirmado) return;

  clearInterval(provaPorQuestaoIntervalId);
  provaPorQuestaoIntervalId = null;
  provaPorQuestaoDados = null;
  localStorage.removeItem("provaPorQuestaoDados");
  document.getElementById("tela-prova-por-questao").style.display = "none";
}

function mostrarModalResultadoProvaPorQuestao() {
  const r = provaPorQuestaoResultadoPendente;
  if (!r) return;

  document.getElementById("ppq-resultado-nome").innerText = r.nome;
  document.getElementById("ppq-resultado-tempo-total").innerText =
    formatarSegundosParaRelogio(r.tempoTotalSegundos);
  document.getElementById("ppq-resultado-qtd").innerText = r.tempos.length;
  document.getElementById("ppq-resultado-media").innerText =
    formatarSegundosParaRelogio(r.duracaoMediaSegundos);
  document.getElementById("ppq-resultado-maior").innerText =
    `Questão ${r.questaoMaisDemorada.numero} · ${formatarSegundosParaRelogio(r.questaoMaisDemorada.segundos)}`;
  document.getElementById("ppq-resultado-observacao").value = "";

  const notaTempo = document.getElementById("ppq-resultado-nota-tempo");
  if (notaTempo) {
    notaTempo.innerText = `✅ ${r.minutosRegistrados} min já registrados no seu histórico de estudos de hoje (como uma sessão única, tipo "Questões").`;
  }

  document.getElementById("modal-resultado-prova-por-questao").style.display =
    "flex";
}

function salvarResultadoProvaPorQuestao() {
  const r = provaPorQuestaoResultadoPendente;
  if (!r) return;

  const observacao = document
    .getElementById("ppq-resultado-observacao")
    .value.trim();
  r.questaoMaisDemorada.observacao = observacao;

  // Guarda os dados pra registrarSimulado() anexar ao registro assim que
  // o usuário completar e enviar o formulário (só falta informar os
  // acertos, preenchido a seguir).
  provaPorQuestaoParaRegistrar = r;
  provaPorQuestaoResultadoPendente = null;

  document.getElementById("modal-resultado-prova-por-questao").style.display =
    "none";

  preencherFormularioSimuladoApósProvaPorQuestao(r);
}

function descartarResultadoProvaPorQuestao() {
  provaPorQuestaoResultadoPendente = null;
  document.getElementById("modal-resultado-prova-por-questao").style.display =
    "none";
}

// Mesmo comportamento do fluxo do Simulado Cronometrado (ver
// preencherFormularioSimuladoApósCronometro): leva a pessoa direto pra
// aba Estudos com o formulário de registro já preenchido — só falta
// digitar os acertos.
function preencherFormularioSimuladoApósProvaPorQuestao(r) {
  navegarPara("estudos");

  setTimeout(() => {
    preencherSelectDeMetas("simulado-meta");

    const campoNome = document.getElementById("simulado-nome");
    const campoMeta = document.getElementById("simulado-meta");
    const campoTotal = document.getElementById("simulado-total");
    const campoAcertos = document.getElementById("simulado-acertos");

    if (campoNome) campoNome.value = r.nome;
    if (campoMeta && r.metaVinculada) campoMeta.value = r.metaVinculada;
    if (campoTotal) campoTotal.value = r.tempos.length;

    const cartaoSimulado = document.getElementById("card-simulados");
    if (cartaoSimulado) {
      cartaoSimulado.scrollIntoView({ behavior: "smooth", block: "center" });
      cartaoSimulado.classList.add("form-simulado-destaque");
      setTimeout(
        () => cartaoSimulado.classList.remove("form-simulado-destaque"),
        2600,
      );
    }
    if (campoAcertos) campoAcertos.focus();
  }, 150);
}

// Ao abrir o app, retoma uma Prova por Questão que já estava em
// andamento (ex: a pessoa recarregou a página no meio da prova). Como
// aqui não existe "tempo esgotado" (o cronômetro é só informativo, conta
// pra frente), simplesmente reabre a tela de onde parou.
function verificarProvaPorQuestaoEmAndamento() {
  if (!provaPorQuestaoDados) return;
  mostrarTelaProvaPorQuestao();
}

function renderizarSimulados() {
  const seletorMeta = document.getElementById("simulado-meta");
  if (seletorMeta) {
    const valorAtual = seletorMeta.value;
    seletorMeta.innerHTML = '<option value="">Sem prova vinculada</option>';
    metas.forEach((m) => {
      seletorMeta.innerHTML += `<option value="${escapeHtml(m.objetivoNome)}">${escapeHtml(m.objetivoNome)}</option>`;
    });
    if ([...seletorMeta.options].some((o) => o.value === valorAtual)) {
      seletorMeta.value = valorAtual;
    }
  }

  const lista = document.getElementById("simulados-lista-recente");
  if (!lista) return;

  const ordenados = [...registrosSimulados].sort((a, b) =>
    a.data < b.data ? 1 : -1,
  );

  if (ordenados.length === 0) {
    lista.innerHTML =
      '<p class="sessoes-hoje-vazio">Nenhum simulado registrado ainda.</p>';
    return;
  }

  // Nota média geral, pra dar um resumo rápido no topo da lista.
  const totalGeral = registrosSimulados.reduce((s, r) => s + r.total, 0);
  const acertosGeral = registrosSimulados.reduce((s, r) => s + r.acertos, 0);
  const mediaGeralHtml =
    totalGeral > 0
      ? `<div class="simulados-media-geral">Média geral: <strong>${Math.round((acertosGeral / totalGeral) * 100)}%</strong> em ${registrosSimulados.length} simulado(s)</div>`
      : "";

  lista.innerHTML =
    mediaGeralHtml +
    ordenados
      .map((r) => {
        const pct = Math.round((r.acertos / r.total) * 100);
        const vinculo = r.metaVinculada
          ? `🎯 ${escapeHtml(r.metaVinculada)}`
          : "Sem prova vinculada";
        // Prova por Questão: linha extra com tempo total, média por
        // questão e qual foi a mais demorada (e a observação, se houver).
        const detalheTempo = r.provaPorQuestao
          ? `<span class="simulados-item-detalhe">⏱️ ${formatarSegundosParaRelogio(r.provaPorQuestao.tempoTotalSegundos)} no total · média ${formatarSegundosParaRelogio(r.provaPorQuestao.duracaoMediaSegundos)}/questão · mais lenta: Q${r.provaPorQuestao.questaoMaisDemorada.numero} (${formatarSegundosParaRelogio(r.provaPorQuestao.questaoMaisDemorada.segundos)})</span>`
          : "";
        const detalheObservacao = r.provaPorQuestao?.questaoMaisDemorada
          ?.observacao
          ? `<span class="simulados-item-detalhe simulados-item-observacao">📝 ${escapeHtml(r.provaPorQuestao.questaoMaisDemorada.observacao)}</span>`
          : "";
        return `
        <div class="simulados-item">
          <div class="simulados-item-info">
            <span class="simulados-item-nome">${escapeHtml(r.nome)}</span>
            <span class="simulados-item-detalhe">${r.acertos}/${r.total} acertos (${pct}%) · ${vinculo} · ${r.data.split("-").reverse().join("/")}</span>
            ${detalheTempo}
            ${detalheObservacao}
          </div>
          <button type="button" onclick="excluirRegistroSimulado('${r.id}')" title="Excluir registro">✕</button>
        </div>
      `;
      })
      .join("");
}

function abrirModalEditarMateria(indice) {
  const m = materias[indice];
  if (!m) return;

  document.getElementById("edit-mat-indice").value = indice;
  document.getElementById("edit-mat-nome").value = m.nome;
  document.getElementById("edit-mat-peso").value = m.peso || 1;
  document.getElementById("edit-mat-cor").value = m.cor || paletaCores[0].hex;

  renderizarEstrelasPeso(
    "edit-peso-estrelas-container",
    "edit-mat-peso",
    m.peso || 1,
  );

  renderizarChecklistVinculoMetas(
    "edit-mat-vinc-meta-lista",
    m.metasVinculadas || [],
  );

  renderizarTopicosEdicao();

  document.getElementById("modal-editar-materia").style.display = "flex";
}

function fecharModalEditarMateria() {
  document.getElementById("modal-editar-materia").style.display = "none";
}

// Sugere uma nova cor automática pro campo de cor do modal de edição —
// mesma lógica do cadastro (gerarCorAutomaticaMateria), ignorando a
// própria cor atual da matéria sendo editada pra não competir com ela.
function sugerirNovaCorMateria() {
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  const corSugerida = gerarCorAutomaticaMateria(m ? m.nome : null);
  document.getElementById("edit-mat-cor").value = corSugerida;
}

// --- SUB-TÓPICOS DA MATÉRIA (checklist do edital dentro de cada matéria) ---
// As alterações de tópico (adicionar/marcar/remover) já salvam direto no
// localStorage assim que acontecem, sem precisar clicar em "Salvar
// Alterações" do formulário — igual o padrão usado nas tarefas do app.
function renderizarTopicosEdicao() {
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  const lista = document.getElementById("edit-topicos-lista");
  if (!m || !lista) return;

  const topicos = m.topicos || [];

  if (topicos.length === 0) {
    lista.innerHTML =
      '<p class="edit-topicos-vazio">Nenhum tópico cadastrado ainda. Adicione os tópicos do edital pra acompanhar o progresso dentro dessa matéria.</p>';
    return;
  }

  const concluidos = topicos.filter((t) => t.concluido).length;
  const pct = Math.round((concluidos / topicos.length) * 100);

  const barraHtml = `
    <div class="edit-topicos-progresso">
      <div class="edit-topicos-progresso-fundo">
        <div class="edit-topicos-progresso-fill" style="width:${pct}%"></div>
      </div>
      <span>${concluidos}/${topicos.length} concluídos</span>
    </div>
  `;

  const itensHtml = topicos
    .map(
      (t) => `
    <div class="edit-topico-item">
      <div class="edit-topico-linha-topo">
        <label>
          <input type="checkbox" ${t.concluido ? "checked" : ""} onchange="alternarTopicoMateria('${t.id}')" />
          <span class="${t.concluido ? "edit-topico-concluido" : ""}">${escapeHtml(t.nome)}</span>
        </label>
        <button type="button" onclick="removerTopicoMateria('${t.id}')" title="Remover tópico">✕</button>
      </div>
      <input
        type="text"
        class="edit-topico-nota-input"
        placeholder="📝 O que errei / o que revisar (opcional)"
        value="${escapeHtml(t.nota || "")}"
        onchange="salvarNotaTopico('${t.id}', this.value)"
      />
    </div>
  `,
    )
    .join("");

  lista.innerHTML = barraHtml + itensHtml;
}

function adicionarTopicoMateria(event) {
  if (event) event.preventDefault();
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  if (!m) return;

  const input = document.getElementById("edit-topico-novo-nome");
  const nome = input.value.trim();
  if (!nome) return;

  if (!m.topicos) m.topicos = [];
  m.topicos.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nome,
    concluido: false,
  });
  localStorage.setItem("materias", JSON.stringify(materias));

  input.value = "";
  renderizarTopicosEdicao();
}

// Cola uma lista de tópicos (um por linha, ex: colado direto do edital em
// PDF) e cadastra todos de uma vez, ignorando linhas em branco e tópicos
// cujo nome já existe nessa matéria (não faz sentido duplicado).
async function importarTopicosEmLote(event) {
  if (event) event.preventDefault();
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  if (!m) return;

  const textarea = document.getElementById("edit-topicos-lote");
  const linhas = textarea.value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (linhas.length === 0) {
    await mostrarAlerta("Cole ao menos um tópico, um por linha.");
    return;
  }

  if (!m.topicos) m.topicos = [];
  const nomesExistentes = new Set(
    m.topicos.map((t) => t.nome.trim().toLowerCase()),
  );
  const vistosNesseLote = new Set();

  let adicionados = 0;
  let ignorados = 0;

  linhas.forEach((linha, i) => {
    const chave = linha.toLowerCase();
    if (nomesExistentes.has(chave) || vistosNesseLote.has(chave)) {
      ignorados++;
      return;
    }
    vistosNesseLote.add(chave);
    m.topicos.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i,
      nome: linha,
      concluido: false,
    });
    adicionados++;
  });

  localStorage.setItem("materias", JSON.stringify(materias));
  textarea.value = "";
  renderizarTopicosEdicao();

  let msg = `${adicionados} tópico${adicionados === 1 ? "" : "s"} importado${adicionados === 1 ? "" : "s"}.`;
  if (ignorados > 0) {
    msg += ` ${ignorados} repetido${ignorados === 1 ? "" : "s"} ${ignorados === 1 ? "foi ignorado" : "foram ignorados"} (já existia${ignorados === 1 ? "" : "m"} nessa matéria).`;
  }
  await mostrarAlerta(msg, { icone: "📥" });
}

// Anotação rápida do que errar/revisar naquele tópico específico. Aparece
// de novo junto com ele quando volta pra fila de revisão espaçada, pra
// lembrar exatamente o que prestar atenção dessa vez.
function salvarNotaTopico(topicoId, valor) {
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  if (!m || !m.topicos) return;

  const topico = m.topicos.find((t) => t.id === topicoId);
  if (!topico) return;

  topico.nota = valor.trim();
  localStorage.setItem("materias", JSON.stringify(materias));

  // Atualiza a revisão pendente em segundo plano (sem re-renderizar a
  // própria lista de tópicos do modal, senão o campo perderia o foco
  // enquanto a pessoa ainda está digitando/navegando entre campos).
  renderizarRevisaoPendente();
}

function alternarTopicoMateria(topicoId) {
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  if (!m || !m.topicos) return;

  const topico = m.topicos.find((t) => t.id === topicoId);
  if (!topico) return;
  topico.concluido = !topico.concluido;
  // Guarda quando foi concluído — usado pela previsão de conclusão do
  // edital (calcula o ritmo de tópicos/dia com base nisso).
  topico.concluidoEm = topico.concluido
    ? obterDataLocalString(new Date())
    : null;

  // Primeira vez que esse tópico é concluído: cria o "cartão" de revisão
  // espaçada (SM-2) pra ele, agendado pra revisar a partir de hoje.
  if (topico.concluido && !topico.srs) {
    const peso = m.peso || 1;
    topico.srs = SRS_PADRAO(peso);
  }

  localStorage.setItem("materias", JSON.stringify(materias));

  renderizarTopicosEdicao();
  renderizarMateriasCadastradas();
  renderizarRevisaoPendente();
}

function removerTopicoMateria(topicoId) {
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  if (!m || !m.topicos) return;

  m.topicos = m.topicos.filter((t) => t.id !== topicoId);
  localStorage.setItem("materias", JSON.stringify(materias));

  renderizarTopicosEdicao();
}

async function salvarEdicaoMateria() {
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  if (!m) return;

  const novoNome = document.getElementById("edit-mat-nome").value.trim();
  if (!novoNome) {
    await mostrarAlerta("O nome da matéria não pode ficar vazio.");
    return;
  }

  const duplicada = materias.some(
    (outra, i) =>
      i !== indice &&
      outra.nome.trim().toLowerCase() === novoNome.toLowerCase(),
  );
  if (duplicada) {
    await mostrarAlerta(`Já existe outra matéria chamada "${novoNome}".`);
    return;
  }

  const nomeAntigo = m.nome;
  const novaCor = document.getElementById("edit-mat-cor").value;
  const novoPeso =
    parseInt(document.getElementById("edit-mat-peso").value, 10) || 1;
  const novasMetas = lerChecklistVinculoMetas("edit-mat-vinc-meta-lista");

  // Se o nome mudou, migra o histórico existente (tempo acumulado e
  // sessões já registradas) pro nome novo — senão o histórico "perderia o
  // vínculo" com a matéria editada.
  if (novoNome !== nomeAntigo) {
    if (tempoPorMateria[nomeAntigo] !== undefined) {
      tempoPorMateria[novoNome] =
        (tempoPorMateria[novoNome] || 0) + tempoPorMateria[nomeAntigo];
      delete tempoPorMateria[nomeAntigo];
      localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));
    }
    logsSessoes.forEach((log) => {
      if (log.materia === nomeAntigo) log.materia = novoNome;
    });
    localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));
  }

  materias[indice] = {
    ...m,
    nome: novoNome,
    metasVinculadas: novasMetas,
    cor: novaCor,
    peso: novoPeso,
  };
  localStorage.setItem("materias", JSON.stringify(materias));

  fecharModalEditarMateria();
  mostrarToastGamificacao("✏️", "Matéria Atualizada", novoNome);
  renderizarTodoOPainel();
}

async function excluirMateria(indice) {
  const m = materias[indice];
  if (!m) return;

  const confirmado = await mostrarConfirmacao(
    `Excluir a matéria "${m.nome}"? O histórico de tempo já estudado nela permanece nas estatísticas, mas ela deixa de aparecer nos seletores e no cadastro.`,
    { icone: "🗑️", textoConfirmar: "Excluir", perigo: true },
  );
  if (!confirmado) return;

  materias.splice(indice, 1);
  localStorage.setItem("materias", JSON.stringify(materias));

  renderizarTodoOPainel();
}

function adicionarNovaMeta(e) {
  e.preventDefault();
  let objetivoNome = document.getElementById("meta-objetivo-nome").value.trim();
  let dataLimite = document.getElementById("meta-prova-data").value;
  let qtdMaterias = parseInt(
    document.getElementById("meta-qtd-materias").value,
  );

  // Campos da prova de concurso — todos opcionais, pra não quebrar o
  // cadastro de quem só quer registrar uma meta simples de estudo.
  const remuneracaoValor = document.getElementById("meta-remuneracao").value;
  const remuneracao =
    remuneracaoValor !== "" ? parseFloat(remuneracaoValor) : null;
  const valorInscricaoValor = document.getElementById(
    "meta-valor-inscricao",
  ).value;
  const valorInscricao =
    valorInscricaoValor !== "" ? parseFloat(valorInscricaoValor) : null;
  const inscricaoInicio =
    document.getElementById("meta-inscricao-inicio").value || null;
  const inscricaoFim =
    document.getElementById("meta-inscricao-fim").value || null;
  const notaCorteValor = document.getElementById("meta-nota-corte").value;
  const notaCorte = notaCorteValor !== "" ? parseFloat(notaCorteValor) : null;

  // Se esses dados vieram do Analisador de Edital (IA) e ainda não foram
  // consumidos, anexa a lista de cargos extraída à prova sendo cadastrada
  // agora — depois zera a variável pra não vazar pra próxima prova.
  const cargos = cargosExtraidosEditalPendentes || null;
  cargosExtraidosEditalPendentes = null;

  metas.push({
    objetivoNome,
    dataLimite,
    qtdMaterias,
    remuneracao,
    valorInscricao,
    inscricaoInicio,
    inscricaoFim,
    notaCorte,
    cargos,
  });
  localStorage.setItem("metas", JSON.stringify(metas));

  // Se a pessoa cadastrou uma data final de inscrição, já aproveita esse
  // gesto do usuário (o submit do formulário) pra pedir permissão de
  // notificação — é o mesmo padrão usado ao iniciar um Pomodoro.
  if (inscricaoFim) solicitarPermissaoNotificacao();

  document.getElementById("meta-only-form").reset();
  renderizarTodoOPainel();
}

// --- ALARME DE INSCRIÇÃO (provas de concurso) ---
// Calcula quantos dias faltam pro fim da inscrição de uma prova e devolve
// um "status" pronto pra exibir: encerrada, ainda não aberta, terminando
// (<=3 dias) ou aberta normalmente. Provas sem data de inscrição cadastrada
// simplesmente não mostram nenhum selo.
function calcularStatusInscricao(meta) {
  if (!meta.inscricaoFim) return null;

  const hojeStr = obterDataLocalString(new Date());
  const diffDias = Math.ceil(
    (new Date(meta.inscricaoFim + "T23:59:59") - new Date()) /
      (1000 * 60 * 60 * 24),
  );

  if (meta.inscricaoFim < hojeStr) {
    return { texto: "🔒 Inscrições encerradas", classe: "status-overtime" };
  }
  if (meta.inscricaoInicio && hojeStr < meta.inscricaoInicio) {
    return { texto: "⏳ Inscrições ainda não abertas", classe: "status-foco" };
  }
  if (diffDias <= 3) {
    return {
      texto:
        diffDias === 0
          ? "⚠️ Inscrição encerra hoje!"
          : `⚠️ Encerra em ${diffDias} dia(s)!`,
      classe: "status-atencao",
    };
  }
  return {
    texto: `✅ Inscrições abertas · ${diffDias} dias restantes`,
    classe: "status-pausa",
  };
}

// Roda a cada atualização do painel: monta o banner de "inscrição
// terminando" (quando faltam 3 dias ou menos) e dispara UMA notificação do
// navegador por prova por dia — sem repetir a cada re-render, senão o
// alerta apareceria dezenas de vezes enquanto o app está aberto.
function verificarAlarmesInscricao() {
  const hojeStr = obterDataLocalString(new Date());

  const proximas = metas.filter((meta) => {
    if (!meta.inscricaoFim) return false;
    const diffDias = Math.ceil(
      (new Date(meta.inscricaoFim + "T23:59:59") - new Date()) /
        (1000 * 60 * 60 * 24),
    );
    return diffDias >= 0 && diffDias <= 3;
  });

  const banner = document.getElementById("alerta-inscricoes-proximas");
  if (banner) {
    if (proximas.length === 0) {
      banner.style.display = "none";
      banner.innerHTML = "";
    } else {
      banner.style.display = "block";
      banner.innerHTML = proximas
        .map((m) => {
          const diffDias = Math.ceil(
            (new Date(m.inscricaoFim + "T23:59:59") - new Date()) /
              (1000 * 60 * 60 * 24),
          );
          const quando =
            diffDias === 0
              ? "encerra <strong>hoje</strong>"
              : `encerra em <strong>${diffDias} dia(s)</strong>`;
          return `⏰ Inscrição de <strong>${escapeHtml(m.objetivoNome)}</strong> ${quando}!`;
        })
        .join("<br>");
    }
  }

  const jaAvisadoHoje =
    JSON.parse(localStorage.getItem("alarmesInscricaoAvisados")) || {};

  proximas.forEach((meta) => {
    if (jaAvisadoHoje[meta.objetivoNome] === hojeStr) return;

    const diffDias = Math.ceil(
      (new Date(meta.inscricaoFim + "T23:59:59") - new Date()) /
        (1000 * 60 * 60 * 24),
    );
    const corpo =
      diffDias === 0
        ? "A inscrição encerra hoje — não deixe pra depois!"
        : `Faltam ${diffDias} dia(s) para o fim da inscrição.`;

    notificarSeEmSegundoPlano(
      `⏰ ${meta.objetivoNome}: inscrição acabando`,
      corpo,
    );
    jaAvisadoHoje[meta.objetivoNome] = hojeStr;
  });

  localStorage.setItem(
    "alarmesInscricaoAvisados",
    JSON.stringify(jaAvisadoHoje),
  );
}

function atualizarDropdowns() {
  const selectPomo = document.getElementById("pomo-materia");
  if (selectPomo) {
    // Guarda a seleção atual antes de reconstruir as opções — sem isso, a
    // matéria da sessão em andamento voltava para "Estudo Geral" toda vez
    // que o painel era re-renderizado (ex: ao completar uma sessão).
    const valorAtualPomo = selectPomo.value;
    selectPomo.innerHTML = '<option value="">Estudo Geral</option>';
    obterMateriasOrdenadasPorPeso().forEach((m) => {
      selectPomo.innerHTML += `<option value="${m.nome}">${m.nome}</option>`;
    });
    if ([...selectPomo.options].some((o) => o.value === valorAtualPomo)) {
      selectPomo.value = valorAtualPomo;
    }
  }

  // Checklist de "Vincular a Provas" do formulário de cadastro — guarda o
  // que já estava marcado antes de reconstruir, mesma ideia do select acima.
  const listaCadastro = document.getElementById("mat-vinc-meta-lista");
  if (listaCadastro) {
    const marcadosAntes = lerChecklistVinculoMetas("mat-vinc-meta-lista");
    renderizarChecklistVinculoMetas("mat-vinc-meta-lista", marcadosAntes);
  }
}

// --- CHECKLIST DE VÍNCULO COM METAS (matéria transversal a várias provas) ---
// Substitui o antigo <select> único por uma lista de checkboxes: uma
// matéria pode cair em mais de uma prova (ex: Português cobrado tanto pelo
// concurso X quanto pelo Y), então o vínculo precisa aceitar zero, uma ou
// várias metas marcadas ao mesmo tempo.
function renderizarChecklistVinculoMetas(containerId, marcados) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (metas.length === 0) {
    container.innerHTML =
      '<span class="campo-ajuda" style="margin: 0">Nenhuma prova cadastrada ainda — cadastre uma em "Provas & Metas" pra poder vincular.</span>';
    return;
  }

  const marcadosSet = new Set(marcados || []);
  container.innerHTML = metas
    .map((meta) => {
      const idSeguro = `${containerId}-${meta.objetivoNome}`.replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      const checked = marcadosSet.has(meta.objetivoNome) ? "checked" : "";
      const classeMarcado = marcadosSet.has(meta.objetivoNome)
        ? " marcado"
        : "";
      return `
        <label class="materia-vinculo-opcao${classeMarcado}" for="${idSeguro}">
          <input
            type="checkbox"
            id="${idSeguro}"
            value="${escapeHtml(meta.objetivoNome)}"
            ${checked}
          />
          <span class="materia-vinculo-opcao-icone">🎯</span>
          <span class="materia-vinculo-opcao-nome">${escapeHtml(meta.objetivoNome)}</span>
          <span class="materia-vinculo-opcao-selo">✓</span>
        </label>
      `;
    })
    .join("");

  // Fallback pra navegadores sem suporte a CSS :has(): alterna a classe
  // "marcado" no label manualmente a cada clique, refletindo o estado do
  // checkbox. Um listener por container (delegado), então funciona pra
  // qualquer quantidade de opções sem precisar religar nada.
  container.onchange = (evento) => {
    const input = evento.target;
    if (input.type !== "checkbox") return;
    const label = input.closest(".materia-vinculo-opcao");
    if (label) label.classList.toggle("marcado", input.checked);
  };
}

function lerChecklistVinculoMetas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(
    container.querySelectorAll('input[type="checkbox"]:checked'),
  ).map((cb) => cb.value);
}

// --- PROVA/EXAME EM FOCO (filtro de estatísticas por meta) ---
// Cada "meta" já representa uma prova/exame (objetivoNome + data + qtd. de
// tópicos do edital), e cada matéria pode estar vinculada a uma delas
// (m.metasVinculadas). Esse filtro só decide QUAL prova está "em foco" pra
// fins de exibição — ele não separa os dados em áreas diferentes do
// localStorage, então nada é duplicado nem perdido ao trocar de prova.
function obterMetaFiltroAtiva() {
  return localStorage.getItem("metaFiltroAtivo") || "";
}

// Uma matéria pode estar vinculada a mais de uma prova (conteúdos
// transversais, cobrados por bancas/concursos diferentes) — daí
// m.metasVinculadas ser um array, não mais um nome só.
// Migra matérias salvas no formato antigo (m.metaVinculada = string única)
// pro novo formato (m.metasVinculadas = array) — necessário pra permitir
// vincular uma matéria a mais de uma prova (conteúdo transversal cobrado
// por bancas/concursos diferentes) sem perder o vínculo já cadastrado
// antes dessa mudança. Roda toda vez que `materias` é carregado do
// localStorage (é idempotente: matérias já migradas não são afetadas).
function migrarMateriasParaMultiMeta(lista) {
  (lista || []).forEach((m) => {
    if (!Array.isArray(m.metasVinculadas)) {
      m.metasVinculadas = m.metaVinculada ? [m.metaVinculada] : [];
    }
    delete m.metaVinculada;
  });
}

function materiaVinculadaAMeta(m, nomeMeta) {
  return (m.metasVinculadas || []).includes(nomeMeta);
}

// "" (Todas as Provas) sempre retorna a lista completa de matérias.
function obterMateriasDoFiltroAtivo() {
  const filtro = obterMetaFiltroAtiva();
  if (!filtro) return materias;
  return materias.filter((m) => materiaVinculadaAMeta(m, filtro));
}

// Chips de seleção (Todas as Provas + uma por meta cadastrada). Só aparece
// quando existe pelo menos uma meta — sem metas, não tem o que alternar.
// Cards de seleção (Todas as Provas + uma por meta cadastrada). Cada card
// de prova mostra dias restantes e o % do edital concluído (tópicos das
// matérias vinculadas a ela) — dá pra bater o olho e ver quais provas
// estão mais urgentes/adiantadas sem precisar entrar em "Provas & Metas".
// Só aparece quando existe pelo menos uma meta — sem metas, não tem o que
// alternar.
function renderizarSeletorProvas() {
  const container = document.getElementById("seletor-provas-container");
  const lista = document.getElementById("seletor-provas-lista");
  if (!container || !lista) return;

  if (metas.length === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  const filtro = obterMetaFiltroAtiva();
  const hoje = new Date();

  const cardTodas = `
    <button
      type="button"
      class="prova-card${filtro === "" ? " prova-card-ativa" : ""}"
      onclick="selecionarProvaAtiva('')"
    >
      <span class="prova-card-icone">📚</span>
      <span class="prova-card-corpo">
        <span class="prova-card-nome">Todas as Provas</span>
        <span class="prova-card-sub">${materias.length} matéria(s) no total</span>
      </span>
    </button>
  `;

  const cardsProvas = metas
    .map((meta) => {
      const nomeEscapadoJs = String(meta.objetivoNome).replace(/'/g, "\\'");
      const ativa = filtro === meta.objetivoNome;

      const diasRestantes = meta.dataLimite
        ? Math.ceil((new Date(meta.dataLimite + "T23:59:59") - hoje) / 86400000)
        : null;
      let sub;
      if (diasRestantes === null) {
        sub = "sem data definida";
      } else if (diasRestantes < 0) {
        sub = "prova já passou";
      } else if (diasRestantes === 0) {
        sub = "é hoje!";
      } else {
        sub = `${diasRestantes} dia${diasRestantes === 1 ? "" : "s"} restante${diasRestantes === 1 ? "" : "s"}`;
      }

      const materiasDaMeta = materias.filter((m) =>
        materiaVinculadaAMeta(m, meta.objetivoNome),
      );
      let topicosConcluidos = 0;
      let topicosTotais = 0;
      materiasDaMeta.forEach((m) => {
        const topicos = m.topicos || [];
        topicosTotais += topicos.length;
        topicosConcluidos += topicos.filter((t) => t.concluido).length;
      });
      const pctEdital =
        topicosTotais > 0
          ? Math.round((topicosConcluidos / topicosTotais) * 100)
          : null;

      const urgente =
        diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 14;

      return `
        <button
          type="button"
          class="prova-card${ativa ? " prova-card-ativa" : ""}${urgente ? " prova-card-urgente" : ""}"
          onclick="selecionarProvaAtiva('${nomeEscapadoJs}')"
        >
          <span class="prova-card-icone">${urgente ? "⏰" : "🎯"}</span>
          <span class="prova-card-corpo">
            <span class="prova-card-nome">${escapeHtml(meta.objetivoNome)}</span>
            <span class="prova-card-sub">${sub} · ${materiasDaMeta.length} matéria(s)</span>
            ${
              pctEdital !== null
                ? `<span class="prova-card-barra"><span style="width:${pctEdital}%"></span></span><span class="prova-card-pct">${pctEdital}% do edital</span>`
                : ""
            }
          </span>
        </button>
      `;
    })
    .join("");

  lista.innerHTML = cardTodas + cardsProvas;

  atualizarSetaSeletorProvas();
}

// Mostra/esconde o botão de seta do seletor de provas: só faz sentido
// exibi-lo quando as provas realmente não cabem todas na largura
// disponível (senão não tem pra onde rolar/avançar).
function atualizarSetaSeletorProvas() {
  const lista = document.getElementById("seletor-provas-lista");
  const seta = document.getElementById("seletor-provas-seta");
  if (!lista || !seta) return;

  // Espera o próximo frame pra garantir que o layout já foi calculado
  // (innerHTML acabou de ser trocado).
  requestAnimationFrame(() => {
    const temOverflow = lista.scrollWidth > lista.clientWidth + 2;
    seta.style.display = temOverflow ? "flex" : "none";
  });
}

// Avança a lista de provas por um "passo" (perto da largura visível).
// Ao chegar no fim, o próximo clique volta pro início — assim um único
// botão dá pra percorrer todas as provas cadastradas em loop.
function avancarSeletorProvas() {
  const lista = document.getElementById("seletor-provas-lista");
  if (!lista) return;

  const maxScroll = lista.scrollWidth - lista.clientWidth;
  if (lista.scrollLeft >= maxScroll - 4) {
    lista.scrollTo({ left: 0, behavior: "smooth" });
  } else {
    lista.scrollBy({ left: lista.clientWidth * 0.8, behavior: "smooth" });
  }
}

// Se a janela for redimensionada (ex: virar o celular, ou redimensionar
// a janela no desktop), reavalia se a seta ainda é necessária.
window.addEventListener("resize", () => {
  if (typeof metas !== "undefined" && metas.length > 0) {
    atualizarSetaSeletorProvas();
  }
});

// Troca a prova em foco e redesenha tudo que depende dela (gráfico, lista
// de matérias cadastradas, revisão pendente, questões e o widget de meta).
function selecionarProvaAtiva(nomeObjetivo) {
  localStorage.setItem("metaFiltroAtivo", nomeObjetivo);
  renderizarTodoOPainel();
}

// Marca/desmarca a prova como aprovado — usado pelo checkbox "Aprovado"
// no card de "Provas Cadastradas". Em vez de marcar direto, abre uma
// janela com um resumo do histórico de estudo pra essa prova (tempo
// dedicado, questões, melhor matéria etc.) e um campo pra escrever uma
// mensagem pessoal sobre a jornada — que fica salva e pode ser relida
// depois, reabrindo essa mesma janela pelo card. As conquistas de
// aprovação (ver CONQUISTAS mais abaixo) contam quantas provas estão
// marcadas como aprovadas.
// Calcula os números de estudo (tempo dedicado, questões e % de acerto)
// pra uma prova — usado tanto ao abrir o modal de aprovação quanto no
// comparativo de desempenho pós-prova, pra não duplicar a mesma conta em
// dois lugares.
function calcularResumoEstudoParaProva(meta) {
  const materiasDaMeta = materias.filter((m) =>
    materiaVinculadaAMeta(m, meta.objetivoNome),
  );
  const nomesDaMeta = new Set(materiasDaMeta.map((m) => m.nome));

  const tempoMinutos = materiasDaMeta.reduce(
    (soma, m) => soma + (tempoPorMateria[m.nome] || 0),
    0,
  );

  const registrosDaMeta = registrosQuestoes.filter((r) =>
    nomesDaMeta.has(r.materia),
  );
  const questoesTotal = registrosDaMeta.reduce((s, r) => s + r.total, 0);
  const questoesAcertos = registrosDaMeta.reduce((s, r) => s + r.acertos, 0);
  const percentualEstudo =
    questoesTotal > 0
      ? Math.round((questoesAcertos / questoesTotal) * 100)
      : null;

  return {
    materiasDaMeta,
    nomesDaMeta,
    tempoMinutos,
    registrosDaMeta,
    questoesTotal,
    percentualEstudo,
  };
}

// Gera a mesma frase comparativa "desempenho na prova x preparação" usada
// no modal de aprovação, mas em versão curta pra caber no topo do card —
// assim a conquista fica visível de cara, sem precisar abrir o modal.
// Retorna null quando não há dado suficiente (sem acertos/erros, ou sem
// questões registradas na preparação pra comparar).
function calcularFraseComparativoPosProva(meta) {
  const acertos = meta.provaPosAcertos;
  const erros = meta.provaPosErros;
  if (acertos == null || erros == null) return null;

  const total = acertos + erros;
  if (total <= 0) return null;

  const pctProva = Math.round((acertos / total) * 100);
  const resumoEstudo = calcularResumoEstudoParaProva(meta);
  if (resumoEstudo.percentualEstudo == null) {
    return { texto: `🎯 ${pctProva}% de acerto na prova`, classe: "" };
  }

  const diff = pctProva - resumoEstudo.percentualEstudo;
  if (diff > 0) {
    return {
      texto: `🔥 ${pctProva}% na prova — ${diff} pt(s) acima da sua média de estudo`,
      classe: "prova-card-comparativo-positivo",
    };
  }
  if (diff < 0) {
    return {
      texto: `📉 ${pctProva}% na prova — ${Math.abs(diff)} pt(s) abaixo da sua média de estudo`,
      classe: "prova-card-comparativo-negativo",
    };
  }
  return {
    texto: `🎯 ${pctProva}% na prova — igual à sua média de estudo`,
    classe: "",
  };
}

function abrirModalAprovacaoMeta(indice) {
  const meta = metas[indice];
  if (!meta) return;

  const modal = document.getElementById("modal-aprovacao-prova");
  if (!modal) return;

  document.getElementById("aprovacao-prova-indice").value = indice;

  const resumoEstudo = calcularResumoEstudoParaProva(meta);
  const { nomesDaMeta, materiasDaMeta, tempoMinutos, registrosDaMeta } =
    resumoEstudo;

  // Melhor matéria: prioriza quem já tem uma amostra minimamente confiável
  // de questões; se nenhuma matéria bater esse mínimo, usa a de maior %
  // mesmo assim (melhor um retrato aproximado do que nada).
  const desempenhoPorMateria = calcularDesempenhoPorMateria(registrosDaMeta);
  const AMOSTRA_MINIMA_APROVACAO = 3;
  const candidatosConfiaveis = desempenhoPorMateria.filter(
    (d) => d.total >= AMOSTRA_MINIMA_APROVACAO,
  );
  const melhorMateria =
    candidatosConfiaveis.length > 0
      ? candidatosConfiaveis[candidatosConfiaveis.length - 1]
      : desempenhoPorMateria.length > 0
        ? desempenhoPorMateria[desempenhoPorMateria.length - 1]
        : null;

  const sessoesDaMeta = logsSessoes.filter((log) =>
    nomesDaMeta.has(log.materia),
  );

  const simuladosDaMeta = (registrosSimulados || []).filter(
    (sim) => (sim.metaVinculada || "") === meta.objetivoNome,
  );

  let topicosConcluidos = 0;
  let topicosTotais = 0;
  materiasDaMeta.forEach((m) => {
    const topicos = m.topicos || [];
    topicosTotais += topicos.length;
    topicosConcluidos += topicos.filter((t) => t.concluido).length;
  });

  document.getElementById("aprovacao-prova-titulo").textContent = meta.aprovado
    ? `🎓 ${meta.objetivoNome}`
    : `Confirmar aprovação — ${meta.objetivoNome}`;

  const dataAprovacaoEl = document.getElementById("aprovacao-prova-data");
  if (meta.aprovado && meta.dataAprovacao) {
    dataAprovacaoEl.style.display = "block";
    dataAprovacaoEl.textContent = `Aprovado em ${new Date(
      meta.dataAprovacao + "T12:00:00",
    ).toLocaleDateString("pt-BR")}`;
  } else {
    dataAprovacaoEl.style.display = "none";
  }

  document.getElementById("aprovacao-stat-tempo").textContent =
    tempoMinutos > 0 ? formatarHorasMinutos(tempoMinutos) : "—";
  document.getElementById("aprovacao-stat-questoes").textContent =
    resumoEstudo.questoesTotal > 0
      ? `${resumoEstudo.questoesTotal} (${resumoEstudo.percentualEstudo}% de acerto)`
      : "Nenhuma registrada";
  document.getElementById("aprovacao-stat-melhor-materia").textContent =
    melhorMateria ? `${melhorMateria.materia} (${melhorMateria.pct}%)` : "—";
  document.getElementById("aprovacao-stat-topicos").textContent =
    topicosTotais > 0
      ? `${topicosConcluidos} / ${topicosTotais} concluídos`
      : "—";
  document.getElementById("aprovacao-stat-sessoes").textContent =
    sessoesDaMeta.length > 0 ? `${sessoesDaMeta.length} sessões` : "—";
  document.getElementById("aprovacao-stat-simulados").textContent =
    simuladosDaMeta.length > 0 ? `${simuladosDaMeta.length} realizado(s)` : "—";

  document.getElementById("aprovacao-prova-mensagem").value =
    meta.mensagemAprovacao || "";

  document.getElementById("aprovacao-pos-acertos").value =
    meta.provaPosAcertos ?? "";
  document.getElementById("aprovacao-pos-erros").value =
    meta.provaPosErros ?? "";
  document.getElementById("aprovacao-pos-duracao").value =
    meta.provaPosDuracao || "";
  document.getElementById("aprovacao-pos-tema-redacao").value =
    meta.provaPosTemaRedacao || "";
  atualizarResumoPosProva();

  // Se já existe algum dado de desempenho do dia da prova salvo, abre
  // direto na visão de resultado (comparando com a preparação) em vez do
  // formulário — a edição continua possível clicando no lápis, mesmo com
  // a prova já concluída/aprovada.
  const temDadosDesempenho =
    meta.provaPosAcertos != null ||
    meta.provaPosErros != null ||
    !!meta.provaPosDuracao ||
    !!meta.provaPosTemaRedacao;
  if (temDadosDesempenho) {
    mostrarResultadoPosProva(meta);
  } else {
    mostrarFormPosProva();
  }

  atualizarBotoesAprovacao(meta);

  modal.style.display = "flex";
}

// Mostra/oculta os botões "Desmarcar aprovação" e o texto do botão
// principal conforme o estado atual da meta — extraído em função própria
// porque é chamado tanto ao abrir o modal quanto depois de salvar (pra
// não fechar o modal e já refletir o novo estado "aprovado").
function atualizarBotoesAprovacao(meta) {
  const btnDesmarcar = document.getElementById("btn-desmarcar-aprovacao");
  const btnConfirmar = document.getElementById("btn-confirmar-aprovacao");
  if (meta.aprovado) {
    btnDesmarcar.style.display = "block";
    btnConfirmar.textContent = "💾 Salvar mensagem";
  } else {
    btnDesmarcar.style.display = "none";
    btnConfirmar.textContent = "🎓 Confirmar Aprovação";
  }
}

// Preenche e mostra o comparativo "desempenho na prova x desempenho na
// preparação" — é isso que transforma o número bruto de acertos/erros em
// algo com contexto real (X pontos acima/abaixo da média de estudo).
function renderizarResultadoPosProva(meta) {
  const resumoEstudo = calcularResumoEstudoParaProva(meta);

  const acertos = meta.provaPosAcertos;
  const erros = meta.provaPosErros;
  const total = (acertos || 0) + (erros || 0);
  const pctProva =
    acertos != null && erros != null && total > 0
      ? Math.round((acertos / total) * 100)
      : null;

  document.getElementById("aprovacao-resultado-pct").textContent =
    pctProva != null ? `${pctProva}%` : "—";

  const comparativoEl = document.getElementById(
    "aprovacao-resultado-comparativo",
  );
  if (pctProva == null) {
    comparativoEl.textContent =
      "Preencha acertos e erros pra ver a comparação com sua preparação.";
  } else if (resumoEstudo.percentualEstudo == null) {
    comparativoEl.textContent =
      "Você ainda não tem questões registradas na preparação pra comparar.";
  } else {
    const diff = pctProva - resumoEstudo.percentualEstudo;
    if (diff > 0) {
      comparativoEl.innerHTML = `🔥 <strong>${diff} ponto(s) acima</strong> da sua média nos estudos (${resumoEstudo.percentualEstudo}%)`;
    } else if (diff < 0) {
      comparativoEl.innerHTML = `📉 <strong>${Math.abs(diff)} ponto(s) abaixo</strong> da sua média nos estudos (${resumoEstudo.percentualEstudo}%)`;
    } else {
      comparativoEl.innerHTML = `🎯 Bateu exatamente sua média nos estudos (${resumoEstudo.percentualEstudo}%)`;
    }
  }

  document.getElementById("aprovacao-resultado-duracao").textContent =
    meta.provaPosDuracao || "—";
  document.getElementById("aprovacao-resultado-tempo-estudo").textContent =
    resumoEstudo.tempoMinutos > 0
      ? formatarHorasMinutos(resumoEstudo.tempoMinutos)
      : "—";

  const redacaoEl = document.getElementById("aprovacao-resultado-redacao");
  if (meta.provaPosTemaRedacao) {
    redacaoEl.style.display = "block";
    redacaoEl.textContent = `📝 Tema da redação: ${meta.provaPosTemaRedacao}`;
  } else {
    redacaoEl.style.display = "none";
  }
}

function mostrarResultadoPosProva(meta) {
  renderizarResultadoPosProva(meta);
  document.getElementById("aprovacao-pos-prova-form").style.display = "none";
  document.getElementById("aprovacao-pos-prova-resultado").style.display =
    "block";
  document.getElementById("btn-editar-desempenho-prova").style.display = "flex";
}

function mostrarFormPosProva() {
  document.getElementById("aprovacao-pos-prova-form").style.display = "block";
  document.getElementById("aprovacao-pos-prova-resultado").style.display =
    "none";
  document.getElementById("btn-editar-desempenho-prova").style.display = "none";
}

// Chamado pelo lápis ao lado do X: volta pro formulário pra corrigir os
// números do dia da prova, mesmo que ela já esteja marcada como aprovada.
function alternarParaEdicaoPosProva() {
  mostrarFormPosProva();
}

function fecharModalAprovacaoMeta() {
  const modal = document.getElementById("modal-aprovacao-prova");
  if (modal) modal.style.display = "none";
}

// Calcula, em tempo real, o total de questões e o % de acerto a partir dos
// campos de Acertos/Erros do dia da prova — só um resumo visual pra
// conferência, o cálculo em si é refeito na hora de exibir também.
function atualizarResumoPosProva() {
  const resumo = document.getElementById("aprovacao-pos-resumo");
  if (!resumo) return;

  const acertos = Number(
    document.getElementById("aprovacao-pos-acertos").value,
  );
  const erros = Number(document.getElementById("aprovacao-pos-erros").value);

  if (!acertos && !erros) {
    resumo.textContent = "";
    return;
  }

  const total = (acertos || 0) + (erros || 0);
  const pct = total > 0 ? Math.round(((acertos || 0) / total) * 100) : 0;
  resumo.textContent = `Total: ${total} questão(ões) · ${pct}% de acerto`;
}

function fecharModalAprovacaoMetaSeClicouFora(event) {
  if (event.target === event.currentTarget) fecharModalAprovacaoMeta();
}

// Confirma a aprovação (ou só atualiza a mensagem, se já estava aprovado)
// e persiste tudo — a data de aprovação só é gravada na primeira vez, pra
// não mudar toda vez que o usuário voltar aqui só pra reler/editar a
// mensagem.
function confirmarAprovacaoMeta() {
  const indice = Number(
    document.getElementById("aprovacao-prova-indice").value,
  );
  const meta = metas[indice];
  if (!meta) return;

  const mensagem = document
    .getElementById("aprovacao-prova-mensagem")
    .value.trim();
  const jaEstavaAprovado = meta.aprovado;

  meta.aprovado = true;
  meta.mensagemAprovacao = mensagem;
  if (!meta.dataAprovacao) {
    meta.dataAprovacao = new Date().toISOString().slice(0, 10);
  }

  // Estatísticas do dia da prova — tudo opcional, guardado só se o
  // candidato preencher (campo vazio vira "sem valor", não zero).
  const acertosValor = document.getElementById("aprovacao-pos-acertos").value;
  const errosValor = document.getElementById("aprovacao-pos-erros").value;
  meta.provaPosAcertos = acertosValor !== "" ? Number(acertosValor) : null;
  meta.provaPosErros = errosValor !== "" ? Number(errosValor) : null;
  meta.provaPosDuracao = document
    .getElementById("aprovacao-pos-duracao")
    .value.trim();
  meta.provaPosTemaRedacao = document
    .getElementById("aprovacao-pos-tema-redacao")
    .value.trim();

  localStorage.setItem("metas", JSON.stringify(metas));

  if (!jaEstavaAprovado) {
    mostrarToastGamificacao("🎓", "Aprovação Registrada!", meta.objetivoNome);
  }

  // Atualiza a lista de provas por trás do modal (já reflete a borda
  // dourada, o rótulo "Aprovado" e a frase comparativa no topo do card) e
  // fecha o modal — dar esse fechamento como confirmação visual clara de
  // que salvou é melhor do que deixar o modal aberto sem nenhuma mudança
  // perceptível na tela.
  renderizarTodoOPainel();
  fecharModalAprovacaoMeta();
}

// Desmarca a aprovação — a mensagem escrita continua salva (só some da
// vista, não é apagada), então dá pra marcar como aprovado de novo depois
// sem perder o que já foi escrito.
async function desmarcarAprovacaoMeta() {
  const indice = Number(
    document.getElementById("aprovacao-prova-indice").value,
  );
  const meta = metas[indice];
  if (!meta) return;

  const confirmado = await mostrarConfirmacao(
    `Desmarcar a aprovação de "${meta.objetivoNome}"? A mensagem que você escreveu continua salva, e dá pra marcar como aprovado de novo depois.`,
    { icone: "↩️", textoConfirmar: "Desmarcar", perigo: true },
  );
  if (!confirmado) return;

  meta.aprovado = false;
  localStorage.setItem("metas", JSON.stringify(metas));

  fecharModalAprovacaoMeta();
  renderizarTodoOPainel();
}

// Remove uma meta/prova. As matérias vinculadas a ela viram "Matéria
// Isolada" (nada é apagado do histórico de tempo já estudado).
async function excluirMeta(indice) {
  const meta = metas[indice];
  if (!meta) return;

  const confirmado = await mostrarConfirmacao(
    `Excluir a prova "${meta.objetivoNome}"? O vínculo com ela é removido das matérias (matérias vinculadas só a essa prova passam a "Matéria Isolada"; se estiverem vinculadas a outra(s) prova(s) também, esse outro vínculo é mantido) — o histórico de tempo estudado é mantido.`,
    { icone: "🗑️", textoConfirmar: "Excluir", perigo: true },
  );
  if (!confirmado) return;

  materias.forEach((m) => {
    if (materiaVinculadaAMeta(m, meta.objetivoNome)) {
      m.metasVinculadas = m.metasVinculadas.filter(
        (nm) => nm !== meta.objetivoNome,
      );
    }
  });
  localStorage.setItem("materias", JSON.stringify(materias));

  metas.splice(indice, 1);
  localStorage.setItem("metas", JSON.stringify(metas));

  if (obterMetaFiltroAtiva() === meta.objetivoNome) {
    localStorage.setItem("metaFiltroAtivo", "");
  }

  renderizarTodoOPainel();
}

// --- EDITAR PROVA CADASTRADA ---
// Antes só dava pra excluir e recadastrar do zero (perdendo o vínculo das
// matérias, já que ele é feito pelo NOME da prova). Agora dá pra alterar
// qualquer campo, incluindo a quantidade de tópicos do edital.
function abrirModalEditarProva(indice) {
  const meta = metas[indice];
  if (!meta) return;

  document.getElementById("edit-prova-indice").value = indice;
  document.getElementById("edit-prova-nome").value = meta.objetivoNome;
  document.getElementById("edit-prova-data").value = meta.dataLimite;
  document.getElementById("edit-prova-qtd-topicos").value = meta.qtdMaterias;
  document.getElementById("edit-prova-remuneracao").value =
    meta.remuneracao ?? "";
  document.getElementById("edit-prova-valor-inscricao").value =
    meta.valorInscricao ?? "";
  document.getElementById("edit-prova-inscricao-inicio").value =
    meta.inscricaoInicio || "";
  document.getElementById("edit-prova-inscricao-fim").value =
    meta.inscricaoFim || "";
  document.getElementById("edit-prova-nota-corte").value = meta.notaCorte ?? "";

  const qtdVinculadas = materias.filter((m) =>
    materiaVinculadaAMeta(m, meta.objetivoNome),
  ).length;
  const avisoVinculo = document.getElementById("edit-prova-aviso-vinculo");
  if (avisoVinculo) {
    if (qtdVinculadas > 0) {
      avisoVinculo.style.display = "block";
      avisoVinculo.innerText = `Essa prova tem ${qtdVinculadas} matéria(s) vinculada(s) pelo nome. Se você mudar o "Nome da Prova / Concurso", o vínculo delas (e de simulados registrados) é atualizado automaticamente pro novo nome.`;
    } else {
      avisoVinculo.style.display = "none";
    }
  }

  document.getElementById("modal-editar-prova").style.display = "flex";
}

function fecharModalEditarProva() {
  document.getElementById("modal-editar-prova").style.display = "none";
}

async function salvarEdicaoProva() {
  const indice = parseInt(
    document.getElementById("edit-prova-indice").value,
    10,
  );
  const meta = metas[indice];
  if (!meta) return;

  const novoNome = document.getElementById("edit-prova-nome").value.trim();
  const novaData = document.getElementById("edit-prova-data").value;
  const novaQtdTopicos = parseInt(
    document.getElementById("edit-prova-qtd-topicos").value,
    10,
  );

  if (!novoNome) {
    await mostrarAlerta("Informe o nome da prova.");
    return;
  }
  if (!novaData) {
    await mostrarAlerta("Informe a data da prova objetiva.");
    return;
  }
  if (!novaQtdTopicos || novaQtdTopicos <= 0) {
    await mostrarAlerta(
      "Informe a quantidade de tópicos do edital (maior que zero).",
    );
    return;
  }

  // Nome duplicado pra outra prova (não essa mesma) — o vínculo é feito
  // por nome, então dois iguais quebrariam a ligação com as matérias.
  const duplicada = metas.some(
    (m, i) =>
      i !== indice &&
      m.objetivoNome.trim().toLowerCase() === novoNome.toLowerCase(),
  );
  if (duplicada) {
    await mostrarAlerta(
      `Já existe outra prova chamada "${novoNome}". Escolha outro nome.`,
    );
    return;
  }

  const remuneracaoValor = document.getElementById(
    "edit-prova-remuneracao",
  ).value;
  const valorInscricaoValor = document.getElementById(
    "edit-prova-valor-inscricao",
  ).value;

  const nomeAntigo = meta.objetivoNome;

  meta.objetivoNome = novoNome;
  meta.dataLimite = novaData;
  meta.qtdMaterias = novaQtdTopicos;
  meta.remuneracao =
    remuneracaoValor !== "" ? parseFloat(remuneracaoValor) : null;
  meta.valorInscricao =
    valorInscricaoValor !== "" ? parseFloat(valorInscricaoValor) : null;
  meta.inscricaoInicio =
    document.getElementById("edit-prova-inscricao-inicio").value || null;
  meta.inscricaoFim =
    document.getElementById("edit-prova-inscricao-fim").value || null;
  const notaCorteValor = document.getElementById("edit-prova-nota-corte").value;
  meta.notaCorte = notaCorteValor !== "" ? parseFloat(notaCorteValor) : null;

  localStorage.setItem("metas", JSON.stringify(metas));

  // Se o nome mudou, atualiza em cascata tudo que vincula pelo NOME
  // antigo — senão as matérias e simulados "soltam" da prova sem avisar.
  if (novoNome !== nomeAntigo) {
    let algoMudou = false;
    materias.forEach((m) => {
      const idx = (m.metasVinculadas || []).indexOf(nomeAntigo);
      if (idx !== -1) {
        m.metasVinculadas[idx] = novoNome;
        algoMudou = true;
      }
    });
    if (algoMudou) localStorage.setItem("materias", JSON.stringify(materias));

    let simuladosMudaram = false;
    registrosSimulados.forEach((r) => {
      if (r.metaVinculada === nomeAntigo) {
        r.metaVinculada = novoNome;
        simuladosMudaram = true;
      }
    });
    if (simuladosMudaram) {
      localStorage.setItem(
        "registrosSimulados",
        JSON.stringify(registrosSimulados),
      );
    }

    if (obterMetaFiltroAtiva() === nomeAntigo) {
      localStorage.setItem("metaFiltroAtivo", novoNome);
    }
  }

  fecharModalEditarProva();
  renderizarTodoOPainel();
}

// --- COMPARATIVO ENTRE PROVAS (tempo, tópicos e % de acerto por meta) ---
function calcularEstatisticasPorProva() {
  const hoje = new Date();

  return metas.map((meta) => {
    const materiasDaMeta = materias.filter((m) =>
      materiaVinculadaAMeta(m, meta.objetivoNome),
    );
    const nomesDaMeta = new Set(materiasDaMeta.map((m) => m.nome));

    const tempoMinutos = materiasDaMeta.reduce(
      (soma, m) => soma + (tempoPorMateria[m.nome] || 0),
      0,
    );

    let topicosConcluidos = 0;
    let topicosTotais = 0;
    materiasDaMeta.forEach((m) => {
      const topicos = m.topicos || [];
      topicosTotais += topicos.length;
      topicosConcluidos += topicos.filter((t) => t.concluido).length;
    });

    const registrosDaMeta = registrosQuestoes.filter((r) =>
      nomesDaMeta.has(r.materia),
    );
    const questoesTotal = registrosDaMeta.reduce((s, r) => s + r.total, 0);
    const questoesAcertos = registrosDaMeta.reduce((s, r) => s + r.acertos, 0);

    // Sessões de estudo (Pomodoro + registros avulsos) das matérias vinculadas
    // a esta prova — dá pra ver quantas sessões, em quantos dias diferentes,
    // e a duração média de cada uma.
    const sessoesDaMeta = logsSessoes.filter((log) =>
      nomesDaMeta.has(log.materia),
    );
    const numSessoes = sessoesDaMeta.length;
    const diasEstudadosDistintos = new Set(sessoesDaMeta.map((log) => log.data))
      .size;
    const duracaoMediaSessao =
      numSessoes > 0 ? Math.round(tempoMinutos / numSessoes) : 0;

    // Simulados completos vinculados direto à prova (independe de matéria).
    const simuladosDaMeta = (registrosSimulados || []).filter(
      (sim) => (sim.metaVinculada || "") === meta.objetivoNome,
    );
    const simuladosTotal = simuladosDaMeta.length;
    const simuladosQuestoesTotal = simuladosDaMeta.reduce(
      (s, sim) => s + (sim.total || 0),
      0,
    );
    const simuladosAcertosTotal = simuladosDaMeta.reduce(
      (s, sim) => s + (sim.acertos || 0),
      0,
    );
    const simuladosPercentualAcerto =
      simuladosQuestoesTotal > 0
        ? Math.round((simuladosAcertosTotal / simuladosQuestoesTotal) * 100)
        : null;

    const prazo = new Date(meta.dataLimite + "T23:59:59");
    const diasRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));

    return {
      objetivoNome: meta.objetivoNome,
      tempoMinutos,
      topicosConcluidos,
      topicosTotais,
      percentualTopicos:
        topicosTotais > 0
          ? Math.round((topicosConcluidos / topicosTotais) * 100)
          : null,
      questoesTotal,
      questoesAcertos,
      percentualAcerto:
        questoesTotal > 0
          ? Math.round((questoesAcertos / questoesTotal) * 100)
          : null,
      numSessoes,
      diasEstudadosDistintos,
      duracaoMediaSessao,
      simuladosTotal,
      simuladosPercentualAcerto,
      diasRestantes,
    };
  });
}

let graficoComparativoProvas = null;

// Só faz sentido comparar provas quando "Todas as Provas" está selecionada
// no topo — com uma prova específica em foco, o card fica escondido (não
// tem o que comparar com ela mesma).
function renderizarComparativoProvas() {
  const card = document.getElementById("card-comparativo-provas");
  const corpoTabela = document.getElementById("comparativo-provas-corpo");
  const canvas = document.getElementById("chartComparativoProvas");
  if (!card || !corpoTabela) return;

  const filtro = obterMetaFiltroAtiva();
  if (filtro || metas.length === 0) {
    card.style.display = "none";
    if (graficoComparativoProvas) {
      graficoComparativoProvas.destroy();
      graficoComparativoProvas = null;
    }
    return;
  }
  card.style.display = "block";

  const stats = calcularEstatisticasPorProva();
  const maiorTempo = Math.max(1, ...stats.map((s) => s.tempoMinutos));

  corpoTabela.innerHTML = stats
    .map((s) => {
      const larguraBarra = Math.round((s.tempoMinutos / maiorTempo) * 100);
      const topicosTexto =
        s.topicosTotais > 0
          ? `${s.topicosConcluidos}/${s.topicosTotais} (${s.percentualTopicos}%)`
          : "Sem tópicos cadastrados";
      const acertoTexto =
        s.questoesTotal > 0
          ? `${s.percentualAcerto}% (${s.questoesAcertos}/${s.questoesTotal})`
          : "Sem questões registradas";
      const diasTexto =
        s.diasRestantes > 0
          ? `${s.diasRestantes} dias`
          : s.diasRestantes === 0
            ? "É hoje!"
            : "Prazo encerrado";

      return `
        <tr>
          <td><strong>🎯 ${escapeHtml(s.objetivoNome)}</strong></td>
          <td>
            <div class="comparativo-barra-fundo">
              <div class="comparativo-barra-preenchida" style="width:${larguraBarra}%;"></div>
            </div>
            <span class="comparativo-barra-legenda">${formatarHorasMinutos(s.tempoMinutos)}</span>
          </td>
          <td>${topicosTexto}</td>
          <td>${acertoTexto}</td>
          <td>${diasTexto}</td>
        </tr>
      `;
    })
    .join("");

  if (!canvas) return;
  if (graficoComparativoProvas) {
    graficoComparativoProvas.destroy();
  }

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  graficoComparativoProvas = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: stats.map((s) => s.objetivoNome),
      datasets: [
        {
          label: "% Tópicos concluídos",
          data: stats.map((s) => s.percentualTopicos || 0),
          backgroundColor: "#3b82f6",
          borderRadius: 6,
        },
        {
          label: "% Acerto em questões",
          data: stats.map((s) => s.percentualAcerto || 0),
          backgroundColor: "#10b981",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (valor) => `${valor}%`,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        x: {
          ticks: { color: corTextoMuted, font: { family: fonteApp } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: corTextoMuted,
            font: { family: fonteApp, size: 12 },
          },
        },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (contexto) =>
              ` ${contexto.dataset.label}: ${contexto.parsed.y}%`,
          },
        },
      },
    },
  });
}

// --- COMPARATIVO ENTRE PROVAS, ACESSÍVEL DIRETO DA ABA "PROVAS CADASTRADAS" ---
// Mesma fonte de dados do card de comparativo da aba Análises
// (calcularEstatisticasPorProva), só que aberto direto de um botão na aba
// de Cadastro — por isso o modal fica fora dos containers de aba (senão
// ficaria escondido junto com a aba de Cadastro quando a de Análises não
// estiver ativa) e independe do filtro de "prova em foco" no topo.
let graficoComparativoCadastroTempo = null;
let graficoComparativoCadastroDesempenho = null;
let graficoComparativoCadastroSimulados = null;

async function abrirComparativoProvasCadastradas() {
  if (metas.length < 2) {
    await mostrarAlerta(
      "Cadastre pelo menos 2 provas pra poder comparar o desempenho entre elas.",
      { icone: "📊" },
    );
    return;
  }

  renderizarComparativoProvasCadastro();
  abrirModalDetalheCard("modal-comparativo-provas-cadastro");
}

function renderizarComparativoProvasCadastro() {
  const corpoTabela = document.getElementById(
    "comparativo-provas-cadastro-corpo",
  );
  const corpoTabelaSessoes = document.getElementById(
    "comparativo-provas-cadastro-sessoes-corpo",
  );
  const canvasTempo = document.getElementById("chartComparativoCadastroTempo");
  const canvasDesempenho = document.getElementById(
    "chartComparativoCadastroDesempenho",
  );
  const canvasSimulados = document.getElementById(
    "chartComparativoCadastroSimulados",
  );
  if (!corpoTabela) return;

  const stats = calcularEstatisticasPorProva();

  corpoTabela.innerHTML = stats
    .map((s) => {
      const questoesTexto = s.questoesTotal > 0 ? `${s.questoesTotal}` : "—";
      const acertoTexto = s.questoesTotal > 0 ? `${s.percentualAcerto}%` : "—";
      const topicosTexto =
        s.topicosTotais > 0
          ? `${s.topicosConcluidos}/${s.topicosTotais} (${s.percentualTopicos}%)`
          : "Sem tópicos cadastrados";
      const diasTexto =
        s.diasRestantes > 0
          ? `${s.diasRestantes} dias`
          : s.diasRestantes === 0
            ? "É hoje!"
            : "Prazo encerrado";

      return `
        <tr>
          <td><strong>🎯 ${escapeHtml(s.objetivoNome)}</strong></td>
          <td>${formatarHorasMinutos(s.tempoMinutos)}</td>
          <td>${questoesTexto}</td>
          <td>${acertoTexto}</td>
          <td>${topicosTexto}</td>
          <td>${diasTexto}</td>
        </tr>
      `;
    })
    .join("");

  if (corpoTabelaSessoes) {
    corpoTabelaSessoes.innerHTML = stats
      .map((s) => {
        const simuladosTexto =
          s.simuladosTotal > 0 ? `${s.simuladosTotal}` : "—";
        const simuladosAcertoTexto =
          s.simuladosPercentualAcerto != null
            ? `${s.simuladosPercentualAcerto}%`
            : "—";

        return `
          <tr>
            <td><strong>🎯 ${escapeHtml(s.objetivoNome)}</strong></td>
            <td>${s.numSessoes}</td>
            <td>${s.diasEstudadosDistintos}</td>
            <td>${s.numSessoes > 0 ? formatarHorasMinutos(s.duracaoMediaSessao) : "—"}</td>
            <td>${simuladosTexto}</td>
            <td>${simuladosAcertoTexto}</td>
          </tr>
        `;
      })
      .join("");
  }

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  if (canvasTempo) {
    if (graficoComparativoCadastroTempo) {
      graficoComparativoCadastroTempo.destroy();
    }
    graficoComparativoCadastroTempo = new Chart(canvasTempo.getContext("2d"), {
      type: "bar",
      data: {
        labels: stats.map((s) => s.objetivoNome),
        datasets: [
          {
            label: "Tempo estudado (horas)",
            data: stats.map((s) => Math.round((s.tempoMinutos / 60) * 10) / 10),
            backgroundColor: "#3b82f6",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: corTextoMuted, font: { family: fonteApp } },
            grid: { color: "rgba(148,163,184,0.15)" },
          },
          x: {
            ticks: { color: corTextoMuted, font: { family: fonteApp } },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            bodyFont: { family: fonteApp },
            titleFont: { family: fonteApp },
            callbacks: {
              label: (contexto) => ` ${contexto.parsed.y}h estudadas`,
            },
          },
        },
      },
    });
  }

  if (canvasDesempenho) {
    if (graficoComparativoCadastroDesempenho) {
      graficoComparativoCadastroDesempenho.destroy();
    }
    graficoComparativoCadastroDesempenho = new Chart(
      canvasDesempenho.getContext("2d"),
      {
        type: "bar",
        data: {
          labels: stats.map((s) => s.objetivoNome),
          datasets: [
            {
              label: "% Tópicos concluídos",
              data: stats.map((s) => s.percentualTopicos || 0),
              backgroundColor: "#3b82f6",
              borderRadius: 6,
            },
            {
              label: "% Acerto em questões",
              data: stats.map((s) => s.percentualAcerto || 0),
              backgroundColor: "#10b981",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: {
                color: corTextoMuted,
                font: { family: fonteApp },
                callback: (valor) => `${valor}%`,
              },
              grid: { color: "rgba(148,163,184,0.15)" },
            },
            x: {
              ticks: { color: corTextoMuted, font: { family: fonteApp } },
              grid: { display: false },
            },
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: corTextoMuted,
                font: { family: fonteApp, size: 12 },
              },
            },
            tooltip: {
              bodyFont: { family: fonteApp },
              titleFont: { family: fonteApp },
              callbacks: {
                label: (contexto) =>
                  ` ${contexto.dataset.label}: ${contexto.parsed.y}%`,
              },
            },
          },
        },
      },
    );
  }

  if (canvasSimulados) {
    if (graficoComparativoCadastroSimulados) {
      graficoComparativoCadastroSimulados.destroy();
    }
    graficoComparativoCadastroSimulados = new Chart(
      canvasSimulados.getContext("2d"),
      {
        type: "bar",
        data: {
          labels: stats.map((s) => s.objetivoNome),
          datasets: [
            {
              type: "bar",
              label: "Simulados realizados",
              data: stats.map((s) => s.simuladosTotal),
              backgroundColor: "#f59e0b",
              borderRadius: 6,
              yAxisID: "yQtd",
            },
            {
              type: "line",
              label: "% Acerto nos simulados",
              data: stats.map((s) => s.simuladosPercentualAcerto || 0),
              borderColor: "#10b981",
              backgroundColor: "#10b981",
              yAxisID: "yPct",
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            yQtd: {
              position: "left",
              beginAtZero: true,
              ticks: {
                color: corTextoMuted,
                font: { family: fonteApp },
                precision: 0,
              },
              grid: { color: "rgba(148,163,184,0.15)" },
            },
            yPct: {
              position: "right",
              min: 0,
              max: 100,
              ticks: {
                color: corTextoMuted,
                font: { family: fonteApp },
                callback: (valor) => `${valor}%`,
              },
              grid: { display: false },
            },
            x: {
              ticks: { color: corTextoMuted, font: { family: fonteApp } },
              grid: { display: false },
            },
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: corTextoMuted,
                font: { family: fonteApp, size: 12 },
              },
            },
            tooltip: {
              bodyFont: { family: fonteApp },
              titleFont: { family: fonteApp },
              callbacks: {
                label: (contexto) =>
                  contexto.dataset.yAxisID === "yPct"
                    ? ` ${contexto.dataset.label}: ${contexto.parsed.y}%`
                    : ` ${contexto.dataset.label}: ${contexto.parsed.y}`,
              },
            },
          },
        },
      },
    );
  }
}

// --- RITMO SUGERIDO POR MATÉRIA (tópicos restantes ÷ dias até a prova) ---
// Só entram matérias vinculadas a uma meta e que já têm tópicos cadastrados
// (sem tópicos não dá pra saber "quanto falta"). Respeita o filtro de prova
// em foco: com uma prova específica selecionada, mostra só as matérias
// dela; com "Todas as Provas", mostra de todas.
function calcularRitmoSugerido() {
  const hoje = new Date();
  const filtroAtivo = obterMetaFiltroAtiva();

  return obterMateriasDoFiltroAtivo()
    .filter(
      (m) =>
        (m.metasVinculadas || []).length > 0 && (m.topicos || []).length > 0,
    )
    .map((m) => {
      // Matéria transversal (vinculada a mais de uma prova): com uma
      // prova específica em foco, usa o prazo dela; sem filtro, usa a
      // prova mais próxima entre as vinculadas — é o prazo mais urgente
      // pra decidir o ritmo dessa matéria.
      const metasDaMateria = m.metasVinculadas
        .map((nomeMeta) => metas.find((mt) => mt.objetivoNome === nomeMeta))
        .filter(Boolean);
      const meta = filtroAtivo
        ? metasDaMateria.find((mt) => mt.objetivoNome === filtroAtivo)
        : metasDaMateria.sort(
            (a, b) => new Date(a.dataLimite) - new Date(b.dataLimite),
          )[0];
      if (!meta) return null;

      const prazo = new Date(meta.dataLimite + "T23:59:59");
      const diasRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));

      const topicos = m.topicos || [];
      const concluidos = topicos.filter((t) => t.concluido).length;
      const restantes = topicos.length - concluidos;
      if (restantes <= 0) return null; // matéria já concluída, nada a sugerir

      // Ritmo próprio: minutos médios que essa matéria já levou por tópico
      // concluído (tempo real já estudado nela ÷ tópicos já concluídos).
      // Sem nenhum tópico concluído ainda, usa uma estimativa genérica de
      // 40 min/tópico só como ponto de partida, marcada como tal na tela.
      const minutosEstudados = tempoPorMateria[m.nome] || 0;
      const mediaMinutosPorTopico =
        concluidos > 0 ? minutosEstudados / concluidos : 40;

      const minutosNecessarios = restantes * mediaMinutosPorTopico;
      const diasParaDistribuir = Math.max(1, diasRestantes);
      const minutosPorDia = minutosNecessarios / diasParaDistribuir;

      return {
        materia: m,
        meta,
        diasRestantes,
        restantes,
        totalTopicos: topicos.length,
        minutosPorDia,
        estimativaGenerica: concluidos === 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.minutosPorDia - a.minutosPorDia);
}

function renderizarRitmoSugerido() {
  const card = document.getElementById("card-ritmo-sugerido");
  const lista = document.getElementById("ritmo-sugerido-lista");
  if (!card || !lista) return;

  const itens = calcularRitmoSugerido();

  if (itens.length === 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  lista.innerHTML = itens
    .map((item) => {
      const prazoTexto =
        item.diasRestantes > 0
          ? `${item.diasRestantes} dias até a prova`
          : item.diasRestantes === 0
            ? "A prova é hoje"
            : "Prazo já passou";
      const avisoEstimativa = item.estimativaGenerica
        ? '<span class="ritmo-aviso" title="Ainda sem tópicos concluídos nessa matéria — estimativa inicial genérica até você concluir os primeiros">⚠️ estimativa inicial</span>'
        : "";

      return `
        <div class="ritmo-item">
          <span class="ritmo-dot" style="background:${item.materia.cor || "#64748b"}"></span>
          <div class="ritmo-info">
            <div class="ritmo-topo">
              <span class="ritmo-materia">${escapeHtml(item.materia.nome)}</span>
              <span class="ritmo-prova">🎯 ${escapeHtml(item.meta.objetivoNome)}</span>
            </div>
            <div class="ritmo-detalhe">
              ${item.restantes}/${item.totalTopicos} tópicos restantes · ${prazoTexto}
            </div>
          </div>
          <div class="ritmo-sugestao">
            <span class="ritmo-sugestao-valor">${formatarHorasMinutos(Math.round(item.minutosPorDia))}/dia</span>
            ${avisoEstimativa}
          </div>
        </div>
      `;
    })
    .join("");
}

// --- "O QUE EU FAÇO AGORA?" (cruza revisão pendente + ritmo + questões) ---
// Junta os 3 cards de estatística num único veredito objetivo, pra não
// precisar juntar as peças olhando cada card separado. Prioridade:
// 1) revisão de tópicos vencidos (o que mais rápido se perde se ignorado)
// 2) ponto fraco em questões (com amostra mínima, pra não julgar por 1-2
//    questões isoladas)
// 3) ritmo mais urgente que ainda não apareceu nos itens acima
function calcularRecomendacaoHoje() {
  const acoes = [];
  const nomesJaRecomendados = new Set();

  // 1) Tópicos vencidos, agrupados por matéria — pega a mais urgente
  // (mais tópicos vencidos; empate desempata pelo maior atraso).
  const topicosDevidos = calcularTopicosParaRevisar();
  if (topicosDevidos.length > 0) {
    const porMateria = {};
    topicosDevidos.forEach(({ materia, diasAtraso }) => {
      if (!porMateria[materia.nome]) {
        porMateria[materia.nome] = { materia, quantidade: 0, maiorAtraso: 0 };
      }
      porMateria[materia.nome].quantidade += 1;
      porMateria[materia.nome].maiorAtraso = Math.max(
        porMateria[materia.nome].maiorAtraso,
        diasAtraso,
      );
    });
    const topMateria = Object.values(porMateria).sort(
      (a, b) => b.quantidade - a.quantidade || b.maiorAtraso - a.maiorAtraso,
    )[0];

    acoes.push({
      icone: "🔁",
      cor: topMateria.materia.cor || "#64748b",
      texto: `Revisar ${topMateria.quantidade} tópico${topMateria.quantidade === 1 ? "" : "s"} de ${escapeHtml(topMateria.materia.nome)}`,
    });
    nomesJaRecomendados.add(topMateria.materia.nome);
  }

  // 2) Ponto fraco em questões — pior % de acerto, exigindo pelo menos 5
  // questões registradas pra entrar na conta (amostra mínima).
  const filtro = obterMetaFiltroAtiva();
  const nomesFiltro = filtro
    ? new Set(obterMateriasDoFiltroAtivo().map((m) => m.nome))
    : null;
  const registrosValidos = nomesFiltro
    ? registrosQuestoes.filter((r) => nomesFiltro.has(r.materia))
    : registrosQuestoes;

  const porMateriaQuestoes = {};
  registrosValidos.forEach((r) => {
    if (!porMateriaQuestoes[r.materia]) {
      porMateriaQuestoes[r.materia] = { total: 0, acertos: 0 };
    }
    porMateriaQuestoes[r.materia].total += r.total;
    porMateriaQuestoes[r.materia].acertos += r.acertos;
  });

  let piorMateria = null;
  Object.keys(porMateriaQuestoes).forEach((nome) => {
    const dados = porMateriaQuestoes[nome];
    if (dados.total < 5) return;
    const pct = (dados.acertos / dados.total) * 100;
    if (!piorMateria || pct < piorMateria.pct) {
      piorMateria = { nome, pct: Math.round(pct) };
    }
  });

  if (piorMateria && piorMateria.pct < 70) {
    const materiaObj = materias.find((m) => m.nome === piorMateria.nome);
    acoes.push({
      icone: "🎯",
      cor: (materiaObj && materiaObj.cor) || "#64748b",
      texto: `Fazer questões de ${escapeHtml(piorMateria.nome)} (${piorMateria.pct}% de acerto até agora)`,
    });
    nomesJaRecomendados.add(piorMateria.nome);
  }

  // 3) Ritmo mais urgente que ainda não entrou nas recomendações acima —
  // só entra se o esforço sugerido for relevante (>= 10 min/dia).
  const ritmo = calcularRitmoSugerido();
  const proximoRitmo = ritmo.find(
    (item) =>
      !nomesJaRecomendados.has(item.materia.nome) && item.minutosPorDia >= 10,
  );
  if (proximoRitmo) {
    acoes.push({
      icone: "⏳",
      cor: proximoRitmo.materia.cor || "#64748b",
      texto: `Estudar ${formatarHorasMinutos(Math.round(proximoRitmo.minutosPorDia))} de ${escapeHtml(proximoRitmo.materia.nome)} hoje (prova em ${proximoRitmo.diasRestantes} dia${proximoRitmo.diasRestantes === 1 ? "" : "s"})`,
    });
  }

  return acoes;
}

function renderizarRecomendacaoHoje() {
  const card = document.getElementById("card-recomendacao-hoje");
  const lista = document.getElementById("recomendacao-hoje-lista");
  if (!card || !lista) return;

  // Sem nenhum dado ainda (app recém-começado), não tem base pra
  // recomendar nada — o card só aparece depois que existe algum uso real.
  const semDadosSuficientes =
    materias.length === 0 ||
    (logsSessoes.length === 0 && registrosQuestoes.length === 0);

  if (semDadosSuficientes) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  const acoes = calcularRecomendacaoHoje();

  if (acoes.length === 0) {
    lista.innerHTML =
      '<p class="recomendacao-vazia">Tudo em dia por aqui! Nenhuma revisão pendente nem urgência de ritmo agora — bom momento pra avançar em algo novo do edital. 🎉</p>';
    return;
  }

  lista.innerHTML = acoes
    .map(
      (acao) => `
      <div class="recomendacao-item">
        <span class="recomendacao-dot" style="background:${acao.cor}"></span>
        <span class="recomendacao-icone">${acao.icone}</span>
        <span class="recomendacao-texto">${acao.texto}</span>
      </div>
    `,
    )
    .join("");
}

// --- MODO RETA FINAL ---
// Ativa sozinho quando alguma prova cadastrada estiver a N dias ou menos
// da data da prova objetiva, e junta num único checklist diário: revisões
// atrasadas + matérias com pior desempenho em questões + matérias de peso
// alto ainda não estudadas hoje. Sempre olha as matérias vinculadas à
// prova em questão — não depende do filtro "Prova em foco" selecionado
// em outras abas, porque a urgência da reta final vale independente do
// que estiver marcado ali.
const LIMITE_DIAS_RETA_FINAL = 30;

function obterProvasEmRetaFinal(limiteDias = LIMITE_DIAS_RETA_FINAL) {
  return metas
    .map((meta) => {
      const diasRestantes = Math.ceil(
        (new Date(meta.dataLimite + "T23:59:59") - new Date()) / 86400000,
      );
      return { meta, diasRestantes };
    })
    .filter(
      ({ diasRestantes }) => diasRestantes >= 0 && diasRestantes <= limiteDias,
    )
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

function calcularChecklistRetaFinal(meta) {
  const materiasAlvo = materias.filter((m) =>
    materiaVinculadaAMeta(m, meta.objetivoNome),
  );
  const hojeStr = obterDataLocalString(new Date());
  const itens = [];

  // 1) Revisões atrasadas (tópicos com SM-2 vencido) — uma linha por
  // matéria, com a contagem de quantos tópicos estão pendentes nela.
  garantirSrsEmTopicosConcluidos();
  materiasAlvo.forEach((m) => {
    const vencidos = (m.topicos || []).filter(
      (t) => t.concluido && t.srs && t.srs.proximaRevisao <= hojeStr,
    );
    if (vencidos.length > 0) {
      itens.push({
        chave: `revisao:${meta.objetivoNome}:${m.nome}`,
        icone: "🔁",
        cor: m.cor || "#64748b",
        texto: `Revisar ${vencidos.length} tópico${vencidos.length === 1 ? "" : "s"} vencido${vencidos.length === 1 ? "" : "s"} de ${escapeHtml(m.nome)}`,
      });
    }
  });

  // 2) Matérias com pior desempenho em questões — exige pelo menos 5
  // questões registradas pra entrar na conta (amostra mínima), senão vira
  // ruído. Pega até as 3 piores abaixo de 70% de acerto.
  const porMateriaQuestoes = {};
  registrosQuestoes
    .filter((r) => materiasAlvo.some((m) => m.nome === r.materia))
    .forEach((r) => {
      if (!porMateriaQuestoes[r.materia]) {
        porMateriaQuestoes[r.materia] = { total: 0, acertos: 0 };
      }
      porMateriaQuestoes[r.materia].total += r.total;
      porMateriaQuestoes[r.materia].acertos += r.acertos;
    });

  Object.keys(porMateriaQuestoes)
    .map((nome) => ({ nome, ...porMateriaQuestoes[nome] }))
    .filter((d) => d.total >= 5)
    .map((d) => ({
      nome: d.nome,
      pct: Math.round((d.acertos / d.total) * 100),
    }))
    .filter((d) => d.pct < 70)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)
    .forEach((d) => {
      const materiaObj = materiasAlvo.find((m) => m.nome === d.nome);
      itens.push({
        chave: `questoes:${meta.objetivoNome}:${d.nome}`,
        icone: "🎯",
        cor: (materiaObj && materiaObj.cor) || "#64748b",
        texto: `Fazer questões de ${escapeHtml(d.nome)} (${d.pct}% de acerto até agora)`,
      });
    });

  // 3) Matérias de peso alto (4 ou 5 estrelas) que ainda não tiveram
  // nenhuma sessão de estudo hoje.
  materiasAlvo
    .filter((m) => (m.peso || 1) >= 4)
    .forEach((m) => {
      const estudouHoje = logsSessoes.some(
        (l) => l.materia === m.nome && l.data === hojeStr,
      );
      if (!estudouHoje) {
        itens.push({
          chave: `peso:${meta.objetivoNome}:${m.nome}`,
          icone: "⭐",
          cor: m.cor || "#64748b",
          texto: `Estudar ${escapeHtml(m.nome)} hoje (matéria de peso alto)`,
        });
      }
    });

  return itens;
}

// O checklist marcado fica salvo por dia — vira meia-noite, reseta
// sozinho, igual um checklist de "afazeres de hoje" de verdade.
function obterMarcadosRetaFinalHoje() {
  const hojeStr = obterDataLocalString(new Date());
  const armazenado =
    JSON.parse(localStorage.getItem("retaFinalMarcados")) || {};
  if (armazenado.data !== hojeStr) return {};
  return armazenado.concluidos || {};
}

function alternarItemRetaFinal(chave) {
  const hojeStr = obterDataLocalString(new Date());
  const armazenado =
    JSON.parse(localStorage.getItem("retaFinalMarcados")) || {};
  const concluidos =
    armazenado.data === hojeStr ? armazenado.concluidos || {} : {};
  concluidos[chave] = !concluidos[chave];
  localStorage.setItem(
    "retaFinalMarcados",
    JSON.stringify({ data: hojeStr, concluidos }),
  );
  renderizarModoRetaFinal();
}

// Monta o estado vazio da Reta Final explicando o motivo específico —
// não é sempre a mesma frase genérica: muda se não existe nenhuma prova
// cadastrada, se as cadastradas já passaram da data, ou se existe uma
// prova futura mas o prazo de 30 dias ainda não chegou.
function construirVazioRetaFinal() {
  if (metas.length === 0) {
    return `
      <div class="reta-final-vazio">
        <div class="reta-final-vazio-icone">🚨</div>
        <h3>Modo Reta Final ainda não tem o que mostrar</h3>
        <p>
          Você ainda não cadastrou nenhuma prova. Cadastre uma na aba
          <strong>📋 Cadastro</strong> — assim que a data objetiva dela
          estiver a ${LIMITE_DIAS_RETA_FINAL} dias ou menos, esse checklist
          se preenche sozinho.
        </p>
      </div>`;
  }

  const futuras = metas
    .map((meta) => ({
      meta,
      diasRestantes: Math.ceil(
        (new Date(meta.dataLimite + "T23:59:59") - new Date()) / 86400000,
      ),
    }))
    .filter(({ diasRestantes }) => diasRestantes >= 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  if (futuras.length === 0) {
    return `
      <div class="reta-final-vazio">
        <div class="reta-final-vazio-icone">🚨</div>
        <h3>Modo Reta Final ainda não tem o que mostrar</h3>
        <p>
          As provas cadastradas já passaram da data objetiva. Cadastre uma
          prova futura na aba <strong>📋 Cadastro</strong> pra esse
          checklist voltar a funcionar.
        </p>
      </div>`;
  }

  const maisProxima = futuras[0];
  const diasParaAtivar = maisProxima.diasRestantes - LIMITE_DIAS_RETA_FINAL;

  return `
    <div class="reta-final-vazio">
      <div class="reta-final-vazio-icone">🚨</div>
      <h3>Modo Reta Final ainda não tem o que mostrar</h3>
      <p>
        A prova mais próxima é <strong>${escapeHtml(maisProxima.meta.objetivoNome)}</strong>,
        faltando <strong>${maisProxima.diasRestantes} dia${maisProxima.diasRestantes === 1 ? "" : "s"}</strong>.
        Esse checklist só ativa quando faltar
        ${LIMITE_DIAS_RETA_FINAL} dias ou menos — ou seja, em
        <strong>${diasParaAtivar} dia${diasParaAtivar === 1 ? "" : "s"}</strong>.
        Por enquanto pode seguir estudando normalmente pelas outras abas. 💪
      </p>
    </div>`;
}

function renderizarModoRetaFinal() {
  const container = document.getElementById("reta-final-conteudo");
  const dotBadge = document.getElementById("reta-final-badge-dot");
  if (!container) return;

  const provasProximas = obterProvasEmRetaFinal();

  if (dotBadge) {
    dotBadge.style.display =
      provasProximas.length > 0 ? "inline-block" : "none";
  }

  if (provasProximas.length === 0) {
    container.innerHTML = construirVazioRetaFinal();
    return;
  }

  const marcadosHoje = obterMarcadosRetaFinalHoje();

  container.innerHTML = provasProximas
    .map(({ meta, diasRestantes }) => {
      const itens = calcularChecklistRetaFinal(meta);
      const concluidosCount = itens.filter(
        (it) => marcadosHoje[it.chave],
      ).length;

      const listaHtml =
        itens.length === 0
          ? '<p class="recomendacao-vazia">Tudo em dia pra essa prova agora — nenhuma revisão atrasada, nenhum ponto fraco crítico e as matérias de peso alto já foram estudadas hoje. 🎉</p>'
          : itens
              .map(
                (it) => `
              <div class="reta-final-item${marcadosHoje[it.chave] ? " concluido" : ""}">
                <input
                  type="checkbox"
                  ${marcadosHoje[it.chave] ? "checked" : ""}
                  onchange="alternarItemRetaFinal('${it.chave}')"
                />
                <span class="recomendacao-dot" style="background:${it.cor}"></span>
                <span class="recomendacao-icone">${it.icone}</span>
                <span class="reta-final-texto">${it.texto}</span>
              </div>`,
              )
              .join("");

      return `
        <div class="reta-final-prova-card">
          <div class="reta-final-prova-cabecalho">
            <strong>🎯 ${escapeHtml(meta.objetivoNome)}</strong>
            <span class="reta-final-contagem">${diasRestantes === 0 ? "Prova é HOJE!" : `Faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`}</span>
          </div>
          ${itens.length > 0 ? `<p class="reta-final-progresso">${concluidosCount}/${itens.length} concluídos hoje</p>` : ""}
          <div class="reta-final-lista">${listaHtml}</div>
        </div>`;
    })
    .join("");
}

// --- DIÁRIO DE ESTUDOS (Tier 2 do Mood Tracker) ---
// Lê o mesmo logsSessoes de sempre (nenhum dado novo, nenhuma tabela
// nova) e agrupa por dia numa timeline visual — humor, tempo estudado,
// matérias e a nota da sessão, no estilo de um feed. As tags reaproveitam
// tanto as distrações marcadas no check-out quanto sinais do check-in
// (sono ruim, energia baixa, ansiedade alta).
const MAPA_EMOJI_HUMOR = {
  excelente: "😀",
  bom: "🙂",
  normal: "😐",
  ruim: "😕",
  muito_ruim: "😞",
};

function calcularDiarioPorDia() {
  const porDia = {};

  logsSessoes.forEach((log) => {
    if (!porDia[log.data]) {
      porDia[log.data] = {
        minutos: 0,
        materias: new Set(),
        notas: [],
        entradasMood: [],
      };
    }
    const dia = porDia[log.data];
    dia.minutos += log.duracao;
    dia.materias.add(log.materia);
    if (log.nota) dia.notas.push(log.nota);
    if (log.mood) dia.entradasMood.push(log.mood);
  });

  return Object.entries(porDia)
    .map(([data, info]) => {
      // Humor do dia: prioriza o humor de DEPOIS de estudar (check-out) —
      // é o mais diagnóstico. Sem isso, cai pro humor de ANTES (check-in).
      let humor = null;
      for (let i = info.entradasMood.length - 1; i >= 0 && !humor; i--) {
        if (info.entradasMood[i].checkout?.humorDepois) {
          humor = info.entradasMood[i].checkout.humorDepois;
        }
      }
      for (let i = info.entradasMood.length - 1; i >= 0 && !humor; i--) {
        if (info.entradasMood[i].checkin?.humor) {
          humor = info.entradasMood[i].checkin.humor;
        }
      }

      // Tags do dia: distrações marcadas no check-out + sinais do
      // check-in que merecem virar tag (sono ruim, pouca energia,
      // ansiedade alta).
      const tags = new Set();
      info.entradasMood.forEach((mood) => {
        if (mood.checkin) {
          if (["ruim", "pessimo"].includes(mood.checkin.sono)) {
            tags.add("😴 Sono ruim");
          }
          if (["baixa", "exausto"].includes(mood.checkin.energia)) {
            tags.add("🔋 Pouca energia");
          }
          if (mood.checkin.ansiedade >= 7) {
            tags.add("😰 Ansiedade alta");
          }
        }
        if (mood.checkout?.atrapalhou) {
          mood.checkout.atrapalhou.forEach((t) => tags.add(`⚠️ ${t}`));
        }
      });

      // Nota do dia: a mais recente entre as sessões (é a que resume
      // melhor como o dia terminou), com o pensamento do check-in como
      // reserva se nenhuma sessão teve nota escrita.
      let nota =
        info.notas.length > 0 ? info.notas[info.notas.length - 1] : null;
      if (!nota) {
        for (let i = info.entradasMood.length - 1; i >= 0 && !nota; i--) {
          if (info.entradasMood[i].checkin?.pensamento) {
            nota = info.entradasMood[i].checkin.pensamento;
          }
        }
      }

      return {
        data,
        minutos: info.minutos,
        materias: [...info.materias],
        humor,
        tags: [...tags],
        nota,
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

// "Há exatamente 6 meses/1 ano você escreveu: ..." — só aparece quando
// existe mesmo uma nota registrada naquele dia exato; não força nada.
function calcularMemoriasAutomaticas(diario) {
  const hoje = new Date();
  const candidatos = [
    { rotulo: "1 ano", meses: 12 },
    { rotulo: "6 meses", meses: 6 },
  ];

  const memorias = [];
  candidatos.forEach(({ rotulo, meses }) => {
    const dataAlvo = new Date(hoje);
    dataAlvo.setMonth(dataAlvo.getMonth() - meses);
    const dataAlvoStr = obterDataLocalString(dataAlvo);
    const entrada = diario.find((d) => d.data === dataAlvoStr && d.nota);
    if (entrada) memorias.push({ rotulo, entrada });
  });

  return memorias;
}

function renderizarDiario() {
  const timeline = document.getElementById("diario-timeline");
  const vazio = document.getElementById("diario-vazio");
  const memoriasEl = document.getElementById("diario-memorias");
  if (!timeline) return;

  const diario = calcularDiarioPorDia();

  if (diario.length === 0) {
    vazio.style.display = "block";
    timeline.innerHTML = "";
    if (memoriasEl) memoriasEl.style.display = "none";
    const cuidadoEl = document.getElementById("diario-cuidado");
    const resumoSemanalEl = document.getElementById("diario-resumo-semanal");
    const insightsEl = document.getElementById("diario-insights");
    const evolucaoEl = document.getElementById("diario-evolucao-emocional");
    const linhaTempoCard = document.getElementById("card-linha-tempo-mensal");
    if (cuidadoEl) cuidadoEl.style.display = "none";
    if (resumoSemanalEl) resumoSemanalEl.style.display = "none";
    if (insightsEl) insightsEl.style.display = "none";
    if (evolucaoEl) evolucaoEl.style.display = "none";
    if (linhaTempoCard) linhaTempoCard.style.display = "none";
    return;
  }

  vazio.style.display = "none";

  const memorias = calcularMemoriasAutomaticas(diario);
  if (memoriasEl) {
    if (memorias.length === 0) {
      memoriasEl.style.display = "none";
    } else {
      memoriasEl.style.display = "block";
      memoriasEl.innerHTML = memorias
        .map(
          (m) => `
          <div class="diario-memoria-card">
            <strong>📼 Há exatamente ${m.rotulo} você escreveu:</strong>
            <p>"${escapeHtml(m.entrada.nota)}"</p>
          </div>`,
        )
        .join("");
    }
  }

  timeline.innerHTML = diario
    .map((dia) => {
      const dataFormatada = new Date(dia.data + "T00:00:00").toLocaleDateString(
        "pt-BR",
        {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        },
      );
      const emoji = dia.humor ? MAPA_EMOJI_HUMOR[dia.humor] || "" : "";

      return `
        <div class="diario-entrada">
          <div class="diario-entrada-cabecalho">
            <span class="diario-entrada-emoji">${emoji}</span>
            <div>
              <strong class="diario-entrada-data">${dataFormatada}</strong>
              <div class="diario-entrada-resumo">
                ⏱️ ${formatarHorasMinutos(dia.minutos)} estudadas
                ${dia.materias.length > 0 ? `· ${dia.materias.map((m) => escapeHtml(m)).join(", ")}` : ""}
              </div>
            </div>
          </div>
          ${dia.nota ? `<p class="diario-entrada-nota">"${escapeHtml(dia.nota)}"</p>` : ""}
          ${
            dia.tags.length > 0
              ? `<div class="diario-entrada-tags">${dia.tags.map((t) => `<span class="diario-tag">${escapeHtml(t)}</span>`).join("")}</div>`
              : ""
          }
        </div>`;
    })
    .join("");

  renderizarAlertasDeCuidado();
  renderizarResumoSemanalRegras();
  renderizarInsightsMoodTracker(diario);
  renderizarEvolucaoEmocional(diario);
  renderizarLinhaTempoMensal(diario);
}

// --- INSIGHTS ENGINE (Tier 3 do Mood Tracker) ---
// Cruza humor/energia/sono/ansiedade (do check-in/check-out) com o
// desempenho real (registrosQuestoes) e com o tempo estudado. Cada
// insight só aparece quando existe amostra mínima — é isso que separa um
// insight de verdade de "conclusão tirada de 2 dias".
const AMOSTRA_MINIMA_INSIGHT = 3;

// --- TIER 4: RESUMO SEMANAL + CUIDADO (sem IA) ---
// Em vez de pedir pra um modelo de IA "escrever" um resumo (custo por
// chamada, precisa de backend e chave de API), monta o mesmo tipo de
// resumo com regras determinísticas em cima dos números reais — mais
// barato, mais previsível, e não depende de nenhuma infraestrutura nova.
const LIMIAR_DIAS_CUIDADO = 3;

// Estado de check-in por dia (humor/energia/sono/ansiedade ANTES de
// estudar), usando o primeiro check-in preenchido daquele dia — reusado
// tanto pelo resumo semanal quanto pelos alertas de cuidado.
function calcularEstadoCheckinPorDia() {
  const porDia = {};
  logsSessoes.forEach((log) => {
    if (!log.mood?.checkin) return;
    if (!porDia[log.data] || log.hora < porDia[log.data].hora) {
      porDia[log.data] = { ...log.mood.checkin, hora: log.hora };
    }
  });
  return porDia;
}

function calcularPctAcertoPorDia() {
  const mapa = {};
  registrosQuestoes.forEach((r) => {
    if (!mapa[r.data]) mapa[r.data] = { total: 0, acertos: 0 };
    mapa[r.data].total += r.total;
    mapa[r.data].acertos += r.acertos;
  });
  return mapa;
}

function calcularInsightHumorDesempenho(diario, pctPorDia) {
  const GRUPO_HUMOR = {
    excelente: "positivo",
    bom: "positivo",
    normal: "neutro",
    ruim: "negativo",
    muito_ruim: "negativo",
  };
  const grupos = {
    positivo: { total: 0, acertos: 0, dias: 0 },
    neutro: { total: 0, acertos: 0, dias: 0 },
    negativo: { total: 0, acertos: 0, dias: 0 },
  };

  diario.forEach((dia) => {
    if (!dia.humor) return;
    const q = pctPorDia[dia.data];
    if (!q || q.total === 0) return;
    const g = grupos[GRUPO_HUMOR[dia.humor]];
    g.total += q.total;
    g.acertos += q.acertos;
    g.dias += 1;
  });

  const validos = Object.entries(grupos)
    .filter(([, g]) => g.dias >= AMOSTRA_MINIMA_INSIGHT)
    .map(([nome, g]) => ({
      nome,
      pct: Math.round((g.acertos / g.total) * 100),
      dias: g.dias,
    }));

  if (validos.length < 2) return null;

  const rotulo = {
    positivo: "humor bom/excelente",
    neutro: "humor normal",
    negativo: "humor ruim/muito ruim",
  };
  const melhor = validos.reduce((a, b) => (b.pct > a.pct ? b : a));
  const pior = validos.reduce((a, b) => (b.pct < a.pct ? b : a));
  if (melhor.nome === pior.nome) return null;

  return {
    icone: "😊",
    texto: `Em dias de <strong>${rotulo[melhor.nome]}</strong>, seu acerto médio é <strong>${melhor.pct}%</strong> (${melhor.dias} dias). Em dias de <strong>${rotulo[pior.nome]}</strong>, cai pra <strong>${pior.pct}%</strong> (${pior.dias} dias).`,
  };
}

function calcularInsightAnsiedadeDesempenho(pctPorDia) {
  const faixas = {
    baixa: { total: 0, acertos: 0, dias: 0 },
    alta: { total: 0, acertos: 0, dias: 0 },
  };

  // Uma ansiedade por dia (média das sessões daquele dia que tiveram
  // check-in preenchido).
  const ansiedadePorDia = {};
  logsSessoes.forEach((log) => {
    if (log.mood?.checkin?.ansiedade == null) return;
    if (!ansiedadePorDia[log.data]) ansiedadePorDia[log.data] = [];
    ansiedadePorDia[log.data].push(log.mood.checkin.ansiedade);
  });

  Object.entries(ansiedadePorDia).forEach(([data, valores]) => {
    const q = pctPorDia[data];
    if (!q || q.total === 0) return;
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const faixa = media <= 3 ? "baixa" : media >= 7 ? "alta" : null;
    if (!faixa) return;
    faixas[faixa].total += q.total;
    faixas[faixa].acertos += q.acertos;
    faixas[faixa].dias += 1;
  });

  if (
    faixas.baixa.dias < AMOSTRA_MINIMA_INSIGHT ||
    faixas.alta.dias < AMOSTRA_MINIMA_INSIGHT
  ) {
    return null;
  }

  const pctBaixa = Math.round(
    (faixas.baixa.acertos / faixas.baixa.total) * 100,
  );
  const pctAlta = Math.round((faixas.alta.acertos / faixas.alta.total) * 100);
  if (pctBaixa === pctAlta) return null;

  return {
    icone: "😰",
    texto: `Com <strong>ansiedade baixa</strong> (0-3), seu acerto médio é <strong>${pctBaixa}%</strong> (${faixas.baixa.dias} dias). Com <strong>ansiedade alta</strong> (7-10), fica em <strong>${pctAlta}%</strong> (${faixas.alta.dias} dias).`,
  };
}

function calcularInsightSonoFoco() {
  const grupos = {
    bom: { minutos: 0, dias: 0 },
    ruim: { minutos: 0, dias: 0 },
  };
  const GRUPO_SONO = {
    excelente: "bom",
    bom: "bom",
    ruim: "ruim",
    pessimo: "ruim",
  };

  const sonoPorDia = {};
  logsSessoes.forEach((log) => {
    if (!log.mood?.checkin?.sono) return;
    // Usa o primeiro check-in do dia como referência de sono daquele dia.
    if (!sonoPorDia[log.data]) sonoPorDia[log.data] = log.mood.checkin.sono;
  });

  const minutosPorDia = {};
  logsSessoes.forEach((log) => {
    minutosPorDia[log.data] = (minutosPorDia[log.data] || 0) + log.duracao;
  });

  Object.entries(sonoPorDia).forEach(([data, sono]) => {
    const grupo = GRUPO_SONO[sono];
    if (!grupo) return;
    grupos[grupo].minutos += minutosPorDia[data] || 0;
    grupos[grupo].dias += 1;
  });

  if (
    grupos.bom.dias < AMOSTRA_MINIMA_INSIGHT ||
    grupos.ruim.dias < AMOSTRA_MINIMA_INSIGHT
  ) {
    return null;
  }

  const mediaBom = Math.round(grupos.bom.minutos / grupos.bom.dias);
  const mediaRuim = Math.round(grupos.ruim.minutos / grupos.ruim.dias);
  const diferenca = mediaBom - mediaRuim;
  if (Math.abs(diferenca) < 5) return null;

  return {
    icone: "😴",
    texto:
      diferenca > 0
        ? `Em dias de <strong>sono bom/excelente</strong>, você estuda em média <strong>${formatarHorasMinutos(mediaBom)}</strong> — ${formatarHorasMinutos(diferenca)} a mais do que em dias de sono ruim/péssimo (<strong>${formatarHorasMinutos(mediaRuim)}</strong>).`
        : `Curiosamente, em dias de <strong>sono ruim/péssimo</strong> você estudou mais (${formatarHorasMinutos(mediaRuim)}) do que em dias de sono bom (${formatarHorasMinutos(mediaBom)}) — vale ficar de olho se isso é sustentável.`,
  };
}

function calcularInsightMateriaAnsiedade() {
  const porMateria = {};
  logsSessoes.forEach((log) => {
    if (log.mood?.checkin?.ansiedade == null) return;
    if (!porMateria[log.materia]) porMateria[log.materia] = [];
    porMateria[log.materia].push(log.mood.checkin.ansiedade);
  });

  const candidatos = Object.entries(porMateria)
    .filter(([, valores]) => valores.length >= AMOSTRA_MINIMA_INSIGHT)
    .map(([materia, valores]) => ({
      materia,
      media: valores.reduce((a, b) => a + b, 0) / valores.length,
      n: valores.length,
    }))
    .sort((a, b) => b.media - a.media);

  if (candidatos.length === 0 || candidatos[0].media < 6) return null;

  const top = candidatos[0];
  return {
    icone: "📚",
    texto: `Você relata mais ansiedade estudando <strong>${escapeHtml(top.materia)}</strong> (média ${top.media.toFixed(1)}/10 em ${top.n} sessões) do que nas outras matérias.`,
  };
}

function calcularMelhorPiorDiaSemana() {
  const nomesDias = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  const soma = new Array(7).fill(0);
  const contagem = new Array(7).fill(0);

  Object.entries(historicoEstudos).forEach(([dataStr, minutos]) => {
    const diaSemana = new Date(dataStr + "T12:00:00").getDay();
    soma[diaSemana] += minutos;
    contagem[diaSemana] += 1;
  });

  const validos = nomesDias
    .map((nome, i) => ({
      nome,
      media: contagem[i] > 0 ? soma[i] / contagem[i] : 0,
      n: contagem[i],
    }))
    .filter((d) => d.n >= 2);

  if (validos.length < 3) return null;

  const melhor = validos.reduce((a, b) => (b.media > a.media ? b : a));
  const pior = validos.reduce((a, b) => (b.media < a.media ? b : a));
  if (melhor.nome === pior.nome) return null;

  return {
    icone: "📅",
    texto: `Seu melhor dia da semana pra estudar costuma ser <strong>${melhor.nome}</strong> (média de ${formatarHorasMinutos(Math.round(melhor.media))}); o mais fraco é <strong>${pior.nome}</strong> (${formatarHorasMinutos(Math.round(pior.media))}).`,
  };
}

// --- SISTEMA DE CUIDADO (observa padrões, nunca diagnostica) ---
// Só aponta sequências de dias — nunca rotula a pessoa com um estado
// clínico. A ideia é oferecer apoio e consciência, nunca substituir
// orientação profissional (isso fica explícito no aviso do card).
function calcularAlertasDeCuidado() {
  const estadoPorDia = calcularEstadoCheckinPorDia();
  const hoje = new Date();

  const ultimosDias = [];
  for (let i = 13; i >= 0; i--) {
    const dataStr = obterDataLocalString(somarDias(hoje, -i));
    ultimosDias.push(estadoPorDia[dataStr] || null);
  }

  // Sequência atual (terminando no dia mais recente COM check-in) que
  // satisfaz a condição — dias sem check-in não quebram a sequência nem
  // contam pra ela, só são ignorados (a pessoa pode ter pulado o
  // check-in num dia sem que isso "zere" o padrão observado).
  function streakAtual(condicao) {
    let streak = 0;
    for (let i = ultimosDias.length - 1; i >= 0; i--) {
      const estado = ultimosDias[i];
      if (!estado) continue;
      if (condicao(estado)) streak++;
      else break;
    }
    return streak;
  }

  const alertas = [];

  const streakAnsiedade = streakAtual(
    (e) => e.ansiedade != null && e.ansiedade >= 7,
  );
  if (streakAnsiedade >= LIMIAR_DIAS_CUIDADO) {
    alertas.push({
      icone: "💛",
      texto: `Você registrou ansiedade elevada em ${streakAnsiedade} dias seguidos. Que tal reduzir a carga hoje ou incluir uma pausa maior?`,
    });
  }

  const streakEnergiaBaixa = streakAtual((e) =>
    ["baixa", "exausto"].includes(e.energia),
  );
  if (streakEnergiaBaixa >= LIMIAR_DIAS_CUIDADO) {
    alertas.push({
      icone: "🔋",
      texto: `Você relatou baixa energia em ${streakEnergiaBaixa} dias seguidos. Vale a pena checar como está seu sono e sua rotina.`,
    });
  }

  const streakSonoRuim = streakAtual((e) =>
    ["ruim", "pessimo"].includes(e.sono),
  );
  if (streakSonoRuim >= LIMIAR_DIAS_CUIDADO) {
    alertas.push({
      icone: "😴",
      texto: `Seu sono anda ruim há ${streakSonoRuim} dias seguidos. Descanso também é parte da preparação — talvez valha ajustar a rotina antes de forçar mais estudo.`,
    });
  }

  const streakHumorRuim = streakAtual((e) =>
    ["ruim", "muito_ruim"].includes(e.humor),
  );
  if (streakHumorRuim >= LIMIAR_DIAS_CUIDADO) {
    alertas.push({
      icone: "🤍",
      texto: `Seu humor tem estado baixo em ${streakHumorRuim} dias seguidos. Tudo bem ter dias difíceis — se fizer sentido, considere conversar com alguém de confiança.`,
    });
  }

  return alertas;
}

function renderizarAlertasDeCuidado() {
  const container = document.getElementById("diario-cuidado");
  if (!container) return;

  const alertas = calcularAlertasDeCuidado();
  if (alertas.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="diario-cuidado-card">
      ${alertas
        .map(
          (a) => `
        <div class="diario-cuidado-item">
          <span class="diario-cuidado-icone">${a.icone}</span>
          <span>${a.texto}</span>
        </div>`,
        )
        .join("")}
      <p class="diario-cuidado-rodape">
        Isso é só um padrão observado nos seus próprios registros — não é
        um diagnóstico. Se sentir que precisa de apoio, vale conversar com
        alguém de confiança ou um profissional.
      </p>
    </div>`;
}

// --- RESUMO SEMANAL (regras, sem IA) ---
function calcularResumoSemanalRegras() {
  const hoje = new Date();
  const inicioStr = obterDataLocalString(somarDias(hoje, -6));
  const fimStr = obterDataLocalString(hoje);

  const sessoesSemana = logsSessoes.filter(
    (l) => l.data >= inicioStr && l.data <= fimStr,
  );
  if (sessoesSemana.length === 0) return null;

  const minutosTotais = sessoesSemana.reduce((s, l) => s + l.duracao, 0);

  const PONTOS_HUMOR = {
    excelente: 5,
    bom: 4,
    normal: 3,
    ruim: 2,
    muito_ruim: 1,
  };
  const CHAVE_POR_PONTO = [
    "",
    "muito_ruim",
    "ruim",
    "normal",
    "bom",
    "excelente",
  ];
  const humoresDaSemana = [];
  sessoesSemana.forEach((l) => {
    const h = l.mood?.checkout?.humorDepois || l.mood?.checkin?.humor;
    if (h) humoresDaSemana.push(PONTOS_HUMOR[h]);
  });

  let humorEmoji = null;
  let humorDescricao = null;
  if (humoresDaSemana.length > 0) {
    const media =
      humoresDaSemana.reduce((a, b) => a + b, 0) / humoresDaSemana.length;
    const chave = CHAVE_POR_PONTO[Math.round(media)] || "normal";
    humorEmoji = MAPA_EMOJI_HUMOR[chave];
    humorDescricao = {
      excelente: "ótimo",
      bom: "bom",
      normal: "neutro",
      ruim: "baixo",
      muito_ruim: "bem baixo",
    }[chave];
  }

  const nomesDias = [
    "domingo",
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
  ];
  const minutosPorDia = {};
  sessoesSemana.forEach((l) => {
    minutosPorDia[l.data] = (minutosPorDia[l.data] || 0) + l.duracao;
  });
  const diasProdutivos = Object.entries(minutosPorDia)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([data]) => nomesDias[new Date(`${data}T12:00:00`).getDay()]);

  // Matéria com maior evolução de % de acerto (semana atual vs anterior),
  // exigindo amostra mínima nas duas semanas pra não comparar 2 questões
  // com 2 questões.
  const inicioAnteriorStr = obterDataLocalString(somarDias(hoje, -13));
  const fimAnteriorStr = obterDataLocalString(somarDias(hoje, -7));
  const questoesAtual = registrosQuestoes.filter(
    (r) => r.data >= inicioStr && r.data <= fimStr,
  );
  const questoesAnterior = registrosQuestoes.filter(
    (r) => r.data >= inicioAnteriorStr && r.data <= fimAnteriorStr,
  );

  function agruparPorMateria(registros) {
    const mapa = {};
    registros.forEach((r) => {
      if (!mapa[r.materia]) mapa[r.materia] = { total: 0, acertos: 0 };
      mapa[r.materia].total += r.total;
      mapa[r.materia].acertos += r.acertos;
    });
    return mapa;
  }
  const pctAtual = agruparPorMateria(questoesAtual);
  const pctAnterior = agruparPorMateria(questoesAnterior);

  let melhorEvolucao = null;
  Object.keys(pctAtual).forEach((materia) => {
    if (pctAtual[materia].total < 5) return;
    if (!pctAnterior[materia] || pctAnterior[materia].total < 5) return;
    const percAtual =
      (pctAtual[materia].acertos / pctAtual[materia].total) * 100;
    const percAnterior =
      (pctAnterior[materia].acertos / pctAnterior[materia].total) * 100;
    const diferenca = Math.round(percAtual - percAnterior);
    if (
      diferenca > 0 &&
      (!melhorEvolucao || diferenca > melhorEvolucao.diferenca)
    ) {
      melhorEvolucao = { materia, diferenca, percAtual: Math.round(percAtual) };
    }
  });

  const { variacaoPct } = calcularComparacaoSemanal();

  let fechamento;
  if (variacaoPct != null && variacaoPct > 15) {
    fechamento = "Você aumentou bastante o ritmo essa semana — continue assim.";
  } else if (variacaoPct != null && variacaoPct < -15) {
    fechamento =
      "Essa semana foi mais leve que a anterior — tudo bem, o importante é retomar no seu ritmo.";
  } else if (humorDescricao === "ótimo" || humorDescricao === "bom") {
    fechamento =
      "Seu humor esteve positivo na maior parte da semana — bom sinal.";
  } else {
    fechamento = "Mais uma semana registrada. Continue no seu ritmo.";
  }

  return {
    minutosTotais,
    humorEmoji,
    humorDescricao,
    diasProdutivos,
    melhorEvolucao,
    variacaoPct,
    fechamento,
  };
}

function renderizarResumoSemanalRegras() {
  const container = document.getElementById("diario-resumo-semanal");
  if (!container) return;

  const resumo = calcularResumoSemanalRegras();
  if (!resumo) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  const linhas = [];
  linhas.push(
    `Você estudou <strong>${formatarHorasMinutos(resumo.minutosTotais)}</strong> essa semana.`,
  );
  if (resumo.humorEmoji) {
    linhas.push(
      `Seu humor médio foi ${resumo.humorEmoji} (${resumo.humorDescricao}).`,
    );
  }
  if (resumo.diasProdutivos.length > 0) {
    linhas.push(
      `${resumo.diasProdutivos.length > 1 ? "Os dias mais produtivos foram" : "O dia mais produtivo foi"} <strong>${resumo.diasProdutivos.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(" e ")}</strong>.`,
    );
  }
  if (resumo.melhorEvolucao) {
    linhas.push(
      `<strong>${escapeHtml(resumo.melhorEvolucao.materia)}</strong> teve a maior melhora de desempenho: +${resumo.melhorEvolucao.diferenca} pontos (agora em ${resumo.melhorEvolucao.percAtual}% de acerto).`,
    );
  }

  container.innerHTML = `
    <div class="diario-resumo-card">
      <h3 class="diario-insights-titulo">🗒️ Resumo da semana</h3>
      ${linhas.map((l) => `<p class="diario-resumo-linha">${l}</p>`).join("")}
      <p class="diario-resumo-fechamento">${resumo.fechamento}</p>
    </div>`;
}

function renderizarInsightsMoodTracker(diario) {
  const container = document.getElementById("diario-insights");
  if (!container) return;

  const pctPorDia = calcularPctAcertoPorDia();
  const insights = [
    calcularInsightHumorDesempenho(diario, pctPorDia),
    calcularInsightAnsiedadeDesempenho(pctPorDia),
    calcularInsightSonoFoco(),
    calcularInsightMateriaAnsiedade(),
    calcularMelhorPiorDiaSemana(),
  ].filter(Boolean);

  if (insights.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="diario-insights-card">
      <h3 class="diario-insights-titulo">🧠 Insights</h3>
      ${insights
        .map(
          (ins) => `
        <div class="diario-insight-item">
          <span class="diario-insight-icone">${ins.icone}</span>
          <span>${ins.texto}</span>
        </div>`,
        )
        .join("")}
    </div>`;
}

// "😀😀🙂🙂😐🙂😀😀😕" — uma tira com o humor do dia dos últimos 30 dias,
// pra bater o olho e ver o padrão emocional recente sem ler nada. Reusa o
// mesmo "humor do dia" já calculado pra timeline (prioriza check-out,
// cai pro check-in); dias sem nenhum check-in/check-out preenchido
// aparecem como um ponto neutro, não ficam simplesmente ausentes — assim
// a tira sempre tem 30 posições, fácil de comparar de relance.
function renderizarEvolucaoEmocional(diario) {
  const container = document.getElementById("diario-evolucao-emocional");
  if (!container) return;

  const humorPorData = {};
  diario.forEach((dia) => {
    if (dia.humor) humorPorData[dia.data] = dia.humor;
  });

  const hoje = new Date();
  const pontos = [];
  for (let i = 29; i >= 0; i--) {
    const d = somarDias(hoje, -i);
    const dataStr = obterDataLocalString(d);
    pontos.push({ data: dataStr, humor: humorPorData[dataStr] || null });
  }

  const temAlgumDado = pontos.some((p) => p.humor);
  if (!temAlgumDado) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="diario-insights-card">
      <h3 class="diario-insights-titulo">📈 Evolução emocional (últimos 30 dias)</h3>
      <div class="mood-evolucao-tira">
        ${pontos
          .map((p) => {
            const dataFormatada = new Date(
              p.data + "T00:00:00",
            ).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            return `<span class="mood-evolucao-ponto${p.humor ? "" : " mood-evolucao-sem-dado"}" title="${dataFormatada}${p.humor ? "" : " — sem registro"}">${p.humor ? MAPA_EMOJI_HUMOR[p.humor] : "·"}</span>`;
          })
          .join("")}
      </div>
    </div>`;
}

// --- LINHA DO TEMPO DA PREPARAÇÃO (resumo mês a mês) ---
function renderizarLinhaTempoMensal(diario) {
  const card = document.getElementById("card-linha-tempo-mensal");
  const lista = document.getElementById("linha-tempo-mensal-lista");
  if (!card || !lista) return;

  if (diario.length === 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  const porMes = {};
  diario.forEach((dia) => {
    const chaveMes = dia.data.slice(0, 7); // "YYYY-MM"
    if (!porMes[chaveMes]) {
      porMes[chaveMes] = { minutos: 0, humores: [] };
    }
    porMes[chaveMes].minutos += dia.minutos;
    if (dia.humor) porMes[chaveMes].humores.push(dia.humor);
  });

  const melhorSimuladoPorMes = {};
  registrosSimulados.forEach((s) => {
    const chaveMes = s.data.slice(0, 7);
    const pct = Math.round((s.acertos / s.total) * 100);
    if (
      !melhorSimuladoPorMes[chaveMes] ||
      pct > melhorSimuladoPorMes[chaveMes]
    ) {
      melhorSimuladoPorMes[chaveMes] = pct;
    }
  });

  const PESO_HUMOR = {
    excelente: 2,
    bom: 1,
    normal: 0,
    ruim: -1,
    muito_ruim: -2,
  };
  const EMOJI_POR_MEDIA = (media) => {
    if (media >= 1.2) return "😀";
    if (media >= 0.4) return "🙂";
    if (media >= -0.4) return "😐";
    if (media >= -1.2) return "😕";
    return "😞";
  };

  const meses = Object.keys(porMes).sort().reverse();

  lista.innerHTML = meses
    .map((chaveMes) => {
      const info = porMes[chaveMes];
      const [ano, mes] = chaveMes.split("-");
      const nomeMes = new Date(`${chaveMes}-01T12:00:00`).toLocaleDateString(
        "pt-BR",
        { month: "long", year: "numeric" },
      );

      let emojiMes = "";
      if (info.humores.length > 0) {
        const media =
          info.humores.reduce((soma, h) => soma + (PESO_HUMOR[h] || 0), 0) /
          info.humores.length;
        emojiMes = EMOJI_POR_MEDIA(media);
      }

      const simuladoTexto =
        melhorSimuladoPorMes[chaveMes] != null
          ? `<span class="linha-tempo-badge">🎯 melhor simulado: ${melhorSimuladoPorMes[chaveMes]}%</span>`
          : "";

      return `
        <div class="linha-tempo-item">
          <div class="linha-tempo-emoji">${emojiMes}</div>
          <div class="linha-tempo-conteudo">
            <strong class="linha-tempo-mes">${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</strong>
            <div class="linha-tempo-detalhe">
              ⏱️ ${formatarHorasMinutos(info.minutos)} estudadas
              ${simuladoTexto}
            </div>
          </div>
        </div>`;
    })
    .join("");
}

// --- EVOLUÇÃO AO LONGO DO TEMPO (linha: horas/semana + % acerto/semana) ---
let graficoEvolucaoTemporal = null;

function calcularEvolucaoSemanal(numSemanas) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const semanas = [];

  for (let i = numSemanas - 1; i >= 0; i--) {
    const fimSemana = somarDias(hoje, -7 * i);
    const inicioSemana = somarDias(fimSemana, -6);
    const inicioStr = obterDataLocalString(inicioSemana);
    const fimStr = obterDataLocalString(fimSemana);

    const sessoesSemana = logsSessoes.filter(
      (l) => l.data >= inicioStr && l.data <= fimStr,
    );
    const minutos = sessoesSemana.reduce((s, l) => s + l.duracao, 0);

    const questoesSemana = registrosQuestoes.filter(
      (r) => r.data >= inicioStr && r.data <= fimStr,
    );
    const totalQuestoes = questoesSemana.reduce((s, r) => s + r.total, 0);
    const acertosQuestoes = questoesSemana.reduce((s, r) => s + r.acertos, 0);
    const pctAcerto =
      totalQuestoes > 0
        ? Math.round((acertosQuestoes / totalQuestoes) * 100)
        : null;

    semanas.push({
      label: `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1}`,
      minutos,
      pctAcerto,
    });
  }

  return semanas;
}

function renderizarEvolucaoTemporal() {
  const card = document.getElementById("card-evolucao-temporal");
  const canvas = document.getElementById("chartEvolucaoTemporal");
  if (!card || !canvas) return;

  const semanas = calcularEvolucaoSemanal(8);
  const temAlgumDado = semanas.some(
    (s) => s.minutos > 0 || s.pctAcerto !== null,
  );

  if (!temAlgumDado) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  if (graficoEvolucaoTemporal) {
    graficoEvolucaoTemporal.destroy();
    graficoEvolucaoTemporal = null;
  }

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  graficoEvolucaoTemporal = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: semanas.map((s) => s.label),
      datasets: [
        {
          label: "Horas estudadas",
          data: semanas.map((s) => Math.round((s.minutos / 60) * 10) / 10),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.15)",
          yAxisID: "y",
          tension: 0.3,
          fill: true,
        },
        {
          label: "% Acerto em questões",
          data: semanas.map((s) => s.pctAcerto),
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.15)",
          yAxisID: "y1",
          tension: 0.3,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: {
          position: "left",
          min: 0,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (v) => `${v}h`,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
        y1: {
          position: "right",
          min: 0,
          max: 100,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            callback: (v) => `${v}%`,
          },
          grid: { display: false },
        },
        x: {
          ticks: { color: corTextoMuted, font: { family: fonteApp } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: corTextoMuted,
            font: { family: fonteApp, size: 12 },
          },
        },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) =>
              ctx.dataset.yAxisID === "y1"
                ? ` ${ctx.dataset.label}: ${ctx.parsed.y === null ? "sem dado" : ctx.parsed.y + "%"}`
                : ` ${ctx.dataset.label}: ${ctx.parsed.y}h`,
          },
        },
      },
    },
  });
}

// --- HEATMAP DE PRODUTIVIDADE POR HORÁRIO DO DIA ---
// Cada sessão já guarda a hora em que aconteceu (campo "hora"), então é só
// somar os minutos estudados por hora do dia (0h a 23h) e colorir com a
// mesma escala do heatmap de dias (lvl-1 a lvl-4) já usada no app.
function calcularProdutividadePorHorario() {
  const minutosPorHora = Array(24).fill(0);
  logsSessoes.forEach((log) => {
    if (!log.hora) return;
    const h = parseInt(log.hora.split(":")[0], 10);
    if (isNaN(h) || h < 0 || h > 23) return;
    minutosPorHora[h] += log.duracao || 0;
  });
  return minutosPorHora;
}

function renderizarHeatmapHorario() {
  const card = document.getElementById("card-heatmap-horario");
  const grade = document.getElementById("heatmap-horario-grade");
  const resumoEl = document.getElementById("heatmap-horario-resumo");
  if (!card || !grade) return;

  const minutosPorHora = calcularProdutividadePorHorario();
  const totalMinutos = minutosPorHora.reduce((a, b) => a + b, 0);

  if (totalMinutos === 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  const maxMinutos = Math.max(...minutosPorHora);
  const horaPico = minutosPorHora.indexOf(maxMinutos);

  grade.innerHTML = minutosPorHora
    .map((min, h) => {
      const intensidade = maxMinutos > 0 ? min / maxMinutos : 0;
      let nivel = "lvl-0";
      if (intensidade > 0) nivel = "lvl-1";
      if (intensidade > 0.35) nivel = "lvl-2";
      if (intensidade > 0.65) nivel = "lvl-3";
      if (intensidade > 0.85) nivel = "lvl-4";

      const horaFmt = String(h).padStart(2, "0") + "h";
      const tempoFmt = min > 0 ? formatarHorasMinutos(min) : "sem registros";
      const mostraRotulo = h % 3 === 0;

      return `
        <div class="heatmap-horario-coluna">
          <div class="heatmap-horario-celula ${nivel}" title="${horaFmt}: ${tempoFmt}"></div>
          ${mostraRotulo ? `<span class="heatmap-horario-label">${h}h</span>` : ""}
        </div>
      `;
    })
    .join("");

  if (resumoEl) {
    resumoEl.innerHTML =
      maxMinutos > 0
        ? `🕐 Seu horário mais produtivo: <strong>${String(horaPico).padStart(2, "0")}h</strong> (${formatarHorasMinutos(maxMinutos)} acumulado(s) nesse horário)`
        : "";
  }
}

// --- RENDERIZADORES DE TELA (METAS, HISTÓRICO, HEATMAP E GRÁFICOS) ---
function renderizarMetasEGraficos() {
  renderizarSeletorProvas();

  const lista = document.getElementById("lista-materias");
  if (!lista) return;
  lista.innerHTML = "";
  const widgetConteudo = document.getElementById("widget-meta-conteudo");

  if (metas.length === 0) {
    lista.innerHTML =
      '<p style="color:var(--text-muted); font-size:0.9rem; text-align:center;">Nenhuma meta ativa cadastrada.</p>';
    if (widgetConteudo)
      widgetConteudo.innerHTML =
        '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin: 0;">Nenhuma meta ativa cadastrada.</p>';
    return;
  }

  const filtroAtivo = obterMetaFiltroAtiva();

  lista.innerHTML = metas
    .map((meta, i) => {
      let dataFormatada = new Date(
        meta.dataLimite + "T23:59:59",
      ).toLocaleDateString("pt-BR");
      const destacada = filtroAtivo && filtroAtivo === meta.objetivoNome;

      const remuneracaoFormatada =
        meta.remuneracao != null
          ? meta.remuneracao.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "—";

      let periodoInscricao = "—";
      if (meta.inscricaoFim) {
        const fimFormatado = new Date(
          meta.inscricaoFim + "T23:59:59",
        ).toLocaleDateString("pt-BR");
        periodoInscricao = meta.inscricaoInicio
          ? `${new Date(meta.inscricaoInicio + "T00:00:00").toLocaleDateString("pt-BR")} a ${fimFormatado}`
          : `até ${fimFormatado}`;
      }

      const qtdMateriasVinculadas = materias.filter((m) =>
        materiaVinculadaAMeta(m, meta.objetivoNome),
      ).length;

      const status = calcularStatusInscricao(meta);

      const comparativoPosProva = meta.aprovado
        ? calcularFraseComparativoPosProva(meta)
        : null;

      return `<div class="prova-card${destacada ? " prova-card-ativa" : ""}${meta.aprovado ? " prova-card-aprovada" : ""}">
        <div class="prova-card-acoes">
          <button type="button" class="prova-card-editar" title="Editar esta prova" onclick="abrirModalEditarProva(${i})">✏️</button>
          <button type="button" class="prova-card-excluir" title="Excluir esta prova" onclick="excluirMeta(${i})">✕</button>
        </div>
        ${comparativoPosProva ? `<div class="prova-card-comparativo ${comparativoPosProva.classe}">${comparativoPosProva.texto}</div>` : ""}
        <div class="prova-card-titulo">🎯 ${escapeHtml(meta.objetivoNome)}</div>
        <div class="prova-card-linha"><span>📅 Prova objetiva</span><strong>${dataFormatada}</strong></div>
        <div class="prova-card-linha"><span>💰 Remuneração</span><strong>${remuneracaoFormatada}</strong></div>
        <div class="prova-card-linha"><span>📝 Inscrições</span><strong>${periodoInscricao}</strong></div>
        <div class="prova-card-linha"><span>📚 Tópicos do edital</span><strong>${meta.qtdMaterias}</strong></div>
        <div class="prova-card-linha"><span>🔗 Matérias vinculadas</span><strong>${qtdMateriasVinculadas}</strong></div>
        ${meta.notaCorte != null ? `<div class="prova-card-linha"><span>✅ Nota de corte</span><strong>${meta.notaCorte}%</strong></div>` : ""}
        ${status ? `<span class="status-badge ${status.classe} prova-card-status">${status.texto}</span>` : ""}
        <label class="prova-card-aprovacao">
          <input
            type="checkbox"
            ${meta.aprovado ? "checked" : ""}
            onclick="event.preventDefault(); abrirModalAprovacaoMeta(${i});"
          />
          <span>${meta.aprovado ? "🎓 Aprovado" : "Estudando"}</span>
        </label>
      </div>`;
    })
    .join("");

  // Com uma prova em foco, o widget mostra essa; sem filtro (Todas as
  // Provas), mantém o comportamento original de mostrar a mais recente.
  let metaAtiva =
    (filtroAtivo && metas.find((m) => m.objetivoNome === filtroAtivo)) ||
    metas[metas.length - 1];

  if (widgetConteudo && metaAtiva) {
    let hoje = new Date();
    let prazo = new Date(metaAtiva.dataLimite + "T23:59:59");
    let dRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));

    // A linha "Prova em Foco" só aparece quando NÃO há filtro ativo (ou
    // seja, mostrando a meta mais recente como fallback) — com filtro
    // ativo, o nome da prova já está destacado no seletor "Prova em foco"
    // lá em cima (.topo-cabecalho-linha), então repetir aqui é redundante.
    const linhaProvaEmFoco = filtroAtivo
      ? ""
      : `<div class="meta-stat-row"><div class="meta-stat-lbl">Meta Principal Ativa</div><div class="meta-stat-val" style="color:var(--accent-text);">${escapeHtml(metaAtiva.objetivoNome)}</div></div>`;

    const tituloWidget = document.getElementById("widget-meta-topo-titulo");
    if (tituloWidget) {
      tituloWidget.innerText = filtroAtivo
        ? "🎯 Sua Prova"
        : "🎯 Alvo e Meta Recente";
    }

    widgetConteudo.innerHTML = `
                ${linhaProvaEmFoco}
                <div class="meta-stat-row"><div class="meta-stat-lbl">Tópicos Totais</div><div class="meta-stat-val"><span class="meta-highlight">${metaAtiva.qtdMaterias}</span> conteúdos no edital</div></div>
                <div class="meta-stat-row"><div class="meta-stat-lbl">Dias para a Prova</div><div class="meta-countdown" style="font-size:1.4rem;">${dRestantes > 0 ? dRestantes : 0} dias restantes</div></div>`;
  }
}

// Lista as sessões de hoje (mais recente primeiro), cada uma com botão de
// excluir — remove do logsSessoes e reverte o impacto no tempo total e por
// matéria, pra estatísticas não ficarem incoerentes com um registro errado.
// Monta o bloco de "anexos" (material de apoio + videoaulas) de uma
// sessão pra exibir no card de "Sessões de Hoje" — sem isso, o link/nome
// digitado no formulário de registro ficava salvo mas invisível em
// qualquer lugar do app. Quando há um link válido (normalizarLinkSessao),
// o nome vira um <a> clicável que abre em nova aba.
function montarAnexosSessaoHoje(log) {
  const linhas = [];

  if (log.materialApoio || log.materialApoioLink) {
    const nome = log.materialApoio
      ? escapeHtml(log.materialApoio)
      : "Material de apoio";
    const conteudo = log.materialApoioLink
      ? `<a href="${log.materialApoioLink}" target="_blank" rel="noopener noreferrer">${nome} ↗</a>`
      : nome;
    linhas.push(`<span class="sessao-hoje-anexo">📎 ${conteudo}</span>`);
  }

  (log.videoaulas || []).forEach((v) => {
    const nome = escapeHtml(v.nome || "Vídeo");
    const duracao = v.duracaoMin
      ? ` (${formatarHorasMinutos(v.duracaoMin)})`
      : "";
    const conteudo = v.link
      ? `<a href="${v.link}" target="_blank" rel="noopener noreferrer">${nome} ↗</a>`
      : nome;
    linhas.push(
      `<span class="sessao-hoje-anexo">🎬 ${conteudo}${duracao}</span>`,
    );
  });

  if (linhas.length === 0) return "";
  return `<div class="sessao-hoje-anexos">${linhas.join("")}</div>`;
}

function renderizarSessoesHoje() {
  const container = document.getElementById("sessoes-hoje-lista");
  if (!container) return;

  const hojeStr = obterDataLocalString(new Date());
  const sessoesHoje = logsSessoes
    .map((log, indice) => ({ ...log, _indice: indice }))
    .filter((log) => log.data === hojeStr)
    .reverse();

  if (sessoesHoje.length === 0) {
    container.innerHTML =
      '<p class="sessoes-hoje-vazio">Nenhuma sessão registrada hoje ainda.</p>';
    return;
  }

  container.innerHTML = sessoesHoje
    .map((log) => {
      const materiaObj = materias.find((m) => m.nome === log.materia);
      const cor = materiaObj ? materiaObj.cor : "#64748b";
      return `
        <div class="sessao-hoje-card">
          <span class="sessao-hoje-dot" style="background:${cor}"></span>
          <div class="sessao-hoje-info">
            <div class="sessao-hoje-topo">
              <span class="sessao-hoje-materia">${escapeHtml(log.materia)}</span>
              <span class="sessao-hoje-meta">${log.duracao} min • 🕒 ${log.hora}</span>
            </div>
            ${log.nota ? `<div class="sessao-hoje-nota">📝 ${escapeHtml(log.nota)}</div>` : ""}
            ${montarAnexosSessaoHoje(log)}
          </div>
          <button
            type="button"
            class="sessao-hoje-excluir"
            title="Excluir sessão"
            onclick="excluirSessaoDoDia(${log._indice})"
          >✕</button>
        </div>
      `;
    })
    .join("");
}

async function excluirSessaoDoDia(indice) {
  const sessao = logsSessoes[indice];
  if (!sessao) return;

  const confirmado = await mostrarConfirmacao(
    `Excluir a sessão de "${sessao.materia}" (${sessao.duracao} min, ${sessao.hora})?\n\nIsso subtrai o tempo do total do dia e da matéria. O contador de pomodoros da meta não é alterado.`,
    { icone: "🗑️", textoConfirmar: "Excluir", perigo: true },
  );
  if (!confirmado) return;

  historicoEstudos[sessao.data] = Math.max(
    0,
    (historicoEstudos[sessao.data] || 0) - sessao.duracao,
  );
  localStorage.setItem("historicoEstudos", JSON.stringify(historicoEstudos));

  if (tempoPorMateria[sessao.materia] !== undefined) {
    tempoPorMateria[sessao.materia] = Math.max(
      0,
      tempoPorMateria[sessao.materia] - sessao.duracao,
    );
    localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));
  }

  logsSessoes.splice(indice, 1);
  localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));

  renderizarTodoOPainel();
}

// Exclui uma sessão específica listada no widget "Histórico Recente (7
// Dias)" — usado pra corrigir registros errados (ex: os duplicados gerados
// pelo bug de clique duplo ao finalizar sessão). Reverte o tempo subtraído
// do total do dia e da matéria, igual excluirSessaoDoDia(), mas essa aqui
// cobre os 7 dias exibidos no painel, não só o dia de hoje.
async function excluirSessaoHistorico7Dias(indice) {
  const sessao = logsSessoes[indice];
  if (!sessao) return;

  const dataFormatada = sessao.data.split("-").reverse().join("/");
  const confirmado = await mostrarConfirmacao(
    `Excluir a sessão de "${sessao.materia}" (${sessao.duracao} min, ${dataFormatada} às ${sessao.hora})?\n\nIsso subtrai o tempo do total do dia e da matéria. O contador de pomodoros da meta não é alterado.`,
    { icone: "🗑️", textoConfirmar: "Excluir", perigo: true },
  );
  if (!confirmado) return;

  historicoEstudos[sessao.data] = Math.max(
    0,
    (historicoEstudos[sessao.data] || 0) - sessao.duracao,
  );
  localStorage.setItem("historicoEstudos", JSON.stringify(historicoEstudos));

  if (tempoPorMateria[sessao.materia] !== undefined) {
    tempoPorMateria[sessao.materia] = Math.max(
      0,
      tempoPorMateria[sessao.materia] - sessao.duracao,
    );
    localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));
  }

  logsSessoes.splice(indice, 1);
  localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));

  renderizarTodoOPainel();
}

function renderizarHistorico7Dias() {
  const container = document.getElementById("historico-7-dias");
  if (!container) return;
  container.innerHTML = "";
  let hoje = new Date();

  for (let i = 0; i < 7; i++) {
    let dt = new Date();
    dt.setDate(hoje.getDate() - i);
    let dataStr = obterDataLocalString(dt);
    let totalMinutosDia = historicoEstudos[dataStr] || 0;
    let sessoesDesseDia = logsSessoes.filter((log) => log.data === dataStr);

    let HTMLDia = `
                <div class="historico-dia-card">
                    <div class="historico-dia-topo">
                        <span class="data">${dt.toLocaleDateString("pt-BR")}</span>
                        <span class="total">${totalMinutosDia > 0 ? totalMinutosDia + " min focados" : "Sem registros"}</span>
                    </div>`;

    if (sessoesDesseDia.length > 0) {
      [...sessoesDesseDia].reverse().forEach((s) => {
        let matObjeto = materias.find((m) => m.nome === s.materia);
        let corMat = matObjeto ? matObjeto.cor : "#64748b";
        // Usa a posição real de "s" no array logsSessoes (não a posição
        // dentro da lista filtrada/invertida deste dia) — como filter()
        // preserva a mesma referência de objeto, indexOf() localiza o
        // índice verdadeiro pra excluir exatamente essa sessão depois.
        let indiceReal = logsSessoes.indexOf(s);
        HTMLDia += `
                        <div class="sessao-item">
                            <span class="materia-nome"><span style="display:inline-block; width:8px; height:8px; background:${corMat}; border-radius:50%; margin-right:6px;"></span>${s.materia}</span>
                            <span class="detalhes">
                                <span>+${s.duracao} min</span>
                                <span style="color:#64748b;">🕒 ${s.hora}</span>
                                <button
                                  type="button"
                                  class="sessao-item-excluir"
                                  title="Excluir esta sessão"
                                  onclick="excluirSessaoHistorico7Dias(${indiceReal})"
                                >✕</button>
                            </span>
                        </div>`;
      });
    } else {
      HTMLDia += `<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding: 6px 0;">Nenhuma sessão gravada</div>`;
    }
    HTMLDia += `</div>`;
    container.innerHTML += HTMLDia;
  }
}

// --- CÓDIGO DO CALENDÁRIO / HEATMAP ---
function alterarModoVisualizacao(modo) {
  modoAtual = modo;
  document
    .getElementById("btn-mode-github")
    .classList.toggle("active", modo === "github");
  document
    .getElementById("btn-mode-calendar")
    .classList.toggle("active", modo === "calendar");
  document.getElementById("visualizacao-github").style.display =
    modo === "github" ? "flex" : "none";
  document.getElementById("visualizacao-calendar").style.display =
    modo === "calendar" ? "grid" : "none";
  renderizarPainelFoco();
}

function mudarPeriodoVisualizacao(m) {
  mesesParaExibir = m;
  document.getElementById("btn-p-1").classList.remove("active");
  document.getElementById("btn-p-3").classList.remove("active");
  document.getElementById("btn-p-6").classList.remove("active");
  document.getElementById("btn-p-12").classList.remove("active");
  document.getElementById("btn-p-" + m).classList.add("active");
  renderizarPainelFoco();
}

function renderizarPainelFoco() {
  atualizarCalculoStreak();
  let hoje = new Date();
  let totalDias = mesesParaExibir * 30;
  const pomosPorDiaHeatmap =
    JSON.parse(localStorage.getItem("pomosPorDia")) || {};

  // 1. HEATMAP GITHUB
  const gridGitHub = document.getElementById("github-grid-dinamico");
  if (gridGitHub) {
    gridGitHub.innerHTML = "";
    let offsetFim = 6 - hoje.getDay();
    let totalCelulas = totalDias + offsetFim;

    let arrayDias = [];
    for (let i = totalCelulas - 1; i >= 0; i--) {
      let dt = new Date();
      dt.setDate(hoje.getDate() - i + offsetFim);
      arrayDias.push(dt);
    }

    arrayDias.forEach((dt) => {
      let cubo = document.createElement("div");
      cubo.className = "day-cube";
      if (dt > hoje) {
        cubo.style.opacity = "0";
        cubo.style.pointerEvents = "none";
      } else {
        let dataStr = obterDataLocalString(dt);
        let minutos = historicoEstudos[dataStr] || 0;
        let pomosDoDia = pomosPorDiaHeatmap[dataStr] || 0;
        if (minutos > 0 && minutos <= 30) cubo.classList.add("lvl-1");
        else if (minutos > 30 && minutos <= 60) cubo.classList.add("lvl-2");
        else if (minutos > 60 && minutos <= 120) cubo.classList.add("lvl-3");
        else if (minutos > 120) cubo.classList.add("lvl-4");
        if (pomosDoDia > 0) cubo.classList.add("tem-pomodoro");
        cubo.setAttribute(
          "data-info",
          `${dt.toLocaleDateString("pt-BR")}: ${minutos} min` +
            (pomosDoDia > 0
              ? ` • ${pomosDoDia} ${pomosDoDia === 1 ? "pomodoro" : "pomodoros"}`
              : ""),
        );
      }
      gridGitHub.appendChild(cubo);
    });
  }

  // 2. CALENDÁRIO COMPACTO
  const wrapperCal = document.getElementById("visualizacao-calendar");
  if (wrapperCal) {
    wrapperCal.innerHTML = "";
    let mesesArray = [];
    for (let i = mesesParaExibir - 1; i >= 0; i--) {
      let d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      mesesArray.push(d);
    }

    mesesArray.forEach((dataMes) => {
      let mesAnoStr = dataMes.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

      let containerMes = document.createElement("div");
      containerMes.className = "mes-container";

      let divTitulo = document.createElement("div");
      divTitulo.className = "mes-titulo";
      divTitulo.innerText = mesAnoStr;
      containerMes.appendChild(divTitulo);

      let gridDias = document.createElement("div");
      gridDias.className = "grid-calendario";

      ["D", "S", "T", "Q", "Q", "S", "S"].forEach((ds) => {
        let spanDs = document.createElement("div");
        spanDs.className = "dia-semana-label";
        spanDs.innerText = ds;
        gridDias.appendChild(spanDs);
      });

      let numDiasNoMes = new Date(
        dataMes.getFullYear(),
        dataMes.getMonth() + 1,
        0,
      ).getDate();
      let primeiroDiaSemana = new Date(
        dataMes.getFullYear(),
        dataMes.getMonth(),
        1,
      ).getDay();

      for (let i = 0; i < primeiroDiaSemana; i++) {
        let vazio = document.createElement("div");
        vazio.className = "dia-calendario vazio";
        gridDias.appendChild(vazio);
      }

      for (let d = 1; d <= numDiasNoMes; d++) {
        let dataLoop = new Date(dataMes.getFullYear(), dataMes.getMonth(), d);
        let celula = document.createElement("div");
        celula.className = "dia-calendario";
        celula.innerText = d;

        if (dataLoop > hoje) {
          celula.style.opacity = "0.3";
          celula.style.pointerEvents = "none";
        } else {
          let dtStr = obterDataLocalString(dataLoop);
          let min = historicoEstudos[dtStr] || 0;
          let pomosDoDia = pomosPorDiaHeatmap[dtStr] || 0;
          if (min > 0) celula.classList.add("ativo");
          if (min > 0 && min <= 30) celula.classList.add("lvl-1");
          else if (min > 30 && min <= 60) celula.classList.add("lvl-2");
          else if (min > 60 && min <= 120) celula.classList.add("lvl-3");
          else if (min > 120) celula.classList.add("lvl-4");
          if (pomosDoDia > 0) celula.classList.add("tem-pomodoro");

          celula.setAttribute(
            "data-info",
            `${dataLoop.toLocaleDateString("pt-BR")}: ${min} min` +
              (pomosDoDia > 0
                ? ` • ${pomosDoDia} ${pomosDoDia === 1 ? "pomodoro" : "pomodoros"}`
                : ""),
          );
        }
        gridDias.appendChild(celula);
      }
      containerMes.appendChild(gridDias);
      wrapperCal.appendChild(containerMes);
    });
  }
}

// Formata minutos totais como "Xh Ymin" (ou só "Xh"/"Ymin" quando um dos
// dois for zero) para exibir na legenda do gráfico.
function formatarHorasMinutos(totalMinutos) {
  const minutos = Math.round(totalMinutos);
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function renderizarGrafico() {
  const canvas = document.getElementById("chartMaterias");
  if (!canvas) return;

  const wrapper = document.getElementById("chart-wrapper-distribuicao-tempo");

  const mapaTempo = obterTempoPorMateria();

  // Ordena da matéria mais estudada para a menos estudada
  const entradasOrdenadas = Object.entries(mapaTempo).sort(
    (a, b) => b[1] - a[1],
  );

  if (entradasOrdenadas.length === 0) {
    if (meuGrafico) {
      meuGrafico.destroy();
      meuGrafico = null;
    }
    if (wrapper) wrapper.style.height = "0px";
    return;
  }

  const nomesMaterias = entradasOrdenadas.map(([nome]) => nome);
  const valores = entradasOrdenadas.map(([, min]) => min);
  const totalGeral = valores.reduce((soma, v) => soma + v, 0);

  // Respeita a cor cadastrada em "Cadastrar Nova Matéria". Se uma matéria
  // não tiver cor própria (cadastro antigo, por exemplo), usa uma cor
  // estável da mesma paleta do formulário — nunca duas matérias sem cor
  // caem na mesma cor por acaso.
  let indiceFallback = 0;
  const cores = nomesMaterias.map((nome) => {
    const materia = materias.find((m) => m.nome === nome);
    if (materia && materia.cor) return materia.cor;
    const corPadrao = paletaCores[indiceFallback % paletaCores.length].hex;
    indiceFallback++;
    return corPadrao;
  });

  if (meuGrafico instanceof Chart) {
    meuGrafico.destroy();
  }

  // Lê as cores do tema (CSS vars) para o gráfico ficar harmonioso com o
  // resto da página, em vez de tons fixos que podem destoar.
  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const corTextoMain =
    estiloRaiz.getPropertyValue("--text-main").trim() || "#e2e8f0";
  const corCardBg =
    estiloRaiz.getPropertyValue("--card-bg").trim() || "#1e293b";
  const corBorda = estiloRaiz.getPropertyValue("--border").trim() || "#334155";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  // Gráfico de barras horizontais em vez de pizza: cada matéria vira uma
  // linha própria, então funciona bem com poucas ou muitas matérias
  // cadastradas — uma pizza fica ilegível com muitas fatias pequenas, já a
  // lista de barras só cresce em altura (a altura do canvas é ajustada
  // abaixo, uma "faixa" por matéria, e o próprio modal rola se precisar).
  const alturaPorMateria = 34;
  const alturaMinima = 160;
  const alturaCalculada = Math.max(
    alturaMinima,
    nomesMaterias.length * alturaPorMateria + 40,
  );
  canvas.style.height = `${alturaCalculada}px`;
  if (wrapper) wrapper.style.height = `${alturaCalculada}px`;

  meuGrafico = new Chart(canvas.getContext("2d"), {
    type: "bar",

    data: {
      labels: nomesMaterias,

      datasets: [
        {
          data: valores,
          backgroundColor: cores,
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 22,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        x: {
          beginAtZero: true,
          grid: { color: corBorda },
          border: { color: corBorda },
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp, size: 11 },
            callback: (valor) => formatarHorasMinutos(valor),
          },
        },
        y: {
          grid: { display: false },
          border: { color: corBorda },
          ticks: {
            color: corTextoMain,
            font: { family: fonteApp, size: 12 },
            autoSkip: false,
          },
        },
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (contexto) => {
              const min = contexto.parsed.x;
              const pct = totalGeral > 0 ? (min / totalGeral) * 100 : 0;
              return ` ${formatarHorasMinutos(min)} (${pct.toFixed(1)}%)`;
            },
          },
        },
      },
    },
  });
}

function obterTempoPorMateria() {
  // Usa diretamente o objeto tempoPorMateria, que é mantido em dia por
  // salvarProgressoGeral() toda vez que uma sessão é registrada. A chave
  // antiga "historicoFoco" não representava mais os dados reais.
  // Quando há uma prova em foco, mostra só o tempo das matérias vinculadas
  // a ela (matérias de outras provas ou "Estudo Geral" ficam de fora).
  const filtro = obterMetaFiltroAtiva();
  const nomesPermitidos = filtro
    ? new Set(obterMateriasDoFiltroAtivo().map((m) => m.nome))
    : null;

  const mapaTempo = {};
  Object.keys(tempoPorMateria).forEach((nome) => {
    if (
      tempoPorMateria[nome] > 0 &&
      (!nomesPermitidos || nomesPermitidos.has(nome))
    ) {
      mapaTempo[nome] = tempoPorMateria[nome];
    }
  });
  return mapaTempo;
}

function renderizarTodoOPainel() {
  atualizarDropdowns();
  renderizarPainelFoco();
  renderizarSessoesHoje();
  renderizarHistorico7Dias();
  renderizarMetasEGraficos();
  verificarAlarmesInscricao();
  renderizarGrafico();
  atualizarProgressoPomodoros();
  renderizarTaxaConclusao();
  renderizarGamificacao();
  renderizarMateriasCadastradas();
  renderizarRevisaoPendente();
  renderizarQuestoesResolvidas();
  renderizarEvolucaoQuestoes();
  renderizarQuestoesFontesExternas();
  renderizarSimulados();
  renderizarEvolucaoSimulados();
  renderizarSessoesPorTipo();
  renderizarComparativoProvas();
  renderizarRitmoSugerido();
  renderizarEvolucaoTemporal();
  renderizarMatrizPrioridade();
  renderizarNotaEstimada();
  renderizarComparativoAvulsasSimulados();
  renderizarRadarCompetencias();
  renderizarCadernoDeErros();
  renderizarDesempenhoPorBanca();
  renderizarHeatmapHorario();
  renderizarRecomendacaoHoje();
  renderizarModoRetaFinal();
  renderizarDiario();
  renderizarInsightTempoPorQuestao();
  atualizarMetaHorasSemanais();
}

// Inicialização do formulário de cadastro de matéria (estrelas de peso —
// a cor agora é 100% automática, sem campo/swatches pra inicializar aqui)
if (document.getElementById("peso-estrelas-container")) {
  renderizarEstrelasPeso(
    "peso-estrelas-container",
    "mat-only-peso",
    1,
    validarFormularioMateria,
  );
  validarFormularioMateria();
}

// Lê a meta diária configurada (padrão: 8). 0 = "Livre", sem meta definida.
function obterMetaPomodorosDiaria() {
  const salvo = localStorage.getItem("metaPomodorosDiaria");
  return salvo === null ? 8 : parseInt(salvo, 10);
}

// Salva a meta diária escolhida pelo usuário e atualiza a interface na hora.
function definirMetaPomodorosDiaria(valor) {
  localStorage.setItem("metaPomodorosDiaria", parseInt(valor, 10));
  atualizarProgressoPomodoros();
}

// Abre/fecha a caixinha de configuração da meta diária.
function toggleConfigMetaPomodoros() {
  const box = document.getElementById("config-meta-pomodoros-box");
  if (!box) return;
  box.style.display = box.style.display === "none" ? "flex" : "none";
}

// Função para atualizar o progresso de pomodoros
function atualizarProgressoPomodoros() {
  // Contador é por dia (mesma chave de data usada no resto do app), senão
  // nunca zerava e ficava acumulando para sempre.
  const hojeStr = obterDataLocalString(new Date());
  let pomosPorDia = JSON.parse(localStorage.getItem("pomosPorDia")) || {};
  let pomosConcluidos = pomosPorDia[hojeStr] || 0;
  const metaDiaria = obterMetaPomodorosDiaria();

  // Mantém o <select> de configuração sincronizado com o valor salvo
  const selectMeta = document.getElementById("select-meta-pomodoros");
  if (selectMeta) selectMeta.value = String(metaDiaria);

  const circulo = document.getElementById("circulo-meta");
  const labelPometa = document.getElementById("pomo-meta-label");
  const textoPercentual = document.getElementById("meta-percentual-texto");

  if (metaDiaria === 0) {
    // Modo livre: sem meta para comparar, só mostra quantos pomodoros
    // foram feitos hoje, sem cobrança de percentual.
    if (circulo) {
      circulo.style.background = `conic-gradient(var(--border) 360deg, var(--border) 360deg)`;
    }
    document.getElementById("pomo-atual").innerText = pomosConcluidos;
    document.getElementById("pomo-meta").innerText = "∞";
    if (labelPometa) labelPometa.innerText = "Livre";
    document.getElementById("barra-progresso").style.width = "0%";
    if (textoPercentual) textoPercentual.innerText = "Modo livre (sem meta)";
    return;
  }

  // Calcula porcentagem
  const porcentagem = Math.min((pomosConcluidos / metaDiaria) * 100, 100);
  const graus = (porcentagem / 100) * 360;

  // Atualiza o círculo
  if (circulo) {
    circulo.style.background = `conic-gradient(var(--primary) ${graus}deg, var(--border) ${graus}deg)`;
  }

  // Atualiza textos
  document.getElementById("pomo-atual").innerText = pomosConcluidos;
  document.getElementById("pomo-meta").innerText = metaDiaria;
  if (labelPometa) labelPometa.innerText = "Pomodoros";

  // Atualiza barra
  document.getElementById("barra-progresso").style.width = `${porcentagem}%`;
  if (textoPercentual)
    textoPercentual.innerText = `${Math.round(porcentagem)}% concluído`;
}

// Função para incrementar o contador (chamada ao finalizar um ciclo completo)
function registrarPomodoroConcluido() {
  const hojeStr = obterDataLocalString(new Date());
  let pomosPorDia = JSON.parse(localStorage.getItem("pomosPorDia")) || {};
  pomosPorDia[hojeStr] = (pomosPorDia[hojeStr] || 0) + 1;
  localStorage.setItem("pomosPorDia", JSON.stringify(pomosPorDia));
  atualizarProgressoPomodoros();
}

// Contador irmão do de cima, mas pro momento em que um ciclo de foco
// genuíno COMEÇA (chamado de dentro de startTimer(), só quando não é uma
// pausa) — mesmo que esse ciclo depois seja abandonado no meio pelo botão
// "Finalizar". Junto com pomosPorDia (só os concluídos), dá pra calcular a
// taxa de conclusão: quantos dos pomodoros iniciados chegaram até o fim.
function registrarPomodoroIniciado() {
  const hojeStr = obterDataLocalString(new Date());
  let pomosIniciadosPorDia =
    JSON.parse(localStorage.getItem("pomosIniciadosPorDia")) || {};
  pomosIniciadosPorDia[hojeStr] = (pomosIniciadosPorDia[hojeStr] || 0) + 1;
  localStorage.setItem(
    "pomosIniciadosPorDia",
    JSON.stringify(pomosIniciadosPorDia),
  );
}

// Soma iniciados/concluídos de um período (hoje, últimos 7 dias ou tudo) e
// renderiza as 3 linhas do card "Taxa de Conclusão de Pomodoros" na aba de
// Análises. Um pomodoro só entra em pomosPorDia quando chega a cumprir o
// ciclo inteiro (ver registrarPomodoroConcluido) — a diferença pro que está
// em pomosIniciadosPorDia é o quanto foi abandonado no meio do caminho.
function renderizarTaxaConclusao() {
  const container = document.getElementById("taxa-conclusao-conteudo");
  if (!container) return;

  const iniciadosPorDia =
    JSON.parse(localStorage.getItem("pomosIniciadosPorDia")) || {};
  const concluidosPorDia =
    JSON.parse(localStorage.getItem("pomosPorDia")) || {};

  const hojeStr = obterDataLocalString(new Date());
  const seteAtras = new Date();
  seteAtras.setDate(seteAtras.getDate() - 6); // hoje + 6 dias anteriores = 7 dias
  seteAtras.setHours(0, 0, 0, 0);

  function somarPeriodo(filtroData) {
    let iniciados = 0;
    let concluidos = 0;
    Object.keys(iniciadosPorDia).forEach((data) => {
      if (filtroData(data)) iniciados += iniciadosPorDia[data];
    });
    Object.keys(concluidosPorDia).forEach((data) => {
      if (filtroData(data)) concluidos += concluidosPorDia[data];
    });
    return { iniciados, concluidos };
  }

  const hoje = somarPeriodo((data) => data === hojeStr);
  const ultimos7 = somarPeriodo(
    (data) => new Date(`${data}T00:00:00`) >= seteAtras,
  );
  const total = somarPeriodo(() => true);

  function linhaHtml(titulo, stats) {
    const pct =
      stats.iniciados > 0
        ? Math.round((stats.concluidos / stats.iniciados) * 100)
        : null;
    const pctTexto = pct === null ? "—" : `${pct}%`;
    const corPct =
      pct === null
        ? "var(--text-muted)"
        : pct >= 80
          ? "var(--success)"
          : pct >= 50
            ? "var(--warning)"
            : "var(--danger)";

    return `
      <div class="taxa-conclusao-linha">
        <span class="taxa-conclusao-titulo">${titulo}</span>
        <span class="taxa-conclusao-detalhe">${stats.concluidos} de ${stats.iniciados} iniciados</span>
        <span class="taxa-conclusao-pct" style="color: ${corPct}">${pctTexto}</span>
      </div>
    `;
  }

  container.innerHTML =
    linhaHtml("Hoje", hoje) +
    linhaHtml("Últimos 7 dias", ultimos7) +
    linhaHtml("Total", total);
}

// --- TAREFAS (widget lateral) ---
let tarefas = JSON.parse(localStorage.getItem("tarefas")) || [];
// Registros de questões resolvidas: {id, data, materia, total, acertos}
let registrosQuestoes =
  JSON.parse(localStorage.getItem("registrosQuestoes")) || [];
// Registros de simulados/provas completas: {id, data, nome, metaVinculada, total, acertos}
let registrosSimulados =
  JSON.parse(localStorage.getItem("registrosSimulados")) || [];

function salvarTarefas() {
  localStorage.setItem("tarefas", JSON.stringify(tarefas));
}

function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Normaliza um link colado pelo usuário (aceita sem "http://" na frente,
// ex: "youtube.com/xyz") e recusa qualquer esquema que não seja
// http/https — evita que um valor tipo "javascript:..." vire um link
// clicável em algum lugar do app.
function normalizarLinkSessao(url) {
  const valor = (url || "").trim();
  if (!valor) return null;
  const comEsquema = /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
  try {
    const parsed = new URL(comEsquema);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function adicionarTarefa() {
  const input = document.getElementById("input-nova-tarefa");
  if (!input) return;
  const texto = input.value.trim();
  if (!texto) return;

  tarefas.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    texto,
    concluida: false,
  });

  salvarTarefas();
  input.value = "";
  renderizarTarefas();
}

function alternarTarefaConcluida(id) {
  const tarefa = tarefas.find((t) => t.id === id);
  if (!tarefa) return;
  tarefa.concluida = !tarefa.concluida;
  salvarTarefas();
  renderizarTarefas();

  // Easter egg: zerou a lista (tinha pelo menos 1 tarefa e concluiu todas).
  if (tarefas.length > 0 && tarefas.every((t) => t.concluida)) {
    marcarEasterEgg("caixaZerada");
    renderizarGamificacao();
  }
}

function editarTarefa(id) {
  const tarefa = tarefas.find((t) => t.id === id);
  if (!tarefa) return;
  const novoTexto = prompt("Editar tarefa:", tarefa.texto);
  if (novoTexto !== null && novoTexto.trim() !== "") {
    tarefa.texto = novoTexto.trim();
    salvarTarefas();
    renderizarTarefas();
  }
}

function moverTarefa(id, direcao) {
  const idx = tarefas.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const novoIdx = idx + direcao;
  if (novoIdx < 0 || novoIdx >= tarefas.length) return;
  [tarefas[idx], tarefas[novoIdx]] = [tarefas[novoIdx], tarefas[idx]];
  salvarTarefas();
  renderizarTarefas();
}

function excluirTarefa(id) {
  tarefas = tarefas.filter((t) => t.id !== id);
  salvarTarefas();
  renderizarTarefas();
}

function renderizarTarefas() {
  const lista = document.getElementById("lista-tarefas");
  if (!lista) return;

  if (tarefas.length === 0) {
    lista.innerHTML =
      '<p class="tarefas-vazio">Nenhuma tarefa por aqui ainda.</p>';
    return;
  }

  lista.innerHTML = tarefas
    .map((tarefa, i) => {
      const desabilitarSubir = i === 0 ? "disabled" : "";
      const desabilitarDescer = i === tarefas.length - 1 ? "disabled" : "";
      return `
        <div class="tarefa-item${tarefa.concluida ? " concluida" : ""}">
          <input
            type="checkbox"
            ${tarefa.concluida ? "checked" : ""}
            onchange="alternarTarefaConcluida('${tarefa.id}')"
          />
          <span class="tarefa-texto">${escapeHtml(tarefa.texto)}</span>
          <div class="tarefa-acoes">
            <button type="button" title="Editar" onclick="editarTarefa('${tarefa.id}')">✏️</button>
            <button type="button" title="Mover para cima" ${desabilitarSubir} onclick="moverTarefa('${tarefa.id}', -1)">↑</button>
            <button type="button" title="Mover para baixo" ${desabilitarDescer} onclick="moverTarefa('${tarefa.id}', 1)">↓</button>
            <button type="button" title="Excluir" onclick="excluirTarefa('${tarefa.id}')">✕</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// --- ANÁLISE DE ESTUDOS (Perfil) ---
let analisePeriodoAtual = "7dias";
let analiseOffset = 0;
let graficoAnaliseDonut = null;
let graficoAnaliseBarras = null;

const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function corMateria(nome, indiceFallback) {
  const materia = materias.find((m) => m.nome === nome);
  if (materia && materia.cor) return materia.cor;
  return paletaCores[indiceFallback % paletaCores.length].hex;
}

// --- EVOLUÇÃO DE QUESTÕES (aba Desempenho): total respondido + erros no
// histórico inteiro, e um gráfico de barras empilhadas (acertos x erros)
// por período — 7 dias, 30 dias, 6 meses ou o ano corrente. Períodos são
// janelas fixas terminando hoje, sem navegação anterior/próximo (ao
// contrário da Análise de Estudos), pra manter simples como foi pedido.
let questoesEvolucaoPeriodoAtual = "7dias";
let graficoQuestoesEvolucao = null;

function mudarPeriodoQuestoesEvolucao(periodo) {
  questoesEvolucaoPeriodoAtual = periodo;
  document
    .querySelectorAll("#questoes-evolucao-periodo-toggle button")
    .forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.periodo === periodo);
    });
  renderizarEvolucaoQuestoes();
}

// Gera os "baldes" (buckets) de datas do período selecionado, cada um já
// com o total de questões e acertos somados a partir de registrosQuestoes.
function gerarBucketsQuestoesEvolucao(periodo) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const buckets = [];

  const somarNoIntervalo = (inicio, fim) => {
    const inicioStr = obterDataLocalString(inicio);
    const fimStr = obterDataLocalString(fim);
    const doIntervalo = registrosQuestoes.filter(
      (r) => r.data >= inicioStr && r.data <= fimStr,
    );
    // Simulados completos também contam como questões respondidas no dia
    // em que foram registrados (mesmo critério de data usado acima).
    const simuladosDoIntervalo = registrosSimulados.filter(
      (r) => r.data >= inicioStr && r.data <= fimStr,
    );
    const total =
      doIntervalo.reduce((s, r) => s + (r.total || 0), 0) +
      simuladosDoIntervalo.reduce((s, r) => s + (r.total || 0), 0);
    const acertos =
      doIntervalo.reduce((s, r) => s + (r.acertos || 0), 0) +
      simuladosDoIntervalo.reduce((s, r) => s + (r.acertos || 0), 0);
    return { total, acertos };
  };

  if (periodo === "7dias" || periodo === "30dias") {
    const dias = periodo === "7dias" ? 7 : 30;
    for (let i = dias - 1; i >= 0; i--) {
      const d = somarDias(hoje, -i);
      const { total, acertos } = somarNoIntervalo(d, d);
      const label =
        dias === 7
          ? DIAS_SEMANA_ABREV[d.getDay()]
          : `${d.getDate()}/${d.getMonth() + 1}`;
      buckets.push({ label, total, acertos, erros: total - acertos });
    }
  } else if (periodo === "6meses") {
    for (let i = 5; i >= 0; i--) {
      const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const inicio = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
      const fim = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0);
      const { total, acertos } = somarNoIntervalo(inicio, fim);
      buckets.push({
        label: MESES_ABREV[mesRef.getMonth()],
        total,
        acertos,
        erros: total - acertos,
      });
    }
  } else if (periodo === "ano") {
    const ano = hoje.getFullYear();
    for (let m = 0; m < 12; m++) {
      const inicio = new Date(ano, m, 1);
      const fim = new Date(ano, m + 1, 0);
      const { total, acertos } = somarNoIntervalo(inicio, fim);
      buckets.push({
        label: MESES_ABREV[m],
        total,
        acertos,
        erros: total - acertos,
      });
    }
  }

  return buckets;
}

function renderizarEvolucaoQuestoes() {
  const card = document.getElementById("card-questoes-evolucao");
  const canvas = document.getElementById("chartQuestoesEvolucao");
  if (!card || !canvas) return;

  if (registrosQuestoes.length === 0 && registrosSimulados.length === 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  // --- Stats do histórico inteiro (não filtradas por período) ---
  // Inclui tanto questões avulsas quanto simulados completos, já que
  // ambos agora contam no quantitativo de questões respondidas.
  const totalGeral =
    registrosQuestoes.reduce((s, r) => s + (r.total || 0), 0) +
    registrosSimulados.reduce((s, r) => s + (r.total || 0), 0);
  const acertosGeral =
    registrosQuestoes.reduce((s, r) => s + (r.acertos || 0), 0) +
    registrosSimulados.reduce((s, r) => s + (r.acertos || 0), 0);
  const errosGeral = totalGeral - acertosGeral;
  const pctAcertoGeral =
    totalGeral > 0 ? Math.round((acertosGeral / totalGeral) * 100) : 0;

  const statTotal = document.getElementById("questoes-evolucao-stat-total");
  const statErros = document.getElementById("questoes-evolucao-stat-erros");
  const statPct = document.getElementById("questoes-evolucao-stat-pct");
  if (statTotal) statTotal.innerText = totalGeral.toLocaleString("pt-BR");
  if (statErros) statErros.innerText = errosGeral.toLocaleString("pt-BR");
  if (statPct) statPct.innerText = `${pctAcertoGeral}%`;

  // --- Gráfico de barras empilhadas do período selecionado ---
  const buckets = gerarBucketsQuestoesEvolucao(questoesEvolucaoPeriodoAtual);

  if (graficoQuestoesEvolucao) {
    graficoQuestoesEvolucao.destroy();
    graficoQuestoesEvolucao = null;
  }

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  graficoQuestoesEvolucao = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: "Acertos",
          data: buckets.map((b) => b.acertos),
          backgroundColor: "#10b981",
          borderRadius: 3,
          stack: "questoes",
        },
        {
          label: "Erros",
          data: buckets.map((b) => b.erros),
          backgroundColor: "#ef4444",
          borderRadius: 3,
          stack: "questoes",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp, size: 11 },
            maxRotation: 0,
            autoSkip: true,
          },
          grid: { display: false },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: corTextoMuted,
            font: { family: fonteApp },
            precision: 0,
          },
          grid: { color: "rgba(148,163,184,0.15)" },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: corTextoMuted,
            font: { family: fonteApp, size: 12 },
            boxWidth: 12,
          },
        },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
        },
      },
    },
  });
}

// --- OUTRAS FONTES DE QUESTÕES (aba Desempenho): registro manual e
// TOTALMENTE separado de registrosQuestoes. Serve só pra o usuário
// unificar, num só lugar, a quantidade de questões que resolveu em outras
// plataformas (QConcursos, TEC Concursos, Gran Cursos etc.) — armazenado
// numa chave própria ("questoesFontesExternas"). Por pedido explícito,
// esses números NUNCA entram em gerarBucketsQuestoesEvolucao,
// renderizarEvolucaoQuestoes ou qualquer outra conta do app (metas,
// streaks, desempenho por matéria/banca, Caderno de Erros etc.) — é só um
// mural informativo à parte.
let registrosQuestoesFontesExternas =
  JSON.parse(localStorage.getItem("questoesFontesExternas")) || [];
// Guarda o id do registro em edição (null = formulário está em modo
// "adicionar novo"). Enquanto não-nulo, salvarQuestaoFonteExterna()
// atualiza esse registro existente em vez de criar um novo.
let fonteExternaIdEmEdicao = null;

function abrirModalQuestoesFontesExternas() {
  renderizarQuestoesFontesExternas();
  const dataInput = document.getElementById("fonte-externa-data");
  if (dataInput && !dataInput.value) {
    dataInput.value = obterDataLocalString(new Date());
  }
  const modal = document.getElementById("modal-questoes-fontes-externas");
  if (modal) modal.style.display = "flex";
}

function fecharModalQuestoesFontesExternas() {
  const modal = document.getElementById("modal-questoes-fontes-externas");
  if (modal) modal.style.display = "none";
  // Fechar o modal com uma edição pendente não deve deixar o formulário
  // "preso" em modo edição da próxima vez que ele for aberto.
  cancelarEdicaoFonteExterna();
}

function fecharModalQuestoesFontesExternasSeClicouFora(event) {
  if (event.target.id === "modal-questoes-fontes-externas") {
    fecharModalQuestoesFontesExternas();
  }
}

// Preenche o formulário com os dados do registro escolhido e liga o modo
// de edição — o mesmo formulário de "adicionar" é reaproveitado, só o
// botão de salvar e o rótulo mudam (ver renderizarQuestoesFontesExternas /
// salvarQuestaoFonteExterna).
function editarQuestaoFonteExterna(id) {
  const registro = registrosQuestoesFontesExternas.find((r) => r.id === id);
  if (!registro) return;

  fonteExternaIdEmEdicao = id;

  document.getElementById("fonte-externa-nome").value = registro.fonte;
  document.getElementById("fonte-externa-total").value = registro.total;
  document.getElementById("fonte-externa-acertos").value =
    registro.acertos === null || registro.acertos === undefined
      ? ""
      : registro.acertos;
  document.getElementById("fonte-externa-data").value = registro.data;

  const btnSalvar = document.getElementById("fonte-externa-btn-salvar");
  const btnCancelar = document.getElementById("fonte-externa-btn-cancelar");
  if (btnSalvar) btnSalvar.innerText = "💾 Salvar Alterações";
  if (btnCancelar) btnCancelar.style.display = "block";

  renderizarQuestoesFontesExternas();

  const form = document.getElementById("form-fonte-externa");
  if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Volta o formulário pro modo "adicionar novo", limpando os campos e
// desfazendo a marcação visual do item em edição na lista.
function cancelarEdicaoFonteExterna() {
  fonteExternaIdEmEdicao = null;

  // Limpa só nome/quantidade/acertos — a data fica como estava, pra
  // continuar rápido de registrar vários lançamentos do mesmo dia em
  // seguida (mesmo comportamento de antes da edição existir).
  const fonteInput = document.getElementById("fonte-externa-nome");
  const totalInput = document.getElementById("fonte-externa-total");
  const acertosInput = document.getElementById("fonte-externa-acertos");
  if (fonteInput) fonteInput.value = "";
  if (totalInput) totalInput.value = "";
  if (acertosInput) acertosInput.value = "";

  const btnSalvar = document.getElementById("fonte-externa-btn-salvar");
  const btnCancelar = document.getElementById("fonte-externa-btn-cancelar");
  if (btnSalvar) btnSalvar.innerText = "➕ Adicionar";
  if (btnCancelar) btnCancelar.style.display = "none";

  renderizarQuestoesFontesExternas();
}

async function salvarQuestaoFonteExterna(event) {
  event.preventDefault();

  const fonteInput = document.getElementById("fonte-externa-nome");
  const fonte = fonteInput.value.trim();
  const total = parseInt(
    document.getElementById("fonte-externa-total").value,
    10,
  );
  const acertosInput = document.getElementById("fonte-externa-acertos");
  const acertosBruto =
    acertosInput.value === "" ? null : parseInt(acertosInput.value, 10);
  const dataInput = document.getElementById("fonte-externa-data");
  const data = dataInput.value || obterDataLocalString(new Date());

  if (!fonte) {
    await mostrarAlerta(
      "Informe o nome da plataforma ou fonte (ex: QConcursos, TEC Concursos).",
    );
    return;
  }
  if (!total || total <= 0) {
    await mostrarAlerta("Informe a quantidade de questões (maior que zero).");
    return;
  }
  if (acertosBruto !== null && (isNaN(acertosBruto) || acertosBruto < 0)) {
    await mostrarAlerta("Os acertos não podem ser negativos.");
    return;
  }
  if (acertosBruto !== null && acertosBruto > total) {
    await mostrarAlerta(
      "Os acertos não podem ser maiores que o total de questões.",
    );
    return;
  }

  if (fonteExternaIdEmEdicao) {
    const registro = registrosQuestoesFontesExternas.find(
      (r) => r.id === fonteExternaIdEmEdicao,
    );
    if (registro) {
      registro.fonte = fonte;
      registro.total = total;
      registro.acertos = acertosBruto;
      registro.data = data;
    }
  } else {
    registrosQuestoesFontesExternas.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fonte,
      total,
      acertos: acertosBruto,
      data,
    });
  }
  localStorage.setItem(
    "questoesFontesExternas",
    JSON.stringify(registrosQuestoesFontesExternas),
  );

  cancelarEdicaoFonteExterna();
}

function excluirQuestaoFonteExterna(id) {
  registrosQuestoesFontesExternas = registrosQuestoesFontesExternas.filter(
    (r) => r.id !== id,
  );
  localStorage.setItem(
    "questoesFontesExternas",
    JSON.stringify(registrosQuestoesFontesExternas),
  );
  // Excluir o registro que estava em edição também sai do modo edição —
  // senão "Salvar Alterações" ficaria apontando pra um id que não existe
  // mais.
  if (fonteExternaIdEmEdicao === id) {
    cancelarEdicaoFonteExterna();
  } else {
    renderizarQuestoesFontesExternas();
  }
}

// Atualiza tanto o modal de gerenciamento (form + lista + total) quanto o
// aviso resumido dentro do modal de "Evolução de Questões" — mas nunca
// toca em registrosQuestoes, buckets, gráfico ou estatísticas existentes.
function renderizarQuestoesFontesExternas() {
  const totalGeral = registrosQuestoesFontesExternas.reduce(
    (s, r) => s + (r.total || 0),
    0,
  );
  const comAcertos = registrosQuestoesFontesExternas.filter(
    (r) => r.acertos !== null && r.acertos !== undefined,
  );
  const totalComAcertos = comAcertos.reduce((s, r) => s + r.total, 0);
  const acertosGeral = comAcertos.reduce((s, r) => s + r.acertos, 0);

  const elTotalModal = document.getElementById("fonte-externa-total-unificado");
  if (elTotalModal) elTotalModal.innerText = totalGeral.toLocaleString("pt-BR");

  const elPctModal = document.getElementById("fonte-externa-pct-unificado");
  if (elPctModal) {
    elPctModal.innerText =
      totalComAcertos > 0
        ? `${Math.round((acertosGeral / totalComAcertos) * 100)}%`
        : "—";
  }

  const breakdownEl = document.getElementById("fonte-externa-breakdown");
  if (breakdownEl) {
    const mapa = {};
    registrosQuestoesFontesExternas.forEach((r) => {
      mapa[r.fonte] = (mapa[r.fonte] || 0) + (r.total || 0);
    });
    breakdownEl.innerHTML = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([fonte, total]) =>
          `<span class="fonte-externa-chip">${escapeHtml(fonte)}: ${total}</span>`,
      )
      .join("");
  }

  const lista = document.getElementById("fonte-externa-lista");
  if (lista) {
    const ordenados = [...registrosQuestoesFontesExternas].reverse();
    if (ordenados.length === 0) {
      lista.innerHTML =
        '<p class="sessoes-hoje-vazio">Nenhuma questão de outras plataformas registrada ainda.</p>';
    } else {
      lista.innerHTML = ordenados
        .map((r) => {
          const dataLabel = r.data.split("-").reverse().join("/");
          const detalhe =
            r.acertos !== null && r.acertos !== undefined
              ? `${r.acertos}/${r.total} acertos · ${dataLabel}`
              : `${r.total} questões · ${dataLabel}`;
          const classeEditando =
            r.id === fonteExternaIdEmEdicao
              ? " fonte-externa-item-editando"
              : "";
          return `
            <div class="questoes-item${classeEditando}">
              <div class="questoes-item-info">
                <span class="questoes-item-materia">${escapeHtml(r.fonte)}</span>
                <span class="questoes-item-detalhe">${detalhe}</span>
              </div>
              <button type="button" onclick="editarQuestaoFonteExterna('${r.id}')" title="Editar registro">✎</button>
              <button type="button" onclick="excluirQuestaoFonteExterna('${r.id}')" title="Remover registro">✕</button>
            </div>
          `;
        })
        .join("");
    }
  }

  // Aviso dentro do modal "Evolução de Questões": fica sempre visível (o
  // texto e o botão mudam conforme já existe ou não algum registro) — é o
  // que garante um jeito de abrir "Outras Fontes" mesmo no modo expandido,
  // onde o card-resumo com o botão homônimo fica escondido. Sempre deixa
  // explícito que esse total não entra nas estatísticas ao lado/abaixo.
  const avisoTexto = document.getElementById(
    "questoes-evolucao-externas-texto",
  );
  const avisoBtn = document.getElementById("questoes-evolucao-externas-btn");
  if (avisoTexto && avisoBtn) {
    if (totalGeral > 0) {
      avisoTexto.innerHTML = `➕ <strong>${totalGeral.toLocaleString("pt-BR")}</strong> questões extras somadas de outras plataformas <em>(não entram nas estatísticas acima)</em>`;
      avisoBtn.innerText = "Gerenciar";
    } else {
      avisoTexto.innerText =
        "Nenhuma questão de outras plataformas registrada ainda.";
      avisoBtn.innerText = "➕ Outras Fontes";
    }
  }

  // Badge no card compacto (resumo), visível antes mesmo de abrir o modal.
  const badge = document.getElementById("questoes-evolucao-badge-externas");
  if (badge) {
    if (totalGeral > 0) {
      badge.innerText = `+${totalGeral.toLocaleString("pt-BR")} outras fontes`;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }
}

// --- ANÁLISE DE SIMULADOS (aba Desempenho): evolução da nota prova a
// prova. Diferente da Evolução de Questões (que soma por período/data),
// aqui cada ponto do gráfico é UM simulado — não faz sentido "bucketizar"
// por dia algo que só acontece de vez em quando. A ordem é cronológica
// pela data de registro (e, empatando na mesma data, pela ordem em que
// foram registrados nesse dia).
let graficoSimuladosEvolucao = null;

function renderizarEvolucaoSimulados() {
  const card = document.getElementById("card-simulados-evolucao");
  const canvas = document.getElementById("chartSimuladosEvolucao");
  if (!card || !canvas) return;

  if (registrosSimulados.length === 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  // Ordem cronológica: por data e, dentro do mesmo dia, pela ordem de
  // registro (o id começa com o timestamp em base36 — Date.now().toString(36)
  // — então também é cronológico como critério de desempate).
  const ordenados = [...registrosSimulados].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  const notas = ordenados.map((r) =>
    r.total > 0 ? Math.round((r.acertos / r.total) * 100) : 0,
  );
  const mediaGeral = Math.round(
    notas.reduce((s, n) => s + n, 0) / notas.length,
  );
  const melhorNota = Math.max(...notas);
  const ultimaNota = notas[notas.length - 1];

  const statTotal = document.getElementById("simulados-evolucao-stat-total");
  const statMedia = document.getElementById("simulados-evolucao-stat-media");
  const statMelhor = document.getElementById("simulados-evolucao-stat-melhor");
  const statUltima = document.getElementById("simulados-evolucao-stat-ultima");
  if (statTotal) statTotal.innerText = ordenados.length.toLocaleString("pt-BR");
  if (statMedia) statMedia.innerText = `${mediaGeral}%`;
  if (statMelhor) statMelhor.innerText = `${melhorNota}%`;
  if (statUltima) statUltima.innerText = `${ultimaNota}%`;

  // --- Gráfico de linha: precisa de pelo menos 2 pontos pra fazer
  // sentido como "evolução" — com 1 só, mostra a lista e esconde o
  // gráfico em vez de exibir uma linha sem nenhuma inclinação.
  const wrapperGrafico = document.getElementById(
    "simulados-evolucao-grafico-wrapper",
  );
  const avisoSemDados = document.getElementById("simulados-evolucao-sem-dados");

  if (graficoSimuladosEvolucao) {
    graficoSimuladosEvolucao.destroy();
    graficoSimuladosEvolucao = null;
  }

  if (ordenados.length < 2) {
    if (wrapperGrafico) wrapperGrafico.style.display = "none";
    if (avisoSemDados) avisoSemDados.style.display = "block";
  } else {
    if (wrapperGrafico) wrapperGrafico.style.display = "block";
    if (avisoSemDados) avisoSemDados.style.display = "none";

    const estiloRaiz = getComputedStyle(document.documentElement);
    const corTextoMuted =
      estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
    const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

    graficoSimuladosEvolucao = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: ordenados.map((r) =>
          r.nome.length > 18 ? `${r.nome.slice(0, 18)}…` : r.nome,
        ),
        datasets: [
          {
            label: "% de acerto",
            data: notas,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.15)",
            pointBackgroundColor: "#3b82f6",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: corTextoMuted,
              font: { family: fonteApp, size: 11 },
              maxRotation: 30,
              minRotation: 0,
              autoSkip: true,
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: corTextoMuted,
              font: { family: fonteApp },
              callback: (valor) => `${valor}%`,
            },
            grid: { color: "rgba(148,163,184,0.15)" },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            bodyFont: { family: fonteApp },
            titleFont: { family: fonteApp },
            callbacks: {
              title: (itens) => ordenados[itens[0].dataIndex].nome,
              label: (item) => {
                const r = ordenados[item.dataIndex];
                return `${r.acertos}/${r.total} acertos (${notas[item.dataIndex]}%)`;
              },
            },
          },
        },
      },
    });
  }

  // --- Lista dos simulados mais recentes, mesmo padrão visual da lista
  // de Questões Resolvidas (mais novo primeiro). Cada item é clicável —
  // abre o detalhe completo do registro (ver abrirModalDetalheSimulado).
  const lista = document.getElementById("simulados-evolucao-lista");
  if (lista) {
    const recentes = [...ordenados].reverse().slice(0, 8);
    lista.innerHTML = recentes
      .map((r) => {
        const pct = r.total > 0 ? Math.round((r.acertos / r.total) * 100) : 0;
        return `
          <div
            class="questoes-item questoes-item-clicavel"
            onclick="abrirModalDetalheSimulado('${r.id}')"
            title="Ver detalhes desse simulado"
          >
            <div class="questoes-item-info">
              <span class="questoes-item-materia">${escapeHtml(r.nome)}</span>
              <span class="questoes-item-detalhe">${r.acertos}/${r.total} acertos (${pct}%) · ${r.data.split("-").reverse().join("/")}</span>
            </div>
            <span class="questoes-item-seta" aria-hidden="true">›</span>
          </div>
        `;
      })
      .join("");
  }
}

// Modal de detalhe de UM registro de simulado (aberto a partir da lista
// em "Análise de Simulados", aba Desempenho). Mostra acertos/total/%,
// prova vinculada e, se o registro veio de uma Prova por Questão, o
// tempo total, a média por questão, a questão mais demorada (com a
// observação, se houver) e o tempo individual de cada questão.
function abrirModalDetalheSimulado(id) {
  const r = registrosSimulados.find((item) => item.id === id);
  if (!r) return;

  const pct = r.total > 0 ? Math.round((r.acertos / r.total) * 100) : 0;
  const vinculo = r.metaVinculada
    ? `🎯 ${escapeHtml(r.metaVinculada)}`
    : "Sem prova vinculada";
  const dataFormatada = r.data.split("-").reverse().join("/");

  let html = `
    <h2 style="margin-top: 0">🎓 ${escapeHtml(r.nome)}</h2>
    <p class="campo-ajuda" style="margin-top: -4px; margin-bottom: 14px">
      ${dataFormatada} · ${vinculo}
    </p>
    <div class="analise-stats-row" style="grid-template-columns: repeat(3, 1fr)">
      <div class="analise-stat-card">
        <span class="analise-stat-label">Acertos</span>
        <span class="analise-stat-valor">${r.acertos}/${r.total}</span>
      </div>
      <div class="analise-stat-card">
        <span class="analise-stat-label">% de Acerto</span>
        <span class="analise-stat-valor questoes-evolucao-stat-acerto">${pct}%</span>
      </div>
      <div class="analise-stat-card">
        <span class="analise-stat-label">Erros</span>
        <span class="analise-stat-valor questoes-evolucao-stat-erro">${r.total - r.acertos}</span>
      </div>
    </div>
  `;

  if (r.provaPorQuestao) {
    const ppq = r.provaPorQuestao;
    const temposIndividuais = Array.isArray(ppq.temposPorQuestaoSegundos)
      ? ppq.temposPorQuestaoSegundos
      : [];
    const maiorValor =
      temposIndividuais.length > 0 ? Math.max(...temposIndividuais) : null;

    html += `
      <h3 style="margin: 18px 0 10px; font-size: 1rem">⏱️ Prova por Questão</h3>
      <div class="analise-stats-row" style="grid-template-columns: repeat(3, 1fr)">
        <div class="analise-stat-card">
          <span class="analise-stat-label">Tempo Total</span>
          <span class="analise-stat-valor">${formatarSegundosParaRelogio(ppq.tempoTotalSegundos)}</span>
        </div>
        <div class="analise-stat-card">
          <span class="analise-stat-label">Média/Questão</span>
          <span class="analise-stat-valor">${formatarSegundosParaRelogio(ppq.duracaoMediaSegundos)}</span>
        </div>
        <div class="analise-stat-card">
          <span class="analise-stat-label">Mais Demorada</span>
          <span class="analise-stat-valor">Q${ppq.questaoMaisDemorada.numero} · ${formatarSegundosParaRelogio(ppq.questaoMaisDemorada.segundos)}</span>
        </div>
      </div>
      ${
        ppq.questaoMaisDemorada.observacao
          ? `<p class="campo-ajuda" style="margin: -4px 0 14px"><strong>📝 Observação (Q${ppq.questaoMaisDemorada.numero}):</strong> ${escapeHtml(ppq.questaoMaisDemorada.observacao)}</p>`
          : ""
      }
      ${
        temposIndividuais.length > 0
          ? `<p class="campo-ajuda" style="margin-bottom: 8px">Tempo de cada questão:</p>
             <div class="ppq-lista-tempos" style="justify-content: flex-start; max-width: none; max-height: 140px; margin-top: 0">
               ${temposIndividuais
                 .map((seg, i) => {
                   const classe =
                     seg === maiorValor
                       ? "ppq-pill ppq-pill-lenta"
                       : "ppq-pill";
                   return `<span class="${classe}">Q${i + 1}: ${formatarSegundosParaRelogio(seg)}</span>`;
                 })
                 .join("")}
             </div>`
          : ""
      }
    `;
  }

  html += `
    <div style="display: flex; gap: 10px; margin-top: 18px">
      <button
        type="button"
        onclick="excluirRegistroSimuladoDoDetalhe('${r.id}')"
        style="
          flex: 1;
          padding: 10px;
          background: transparent;
          color: var(--danger);
          border: 1px solid var(--danger);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        "
      >
        🗑️ Excluir Registro
      </button>
    </div>
  `;

  document.getElementById("detalhe-simulado-conteudo").innerHTML = html;
  document.getElementById("modal-detalhe-simulado").style.display = "flex";
}

function fecharModalDetalheSimulado() {
  document.getElementById("modal-detalhe-simulado").style.display = "none";
}

async function excluirRegistroSimuladoDoDetalhe(id) {
  const confirmado = await mostrarConfirmacao(
    "Excluir esse registro de simulado? Essa ação não pode ser desfeita.",
    { icone: "🗑️", textoConfirmar: "Excluir", perigo: true },
  );
  if (!confirmado) return;

  excluirRegistroSimulado(id);
  fecharModalDetalheSimulado();
}

// --- SESSÕES POR TIPO DE MATERIAL (aba Desempenho) ---
// Distribui o tempo de foco das sessões que tiveram o chip opcional "Tipo
// de Sessão" marcado antes de iniciar o Pomodoro (ver
// #pomo-tipo-sessao-grid / selecionarTipoSessao). Sessões sem esse campo
// marcado (a maioria, pra quem nunca usa) simplesmente não entram na
// conta — não há "Não especificado" forçado no gráfico.
const LABELS_TIPO_SESSAO = {
  leitura: { label: "Leitura (PDF)", cor: "#3b82f6", icone: "📄" },
  videoaula: { label: "Videoaula", cor: "#f97316", icone: "🎥" },
  audioaula: { label: "Audioaula", cor: "#a855f7", icone: "🎧" },
  questoes: { label: "Questões", cor: "#10b981", icone: "📝" },
};

let graficoSessoesPorTipo = null;

function renderizarSessoesPorTipo() {
  const card = document.getElementById("card-sessoes-por-tipo");
  const canvas = document.getElementById("chartSessoesPorTipo");
  const vazio = document.getElementById("sessoes-por-tipo-vazio");
  const corpo = document.getElementById("sessoes-por-tipo-corpo");
  if (!card || !canvas) return;

  const minutosPorTipo = {
    leitura: 0,
    videoaula: 0,
    audioaula: 0,
    questoes: 0,
  };
  const sessoesPorTipo = {
    leitura: 0,
    videoaula: 0,
    audioaula: 0,
    questoes: 0,
  };
  logsSessoes.forEach((log) => {
    if (log.tipoSessao && minutosPorTipo.hasOwnProperty(log.tipoSessao)) {
      minutosPorTipo[log.tipoSessao] += log.duracao || 0;
      sessoesPorTipo[log.tipoSessao] += 1;
    }
  });

  const totalSessoesClassificadas = Object.values(sessoesPorTipo).reduce(
    (s, n) => s + n,
    0,
  );

  card.style.display = "block";

  if (totalSessoesClassificadas === 0) {
    if (vazio) vazio.style.display = "block";
    if (corpo) corpo.style.display = "none";
    if (graficoSessoesPorTipo) {
      graficoSessoesPorTipo.destroy();
      graficoSessoesPorTipo = null;
    }
    return;
  }

  if (vazio) vazio.style.display = "none";
  if (corpo) corpo.style.display = "block";

  let tipoLider = null;
  let maxMinutos = 0;
  Object.keys(minutosPorTipo).forEach((k) => {
    if (minutosPorTipo[k] > maxMinutos) {
      maxMinutos = minutosPorTipo[k];
      tipoLider = k;
    }
  });

  document.getElementById("sessoes-por-tipo-stat-total").innerText =
    totalSessoesClassificadas.toLocaleString("pt-BR");
  document.getElementById("sessoes-por-tipo-stat-lider").innerText = tipoLider
    ? `${LABELS_TIPO_SESSAO[tipoLider].icone} ${LABELS_TIPO_SESSAO[tipoLider].label}`
    : "—";
  document.getElementById("sessoes-por-tipo-stat-lider-tempo").innerText =
    `${maxMinutos}min`;

  const entradas = Object.entries(LABELS_TIPO_SESSAO)
    .map(([chave, meta]) => ({ chave, valor: minutosPorTipo[chave], ...meta }))
    .filter((e) => e.valor > 0);

  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMain =
    estiloRaiz.getPropertyValue("--text-main").trim() || "#f1f5f9";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  if (graficoSessoesPorTipo) {
    graficoSessoesPorTipo.destroy();
  }

  const totalMinutosClassificados = entradas.reduce((s, e) => s + e.valor, 0);

  graficoSessoesPorTipo = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: entradas.map((e) => `${e.icone} ${e.label}`),
      datasets: [
        {
          data: entradas.map((e) => e.valor),
          backgroundColor: entradas.map((e) => e.cor),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: corTextoMain,
            font: { family: fonteApp, size: 11 },
            padding: 10,
          },
        },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) => {
              const pct = Math.round(
                (ctx.parsed / totalMinutosClassificados) * 100,
              );
              return ` ${ctx.parsed} min (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function mudarPeriodoAnalise(periodo) {
  analisePeriodoAtual = periodo;
  analiseOffset = 0;
  document.querySelectorAll("#analise-periodo-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.periodo === periodo);
  });
  renderizarAnaliseEstudos();
}

function navegarAnalise(direcao) {
  // Não deixa navegar para um período futuro
  if (analiseOffset + direcao > 0) return;
  analiseOffset += direcao;
  renderizarAnaliseEstudos();
}

// Gera os "baldes" (buckets) de datas do período selecionado, já
// deslocados pelo offset de navegação (anterior/próximo).
function gerarBucketsAnalise(periodo, offset) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const buckets = [];
  let rangeInicio, rangeFim;

  if (periodo === "7dias") {
    rangeFim = somarDias(hoje, offset * 7);
    rangeInicio = somarDias(rangeFim, -6);
    for (let i = 0; i < 7; i++) {
      const d = somarDias(rangeInicio, i);
      buckets.push({ label: DIAS_SEMANA_ABREV[d.getDay()], inicio: d, fim: d });
    }
  } else if (periodo === "semanal") {
    const diaSemanaHoje = hoje.getDay();
    const deltaSegunda = diaSemanaHoje === 0 ? -6 : 1 - diaSemanaHoje;
    rangeInicio = somarDias(hoje, deltaSegunda + offset * 7);
    rangeFim = somarDias(rangeInicio, 6);
    for (let i = 0; i < 7; i++) {
      const d = somarDias(rangeInicio, i);
      buckets.push({ label: DIAS_SEMANA_ABREV[d.getDay()], inicio: d, fim: d });
    }
  } else if (periodo === "mensal") {
    const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
    rangeInicio = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
    rangeFim = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0);
    let cursor = new Date(rangeInicio);
    while (cursor <= rangeFim) {
      const fimBucket = new Date(
        Math.min(somarDias(cursor, 6).getTime(), rangeFim.getTime()),
      );
      buckets.push({
        label: `${cursor.getDate()}-${fimBucket.getDate()}`,
        inicio: new Date(cursor),
        fim: fimBucket,
      });
      cursor = somarDias(fimBucket, 1);
    }
  } else if (periodo === "anual") {
    const anoRef = hoje.getFullYear() + offset;
    rangeInicio = new Date(anoRef, 0, 1);
    rangeFim = new Date(anoRef, 11, 31);
    for (let m = 0; m < 12; m++) {
      buckets.push({
        label: MESES_ABREV[m],
        inicio: new Date(anoRef, m, 1),
        fim: new Date(anoRef, m + 1, 0),
      });
    }
  }

  return { buckets, rangeInicio, rangeFim };
}

function formatarRotuloIntervalo(periodo, rangeInicio, rangeFim) {
  const opts = { day: "2-digit", month: "short" };
  if (periodo === "7dias" || periodo === "semanal" || periodo === "mensal") {
    if (periodo === "mensal") {
      return rangeInicio.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    }
    return `${rangeInicio.toLocaleDateString("pt-BR", opts)} - ${rangeFim.toLocaleDateString("pt-BR", opts)}`;
  }
  return String(rangeInicio.getFullYear());
}

// --- INSIGHT 1: PREVISÃO DE CONCLUSÃO DO EDITAL ---
// Cruza os tópicos (sub-tópicos cadastrados dentro de cada matéria, na
// edição) das matérias vinculadas a cada meta com o ritmo real de
// conclusão dos últimos 14 dias, pra estimar quando o edital "acaba" no
// ritmo atual — e compara com a data da prova, se houver uma cadastrada.
function calcularPrevisoesConclusao() {
  const JANELA_DIAS = 14;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return metas
    .map((meta) => {
      const materiasDaMeta = materias.filter((m) =>
        materiaVinculadaAMeta(m, meta.objetivoNome),
      );
      const todosTopicos = materiasDaMeta.flatMap((m) => m.topicos || []);

      if (todosTopicos.length === 0) return null; // sem tópicos cadastrados: sem dado pra prever

      const concluidos = todosTopicos.filter((t) => t.concluido);
      const restantes = todosTopicos.length - concluidos.length;

      if (restantes === 0) {
        return {
          meta,
          totalTopicos: todosTopicos.length,
          concluidos: concluidos.length,
          concluido: true,
        };
      }

      const concluidosRecentes = concluidos.filter((t) => {
        if (!t.concluidoEm) return false;
        const dataConclusao = new Date(t.concluidoEm + "T00:00:00");
        const diasDesde = Math.floor((hoje - dataConclusao) / 86400000);
        return diasDesde >= 0 && diasDesde < JANELA_DIAS;
      }).length;

      const ritmoPorDia = concluidosRecentes / JANELA_DIAS;

      if (ritmoPorDia <= 0) {
        return {
          meta,
          totalTopicos: todosTopicos.length,
          concluidos: concluidos.length,
          semRitmo: true,
        };
      }

      const diasEstimados = Math.ceil(restantes / ritmoPorDia);
      const dataPrevista = new Date(hoje);
      dataPrevista.setDate(dataPrevista.getDate() + diasEstimados);

      let diferencaDiasProva = null;
      if (meta.dataLimite) {
        const dataProva = new Date(meta.dataLimite + "T23:59:59");
        diferencaDiasProva = Math.round((dataPrevista - dataProva) / 86400000);
      }

      return {
        meta,
        totalTopicos: todosTopicos.length,
        concluidos: concluidos.length,
        restantes,
        ritmoPorSemana: Math.round(ritmoPorDia * 7 * 10) / 10,
        diasEstimados,
        dataPrevista,
        diferencaDiasProva,
      };
    })
    .filter(Boolean);
}

function renderizarPrevisaoConclusao() {
  const container = document.getElementById("insight-previsao-conclusao");
  if (!container) return;

  const previsoes = calcularPrevisoesConclusao();

  if (previsoes.length === 0) {
    container.innerHTML = `
      <div class="insight-vazio">
        💡 Vincule matérias a uma meta e cadastre os tópicos do edital
        dentro delas (no botão ✏️ editar de cada matéria) pra ver aqui uma
        previsão de quando você termina, no seu ritmo atual.
      </div>
    `;
    return;
  }

  container.innerHTML = previsoes
    .map((p) => {
      if (p.concluido) {
        return `
          <div class="insight-previsao-card insight-previsao-ok">
            <strong>🎉 ${escapeHtml(p.meta.objetivoNome)}</strong>
            <p>Todos os ${p.totalTopicos} tópicos vinculados já foram concluídos!</p>
          </div>
        `;
      }

      if (p.semRitmo) {
        return `
          <div class="insight-previsao-card">
            <strong>🔮 ${escapeHtml(p.meta.objetivoNome)}</strong>
            <p>
              ${p.concluidos}/${p.totalTopicos} tópicos concluídos, mas nenhum
              nos últimos 14 dias — sem dado recente suficiente pra estimar
              um ritmo. Marque os tópicos conforme for estudando.
            </p>
          </div>
        `;
      }

      const dataPrevistaFmt = p.dataPrevista.toLocaleDateString("pt-BR");
      let comparacaoHtml = "";
      if (p.diferencaDiasProva !== null) {
        if (p.diferencaDiasProva <= 0) {
          comparacaoHtml = `<p class="insight-previsao-positivo">✅ ${Math.abs(p.diferencaDiasProva)} dia(s) de folga antes da prova, nesse ritmo.</p>`;
        } else {
          comparacaoHtml = `<p class="insight-previsao-negativo">⚠️ ${p.diferencaDiasProva} dia(s) depois da prova, nesse ritmo — considere acelerar ou ajustar o plano.</p>`;
        }
      }

      return `
        <div class="insight-previsao-card">
          <strong>🔮 ${escapeHtml(p.meta.objetivoNome)}</strong>
          <p>
            No ritmo atual (${p.ritmoPorSemana} tópico(s)/semana), você
            termina os ${p.restantes} tópico(s) restantes em
            <strong>${p.diasEstimados} dia(s)</strong> — por volta de
            ${dataPrevistaFmt}.
          </p>
          ${comparacaoHtml}
        </div>
      `;
    })
    .join("");
}

// --- INSIGHT 2: COMPARAÇÃO SEMANA ATUAL VS. ANTERIOR ---
function calcularComparacaoSemanal() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  function somarMinutosNoIntervalo(diasAtrasInicio, diasAtrasFim) {
    let total = 0;
    logsSessoes.forEach((log) => {
      const dataLog = new Date(log.data + "T00:00:00");
      const diffDias = Math.floor((hoje - dataLog) / 86400000);
      if (diffDias >= diasAtrasFim && diffDias <= diasAtrasInicio) {
        total += log.duracao || 0;
      }
    });
    return total;
  }

  const minutosAtual = somarMinutosNoIntervalo(6, 0);
  const minutosAnterior = somarMinutosNoIntervalo(13, 7);

  let variacaoPct = null;
  if (minutosAnterior > 0) {
    variacaoPct = Math.round(
      ((minutosAtual - minutosAnterior) / minutosAnterior) * 100,
    );
  } else if (minutosAtual > 0) {
    variacaoPct = 100;
  }

  return { minutosAtual, minutosAnterior, variacaoPct };
}

function renderizarComparacaoSemanal() {
  const container = document.getElementById("insight-comparacao-semanal");
  if (!container) return;

  const { minutosAtual, minutosAnterior, variacaoPct } =
    calcularComparacaoSemanal();

  if (minutosAtual === 0 && minutosAnterior === 0) {
    container.innerHTML = `
      <div class="insight-vazio">
        📊 Ainda sem sessões suficientes nas últimas duas semanas pra
        comparar seu ritmo.
      </div>
    `;
    return;
  }

  const horasAtual = formatarHorasMinutos(minutosAtual);
  const horasAnterior = formatarHorasMinutos(minutosAnterior);

  let faixaHtml;
  if (variacaoPct === null) {
    faixaHtml = `<span class="insight-comparacao-neutro">Sem sessões na semana passada pra comparar.</span>`;
  } else if (variacaoPct > 0) {
    faixaHtml = `<span class="insight-comparacao-positivo">↑ ${variacaoPct}% mais foco que a semana passada</span>`;
  } else if (variacaoPct < 0) {
    faixaHtml = `<span class="insight-comparacao-negativo">↓ ${Math.abs(variacaoPct)}% menos foco que a semana passada</span>`;
  } else {
    faixaHtml = `<span class="insight-comparacao-neutro">Mesmo ritmo da semana passada</span>`;
  }

  container.innerHTML = `
    <div class="insight-comparacao-card">
      <div class="insight-comparacao-numeros">
        <span>${horasAtual} essa semana</span>
        <span class="insight-comparacao-vs">vs.</span>
        <span>${horasAnterior} semana passada</span>
      </div>
      ${faixaHtml}
    </div>
  `;
}

// --- INSIGHT 3: EXPORTAR RELATÓRIO EM PDF (via impressão do navegador) ---
// Monta uma versão limpa e "imprimível" do resumo do período selecionado
// em Análise de Estudos e chama a impressão nativa do navegador — de lá,
// a pessoa escolhe "Salvar como PDF" no destino da impressão. Evita
// carregar uma biblioteca de PDF só pra isso, e funciona offline.
function exportarRelatorioPDF() {
  const { buckets, rangeInicio, rangeFim } = gerarBucketsAnalise(
    analisePeriodoAtual,
    analiseOffset,
  );
  const inicioStr = obterDataLocalString(rangeInicio);
  const fimStr = obterDataLocalString(rangeFim);
  const sessoesNoPeriodo = logsSessoes.filter(
    (log) => log.data >= inicioStr && log.data <= fimStr,
  );

  const totalMinutos = sessoesNoPeriodo.reduce((s, log) => s + log.duracao, 0);
  const totalSessoes = sessoesNoPeriodo.length;
  const mediaMinutos = totalSessoes > 0 ? totalMinutos / totalSessoes : 0;

  const mapaMateriaPeriodo = {};
  sessoesNoPeriodo.forEach((log) => {
    mapaMateriaPeriodo[log.materia] =
      (mapaMateriaPeriodo[log.materia] || 0) + log.duracao;
  });
  const entradasMaterias = Object.entries(mapaMateriaPeriodo).sort(
    (a, b) => b[1] - a[1],
  );

  const rotuloPeriodo = formatarRotuloIntervalo(
    analisePeriodoAtual,
    rangeInicio,
    rangeFim,
  );
  const nomeUsuario = dadosPerfil.nome || "Estudante";
  const geradoEm = new Date().toLocaleString("pt-BR");

  const linhasMaterias =
    entradasMaterias.length === 0
      ? '<tr><td colspan="3">Sem sessões registradas neste período.</td></tr>'
      : entradasMaterias
          .map(([nome, min]) => {
            const pct =
              totalMinutos > 0 ? Math.round((min / totalMinutos) * 100) : 0;
            return `<tr><td>${escapeHtml(nome)}</td><td>${formatarHorasMinutos(min)}</td><td>${pct}%</td></tr>`;
          })
          .join("");

  const previsoesHtml = calcularPrevisoesConclusao()
    .map((p) => {
      if (p.concluido) {
        return `<li>🎉 ${escapeHtml(p.meta.objetivoNome)}: todos os ${p.totalTopicos} tópicos concluídos.</li>`;
      }
      if (p.semRitmo) {
        return `<li>🔮 ${escapeHtml(p.meta.objetivoNome)}: ${p.concluidos}/${p.totalTopicos} tópicos concluídos (sem ritmo recente pra estimar).</li>`;
      }
      return `<li>🔮 ${escapeHtml(p.meta.objetivoNome)}: previsão de término em ${p.diasEstimados} dia(s) (${p.dataPrevista.toLocaleDateString("pt-BR")}), ritmo de ${p.ritmoPorSemana} tópico(s)/semana.</li>`;
    })
    .join("");

  const container = document.getElementById("relatorio-impressao");
  if (!container) return;

  container.innerHTML = `
    <h1>⚡ Estude+ — Relatório de Estudos</h1>
    <p class="relatorio-meta-info">
      <strong>${escapeHtml(nomeUsuario)}</strong> · Período: ${rotuloPeriodo} ·
      Gerado em ${geradoEm}
    </p>

    <h2>Resumo do período</h2>
    <table class="relatorio-tabela">
      <tr><td>Horas estudadas</td><td>${(totalMinutos / 60).toFixed(1)}h</td></tr>
      <tr><td>Sessões registradas</td><td>${totalSessoes}</td></tr>
      <tr><td>Tempo médio por sessão</td><td>${formatarHorasMinutos(mediaMinutos)}</td></tr>
    </table>

    <h2>Distribuição por matéria</h2>
    <table class="relatorio-tabela">
      <tr><th>Matéria</th><th>Tempo</th><th>% do período</th></tr>
      ${linhasMaterias}
    </table>

    ${
      previsoesHtml
        ? `<h2>Previsão de conclusão</h2><ul class="relatorio-lista">${previsoesHtml}</ul>`
        : ""
    }
  `;

  window.print();
}

function renderizarAnaliseEstudos() {
  const canvasDonut = document.getElementById("chartAnaliseDonut");
  const canvasBarras = document.getElementById("chartAnaliseBarras");
  if (!canvasDonut || !canvasBarras) return;

  const { buckets, rangeInicio, rangeFim } = gerarBucketsAnalise(
    analisePeriodoAtual,
    analiseOffset,
  );

  document.getElementById("analise-intervalo-label").innerText =
    formatarRotuloIntervalo(analisePeriodoAtual, rangeInicio, rangeFim);

  const inicioStr = obterDataLocalString(rangeInicio);
  const fimStr = obterDataLocalString(rangeFim);
  const sessoesNoPeriodo = logsSessoes.filter(
    (log) => log.data >= inicioStr && log.data <= fimStr,
  );

  // --- Estatísticas ---
  const totalMinutos = sessoesNoPeriodo.reduce((s, log) => s + log.duracao, 0);
  const totalSessoes = sessoesNoPeriodo.length;
  const mediaMinutos = totalSessoes > 0 ? totalMinutos / totalSessoes : 0;

  document.getElementById("analise-stat-horas").innerText = (
    totalMinutos / 60
  ).toFixed(1);
  document.getElementById("analise-stat-sessoes").innerText = totalSessoes;
  document.getElementById("analise-stat-media").innerText =
    formatarHorasMinutos(mediaMinutos);

  // Tema visual, lido das variáveis CSS para casar com o resto do app
  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const corCardBg =
    estiloRaiz.getPropertyValue("--card-bg").trim() || "#1e293b";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  // --- Donut: total por matéria no período ---
  const mapaMateriaPeriodo = {};
  sessoesNoPeriodo.forEach((log) => {
    mapaMateriaPeriodo[log.materia] =
      (mapaMateriaPeriodo[log.materia] || 0) + log.duracao;
  });
  const entradasMaterias = Object.entries(mapaMateriaPeriodo).sort(
    (a, b) => b[1] - a[1],
  );
  const nomesDonut = entradasMaterias.map(([nome]) => nome);
  const valoresDonut = entradasMaterias.map(([, min]) => min);
  const coresDonut = nomesDonut.map((nome, i) => corMateria(nome, i));

  if (graficoAnaliseDonut) {
    graficoAnaliseDonut.destroy();
    graficoAnaliseDonut = null;
  }

  const legendaMateriasEl = document.getElementById("analise-legenda-materias");

  if (nomesDonut.length === 0) {
    legendaMateriasEl.innerHTML =
      '<p class="tarefas-vazio">Sem sessões registradas neste período.</p>';
  } else {
    graficoAnaliseDonut = new Chart(canvasDonut.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: nomesDonut,
        datasets: [
          {
            data: valoresDonut,
            backgroundColor: coresDonut,
            borderWidth: 2,
            borderColor: corCardBg,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            bodyFont: { family: fonteApp },
            titleFont: { family: fonteApp },
            callbacks: {
              label: (ctx) =>
                ` ${ctx.label}: ${formatarHorasMinutos(ctx.parsed)}`,
            },
          },
        },
      },
    });

    legendaMateriasEl.innerHTML = nomesDonut
      .map((nome, i) => {
        const pct =
          totalMinutos > 0
            ? Math.round((valoresDonut[i] / totalMinutos) * 100)
            : 0;
        return `
          <div class="analise-legenda-item">
            <span class="analise-legenda-dot" style="background:${coresDonut[i]}"></span>
            <span class="analise-legenda-nome">${escapeHtml(nome)}</span>
            <span class="analise-legenda-horas">${formatarHorasMinutos(valoresDonut[i])}</span>
            <span class="analise-legenda-pct">${pct}%</span>
          </div>
        `;
      })
      .join("");
  }

  // --- Barras: total por período (dia/semana/mês), colorido pela matéria
  // dominante daquele intervalo ---
  const labelsBarras = [];
  const valoresBarrasHoras = [];
  const coresBarras = [];
  const materiasNasBarras = new Set();

  buckets.forEach((bucket) => {
    const inicioB = obterDataLocalString(bucket.inicio);
    const fimB = obterDataLocalString(bucket.fim);
    const sessoesBucket = sessoesNoPeriodo.filter(
      (log) => log.data >= inicioB && log.data <= fimB,
    );
    const totalBucket = sessoesBucket.reduce((s, log) => s + log.duracao, 0);

    const mapaBucket = {};
    sessoesBucket.forEach((log) => {
      mapaBucket[log.materia] = (mapaBucket[log.materia] || 0) + log.duracao;
    });

    let materiaDominante = null;
    let maiorTempo = 0;
    Object.entries(mapaBucket).forEach(([nome, min]) => {
      if (min > maiorTempo) {
        maiorTempo = min;
        materiaDominante = nome;
      }
    });

    labelsBarras.push(bucket.label);
    valoresBarrasHoras.push(Number((totalBucket / 60).toFixed(2)));

    const idxCor = nomesDonut.indexOf(materiaDominante);
    coresBarras.push(
      materiaDominante
        ? corMateria(materiaDominante, idxCor >= 0 ? idxCor : 0)
        : "#334155",
    );
    if (materiaDominante) materiasNasBarras.add(materiaDominante);
  });

  if (graficoAnaliseBarras) {
    graficoAnaliseBarras.destroy();
    graficoAnaliseBarras = null;
  }

  // Plugin leve pra desenhar o "Xh Ymin" em cima de cada barra, sem
  // precisar carregar uma lib extra de datalabels.
  const pluginRotulosBarras = {
    id: "rotulosBarras",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = `bold 11px ${fonteApp}`;
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      meta.data.forEach((bar, i) => {
        const horas = valoresBarrasHoras[i];
        if (!horas) return;
        ctx.fillText(formatarHorasMinutos(horas * 60), bar.x, bar.y - 8);
      });
      ctx.restore();
    },
  };

  graficoAnaliseBarras = new Chart(canvasBarras.getContext("2d"), {
    type: "bar",
    data: {
      labels: labelsBarras,
      datasets: [
        {
          data: valoresBarrasHoras,
          backgroundColor: coresBarras,
          borderRadius: 6,
          maxBarThickness: 46,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (ctx) => ` ${formatarHorasMinutos(ctx.parsed.y * 60)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: corTextoMuted, font: { family: fonteApp } },
        },
        y: { display: false, beginAtZero: true },
      },
    },
    plugins: [pluginRotulosBarras],
  });

  document.getElementById("analise-legenda-barras").innerHTML = Array.from(
    materiasNasBarras,
  )
    .map((nome) => {
      const cor = corMateria(nome, nomesDonut.indexOf(nome));
      return `<span style="--cor:${cor}">${escapeHtml(nome)}</span>`;
    })
    .join("");

  // Os dois insights abaixo não dependem do período selecionado no toggle
  // (previsão usa progresso geral dos tópicos; comparação é sempre "esta
  // semana vs. a passada"), mas é conveniente recalcular junto pra ficarem
  // sempre atualizados quando a pessoa entra na aba de Análise.
  renderizarComparacaoSemanal();
  renderizarPrevisaoConclusao();
}

// --- GAMIFICAÇÃO: XP, NÍVEIS, TÍTULOS E CONQUISTAS ---

// Curva de XP: quanto XP acumulado é necessário para estar EXATAMENTE no
// nível informado. Cresce de forma suave (raiz~1.5), então os primeiros
// níveis vêm rápido e os avançados exigem mais dedicação.
function xpParaNivel(nivel) {
  if (nivel <= 1) return 0;
  return Math.round(100 * Math.pow(nivel - 1, 1.5));
}

function calcularNivelPorXp(xpTotal) {
  let nivel = 1;
  while (xpParaNivel(nivel + 1) <= xpTotal) {
    nivel++;
  }
  return nivel;
}

function obterTituloPorNivel(nivel) {
  if (nivel >= 75) return "Lenda do Conhecimento";
  if (nivel >= 50) return "Sábio Erudito";
  if (nivel >= 35) return "Mestre Acadêmico";
  if (nivel >= 20) return "Estudioso Veterano";
  if (nivel >= 10) return "Adepto do Conhecimento";
  if (nivel >= 5) return "Iniciado do Saber";
  return "Aprendiz";
}

// Medalha visual da faixa de nível — mesmos degraus de obterTituloPorNivel,
// só que devolvendo o ícone e a classe de cor (CSS) usados no emblema do
// Perfil, pra dar mais peso visual ao título por trás do "Nível N".
function obterMedalhaPorNivel(nivel) {
  if (nivel >= 75) return { icone: "👑", classe: "medalha-lendaria" };
  if (nivel >= 50) return { icone: "💎", classe: "medalha-diamante" };
  if (nivel >= 35) return { icone: "🥇", classe: "medalha-ouro" };
  if (nivel >= 20) return { icone: "🥈", classe: "medalha-prata" };
  if (nivel >= 10) return { icone: "🥉", classe: "medalha-bronze" };
  if (nivel >= 5) return { icone: "🔰", classe: "medalha-iniciado" };
  return { icone: "🌱", classe: "medalha-aprendiz" };
}

// Reúne as métricas cruas usadas tanto para calcular XP quanto para
// verificar as condições das conquistas.
// Marca (permanentemente) os easter eggs que dependem da data real do
// calendário — chamado sempre que as estatísticas de gamificação são
// recalculadas. Só liga a flag no dia certo; ela nunca é desligada depois.
function verificarEasterEggsPorData() {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1; // getMonth() é 0-indexado

  if (mes === 10 && dia === 31) marcarEasterEgg("halloween");
  if (mes === 1 && dia === 1) marcarEasterEgg("anoNovo");
}

function obterStatsGamificacao() {
  const minutosTotais = Object.values(historicoEstudos).reduce(
    (s, m) => s + m,
    0,
  );

  const pomosPorDiaObj = JSON.parse(localStorage.getItem("pomosPorDia")) || {};
  const pomodorosTotais = Object.values(pomosPorDiaObj).reduce(
    (s, p) => s + p,
    0,
  );

  const streakAtual = atualizarCalculoStreak();

  const materiasEstudadas = Object.values(tempoPorMateria).filter(
    (m) => m > 0,
  ).length;

  const metaDiaria = obterMetaPomodorosDiaria();
  const diasComMetaBatida =
    metaDiaria > 0
      ? Object.values(pomosPorDiaObj).filter((p) => p >= metaDiaria).length
      : 0;

  let diasComMetaBatidaSeguidos = 0;
  if (metaDiaria > 0) {
    let cursor = new Date();
    while (true) {
      const dStr = obterDataLocalString(cursor);
      if ((pomosPorDiaObj[dStr] || 0) >= metaDiaria) {
        diasComMetaBatidaSeguidos++;
        cursor = somarDias(cursor, -1);
      } else {
        break;
      }
    }
  }

  const temSessaoMadrugada = logsSessoes.some((log) => {
    if (!log.hora) return false;
    return parseInt(log.hora.split(":")[0], 10) < 7;
  });
  const temSessaoNoturna = logsSessoes.some((log) => {
    if (!log.hora) return false;
    return parseInt(log.hora.split(":")[0], 10) >= 23;
  });

  const aprovacoesTotais = metas.filter((m) => m.aprovado).length;

  // Total de questões registradas (Hoje & Registros + Modo Prova), somando
  // o campo "total" de cada registro — usado nas conquistas da página 2.
  const questoesRegistradasTotais = registrosQuestoes.reduce(
    (s, r) => s + (r.total || 0),
    0,
  );

  // Quantidade de simulados/provas completas registradas (feature
  // "Simulados") — cada item é uma prova inteira resolvida, não uma questão
  // avulsa.
  const provasResolvidasTotais = registrosSimulados.length;

  const statsBase = {
    minutosTotais,
    pomodorosTotais,
    streakAtual,
    materiasEstudadas,
    diasComMetaBatida,
    diasComMetaBatidaSeguidos,
    temSessaoMadrugada,
    temSessaoNoturna,
    flashcardsRevisados: totalRevisoesFlashcards,
    aprovacoesTotais,
    questoesRegistradasTotais,
    provasResolvidasTotais,
  };

  // --- Campos extras só usados pelas conquistas fantasma (página 3) ---
  // O nível depende do XP, que por sua vez depende dos campos acima —
  // calcula em cima do statsBase, sem entrar em loop.
  const nivelAtual = calcularNivelPorXp(calcularXPTotal(statsBase));

  // Horários "de cinema" batidos em algum registro de sessão de estudo já
  // salvo (permanente: uma vez no histórico, o log não some sozinho).
  const estudouMeiaNoiteEmPonto = logsSessoes.some(
    (log) => log.hora === "00:00",
  );
  const estudouTresEMeia = logsSessoes.some((log) => log.hora === "03:33");

  // Quantas sessões de madrugada (antes das 7h) já foram registradas no
  // total — diferente de temSessaoMadrugada (que só checa "teve alguma"),
  // esse aqui conta quantas vezes, pra secreto que pede volume.
  const sessoesDeMadrugadaContagem = logsSessoes.filter((log) => {
    if (!log.hora) return false;
    return parseInt(log.hora.split(":")[0], 10) < 7;
  }).length;

  // Dias de fim de semana (sábado ou domingo) com algum minuto estudado —
  // usa as chaves de historicoEstudos ("AAAA-MM-DD") direto.
  const diasDeFimDeSemanaComEstudo = Object.keys(historicoEstudos).filter(
    (dataStr) => {
      if (!(historicoEstudos[dataStr] > 0)) return false;
      const diaDaSemana = new Date(`${dataStr}T00:00:00`).getDay();
      return diaDaSemana === 0 || diaDaSemana === 6;
    },
  ).length;

  // Tópicos marcados como concluídos, somando todas as matérias.
  const topicosConcluidosTotais = materias.reduce(
    (s, m) => s + (m.topicos || []).filter((t) => t.concluido).length,
    0,
  );

  // Bancas examinadoras distintas já usadas em registros de questões
  // (ignora "Não especificar", que fica com banca null/vazia).
  const bancasDistintas = new Set(
    registrosQuestoes.filter((r) => r.banca).map((r) => r.banca),
  ).size;

  // Pelo menos um simulado com 100% de acerto e volume mínimo (pra não
  // valer um "1 de 1" que seria trivial demais).
  const simuladoPerfeito = registrosSimulados.some(
    (r) => r.total >= 10 && r.acertos === r.total,
  );

  // Os 4 motivos do Diagnóstico de Erros já usados pelo menos uma vez cada
  // (em qualquer registro de questões, não precisa ser na mesma sessão).
  const chavesCausaErro = [
    "naoSabia",
    "confundiuConceito",
    "erroLeitura",
    "faltaAtencao",
  ];
  const causasJaUsadas = {};
  registrosQuestoes.forEach((r) => {
    if (!r.causasErro) return;
    chavesCausaErro.forEach((chave) => {
      if ((r.causasErro[chave] || 0) > 0) causasJaUsadas[chave] = true;
    });
  });
  const usouTodosOsMotivosDeErro = chavesCausaErro.every(
    (chave) => causasJaUsadas[chave],
  );

  verificarEasterEggsPorData();

  // "Colecionador de Emblemas": todas as conquistas normais (páginas 1 e
  // 2) já desbloqueadas. Testa o check() de cada uma contra o statsBase —
  // seguro porque nenhuma delas depende dos campos extras calculados aqui.
  const colecionadorCompleto = CONQUISTAS.concat(CONQUISTAS_PAGINA2).every(
    (c) => c.check(statsBase),
  );

  return {
    ...statsBase,
    nivelAtual,
    estudouMeiaNoiteEmPonto,
    estudouTresEMeia,
    doisExtremos: temSessaoMadrugada && temSessaoNoturna,
    sessoesDeMadrugadaContagem,
    diasDeFimDeSemanaComEstudo,
    topicosConcluidosTotais,
    bancasDistintas,
    simuladoPerfeito,
    usouTodosOsMotivosDeErro,
    materiasCadastradasTotais: materias.length,
    congelamentosUsados: diasCongeladosStreak.length,
    temaClaroAtivado: !!easterEggFlags.temaClaro,
    tarefasZeradasAlgumaVez: !!easterEggFlags.caixaZerada,
    registrouCemRedondo: !!easterEggFlags.cemRedondo,
    logoClicadaRapido: !!easterEggFlags.sobrecarga,
    halloweenVisitado: !!easterEggFlags.halloween,
    anoNovoVisitado: !!easterEggFlags.anoNovo,
    colecionadorCompleto,
  };
}

function calcularXPTotal(stats) {
  // 1 XP por minuto estudado + 15 XP por pomodoro completo + 10 XP por dia
  // de streak atual + 2 XP por flashcard revisado (independente da nota —
  // é o esforço de revisar que conta, não só acertar).
  return (
    stats.minutosTotais * 1 +
    stats.pomodorosTotais * 15 +
    stats.streakAtual * 10 +
    stats.flashcardsRevisados * 2
  );
}

// Cada conquista numérica agora expõe `metrica` (função que lê o valor
// atual a partir das stats) e `alvo` (o número necessário) além do
// `check` de sempre — os dois novos campos alimentam a barra de progresso
// do widget "Próxima Conquista" no Perfil, sem duplicar a lógica de
// desbloqueio. Conquistas binárias (madrugador/coruja) usam metrica 0/1.
const CONQUISTAS = [
  {
    id: "streak3",
    nome: "3 Dias Seguidos",
    desc: "Estudou 3 dias seguidos",
    icone: "🔥",
    metrica: (s) => s.streakAtual,
    alvo: 3,
    check: (s) => s.streakAtual >= 3,
  },
  {
    id: "streak7",
    nome: "7 Dias Seguidos",
    desc: "Estudou 7 dias seguidos",
    icone: "🔥",
    metrica: (s) => s.streakAtual,
    alvo: 7,
    check: (s) => s.streakAtual >= 7,
  },
  {
    id: "streak30",
    nome: "30 Dias Seguidos",
    desc: "Estudou 30 dias seguidos",
    icone: "🔥",
    metrica: (s) => s.streakAtual,
    alvo: 30,
    check: (s) => s.streakAtual >= 30,
  },
  {
    id: "flashcards20",
    nome: "Repetidor",
    desc: "Revisou 20 flashcards",
    icone: "🗂️",
    metrica: (s) => s.flashcardsRevisados,
    alvo: 20,
    check: (s) => s.flashcardsRevisados >= 20,
  },
  {
    id: "flashcards100",
    nome: "Mestre dos Flashcards",
    desc: "Revisou 100 flashcards",
    icone: "🗂️",
    metrica: (s) => s.flashcardsRevisados,
    alvo: 100,
    check: (s) => s.flashcardsRevisados >= 100,
  },
  {
    id: "horas10",
    nome: "10 Horas Totais",
    desc: "Acumulou 10h de estudo",
    icone: "⏱️",
    metrica: (s) => s.minutosTotais,
    alvo: 600,
    check: (s) => s.minutosTotais >= 600,
  },
  {
    id: "horas50",
    nome: "50 Horas Totais",
    desc: "Acumulou 50h de estudo",
    icone: "⏱️",
    metrica: (s) => s.minutosTotais,
    alvo: 3000,
    check: (s) => s.minutosTotais >= 3000,
  },
  {
    id: "horas100",
    nome: "100 Horas Totais",
    desc: "Acumulou 100h de estudo",
    icone: "⏱️",
    metrica: (s) => s.minutosTotais,
    alvo: 6000,
    check: (s) => s.minutosTotais >= 6000,
  },
  {
    id: "pomo10",
    nome: "10 Pomodoros",
    desc: "Completou 10 pomodoros",
    icone: "🍅",
    metrica: (s) => s.pomodorosTotais,
    alvo: 10,
    check: (s) => s.pomodorosTotais >= 10,
  },
  {
    id: "pomo50",
    nome: "50 Pomodoros",
    desc: "Completou 50 pomodoros",
    icone: "🍅",
    metrica: (s) => s.pomodorosTotais,
    alvo: 50,
    check: (s) => s.pomodorosTotais >= 50,
  },
  {
    id: "pomo100",
    nome: "100 Pomodoros",
    desc: "Completou 100 pomodoros",
    icone: "🍅",
    metrica: (s) => s.pomodorosTotais,
    alvo: 100,
    check: (s) => s.pomodorosTotais >= 100,
  },
  {
    id: "meta5x",
    nome: "Disciplinado",
    desc: "Bateu a meta do dia 5 vezes",
    icone: "🎯",
    metrica: (s) => s.diasComMetaBatida,
    alvo: 5,
    check: (s) => s.diasComMetaBatida >= 5,
  },
  {
    id: "meta7seguidos",
    nome: "Semana Perfeita",
    desc: "Bateu a meta 7 dias seguidos",
    icone: "🏆",
    metrica: (s) => s.diasComMetaBatidaSeguidos,
    alvo: 7,
    check: (s) => s.diasComMetaBatidaSeguidos >= 7,
  },
  {
    id: "materias3",
    nome: "Multidisciplinar",
    desc: "Estudou 3 matérias diferentes",
    icone: "📚",
    metrica: (s) => s.materiasEstudadas,
    alvo: 3,
    check: (s) => s.materiasEstudadas >= 3,
  },
  {
    id: "materias5",
    nome: "Renascentista",
    desc: "Estudou 5 matérias diferentes",
    icone: "📚",
    metrica: (s) => s.materiasEstudadas,
    alvo: 5,
    check: (s) => s.materiasEstudadas >= 5,
  },
  {
    id: "madrugador",
    nome: "Madrugador",
    desc: "Estudou antes das 7h",
    icone: "🌅",
    metrica: (s) => (s.temSessaoMadrugada ? 1 : 0),
    alvo: 1,
    check: (s) => s.temSessaoMadrugada,
  },
  {
    id: "coruja",
    nome: "Coruja",
    desc: "Estudou depois das 23h",
    icone: "🦉",
    metrica: (s) => (s.temSessaoNoturna ? 1 : 0),
    alvo: 1,
    check: (s) => s.temSessaoNoturna,
  },
  {
    id: "aprovacao1",
    nome: "Aprovado!",
    desc: "Conquistou 1 aprovação",
    icone: "🎓",
    metrica: (s) => s.aprovacoesTotais,
    alvo: 1,
    check: (s) => s.aprovacoesTotais >= 1,
  },
  {
    id: "aprovacao2",
    nome: "Bicampeão",
    desc: "Conquistou 2 ou mais aprovações",
    icone: "🏅",
    metrica: (s) => s.aprovacoesTotais,
    alvo: 2,
    check: (s) => s.aprovacoesTotais >= 2,
  },
  {
    id: "aprovacao3",
    nome: "Tríplice Coroa",
    desc: "Conquistou 3 ou mais aprovações",
    icone: "👑",
    metrica: (s) => s.aprovacoesTotais,
    alvo: 3,
    check: (s) => s.aprovacoesTotais >= 3,
  },
];

// Página 2 de conquistas: focada em volume de questões resolvidas (teto de
// 60 mil, o "chefão final" dessa trilha) e em quantidade de provas/
// simulados completos registrados.
const CONQUISTAS_PAGINA2 = [
  // --- Questões resolvidas (registrosQuestoes) ---
  {
    id: "questoes50",
    nome: "Primeiros Passos",
    desc: "Resolveu 50 questões",
    icone: "📝",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 50,
    check: (s) => s.questoesRegistradasTotais >= 50,
  },
  {
    id: "questoes100",
    nome: "Resolvedor",
    desc: "Resolveu 100 questões",
    icone: "📝",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 100,
    check: (s) => s.questoesRegistradasTotais >= 100,
  },
  {
    id: "questoes500",
    nome: "Caçador de Questões",
    desc: "Resolveu 500 questões",
    icone: "🎯",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 500,
    check: (s) => s.questoesRegistradasTotais >= 500,
  },
  {
    id: "questoes1000",
    nome: "Clube das Mil",
    desc: "Resolveu 1.000 questões",
    icone: "💯",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 1000,
    check: (s) => s.questoesRegistradasTotais >= 1000,
  },
  {
    id: "questoes2500",
    nome: "Questionador",
    desc: "Resolveu 2.500 questões",
    icone: "🧠",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 2500,
    check: (s) => s.questoesRegistradasTotais >= 2500,
  },
  {
    id: "questoes5000",
    nome: "Veterano das Questões",
    desc: "Resolveu 5.000 questões",
    icone: "⚔️",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 5000,
    check: (s) => s.questoesRegistradasTotais >= 5000,
  },
  {
    id: "questoes10000",
    nome: "Décimo Milhar",
    desc: "Resolveu 10.000 questões",
    icone: "🔟",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 10000,
    check: (s) => s.questoesRegistradasTotais >= 10000,
  },
  {
    id: "questoes20000",
    nome: "Máquina de Questões",
    desc: "Resolveu 20.000 questões",
    icone: "⚙️",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 20000,
    check: (s) => s.questoesRegistradasTotais >= 20000,
  },
  {
    id: "questoes35000",
    nome: "Implacável",
    desc: "Resolveu 35.000 questões",
    icone: "🛡️",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 35000,
    check: (s) => s.questoesRegistradasTotais >= 35000,
  },
  {
    id: "questoes60000",
    nome: "Lenda das Questões",
    desc: "Resolveu 60.000 questões",
    icone: "👑",
    metrica: (s) => s.questoesRegistradasTotais,
    alvo: 60000,
    check: (s) => s.questoesRegistradasTotais >= 60000,
  },
  // --- Provas/simulados completos resolvidos (registrosSimulados) ---
  {
    id: "provas1",
    nome: "Primeira Prova",
    desc: "Completou 1 simulado",
    icone: "📄",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 1,
    check: (s) => s.provasResolvidasTotais >= 1,
  },
  {
    id: "provas5",
    nome: "Simulador",
    desc: "Completou 5 simulados",
    icone: "🧪",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 5,
    check: (s) => s.provasResolvidasTotais >= 5,
  },
  {
    id: "provas10",
    nome: "Bateria de Provas",
    desc: "Completou 10 simulados",
    icone: "🔋",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 10,
    check: (s) => s.provasResolvidasTotais >= 10,
  },
  {
    id: "provas20",
    nome: "Maratonista de Provas",
    desc: "Completou 20 simulados",
    icone: "🏃",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 20,
    check: (s) => s.provasResolvidasTotais >= 20,
  },
  {
    id: "provas30",
    nome: "Veterano de Simulados",
    desc: "Completou 30 simulados",
    icone: "🛡️",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 30,
    check: (s) => s.provasResolvidasTotais >= 30,
  },
  {
    id: "provas50",
    nome: "Mestre dos Simulados",
    desc: "Completou 50 simulados",
    icone: "🎓",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 50,
    check: (s) => s.provasResolvidasTotais >= 50,
  },
  {
    id: "provas75",
    nome: "Implacável nas Provas",
    desc: "Completou 75 simulados",
    icone: "⚡",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 75,
    check: (s) => s.provasResolvidasTotais >= 75,
  },
  {
    id: "provas100",
    nome: "Centurião",
    desc: "Completou 100 simulados",
    icone: "🏛️",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 100,
    check: (s) => s.provasResolvidasTotais >= 100,
  },
  {
    id: "provas150",
    nome: "Elite das Provas",
    desc: "Completou 150 simulados",
    icone: "💎",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 150,
    check: (s) => s.provasResolvidasTotais >= 150,
  },
  {
    id: "provas200",
    nome: "Lenda dos Simulados",
    desc: "Completou 200 simulados",
    icone: "👑",
    metrica: (s) => s.provasResolvidasTotais,
    alvo: 200,
    check: (s) => s.provasResolvidasTotais >= 200,
  },
];

// Página 3 de conquistas: EASTER EGGS 👻 — não têm metrica/alvo de
// propósito, porque não devem aparecer no widget "Próxima Conquista" nem
// mostrar barra de progresso (ela entregaria a condição secreta). O
// nome/ícone/descrição de verdade só é exibido depois de desbloqueada;
// enquanto bloqueada, o grid mostra "???" (ver renderizarGridConquistas).
const CONQUISTAS_PAGINA3 = [
  {
    id: "sobrecarga",
    nome: "Sobrecarga de Energia",
    desc: "Clicou 10 vezes seguidas e rápido no logo ⚡ ESTUDE+ lá no topo",
    icone: "⚡",
    check: (s) => s.logoClicadaRapido,
  },
  {
    id: "meiaNoite",
    nome: "Meia-Noite em Ponto",
    desc: "Registrou uma sessão de estudo às 00:00 em ponto",
    icone: "🕛",
    check: (s) => s.estudouMeiaNoiteEmPonto,
  },
  {
    id: "horaDoPesadelo",
    nome: "Hora do Pesadelo",
    desc: "Registrou uma sessão de estudo às 03:33",
    icone: "👻",
    check: (s) => s.estudouTresEMeia,
  },
  {
    id: "resposta42",
    nome: "A Resposta",
    desc: "Chegou ao nível 42 — a resposta pra vida, o universo e tudo mais",
    icone: "🌌",
    check: (s) => s.nivelAtual >= 42,
  },
  {
    id: "doisExtremos",
    nome: "Nos Dois Extremos",
    desc: "Já estudou de madrugada (antes das 7h) e também depois das 23h",
    icone: "🌗",
    check: (s) => s.doisExtremos,
  },
  {
    id: "halloween",
    nome: "Visita de Halloween",
    desc: "Abriu o app em 31 de outubro",
    icone: "🎃",
    check: (s) => s.halloweenVisitado,
  },
  {
    id: "anoNovo",
    nome: "Réveillon Dedicado",
    desc: "Abriu o app em 1º de janeiro",
    icone: "🎆",
    check: (s) => s.anoNovoVisitado,
  },
  {
    id: "colecionador",
    nome: "Colecionador de Emblemas",
    desc: "Desbloqueou todas as conquistas das páginas 1 e 2",
    icone: "🏅",
    check: (s) => s.colecionadorCompleto,
  },
  {
    id: "temaClaro",
    nome: "Descobriu a Luz",
    desc: "Trocou pro tema claro pelo menos uma vez",
    icone: "☀️",
    check: (s) => s.temaClaroAtivado,
  },
  {
    id: "caixaZerada",
    nome: "Caixa Zerada",
    desc: "Concluiu todas as tarefas da lista de uma vez só",
    icone: "📭",
    check: (s) => s.tarefasZeradasAlgumaVez,
  },
  {
    id: "simuladoPerfeito",
    nome: "Cravou na Mosca",
    desc: "Fez 100% de acerto num simulado com pelo menos 10 questões",
    icone: "🎯",
    check: (s) => s.simuladoPerfeito,
  },
  {
    id: "turistaDeBancas",
    nome: "Turista de Bancas",
    desc: "Resolveu questões de 5 bancas examinadoras diferentes",
    icone: "🌍",
    check: (s) => s.bancasDistintas >= 5,
  },
  {
    id: "autoconhecimento",
    nome: "Autoconhecimento",
    desc: "Já usou os 4 motivos do Diagnóstico de Erros pelo menos uma vez cada",
    icone: "🧩",
    check: (s) => s.usouTodosOsMotivosDeErro,
  },
  {
    id: "segundaChance",
    nome: "Segunda Chance",
    desc: "Usou o Congelamento de Sequência pelo menos uma vez",
    icone: "❄️",
    check: (s) => s.congelamentosUsados >= 1,
  },
  {
    id: "dezenaPerfeita",
    nome: "Dezena Perfeita",
    desc: "Bateu a meta diária de pomodoros 10 dias seguidos",
    icone: "🔥",
    check: (s) => s.diasComMetaBatidaSeguidos >= 10,
  },
  {
    id: "semSono",
    nome: "Sem Sono",
    desc: "Registrou 10 sessões de estudo de madrugada (antes das 7h)",
    icone: "🦉",
    check: (s) => s.sessoesDeMadrugadaContagem >= 10,
  },
  {
    id: "bibliotecaPessoal",
    nome: "Biblioteca Pessoal",
    desc: "Cadastrou 10 matérias diferentes",
    icone: "📖",
    check: (s) => s.materiasCadastradasTotais >= 10,
  },
  {
    id: "redondo",
    nome: "Redondo",
    desc: "Registrou exatamente 100 questões numa única sessão",
    icone: "🎲",
    check: (s) => s.registrouCemRedondo,
  },
  {
    id: "umPassoDeCadaVez",
    nome: "Um Passo de Cada Vez",
    desc: "Concluiu 50 tópicos de estudo, somando todas as matérias",
    icone: "🧗",
    check: (s) => s.topicosConcluidosTotais >= 50,
  },
  {
    id: "fimDeSemanaDedicado",
    nome: "Fim de Semana Dedicado",
    desc: "Estudou em pelo menos 8 sábados ou domingos diferentes",
    icone: "🏖️",
    check: (s) => s.diasDeFimDeSemanaComEstudo >= 8,
  },
];

// Todas as conquistas do jogo (visíveis + fantasma) — usado pra
// desbloqueio/persistência, independente de qual página está visível.
const CONQUISTAS_VISIVEIS = CONQUISTAS.concat(CONQUISTAS_PAGINA2);
const TODAS_CONQUISTAS = CONQUISTAS_VISIVEIS.concat(CONQUISTAS_PAGINA3);

// Escolhe, entre as conquistas ainda bloqueadas, a que está mais perto de
// ser desbloqueada (maior % de progresso metrica/alvo). Empate é
// desempatado pelo menor alvo, pra priorizar a "mais fácil" de bater.
// Só considera as conquistas "visíveis" (páginas 1 e 2) — as fantasma
// nunca entram aqui, senão o widget entregaria a condição secreta.
// Devolve null se não houver nenhuma bloqueada (todas já feitas) ou
// se a lista de bloqueadas ainda não puder ser calculada.
function obterProximaConquista(stats, idsDesbloqueadas) {
  let melhor = null;
  let melhorProgresso = -1;

  CONQUISTAS_VISIVEIS.forEach((c) => {
    if (idsDesbloqueadas.includes(c.id)) return;
    if (typeof c.metrica !== "function" || !c.alvo) return;

    const atual = c.metrica(stats) || 0;
    const progresso = Math.max(0, Math.min(1, atual / c.alvo));

    const ehMelhor =
      progresso > melhorProgresso ||
      (progresso === melhorProgresso && melhor && c.alvo < melhor.alvo);

    if (ehMelhor) {
      melhorProgresso = progresso;
      melhor = c;
    }
  });

  if (!melhor) return null;

  return {
    conquista: melhor,
    atual: Math.min(melhor.metrica(stats) || 0, melhor.alvo),
    progresso: melhorProgresso,
  };
}

// Página de conquistas visível no momento (1 ou 2) — controlada pelos
// botões de navegação do card de Conquistas no Perfil.
let paginaConquistasAtual = 1;

// Cache do último cálculo de desbloqueio (preenchido em renderizarGamificacao)
// pra trocar de página sem precisar recalcular todas as stats de novo.
let ultimasConquistasDesbloqueadas = [];

function mostrarPaginaConquistas(pagina) {
  paginaConquistasAtual = pagina;
  renderizarGridConquistas();

  const btn1 = document.getElementById("conquistas-pag1-btn");
  const btn2 = document.getElementById("conquistas-pag2-btn");
  const btn3 = document.getElementById("conquistas-pag3-btn");
  if (btn1) btn1.classList.toggle("ativa", pagina === 1);
  if (btn2) btn2.classList.toggle("ativa", pagina === 2);
  if (btn3) btn3.classList.toggle("ativa", pagina === 3);

  const indicador = document.getElementById("conquistas-pag-indicador");
  if (indicador) indicador.innerText = `Página ${pagina} de 3`;
}

// Desenha o grid de conquistas da página atualmente selecionada, usando o
// último cálculo de desbloqueio disponível.
function renderizarGridConquistas() {
  const gridConquistas = document.getElementById("grid-conquistas");
  if (!gridConquistas) return;

  let listaDaPagina = CONQUISTAS;
  if (paginaConquistasAtual === 2) listaDaPagina = CONQUISTAS_PAGINA2;
  if (paginaConquistasAtual === 3) listaDaPagina = CONQUISTAS_PAGINA3;

  const ehPaginaFantasma = paginaConquistasAtual === 3;

  gridConquistas.innerHTML = listaDaPagina
    .map((c) => {
      const desbloqueada = ultimasConquistasDesbloqueadas.includes(c.id);

      // Conquistas fantasma escondem nome/descrição/ícone reais até serem
      // desbloqueadas — é o que faz delas um segredo, e não só mais uma
      // meta na lista.
      const icone = ehPaginaFantasma && !desbloqueada ? "❓" : c.icone;
      const nome =
        ehPaginaFantasma && !desbloqueada ? "???" : escapeHtml(c.nome);
      const desc =
        ehPaginaFantasma && !desbloqueada
          ? "Conquista secreta — descubra jogando como desbloquear."
          : escapeHtml(c.desc);
      const classeFantasma = ehPaginaFantasma ? "fantasma" : "";

      return `
        <div class="conquista-card ${desbloqueada ? "desbloqueada" : "bloqueada"} ${classeFantasma}">
          <div class="conquista-icone">${icone}</div>
          <div>
            <div class="conquista-nome">${nome}</div>
            <div class="conquista-desc">${desc}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function mostrarToastGamificacao(icone, titulo, mensagem) {
  let container = document.getElementById("toast-gamificacao-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-gamificacao-container";
    container.className = "toast-gamificacao-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-gamificacao";
  toast.innerHTML = `
    <span class="toast-gamificacao-icone">${icone}</span>
    <div>
      <span class="toast-gamificacao-titulo">${escapeHtml(titulo)}</span>
      <span class="toast-gamificacao-msg">${escapeHtml(mensagem)}</span>
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4200);
}

// Ponto central de gamificação: recalcula XP/nível/conquistas, atualiza a
// UI do Perfil (se estiver visível) e dispara toasts para o que for novo.
// Seguro de chamar em qualquer tela — os trechos que mexem no DOM do
// Perfil só rodam se os elementos existirem.
function renderizarGamificacao() {
  const stats = obterStatsGamificacao();
  const xpTotal = calcularXPTotal(stats);
  const nivel = calcularNivelPorXp(xpTotal);
  const titulo = obterTituloPorNivel(nivel);

  const xpBaseNivel = xpParaNivel(nivel);
  const xpProximoNivel = xpParaNivel(nivel + 1);
  const xpAtualNoNivel = xpTotal - xpBaseNivel;
  const xpNecessarioNesteNivel = xpProximoNivel - xpBaseNivel;
  const percentual =
    xpNecessarioNesteNivel > 0
      ? Math.min(
          100,
          Math.round((xpAtualNoNivel / xpNecessarioNesteNivel) * 100),
        )
      : 100;

  // --- Atualiza a UI do Perfil, se estiver na página ---
  const badgeNivel = document.getElementById("perfil-nivel-badge");
  if (badgeNivel) badgeNivel.innerText = `Nível ${nivel}`;

  const tituloEl = document.getElementById("perfil-titulo-rpg");
  if (tituloEl) tituloEl.innerText = titulo;

  // --- Emblema visual da faixa de nível ---
  const medalha = obterMedalhaPorNivel(nivel);
  const medalhaBloco = document.getElementById("perfil-medalha");
  const medalhaIcone = document.getElementById("perfil-medalha-icone");
  const medalhaTitulo = document.getElementById("perfil-medalha-titulo");
  if (medalhaBloco) {
    medalhaBloco.className = `perfil-medalha ${medalha.classe}`;
  }
  if (medalhaIcone) medalhaIcone.innerText = medalha.icone;
  if (medalhaTitulo) medalhaTitulo.innerText = titulo;

  const xpFill = document.getElementById("perfil-xp-barra-fill");
  if (xpFill) xpFill.style.width = `${percentual}%`;

  const xpTexto = document.getElementById("perfil-xp-texto");
  if (xpTexto) {
    xpTexto.innerText = `${xpAtualNoNivel} / ${xpNecessarioNesteNivel} XP`;
  }

  // --- Faixa de resumo rápido (streak, horas, pomodoros, matérias) ---
  const miniStreak = document.getElementById("perfil-mini-streak");
  if (miniStreak) miniStreak.innerText = String(stats.streakAtual);

  const miniHoras = document.getElementById("perfil-mini-horas");
  if (miniHoras) {
    const h = Math.floor(stats.minutosTotais / 60);
    const m = stats.minutosTotais % 60;
    miniHoras.innerText = h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  const miniPomodoros = document.getElementById("perfil-mini-pomodoros");
  if (miniPomodoros) miniPomodoros.innerText = String(stats.pomodorosTotais);

  const miniMaterias = document.getElementById("perfil-mini-materias");
  if (miniMaterias) miniMaterias.innerText = String(stats.materiasEstudadas);

  // "Estudando desde": data do primeiro registro em historicoEstudos (as
  // chaves são strings "AAAA-MM-DD", então a ordenação alfabética já dá a
  // ordem cronológica certa). Sem histórico ainda, o texto fica escondido.
  const desdeEl = document.getElementById("perfil-desde-texto");
  if (desdeEl) {
    const datasComEstudo = Object.keys(historicoEstudos).filter(
      (data) => historicoEstudos[data] > 0,
    );
    if (datasComEstudo.length > 0) {
      const primeiraData = datasComEstudo.sort()[0];
      const [ano, mes, dia] = primeiraData.split("-");
      desdeEl.innerText = `📅 Estudando por aqui desde ${dia}/${mes}/${ano}`;
      desdeEl.style.display = "block";
    } else {
      desdeEl.style.display = "none";
    }
  }

  // --- Conquistas: verifica quais estão desbloqueadas (todas as páginas) ---
  const desbloqueadasAntes = JSON.parse(
    localStorage.getItem("conquistasDesbloqueadas") || "[]",
  );
  const desbloqueadasAgora = [];
  const novasDesbloqueadas = [];

  TODAS_CONQUISTAS.forEach((c) => {
    if (c.check(stats)) {
      desbloqueadasAgora.push(c.id);
      if (!desbloqueadasAntes.includes(c.id)) {
        novasDesbloqueadas.push(c);
      }
    }
  });

  if (
    novasDesbloqueadas.length > 0 ||
    desbloqueadasAgora.length !== desbloqueadasAntes.length
  ) {
    localStorage.setItem(
      "conquistasDesbloqueadas",
      JSON.stringify(desbloqueadasAgora),
    );
  }

  ultimasConquistasDesbloqueadas = desbloqueadasAgora;
  renderizarGridConquistas();

  // --- Widget "Próxima Conquista" (a mais perto de ser desbloqueada) ---
  const proximaBloco = document.getElementById("perfil-proxima-conquista");
  if (proximaBloco) {
    const proxima = obterProximaConquista(stats, desbloqueadasAgora);

    if (!proxima) {
      // Já desbloqueou as 40 — esconde o widget em vez de mostrar vazio.
      proximaBloco.style.display = "none";
    } else {
      proximaBloco.style.display = "flex";

      const icone = document.getElementById("proxima-conquista-icone");
      const nome = document.getElementById("proxima-conquista-nome");
      const fill = document.getElementById("proxima-conquista-barra-fill");
      const progressoTexto = document.getElementById(
        "proxima-conquista-progresso",
      );

      if (icone) icone.innerText = proxima.conquista.icone;
      if (nome) nome.innerText = proxima.conquista.nome;
      if (fill) {
        fill.style.width = `${Math.round(proxima.progresso * 100)}%`;
      }
      if (progressoTexto) {
        const atualFmt = Math.floor(proxima.atual).toLocaleString("pt-BR");
        const alvoFmt = proxima.conquista.alvo.toLocaleString("pt-BR");
        progressoTexto.innerText = `${atualFmt} / ${alvoFmt}`;
      }
    }
  }

  // --- Toasts: nível novo e conquistas novas ---
  const ultimoNivelVisto = parseInt(
    localStorage.getItem("ultimoNivelVisto") || "1",
    10,
  );
  if (nivel > ultimoNivelVisto) {
    mostrarToastGamificacao(
      "⭐",
      "Subiu de Nível!",
      `Nível ${nivel} — ${titulo}`,
    );
    localStorage.setItem("ultimoNivelVisto", String(nivel));
  }

  novasDesbloqueadas.forEach((c) => {
    mostrarToastGamificacao(c.icone, "Conquista Desbloqueada!", c.nome);
  });
}

// --- CARTÃO DE CONQUISTA COMPARTILHÁVEL ---
// Gera uma imagem (streak, XP, horas da semana) em formato de story
// (1080x1920) pra compartilhar no WhatsApp/Instagram, usando só o que já
// está calculado em obterStatsGamificacao()/calcularXPTotal() — nenhum
// dado novo, é o mesmo XP/nível/streak mostrados no Perfil.
let blobCartaoConquistaAtual = null;

function calcularMinutosUltimos7Dias() {
  let minutos = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    minutos += historicoEstudos[obterDataLocalString(d)] || 0;
  }
  return minutos;
}

// Desenho auxiliar: retângulo com cantos arredondados (com fallback pra
// navegadores sem CanvasRenderingContext2D.roundRect nativo).
function desenharRetanguloArredondado(ctx, x, y, largura, altura, raio) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, largura, altura, raio);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
  ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
  ctx.arcTo(x, y + altura, x, y, raio);
  ctx.arcTo(x, y, x + largura, y, raio);
  ctx.closePath();
}

async function desenharCartaoConquista() {
  const canvas = document.getElementById("cartao-conquista-canvas");
  const ctx = canvas.getContext("2d");
  const L = canvas.width; // 1080
  const A = canvas.height; // 1920

  // --- Dados (mesma fonte usada no Perfil) ---
  const stats = obterStatsGamificacao();
  const xpTotal = calcularXPTotal(stats);
  const nivel = calcularNivelPorXp(xpTotal);
  const titulo = obterTituloPorNivel(nivel);
  const minutosSemana = calcularMinutosUltimos7Dias();
  const horasSemana = Math.floor(minutosSemana / 60);
  const minutosRestoSemana = minutosSemana % 60;
  const nome = (dadosPerfil.nome || "Estudante").trim() || "Estudante";

  // --- Fundo: gradiente escuro + brilho radial atrás do avatar ---
  const gradFundo = ctx.createLinearGradient(0, 0, 0, A);
  gradFundo.addColorStop(0, "#0f172a");
  gradFundo.addColorStop(1, "#0b1220");
  ctx.fillStyle = gradFundo;
  ctx.fillRect(0, 0, L, A);

  const gradBrilho = ctx.createRadialGradient(L / 2, 430, 40, L / 2, 430, 620);
  gradBrilho.addColorStop(0, "rgba(59, 130, 246, 0.35)");
  gradBrilho.addColorStop(1, "rgba(59, 130, 246, 0)");
  ctx.fillStyle = gradBrilho;
  ctx.fillRect(0, 0, L, A);

  // --- Cabeçalho: nome do app ---
  ctx.textAlign = "center";
  ctx.fillStyle = "#60a5fa";
  ctx.font = "600 42px system-ui, sans-serif";
  ctx.fillText("📚 Estude+", L / 2, 140);

  // --- Avatar (foto real se houver, senão iniciais) ---
  const raioAvatar = 130;
  const centroAvatarY = 400;

  async function carregarImagem(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(L / 2, centroAvatarY, raioAvatar, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (fotoPerfilBase64) {
    try {
      const img = await carregarImagem(fotoPerfilBase64);
      ctx.drawImage(
        img,
        L / 2 - raioAvatar,
        centroAvatarY - raioAvatar,
        raioAvatar * 2,
        raioAvatar * 2,
      );
    } catch {
      desenharIniciaisAvatar();
    }
  } else {
    desenharIniciaisAvatar();
  }
  ctx.restore();

  function desenharIniciaisAvatar() {
    const gradAvatar = ctx.createLinearGradient(
      L / 2 - raioAvatar,
      centroAvatarY - raioAvatar,
      L / 2 + raioAvatar,
      centroAvatarY + raioAvatar,
    );
    gradAvatar.addColorStop(0, "#3b82f6");
    gradAvatar.addColorStop(1, "#1d4ed8");
    ctx.fillStyle = gradAvatar;
    ctx.fillRect(
      L / 2 - raioAvatar,
      centroAvatarY - raioAvatar,
      raioAvatar * 2,
      raioAvatar * 2,
    );
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 100px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(nome.substring(0, 2).toUpperCase(), L / 2, centroAvatarY + 8);
    ctx.textBaseline = "alphabetic";
  }

  // Anel ao redor do avatar
  ctx.beginPath();
  ctx.arc(L / 2, centroAvatarY, raioAvatar + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 6;
  ctx.stroke();

  // --- Nome + nível/título ---
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 58px system-ui, sans-serif";
  ctx.fillText(nome, L / 2, centroAvatarY + raioAvatar + 90);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 36px system-ui, sans-serif";
  ctx.fillText(
    `Nível ${nivel} — ${titulo}`,
    L / 2,
    centroAvatarY + raioAvatar + 145,
  );

  // --- Cards de estatísticas ---
  const statsParaCartao = [
    { icone: "🔥", valor: `${stats.streakAtual}`, label: "dias seguidos" },
    { icone: "⭐", valor: `${xpTotal}`, label: "XP total" },
    {
      icone: "⏱️",
      valor:
        horasSemana > 0
          ? `${horasSemana}h ${minutosRestoSemana.toString().padStart(2, "0")}m`
          : `${minutosRestoSemana}m`,
      label: "essa semana",
    },
  ];

  const margemLateral = 70;
  const gapCards = 24;
  const larguraCard = (L - margemLateral * 2 - gapCards * 2) / 3;
  const alturaCard = 260;
  const topoCards = centroAvatarY + raioAvatar + 220;

  statsParaCartao.forEach((item, i) => {
    const x = margemLateral + i * (larguraCard + gapCards);

    ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
    desenharRetanguloArredondado(
      ctx,
      x,
      topoCards,
      larguraCard,
      alturaCard,
      24,
    );
    ctx.fill();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const centroX = x + larguraCard / 2;
    ctx.fillStyle = "#f8fafc";
    ctx.font = "64px system-ui, sans-serif";
    ctx.fillText(item.icone, centroX, topoCards + 90);

    ctx.font = "700 54px system-ui, sans-serif";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText(item.valor, centroX, topoCards + 165);

    ctx.font = "500 28px system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(item.label, centroX, topoCards + 210);
  });

  // --- Rodapé: frase motivacional + data ---
  ctx.fillStyle = "#f8fafc";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText("Constância todos os dias 💪", L / 2, A - 160);

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  ctx.fillStyle = "#64748b";
  ctx.font = "400 30px system-ui, sans-serif";
  ctx.fillText(dataFormatada, L / 2, A - 100);
  ctx.fillText("Feito com Estude+", L / 2, A - 60);
}

async function abrirCartaoConquista() {
  const modal = document.getElementById("modal-cartao-conquista");
  const preview = document.getElementById("cartao-conquista-preview");
  if (!modal || !preview) return;

  modal.style.display = "flex";
  preview.src = "";
  blobCartaoConquistaAtual = null;

  await desenharCartaoConquista();

  const canvas = document.getElementById("cartao-conquista-canvas");
  canvas.toBlob((blob) => {
    if (!blob) return;
    blobCartaoConquistaAtual = blob;
    preview.src = URL.createObjectURL(blob);
  }, "image/png");
}

function fecharModalCartaoConquista() {
  const modal = document.getElementById("modal-cartao-conquista");
  if (modal) modal.style.display = "none";
}

function fecharModalCartaoConquistaSeClicouFora(event) {
  if (event.target === event.currentTarget) fecharModalCartaoConquista();
}

// Compartilha direto pro app nativo de compartilhamento (WhatsApp,
// Instagram Stories, etc.) quando o navegador suporta Web Share API com
// arquivos (a maioria dos navegadores mobile modernos). No desktop, ou se
// não suportar, cai pro download simples do PNG.
async function compartilharCartaoConquista() {
  if (!blobCartaoConquistaAtual) {
    await mostrarAlerta(
      "A imagem ainda está sendo gerada, tente de novo em um instante.",
    );
    return;
  }

  const arquivo = new File([blobCartaoConquistaAtual], "minha-conquista.png", {
    type: "image/png",
  });

  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({
        files: [arquivo],
        title: "Minha conquista no Estude+",
        text: "Olha meu progresso nos estudos! 📚🔥",
      });
      return;
    } catch (err) {
      // Usuário cancelou o compartilhamento — não faz nada, sem cair no
      // download automático (evita baixar sem querer depois de cancelar).
      if (err && err.name === "AbortError") return;
      console.error("Erro ao compartilhar cartão:", err);
    }
  }

  baixarCartaoConquista();
}

function baixarCartaoConquista() {
  if (!blobCartaoConquistaAtual) return;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blobCartaoConquistaAtual);
  link.download = "minha-conquista-estude-mais.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// --- BACKUP: EXPORTAR / IMPORTAR DADOS ---
// Lista de todas as chaves do localStorage usadas pelo app. Se um novo
// recurso passar a usar uma chave nova, adicione ela aqui também.
// (Essa mesma lista é reaproveitada por js/auth-sync.js pra decidir o que
// sincronizar com a nuvem quando o login estiver configurado.)
const CHAVES_BACKUP = [
  "anotacoesFlashcards",
  "lembretes",
  "totalRevisoesFlashcards",
  "bancoDistracoes",
  "conquistasDesbloqueadas",
  "dadosPerfil",
  "diasCongeladosStreak",
  "freezesDisponiveis",
  "fotoPerfilBase64",
  "historicoEstudos",
  "historicoFoco",
  "logsSessoes",
  "materias",
  "metaFiltroAtivo",
  "metaHorasSemanaisAlvo",
  "metaPomodorosDiaria",
  "metas",
  "pomosIniciadosPorDia",
  "pomosPorDia",
  "registrosQuestoes",
  "questoesFontesExternas",
  "registrosSimulados",
  "semanaReferenciaFreeze",
  "tarefas",
  "tempoPorMateria",
  "totalOvertimeGeralMinutos",
  "ultimaAuditoria",
  "ultimoNivelVisto",
  "ultimoChangelogVisto",
];

function exportarDados() {
  const backup = {
    app: "Estude+",
    versao: 1,
    exportadoEm: new Date().toISOString(),
    dados: {},
  };

  CHAVES_BACKUP.forEach((chave) => {
    const valor = localStorage.getItem(chave);
    if (valor !== null) backup.dados[chave] = valor;
  });

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estude-mais-backup-${obterDataLocalString(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function acionarImportacao() {
  const input = document.getElementById("input-importar-dados");
  if (input) input.click();
}

function importarDados(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = async (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup || typeof backup.dados !== "object") {
        throw new Error("Arquivo de backup inválido.");
      }

      const confirmado = await mostrarConfirmacao(
        "Importar esse backup vai SUBSTITUIR todos os dados atuais (matérias, histórico, XP, conquistas, tarefas, tudo). Essa ação não pode ser desfeita. Quer continuar?",
        { icone: "⚠️", textoConfirmar: "Importar", perigo: true },
      );
      if (!confirmado) {
        event.target.value = "";
        return;
      }

      CHAVES_BACKUP.forEach((chave) => {
        if (backup.dados[chave] !== undefined) {
          localStorage.setItem(chave, backup.dados[chave]);
        }
      });

      await mostrarAlerta(
        "Backup importado com sucesso! A página vai recarregar agora.",
        {
          icone: "✅",
        },
      );
      location.reload();
    } catch (err) {
      console.error("Erro ao importar backup:", err);
      await mostrarAlerta(
        "Não foi possível importar esse arquivo. Verifique se é um backup válido do Estude+.",
      );
    } finally {
      event.target.value = "";
    }
  };
  leitor.readAsText(arquivo);
}

// Recarrega as variáveis que foram lidas do localStorage uma única vez, no
// momento em que o script carregou (antes de qualquer sincronização com a
// nuvem acontecer). Sem isso, um dispositivo novo (localStorage vazio no
// momento em que o script.js foi parseado) ficaria com essas variáveis
// zeradas mesmo depois dos dados chegarem do Supabase, até a próxima vez
// que a página fosse recarregada. Chamada logo no início de
// iniciarAppEstudeMais(), depois que js/auth-sync.js já baixou os dados.
function recarregarEstadoDoLocalStorage() {
  historicoEstudos = JSON.parse(localStorage.getItem("historicoEstudos")) || {};
  materias = JSON.parse(localStorage.getItem("materias")) || [];
  migrarMateriasParaMultiMeta(materias);
  metas = JSON.parse(localStorage.getItem("metas")) || [];
  anotacoesFlashcards =
    JSON.parse(localStorage.getItem("anotacoesFlashcards")) || [];
  lembretes = JSON.parse(localStorage.getItem("lembretes")) || [];
  totalRevisoesFlashcards =
    parseInt(localStorage.getItem("totalRevisoesFlashcards"), 10) || 0;
  tempoPorMateria = JSON.parse(localStorage.getItem("tempoPorMateria")) || {};
  logsSessoes = JSON.parse(localStorage.getItem("logsSessoes")) || [];
  dadosPerfil = JSON.parse(localStorage.getItem("dadosPerfil")) || {
    nome: "Estudante",
    cargo: "Foco em Aprovação",
    bio: "",
  };
  totalOvertimeGeralMinutos =
    parseInt(localStorage.getItem("totalOvertimeGeralMinutos")) || 0;
  fotoPerfilBase64 = localStorage.getItem("fotoPerfilBase64") || null;
  bancoDistracoes = JSON.parse(localStorage.getItem("bancoDistracoes")) || {
    Celular: 0,
    Filhos: 0,
    Barulho: 0,
    Família: 0,
    Pets: 0,
    Televisão: 0,
  };
  tempoPreparoMinutos =
    parseInt(localStorage.getItem("tempoPreparoMinutos"), 10) || 0;
  sonsAmbienteVolumes =
    JSON.parse(localStorage.getItem("sonsAmbienteVolumes")) || {};
  presetBinauralAtual = localStorage.getItem("presetBinauralAtual") || "foco";
  tarefas = JSON.parse(localStorage.getItem("tarefas")) || [];
  registrosQuestoes =
    JSON.parse(localStorage.getItem("registrosQuestoes")) || [];
  registrosQuestoesFontesExternas =
    JSON.parse(localStorage.getItem("questoesFontesExternas")) || [];
  registrosSimulados =
    JSON.parse(localStorage.getItem("registrosSimulados")) || [];
  metaHorasSemanaisAlvo =
    parseInt(localStorage.getItem("metaHorasSemanaisAlvo"), 10) || 10;
  freezesDisponiveis = (() => {
    const salvo = JSON.parse(localStorage.getItem("freezesDisponiveis"));
    return salvo === null || salvo === undefined ? 1 : salvo;
  })();
  semanaReferenciaFreeze = localStorage.getItem("semanaReferenciaFreeze") || "";
  diasCongeladosStreak =
    JSON.parse(localStorage.getItem("diasCongeladosStreak")) || [];
}

// Carga Geral Inicial
// Isso NÃO roda mais sozinho ao carregar o script — quem decide a hora
// certa de chamar essa função é o módulo de autenticação (js/auth-sync.js):
// só depois que a sessão do usuário for confirmada (ou imediatamente, se
// a sincronização em nuvem não estiver configurada, mantendo o app 100%
// funcional local como antes).
function iniciarAppEstudeMais() {
  recarregarEstadoDoLocalStorage();
  carregarDadosPerfil();

  // Campo de data do registro de Questões Resolvidas: começa em hoje e
  // não aceita datas futuras (registro é sempre de algo já resolvido).
  const campoDataQuestoesInit = document.getElementById("questoes-data");
  if (campoDataQuestoesInit) {
    const hojeInit = obterDataLocalString(new Date());
    campoDataQuestoesInit.value = hojeInit;
    campoDataQuestoesInit.max = hojeInit;
  }

  renderizarTodoOPainel();
  renderizarTarefas();
  atualizarProgressoPomodoros();
  sincronizarAbaTimerPreparo();
  verificarSimuladoCronometradoEmAndamento();
  verificarProvaPorQuestaoEmAndamento();
  restaurarSessaoAtivaSalva();
  restaurarOrdemWidgetsPainel();
  exibirBoasVindasComFlashcards();
}

// ============================================================
// ATALHOS DE TECLADO
// ============================================================
// Espaço  → inicia o foco (se estiver parado) ou pausa/retoma (se já
//           estiver rodando, seja foco, pausa ou overtime).
// Esc     → sai da tela cheia do modo foco (o pomodoro continua contando
//           normalmente em segundo plano).
// Os atalhos ficam desligados enquanto a pessoa está digitando em algum
// campo (input/textarea/select) ou com algum modal aberto na frente, pra
// não atrapalhar o uso normal do teclado.
function algumModalAberto() {
  return Array.from(document.querySelectorAll(".modal-distracao")).some(
    (modal) => getComputedStyle(modal).display !== "none",
  );
}

function digitandoEmCampoDeTexto(elemento) {
  if (!elemento) return false;
  const tag = elemento.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    elemento.isContentEditable
  );
}

document.addEventListener("keydown", (event) => {
  if (event.key === " " || event.code === "Space") {
    if (event.repeat) return;
    if (digitandoEmCampoDeTexto(event.target) || algumModalAberto()) return;

    event.preventDefault(); // evita rolar a página com a barra de espaço
    if (emPreparacao) return; // durante a preparação, os botões dela mandam

    if (!emEstadoDeFocoAtivo && !emPausaConfig) {
      gerenciarBotaoFocoPrincipal(); // ainda parado → inicia o foco
    } else {
      pauseTimer(); // já rodando (foco, pausa ou overtime) → pausa/retoma
    }
    return;
  }

  if (event.key === "Escape") {
    if (document.body.classList.contains("modo-isolamento-ativo")) {
      sairDoModoFoco();
    }
  }
});

// --- EASTER EGG: LOGO CLICADO RÁPIDO DEMAIS ---
// Clicar repetidamente no "⚡ ESTUDE+" lá no topo é o tipo de coisa que
// quem tá mexendo no app por curiosidade acaba tentando sozinho — sem
// precisar decorar nenhum código. 10 cliques em menos de 3 segundos
// desbloqueiam o segredo (o contador zera se demorar demais entre um
// clique e outro).
let contadorCliquesLogo = 0;
let timestampUltimoCliqueLogo = 0;

function registrarCliqueLogoEasterEgg() {
  const agora = Date.now();
  if (agora - timestampUltimoCliqueLogo > 3000) {
    contadorCliquesLogo = 0;
  }
  timestampUltimoCliqueLogo = agora;
  contadorCliquesLogo++;

  if (contadorCliquesLogo >= 10) {
    contadorCliquesLogo = 0;
    marcarEasterEgg("sobrecarga");
    renderizarGamificacao();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const logo = document.querySelector(".app-header-main");
  if (logo) logo.addEventListener("click", registrarCliqueLogoEasterEgg);
});

// ============================================================
// PWA: SERVICE WORKER + INSTALAÇÃO COMO APP
// ============================================================
// Registra o service worker (cache do app shell pra abrir offline) e
// garante atualização automática: quando o sw.js novo assume o
// controle da página (troca de versão em VERSAO_CACHE dentro dele), a
// página recarrega sozinha — sem o usuário precisar dar vários F5.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((err) => console.error("Falha ao registrar service worker:", err));

    // Dispara quando o Service Worker que está no controle da página
    // muda (ex: um SW novo, instalado em segundo plano, acabou de ativar
    // via skipWaiting()+clients.claim() no sw.js). Recarrega a página pra
    // garantir que o HTML/CSS/JS na tela sejam sempre os mais recentes.
    // A flag evita um loop caso o evento dispare mais de uma vez.
    let jaRecarregando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (jaRecarregando) return;
      jaRecarregando = true;
      window.location.reload();
    });
  });
}

// Captura o evento que o navegador dispara quando o app pode ser
// instalado, guarda ele pra disparar depois (quando a pessoa clicar no
// nosso botão) e mostra o botão "Instalar App".
let eventoInstalacaoPwa = null;

function appJaEstaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  eventoInstalacaoPwa = event;
  if (!appJaEstaInstalado()) {
    const btn = document.getElementById("btn-instalar-app");
    if (btn) btn.style.display = "flex";
  }
});

async function instalarApp() {
  const btn = document.getElementById("btn-instalar-app");
  if (!eventoInstalacaoPwa) return;

  eventoInstalacaoPwa.prompt();
  const escolha = await eventoInstalacaoPwa.userChoice;
  eventoInstalacaoPwa = null;
  if (btn) btn.style.display = "none";

  if (escolha.outcome === "accepted") {
    mostrarToastGamificacao(
      "⚡",
      "App instalado!",
      "Agora você pode abrir o Estude+ direto da tela inicial.",
    );
  }
}

window.addEventListener("appinstalled", () => {
  const btn = document.getElementById("btn-instalar-app");
  if (btn) btn.style.display = "none";
  eventoInstalacaoPwa = null;
});

// ============================================================
// NOVIDADES E FUNCIONALIDADES (botão flutuante ✨)
// ============================================================
// Cada vez que uma leva de mudanças entra no app, adicione uma entrada
// nova NO TOPO deste array. "versao" é só um identificador (pode ser
// número, "16 jul", etc.) — o que importa é ser sempre um valor novo, pra
// o app saber que tem novidade não vista ainda (compara com
// "ultimoChangelogVisto" no localStorage).
const CHANGELOG_ESTUDE_MAIS = [
  {
    versao: "1.26",
    titulo: "Sala de Estudos: dono agora pode excluir a sala e remover membros",
    itens: [
      "Quem criou a sala agora vê um botão 🗑️ 'Excluir Sala' — remove a sala e todo o ranking pra sempre, e cada participante é avisado automaticamente (em tempo real) que a sala deixou de existir.",
      "Quem criou a sala também vê um botão ✕ ao lado de cada outro participante no ranking, pra removê-lo da sala quando fizer sentido — a pessoa removida é avisada automaticamente e volta pra tela inicial da Sala.",
      "Antes só existia 'sair da sala' (voluntário); agora o dono tem controle de verdade sobre quem fica.",
    ],
  },
  {
    versao: "1.25",
    titulo:
      "Cor automática de matéria, links na sessão registrada e conquistas de aprovação",
    itens: [
      "Toda matéria nova agora ganha uma cor sozinha, sempre diferente e harmônica com as das demais matérias já cadastradas — a lista de cores para escolher foi retirada do cadastro por deixar o layout poluído. Pra trocar a cor de uma matéria já cadastrada, use o seletor de cor (ou o botão 🎲 Sugerir outra cor) na edição, em Matérias Cadastradas — nenhuma cor já escolhida antes foi alterada.",
      "O formulário de Registrar Sessão agora aceita um link (vídeo ou texto/artigo/PDF) tanto no Material de Apoio quanto em cada Videoaula Assistida — antes essa informação ficava salva sem aparecer em lugar nenhum. Agora os links aparecem clicáveis direto no card da sessão, em Hoje & Registros.",
      "Novo checkbox 'Marcar como Aprovado' em cada prova de Provas Cadastradas — o card ganha uma borda dourada de destaque quando marcado.",
      "3 novas conquistas de aprovação: 🎓 Aprovado! (1 aprovação), 🏅 Bicampeão (2 ou mais) e 👑 Tríplice Coroa (3 ou mais) — desbloqueiam sozinhas ao marcar uma prova como aprovada.",
      "Reorganização da seção Hoje & Registros: Sessões de Hoje e Ritmo Sugerido por Matéria ficam agrupados à esquerda, Revisão Pendente e Simulados e Provas à direita, com Questões Resolvidas ocupando a largura toda logo abaixo (form e histórico lado a lado) — corrige os vãos enormes que apareciam entre cards de altura muito diferente.",
    ],
  },
  {
    versao: "1.24",
    titulo:
      "Flashcards estilo Anki, Registro de Sessão Avulsa e cards de análise em modo compacto",
    itens: [
      "Novo 🗂️ Flashcards em Estudos → Flashcards: crie cards de pergunta/resposta e revise com o mesmo algoritmo SM-2 (estilo Anki) usado nos tópicos — 4 botões de avaliação (Errei/Difícil/Bom/Fácil), cada um já mostrando em quantos dias o card volta a aparecer antes de você clicar.",
      "Nova tela de boas-vindas: toda vez que o app é aberto, um carrossel de cards viráveis reúne os tópicos vencidos da revisão espaçada, as provas mais próximas e os flashcards pendentes de revisão.",
      "Novo 📌 Lembretes em Estudos → Flashcards: bilhetes rápidos (documento pra levar, prazo de inscrição etc.) que aparecem no topo da tela de boas-vindas até serem marcados como concluídos.",
      "Novo botão ✍️ Registrar Sessão em Hoje & Registros: lance manualmente uma sessão de estudo já concluída (sem passar pelo pomodoro) — tipo (Teoria/Revisão/Questão), duração, questões e acertos, páginas lidas, material de apoio, videoaulas assistidas, com opção de marcar o assunto como concluído e entrar na fila de revisão.",
      "Novo botão ⚙️ flutuante de modo de visualização: escolha entre o modo Compacto (cards de análise viram um resumo com botão 'Ver Detalhes' em modal) e Expandido (tudo visível na página, como era antes) em Estudos → Desempenho e Análises.",
      "Paleta de cores de matéria ampliada de 28 para 36 cores, reorganizada por família (vermelhos, laranjas, amarelos, verdes...) — mais fácil de escolher cores bem distintas com muitas matérias e tópicos cadastrados.",
    ],
  },
  {
    versao: "1.23",
    titulo: "Analisador de Edital em manutenção",
    itens: [
      "O 🤖 Analisador de Edital com IA foi retirado temporariamente pra manutenção — a extração automática de cargos, remuneração, datas de inscrição e conteúdo programático a partir do PDF do edital volta em uma atualização futura.",
      "Enquanto isso, o cadastro de prova continua funcionando normalmente pelo formulário manual, em Estudos → Cadastro.",
    ],
  },
  {
    versao: "1.22",
    titulo:
      "Reta Final, Modo Prova, Radar de Competências e Analisador de Edital com IA",
    itens: [
      "Novo 🚨 Modo Reta Final: ativa sozinho quando uma prova está a 30 dias ou menos, juntando revisões atrasadas, matérias com pior desempenho e as de maior peso num checklist único do dia.",
      "Nova aba ⏱️ Modo Prova: cronômetro dedicado pra treinar velocidade sob pressão — registra o tempo total de um lote de questões e cruza com o % de acerto pra separar 'não sabe o conteúdo' de 'sabe, mas é lento demais'.",
      "Novo 🕸️ Radar de Competências em Estudos → Desempenho: gráfico de teia com o % de acerto por matéria, pra ver o formato do seu desempenho num único olhar.",
      "Novo 📓 Caderno de Erros com diagnóstico de causa: ao registrar questões erradas, classifique o motivo (não sabia o conteúdo / confundi conceitos / erro de leitura / falta de atenção) e veja a distribuição num gráfico — muda o plano de ação.",
      "Novo 🤖 Analisador de Edital com IA em Estudos → Cadastro: anexe o PDF do edital e a IA extrai automaticamente cargos, remuneração, valor e período de inscrição e o conteúdo programático, prontos pra revisar e usar no cadastro.",
      "Cadastro de prova agora aceita remuneração, valor da inscrição e período de inscrição, com alarme (banner + notificação do navegador) quando faltam 3 dias ou menos pro fim das inscrições.",
      "Cadastro rápido de subtópicos: ao registrar questões (em Hoje & Registros ou no Modo Prova), dá pra criar um subtópico novo na matéria direto ali, sem precisar abrir 'editar matéria'.",
      "Novo botão 💬 de Sugestões e Reclamações, ao lado do botão de Novidades — contato direto por email.",
      "Corrigido: o ranking da Sala de Estudos podia ficar travado em 0 minutos mesmo com sessões de estudo concluídas — o app agora sincroniza a partir do registro certo de sessões.",
    ],
  },
  {
    versao: "1.21",
    titulo: "Sincronização entre aparelhos mais confiável",
    itens: [
      'Corrigido: o app podia mostrar toda vez a pergunta "dados da conta ou deste aparelho?" mesmo sem nenhum conflito real — agora só aparece na primeira vez que uma conta é usada nesse aparelho.',
      "Sessões, questões, simulados e tarefas feitos em aparelhos diferentes (ou no mesmo aparelho, em momentos diferentes do dia) agora são combinados, em vez de um substituir o outro — nenhuma sessão se perde mais por causa de sincronização.",
      "O app agora também sincroniza sozinho ao voltar de segundo plano (celular/PWA), sem precisar recarregar a página.",
    ],
  },
  {
    versao: "1.20",
    titulo: "Meta de Horas, Congelamento de Sequência e Cartão de Conquista",
    itens: [
      "Novo card 🗓️ Meta de Horas no painel: defina quantas horas quer estudar por semana e acompanhe o progresso (independente de prova/meta).",
      "Novo ❄️ Congelamento de Sequência: 1 vez por semana, se você não estudar um dia, seu streak não quebra — repõe toda segunda-feira.",
      "Novo botão 📤 Compartilhar Conquista no Perfil: gera uma imagem com seu streak, XP e horas da semana pra postar no story ou mandar no WhatsApp.",
      "Corrigido: o botão Finalizar podia deixar o app parado (notificação e cor do timer excedente não atualizavam) por causa de um erro no código — resolvido.",
      "Corrigido: o aviso de pausa e as confirmações podiam ficar invisíveis/travadas durante o modo foco em tela cheia — resolvido.",
    ],
  },
  {
    versao: "1.19",
    titulo: "Sala de Estudos, avisos flutuantes e ajustes de tela cheia",
    itens: [
      "Novo botão 🏆 Sala: crie uma sala com um código e compare com amigos quanto cada um estudou hoje e na semana, com ranking em tempo real (precisa estar logado).",
      "Todos os avisos e confirmações do app (excluir matéria, apagar estatísticas, importar backup, etc.) agora aparecem como uma janela flutuante no estilo do app, em vez do popup cinza do navegador.",
      "Corrigido: no modo foco em tela cheia, botões e informações podiam ficar cortados quando o navegador não estava em tela cheia nativa — agora o painel rola internamente e nada fica inacessível.",
      "Mais espaçamento entre os botões flutuantes de conta, Dados e Sala no canto superior direito.",
    ],
  },
  {
    versao: "1.18",
    titulo: "Taxa de Conclusão de Pomodoros",
    itens: [
      "Novo card em Estudos → Análises mostrando quantos pomodoros iniciados realmente chegaram até o fim (sem serem finalizados no meio) — hoje, nos últimos 7 dias e no total.",
    ],
  },
  {
    versao: "1.17",
    titulo: "Sons ambiente mais realistas",
    itens: [
      "Chuva, Escritório e Biblioteca deixaram de ser só ruído rosa com um filtro plano em cima. Agora têm modulação de volume simulando rajadas de chuva ou o ar-condicionado ciclando, e o Escritório ganhou um zumbido grave de fundo — pra soarem mais parecidos com o ambiente real, não só um chiado uniforme.",
    ],
  },
  {
    versao: "1.16",
    titulo: "Aba Estudos reorganizada",
    itens: [
      "A aba Estudos ganhou 3 sub-abas — 📋 Cadastro, ✍️ Hoje & Registros e 📊 Análises — reunindo os cards por assunto em vez de uma rolagem única enorme. Nenhuma função foi removida, só reorganizada.",
    ],
  },
  {
    versao: "1.15",
    titulo: "Apagar estatísticas e dados salvos",
    itens: [
      "Novo botão 🗑️ Dados, logo abaixo do botão Entrar, com opções pra apagar as estatísticas gerais, de uma matéria específica ou de uma meta específica — sem precisar excluir a matéria ou a meta em si.",
    ],
  },
  {
    versao: "1.14",
    titulo: "Simulado Cronometrado",
    itens: [
      "Cronômetro de tela cheia pro tempo total da prova, direto no Pomodoro — ao acabar (ou ao finalizar antes), você já cai na tela de registrar o resultado do simulado.",
      "O cronômetro sobrevive a fechar ou recarregar a página: se o tempo esgotar enquanto o app estiver fechado, ele finaliza sozinho e te leva pro registro assim que você reabrir.",
    ],
  },
  {
    versao: "1.13",
    titulo: "Botão de Novidades",
    itens: [
      "Este painel aqui: um jeito rápido de ver tudo que o app faz e o que mudou recentemente.",
    ],
  },
  {
    versao: "1.12",
    titulo: "Correções de modo foco e conta",
    itens: [
      "Corrigido: o relógio da tela cheia ficava desproporcional e com brilho exagerado em celulares e tablets.",
      "Corrigido: os dados da conta anterior continuavam aparecendo depois de sair (logoff) — agora o aparelho volta pro modo convidado, limpo.",
    ],
  },
  {
    versao: "1.11",
    titulo: "Simulados e evolução ao longo do tempo",
    itens: [
      "Registro de simulados e provas completas, separado das questões do dia a dia, com nota e histórico.",
      "Gráfico de evolução: horas estudadas e % de acerto em questões, semana a semana.",
      "Heatmap de produtividade por horário do dia — mostra em que horas você realmente rende mais.",
    ],
  },
  {
    versao: "1.10",
    titulo: "App instalável (PWA)",
    itens: [
      "O Estude+ agora pode ser instalado na tela inicial do celular ou computador e funciona offline.",
    ],
  },
  {
    versao: "1.9",
    titulo: "Revisão espaçada com SM-2",
    itens: [
      'Cada tópico do edital virou um "cartão" de revisão, no mesmo estilo do Anki — avalie como lembrou e o intervalo até a próxima revisão se ajusta sozinho.',
    ],
  },
  {
    versao: "1.8",
    titulo: "Análises mais profundas",
    itens: [
      "Previsão de quando você termina o edital, no seu ritmo atual.",
      "Comparação entre a semana atual e a anterior.",
      "Exportar relatório de estudos em PDF.",
    ],
  },
  {
    versao: "1.7",
    titulo: "Sub-tópicos e questões resolvidas",
    itens: [
      "Cada matéria agora pode ter uma checklist de tópicos do edital, com progresso.",
      "Registro de questões resolvidas, com contagem de acerto.",
    ],
  },
  {
    versao: "1.6",
    titulo: "Painel reorganizado em abas",
    itens: [
      "A página foi dividida em Foco, Matérias & Metas e Perfil, pra ficar menos poluída e mais fácil de navegar.",
    ],
  },
  {
    versao: "1.5",
    titulo: "Login e sincronização em nuvem",
    itens: [
      "Login opcional por e-mail/senha ou Google, com recuperação de senha.",
      "Seus dados passam a acompanhar você em qualquer aparelho em que entrar com a mesma conta.",
    ],
  },
  {
    versao: "1.4",
    titulo: "Mais cores e peso das matérias com utilidade real",
    itens: [
      "Paleta de cores das matérias ampliada.",
      "O peso (prioridade) da matéria agora ordena as listas e alimenta o preenchimento automático da Sessão Planejada.",
    ],
  },
  {
    versao: "1.3",
    titulo: "Ajustes do tema claro",
    itens: ["Diversas correções de contraste e legibilidade no tema claro."],
  },
  {
    versao: "1.2",
    titulo: "Tema claro/escuro",
    itens: ["Alternância entre tema claro e escuro, salva por dispositivo."],
  },
  {
    versao: "1.1",
    titulo: "Sessão de Estudo Planejada",
    itens: [
      "Monte uma sequência de matérias e pomodoros com pausas automáticas configuradas de uma vez só.",
    ],
  },
  {
    versao: "1.0",
    titulo: "Lançamento",
    itens: [
      "Pomodoro com foco, pausa e tela cheia; matérias, metas, tarefas, gamificação (XP, níveis, conquistas, sequência) e heatmap de constância.",
    ],
  },
];

// Lista de funcionalidades atuais do app, agrupadas por área — mostrada na
// aba "Funcionalidades" do mesmo painel.
const FUNCIONALIDADES_ESTUDE_MAIS = [
  {
    categoria: "⏱️ Foco",
    itens: [
      "Timer Pomodoro com foco, pausa automática, overtime e tela cheia imersiva",
      "Sessão de Estudo Planejada: fila de matérias e pomodoros com pausas automáticas",
      "Timer de preparação, sons ambiente e batidas binaurais",
      "Simulado Cronometrado: cronômetro de tela cheia pro tempo total da prova, com atalho direto pra registrar o resultado ao final",
      "Modo Prova: cronômetro dedicado pra treinar velocidade sob pressão, registrando o tempo de cada lote de questões resolvido",
    ],
  },
  {
    categoria: "📚 Matérias, Metas e Provas",
    itens: [
      "Matérias com cor atribuída automaticamente (sempre harmônica e diferente das demais), trocável a qualquer momento na edição, peso de prioridade e vínculo a uma meta",
      "Sub-tópicos do edital por matéria, com progresso — incluindo cadastro rápido de subtópicos direto na tela de registrar questões",
      "Cadastro de Prova de Concurso: data da prova, remuneração, valor e período de inscrição, com alarme de prazo (banner + notificação) e checkbox pra marcar como aprovado",
      "Meta de Horas Semanais: alvo recorrente de horas por semana, independente de prova",
      "Registro de Sessão Avulsa: lance manualmente uma sessão de estudo já concluída (sem passar pelo pomodoro) — tipo, duração, questões, páginas lidas e videoaulas assistidas, cada uma com link opcional de vídeo/material de apoio",
      "Revisão espaçada com algoritmo SM-2 (estilo Anki)",
      "Questões resolvidas e simulados/provas completas, com histórico",
      "Modo Reta Final: checklist diário automático que ativa quando uma prova está a 30 dias ou menos, juntando revisões atrasadas, pontos fracos e matérias de maior peso",
    ],
  },
  {
    categoria: "🗂️ Flashcards e Lembretes",
    itens: [
      "Flashcards de pergunta/resposta com revisão espaçada estilo Anki (algoritmo SM-2), com preview do intervalo em cada botão de avaliação antes de você clicar",
      "Lembretes: bilhetes rápidos que ficam visíveis até serem marcados como concluídos",
      "Tela de boas-vindas ao abrir o app: carrossel de cards viráveis com tópicos vencidos da revisão, provas próximas e flashcards pendentes, mais os lembretes em aberto",
    ],
  },
  {
    categoria: "📊 Análises e Desempenho",
    itens: [
      "Heatmap de constância (estilo GitHub) e calendário compacto",
      "Gráfico de evolução ao longo do tempo (horas e % de acerto)",
      "Heatmap de produtividade por horário do dia",
      "Comparação entre a semana atual e a anterior",
      "Previsão de conclusão do edital no ritmo atual",
      "Matriz de Prioridade: cruza peso da matéria com % de acerto pra apontar onde focar agora",
      "Radar de Competências: gráfico de teia com o % de acerto por matéria",
      "Caderno de Erros com diagnóstico de causa: classifique o motivo de cada erro (conteúdo, confusão de conceito, leitura ou atenção) e veja a distribuição",
      "Tempo médio por questão: cruza velocidade com precisão pra separar 'não sabe' de 'sabe, mas é lento'",
      "Modo de visualização Compacto (resumo + 'Ver Detalhes' em modal) ou Expandido (tudo visível na página) pros cards de análise, trocável a qualquer momento pelo botão ⚙️ flutuante",
      "Exportar relatório de estudos em PDF",
    ],
  },
  {
    categoria: "🏆 Gamificação",
    itens: [
      "XP, níveis e conquistas desbloqueáveis, incluindo conquistas de aprovação (1, 2 ou mais e 3 ou mais provas marcadas como aprovadas)",
      "Sequência de dias seguidos de foco, com 1 congelamento por semana pra não quebrar o streak",
      "Tarefas do dia a dia",
      "Sala de Estudos: crie ou entre com um código e veja o ranking de minutos estudados (hoje e na semana) atualizando em tempo real — quem cria a sala pode excluí-la ou remover outros participantes a qualquer momento",
      "Cartão de Conquista compartilhável: gera uma imagem com streak, XP e horas da semana pra postar no story/WhatsApp",
    ],
  },
  {
    categoria: "🔐 Conta",
    itens: [
      "Uso sem conta (dados só no aparelho) ou login por e-mail/Google",
      "Sincronização entre dispositivos e recuperação de senha",
      "App instalável (PWA), funciona offline",
      "Backup manual (exportar/importar) e tema claro/escuro",
    ],
  },
  {
    categoria: "💬 Suporte",
    itens: ["Sugestões, dúvidas ou reclamações direto por email, a um clique"],
  },
];

function abrirModalNovidades() {
  document.getElementById("modal-novidades").style.display = "flex";
  mostrarAbaNovidades("changelog");
  marcarChangelogComoVisto();
}

function fecharModalNovidades() {
  document.getElementById("modal-novidades").style.display = "none";
}

// Fecha o modal quando o clique acontece na área escurecida ao redor (fora
// do card), não quando é dentro do conteúdo — evita fechar sem querer ao
// clicar em algo dentro do painel.
function fecharModalNovidadesSeClicouFora(event) {
  if (event.target.id === "modal-novidades") {
    fecharModalNovidades();
  }
}

// --- MODAL: EDITAR PERFIL (nome, foco principal/cargo e biografia) ---
// Mesmo padrão do modal de Novidades: um ícone flutuante abre uma janela
// com o formulário que antes ficava fixo, ocupando espaço, na aba Perfil.
function abrirModalEditarPerfil() {
  carregarDadosPerfil();
  document.getElementById("modal-editar-perfil").style.display = "flex";
}

function fecharModalEditarPerfil() {
  document.getElementById("modal-editar-perfil").style.display = "none";
}

function fecharModalEditarPerfilSeClicouFora(event) {
  if (event.target.id === "modal-editar-perfil") {
    fecharModalEditarPerfil();
  }
}

function mostrarAbaNovidades(aba) {
  const btnChangelog = document.getElementById("aba-novidades-changelog-btn");
  const btnFuncoes = document.getElementById("aba-novidades-funcoes-btn");
  const painelChangelog = document.getElementById("aba-novidades-changelog");
  const painelFuncoes = document.getElementById("aba-novidades-funcoes");
  if (!btnChangelog || !btnFuncoes || !painelChangelog || !painelFuncoes)
    return;

  const ehChangelog = aba === "changelog";
  btnChangelog.classList.toggle("active", ehChangelog);
  btnFuncoes.classList.toggle("active", !ehChangelog);
  painelChangelog.style.display = ehChangelog ? "block" : "none";
  painelFuncoes.style.display = ehChangelog ? "none" : "block";
}

function renderizarNovidades() {
  const listaChangelog = document.getElementById("aba-novidades-changelog");
  if (listaChangelog) {
    listaChangelog.innerHTML = CHANGELOG_ESTUDE_MAIS.map(
      (entrada) => `
        <div class="changelog-entrada">
          <div class="changelog-entrada-cabecalho">
            <span class="changelog-versao">v${entrada.versao}</span>
            <strong>${escapeHtml(entrada.titulo)}</strong>
          </div>
          <ul>
            ${entrada.itens.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `,
    ).join("");
  }

  const listaFuncoes = document.getElementById("aba-novidades-funcoes");
  if (listaFuncoes) {
    listaFuncoes.innerHTML = FUNCIONALIDADES_ESTUDE_MAIS.map(
      (grupo) => `
        <div class="funcionalidades-grupo">
          <h3>${escapeHtml(grupo.categoria)}</h3>
          <ul>
            ${grupo.itens.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `,
    ).join("");
  }
}

function marcarChangelogComoVisto() {
  localStorage.setItem("ultimoChangelogVisto", CHANGELOG_ESTUDE_MAIS[0].versao);
  const bolinha = document.getElementById("btn-novidades-bolinha");
  if (bolinha) bolinha.style.display = "none";
}

function atualizarBolinhaNovidades() {
  const bolinha = document.getElementById("btn-novidades-bolinha");
  if (!bolinha) return;
  const ultimoVisto = localStorage.getItem("ultimoChangelogVisto");
  const versaoMaisRecente = CHANGELOG_ESTUDE_MAIS[0].versao;
  bolinha.style.display = ultimoVisto === versaoMaisRecente ? "none" : "block";
}

document.addEventListener("DOMContentLoaded", () => {
  renderizarNovidades();
  atualizarBolinhaNovidades();
});

// ============================================================
// APAGAR DADOS — estatísticas gerais, de uma matéria ou de uma meta
// ============================================================
// Chaves que guardam só estatística/histórico "de progresso" — nada de
// cadastro (matérias, metas, tarefas, perfil). São essas que o botão
// "Apagar estatísticas gerais" zera.
const CHAVES_ESTATISTICAS_GERAIS = [
  "historicoEstudos",
  "historicoFoco",
  "logsSessoes",
  "tempoPorMateria",
  "totalOvertimeGeralMinutos",
  "pomosPorDia",
  "pomosIniciadosPorDia",
  "conquistasDesbloqueadas",
  "registrosQuestoes",
  "registrosSimulados",
  "ultimoNivelVisto",
  "diasCongeladosStreak",
  "freezesDisponiveis",
  "semanaReferenciaFreeze",
];

function abrirModalGerenciarDados() {
  preencherSelectsGerenciarDados();
  document.getElementById("modal-gerenciar-dados").style.display = "flex";
}

function fecharModalGerenciarDados() {
  document.getElementById("modal-gerenciar-dados").style.display = "none";
}

function fecharModalGerenciarDadosSeClicouFora(event) {
  if (event.target.id === "modal-gerenciar-dados") {
    fecharModalGerenciarDados();
  }
}

// Preenche os selects de matéria e de meta com o que está cadastrado no
// momento em que o modal é aberto.
function preencherSelectsGerenciarDados() {
  const seletorMateria = document.getElementById("gerenciar-dados-materia");
  if (seletorMateria) {
    seletorMateria.innerHTML =
      materias.length > 0
        ? materias
            .map(
              (m) =>
                `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`,
            )
            .join("")
        : '<option value="">Nenhuma matéria cadastrada</option>';
  }

  const seletorMeta = document.getElementById("gerenciar-dados-meta");
  if (seletorMeta) {
    seletorMeta.innerHTML =
      metas.length > 0
        ? metas
            .map(
              (m) =>
                `<option value="${escapeHtml(m.objetivoNome)}">${escapeHtml(m.objetivoNome)}</option>`,
            )
            .join("")
        : '<option value="">Nenhuma prova/meta cadastrada</option>';
  }
}

// Apaga TODO o histórico/estatística do app (foco, heatmap, sequência, XP,
// conquistas, questões e simulados). Matérias, metas, tarefas e perfil
// continuam cadastrados — só o "progresso registrado" some.
async function apagarEstatisticasGerais() {
  const confirmado = await mostrarConfirmacao(
    "Apagar TODAS as estatísticas gerais? Isso zera histórico de foco, heatmap, sequência, XP, conquistas, questões e simulados registrados. Matérias, metas e tarefas cadastradas continuam. Essa ação não pode ser desfeita.",
    { icone: "🗑️", textoConfirmar: "Apagar tudo", perigo: true },
  );
  if (!confirmado) return;

  CHAVES_ESTATISTICAS_GERAIS.forEach((chave) => localStorage.removeItem(chave));

  await mostrarAlerta(
    "Estatísticas gerais apagadas! A página vai recarregar agora.",
    {
      icone: "✅",
    },
  );
  location.reload();
}

// Apaga só o tempo estudado, as sessões e as questões registradas de UMA
// matéria (a escolhida no select). A matéria em si continua cadastrada.
async function apagarEstatisticasMateria() {
  const seletor = document.getElementById("gerenciar-dados-materia");
  const nome = seletor ? seletor.value : "";
  if (!nome) {
    await mostrarAlerta("Escolha uma matéria.");
    return;
  }

  const confirmado = await mostrarConfirmacao(
    `Apagar todas as estatísticas de "${nome}"? Isso remove o tempo estudado, as sessões e as questões registradas dessa matéria. A matéria continua cadastrada. Essa ação não pode ser desfeita.`,
    { icone: "🗑️", textoConfirmar: "Apagar", perigo: true },
  );
  if (!confirmado) return;

  // Antes de remover as sessões dessa matéria, tira o tempo delas do total
  // diário — senão o heatmap/histórico geral ficava inflado com tempo que
  // já foi apagado.
  logsSessoes
    .filter((l) => l.materia === nome)
    .forEach((l) => {
      if (historicoEstudos[l.data] != null) {
        historicoEstudos[l.data] = Math.max(
          0,
          historicoEstudos[l.data] - l.duracao,
        );
        if (historicoEstudos[l.data] === 0) delete historicoEstudos[l.data];
      }
    });
  localStorage.setItem("historicoEstudos", JSON.stringify(historicoEstudos));

  logsSessoes = logsSessoes.filter((l) => l.materia !== nome);
  localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));

  delete tempoPorMateria[nome];
  localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));

  registrosQuestoes = registrosQuestoes.filter((r) => r.materia !== nome);
  localStorage.setItem("registrosQuestoes", JSON.stringify(registrosQuestoes));

  await mostrarAlerta(
    `Estatísticas de "${nome}" apagadas! A página vai recarregar agora.`,
    {
      icone: "✅",
    },
  );
  location.reload();
}

// Apaga só os simulados registrados vinculados a UMA meta/prova (a
// escolhida no select). A meta em si continua cadastrada.
async function apagarEstatisticasMeta() {
  const seletor = document.getElementById("gerenciar-dados-meta");
  const nomeMeta = seletor ? seletor.value : "";
  if (!nomeMeta) {
    await mostrarAlerta("Escolha uma prova/meta.");
    return;
  }

  const confirmado = await mostrarConfirmacao(
    `Apagar as estatísticas de simulados vinculados a "${nomeMeta}"? A meta continua cadastrada. Essa ação não pode ser desfeita.`,
    { icone: "🗑️", textoConfirmar: "Apagar", perigo: true },
  );
  if (!confirmado) return;

  registrosSimulados = registrosSimulados.filter(
    (r) => r.metaVinculada !== nomeMeta,
  );
  localStorage.setItem(
    "registrosSimulados",
    JSON.stringify(registrosSimulados),
  );

  await mostrarAlerta(
    `Estatísticas de "${nomeMeta}" apagadas! A página vai recarregar agora.`,
    { icone: "✅" },
  );
  location.reload();
}
