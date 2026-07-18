// ============================================================
// LOGIN E SINCRONIZAÇÃO EM NUVEM (SUPABASE)
// ============================================================
// Preencha SUPABASE_URL e SUPABASE_ANON_KEY com os dados do SEU projeto
// (painel do Supabase > Project Settings > API). Enquanto os valores abaixo
// forem os placeholders, o app roda 100% local, sem tela de login — exatamente
// como antes — então não tem risco de quebrar nada até você configurar.
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

async function baixarDaNuvem() {
  const { data, error } = await sb
    .from("dados_usuario")
    .select("dados")
    .eq("user_id", usuarioAtual.id)
    .maybeSingle();
  if (error) {
    console.error("Erro ao baixar dados da nuvem:", error);
    return;
  }
  if (data && data.dados) aplicarDadosDaNuvem(data.dados);
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

// --- TELA DE LOGIN: MOSTRAR / ESCONDER ---
function mostrarTelaLogin() {
  const login = document.getElementById("tela-login");
  const app = document.getElementById("app-conteudo");
  if (login) login.style.display = "flex";
  if (app) app.style.display = "none";
}

function esconderTelaLogin() {
  const login = document.getElementById("tela-login");
  const app = document.getElementById("app-conteudo");
  if (login) login.style.display = "none";
  if (app) app.style.display = "block";
}

function definirCarregandoLogin(carregando) {
  const btn = document.getElementById("btn-login-entrar");
  const spinner = document.getElementById("login-carregando");
  if (btn) btn.disabled = carregando;
  if (spinner) spinner.style.display = carregando ? "block" : "none";
}

function atualizarUiUsuarioLogado() {
  const el = document.getElementById("usuario-logado-email");
  if (el && usuarioAtual) el.innerText = usuarioAtual.email;
  const badge = document.getElementById("conta-usuario-badge");
  if (badge) badge.style.display = SUPABASE_CONFIGURADO ? "flex" : "none";

  const avisoBackup = document.getElementById("texto-aviso-backup");
  if (avisoBackup && SUPABASE_CONFIGURADO) {
    avisoBackup.innerText =
      "Seus dados (matérias, histórico, XP, conquistas, tarefas) já ficam salvos na nuvem e sincronizados nessa conta. Mesmo assim, vale exportar um backup de vez em quando como cópia extra de segurança.";
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
  return msg;
}

function mostrarErroLogin(mensagem, sucesso) {
  const el = document.getElementById("login-erro");
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

async function fazerLogout() {
  if (!SUPABASE_CONFIGURADO) return;
  const confirmado = confirm(
    "Sair da conta? Seus dados já ficam salvos na nuvem, então você pode entrar de novo em qualquer aparelho.",
  );
  if (!confirmado) return;
  await sincronizarParaNuvem(); // garante que a última alteração local subiu antes de sair
  await sb.auth.signOut();
}

// --- FLUXO PRINCIPAL: DECIDE SE MOSTRA LOGIN OU JÁ ENTRA DIRETO ---
async function entrarComSessao(session) {
  usuarioAtual = session.user;
  definirCarregandoLogin(true);
  await baixarDaNuvem();
  definirCarregandoLogin(false);
  esconderTelaLogin();
  atualizarUiUsuarioLogado();
  iniciarAppEstudeMais();
}

async function iniciarAutenticacao() {
  if (!SUPABASE_CONFIGURADO) {
    // Sem Supabase configurado: app funciona 100% local, sem login.
    iniciarAppEstudeMais();
    return;
  }

  const { data } = await sb.auth.getSession();
  if (data.session) {
    await entrarComSessao(data.session);
  } else {
    mostrarTelaLogin();
  }

  sb.auth.onAuthStateChange((evento, session) => {
    if (evento === "SIGNED_IN" && session && !usuarioAtual) {
      entrarComSessao(session);
    } else if (evento === "SIGNED_OUT") {
      usuarioAtual = null;
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", iniciarAutenticacao);

// Melhor esforço: tenta subir qualquer alteração pendente antes de fechar
// a aba/navegador (não é garantido pelo navegador, mas ajuda).
window.addEventListener("beforeunload", () => {
  if (SUPABASE_CONFIGURADO && usuarioAtual) sincronizarParaNuvem();
});
