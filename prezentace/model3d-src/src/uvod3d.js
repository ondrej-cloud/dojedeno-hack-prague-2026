/* Dojezeno · filmové otevření slajdu 01 (Three.js). Krok 0 běží sám asi 13 s:
   1) tma, reflektor se rozsvítí na jeden školní oběd, kamera pomalu najíždí;
   2) kamera se zvedne a odjede, odhalí jídelnu (336 táců na 21 stolech, čtyři různá jídla), rozsvítí se stropní světla;
   3) ze třetiny talířů odletí jídlo obloukem do kbelíku vepředu, kbelík se plní, počítadlo 0 → 31 %.
   Krok 1: plátno se prolne do světla (CSS), vpravo se připojí 3D točna produktu (model3d.js, data-model3d="otocny").
   Když WebGL nejde, sekce nedostane třídu .kino a zůstane 2D otevření ze slajdu (js/s01.js).
   Ladění: ?uvodcas=6.5 v adrese zmrazí krok 0 v daném čase. Sestavuje se esbuildem do js/uvod3d.js (IIFE). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RECEPTY, materialyJidel, geometrieJidel } from './jidla.js';
import { screenBounds } from './projection.js';

const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAUZA = 1.0;              /* po dopadu posledního kousku sekunda klidu, pak teprve přesun kbelíku */
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
  scena.fog = new THREE.Fog(0x050506, 5.5, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0;

  const kamera = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 60);

  /* ---------- materiály (jako model3d.js) ---------- */
  const porcelan = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.08 });
  const MAT = materialyJidel();
  const { gulas, maso, kned: knedlik, zeli } = MAT;
  const deska = new THREE.MeshPhysicalMaterial({ color: 0xd8c09a, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  const hranaMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4c, roughness: 0.55 });
  const nohyMat = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd2, metalness: 0.7, roughness: 0.28, clearcoat: 0.4 });
  const zidleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const podlahaMat = new THREE.MeshStandardMaterial({ color: 0x1e1e21, roughness: 0.78, metalness: 0.0 });
  const plast = new THREE.MeshPhysicalMaterial({ color: 0xfbfbfc, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  const plastVnitrek = new THREE.MeshPhysicalMaterial({ color: 0xeeeef0, roughness: 0.55, side: THREE.BackSide });
  const zbytky = new THREE.MeshPhysicalMaterial({ color: 0xa65a2c, roughness: 0.55, clearcoat: 0.35 });
  const tacMat = new THREE.MeshPhysicalMaterial({ color: 0x8c877f, roughness: 0.5, clearcoat: 0.3 });
  const sklo = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false });
  const caj = new THREE.MeshPhysicalMaterial({ color: 0x9c5218, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.82 });
  const ocel = new THREE.MeshPhysicalMaterial({ color: 0xe4e6ea, metalness: 0.45, roughness: 0.28, clearcoat: 0.6 });

  /* ---------- prostor: podlaha, stoly, lavice, stropní světla ---------- */
  const podlaha = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), podlahaMat);
  podlaha.rotation.x = -Math.PI / 2;
  podlaha.receiveShadow = true;
  scena.add(podlaha);

  /* tři řady po sedmi stolech; prostřední řada je ta z úvodního záběru.
     Deska ze světlého dřeva se zaoblenou hranou a tmavší ABS hranou, čtyři kovové nohy; židle se přidají k táckům níž. */
  const STOLY_Z = [0, -2.3, -4.6, -6.9, -9.2, -11.5, -13.8];
  const STOLY_X = [0, -7.6, 7.6];
  const DESKA_Y = 0.76, DELKA = 6.8, SIRKA = 0.9;
  const deskaGeo = new RoundedBoxGeometry(DELKA, 0.036, SIRKA, 3, 0.014);
  const hranaGeo = new RoundedBoxGeometry(DELKA + 0.006, 0.014, SIRKA + 0.006, 2, 0.006);
  const nohaGeo = new THREE.CylinderGeometry(0.022, 0.02, DESKA_Y - 0.04, 16);
  const ramGeo = new THREE.BoxGeometry(DELKA - 0.5, 0.05, 0.03);
  const POCET_STOLU = STOLY_X.length * STOLY_Z.length;
  const desky = new THREE.InstancedMesh(deskaGeo, deska, POCET_STOLU);
  const hrany = new THREE.InstancedMesh(hranaGeo, hranaMat, POCET_STOLU);
  const nohy = new THREE.InstancedMesh(nohaGeo, nohyMat, POCET_STOLU * 4);
  const ramy = new THREE.InstancedMesh(ramGeo, nohyMat, POCET_STOLU * 2);
  [desky, hrany, nohy, ramy].forEach(m => { m.castShadow = true; m.receiveShadow = true; scena.add(m); });
  {
    const o = new THREE.Object3D();
    let ns = 0, nn = 0, nr = 0;
    for (const sx of STOLY_X) for (const z of STOLY_Z) {
      o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
      o.position.set(sx, DESKA_Y - 0.018, z); o.updateMatrix(); desky.setMatrixAt(ns, o.matrix);
      o.position.set(sx, DESKA_Y - 0.026, z); o.updateMatrix(); hrany.setMatrixAt(ns, o.matrix);
      ns++;
      for (const x of [-DELKA / 2 + 0.22, DELKA / 2 - 0.22]) for (const dz of [-SIRKA / 2 + 0.12, SIRKA / 2 - 0.12]) {
        o.position.set(sx + x, (DESKA_Y - 0.04) / 2, z + dz); o.updateMatrix(); nohy.setMatrixAt(nn++, o.matrix);
      }
      for (const dz of [-SIRKA / 2 + 0.12, SIRKA / 2 - 0.12]) {
        o.position.set(sx, DESKA_Y - 0.07, z + dz); o.updateMatrix(); ramy.setMatrixAt(nr++, o.matrix);
      }
    }
  }

  /* ---------- tácy, talíře a jídlo (instancing) ---------- */
  const talirProfil = [
    new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.125, 0.012), new THREE.Vector2(0.17, 0.028),
    new THREE.Vector2(0.172, 0.034), new THREE.Vector2(0.165, 0.034), new THREE.Vector2(0.122, 0.018), new THREE.Vector2(0, 0.012),
  ].map(v => v.multiplyScalar(0.8));
  const talirGeo = new THREE.LatheGeometry(talirProfil, 64);
  const GEO = geometrieJidel();

  /* tác: zaoblený obdélník; talíř leží vlevo, vpravo sklenice čaje a příbor */
  const TAC_W = 0.46, TAC_D = 0.34, TAC_R = 0.03, TAC_H = 0.014;
  const tacTvar = new THREE.Shape();
  tacTvar.moveTo(-TAC_W / 2 + TAC_R, -TAC_D / 2);
  tacTvar.lineTo(TAC_W / 2 - TAC_R, -TAC_D / 2); tacTvar.quadraticCurveTo(TAC_W / 2, -TAC_D / 2, TAC_W / 2, -TAC_D / 2 + TAC_R);
  tacTvar.lineTo(TAC_W / 2, TAC_D / 2 - TAC_R); tacTvar.quadraticCurveTo(TAC_W / 2, TAC_D / 2, TAC_W / 2 - TAC_R, TAC_D / 2);
  tacTvar.lineTo(-TAC_W / 2 + TAC_R, TAC_D / 2); tacTvar.quadraticCurveTo(-TAC_W / 2, TAC_D / 2, -TAC_W / 2, TAC_D / 2 - TAC_R);
  tacTvar.lineTo(-TAC_W / 2, -TAC_D / 2 + TAC_R); tacTvar.quadraticCurveTo(-TAC_W / 2, -TAC_D / 2, -TAC_W / 2 + TAC_R, -TAC_D / 2);
  const tacGeo = new THREE.ExtrudeGeometry(tacTvar, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 6 });
  tacGeo.rotateX(-Math.PI / 2);
  const skloGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.027, 0), new THREE.Vector2(0.032, 0.098), new THREE.Vector2(0.03, 0.098),
    new THREE.Vector2(0.0255, 0.006), new THREE.Vector2(0, 0.006),
  ], 40);
  const cajGeo = new THREE.CylinderGeometry(0.0295, 0.0262, 0.064, 40);
  /* příbor: rukojeť k jedlíkovi (+z), čepel a hroty od něj */
  const kvadr = (w, h, l, x, z) => new THREE.BoxGeometry(w, h, l).translate(x, h / 2, z);
  const nuzGeo = mergeGeometries([kvadr(0.013, 0.0042, 0.088, 0, 0.042),
    new THREE.CylinderGeometry(0.0062, 0.0062, 0.0016, 20, 1, false, 0, Math.PI).rotateY(Math.PI / 2).translate(0, 0.0008, -0.085),
    kvadr(0.0124, 0.0016, 0.085, 0, -0.0425)]);
  const vidlGeo = mergeGeometries([kvadr(0.012, 0.0042, 0.09, 0, 0.044), kvadr(0.019, 0.0018, 0.022, 0, -0.012),
    ...[-0.0072, -0.0024, 0.0024, 0.0072].map(x => kvadr(0.0026, 0.0016, 0.042, x, -0.044))]);
  const NA_TACU = { talir: -0.07, sklo: [0.155, -0.085], nuz: [0.118, 0.045], vidl: [0.152, 0.045] };

  const talire = [], tacRot = [];
  for (const sx of STOLY_X) for (const z of STOLY_Z) for (const strana of [1, -1]) for (let j = 0; j < 8; j++) {
    talire.push(new THREE.Vector3(sx - 3.0 + j * 0.857 + (strana < 0 ? 0.2 : 0), DESKA_Y + TAC_H, z + strana * 0.24));
    tacRot.push(strana > 0 ? 0 : Math.PI);
  }
  const N = talire.length;
  const HRDINA = talire.findIndex(p => p.z > 0.1 && Math.abs(p.x - 0.428) < 0.01);
  const P0 = talire[HRDINA].clone();

  /* židle u každého tácu: skořepina ze sedáku a opěradla (barevný plast), čtyři kovové nohy; mírně nepravidelně odsunuté */
  {
    const skorepina = mergeGeometries([
      new RoundedBoxGeometry(0.4, 0.03, 0.38, 2, 0.012).translate(0, 0.45, 0),
      new RoundedBoxGeometry(0.4, 0.27, 0.026, 2, 0.012).rotateX(-0.12).translate(0, 0.66, 0.19),
    ]);
    const nozky = mergeGeometries([[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]]
      .map(([x, z]) => new THREE.CylinderGeometry(0.011, 0.011, 0.44, 10).translate(x, 0.22, z)));
    const zidle = new THREE.InstancedMesh(skorepina, zidleMat, talire.length);
    const zidleNohy = new THREE.InstancedMesh(nozky, nohyMat, talire.length);
    [zidle, zidleNohy].forEach(m => { m.castShadow = true; m.receiveShadow = true; scena.add(m); });
    const BARVY = [0x6f9a83, 0x5f8b74, 0x7da690, 0x668f7a].map(c => new THREE.Color(c));
    const nah = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(5);
    const o = new THREE.Object3D();
    talire.forEach((p, i) => {
      const strana = tacRot[i] === 0 ? 1 : -1;
      o.position.set(p.x + 0.07 + (nah() - 0.5) * 0.06, 0, p.z + strana * (0.42 + nah() * 0.08));
      o.rotation.set(0, tacRot[i] + (nah() - 0.5) * 0.16, 0);
      o.updateMatrix();
      zidle.setMatrixAt(i, o.matrix); zidleNohy.setMatrixAt(i, o.matrix);
      zidle.setColorAt(i, BARVY[Math.floor(nah() * BARVY.length)]);
    });
    zidle.instanceColor.needsUpdate = true;
  }

  const nahoda = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(11);
  const otoceni = talire.map(() => nahoda() * Math.PI * 2);

  const OSA_Y = new THREE.Vector3(0, 1, 0);
  const naTac = (i, x, y, z) => new THREE.Vector3(x - NA_TACU.talir, y, z).applyAxisAngle(OSA_Y, tacRot[i]).add(talire[i]);
  const pom = new THREE.Object3D();
  const staticke = (geo, mat, poloha, stin = true) => {
    const m = new THREE.InstancedMesh(geo, mat, N);
    m.castShadow = stin; m.receiveShadow = true;
    talire.forEach((p, i) => {
      const r = poloha(i, p);
      pom.position.copy(r.p); pom.rotation.set(0, r.rot, 0); pom.scale.set(1, 1, 1); pom.updateMatrix();
      m.setMatrixAt(i, pom.matrix);
    });
    scena.add(m);
    return m;
  };
  staticke(talirGeo, porcelan, (i, p) => ({ p, rot: otoceni[i] }));
  staticke(tacGeo, tacMat, (i, p) => ({ p: naTac(i, 0, -TAC_H + 0.003, 0), rot: tacRot[i] }));
  staticke(nuzGeo, ocel, i => ({ p: naTac(i, NA_TACU.nuz[0], 0, NA_TACU.nuz[1]), rot: tacRot[i] }));
  staticke(vidlGeo, ocel, i => ({ p: naTac(i, NA_TACU.vidl[0], 0, NA_TACU.vidl[1]), rot: tacRot[i] + 0.04 }));
  staticke(cajGeo, caj, i => ({ p: naTac(i, NA_TACU.sklo[0], 0.006 + 0.032, NA_TACU.sklo[1]), rot: 0 }), false);
  staticke(skloGeo, sklo, i => ({ p: naTac(i, NA_TACU.sklo[0], 0, NA_TACU.sklo[1]), rot: 0 }), false);

  const recept = talire.map((_, i) => (i === HRDINA ? 0 : Math.floor(nahoda() * RECEPTY.length)));
  const pocty = {};
  recept.forEach(r => RECEPTY[r].forEach(o => { pocty[o.geo] = (pocty[o.geo] || 0) + 1; }));
  const im = {};
  for (const k in pocty) {
    im[k] = new THREE.InstancedMesh(GEO[k], MAT[k], pocty[k]);
    im[k].castShadow = true; im[k].receiveShadow = true;
    im[k].instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scena.add(im[k]);
  }

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
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.028 + nahoda() * 0.03, 16, 12), [knedlik, zbytky, zbytky, MAT.kase, MAT.ryze, MAT.spagety][n % 6]);
    h.scale.y = 0.45;
    h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    h.castShadow = true;
    hrbolky.add(h);
  }
  const NAPLN_MIN = 0.05, NAPLN_MAX = 0.6;
  /* hladina stoupá hlavně zpočátku, pozdější kousky tak zůstanou nahoře vidět jako hromádka */
  const hladina = podil => NAPLN_MIN + (NAPLN_MAX - NAPLN_MIN) * (1 - Math.pow(1 - omez(podil, 0, 1), 3));
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
  sal.shadow.mapSize.set(4096, 4096);
  Object.assign(sal.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 30 });
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
  const idx = {};
  const lok = new THREE.Vector3(), svet = new THREE.Vector3(), odstin = new THREE.Color();
  talire.forEach((p, i) => {
    const rot = otoceni[i];
    /* každá porce je trochu jiná: světlost ±5 % */
    const ton = 0.95 + nahoda() * 0.1;
    RECEPTY[recept[i]].forEach((r, n) => {
      lok.set(r.p[0], r.p[1], r.p[2]).applyAxisAngle(OSA_Y, rot);
      svet.copy(p).add(lok);
      const k = idx[r.geo] = (idx[r.geo] ?? -1) + 1;
      im[r.geo].setColorAt(k, odstin.setScalar(ton));
      const pol = { mesh: im[r.geo], k, start: svet.clone(), rotY: rot + (r.rot || 0), s: r.s || [1, 1, 1], naklon: r.naklon || 0, leti: letici[i] };
      if (pol.leti) {
        pol.t0 = startTalire.get(i) + n * 0.045;
        const a = nahoda() * Math.PI * 2, d = Math.sqrt(nahoda()) * 0.3;
        pol.cil = new THREE.Vector3(KB.x + Math.cos(a) * d, 0, KB.z + Math.sin(a) * d);
        pol.klid = [nahoda() * Math.PI * 2, (nahoda() - 0.5) * 0.5, nahoda() * 0.006];  /* natočení, náklon a výška na hromádce */
        pol.uhel = a; pol.dRel = Math.sqrt(nahoda());
        pol.dur = 0.85 + pol.start.distanceTo(KB) * 0.06;
        pol.vyska = 0.35 + pol.start.distanceTo(KB) * 0.07;
        pol.spin = (nahoda() - 0.5) * 9;
      }
      polozky.push(pol);
    });
  });
  const pocetLeticich = polozky.filter(p => p.leti).length;
  /* kousky zůstávají v kbelíku: každý si sedne na hladinu, jaká byla v okamžiku jeho dopadu, a další ho pak zasypou */
  const leticiPol = polozky.filter(p => p.leti).sort((a, b) => (a.t0 + a.dur) - (b.t0 + b.dur));
  leticiPol.forEach((p, n) => {
    p.hDopad = hladina((n + 1) / leticiPol.length);
    /* místo dopadu vždy uvnitř kbelíku: poloměr hladiny v té výšce, s rezervou na velikost kousku */
    const r = (stena(0.02 + p.hDopad) - 0.11) * MER * p.dRel;
    p.cil.set(KB.x + Math.cos(p.uhel) * r, 0, KB.z + Math.sin(p.uhel) * r);
  });
  const konecFilmu = leticiPol.length ? leticiPol[leticiPol.length - 1].t0 + leticiPol[leticiPol.length - 1].dur + PAUZA : 13.2;
  hrbolky.visible = false;  /* povrch tvoří skutečné kousky jídla */
  for (const k in im) im[k].instanceColor.needsUpdate = true;

  const SKRYT = new THREE.Vector3(0, -10, 0);
  function nastavPolozky(t, jenKos = false) {
    let dopadlo = 0;
    for (const p of polozky) {
      pom.rotation.set(p.naklon, p.rotY, 0);
      pom.scale.set(p.s[0], p.s[1], p.s[2]);
      if (!p.leti || t <= p.t0) {
        pom.position.copy(p.start);
        if (jenKos) { pom.position.copy(SKRYT); pom.scale.setScalar(0.0001); }
      } else {
        const u = (t - p.t0) / p.dur;
        if (u >= 1) {
          /* leží v kbelíku na hromádce */
          pom.position.set(p.cil.x, vrchNaplne(p.hDopad) + p.klid[2], p.cil.z);
          pom.rotation.set(p.naklon * 0.4 + p.klid[1], p.klid[0], p.klid[1] * 0.6);
          pom.scale.multiplyScalar(1.35);
          dopadlo += 1;
        } else {
          const e = sinIO(u);
          pom.position.lerpVectors(p.start, p.cil, e);
          const cilY = vrchNaplne(p.hDopad);
          pom.position.y = p.start.y + (cilY - p.start.y) * e + Math.sin(Math.PI * e) * p.vyska;
          pom.rotation.x += u * p.spin;
          pom.rotation.z += u * p.spin * 0.6;
          pom.scale.multiplyScalar(1 + 0.35 * hladke(u));
          dopadlo += hladke(omez((u - 0.8) / 0.2, 0, 1));
          if (jenKos) { pom.position.copy(SKRYT); pom.scale.setScalar(0.0001); }
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
    nastavNapln(hladina(podil));
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

  let posledniT = 0;
  return {
    konec: konecFilmu,
    vykresli(t, cas) { posledniT = t; kbelik.visible = true; for (const k in im) im[k].visible = true; velikost(); scena3(t, cas); renderer.render(scena, kamera); },
    snimekKbeliku() {
      const bounds = screenBounds(telo, kamera, 1920, 1080);
      const visible = scena.children.map(child => [child, child.visible]);
      const background = scena.background, fog = scena.fog;
      const image = document.createElement('canvas');
      // A transparent snapshot keeps the same bucket visible while the dining room fades.
      try {
        /* jen kbelík a jídlo, které v něm leží (kousky na stolech se na chvíli schovají) */
        nastavPolozky(posledniT, true);
        scena.children.forEach(child => { if (child !== kbelik && !child.isLight && !Object.values(im).includes(child)) child.visible = false; });
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
        nastavPolozky(posledniT);
      }
      kbelik.visible = false;
      for (const k in im) im[k].visible = false;  /* jídlo v kbelíku odjíždí se snímkem */
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
    const KONEC = api.konec;
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
      api.vykresli(api.konec, 0);
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
