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
let bancoDistracoes = JSON.parse(localStorage.getItem("bancoDistracoes")) || {
  Celular: 0,
  Filhos: 0,
  Barulho: 0,
  Família: 0,
  Pets: 0,
  Televisão: 0,
};

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

// Variáveis Heatmap & Calendário
let modoAtual = "github";
let mesesParaExibir = 1;

const paletaCores = [
  { nome: "🔵 Azul", hex: "#3b82f6" },
  { nome: "🟢 Verde", hex: "#10b981" },
  { nome: "🟠 Laranja", hex: "#f97316" },
  { nome: "🔴 Vermelho", hex: "#ef4444" },
  { nome: "🔮 Roxo", hex: "#8b5cf6" },
  { nome: "🐳 Ciano", hex: "#06b6d4" },
  { nome: "🌸 Rosa", hex: "#ec4899" },
  { nome: "🍯 Amarelo", hex: "#f59e0b" },
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

// Mostra uma frase motivacional/provérbio aleatório no início do foco.
function exibirFraseMotivacional() {
  const container = document.getElementById("frase-do-dia");
  if (!container) return;
  const frase = selecionarItemAleatorio(FRASES_MOTIVACIONAIS);
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
  const dica = selecionarItemAleatorio(DICAS_DESCANSO_SAUDE);
  container.className = "frase-foco-container tema-saude";
  container.innerHTML = `<p class="frase-texto">${dica}</p>`;
}

// --- NAVEGAÇÃO ---
function navegarPara(pagina) {
  document.getElementById("pagina-painel").style.display =
    pagina === "painel" ? "block" : "none";
  document.getElementById("pagina-perfil").style.display =
    pagina === "perfil" ? "block" : "none";
  document
    .getElementById("nav-painel")
    .classList.toggle("active", pagina === "painel");
  document
    .getElementById("nav-perfil")
    .classList.toggle("active", pagina === "perfil");
  if (pagina === "painel") {
    renderizarTodoOPainel();
  } else {
    calcularEMostrarEstatisticas();
    carregarDadosPerfil();
    renderizarAnaliseEstudos();
    renderizarGamificacao();
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
const SONS_AMBIENTE_CONFIG = {
  // Chuva: ruído rosa "puro" já soa naturalmente como uma chuva/cachoeira
  // contínua (é um efeito bem conhecido em síntese de áudio). O filtro
  // passa-faixa estreito usado antes (bandpass, Q baixo) isolava uma banda
  // fina de frequência, o que dá um som mais "oco"/"vento em túnel" do que
  // chuva de verdade. Um passa-altas suave só tira o grave abafado que
  // sobra do ruído rosa, deixando o "sssh" contínuo da chuva limpo.
  chuva: {
    label: "🌧️ Chuva",
    cor: "rosa",
    filtro: { tipo: "highpass", freq: 350, Q: 0.7 },
  },
  // Escritório real é, na prática, o zumbido baixo do ar-condicionado
  // somado a um murmúrio distante de conversas/teclado — não o grave
  // profundo e "oceânico" do ruído marrom usado antes. Ruído rosa com um
  // corte um pouco mais alto (900Hz) mantém esse corpo mais neutro e deixa
  // passar um pouco mais de médio, que é o que dá a sensação de murmúrio.
  escritorio: {
    label: "🏢 Escritório",
    cor: "rosa",
    filtro: { tipo: "lowpass", freq: 900, Q: 0.5 },
  },
  // Biblioteca é o ambiente mais silencioso dos três na vida real: quase
  // silêncio total, com um chiado bem suave e abafado ao fundo. Por isso
  // o corte de frequência mais baixo (mais abafado) e o volume máximo
  // reduzido, pra ficar sutil mesmo no volume máximo do controle.
  biblioteca: {
    label: "📚 Biblioteca",
    cor: "rosa",
    filtro: { tipo: "lowpass", freq: 550, Q: 0.3 },
    volumeMax: 0.35,
  },
  branco: { label: "⚪ Ruído Branco", cor: "branco" },
  rosa: { label: "🌸 Ruído Rosa", cor: "rosa" },
  marrom: { label: "🟤 Ruído Marrom", cor: "marrom" },
};

let sonsAmbienteNodes = {}; // { chave: { source, gain, filtro } }
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

  ultimoNode.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();

  sonsAmbienteNodes[chave] = { source, gain, filtro };
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

// Monta as <option> de matéria para uma linha do bloco, com "Estudo Geral"
// como opção padrão (igual ao seletor principal de matéria da sessão).
function opcoesMateriaBlocoHTML(valorSelecionado) {
  let html = `<option value="Estudo Geral">Estudo Geral</option>`;
  materias.forEach((m) => {
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
// bloco. quantidadeInicial permite pré-preencher (usado pelos 2 itens de
// exemplo abertos junto com o modal).
function adicionarItemBloco(quantidadeInicial) {
  const lista = document.getElementById("bloco-estudos-itens-lista");
  if (!lista) return;
  const idx = contadorItensBloco++;
  const linha = document.createElement("div");
  linha.className = "bloco-item-row";
  linha.dataset.idx = idx;
  linha.innerHTML = `
    <select class="bloco-item-materia">${opcoesMateriaBlocoHTML()}</select>
    <input type="number" class="bloco-item-qtd" min="1" max="10" value="${quantidadeInicial || 1}" title="Quantidade de pomodoros" />
    <span class="bloco-item-label">pomodoro(s)</span>
    <button type="button" class="bloco-item-remover" onclick="removerItemBloco(${idx})" title="Remover matéria do bloco">✕</button>
  `;
  lista.appendChild(linha);
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
    document.body.classList.add("modo-isolamento-ativo");
    document.getElementById("pomodoro-header-titulo").style.display = "none";
    let mSel = document.getElementById("pomo-materia").value || "Estudo Geral";
    document.getElementById("pomo-texto-top").innerText = "Foco absoluto";
    document.getElementById("pomo-texto-sub").innerText = mSel;
    document.getElementById("pomo-container-titulos").style.display = "flex";
    exibirFraseMotivacional();

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
  document.body.classList.remove("modo-isolamento-ativo");
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
  document.body.classList.add("modo-isolamento-ativo");
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
    document.body.classList.remove("modo-isolamento-ativo");
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
  tempoBaseEscolhidoMinutos = minutos;
  emOvertime = false;
  tempoOvertimeAcumulado = 0;
  emPausaConfig = true;

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
      testarSomAtual();
      emOvertime = true;
      tempoOvertimeAcumulado = 0;
      timestampInicioOvertime = Date.now();
      document.getElementById("timer-display").classList.add("overtime");
      atualizarBotaoCompletarSessao();
      notificarSeEmSegundoPlano(
        "🎉 Foco concluído!",
        "Você terminou o ciclo de foco. Hora de uma pausa.",
      );
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

  document.body.classList.remove("modo-isolamento-ativo");
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

  container.innerHTML = materias
    .map((m, i) => {
      const peso = m.peso || 1;
      const estrelas = "★".repeat(peso) + "☆".repeat(5 - peso);
      const vinculo = m.metaVinculada
        ? `🎯 ${escapeHtml(m.metaVinculada)}`
        : "Isolada";
      return `
        <div class="materia-cadastrada-card">
          <span class="materia-cadastrada-dot" style="background:${m.cor || "#64748b"}"></span>
          <div class="materia-cadastrada-info">
            <span class="materia-cadastrada-nome">${escapeHtml(m.nome)}</span>
            <span class="materia-cadastrada-meta">${estrelas} • ${vinculo}</span>
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

  document.getElementById("modal-editar-materia").style.display = "flex";
}

function fecharModalEditarMateria() {
  document.getElementById("modal-editar-materia").style.display = "none";
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
    materias.forEach((m) => {
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

// --- RENDERIZADORES DE TELA (METAS, HISTÓRICO, HEATMAP E GRÁFICOS) ---
function renderizarMetasEGraficos() {
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

  metas.forEach((meta) => {
    let dataFormatada = new Date(
      meta.dataLimite + "T23:59:59",
    ).toLocaleDateString("pt-BR");
    lista.innerHTML += `<div class="materia-item" style="border-left:5px solid var(--success);"><strong>🎯 ${meta.objetivoNome}</strong> - Prova planejada para: ${dataFormatada} (Tópicos do edital: ${meta.qtdMaterias})</div>`;
  });

  let metaAtiva = metas[metas.length - 1];
  if (widgetConteudo) {
    let hoje = new Date();
    let prazo = new Date(metaAtiva.dataLimite + "T23:59:59");
    let dRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));

    widgetConteudo.innerHTML = `
                <div class="meta-stat-row"><div class="meta-stat-lbl">Meta Principal Ativa</div><div class="meta-stat-val" style="color:var(--accent-text);">${metaAtiva.objetivoNome}</div></div>
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
        HTMLDia += `
                        <div class="sessao-item">
                            <span class="materia-nome"><span style="display:inline-block; width:8px; height:8px; background:${corMat}; border-radius:50%; margin-right:6px;"></span>${s.materia}</span>
                            <span class="detalhes"><span>+${s.duracao} min</span> <span style="color:#64748b;">🕒 ${s.hora}</span></span>
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
  const mapaTempo = {};
  Object.keys(tempoPorMateria).forEach((nome) => {
    if (tempoPorMateria[nome] > 0) {
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
  renderizarGamificacao();
  renderizarMateriasCadastradas();
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

// --- TAREFAS (widget lateral) ---
let tarefas = JSON.parse(localStorage.getItem("tarefas")) || [];

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
  "historicoEstudos",
  "historicoFoco",
  "logsSessoes",
  "materias",
  "metaPomodorosDiaria",
  "metas",
  "pomosPorDia",
  "tarefas",
  "tempoPorMateria",
  "totalOvertimeGeralMinutos",
  "ultimaAuditoria",
  "ultimoNivelVisto",
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
}
