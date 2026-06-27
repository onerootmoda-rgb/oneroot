(function () {
    if (localStorage.getItem('one-root-cookies-ok')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.style.cssText = [
        'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:9999',
        'background:#000', 'color:#fff', 'padding:16px 24px',
        'display:flex', 'align-items:center', 'justify-content:space-between',
        'gap:16px', 'flex-wrap:wrap',
        'font-family:"JetBrains Mono",monospace', 'font-size:11px',
        'letter-spacing:0.05em', 'border-top:1px solid rgba(255,255,255,0.15)'
    ].join(';');

    banner.innerHTML = `
        <span style="max-width:680px;line-height:1.6;opacity:0.85">
            Usamos almacenamiento local para mantener tu carrito, preferencias y estadísticas anónimas de visita.
            Al continuar navegando aceptas nuestra
            <a href="/privacidad" style="color:#fff;text-decoration:underline">Política de Privacidad</a>.
        </span>
        <button id="cookie-accept" style="
            background:#fff;color:#000;border:none;cursor:pointer;
            padding:8px 20px;font-family:inherit;font-size:11px;
            letter-spacing:0.1em;white-space:nowrap;flex-shrink:0;
            font-weight:600
        ">ACEPTAR</button>
    `;

    document.body.appendChild(banner);

    document.getElementById('cookie-accept').addEventListener('click', function () {
        localStorage.setItem('one-root-cookies-ok', '1');
        banner.style.transition = 'opacity 0.3s';
        banner.style.opacity = '0';
        setTimeout(function () { banner.remove(); }, 300);
    });
})();
