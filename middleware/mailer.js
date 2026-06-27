const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
        console.warn('[mailer] SMTP_USER / SMTP_PASS no configurados — emails desactivados');
        return null;
    }
    _transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
    return _transporter;
}

async function sendOrderConfirmation({ orderId, customerName, customerEmail, customerPhone, customerAddress, customerCity, customerBarrio, items, total }) {
    const transporter = getTransporter();
    if (!transporter || !customerEmail) return;

    const itemRows = items.map(i =>
        `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.name}${i.size ? ` — ${i.size}` : ''}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">$${(i.price * i.quantity).toLocaleString('es-CO')}</td>
        </tr>`
    ).join('');

    const isBogota = /bogot[aá]/i.test(customerCity || '');
    const shippingNote = isBogota
        ? '<p style="color:#16a34a;font-weight:600">✓ Envío GRATIS en Bogotá</p>'
        : '<p style="color:#92400e">El costo de envío nacional se te informará al confirmar el pedido.</p>';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#000;padding:32px 40px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:4px;font-weight:300">ONE ROOT</h1>
      <p style="color:#aaa;margin:8px 0 0;font-size:12px;letter-spacing:2px">STREETWEAR MINIMALISTA</p>
    </div>
    <div style="padding:40px">
      <h2 style="margin:0 0 8px;font-size:20px">¡Pedido recibido!</h2>
      <p style="color:#555;margin:0 0 24px">Hola <strong>${customerName}</strong>, confirmamos tu pedido. Nos pondremos en contacto contigo pronto.</p>

      <div style="background:#f9f9f9;border-radius:6px;padding:16px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:1px">NÚMERO DE PEDIDO</p>
        <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:2px">${orderId}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr style="background:#f0f0f0">
            <th style="padding:8px 12px;text-align:left;font-size:12px;letter-spacing:1px">PRODUCTO</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;letter-spacing:1px">CANT.</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;letter-spacing:1px">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px 12px 0;font-weight:700;text-align:right">TOTAL</td>
            <td style="padding:12px 12px 0;font-weight:700;text-align:right">$${total.toLocaleString('es-CO')}</td>
          </tr>
        </tfoot>
      </table>

      ${shippingNote}

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">

      <h3 style="margin:0 0 12px;font-size:14px;letter-spacing:1px;color:#888">DATOS DE ENTREGA</h3>
      <p style="margin:0 0 4px"><strong>Dirección:</strong> ${customerAddress}</p>
      <p style="margin:0 0 4px"><strong>Barrio:</strong> ${customerBarrio || '—'}</p>
      <p style="margin:0 0 4px"><strong>Ciudad:</strong> ${customerCity}</p>
      <p style="margin:0 0 4px"><strong>Teléfono:</strong> ${customerPhone}</p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:13px;color:#888;margin:0">¿Preguntas? Escríbenos a <a href="mailto:onerootmoda@gmail.com" style="color:#000">onerootmoda@gmail.com</a></p>
    </div>
    <div style="background:#f0f0f0;padding:16px 40px;text-align:center">
      <p style="margin:0;font-size:11px;color:#aaa">ONE ROOT CO · Bogotá, Colombia</p>
    </div>
  </div>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"ONE ROOT" <${process.env.SMTP_USER}>`,
            to: customerEmail,
            subject: `Pedido ${orderId} recibido — ONE ROOT`,
            html
        });
        console.log(`[mailer] Confirmación enviada a ${customerEmail} para ${orderId}`);
    } catch (e) {
        console.error('[mailer] Error enviando email:', e.message);
    }
}

async function sendAdminOrderAlert({ orderId, customerName, customerPhone, customerCity, items, total }) {
    const transporter = getTransporter();
    const adminEmail  = process.env.ADMIN_EMAIL;
    if (!transporter || !adminEmail) return;

    const itemList = items.map(i => `${i.name} (${i.size}) ×${i.quantity}`).join(', ');

    try {
        await transporter.sendMail({
            from: `"ONE ROOT Sistema" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `🛒 Nuevo pedido ${orderId} — $${total.toLocaleString('es-CO')}`,
            html: `
<div style="font-family:monospace;padding:24px;background:#f9f9f9">
  <h2 style="margin:0 0 16px">NUEVO PEDIDO — ${orderId}</h2>
  <table style="border-collapse:collapse;width:100%">
    <tr><td style="padding:4px 8px;font-weight:bold">Cliente</td><td style="padding:4px 8px">${customerName}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold">Teléfono</td><td style="padding:4px 8px">${customerPhone}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold">Ciudad</td><td style="padding:4px 8px">${customerCity}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold">Productos</td><td style="padding:4px 8px">${itemList}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold">Total</td><td style="padding:4px 8px;font-size:18px">$${total.toLocaleString('es-CO')}</td></tr>
  </table>
  <p style="margin-top:16px"><a href="http://localhost:3000/admin/orders" style="background:#000;color:#fff;padding:8px 16px;text-decoration:none">VER EN PANEL ADMIN</a></p>
</div>`
        });
    } catch (e) {
        console.error('[mailer] Error enviando alerta admin:', e.message);
    }
}

module.exports = { sendOrderConfirmation, sendAdminOrderAlert };
