(function () {
    if (window.location.pathname.startsWith('/admin')) return;

    var visitorId = localStorage.getItem('or-vid');
    if (!visitorId) {
        visitorId = 'v' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('or-vid', visitorId);
    }

    var page = window.location.pathname;
    var referrer = document.referrer;
    var params = new URLSearchParams(window.location.search);
    var startTime = Date.now();
    var durationSent = false;

    fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            visitorId: visitorId,
            page: page,
            referrer: referrer,
            utmSource: params.get('utm_source') || '',
            utmMedium: params.get('utm_medium') || ''
        })
    }).catch(function () {});

    function sendDuration() {
        if (durationSent) return;
        durationSent = true;
        var duration = Math.round((Date.now() - startTime) / 1000);
        if (duration < 1) return;
        var data = JSON.stringify({ visitorId: visitorId, page: page, duration: duration });
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics/duration', new Blob([data], { type: 'application/json' }));
        }
    }

    window.addEventListener('pagehide', sendDuration);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') sendDuration();
    });

    window.oneRootTrack = function (event, data) {
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId: visitorId, event: event, data: data || {} })
        }).catch(function () {});
    };
})();
