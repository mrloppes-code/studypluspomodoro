// --- VARIÁVEIS DE ESTADO (LOCALSTORAGE) ---
let historicoEstudos =
  JSON.parse(localStorage.getItem("historicoEstudos")) || {};
let materias = JSON.parse(localStorage.getItem("materias")) || [];
let metas = JSON.parse(localStorage.getItem("metas")) || [];
let tempoPorMateria = JSON.parse(localStorage.getItem("tempoPorMateria")) || {};
let logsSessoes = JSON.parse(localStorage.getItem("logsSessoes")) || [];
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

// Simulado Cronometrado: cronômetro regressivo do tempo total de uma prova,
// em tela cheia. Persistido no localStorage (não só em variável) porque uma
// prova real dura horas — se a pessoa recarregar a página ou fechar o
// navegador sem querer no meio do caminho, o cronômetro precisa continuar
// de onde parou (ou já finalizar sozinho, se o tempo tiver esgotado
// enquanto o app estava fechado).
let simuladoCronIntervalId = null;
let simuladoCronDados =
  JSON.parse(localStorage.getItem("simuladoCronDados")) || null; // { timestampAlvo, nome, metaVinculada, total }

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

const paletaCores = [
  { nome: "🔵 Azul", hex: "#3b82f6" },
  { nome: "🟢 Verde", hex: "#10b981" },
  { nome: "🟠 Laranja", hex: "#f97316" },
  { nome: "🔴 Vermelho", hex: "#ef4444" },
  { nome: "🔮 Roxo", hex: "#8b5cf6" },
  { nome: "🐳 Ciano", hex: "#06b6d4" },
  { nome: "🌸 Rosa", hex: "#ec4899" },
  { nome: "🍯 Amarelo", hex: "#f59e0b" },
  { nome: "🟣 Índigo", hex: "#6366f1" },
  { nome: "🍏 Lima", hex: "#84cc16" },
  { nome: "🌊 Turquesa", hex: "#14b8a6" },
  { nome: "🟤 Marrom", hex: "#92400e" },
  { nome: "⚪ Cinza", hex: "#64748b" },
  { nome: "🍷 Vinho", hex: "#be123c" },
  { nome: "⚓ Marinho", hex: "#1e40af" },
  { nome: "🌿 Musgo", hex: "#4d7c0f" },
  { nome: "🍈 Menta", hex: "#34d399" },
  { nome: "🌅 Salmão", hex: "#fb7185" },
  { nome: "🍇 Uva", hex: "#7c3aed" },
  { nome: "🦚 Petróleo", hex: "#0e7490" },
  { nome: "🌻 Girassol", hex: "#eab308" },
  { nome: "🍫 Chocolate", hex: "#78350f" },
  { nome: "🥝 Kiwi", hex: "#a3e635" },
  { nome: "🌌 Anil", hex: "#4338ca" },
  { nome: "🍬 Lilás", hex: "#c084fc" },
  { nome: "🩶 Grafite", hex: "#334155" },
  { nome: "🔥 Ferrugem", hex: "#c2410c" },
  { nome: "🌤️ Azul Céu", hex: "#0ea5e9" },
];

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
  document.getElementById("pagina-perfil").style.display =
    pagina === "perfil" ? "block" : "none";
  document
    .getElementById("nav-painel")
    .classList.toggle("active", pagina === "painel");
  document
    .getElementById("nav-estudos")
    .classList.toggle("active", pagina === "estudos");
  document
    .getElementById("nav-perfil")
    .classList.toggle("active", pagina === "perfil");
  if (pagina === "painel" || pagina === "estudos") {
    renderizarTodoOPainel();
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
    analises: "estudos-sub-analises",
  };

  Object.entries(grupos).forEach(([chave, idGrupo]) => {
    const painel = document.getElementById(idGrupo);
    const botao = document.getElementById(`${idGrupo}-btn`);
    if (painel) painel.style.display = chave === subaba ? "grid" : "none";
    if (botao) botao.classList.toggle("active", chave === subaba);
  });
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

function tocarRadioLofiPorUrl() {
  const campo = document.getElementById("lofi-url-custom");
  if (!campo) return;
  const id = extrairIdYoutube(campo.value.trim());
  if (!id) {
    alert(
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
function preencherBlocoPorPrioridade() {
  if (materias.length === 0) {
    alert(
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
function iniciarBlocoEstudos() {
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
    alert(
      "Adicione ao menos uma matéria com quantidade de pomodoros maior que zero.",
    );
    return;
  }

  if (emEstadoDeFocoAtivo || emPausaConfig) {
    alert(
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
function cancelarBlocoEstudos() {
  if (!planoEstudo) return;
  const confirmado = confirm(
    "Cancelar a Sessão de Estudo Planejada? A sessão atual continua rodando normalmente, mas a fila de matérias e as pausas automáticas serão interrompidas.",
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

function ativarModoIsolamento() {
  document.body.classList.add("modo-isolamento-ativo");
  moverPomodoroParaTelaCheia();
}

function desativarModoIsolamento() {
  document.body.classList.remove("modo-isolamento-ativo");
  restaurarPomodoroNaPosicaoOriginal();
}

// --- TIMING / POMODORO ---
function gerenciarBotaoFocoPrincipal() {
  if (emPreparacao) return;
  if (!emEstadoDeFocoAtivo && !emPausaConfig) {
    iniciarFocoComPreparacaoSeConfigurada(startTimer);
  } else {
    finalizarSessao();
  }
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
    let mSel = document.getElementById("pomo-materia").value || "Estudo Geral";
    document.getElementById("pomo-texto-top").innerText = "Foco absoluto";
    document.getElementById("pomo-texto-sub").innerText = mSel;
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
function abrirSeletorPausa() {
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
  try {
    persistirSessaoFinalizada();
  } catch (err) {
    console.error("Erro ao persistir sessão:", err);
  }

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
        notificarSemSegundoPlano(
          "🎉 Foco concluído!",
          "Você terminou o ciclo de foco. Hora de uma pausa.",
        );
      }

      emOvertime = true;
      tempoOvertimeAcumulado = 0;
      timestampInicioOvertime = Date.now();
      document.getElementById("timer-display").classList.add("overtime");
      atualizarBotaoCompletarSessao();
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

// Quando a aba volta a ficar visível, força uma atualização imediata em vez
// de esperar o próximo tick agendado (que o navegador pode ter atrasado
// bastante enquanto a aba estava em segundo plano), e para o título de
// piscar.
// Sincroniza a aba ativa do Timer de Preparação com o valor salvo no
// navegador assim que a página carrega (a aba de Tempo de Foco já nasce
// certa no HTML, então só precisamos ajustar a de Preparação aqui).
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".aba-tempo-preparo").forEach((btn) => {
    btn.classList.toggle(
      "aba-ativa",
      parseInt(btn.dataset.min, 10) === tempoPreparoMinutos,
    );
  });
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    // Se o timer expirou enquanto a aba estava oculta, toca o som agora
    if (alarmePendente && emOvertime) {
      iniciarAudioContext(); // reativa o áudio
      testarSomAtual();
      alarmePendente = false; // não toca de novo
    }
    if (timer) tickTimer();
    pararBlinkTitulo();
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
  document.getElementById("modal-distracao-container").style.display = "flex";
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
function persistirSessaoFinalizada() {
  const campoNota = document.getElementById("pomo-nota");
  const nota = campoNota ? campoNota.value.trim() : "";

  salvarProgressoGeral(cacheMateriaSessaoAtual, cacheMinutosSessaoAtual, nota);

  if (campoNota) campoNota.value = "";

  if (emOvertime) {
    registrarPomodoroConcluido();
  }

  cacheMinutosSessaoAtual = 0;
  cacheMateriaSessaoAtual = "";
}

function pularRegistroDistracao() {
  // 1. Limpa qualquer checkbox que possa ter sido marcado por engano
  const checkboxes = document.querySelectorAll(
    ".grade-checkbox-distracao input",
  );
  checkboxes.forEach((cb) => (cb.checked = false));

  // 2. Define o registro como foco limpo (exemplo de lógica)
  console.log("Foco 100% limpo registrado!");
  localStorage.setItem("ultimaAuditoria", JSON.stringify([]));

  // 3. Persiste a sessão e reseta o timer para a próxima. Envolvido em
  // try/catch para o modal nunca ficar "preso" na tela caso algo falhe aqui.
  try {
    persistirSessaoFinalizada();
  } catch (err) {
    console.error("Erro ao persistir sessão:", err);
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

function confirmarRegistroDistracao() {
  // 1. Capturar distrações selecionadas
  const checkboxes = document.querySelectorAll(
    ".grade-checkbox-distracao input:checked",
  );
  const distracoes = Array.from(checkboxes).map((cb) => cb.value);

  // 2. Persistir os dados (ajuste conforme a chave que você usa no seu app)
  // Exemplo: Salvar tempo de foco na meta do dia
  console.log("Distrações registradas:", distracoes);

  // 3. Persiste a sessão (tempo estudado + meta de pomodoros) e reseta o
  // estado do Pomodoro (isso zera o display). Envolvido em try/catch para
  // o modal nunca ficar "preso" na tela caso algo falhe aqui.
  try {
    persistirSessaoFinalizada();
  } catch (err) {
    console.error("Erro ao persistir sessão:", err);
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
function confirmarEResetar() {
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
    const confirmado = confirm(mensagem);
    if (!confirmado) return;
  }

  if (planoEstudo) {
    planoEstudo = null;
    atualizarPainelBlocoEstudos();
  }

  resetTimer();
}

function resetTimer() {
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
  display.innerText = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
}

// --- FORMULARIOS DO PERFIL E ESTATISTICAS ---
function salvarDadosPerfil(e) {
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
  alert("Perfil salvo com sucesso.");
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
function selecionarFotoPerfil(event) {
  const arquivo = event.target.files && event.target.files[0];
  if (!arquivo) return;

  if (!arquivo.type.startsWith("image/")) {
    alert("Escolha um arquivo de imagem (JPG, PNG, etc.).");
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
    img.onerror = () => {
      alert("Não consegui abrir essa imagem. Tente outro arquivo.");
    };
    img.src = leitor.result;
  };
  leitor.onerror = () => {
    alert("Não consegui ler esse arquivo. Tente novamente.");
  };
  leitor.readAsDataURL(arquivo);

  // Permite escolher o mesmo arquivo de novo depois (ex: trocar, remover,
  // trocar pela mesma foto original) sem o navegador ignorar por já ter
  // sido "selecionado" antes.
  event.target.value = "";
}

function removerFotoPerfil() {
  const confirmado = confirm(
    "Remover a foto de perfil e voltar a mostrar as iniciais do nome?",
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

  // 2. Maior Distração
  let mSabotador = "Nenhum";
  let maxOco = 0;
  let totInt = 0;
  Object.keys(bancoDistracoes).forEach((k) => {
    totInt += bancoDistracoes[k];
    if (bancoDistracoes[k] > maxOco) {
      maxOco = bancoDistracoes[k];
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
}

function atualizarCalculoStreak() {
  let hoje = new Date();
  let streak = 0;
  let verificandoData = new Date(hoje);
  let dataStrHoje = obterDataLocalString(verificandoData);
  verificandoData.setDate(verificandoData.getDate() - 1);
  let dataStrOntem = obterDataLocalString(verificandoData);

  if (
    !(historicoEstudos[dataStrHoje] > 0) &&
    !(historicoEstudos[dataStrOntem] > 0)
  ) {
    document.getElementById("streak-contador-val").innerText = `0 dias`;
    return 0;
  }
  verificandoData =
    historicoEstudos[dataStrHoje] > 0 ? new Date(hoje) : verificandoData;
  while (true) {
    let dataCheckStr = obterDataLocalString(verificandoData);
    if (historicoEstudos[dataCheckStr] > 0) {
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

function salvarProgressoGeral(materia, minutos, nota) {
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
  });
  localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));

  renderizarTodoOPainel();
}

function adicionarNovaMateria(e) {
  e.preventDefault();
  let nome = document.getElementById("mat-only-nome").value.trim();
  let metaVinculada = document.getElementById("mat-vinc-meta").value;
  let cor = document.getElementById("mat-only-cor").value;
  let peso = parseInt(document.getElementById("mat-only-peso").value, 10) || 1;

  if (!nome || !cor) return;

  const duplicada = materias.some(
    (m) => m.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (duplicada) {
    alert(
      `Já existe uma matéria chamada "${nome}". Escolha outro nome ou edite a existente na lista abaixo.`,
    );
    return;
  }

  materias.push({ nome, metaVinculada, cor, peso });
  localStorage.setItem("materias", JSON.stringify(materias));
  if (!tempoPorMateria[nome]) tempoPorMateria[nome] = 0;
  localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));

  document.getElementById("materia-only-form").reset();
  const corPadrao = paletaCores[0].hex;
  document.getElementById("mat-only-peso").value = 1;
  document.getElementById("mat-only-cor").value = corPadrao;
  renderizarEstrelasPeso(
    "peso-estrelas-container",
    "mat-only-peso",
    1,
    validarFormularioMateria,
  );
  renderizarSwatchesCor(
    "cor-swatches-container",
    "mat-only-cor",
    corPadrao,
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

// Constrói a grade de swatches de cor, reaproveitado no cadastro e na
// edição de matéria.
function renderizarSwatchesCor(containerId, hiddenInputId, hexAtual, aoMudar) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  paletaCores.forEach((cor) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cor-swatch" + (cor.hex === hexAtual ? " selecionada" : "");
    btn.style.background = cor.hex;
    btn.title = cor.nome;
    btn.addEventListener("click", () => {
      document.getElementById(hiddenInputId).value = cor.hex;
      renderizarSwatchesCor(containerId, hiddenInputId, cor.hex, aoMudar);
      if (aoMudar) aoMudar();
    });
    container.appendChild(btn);
  });
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
  const cor = document.getElementById("mat-only-cor").value;
  const btn = document.getElementById("btn-adicionar-materia");
  if (btn) btn.disabled = !(nome && cor);
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
    .filter(({ m }) => !filtro || (m.metaVinculada || "") === filtro);

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
      const vinculo = m.metaVinculada
        ? `🎯 ${escapeHtml(m.metaVinculada)}`
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

// Heurística antiga, mantida como reserva pra matérias que ainda não têm
// nenhum tópico cadastrado — assim quem não usa sub-tópicos ainda continua
// recebendo algum lembrete, baseado no peso de prioridade da matéria.
function calcularRevisoesPendentes() {
  const hoje = new Date();
  const resultado = [];

  obterMateriasDoFiltroAtivo().forEach((m) => {
    if ((m.topicos || []).length > 0) return; // essa matéria já usa o SM-2 por tópico

    const sessoesDaMateria = logsSessoes.filter((l) => l.materia === m.nome);
    if (sessoesDaMateria.length === 0) return;

    const dataMaisRecente = sessoesDaMateria.reduce(
      (max, l) => (l.data > max ? l.data : max),
      sessoesDaMateria[0].data,
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
  const algumaMateriaJaEstudada = materiasDoFiltro.some((m) =>
    logsSessoes.some((l) => l.materia === m.nome),
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
            <button
              type="button"
              class="revisao-btn-estudar"
              onclick="iniciarRevisaoRapida('${nomeEscapado}')"
            >
              ▶️ Revisar
            </button>
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
function iniciarRevisaoRapida(nomeMateria) {
  if (emEstadoDeFocoAtivo || emPausaConfig) {
    alert(
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
function registrarQuestoes(event) {
  event.preventDefault();

  const materia =
    document.getElementById("questoes-materia").value || "Estudo Geral";
  const total = parseInt(document.getElementById("questoes-total").value, 10);
  const acertos = parseInt(
    document.getElementById("questoes-acertos").value,
    10,
  );

  if (!total || total <= 0) {
    alert("Informe a quantidade total de questões (maior que zero).");
    return;
  }
  if (isNaN(acertos) || acertos < 0) {
    alert("Informe quantas você acertou (0 ou mais).");
    return;
  }
  if (acertos > total) {
    alert("Acertos não pode ser maior que o total de questões.");
    return;
  }

  registrosQuestoes.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: obterDataLocalString(new Date()),
    materia,
    total,
    acertos,
  });
  localStorage.setItem("registrosQuestoes", JSON.stringify(registrosQuestoes));

  document.getElementById("form-questoes").reset();
  mostrarToastGamificacao(
    "📝",
    "Questões registradas",
    `${acertos}/${total} acertos em ${materia}`,
  );
  renderizarQuestoesResolvidas();
}

function excluirRegistroQuestoes(id) {
  registrosQuestoes = registrosQuestoes.filter((r) => r.id !== id);
  localStorage.setItem("registrosQuestoes", JSON.stringify(registrosQuestoes));
  renderizarQuestoesResolvidas();
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

  const recentes = [...registrosDoFiltro].reverse().slice(0, 8);
  if (recentes.length === 0) {
    lista.innerHTML = filtroProva
      ? '<p class="sessoes-hoje-vazio">Nenhuma questão registrada para essa prova ainda.</p>'
      : '<p class="sessoes-hoje-vazio">Nenhuma questão registrada ainda.</p>';
    return;
  }

  lista.innerHTML = recentes
    .map((r) => {
      const pct = Math.round((r.acertos / r.total) * 100);
      return `
        <div class="questoes-item">
          <div class="questoes-item-info">
            <span class="questoes-item-materia">${escapeHtml(r.materia)}</span>
            <span class="questoes-item-detalhe">${r.acertos}/${r.total} acertos (${pct}%) · ${r.data.split("-").reverse().join("/")}</span>
          </div>
          <button type="button" onclick="excluirRegistroQuestoes('${r.id}')" title="Excluir registro">✕</button>
        </div>
      `;
    })
    .join("");
}

// --- SIMULADOS E PROVAS COMPLETAS ---
// Separado das "questões do dia a dia" (registrosQuestoes) de propósito:
// um simulado é um evento só, com nota final, que faz sentido acompanhar
// como uma série própria ao longo do tempo — não misturado com questões
// avulsas resolvidas estudando.
function registrarSimulado(event) {
  event.preventDefault();

  const nome = document.getElementById("simulado-nome").value.trim();
  const metaVinculada = document.getElementById("simulado-meta").value;
  const total = parseInt(document.getElementById("simulado-total").value, 10);
  const acertos = parseInt(
    document.getElementById("simulado-acertos").value,
    10,
  );

  if (!nome) {
    alert(
      "Dê um nome pro simulado (ex: 'Simulado SEDES 2026 - 2ª aplicação').",
    );
    return;
  }
  if (!total || total <= 0) {
    alert("Informe o total de questões do simulado (maior que zero).");
    return;
  }
  if (isNaN(acertos) || acertos < 0) {
    alert("Informe quantas você acertou (0 ou mais).");
    return;
  }
  if (acertos > total) {
    alert("Acertos não pode ser maior que o total de questões.");
    return;
  }

  registrosSimulados.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: obterDataLocalString(new Date()),
    nome,
    metaVinculada: metaVinculada || null,
    total,
    acertos,
  });
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
}

function excluirRegistroSimulado(id) {
  registrosSimulados = registrosSimulados.filter((r) => r.id !== id);
  localStorage.setItem(
    "registrosSimulados",
    JSON.stringify(registrosSimulados),
  );
  renderizarSimulados();
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

function iniciarSimuladoCronometrado(event) {
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
    alert("Dê um nome pro simulado.");
    return;
  }
  const duracaoSegundos = horas * 3600 + minutos * 60;
  if (duracaoSegundos <= 0) {
    alert("Informe a duração total da prova (maior que zero).");
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

function cancelarSimuladoCronometrado() {
  const confirmado = confirm(
    "Cancelar o simulado cronometrado? O tempo contado até agora não será registrado em lugar nenhum.",
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
        return `
        <div class="simulados-item">
          <div class="simulados-item-info">
            <span class="simulados-item-nome">${escapeHtml(r.nome)}</span>
            <span class="simulados-item-detalhe">${r.acertos}/${r.total} acertos (${pct}%) · ${vinculo} · ${r.data.split("-").reverse().join("/")}</span>
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
  renderizarSwatchesCor(
    "edit-cor-swatches-container",
    "edit-mat-cor",
    m.cor || paletaCores[0].hex,
  );

  const selectMeta = document.getElementById("edit-mat-vinc-meta");
  selectMeta.innerHTML = '<option value="">Matéria Isolada</option>';
  metas.forEach((meta) => {
    const opt = document.createElement("option");
    opt.value = meta.objetivoNome;
    opt.textContent = meta.objetivoNome;
    selectMeta.appendChild(opt);
  });
  selectMeta.value = m.metaVinculada || "";

  renderizarTopicosEdicao();

  document.getElementById("modal-editar-materia").style.display = "flex";
}

function fecharModalEditarMateria() {
  document.getElementById("modal-editar-materia").style.display = "none";
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
function importarTopicosEmLote(event) {
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
    alert("Cole ao menos um tópico, um por linha.");
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
  alert(msg);
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

function salvarEdicaoMateria() {
  const indice = parseInt(document.getElementById("edit-mat-indice").value, 10);
  const m = materias[indice];
  if (!m) return;

  const novoNome = document.getElementById("edit-mat-nome").value.trim();
  if (!novoNome) {
    alert("O nome da matéria não pode ficar vazio.");
    return;
  }

  const duplicada = materias.some(
    (outra, i) =>
      i !== indice &&
      outra.nome.trim().toLowerCase() === novoNome.toLowerCase(),
  );
  if (duplicada) {
    alert(`Já existe outra matéria chamada "${novoNome}".`);
    return;
  }

  const nomeAntigo = m.nome;
  const novaCor = document.getElementById("edit-mat-cor").value;
  const novoPeso =
    parseInt(document.getElementById("edit-mat-peso").value, 10) || 1;
  const novaMeta = document.getElementById("edit-mat-vinc-meta").value;

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
    metaVinculada: novaMeta,
    cor: novaCor,
    peso: novoPeso,
  };
  localStorage.setItem("materias", JSON.stringify(materias));

  fecharModalEditarMateria();
  mostrarToastGamificacao("✏️", "Matéria Atualizada", novoNome);
  renderizarTodoOPainel();
}

function excluirMateria(indice) {
  const m = materias[indice];
  if (!m) return;

  const confirmado = confirm(
    `Excluir a matéria "${m.nome}"? O histórico de tempo já estudado nela permanece nas estatísticas, mas ela deixa de aparecer nos seletores e no cadastro.`,
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

  metas.push({ objetivoNome, dataLimite, qtdMaterias });
  localStorage.setItem("metas", JSON.stringify(metas));

  document.getElementById("meta-only-form").reset();
  renderizarTodoOPainel();
}

function atualizarDropdowns() {
  const selectPomo = document.getElementById("pomo-materia");
  const selectVincMeta = document.getElementById("mat-vinc-meta");
  if (selectPomo && selectVincMeta) {
    // Guarda a seleção atual antes de reconstruir as opções — sem isso, a
    // matéria da sessão em andamento voltava para "Estudo Geral" toda vez
    // que o painel era re-renderizado (ex: ao completar uma sessão).
    const valorAtualPomo = selectPomo.value;
    const valorAtualVincMeta = selectVincMeta.value;

    selectPomo.innerHTML = '<option value="">Estudo Geral</option>';
    selectVincMeta.innerHTML = '<option value="">Matéria Isolada</option>';
    obterMateriasOrdenadasPorPeso().forEach((m) => {
      selectPomo.innerHTML += `<option value="${m.nome}">${m.nome}</option>`;
    });
    metas.forEach((m) => {
      selectVincMeta.innerHTML += `<option value="${m.objetivoNome}">${m.objetivoNome}</option>`;
    });

    // Restaura a seleção anterior, se a opção ainda existir
    if ([...selectPomo.options].some((o) => o.value === valorAtualPomo)) {
      selectPomo.value = valorAtualPomo;
    }
    if (
      [...selectVincMeta.options].some((o) => o.value === valorAtualVincMeta)
    ) {
      selectVincMeta.value = valorAtualVincMeta;
    }
  }
}

// --- PROVA/EXAME EM FOCO (filtro de estatísticas por meta) ---
// Cada "meta" já representa uma prova/exame (objetivoNome + data + qtd. de
// tópicos do edital), e cada matéria pode estar vinculada a uma delas
// (m.metaVinculada). Esse filtro só decide QUAL prova está "em foco" pra
// fins de exibição — ele não separa os dados em áreas diferentes do
// localStorage, então nada é duplicado nem perdido ao trocar de prova.
function obterMetaFiltroAtiva() {
  return localStorage.getItem("metaFiltroAtivo") || "";
}

// "" (Todas as Provas) sempre retorna a lista completa de matérias.
function obterMateriasDoFiltroAtivo() {
  const filtro = obterMetaFiltroAtiva();
  if (!filtro) return materias;
  return materias.filter((m) => (m.metaVinculada || "") === filtro);
}

// Chips de seleção (Todas as Provas + uma por meta cadastrada). Só aparece
// quando existe pelo menos uma meta — sem metas, não tem o que alternar.
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
  let html = `<button type="button" class="prova-pill${filtro === "" ? " prova-pill-ativa" : ""}" onclick="selecionarProvaAtiva('')">📚 Todas as Provas</button>`;

  metas.forEach((meta) => {
    const nomeEscapadoJs = String(meta.objetivoNome).replace(/'/g, "\\'");
    const ativa = filtro === meta.objetivoNome;
    html += `<button type="button" class="prova-pill${ativa ? " prova-pill-ativa" : ""}" onclick="selecionarProvaAtiva('${nomeEscapadoJs}')">🎯 ${escapeHtml(meta.objetivoNome)}</button>`;
  });

  lista.innerHTML = html;
}

// Troca a prova em foco e redesenha tudo que depende dela (gráfico, lista
// de matérias cadastradas, revisão pendente, questões e o widget de meta).
function selecionarProvaAtiva(nomeObjetivo) {
  localStorage.setItem("metaFiltroAtivo", nomeObjetivo);
  renderizarTodoOPainel();
}

// Remove uma meta/prova. As matérias vinculadas a ela viram "Matéria
// Isolada" (nada é apagado do histórico de tempo já estudado).
function excluirMeta(indice) {
  const meta = metas[indice];
  if (!meta) return;

  const confirmado = confirm(
    `Excluir a prova "${meta.objetivoNome}"? As matérias vinculadas a ela passam a ficar como "Matéria Isolada" — o histórico de tempo estudado nelas é mantido.`,
  );
  if (!confirmado) return;

  materias.forEach((m) => {
    if (m.metaVinculada === meta.objetivoNome) m.metaVinculada = "";
  });
  localStorage.setItem("materias", JSON.stringify(materias));

  metas.splice(indice, 1);
  localStorage.setItem("metas", JSON.stringify(metas));

  if (obterMetaFiltroAtiva() === meta.objetivoNome) {
    localStorage.setItem("metaFiltroAtivo", "");
  }

  renderizarTodoOPainel();
}

// --- COMPARATIVO ENTRE PROVAS (tempo, tópicos e % de acerto por meta) ---
function calcularEstatisticasPorProva() {
  const hoje = new Date();

  return metas.map((meta) => {
    const materiasDaMeta = materias.filter(
      (m) => (m.metaVinculada || "") === meta.objetivoNome,
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

// --- RITMO SUGERIDO POR MATÉRIA (tópicos restantes ÷ dias até a prova) ---
// Só entram matérias vinculadas a uma meta e que já têm tópicos cadastrados
// (sem tópicos não dá pra saber "quanto falta"). Respeita o filtro de prova
// em foco: com uma prova específica selecionada, mostra só as matérias
// dela; com "Todas as Provas", mostra de todas.
function calcularRitmoSugerido() {
  const hoje = new Date();

  return obterMateriasDoFiltroAtivo()
    .filter((m) => m.metaVinculada && (m.topicos || []).length > 0)
    .map((m) => {
      const meta = metas.find((mt) => mt.objetivoNome === m.metaVinculada);
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
      return `<div class="materia-item"${destacada ? ' style="border-left:5px solid var(--success); outline:2px solid var(--accent-text);"' : ' style="border-left:5px solid var(--success);"'}>
        <strong>🎯 ${escapeHtml(meta.objetivoNome)}</strong> - Prova planejada para: ${dataFormatada} (Tópicos do edital: ${meta.qtdMaterias})
        <button type="button" title="Excluir esta prova" onclick="excluirMeta(${i})" style="float:right; background:none; border:none; color:var(--danger); cursor:pointer; font-size:1rem;">✕</button>
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

    widgetConteudo.innerHTML = `
                <div class="meta-stat-row"><div class="meta-stat-lbl">${filtroAtivo ? "Prova em Foco" : "Meta Principal Ativa"}</div><div class="meta-stat-val" style="color:var(--accent-text);">${escapeHtml(metaAtiva.objetivoNome)}</div></div>
                <div class="meta-stat-row"><div class="meta-stat-lbl">Tópicos Totais</div><div class="meta-stat-val"><span class="meta-highlight">${metaAtiva.qtdMaterias}</span> conteúdos no edital</div></div>
                <div class="meta-stat-row"><div class="meta-stat-lbl">Dias para a Prova</div><div class="meta-countdown" style="font-size:1.4rem;">${dRestantes > 0 ? dRestantes : 0} dias restantes</div></div>`;
  }
}

// Lista as sessões de hoje (mais recente primeiro), cada uma com botão de
// excluir — remove do logsSessoes e reverte o impacto no tempo total e por
// matéria, pra estatísticas não ficarem incoerentes com um registro errado.
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

function excluirSessaoDoDia(indice) {
  const sessao = logsSessoes[indice];
  if (!sessao) return;

  const confirmado = confirm(
    `Excluir a sessão de "${sessao.materia}" (${sessao.duracao} min, ${sessao.hora})?\n\nIsso subtrai o tempo do total do dia e da matéria. O contador de pomodoros da meta não é alterado.`,
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
function excluirSessaoHistorico7Dias(indice) {
  const sessao = logsSessoes[indice];
  if (!sessao) return;

  const dataFormatada = sessao.data.split("-").reverse().join("/");
  const confirmado = confirm(
    `Excluir a sessão de "${sessao.materia}" (${sessao.duracao} min, ${dataFormatada} às ${sessao.hora})?\n\nIsso subtrai o tempo do total do dia e da matéria. O contador de pomodoros da meta não é alterado.`,
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
    return;
  }

  const nomesMaterias = entradasOrdenadas.map(([nome]) => nome);
  const valores = entradasOrdenadas.map(([, min]) => min);

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

  // Rótulos com o tempo total (h/min) embutido no próprio texto — assim a
  // legenda herda a cor/fonte padrão do gráfico sem precisar de um
  // renderizador de legenda customizado.
  const labelsComTempo = nomesMaterias.map(
    (nome, i) => `${nome} — ${formatarHorasMinutos(valores[i])}`,
  );

  if (meuGrafico instanceof Chart) {
    meuGrafico.destroy();
  }

  // Lê as cores do tema (CSS vars) para o gráfico ficar harmonioso com o
  // resto da página, em vez de tons fixos que podem destoar.
  const estiloRaiz = getComputedStyle(document.documentElement);
  const corTextoMuted =
    estiloRaiz.getPropertyValue("--text-muted").trim() || "#94a3b8";
  const corCardBg =
    estiloRaiz.getPropertyValue("--card-bg").trim() || "#1e293b";
  const fonteApp = getComputedStyle(document.body).fontFamily || "sans-serif";

  meuGrafico = new Chart(canvas.getContext("2d"), {
    type: "pie",

    data: {
      labels: labelsComTempo,

      datasets: [
        {
          data: valores,
          backgroundColor: cores,
          borderWidth: 2,
          borderColor: corCardBg,
          hoverOffset: 6,
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
            color: corTextoMuted,
            font: { family: fonteApp, size: 12 },
            boxWidth: 14,
            boxHeight: 14,
            padding: 12,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          bodyFont: { family: fonteApp },
          titleFont: { family: fonteApp },
          callbacks: {
            label: (contexto) => {
              const nome = nomesMaterias[contexto.dataIndex];
              return ` ${nome}: ${formatarHorasMinutos(contexto.parsed)}`;
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
  renderizarGrafico();
  atualizarProgressoPomodoros();
  renderizarTaxaConclusao();
  renderizarGamificacao();
  renderizarMateriasCadastradas();
  renderizarRevisaoPendente();
  renderizarQuestoesResolvidas();
  renderizarSimulados();
  renderizarComparativoProvas();
  renderizarRitmoSugerido();
  renderizarEvolucaoTemporal();
  renderizarHeatmapHorario();
  renderizarRecomendacaoHoje();
}

// Inicialização do formulário de cadastro de matéria (estrelas + swatches)
if (document.getElementById("peso-estrelas-container")) {
  renderizarEstrelasPeso(
    "peso-estrelas-container",
    "mat-only-peso",
    1,
    validarFormularioMateria,
  );
  renderizarSwatchesCor(
    "cor-swatches-container",
    "mat-only-cor",
    paletaCores[0].hex,
    validarFormularioMateria,
  );
  document.getElementById("mat-only-cor").value = paletaCores[0].hex;
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
      const materiasDaMeta = materias.filter(
        (m) => m.metaVinculada === meta.objetivoNome,
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

// Reúne as métricas cruas usadas tanto para calcular XP quanto para
// verificar as condições das conquistas.
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

  return {
    minutosTotais,
    pomodorosTotais,
    streakAtual,
    materiasEstudadas,
    diasComMetaBatida,
    diasComMetaBatidaSeguidos,
    temSessaoMadrugada,
    temSessaoNoturna,
  };
}

function calcularXPTotal(stats) {
  // 1 XP por minuto estudado + 15 XP por pomodoro completo + 10 XP por dia
  // de streak atual
  return (
    stats.minutosTotais * 1 +
    stats.pomodorosTotais * 15 +
    stats.streakAtual * 10
  );
}

const CONQUISTAS = [
  {
    id: "streak3",
    nome: "3 Dias Seguidos",
    desc: "Estudou 3 dias seguidos",
    icone: "🔥",
    check: (s) => s.streakAtual >= 3,
  },
  {
    id: "streak7",
    nome: "7 Dias Seguidos",
    desc: "Estudou 7 dias seguidos",
    icone: "🔥",
    check: (s) => s.streakAtual >= 7,
  },
  {
    id: "streak30",
    nome: "30 Dias Seguidos",
    desc: "Estudou 30 dias seguidos",
    icone: "🔥",
    check: (s) => s.streakAtual >= 30,
  },
  {
    id: "horas10",
    nome: "10 Horas Totais",
    desc: "Acumulou 10h de estudo",
    icone: "⏱️",
    check: (s) => s.minutosTotais >= 600,
  },
  {
    id: "horas50",
    nome: "50 Horas Totais",
    desc: "Acumulou 50h de estudo",
    icone: "⏱️",
    check: (s) => s.minutosTotais >= 3000,
  },
  {
    id: "horas100",
    nome: "100 Horas Totais",
    desc: "Acumulou 100h de estudo",
    icone: "⏱️",
    check: (s) => s.minutosTotais >= 6000,
  },
  {
    id: "pomo10",
    nome: "10 Pomodoros",
    desc: "Completou 10 pomodoros",
    icone: "🍅",
    check: (s) => s.pomodorosTotais >= 10,
  },
  {
    id: "pomo50",
    nome: "50 Pomodoros",
    desc: "Completou 50 pomodoros",
    icone: "🍅",
    check: (s) => s.pomodorosTotais >= 50,
  },
  {
    id: "pomo100",
    nome: "100 Pomodoros",
    desc: "Completou 100 pomodoros",
    icone: "🍅",
    check: (s) => s.pomodorosTotais >= 100,
  },
  {
    id: "meta5x",
    nome: "Disciplinado",
    desc: "Bateu a meta do dia 5 vezes",
    icone: "🎯",
    check: (s) => s.diasComMetaBatida >= 5,
  },
  {
    id: "meta7seguidos",
    nome: "Semana Perfeita",
    desc: "Bateu a meta 7 dias seguidos",
    icone: "🏆",
    check: (s) => s.diasComMetaBatidaSeguidos >= 7,
  },
  {
    id: "materias3",
    nome: "Multidisciplinar",
    desc: "Estudou 3 matérias diferentes",
    icone: "📚",
    check: (s) => s.materiasEstudadas >= 3,
  },
  {
    id: "materias5",
    nome: "Renascentista",
    desc: "Estudou 5 matérias diferentes",
    icone: "📚",
    check: (s) => s.materiasEstudadas >= 5,
  },
  {
    id: "madrugador",
    nome: "Madrugador",
    desc: "Estudou antes das 7h",
    icone: "🌅",
    check: (s) => s.temSessaoMadrugada,
  },
  {
    id: "coruja",
    nome: "Coruja",
    desc: "Estudou depois das 23h",
    icone: "🦉",
    check: (s) => s.temSessaoNoturna,
  },
];

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

  const xpFill = document.getElementById("perfil-xp-barra-fill");
  if (xpFill) xpFill.style.width = `${percentual}%`;

  const xpTexto = document.getElementById("perfil-xp-texto");
  if (xpTexto) {
    xpTexto.innerText = `${xpAtualNoNivel} / ${xpNecessarioNesteNivel} XP`;
  }

  // --- Conquistas: verifica quais estão desbloqueadas ---
  const desbloqueadasAntes = JSON.parse(
    localStorage.getItem("conquistasDesbloqueadas") || "[]",
  );
  const desbloqueadasAgora = [];
  const novasDesbloqueadas = [];

  CONQUISTAS.forEach((c) => {
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

  const gridConquistas = document.getElementById("grid-conquistas");
  if (gridConquistas) {
    gridConquistas.innerHTML = CONQUISTAS.map((c) => {
      const desbloqueada = desbloqueadasAgora.includes(c.id);
      return `
        <div class="conquista-card ${desbloqueada ? "desbloqueada" : "bloqueada"}">
          <div class="conquista-icone">${c.icone}</div>
          <div>
            <div class="conquista-nome">${escapeHtml(c.nome)}</div>
            <div class="conquista-desc">${escapeHtml(c.desc)}</div>
          </div>
        </div>
      `;
    }).join("");
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

// --- BACKUP: EXPORTAR / IMPORTAR DADOS ---
// Lista de todas as chaves do localStorage usadas pelo app. Se um novo
// recurso passar a usar uma chave nova, adicione ela aqui também.
// (Essa mesma lista é reaproveitada por js/auth-sync.js pra decidir o que
// sincronizar com a nuvem quando o login estiver configurado.)
const CHAVES_BACKUP = [
  "bancoDistracoes",
  "conquistasDesbloqueadas",
  "dadosPerfil",
  "fotoPerfilBase64",
  "historicoEstudos",
  "historicoFoco",
  "logsSessoes",
  "materias",
  "metaFiltroAtivo",
  "metaPomodorosDiaria",
  "metas",
  "pomosIniciadosPorDia",
  "pomosPorDia",
  "registrosQuestoes",
  "registrosSimulados",
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
  leitor.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup || typeof backup.dados !== "object") {
        throw new Error("Arquivo de backup inválido.");
      }

      const confirmado = confirm(
        "Importar esse backup vai SUBSTITUIR todos os dados atuais (matérias, histórico, XP, conquistas, tarefas, tudo). Essa ação não pode ser desfeita. Quer continuar?",
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

      alert("Backup importado com sucesso! A página vai recarregar agora.");
      location.reload();
    } catch (err) {
      console.error("Erro ao importar backup:", err);
      alert(
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
  metas = JSON.parse(localStorage.getItem("metas")) || [];
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
  registrosSimulados =
    JSON.parse(localStorage.getItem("registrosSimulados")) || [];
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
  renderizarTodoOPainel();
  renderizarTarefas();
  atualizarProgressoPomodoros();
  verificarSimuladoCronometradoEmAndamento();
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

// ============================================================
// PWA: SERVICE WORKER + INSTALAÇÃO COMO APP
// ============================================================
// Registra o service worker (cache do app shell pra abrir offline).
// Roda em qualquer navegador que suporte; nos que não suportam, o app
// continua funcionando 100% normal, só sem o modo offline.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((err) => console.error("Falha ao registrar service worker:", err));
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
    ],
  },
  {
    categoria: "📚 Matérias e Metas",
    itens: [
      "Matérias com cor, peso de prioridade e vínculo a uma meta",
      "Sub-tópicos do edital por matéria, com progresso",
      "Metas com data da prova e contagem regressiva",
      "Revisão espaçada com algoritmo SM-2 (estilo Anki)",
      "Questões resolvidas e simulados/provas completas, com histórico",
    ],
  },
  {
    categoria: "📊 Análises",
    itens: [
      "Heatmap de constância (estilo GitHub) e calendário compacto",
      "Gráfico de evolução ao longo do tempo (horas e % de acerto)",
      "Heatmap de produtividade por horário do dia",
      "Comparação entre a semana atual e a anterior",
      "Previsão de conclusão do edital no ritmo atual",
      "Exportar relatório de estudos em PDF",
    ],
  },
  {
    categoria: "🏆 Gamificação",
    itens: [
      "XP, níveis e conquistas desbloqueáveis",
      "Sequência de dias seguidos de foco",
      "Tarefas do dia a dia",
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
function apagarEstatisticasGerais() {
  const confirmado = confirm(
    "Apagar TODAS as estatísticas gerais? Isso zera histórico de foco, heatmap, sequência, XP, conquistas, questões e simulados registrados. Matérias, metas e tarefas cadastradas continuam. Essa ação não pode ser desfeita.",
  );
  if (!confirmado) return;

  CHAVES_ESTATISTICAS_GERAIS.forEach((chave) => localStorage.removeItem(chave));

  alert("Estatísticas gerais apagadas! A página vai recarregar agora.");
  location.reload();
}

// Apaga só o tempo estudado, as sessões e as questões registradas de UMA
// matéria (a escolhida no select). A matéria em si continua cadastrada.
function apagarEstatisticasMateria() {
  const seletor = document.getElementById("gerenciar-dados-materia");
  const nome = seletor ? seletor.value : "";
  if (!nome) {
    alert("Escolha uma matéria.");
    return;
  }

  const confirmado = confirm(
    `Apagar todas as estatísticas de "${nome}"? Isso remove o tempo estudado, as sessões e as questões registradas dessa matéria. A matéria continua cadastrada. Essa ação não pode ser desfeita.`,
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

  alert(`Estatísticas de "${nome}" apagadas! A página vai recarregar agora.`);
  location.reload();
}

// Apaga só os simulados registrados vinculados a UMA meta/prova (a
// escolhida no select). A meta em si continua cadastrada.
function apagarEstatisticasMeta() {
  const seletor = document.getElementById("gerenciar-dados-meta");
  const nomeMeta = seletor ? seletor.value : "";
  if (!nomeMeta) {
    alert("Escolha uma prova/meta.");
    return;
  }

  const confirmado = confirm(
    `Apagar as estatísticas de simulados vinculados a "${nomeMeta}"? A meta continua cadastrada. Essa ação não pode ser desfeita.`,
  );
  if (!confirmado) return;

  registrosSimulados = registrosSimulados.filter(
    (r) => r.metaVinculada !== nomeMeta,
  );
  localStorage.setItem(
    "registrosSimulados",
    JSON.stringify(registrosSimulados),
  );

  alert(
    `Estatísticas de "${nomeMeta}" apagadas! A página vai recarregar agora.`,
  );
  location.reload();
}
