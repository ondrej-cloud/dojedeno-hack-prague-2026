/* 10b · rizika: najetí nebo klepnutí na bod v matici ukáže bublinu s opatřením (klepnutí ji připíchne, další klepnutí
   ji schová). Tlačítko se po klepnutí odfokusuje, aby mezerník a klikr dál ovládaly prezentaci. */
(function () {
  'use strict';
  const s = document.getElementById('s-rizika');
  if (!s) return;
  const plocha = s.querySelector('.r-plocha');
  const bublina = s.querySelector('.r-bublina');
  const body = Array.from(s.querySelectorAll('.r-bod'));
  if (!plocha || !bublina || !body.length) return;
  let pripichnuty = null;

  function ukaz(b) {
    bublina.querySelector('b').textContent = b.dataset.nazev;
    bublina.querySelector('span').textContent = b.dataset.opatreni;
    const x = b.offsetLeft + b.offsetWidth / 2, y = b.offsetTop + b.offsetHeight / 2;
    bublina.style.left = Math.max(210, Math.min(576 - 60, x)) + 'px';
    bublina.style.top = y + 'px';
    bublina.classList.toggle('dole', y < 200);
    bublina.hidden = false;
    bublina.style.animation = 'none'; bublina.offsetWidth; bublina.style.animation = '';
    body.forEach(o => o.classList.toggle('vybrany', o === b));
  }
  function schovej() {
    bublina.hidden = true;
    body.forEach(o => o.classList.remove('vybrany'));
  }

  body.forEach(b => {
    b.addEventListener('pointerenter', () => { if (!pripichnuty) ukaz(b); });
    b.addEventListener('pointerleave', () => { if (!pripichnuty) schovej(); });
    b.addEventListener('click', e => {
      e.stopPropagation();
      if (pripichnuty === b) { pripichnuty = null; schovej(); }
      else { pripichnuty = b; ukaz(b); }
      setTimeout(() => b.blur(), 0);
    });
  });
  s.addEventListener('odchod', () => { pripichnuty = null; schovej(); });
  s.addEventListener('krok', () => { if (!pripichnuty) schovej(); });
})();
