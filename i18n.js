/* ══════════════════════════════════════════════════════════════
   TRADUÇÃO PT ⇄ EN

   Uma página só, dois idiomas. Não há /en duplicado: o site é
   estático e manter duas cópias de tudo garante que uma das duas
   fica desatualizada na primeira correção de vírgula.

   Como funciona: no carregamento, o script varre os nós de TEXTO
   e guarda o original de cada um. Trocar de idioma é reescrever
   esses nós a partir do dicionário; voltar é reescrever com o
   original guardado. Nada de `innerHTML`, então nenhuma tag,
   listener ou animação é perdida no caminho.

   A chave do dicionário é a própria frase em português. Frase que
   não estiver aqui simplesmente continua em português — é a falha
   mais visível possível, e é de propósito: some na hora em que
   alguém abre o site em inglês.

   ATENÇÃO AO EDITAR O HTML: mudou a frase, mude a chave aqui.
   Nomes próprios e termos técnicos (React, WhatsApp, HTML5…) não
   entram no dicionário de propósito — não se traduzem.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var DICT = {
    /* ---- títulos de página e meta ---- */
    "Gustavo Dev | Desenvolvedor full stack":
      "Gustavo Dev | Full-stack developer",
    "Iniciar um projeto | gustavodev": "Start a project | gustavodev",
    "Páginas de venda, landing pages, sites, sistemas e apps construídos do zero por um desenvolvedor full stack. Portfólio de Gustavo Dev.":
      "Sales pages, landing pages, websites, systems and apps built from scratch by a full-stack developer. Gustavo Dev' portfolio.",
    "Me conte sobre o seu projeto em duas linhas. A mensagem abre pronta no meu WhatsApp e eu respondo pessoalmente.":
      "Tell me about your project in two lines. The message opens ready in my WhatsApp and I answer personally.",
    "Vitrine de projetos | gustavodev": "Project showcase | gustavodev",
    "Os repositórios que deixo fixados no GitHub e os sites que já estão no ar. Código de verdade, para abrir e conferir.":
      "The repositories I keep pinned on GitHub and the sites that are already live. Real code, open it and check.",

    /* ---- navegação, comum às páginas ---- */
    "Pular para o conteúdo": "Skip to content",
    "Serviços": "Services",
    "Páginas de venda": "Sales pages",
    "Landing pages": "Landing pages",
    "Sistemas web": "Web systems",
    "Apps": "Apps",
    "Processo": "Process",
    "Diagnóstico": "Diagnosis",
    "Arquitetura": "Architecture",
    "Construção": "Build",
    "Deploy": "Deploy",
    "Contato": "Contact",
    "Email": "Email",
    "Iniciar projeto": "Start a project",
    "Início": "Home",
    "Navegação principal": "Main navigation",
    "Abrir menu": "Open menu",
    "Navegação": "Navigation",
    "Seções do site": "Site sections",
    "Como trabalho": "How I work",
    "Projetos": "Projects",

    /* ---- vitrine (projetos.html) ---- */
    "Vitrine de projetos.": "Project showcase.",
    "Sites que já estão no ar, para abrir e conferir do jeito que o cliente usa.":
      "Sites already live, open them and see them the way the client does.",
    "Reserva de salas sem conflito de horário, com API Django REST e tela web":
      "Room booking with no schedule conflicts, with a Django REST API and a web screen",
    "Assistente financeira no WhatsApp com IA (Claude): anota vendas, gastos, metas e lembretes":
      "AI financial assistant on WhatsApp (Claude): logs sales, expenses, goals and reminders",
    "API Django com verificação por e-mail, tarefas em segundo plano com Celery e Docker":
      "Django API with email verification, background tasks with Celery and Docker",
    "Cadastro com código por e-mail e login JWT em FastAPI, com hash e limite de tentativas":
      "Sign-up with an email code and JWT login in FastAPI, with hashing and attempt limits",
    "No ar": "Live",
    "Sites e sistemas que você pode abrir e usar agora, do jeito que o cliente final usa.":
      "Sites and systems you can open and use right now, just like the end customer does.",
    "Destaques": "Featured",
    "Sistemas completos, com área do cliente e painel de gestão.":
      "Complete systems, with a customer area and a management dashboard.",
    "Sistema completo de barbearia: agendamento online pelo cliente e painel do barbeiro para gerenciar horários e atendimentos":
      "Complete barbershop system: online booking for customers and a barber dashboard to manage schedules and appointments",
    "Site de hamburgueria artesanal com cardápio e pedido":
      "Artisan burger restaurant website with menu and ordering",
    "Guincho 24h em Balneário Camboriú e região: serviços, galeria de atendimentos e chamado direto no WhatsApp":
      "24h towing in Balneário Camboriú and nearby cities: services, job gallery and direct WhatsApp requests",
    "Imobiliária de alto padrão: busca por região e tipo de imóvel, agendamento de visita e contato pelo WhatsApp":
      "Luxury real estate agency: search by area and property type, visit booking and WhatsApp contact",
    "Concessionária premium: estoque com filtros, comparador de carros e simulador de financiamento":
      "Premium car dealership: filterable inventory, car comparison and financing simulator",
    "O próximo pode ser o seu.": "The next one could be yours.",
    "Me conta o que você quer construir.": "Tell me what you want to build.",

    /* ---- home: hero ---- */
    "Eu construo": "I build",
    "seu software.": "your software.",
    "Sinta-se à vontade.": "Make yourself at home.",
    "Pergunte o que quiser sobre preço, prazo, tecnologia ou como eu trabalho. As respostas são automáticas e na hora; se eu não souber, te levo até mim no WhatsApp.":
      "Ask anything about price, timeline, tech or how I work. Answers are automatic and instant; if I don't know, I'll take you to me on WhatsApp.",
    "Sua pergunta": "Your question",
    "Ex.: quanto custa uma landing page?": "E.g.: how much is a landing page?",
    "Enviar pergunta": "Send question",
    "Quanto custa?": "How much does it cost?",
    "Qual o prazo?": "How long does it take?",
    "Como é o pagamento?": "How does payment work?",
    "Você faz aplicativo?": "Do you build apps?",
    "ou vá direto:": "or go straight to:",
    "iniciar um projeto": "start a project",
    "ver serviços": "see services",
    "Iniciar um projeto": "Start a project",
    "Stack técnica": "Tech stack",
    "Frase de impacto": "Statement",

    /* ---- home: serviços ---- */
    "O que eu construo": "What I build",
    "Sou desenvolvedor full stack: cuido da tela que o cliente vê e de tudo que roda por trás dela. Estes são os pedidos mais comuns, mas não o limite.":
      "I'm a full-stack developer: I take care of the screen your customer sees and everything running behind it. These are the most common requests, not the limit.",
    "Página longa e persuasiva, com VSL, checkout e pixel configurados para transformar tráfego pago em venda.":
      "A long, persuasive page with VSL, checkout and pixel set up to turn paid traffic into sales.",
    "Checkout": "Checkout",
    "Pixel e UTM": "Pixel and UTM",
    "Página única e rápida para captar contatos, lançar um produto ou validar uma ideia antes de investir pesado.":
      "A single, fast page to capture leads, launch a product or validate an idea before investing heavily.",
    "Captura de leads": "Lead capture",
    "Lançamentos": "Launches",
    "Carrega rápido": "Loads fast",
    "Sites institucionais": "Company websites",
    "O site da sua empresa: rápido, fácil de achar no Google e com a sua cara, não a de um template.":
      "Your company's website: fast, easy to find on Google and looking like you, not like a template.",
    "Domínio próprio": "Your own domain",
    "Bilíngue": "Bilingual",
    "Painéis, estoques, áreas de membros e ferramentas internas sob medida, com login e banco de dados.":
      "Dashboards, inventories, member areas and custom internal tools, with login and a database.",
    "Banco de dados": "Database",
    "Aplicativos": "Apps",
    "Apps que instalam direto no celular e funcionam offline, sem depender de loja nem de mensalidade.":
      "Apps that install straight to the phone and work offline, with no app store and no subscription.",
    "Instalável": "Installable",
    "iOS e Android": "iOS and Android",
    "Automações e integrações": "Automations and integrations",
    "Pagamentos, WhatsApp, planilhas, APIs e IA conversando entre si, para o trabalho repetitivo rodar sozinho.":
      "Payments, WhatsApp, spreadsheets, APIs and AI talking to each other, so repetitive work runs on its own.",
    "IA": "AI",
    "Tem uma ideia que não está aqui?": "Have an idea that isn't listed?",
    "Se roda numa tela, eu construo. Me conta o que você tem em mente.":
      "If it runs on a screen, I build it. Tell me what you have in mind.",
    "Contar minha ideia": "Share my idea",
    "Fale comigo": "Talk to me",
    "Fale comigo: o que você quer criar?": "Talk to me: what do you want to build?",
    "Mensagem para o Gustavo": "Message to Gustavo",
    "Enviar no WhatsApp": "Send on WhatsApp",
    "Se roda numa tela, eu construo.": "If it runs on a screen, I build it.",

    /* ---- home: como trabalho ---- */
    "Profissional do início ao fim": "Professional from start to finish",
    "Você sabe exatamente o que vai receber, quando vai receber e quanto vai pagar. Antes de qualquer linha de código.":
      "You know exactly what you get, when you get it and what you pay. Before a single line of code.",
    "Começamos com uma chamada": "We start with a call",
    "Uma conversa direta para entender o que você precisa. Sem compromisso e sem roteiro de vendas.":
      "A straight conversation to understand what you need. No commitment and no sales script.",
    "Decidimos tudo juntos": "We decide everything together",
    "Layout, funcionalidades, prazo e preço: cada detalhe do projeto definido com você, antes de começar.":
      "Layout, features, deadline and price: every detail of the project settled with you, before anything starts.",
    "Contrato por escrito": "A written contract",
    "O combinado vira contrato, com escopo e entregas documentados. Segurança para os dois lados.":
      "What we agree becomes a contract, with scope and deliverables in writing. Safety for both sides.",
    "Pagamento só no final": "Payment only at the end",
    "Você paga quando o serviço estiver entregue e aprovado. O risco fica comigo, não com você.":
      "You pay once the work is delivered and approved. The risk is mine, not yours.",
    "seusite.com.br": "yoursite.com",

    /* ---- home: frase de impacto ---- */
    "Veja alguns dos meus projetos": "Check out some of my projects",
    "Sua empresa precisa de um desenvolvedor?": "Does your company need a developer?",
    "Deixe seu email e eu te mando uma proposta e um horário para conversarmos. Se preferir, me chame direto.":
      "Leave your email and I'll send you a proposal and a time for us to talk. If you prefer, reach me directly.",
    "Email da empresa": "Company email",
    "voce@empresa.com": "you@company.com",
    "Envie aqui!": "Send it here!",
    "ou": "or",
    "chamar para conversar no WhatsApp": "chat with me on WhatsApp",
    "Ver projetos": "See projects",
    "Um site bonito ganha um": "A beautiful site earns a",
    "olhar": "look",
    "Um site rápido, claro e encontrável ganha um":
      "A fast, clear and findable site earns a",
    "cliente": "customer",

    /* ---- home: processo ---- */
    "Eu trabalho assim": "This is how I work",
    "Etapas do projeto. Use as setas para girar.": "Project steps. Use the arrow keys to rotate.",
    "Arraste para girar": "Drag to rotate",
    "Etapa 1": "Step 1",
    "Etapa 2": "Step 2",
    "Etapa 3": "Step 3",
    "Etapa 4": "Step 4",
    "Entendo o problema real antes de falar de tecnologia: escopo, prazo e o que \"pronto\" significa para você.":
      "I get to the real problem before talking tech: scope, deadline, and what \"done\" means to you.",
    "Defino stack, banco de dados e estrutura pensando em manutenção. Nada de dependência frágil ou solução que não escala.":
      "I pick the stack, database and structure with maintenance in mind. No fragile dependency, no solution that won't scale.",
    "Entregas incrementais e visíveis. Você acompanha o progresso, não espera um \"big bang\" no final.":
      "Incremental, visible deliveries. You follow the progress instead of waiting for a big bang at the end.",
    "Deploy & suporte": "Deploy & support",
    "Publicação, monitoramento e um período de suporte direto comigo, sem ticket e sem fila.":
      "Publishing, monitoring and a period of support straight with me — no tickets, no queue.",

    /* ---- home: contato ---- */
    "Vamos construir o próximo?": "Shall we build the next one?",
    "Conte o que você precisa e eu respondo com um diagnóstico honesto, mesmo que a resposta seja \"não sou eu quem deveria fazer isso\".":
      "Tell me what you need and I'll answer with an honest diagnosis — even if the answer is \"I'm not the one who should build this\".",
    "Chamar no WhatsApp": "Message me on WhatsApp",
    "Me conte sobre o seu projeto": "Tell me about your project",

    /* ---- rodapé ---- */
    "Desenvolvedor full stack. Páginas de venda, landing pages, sistemas e apps construídos do zero, do primeiro commit ao deploy.":
      "Full-stack developer. Sales pages, landing pages, systems and apps built from scratch, from the first commit to deploy.",
    "Gustavo Dev. Todo o código, do zero.":
      "Gustavo Dev. All the code, from scratch.",
    "Este site foi feito à mão em HTML, CSS e JS, sem frameworks.":
      "This site was handmade in HTML, CSS and JS, without frameworks.",

    /* ---- contato.html ---- */
    "Me conta o que você": "Tell me what you",
    "quer construir.": "want to build.",
    "Sem formalidade, pode se expressar livremente.": "No formalities, feel free to express yourself.",
    "Como posso te chamar?": "What should I call you?",
    "Um email, caso não tenha interesse em se falar por WhatsApp": "An email, in case you'd rather not talk on WhatsApp",
    "(opcional)": "(optional)",
    "Descreva seu projeto": "Describe your project",
    "Abrir no WhatsApp": "Open in WhatsApp",
    "Esta página utiliza cookies para melhor experiência.": "This page uses cookies for a better experience.",
    "Saiba mais": "Learn more",
    "Ver mais serviços": "See more services",
    "Ver serviços anteriores": "See previous services",
    /* conversa da home: cabeçalho e rótulos (as mensagens estão no app.js) */
    "online agora": "online now",
    "Abrir conversa com o Gustavo": "Open chat with Gustavo",
    "Conversa com o Gustavo": "Chat with Gustavo",
    "Fechar conversa": "Close chat",
    "Alternar tema escuro": "Toggle dark theme",
    "Aviso de cookies": "Cookie notice",
    /* card de saída (criado pelo app.js) */
    "Antes de ir…": "Before you go…",
    "Tem um projeto em mente?": "Got a project in mind?",
    "Me manda uma mensagem rápida. Eu respondo com uma ideia de prazo e valor, sem compromisso.":
      "Send me a quick message. I'll reply with a rough timeline and price, no strings attached.",
    "Chamar no WhatsApp": "Message me on WhatsApp",
    "Agora não": "Not now",
    "Fechar": "Close",
    "Enviar por email": "Send by email",
    "abrindo o seu email com a mensagem pronta…": "opening your email app with the message ready…",
    "Seu nome": "Your name",
    "voce@exemplo.com": "you@example.com",
    "O que você quer construir, pra quê, e qualquer detalhe que achar importante como prazo, referências, orçamento…":
      "What you want to build, what for, and any detail you find important like deadline, references, budget…",
    "abrindo o WhatsApp com a sua mensagem pronta…":
      "opening WhatsApp with your message ready…"
  };

  var LANG_KEY = "site_lang";
  var ATTRS = ["placeholder", "aria-label", "title", "alt"];

  /* Fotografia do estado original. Guardar o nó (e não a string)
     é o que permite voltar ao português sem um dicionário reverso,
     que quebraria em qualquer par de frases com a mesma tradução. */
  var alvos = [];

  /* `raiz` é a página inteira no carregamento; depois, um pedaço que
     foi escrito por JS (a lista de repositórios da vitrine) */
  function mapear(raiz) {
    var inicio = alvos.length;
    var pagina = !raiz;
    raiz = raiz || document.body;
    var walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var pai = n.parentNode ? n.parentNode.nodeName : "";
        if (pai === "SCRIPT" || pai === "STYLE") return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      alvos.push({ no: n, tipo: "texto", original: n.nodeValue });
    }

    var todos = raiz.querySelectorAll("[" + ATTRS.join("],[") + "]");
    Array.prototype.forEach.call(todos, function (el) {
      ATTRS.forEach(function (a) {
        if (el.hasAttribute(a)) {
          alvos.push({ no: el, tipo: "attr", attr: a, original: el.getAttribute(a) });
        }
      });
    });

    if (!pagina) return alvos.slice(inicio);
    alvos.push({ no: document, tipo: "titulo", original: document.title });
    var meta = document.querySelector('meta[name="description"]');
    if (meta) alvos.push({ no: meta, tipo: "attr", attr: "content", original: meta.getAttribute("content") });
  }

  /* Preserva o espaço em volta e normaliza o de dentro.
     O `trim()` sozinho não bastava: um parágrafo quebrado em várias
     linhas no HTML carrega a quebra e o recuo NO MEIO do texto, e a
     chave do dicionário tem espaço simples — então justamente as
     frases longas nunca casavam. Colapsar todo espaço interno em um
     só resolve, e as bordas voltam intactas para não colar a frase
     na tag vizinha. */
  function traduzir(valor) {
    var partes = valor.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var chave = partes[2].replace(/\s+/g, " ");
    var traduzido = DICT[chave];
    if (!traduzido) return null;
    return partes[1] + traduzido + partes[3];
  }

  function aplicar(lang, lista) {
    var en = lang === "en";
    (lista || alvos).forEach(function (alvo) {
      var novo = en ? traduzir(alvo.original) : alvo.original;
      if (novo === null) return;                 /* sem tradução: fica em pt */
      if (alvo.tipo === "texto") alvo.no.nodeValue = novo;
      else if (alvo.tipo === "titulo") document.title = novo;
      else alvo.no.setAttribute(alvo.attr, novo);
    });
    document.documentElement.lang = en ? "en" : "pt-BR";
  }

  /* ── a bandeira ────────────────────────────────────────────────
     Mostra a bandeira do idioma ATUAL e troca ao clicar. O <title>
     do botão diz para onde o clique leva, porque bandeira sozinha
     é ambígua: ela pode significar "você está aqui" ou "vá para
     cá", e só o texto desfaz isso para quem usa leitor de tela.
     ────────────────────────────────────────────────────────────── */
  var BR = '<svg viewBox="0 0 28 20" width="24" height="17" aria-hidden="true">' +
    '<rect width="28" height="20" rx="2" fill="#009B3A"/>' +
    '<path d="M14 3 25 10 14 17 3 10Z" fill="#FEDF00"/>' +
    '<circle cx="14" cy="10" r="4.2" fill="#002776"/></svg>';

  var US = '<svg viewBox="0 0 28 20" width="24" height="17" aria-hidden="true">' +
    '<rect width="28" height="20" rx="2" fill="#fff"/>' +
    '<g fill="#B22234"><rect width="28" height="1.54" y="0"/><rect width="28" height="1.54" y="3.08"/>' +
    '<rect width="28" height="1.54" y="6.16"/><rect width="28" height="1.54" y="9.23"/>' +
    '<rect width="28" height="1.54" y="12.31"/><rect width="28" height="1.54" y="15.38"/>' +
    '<rect width="28" height="1.54" y="18.46"/></g>' +
    '<rect width="12" height="10.77" fill="#3C3B6E"/></svg>';

  function montarBotao(lang) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-toggle";
    btn.id = "langToggle";
    document.querySelectorAll(".nav-inner").forEach(function (nav) {
      var alvo = nav.querySelector(".nav-toggle");
      if (alvo) nav.insertBefore(btn, alvo);
      else nav.appendChild(btn);
    });
    return btn;
  }

  function pintar(btn, lang) {
    var en = lang === "en";
    btn.innerHTML = en ? US : BR;
    btn.setAttribute("title", en ? "Ver em português" : "View in English");
    btn.setAttribute("aria-label", en ? "Ver em português" : "View in English");
  }

  function salvar(v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) {} }
  function ler() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } }

  mapear();

  /* escolha salva vence; sem ela, segue o idioma do sistema (português → pt, qualquer outro → en) */
  var salvo = ler();
  var lang = salvo === "en" || salvo === "pt" ? salvo : (/^pt/i.test(navigator.language || "pt") ? "pt" : "en");
  var btn = montarBotao(lang);
  pintar(btn, lang);
  if (lang === "en") aplicar("en");

  window.siteI18n = {
    mapear: function (raiz) {
      var novos = mapear(raiz);
      if (lang === "en") aplicar("en", novos);
    }
  };

  btn.addEventListener("click", function () {
    lang = lang === "en" ? "pt" : "en";
    aplicar(lang);
    pintar(btn, lang);
    salvar(lang);
  });
})();
