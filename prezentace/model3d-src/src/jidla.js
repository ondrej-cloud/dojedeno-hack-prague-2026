/* Dojezeno · čtyři školní obědy pro 3D scény (úvodní film i model pásu). Souřadnice jsou v místních jednotkách talíře
   s poloměrem 0,138 m (úvodní film); model pásu má talíř 1,25× větší a skupinu jen zvětší. */
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* organický tvar: zvrásní povrch podle polohy (šev koule dostane stejný posun), pak protáhne do tvaru */
export function zvrasni(geo, amp, f, seed, sx = 1, sy = 1, sz = 1) {
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

/* materiály podle názvu geometrie */
export function materialyJidel() {
  const gulas = new THREE.MeshPhysicalMaterial({ color: 0x9c4418, roughness: 0.22, clearcoat: 0.95, clearcoatRoughness: 0.08 });
  const maso = new THREE.MeshPhysicalMaterial({ color: 0x6a2c12, roughness: 0.42, clearcoat: 0.6 });
  const kned = new THREE.MeshPhysicalMaterial({ color: 0xf1e4c8, roughness: 0.84, sheen: 0.5, sheenColor: new THREE.Color(0xfff3dc) });
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
  return {
    gulas, maso, kned, zeli, rizek: rizekMat, kase: kaseMat, citron: citronMat, okurka: okurkaMat,
    spagety: spagetyMat, spagety2: spagetyMat, omacka: omackaMat, bylinka: bylinkaMat, ryze: ryzeMat, kari: kariMat,
    kure: kureMat, hrasek: hrasekMat, mrkev: mrkevMat,
  };
}

export function geometrieJidel() {
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
  return GEO;
}

  /* čtyři obědy v místních souřadnicích talíře; první (guláš s knedlíkem) je i v úvodním záběru */
export const RECEPTY = [
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

/* jeden oběd jako skupina meshů (pro scény bez instancingu) */
export function obed(recept, GEO, MAT, meritko = 1) {
  const g = new THREE.Group();
  for (const r of RECEPTY[recept]) {
    const m = new THREE.Mesh(GEO[r.geo], MAT[r.geo]);
    m.position.set(r.p[0], r.p[1], r.p[2]);
    m.rotation.set(r.naklon || 0, r.rot || 0, 0);
    if (r.s) m.scale.set(r.s[0], r.s[1], r.s[2]);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  g.scale.setScalar(meritko);
  return g;
}
