// script.js
// - Behält das funktionierende Katzenbild (deine URL + SVG-Fallback)
// - Setzt das NO/YES-Verhalten zurück auf die vorherige, robuste Logik:
//   * YES bleibt absolut im .buttons-Container
//   * NO springt groß über den Viewport (fixed), bleibt innerhalb Rand (minMargin)
//   * NO vermeidet Überlappung mit YES (kein "hineingespawne")
//   * NO macht weiterhin große Sprünge auch nach erstem Klick
//
// Ersetze nur diese Datei in deinem Projekt.

document.addEventListener('DOMContentLoaded', () => {
  const yesBtn = document.getElementById('yesBtn');
  const noBtn  = document.getElementById('noBtn');
  const buttonsWrap = document.getElementById('buttons');
  const overlay = document.getElementById('overlay');
  const heartsContainer = document.getElementById('hearts');

  // ---------------- image handling ----------------
  // deine gewünschte Bild-URL
  const externalCatUrl = 'https://stickerly.pstatic.net/sticker_pack/pghXv7RCIbFWDO44zEHOA/1VLG3W/17/-468699096.png';

  // kleines SVG-Fallback (sicher geladen)
  const catSVG = `
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 420'>
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ffd7ea"/><stop offset="1" stop-color="#ffb3d6"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g transform="translate(80,40)" stroke="#ab2a6a" stroke-width="4" fill="#fff">
      <ellipse cx="220" cy="210" rx="110" ry="110" fill="#fff"/>
      <path d="M150 80 C170 10, 90 10, 120 80 Z" fill="#fff"/>
      <path d="M290 80 C310 10, 370 10, 340 80 Z" fill="#fff"/>
      <circle cx="190" cy="200" r="10" fill="#333"/>
      <circle cx="250" cy="200" r="10" fill="#333"/>
      <path d="M210 235 Q230 255 250 235" stroke="#e85c9b" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M170 260 Q220 310 270 260" fill="#ffd6e8" stroke="none" opacity="0.9"/>
    </g>
    <text x="50%" y="95%" font-family="Helvetica, Arial, sans-serif" font-size="24" text-anchor="middle" fill="#6b2a57">Du machst mich so glücklich! 🥰</text>
  </svg>`.trim();

  function setCatFallbackTo(imgEl) {
    try {
      imgEl.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(catSVG);
    } catch {
      imgEl.removeAttribute('src');
    }
  }

  // Setze / erzwinge das Bild auf alle Kandidaten (id catImg oder .cat-img).
  function enforceCatImage() {
    const imgs = [];
    const byId = document.getElementById('catImg');
    if (byId) imgs.push(byId);
    document.querySelectorAll('.cat-img').forEach(n => { if (!imgs.includes(n)) imgs.push(n); });

    if (imgs.length === 0) {
      // Falls kein img existiert, lege eines an
      const oc = overlay.querySelector('.overlay-content') || overlay;
      const el = document.createElement('img');
      el.id = 'catImg';
      el.className = 'cat-img';
      el.alt = 'Süßes Kätzchen';
      oc.insertBefore(el, oc.firstChild);
      imgs.push(el);
    }

    imgs.forEach(imgEl => {
      // entferne mögliche lazy-attrs
      imgEl.removeAttribute('srcset');
      imgEl.removeAttribute('data-src');

      // cache-buster für frisches Laden
      const url = externalCatUrl + (externalCatUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();

      let loaded = false;
      imgEl.addEventListener('load', () => { loaded = true; imgEl.style.opacity = '1'; }, { once: true });
      imgEl.addEventListener('error', () => { if (!loaded) setCatFallbackTo(imgEl); }, { once: true });

      // setze src zuletzt
      imgEl.src = url;

      // nach kurzer Zeit Fallback, falls Bild noch nicht geladen
      setTimeout(() => {
        if (imgEl.naturalWidth === 0) setCatFallbackTo(imgEl);
      }, 1000);
    });
  }

  // ---------------- NO / YES button behavior ----------------
  // Einstellungen
  const minMargin = 28;   // px Abstand von NO zum Viewport-Rand
  const minGap = 20;      // Mindestabstand zum YES-Button
  const attempts = 80;    // Versuchanzahl
  const minJump = 140;    // gewünschte Mindestdistanz zu vorheriger NO-Position

  let lastNoPos = null;

  // Stelle YES absolut in buttons container und NO fixed so, dass Sprünge zuverlässig sind.
  function initPositions() {
    // YES innerhalb buttonsWrap
    yesBtn.style.position = 'absolute';
    yesBtn.style.left = '';
    yesBtn.style.top = '';
    const parentRect = buttonsWrap.getBoundingClientRect();
    // vertikal zentriert im container, links leicht eingerückt
    const yesSize = yesBtn.getBoundingClientRect();
    const yesLeft = Math.max(8, Math.floor(parentRect.width * 0.12));
    const yesTop = Math.max(8, Math.floor((parentRect.height - yesSize.height) / 2));
    yesBtn.style.left = `${yesLeft}px`;
    yesBtn.style.top = `${yesTop}px`;

    // NO als fixed (kann über kompletten Bildschirm springen)
    noBtn.style.position = 'fixed';
    // initial rechts vom Card-Bereich, innerhalb margin
    const nr = noBtn.getBoundingClientRect();
    const initLeft = Math.min(window.innerWidth - nr.width - minMargin, Math.floor(window.innerWidth * 0.72));
    const initTop = Math.min(window.innerHeight - nr.height - minMargin, Math.floor((parentRect.top + parentRect.bottom)/2 - nr.height/2));
    const left = Math.max(minMargin, initLeft);
    const top = Math.max(minMargin, initTop);
    noBtn.style.left = `${left}px`;
    noBtn.style.top = `${top}px`;
    lastNoPos = { left, top };
  }

  // rechteck-Überlappungs-Check (candidate in viewport coords)
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Distanz zwischen Mittelpunkten
  function centerDist(ax, ay, aw, ah, bx, by, bw, bh) {
    const acx = ax + aw/2, acy = ay + ah/2;
    const bcx = bx + bw/2, bcy = by + bh/2;
    const dx = acx - bcx, dy = acy - bcy;
    return Math.sqrt(dx*dx + dy*dy);
  }

  // Bestimme valide Position für NO (viewport coords)
  function findValidNoPosition() {
    const yesRect = yesBtn.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();

    const maxLeft = window.innerWidth - noRect.width - minMargin;
    const maxTop  = window.innerHeight - noRect.height - minMargin;
    const minLeft = minMargin;
    const minTop  = minMargin;

    const requiredDist = Math.max((yesRect.width + noRect.width) / 2 + minGap, 120);

    // Priorisiere gegenüberliegende Seite (große Sprünge)
    const yesCenterX = yesRect.left + yesRect.width / 2;
    const preferRight = yesCenterX < window.innerWidth / 2;

    let bestCandidate = null;
    let bestScore = -Infinity;

    for (let i = 0; i < attempts; i++) {
      // Bias: links / rechts Zonen so, dass Sprünge groß sind
      const zonePick = Math.random();
      let left;
      if (zonePick < 0.45) {
        left = Math.floor(minLeft + Math.random() * Math.max(1, Math.floor(window.innerWidth * 0.28) - minLeft));
      } else if (zonePick < 0.9) {
        left = Math.floor(Math.max(minLeft, Math.floor(window.innerWidth * 0.68)) + Math.random() * Math.max(1, maxLeft - Math.floor(window.innerWidth * 0.68)));
      } else {
        left = Math.floor(minLeft + Math.random() * Math.max(1, maxLeft - minLeft));
      }
      const top = Math.floor(minTop + Math.random() * Math.max(1, maxTop - minTop));

      // clamp just in case
      const clampedLeft = Math.min(Math.max(left, minLeft), maxLeft);
      const clampedTop = Math.min(Math.max(top, minTop), maxTop);

      // keine Überlappung mit YES
      if (rectsOverlap(clampedLeft, clampedTop, noRect.width, noRect.height, yesRect.left, yesRect.top, yesRect.width, yesRect.height)) {
        continue;
      }

      const distToYes = centerDist(clampedLeft, clampedTop, noRect.width, noRect.height, yesRect.left, yesRect.top, yesRect.width, yesRect.height);

      // Distanz zum letzten NO-Standort
      let distToLastNo = Infinity;
      if (lastNoPos) {
        const dx = (clampedLeft + noRect.width/2) - (lastNoPos.left + noRect.width/2);
        const dy = (clampedTop + noRect.height/2) - (lastNoPos.top + noRect.height/2);
        distToLastNo = Math.sqrt(dx*dx + dy*dy);
      }

      // Score: entferne Kandidaten, die zu nah an YES sind; belohne große Sprünge und bevorzugte Seite
      let score = distToYes + 0.6 * (distToLastNo === Infinity ? 0 : distToLastNo);
      const candidateOnRight = (clampedLeft + noRect.width / 2) > window.innerWidth / 2;
      if ((preferRight && candidateOnRight) || (!preferRight && !candidateOnRight)) score += 40;

      // Akzeptiere wenn Abstand zu YES >= requiredDist und Abstand zu letztem NO >= minJump (wenn lastNoPos vorhanden)
      if (distToYes >= requiredDist && (distToLastNo >= minJump || !lastNoPos)) {
        return { left: clampedLeft, top: clampedTop };
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = { left: clampedLeft, top: clampedTop, distToYes, distToLastNo };
      }
    }

    // Ecken-Fallbacks (prüfe ob sie nicht überlappen)
    const corners = [
      { left: minLeft, top: minTop },
      { left: maxLeft, top: minTop },
      { left: minLeft, top: maxTop },
      { left: maxLeft, top: maxTop },
    ];
    for (const c of corners) {
      if (!rectsOverlap(c.left, c.top, noBtn.getBoundingClientRect().width, noBtn.getBoundingClientRect().height, yesRect.left, yesRect.top, yesRect.width, yesRect.height)) {
        return c;
      }
    }

    // Wenn nichts besseres, wähle besten Kandidaten, sorge aber dafür, dass er nicht überlappt –
    if (bestCandidate) {
      // falls bestCandidate zufällig doch overlappen würde (sehr selten), verschiebe es minimal
      let L = Math.min(Math.max(bestCandidate.left, minLeft), maxLeft);
      let T = Math.min(Math.max(bestCandidate.top, minTop), maxTop);
      if (rectsOverlap(L, T, noBtn.getBoundingClientRect().width, noBtn.getBoundingClientRect().height, yesRect.left, yesRect.top, yesRect.width, yesRect.height)) {
        // verschiebe entlang x-Achse zur Seite
        if (L + noBtn.getBoundingClientRect().width/2 < yesRect.left + yesRect.width/2) {
          L = Math.max(minLeft, yesRect.left - noBtn.getBoundingClientRect().width - minGap);
        } else {
          L = Math.min(maxLeft, yesRect.right + minGap);
        }
      }
      // ensure still in bounds
      L = Math.min(Math.max(L, minLeft), maxLeft);
      T = Math.min(Math.max(T, minTop), maxTop);
      return { left: L, top: T };
    }

    // letzte Rettung: kleine, aber garantierte Bewegung innerhalb Bildschirm
    const curLeft = parseInt(noBtn.style.left || minMargin, 10) || minMargin;
    const curTop = parseInt(noBtn.style.top || minMargin, 10) || minMargin;
    const newLeft = Math.min(Math.max(curLeft + (Math.random() < 0.5 ? -minJump/2 : minJump/2), minLeft), window.innerWidth - noBtn.getBoundingClientRect().width - minMargin);
    const newTop  = Math.min(Math.max(curTop + (Math.random() < 0.5 ? -minJump/3 : minJump/3), minTop), window.innerHeight - noBtn.getBoundingClientRect().height - minMargin);
    // ensure final pos does not overlap YES; if it does, nudge it along x
    if (rectsOverlap(newLeft, newTop, noBtn.getBoundingClientRect().width, noBtn.getBoundingClientRect().height, yesRect.left, yesRect.top, yesRect.width, yesRect.height)) {
      const altLeft = newLeft < yesRect.left ? Math.max(minLeft, yesRect.left - noBtn.getBoundingClientRect().width - minGap) : Math.min(maxLeft, yesRect.right + minGap);
      return { left: altLeft, top: newTop };
    }
    return { left: newLeft, top: newTop };
  }

  function moveNoButton() {
    const target = findValidNoPosition();
    // set pixel values (fixed positioning)
    noBtn.style.left = `${Math.round(target.left)}px`;
    noBtn.style.top  = `${Math.round(target.top)}px`;
    lastNoPos = { left: Math.round(target.left), top: Math.round(target.top) };
  }

  // Events (wie vorher)
  noBtn.addEventListener('mouseenter', () => moveNoButton(), { passive: true });
  noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveNoButton(); }, { passive: false });
  noBtn.addEventListener('click', (e) => { e.preventDefault(); moveNoButton(); });

  // YES -> overlay mit katzenbild + herzpartikel; overlay schließt bei tap oder nach timeout
  let autoClose = null;
  yesBtn.addEventListener('click', () => {
    enforceCatImage();
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    spawnHearts(26);
    clearTimeout(autoClose);
    autoClose = setTimeout(() => {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
      heartsContainer.innerHTML = '';
    }, 8000);
  });

  overlay.addEventListener('click', () => {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    heartsContainer.innerHTML = '';
    clearTimeout(autoClose);
  });

  // Herzpartikel
  function spawnHearts(n = 20) {
    for (let i = 0; i < n; i++) {
      const h = document.createElement('div');
      h.className = 'heartParticle';
      const size = 12 + Math.random() * 22;
      h.style.width = `${size}px`;
      h.style.height = `${size}px`;
      h.style.left = `${50 + (Math.random() - 0.5) * 60}%`;
      h.style.top = `${60 + Math.random() * 20}%`;
      h.style.opacity = String(0.7 + Math.random() * 0.3);
      heartsContainer.appendChild(h);
      const duration = 1600 + Math.random() * 2400;
      h.animate([
        { transform: `translateY(0) scale(1) rotate(${Math.random()*40-20}deg)`, opacity: h.style.opacity },
        { transform: `translateY(-220px) scale(1.15) rotate(${Math.random()*80-40}deg)`, opacity: 0 }
      ], {
        duration,
        easing: 'cubic-bezier(.2,.9,.3,1)',
        iterations: 1,
        fill: 'forwards'
      });
      setTimeout(() => h.remove(), duration + 80);
    }
  }

  // kleine Heart-CSS falls nicht vorhanden
  (function addHeartStyles(){
    if (document.getElementById('__heartStyles')) return;
    const s = document.createElement('style');
    s.id = '__heartStyles';
    s.textContent = `
      .heartParticle{
        position:absolute;
        pointer-events:none;
        background: radial-gradient(circle at 30% 30%, #fff 0%, rgba(255,255,255,0) 40%), linear-gradient(180deg, #ff7abf 0%, #ff2a8a 100%);
        filter: drop-shadow(0 6px 14px rgba(230,77,130,0.14));
        border-radius:6px;
      }`;
    document.head.appendChild(s);
  })();

  // initial setup
  enforceCatImage();
  initPositions();

  // resize: stell sicher, dass NO im viewport bleibt und YES neu positioniert
  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      initPositions();
      // clamp NO
      const nr = noBtn.getBoundingClientRect();
      const maxLeft = Math.max(minMargin, window.innerWidth - nr.width - minMargin);
      const maxTop  = Math.max(minMargin, window.innerHeight - nr.height - minMargin);
      let left = parseInt(noBtn.style.left || minMargin, 10);
      let top  = parseInt(noBtn.style.top || minMargin, 10);
      left = Math.min(Math.max(left, minMargin), maxLeft);
      top  = Math.min(Math.max(top, minMargin), maxTop);
      noBtn.style.left = `${left}px`;
      noBtn.style.top  = `${top}px`;
      lastNoPos = { left, top };
    }, 120);
  });
});
