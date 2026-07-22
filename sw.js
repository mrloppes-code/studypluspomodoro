// ============================================================
// SERVICE WORKER — ESTUDE+ (funcionamento offline / PWA)
// ============================================================
// Sobe esse número sempre que quiser forçar os usuários a
// baixarem a versão nova dos arquivos (ele muda o nome do cache,
// então o antigo é descartado no "activate").
const VERSAO_CACHE = "v22";
const CACHE_NAME = `estudemais-cache-${VERSAO_CACHE}`;

// Arquivos essenciais pro app abrir e funcionar mesmo sem internet.
// Mantenha as mesmas strings de versão (?v=NN) usadas no index.html —
// se você atualizar css/style.css?v=44 pra ?v=45 lá, atualize aqui também
// (e suba a VERSAO_CACHE, pra não ficar servindo o arquivo antigo do cache).
const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css?v=52",
  "./js/script.js?v=41",
  "./js/auth-sync.js?v=4",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

// Domínios que NUNCA devem ser cacheados/interceptados: é onde moram os
// dados reais do usuário (login, leitura/escrita da nuvem). Deixamos essas
// requisições passarem direto pra rede, sem passar pelo cache.
function ehRequisicaoDeApiExterna(url) {
  return url.hostname.endsWith("supabase.co");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((nome) => nome !== CACHE_NAME)
            .map((nome) => caches.delete(nome)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só interceptamos GET. Chamadas de login/gravação (POST/PATCH etc.) vão
  // direto pra rede, sem cache — inclusive tudo que for pro Supabase.
  if (req.method !== "GET" || ehRequisicaoDeApiExterna(url)) {
    return;
  }

  // Navegação (abrir/recarregar o app): tenta a rede primeiro (pra sempre
  // pegar a versão mais nova quando tem internet); se falhar (offline),
  // cai pro index.html salvo em cache.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // Demais arquivos estáticos (css, js, ícones, libs de CDN como
  // chart.js e supabase-js): serve do cache na hora (rápido e funciona
  // offline) e, em paralelo, busca na rede pra atualizar o cache pra
  // próxima vez ("stale-while-revalidate").
  event.respondWith(
    caches.match(req).then((respostaCache) => {
      const buscaNaRede = fetch(req)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200) {
            const copia = respostaRede.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          }
          return respostaRede;
        })
        .catch(() => respostaCache);

      return respostaCache || buscaNaRede;
    }),
  );
});
