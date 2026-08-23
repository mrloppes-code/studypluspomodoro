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
let tokenAcessoAtual = null; // access_token da sessão atual — guardado à parte
// pra poder montar a chamada REST "manual" do beforeunload sem precisar de
// um await bloqueante em cima de sb.auth.getSession() (ver mais abaixo).

// A foto de perfil é sincronizada à parte (ver "--- FOTO DE PERFIL ---" mais
// abaixo), numa coluna própria (foto_perfil_base64) em vez de dentro do
// mesmo JSON "dados" que é reenviado a cada mudança pequena (marcar uma
// tarefa, adicionar um lembrete...). Sem essa separação, qualquer alteração
// mínima reenviava a foto inteira de novo — desperdiçando dados móveis e
// deixando o payload grande o bastante pra arriscar estourar o limite de
// tamanho do envio "de segurança" no fechamento da aba (ver beforeunload).
const CHAVE_FOTO_PERFIL = "fotoPerfilBase64";

// --- QUAIS DADOS SÃO SINCRONIZADOS ---
// Reaproveita a lista de chaves já usada pelo backup manual (CHAVES_BACKUP,
// definida em script.js) e soma as preferências de dispositivo que também
// fazem sentido acompanhar o usuário entre aparelhos. A foto de perfil fica
// de fora daqui de propósito — ela tem sua própria sincronização, mais rara.
function obterChavesSincronizaveis() {
  const extras = [
    "temaApp",
    "sonsAmbienteVolumes",
    "presetBinauralAtual",
    "volumeSomNeural",
    "tempoPreparoMinutos",
    "metaFiltroAtivo",
    "ordemWidgetsPainel",
  ];
  const base = typeof CHAVES_BACKUP !== "undefined" ? CHAVES_BACKUP : [];
  return Array.from(
    new Set(
      [...base, ...extras].filter((chave) => chave !== CHAVE_FOTO_PERFIL),
    ),
  );
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
  // A foto de perfil não está mais em obterChavesSincronizaveis() (tem
  // sincronização própria, ver "--- FOTO DE PERFIL ---" mais abaixo), então
  // precisa ser limpa explicitamente aqui pra não continuar aparecendo pro
  // próximo usuário/convidado neste aparelho.
  localStorage.removeItem(CHAVE_FOTO_PERFIL);
  localStorage.removeItem("contaVinculadaId");
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

// --- MESCLA (em vez de sobrescrever) os dados vindos da nuvem com os
// dados locais ---
// Isso é o que permite fazer quantas sessões de estudo quiser ao longo do
// dia — fechando e reabrindo o app, ou trocando de aparelho no meio — sem
// perder nenhuma: em vez de um lado simplesmente substituir o outro (o que
// apagaria silenciosamente qualquer sessão feita num aparelho que ainda não
// tinha sincronizado quando o outro aparelho subiu os dados dele), cada
// sessão/registro é somado ao conjunto todo, nunca descartado.
function mesclarDadosDaNuvem(dadosNuvem) {
  if (!dadosNuvem) return;

  function lerLocal(chave, padrao) {
    try {
      const valor = JSON.parse(localStorage.getItem(chave));
      return valor === null || valor === undefined ? padrao : valor;
    } catch {
      return padrao;
    }
  }
  function lerNuvem(chave, padrao) {
    if (dadosNuvem[chave] === undefined || dadosNuvem[chave] === null)
      return padrao;
    try {
      const valor = JSON.parse(dadosNuvem[chave]);
      return valor === null || valor === undefined ? padrao : valor;
    } catch {
      return padrao;
    }
  }

  // 1. Listas com "id" único (sessões avulsas de foco, questões,
  // simulados, tarefas): une os dois lados por id, sem duplicar. Quando o
  // MESMO id existe dos dois lados (só acontece de verdade com tarefas,
  // que podem ser editadas/marcadas como concluídas em mais de um
  // aparelho — os outros tipos só são criados, nunca editados depois), usa
  // o campo "atualizadoEm" pra manter a versão mais recente. Itens sem
  // esse campo (registros antigos, ou tipos que nunca o usam) continuam
  // com o comportamento de sempre: o lado local vence.
  function mesclarListaPorId(chave) {
    const local = lerLocal(chave, []);
    const nuvem = lerNuvem(chave, []);
    const porId = new Map();
    [...nuvem, ...local].forEach((item) => {
      if (!item || item.id === undefined) return;
      const existente = porId.get(item.id);
      if (!existente) {
        porId.set(item.id, item);
        return;
      }
      const tsNovo = item.atualizadoEm || 0;
      const tsExistente = existente.atualizadoEm || 0;
      if (tsNovo >= tsExistente) porId.set(item.id, item);
    });
    const mesclada = Array.from(porId.values());
    localStorage.setItem(chave, JSON.stringify(mesclada));
    return mesclada;
  }
  mesclarListaPorId("registrosQuestoes");
  mesclarListaPorId("registrosSimulados");
  mesclarListaPorId("tarefas");
  const logsMesclados = mesclarListaPorId("logsSessoes");

  // 2. historicoFoco: não tem "id" próprio, mas a combinação data (com
  // milissegundos) + minutos + matéria já é, na prática, única por sessão.
  const historicoLocal = lerLocal("historicoFoco", []);
  const historicoNuvem = lerNuvem("historicoFoco", []);
  const historicoPorChave = new Map();
  [...historicoNuvem, ...historicoLocal].forEach((item) => {
    if (!item) return;
    historicoPorChave.set(`${item.data}|${item.minutos}|${item.materia}`, item);
  });
  localStorage.setItem(
    "historicoFoco",
    JSON.stringify(Array.from(historicoPorChave.values())),
  );

  // 3. historicoEstudos e tempoPorMateria: em vez de tentar adivinhar qual
  // dos dois números é "mais certo", recalcula os dois DO ZERO a partir do
  // logsSessoes já mesclado no passo 1 — como cada sessão só existe uma vez
  // ali, é impossível perder minutos ou contar a mesma sessão duas vezes.
  const historicoEstudosRecalculado = {};
  const tempoPorMateriaRecalculado = {};
  logsMesclados.forEach((sessao) => {
    if (!sessao || !sessao.duracao) return;
    historicoEstudosRecalculado[sessao.data] =
      (historicoEstudosRecalculado[sessao.data] || 0) + sessao.duracao;
    if (sessao.materia) {
      tempoPorMateriaRecalculado[sessao.materia] =
        (tempoPorMateriaRecalculado[sessao.materia] || 0) + sessao.duracao;
    }
  });
  localStorage.setItem(
    "historicoEstudos",
    JSON.stringify(historicoEstudosRecalculado),
  );
  localStorage.setItem(
    "tempoPorMateria",
    JSON.stringify(tempoPorMateriaRecalculado),
  );

  // 4. Contadores por dia sem log individual (pomodoros concluídos e
  // iniciados): usa o maior valor de cada dia entre os dois lados — nunca
  // fica menor do que o que qualquer um dos dois aparelhos já tinha
  // registrado.
  function mesclarContadorPorDia(chave) {
    const local = lerLocal(chave, {});
    const nuvem = lerNuvem(chave, {});
    const mesclado = { ...local };
    Object.keys(nuvem).forEach((dia) => {
      mesclado[dia] = Math.max(mesclado[dia] || 0, nuvem[dia] || 0);
    });
    localStorage.setItem(chave, JSON.stringify(mesclado));
  }
  mesclarContadorPorDia("pomosPorDia");
  mesclarContadorPorDia("pomosIniciadosPorDia");

  // 5. Congelamentos de sequência: união simples das datas protegidas.
  const congeladosLocal = lerLocal("diasCongeladosStreak", []);
  const congeladosNuvem = lerNuvem("diasCongeladosStreak", []);
  localStorage.setItem(
    "diasCongeladosStreak",
    JSON.stringify(
      Array.from(new Set([...congeladosLocal, ...congeladosNuvem])),
    ),
  );

  // 6. Tempo extra total (contador único, sem chave por dia): usa o maior
  // dos dois valores.
  const overtimeLocal =
    parseInt(localStorage.getItem("totalOvertimeGeralMinutos"), 10) || 0;
  const overtimeNuvem =
    parseInt(lerNuvem("totalOvertimeGeralMinutos", 0), 10) || 0;
  localStorage.setItem(
    "totalOvertimeGeralMinutos",
    String(Math.max(overtimeLocal, overtimeNuvem)),
  );

  // 7. Todo o resto (matérias, metas, perfil, preferências, tema...) são
  // dados de "estado atual" — não eventos acumulados — então continuam
  // simplesmente usando o valor da nuvem quando ele existir, como sempre.
  const chavesJaTratadas = new Set([
    "registrosQuestoes",
    "registrosSimulados",
    "tarefas",
    "logsSessoes",
    "historicoFoco",
    "historicoEstudos",
    "tempoPorMateria",
    "pomosPorDia",
    "pomosIniciadosPorDia",
    "diasCongeladosStreak",
    "totalOvertimeGeralMinutos",
  ]);
  Object.keys(dadosNuvem).forEach((chave) => {
    if (!chavesJaTratadas.has(chave) && dadosNuvem[chave] !== null) {
      localStorage.setItem(chave, dadosNuvem[chave]);
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
    // upsert (não update): numa conta recém-criada ainda não existe
    // nenhuma linha em dados_usuario pra esse user_id — um update puro
    // não daria erro nenhum, só não salvaria nada (0 linhas afetadas),
    // fazendo a primeira sincronização "sumir" silenciosamente.
    const { error } = await sb.from("dados_usuario").upsert(
      {
        user_id: usuarioAtual.id,
        dados,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
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

// --- FOTO DE PERFIL (sincronização separada) ---
// Fica na sua própria coluna (foto_perfil_base64) na mesma tabela
// dados_usuario, em vez de dentro do JSON "dados" — assim, marcar uma
// tarefa ou adicionar um lembrete não reenvia a foto inteira de novo.
// REQUER rodar uma vez no SQL Editor do Supabase:
//   alter table public.dados_usuario
//     add column if not exists foto_perfil_base64 text;
// (não precisa de nenhuma política de RLS nova: a tabela já é protegida
// por linha via user_id, então isso vale pra qualquer coluna dela.)
let timeoutSincronizacaoFoto = null;

function agendarSincronizacaoFotoPerfil() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  clearTimeout(timeoutSincronizacaoFoto);
  timeoutSincronizacaoFoto = setTimeout(sincronizarFotoPerfilNaNuvem, 2000);
}

async function sincronizarFotoPerfilNaNuvem() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  try {
    const foto = localStorage.getItem(CHAVE_FOTO_PERFIL);
    const { error } = await sb.from("dados_usuario").upsert(
      {
        user_id: usuarioAtual.id,
        foto_perfil_base64: foto,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    // Coluna ainda não existe (migração do banco não rodada) — avisa uma
    // vez só no console, sem quebrar o resto da sincronização.
    if (error && error.code === "42703") {
      console.warn(
        "Coluna foto_perfil_base64 não existe em dados_usuario ainda. " +
          "Rode a migração indicada no comentário acima de sincronizarFotoPerfilNaNuvem() pra sincronizar a foto de perfil entre aparelhos.",
      );
      return;
    }
    if (error) console.error("Erro ao sincronizar foto de perfil:", error);
  } catch (err) {
    console.error("Erro ao sincronizar foto de perfil:", err);
  }
}

async function buscarFotoPerfilDaNuvem() {
  const { data, error } = await sb
    .from("dados_usuario")
    .select("foto_perfil_base64")
    .eq("user_id", usuarioAtual.id)
    .maybeSingle();
  if (error) return null;
  return data ? data.foto_perfil_base64 : null;
}

// Sempre que uma das chaves sincronizáveis é escrita no localStorage em
// QUALQUER lugar do app (script.js inteiro, sem precisar mexer em nenhuma
// função existente), agenda uma sincronização automática com a nuvem.
if (SUPABASE_CONFIGURADO) {
  const setItemOriginal = Storage.prototype.setItem;
  Storage.prototype.setItem = function (chave, valor) {
    setItemOriginal.call(this, chave, valor);
    if (this !== localStorage) return;
    if (chave === CHAVE_FOTO_PERFIL) {
      agendarSincronizacaoFotoPerfil();
    } else if (obterChavesSincronizaveis().includes(chave)) {
      agendarSincronizacaoNuvem();
    }
  };
}

// --- MODAL DE LOGIN: MOSTRAR / ESCONDER / TROCAR DE PASSO ---
function abrirModalLogin() {
  document.getElementById("modal-login").style.display = "flex";
  mostrarPassoLogin("login-passo-form");
}

// Fica "true" entre o clique no link de recuperação de senha e a definição
// da senha nova — trava o auto-login normal (SIGNED_IN) nesse intervalo,
// porque o Supabase dispara SIGNED_IN e PASSWORD_RECOVERY em sequência pro
// mesmo clique, e sem essa trava o SIGNED_IN "atropelava" a tela de nova
// senha e logava direto com a senha antiga (ver onAuthStateChange abaixo).
let emFluxoDeRecuperacaoSenha = false;

function fecharModalLogin() {
  document.getElementById("modal-login").style.display = "none";
  // Se a pessoa fechar o modal no meio da recuperação (ex: clicando fora ou
  // no X) sem concluir, libera o SIGNED_IN de novo pra não travar um futuro
  // login normal nesta mesma aba.
  emFluxoDeRecuperacaoSenha = false;
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
  const btnSala = document.getElementById("btn-abrir-sala");

  if (!SUPABASE_CONFIGURADO) {
    if (badge) badge.style.display = "none";
    if (btnEntrar) btnEntrar.style.display = "none";
    if (btnSala) btnSala.style.display = "none";
    return;
  }

  if (usuarioAtual) {
    if (emailEl) emailEl.innerText = usuarioAtual.email;
    if (badge) badge.style.display = "flex";
    if (btnEntrar) btnEntrar.style.display = "none";
    if (btnSala) btnSala.style.display = "flex";
  } else {
    if (badge) badge.style.display = "none";
    if (btnEntrar) btnEntrar.style.display = "flex";
    if (btnSala) btnSala.style.display = "none";
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

  // Só agora libera o SIGNED_IN normal — e completa o login "na mão" aqui,
  // porque trocar a senha não dispara um novo evento SIGNED_IN sozinho.
  emFluxoDeRecuperacaoSenha = false;

  await mostrarAlerta("Senha atualizada com sucesso! Você já está logado.", {
    icone: "✅",
  });

  const { data } = await sb.auth.getSession();
  if (data.session) {
    await entrarComSessao(data.session);
  } else {
    fecharModalLogin();
  }
}

// --- LOGOUT ---
async function fazerLogout() {
  if (!SUPABASE_CONFIGURADO) return;
  const confirmado = await mostrarConfirmacao(
    "Sair da conta? Seus dados já ficam salvos na nuvem, então você pode entrar de novo em qualquer aparelho. O app continua funcionando neste aparelho como convidado, sem conta.",
    { icone: "🚪", titulo: "Sair da conta", textoConfirmar: "Sair" },
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
  tokenAcessoAtual = session.access_token;
  definirCarregandoLogin(true);

  const dadosNuvem = await buscarDadosDaNuvem();
  const nuvemTemDados = Object.keys(dadosNuvem).length > 0;

  // Este aparelho já esteve logado NESSA MESMA conta antes (marcador
  // gravado abaixo, na primeira vez). Se sim, os dados locais são dados
  // DESSA conta — nunca é um "convidado" pedindo pra escolher lado, então
  // some com aquele diálogo de conflito que, sem essa checagem, aparecia
  // TODA VEZ que o app abria, mesmo sem nenhum conflito real. Em vez
  // disso, mescla os dois lados (sem perder nenhuma sessão feita em
  // qualquer aparelho desde a última sincronização) e sobe o resultado.
  const contaJaVinculadaAquiAntes =
    localStorage.getItem("contaVinculadaId") === session.user.id;

  if (contaJaVinculadaAquiAntes) {
    if (nuvemTemDados) mesclarDadosDaNuvem(dadosNuvem);
    await sincronizarParaNuvem();
  } else {
    const localTemDados = localTemProgressoSignificativo();
    if (nuvemTemDados && localTemDados) {
      // Tem progresso feito como convidado NESTE aparelho e também dados já
      // salvos NESSA conta — deixa a pessoa escolher qual lado vence, em vez
      // de sobrescrever silenciosamente um dos dois.
      definirCarregandoLogin(false);
      const usarDadosDaConta = await mostrarConfirmacao(
        "Você tem dados salvos nesta conta e também dados feitos aqui neste aparelho sem estar logado. Qual dos dois você quer manter?",
        {
          icone: "☁️",
          titulo: "Dados encontrados em dois lugares",
          textoConfirmar: "Usar dados da conta",
          textoCancelar: "Manter deste aparelho",
        },
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
    localStorage.setItem("contaVinculadaId", session.user.id);
  }

  // Foto de perfil: busca da coluna própria; se ainda não existir (conta
  // sincronizada antes dessa mudança), cai pro valor antigo que porventura
  // ainda esteja dentro de "dados" (dadosNuvem.fotoPerfilBase64), só pra
  // não "perder" uma foto que já tinha sido enviada do jeito antigo.
  const fotoDaNuvem =
    (await buscarFotoPerfilDaNuvem()) || dadosNuvem.fotoPerfilBase64 || null;
  if (fotoDaNuvem) {
    localStorage.setItem(CHAVE_FOTO_PERFIL, fotoDaNuvem);
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
  if (typeof restaurarSalaSalva === "function") await restaurarSalaSalva();
  // Se a pessoa chegou aqui por um link de convite de sala (?sala=CODIGO,
  // ver capturarConviteDeSalaNaURL em salas.js) e precisou logar primeiro,
  // é aqui que ela entra na sala automaticamente — depois de
  // restaurarSalaSalva() de propósito, pra um convite novo sempre "ganhar"
  // de uma sala antiga que porventura tivesse sido restaurada.
  if (typeof processarConviteDeSalaPendente === "function") {
    await processarConviteDeSalaPendente();
  }
}

// --- RECONCILIAÇÃO AO VOLTAR PRO APP (sem precisar recarregar a página) ---
// Cobre o caso de PWA/celular: sair do app (ele vai pro segundo plano, sem
// fechar de verdade) e voltar depois — o navegador normalmente só retoma a
// mesma página, sem disparar o carregamento inicial de novo. Sem isso, uma
// sessão feita nesse meio tempo em OUTRO aparelho só apareceria aqui depois
// de um recarregamento manual.
let ultimaReconciliacaoEm = 0;
async function reconciliarComANuvem() {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  const dadosNuvem = await buscarDadosDaNuvem();
  if (Object.keys(dadosNuvem).length > 0) {
    mesclarDadosDaNuvem(dadosNuvem);
    recarregarEstadoDoLocalStorage();
    renderizarTodoOPainel();
    renderizarTarefas();
    atualizarProgressoPomodoros();
  }
  await sincronizarParaNuvem();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (!SUPABASE_CONFIGURADO || !usuarioAtual) return;
  const agora = Date.now();
  // Só reconcilia se a aba ficou fora de foco por um tempo (evita refazer
  // a mesma checagem toda hora que a pessoa só troca de aba e volta).
  if (agora - ultimaReconciliacaoEm < 30000) return;
  ultimaReconciliacaoEm = agora;
  reconciliarComANuvem();
});

async function iniciarAutenticacao() {
  // O app já abre direto, no modo convidado — login é 100% opcional.
  iniciarAppEstudeMais();

  if (!SUPABASE_CONFIGURADO) return;

  const { data } = await sb.auth.getSession();
  if (data.session) {
    await entrarComSessao(data.session);
  } else {
    atualizarUiUsuarioLogado();
    // Chegou por um link de convite de sala (?sala=CODIGO) mas ainda não
    // tem sessão — pede login/cadastro primeiro. Depois que entrarComSessao()
    // rodar (login normal ou recém-criada a conta), o convite pendente é
    // processado automaticamente lá (ver processarConviteDeSalaPendente em
    // salas.js), sem a pessoa precisar digitar o código na mão.
    if (
      typeof codigoConviteSalaPendente !== "undefined" &&
      codigoConviteSalaPendente
    ) {
      await mostrarAlerta(
        "Você recebeu um convite pra uma sala de estudos! Entre na sua conta (ou crie uma rapidinho) pra entrar direto na sala.",
        { icone: "🎉", titulo: "Convite pra sala de estudos" },
      );
      abrirModalLogin();
    }
  }

  sb.auth.onAuthStateChange((evento, session) => {
    if (session) tokenAcessoAtual = session.access_token;
    if (evento === "PASSWORD_RECOVERY") {
      // Usuário voltou pelo link do e-mail de recuperação de senha. O
      // Supabase costuma disparar SIGNED_IN logo antes/depois deste mesmo
      // evento pro mesmo clique — a trava abaixo impede que aquele SIGNED_IN
      // feche esta tela e logue direto com a senha antiga.
      emFluxoDeRecuperacaoSenha = true;
      document.getElementById("modal-login").style.display = "flex";
      mostrarPassoLogin("login-passo-nova-senha");
      return;
    }
    if (emFluxoDeRecuperacaoSenha) return;
    if (evento === "SIGNED_IN" && session && !usuarioAtual) {
      entrarComSessao(session);
    } else if (evento === "SIGNED_OUT") {
      usuarioAtual = null;
      tokenAcessoAtual = null;
      limparDadosLocaisDeConta();
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", iniciarAutenticacao);

// Envio "de segurança" ao fechar a aba/navegador — pega qualquer alteração
// que ainda não tenha subido (por causa do debounce de 2s de
// agendarSincronizacaoNuvem). Uma chamada normal via await/fetch some
// junto com a página no meio do caminho: o navegador não espera promises
// pendentes no beforeunload. Em vez disso, montamos a mesma chamada que o
// SDK do Supabase faria (POST direto na API REST) usando
// `fetch(..., { keepalive: true })`, que o navegador tem a obrigação de
// deixar terminar mesmo depois da página fechar — diferente de um fetch
// comum. Preferimos isso a navigator.sendBeacon() porque o Beacon não
// permite mandar os headers "apikey"/"Authorization" que o Supabase exige.
//
// Limitação conhecida: navegadores limitam o tamanho total de requisições
// keepalive (tipicamente ~64KB). Como a foto de perfil já não faz parte
// deste payload (sincroniza à parte, ver "--- FOTO DE PERFIL ---"), o
// tamanho normal do resto dos dados costuma caber bem dentro desse limite
// — mas se a pessoa tiver um histórico gigantesco, esse envio de última
// hora pode falhar silenciosamente. Nesses casos, a sincronização normal
// (debounce de 2s enquanto o app está aberto) já deve ter dado conta da
// maior parte antes do fechamento.
window.addEventListener("beforeunload", () => {
  if (!SUPABASE_CONFIGURADO || !usuarioAtual || !tokenAcessoAtual) return;
  try {
    const dados = coletarDadosParaNuvem();
    fetch(`${SUPABASE_URL}/rest/v1/dados_usuario`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${tokenAcessoAtual}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: usuarioAtual.id,
        dados,
        atualizado_em: new Date().toISOString(),
      }),
    }).catch(() => {}); // melhor esforço — nada a fazer se falhar aqui
  } catch {
    // ignora — não há mais nada a fazer nesse ponto do ciclo de vida da página
  }
});
