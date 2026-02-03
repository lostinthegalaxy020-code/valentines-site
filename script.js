// script.js — Erzwinge das gewünschte Katzenbild, robustes Fallback, NO-Button-Sprünge wie zuvor.
// Diese Datei ersetzt die vorherige script.js; lade/ersetze nur diese Datei.

document.addEventListener('DOMContentLoaded', () => {
  const yesBtn = document.getElementById('yesBtn');
  const noBtn  = document.getElementById('noBtn');
  const buttonsWrap = document.getElementById('buttons');
  const overlay = document.getElementById('overlay');
  const heartsContainer = document.getElementById('hearts');

  // -------------------------------------------------------
  // Bildquelle (deine gewünschte URL)
  // -------------------------------------------------------
  const externalCatUrl = 'https://stickerly.pstatic.net/sticker_pack/pghXv7RCIbFWDO44zEHOA/1VLG3W/17/-468699096.png';

  // eingebettetes SVG-Fallback (falls externes Bild nicht lädt)
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

  function setCatFallbackToElement(imgEl) {
    try {
      const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(catSVG);
      imgEl.src = dataUrl;
    } catch (e) {
      // fallback: leeres Bild (sehr unwahrscheinlich)
      imgEl.removeAttribute('src');
    }
  }

  // Force-replace ALL images that should show the cat (class "cat-img" oder id "catImg")
  function enforceCatImage() {
    // Suche nach allen Kandidaten (ID oder Klasse)
    const candidates = [];
    const byId = document.getElementById('catImg');
    if (byId) candidates.push(byId);
    document.querySelectorAll('.cat-img').forEach(n => { if (!candidates.includes(n)) candidates.push(n); });

    // Falls es keine <img> Elemente gibt, erstelle eins im overlay-content
    if (candidates.length === 0) {
      const overlayContent = overlay.querySelector('.overlay-content') || overlay;
      const img = document.createElement('img');
      img.id = 'catImg';
      img.className = 'cat-img';
      img.alt = 'Süßes Kätzchen';
      overlayContent.insertBefore(img, overlayContent.firstChild);
      candidates.push(img);
    }

    // Setze bei jedem Kandidaten die gewünschte URL (Cache-Buster anhängen)
    candidates.forEach(imgEl => {
      // Entferne srcset/data-src um sicherzugehen
      imgEl.removeAttribute('srcset');
      imgEl.removeAttribute('data-src');

      // Hänge Cache-Buster an, damit der Browser neue Anfrage macht
      const cbUrl = externalCatUrl + (externalCatUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();

      // Setze Event-Handler: falls Laden fehlschlägt, setze Fallback
      let handled = false;
      const onLoad = () => {
        handled = true;
        // optional: kleine CSS-Anpassung, falls nötig
        imgEl.style.opacity = '1';
      };
      const onError = () => {
        if (!handled) setCatFallbackToElement(imgEl);
      };

      imgEl.addEventListener('load', onLoad, { once: true });
      imgEl.addEventListener('error', onError, { once: true });

      // Setze src zuletzt, so dass Handler greifen
      imgEl.src = cbUrl;

      // Falls das Bild durch CSP/CORS blockiert oder bereits geladen ist, prüfen wir nach kurzer Zeit
      setTimeout(() => {
        // Wenn das Bild noch nicht geladen (naturalWidth 0), setze Fallback
        if (imgEl.naturalWidth === 0) setCatFallbackToElement(imgEl);
      }, 1200);
    });
  }

  // ----------------------------
  // NO-Button Bewegung (wie zuvor)
  // ----------------------------
  const minMargin = 28;
  const minGap = 20;
  const attempts = 80;
  const minJump = 160;
  let lastNoPos = null;

  function centerDistance(ax, ay, aw, ah, bx, by, bw, bh){
    const acx = ax + aw/2, acy = ay + ah/2;
    const bcx = bx + bw/2, bcy = by + bh/2;
    const dx = acx - bcx, dy = acy - bcy;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function findValidNoPosition() {
    const yesRect = yesBtn.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();

    const maxLeft = window.innerWidth - noRect.width - minMargin;
    const maxTop  = window.innerHeight - noRect.height - minMargin;
    const minLeft = minMargin;
    const minTop  = minMargin;

    const requiredDist = Math.max((yesRect.width + noRect.width)/2 + minGap, 140);
    const yesCenterX = yesRect.left + yesRect.width / 2;
    const preferRight = yesCenterX < window.innerWidth / 2;

    let bestCandidate = null, bestScore = -Infinity;
    for (let i=0;i<attempts;i++){
      const zoneChoice = Math.random();
      let left;
      if (zoneChoice < 0.46) {
        left = Math.floor(minLeft + Math.random() * Math.max(1, Math.floor(window.innerWidth * 0.32) - minLeft));
      } else if (zoneChoice < 0.92) {
        left = Math.floor(Math.max(minLeft, Math.floor(window.innerWidth * 0.68)) + Math.random() * Math.max(1, maxLeft - Math.floor(window.innerWidth * 0.68)));
      } else {
        left = Math.floor(minLeft + Math.random() * Math.max(1, maxLeft - minLeft));
      }
      const top = Math.floor(minTop + Math.random() * Math.max(1, maxTop - minTop));
      const distToYes = centerDistance(left, top, noRect.width, noRect.height, yesRect.left, yesRect.top, yesRect.width, yesRect.height);

      let distToLastNo = Infinity;
      if (lastNoPos) {
        const dx = (left + noRect.width/2) - (lastNoPos.left + noRect.width/2);
        const dy = (top + noRect.height/2) - (lastNoPos.top + noRect.height/2);
        distToLastNo = Math.sqrt(dx*dx + dy*dy);
      }
      let score = distToYes + 0.6 * distToLastNo;
      const candidateOnRight = (left + noRect.width/2) > window.innerWidth / 2;
      if ((preferRight && candidateOnRight) || (!preferRight && !candidateOnRight)) score += 50;

      if (distToYes >= requiredDist && (distToLastNo >= minJump || !lastNoPos)) {
        return { left: Math.min(Math.max(left, minLeft), maxLeft), top: Math.min(Math.max(top, minTop), maxTop) };
      }
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = { left, top };
      }
    }

    // corners fallback
    const corners = [
      { left: minLeft, top: minTop },
      { left: maxLeft, top: minTop },
      { left: minLeft, top: maxTop },
      { left: maxLeft, top: maxTop },
    ];
    for (const p of corners) {
      const d = centerDistance(p.left, p.top, noBtn.getBoundingClientRect().width, noBtn.getBoundingClientRect().height, yesBtn.getBoundingClientRect().left, yesBtn.getBoundingClientRect().top, yesBtn.getBoundingClientRect().width, yesBtn.getBoundingClientRect().height);
      if (d >= requiredDist) return p;
    }

    if (bestCandidate) return bestCandidate;

    // last resort small move
    const curLeft = parseInt(noBtn.style.left || minLeft, 10) || minLeft;
    const curTop  = parseInt(noBtn.style.top || minTop, 10) || minTop;
    const newLeft = Math.min(Math.max(curLeft + (Math.random() < 0.5 ? -minJump/2 : minJump/2), minLeft), window.innerWidth - noBtn.getBoundingClientRect().width - minMargin);
    const newTop  = Math.min(Math.max(curTop + (Math.random() < 0.5 ? -minJump/3 : minJump/3), minTop), window.innerHeight - noBtn.getBoundingClientRect().height - minMargin);
    return { left: newLeft, top: newTop };
  }

  function moveNoButton(){
    const target = findValidNoPosition();
    noBtn.style.left = `${target.left}px`;
    noBtn.style.top  = `${target.top}px`;
    lastNoPos = { left: target.left, top: target.top };
  }

  // Events für NO
  noBtn.addEventListener('mouseenter', () => moveNoButton(), { passive: true });
  noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveNoButton(); }, { passive: false });
  noBtn.addEventListener('click', (e) => { e.preventDefault(); moveNoButton(); });

  // YES -> Overlay + Erzwinge Katzenbild, Herzanimation
  let autoCloseTimer = null;
  yesBtn.addEventListener('click', () => {
    enforceCatImage();
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    spawnHearts(28);
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(() => { overlay.classList.add('hidden'); document.body.style.overflow = ''; heartsContainer.innerHTML = ''; }, 8000);
  });

  // Overlay schließt bei Klick
  overlay.addEventListener('click', () => {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    heartsContainer.innerHTML = '';
    clearTimeout(autoCloseTimer);
  });

  // Herzpartikel
  function spawnHearts(count = 20){
    for (let i=0;i<count;i++){
      const h = document.createElement('div');
      h.className = 'heartParticle';
      const size = 12 + Math.random()*22;
      h.style.width = `${size}px`;
      h.style.height = `${size}px`;
      h.style.left = `${50 + (Math.random()-0.5)*60}%`;
      h.style.top = `${60 + Math.random()*20}%`;
      h.style.opacity = String(0.7 + Math.random()*0.3);
      heartsContainer.appendChild(h);
      const duration = 1800 + Math.random()*2400;
      h.animate([
        { transform: `translateY(0) scale(1) rotate(${Math.random()*40-20}deg)`, opacity: h.style.opacity },
        { transform: `translateY(-240px) scale(1.2) rotate(${Math.random()*80-40}deg)`, opacity: 0 }
      ], {
        duration: duration,
        easing: 'cubic-bezier(.2,.9,.3,1)',
        iterations: 1,
        fill: 'forwards'
      });
      setTimeout(()=> h.remove(), duration + 60);
    }
  }

  // Herz-Styles (falls noch nicht vorhanden)
  (function addHeartStyles(){
    if (document.getElementById('__heartStyles')) return;
    const s = document.createElement('style');
    s.id = '__heartStyles';
    s.textContent = `
    .heartParticle{
      position:absolute;
      pointer-events:none;
      background: radial-gradient(circle at 30% 30%, #fff 0%, rgba(255,255,255,0) 40%), linear-gradient(180deg, #ff7abf 0%, #ff2a8a 100%);
      transform-origin:center center;
      clip-path: path('M12 2c-1.7 0-3.2.9-4 2.3C6.2 2.9 4.7 2 3 2 0 2-1 6 1.2 8.8 5.2 13.4 12 18 12 18s6.8-4.6 10.8-9.2C25 6 24 2 21 2c-1.7 0-3.2.9-4 2.3C15.2 2.9 13.7 2 12 2z');
      filter: drop-shadow(0 6px 14px rgba(230,77,130,0.14));
      border-radius: 6px;
    }`;
    document.head.appendChild(s);
  })();

  // Initialisierung: setze Bild bereits jetzt (so dass Overlay sofort das gewünschte Bild zeigt)
  enforceCatImage();

  // Auf Resize: stelle sicher, dass NO innerhalb des Viewports bleibt
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // NO in Grenzen halten
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
