/* ══════════════════════════════════════════════════════════════
   Meta Pixel — só o ID. Vazio = não carrega.
   Mesmo ID das landings de produtos/, para o
   público do site e o das campanhas caírem no mesmo pixel.
   ══════════════════════════════════════════════════════════════ */
var META_PIXEL_ID = "";

/* ══════════════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE PÁGINAS
   - Recarregar (F5) sempre volta para o topo, na hero, mesmo com
     #âncora na URL.
   - Link para outra página do site: o conteúdo esmaece (.page-leave
     no styles.css) e só então a navegação acontece. A entrada da
     página nova é a animação page-in do CSS.
   ══════════════════════════════════════════════════════════════ */
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  if (nav && nav.type === "reload") {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
  }

  var LEAVE_MS = 220;
  function page(p) { return p.replace(/index\.html$/, ""); }
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target && a.target !== "_self" || a.hasAttribute("download")) return;
    if (a.origin !== location.origin || page(a.pathname) === page(location.pathname)) return;
    e.preventDefault();
    document.documentElement.classList.add("page-leave");
    setTimeout(function () { location.href = a.href; }, LEAVE_MS);
  });
  // voltar pelo navegador restaura a página do cache ainda esmaecida
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) document.documentElement.classList.remove("page-leave");
  });
})();

/* ══════════════════════════════════════════════════════════════
   RASTREAMENTO PRÓPRIO — bloco independente, como o do pixel.

   Manda para /api/site/e (functions/api/site/) quem chegou, de
   onde, o que viu, onde clicou, até onde rolou e quanto tempo
   ficou; o formulário de contato vai para /api/site/lead. Quem lê
   é /painel. Tudo por sendBeacon: não segura a página nem a saída.

   Visitante = id aleatório em localStorage (volta igual nas próximas
   visitas). Visita = regra dos 30 minutos, como no Google Analytics:
   a mesma visita continua enquanto a pessoa não ficar meia hora
   parada, mesmo fechando e abrindo a aba — entrar e sair várias
   vezes seguidas conta uma visita só. As UTMs da chegada ficam
   presas à visita, para as páginas seguintes.

   O resto do app.js fala com isto só por window.siteTrack e
   window.siteLead — sem eles (bloqueador, erro), nada quebra.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var ID_OK = /^[a-z0-9]{8,32}$/;
  function novoId() { return (Math.random().toString(36).slice(2, 12) + Date.now().toString(36)).slice(0, 24); }
  function guardado(store, chave) {
    try {
      var v = store.getItem(chave);
      if (!v || !ID_OK.test(v)) { v = novoId(); store.setItem(chave, v); }
      return v;
    } catch (e) { return novoId(); }
  }
  var visitante = guardado(window.localStorage, "gr_v");

  // visita: { id, última atividade, UTMs da chegada } em localStorage
  var MEIA_HORA = 30 * 60 * 1000;
  var visita = null;
  try { visita = JSON.parse(localStorage.getItem("gr_s") || "null"); } catch (e) {}
  if (!visita || !ID_OK.test(visita.id || "") || !(Date.now() - visita.t < MEIA_HORA)) {
    visita = { id: novoId(), t: Date.now(), u: {} };
  }
  var sessao = visita.id;
  function mexeu() {
    visita.t = Date.now();
    try { localStorage.setItem("gr_s", JSON.stringify(visita)); } catch (e) {}
  }

  // UTMs: as da URL valem (e passam a ser as da visita); sem elas, as da chegada
  var utm = {};
  try {
    var qs = new URLSearchParams(location.search);
    ["source", "medium", "campaign", "content", "term"].forEach(function (k) {
      var v = qs.get("utm_" + k);
      if (v) utm[k] = v;
    });
  } catch (e) {}
  if (Object.keys(utm).length) visita.u = utm;
  else utm = visita.u || {};
  mexeu();

  // "/contato.html" e "/contato" contam como a mesma página
  var pagina = location.pathname.replace(/index\.html$/, "").replace(/\.html$/, "") || "/";
  var origem = null;
  try {
    var r = document.referrer && new URL(document.referrer);
    if (r && r.host !== location.host) origem = r.host.replace(/^www\./, "");
  } catch (e) {}
  var largura = window.innerWidth;
  var dispositivo = largura <= 760 ? "celular" : (largura <= 1100 && matchMedia("(pointer: coarse)").matches ? "tablet" : "computador");

  function envia(rota, dados) {
    var corpo = JSON.stringify(dados);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/site/" + rota, corpo)) return;
      fetch("/api/site/" + rota, { method: "POST", body: corpo, keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  function evento(nome, alvo, valor) {
    var d = { e: nome, v: visitante, s: sessao, p: pagina, d: dispositivo, l: document.documentElement.lang };
    if (alvo) d.a = String(alvo).slice(0, 120);
    if (typeof valor === "number") d.n = valor;
    if (nome === "pageview") { d.r = origem; d.u = utm; }
    envia("e", d);
    mexeu();
  }

  var ultimoLead = "";
  // sufixo: linha própria no painel (o pedido de empresa não sobrescreve
  // a conversa nem o formulário de contato da mesma visita)
  function lead(campos, status, sufixo) {
    var s = sufixo ? sessao.slice(0, 32 - sufixo.length) + sufixo : sessao;
    var dados = { v: visitante, s: s, st: status, u: utm,
                  nome: campos.nome || "", email: campos.email || "", mensagem: campos.mensagem || "" };
    if (!dados.nome && !dados.email && !dados.mensagem) return;
    var chave = JSON.stringify(dados);
    if (chave === ultimoLead) return;           // nada mudou desde o último envio
    ultimoLead = chave;
    envia("lead", dados);
  }

  window.siteTrack = evento;
  window.siteLead = lead;

  evento("pageview");

  // seções vistas (uma vez cada)
  if ("IntersectionObserver" in window) {
    var vistas = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { evento("secao", en.target.id); vistas.unobserve(en.target); }
      });
    }, { threshold: 0.35 });
    Array.prototype.forEach.call(document.querySelectorAll("main section[id]"), function (s) { vistas.observe(s); });
  }

  // profundidade de rolagem: 25/50/75/100, uma vez cada
  var marcas = [25, 50, 75, 100], rolTick = false;
  function mediRolagem() {
    rolTick = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 100;
    while (marcas.length && pct >= marcas[0] - 1) evento("scroll", null, marcas.shift());
    if (!marcas.length) window.removeEventListener("scroll", aoRolar);
  }
  function aoRolar() { if (!rolTick) { rolTick = true; setTimeout(mediRolagem, 250); } }
  window.addEventListener("scroll", aoRolar, { passive: true });

  // cliques em links e botões: o rótulo é o texto visível
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a, button");
    if (!el) return;
    var rotulo = el.getAttribute("data-track") || (el.textContent || "").replace(/\s+/g, " ").trim() || el.getAttribute("aria-label");
    if (rotulo) evento("clique", rotulo);
  }, true);

  // tempo com a página visível; vai a cada vez que a aba some (o painel usa o maior)
  var visivelDesde = document.visibilityState === "visible" ? Date.now() : 0, acumulado = 0;
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (visivelDesde) acumulado += Date.now() - visivelDesde;
      visivelDesde = 0;
      evento("saida", null, Math.round(acumulado / 1000));
    } else {
      visivelDesde = Date.now();
      mexeu();
    }
  });

  /* ---- aviso de cookies: some de vez no "Ok" ---- */
  var ok = false;
  try { ok = localStorage.getItem("gr_cookies") === "1"; } catch (e) {}
  if (!ok) {
    var aviso = document.createElement("div");
    aviso.className = "cookie-bar";
    aviso.setAttribute("role", "region");
    aviso.setAttribute("aria-label", "Aviso de cookies");
    aviso.innerHTML =
      '<p>Esta página utiliza cookies para melhor experiência.</p>' +
      '<div class="cookie-actions">' +
        '<a class="cookie-more" href="privacidade.html">Saiba mais</a>' +
        '<button type="button" class="cookie-ok liquid-glass">Ok</button>' +
      '</div>';
    document.body.appendChild(aviso);
    setTimeout(function () { aviso.classList.add("is-on"); }, 900);
    aviso.querySelector(".cookie-ok").addEventListener("click", function () {
      try { localStorage.setItem("gr_cookies", "1"); } catch (e) {}
      aviso.classList.remove("is-on");
      aviso.classList.add("is-off");
      setTimeout(function () { aviso.remove(); }, 400);
    });
  }
})();

(function () {
  "use strict";

  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- Celular: modo leve ----------------
     Em toque não há mouse para os efeitos reagirem, a tela é pequena
     e a placa de vídeo é fraca: os canvas desenham em no máximo 1,5x
     (a malha de pontos e a lava em 1x) e, em aparelho fraco (até 4
     núcleos ou 4 GB), a lava fica parada e o círculo usa menos pontos.
     A barra de endereço do celular some e volta ao rolar, disparando
     "resize" só de altura; recriar todos os canvas nessa hora travava
     a rolagem. onWidthResize() só chama quando a largura muda. */
  var isTouch = !window.matchMedia("(hover: hover)").matches;
  var weakDevice = isTouch && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4);
  var canvasDpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
  function onWidthResize(fn) {
    var lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      var w = window.innerWidth;
      if (isTouch && w === lastW) return;
      lastW = w;
      fn();
    }, { passive: true });
  }

  /* ────────────────────────────────────────────────────────────
     TROQUE AQUI: número do WhatsApp com DDI e DDD, só dígitos.
     Ex.: "5511987654321" para (11) 98765-4321. Usado pelo
     formulário de contato e pelo "Sinta-se à vontade" da hero.
     ──────────────────────────────────────────────────────────── */
  var WA_PHONE = "353874998781";
  // destino do botão "Enviar por email" da página de contato
  var CONTACT_EMAIL = "gustavosareto1@gmail.com";

  /* Dispara no que existir. Sem pixel carregado, vira no-op sozinho —
     nenhum erro no console. Mesmo desenho do track() das landings. */
  function track(evt, data) {
    try {
      if (window.fbq) fbq("track", evt, data || {});
      if (window.ttq) ttq.track(evt, data || {});
      if (window.dataLayer) window.dataLayer.push({ event: evt });
      if (window.siteTrack && evt === "Contact" && data) {
        window.siteTrack("contato", data.content_name + " / " + data.channel);
      }
    } catch (e) {}
  }

  /* ---------------- Card de saída ----------------
     Mouse sai pelo topo (rumo à aba / ao X) depois de 5s na página:
     abre um <dialog> uma vez por sessão. Só com mouse; fora do /contato. */
  (function () {
    if (isTouch || /\/contato/.test(location.pathname)) return;
    var desde = Date.now(), visto = false;
    try { visto = sessionStorage.getItem("gd_exit") === "1"; } catch (e) {}
    if (visto) return;

    function abre() {
      var en = document.documentElement.lang === "en";
      var dlg = document.createElement("dialog");
      dlg.className = "exit-card";
      dlg.setAttribute("aria-labelledby", "exitTitle");
      dlg.innerHTML =
        '<button type="button" class="exit-close" aria-label="Fechar">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
        '<span class="exit-tag">Antes de ir…</span>' +
        '<h2 id="exitTitle">Tem um projeto em mente?</h2>' +
        '<p>Me manda uma mensagem rápida. Eu respondo com uma ideia de prazo e valor, sem compromisso.</p>' +
        '<div class="exit-actions">' +
          '<a class="btn btn-primary" autofocus target="_blank" rel="noopener noreferrer" href="https://wa.me/' + WA_PHONE + '?text=' +
            encodeURIComponent(en ? "Hi Gustavo! I came from your site and I have a project in mind." : "Oi, Gustavo! Vim pelo seu site e tenho um projeto em mente.") + '">' +
            'Chamar no WhatsApp' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
          '<button type="button" class="exit-later">Agora não</button>' +
        '</div>';
      document.body.appendChild(dlg);
      if (window.siteI18n) window.siteI18n.mapear(dlg);
      function fecha() { dlg.close(); }
      dlg.querySelector(".exit-close").addEventListener("click", fecha);
      dlg.querySelector(".exit-later").addEventListener("click", fecha);
      dlg.querySelector(".btn").addEventListener("click", function () {
        track("Contact", { content_name: "card de saida", channel: "whatsapp" });
        fecha();
      });
      // clique fora do card (no fundo) fecha
      dlg.addEventListener("click", function (e) { if (e.target === dlg) fecha(); });
      dlg.addEventListener("close", function () { setTimeout(function () { dlg.remove(); }, 300); });
      dlg.showModal();
    }

    document.addEventListener("mouseout", function sair(e) {
      if (e.relatedTarget || e.clientY > 0 || Date.now() - desde < 5000) return;
      if (document.querySelector("dialog[open]")) return;
      document.removeEventListener("mouseout", sair);
      try { sessionStorage.setItem("gd_exit", "1"); } catch (err) {}
      abre();
    });
  })();

  /* ---------------- Tema claro / escuro ----------------
     O <head> já aplicou o tema salvo (ou o do sistema); aqui só o botão. */
  (function () {
    var root = document.documentElement;
    var meta = document.querySelector('meta[name="theme-color"]');
    var SOL = '<svg class="ic-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    var LUA = '<svg class="ic-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    function escuro() { return root.getAttribute("data-theme") === "dark"; }
    document.querySelectorAll(".nav-inner").forEach(function (navIn) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-toggle";
      btn.setAttribute("aria-label", "Alternar tema escuro");
      btn.setAttribute("aria-pressed", String(escuro()));
      btn.innerHTML = SOL + LUA;
      var alvo = navIn.querySelector(".nav-toggle");
      navIn.insertBefore(btn, alvo);
      btn.addEventListener("click", function () {
        var dark = !escuro();
        function aplica() {
          if (dark) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
          if (meta) meta.content = dark ? "#0c0d11" : "#f3f4f6";
          document.querySelectorAll(".theme-toggle").forEach(function (b) { b.setAttribute("aria-pressed", String(dark)); });
          try { localStorage.setItem("site_theme", dark ? "dark" : "light"); } catch (e) {}
        }
        if (!document.startViewTransition || reduceMotionQuery.matches) return aplica();
        // o tema novo cresce em círculo a partir do botão até cobrir a tela
        var r = btn.getBoundingClientRect();
        var x = r.left + r.width / 2, y = r.top + r.height / 2;
        var raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.startViewTransition(aplica).ready.then(function () {
          root.animate(
            { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + raio + "px at " + x + "px " + y + "px)"] },
            { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" }
          );
        });
      });
    });
  })();

  /* ---------------- Ritmo das animações de fundo ----------------
     As animações de fundo SÓ andam enquanto a página rola: o tempo de
     cada uma avança na proporção da velocidade da rolagem (scrollBoost,
     de 0 a 3) e freia sozinho ~0,35s depois que a rolagem para. Parado,
     o loop dorme e não gasta nada. Efeitos de mouse (pontos da hero,
     fios se afastando) acordam o loop com o ponteiro, sem fazer o
     resto andar. makeLoop() garante um loop só por animação. */
  var SETTLE_MS = 700;                         // quanto o loop vive após o último evento
  var lastScrollAct = -1e9, lastPointerAct = -1e9;
  var scrollY0 = window.scrollY, scrollT0 = performance.now(), scrollSpeed = 0;
  var loops = [];
  function scrollBoost() {
    return Math.min(3, scrollSpeed * Math.exp(-(performance.now() - scrollT0) / 350));
  }
  window.addEventListener("scroll", function () {
    var now = performance.now(), y = window.scrollY;
    var v = Math.abs(y - scrollY0) / Math.max(1, now - scrollT0);   // px/ms
    scrollSpeed = scrollSpeed * 0.5 + v * 0.8 * 0.5;
    scrollY0 = y; scrollT0 = now;
    lastScrollAct = now;
    for (var i = 0; i < loops.length; i++) loops[i].wake();
  }, { passive: true });
  ["pointermove", "pointerdown"].forEach(function (ev) {
    window.addEventListener(ev, function () {
      lastPointerAct = performance.now();
      for (var i = 0; i < loops.length; i++) if (loops[i].pointer) loops[i].wake();
    }, { passive: true });
  });
  function makeLoop(step, canRun, pointer) {
    var active = false, last = null;
    function alive() {
      var now = performance.now();
      return now - lastScrollAct < SETTLE_MS || (pointer && now - lastPointerAct < SETTLE_MS);
    }
    function tick(t) {
      if (!canRun() || !alive()) { active = false; last = null; return; }
      if (last === null) last = t;
      var dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      step(dt);
      requestAnimationFrame(tick);
    }
    var loop = {
      pointer: !!pointer,
      wake: function () {
        if (!active && canRun() && alive()) { active = true; requestAnimationFrame(tick); }
      }
    };
    loops.push(loop);
    return loop;
  }
  // quanto o "relógio" de uma animação anda neste quadro: só com rolagem
  function scrollTime(dt) { return dt * scrollBoost() * 1.6; }

  // pausa animações de canvas quando a seção sai da tela
  function watchInView(el, onChange) {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      onChange(entries[0].isIntersecting);
    }, { rootMargin: "120px" }).observe(el);
  }

  /* ---------------- Animações CSS sem fim: pausam fora da tela ----------------
     Giro arco-íris das janelas, reflexo da vitrine, aura e campo de
     empresas animam variáveis CSS ou filtros, que repintam a cada
     quadro mesmo com ninguém olhando. Fora da tela ganham .is-off. */
  if ("IntersectionObserver" in window) {
    var semFim = document.querySelectorAll(".browser, .vit-card, .trust-preview, .hire-field");
    if (semFim.length) {
      var pausaFora = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle("is-off", !e.isIntersecting); });
      }, { rootMargin: "100px" });
      semFim.forEach(function (el) { pausaFora.observe(el); });
    }
  }

  /* ---------------- Nav scroll state ---------------- */
  var nav = document.getElementById("nav");
  var navTicking = false;
  function syncNavScroll() {
    navTicking = false;
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  function onNavScroll() {
    if (!navTicking) {
      navTicking = true;
      requestAnimationFrame(syncNavScroll);
    }
  }
  syncNavScroll();
  window.addEventListener("scroll", onNavScroll, { passive: true });
  window.addEventListener("resize", onNavScroll, { passive: true });

  /* ---------------- Mobile menu ---------------- */
  var navToggle = document.getElementById("navToggle");
  var mobileMenu = document.getElementById("mobileMenu");
  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Abrir menu");
      });
    });
  }

  /* ---------------- Scroll reveals ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotionQuery.matches) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- Processo: prisma de vidro ----------------
     Quatro faces em volta de um eixo vertical. Cada face recebe o
     próprio transform (perspective → recua meio lado → gira → avança
     meio lado), então a face da frente fica no tamanho real e não
     precisa de preserve-3d (que mata o backdrop-filter). O z-index
     sai do cosseno do ângulo. Arrastar gira junto com o dedo; ao
     soltar, a velocidade escolhe a face e uma mola pouco amortecida
     encaixa — passa um tiquinho do ponto e volta. */
  var prismStage = document.getElementById("prism");
  if (prismStage) {
    var faces = Array.prototype.slice.call(prismStage.querySelectorAll(".prism-face"));
    var dots = Array.prototype.slice.call(document.querySelectorAll(".prism-dot"));
    var STEP = 360 / faces.length;
    var rot = 0, rotV = 0, target = 0;
    var faceW = 560, persp = 1600;
    var pRunning = false, dragging = false;
    var dragX = 0, dragRot = 0, lastX = 0, lastT = 0, flick = 0;

    function sizePrism() {
      var avail = prismStage.parentElement.clientWidth;
      faceW = Math.round(Math.min(560, avail < 640 ? avail * 0.84 : avail * 0.62));
      persp = Math.max(1100, faceW * 3);
      prismStage.style.setProperty("--face-w", faceW + "px");
      // altura = a face mais alta com esse texto (muda com o idioma)
      var h = 0;
      faces.forEach(function (f) {
        f.style.height = "auto";
        h = Math.max(h, f.offsetHeight);
        f.style.height = "";
      });
      prismStage.style.setProperty("--face-h", Math.max(h, avail < 640 ? 280 : 300) + "px");
      drawPrism();
    }

    function drawPrism() {
      var half = faceW / 2;
      for (var i = 0; i < faces.length; i++) {
        var a = rot + i * STEP;
        var rad = a * Math.PI / 180;
        var c = Math.cos(rad);
        var lit = Math.max(0, Math.min(1, (c - 0.35) / 0.6));   // texto só aparece quase de frente
        var f = faces[i];
        f.style.transform = "perspective(" + persp + "px) translateZ(" + (-half) + "px) rotateY(" + a + "deg) translateZ(" + half + "px)";
        f.style.zIndex = String(Math.round(c * 100) + 100);
        f.style.setProperty("--lit", lit.toFixed(3));
        f.style.setProperty("--dim", (1 - Math.max(0, c)).toFixed(3));
        f.setAttribute("aria-hidden", c > 0.7 ? "false" : "true");
      }
      var active = ((Math.round(-rot / STEP) % faces.length) + faces.length) % faces.length;
      dots.forEach(function (d, k) {
        if (k === active) d.setAttribute("aria-current", "step");
        else d.removeAttribute("aria-current");
      });
    }

    function stepPrism() {
      if (dragging) { pRunning = false; return; }
      rotV = (rotV + (target - rot) * 0.075) * 0.8;
      rot += rotV;
      if (Math.abs(target - rot) < 0.02 && Math.abs(rotV) < 0.02) {
        rot = target; rotV = 0; pRunning = false;
        drawPrism();
        return;
      }
      drawPrism();
      requestAnimationFrame(stepPrism);
    }
    function settle() {
      if (reduceMotionQuery.matches) { rot = target; rotV = 0; drawPrism(); return; }
      if (!pRunning) { pRunning = true; requestAnimationFrame(stepPrism); }
    }
    function goTo(index) {
      // caminho mais curto até a face pedida
      var want = -index * STEP;
      var d = ((want - target) % 360 + 540) % 360 - 180;
      target += d;
      settle();
    }

    prismStage.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      dragX = lastX = e.clientX;
      lastT = e.timeStamp;
      dragRot = rot;
      flick = 0;
      prismStage.setPointerCapture(e.pointerId);
      prismStage.classList.add("is-dragging");
    });
    prismStage.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      // arrastar uma face inteira de largura ≈ um quarto de volta
      rot = dragRot + (e.clientX - dragX) * (STEP / (faceW * 0.9));
      var dt = Math.max(1, e.timeStamp - lastT);
      flick = flick * 0.6 + ((e.clientX - lastX) / dt) * 0.4;     // px/ms, suavizado
      lastX = e.clientX; lastT = e.timeStamp;
      drawPrism();
    });
    var girou = false;
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (!girou && Math.abs(rot - dragRot) > 3 && window.siteTrack) {
        girou = true;
        window.siteTrack("prisma", "girou");
      }
      prismStage.classList.remove("is-dragging");
      // a velocidade do soltar empurra para a próxima face
      // (no máximo uma face além da mais próxima)
      var base = Math.round(rot / STEP) * STEP;
      var thrown = rot + flick * 140 * (STEP / (faceW * 0.9));
      target = Math.max(base - STEP, Math.min(base + STEP, Math.round(thrown / STEP) * STEP));
      rotV = 0;
      settle();
    }
    prismStage.addEventListener("pointerup", endDrag);
    prismStage.addEventListener("pointercancel", endDrag);
    prismStage.addEventListener("lostpointercapture", endDrag);

    prismStage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { target -= STEP; settle(); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { target += STEP; settle(); e.preventDefault(); }
    });
    dots.forEach(function (d, k) {
      d.addEventListener("click", function () { goTo(k); });
    });

    sizePrism();
    // entrada: o prisma chega girando e encaixa na primeira face
    if (!reduceMotionQuery.matches && "IntersectionObserver" in window) {
      rot = 150; drawPrism();
      var prismIo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { prismIo.disconnect(); settle(); }
      }, { threshold: 0.4 });
      prismIo.observe(prismStage);
    }
    var pTimer = null;
    onWidthResize(function () {
      clearTimeout(pTimer); pTimer = setTimeout(sizePrism, 150);
    });
    // troca de idioma muda o tamanho do texto
    new MutationObserver(sizePrism).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  /* ---------------- Processo: bolinhas elásticas ----------------
     Pretas e pequenas, paradas por padrão. A velocidade da rolagem estica cada bolinha na
     direção do movimento (fica fina, como borrão de velocidade); quando
     a rolagem para, uma mola pouco amortecida traz de volta — passa do
     ponto, achata e balança até assentar. Cada bolinha tem mola própria.
     O loop dorme quando tudo está parado e acorda no próximo scroll. */
  var balls = document.getElementById("balls");
  if (balls) {
    var bc = balls.getContext("2d");
    var bDpr = canvasDpr;
    var bSection = balls.parentElement;
    var bW = 0, bH = 0, ballList = [];
    var lastScrollY = window.scrollY, scrollVel = 0;
    var bRunning = false, bInView = false;

    function buildBalls() {
      var r = bSection.getBoundingClientRect();
      bW = r.width; bH = r.height;
      balls.width = bW * bDpr; balls.height = bH * bDpr;
      balls.style.width = bW + "px"; balls.style.height = bH + "px";
      bc.setTransform(bDpr, 0, 0, bDpr, 0, 0);
      // grade com sorteio: espalhadas sem amontoar
      var cell = bW < 640 ? 74 : 96;
      ballList = [];
      var seed = 7;
      function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var y = cell / 2; y < bH; y += cell) {
        for (var x = cell / 2; x < bW; x += cell) {
          if (rnd() < 0.35) continue;
          ballList.push({
            x: x + (rnd() - 0.5) * cell * 0.7,
            y: y + (rnd() - 0.5) * cell * 0.7,
            r: 1.6 + rnd() * 2.8,
            k: 0.10 + rnd() * 0.08,       // rigidez da mola
            damp: 0.80 + rnd() * 0.06,    // < 1: pouco amortecida → elástico
            s: 0, sv: 0,                  // estica (+) / achata (−)
            off: 0, ov: 0                 // atraso vertical (fica para trás)
          });
        }
      }
      drawBalls();
    }

    function drawBalls() {
      bc.clearRect(0, 0, bW, bH);
      bc.fillStyle = "rgba(17, 17, 22, 0.78)";
      for (var i = 0; i < ballList.length; i++) {
        var b = ballList[i];
        var st = 1 + b.s;
        var ry = b.r * Math.max(0.55, st);
        var rx = b.r / Math.max(0.7, Math.sqrt(Math.max(0.3, st)));   // afina ao esticar
        // estrela de quatro pontas (✦): lados curvados para dentro,
        // esticada/achatada pela mesma mola das bolinhas
        var R = b.r * 2.4;
        bc.setTransform(bDpr * rx / b.r, 0, 0, bDpr * ry / b.r, bDpr * b.x, bDpr * (b.y + b.off));
        bc.beginPath();
        bc.moveTo(0, -R);
        bc.quadraticCurveTo(0, 0, R, 0);
        bc.quadraticCurveTo(0, 0, 0, R);
        bc.quadraticCurveTo(0, 0, -R, 0);
        bc.quadraticCurveTo(0, 0, 0, -R);
        bc.fill();
      }
      bc.setTransform(bDpr, 0, 0, bDpr, 0, 0);
    }

    function stepBalls() {
      if (!bInView) { bRunning = false; return; }
      var y = window.scrollY;
      var v = y - lastScrollY;
      lastScrollY = y;
      scrollVel += (v - scrollVel) * 0.35;
      var target = Math.min(4, Math.abs(scrollVel) * 0.09);
      var lag = Math.max(-26, Math.min(26, -scrollVel * 0.9));
      var moving = Math.abs(scrollVel) > 0.05;
      for (var i = 0; i < ballList.length; i++) {
        var b = ballList[i];
        b.sv = (b.sv + (target - b.s) * b.k) * b.damp;
        b.s += b.sv;
        b.ov = (b.ov + (lag - b.off) * b.k) * b.damp;
        b.off += b.ov;
        if (Math.abs(b.sv) > 0.002 || Math.abs(b.s) > 0.002 || Math.abs(b.ov) > 0.02 || Math.abs(b.off) > 0.05) moving = true;
      }
      drawBalls();
      if (moving) requestAnimationFrame(stepBalls);
      else bRunning = false;                       // dorme até o próximo scroll
    }
    function wakeBalls() {
      if (!bRunning && bInView && !reduceMotionQuery.matches) {
        bRunning = true;
        requestAnimationFrame(stepBalls);
      }
    }

    buildBalls();
    if (!reduceMotionQuery.matches) {
      window.addEventListener("scroll", wakeBalls, { passive: true });
      watchInView(bSection, function (v) {
        bInView = v;
        lastScrollY = window.scrollY;
        if (v) wakeBalls();
      });
    }
    var bTimer = null;
    onWidthResize(function () {
      clearTimeout(bTimer); bTimer = setTimeout(buildBalls, 150);
    });
  }

  /* ---------------- Navbar: pílula que segue o mouse ----------------
     O vidro do "Iniciar projeto" é a própria pílula: ela mora ali, sai
     dali para o link onde o mouse entrar, desliza de link em link e,
     quando o mouse sai, volta para casa. Clicar num link muda a casa
     para esse link. Passar pelo submenu conta como estar no link de
     cima. Criada aqui para valer em todas as páginas com esta navbar. */
  var navLinks = document.querySelector(".nav-links");
  var navCta = document.querySelector(".nav-cta");
  if (navLinks && navCta) {
    var navInner = navCta.parentElement;
    var navPill = document.createElement("span");
    navPill.className = "nav-pill";
    navPill.setAttribute("aria-hidden", "true");
    navInner.insertBefore(navPill, navInner.firstChild);
    document.getElementById("nav").classList.add("has-pill");
    var navHome = navCta;
    function moveNavPill(el, instant) {
      // posição de layout (offset*), não a da tela: ignora transforms
      var x = 0, y = 0;
      for (var n = el; n && n !== navInner; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
      if (instant) navPill.style.transition = "none";
      navPill.style.width = el.offsetWidth + "px";
      navPill.style.height = el.offsetHeight + "px";
      navPill.style.transform = "translate(" + x + "px, " + y + "px)";
      if (instant) { navPill.offsetWidth; navPill.style.transition = ""; }
    }
    function goHome() { moveNavPill(navHome); }
    Array.prototype.forEach.call(navLinks.querySelectorAll(".nav-group"), function (g) {
      var a = g.querySelector(":scope > a");
      g.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse") moveNavPill(a);
      });
      a.addEventListener("focus", function () { moveNavPill(a); });
      a.addEventListener("blur", goHome);
      a.addEventListener("click", function () { navHome = a; });
    });
    navCta.addEventListener("focus", function () { moveNavPill(navCta); });
    navLinks.addEventListener("pointerleave", goHome);
    function placeHome() { moveNavPill(navHome, true); }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(placeHome);
    window.addEventListener("resize", placeHome, { passive: true });
    // trocar o idioma muda a largura dos links e do botão
    new MutationObserver(placeHome).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    // o botão de idioma (i18n.js) entra na navbar depois e empurra o
    // "Iniciar projeto" para a esquerda: reposiciona quando ele chegar
    new MutationObserver(placeHome).observe(navInner, { childList: true });
    window.addEventListener("load", placeHome);
    placeHome();
  }

  /* ---------------- Vitrine (projetos.html) ----------------
     Os cards dos fixados já vêm no HTML; aqui eles são conferidos com
     /api/site/github. Mesma lista: no máximo acrescenta as estrelas.
     Lista diferente (fixou ou tirou um repositório): reescreve tudo e
     avisa o i18n.js para traduzir os nós novos. */
  var repoGrid = document.getElementById("repoGrid");
  if (repoGrid) {
    var MODELO = repoGrid.querySelector(".repo-card").cloneNode(true);

    var estrelas = function (card, n) {
      if (!n || n === "0" || card.querySelector(".repo-stars")) return;
      var st = document.createElement("span");
      st.className = "repo-stars";
      st.textContent = "★ " + n;
      card.querySelector(".repo-lang").appendChild(st);
    };

    // ícones desenhados para cada repositório (no HTML), pelo nome
    var ICONES = {};
    Array.prototype.forEach.call(repoGrid.querySelectorAll(".repo-card"), function (c) {
      ICONES[c.querySelector(".repo-name").textContent.trim()] = c.querySelector(".row-icon").innerHTML;
    });
    var iconePadrao = document.getElementById("repoIconPadrao").innerHTML;

    var cardDe = function (r) {
      var art = MODELO.cloneNode(true);
      art.classList.add("is-visible");
      art.removeAttribute("data-desc");
      art.querySelector(".row-icon").innerHTML = ICONES[r.nome] || iconePadrao;
      var a = art.querySelector(".vit-stretch");
      a.href = r.url;
      a.textContent = r.nome;
      art.querySelector(".repo-desc").textContent = r.descricao;
      var lang = art.querySelector(".repo-lang");
      lang.textContent = "";
      if (r.linguagem) {
        var dot = document.createElement("i");
        dot.style.background = r.cor || "#8a8b94";
        lang.appendChild(dot);
        lang.appendChild(document.createTextNode(r.linguagem));
      }
      estrelas(art, r.estrelas);
      return art;
    };

    var assinatura = function (lista) {
      return lista.map(function (r) { return r.nome + "|" + r.descricao; }).join("\n");
    };
    // a descrição original vai para data-desc: em inglês o i18n troca o texto do <p>
    var atuais = Array.prototype.map.call(repoGrid.querySelectorAll(".repo-card"), function (c) {
      var desc = c.querySelector(".repo-desc").textContent.trim();
      c.setAttribute("data-desc", desc);
      return { nome: c.querySelector(".repo-name").textContent.trim(), descricao: desc, card: c };
    });

    fetch("/api/site/github").then(function (res) { return res.ok ? res.json() : null; }).then(function (d) {
      if (!d || !d.ok || !d.repos || !d.repos.length) return;
      if (assinatura(d.repos) === assinatura(atuais)) {
        d.repos.forEach(function (r, i) { estrelas(atuais[i].card, r.estrelas); });
        return;
      }
      repoGrid.classList.add("is-swapping");
      setTimeout(function () {
        repoGrid.textContent = "";
        d.repos.forEach(function (r) { repoGrid.appendChild(cardDe(r)); });
        if (window.siteI18n) window.siteI18n.mapear(repoGrid);
        repoGrid.classList.remove("is-swapping");
      }, 200);
    }).catch(function () {});
  }

  // luz que segue o mouse nos cards da vitrine (só com mouse de verdade)
  if (document.querySelector(".vit-card") && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".vit-card");
      if (!card) return;
      var box = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - box.left) + "px");
      card.style.setProperty("--my", (e.clientY - box.top) + "px");
      card.style.setProperty("--glow", "1");
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      var card = e.target.closest && e.target.closest(".vit-card");
      if (card && !card.contains(e.relatedTarget)) card.style.setProperty("--glow", "0");
    }, { passive: true });
  }

  /* ---------------- Círculo de bolinhas ----------------
     Bolinhas pretas espalhadas dentro de um círculo que gira devagar;
     cada uma passeia em volta do seu lugar e se liga às vizinhas por
     um fio que some com a distância. O cursor (ou o dedo) empurra as
     que estão perto e uma mola traz de volta. Só anima com o círculo
     na tela e a aba aberta; com movimento reduzido fica um quadro só.

     canvas: onde desenha. area: quem recebe o mouse (o canvas pode
     ficar por baixo do texto). anel: o elemento que marca o círculo
     (centro e tamanho). dispersa: passar o mouse no círculo espalha
     as bolinhas pela área inteira; saindo da área, elas voltam.
     Usado na vitrine (#vitOrb) e na chamada de projetos da home. */
  function circuloDeBolinhas(canvas, area, anel, dispersa) {
    var ctx2 = canvas.getContext("2d");
    var dpr = canvasDpr;
    var W = 0, H = 0, cx = 0, cy = 0, R = 0, pts = [];
    var mouse = { x: -9999, y: -9999 };
    var esp = 0, espAlvo = 0, volta = 0;   // 0 = no círculo, 1 = espalhadas pela área
    var visivel = false, raf = 0, t0 = performance.now(), antes = t0;

    var sorteiaDestinos = function () {
      pts.forEach(function (p) {
        p.sx = 0.04 + Math.random() * 0.92;
        p.sy = 0.06 + Math.random() * 0.88;
      });
    };

    var montar = function () {
      var box = canvas.getBoundingClientRect(), a = anel.getBoundingClientRect();
      if (!box.width || !a.width) return;
      var primeira = !W;
      W = box.width; H = box.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cx = a.left - box.left + a.width / 2;
      cy = a.top - box.top + a.height / 2;
      R = a.width * 0.44;
      if (!primeira) return; // só redimensionou: as posições são relativas a R
      var n = weakDevice ? 60 : isTouch ? 90 : a.width < 360 ? 120 : 170;
      for (var i = 0; i < n; i++) {
        // um terço na borda desenha o contorno do círculo; o resto espalha
        // por igual no disco (a raiz compensa a área maior perto da borda)
        var naBorda = i < n / 3;
        pts.push({
          r: naBorda ? 0.93 + Math.random() * 0.07 : Math.sqrt(Math.random()) * 0.88,
          a: naBorda ? (i / (n / 3)) * Math.PI * 2 + Math.random() * 0.08 : Math.random() * Math.PI * 2,
          fase: Math.random() * Math.PI * 2,
          vel: 0.4 + Math.random() * 0.7,
          amp: naBorda ? 0.008 + Math.random() * 0.01 : 0.015 + Math.random() * 0.025,
          tam: 1.4 + Math.random() * 1.4,
          atraso: Math.random(),   // na dispersão nem todas saem juntas
          // entrada: nascem espalhadas e a mola junta no círculo
          ox: (Math.random() - 0.5) * a.width * 0.9,
          oy: (Math.random() - 0.5) * a.width * 0.9,
          vx: 0, vy: 0, x: 0, y: 0, sx: 0.5, sy: 0.5
        });
      }
      sorteiaDestinos();
    };

    var suave = function (v) { return v * v * (3 - 2 * v); };

    var quadro = function (agora) {
      var t = (agora - t0) / 1000;
      var dt = Math.min(0.05, (agora - antes) / 1000);
      antes = agora;
      // espalhar é rápido (0,7s); voltar é mais calmo (1,1s)
      esp += Math.max(-dt / 1.1, Math.min(dt / 0.7, espAlvo - esp));
      if (volta && agora > volta) { espAlvo = 0; volta = 0; }
      var giro = t * 0.06;
      var raio = Math.max(R * 0.3, 60), raio2 = raio * raio;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var ang = p.a + giro;
        var hx = cx + Math.cos(ang) * p.r * R + Math.cos(t * p.vel + p.fase) * p.amp * R;
        var hy = cy + Math.sin(ang) * p.r * R + Math.sin(t * p.vel * 1.3 + p.fase) * p.amp * R;
        if (esp > 0.001) {
          var k = suave(Math.max(0, Math.min(1, esp * 1.5 - p.atraso * 0.5)));
          var dx0 = p.sx * W + Math.cos(t * p.vel * 0.6 + p.fase) * 14;
          var dy0 = p.sy * H + Math.sin(t * p.vel * 0.8 + p.fase) * 14;
          hx += (dx0 - hx) * k;
          hy += (dy0 - hy) * k;
        }
        var dx = hx + p.ox - mouse.x, dy = hy + p.oy - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < raio2 && d2 > 0.01) {
          var d = Math.sqrt(d2), f = (1 - d / raio);
          f = f * f * 2.6;
          p.vx += dx / d * f;
          p.vy += dy / d * f;
        }
        p.vx = (p.vx - p.ox * 0.035) * 0.88;
        p.vy = (p.vy - p.oy * 0.035) * 0.88;
        p.ox += p.vx;
        p.oy += p.vy;
        p.x = hx + p.ox;
        p.y = hy + p.oy;
      }

      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, W, H);
      // espalhadas, ficam longe umas das outras: o alcance do fio cresce
      var link = R * 0.24 * (1 + suave(esp) * 1.3);
      // fios em 4 tons (um beginPath por tom, não um por fio)
      var faixas = [[], [], [], []], link2 = link * link;
      for (var a = 0; a < pts.length; a++) {
        var pa = pts[a];
        for (var b = a + 1; b < pts.length; b++) {
          var pb = pts[b];
          var ex = pa.x - pb.x, ey = pa.y - pb.y, e2 = ex * ex + ey * ey;
          if (e2 < link2) faixas[Math.min(3, Math.floor(Math.sqrt(e2) / link * 4))].push(pa, pb);
        }
      }
      ctx2.lineWidth = 0.8;
      for (var q = 0; q < 4; q++) {
        var lista = faixas[q];
        if (!lista.length) continue;
        ctx2.strokeStyle = "rgba(17, 17, 22, " + (0.42 - q * 0.1) + ")";
        ctx2.beginPath();
        for (var j = 0; j < lista.length; j += 2) {
          ctx2.moveTo(lista[j].x, lista[j].y);
          ctx2.lineTo(lista[j + 1].x, lista[j + 1].y);
        }
        ctx2.stroke();
      }
      ctx2.fillStyle = "#111116";
      ctx2.beginPath();
      for (var m = 0; m < pts.length; m++) {
        var s = pts[m];
        ctx2.moveTo(s.x + s.tam, s.y);
        ctx2.arc(s.x, s.y, s.tam, 0, Math.PI * 2);
      }
      ctx2.fill();
    };

    var loop = function (agora) {
      quadro(agora);
      raf = visivel && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    var ligar = function () {
      if (!raf && visivel && !document.hidden) { antes = performance.now(); raf = requestAnimationFrame(loop); }
    };

    montar();
    if (reduceMotionQuery.matches) {
      pts.forEach(function (p) { p.ox = p.oy = 0; });
      quadro(t0);
      onWidthResize(function () { montar(); quadro(t0); });
      return;
    }
    var noCirculo = function () {
      var dx = mouse.x - cx, dy = mouse.y - cy;
      return dx * dx + dy * dy < R * R;
    };
    var espalha = function () {
      if (espAlvo === 0 && esp < 0.05) sorteiaDestinos();
      espAlvo = 1;
    };
    var pos = function (e) {
      var box = canvas.getBoundingClientRect();
      mouse.x = e.clientX - box.left;
      mouse.y = e.clientY - box.top;
    };
    var sai = function () { mouse.x = mouse.y = -9999; };
    area.addEventListener("pointermove", function (e) {
      pos(e);
      if (dispersa && e.pointerType === "mouse" && noCirculo()) espalha();
    }, { passive: true });
    area.addEventListener("pointerdown", function (e) {
      pos(e);
      // no toque: tocar no círculo espalha; elas voltam sozinhas depois de 4s
      if (dispersa && e.pointerType !== "mouse" && noCirculo()) { espalha(); volta = performance.now() + 4000; }
    }, { passive: true });
    area.addEventListener("pointerleave", function () { sai(); espAlvo = 0; });
    area.addEventListener("pointercancel", sai);
    area.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") sai(); });
    onWidthResize(montar);
    document.addEventListener("visibilitychange", ligar);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visivel = es[0].isIntersecting;
        ligar();
      }).observe(area);
    } else {
      visivel = true;
      ligar();
    }
  }

  var vitOrb = document.getElementById("vitOrb");
  if (vitOrb && vitOrb.getContext) circuloDeBolinhas(vitOrb, vitOrb, vitOrb, false);

  var homeOrb = document.getElementById("homeOrb");
  if (homeOrb && homeOrb.getContext) {
    var homeArea = homeOrb.parentElement;
    circuloDeBolinhas(homeOrb, homeArea, homeArea.querySelector(".showcase-ring"), true);
  }

  /* ---------------- Para empresas (home) ----------------
     O email vai para o painel com status "empresa" e uma mensagem fixa,
     para ficar claro que é pedido de proposta + horário de conversa. */
  var hireForm = document.getElementById("hireForm");
  if (hireForm) {
    var hireStatus = document.getElementById("hireStatus");
    var hireEn = function () { return root.lang === "en"; };
    document.getElementById("hireWhats").addEventListener("click", function () {
      this.href = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(hireEn()
        ? "Hi Gustavo! I'm reaching out on behalf of a company and would like to talk about a project."
        : "Oi, Gustavo! Sou de uma empresa e quero conversar sobre um projeto.");
      track("Contact", { content_name: "empresas", channel: "whatsapp" });
    });
    hireForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var campo = hireForm.email;
      var email = campo.value.trim();
      if (!email || !campo.checkValidity()) {
        hireStatus.classList.remove("is-ok");
        hireStatus.textContent = hireEn() ? "Type a valid email so I can send the proposal." : "Digite um email válido para eu mandar a proposta.";
        campo.focus();
        return;
      }
      if (window.siteLead) window.siteLead({
        email: email,
        mensagem: "EMPRESA: pediu proposta e um horário para conversar. Mandar a proposta para este email."
      }, "empresa", "em");
      track("Lead", { content_name: "empresas", channel: "email" });
      if (window.siteTrack) window.siteTrack("contato", "empresas / email");
      hireForm.classList.add("is-sent");
      hireStatus.classList.add("is-ok");
      hireStatus.textContent = hireEn()
        ? "Got it! I'll email you a proposal and a time for us to talk."
        : "Recebido! Vou te mandar a proposta e um horário para conversarmos.";
    });
  }

  /* ---------------- Pixels na emenda faixa azul → Para empresas ----------------
     Quadradinhos na cor do degradê da faixa, mais densos colados nela e
     rareando para baixo; cada um acende e apaga devagar no seu ritmo.
     Desenha a cada quadro (60 fps) e só com a emenda na tela. */
  var pxCanvas = document.getElementById("hirePixels");
  if (pxCanvas && pxCanvas.getContext) {
    var pxCtx = pxCanvas.getContext("2d");
    var PX = 10, pxLista = [], pxW = 0, pxH = 0, pxVisivel = false, pxRaf = 0, pxUltimo = 0;
    var corDe = function (nome) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
      var m = v.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [47, 91, 255];
    };
    var pxCor1 = corDe("--brand"), pxCor2 = corDe("--brand-deep");
    var pxMontar = function () {
      var box = pxCanvas.getBoundingClientRect();
      if (!box.width) return;
      var dpr = canvasDpr;
      pxW = box.width; pxH = box.height;
      pxCanvas.width = Math.round(pxW * dpr);
      pxCanvas.height = Math.round(pxH * dpr);
      pxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pxLista = [];
      var linhas = Math.floor(pxH / PX), colunas = Math.ceil(pxW / PX);
      for (var r = 0; r < linhas; r++) {
        var chance = 0.5 * Math.pow(1 - r / linhas, 1.8);
        for (var c = 0; c < colunas; c++) {
          if (Math.random() > chance) continue;
          // a faixa vai de --brand (esquerda) a --brand-deep (direita) embaixo
          var t = 0.5 + 0.5 * (c / colunas);
          pxLista.push({
            x: c * PX, y: r * PX,
            cor: "rgb(" + [0, 1, 2].map(function (i) { return Math.round(pxCor1[i] + (pxCor2[i] - pxCor1[i]) * t); }).join(",") + ")",
            base: r === 0 ? 0.55 : 0.1,
            fase: Math.random() * Math.PI * 2,
            vel: (Math.PI * 2) / (3 + Math.random() * 5)   // um ciclo a cada 3–8s
          });
        }
      }
    };
    var pxDesenhar = function (agora) {
      var t = agora / 1000;
      pxCtx.clearRect(0, 0, pxW, pxH);
      for (var i = 0; i < pxLista.length; i++) {
        var p = pxLista[i];
        var onda = 0.5 + 0.5 * Math.sin(t * p.vel + p.fase);
        pxCtx.globalAlpha = p.base + (1 - p.base) * onda * onda;
        pxCtx.fillStyle = p.cor;
        pxCtx.fillRect(p.x, p.y, PX, PX);
      }
      pxCtx.globalAlpha = 1;
    };
    var pxLoop = function (agora) {
      pxDesenhar(agora);
      pxRaf = pxVisivel && !document.hidden ? requestAnimationFrame(pxLoop) : 0;
    };
    var pxLigar = function () { if (!pxRaf && pxVisivel && !document.hidden) pxRaf = requestAnimationFrame(pxLoop); };
    pxMontar();
    onWidthResize(function () { pxMontar(); pxDesenhar(performance.now()); });
    if (reduceMotionQuery.matches) {
      pxDesenhar(0);
    } else {
      document.addEventListener("visibilitychange", pxLigar);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { pxVisivel = es[0].isIntersecting; pxLigar(); }).observe(pxCanvas);
      } else { pxVisivel = true; pxLigar(); }
    }
  }

  /* ---------------- Página de contato (contato.html) ---------------- */
  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    var sendBtn = document.getElementById("contactSend");
    var statusEl = document.getElementById("contactStatus");

    /* Um caminho só, de propósito. Antes havia três canais em
       botões de rádio, e a escolha era falsa: no Instagram e no
       WhatsApp o texto escrito não ia junto — o link `wa.me/message/…`
       não aceita mensagem pré-preenchida, então o site copiava tudo
       para a área de transferência e torcia para a pessoa colar.
       Com o número na mão dá para mandar o texto DE VERDADE na URL,
       e aí a escolha não precisa mais existir: o que a pessoa
       escreve chega escrito. */
    function salvaLead(status) {
      if (window.siteLead) window.siteLead({
        nome: contactForm.nome.value.trim(),
        email: contactForm.email.value.trim(),
        mensagem: contactForm.mensagem.value.trim(),
      }, status);
    }
    /* quem escreve e vai embora sem enviar também fica no painel */
    contactForm.addEventListener("focusout", function () { salvaLead("rascunho"); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") salvaLead("rascunho");
    });

    function buildMessage() {
      var nome = contactForm.nome.value.trim();
      var email = contactForm.email.value.trim();
      var msg = contactForm.mensagem.value.trim();
      var texto = "Oi, sou " + nome + ".\n\n" + msg;
      if (email) texto += "\n\nMeu email, se preferir: " + email;
      return texto;
    }

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!contactForm.reportValidity()) return;

      var url = "https://wa.me/" + WA_PHONE +
                "?text=" + encodeURIComponent(buildMessage());

      /* A conversão do site é esta: alguém sair daqui para a conversa.
         `Contact` é evento padrão do Meta, então dá para otimizar
         campanha por ele sem configurar conversão personalizada.

         Vai ANTES do window.open de propósito — em parte do tráfego o
         navegador troca de contexto na hora e o que ficou para depois
         não chega a ser enviado. `fbq` é síncrono, então isto não
         atrapalha a abertura nem sai do gesto do clique. */
      track("Contact", { content_name: "form contato", channel: "whatsapp" });
      salvaLead("whatsapp");

      statusEl.textContent = "abrindo o WhatsApp com a sua mensagem pronta…";
      window.open(url, "_blank", "noopener");
    });

    /* Quem deixa o email pode não querer WhatsApp: aparece um segundo
       botão que abre o app de email da pessoa com a mensagem pronta,
       endereçada a mim. Sem servidor — quem envia é o app dela. */
    var mailBtn = document.getElementById("contactMail");
    if (mailBtn) {
      /* Entra como bolha (CSS .is-popping) e sai murchando (.is-leaving).
         No celular o botão nasce atrás do teclado: ele já ocupa o lugar,
         invisível (.is-waiting), e a bolha só estoura quando ele aparece
         de fato na parte visível da tela (teclado fechado, rolagem). */
      var vv = window.visualViewport;
      function mailVisivel() {
        var r = mailBtn.getBoundingClientRect();
        var topo = vv ? vv.offsetTop : 0, alt = vv ? vv.height : window.innerHeight;
        return r.top < topo + alt - 12 && r.bottom > topo + 12;
      }
      function estoura() {
        if (!mailBtn.classList.contains("is-waiting") || !mailVisivel()) return;
        mailBtn.classList.remove("is-waiting", "is-popping");
        mailBtn.offsetWidth;                       // reinicia a animação
        mailBtn.classList.add("is-popping");
      }
      window.addEventListener("scroll", estoura, { passive: true });
      if (vv) { vv.addEventListener("resize", estoura); vv.addEventListener("scroll", estoura); }
      contactForm.addEventListener("focusout", function () { setTimeout(estoura, 350); });
      contactForm.email.addEventListener("input", function () {
        var show = !!contactForm.email.value.trim();
        if (show && (mailBtn.hidden || mailBtn.classList.contains("is-leaving"))) {
          mailBtn.classList.remove("is-leaving", "is-popping");
          mailBtn.hidden = false;
          mailBtn.classList.add("is-waiting");
          estoura();
        } else if (!show && !mailBtn.hidden && mailBtn.classList.contains("is-waiting")) {
          mailBtn.classList.remove("is-waiting");
          mailBtn.hidden = true;
        } else if (!show && !mailBtn.hidden && !mailBtn.classList.contains("is-leaving")) {
          if (reduceMotionQuery.matches) { mailBtn.hidden = true; return; }
          mailBtn.classList.remove("is-popping");
          mailBtn.classList.add("is-leaving");
        }
      });
      mailBtn.addEventListener("animationend", function (e) {
        if (e.animationName !== "bubble-out") return;
        mailBtn.classList.remove("is-leaving");
        mailBtn.hidden = true;
      });
      mailBtn.addEventListener("click", function () {
        if (!contactForm.reportValidity()) return;
        var nome = contactForm.nome.value.trim();
        var corpo = "Oi, sou " + nome + ".\n\n" + contactForm.mensagem.value.trim();
        var url = "mailto:" + CONTACT_EMAIL +
                  "?subject=" + encodeURIComponent("Projeto — " + nome) +
                  "&body=" + encodeURIComponent(corpo);
        track("Contact", { content_name: "form contato", channel: "email" });
        salvaLead("email");
        statusEl.textContent = "abrindo o seu email com a mensagem pronta…";
        window.location.href = url;
      });
    }
  }

  /* ---------------- Conversa simulada (home) ----------------
     Na metade da página aparece uma bolinha de conversa; chegam duas
     "notificações" (o número sobe 1 → 2, com a prévia da mensagem).
     Ao clicar, abre uma conversa roteirizada — sem IA, sem servidor:
     cada passo é uma pergunta com respostas prontas (ou campo livre).
     Objetivo nº 1: descobrir O QUE a pessoa quer criar; depois para
     quê, para quando e o nome, e então leva para o WhatsApp com a
     mensagem pronta. As respostas vão para o painel (site_leads com
     status "conversa" + eventos "chat").

     O ROTEIRO SÃO OS OBJETOS CHAT_PT E CHAT_EN LOGO ABAIXO: mude os
     textos ali (os dois têm a mesma forma). O idioma segue o botão de
     idioma do site: as notificações usam o idioma da hora em que chegam,
     e a conversa fica no idioma em que foi aberta. */
  var CHAT_PT = {
    avisos: [
      "Oi! Aqui é o Gustavo 👋",
      "Vi que você já passou da metade da página. Posso te fazer uma pergunta rápida?",
    ],
    tipo: {
      pergunta: "Me conta: o que você tem vontade de criar?",
      opcoes: [
        ["Página de vendas", "Boa! Página de vendas é onde o tráfego vira dinheiro, e cada segundo a mais de carregamento custa venda. Eu faço do zero, rápida, com checkout e pixel prontos."],
        ["Landing page", "Ótimo. Uma landing bem feita é a diferença entre pagar caro ou barato por cada contato. Foco total em um objetivo só."],
        ["Site para minha empresa", "Perfeito. Hoje o cliente pesquisa antes de chamar: um site rápido e bem feito é o que passa confiança e aparece no Google."],
        ["Sistema web", "Legal! Sistema sob medida é o que tira a empresa da planilha e do retrabalho. Eu faço tudo, do banco de dados à tela."],
        ["Aplicativo", "Show! App é onde o seu cliente fica com você no bolso. Eu cuido de tudo, da ideia à publicação na loja."],
        ["Automação", "Gosto muito dessas. Tarefa repetitiva que passa a rodar sozinha é tempo e dinheiro de volta, todo mês."],
        ["Ainda não sei", null],
        ["Outra coisa", null],
      ],
      // "Ainda não sei" e "Outra coisa" abrem o campo livre
      livre: {
        "Ainda não sei": "Tranquilo, muita gente chega assim. Me conta em poucas palavras o problema que você quer resolver:",
        "Outra coisa": "Me conta em poucas palavras o que você imagina:",
      },
      respostaLivre: "Entendi. Dá pra fazer sim: se roda numa tela, eu construo.",
    },
    objetivo: {
      pergunta: "E qual é o principal objetivo com isso?",
      opcoes: ["Vender mais", "Conseguir mais contatos", "Organizar meu negócio", "Passar mais credibilidade", "Economizar tempo"],
      resposta: "Faz sentido. É exatamente esse tipo de resultado que eu persigo em cada projeto, não só deixar bonito.",
    },
    prazo: {
      pergunta: "Pra quando você precisa?",
      opcoes: [
        ["O quanto antes", "Consigo te passar um prazo real já na primeira conversa, sem enrolação."],
        ["Neste mês", "Dá tempo de fazer bem feito. Quanto antes a gente alinhar, melhor."],
        ["Nos próximos meses", "Ótimo, com folga dá pra planejar com calma e acertar de primeira."],
        ["Só estou pesquisando", "Sem problema nenhum. Conversar não te compromete com nada."],
      ],
    },
    nome: { pergunta: "Pra eu te chamar direito: qual é o seu nome?" },
    final: [
      "Prazer, {nome}! Já tenho o que preciso pra te passar um diagnóstico honesto, com prazo e valor.",
      "É só me chamar no WhatsApp que a sua mensagem já vai pronta 👇",
    ],
    whatsapp: "Oi Gustavo, sou {nome}. Vim pelo site.\n\nQuero criar: {tipo}\nObjetivo: {objetivo}\nPrazo: {prazo}",
    ui: {
      exemplo: "Ex.: um app de agendamento",
      seuNome: "Seu nome",
      resposta: "Sua resposta",
      enviar: "Enviar",
      digitando: "digitando",
      digite: "Digite aqui…",
      cta: "Continuar no WhatsApp",
      alt: "Prefiro escrever por email",
    },
  };
  var CHAT_EN = {
    avisos: [
      "Hi! Gustavo here 👋",
      "I see you're already halfway down the page. Can I ask you a quick question?",
    ],
    tipo: {
      pergunta: "Tell me: what would you like to build?",
      opcoes: [
        ["Sales page", "Nice! A sales page is where traffic turns into money, and every extra second of loading costs sales. I build it from scratch, fast, with checkout and pixel ready."],
        ["Landing page", "Great. A well-made landing page is the difference between paying a lot or a little for each lead. Total focus on a single goal."],
        ["Website for my business", "Perfect. Clients research before they reach out: a fast, well-built site is what earns trust and shows up on Google."],
        ["Web system", "Cool! A custom system is what gets a business off spreadsheets and rework. I do it all, from database to screen."],
        ["App", "Awesome! An app keeps your customer with you, right in their pocket. I handle everything, from the idea to the store release."],
        ["Automation", "I love these. A repetitive task that starts running on its own is time and money back, every month."],
        ["Not sure yet", null],
        ["Something else", null],
      ],
      livre: {
        "Not sure yet": "No problem, a lot of people start like that. Tell me in a few words the problem you want to solve:",
        "Something else": "Tell me in a few words what you have in mind:",
      },
      respostaLivre: "Got it. That's doable: if it runs on a screen, I can build it.",
    },
    objetivo: {
      pergunta: "And what's the main goal with it?",
      opcoes: ["Sell more", "Get more leads", "Organize my business", "Look more credible", "Save time"],
      resposta: "Makes sense. That's exactly the kind of result I aim for in every project, not just making it look good.",
    },
    prazo: {
      pergunta: "When do you need it?",
      opcoes: [
        ["As soon as possible", "I can give you a real deadline in our very first conversation, no runaround."],
        ["This month", "There's time to do it right. The sooner we align, the better."],
        ["In the next few months", "Great, with some slack we can plan calmly and get it right the first time."],
        ["Just researching", "No problem at all. Talking doesn't commit you to anything."],
      ],
    },
    nome: { pergunta: "So I can address you properly: what's your name?" },
    final: [
      "Nice to meet you, {nome}! I've got what I need to give you an honest assessment, with timeline and price.",
      "Just message me on WhatsApp and your message will already be written 👇",
    ],
    whatsapp: "Hi Gustavo, I'm {nome}. I found you through your website.\n\nI want to build: {tipo}\nGoal: {objetivo}\nTimeline: {prazo}",
    ui: {
      exemplo: "E.g.: a booking app",
      seuNome: "Your name",
      resposta: "Your answer",
      enviar: "Send",
      digitando: "typing",
      digite: "Type here…",
      cta: "Continue on WhatsApp",
      alt: "I'd rather write by email",
    },
  };
  function idioma() { return /^en/.test(document.documentElement.lang) ? CHAT_EN : CHAT_PT; }

  var chatGatilho = document.getElementById("servicos");
  if (chatGatilho && document.getElementById("processo")) {
    var respostas = { tipo: "", objetivo: "", prazo: "", nome: "" };
    var chatVisto = false;
    try { chatVisto = sessionStorage.getItem("gr_chat") === "1"; } catch (e) {}
    function chatEv(alvo) { if (window.siteTrack) window.siteTrack("chat", alvo); }
    function salvaConversa() {
      if (!window.siteLead) return;
      window.siteLead({
        nome: respostas.nome,
        mensagem: "[Conversa] Quer criar: " + (respostas.tipo || "?") +
                  (respostas.objetivo ? " · Objetivo: " + respostas.objetivo : "") +
                  (respostas.prazo ? " · Prazo: " + respostas.prazo : ""),
      }, "conversa");
    }

    var ICONE_CHAT = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5c0-4.1 3.6-7.5 8-7.5s8 3.4 8 7.5S16.4 20 12 20c-1.2 0-2.3-.2-3.3-.6L4.5 20.5l1.2-3.6C4.6 15.7 4 14.2 4 12.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8.5" cy="12.5" r="1" fill="currentColor"/><circle cx="12" cy="12.5" r="1" fill="currentColor"/><circle cx="15.5" cy="12.5" r="1" fill="currentColor"/></svg>';
    var fab = document.createElement("div");
    fab.className = "chat-fab-wrap";
    fab.innerHTML =
      '<p class="chat-preview" aria-hidden="true"></p>' +
      '<button type="button" class="chat-fab liquid-glass liquid-glass--round" aria-label="Abrir conversa com o Gustavo" aria-expanded="false" aria-controls="chatBox">' +
        ICONE_CHAT + '<span class="chat-badge" aria-hidden="true"></span></button>';
    var box = document.createElement("section");
    box.className = "chat-box";
    box.id = "chatBox";
    box.setAttribute("aria-label", "Conversa com o Gustavo");
    box.hidden = true;
    box.innerHTML =
      '<header class="chat-head"><span class="chat-avatar" aria-hidden="true">G</span>' +
        '<div><b>Gustavo</b><small><i></i> online agora</small></div>' +
        '<button type="button" class="chat-close" aria-label="Fechar conversa">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></header>' +
      '<div class="chat-log" role="log" aria-live="polite"></div>' +
      '<div class="chat-foot"></div>';
    document.body.appendChild(fab);
    document.body.appendChild(box);
    var fabBtn = fab.querySelector(".chat-fab");
    var badge = fab.querySelector(".chat-badge");
    var preview = fab.querySelector(".chat-preview");
    var log = box.querySelector(".chat-log");
    var foot = box.querySelector(".chat-foot");
    var iniciou = false, aberto = false, timers = [];
    if ("ResizeObserver" in window) new ResizeObserver(function () { rolaFim(); }).observe(foot);

    function espera(ms) { return new Promise(function (r) { timers.push(setTimeout(r, reduceMotionQuery.matches ? 0 : ms)); }); }
    function rolaFim() { log.scrollTop = log.scrollHeight; }
    function bolha(texto, quem) {
      var b = document.createElement("p");
      b.className = "chat-msg chat-msg--" + quem;
      b.textContent = texto;
      log.appendChild(b);
      rolaFim();
      return b;
    }
    // "digitando…" proporcional ao tamanho da frase, depois a mensagem
    function gustavo(texto) {
      var t = document.createElement("p");
      t.className = "chat-msg chat-msg--g chat-typing";
      t.setAttribute("aria-label", idioma().ui.digitando);
      t.innerHTML = "<i></i><i></i><i></i>";
      log.appendChild(t);
      rolaFim();
      return espera(Math.min(1700, 500 + texto.length * 18)).then(function () {
        t.remove();
        bolha(texto, "g");
        return espera(350);
      });
    }
    function limpaFoot() { foot.innerHTML = ""; }
    /* Como numa conversa de verdade: embaixo fica só um campo "Digite
       aqui…"; as respostas prontas aparecem quando a pessoa toca nele.
       Assim a pergunta nova não fica escondida atrás dos botões. */
    function opcoes(lista) {
      return new Promise(function (resolve) {
        limpaFoot();
        var abrir = document.createElement("button");
        abrir.type = "button";
        abrir.className = "chat-input chat-input--fake liquid-glass";
        abrir.innerHTML = "<span></span>" + '<i aria-hidden="true">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></i>';
        abrir.querySelector("span").textContent = idioma().ui.digite;
        abrir.addEventListener("click", function () { limpaFoot(); foot.appendChild(wrap); });
        foot.appendChild(abrir);
        var wrap = document.createElement("div");
        wrap.className = "chat-chips";
        lista.forEach(function (rot) {
          var c = document.createElement("button");
          c.type = "button";
          c.className = "chat-chip liquid-glass";
          c.textContent = rot;
          c.addEventListener("click", function () { limpaFoot(); bolha(rot, "eu"); resolve(rot); });
          wrap.appendChild(c);
        });
      });
    }
    function campo(placeholder) {
      return new Promise(function (resolve) {
        limpaFoot();
        var f = document.createElement("form");
        f.className = "chat-input liquid-glass";
        f.innerHTML = '<input type="text" maxlength="200" required>' +
          '<button type="submit" class="liquid-glass--round">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
        var inp = f.querySelector("input");
        inp.placeholder = placeholder;
        inp.setAttribute("aria-label", idioma().ui.resposta);
        f.querySelector("button").setAttribute("aria-label", idioma().ui.enviar);
        f.addEventListener("submit", function (e) {
          e.preventDefault();
          var v = inp.value.trim();
          if (!v) return;
          limpaFoot(); bolha(v, "eu"); resolve(v);
        });
        foot.appendChild(f);
        if (!matchMedia("(pointer: coarse)").matches) inp.focus({ preventScroll: true });
      });
    }

    function roteiro() {
      var txt;
      var CHAT = idioma();
      return gustavo(CHAT.tipo.pergunta)
        .then(function () { return opcoes(CHAT.tipo.opcoes.map(function (o) { return o[0]; })); })
        .then(function (esc) {
          var item = CHAT.tipo.opcoes.filter(function (o) { return o[0] === esc; })[0];
          if (item && item[1]) { respostas.tipo = esc; chatEv("tipo: " + esc); return gustavo(item[1]); }
          return gustavo(CHAT.tipo.livre[esc]).then(function () { return campo(CHAT.ui.exemplo); })
            .then(function (v) { respostas.tipo = v; chatEv("tipo: " + esc); return gustavo(CHAT.tipo.respostaLivre); });
        })
        .then(function () { salvaConversa(); return gustavo(CHAT.objetivo.pergunta); })
        .then(function () { return opcoes(CHAT.objetivo.opcoes); })
        .then(function (esc) { respostas.objetivo = esc; chatEv("objetivo: " + esc); salvaConversa(); return gustavo(CHAT.objetivo.resposta); })
        .then(function () { return gustavo(CHAT.prazo.pergunta); })
        .then(function () { return opcoes(CHAT.prazo.opcoes.map(function (o) { return o[0]; })); })
        .then(function (esc) {
          respostas.prazo = esc; chatEv("prazo: " + esc); salvaConversa();
          return gustavo(CHAT.prazo.opcoes.filter(function (o) { return o[0] === esc; })[0][1]);
        })
        .then(function () { return gustavo(CHAT.nome.pergunta); })
        .then(function () { return campo(CHAT.ui.seuNome); })
        .then(function (v) {
          respostas.nome = v; chatEv("nome"); salvaConversa();
          txt = function (s) { return s.replace(/\{(\w+)\}/g, function (_, k) { return respostas[k] || "—"; }); };
          return gustavo(txt(CHAT.final[0]));
        })
        .then(function () { return gustavo(txt(CHAT.final[1])); })
        .then(function () {
          limpaFoot();
          var wa = document.createElement("a");
          wa.className = "btn btn-primary chat-cta";
          wa.href = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(txt(CHAT.whatsapp));
          wa.target = "_blank";
          wa.rel = "noopener";
          wa.textContent = CHAT.ui.cta;
          wa.addEventListener("click", function () {
            track("Contact", { content_name: "conversa", channel: "whatsapp" });
            if (window.siteLead) window.siteLead({ nome: respostas.nome }, "whatsapp");
          });
          var mail = document.createElement("a");
          mail.className = "chat-alt";
          mail.href = "contato.html";
          mail.textContent = CHAT.ui.alt;
          foot.appendChild(wa);
          foot.appendChild(mail);
        });
    }

    function abre() {
      aberto = true;
      box.hidden = false;
      box.offsetWidth;
      box.classList.add("is-open");
      fab.classList.add("is-open");
      fabBtn.setAttribute("aria-expanded", "true");
      badge.textContent = ""; fab.classList.remove("has-badge");
      try { sessionStorage.setItem("gr_chat", "1"); } catch (e) {}
      if (iniciou) return;
      iniciou = true;
      chatEv("abriu");
      timers.forEach(clearTimeout);                  // as notificações já chegaram
      idioma().avisos.forEach(function (a) { bolha(a, "g"); });
      espera(500).then(roteiro);
    }
    function fecha() {
      aberto = false;
      box.classList.remove("is-open");
      fab.classList.remove("is-open");
      fabBtn.setAttribute("aria-expanded", "false");
      setTimeout(function () { if (!aberto) box.hidden = true; }, 300);
      fabBtn.focus({ preventScroll: true });
    }
    fabBtn.addEventListener("click", function () { aberto ? fecha() : abre(); });
    preview.addEventListener("click", abre);
    box.querySelector(".chat-close").addEventListener("click", fecha);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && aberto) fecha(); });

    // aparece na metade da página; notificações 1 e 2 só na primeira vez da visita
    function notifica(n) {
      if (iniciou) return;
      badge.textContent = String(n);
      fab.classList.add("has-badge");
      badge.classList.remove("is-pop"); badge.offsetWidth; badge.classList.add("is-pop");
      preview.textContent = idioma().avisos[n - 1];
      fab.classList.add("has-preview");
    }
    function chegou() {
      if (fab.classList.contains("is-on")) return;
      fab.classList.add("is-on");
      chatEv("apareceu");
      if (chatVisto) return;
      timers.push(setTimeout(function () { notifica(1); }, 1200));
      timers.push(setTimeout(function () { notifica(2); }, 3400));
      timers.push(setTimeout(function () { fab.classList.remove("has-preview"); }, 11000));
    }
    var metadeTick = false;
    function olhaMetade() {
      metadeTick = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.45) { chegou(); window.removeEventListener("scroll", aoRolarChat); }
    }
    function aoRolarChat() { if (!metadeTick) { metadeTick = true; requestAnimationFrame(olhaMetade); } }
    window.addEventListener("scroll", aoRolarChat, { passive: true });
    olhaMetade();

    // trocou o idioma: a prévia muda e a conversa já começada recomeça no idioma novo
    var chatLang = idioma();
    new MutationObserver(function () {
      if (idioma() === chatLang) return;           // o i18n regrava o mesmo lang a cada mapear()
      chatLang = idioma();
      if (!iniciou) {
        var n = Number(badge.textContent);
        if (n) preview.textContent = idioma().avisos[n - 1];
        return;
      }
      timers.forEach(clearTimeout);                  // a espera pendente nunca resolve: o roteiro antigo para
      timers = [];
      log.innerHTML = "";
      limpaFoot();
      respostas = { tipo: "", objetivo: "", prazo: "", nome: "" };
      idioma().avisos.forEach(function (a) { bolha(a, "g"); });
      espera(500).then(roteiro);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  /* ---------------- Serviços: painel com abas ----------------
     Padrão ARIA de abas: clique ou setas trocam o painel. A pílula de
     liquid glass segue o mouse de aba em aba e, quando ele sai da
     fileira, volta para a aba ativa (só transform e width). */
  var svcTabs = Array.prototype.slice.call(document.querySelectorAll(".svc-tab"));
  var svcPill = document.querySelector(".svc-pill");
  if (svcTabs.length && svcPill) {
    function placePill(tab) {
      var to = tab || svcTabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
      if (!to) return;
      svcPill.style.width = to.offsetWidth + "px";
      svcPill.style.transform = "translateX(" + to.offsetLeft + "px)";
    }
    function selectTab(tab, focus) {
      svcTabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.hidden = !on;
        panel.classList.toggle("is-active", on);
      });
      if (focus) tab.focus();
      // no celular a fileira rola: traz a aba escolhida para a vista
      tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotionQuery.matches ? "auto" : "smooth" });
      placePill();
    }
    svcTabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectTab(tab); });
      // só mouse: no toque não existe "passar por cima"
      tab.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse") placePill(tab);
      });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = svcTabs[(i + 1) % svcTabs.length];
        if (e.key === "ArrowLeft") next = svcTabs[(i - 1 + svcTabs.length) % svcTabs.length];
        if (e.key === "Home") next = svcTabs[0];
        if (e.key === "End") next = svcTabs[svcTabs.length - 1];
        if (next) { e.preventDefault(); selectTab(next, true); }
      });
    });
    svcTabs[0].parentElement.addEventListener("pointerleave", function () { placePill(); });

    /* Fileira que rola (celular): setas nas pontas avisam que tem mais
       abas e rolam ao tocar; somem quando chega na ponta. Na primeira
       vez que a fileira aparece, ela dá uma espiada para a direita e
       volta, para mostrar que mexe. */
    var tabsRow = svcTabs[0].parentElement;
    var tabsWrap = tabsRow.parentElement;
    function marcaPontas() {
      var resto = tabsRow.scrollWidth - tabsRow.clientWidth - tabsRow.scrollLeft;
      tabsWrap.classList.toggle("has-next", resto > 4);
      tabsWrap.classList.toggle("has-prev", tabsRow.scrollLeft > 4);
    }
    tabsRow.addEventListener("scroll", marcaPontas, { passive: true });
    window.addEventListener("resize", marcaPontas, { passive: true });
    Array.prototype.forEach.call(tabsWrap.querySelectorAll(".svc-more"), function (b) {
      b.addEventListener("click", function () {
        var dir = b.classList.contains("svc-more--next") ? 1 : -1;
        tabsRow.scrollBy({ left: dir * tabsRow.clientWidth * 0.7, behavior: reduceMotionQuery.matches ? "auto" : "smooth" });
      });
    });
    marcaPontas();
    if ("IntersectionObserver" in window && !reduceMotionQuery.matches) {
      var espiada = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        espiada.disconnect();
        if (tabsRow.scrollWidth - tabsRow.clientWidth < 8 || tabsRow.scrollLeft > 4) return;
        setTimeout(function () {
          tabsRow.scrollTo({ left: 70, behavior: "smooth" });
          setTimeout(function () { tabsRow.scrollTo({ left: 0, behavior: "smooth" }); }, 650);
        }, 500);
      }, { threshold: 0.8 });
      espiada.observe(tabsRow);
    }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { placePill(); });
    window.addEventListener("resize", function () { placePill(); }, { passive: true });
    // trocar o idioma muda a largura das abas
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".lang-toggle")) setTimeout(function () { placePill(); }, 0);
    });
  }

  /* ---------------- Abertura da hero ----------------
     O <head> já decidiu se toca (classe .intro no <html>). Aqui só
     a linha do tempo: "Eu construo" sobe → afunda na parede branca →
     "seu software." nasce dela → a frase se completa, o vidro aparece
     e a rolagem é liberada. Qualquer tentativa de rolar, tecla ou
     toque pula direto para o fim: quem tem pressa não fica preso. */
  var root = document.documentElement;
  var heroTitle = document.getElementById("heroTitle");
  if (root.classList.contains("intro") && heroTitle) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    var introTimers = [];
    var introDone = false;
    var introCount = document.getElementById("introCount");
    var INTRO_MS = 2100;

    // contador do canto: 00→100 no ritmo da cena
    function runCounter() {
      var t0 = performance.now();
      (function tick(now) {
        if (introDone) return;
        var p = Math.min(1, (now - t0) / INTRO_MS);
        introCount.textContent = String(Math.round(p * 100)).padStart(2, "0");
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }

    // leva o título ao centro da tela enquanto a cena roda
    function centerTitle() {
      var prev = heroTitle.style.transition;
      heroTitle.style.transition = "none";
      heroTitle.style.setProperty("--intro-y", "0px");
      var r = heroTitle.getBoundingClientRect();
      var shift = window.innerHeight / 2 - (r.top + r.height / 2);
      heroTitle.style.setProperty("--intro-y", shift.toFixed(1) + "px");
      heroTitle.offsetHeight; // aplica sem animar
      heroTitle.style.transition = prev;
    }

    function finishIntro() {
      if (introDone) return;
      introDone = true;
      introTimers.forEach(clearTimeout);
      if (introCount) introCount.textContent = "100";
      root.classList.remove("intro", "intro-s1", "intro-s2");
      try { sessionStorage.setItem("intro_seen", "1"); } catch (e) {}
      ["wheel", "touchmove", "keydown", "pointerdown"].forEach(function (ev) {
        window.removeEventListener(ev, finishIntro);
      });
      window.removeEventListener("resize", centerTitle);
    }

    ["wheel", "touchmove", "keydown", "pointerdown"].forEach(function (ev) {
      window.addEventListener(ev, finishIntro, { passive: true });
    });
    window.addEventListener("resize", centerTitle, { passive: true });

    // espera as fontes no máximo 300ms: rede lenta não pode segurar a
    // abertura. Se a fonte chegar depois, recentraliza.
    var fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () { if (!introDone) centerTitle(); });
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 300); })]).then(function () {
      if (introDone) return;
      centerTitle();
      if (introCount) runCounter();
      introTimers.push(setTimeout(function () { root.classList.add("intro-s1"); }, 40));
      introTimers.push(setTimeout(function () {
        root.classList.remove("intro-s1");
        root.classList.add("intro-s2");
      }, 1000));
      introTimers.push(setTimeout(finishIntro, INTRO_MS));
    });
  }

  /* ---------------- "Sinta-se à vontade": perguntas da hero ----------------
     Não é IA: é uma lista de perguntas frequentes com palavras-chave
     (pt e en). A pergunta é normalizada (minúscula, sem acento), a
     regra com mais palavras encontradas responde. Sem acerto, a
     resposta oferece levar a pergunta pronta para o WhatsApp.
     Toda resposta aqui só repete o que o site já afirma — não invente
     preço nem prazo nesta lista. */
  var askForm = document.getElementById("askForm");
  if (askForm) {
    var askInput = document.getElementById("askInput");
    var askLog = document.getElementById("askLog");
    var askBusy = false;

    var WA_LINK = { href: "wa", pt: "Falar comigo no WhatsApp", en: "Talk to me on WhatsApp" };
    var START_LINK = { href: "contato.html", pt: "Iniciar um projeto", en: "Start a project" };

    var ASK_RULES = [
      { k: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "hello", "hi ", "hey"],
        pt: "Oi! Pode perguntar à vontade: preço, prazo, pagamento, tecnologia ou o tipo de projeto que você tem em mente.",
        en: "Hi! Ask away: price, timeline, payment, tech stack or the kind of project you have in mind." },
      { k: ["quanto", "custa", "preco", "valor", "orcamento", "caro", "barato", "price", "cost", "budget", "how much", "quote"],
        pt: "Depende do escopo: uma landing page é bem diferente de um sistema com login e banco de dados. Por isso o preço sai fechado depois de uma conversa rápida, por escrito, antes de qualquer linha de código. E você só paga no final, com tudo entregue e aprovado.",
        en: "It depends on scope: a landing page is very different from a system with login and a database. So the price is fixed after a quick conversation, in writing, before any code. And you only pay at the end, once everything is delivered and approved.",
        action: START_LINK },
      { k: ["prazo", "tempo", "demora", "quando", "rapido", "dias", "semanas", "entrega", "deadline", "how long", "timeline", "when"],
        pt: "O prazo é definido junto com o escopo, logo no começo, e vai para o contrato. Durante o projeto você acompanha entregas visíveis, sem esperar um \"big bang\" no final.",
        en: "The timeline is set together with the scope, right at the start, and goes into the contract. During the project you follow visible deliveries instead of waiting for a big bang at the end.",
        action: START_LINK },
      { k: ["pagamento", "pagar", "pago", "parcela", "pix", "cartao", "adiantado", "entrada", "payment", "pay", "upfront"],
        pt: "Você só paga no final, quando o serviço estiver entregue e aprovado. O risco fica comigo, não com você.",
        en: "You only pay at the end, once the work is delivered and approved. The risk is mine, not yours." },
      { k: ["contrato", "garantia", "seguranca", "confiar", "golpe", "contract", "guarantee", "trust"],
        pt: "Tudo que a gente combinar vira contrato, com escopo e entregas documentados. Somado ao pagamento só no final, é segurança para os dois lados.",
        en: "Everything we agree on becomes a contract, with scope and deliverables in writing. Together with payment only at the end, that's safety for both sides." },
      { k: ["pagina de venda", "paginas de venda", "vsl", "checkout", "pixel", "trafego", "sales page", "funil", "funnel"],
        pt: "Faço páginas de venda completas: página longa e persuasiva, com VSL, checkout e pixel configurados para transformar tráfego pago em venda.",
        en: "I build complete sales pages: long, persuasive pages with VSL, checkout and pixel set up to turn paid traffic into sales.",
        action: START_LINK },
      { k: ["landing", "captura", "lead", "lancamento", "launch"],
        pt: "Landing page é comigo: página única e rápida para captar contatos, lançar um produto ou validar uma ideia antes de investir pesado.",
        en: "Landing pages are my thing: a single, fast page to capture leads, launch a product or validate an idea before investing heavily.",
        action: START_LINK },
      { k: ["institucional", "site da empresa", "seo", "google", "dominio", "website", "company site"],
        pt: "Faço o site da sua empresa do zero: rápido, fácil de achar no Google e com a sua cara, não a de um template. Pode ser bilíngue e no seu próprio domínio.",
        en: "I build your company website from scratch: fast, easy to find on Google and looking like you, not a template. It can be bilingual and on your own domain." },
      { k: ["sistema", "painel", "dashboard", "estoque", "login", "banco de dados", "area de membros", "erp", "crm", "system", "database", "member"],
        pt: "Sim, sistemas web sob medida: painéis, estoques, áreas de membros e ferramentas internas, com login e banco de dados.",
        en: "Yes, custom web systems: dashboards, inventories, member areas and internal tools, with login and a database.",
        action: START_LINK },
      { k: ["app", "aplicativo", "celular", "android", "iphone", "ios", "mobile", "pwa"],
        pt: "Faço sim! Apps que instalam direto no celular (iOS e Android) e funcionam offline, sem depender de loja nem de mensalidade.",
        en: "I do! Apps that install straight to the phone (iOS and Android) and work offline, without an app store or a subscription.",
        action: START_LINK },
      { k: ["automacao", "automatizar", "integracao", "integrar", "api", "webhook", "planilha", "ia", "inteligencia artificial", "chatbot", "automation", "integration", "spreadsheet"],
        pt: "Conecto suas ferramentas: pagamentos, WhatsApp, planilhas, APIs e IA conversando entre si, para o trabalho repetitivo rodar sozinho.",
        en: "I connect your tools: payments, WhatsApp, spreadsheets, APIs and AI talking to each other, so repetitive work runs on its own." },
      { k: ["tecnologia", "stack", "linguagem", "react", "node", "javascript", "typescript", "wordpress", "wix", "template", "framework", "technology", "language"],
        pt: "Uso HTML, CSS, JavaScript, TypeScript, React, Node.js, PostgreSQL e Cloudflare, escolhidos pelo que cada projeto pede. Nada de WordPress ou template: é código próprio, feito do zero.",
        en: "I use HTML, CSS, JavaScript, TypeScript, React, Node.js, PostgreSQL and Cloudflare, chosen by what each project needs. No WordPress or templates: it's custom code, built from scratch." },
      { k: ["suporte", "manutencao", "depois", "atualizar", "hospedagem", "support", "maintenance", "hosting"],
        pt: "Depois da publicação tem um período de suporte direto comigo, sem ticket e sem fila. Eu também cuido do deploy e do monitoramento.",
        en: "After launch there's a period of support straight with me, no tickets and no queue. I also handle deploy and monitoring." },
      { k: ["como funciona", "processo", "etapas", "passo", "comecar", "how does", "process", "steps", "start"],
        pt: "Começa com uma chamada para entender o que você precisa. Depois definimos juntos layout, funcionalidades, prazo e preço, isso vira contrato, eu construo com entregas visíveis e você paga no final.",
        en: "It starts with a call to understand what you need. Then we settle layout, features, timeline and price together, that becomes a contract, I build with visible deliveries and you pay at the end.",
        action: START_LINK },
      { k: ["quem", "voce e", "sobre", "gustavo", "experiencia", "who", "about you", "experience"],
        pt: "Sou o Gustavo, desenvolvedor full stack. Cuido da tela que o seu cliente vê e de tudo que roda por trás dela, do primeiro commit ao deploy.",
        en: "I'm Gustavo, a full-stack developer. I take care of the screen your customer sees and everything running behind it, from the first commit to deploy." },
      { k: ["whatsapp", "contato", "falar", "conversar", "humano", "pessoa", "ligar", "email", "contact", "talk", "human", "call"],
        pt: "Claro! Me chama no WhatsApp que quem responde sou eu.",
        en: "Sure! Message me on WhatsApp — I'm the one who answers.",
        action: WA_LINK }
    ];
    var FALLBACK = {
      pt: "Boa pergunta! Essa eu prefiro responder pessoalmente. Quer mandar no meu WhatsApp? A sua pergunta já vai escrita.",
      en: "Good question! I'd rather answer that one personally. Want to send it to my WhatsApp? Your question goes along, already written.",
      action: WA_LINK
    };

    function norm(t) {
      return " " + t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
    }
    function findAnswer(q) {
      var nq = norm(q), best = null, bestScore = 0;
      ASK_RULES.forEach(function (rule) {
        var score = 0;
        rule.k.forEach(function (k) {
          var nk = norm(k).trim();
          // palavra curta só conta inteira ("ia" não casa com "dia")
          var hit = nk.length <= 3 ? nq.indexOf(" " + nk + " ") > -1 : nq.indexOf(nk) > -1;
          if (hit) score += nk.length > 6 ? 2 : 1;
        });
        if (score > bestScore) { bestScore = score; best = rule; }
      });
      return best || FALLBACK;
    }
    function lang() { return root.lang === "en" ? "en" : "pt"; }

    function addMsg(cls) {
      var el = document.createElement("div");
      el.className = "ask-msg " + cls;
      askLog.appendChild(el);
      askLog.scrollTop = askLog.scrollHeight;
      return el;
    }
    function actionLink(action, question) {
      var a = document.createElement("a");
      a.className = "ask-msg-action";
      a.textContent = action[lang()] + " →";
      if (action.href === "wa") {
        var text = lang() === "en" ? "Hi Gustavo! I came from your site: " : "Oi, Gustavo! Vim pelo seu site: ";
        a.href = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(text + question);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.addEventListener("click", function () {
          track("Contact", { content_name: "pergunta hero", channel: "whatsapp" });
        });
      } else {
        a.href = action.href;
      }
      return a;
    }

    function answer(question) {
      if (askBusy || !question.trim()) return;
      askBusy = true;
      addMsg("ask-msg--user").textContent = question;
      var bot = addMsg("ask-msg--bot");
      bot.innerHTML = '<span class="ask-typing" aria-label="digitando"><i></i><i></i><i></i></span>';
      var rule = findAnswer(question);
      var text = rule[lang()];
      var instant = reduceMotionQuery.matches;
      setTimeout(function () {
        bot.textContent = "";
        var p = document.createElement("span");
        bot.appendChild(p);
        function done() {
          if (rule.action) {
            bot.appendChild(document.createElement("br"));
            bot.appendChild(actionLink(rule.action, question));
          }
          askLog.scrollTop = askLog.scrollHeight;
          askBusy = false;
        }
        if (instant) { p.textContent = text; done(); return; }
        // "digita" em pedaços de palavra, como alguém escrevendo rápido
        var i = 0;
        (function type() {
          i = Math.min(text.length, i + 3);
          p.textContent = text.slice(0, i);
          askLog.scrollTop = askLog.scrollHeight;
          if (i < text.length) setTimeout(type, 16);
          else done();
        })();
      }, instant ? 0 : 650 + Math.random() * 450);
    }

    askForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = askInput.value;
      askInput.value = "";
      answer(q);
    });
    document.querySelectorAll(".ask-chip").forEach(function (chip) {
      chip.addEventListener("click", function () { answer(chip.textContent.trim()); });
    });
  }

  /* ---------------- Luminária de lava (serviços) ----------------
     Metaballs: cada bolha soma r²/d² num campo; onde o campo passa de
     1 vira "lava". Acabamento igual ao dos botões: fio branco fino em
     cima/embaixo, fio preto fino por fora nas laterais e brilho branco
     no centro (usa o gradiente do campo como normal). Bolhas sobem e
     descem como cera aquecida.
     Caminho principal: WebGL — a placa de vídeo calcula cada pixel na
     resolução real da tela, então os fios saem nítidos (no canvas 2D o
     campo era calculado em baixa resolução e ampliado: fio fino
     serrilhava). Sem WebGL, cai no canvas 2D em baixa resolução. */
  var lava = document.getElementById("lava");
  if (lava) {
    var LV_MAX = 32;                          // gotas + gotinhas (7 + 21 = 28)
    var glr = null;
    try {
      var gl = lava.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
      if (gl) glr = setupLavaGL(gl);
    } catch (e) { glr = null; }
    var lv = glr ? null : lava.getContext("2d");
    // GL: pixels reais (até 2x). 2D: campo em baixa resolução, ampliado.
    var LV_DPR = isTouch ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    var LV_SCALE = glr ? 1 / LV_DPR : (window.matchMedia("(max-width: 768px)").matches ? 2 : 3);
    var lvW = 0, lvH = 0, lvImg = null, lvT = 0;
    var F, GX, GY;                           // campos acumulados por pixel
    var lvRunning = true, lvInView = true;
    var lvSection = lava.parentElement;
    // uma entrada por gota (a cor não é mais usada: o vidro é incolor)
    var LV_COLORS = [[47, 91, 255], [110, 160, 255], [70, 190, 255], [90, 110, 255], [140, 185, 255], [40, 140, 240], [120, 140, 255]];
    var blobs = LV_COLORS.map(function (c, i) {
      return {
        c: c,
        x: (0.08 + 0.84 * ((i * 0.37) % 1)),      // posição horizontal relativa
        r: 0.07 + 0.05 * ((i * 0.53) % 1),        // raio relativo à largura
        speed: 0.05 + 0.04 * ((i * 0.71) % 1),    // ciclos por segundo (lento)
        phase: i * 1.3,
        drift: 0.03 + 0.03 * ((i * 0.29) % 1)
      };
    });
    // gotinhas grudadas na borda de cada gota: ficam presas a maior
    // parte do tempo e, de vez em quando, esticam e desgrudam
    var drops = [];
    blobs.forEach(function (b, i) {
      for (var j = 0; j < 3; j++) {
        drops.push({
          parent: i,
          ang: j * 2.09 + i,                       // espalhadas em volta
          spin: (j % 2 ? 1 : -1) * (0.08 + 0.05 * ((i + j) % 3)),
          size: 0.26 + 0.12 * (((i * 3 + j) * 0.61) % 1),
          speed: 0.07 + 0.06 * (((i + j * 2) * 0.43) % 1),
          phase: i * 2.1 + j * 1.7
        });
      }
    });

    function setupLavaGL(gl) {
      var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
      // mesma matemática do caminho 2D, por pixel, na placa de vídeo
      var FS = [
        "#ifdef GL_FRAGMENT_PRECISION_HIGH",
        "precision highp float;",
        "#else",
        "precision mediump float;",
        "#endif",
        "uniform vec4 u_b[" + LV_MAX + "];",   // x, y, r², corte²
        "uniform int u_n;",
        "uniform vec2 u_res;",
        "uniform float u_line;",
        "void main(){",
        "  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);",
        "  float f = 0.; vec2 g = vec2(0.);",
        "  for (int i = 0; i < " + LV_MAX + "; i++) {",
        "    if (i >= u_n) break;",
        "    vec4 b = u_b[i];",
        "    vec2 dd = p - b.xy;",
        "    float d2 = dot(dd, dd) + 1.;",
        "    if (d2 > b.w) continue;",
        "    float w = 1. - d2 / b.w;",
        "    float base = b.z / d2;",
        "    f += base * w * w;",
        "    g += -2. * base * w * (w / d2 + 2. / b.w) * dd;",
        "  }",
        "  if (f < 0.45) { gl_FragColor = vec4(0.); return; }",
        "  float gl2 = max(length(g), 1e-6);",
        "  float d = (f - 1.) / gl2;",
        "  float ny2 = g.y * g.y / (gl2 * gl2);",
        "  float nx2 = 1. - ny2;",
        "  float L = u_line;",
        "  float inL = clamp(1. - abs(d - L * .4) / L, 0., 1.) * step(-.5, d);",
        "  float outL = clamp(1. - abs(d + L * .4) / L, 0., 1.) * step(d, .5);",
        "  inL = inL * inL * (3. - 2. * inL);",
        "  outL = outL * outL * (3. - 2. * outL);",
        "  float core = clamp((f - 1.25) / 2.4, 0., 1.);",
        "  float light = inL * ny2 * .95 + core * .22 + clamp(d + .5, 0., 1.) * .04;",
        "  float dark = outL * nx2 * .55;",
        "  float a = min(1., light + dark);",
        "  float c = light / max(light + dark, 1e-4);",
        "  gl_FragColor = vec4(vec3(c) * a, a);",
        "}"
      ].join("\n");
      function sh(type, src) {
        var o = gl.createShader(type);
        gl.shaderSource(o, src); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        return o;
      }
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      // um triângulo que cobre a tela toda
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      return {
        gl: gl,
        uB: gl.getUniformLocation(prog, "u_b"),
        uN: gl.getUniformLocation(prog, "u_n"),
        uRes: gl.getUniformLocation(prog, "u_res"),
        uLine: gl.getUniformLocation(prog, "u_line"),
        arr: new Float32Array(LV_MAX * 4)
      };
    }

    function lavaResize() {
      var r = lvSection.getBoundingClientRect();
      lvW = Math.max(1, Math.ceil(r.width / LV_SCALE));
      lvH = Math.max(1, Math.ceil(r.height / LV_SCALE));
      lava.width = lvW;
      lava.height = lvH;
      if (glr) {
        glr.gl.viewport(0, 0, lvW, lvH);
        return;
      }
      lvImg = lv.createImageData(lvW, lvH);
      var sz = lvW * lvH;
      F = new Float32Array(sz); GX = new Float32Array(sz); GY = new Float32Array(sz);
    }
    function lavaDraw() {
      var pos = blobs.map(function (b) {
        // sobe e desce entre 15% e 85% da altura, com deriva lateral
        var y = 0.5 + 0.36 * Math.sin(lvT * b.speed * Math.PI * 2 + b.phase);
        var x = b.x + b.drift * Math.sin(lvT * 0.13 + b.phase * 2);
        // tamanho pela largura, mas sem ficar miúdo em tela estreita e alta
        var rad = b.r * Math.max(lvW, lvH * 0.6) * (1 + 0.12 * Math.sin(lvT * 0.4 + b.phase));
        return { x: x * lvW, y: y * lvH, r2: rad * rad, rad: rad, c: b.c, cut2: rad * rad * 20 };
      });
      drops.forEach(function (d) {
        var pa = pos[d.parent];
        // 0 = grudada, 1 = solta; o cubo deixa ela presa mais tempo
        var s = 0.5 + 0.5 * Math.sin(lvT * d.speed * Math.PI * 2 + d.phase);
        s = s * s * s;
        var a = d.ang + lvT * d.spin;
        var dist = pa.rad * (0.62 + 1.3 * s);
        var r = pa.rad * d.size * (1 - 0.18 * s);
        var c = pa.c;
        pos.push({
          x: pa.x + Math.cos(a) * dist,
          y: pa.y + Math.sin(a) * dist * 0.9,
          r2: r * r,
          // só conta perto dela (v < 0.05 fora disso): é o que mantém leve
          cut2: r * r * 22,
          c: [Math.min(255, c[0] + 30), Math.min(255, c[1] + 25), c[2]]
        });
      });
      if (glr) {
        var g = glr.gl, arr = glr.arr, n = Math.min(pos.length, LV_MAX);
        for (var m = 0; m < n; m++) {
          arr[m * 4] = pos[m].x; arr[m * 4 + 1] = pos[m].y;
          arr[m * 4 + 2] = pos[m].r2; arr[m * 4 + 3] = pos[m].cut2;
        }
        g.uniform4fv(glr.uB, arr);
        g.uniform1i(glr.uN, n);
        g.uniform2f(glr.uRes, lvW, lvH);
        g.uniform1f(glr.uLine, 1.3 * LV_DPR);  // fio de ~1.3px CSS
        g.clearColor(0, 0, 0, 0);
        g.clear(g.COLOR_BUFFER_BIT);
        g.drawArrays(g.TRIANGLES, 0, 3);
        return;
      }
      var data = lvImg.data;
      // "espalha" cada gota só na caixa em volta dela (em vez de cada
      // pixel consultar todas): com as gotinhas, é o que segura 60fps
      var size = lvW * lvH;
      F.fill(0); GX.fill(0); GY.fill(0);
      for (var k = 0; k < pos.length; k++) {
        var p = pos[k];
        var R = Math.sqrt(p.cut2);
        var x0 = Math.max(0, Math.floor(p.x - R)), x1 = Math.min(lvW - 1, Math.ceil(p.x + R));
        var y0 = Math.max(0, Math.floor(p.y - R)), y1 = Math.min(lvH - 1, Math.ceil(p.y + R));
        var r2 = p.r2, cut2 = p.cut2;
        for (var py = y0; py <= y1; py++) {
          var dy = py - p.y, dy2 = dy * dy, row = py * lvW;
          for (var px = x0; px <= x1; px++) {
            var dx = px - p.x;
            var d2 = dx * dx + dy2 + 1;
            if (d2 > cut2) continue;
            // r²/d² multiplicado por (1 - d²/cut²)²: vai a zero SUAVE no
            // limite da caixa — corte seco deixava o contorno com dobras
            var w = 1 - d2 / cut2;
            var base = r2 / d2, v = base * w * w, q = row + px;
            F[q] += v;
            // derivada do produto (aponta para dentro)
            var dv = -2 * base * w * (w / d2 + 2 / cut2);
            GX[q] += dv * dx;
            GY[q] += dv * dy;
          }
        }
      }
      // mesmo acabamento dos botões: fio branco fininho em cima e embaixo,
      // fio preto fininho por fora nas laterais e brilho branco suave no
      // centro. A distância até a borda vem de (f - 1) / |∇f|, em pixels
      // do campo — é o que deixa os fios com espessura constante.
      var LINE = 1.5;                         // espessura do fio (px do campo)
      for (var q = 0; q < size; q++) {
        var f = F[q], o = q * 4;
        if (f < 0.45) { data[o + 3] = 0; continue; }
        var gx = GX[q], gy = GY[q];
        var gl = Math.sqrt(gx * gx + gy * gy) || 1e-6;
        var d = (f - 1) / gl;                 // >0 dentro, <0 fora
        var ny2 = (gy * gy) / (gl * gl);      // 1 = borda de cima/baixo
        var nx2 = 1 - ny2;                    // 1 = laterais
        // fio de dentro (branco) e fio de fora (preto), com borda macia
        var inL = d > -0.5 ? Math.max(0, 1 - Math.abs(d - LINE * 0.4) / LINE) : 0;
        var outL = d < 0.5 ? Math.max(0, 1 - Math.abs(d + LINE * 0.4) / LINE) : 0;
        inL = inL * inL * (3 - 2 * inL);
        outL = outL * outL * (3 - 2 * outL);
        // brilho branco no centro, sumindo para as bordas (como nos botões)
        var core = Math.min(1, Math.max(0, (f - 1.25) / 2.4));
        var light = inL * ny2 * 0.95 + core * 0.22 + (d > 0 ? 0.04 : 0);
        var dark = outL * nx2 * 0.55;
        var a = light + dark;
        if (a < 0.004) { data[o + 3] = 0; continue; }
        var c = 255 * light / a;              // mistura branco/preto
        data[o] = c; data[o + 1] = c; data[o + 2] = c;
        data[o + 3] = Math.min(1, a) * 255;
      }
      lv.putImageData(lvImg, 0, 0);
    }
    lavaResize();
    if (reduceMotionQuery.matches || weakDevice) {
      lavaDraw();
      onWidthResize(function () { lavaResize(); lavaDraw(); });
    } else {
      // a cera só anda enquanto a página rola; parada, fica como está
      lavaDraw();
      var lavaLoop = makeLoop(function (dt) {
        lvT += scrollTime(dt);
        lavaDraw();
      }, function () { return lvRunning && lvInView; });
      watchInView(lvSection, function (v) { lvInView = v; if (v) lavaLoop.wake(); });
      document.addEventListener("visibilitychange", function () {
        lvRunning = !document.hidden;
        lavaLoop.wake();
      });
      var lvTimer = null;
      onWidthResize(function () {
        clearTimeout(lvTimer); lvTimer = setTimeout(function () { lavaResize(); lavaDraw(); }, 150);
      });
    }
  }

  /* ---------------- Fios de seda (frase de impacto) ----------------
     Linhas finas em arco-íris ondulando devagar; perto do mouse elas
     se afastam um pouco, como seda tocada. Fora da tela, pausa. */
  var silk = document.getElementById("silk");
  if (silk) {
    var sk = silk.getContext("2d");
    var skDpr = canvasDpr;
    var skW = 0, skH = 0, skT = 0;
    var skMouseX = -9999, skMouseY = -9999, skPull = 0;
    var skRunning = true, skInView = true;
    var silkSmall = window.matchMedia("(max-width: 768px)").matches;
    var SILK_LINES = silkSmall ? 12 : 18, SILK_STEPS = silkSmall ? 44 : 70;
    var skSection = silk.parentElement;

    function silkResize() {
      var r = skSection.getBoundingClientRect();
      skW = r.width; skH = r.height;
      silk.width = skW * skDpr; silk.height = skH * skDpr;
      silk.style.width = skW + "px"; silk.style.height = skH + "px";
      sk.setTransform(skDpr, 0, 0, skDpr, 0, 0);
    }
    function silkDraw() {
      sk.clearRect(0, 0, skW, skH);
      for (var l = 0; l < SILK_LINES; l++) {
        var k = l / (SILK_LINES - 1);
        var baseY = skH * (0.18 + 0.64 * k);
        var amp = skH * (0.06 + 0.05 * Math.sin(l * 1.7));
        var freq = 1.2 + 0.5 * Math.sin(l * 0.9);
        var grad = sk.createLinearGradient(0, 0, skW, 0);
        var hue0 = (l * 22 + skT * 12) % 360;
        grad.addColorStop(0, "hsla(" + hue0 + ", 90%, 62%, 0)");
        grad.addColorStop(0.2, "hsla(" + ((hue0 + 40) % 360) + ", 90%, 62%, 0.42)");
        grad.addColorStop(0.5, "hsla(" + ((hue0 + 110) % 360) + ", 90%, 62%, 0.42)");
        grad.addColorStop(0.8, "hsla(" + ((hue0 + 180) % 360) + ", 90%, 62%, 0.42)");
        grad.addColorStop(1, "hsla(" + ((hue0 + 220) % 360) + ", 90%, 62%, 0)");
        sk.strokeStyle = grad;
        sk.lineWidth = 1.1;
        sk.beginPath();
        for (var i = 0; i <= SILK_STEPS; i++) {
          var x = (i / SILK_STEPS) * skW;
          var u = i / SILK_STEPS;
          var y = baseY +
            amp * Math.sin(u * Math.PI * 2 * freq + skT * 0.6 + l * 0.45) +
            amp * 0.35 * Math.sin(u * Math.PI * 5 - skT * 0.4 + l);
          if (skPull > 0.01) {
            var dx = x - skMouseX, dy = y - skMouseY;
            var f = Math.exp(-(dx * dx + dy * dy) / (2 * 90 * 90)) * skPull;
            y += (dy >= 0 ? 1 : -1) * 34 * f;
          }
          if (i === 0) sk.moveTo(x, y); else sk.lineTo(x, y);
        }
        sk.stroke();
      }
    }
    silkResize();
    if (reduceMotionQuery.matches) {
      silkDraw();
      onWidthResize(function () { silkResize(); silkDraw(); });
    } else {
      skSection.addEventListener("mousemove", function (e) {
        var r = silk.getBoundingClientRect();
        skMouseX = e.clientX - r.left; skMouseY = e.clientY - r.top;
      });
      skSection.addEventListener("mouseleave", function () { skMouseX = -9999; });
      silkDraw();
      var silkLoop = makeLoop(function (dt) {
        skT += scrollTime(dt);
        skPull += ((skMouseX > -9000 ? 1 : 0) - skPull) * 0.08;
        silkDraw();
      }, function () { return skRunning && skInView; }, true);
      watchInView(skSection, function (v) { skInView = v; if (v) silkLoop.wake(); });
      document.addEventListener("visibilitychange", function () {
        skRunning = !document.hidden;
        silkLoop.wake();
      });
      var skTimer = null;
      onWidthResize(function () {
        clearTimeout(skTimer); skTimer = setTimeout(function () { silkResize(); silkDraw(); }, 150);
      });
    }
  }

  /* ---------------- Barra flutuante "Fale comigo." ----------------
     Vidro desfocado só no CSS. A lente com filtro SVG (distorcia o
     fundo nas bordas) saiu: era refeita a cada quadro de rolagem e
     travava computador sem placa de vídeo boa. */
  var talk = document.getElementById("talk");
  if (talk) {
    var talkInput = document.getElementById("talkInput");
    // aparece depois do card de perguntas; some na faixa azul (que já
    // tem WhatsApp), no rodapé e enquanto a abertura da hero roda
    var askCard = document.getElementById("ask");
    var ctaBand = document.getElementById("contato");
    var siteFooter = document.querySelector(".footer");
    var hireBand = document.getElementById("empresas");
    var askSeen = true, ctaSeen = false, footSeen = false, hireSeen = false;
    function syncTalk() {
      var show = !askSeen && !ctaSeen && !footSeen && !hireSeen && !root.classList.contains("intro");
      if (!show && document.activeElement === talkInput && talkInput.value) show = true;
      // entra como bolha subindo (.is-shown) e sai murchando para baixo (.is-leaving)
      if (show === talk.classList.contains("is-shown")) return;
      talk.classList.toggle("is-shown", show);
      talk.classList.toggle("is-leaving", !show && !reduceMotionQuery.matches);
    }
    talk.addEventListener("animationend", function (e) {
      if (e.animationName === "talk-out") talk.classList.remove("is-leaving");
    });
    if ("IntersectionObserver" in window) {
      if (askCard) new IntersectionObserver(function (en) { askSeen = en[0].isIntersecting; syncTalk(); }).observe(askCard);
      if (ctaBand) new IntersectionObserver(function (en) { ctaSeen = en[0].isIntersecting; syncTalk(); }).observe(ctaBand);
      if (siteFooter) new IntersectionObserver(function (en) { footSeen = en[0].isIntersecting; syncTalk(); }).observe(siteFooter);
      if (hireBand) new IntersectionObserver(function (en) { hireSeen = en[0].isIntersecting; syncTalk(); }).observe(hireBand);
    } else {
      askSeen = false; syncTalk();
    }

    talk.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = talkInput.value.trim();
      if (!msg) { talkInput.focus(); return; }
      var hi = root.lang === "en" ? "Hi Gustavo! I came from your site: " : "Oi, Gustavo! Vim pelo seu site: ";
      track("Contact", { content_name: "fale comigo", channel: "whatsapp" });
      window.open("https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(hi + msg), "_blank", "noopener");
      talkInput.value = "";
    });
  }

  /* ---------------- Malha de pontos reativa ao mouse ----------------
     Vale para todo canvas .dot-field (hero e contato). Pontos cinza
     quase invisíveis; perto do mouse acendem em arco-íris, com a cor
     de cada ponto vindo do ângulo dele em relação ao cursor (prisma). */
  var canHover = window.matchMedia("(hover: hover)").matches;
  document.querySelectorAll(".dot-field").forEach(function (canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = isTouch ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    var GAP = 26;
    var RADIUS = 160;
    var section = canvas.parentElement;
    var w = 0, h = 0;
    var mouseX = -9999, mouseY = -9999;
    var lightX = -9999, lightY = -9999;
    var power = 0;
    var hueShift = 0;                // o arco-íris gira devagar com o tempo
    var running = true, inView = true;

    /* linhas finas subindo pelas laterais (vida ambiente) */
    var streaks = [];
    function makeStreak(randomY) {
      var len = 50 + Math.random() * 110;
      var fromEdge = Math.pow(Math.random(), 2) * w * 0.22;
      return {
        hue: Math.random() * 360,
        x: Math.random() < 0.5 ? fromEdge : w - fromEdge,
        y: randomY ? Math.random() * h : h + len + Math.random() * 160,
        len: len,
        speed: 50 + Math.random() * 90,
        width: 1 + Math.random() * 0.8,
        alpha: 0.12 + Math.random() * 0.3
      };
    }

    function resize() {
      var rect = section.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      buildGrid();
      var count = Math.max(10, Math.min(24, Math.round(w / 60)));
      streaks = [];
      for (var i = 0; i < count; i++) streaks.push(makeStreak(true));
    }

    /* a malha apagada é sempre igual: desenhada uma vez num canvas fora
       da tela e só copiada a cada quadro. Por quadro, só os pontos
       dentro do raio da luz são recalculados. */
    var gridCache = document.createElement("canvas");
    function buildGrid() {
      gridCache.width = Math.max(1, w * dpr);
      gridCache.height = Math.max(1, h * dpr);
      var g = gridCache.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "rgba(17, 17, 22, 0.10)";
      for (var y = GAP / 2; y < h; y += GAP) {
        for (var x = GAP / 2; x < w; x += GAP) g.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    function drawDots() {
      ctx.drawImage(gridCache, 0, 0, w, h);
      if (power <= 0.01 || lightX < -9000) return;
      var y0 = Math.max(GAP / 2, Math.floor((lightY - RADIUS) / GAP) * GAP + GAP / 2);
      var x0 = Math.max(GAP / 2, Math.floor((lightX - RADIUS) / GAP) * GAP + GAP / 2);
      for (var y = y0; y < Math.min(h, lightY + RADIUS); y += GAP) {
        for (var x = x0; x < Math.min(w, lightX + RADIUS); x += GAP) {
          var dx = x - lightX, dy = y - lightY;
          var t = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS) * power;
          if (t > 0.01) {
            var e = t * t;
            // prisma: a cor vem do ângulo em relação ao cursor
            var hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360 + hueShift) % 360;
            ctx.fillStyle = "hsla(" + hue.toFixed(0) + ", 90%, 60%, " + (0.25 + 0.75 * e).toFixed(3) + ")";
            ctx.beginPath();
            ctx.arc(x, y, 1.3 + 1.5 * e, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // sem movimento (ou sem mouse): só a malha parada, desenhada uma vez
    if (reduceMotionQuery.matches || !canHover) {
      var still = function () { resize(); drawDots(); gridCache.width = gridCache.height = 1; };
      still();
      onWidthResize(still);
      return;
    }

    section.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    section.addEventListener("mouseleave", function () {
      mouseX = -9999;
      mouseY = -9999;
    });

    function frame(dt) {
      var sdt = scrollTime(dt);                // rastros e cores só andam com rolagem
      hueShift = (hueShift + sdt * 24) % 360;
      var hasMouse = mouseX > -9000;
      power += ((hasMouse ? 1 : 0) - power) * 0.08;
      if (hasMouse) {
        if (lightX < -9000) { lightX = mouseX; lightY = mouseY; }
        lightX += (mouseX - lightX) * 0.12;
        lightY += (mouseY - lightY) * 0.12;
      }

      ctx.clearRect(0, 0, w, h);
      drawDots();

      for (var i = 0; i < streaks.length; i++) {
        var st = streaks[i];
        st.y -= st.speed * sdt;
        if (st.y + st.len < 0) streaks[i] = makeStreak(false);
        var head = st.y, tail = st.y + st.len;
        var edge = Math.min(1, head / 120 + 1) * Math.min(1, (h - head) / 80);
        var a = st.alpha * Math.max(0, edge);
        if (a < 0.01) continue;
        var grad = ctx.createLinearGradient(st.x, tail, st.x, head);
        var sh = (st.hue + hueShift) % 360;
        grad.addColorStop(0, "hsla(" + sh.toFixed(0) + ", 90%, 62%, 0)");
        grad.addColorStop(1, "hsla(" + sh.toFixed(0) + ", 90%, 62%, " + Math.min(1, a * 1.4).toFixed(3) + ")");
        ctx.strokeStyle = grad;
        ctx.lineWidth = st.width;
        ctx.beginPath();
        ctx.moveTo(st.x, tail);
        ctx.lineTo(st.x, head);
        ctx.stroke();
      }

      if (power > 0.01 && lightX > -9000) {
        var R = RADIUS * 1.2;
        var glow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, R);
        glow.addColorStop(0, "hsla(" + (hueShift % 360).toFixed(0) + ", 90%, 70%, " + (0.12 * power).toFixed(3) + ")");
        glow.addColorStop(1, "hsla(" + (hueShift % 360).toFixed(0) + ", 90%, 70%, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(lightX - R, lightY - R, R * 2, R * 2);
      }
    }

    resize();
    frame(0);                                  // já aparece desenhada, parada
    var dotLoop = makeLoop(frame, function () { return running && inView; }, true);
    watchInView(section, function (visible) {
      inView = visible;
      if (visible) dotLoop.wake();
    });
    var resizeTimer = null;
    onWidthResize(function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); frame(0); }, 150);
    });
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      dotLoop.wake();
    });
  });
})();

/* ══════════════════════════════════════════════════════════════
   META PIXEL — bloco próprio: não depende de nada acima e nada
   acima depende dele.

   Carrega direto, sem banner e sem pedir nada. Foi decisão do dono
   do site: o pixel grava cookie de anúncio já na primeira visita.
   Se um dia isso precisar voltar a ser opcional, o desenho antigo
   (aceite em localStorage sob a chave `mkt_consent`, com o pixel
   injetado só depois) continua de pé em produtos/marketplace/, que tem a
   versão completa.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  if (!META_PIXEL_ID) return;
  if (window.fbq) return;

  /* snippet oficial do Meta, com a fila que guarda as chamadas
     feitas antes do script externo terminar de baixar */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");

  document.dispatchEvent(new CustomEvent("pixels:on"));
})();
