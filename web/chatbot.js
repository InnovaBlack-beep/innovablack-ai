/* ============================================================
   INNOVA BLACK® — CHATBOT VALERIA v1.0
   Bot conversacional de captura de leads
   Flujo determinístico con simulación humana
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     CONFIGURACIÓN
     -------------------------------------------------------- */
  var CONFIG = {
    // EmailJS — crear cuenta gratis en emailjs.com y llenar estos datos
    emailjsPublicKey: '',       // Tu Public Key de EmailJS
    emailjsServiceId: '',       // ID del servicio de email
    emailjsTemplateId: '',      // ID del template

    recipientEmail: 'hello@innova.black',
    calendlyUrl: '',            // URL de Calendly (ej: https://calendly.com/innovablack)

    triggerDelay: 15000,        // ms antes de mostrar burbuja proactiva
    typingMin: 1500,            // ms mínimo de "typing"
    typingMax: 3000             // ms máximo de "typing"
  };

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
    conversation: []
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
      /* Proactive preview */
      '<div class="vbot-preview" id="vbot-preview">' +
        '<button class="vbot-preview-close" id="vbot-preview-close">&times;</button>' +
        'Hola \ud83d\udc4b Soy Valeria, del equipo de Innova Black\u00ae. \u00bfEst\u00e1s explorando opciones para tu instituci\u00f3n financiera?' +
      '</div>' +

      /* Floating bubble */
      '<button class="vbot-bubble" id="vbot-bubble" aria-label="Abrir chat">' +
        '<span class="vbot-bubble-initials">VR</span>' +
        '<span class="vbot-badge" id="vbot-badge">1</span>' +
      '</button>' +

      /* Chat window */
      '<div class="vbot-window" id="vbot-window">' +
        /* Header */
        '<div class="vbot-header">' +
          '<div class="vbot-header-avatar"><span class="vbot-header-avatar-text">VR</span></div>' +
          '<div class="vbot-header-info">' +
            '<p class="vbot-header-name">Valeria</p>' +
            '<p class="vbot-header-sub">Innova Black\u00ae \u00b7 Asesora</p>' +
            '<div class="vbot-header-status">' +
              '<span class="vbot-status-dot"></span>' +
              '<span class="vbot-status-text">En l\u00ednea ahora</span>' +
            '</div>' +
          '</div>' +
          '<button class="vbot-close" id="vbot-close" aria-label="Cerrar chat">&times;</button>' +
        '</div>' +

        /* Messages */
        '<div class="vbot-messages" id="vbot-messages"></div>' +

        /* Input */
        '<div class="vbot-input-area" id="vbot-input-area">' +
          '<input class="vbot-input" id="vbot-input" type="text" placeholder="Escribe un mensaje\u2026" autocomplete="off" />' +
          '<button class="vbot-send" id="vbot-send" aria-label="Enviar">' +
            '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
          '</button>' +
        '</div>' +

        /* Footer */
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

    // Typing indicator
    var typing = document.createElement('div');
    typing.className = 'vbot-typing';
    typing.innerHTML = '<span class="vbot-typing-dot"></span><span class="vbot-typing-dot"></span><span class="vbot-typing-dot"></span>';
    msgs.appendChild(typing);
    scrollToBottom();

    var delay = randomDelay();
    setTimeout(function () {
      msgs.removeChild(typing);
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
    var msgs = document.getElementById('vbot-messages');
    var container = document.createElement('div');
    container.className = 'vbot-options';

    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'vbot-opt';
      btn.textContent = opt.label;
      btn.addEventListener('click', function () {
        // Remove option buttons
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
    var area = document.getElementById('vbot-input-area');
    var input = document.getElementById('vbot-input');
    area.classList.add('active');
    input.placeholder = placeholder || 'Escribe un mensaje\u2026';
    input.value = '';
    input.focus();

    var handler = function () {
      var val = input.value.trim();
      if (!val) return;
      input.value = '';
      addUserMessage(val);
      area.classList.remove('active');
      input.removeEventListener('keydown', keyHandler);
      document.getElementById('vbot-send').removeEventListener('click', handler);
      onSubmit(val);
    };

    var keyHandler = function (e) {
      if (e.key === 'Enter') handler();
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
      if (CONFIG.calendlyUrl) {
        window.open(CONFIG.calendlyUrl, '_blank');
      }
      state.lead.agenda_calendly = true;
      addBotMessage('Excelente. Revisa tu correo \u2014 te llegar\u00e1 la confirmaci\u00f3n. Nos vemos pronto. \ud83d\ude0a');
      sendLead();
    });

    var btnB = document.createElement('button');
    btnB.className = 'vbot-opt';
    btnB.textContent = 'Prefiero que me contacten';
    btnB.addEventListener('click', function () {
      if (container.parentNode) container.parentNode.removeChild(container);
      addUserMessage('Prefiero que me contacten');
      state.lead.agenda_calendly = false;
      addBotMessage('Listo. Estaremos en contacto pronto. \u00a1Que tengas excelente d\u00eda! \ud83d\udc4b');
      sendLead();
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
    addBotMessage('Hola \ud83d\udc4b Soy Valeria, del equipo de Innova Black\u00ae.<br>\u00bfEst\u00e1s explorando opciones para tu instituci\u00f3n financiera?', function () {
      showOptions([
        { label: 'S\u00ed, tengo una SOFOM / SOFIPO / IFPE', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
        { label: 'Estoy en proceso de constituir una', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } },
        { label: 'Solo estoy viendo informaci\u00f3n', action: goStageInfo; }
      ]);
    });
  }

  function goStageInfo() {
    state.stage = 'info';
    addBotMessage('Sin problema, t\u00f3mate el tiempo que necesites. Si tienes alguna duda sobre la Ley Fintech 2.0 o c\u00f3mo modernizar una instituci\u00f3n, aqu\u00ed estoy. \ud83d\ude42', function () {
      showInput('Escribe tu pregunta\u2026', handleFreeText);
    });
  }

  /* --- ETAPA 1A: Institución existente --- */
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

  /* --- ETAPA 1B: Constitución nueva --- */
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

  /* --- ETAPA 2: Contexto y validación --- */
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
      setTimeout(function () {
        goStage3();
      }, 500);
    });
  }

  /* --- ETAPA 3: Urgencia --- */
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

  /* --- ETAPA 4: Captura de datos --- */
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
        goStage4Email();
      });
    });
  }

  function goStage4Email() {
    state.stage = '4_email';
    addBotMessage('Mucho gusto, ' + esc(state.lead.nombre) + '. \u00bfCu\u00e1l es tu correo?', function () {
      showInput('correo@ejemplo.com', function (email) {
        if (!validateEmail(email)) {
          addBotMessage('Hmm, ese correo no parece v\u00e1lido. \u00bfMe lo puedes escribir de nuevo?', function () {
            showInput('correo@ejemplo.com', function (email2) {
              state.lead.email = email2;
              goStage4Phone();
            });
          });
        } else {
          state.lead.email = email;
          goStage4Phone();
        }
      });
    });
  }

  function goStage4Phone() {
    state.stage = '4_phone';
    addBotMessage('\u00bfY un n\u00famero de WhatsApp o tel\u00e9fono por si acaso? (opcional)', function () {
      showInput('10 d\u00edgitos\u2026', function (phone) {
        if (phone.toLowerCase() === 'no' || phone === '-' || phone === 'paso' || phone.toLowerCase() === 'skip') {
          state.lead.telefono = '';
        } else {
          state.lead.telefono = phone;
        }
        goStage5();
      });
    });
  }

  /* --- ETAPA 5: Cierre --- */
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

    // Detección de intención: precios
    if (lower.indexOf('precio') !== -1 || lower.indexOf('costo') !== -1 || lower.indexOf('cuanto') !== -1 || lower.indexOf('cu\u00e1nto') !== -1 || lower.indexOf('tarifa') !== -1) {
      addBotMessage('Los costos dependen del alcance espec\u00edfico de cada proyecto. Lo que s\u00ed puedo decirte es que el diagn\u00f3stico inicial es completamente gratuito. \u00bfAgendamos ese primer paso?', function () {
        showOptions([
          { label: 'S\u00ed, me interesa el diagn\u00f3stico', action: function () { state.lead.dolor_principal = state.lead.dolor_principal || 'Inter\u00e9s general'; goStage3(); } },
          { label: 'Tengo otra pregunta', action: function () { showInput('Escribe tu pregunta\u2026', handleFreeText); } }
        ]);
      });
      return;
    }

    // Detección: ya tiene proveedor
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

    // Detección: bot?
    if (lower.indexOf('bot') !== -1 || lower.indexOf('robot') !== -1 || lower.indexOf('ia') !== -1 || lower.indexOf('inteligencia artificial') !== -1 || lower.indexOf('automatiz') !== -1) {
      addBotMessage('Soy Valeria, parte del equipo de Innova Black\u00ae. Estoy aqu\u00ed para entender tu situaci\u00f3n antes de conectarte con la persona indicada. \u00bfQu\u00e9 tipo de instituci\u00f3n tienes?', function () {
        showOptions([
          { label: 'SOFOM / SOFIPO / IFPE', action: function () { state.lead.etapa = 'existente'; goStage1A(); } },
          { label: 'Estoy constituyendo una', action: function () { state.lead.etapa = 'nueva_constitucion'; goStage1B(); } }
        ]);
      });
      return;
    }

    // Detección: agresivo
    if (lower.indexOf('no me interesa') !== -1 || lower.indexOf('basta') !== -1 || lower.indexOf('deja') !== -1 || lower.indexOf('callate') !== -1 || lower.indexOf('c\u00e1llate') !== -1) {
      addBotMessage('Entiendo. Si en alg\u00fan momento necesitas orientaci\u00f3n sobre regulaci\u00f3n financiera o tecnolog\u00eda, aqu\u00ed estoy. \u00a1Que tengas buen d\u00eda! \ud83d\ude42');
      return;
    }

    // Default: redirigir al flujo
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
    var leadData = {
      timestamp: new Date().toISOString(),
      agente: 'Valeria',
      lead: state.lead,
      temperatura: state.temperatura,
      siguiente_accion: state.temperatura === 'caliente' ? 'contacto_inmediato' : state.temperatura === 'tibio' ? 'seguimiento_24h' : 'nurturing',
      agenda_calendly: state.lead.agenda_calendly || false,
      conversacion_completa: state.conversation
    };

    // Guardar en localStorage como respaldo
    var leads = [];
    try {
      leads = JSON.parse(localStorage.getItem('vbot_leads') || '[]');
    } catch (e) { leads = []; }
    leads.push(leadData);
    localStorage.setItem('vbot_leads', JSON.stringify(leads));

    // Intentar enviar por EmailJS si está configurado
    if (CONFIG.emailjsPublicKey && CONFIG.emailjsServiceId && CONFIG.emailjsTemplateId && window.emailjs) {
      var tempEmoji = state.temperatura === 'caliente' ? '\ud83d\udd25' : state.temperatura === 'tibio' ? '\ud83c\udf24\ufe0f' : '\u2744\ufe0f';
      window.emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, {
        to_email: CONFIG.recipientEmail,
        subject: tempEmoji + ' Lead ' + state.temperatura.toUpperCase() + ' \u2014 ' + state.lead.nombre,
        nombre: state.lead.nombre,
        email: state.lead.email,
        telefono: state.lead.telefono || 'No proporcionado',
        tipo_institucion: state.lead.tipo_institucion,
        etapa: state.lead.etapa,
        dolor_principal: state.lead.dolor_principal,
        urgencia: state.lead.urgencia,
        temperatura: state.temperatura,
        notas: state.lead.notas || 'N/A',
        conversacion: JSON.stringify(state.conversation, null, 2)
      }).then(function () {
        console.log('[Valeria] Lead enviado correctamente por email');
      }).catch(function (err) {
        console.warn('[Valeria] Error al enviar lead por email:', err);
      });
    } else {
      console.log('[Valeria] Lead capturado (configurar EmailJS para env\u00edo autom\u00e1tico):');
      console.log(JSON.stringify(leadData, null, 2));
    }
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

    // Vibrar en mobile
    if (navigator.vibrate) {
      navigator.vibrate([100]);
    }
  }

  function setupTriggers() {
    // Trigger por tiempo
    setTimeout(function () {
      if (!state.hasTriggered && !state.isOpen) triggerProactive();
    }, CONFIG.triggerDelay);

    // Trigger por scroll a sección de servicios
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

    // Interceptar TODOS los CTAs del sitio (capture phase para ganarle al smooth scroll)
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
    // Bubble → open
    document.getElementById('vbot-bubble').addEventListener('click', openChat);

    // Preview → open
    document.getElementById('vbot-preview').addEventListener('click', function (e) {
      if (e.target.id !== 'vbot-preview-close') openChat();
    });

    // Preview close
    document.getElementById('vbot-preview-close').addEventListener('click', function (e) {
      e.stopPropagation();
      document.getElementById('vbot-preview').classList.remove('show');
      state.previewDismissed = true;
    });

    // Close button
    document.getElementById('vbot-close').addEventListener('click', closeChat);

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) closeChat();
    });
  }

  /* --------------------------------------------------------
     INIT
     -------------------------------------------------------- */
  function init() {
    injectHTML();
    bindEvents();
    setupTriggers();
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
