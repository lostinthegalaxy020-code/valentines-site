document.addEventListener('DOMContentLoaded', () => {
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const buttonsWrap = document.getElementById('buttons');
  const overlay = document.getElementById('overlay');
  const heartsContainer = document.getElementById('hearts');

  let yesRect = null;
  let noRect = null;

  // settings
  const minMargin = 28; // px margin from viewport edges for NO
  const minGap = 18;    // minimal visual gap between YES and NO (px)
  const attempts = 60;  // number of tries to find a valid position
  const autoCloseMs = 8000; // overlay auto-close after this many ms (optional)

  // initial placement: YES inside buttons container, NO near the right side of the viewport
  function initPositions(){
    // ensure YES is absolutely placed inside the .buttons container
    yesBtn.style.position = 'absolute';
    noBtn.style.position = 'fixed'; // allow jumps across the whole viewport

    // measure YES after making it absolute
    const parentRect = buttonsWrap.getBoundingClientRect();
    yesBtn.style.left = `${Math.max(8, Math.floor(parentRect.width * 0.12))}px`;
    yesBtn.style.top = `${Math.max(8, Math.floor((parentRect.height - yesBtn.getBoundingClientRect().height)/2))}px`;

    // measure rects
    yesRect = yesBtn.getBoundingClientRect();
    noRect = noBtn.getBoundingClientRect();

    // place NO initially to the right of the card area (but within viewport margin)
    const initialLeft = Math.min(window.innerWidth - noRect.width - minMargin, Math.floor(window.innerWidth * 0.72));
    const initialTop  = Math.min(window.innerHeight - noRect.height - minMargin, Math.floor(yesRect.top + (yesRect.height - noRect.height)/2));
    noBtn.style.left = `${Math.max(minMargin, initialLeft)}px`;
    noBtn.style.top  = `${Math.max(minMargin, initialTop)}px`;

    // refresh rects
    yesRect = yesBtn.getBoundingClientRect();
    noRect = noBtn.getBoundingClientRect();
  }

  // helper to compute center distance
  function centerDistance(ax, ay, aw, ah, bx, by, bw, bh){
    const acx = ax + aw/2, acy = ay + ah/2;
    const bcx = bx + bw/2, bcy = by + bh/2;
    const dx = acx - bcx, dy = acy - bcy;
    return Math.sqrt(dx*dx + dy*dy);
  }

  // find a valid new position for NO across the viewport that keeps margin and distance to YES
  function findValidNoPosition(){
    yesRect = yesBtn.getBoundingClientRect();
    noRect = noBtn.getBoundingClientRect();

    const maxLeft = window.innerWidth - noRect.width - minMargin;
    const maxTop  = window.innerHeight - noRect.height - minMargin;
    const minLeft = minMargin;
    const minTop  = minMargin;

    // required minimal center distance to avoid overlapping YES
    const requiredDist = Math.max((yesRect.width + noRect.width)/2 + minGap, 140);

    // Try random positions across the viewport, prefer edges (bigger jumps)
    for (let i = 0; i < attempts; i++) {
      // bias to large jumps: choose either left or right half then random
      const leftZone = (Math.random() < 0.5) ? [minLeft, Math.max(minLeft, Math.floor(window.innerWidth*0.25))] : [Math.max(minLeft, Math.floor(window.innerWidth*0.6)), maxLeft];
      const left = Math.floor(leftZone[0] + Math.random() * Math.max(1, leftZone[1] - leftZone[0]));
      const top  = Math.floor(minTop + Math.random() * Math.max(1, maxTop - minTop));

      const dist = centerDistance(left, top, noRect.width, noRect.height, yesRect.left, yesRect.top, yesRect.width, yesRect.height);
      if (dist >= requiredDist) {
        return { left, top };
      }
    }

    // fallback to corners if random failed
    const fallbacks = [
      { left: minLeft, top: minTop },
      { left: maxLeft, top: minTop },
      { left: minLeft, top: maxTop },
      { left: maxLeft, top: maxTop },
    ];
    for (const p of fallbacks) {
      const dist = centerDistance(p.left, p.top, noRect.width, noRect.height, yesRect.left, yesRect.top, yesRect.width, yesRect.height);
      if (dist >= requiredDist) return p;
    }

    // last resort: keep current position
    return { left: parseInt(noBtn.style.left || minLeft, 10), top: parseInt(noBtn.style.top || minTop, 10) };
  }

  // perform move with animation (CSS transition handles it)
  function moveNoButton(){
    const target = findValidNoPosition();
    noBtn.style.left = `${target.left}px`;
    noBtn.style.top  = `${target.top}px`;
  }

  // events: hover, touchstart, click -> move
  noBtn.addEventListener('mouseenter', () => {
    moveNoButton();
  }, { passive: true });

  noBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // prevent immediate click
    moveNoButton();
  }, { passive: false });

  noBtn.addEventListener('click', (e) => {
    e.preventDefault();
    moveNoButton();
  });

  // YES: show overlay with cat and message; close overlay on any tap/click or after timeout
  let autoCloseTimer = null;
  yesBtn.addEventListener('click', () => {
    showOverlayWithCat();
    spawnHearts(28);
  });

  function showOverlayWithCat(){
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // auto-close after a bit (optional) and allow tap-to-close
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(hideOverlay, autoCloseMs);
  }

  // hide overlay on click anywhere
  overlay.addEventListener('click', () => {
    hideOverlay();
  });

  function hideOverlay(){
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    heartsContainer.innerHTML = '';
    clearTimeout(autoCloseTimer);
  }

  // hearts (same idea as before)
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
      const duration = 2200 + Math.random()*2000;
      h.animate([
        { transform: `translateY(0) scale(1) rotate(${Math.random()*40-20}deg)`, opacity: h.style.opacity },
        { transform: `translateY(-220px) scale(1.2) rotate(${Math.random()*80-40}deg)`, opacity: 0 }
      ], {
        duration: duration,
        easing: 'ease-out',
        iterations: 1,
        fill: 'forwards'
      });
      setTimeout(()=> h.remove(), duration + 60);
    }
  }

  // CSS for heart particles
  (function addHeartStyles(){
    const s = document.createElement('style');
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

  // initialize positions after fonts/layout are ready
  function readyInit(){
    initPositions();
  }

  // run initial setup
  readyInit();

  // on resize, recompute YES position (keeps YES inside card) and keep NO within viewport
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      initPositions();
      // ensure NO stays within new viewport bounds
      const maxLeft = Math.max(minMargin, window.innerWidth - noBtn.getBoundingClientRect().width - minMargin);
      const maxTop  = Math.max(minMargin, window.innerHeight - noBtn.getBoundingClientRect().height - minMargin);
      let left = parseInt(noBtn.style.left || minMargin, 10);
      let top  = parseInt(noBtn.style.top || minMargin, 10);
      left = Math.min(Math.max(left, minMargin), maxLeft);
      top  = Math.min(Math.max(top, minMargin), maxTop);
      noBtn.style.left = `${left}px`;
      noBtn.style.top  = `${top}px`;
    }, 120);
  });
});
