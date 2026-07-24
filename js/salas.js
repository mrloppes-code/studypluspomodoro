// ============================================================
// SALAS DE ESTUDO (grupo / competição amigável)
// ============================================================
// Usa a MESMA conta Supabase já configurada em auth-sync.js — não precisa
// de nenhuma chave nova. Só funciona logado (SUPABASE_CONFIGURADO &&
// usuarioAtual), porque o ranking precisa identificar cada pessoa entre
// aparelhos diferentes.
//
// IMPORTANTE: além deste arquivo, é preciso rodar o script SQL
// "salas-schema.sql" uma vez no SQL Editor do seu projeto Supabase, pra
// criar as tabelas "salas_estudo" e "salas_membros" com as permissões
// (RLS) corretas. Sem isso, os comandos abaixo vão falhar silenciosamente
// (com erro no console).
//
// Este arquivo depende de variáveis/funções definidas em auth-sync.js
// (sb, usuarioAtual, SUPABASE_CONFIGURADO) e em script.js (mostrarAlerta,
// mostrarConfirmacao, escapeHtml) — por isso precisa ser carregado DEPOIS
// de auth-sync.js. As chamadas a funções de script.js só acontecem dentro
// de handlers de clique/formulário, quando script.js já terminou de
// carregar, então a ordem exata entre salas.js e script.js não importa.

let salaAtual = null; // { id, codigo, nome } | null
let canalRealtimeSala = null;

function obterDataLocalStringSalas(d) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

// Reaproveita o "historicoFoco" que o app já mantém (mesmo dado usado pelo
// streak e pelo heatmap) pra somar quantos minutos a pessoa estudou hoje e
// nos últimos 7 dias — sem precisar duplicar nenhum registro.
function calcularMinutosParaRanking() {
  let historico = [];
  try {
    historico = JSON.parse(localStorage.getItem("historicoFoco")) || [];
  } catch {
    historico = [];
  }

  const hojeStr = obterDataLocalStringSalas(new Date());
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
  seteDiasAtras.setHours(0, 0, 0, 0);

  let minutosHoje = 0;
  let minutosSemana = 0;
  historico.forEach((registro) => {
    const dataRegistro = new Date(registro.data);
    const minutos = Number(registro.minutos) || 0;
    if (obterDataLocalStringSalas(dataRegistro) === hojeStr) {
      minutosHoje += minutos;
    }
    if (dataRegistro >= seteDiasAtras) {
      minutosSemana += minutos;
    }
  });

  return {
    minutosHoje: Math.round(minutosHoje),
    minutosSemana: Math.round(minutosSemana),
  };
}

// Código curto sem caracteres ambíguos (sem 0/O, 1/I) pra ditar por voz ou
// digitar sem confusão.
function gerarCodigoSala() {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return codigo;
}

function nomeExibicaoAtual() {
  try {
    const perfil = JSON.parse(localStorage.getItem("dadosPerfil")) || {};
    if (perfil.nome && perfil.nome.trim()) return perfil.nome.trim();
  } catch {
    // ignora e cai no fallback abaixo
  }
  return (usuarioAtual && usuarioAtual.email) || "Estudante";
}

// --- CRIAR / ENTRAR / SAIR ---

async function criarSala(nomeDigitado) {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  const nome = (nomeDigitado || "").trim() || "Minha sala de estudos";
  const codigo = gerarCodigoSala();

  const { data: sala, error } = await sb
    .from("salas_estudo")
    .insert({ codigo, nome, criado_por: usuarioAtual.id })
    .select()
    .single();

  if (error || !sala) {
    console.error("Erro ao criar sala:", error);
    await mostrarAlerta(
      "Não foi possível criar a sala agora. Tente de novo em instantes.",
    );
    return;
  }

  await entrarNaSalaPorId(sala.id, sala.codigo, sala.nome);
}

async function entrarNaSala(codigoDigitado) {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  const codigo = (codigoDigitado || "").trim().toUpperCase();
  if (!codigo) {
    await mostrarAlerta("Digite o código da sala.");
    return;
  }

  const { data: sala, error } = await sb
    .from("salas_estudo")
    .select("id, codigo, nome")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !sala) {
    await mostrarAlerta(
      "Não encontrei nenhuma sala com esse código. Confira e tente de novo.",
    );
    return;
  }

  await entrarNaSalaPorId(sala.id, sala.codigo, sala.nome);
}

async function entrarNaSalaPorId(salaId, codigo, nome) {
  const { minutosHoje, minutosSemana } = calcularMinutosParaRanking();

  const { error } = await sb.from("salas_membros").upsert(
    {
      sala_id: salaId,
      user_id: usuarioAtual.id,
      nome_exibicao: nomeExibicaoAtual(),
      minutos_hoje: minutosHoje,
      minutos_semana: minutosSemana,
      data_referencia: obterDataLocalStringSalas(new Date()),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "sala_id,user_id" },
  );

  if (error) {
    console.error("Erro ao entrar na sala:", error);
    await mostrarAlerta(
      "Não foi possível entrar nessa sala agora. Tente de novo.",
    );
    return;
  }

  salaAtual = { id: salaId, codigo, nome };
  localStorage.setItem("salaEstudoAtual", JSON.stringify(salaAtual));

  renderizarTelaSala();
  assinarRealtimeSala();
}

async function sairDaSala() {
  if (!salaAtual || !usuarioAtual) return;
  const confirmado = await mostrarConfirmacao(
    `Sair da sala "${salaAtual.nome}"? Você pode entrar de novo depois com o código ${salaAtual.codigo}.`,
    { icone: "🚪", textoConfirmar: "Sair da sala" },
  );
  if (!confirmado) return;

  await sb
    .from("salas_membros")
    .delete()
    .eq("sala_id", salaAtual.id)
    .eq("user_id", usuarioAtual.id);

  pararRealtimeSala();
  salaAtual = null;
  localStorage.removeItem("salaEstudoAtual");
  renderizarTelaSala();
}

// --- SINCRONIZAÇÃO DE MINUTOS (chamada sempre que o histórico de foco muda) ---

async function sincronizarMinutosNaSalaAtual() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual || !salaAtual) return;
  const { minutosHoje, minutosSemana } = calcularMinutosParaRanking();
  const { error } = await sb
    .from("salas_membros")
    .update({
      minutos_hoje: minutosHoje,
      minutos_semana: minutosSemana,
      data_referencia: obterDataLocalStringSalas(new Date()),
      atualizado_em: new Date().toISOString(),
    })
    .eq("sala_id", salaAtual.id)
    .eq("user_id", usuarioAtual.id);
  if (error) console.error("Erro ao sincronizar minutos da sala:", error);
}

// --- RANKING E TEMPO REAL ---

async function buscarRankingSalaAtual() {
  if (!salaAtual) return [];
  const { data, error } = await sb
    .from("salas_membros")
    .select(
      "user_id, nome_exibicao, minutos_hoje, minutos_semana, data_referencia",
    )
    .eq("sala_id", salaAtual.id)
    .order("minutos_semana", { ascending: false });

  if (error) {
    console.error("Erro ao buscar ranking da sala:", error);
    return [];
  }

  // Se "data_referencia" salva não é hoje, a pessoa não sincroniza há um
  // tempo — mostra 0 no "hoje" sem precisar mexer no banco.
  const hojeStr = obterDataLocalStringSalas(new Date());
  return (data || []).map((m) => ({
    ...m,
    minutos_hoje: m.data_referencia === hojeStr ? m.minutos_hoje : 0,
  }));
}

async function renderizarRankingSala() {
  const lista = document.getElementById("sala-ranking-lista");
  if (!lista || !salaAtual) return;

  const ranking = await buscarRankingSalaAtual();
  if (ranking.length === 0) {
    lista.innerHTML =
      '<p class="sala-ranking-vazio">Ainda ninguém estudou por aqui.</p>';
    return;
  }

  const medalhas = ["🥇", "🥈", "🥉"];
  lista.innerHTML = ranking
    .map((m, i) => {
      const souEu = usuarioAtual && m.user_id === usuarioAtual.id;
      const posicao = medalhas[i] || `${i + 1}º`;
      const nome =
        typeof escapeHtml === "function"
          ? escapeHtml(m.nome_exibicao || "Estudante")
          : m.nome_exibicao || "Estudante";
      return `
        <div class="sala-ranking-item${souEu ? " sala-ranking-item-eu" : ""}">
          <span class="sala-ranking-posicao">${posicao}</span>
          <span class="sala-ranking-nome">${nome}${souEu ? " (você)" : ""}</span>
          <span class="sala-ranking-minutos">
            ${m.minutos_semana} min <small>semana</small>
          </span>
          <span class="sala-ranking-minutos-hoje">${m.minutos_hoje} min hoje</span>
        </div>`;
    })
    .join("");
}

function assinarRealtimeSala() {
  pararRealtimeSala();
  if (!salaAtual || !SUPABASE_CONFIGURADO) return;
  canalRealtimeSala = sb
    .channel(`sala-${salaAtual.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "salas_membros",
        filter: `sala_id=eq.${salaAtual.id}`,
      },
      () => renderizarRankingSala(),
    )
    .subscribe();
}

function pararRealtimeSala() {
  if (canalRealtimeSala) {
    sb.removeChannel(canalRealtimeSala);
    canalRealtimeSala = null;
  }
}

// --- UI: MODAL ---

function renderizarTelaSala() {
  const semSala = document.getElementById("sala-sem-sala");
  const comSala = document.getElementById("sala-com-sala");
  if (!semSala || !comSala) return;

  if (salaAtual) {
    semSala.style.display = "none";
    comSala.style.display = "block";
    const nomeEl = document.getElementById("sala-nome-atual");
    const codigoEl = document.getElementById("sala-codigo-atual");
    if (nomeEl) nomeEl.textContent = salaAtual.nome;
    if (codigoEl) codigoEl.textContent = salaAtual.codigo;
    renderizarRankingSala();
  } else {
    semSala.style.display = "block";
    comSala.style.display = "none";
  }
}

async function abrirModalSala() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) {
    await mostrarAlerta(
      "Entre na sua conta primeiro pra usar as salas de estudo em grupo (botão 🔐 Entrar).",
    );
    return;
  }
  const modal = document.getElementById("modal-sala-estudo");
  if (modal) modal.style.display = "flex";
  renderizarTelaSala();
}

function fecharModalSala() {
  const modal = document.getElementById("modal-sala-estudo");
  if (modal) modal.style.display = "none";
}

function fecharModalSalaSeClicouFora(event) {
  if (event.target === event.currentTarget) fecharModalSala();
}

async function copiarCodigoSala() {
  if (!salaAtual) return;
  try {
    await navigator.clipboard.writeText(salaAtual.codigo);
    await mostrarAlerta(
      "Código copiado! Manda pra quem você quer chamar pra sala.",
      { icone: "📋" },
    );
  } catch {
    await mostrarAlerta(`Código da sala: ${salaAtual.codigo}`);
  }
}

async function criarSalaPeloFormulario(event) {
  event.preventDefault();
  const campo = document.getElementById("sala-input-nome");
  await criarSala(campo ? campo.value : "");
  if (campo) campo.value = "";
}

async function entrarNaSalaPeloFormulario(event) {
  event.preventDefault();
  const campo = document.getElementById("sala-input-codigo");
  await entrarNaSala(campo ? campo.value : "");
  if (campo) campo.value = "";
}

// --- RESTAURA A SALA AO ABRIR O APP (se já estava em uma) ---

async function restaurarSalaSalva() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  try {
    const salva = JSON.parse(localStorage.getItem("salaEstudoAtual"));
    if (salva && salva.id) {
      salaAtual = salva;
      assinarRealtimeSala();
      await sincronizarMinutosNaSalaAtual();
    }
  } catch {
    // Cache local corrompido — ignora, o app segue como se não tivesse sala.
  }
}

// --- HOOK: sempre que o histórico de foco muda (nova sessão concluída),
// atualiza automaticamente o ranking da sala atual. Mesmo padrão de
// monkey-patch já usado em auth-sync.js para a sincronização de nuvem —
// funciona em cima do que auth-sync.js já encadeou, sem conflito. ---
if (SUPABASE_CONFIGURADO) {
  const setItemOriginalSalas = Storage.prototype.setItem;
  Storage.prototype.setItem = function (chave, valor) {
    setItemOriginalSalas.call(this, chave, valor);
    if (this === localStorage && chave === "historicoFoco") {
      sincronizarMinutosNaSalaAtual();
    }
  };
}
