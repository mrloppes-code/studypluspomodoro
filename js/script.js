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
let emEstadoDeFocoAtivo = false;
let timer = null;
let tempoRestante = 25 * 60;
let emPausaConfig = false;
let emOvertime = false;
let tempoOvertimeAcumulado = 0;
let tempoBaseEscolhidoMinutos = 25;
let meuGrafico = null;
let audioCtx = null;

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

// --- TIMING / POMODORO ---
function gerenciarBotaoFocoPrincipal() {
  if (!emEstadoDeFocoAtivo && !emPausaConfig) {
    startTimer();
  } else {
    finalizarSessao();
  }
}

function startTimer() {
  iniciarAudioContext();
  clearInterval(timer);
  emEstadoDeFocoAtivo = true;

  const btnPrincipal = document.getElementById("btn-start");
  btnPrincipal.innerText = "Finalizar";
  btnPrincipal.style.background = "var(--danger)";

  document.getElementById("pomo-foco").disabled = true;
  document.getElementById("pomo-pausa").disabled = true;

  if (!emPausaConfig) {
    document.body.classList.add("modo-isolamento-ativo");
    document.getElementById("pomodoro-header-titulo").style.display = "none";
    let mSel = document.getElementById("pomo-materia").value || "Estudo Geral";
    document.getElementById("pomo-texto-top").innerText = "Foco absoluto";
    document.getElementById("pomo-texto-sub").innerText = mSel;
    document.getElementById("pomo-container-titulos").style.display = "flex";
  }

  timer = setInterval(() => {
    if (!emOvertime && !emPausaConfig) {
      if (tempoRestante > 0) {
        tempoRestante--;
        atualizarDisplay(tempoRestante);
      } else {
        testarSomAtual();
        emOvertime = true;
        tempoOvertimeAcumulado = 0;
        document.getElementById("timer-display").classList.add("overtime");
      }
    } else if (emOvertime) {
      tempoOvertimeAcumulado++;
      atualizarDisplay(tempoOvertimeAcumulado);
    } else if (emPausaConfig) {
      if (tempoRestante > 0) {
        tempoRestante--;
        atualizarDisplay(tempoRestante);
      } else {
        clearInterval(timer);
        ticarSom("sino");
        emPausaConfig = false;
        resetTimer();
      }
    }
  }, 1000);
}

function finalizarSessao() {
  clearInterval(timer);
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

function pularRegistroDistracao() {
  salvarProgressoGeral(cacheMateriaSessaoAtual, cacheMinutosSessaoAtual);
  fecharModalDistracao();
}

function confirmarRegistroDistracao() {
  const checkboxes = document.querySelectorAll(
    '#modal-distracao-container input[type="checkbox"]',
  );
  checkboxes.forEach((cb) => {
    if (cb.checked) {
      bancoDistracoes[cb.value] = (bancoDistracoes[cb.value] || 0) + 1;
    }
  });
  localStorage.setItem("bancoDistracoes", JSON.stringify(bancoDistracoes));
  salvarProgressoGeral(cacheMateriaSessaoAtual, cacheMinutosSessaoAtual);
  fecharModalDistracao();
}

function resetTimer() {
  if (timer) clearInterval(timer);
  timer = null;
  emOvertime = false;
  emPausaConfig = false;
  tempoOvertimeAcumulado = 0;
  emEstadoDeFocoAtivo = false;
  const btnPrincipal = document.getElementById("btn-start");
  btnPrincipal.innerText = "Iniciar Foco";
  btnPrincipal.style.background = "var(--primary)";
  document.body.classList.remove("modo-isolamento-ativo");
  document.getElementById("pomo-container-titulos").style.display = "none";
  document.getElementById("pomodoro-header-titulo").style.display = "block";
  document.getElementById("timer-display").classList.remove("overtime");
  document.getElementById("pomo-foco").disabled = false;
  document.getElementById("pomo-pausa").disabled = false;
  alterarConfiguracaoPomodoro();
}

function pauseTimer() {
  clearInterval(timer);
  timer = null;
}
function salvarSessaoIncompleta() {
  resetTimer();
}
function obterDataLocalString(d) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function alterarConfiguracaoPomodoro() {
  tempoBaseEscolhidoMinutos = parseInt(
    document.getElementById("pomo-foco").value,
  );
  tempoRestante = tempoBaseEscolhidoMinutos * 60;
  atualizarDisplay(tempoRestante);
}

function atualizarDisplay(s) {
  document.getElementById("timer-display").innerText = `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// --- FORMULARIOS DO PERFIL E ESTATISTICAS ---
function salvarDadosPerfil(e) {
  e.preventDefault();
  let n = document.getElementById("perf-nome").value.trim();
  let c = document.getElementById("perf-cargo").value.trim();
  let b = document.getElementById("perf-bio").value.trim();

  if (n) dadosPerfil.nome = n;
  if (c) dadosPerfil.cargo = c;
  if (b) dadosPerfil.bio = b;

  localStorage.setItem("dadosPerfil", JSON.stringify(dadosPerfil));
  document.getElementById("perfil-form").reset();
  carregarDadosPerfil();
  calcularEMostrarEstatisticas();
  alert("Informações salvas e campos limpos com sucesso!");
}

function carregarDadosPerfil() {
  document.getElementById("lbl-nome-usuario").innerText = dadosPerfil.nome;
  document.getElementById("lbl-cargo-usuario").innerText = dadosPerfil.cargo;
  document.getElementById("perf-nome").placeholder =
    "Nome atual: " + dadosPerfil.nome;
  document.getElementById("perf-cargo").placeholder =
    "Cargo atual: " + dadosPerfil.cargo;
  document.getElementById("perf-bio").placeholder =
    dadosPerfil.bio || "Escreva suas notas de motivação aqui...";
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
    return;
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
}

function salvarProgressoGeral(materia, minutos) {
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
    data: hojeStr,
    hora: horaStr,
    materia: nomeMateriaFinal,
    duracao: minutos,
  });
  localStorage.setItem("logsSessoes", JSON.stringify(logsSessoes));

  renderizarTodoOPainel();
}

function adicionarNovaMateria(e) {
  e.preventDefault();
  let nome = document.getElementById("mat-only-nome").value.trim();
  let metaVinculada = document.getElementById("mat-vinc-meta").value;
  let cor = document.getElementById("mat-only-cor").value;

  materias.push({ nome, metaVinculada, cor });
  localStorage.setItem("materias", JSON.stringify(materias));
  if (!tempoPorMateria[nome]) tempoPorMateria[nome] = 0;
  localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));

  document.getElementById("materia-only-form").reset();
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
    selectPomo.innerHTML = '<option value="">Estudo Geral</option>';
    selectVincMeta.innerHTML = '<option value="">Matéria Isolada</option>';
    materias.forEach((m) => {
      selectPomo.innerHTML += `<option value="${m.nome}">${m.nome}</option>`;
    });
    metas.forEach((m) => {
      selectVincMeta.innerHTML += `<option value="${m.objetivoNome}">${m.objetivoNome}</option>`;
    });
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
                <div class="meta-stat-row"><div class="meta-stat-lbl">Meta Principal Ativa</div><div class="meta-stat-val" style="color:#60a5fa;">${metaAtiva.objetivoNome}</div></div>
                <div class="meta-stat-row"><div class="meta-stat-lbl">Tópicos Totais</div><div class="meta-stat-val"><span class="meta-highlight">${metaAtiva.qtdMaterias}</span> conteúdos no edital</div></div>
                <div class="meta-stat-row"><div class="meta-stat-lbl">Dias para a Prova</div><div class="meta-countdown" style="font-size:1.4rem;">${dRestantes > 0 ? dRestantes : 0} dias restantes</div></div>`;
  }
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
        if (minutos > 0 && minutos <= 30) cubo.classList.add("lvl-1");
        else if (minutos > 30 && minutos <= 60) cubo.classList.add("lvl-2");
        else if (minutos > 60 && minutos <= 120) cubo.classList.add("lvl-3");
        else if (minutos > 120) cubo.classList.add("lvl-4");
        cubo.setAttribute(
          "data-info",
          `${dt.toLocaleDateString("pt-BR")}: ${minutos} min`,
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
          if (min > 0) celula.classList.add("ativo");
          if (min > 0 && min <= 30) celula.classList.add("lvl-1");
          else if (min > 30 && min <= 60) celula.classList.add("lvl-2");
          else if (min > 60 && min <= 120) celula.classList.add("lvl-3");
          else if (min > 120) celula.classList.add("lvl-4");

          celula.setAttribute(
            "data-info",
            `${dataLoop.toLocaleDateString("pt-BR")}: ${min} min`,
          );
        }
        gridDias.appendChild(celula);
      }

      containerMes.appendChild(gridDias);
      wrapperCal.appendChild(containerMes);
    });
  }
}

function renderizarGrafico() {
  const canvas = document.getElementById("chartMaterias");
  if (!canvas) return;
  let labels = materias.map((m) => m.nome);
  if (labels.length === 0) return;
  if (meuGrafico) meuGrafico.destroy();

  let cores = labels.map((l) => {
    let mEncontrada = materias.find((mat) => mat.nome === l);
    return mEncontrada ? mEncontrada.cor : "#3b82f6";
  });

  meuGrafico = new Chart(canvas.getContext("2d"), {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: labels.map((l) => tempoPorMateria[l] || 1),
          backgroundColor: cores,
        },
      ],
    },
    options: { plugins: { legend: { labels: { color: "#f8fafc" } } } },
  });
}

function renderizarTodoOPainel() {
  atualizarDropdowns();
  renderizarPainelFoco();
  renderizarHistorico7Dias();
  renderizarMetasEGraficos();
  renderizarGrafico();
}

// Inicialização da paleta de cores
const boxCor = document.getElementById("mat-only-cor");
if (boxCor) {
  paletaCores.forEach((c) => {
    boxCor.innerHTML += `<option value="${c.hex}">${c.nome}</option>`;
  });
}

// Carga Geral Inicial
carregarDadosPerfil();
renderizarTodoOPainel();
