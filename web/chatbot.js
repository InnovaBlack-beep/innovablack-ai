/* ============================================================
   INNOVA BLACK® — CHATBOT VALERIA v3.0
   Bot conversacional de captura de leads

   v3.0:
   - Contexto de página (abre diferente según URL)
   - Multi-burbuja (mensajes largos se parten como texting real)
   - UTM / source tracking (captura de dónde vino el lead)
   - Rescue flow (nunca pierde el lead)
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     CONFIGURACIÓN
     -------------------------------------------------------- */
  var CONFIG = {
    apiUrl: '/api/send-email',
    calUrl: '',

    triggerDelay: 15000,
    typingMin: 800,             // v3: más rápido por burbuja (son más cortas)
    typingMax: 1800,
    multiBubbleGap: 600,        // v3: delay entre burbujas de un mismo mensaje
    rescueDelay1: 25000,
    rescueDelay2: 30000,
    rescueDelay3: 35000,
    rescueDelay4: 40000,
    closeAfterLead: 6000
  };

  /* --------------------------------------------------------
     v3: CONTEXTO DE PÁGINA
     Detecta la URL actual y adapta opening + preview
     -------------------------------------------------------- */
  var PAGE_CONTEXT = {
    '/dtx-audit/': {
      preview: '¿Quieres saber el estado real de tu institución? El diagnóstico es gratuito y toma 45 min.',
      opening: ['Veo que estás viendo nuestro DTX Audit™.', 'Es un diagnóstico gratuito de 45 minutos donde evaluamos tu situación tecnológica y regulatoria. ¿Te interesa agendarlo?'],
      options: [
        { label: 'Sí, quiero agendar', action: 'direct_capture' },
        { label: 'Primero tengo preguntas', action: 'info' },
        { label: 'Solo estoy viendo', action: 'info' }
      ]
    },
    '/dtx-launch/': {
      preview: '¿Estás constituyendo una nueva SOFOM o IFPE? Te puedo orientar.',
      opening: ['Veo que estás interesado/a en constituir una nueva institución financiera.', '¿En qué etapa estás del proceso?'],
      options: [
        { label: 'Tengo la idea, aún no inicio', action: 'stage1b' },
        { label: 'Ya tengo asesoría legal', action: 'stage1b' },
        { label: 'Ya inicié trámite ante CNBV', action: 'stage1b' },
        { label: 'Solo estoy viendo información', action: 'info' }
      ]
    },
    '/dtx-compliance/': {
      preview: '¿Tu compliance PLD/KYC todavía es manual? Podemos automatizarlo.',
      opening: ['Veo que estás explorando automatización de compliance.', '¿Tu institución ya tiene procesos PLD/KYC o estás empezando desde cero?'],
      options: [
        { label: 'Tenemos procesos manuales que necesitan automatizarse', action: 'pain_pld' },
        { label: 'Estamos empezando desde cero', action: 'pain_pld' },
        { label: 'Quiero entender qué ofrecen', action: 'info' }
      ]
    },
    '/dtx-scale/': {
      preview: '¿Buscas conectarte a SPEI o emitir tarjetas? Platicamos.',
      opening: ['Veo que estás explorando opciones para escalar tu institución.', '¿Qué es lo que más te interesa: SPEI, emisión de tarjetas, o expansión de producto?'],
      options: [
        { label: 'Conexión SPEI', action: 'pain_spei' },
        { label: 'Emisión de tarjetas / BIN sponsor', action: 'pain_spei' },
        { label: 'Expansión multi-producto', action: 'pain_spei' },
        { label: 'Solo estoy viendo', action: 'info' }
      ]
    },
    '/dtx-upgrade/': {
      preview: '¿Sistemas legacy que ya no aguantan? Es más común de lo que crees.',
      opening: ['Veo que estás buscando migrar sistemas legacy.', 'Es el reto más común que vemos en instituciones con 3-10 años de operación. ¿Eso te suena?'],
      options: [
        { label: 'Sí, exactamente nuestro caso', action: 'pain_legacy' },
        { label: 'Estamos preocupados por GAFI 2026', action: 'pain_gafi' },
        { label: 'Quiero entender el proceso', action: 'info' }
      ]
    },
    '/dtx-retainer/': {
      preview: '¿Tu institución necesita un CTO externo especializado en fintech?',
      opening: ['Veo que estás explorando nuestro servicio de CTO externo.', '¿Tu institución tiene equipo tecnológico interno o dependes de proveedores externos?'],
      options: [
        { label: 'Dependemos de proveedores', action: 'stage1a' },
        { label: 'Tenemos equipo pequeño', action: 'stage1a' },
        { label: 'Solo estoy viendo', action: 'info' }
      ]
    },
    '/dtx-intelligence/': {
      preview: '¿Necesitas dashboards y scoring crediticio con IA?',
      opening: ['Veo que estás explorando analítica e inteligencia de datos.', '¿Tu institución ya tiene dashboards o toman decisiones con reportes manuales?'],
      options: [
        { label: 'Todo manual / Excel', action: 'stage1a' },
        { label: 'Tenemos algo pero queremos mejorar', action: 'stage1a' },
        { label: 'Solo estoy viendo', action: 'info' }
      ]
    },
    '/blog/gafi-evaluacion-mexico-2026-sofom/': {
      preview: '¿Te preocupa la evaluación GAFI? Podemos ayudarte a preparar tu institución.',
      opening: ['Veo que estás leyendo sobre la evaluación GAFI 2026.', 'Es un tema crítico. ¿Tu institución ya se está preparando?'],
      options: [
        { label: 'Sí, pero no sé si estamos listos', action: 'pain_gafi' },
        { label: 'No, y me preocupa', action: 'pain_gafi' },
        { label: 'Solo me estoy informando', action: 'info' }
      ]
    },
    '/blog/guia-kyc-pld-sofom-mexico/': {
      preview: '¿Necesitas automatizar tu KYC/PLD? Nuestro DTX Compliance Engine™ lo hace.',
      opening: ['Veo que estás leyendo sobre KYC y PLD para SOFOMs.', '¿Tu institución ya tiene estos procesos implementados?'],
      options: [
        { label: 'Sí, pero son manuales', action: 'pain_pld' },
        { label: 'Estamos empezando', action: 'pain_pld' },
        { label: 'Solo me estoy informando', action: 'info' }
      ]
    },
    '/blog/ley-fintech-2-mexico-cambios-sofom/': {
      preview: '¿Quieres saber cómo te afecta la Ley Fintech 2.0? Te platico.',
      opening: ['Veo que estás leyendo sobre la Ley Fintech 2.0.', '¿Tu institución ya está tomando acciones para cumplir con los nuevos requisitos?'],
      options: [
        { label: 'No sabemos por dónde empezar', action: 'pain_gafi' },
        { label: 'Ya estamos trabajando en ello', action: 'stage1a' },
        { label: 'Solo me estoy informando', action: 'info' }
      ]
    },
    '/blog/como-constituir-sofom-mexico-2026/': {
      preview: '¿Quieres constituir una SOFOM? Te orientamos en el proceso.',
      opening: ['Veo que estás investigando cómo constituir una SOFOM.', '¿Ya tienes el modelo de negocio o estás en etapa de exploración?'],
      options: [
        { label: 'Tengo modelo y capital listo', action: 'stage1b' },
        { label: 'Estoy explorando la idea', action: 'stage1b' },
        { label: 'Solo me estoy informando', action: 'info' }
      ]
    }
  };

  function getPageContext() {
    var path = window.location.pathname;
    // Exact match
    if (PAGE_CONTEXT[path]) return PAGE_CONTEXT[path];
    // Check if blog path matches
    for (var key in PAGE_CONTEXT) {
      if (path.indexOf(key) !== -1) return PAGE_CONTEXT[key];
    }
    // Blog index
    if (path.indexOf('/blog') !== -1) {
      return {
        preview: '¿Tienes dudas sobre regulación fintech? Aquí estoy para ayudarte.',
        opening: ['Veo que estás leyendo nuestro blog.', '¿Hay algo específico sobre regulación fintech que te gustaría saber?'],
        options: [
          { label: 'Sí, tengo una duda', action: 'info' },
          { label: 'Tengo una SOFOM y necesito ayuda', action: 'stage1a' },
          { label: 'Solo estoy leyendo', action: 'info' }
        ]
      };
    }
    return null; // homepage — usa flujo default
  }

  /* --------------------------------------------------------
     v3: UTM / SOURCE TRACKING
     Captura UTMs, referrer, y página actual
     -------------------------------------------------------- */
  function captureSource() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      referrer: document.referrer || '',
      landing_page: window.location.pathname,
      chat_opened_on: window.location.pathname  // se actualiza al abrir chat
    };
  }

  var SOURCE = captureSource();

  /* --------------------------------------------------------
     IDENTIDAD ROTATIVA
     -------------------------------------------------------- */
  var ASESORAS = [
    { nombre: 'Valeria',  iniciales: 'VR', rol: 'Asesora' },
    { nombre: 'Andrea',   iniciales: 'AN', rol: 'Consultora' },
    { nombre: 'Mariana',  iniciales: 'MR', rol: 'Asesora Senior' },
    { nombre: 'Daniela',  iniciales: 'DN', rol: 'Estratega Digital' },
    { nombre: 'Sofía',    iniciales: 'SF', rol: 'Consultora' },
    { nombre: 'Regina',   iniciales: 'RG', rol: 'Asesora' },
    { nombre: 'Camila',   iniciales: 'CM', rol: 'Estratega' }
  ];

  function pickAsesora() {
    var lastIndex = -1;
    try { lastIndex = parseInt(localStorage.getItem('vbot_asesora'), 10); } catch (e) {}
    if (isNaN(lastIndex)) lastIndex = -1;
    var next = (lastIndex + 1) % ASESORAS.length;
    localStorage.setItem('vbot_asesora', next);
    return ASESORAS[next];
  }

  var ASESORA = pickAsesora();

  /* --------------------------------------------------------
     ESTADO
     -------------------------------------------------------- */
  var state = {
    stage: 'idle',
    isOpen: false,
    hasTriggered: false,
    previewDismissed: false,
    lead: {
      nombre: '',
      email: '',
      telefono: '',
      tipo_institucion: '',
      etapa: '',
      dolor_principal: '',
      urgencia: '',
      notas: ''
    },
    temperatura: '',
    conversation: [],
    inactivityTimer: null,
    rescueStage: 0
  };

  /* --------------------------------------------------------
     UTILIDADES
     -------------------------------------------------------- */
  function randomDelay() {
    return CONFIG.typingMin + Math.random() * (CONFIG.typingMax - CONFIG.typingMin);
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* --------------------------------------------------------
     TEMPORIZADOR DE INACTIVIDAD — MULTI-ETAPA
     -------------------------------------------------------- */
  function resetInactivityTimer() {
    if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
    if (state.stage === 'done' || state.stage === 'idle') return;
    var delay;
    switch (state.rescueStage) {
      case 0: delay = CONFIG.rescueDelay1; break;
      case 1: delay = CONFIG.rescueDelay2; break;
      case 2: delay = CONFIG.rescueDelay3; break;
      case 3: delay = CONFIG.rescueDelay4; break;
      default: return;
    }
    state.inactivityTimer = setTimeout(runRescueStage, delay);
  }

  var rescueMsg = {
    siguesAhi: [
      '¿Sigues ahí? 😊 No te preocupes, tómate tu tiempo.',
      'Oye, ¿todo bien? Aquí sigo por si necesitas algo.',
      '¿Sigues por aquí? Sin presión, solo quería asegurarme de no perderte.',
      'Noto que estás pensando — ¡está bien! ¿Hay algo en lo que pueda ayudarte?'
    ],
    pedirCel: [
      'Mira, para no quitarte más tiempo — déjame tu WhatsApp y te mando un resumen de lo que platicamos. Así lo revisas cuando puedas. 📱',
      'Te propongo algo: dame tu número de WhatsApp y te comparto la info por ahí. Es más fácil y rápido. 📲',
      'Sé que estás ocupado/a. ¿Me dejas tu WhatsApp? Te mando toda la info y nos ponemos de acuerdo cuando tú puedas.'
    ],
    pedirEmail: [
      '¿Y un correo por si acaso? Te mando un PDF con todo lo relevante.',
      '¿Tienes un email donde te pueda mandar información más detallada?',
      'También te puedo enviar un resumen por correo. ¿Cuál es tu email?'
    ],
    despedida: [
      'Bueno, te dejo por ahora. Cuando quieras retomar, aquí estamos. ¡Éxito! 🙌',
      'Me tengo que ir, pero la próxima vez que entres podemos seguir platicando. ¡Que te vaya bien! 👋',
      'Voy a cerrar por ahora. Puedes volver cuando gustes — siempre hay alguien del equipo. ¡Buen día! 😊'
    ]
  };

  function runRescueStage() {
    if (state.stage === 'done') return;
    if (state.rescueStage === 0) {
      state.rescueStage = 1;
      addBotMessage(randomFrom(rescueMsg.siguesAhi), function () {
        showOptions([
          { label: 'Sí, aquí sigo', action: function () {
            state.rescueStage = 0;
            resetInactivityTimer();
            addBotMessage('¡Perfecto! ¿En qué te puedo ayudar?', function () {
              showInput('Escribe tu pregunta…', handleFreeText);
            });
          }},
          { label: 'Estoy ocupado/a', action: function () { goRescuePhone(); } },
          { label: 'No gracias, solo veía', action: function () { goRescuePhone(); } }
        ]);
      });
      return;
    }
    if (state.rescueStage === 1 && !state.lead.telefono) { goRescuePhone(); return; }
    if (state.rescueStage <= 2 && !state.lead.email) { goRescueEmail(); return; }
    goRescueGoodbye();
  }

  function goRescuePhone() {
    state.rescueStage = 2;
    if (state.lead.telefono) { goRescueEmail(); return; }
    addBotMessage(randomFrom(rescueMsg.pedirCel), function () {
      showInput('+52 10 dígitos…', function (phone) {
        resetInactivityTimer();
        var cleaned = phone.replace(/\D/g, '');
        if (cleaned.length >= 10) {
          state.lead.telefono = phone;
          state.lead.nombre = state.lead.nombre || 'Lead rápido';
          state.temperatura = state.temperatura || 'tibio';
          addBotMessage('¡Listo! Te va a llegar un mensaje por WhatsApp. 🙌', function () {
            if (!state.lead.email) { goRescueEmail(); } else { sendLead(); scheduleReset(); }
          });
        } else {
          goRescueEmail();
        }
      });
    });
  }

  function goRescueEmail() {
    state.rescueStage = 3;
    if (state.lead.email) {
      state.lead.nombre = state.lead.nombre || 'Lead rápido';
      state.temperatura = state.temperatura || 'frio';
      sendLead();
      addBotMessage('¡Perfecto, te contactamos pronto! Que tengas excelente día. 😊');
      scheduleReset();
      return;
    }
    addBotMessage(randomFrom(rescueMsg.pedirEmail), function () {
      showInput('correo@ejemplo.com', function (email) {
        resetInactivityTimer();
        if (validateEmail(email)) {
          state.lead.email = email;
          state.lead.nombre = state.lead.nombre || 'Lead rápido';
          state.temperatura = state.temperatura || 'frio';
          addBotMessage('¡Perfecto! Te mando la información. ¡Éxito! 🙌');
          sendLead();
          scheduleReset();
        } else {
          if (state.lead.telefono) { sendLead(); }
          goRescueGoodbye();
        }
      });
    });
  }

  function goRescueGoodbye() {
    state.rescueStage = 4;
    if (state.lead.email || state.lead.telefono) { sendLead(); }
    addBotMessage(randomFrom(rescueMsg.despedida));
    setTimeout(function () { closeChat(); scheduleFullReset(); }, CONFIG.closeAfterLead);
  }

  /* --------------------------------------------------------
     REINICIO
     -------------------------------------------------------- */
  function scheduleReset() {
    setTimeout(function () { closeChat(); scheduleFullReset(); }, CONFIG.closeAfterLead);
  }

  function scheduleFullReset() {
    setTimeout(function () {
      var msgs = document.getElementById('vbot-messages');
      if (msgs) msgs.innerHTML = '';
      var inputArea = document.getElementById('vbot-input-area');
      if (inputArea) inputArea.classList.remove('active');
      state.stage = 'idle';
      state.lead = { nombre: '', email: '', telefono: '', tipo_institucion: '', etapa: '', dolor_principal: '', urgencia: '', notas: '' };
      state.temperatura = '';
      state.conversation = [];
      state.rescueStage = 0;
      if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
      ASESORA = pickAsesora();
      updateIdentityUI();
    }, 500);
  }

  function updateIdentityUI() {
    var nameEl = document.querySelector('.vbot-header-name');
    var subEl = document.querySelector('.vbot-header-sub');
    var avatarEl = document.querySelector('.vbot-header-avatar-text');
    var bubbleEl = document.querySelector('.vbot-bubble-initials');
    if (nameEl) nameEl.textContent = ASESORA.nombre;
    if (subEl) subEl.textContent = 'Innova Black\u00ae \u00b7 ' + ASESORA.rol;
    if (avatarEl) avatarEl.textContent = ASESORA.iniciales;
    if (bubbleEl) bubbleEl.textContent = ASESORA.iniciales;
  }

  function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function validatePhone(p) { return p.replace(/\D/g, '').length >= 10; }

  function scrollToBottom() {
    var m = document.getElementById('vbot-messages');
    if (m) setTimeout(function () { m.scrollTop = m.scrollHeight; }, 50);
  }

  /* --------------------------------------------------------
     v3: MULTI-BURBUJA
     Parte un array de strings en burbujas individuales
     con typing indicator entre cada una.
     -------------------------------------------------------- */
  function addBotBubbles(texts, callback) {
    if (!Array.isArray(texts)) texts = [texts];
    var i = 0;
    function next() {
      if (i >= texts.length) {
        if (callback) callback();
        return;
      }
      addBotMessage(texts[i], function () {
        i++;
        if (i < texts.length) {
          setTimeout(next, CONFIG.multiBubbleGap);
        } else {
          if (callback) callback();
        }
      });
    }
    next();
  }

  /* --------------------------------------------------------
     INYECTAR HTML
     -------------------------------------------------------- */
  function injectHTML() {
    var ctx = getPageContext();
    var previewText = ctx
      ? ctx.preview
      : 'Hola \ud83d\udc4b Soy ' + ASESORA.nombre + ', del equipo de Innova Black\u00ae. \u00bfEst\u00e1s explorando opciones para tu instituci\u00f3n financiera?';

    var container = document.createElement('div');
    container.id = 'vbot-root';
    container.innerHTML =
      '<div class="vbot-preview" id="vbot-preview">' +
        '<button class="vbot-preview-close" id="vbot-preview-close">&times;</button>' +
        previewText +
      '</div>' +
      '<button class="vbot-bubble" id="vbot-bubble" aria-label="Abrir chat">' +
        '<span class="vbot-bubble-initials">' + ASESORA.iniciales + '</span>' +
        '<span class="vbot-badge" id="vbot-badge">1</span>' +
      '</button>' +
      '<div class="vbot-window" id="vbot-window">' +
        '<div class="vbot-header">' +
          '<div class="vbot-header-avatar"><span class="vbot-header-avatar-text">' + ASESORA.iniciales + '</span></div>' +
          '<div class="vbot-header-info">' +
            '<p class="vbot-header-name">' + ASESORA.nombre + '</p>' +
            '<p class="vbot-header-sub">Innova Black\u00ae \u00b7 ' + ASESORA.rol + '</p>' +
            '<div class="vbot-header-status">' +
              '<span class="vbot-status-dot"></span>' +
              '<span class="vbot-status-text">En l\u00ednea ahora</span>' +
            '</div>' +
          '</div>' +
          '<button class="vbot-close" id="vbot-close" aria-label="Cerrar chat">&times;</button>' +
        '</div>' +
        '<div class="vbot-messages" id="vbot-messages"></div>' +
        '<div class="vbot-input-area" id="vbot-input-area">' +
          '<input class="vbot-input" id="vbot-input" type="text" placeholder="Escribe un mensaje\u2026" autocomplete="off" enterkeyhint="send" />' +
          '<button class="vbot-send" id="vbot-send" aria-label="Enviar">' +
            '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="vbot-powered"><span>INNOVA BLACK\u00ae</span></div>' +
      '</div>';

    document.body.appendChild(container);
  }

  /* --------------------------------------------------------
     UI: MOSTRAR / OCULTAR
     -------------------------------------------------------- */
  function openChat() {
    var win = document.getElementById('vbot-window');
    var bubble = document.getElementById('vbot-bubble');
    var preview = document.getElementById('vbot-preview');
    var badge = document.getElementById('vbot-badge');

    // v3: actualizar página donde se abrió el chat
    SOURCE.chat_opened_on = window.location.pathname;

    win.classList.add('open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { win.classList.add('visible'); });
    });
    bubble.style.display = 'none';
    preview.classList.remove('show');
    badge.classList.remove('show');
    state.isOpen = true;

    if (state.stage === 'idle') { startConversation(); }
    scrollToBottom();
  }

  function closeChat() {
    var win = document.getElementById('vbot-window');
    var bubble = document.getElementById('vbot-bubble');
    win.classList.remove('visible');
    setTimeout(function () {
      win.classList.remove('open');
      bubble.style.display = 'flex';
    }, 300);
    state.isOpen = false;
  }

  /* --------------------------------------------------------
     MENSAJES
     -------------------------------------------------------- */
  function addBotMessage(text, callback) {
    var msgs = document.getElementById('vbot-messages');
    var typing = document.createElement('div');
    typing.className = 'vbot-typing';
    typing.innerHTML = '<span class="vbot-typing-dot"></span><span class="vbot-typing-dot"></span><span class="vbot-typing-dot"></span>';
    msgs.appendChild(typing);
    scrollToBottom();

    // v3: delay proporcional a la longitud del mensaje
    var baseDelay = randomDelay();
    var lengthBonus = Math.min(text.length * 4, 800);
    var delay = baseDelay + lengthBonus;

    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      var msg = document.createElement('div');
      msg.className = 'vbot-msg bot';
      msg.innerHTML = text;
      msgs.appendChild(msg);
      state.conversation.push({ role: 'bot', text: text, time: new Date().toISOString() });
      scrollToBottom();
      if (callback) callback();
    }, delay);
  }

  function addUserMessage(text) {
    var msgs = document.getElementById('vbot-messages');
    var msg = document.createElement('div');
    msg.className = 'vbot-msg user';
    msg.textContent = text;
    msgs.appendChild(msg);
    state.conversation.push({ role: 'user', text: text, time: new Date().toISOString() });
    scrollToBottom();
  }

  function showOptions(options) {
    resetInactivityTimer();
    var msgs = document.getElementById('vbot-messages');
    var container = document.createElement('div');
    container.className = 'vbot-options';
    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'vbot-opt';
      btn.textContent = opt.label;
      btn.addEventListener('click', function () {
        resetInactivityTimer();
        if (container.parentNode) container.parentNode.removeChild(container);
        addUserMessage(opt.label);
        if (opt.action) opt.action();
      });
      container.appendChild(btn);
    });
    msgs.appendChild(container);
    scrollToBottom();
  }

  function showInput(placeholder, onSubmit) {
    resetInactivityTimer();
    var area = document.getElementById('vbot-input-area');
    var input = document.getElementById('vbot-input');
    area.classList.add('active');
    input.placeholder = placeholder || 'Escribe un mensaje\u2026';
    input.value = '';
    setTimeout(function () { input.focus(); }, 100);

    var handler = function () {
      var val = input.value.trim();
      if (!val) return;
      resetInactivityTimer();
      input.value = '';
      addUserMessage(val);
      area.classList.remove('active');
      input.removeEventListener('keydown', keyHandler);
      document.getElementById('vbot-send').removeEventListener('click', handler);
      onSubmit(val);
    };
    var keyHandler = function (e) { if (e.key === 'Enter') { e.preventDefault(); handler(); } };
    input.addEventListener('keydown', keyHandler);
    document.getElementById('vbot-send').addEventListener('click', handler);
  }

  function showCalendlyOrContact() {
    var msgs = document.getElementById('vbot-messages');
    var container = document.createElement('div');
    container.className = 'vbot-options';

    var btnA = document.createElement('button');
    btnA.className = 'vbot-cta';
    btnA.textContent = 'Sí, quiero agendar ahora';
    btnA.addEventListener('click', function () {
      if (container.parentNode) container.parentNode.removeChild(container);
      addUserMessage('Sí, quiero agendar ahora');
      if (CONFIG.calUrl) window.open(CONFIG.calUrl, '_blank');
      state.lead.agenda_calcom = true;
      addBotMessage('Excelente. Revisa tu correo — te llegará la confirmación. Nos vemos pronto. 😊');
      sendLead(); scheduleReset();
    });

    var btnB = document.createElement('button');
    btnB.className = 'vbot-opt';
    btnB.textContent = 'Prefiero que me contacten';
    btnB.addEventListener('click', function () {
      if (container.parentNode) container.parentNode.removeChild(container);
      addUserMessage('Prefiero que me contacten');
      state.lead.agenda_calcom = false;
      addBotMessage('Listo. Estaremos en contacto pronto. ¡Que tengas excelente día! 👋');
      sendLead(); scheduleReset();
    });

    container.appendChild(btnA);
    container.appendChild(btnB);
    msgs.appendChild(container);
    scrollToBottom();
  }

  /* --------------------------------------------------------
     v3: FLUJO DE CONVERSACIÓN CON CONTEXTO DE PÁGINA
     -------------------------------------------------------- */
  function startConversation() {
    state.stage = 'trigger';
    var ctx = getPageContext();

    // --- Página con contexto específico ---
    if (ctx) {
      // Multi-burbuja: primera burbuja es saludo + nombre
      var bubbles = ['Hola 👋 Soy ' + ASESORA.nombre + ', de Innova Black®.'].concat(ctx.opening);
      addBotBubbles(bubbles, function () {
        // Mapear acciones del contexto a funciones
        var opts = ctx.options.map(function (o) {
          return {
            label: o.label,
            action: mapContextAction(o.action)
          };
        });
        showOptions(opts);
      });
      return;
    }

    // --- Homepage: flujo default con multi-burbuja ---
    addBotBubbles([
      'Hola 👋 Soy ' + ASESORA.nombre + ', del equipo de Innova Black®.',
      '¿Estás explorando opciones para tu institución financiera?'
    ], function () {
      showOptions([
        { label: 'Sí, tengo una SOFOM / SOFIPO / IFPE', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
        { label: 'Estoy en proceso de constituir una', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } },
        { label: 'Solo estoy viendo información', action: goStageInfo }
      ]);
    });
  }

  function mapContextAction(actionKey) {
    return function () {
      switch (actionKey) {
        case 'direct_capture':
          state.lead.dolor_principal = 'Interés en DTX Audit';
          state.temperatura = 'caliente';
          goStage4('critico');
          break;
        case 'stage1a':
          state.lead.etapa = 'existente';
          goStage1A();
          break;
        case 'stage1b':
          state.lead.etapa = 'nueva_constitucion';
          goStage1B();
          break;
        case 'pain_pld':
          state.lead.dolor_principal = 'PLD/KYC manual';
          state.lead.etapa = 'existente';
          goStage2('pld');
          break;
        case 'pain_legacy':
          state.lead.dolor_principal = 'Sistemas legacy';
          state.lead.etapa = 'existente';
          goStage2('legacy');
          break;
        case 'pain_gafi':
          state.lead.dolor_principal = 'Ley Fintech 2.0 / GAFI';
          state.lead.etapa = 'existente';
          goStage2('gafi');
          break;
        case 'pain_spei':
          state.lead.dolor_principal = 'SPEI / tarjetas';
          state.lead.etapa = 'existente';
          goStage2('spei');
          break;
        case 'info':
        default:
          goStageInfo();
          break;
      }
    };
  }

  function goStageInfo() {
    state.stage = 'info';
    addBotBubbles([
      'Sin problema, tómate el tiempo que necesites.',
      'Si tienes alguna duda sobre la Ley Fintech 2.0 o cómo modernizar una institución, aquí estoy. 🙂'
    ], function () {
      showInput('Escribe tu pregunta…', handleFreeText);
    });
  }

  function goStage1A() {
    state.stage = '1a';
    addBotMessage('Cuéntame, ¿qué tipo de institución tienes?', function () {
      showOptions([
        { label: 'SOFOM', action: function () { state.lead.tipo_institucion = 'SOFOM'; goStage1APain(); } },
        { label: 'SOFIPO', action: function () { state.lead.tipo_institucion = 'SOFIPO'; goStage1APain(); } },
        { label: 'IFPE / Fintech', action: function () { state.lead.tipo_institucion = 'IFPE'; goStage1APain(); } },
        { label: 'Otra / No estoy seguro', action: function () { state.lead.tipo_institucion = 'Otro'; goStage1APain(); } }
      ]);
    });
  }

  function goStage1APain() {
    state.stage = '1a_pain';
    addBotMessage('Entendido. ¿Cuál es el reto más urgente que enfrentas hoy?', function () {
      showOptions([
        { label: 'Cumplimiento PLD/KYC manual — muy lento', action: function () { state.lead.dolor_principal = 'PLD/KYC manual'; goStage2('pld'); } },
        { label: 'Sistemas legacy que ya no funcionan', action: function () { state.lead.dolor_principal = 'Sistemas legacy'; goStage2('legacy'); } },
        { label: 'Ley Fintech 2.0 / GAFI — no sé cómo cumplir', action: function () { state.lead.dolor_principal = 'Ley Fintech 2.0 / GAFI'; goStage2('gafi'); } },
        { label: 'Quiero conectarme a SPEI o emitir tarjetas', action: function () { state.lead.dolor_principal = 'SPEI / tarjetas'; goStage2('spei'); } }
      ]);
    });
  }

  function goStage1B() {
    state.stage = '1b';
    addBotMessage('¡Interesante momento para arrancar! ¿En qué etapa estás?', function () {
      showOptions([
        { label: 'Tengo la idea, aún no inicio nada', action: function () { state.lead.dolor_principal = 'Idea inicial'; goStage2('nueva'); } },
        { label: 'Ya tengo asesoría legal, me falta la parte tecnológica', action: function () { state.lead.dolor_principal = 'Falta tech'; goStage2('nueva'); } },
        { label: 'Ya inicié el trámite ante CNBV', action: function () { state.lead.dolor_principal = 'Trámite CNBV'; goStage2('nueva'); } },
        { label: 'Tengo capital listo, quiero arrancar rápido', action: function () { state.lead.dolor_principal = 'Capital listo'; goStage2('nueva'); } }
      ]);
    });
  }

  var stage2Responses = {
    pld: ['Ese es uno de los problemas más comunes que vemos.', 'El proceso manual no solo es lento — es un riesgo regulatorio real.', 'Nosotros automatizamos todo el flujo PLD con nuestra metodología DTX™.'],
    gafi: ['La evaluación GAFI está encima — el tiempo se acorta.', 'Hemos ayudado a varias instituciones a ponerse al día con la normativa de forma acelerada.'],
    spei: ['Para conectarse a SPEI necesitas una arquitectura específica desde el inicio.', 'Justo eso es lo que construimos con DTX Payments™.'],
    legacy: ['Migrar sistemas sin afectar la operación es el reto más delicado.', 'Lo hemos hecho varias veces — tenemos un proceso probado para eso.'],
    nueva: ['Arrancamos varias instituciones desde cero.', 'Desde el framework regulatorio hasta la infraestructura tecnológica completa. Es lo que mejor hacemos.']
  };

  function goStage2(painKey) {
    state.stage = '2';
    var bubbles = stage2Responses[painKey] || stage2Responses.nueva;
    addBotBubbles(bubbles, function () {
      setTimeout(function () { goStage3(); }, 500);
    });
  }

  function goStage3() {
    state.stage = '3';
    addBotMessage('Para entender cómo podemos ayudarte mejor — ¿qué tan urgente es esto para ti?', function () {
      showOptions([
        { label: 'Crítico — necesito resolver esto en el próximo mes', action: function () { state.lead.urgencia = 'critico'; state.temperatura = 'caliente'; goStage4('critico'); } },
        { label: 'Importante — tengo 3 meses para actuar', action: function () { state.lead.urgencia = 'importante'; state.temperatura = 'tibio'; goStage4('importante'); } },
        { label: 'Estoy explorando — no hay prisa', action: function () { state.lead.urgencia = 'explorando'; state.temperatura = 'frio'; goStage4('frio'); } }
      ]);
    });
  }

  var stage4Intros = {
    critico: ['Con todo lo que me comentas, creo que vale la pena que hables directamente con nuestro equipo.', '¿Me das tu nombre para conectarte?'],
    importante: ['Podemos hacer un diagnóstico gratuito de 45 minutos para darte un roadmap claro.', '¿Cómo te llamas?'],
    frio: ['Te puedo mandar información relevante sobre cómo otras instituciones han resuelto esto.', '¿Cómo te llamas?']
  };

  function goStage4(urgencyKey) {
    state.stage = '4_name';
    var bubbles = stage4Intros[urgencyKey] || stage4Intros.importante;
    addBotBubbles(bubbles, function () {
      showInput('Tu nombre…', function (name) {
        state.lead.nombre = name;
        goStage4Phone();
      });
    });
  }

  function goStage4Phone() {
    state.stage = '4_phone';
    addBotBubbles([
      'Mucho gusto, ' + esc(state.lead.nombre) + '. 🙂',
      '¿Cuál es tu WhatsApp para contactarte rápido?'
    ], function () {
      showInput('+52 10 dígitos…', function (phone) {
        if (phone.toLowerCase() === 'no' || phone === '-' || phone === 'paso' || phone.toLowerCase() === 'skip') {
          state.lead.telefono = '';
        } else {
          state.lead.telefono = phone;
        }
        goStage4Email();
      });
    });
  }

  function goStage4Email() {
    state.stage = '4_email';
    addBotMessage('¿Y un correo para mandarte la información detallada?', function () {
      showInput('correo@ejemplo.com', function (email) {
        if (!validateEmail(email)) {
          addBotMessage('Hmm, ese correo no parece válido. ¿Me lo puedes escribir de nuevo?', function () {
            showInput('correo@ejemplo.com', function (email2) {
              state.lead.email = email2;
              goStage5();
            });
          });
        } else {
          state.lead.email = email;
          goStage5();
        }
      });
    });
  }

  function goStage5() {
    state.stage = '5';
    var nombre = esc(state.lead.nombre.split(' ')[0]);
    addBotBubbles([
      'Perfecto, ' + nombre + '. Ya tengo todo lo que necesito. 🙌',
      'Nuestro equipo te va a contactar antes de 24 horas para agendar tu diagnóstico gratuito.',
      'Es una sesión de 45 minutos donde analizamos tu situación y te damos un roadmap concreto — sin compromiso.',
      '¿Quieres agendar directamente ahora?'
    ], function () {
      showCalendlyOrContact();
    });
  }

  /* --------------------------------------------------------
     MANEJO DE TEXTO LIBRE
     -------------------------------------------------------- */
  function handleFreeText(text) {
    var lower = text.toLowerCase();

    if (lower.indexOf('precio') !== -1 || lower.indexOf('costo') !== -1 || lower.indexOf('cuanto') !== -1 || lower.indexOf('cuánto') !== -1 || lower.indexOf('tarifa') !== -1) {
      addBotBubbles([
        'Los costos dependen del alcance específico de cada proyecto.',
        'Lo que sí puedo decirte es que el diagnóstico inicial es completamente gratuito.',
        '¿Agendamos ese primer paso?'
      ], function () {
        showOptions([
          { label: 'Sí, me interesa el diagnóstico', action: function () { state.lead.dolor_principal = state.lead.dolor_principal || 'Interés general'; goStage3(); } },
          { label: 'Tengo otra pregunta', action: function () { showInput('Escribe tu pregunta…', handleFreeText); } }
        ]);
      });
      return;
    }

    if (lower.indexOf('proveedor') !== -1 || lower.indexOf('ya tengo') !== -1 || lower.indexOf('ya cuento') !== -1) {
      addBotBubbles([
        'Tiene mucho sentido.',
        '¿Qué es lo que sientes que tu proveedor actual no está resolviendo del todo?',
        'A veces vale la pena tener una segunda opinión técnica.'
      ], function () {
        showInput('Cuéntame más…', function (resp) {
          state.lead.notas = (state.lead.notas ? state.lead.notas + ' | ' : '') + resp;
          addBotMessage('Entiendo. Para darte la mejor orientación, ¿me podrías decir qué tipo de institución tienes?', function () {
            showOptions([
              { label: 'SOFOM', action: function () { state.lead.tipo_institucion = 'SOFOM'; state.lead.etapa = 'existente'; goStage3(); } },
              { label: 'SOFIPO', action: function () { state.lead.tipo_institucion = 'SOFIPO'; state.lead.etapa = 'existente'; goStage3(); } },
              { label: 'IFPE / Fintech', action: function () { state.lead.tipo_institucion = 'IFPE'; state.lead.etapa = 'existente'; goStage3(); } },
              { label: 'Otra', action: function () { state.lead.tipo_institucion = 'Otro'; state.lead.etapa = 'existente'; goStage3(); } }
            ]);
          });
        });
      });
      return;
    }

    if (lower.indexOf('bot') !== -1 || lower.indexOf('robot') !== -1 || lower.indexOf('ia') !== -1 || lower.indexOf('inteligencia artificial') !== -1 || lower.indexOf('automatiz') !== -1) {
      addBotBubbles([
        'Soy ' + ASESORA.nombre + ', parte del equipo de Innova Black®.',
        'Estoy aquí para entender tu situación antes de conectarte con la persona indicada.',
        '¿Qué tipo de institución tienes?'
      ], function () {
        showOptions([
          { label: 'SOFOM / SOFIPO / IFPE', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
          { label: 'Estoy constituyendo una', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } }
        ]);
      });
      return;
    }

    var closeWords = ['no me interesa', 'no quiero', 'no gracias', 'no, gracias', 'basta',
      'deja', 'callate', 'cállate', 'adios', 'adiós', 'bye', 'chao', 'hasta luego',
      'no necesito', 'dejame', 'déjame', 'ya no', 'me voy', 'stop', 'para', 'suficiente'];
    var isClose = closeWords.some(function (w) { return lower.indexOf(w) !== -1; });
    if (isClose) {
      if (!state.lead.telefono && !state.lead.email) {
        addBotBubbles([
          'Entendido, sin problema.',
          'Antes de irte — ¿te dejo mi WhatsApp por si algún día necesitas orientación?',
          'Solo déjame tu número y te mando un mensaje.'
        ], function () {
          showOptions([
            { label: 'Ok, anota mi número', action: function () {
              showInput('+52 10 dígitos…', function (phone) {
                var cleaned = phone.replace(/\D/g, '');
                if (cleaned.length >= 10) {
                  state.lead.telefono = phone;
                  state.lead.nombre = state.lead.nombre || 'Lead rápido';
                  state.temperatura = 'frio';
                  addBotMessage('¡Listo! Te mando un mensaje. ¡Éxito! 🙌');
                  sendLead(); scheduleReset();
                } else {
                  state.stage = 'done';
                  addBotMessage('Sin problema. ¡Que te vaya muy bien! 😊');
                  scheduleReset();
                }
              });
            }},
            { label: 'No gracias', action: function () {
              state.stage = 'done';
              if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
              addBotMessage('Entendido. ¡Que te vaya muy bien! Si cambias de opinión, aquí estamos. 😊');
              if (state.lead.email || state.lead.telefono) sendLead();
              scheduleReset();
            }}
          ]);
        });
        return;
      }
      state.stage = 'done';
      if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
      addBotMessage('Entendido, sin problema. Si en algún momento necesitas orientación, aquí estamos. ¡Que te vaya muy bien! 🙂');
      if (state.lead.email || state.lead.telefono) sendLead();
      scheduleReset();
      return;
    }

    state.lead.notas = (state.lead.notas ? state.lead.notas + ' | ' : '') + text;
    addBotBubbles([
      'Entiendo.',
      'Para darte la mejor orientación, ¿me podrías decir qué tipo de institución tienes?'
    ], function () {
      showOptions([
        { label: 'SOFOM / SOFIPO / IFPE (existente)', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
        { label: 'Estoy constituyendo una nueva', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } },
        { label: 'Solo quiero información', action: function () { goStage3(); } }
      ]);
    });
  }

  /* --------------------------------------------------------
     ENVÍO DE LEAD — v3: incluye source tracking
     -------------------------------------------------------- */
  function sendLead() {
    state.stage = 'done';
    if (state.inactivityTimer) clearTimeout(state.inactivityTimer);

    var leadData = {
      timestamp: new Date().toISOString(),
      agente: ASESORA.nombre,
      lead: state.lead,
      temperatura: state.temperatura,
      siguiente_accion: state.temperatura === 'caliente' ? 'contacto_inmediato' : state.temperatura === 'tibio' ? 'seguimiento_24h' : 'nurturing',
      agenda_calcom: state.lead.agenda_calcom || false,
      source: SOURCE,
      conversacion_completa: state.conversation
    };

    var leads = [];
    try { leads = JSON.parse(localStorage.getItem('vbot_leads') || '[]'); } catch (e) { leads = []; }
    leads.push(leadData);
    localStorage.setItem('vbot_leads', JSON.stringify(leads));

    var payload = {
      nombre: state.lead.nombre,
      email: state.lead.email,
      telefono: state.lead.telefono || '',
      temperatura: state.temperatura,
      tipo_institucion: state.lead.tipo_institucion || '',
      etapa: state.lead.etapa || '',
      dolor_principal: state.lead.dolor_principal || '',
      urgencia: state.lead.urgencia || '',
      agenda_calcom: state.lead.agenda_calcom || false,
      notas: state.lead.notas || '',
      asesora: ASESORA.nombre,
      // v3: source data
      utm_source: SOURCE.utm_source,
      utm_medium: SOURCE.utm_medium,
      utm_campaign: SOURCE.utm_campaign,
      referrer: SOURCE.referrer,
      landing_page: SOURCE.landing_page,
      chat_opened_on: SOURCE.chat_opened_on
    };

    fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json();
    }).then(function (data) {
      if (data.success) {
        console.log('[Valeria] Lead enviado — email al lead: ' + data.leadEmail + ', notificación equipo: ' + data.teamEmail);
      } else {
        console.warn('[Valeria] Error al enviar lead:', data.error);
      }
    }).catch(function (err) {
      console.warn('[Valeria] Error de red al enviar lead:', err);
    });
  }

  /* --------------------------------------------------------
     TRIGGER PROACTIVO
     -------------------------------------------------------- */
  function triggerProactive() {
    if (state.hasTriggered || state.isOpen) return;
    state.hasTriggered = true;
    var preview = document.getElementById('vbot-preview');
    var badge = document.getElementById('vbot-badge');
    preview.classList.add('show');
    badge.classList.add('show');
    if (navigator.vibrate) navigator.vibrate([100]);
  }

  function setupTriggers() {
    setTimeout(function () {
      if (!state.hasTriggered && !state.isOpen) triggerProactive();
    }, CONFIG.triggerDelay);

    var servicesSection = document.getElementById('servicios');
    if (servicesSection) {
      var triggerObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !state.hasTriggered && !state.isOpen) {
            triggerProactive();
            triggerObserver.disconnect();
          }
        });
      }, { threshold: 0.1 });
      triggerObserver.observe(servicesSection);
    }

    document.addEventListener('click', function (e) {
      var target = e.target.closest('a[href="#cta"], a[href*="mailto:hello@innova.black"], .btn-gold, .nav-cta');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openChat();
      }
    }, true);
  }

  /* --------------------------------------------------------
     EVENT LISTENERS
     -------------------------------------------------------- */
  function bindEvents() {
    document.getElementById('vbot-bubble').addEventListener('click', openChat);
    document.getElementById('vbot-preview').addEventListener('click', function (e) {
      if (e.target.id !== 'vbot-preview-close') openChat();
    });
    document.getElementById('vbot-preview-close').addEventListener('click', function (e) {
      e.stopPropagation();
      document.getElementById('vbot-preview').classList.remove('show');
      state.previewDismissed = true;
    });
    document.getElementById('vbot-close').addEventListener('click', closeChat);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) closeChat();
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        if (state.isOpen) {
          var win = document.getElementById('vbot-window');
          if (window.innerWidth <= 600 && win) {
            win.style.height = window.visualViewport.height + 'px';
          }
        }
      });
      window.visualViewport.addEventListener('scroll', function () {
        if (state.isOpen && window.innerWidth <= 600) {
          var win = document.getElementById('vbot-window');
          if (win) {
            win.style.height = window.visualViewport.height + 'px';
            win.style.transform = 'translateY(0)';
          }
        }
      });
    }
  }

  /* --------------------------------------------------------
     INIT
     -------------------------------------------------------- */
  function init() {
    injectHTML();
    bindEvents();
    setupTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
