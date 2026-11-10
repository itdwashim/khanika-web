/* Khanika web app: lets the same app run in any browser (and as an installed app).
   - saves your data in this browser's IndexedDB (large, survives restarts) + a daily copy for 14 days
   - PDFs / Excel / backups are shared (phones) or downloaded (computers)
   - talks to your Google cloud-sync script with normal browser requests
   - works offline after the first visit (service worker) and can be installed to the home screen / desktop */
(function () {
  'use strict';
  if (window.desktop) return;                                              // Electron already provides it
  if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) return;   // Android app has its own

  var DBN = 'khanika-web', ST = 'kv', mem = {};
  var safe = function (k) { return String(k || 'main').replace(/[^A-Za-z0-9_-]/g, '') || 'main'; };
  var today = function () { return new Date().toISOString().slice(0, 10); };

  function idb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('IndexedDB is not available'));
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function tx(mode, fn) {
    return idb().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(ST, mode), out = fn(t.objectStore(ST));
        t.oncomplete = function () { res(out && 'result' in out ? out.result : out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  var get = function (k) { return tx('readonly', function (s) { return s.get(k); }).then(function (v) { return v == null ? null : v; }); };
  var put = function (k, v) { return tx('readwrite', function (s) { return s.put(v, k); }); };
  var del = function (k) { return tx('readwrite', function (s) { return s.delete(k); }); };
  var keys = function () { return tx('readonly', function (s) { return s.getAllKeys(); }); };

  async function prune(key) {
    try {
      if (localStorage.getItem('kh-bk-prune') === today()) return;
      localStorage.setItem('kh-bk-prune', today());
      var limit = Date.now() - 14 * 864e5, ks = await keys();
      for (var i = 0; i < ks.length; i++) {
        var m = String(ks[i]).match(/^bk:.*:(\d{4}-\d{2}-\d{2})$/);
        if (m && Date.parse(m[1]) < limit) await del(ks[i]);
      }
    } catch (e) {}
  }
  function download(name, buf, type) {
    var b = buf instanceof Blob ? buf : new Blob([buf], { type: type || 'application/octet-stream' });
    var a = document.createElement('a'), u = URL.createObjectURL(b);
    a.href = u; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
  }
  var mime = function (n) { n = String(n).toLowerCase(); return /\.pdf$/.test(n) ? 'application/pdf' : /\.xlsx$/.test(n) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : /\.json$/.test(n) ? 'application/json' : /\.csv$/.test(n) ? 'text/csv' : 'application/octet-stream'; };

  window.desktop = {
    web: true,
    sheet: true,   // PDFs go to the phone's share sheet when available, otherwise they download
    read: async function (k) {
      try { var v = await get('data:' + safe(k)); if (v != null) return v; } catch (e) {}
      return mem[safe(k)] || null;
    },
    write: async function (k, j) {
      mem[safe(k)] = j;
      await put('data:' + safe(k), j);
      try { await put('bk:' + safe(k) + ':' + today(), j); prune(); } catch (e) {}
      return true;
    },
    saveAs: async function (name, buf) { download(name, buf, mime(name)); return name; },
    sharePdf: async function (name, buf) {
      var f = new File([buf], name, { type: mime(name) });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return name; } }
      catch (e) { if (e && e.name === 'AbortError') return name; }
      download(name, f, mime(name)); return name;
    },
    openBackups: async function () {
      try {
        var ks = (await keys()).filter(function (k) { return /^bk:/.test(k); }).sort();
        if (!ks.length) return alert('No automatic backup has been made yet. It is made the first time you save.');
        var last = ks[ks.length - 1], d = String(last).slice(-10);
        if (confirm('Automatic daily backups are kept inside this browser for 14 days (' + ks.length + ' available).\n\nDownload the latest one (' + d + ') as a file?'))
          download('Khanika_backup_' + d + '.json', new Blob([await get(last)], { type: 'application/json' }));
      } catch (e) { alert('Could not read the automatic backups: ' + (e && e.message || e)); }
    },
    fetchText: async function (url) {
      if (!/^https?:\/\//i.test(url)) throw new Error('Only http and https addresses are allowed');
      var r;
      try { r = await fetch(url); } catch (e) { throw new Error('The browser is not allowed to read that website (a browser security rule). Copy the table from the page and paste it instead, or use the desktop or Android app.'); }
      if (!r.ok) throw new Error('The website answered with status ' + r.status);
      var t = await r.text();
      return t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<\/(td|th)>/gi, ' | ').replace(/<\/(tr|p|div|li|h[1-6]|table)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/[ \t]+/g, ' ').slice(0, 600000);
    },
    postJson: async function (url, body) {
      var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
      var t = await r.text();
      try { return JSON.parse(t); } catch (e) { throw new Error('The website returned an unexpected reply. Check the address, and that it is deployed for Anyone.'); }
    }
  };

  // ask the browser not to clear this app's data when space runs low
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  // offline support
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // "Install app" hint (Chrome / Edge / Android) and a how-to for iPhone / iPad
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  function banner(text, btn, fn) {
    if (standalone || sessionStorage.getItem('kh-inst')) return;
    var b = document.createElement('div');
    b.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:50;background:#0f4c5c;color:#fff;border-radius:14px;padding:10px 14px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;gap:10px;align-items:center;font:14px system-ui;max-width:92vw';
    b.innerHTML = '<span>' + text + '</span>' + (btn ? '<button style="border:0;border-radius:999px;padding:6px 14px;font-weight:700;background:#e0a458;color:#1d2b36;cursor:pointer">' + btn + '</button>' : '') + '<button aria-label="Close" style="border:0;background:none;color:#fff;font-size:18px;cursor:pointer">\u2715</button>';
    var bs = b.querySelectorAll('button');
    if (btn) bs[0].onclick = function () { fn(); b.remove(); };
    bs[bs.length - 1].onclick = function () { sessionStorage.setItem('kh-inst', '1'); b.remove(); };
    document.body.appendChild(b);
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    banner('Install Khanika on this device', 'Install', function () { e.prompt(); });
  });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone)
    window.addEventListener('load', function () { setTimeout(function () { banner('To install: tap Share, then "Add to Home Screen"'); }, 2500); });
})();
