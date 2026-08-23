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

let salaAtual = null; // { id, codigo, nome, criadoPor } | null
let canalRealtimeSala = null;
// Último ranking buscado — usado só pra achar o nome de exibição de um
// membro na hora de confirmar a remoção, sem precisar embutir o nome
// (que pode ter aspas/caracteres especiais digitados pela pessoa) dentro
// de um atributo onclick.
let ultimoRankingSalaCarregado = [];

// --- CONVITE VIA LINK (?sala=CODIGO) ---
// Guarda o código de uma sala convidada por link (ver
// montarMensagemConviteSalaPadrao) até dar pra entrar de verdade — a
// pessoa pode não estar logada ainda quando o link abre, então o convite
// fica "pendente" até o login terminar (ver processarConviteDeSalaPendente,
// chamado de dentro de entrarComSessao() em auth-sync.js).
let codigoConviteSalaPendente = null;

// Lê "?sala=CODIGO" da URL assim que o script carrega (antes até do
// DOMContentLoaded) e já limpa da URL com history.replaceState — assim um
// F5 depois não tenta entrar de novo, e o link não fica "sujo" na barra de
// endereço depois de processado.
function capturarConviteDeSalaNaURL() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("sala");
  if (!codigo) return;

  codigoConviteSalaPendente = codigo.trim().toUpperCase();

  params.delete("sala");
  const querySemConvite = params.toString();
  const novaUrl =
    window.location.pathname + (querySemConvite ? `?${querySemConvite}` : "");
  window.history.replaceState({}, "", novaUrl);
}
capturarConviteDeSalaNaURL();

// Chamado depois que o login termina (de dentro de entrarComSessao() em
// auth-sync.js) — se tinha um convite pendente, entra na sala
// automaticamente e já abre o modal mostrando o resultado, sem a pessoa
// precisar digitar o código na mão.
async function processarConviteDeSalaPendente() {
  if (!codigoConviteSalaPendente || !SUPABASE_CONFIGURADO || !usuarioAtual) {
    return;
  }
  const codigo = codigoConviteSalaPendente;
  codigoConviteSalaPendente = null;

  await entrarNaSala(codigo);

  const modal = document.getElementById("modal-sala-estudo");
  if (modal) modal.style.display = "flex";
  renderizarTelaSala();
}

function obterDataLocalStringSalas(d) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

// Reaproveita o "logsSessoes" que o app já mantém — é o dado real usado
// pelo streak, heatmap e gráfico de distribuição de tempo, alimentado
// tanto por sessões concluídas normalmente (persistirSessaoFinalizada)
// quanto por sessões salvas como incompletas (salvarSessaoIncompleta). O
// "historicoFoco" NÃO serve pra isso — só é escrito no caminho de sessão
// incompleta, então quase nunca refletia o estudo de verdade.
// Cada entrada de logsSessoes é 1 pomodoro — então além dos minutos, dá
// pra contar quantos pomodoros a pessoa fez hoje/na semana, que é a base
// da meta de pomodoros da sala.
function calcularMinutosParaRanking() {
  let sessoes = [];
  try {
    sessoes = JSON.parse(localStorage.getItem("logsSessoes")) || [];
  } catch {
    sessoes = [];
  }

  const hojeStr = obterDataLocalStringSalas(new Date());
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
  seteDiasAtras.setHours(0, 0, 0, 0);
  const seteDiasAtrasStr = obterDataLocalStringSalas(seteDiasAtras);

  let minutosHoje = 0;
  let minutosSemana = 0;
  let pomodorosHoje = 0;
  let pomodorosSemana = 0;
  sessoes.forEach((sessao) => {
    // sessao.data já vem no formato "YYYY-MM-DD" (obterDataLocalString),
    // então dá pra comparar como string mesmo — ordena igual a uma data.
    const minutos = Number(sessao.duracao) || 0;
    if (sessao.data === hojeStr) {
      minutosHoje += minutos;
      pomodorosHoje += 1;
    }
    if (sessao.data >= seteDiasAtrasStr) {
      minutosSemana += minutos;
      pomodorosSemana += 1;
    }
  });

  return {
    minutosHoje: Math.round(minutosHoje),
    minutosSemana: Math.round(minutosSemana),
    pomodorosHoje,
    pomodorosSemana,
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
      `Não foi possível criar a sala agora. Tente de novo em instantes.${error ? `\n\n(detalhe técnico: ${error.message || error.code || "sem detalhes"})` : ""}`,
    );
    return;
  }

  await entrarNaSalaPorId(sala.id, sala.codigo, sala.nome, sala.criado_por);
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
    .select("id, codigo, nome, criado_por")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !sala) {
    await mostrarAlerta(
      error
        ? `Não foi possível procurar essa sala agora.\n\n(detalhe técnico: ${error.message || error.code || "sem detalhes"})`
        : "Não encontrei nenhuma sala com esse código. Confira e tente de novo.",
    );
    return;
  }

  await entrarNaSalaPorId(sala.id, sala.codigo, sala.nome, sala.criado_por);
}

async function entrarNaSalaPorId(salaId, codigo, nome, criadoPor) {
  const { minutosHoje, minutosSemana, pomodorosHoje, pomodorosSemana } =
    calcularMinutosParaRanking();

  const { error } = await sb.from("salas_membros").upsert(
    {
      sala_id: salaId,
      user_id: usuarioAtual.id,
      nome_exibicao: nomeExibicaoAtual(),
      minutos_hoje: minutosHoje,
      minutos_semana: minutosSemana,
      pomodoros_hoje: pomodorosHoje,
      pomodoros_semana: pomodorosSemana,
      data_referencia: obterDataLocalStringSalas(new Date()),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "sala_id,user_id" },
  );

  if (error) {
    console.error("Erro ao entrar na sala:", error);
    await mostrarAlerta(
      `Não foi possível entrar nessa sala agora. Tente de novo.\n\n(detalhe técnico: ${error.message || error.code || "sem detalhes"})`,
    );
    return;
  }

  salaAtual = { id: salaId, codigo, nome, criadoPor };
  localStorage.setItem("salaEstudoAtual", JSON.stringify(salaAtual));

  renderizarTelaSala();
  assinarRealtimeSala();
}

// Sai da sala só localmente (sem tentar apagar nada no banco — usado
// quando a linha já não existe mais lá: a pessoa foi removida por outra
// pessoa, ou a sala inteira foi excluída pelo dono, detectado via
// realtime em assinarRealtimeSala). Também usado internamente depois de
// uma saída/exclusão bem-sucedida iniciada pelo próprio usuário.
function sairDaSalaLocalmente(mensagem) {
  pararRealtimeSala();
  salaAtual = null;
  ultimoRankingSalaCarregado = [];
  localStorage.removeItem("salaEstudoAtual");
  renderizarTelaSala();
  if (mensagem) mostrarAlerta(mensagem, { icone: "🚪" });
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

  sairDaSalaLocalmente();
}

// Exclui a sala inteira — só o dono (criado_por) vê o botão pra isso, mas
// a checagem abaixo é reforçada aqui também (defesa em profundidade: a
// garantia de verdade tem que vir da política RLS no Supabase, ver
// salas-schema.sql, já que uma checagem só no JS pode ser contornada
// direto no console do navegador).
async function excluirSalaAtual() {
  if (!salaAtual || !usuarioAtual) return;
  if (salaAtual.criadoPor !== usuarioAtual.id) {
    await mostrarAlerta("Só quem criou a sala pode excluí-la.");
    return;
  }

  const confirmado = await mostrarConfirmacao(
    `Excluir a sala "${salaAtual.nome}" pra sempre? Todo mundo é removido e o ranking se perde — essa ação não pode ser desfeita.`,
    { icone: "🗑️", textoConfirmar: "Excluir Sala", perigo: true },
  );
  if (!confirmado) return;

  const nomeSala = salaAtual.nome;

  // Apaga os membros primeiro (não depende de ON DELETE CASCADE estar
  // configurado no banco) e só depois a sala em si.
  await sb.from("salas_membros").delete().eq("sala_id", salaAtual.id);
  const { error } = await sb
    .from("salas_estudo")
    .delete()
    .eq("id", salaAtual.id);

  if (error) {
    console.error("Erro ao excluir sala:", error);
    await mostrarAlerta(
      `Não foi possível excluir a sala agora.\n\n(detalhe técnico: ${error.message || error.code || "sem detalhes"})`,
    );
    return;
  }

  sairDaSalaLocalmente();
  await mostrarAlerta(`Sala "${nomeSala}" excluída.`, { icone: "🗑️" });
}

// Remove um membro específico — só o dono vê o botão. Mesma observação de
// segurança do excluirSalaAtual: a garantia real precisa vir da política
// RLS, isso aqui é só pra não deixar a UI tentar sem necessidade.
async function removerMembroDaSala(userId) {
  if (!salaAtual || !usuarioAtual) return;
  if (salaAtual.criadoPor !== usuarioAtual.id) {
    await mostrarAlerta("Só quem criou a sala pode remover outras pessoas.");
    return;
  }
  if (userId === usuarioAtual.id) return; // usa "Sair da sala" pra si mesmo

  const membro = ultimoRankingSalaCarregado.find((m) => m.user_id === userId);
  const nome = (membro && membro.nome_exibicao) || "essa pessoa";

  const confirmado = await mostrarConfirmacao(
    `Remover ${nome} da sala "${salaAtual.nome}"? A pessoa pode entrar de novo depois, se você compartilhar o código com ela.`,
    { icone: "🚷", textoConfirmar: "Remover" },
  );
  if (!confirmado) return;

  const { error } = await sb
    .from("salas_membros")
    .delete()
    .eq("sala_id", salaAtual.id)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao remover membro da sala:", error);
    await mostrarAlerta(
      `Não foi possível remover essa pessoa agora.\n\n(detalhe técnico: ${error.message || error.code || "sem detalhes"})`,
    );
    return;
  }

  renderizarRankingSala();
}

// --- SINCRONIZAÇÃO DE MINUTOS (chamada sempre que o histórico de foco muda) ---

async function sincronizarMinutosNaSalaAtual() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual || !salaAtual) return;
  const { minutosHoje, minutosSemana, pomodorosHoje, pomodorosSemana } =
    calcularMinutosParaRanking();
  const { error } = await sb
    .from("salas_membros")
    .update({
      minutos_hoje: minutosHoje,
      minutos_semana: minutosSemana,
      pomodoros_hoje: pomodorosHoje,
      pomodoros_semana: pomodorosSemana,
      data_referencia: obterDataLocalStringSalas(new Date()),
      atualizado_em: new Date().toISOString(),
    })
    .eq("sala_id", salaAtual.id)
    .eq("user_id", usuarioAtual.id);
  if (error) console.error("Erro ao sincronizar minutos da sala:", error);
}

// --- META DE POMODOROS DA SALA (incentivo/engajamento) ---
// Cada participante define a própria meta de pomodoros pra semana — não é
// uma meta única imposta pela sala, é pessoal, mas fica visível pra todo
// mundo no ranking (accountability): dá pra ver quem já bateu a meta e
// quem ainda está em falta, sem expor nenhum dado além do que a pessoa já
// compartilha com o progresso normal.
async function definirMetaPomodorosSemana(valorDigitado) {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual || !salaAtual) return;

  const valor = parseInt(valorDigitado, 10);
  const meta = !isNaN(valor) && valor > 0 ? valor : null;

  const { error } = await sb
    .from("salas_membros")
    .update({ meta_pomodoros_semana: meta })
    .eq("sala_id", salaAtual.id)
    .eq("user_id", usuarioAtual.id);

  if (error) {
    console.error("Erro ao salvar meta de pomodoros:", error);
    await mostrarAlerta(
      `Não foi possível salvar sua meta agora.\n\n(detalhe técnico: ${error.message || error.code || "sem detalhes"})`,
    );
    return;
  }

  mostrarToastGamificacao(
    "🎯",
    meta ? "Meta definida" : "Meta removida",
    meta
      ? `${meta} pomodoro${meta === 1 ? "" : "s"} essa semana — bora!`
      : "Sua meta semanal foi removida.",
  );
  renderizarRankingSala();
}

async function definirMetaPomodorosSemanaPeloFormulario(event) {
  event.preventDefault();
  const campo = document.getElementById("sala-input-meta-pomodoros");
  await definirMetaPomodorosSemana(campo ? campo.value : "");
}

// --- RANKING E TEMPO REAL ---

async function buscarRankingSalaAtual() {
  if (!salaAtual) return [];
  const { data, error } = await sb
    .from("salas_membros")
    .select(
      "user_id, nome_exibicao, minutos_hoje, minutos_semana, pomodoros_hoje, pomodoros_semana, meta_pomodoros_semana, data_referencia",
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
    pomodoros_hoje: m.data_referencia === hojeStr ? m.pomodoros_hoje : 0,
  }));
}

async function renderizarRankingSala() {
  const lista = document.getElementById("sala-ranking-lista");
  if (!lista || !salaAtual) return;

  const ranking = await buscarRankingSalaAtual();
  ultimoRankingSalaCarregado = ranking;
  if (ranking.length === 0) {
    lista.innerHTML =
      '<p class="sala-ranking-vazio">Ainda ninguém estudou por aqui.</p>';
    return;
  }

  // Pré-preenche o campo de meta com o valor que a pessoa já tem salvo,
  // pra ela ver/editar sem precisar adivinhar o que já estava definido.
  const meu = ranking.find(
    (m) => usuarioAtual && m.user_id === usuarioAtual.id,
  );
  const campoMeta = document.getElementById("sala-input-meta-pomodoros");
  if (campoMeta && document.activeElement !== campoMeta) {
    campoMeta.value =
      meu && meu.meta_pomodoros_semana ? meu.meta_pomodoros_semana : "";
  }

  const souDonoDaSala = usuarioAtual && salaAtual.criadoPor === usuarioAtual.id;

  const medalhas = ["🥇", "🥈", "🥉"];
  lista.innerHTML = ranking
    .map((m, i) => {
      const souEu = usuarioAtual && m.user_id === usuarioAtual.id;
      const posicao = medalhas[i] || `${i + 1}º`;
      const nome =
        typeof escapeHtml === "function"
          ? escapeHtml(m.nome_exibicao || "Estudante")
          : m.nome_exibicao || "Estudante";

      const pomodorosSemana = m.pomodoros_semana || 0;
      const meta = m.meta_pomodoros_semana || null;

      let metaHtml = "";
      if (meta) {
        const pct = Math.min(100, Math.round((pomodorosSemana / meta) * 100));
        const bateuMeta = pomodorosSemana >= meta;
        metaHtml = `
          <div class="sala-meta-linha">
            <div class="sala-meta-barra">
              <div class="sala-meta-barra-preenchida${bateuMeta ? " sala-meta-batida" : ""}" style="width:${pct}%"></div>
            </div>
            <span class="sala-meta-texto">${bateuMeta ? "🎉" : "🎯"} ${pomodorosSemana}/${meta} pomodoros</span>
          </div>`;
      } else {
        metaHtml = `<div class="sala-meta-linha"><span class="sala-meta-texto sala-meta-texto-sem-meta">${pomodorosSemana} pomodoro${pomodorosSemana === 1 ? "" : "s"} essa semana</span></div>`;
      }

      // Só o dono da sala vê o botão de remover, e nunca na própria linha
      // (pra sair, é o botão "Sair da sala" lá em cima).
      const botaoRemover =
        souDonoDaSala && !souEu
          ? `<button
              type="button"
              class="sala-btn-remover-membro"
              onclick="removerMembroDaSala('${m.user_id}')"
              title="Remover ${nome} da sala"
            >✕</button>`
          : "";

      return `
        <div class="sala-ranking-item${souEu ? " sala-ranking-item-eu" : ""}">
          <span class="sala-ranking-posicao">${posicao}</span>
          <span class="sala-ranking-nome">${nome}${souEu ? " (você)" : ""}</span>
          <span class="sala-ranking-minutos">
            ${m.minutos_semana} min <small>semana</small>
          </span>
          ${botaoRemover}
          <span class="sala-ranking-minutos-hoje">${m.minutos_hoje} min hoje</span>
          ${metaHtml}
        </div>`;
    })
    .join("");
}

function assinarRealtimeSala() {
  pararRealtimeSala();
  if (!salaAtual || !SUPABASE_CONFIGURADO) return;
  const idDaSala = salaAtual.id;

  canalRealtimeSala = sb
    .channel(`sala-${idDaSala}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "salas_membros",
        filter: `sala_id=eq.${idDaSala}`,
      },
      (payload) => {
        // A própria linha da pessoa sumiu (removida pelo dono, ou pela
        // exclusão da sala inteira — nesse segundo caso TODAS as linhas
        // somem, incluindo a de quem está vendo). Sai da sala aqui
        // também, sem isso o app ficava "preso" mostrando uma sala da
        // qual a pessoa não faz mais parte.
        if (
          payload.eventType === "DELETE" &&
          payload.old &&
          usuarioAtual &&
          payload.old.user_id === usuarioAtual.id &&
          salaAtual &&
          salaAtual.id === idDaSala
        ) {
          sairDaSalaLocalmente(
            `Você foi removido da sala "${salaAtual.nome}".`,
          );
          return;
        }
        renderizarRankingSala();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "salas_estudo",
        filter: `id=eq.${idDaSala}`,
      },
      () => {
        // Chega geralmente junto com o evento acima (linhas de membros
        // são apagadas antes da sala em si, ver excluirSalaAtual) — a
        // checagem salaAtual.id === idDaSala evita duplicar o aviso caso
        // os dois disparem quase ao mesmo tempo.
        if (salaAtual && salaAtual.id === idDaSala) {
          sairDaSalaLocalmente(
            `A sala "${salaAtual.nome}" foi excluída pelo dono.`,
          );
        }
      },
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
    atualizarMensagemConviteSalaPadrao();

    const souDonoDaSala =
      usuarioAtual && salaAtual.criadoPor === usuarioAtual.id;
    const btnExcluir = document.getElementById("sala-btn-excluir");
    if (btnExcluir) {
      btnExcluir.style.display = souDonoDaSala ? "inline-flex" : "none";
    }

    renderizarRankingSala();
  } else {
    semSala.style.display = "block";
    comSala.style.display = "none";
    const campoConvite = document.getElementById("sala-convite-mensagem");
    if (campoConvite) campoConvite.value = "";
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

  // Se a sala salva ainda não foi restaurada (pode acontecer se a pessoa
  // clicar rápido demais, antes do fluxo de login em segundo plano
  // terminar de rodar), tenta restaurar agora — sem isso, a sala parecia
  // ter "sumido" mesmo estando salva certinho no banco.
  if (!salaAtual) {
    await restaurarSalaSalva();
  }

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

// --- CONVITE (WhatsApp / E-mail) ---
// Mensagem pré-preenchida (nome de quem convida + nome/código da sala +
// link direto pro app) num campo editável — a pessoa pode ajustar o texto
// antes de mandar, então é uma mensagem personalizada de verdade, não um
// texto fixo. window.location.origin+pathname resolve pro domínio real
// onde o app está publicado, sem precisar cravar uma URL fixa no código.
function montarMensagemConviteSalaPadrao() {
  if (!salaAtual) return "";
  // O "?sala=CÓDIGO" na URL é o que faz quem abrir o link entrar direto na
  // sala (ver capturarConviteDeSalaNaURL/processarConviteDeSalaPendente) —
  // sem precisar digitar o código na mão depois de entrar/criar a conta.
  const linkApp = `${window.location.origin}${window.location.pathname}?sala=${salaAtual.codigo}`;
  return `${nomeExibicaoAtual()} te chamou pra estudar junto na sala "${salaAtual.nome}", no Estude+! 📚🔥\n\nÉ só abrir o link abaixo que você já entra direto na sala:\n${linkApp}`;
}

// Preenche o campo de convite com o texto padrão — chamado sempre que a
// sala muda (entrar/criar/restaurar), de dentro de renderizarTelaSala().
// Só sobrescreve se o campo ainda estiver vazio, pra não apagar um texto
// que a pessoa já tinha personalizado nessa mesma sessão do app (ex:
// depois de mandar por WhatsApp, ela ainda pode querer mandar por e-mail
// com o mesmo texto ajustado, sem o campo resetar sozinho no meio).
function atualizarMensagemConviteSalaPadrao() {
  const campo = document.getElementById("sala-convite-mensagem");
  if (campo && salaAtual && !campo.value.trim()) {
    campo.value = montarMensagemConviteSalaPadrao();
  }
}

function lerMensagemConviteSala() {
  const campo = document.getElementById("sala-convite-mensagem");
  const texto = campo ? campo.value.trim() : "";
  return texto || montarMensagemConviteSalaPadrao();
}

function enviarConviteSalaWhatsApp() {
  if (!salaAtual) return;
  const mensagem = lerMensagemConviteSala();
  window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
}

function enviarConviteSalaEmail() {
  if (!salaAtual) return;
  const mensagem = lerMensagemConviteSala();
  const assunto = `Convite pra sala de estudos "${salaAtual.nome}" no Estude+`;
  window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
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
    if (!salva || !salva.id) return;

    // Busca a sala de novo em vez de confiar 100% no cache local — cobre
    // dois casos: (1) o cache é de antes desse recurso existir e não tem
    // "criadoPor" salvo, então o botão "Excluir Sala" nunca apareceria
    // pro dono; (2) a sala foi excluída por quem criou enquanto esse
    // aparelho estava offline.
    const { data: sala, error: erroSala } = await sb
      .from("salas_estudo")
      .select("id, codigo, nome, criado_por")
      .eq("id", salva.id)
      .maybeSingle();

    if (erroSala || !sala) {
      localStorage.removeItem("salaEstudoAtual");
      salaAtual = null;
      return;
    }

    // A sala existe, mas será que a pessoa ainda é membro dela? Cobre o
    // caso de ter sido removida pelo dono enquanto estava offline — sem
    // essa checagem, ela voltaria a aparecer "dentro" de uma sala que já
    // não faz mais parte (sincronizarMinutosNaSalaAtual simplesmente não
    // afetaria nenhuma linha, sem erro nenhum pra avisar disso).
    const { data: minhaLinha, error: erroMembro } = await sb
      .from("salas_membros")
      .select("user_id")
      .eq("sala_id", sala.id)
      .eq("user_id", usuarioAtual.id)
      .maybeSingle();

    if (erroMembro || !minhaLinha) {
      localStorage.removeItem("salaEstudoAtual");
      salaAtual = null;
      return;
    }

    salaAtual = {
      id: sala.id,
      codigo: sala.codigo,
      nome: sala.nome,
      criadoPor: sala.criado_por,
    };
    localStorage.setItem("salaEstudoAtual", JSON.stringify(salaAtual));
    assinarRealtimeSala();
    await sincronizarMinutosNaSalaAtual();
    renderizarTelaSala();
  } catch {
    // Cache local corrompido — ignora, o app segue como se não tivesse sala.
  }
}

// --- HOOK: sempre que uma sessão é persistida de verdade (logsSessoes
// muda — tanto sessão concluída quanto incompleta passam por ali),
// atualiza automaticamente o ranking da sala atual. Mesmo padrão de
// monkey-patch já usado em auth-sync.js para a sincronização de nuvem —
// funciona em cima do que auth-sync.js já encadeou, sem conflito. ---
if (SUPABASE_CONFIGURADO) {
  const setItemOriginalSalas = Storage.prototype.setItem;
  Storage.prototype.setItem = function (chave, valor) {
    setItemOriginalSalas.call(this, chave, valor);
    if (this === localStorage && chave === "logsSessoes") {
      sincronizarMinutosNaSalaAtual();
    }
  };
}
