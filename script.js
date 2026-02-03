// playful behavior for NO button and yes animation
document.addEventListener('DOMContentLoaded', () => {
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const buttonsWrap = document.getElementById('buttons');
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('closeBtn');
  const heartsContainer = document.getElementById('hearts');

  // When YES is clicked: show overlay and spawn hearts
  yesBtn.addEventListener('click', () => {
    showOverlay();
    spawnHearts(24);
  });

  closeBtn.addEventListener('click', () => {
    hideOverlay();
  });

  // NO button dodges on hover (desktop) or touchstart (mobile)
  function dodgeNoButton(){
    const parentRect = buttonsWrap.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();

    // compute a random position within the parent area
    const padding = 6;
    const maxLeft = Math.max(0, parentRect.width - noRect.width - padding);
    const maxTop  = Math.max(0, parentRect.height - noRect.height - padding);

    // Try swapping positions with YES sometimes
    if (Math.random() < 0.36) {
      // swap positions visually by reversing flex order
      buttonsWrap.style.flexDirection = buttonsWrap.style.flexDirection === 'row-reverse' ? 'row' : 'row-reverse';
      return;
    }

    const left = Math.floor(Math.random() * (maxLeft + 1));
    const top  = Math.floor(Math.random() * (maxTop + 1));

    // Apply transform to move the NO button
    noBtn.style.transform = `translate(${left - (noRect.left - parentRect.left)}px, ${top - (noRect.top - parentRect.top)}px)`;
  }

  // Desktop: mouseenter, Mobile: touchstart
  noBtn.addEventListener('mouseenter', dodgeNoButton, {passive:true});
  noBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // prevent click
    dodgeNoButton();
  }, {passive:false});

  // If user somehow clicks NO, show a gentle message
  noBtn.addEventListener('click', () => {
    if (confirm("Bist du sicher? :)")) {
      alert("Oh, schade — vielleicht ein anderes Mal.");
    } else {
      // revert transforms to let them click YES
      resetNo();
    }
  });

  function resetNo(){
    noBtn.style.transform = '';
    buttonsWrap.style.flexDirection = 'row';
  }

  function showOverlay(){
    overlay.classList.remove('hidden');
    // prevent scrolling
    document.body.style.overflow = 'hidden';
  }

  function hideOverlay(){
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    // clear hearts
    heartsContainer.innerHTML = '';
  }

  // spawn simple floating hearts
  function spawnHearts(count = 20){
    for (let i=0;i<count;i++){
      const h = document.createElement('div');
      h.className = 'heartParticle';
      // random position from center
      const size = 12 + Math.random()*22;
      h.style.width = `${size}px`;
      h.style.height = `${size}px`;
      h.style.left = `${50 + (Math.random()-0.5)*60}%`;
      h.style.top = `${60 + Math.random()*20}%`;
      h.style.opacity = String(0.7 + Math.random()*0.3);
      heartsContainer.appendChild(h);

      // animate using CSS keyframes via inline style (duration vary)
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

      // remove after animation
      setTimeout(()=> h.remove(), duration + 60);
    }
  }

  // create CSS for heart particles
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

});