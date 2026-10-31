/* Dojedeno · filmové otevření slajdu 01 (Three.js). Krok 0 běží sám asi 13 s:
   1) tma, reflektor se rozsvítí na jeden školní oběd, kamera pomalu najíždí;
   2) kamera se zvedne a odjede, odhalí jídelnu (64 talířů na čtyřech stolech), rozsvítí se stropní světla;
   3) ze třetiny talířů odletí jídlo obloukem do kbelíku vepředu, kbelík se plní, počítadlo 0 → 31 %.
   Krok 1: plátno se prolne do světla (CSS), vpravo se připojí 3D točna produktu (model3d.js, data-model3d="otocny").
   Když WebGL nejde, sekce nedostane třídu .kino a zůstane 2D otevření ze slajdu (js/s01.js).
   Ladění: ?uvodcas=6.5 v adrese zmrazí krok 0 v daném čase. Sestavuje se esbuildem do js/uvod3d.js (IIFE). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { screenBounds } from './projection.js';

const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KONEC = 13.2;             /* po konci filmu následuje automaticky titulní kompozice */
const LET_ZAC = 8.6, LET_KON = 11.2;

const omez = (x, a, b) => Math.max(a, Math.min(b, x));
const u01 = (t, a, b) => omez((t - a) / (b - a), 0, 1);
const hladke = u => u * u * (3 - 2 * u);
const sinIO = u => 0.5 - 0.5 * Math.cos(Math.PI * u);
const kubIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function postav(s, kontejner) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x050506, 1);
  kontejner.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  scena.background = new THREE.Color(0x050506);
  scena.fog = new THREE.Fog(0x050506, 5.5, 17);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0;

  const kamera = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 60);

  /* ---------- materiály (jako model3d.js) ---------- */
  const porcelan = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.08 });
  const gulas = new THREE.MeshPhysicalMaterial({ color: 0xa8521f, roughness: 0.26, clearcoat: 0.85, clearcoatRoughness: 0.12 });
  const maso = new THREE.MeshPhysicalMaterial({ color: 0x6a2c12, roughness: 0.42, clearcoat: 0.6 });
  const knedlik = new THREE.MeshPhysicalMaterial({ color: 0xf2e8d2, roughness: 0.82, sheen: 0.4, sheenColor: new THREE.Color(0xfff6e6) });
  const deska = new THREE.MeshPhysicalMaterial({ color: 0xe9e5dd, roughness: 0.42, clearcoat: 0.25 });
  const nohyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, metalness: 0.6, roughness: 0.4 });
  const lavice = new THREE.MeshStandardMaterial({ color: 0x55555b, roughness: 0.6 });
  const podlahaMat = new THREE.MeshStandardMaterial({ color: 0x1e1e21, roughness: 0.78, metalness: 0.0 });
  const plast = new THREE.MeshPhysicalMaterial({ color: 0xfbfbfc, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  const plastVnitrek = new THREE.MeshPhysicalMaterial({ color: 0xeeeef0, roughness: 0.55, side: THREE.BackSide });
  const zbytky = new THREE.MeshPhysicalMaterial({ color: 0xa65a2c, roughness: 0.55, clearcoat: 0.35 });
  const zeli = new THREE.MeshPhysicalMaterial({ color: 0xe0cb86, roughness: 0.5, clearcoat: 0.4 });

  /* ---------- prostor: podlaha, stoly, lavice, stropní světla ---------- */
  const podlaha = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), podlahaMat);
  podlaha.rotation.x = -Math.PI / 2;
  podlaha.receiveShadow = true;
  scena.add(podlaha);

  const STOLY_Z = [0, -2.3, -4.6, -6.9];
  const DESKA_Y = 0.76, DELKA = 6.8, SIRKA = 0.9;
  for (const z of STOLY_Z) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(DELKA, 0.04, SIRKA), deska);
    d.position.set(0, DESKA_Y - 0.02, z);
    d.castShadow = true; d.receiveShadow = true;
    scena.add(d);
    for (const x of [-DELKA / 2 + 0.25, DELKA / 2 - 0.25]) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.06, DESKA_Y - 0.04, SIRKA - 0.2), nohyMat);
      n.position.set(x, (DESKA_Y - 0.04) / 2, z);
      n.castShadow = true;
      scena.add(n);
    }
    for (const dz of [-0.78, 0.78]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(DELKA - 0.4, 0.05, 0.32), lavice);
      l.position.set(0, 0.45, z + dz);
      l.castShadow = true; l.receiveShadow = true;
      scena.add(l);
    }
  }

  /* ---------- talíře a jídlo (instancing) ---------- */
  const talirProfil = [
    new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.125, 0.012), new THREE.Vector2(0.17, 0.028),
    new THREE.Vector2(0.172, 0.034), new THREE.Vector2(0.165, 0.034), new THREE.Vector2(0.122, 0.018), new THREE.Vector2(0, 0.012),
  ].map(v => v.multiplyScalar(0.8));
  const talirGeo = new THREE.LatheGeometry(talirProfil, 64);
  const gulasGeo = new THREE.SphereGeometry(0.066, 40, 20);
  const masoGeo = new THREE.IcosahedronGeometry(0.016, 2);
  /* plátek knedlíku: mírně vypouklý válec se zaobleným okrajem */
  const knedGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.0335, 0.003), new THREE.Vector2(0.034, 0.01),
    new THREE.Vector2(0.031, 0.0138), new THREE.Vector2(0.016, 0.0152), new THREE.Vector2(0, 0.0155),
  ], 32);
  const zeliGeo = new THREE.CapsuleGeometry(0.0022, 0.03, 4, 8);

  const talire = [];
  for (const z of STOLY_Z) for (const strana of [1, -1]) for (let j = 0; j < 8; j++) {
    talire.push(new THREE.Vector3(-3.0 + j * 0.857 + (strana < 0 ? 0.3 : 0), DESKA_Y, z + strana * 0.24));
  }
  const N = talire.length;
  const HRDINA = talire.findIndex(p => p.z > 0.1 && Math.abs(p.x - 0.428) < 0.01);
  const P0 = talire[HRDINA].clone();

  const nahoda = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(11);
  const otoceni = talire.map(() => nahoda() * Math.PI * 2);

  const imTalir = new THREE.InstancedMesh(talirGeo, porcelan, N);
  imTalir.castShadow = true; imTalir.receiveShadow = true;
  const pom = new THREE.Object3D();
  talire.forEach((p, i) => { pom.position.copy(p); pom.rotation.set(0, otoceni[i], 0); pom.scale.set(1, 1, 1); pom.updateMatrix(); imTalir.setMatrixAt(i, pom.matrix); });
  scena.add(imTalir);

  /* položky jídla na talíři v místních souřadnicích: guláš, 3 kousky masa, 4 plátky knedlíku */
  const RECEPT = [
    { geo: 'gulas', p: [-0.036, 0.012, 0.004], s: [1.08, 0.16, 1] },
    { geo: 'zeli', p: [-0.06, 0.024, 0.02], s: [1, 1, 1], naklon: 1.45, rot: 0.3 },
    { geo: 'zeli', p: [-0.03, 0.024, -0.03], s: [1, 1, 1], naklon: 1.5, rot: 1.4 },
    { geo: 'zeli', p: [-0.07, 0.023, -0.02], s: [1, 1, 1], naklon: 1.4, rot: 2.3 },
    { geo: 'zeli', p: [-0.015, 0.023, 0.035], s: [1, 1, 1], naklon: 1.5, rot: 0.9 },
    { geo: 'maso', p: [-0.05, 0.02, -0.005], s: [1.25, 0.62, 1] },
    { geo: 'maso', p: [-0.022, 0.021, 0.022], s: [1, 0.6, 1.2] },
    { geo: 'maso', p: [-0.045, 0.02, 0.04], s: [1.1, 0.6, 0.9] },
    { geo: 'kned', p: [0.058, 0.012, -0.05], s: [1, 1, 1], naklon: 0.32 },
    { geo: 'kned', p: [0.074, 0.013, -0.004], s: [1, 1, 1], naklon: 0.3 },
    { geo: 'kned', p: [0.062, 0.013, 0.043], s: [1, 1, 1], naklon: 0.28 },
    { geo: 'kned', p: [0.03, 0.012, 0.074], s: [1, 1, 1], naklon: 0.26 },
  ];
  const pocty = { gulas: 0, maso: 0, kned: 0, zeli: 0 };
  RECEPT.forEach(r => { pocty[r.geo] += N; });
  const im = {
    gulas: new THREE.InstancedMesh(gulasGeo, gulas, pocty.gulas),
    maso: new THREE.InstancedMesh(masoGeo, maso, pocty.maso),
    kned: new THREE.InstancedMesh(knedGeo, knedlik, pocty.kned),
    zeli: new THREE.InstancedMesh(zeliGeo, zeli, pocty.zeli),
  };
  for (const k in im) { im[k].castShadow = true; im[k].receiveShadow = true; im[k].instanceMatrix.setUsage(THREE.DynamicDrawUsage); scena.add(im[k]); }

  /* kbelík vepředu uprostřed (profil jako model3d.js, o 10 % větší) */
  const KB = new THREE.Vector3(0, 0, 1.55);
  const R_DNO = 0.3, R_HORE = 0.36, VYSKA = 0.78, MER = 1.1;
  const profil = [
    new THREE.Vector2(0, 0), new THREE.Vector2(R_DNO - 0.03, 0), new THREE.Vector2(R_DNO, 0.025),
    new THREE.Vector2(R_HORE, VYSKA - 0.02), new THREE.Vector2(R_HORE + 0.025, VYSKA - 0.01), new THREE.Vector2(R_HORE + 0.028, VYSKA + 0.012),
    new THREE.Vector2(R_HORE - 0.012, VYSKA + 0.012),
  ];
  const kbelik = new THREE.Group();
  kbelik.position.copy(KB);
  kbelik.scale.setScalar(MER);
  scena.add(kbelik);
  const telo = new THREE.Mesh(new THREE.LatheGeometry(profil, 96), plast);
  telo.castShadow = true; telo.receiveShadow = true;
  kbelik.add(telo);
  const vnitrek = new THREE.Mesh(new THREE.CylinderGeometry(R_HORE - 0.014, R_DNO - 0.018, VYSKA - 0.03, 96, 1, true), plastVnitrek);
  vnitrek.position.y = 0.025 + (VYSKA - 0.03) / 2;
  kbelik.add(vnitrek);
  const stena = y => R_DNO + (R_HORE - R_DNO) * omez((y - 0.025) / (VYSKA - 0.045), 0, 1);
  const napln = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64), zbytky);
  napln.receiveShadow = true;
  kbelik.add(napln);
  const hrbolky = new THREE.Group();
  kbelik.add(hrbolky);
  for (let n = 0; n < 22; n++) {
    const a = nahoda() * Math.PI * 2, d = Math.sqrt(nahoda()) * 0.24;
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.028 + nahoda() * 0.03, 16, 12), nahoda() < 0.35 ? knedlik : zbytky);
    h.scale.y = 0.45;
    h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    h.castShadow = true;
    hrbolky.add(h);
  }
  const NAPLN_MIN = 0.05, NAPLN_MAX = 0.6;
  let poslNapln = -1;
  function nastavNapln(h) {
    if (Math.abs(h - poslNapln) < 0.002) return;
    poslNapln = h;
    napln.geometry.dispose();
    napln.geometry = new THREE.CylinderGeometry(stena(0.02 + h) - 0.02, R_DNO - 0.035, h, 64);
    napln.position.y = 0.02 + h / 2;
    hrbolky.position.y = 0.02 + h;
    hrbolky.scale.setScalar(omez((stena(0.02 + h) - 0.02) / (R_HORE - 0.034), 0.6, 1));
  }
  const vrchNaplne = h => KB.y + (0.02 + h) * MER;

  /* ---------- světla ---------- */
  const reflektor = new THREE.SpotLight(0xffdcb4, 0, 7, 0.27, 0.85, 2);
  reflektor.position.set(P0.x + 0.15, 3.0, P0.z + 0.5);
  reflektor.target.position.copy(P0);
  reflektor.castShadow = true;
  reflektor.shadow.mapSize.set(1024, 1024);
  reflektor.shadow.bias = -0.0005;
  reflektor.shadow.radius = 4;
  scena.add(reflektor, reflektor.target);

  const sal = new THREE.DirectionalLight(0xe6edff, 0);
  sal.position.set(-3.5, 7, 4.5);
  sal.castShadow = true;
  sal.shadow.mapSize.set(2048, 2048);
  Object.assign(sal.shadow.camera, { left: -5, right: 5, top: 6, bottom: -6, near: 1, far: 20 });
  sal.shadow.radius = 5;
  sal.shadow.bias = -0.0004;
  scena.add(sal);
  const nebe = new THREE.HemisphereLight(0xffffff, 0x1a1a1d, 0);
  scena.add(nebe);
  const naKbelik = new THREE.SpotLight(0xffffff, 0, 8, 0.42, 0.9, 2);
  naKbelik.position.set(0.6, 3.4, 3.4);
  naKbelik.target.position.set(0, 0.5, KB.z);
  scena.add(naKbelik, naKbelik.target);

  /* ---------- let jídla do kbelíku: každý třetí talíř (a talíř z úvodního záběru) ---------- */
  const polozky = [];
  const letici = talire.map((_, i) => i === HRDINA || i % 3 === 0);
  const poradi = talire.map((p, i) => ({ i, d: p.distanceTo(KB) })).filter(o => letici[o.i]).sort((a, b) => a.d - b.d);
  const startTalire = new Map();
  poradi.forEach((o, n) => startTalire.set(o.i, LET_ZAC + (LET_KON - LET_ZAC) * (n / Math.max(1, poradi.length - 1)) + (nahoda() - 0.5) * 0.15));
  const idx = { gulas: 0, maso: 0, kned: 0, zeli: 0 };
  const lok = new THREE.Vector3(), svet = new THREE.Vector3();
  talire.forEach((p, i) => {
    const rot = otoceni[i];
    RECEPT.forEach((r, n) => {
      lok.set(r.p[0], r.p[1], r.p[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
      svet.copy(p).add(lok);
      const pol = { mesh: im[r.geo], k: idx[r.geo]++, start: svet.clone(), rotY: rot + (r.rot || 0), s: r.s, naklon: r.naklon || 0, leti: letici[i] };
      if (pol.leti) {
        pol.t0 = startTalire.get(i) + n * 0.045;
        const a = nahoda() * Math.PI * 2, d = Math.sqrt(nahoda()) * 0.2;
        pol.cil = new THREE.Vector3(KB.x + Math.cos(a) * d, 0, KB.z + Math.sin(a) * d);
        pol.dur = 0.85 + pol.start.distanceTo(KB) * 0.06;
        pol.vyska = 0.35 + pol.start.distanceTo(KB) * 0.07;
        pol.spin = (nahoda() - 0.5) * 9;
      }
      polozky.push(pol);
    });
  });
  const pocetLeticich = polozky.filter(p => p.leti).length;

  function nastavPolozky(t) {
    let dopadlo = 0;
    for (const p of polozky) {
      pom.rotation.set(p.naklon, p.rotY, 0);
      pom.scale.set(p.s[0], p.s[1], p.s[2]);
      if (!p.leti || t <= p.t0) {
        pom.position.copy(p.start);
      } else {
        const u = (t - p.t0) / p.dur;
        if (u >= 1) {
          pom.position.set(0, -10, 0);
          pom.scale.setScalar(0.0001);
          dopadlo += 1;
        } else {
          const e = sinIO(u);
          pom.position.lerpVectors(p.start, p.cil, e);
          const cilY = vrchNaplne(NAPLN_MIN + (NAPLN_MAX - NAPLN_MIN) * 0.6);
          pom.position.y = p.start.y + (cilY - p.start.y) * e + Math.sin(Math.PI * e) * p.vyska;
          pom.rotation.x += u * p.spin;
          pom.rotation.z += u * p.spin * 0.6;
          if (u > 0.85) pom.scale.multiplyScalar(1 - (u - 0.85) / 0.15 * 0.6);
          dopadlo += hladke(omez((u - 0.8) / 0.2, 0, 1));
        }
      }
      pom.updateMatrix();
      p.mesh.setMatrixAt(p.k, pom.matrix);
    }
    for (const k in im) im[k].instanceMatrix.needsUpdate = true;
    return dopadlo / pocetLeticich;
  }

  /* ---------- kamera: klíčové záběry ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const ZABERY = [
    { t: 0.0, poz: V(P0.x + 0.5, 1.02, P0.z + 0.64), cil: V(P0.x, 0.79, P0.z), e: sinIO },
    { t: 4.3, poz: V(P0.x + 0.27, 0.93, P0.z + 0.37), cil: V(P0.x - 0.01, 0.775, P0.z), e: sinIO },
    { t: 6.4, poz: V(P0.x + 1.1, 2.4, 2.6), cil: V(0.2, 0.55, -1.2), e: sinIO },
    { t: 8.6, poz: V(3.5, 3.9, 6.5), cil: V(0, 0.3, -2.7), e: sinIO },
    { t: 11.6, poz: V(0.35, 2.75, 5.5), cil: V(0, 0.2, 0.9), e: sinIO },
  ];
  const kamPoz = new THREE.Vector3(), kamCil = new THREE.Vector3();
  function kameraV(t, cas) {
    let i = 0;
    while (i < ZABERY.length - 2 && t >= ZABERY[i + 1].t) i++;
    const a = ZABERY[i], b = ZABERY[i + 1];
    const u = b.e(u01(t, a.t, b.t));
    kamPoz.lerpVectors(a.poz, b.poz, u);
    kamCil.lerpVectors(a.cil, b.cil, u);
    /* jemné „dýchání“ kamery z ruky, aby obraz nebyl mrtvý */
    const d = REDUKCE ? 0 : 1;
    kamPoz.x += Math.sin(cas * 0.37) * 0.025 * d;
    kamPoz.y += Math.sin(cas * 0.51 + 1) * 0.015 * d;
    kamera.position.copy(kamPoz);
    kamera.lookAt(kamCil);
  }

  /* ---------- HTML titulky a počítadlo ---------- */
  const titulky = Array.from(s.querySelectorAll('.kino-titulek')).map(e => ({ e, od: parseFloat(e.dataset.od), do: parseFloat(e.dataset.do || 'Infinity') }));
  const pocitadlo = s.querySelector('.kino-pocitadlo');
  const pocitadloCislo = pocitadlo && pocitadlo.querySelector('span');

  function scena3(t, cas) {
    /* světla */
    reflektor.intensity = 46 * (0.12 + 0.88 * sinIO(u01(t, 0.35, 2.1))) * (1 - 0.35 * u01(t, 8.3, 10.5));
    const salU = sinIO(u01(t, 4.6, 7.8));
    sal.intensity = 1.5 * salU;
    nebe.intensity = 0.45 * salU;
    scena.environmentIntensity = 0.06 * sinIO(u01(t, 0.4, 1.9)) + 0.5 * salU;
    naKbelik.intensity = 38 * sinIO(u01(t, 8.4, 10.2));
    /* jídlo, kbelík a počítadlo */
    const podil = nastavPolozky(t);
    nastavNapln(NAPLN_MIN + (NAPLN_MAX - NAPLN_MIN) * podil);
    if (pocitadloCislo) {
      pocitadloCislo.textContent = String(Math.round(31 * podil));
      pocitadlo.classList.toggle('je', t >= LET_ZAC + 0.1);
    }
    for (const ti of titulky) ti.e.classList.toggle('je', t >= ti.od && t < ti.do);
    kameraV(t, cas);
  }

  /* velikost: plátno 1920 × 1080 v ploše, ostrost podle skutečného měřítka plochy */
  const plocha = document.querySelector('.plocha');
  let posledniPR = 0;
  function velikost() {
    const kryti = plocha ? parseFloat(plocha.style.getPropertyValue('--kryti')) || 1 : 1;
    const meritko = plocha ? plocha.getBoundingClientRect().width / 1920 * kryti : 1;
    const pr = Math.min(2, Math.max(0.5, (window.devicePixelRatio || 1) * meritko));
    if (Math.abs(pr - posledniPR) < 0.01) return;
    posledniPR = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(1920, 1080, false);
    kamera.aspect = 16 / 9;
    kamera.updateProjectionMatrix();
  }

  return {
    vykresli(t, cas) { kbelik.visible = true; velikost(); scena3(t, cas); renderer.render(scena, kamera); },
    snimekKbeliku() {
      const bounds = screenBounds(telo, kamera, 1920, 1080);
      const visible = scena.children.map(child => [child, child.visible]);
      const background = scena.background, fog = scena.fog;
      const image = document.createElement('canvas');
      // A transparent snapshot keeps the same bucket visible while the dining room fades.
      try {
        scena.children.forEach(child => { if (child !== kbelik && !child.isLight) child.visible = false; });
        scena.background = null; scena.fog = null;
        renderer.setClearColor(0x000000, 0);
        renderer.render(scena, kamera);
        const scale = renderer.domElement.width / 1920;
        image.width = Math.ceil(bounds.width * scale);
        image.height = Math.ceil(bounds.height * scale);
        image.getContext('2d').drawImage(renderer.domElement,
          bounds.left * scale, bounds.top * scale, bounds.width * scale, bounds.height * scale,
          0, 0, image.width, image.height);
      } finally {
        visible.forEach(([child, value]) => { child.visible = value; });
        scena.background = background; scena.fog = fog;
        renderer.setClearColor(0x050506, 1);
      }
      kbelik.visible = false;
      renderer.render(scena, kamera);
      return { image, bounds };
    },
  };
}

function spust() {
  const s = document.getElementById('s-uvod');
  const kontejner = s && s.querySelector('.kino3d');
  if (!kontejner) return;
  let api;
  try { api = postav(s, kontejner); } catch (e) { console.warn('Filmové otevření (WebGL) se nespustilo, zůstává 2D:', e); return; }
  s.classList.add('kino');

  const testCas = parseFloat(new URLSearchParams(location.search).get('uvodcas'));
  let raf = 0, t0 = 0, bezi = false, automaticky = false, filmCas = 0, pripraven = true;
  let presun = null, presunModel = null, presunTimer = null, revealTimer = null;

  function uklidPresun() {
    clearTimeout(presunTimer);
    clearTimeout(revealTimer);
    if (presun) { presun.getAnimations().forEach(a => a.cancel()); presun.remove(); }
    if (presunModel) presunModel.transitionAnchor(false);
    presun = presunModel = null;
    s.classList.remove('presun-kose');
  }

  function presunKos() {
    uklidPresun();
    const model = s.querySelector('.produkt3d-platno');
    if (!model || !model.__m3d) return;
    const target = model.__m3d.transitionAnchor(true);
    presunModel = model.__m3d;
    try {
      const { image, bounds: b } = api.snimekKbeliku();
      // The film layer is scaled from the stage centre to cover the window (--kryti), so start where the bucket is seen.
      const plocha = document.querySelector('.plocha');
      const c = plocha ? parseFloat(plocha.style.getPropertyValue('--kryti')) || 1 : 1;
      const bounds = { left: 960 + (b.left - 960) * c, top: 540 + (b.top - 540) * c, width: b.width * c, height: b.height * c };
      const slot = s.querySelector('.produkt3d');
      // Offsets use the unscaled 1920×1080 stage, so this also works in fullscreen.
      const x = slot.offsetLeft + target.left, y = slot.offsetTop + target.top;
      image.className = 'kino-kos-presun';
      Object.assign(image.style, { left: bounds.left + 'px', top: bounds.top + 'px',
        width: bounds.width + 'px', height: bounds.height + 'px' });
      presun = image;
      s.classList.add('presun-kose');
      s.appendChild(image);
      const end = `translate(${x - bounds.left}px, ${y - bounds.top}px) scale(${target.width / bounds.width}, ${target.height / bounds.height})`;
      image.animate([{ transform: 'none' }, { transform: end }],
        { duration: 1600, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
      image.animate([{ opacity: 1 }, { opacity: 0 }],
        { delay: 1600, duration: 350, fill: 'forwards' });
      revealTimer = setTimeout(() => presunModel?.transitionReveal(), 1600);
      presunTimer = setTimeout(uklidPresun, 2000);
    } catch (error) {
      uklidPresun();
      console.warn('Přesun koše není dostupný, používám prolnutí.', error);
    }
  }

  function smycka(ted) {
    if (!bezi) return;
    const t = Math.min((ted - t0) / 1000, KONEC + 30);
    filmCas = t;
    api.vykresli(Math.min(t, KONEC), ted / 1000);
    if (automaticky && t >= KONEC && s.classList.contains('aktivni') && +s.dataset.k === 0) {
      automaticky = false;
      window.deck.dalsi();
      return;
    }
    raf = requestAnimationFrame(smycka);
  }
  function zastav() { bezi = false; automaticky = false; cancelAnimationFrame(raf); }
  function hrajOd(t, auto = false) {
    zastav();
    uklidPresun();
    pripraven = false;
    s.classList.remove('uvod-pripraven');
    if (Number.isFinite(testCas)) { api.vykresli(testCas, testCas); return; }
    if (REDUKCE) {
      api.vykresli(KONEC, 0);
      if (auto) queueMicrotask(() => {
        if (s.classList.contains('aktivni') && +s.dataset.k === 0) window.deck.dalsi();
      });
      return;
    }
    t0 = performance.now() - t * 1000;
    automaticky = auto;
    bezi = true;
    raf = requestAnimationFrame(smycka);
  }
  function priprav() {
    zastav(); uklidPresun();
    pripraven = true; filmCas = 0;
    s.classList.add('uvod-pripraven');
    api.vykresli(Number.isFinite(testCas) ? testCas : 0, 0);
    s.querySelector('.produkt3d-platno')?.__m3d?.stop();
  }

  s.addEventListener('pred-dalsi', e => {
    if (+s.dataset.k === 0 && pripraven) { e.preventDefault(); hrajOd(0, true); }
  });
  s.addEventListener('pred-predchozi', e => {
    if (+s.dataset.k === 0) { e.preventDefault(); priprav(); }
  });

  /* 3D točna produktu vpravo v titulní kompozici: připojí se až při prvním kroku 1 (ať během filmu neběží druhé WebGL) */
  function produkt() {
    const misto = s.querySelector('.produkt3d');
    if (!misto || misto.querySelector('[data-model3d]') || !window.Model3D) return;
    const el = document.createElement('div');
    el.setAttribute('data-model3d', 'otocny');
    el.className = 'produkt3d-platno';
    misto.appendChild(el);
    window.Model3D.pripoj();
  }

  s.addEventListener('krok', e => {
    const { k, hned } = e.detail;
    if (k >= 1) {
      const animovat = bezi && filmCas >= 11.6 && !hned && !REDUKCE;
      zastav(); produkt();
      s.classList.remove('uvod-pripraven');
      if (animovat) presunKos(); else uklidPresun();
    } else if (s.classList.contains('aktivni')) priprav();
  });
  s.addEventListener('vstup', e => {
    if (+(s.dataset.k || 0) >= 1) { zastav(); produkt(); return; }
    priprav();
  });
  s.addEventListener('odchod', () => { zastav(); uklidPresun(); });
  s.addEventListener('tisk', () => {
    zastav();
    uklidPresun();
    produkt();
    const el = s.querySelector('[data-model3d]');
    if (el && el.__m3d) el.__m3d.vykresli();
  });
}
spust();
