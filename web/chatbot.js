/* ============================================================
   INNOVA BLACK® — CHATBOT VALERIA v2.0
   Bot conversacional de captura de leads
   Flujo determinístico con simulación humana
   + Rescue flow mejorado: nunca pierde el lead
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
    typingMin: 1500,
    typingMax: 3000,
    // Tiempos de inactividad por etapa
    rescueDelay1: 25000,    // 25s → "¿Sigues ahí?"
    rescueDelay2: 30000,    // 30s después → pedir celular
    rescueDelay3: 35000,    // 35s después → pedir email
    rescueDelay4: 40000,    // 40s después → despedida
    closeAfterLead: 6000
  };

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
    rescueStage: 0    // 0=nada, 1=¿sigues ahí?, 2=pedir cel, 3=pedir email, 4=despedida
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
     Nunca pierde al lead. Siempre intenta capturar datos.
     -------------------------------------------------------- */
  function resetInactivityTimer() {
    if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
    if (state.stage === 'done' || state.stage === 'idle') return;

    var delay;
    switch (state.rescueStage) {
      case 0: delay = CONFIG.rescueDelay1; break;  // → "¿Sigues ahí?"
      case 1: delay = CONFIG.rescueDelay2; break;  // → pedir celular
      case 2: delay = CONFIG.rescueDelay3; break;  // → pedir email
      case 3: delay = CONFIG.rescueDelay4; break;  // → despedida
      default: return;
    }
    state.inactivityTimer = setTimeout(runRescueStage, delay);
  }

  // Mensajes de rescate por etapa
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

    // --- Etapa 1: "¿Sigues ahí?" ---
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
          { label: 'Estoy ocupado/a', action: function () {
            goRescuePhone();
          }},
          { label: 'No gracias, solo veía', action: function () {
            goRescuePhone();
          }}
        ]);
      });
      return;
    }

    // --- Etapa 2: Pedir celular ---
    if (state.rescueStage === 1 && !state.lead.telefono) {
      goRescuePhone();
      return;
    }

    // --- Etapa 3: Pedir email ---
    if (state.rescueStage <= 2 && !state.lead.email) {
      goRescueEmail();
      return;
    }

    // --- Etapa 4: Despedida ---
    goRescueGoodbye();
  }

  function goRescuePhone() {
    state.rescueStage = 2;
    if (state.lead.telefono) {
      // Ya tenemos cel, ir por email
      goRescueEmail();
      return;
    }
    addBotMessage(randomFrom(rescueMsg.pedirCel), function () {
      showInput('+52 10 dígitos…', function (phone) {
        resetInactivityTimer();
        var cleaned = phone.replace(/\D/g, '');
        if (cleaned.length >= 10) {
          state.lead.telefono = phone;
          state.lead.nombre = state.lead.nombre || 'Lead rápido';
          state.temperatura = state.temperatura || 'tibio';
          addBotMessage('¡Listo! Te va a llegar un mensaje por WhatsApp. 🙌', function () {
            // Ahora intentar capturar email también
            if (!state.lead.email) {
              goRescueEmail();
            } else {
              sendLead();
              scheduleReset();
            }
          });
        } else {
          // No dio cel válido, intentar email
          goRescueEmail();
        }
      });
    });
  }

  function goRescueEmail() {
    state.rescueStage = 3;
    if (state.lead.email) {
      // Ya tenemos email, enviar y cerrar
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
          // Email inválido → despedida con lo que tengamos
          if (state.lead.telefono) {
            sendLead();
          }
          goRescueGoodbye();
        }
      });
    });
  }

  function goRescueGoodbye() {
    state.rescueStage = 4;
    if (state.lead.email || state.lead.telefono) {
      sendLead();
    }
    addBotMessage(randomFrom(rescueMsg.despedida));
    setTimeout(function () {
      closeChat();
      scheduleFullReset();
    }, CONFIG.closeAfterLead);
  }

  /* --------------------------------------------------------
     REINICIO
     -------------------------------------------------------- */
  function scheduleReset() {
    setTimeout(function () {
      closeChat();
      scheduleFullReset();
    }, CONFIG.closeAfterLead);
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

  function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function validatePhone(p) {
    var digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  function scrollToBottom() {
    var m = document.getElementById('vbot-messages');
    if (m) setTimeout(function () { m.scrollTop = m.scrollHeight; }, 50);
  }

  /* --------------------------------------------------------
     INYECTAR HTML
     -------------------------------------------------------- */
  function injectHTML() {
    var container = document.createElement('div');
    container.id = 'vbot-root';
    container.innerHTML =
      '<div class="vbot-preview" id="vbot-preview">' +
        '<button class="vbot-preview-close" id="vbot-preview-close">&times;</button>' +
        'Hola \ud83d\udc4b Soy ' + ASESORA.nombre + ', del equipo de Innova Black\u00ae. \u00bfEst\u00e1s explorando opciones para tu instituci\u00f3n financiera?' +
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

    win.classList.add('open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        win.classList.add('visible');
      });
    });
    bubble.style.display = 'none';
    preview.classList.remove('show');
    badge.classList.remove('show');
    state.isOpen = true;

    if (state.stage === 'idle') {
      startConversation();
    }
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

    var delay = randomDelay();
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

    // En mobile, delay el focus para evitar problemas con el teclado
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

    var keyHandler = function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handler();
      }
    };

    input.addEventListener('keydown', keyHandler);
    document.getElementById('vbot-send').addEventListener('click', handler);
  }

  function showCalendlyOrContact() {
    var msgs = document.getElementById('vbot-messages');
    var container = document.createElement('div');
    container.className = 'vbot-options';

    var btnA = document.createElement('button');
    btnA.className = 'vbot-cta';
    btnA.textContent = 'S\u00ed, quiero agendar ahora';
    btnA.addEventListener('click', function () {
      if (container.parentNode) container.parentNode.removeChild(container);
      addUserMessage('S\u00ed, quiero agendar ahora');
      if (CONFIG.calUrl) {
        window.open(CONFIG.calUrl, '_blank');
      }
      state.lead.agenda_calcom = true;
      addBotMessage('Excelente. Revisa tu correo \u2014 te llegar\u00e1 la confirmaci\u00f3n. Nos vemos pronto. \ud83d\ude0a');
      sendLead();
      scheduleReset();
    });

    var btnB = document.createElement('button');
    btnB.className = 'vbot-opt';
    btnB.textContent = 'Prefiero que me contacten';
    btnB.addEventListener('click', function () {
      if (container.parentNode) container.parentNode.removeChild(container);
      addUserMessage('Prefiero que me contacten');
      state.lead.agenda_calcom = false;
      addBotMessage('Listo. Estaremos en contacto pronto. \u00a1Que tengas excelente d\u00eda! \ud83d\udc4b');
      sendLead();
      scheduleReset();
    });

    container.appendChild(btnA);
    container.appendChild(btnB);
    msgs.appendChild(container);
    scrollToBottom();
  }

  /* --------------------------------------------------------
     FLUJO DE CONVERSACIÓN
     -------------------------------------------------------- */
  function startConversation() {
    state.stage = 'trigger';
    addBotMessage('Hola \ud83d\udc4b Soy ' + ASESORA.nombre + ', del equipo de Innova Black\u00ae.<br>\u00bfEst\u00e1s explorando opciones para tu instituci\u00f3n financiera?', function () {
      showOptions([
        { label: 'S\u00ed, tengo una SOFOM / SOFIPO / IFPE', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
        { label: 'Estoy en proceso de constituir una', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } },
        { label: 'Solo estoy viendo informaci\u00f3n', action: goStageInfo }
      ]);
    });
  }

  function goStageInfo() {
    state.stage = 'info';
    addBotMessage('Sin problema, t\u00f3mate el tiempo que necesites. Si tienes alguna duda sobre la Ley Fintech 2.0 o c\u00f3mo modernizar una instituci\u00f3n, aqu\u00ed estoy. \ud83d\ude42', function () {
      showInput('Escribe tu pregunta\u2026', handleFreeText);
    });
  }

  function goStage1A() {
    state.stage = '1a';
    addBotMessage('Cu\u00e9ntame, \u00bfqu\u00e9 tipo de instituci\u00f3n tienes?', function () {
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
    addBotMessage('Entendido. \u00bfCu\u00e1l es el reto m\u00e1s urgente que enfrentas hoy?', function () {
      showOptions([
        { label: 'Cumplimiento PLD/KYC manual \u2014 muy lento', action: function () { state.lead.dolor_principal = 'PLD/KYC manual'; goStage2('pld'); } },
        { label: 'Sistemas legacy que ya no funcionan', action: function () { state.lead.dolor_principal = 'Sistemas legacy'; goStage2('legacy'); } },
        { label: 'Ley Fintech 2.0 / GAFI \u2014 no s\u00e9 c\u00f3mo cumplir', action: function () { state.lead.dolor_principal = 'Ley Fintech 2.0 / GAFI'; goStage2('gafi'); } },
        { label: 'Quiero conectarme a SPEI o emitir tarjetas', action: function () { state.lead.dolor_principal = 'SPEI / tarjetas'; goStage2('spei'); } }
      ]);
    });
  }

  function goStage1B() {
    state.stage = '1b';
    addBotMessage('\u00a1Interesante momento para arrancar! \u00bfEn qu\u00e9 etapa est\u00e1s?', function () {
      showOptions([
        { label: 'Tengo la idea, a\u00fan no inicio nada', action: function () { state.lead.dolor_principal = 'Idea inicial'; goStage2('nueva'); } },
        { label: 'Ya tengo asesor\u00eda legal, me falta la parte tecnol\u00f3gica', action: function () { state.lead.dolor_principal = 'Falta tech'; goStage2('nueva'); } },
        { label: 'Ya inici\u00e9 el tr\u00e1mite ante CNBV', action: function () { state.lead.dolor_principal = 'Tr\u00e1mite CNBV'; goStage2('nueva'); } },
        { label: 'Tengo capital listo, quiero arrancar r\u00e1pido', action: function () { state.lead.dolor_principal = 'Capital listo'; goStage2('nueva'); } }
      ]);
    });
  }

  var stage2Responses = {
    pld: 'Ese es uno de los problemas m\u00e1s comunes que vemos. El proceso manual no solo es lento \u2014 es un riesgo regulatorio real. Nosotros automatizamos todo el flujo PLD con nuestra metodolog\u00eda DTX\u2122.',
    gafi: 'La evaluaci\u00f3n GAFI est\u00e1 encima \u2014 el tiempo se acorta. Hemos ayudado a varias instituciones a ponerse al d\u00eda con la normativa de forma acelerada.',
    spei: 'Para conectarse a SPEI necesitas una arquitectura espec\u00edfica desde el inicio. Justo eso es lo que construimos con DTX Payments\u2122.',
    legacy: 'Migrar sistemas sin afectar la operaci\u00f3n es el reto m\u00e1s delicado. Lo hemos hecho varias veces \u2014 tenemos un proceso probado para eso.',
    nueva: 'Arrancamos varias instituciones desde cero \u2014 desde el framework regulatorio hasta la infraestructura tecnol\u00f3gica completa. Es lo que mejor hacemos.'
  };

  function goStage2(painKey) {
    state.stage = '2';
    var response = stage2Responses[painKey] || stage2Responses.nueva;
    addBotMessage(response, function () {
      setTimeout(function () { goStage3(); }, 500);
    });
  }

  function goStage3() {
    state.stage = '3';
    addBotMessage('Para entender c\u00f3mo podemos ayudarte mejor \u2014 \u00bfqu\u00e9 tan urgente es esto para ti?', function () {
      showOptions([
        { label: 'Cr\u00edtico \u2014 necesito resolver esto en el pr\u00f3ximo mes', action: function () { state.lead.urgencia = 'critico'; state.temperatura = 'caliente'; goStage4('critico'); } },
        { label: 'Importante \u2014 tengo 3 meses para actuar', action: function () { state.lead.urgencia = 'importante'; state.temperatura = 'tibio'; goStage4('importante'); } },
        { label: 'Estoy explorando \u2014 no hay prisa', action: function () { state.lead.urgencia = 'explorando'; state.temperatura = 'frio'; goStage4('frio'); } }
      ]);
    });
  }

  var stage4Intros = {
    critico: 'Con todo lo que me comentas, creo que vale la pena que hables directamente con nuestro equipo. \u00bfMe das tu nombre para conectarte?',
    importante: 'Podemos hacer un diagn\u00f3stico gratuito de 45 minutos para darte un roadmap claro. \u00bfC\u00f3mo te llamas?',
    frio: 'Te puedo mandar informaci\u00f3n relevante sobre c\u00f3mo otras instituciones han resuelto esto. \u00bfC\u00f3mo te llamas?'
  };

  function goStage4(urgencyKey) {
    state.stage = '4_name';
    var intro = stage4Intros[urgencyKey] || stage4Intros.importante;
    addBotMessage(intro, function () {
      showInput('Tu nombre\u2026', function (name) {
        state.lead.nombre = name;
        goStage4Phone();
      });
    });
  }

  // CAMBIO: Primero teléfono, luego email (WhatsApp es rey en MX)
  function goStage4Phone() {
    state.stage = '4_phone';
    addBotMessage('Mucho gusto, ' + esc(state.lead.nombre) + '. \u00bfCu\u00e1l es tu WhatsApp para contactarte r\u00e1pido?', function () {
      showInput('+52 10 d\u00edgitos\u2026', function (phone) {
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
    addBotMessage('\u00bfY un correo para mandarte la informaci\u00f3n detallada?', function () {
      showInput('correo@ejemplo.com', function (email) {
        if (!validateEmail(email)) {
          addBotMessage('Hmm, ese correo no parece v\u00e1lido. \u00bfMe lo puedes escribir de nuevo?', function () {
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
    var msg = 'Perfecto, ' + nombre + '. Ya tengo todo lo que necesito.<br><br>' +
      'Nuestro equipo te va a contactar antes de 24 horas para agendar tu diagn\u00f3stico gratuito. ' +
      'Es una sesi\u00f3n de 45 minutos donde analizamos tu situaci\u00f3n y te damos un roadmap concreto \u2014 sin compromiso.<br><br>' +
      '\u00bfQuieres agendar directamente ahora?';

    addBotMessage(msg, function () {
      showCalendlyOrContact();
    });
  }

  /* --------------------------------------------------------
     MANEJO DE TEXTO LIBRE
     -------------------------------------------------------- */
  function handleFreeText(text) {
    var lower = text.toLowerCase();

    if (lower.indexOf('precio') !== -1 || lower.indexOf('costo') !== -1 || lower.indexOf('cuanto') !== -1 || lower.indexOf('cu\u00e1nto') !== -1 || lower.indexOf('tarifa') !== -1) {
      addBotMessage('Los costos dependen del alcance espec\u00edfico de cada proyecto. Lo que s\u00ed puedo decirte es que el diagn\u00f3stico inicial es completamente gratuito. \u00bfAgendamos ese primer paso?', function () {
        showOptions([
          { label: 'S\u00ed, me interesa el diagn\u00f3stico', action: function () { state.lead.dolor_principal = state.lead.dolor_principal || 'Inter\u00e9s general'; goStage3(); } },
          { label: 'Tengo otra pregunta', action: function () { showInput('Escribe tu pregunta\u2026', handleFreeText); } }
        ]);
      });
      return;
    }

    if (lower.indexOf('proveedor') !== -1 || lower.indexOf('ya tengo') !== -1 || lower.indexOf('ya cuento') !== -1) {
      addBotMessage('Tiene mucho sentido. \u00bfQu\u00e9 es lo que sientes que tu proveedor actual no est\u00e1 resolviendo del todo? A veces vale la pena tener una segunda opini\u00f3n t\u00e9cnica.', function () {
        showInput('Cu\u00e9ntame m\u00e1s\u2026', function (resp) {
          state.lead.notas = (state.lead.notas ? state.lead.notas + ' | ' : '') + resp;
          addBotMessage('Entiendo. Para darte la mejor orientaci\u00f3n, \u00bfme podr\u00edas decir qu\u00e9 tipo de instituci\u00f3n tienes?', function () {
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
      addBotMessage('Soy ' + ASESORA.nombre + ', parte del equipo de Innova Black\u00ae. Estoy aqu\u00ed para entender tu situaci\u00f3n antes de conectarte con la persona indicada. \u00bfQu\u00e9 tipo de instituci\u00f3n tienes?', function () {
        showOptions([
          { label: 'SOFOM / SOFIPO / IFPE', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
          { label: 'Estoy constituyendo una', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } }
        ]);
      });
      return;
    }

    var closeWords = ['no me interesa', 'no quiero', 'no gracias', 'no, gracias', 'basta',
      'deja', 'callate', 'c\u00e1llate', 'adios', 'adi\u00f3s', 'bye', 'chao', 'hasta luego',
      'no necesito', 'dejame', 'd\u00e9jame', 'ya no', 'me voy', 'stop', 'para', 'suficiente'];
    var isClose = closeWords.some(function (w) { return lower.indexOf(w) !== -1; });
    if (isClose) {
      // Incluso al cerrar, intentar capturar datos si no tenemos
      if (!state.lead.telefono && !state.lead.email) {
        addBotMessage('Entendido, sin problema. Antes de irte — ¿te dejo mi WhatsApp por si algún día necesitas orientación? Solo déjame tu número y te mando un mensaje.', function () {
          showOptions([
            { label: 'Ok, anota mi número', action: function () {
              showInput('+52 10 dígitos…', function (phone) {
                var cleaned = phone.replace(/\D/g, '');
                if (cleaned.length >= 10) {
                  state.lead.telefono = phone;
                  state.lead.nombre = state.lead.nombre || 'Lead rápido';
                  state.temperatura = 'frio';
                  addBotMessage('¡Listo! Te mando un mensaje. ¡Éxito! 🙌');
                  sendLead();
                  scheduleReset();
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
      addBotMessage('Entendido, sin problema. Si en alg\u00fan momento necesitas orientaci\u00f3n, aqu\u00ed estamos. \u00a1Que te vaya muy bien! \ud83d\ude42');
      if (state.lead.email || state.lead.telefono) sendLead();
      scheduleReset();
      return;
    }

    state.lead.notas = (state.lead.notas ? state.lead.notas + ' | ' : '') + text;
    addBotMessage('Entiendo. Para darte la mejor orientaci\u00f3n, \u00bfme podr\u00edas decir qu\u00e9 tipo de instituci\u00f3n tienes?', function () {
      showOptions([
        { label: 'SOFOM / SOFIPO / IFPE (existente)', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
        { label: 'Estoy constituyendo una nueva', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } },
        { label: 'Solo quiero informaci\u00f3n', action: function () { goStage3(); } }
      ]);
    });
  }

  /* --------------------------------------------------------
     ENVÍO DE LEAD
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
      conversacion_completa: state.conversation
    };

    var leads = [];
    try {
      leads = JSON.parse(localStorage.getItem('vbot_leads') || '[]');
    } catch (e) { leads = []; }
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
      asesora: ASESORA.nombre
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

    if (navigator.vibrate) {
      navigator.vibrate([100]);
    }
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

    // Handle visual viewport resize on mobile (keyboard open/close)
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
