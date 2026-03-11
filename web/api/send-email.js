/* ============================================================
   INNOVA BLACK® — Lead Email API
   Vercel Serverless Function
   Sends confirmation email to lead + notification to team
   ============================================================ */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CAL_URL = process.env.CAL_URL || 'https://cal.com/innovablack';
const FROM_DOMAIN = process.env.FROM_DOMAIN || 'hello@innova.black';
const TEAM_EMAIL = process.env.TEAM_EMAIL || 'hello@innova.black';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  var body = req.body;
  if (!body || !body.email || !body.nombre) {
    return res.status(400).json({ error: 'Missing required fields: email, nombre' });
  }

  var leadName = body.nombre;
  var leadEmail = body.email;
  var leadPhone = body.telefono || 'No proporcionado';
  var temperatura = body.temperatura || 'tibio';
  var tipoInstitucion = body.tipo_institucion || '';
  var etapa = body.etapa || '';
  var dolorPrincipal = body.dolor_principal || '';
  var urgencia = body.urgencia || '';
  var agendaCalcom = body.agenda_calcom || false;
  var notas = body.notas || '';
  var asesora = body.asesora || 'Valeria';

  var tempEmoji = temperatura === 'caliente' ? '🔥' : temperatura === 'tibio' ? '🌤️' : '❄️';
  var fromEmail = asesora + ' de InnovaBlack <' + FROM_DOMAIN + '>';

  // --- Email 1: Confirmation to the lead ---
  var leadHtml = buildLeadEmail(leadName, agendaCalcom, asesora);

  // --- Email 2: Notification to team ---
  var teamHtml = buildTeamEmail({
    nombre: leadName,
    email: leadEmail,
    telefono: leadPhone,
    temperatura: temperatura,
    tempEmoji: tempEmoji,
    tipo_institucion: tipoInstitucion,
    etapa: etapa,
    dolor_principal: dolorPrincipal,
    urgencia: urgencia,
    agenda_calcom: agendaCalcom,
    notas: notas,
    asesora: asesora
  });

  try {
    // Send both emails in parallel
    var results = await Promise.allSettled([
      sendEmail({
        from: fromEmail,
        to: leadEmail,
        subject: '¡Gracias por tu interés! — ' + asesora + ', InnovaBlack®',
        html: leadHtml
      }),
      sendEmail({
        from: fromEmail,
        to: TEAM_EMAIL,
        subject: tempEmoji + ' Lead ' + temperatura.toUpperCase() + ' — ' + leadName + ' (atendido por ' + asesora + ')',
        html: teamHtml
      })
    ]);

    var leadResult = results[0];
    var teamResult = results[1];

    if (leadResult.status === 'rejected' && teamResult.status === 'rejected') {
      console.error('Both emails failed:', leadResult.reason, teamResult.reason);
      return res.status(500).json({ error: 'Failed to send emails' });
    }

    return res.status(200).json({
      success: true,
      leadEmail: leadResult.status === 'fulfilled' ? 'sent' : 'failed',
      teamEmail: teamResult.status === 'fulfilled' ? 'sent' : 'failed'
    });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

async function sendEmail(params) {
  var response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html
    })
  });

  if (!response.ok) {
    var errBody = await response.text();
    throw new Error('Resend API error ' + response.status + ': ' + errBody);
  }

  return response.json();
}

function buildLeadEmail(nombre, agendaCalcom, asesora) {
  var calButton = agendaCalcom
    ? '<a href="' + CAL_URL + '" style="display:inline-block;background:#C9A84C;color:#0D0D0D;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:16px;margin:20px 0;">Agendar mi diagnóstico gratuito</a>'
    : '';

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#0D0D0D;border-radius:12px;overflow:hidden;max-width:600px;">' +

    // Header
    '<tr><td style="background:#0D0D0D;padding:40px 40px 20px;text-align:center;">' +
    '<div style="font-size:28px;font-weight:800;color:#C9A84C;letter-spacing:2px;">INNOVA<span style="color:#ffffff;">BLACK</span><span style="color:#C9A84C;">®</span></div>' +
    '<div style="color:#888;font-size:12px;letter-spacing:3px;margin-top:4px;">MARKETING · BRANDING · DIGITAL</div>' +
    '</td></tr>' +

    // Body
    '<tr><td style="padding:30px 40px;color:#e0e0e0;font-size:15px;line-height:1.7;">' +
    '<p style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 15px;">¡Hola ' + nombre + '!</p>' +
    '<p style="margin:0 0 15px;">Soy <strong style="color:#C9A84C;">' + asesora + '</strong>, tu asesora en InnovaBlack. Recibí tu información y quiero que sepas que ya estamos trabajando en tu caso.</p>' +
    '<p style="margin:0 0 15px;">Nuestro equipo se pondrá en contacto contigo <strong style="color:#ffffff;">en las próximas 24 horas</strong> para platicar sobre cómo podemos ayudarte a alcanzar tus objetivos.</p>' +

    (agendaCalcom
      ? '<p style="margin:0 0 5px;">Si prefieres agendar directamente tu <strong style="color:#C9A84C;">diagnóstico gratuito</strong>, haz clic aquí:</p>' +
        '<div style="text-align:center;">' + calButton + '</div>'
      : '<p style="margin:0 0 15px;">Te contactaremos pronto para agendar tu <strong style="color:#C9A84C;">diagnóstico gratuito</strong>.</p>') +

    '<p style="margin:20px 0 0;color:#888;font-size:13px;">Mientras tanto, si tienes cualquier duda, puedes escribirnos a <a href="mailto:hello@innova.black" style="color:#C9A84C;">hello@innova.black</a></p>' +
    '</td></tr>' +

    // Footer
    '<tr><td style="background:#080808;padding:25px 40px;text-align:center;border-top:1px solid #1a1a1a;">' +
    '<div style="color:#C9A84C;font-weight:700;font-size:13px;letter-spacing:1px;">INNOVA BLACK®</div>' +
    '<div style="color:#666;font-size:11px;margin-top:6px;">Marketing estratégico para empresas que quieren crecer.</div>' +
    '<div style="margin-top:12px;">' +
    '<a href="https://innovablack.ai" style="color:#C9A84C;text-decoration:none;font-size:12px;">innovablack.ai</a>' +
    '<span style="color:#333;margin:0 8px;">|</span>' +
    '<a href="https://innova.black" style="color:#C9A84C;text-decoration:none;font-size:12px;">innova.black</a>' +
    '</div>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}

function buildTeamEmail(data) {
  var urgencyColor = data.urgencia === 'alta' ? '#ff4444' : data.urgencia === 'media' ? '#ffaa00' : '#44aa44';

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;border:1px solid #e0e0e0;">' +

    // Header
    '<tr><td style="background:#0D0D0D;padding:20px 30px;color:#C9A84C;font-size:18px;font-weight:700;">' +
    data.tempEmoji + ' Nuevo Lead ' + data.temperatura.toUpperCase() +
    '</td></tr>' +

    // Body
    '<tr><td style="padding:25px 30px;font-size:14px;line-height:1.8;color:#333;">' +
    '<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">' +
    row('Atendido por', data.asesora) +
    row('Nombre', data.nombre) +
    row('Email', '<a href="mailto:' + data.email + '">' + data.email + '</a>') +
    row('Teléfono', data.telefono) +
    row('Temperatura', data.tempEmoji + ' ' + data.temperatura) +
    row('Tipo institución', data.tipo_institucion) +
    row('Etapa', data.etapa) +
    row('Dolor principal', data.dolor_principal) +
    row('Urgencia', '<span style="color:' + urgencyColor + ';font-weight:700;">' + data.urgencia + '</span>') +
    row('Quiere agendar', data.agenda_calcom ? '✅ Sí' : '❌ No') +
    (data.notas ? row('Notas', data.notas) : '') +
    '</table>' +
    '</td></tr>' +

    // CTA
    '<tr><td style="padding:0 30px 25px;text-align:center;">' +
    '<a href="mailto:' + data.email + '?subject=Seguimiento InnovaBlack — ' + data.nombre + '" ' +
    'style="display:inline-block;background:#C9A84C;color:#0D0D0D;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:700;">Contactar a ' + data.nombre + '</a>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}

function row(label, value) {
  return '<tr>' +
    '<td style="border-bottom:1px solid #f0f0f0;color:#888;font-weight:600;width:140px;vertical-align:top;">' + label + '</td>' +
    '<td style="border-bottom:1px solid #f0f0f0;color:#333;">' + (value || '—') + '</td>' +
    '</tr>';
}
