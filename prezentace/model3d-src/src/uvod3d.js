/* Dojedeno · filmové otevření slajdu 01 (Three.js). Krok 0 běží sám asi 13 s:
   1) tma, reflektor se rozsvítí na jeden školní oběd, kamera pomalu najíždí;
   2) kamera se zvedne a odjede, odhalí jídelnu (336 táců na 21 stolech, čtyři různá jídla), rozsvítí se stropní světla;
   3) ze třetiny talířů odletí jídlo obloukem do kbelíku vepředu, kbelík se plní, počítadlo 0 → 31 %.
   Krok 1: plátno se prolne do světla (CSS), vpravo se připojí 3D točna produktu (model3d.js, data-model3d="otocny").
   Když WebGL nejde, sekce nedostane třídu .kino a zůstane 2D otevření ze slajdu (js/s01.js).
   Ladění: ?uvodcas=6.5 v adrese zmrazí krok 0 v daném čase. Sestavuje se esbuildem do js/uvod3d.js (IIFE). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { screenBounds } from './projection.js';

const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KONEC = 13.2;             /* po konci filmu následuje automaticky titulní kompozice */
const LET_ZAC = 8.6, LET_KON = 11.2;

const omez = (x, a, b) => Math.max(a, Math.min(b, x));
const u01 = (t, a, b) => omez((t - a) / (b - a), 0, 1);
const hladke = u => u * u * (3 - 2 * u);
const sinIO = u => 0.5 - 0.5 * Math.cos(Math.PI * u);
const kubIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/* organický tvar: zvrásní povrch podle polohy (šev koule dostane stejný posun), pak protáhne do tvaru */
function zvrasni(geo, amp, f, seed, sx = 1, sy = 1, sz = 1) {
  geo.deleteAttribute('uv'); geo.deleteAttribute('normal');
  const g = mergeVertices(geo);
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * f + seed) * Math.cos(v.y * f * 1.7 + seed * 1.3) * Math.sin(v.z * f * 1.3 + seed * 0.7)
      + 0.5 * Math.sin((v.x + v.z) * f * 2.3 + seed * 2.1) * Math.cos((v.y - v.x) * f * 1.9 + seed);
    const d = v.length() || 1;
    v.multiplyScalar(1 + amp * n / d);
    pos.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
  }
  g.computeVertexNormals();
  return g;
}

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
  const gulas = new THREE.MeshPhysicalMaterial({ color: 0x9c4418, roughness: 0.22, clearcoat: 0.95, clearcoatRoughness: 0.08 });
  const maso = new THREE.MeshPhysicalMaterial({ color: 0x6a2c12, roughness: 0.42, clearcoat: 0.6 });
  const knedlik = new THREE.MeshPhysicalMaterial({ color: 0xf1e4c8, roughness: 0.84, sheen: 0.5, sheenColor: new THREE.Color(0xfff3dc) });
  const deska = new THREE.MeshPhysicalMaterial({ color: 0xe9e5dd, roughness: 0.42, clearcoat: 0.25 });
  const nohyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, metalness: 0.6, roughness: 0.4 });
  const lavice = new THREE.MeshStandardMaterial({ color: 0x55555b, roughness: 0.6 });
  const podlahaMat = new THREE.MeshStandardMaterial({ color: 0x1e1e21, roughness: 0.78, metalness: 0.0 });
  const plast = new THREE.MeshPhysicalMaterial({ color: 0xfbfbfc, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  const plastVnitrek = new THREE.MeshPhysicalMaterial({ color: 0xeeeef0, roughness: 0.55, side: THREE.BackSide });
  const zbytky = new THREE.MeshPhysicalMaterial({ color: 0xa65a2c, roughness: 0.55, clearcoat: 0.35 });
  const zeli = new THREE.MeshPhysicalMaterial({ color: 0xe0cb86, roughness: 0.5, clearcoat: 0.4 });
  const rizekMat = new THREE.MeshPhysicalMaterial({ color: 0xc47d34, roughness: 0.86, sheen: 0.3, sheenColor: new THREE.Color(0xffd29a) });
  const kaseMat = new THREE.MeshPhysicalMaterial({ color: 0xf2e3b8, roughness: 0.72, sheen: 0.4, sheenColor: new THREE.Color(0xfff6e0) });
  const citronMat = new THREE.MeshPhysicalMaterial({ color: 0xf3d64a, roughness: 0.35, clearcoat: 0.6 });
  const okurkaMat = new THREE.MeshPhysicalMaterial({ color: 0x8fbd5a, roughness: 0.3, clearcoat: 0.7 });
  const spagetyMat = new THREE.MeshPhysicalMaterial({ color: 0xebc87a, roughness: 0.38, clearcoat: 0.55 });
  const omackaMat = new THREE.MeshPhysicalMaterial({ color: 0xb3301a, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  const bylinkaMat = new THREE.MeshPhysicalMaterial({ color: 0x3f7f2e, roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide });
  const ryzeMat = new THREE.MeshPhysicalMaterial({ color: 0xf6f3ea, roughness: 0.88, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
  const kariMat = new THREE.MeshPhysicalMaterial({ color: 0xd6902a, roughness: 0.24, clearcoat: 0.85, clearcoatRoughness: 0.12 });
  const kureMat = new THREE.MeshPhysicalMaterial({ color: 0xe3b67f, roughness: 0.6, clearcoat: 0.3 });
  const hrasekMat = new THREE.MeshPhysicalMaterial({ color: 0x6cb23b, roughness: 0.3, clearcoat: 0.6 });
  const mrkevMat = new THREE.MeshPhysicalMaterial({ color: 0xe9792a, roughness: 0.4, clearcoat: 0.4 });
  const tacMat = new THREE.MeshPhysicalMaterial({ color: 0x8c877f, roughness: 0.5, clearcoat: 0.3 });
  const sklo = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false });
  const caj = new THREE.MeshPhysicalMaterial({ color: 0x9c5218, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.82 });
  const ocel = new THREE.MeshPhysicalMaterial({ color: 0xe4e6ea, metalness: 0.45, roughness: 0.28, clearcoat: 0.6 });

  /* ---------- prostor: podlaha, stoly, lavice, stropní světla ---------- */
  const podlaha = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), podlahaMat);
  podlaha.rotation.x = -Math.PI / 2;
  podlaha.receiveShadow = true;
  scena.add(podlaha);

  /* tři řady po sedmi stolech; prostřední řada je ta z úvodního záběru */
  const STOLY_Z = [0, -2.3, -4.6, -6.9, -9.2, -11.5, -13.8];
  const STOLY_X = [0, -7.6, 7.6];
  const DESKA_Y = 0.76, DELKA = 6.8, SIRKA = 0.9;
  for (const sx of STOLY_X) for (const z of STOLY_Z) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(DELKA, 0.04, SIRKA), deska);
    d.position.set(sx, DESKA_Y - 0.02, z);
    d.castShadow = true; d.receiveShadow = true;
    scena.add(d);
    for (const x of [-DELKA / 2 + 0.25, DELKA / 2 - 0.25]) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.06, DESKA_Y - 0.04, SIRKA - 0.2), nohyMat);
      n.position.set(sx + x, (DESKA_Y - 0.04) / 2, z);
      n.castShadow = true;
      scena.add(n);
    }
    for (const dz of [-0.78, 0.78]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(DELKA - 0.4, 0.05, 0.32), lavice);
      l.position.set(sx, 0.45, z + dz);
      l.castShadow = true; l.receiveShadow = true;
      scena.add(l);
    }
  }

  /* ---------- tácy, talíře a jídlo (instancing) ---------- */
  const talirProfil = [
    new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.125, 0.012), new THREE.Vector2(0.17, 0.028),
    new THREE.Vector2(0.172, 0.034), new THREE.Vector2(0.165, 0.034), new THREE.Vector2(0.122, 0.018), new THREE.Vector2(0, 0.012),
  ].map(v => v.multiplyScalar(0.8));
  const talirGeo = new THREE.LatheGeometry(talirProfil, 64);
  /* plátek knedlíku: mírně vypouklý válec se zaobleným okrajem */
  const knedGeo = zvrasni(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.0335, 0.003), new THREE.Vector2(0.034, 0.01),
    new THREE.Vector2(0.031, 0.0138), new THREE.Vector2(0.024, 0.0148), new THREE.Vector2(0.016, 0.0152), new THREE.Vector2(0.008, 0.0154), new THREE.Vector2(0, 0.0155),
  ], 64), 0.0007, 520, 12);
  const spagety = (p, q, r) => {
    const g = new THREE.TorusKnotGeometry(r, 0.0032, 420, 6, p, q);
    g.rotateX(-Math.PI / 2); g.scale(1, 0.32, 1);
    return g;
  };
  const GEO = {
    gulas: zvrasni(new THREE.SphereGeometry(0.066, 48, 24), 0.003, 70, 1, 1, 1, 1),
    maso: zvrasni(new THREE.IcosahedronGeometry(0.016, 3), 0.0025, 260, 2),
    kned: knedGeo,
    zeli: new THREE.CapsuleGeometry(0.0022, 0.03, 4, 8),
    rizek: zvrasni(new THREE.SphereGeometry(0.05, 48, 24), 0.0045, 120, 3, 1.3, 0.17, 0.88),
    kase: zvrasni(new THREE.SphereGeometry(0.04, 48, 24), 0.006, 95, 4, 1.1, 0.55, 1),
    citron: new THREE.CylinderGeometry(0.016, 0.016, 0.004, 28),
    okurka: new THREE.CylinderGeometry(0.014, 0.014, 0.003, 24),
    spagety: spagety(9, 13, 0.042),
    spagety2: spagety(11, 7, 0.036),
    omacka: zvrasni(new THREE.SphereGeometry(0.03, 40, 20), 0.004, 110, 5, 1, 0.36, 1),
    bylinka: zvrasni(new THREE.SphereGeometry(0.009, 16, 8), 0.0006, 400, 6, 1.6, 0.14, 0.75),
    ryze: zvrasni(new THREE.SphereGeometry(0.05, 64, 32), 0.0024, 310, 7, 1, 0.48, 0.86),
    kari: zvrasni(new THREE.SphereGeometry(0.05, 40, 20), 0.002, 60, 8, 0.9, 0.14, 1.05),
    kure: zvrasni(new THREE.IcosahedronGeometry(0.016, 3), 0.003, 190, 9, 1.25, 0.72, 1),
    hrasek: new THREE.SphereGeometry(0.0058, 12, 8),
    mrkev: new THREE.BoxGeometry(0.009, 0.009, 0.009),
  };
  const MAT = {
    gulas, maso, kned: knedlik, zeli, rizek: rizekMat, kase: kaseMat, citron: citronMat, okurka: okurkaMat,
    spagety: spagetyMat, spagety2: spagetyMat, omacka: omackaMat, bylinka: bylinkaMat, ryze: ryzeMat, kari: kariMat,
    kure: kureMat, hrasek: hrasekMat, mrkev: mrkevMat,
  };

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

  /* čtyři obědy v místních souřadnicích talíře; první (guláš s knedlíkem) je i v úvodním záběru */
  const RECEPTY = [
    [ /* guláš, 3 kousky masa, cibulka, 4 plátky knedlíku */
      { geo: 'gulas', p: [-0.036, 0.012, 0.004], s: [1.08, 0.16, 1] },
      { geo: 'zeli', p: [-0.06, 0.024, 0.02], naklon: 1.45, rot: 0.3 },
      { geo: 'zeli', p: [-0.03, 0.024, -0.03], naklon: 1.5, rot: 1.4 },
      { geo: 'zeli', p: [-0.07, 0.023, -0.02], naklon: 1.4, rot: 2.3 },
      { geo: 'zeli', p: [-0.015, 0.023, 0.035], naklon: 1.5, rot: 0.9 },
      { geo: 'maso', p: [-0.05, 0.02, -0.005], s: [1.25, 0.62, 1] },
      { geo: 'maso', p: [-0.022, 0.021, 0.022], s: [1, 0.6, 1.2] },
      { geo: 'maso', p: [-0.045, 0.02, 0.04], s: [1.1, 0.6, 0.9] },
      { geo: 'kned', p: [0.058, 0.012, -0.05], naklon: 0.32 },
      { geo: 'kned', p: [0.074, 0.013, -0.004], naklon: 0.3 },
      { geo: 'kned', p: [0.062, 0.013, 0.043], naklon: 0.28 },
      { geo: 'kned', p: [0.03, 0.012, 0.074], naklon: 0.26 },
      { geo: 'bylinka', p: [-0.04, 0.025, 0.012], rot: 0.7 },
    ],
    [ /* řízek s citronem, bramborová kaše s petrželkou, okurkový salát */
      { geo: 'rizek', p: [-0.032, 0.019, -0.004], rot: 0.35 },
      { geo: 'citron', p: [-0.04, 0.0295, 0.004], naklon: 0.12 },
      { geo: 'kase', p: [0.048, 0.016, 0.03] },
      { geo: 'bylinka', p: [0.046, 0.039, 0.028], rot: 1.1 },
      { geo: 'bylinka', p: [0.054, 0.037, 0.038], rot: 2.4 },
      { geo: 'okurka', p: [0.05, 0.0135, -0.056] },
      { geo: 'okurka', p: [0.071, 0.0145, -0.038], naklon: 0.18 },
      { geo: 'okurka', p: [0.034, 0.0135, -0.07], naklon: -0.1 },
    ],
    [ /* špagety s rajčatovou omáčkou a bazalkou */
      { geo: 'spagety', p: [0, 0.019, 0] },
      { geo: 'spagety2', p: [0.004, 0.026, 0.003], rot: 1 },
      { geo: 'omacka', p: [0.002, 0.034, -0.002] },
      { geo: 'bylinka', p: [0.012, 0.045, -0.008], rot: 0.5 },
      { geo: 'bylinka', p: [-0.008, 0.045, 0.008], rot: 2.2 },
    ],
    [ /* rýže, kuřecí kari s hráškem a mrkví */
      { geo: 'ryze', p: [0.038, 0.016, 0.002] },
      { geo: 'kari', p: [-0.042, 0.013, 0] },
      { geo: 'kure', p: [-0.05, 0.021, -0.022] },
      { geo: 'kure', p: [-0.03, 0.021, 0.026], rot: 1 },
      { geo: 'kure', p: [-0.064, 0.02, 0.02], rot: 2 },
      { geo: 'hrasek', p: [-0.025, 0.02, -0.012] },
      { geo: 'hrasek', p: [-0.07, 0.019, -0.008] },
      { geo: 'hrasek', p: [-0.044, 0.02, 0.046] },
      { geo: 'hrasek', p: [-0.016, 0.019, 0.008] },
      { geo: 'mrkev', p: [-0.06, 0.02, -0.04], rot: 0.4 },
      { geo: 'mrkev', p: [-0.036, 0.02, 0.006], rot: 1.1 },
      { geo: 'mrkev', p: [-0.02, 0.02, -0.03], rot: 0.8 },
    ],
  ];
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
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.028 + nahoda() * 0.03, 16, 12), [knedlik, zbytky, zbytky, kaseMat, ryzeMat, spagetyMat][n % 6]);
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
  for (const k in im) im[k].instanceColor.needsUpdate = true;

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
