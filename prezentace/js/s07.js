/* 07 · interaktivní příklad: posuvník 1–30 % → 600 000 Kč × podíl (zbytky z talířů, škola s 500 žáky, OBSAH.md č. 4 a 13).
   Po puštění se posuvník odfokusuje, aby šipky a klikr dál ovládaly prezentaci. Při návratu před krok 3 se vrátí na 10 %. */
(function () {
  'use strict';
  const s = document.getElementById('s-dostane');
  if (!s) return;
  const vstup = s.querySelector('.posuvnik input');
  const castka = s.querySelector('.priklad [data-pocitej]');
  const procento = s.querySelector('.procento');
  if (!vstup || !castka || !procento) return;
  const ZAKLAD = 600000;
  const fmt = x => (window.cisloCz ? window.cisloCz(x) : String(Math.round(x)));
  function ukaz(p, castkuTaky) {
    vstup.style.setProperty('--plneni', ((p - 1) / 29 * 100) + '%');
    procento.textContent = p + '\u00a0%';
    if (castkuTaky) { castka.textContent = fmt(ZAKLAD * p / 100); castka.dataset.pocitej = String(ZAKLAD * p / 100); }
  }
  vstup.addEventListener('input', () => ukaz(+vstup.value, true));
  const pust = () => setTimeout(() => vstup.blur(), 0);
  vstup.addEventListener('pointerup', pust);
  vstup.addEventListener('change', pust);
  s.addEventListener('krok', e => { if (e.detail.k < 3) { vstup.value = 10; castka.dataset.pocitej = '60000'; ukaz(10, false); } });
  ukaz(10, false);
})();
