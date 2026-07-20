// ============================================================
// LOGIN E SINCRONIZAÇÃO EM NUVEM (SUPABASE)
// ============================================================
// Preencha SUPABASE_URL e SUPABASE_ANON_KEY com os dados do SEU projeto
// (painel do Supabase > Project Settings > API / Data API). Enquanto os
// valores abaixo forem os placeholders, o app roda 100% local, sem nenhum
// botão de login — exatamente como antes — então não tem risco de quebrar
// nada até você configurar.
const SUPABASE_URL = "https://sqzxijwhkadebluxcrff.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxenhpandoa2FkZWJsdXhjcmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg4NDQsImV4cCI6MjA5OTk2NDg0NH0.ncxcxzmvq1PIEePjqhQTDEPZDw4rZnrxH26i7xa4w58";

const SUPABASE_CONFIGURADO =
  SUPABASE_URL.startsWith("http") && !SUPABASE_ANON_KEY.startsWith("COLE_AQUI");

const sb = SUPABASE_CONFIGURADO
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let usuarioAtual = null;

// --- QUAIS DADOS SÃO SINCRONIZADOS ---
// Reaproveita a lista de chaves já usada pelo backup manual (CHAVES_BACKUP,
// definida em script.js) e soma as preferências de dispositivo que também
// fazem sentido acompanhar o usuário entre aparelhos.
function obterChavesSincronizaveis() {
  const extras = [
    "temaApp",
    "sonsAmbienteVolumes",
    "presetBinauralAtual",
    "volumeSomNeural",
    "tempoPreparoMinutos",
    "metaFiltroAtivo",
  ];
  const base = typeof CHAVES_BACKUP !== "undefined" ? CHAVES_BACKUP : [];
  return Array.from(new Set([...base, ...extras]));
}

function coletarDadosParaNuvem() {
  const dados = {};
  obterChavesSincronizaveis().forEach((chave) => {
    const valor = localStorage.getItem(chave);
    if (valor !== null) dados[chave] = valor;
  });
  return dados;
}

function aplicarDadosDaNuvem(dados) {
  if (!dados) return;
  const chavesValidas = obterChavesSincronizaveis();
  Object.keys(dados).forEach((chave) => {
    if (chavesValidas.includes(chave) && dados[chave] !== null) {
      localStorage.setItem(chave, dados[chave]);
    }
  });
}

// Algumas chaves locais representam a conta (matérias, metas, histórico,
// perfil, preferências...) e são apagadas quando o usuário sai — sem isso,
// o aparelho continuava mostrando os dados de quem acabou de deslogar em
// vez de voltar a um estado limpo de "convidado". Como fazerLogout() já
// sincroniza com a nuvem antes de sair, nada se perde: é só entrar de novo
// na mesma conta pra tudo voltar.
function limparDadosLocaisDeConta() {
  obterChavesSincronizaveis().forEach((chave) => {
    localStorage.removeItem(chave);
  });
}

// Um jeito simples de saber se já existe progresso real neste aparelho
// (usado como convidado, sem login) antes de decidir se entra em conflito
// com dados que já existirem na nuvem daquela conta.
function localTemProgressoSignificativo() {
  try {
    const materiasLocais = JSON.parse(localStorage.getItem("materias")) || [];
    const sessoesLocais = JSON.parse(localStorage.getItem("logsSessoes")) || [];
    return materiasLocais.length > 0 || sessoesLocais.length > 0;
  } catch {
    return false;
  }
}

// --- ENVIO PARA A NUVEM (com debounce, pra não disparar 1 request a cada
// tecla digitada — espera 2s de silêncio antes de sincronizar) ---
let timeoutSincronizacao = null;
let sincronizandoAgora = false;

function agendarSincronizacaoNuvem() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  clearTimeout(timeoutSincronizacao);
  timeoutSincronizacao = setTimeout(sincronizarParaNuvem, 2000);
}

async function sincronizarParaNuvem() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual || sincronizandoAgora) return;
  sincronizandoAgora = true;
  try {
    const dados = coletarDadosParaNuvem();
    const { error } = await sb
      .from("dados_usuario")
      .update({ dados, atualizado_em: new Date().toISOString() })
      .eq("user_id", usuarioAtual.id);
    if (error) console.error("Erro ao sincronizar com a nuvem:", error);
  } catch (err) {
    console.error("Erro ao sincronizar com a nuvem:", err);
  } finally {
    sincronizandoAgora = false;
  }
}

async function buscarDadosDaNuvem() {
  const { data, error } = await sb
    .from("dados_usuario")
    .select("dados")
    .eq("user_id", usuarioAtual.id)
    .maybeSingle();
  if (error) {
    console.error("Erro ao baixar dados da nuvem:", error);
    return {};
  }
  return data && data.dados ? data.dados : {};
}

// Sempre que uma das chaves sincronizáveis é escrita no localStorage em
// QUALQUER lugar do app (script.js inteiro, sem precisar mexer em nenhuma
// função existente), agenda uma sincronização automática com a nuvem.
if (SUPABASE_CONFIGURADO) {
  const setItemOriginal = Storage.prototype.setItem;
  Storage.prototype.setItem = function (chave, valor) {
    setItemOriginal.call(this, chave, valor);
    if (this === localStorage && obterChavesSincronizaveis().includes(chave)) {
      agendarSincronizacaoNuvem();
    }
  };
}

// --- MODAL DE LOGIN: MOSTRAR / ESCONDER / TROCAR DE PASSO ---
function abrirModalLogin() {
  document.getElementById("modal-login").style.display = "flex";
  mostrarPassoLogin("login-passo-form");
}

function fecharModalLogin() {
  document.getElementById("modal-login").style.display = "none";
}

function mostrarPassoLogin(idPasso) {
  [
    "login-passo-form",
    "login-passo-recuperar",
    "login-passo-nova-senha",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === idPasso ? "block" : "none";
  });
}

function mostrarRecuperarSenha(event) {
  if (event) event.preventDefault();
  mostrarPassoLogin("login-passo-recuperar");
}

function voltarParaLogin() {
  mostrarPassoLogin("login-passo-form");
}

function definirCarregandoLogin(carregando) {
  const btn = document.getElementById("btn-login-entrar");
  const spinner = document.getElementById("login-carregando");
  if (btn) btn.disabled = carregando;
  if (spinner) spinner.style.display = carregando ? "block" : "none";
}

function atualizarUiUsuarioLogado() {
  const badge = document.getElementById("conta-usuario-badge");
  const btnEntrar = document.getElementById("btn-abrir-login");
  const emailEl = document.getElementById("usuario-logado-email");

  if (!SUPABASE_CONFIGURADO) {
    if (badge) badge.style.display = "none";
    if (btnEntrar) btnEntrar.style.display = "none";
    return;
  }

  if (usuarioAtual) {
    if (emailEl) emailEl.innerText = usuarioAtual.email;
    if (badge) badge.style.display = "flex";
    if (btnEntrar) btnEntrar.style.display = "none";
  } else {
    if (badge) badge.style.display = "none";
    if (btnEntrar) btnEntrar.style.display = "flex";
  }

  const avisoBackup = document.getElementById("texto-aviso-backup");
  if (avisoBackup) {
    avisoBackup.innerText = usuarioAtual
      ? "Seus dados (matérias, histórico, XP, conquistas, tarefas) já ficam salvos na nuvem e sincronizados nessa conta. Mesmo assim, vale exportar um backup de vez em quando como cópia extra de segurança."
      : "Você está usando o app sem conta — os dados ficam só neste navegador. Se limpar o cache, trocar de navegador ou reinstalar o sistema, tudo se perde. Exporte um backup de vez em quando, ou crie uma conta (botão 🔐 Entrar) pra salvar tudo na nuvem.";
  }
}

// --- FORMULÁRIO DE LOGIN / CADASTRO ---
function traduzirErroAuth(msg) {
  if (/Invalid login credentials/i.test(msg))
    return "E-mail ou senha incorretos.";
  if (/User already registered/i.test(msg))
    return "Já existe uma conta com esse e-mail.";
  if (/Password should be at least/i.test(msg))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (/Unable to validate email/i.test(msg)) return "Digite um e-mail válido.";
  if (/rate limit/i.test(msg))
    return "Muitas tentativas seguidas. Espere um pouco e tente de novo.";
  return msg;
}

function mostrarErroLogin(mensagem, sucesso, idAlvo) {
  const el = document.getElementById(idAlvo || "login-erro");
  if (!el) return;
  el.innerText = mensagem;
  el.style.color = sucesso ? "var(--success)" : "var(--danger)";
  el.style.display = "block";
}

async function fazerLogin(event) {
  event.preventDefault();
  if (!SUPABASE_CONFIGURADO) return;

  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;
  document.getElementById("login-erro").style.display = "none";
  definirCarregandoLogin(true);

  const { error } = await sb.auth.signInWithPassword({
    email,
    password: senha,
  });

  definirCarregandoLogin(false);
  if (error) {
    mostrarErroLogin(traduzirErroAuth(error.message), false);
    return;
  }
  // sb.auth.onAuthStateChange (mais abaixo) cuida do resto a partir daqui.
}

async function fazerCadastro(event) {
  event.preventDefault();
  if (!SUPABASE_CONFIGURADO) return;

  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;
  document.getElementById("login-erro").style.display = "none";

  if (senha.length < 6) {
    mostrarErroLogin("A senha precisa ter pelo menos 6 caracteres.", false);
    return;
  }

  definirCarregandoLogin(true);
  const { data, error } = await sb.auth.signUp({ email, password: senha });
  definirCarregandoLogin(false);

  if (error) {
    mostrarErroLogin(traduzirErroAuth(error.message), false);
    return;
  }

  if (!data.session) {
    // Projeto com confirmação de e-mail ativada: precisa confirmar antes de entrar.
    mostrarErroLogin(
      "Conta criada! Verifique seu e-mail pra confirmar antes de entrar.",
      true,
    );
  }
  // Se já veio com sessão (confirmação de e-mail desligada no projeto),
  // sb.auth.onAuthStateChange cuida de entrar direto.
}

// --- LOGIN COM GOOGLE ---
async function entrarComGoogle() {
  if (!SUPABASE_CONFIGURADO) return;
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) {
    mostrarErroLogin(traduzirErroAuth(error.message), false);
  }
  // O navegador é redirecionado pro Google e depois volta pro app; o resto
  // é tratado pelo onAuthStateChange quando a sessão chega.
}

// --- RECUPERAÇÃO DE SENHA ---
async function enviarRecuperacaoSenha(event) {
  event.preventDefault();
  if (!SUPABASE_CONFIGURADO) return;

  const email = document.getElementById("recuperar-email").value.trim();
  document.getElementById("recuperar-msg").style.display = "none";

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });

  if (error) {
    mostrarErroLogin(traduzirErroAuth(error.message), false, "recuperar-msg");
    return;
  }

  mostrarErroLogin(
    "Link enviado! Verifique seu e-mail (e a caixa de spam) e clique no link pra criar uma senha nova.",
    true,
    "recuperar-msg",
  );
}

async function salvarNovaSenha(event) {
  event.preventDefault();
  if (!SUPABASE_CONFIGURADO) return;

  const senha1 = document.getElementById("nova-senha-1").value;
  const senha2 = document.getElementById("nova-senha-2").value;
  document.getElementById("nova-senha-erro").style.display = "none";

  if (senha1.length < 6) {
    mostrarErroLogin(
      "A senha precisa ter pelo menos 6 caracteres.",
      false,
      "nova-senha-erro",
    );
    return;
  }
  if (senha1 !== senha2) {
    mostrarErroLogin(
      "As duas senhas precisam ser iguais.",
      false,
      "nova-senha-erro",
    );
    return;
  }

  const { error } = await sb.auth.updateUser({ password: senha1 });
  if (error) {
    mostrarErroLogin(traduzirErroAuth(error.message), false, "nova-senha-erro");
    return;
  }

  alert("Senha atualizada com sucesso! Você já está logado.");
  fecharModalLogin();
}

// --- LOGOUT ---
async function fazerLogout() {
  if (!SUPABASE_CONFIGURADO) return;
  const confirmado = confirm(
    "Sair da conta? Seus dados já ficam salvos na nuvem, então você pode entrar de novo em qualquer aparelho. O app continua funcionando neste aparelho como convidado, sem conta.",
  );
  if (!confirmado) return;
  await sincronizarParaNuvem(); // garante que a última alteração local subiu antes de sair
  await sb.auth.signOut();
  // limparDadosLocaisDeConta() já roda no listener de SIGNED_OUT, logo abaixo.
}

// --- FLUXO PRINCIPAL ---
// Diferente da versão anterior, o app NUNCA fica bloqueado esperando login:
// ele já inicia no modo "convidado" (dados só neste aparelho) e, se houver
// uma sessão salva (ou o usuário logar depois), os dados da nuvem entram
// em cena a partir daí.
async function entrarComSessao(session) {
  usuarioAtual = session.user;
  definirCarregandoLogin(true);

  const dadosNuvem = await buscarDadosDaNuvem();
  const nuvemTemDados = Object.keys(dadosNuvem).length > 0;
  const localTemDados = localTemProgressoSignificativo();

  if (nuvemTemDados && localTemDados) {
    // Tem progresso feito como convidado NESTE aparelho e também dados já
    // salvos NESSA conta — deixa a pessoa escolher qual lado vence, em vez
    // de sobrescrever silenciosamente um dos dois.
    definirCarregandoLogin(false);
    const usarDadosDaConta = confirm(
      "Você tem dados salvos nesta conta E também dados feitos aqui neste aparelho sem estar logado.\n\n" +
        "OK = usar os dados da CONTA (substitui os deste aparelho)\n" +
        "Cancelar = manter os dados DESTE APARELHO (substitui os da conta)",
    );
    if (usarDadosDaConta) {
      aplicarDadosDaNuvem(dadosNuvem);
    } else {
      await sincronizarParaNuvem();
    }
  } else if (nuvemTemDados) {
    aplicarDadosDaNuvem(dadosNuvem);
  } else if (localTemDados) {
    // Conta nova (nuvem vazia) mas já tem progresso de convidado aqui —
    // sobe esse progresso pra não perder nada.
    await sincronizarParaNuvem();
  }

  definirCarregandoLogin(false);
  fecharModalLogin();
  atualizarUiUsuarioLogado();
  recarregarEstadoDoLocalStorage();
  renderizarTodoOPainel();
  renderizarTarefas();
  atualizarProgressoPomodoros();
  if (typeof atualizarBolinhaNovidades === "function")
    atualizarBolinhaNovidades();
}

async function iniciarAutenticacao() {
  // O app já abre direto, no modo convidado — login é 100% opcional.
  iniciarAppEstudeMais();

  if (!SUPABASE_CONFIGURADO) return;

  const { data } = await sb.auth.getSession();
  if (data.session) {
    await entrarComSessao(data.session);
  } else {
    atualizarUiUsuarioLogado();
  }

  sb.auth.onAuthStateChange((evento, session) => {
    if (evento === "SIGNED_IN" && session && !usuarioAtual) {
      entrarComSessao(session);
    } else if (evento === "SIGNED_OUT") {
      usuarioAtual = null;
      limparDadosLocaisDeConta();
      location.reload();
    } else if (evento === "PASSWORD_RECOVERY") {
      // Usuário voltou pelo link do e-mail de recuperação de senha.
      document.getElementById("modal-login").style.display = "flex";
      mostrarPassoLogin("login-passo-nova-senha");
    }
  });
}

document.addEventListener("DOMContentLoaded", iniciarAutenticacao);

// Melhor esforço: tenta subir qualquer alteração pendente antes de fechar
// a aba/navegador (não é garantido pelo navegador, mas ajuda).
window.addEventListener("beforeunload", () => {
  if (SUPABASE_CONFIGURADO && usuarioAtual) sincronizarParaNuvem();
});
