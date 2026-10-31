/* Dojedeno · návrh pilotní sestavy (jeden pás, snímání talířů a samostatně vážený kbelík; volitelně tři patra) jako produktová fotka v prohlížeči.
   Kroky slajdu: 0 celek, 1 fotka na pásu, 2 přírůstek váhy při vysypání, 3 návrh přiřazení. Animace je ilustrativní.
   Připojení: prvek s atributem data-model3d uvnitř .slajd; poslouchá události slajdu 'vstup', 'krok', 'odchod', 'tisk'.
   Sestavuje se esbuildem do js/model3d.js (IIFE, funguje z file://). Bez sítě. */
import * as THREE from 'three';
import { screenBounds } from './projection.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ZBYTEK_G = 150;
const ZELENA = '#30d158';

const STYL = `
.m3d { position: relative; width: 100%; height: 100%; }
.m3d canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; display: block; }
.m3d-stitek { position: absolute; left: 0; top: 0; pointer-events: none; white-space: nowrap; transform: translate(-50%, -100%);
  padding: 12px 22px 14px; border-radius: 999px; background: rgba(255,255,255,0.82);
  -webkit-backdrop-filter: blur(18px) saturate(180%); backdrop-filter: blur(18px) saturate(180%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.12);
  font: 600 26px/1.2 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif; color: #1d1d1f;
  opacity: 0; transition: opacity 420ms cubic-bezier(0.16,1,0.3,1), margin-top 420ms cubic-bezier(0.16,1,0.3,1); margin-top: 10px; }
.m3d-stitek.je { opacity: 1; margin-top: 0; }
.m3d-stitek b { font-weight: 800; font-variant-numeric: tabular-nums; }
.m3d-stitek .z { color: #248a3d; }
.m3d-stitek .o { color: #c9601b; }
.m3d-stitek .tecka { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${ZELENA}; margin-right: 10px; vertical-align: 2px; }
`;

function vlozStyl() {
  if (document.getElementById('m3d-styl')) return;
  const s = document.createElement('style');
  s.id = 'm3d-styl';
  s.textContent = STYL;
  document.head.appendChild(s);
}

const ease = t => 1 - Math.pow(1 - t, 3);
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = t => Math.max(0, Math.min(1, t));

function postav(kontejner) {
  vlozStyl();
  const TRI_PATRA = kontejner.dataset.modelVariant === 'three';
  const OTOCNY = kontejner.dataset.model3d === 'otocny';  /* titul: stejná sestava v pomalém náhledu, bez kroků a štítků */

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  kontejner.appendChild(renderer.domElement);
  kontejner.classList.add('m3d');

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.75;

  const kamera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);

  /* světla: jedno hlavní shora zleva (jeden zdroj světla = jeden směr stínů), jemné doplňkové */
  const hlavni = new THREE.DirectionalLight(0xffffff, 2.2);
  hlavni.position.set(1.4, 4.6, 2.2);
  hlavni.castShadow = true;
  hlavni.shadow.mapSize.set(2048, 2048);
  hlavni.shadow.camera.left = -3.4; hlavni.shadow.camera.right = 2.4;
  hlavni.shadow.camera.top = 2.2; hlavni.shadow.camera.bottom = -1.2;
  hlavni.shadow.camera.near = 0.5; hlavni.shadow.camera.far = 10;
  hlavni.shadow.radius = 6;
  hlavni.shadow.bias = -0.0004;
  scena.add(hlavni);
  scena.add(new THREE.HemisphereLight(0xffffff, 0xe8e8ed, 0.6));

  /* podlaha: jen stín */
  const podlaha = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.13 }));
  podlaha.rotation.x = -Math.PI / 2;
  podlaha.receiveShadow = true;
  scena.add(podlaha);

  /* materiály */
  const nerez = new THREE.MeshPhysicalMaterial({ color: 0xd8d9dc, metalness: 0.92, roughness: 0.3, clearcoat: 0.2 });
  const hlinik = new THREE.MeshPhysicalMaterial({ color: 0xc9cbcf, metalness: 0.88, roughness: 0.26 });
  const plast = new THREE.MeshPhysicalMaterial({ color: 0xfbfbfc, metalness: 0, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  const plastVnitrek = new THREE.MeshPhysicalMaterial({ color: 0xeeeef0, roughness: 0.55, side: THREE.BackSide });
  const grafit = new THREE.MeshPhysicalMaterial({ color: 0x2c2c2e, metalness: 0.6, roughness: 0.35, clearcoat: 0.6 });
  const sklo = new THREE.MeshPhysicalMaterial({ color: 0x111113, metalness: 0.2, roughness: 0.08, clearcoat: 1 });
  const porcelan = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const omacka = new THREE.MeshPhysicalMaterial({ color: 0xa4552a, roughness: 0.45, clearcoat: 0.5 });
  const knedlik = new THREE.MeshPhysicalMaterial({ color: 0xf1e7d0, roughness: 0.75 });
  const zbytky = new THREE.MeshPhysicalMaterial({ color: 0xb06a3c, roughness: 0.7 });

  const sestava = new THREE.Group();
  scena.add(sestava);
  const stin = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* váha: nerezová plošina na nožkách, displej vpředu */
  const PLOSINA_Y = 0.07;
  const plosina = stin(new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.07, 0.78, 6, 0.025), nerez));
  plosina.position.y = PLOSINA_Y;
  sestava.add(plosina);
  for (const [x, z] of [[-0.4, -0.33], [0.4, -0.33], [-0.4, 0.33], [0.4, 0.33]]) {
    const n = stin(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.035, 24), grafit));
    n.position.set(x, 0.018, z);
    sestava.add(n);
  }
  /* displej: ukazatel na nízkém sloupku před plošinou, mírně skloněný k divákovi */
  const ukazatel = new THREE.Group();
  ukazatel.position.set(0, 0, 0.52);
  sestava.add(ukazatel);
  const noha = stin(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 16), hlinik));
  noha.position.y = 0.08;
  ukazatel.add(noha);
  const skrin = stin(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.12, 0.05, 5, 0.018), grafit));
  skrin.position.set(0, 0.2, 0);
  skrin.rotation.x = -0.35;
  ukazatel.add(skrin);
  const platno = document.createElement('canvas');
  platno.width = 512; platno.height = 160;
  const kresli = platno.getContext('2d');
  const textura = new THREE.CanvasTexture(platno);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;
  const obrazovka = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.09), new THREE.MeshBasicMaterial({ map: textura, toneMapped: false }));
  obrazovka.position.set(0, 0.2, 0.027);
  obrazovka.rotation.x = -0.35;
  obrazovka.position.y += 0.0;
  ukazatel.add(obrazovka);
  let displejG = -1, displejStav = '';
  function displej(g, stav) {
    const gr = Math.round(g);
    if (gr === displejG && stav === displejStav) return;
    displejG = gr; displejStav = stav;
    kresli.fillStyle = '#0b0b0d';
    kresli.fillRect(0, 0, 512, 160);
    kresli.fillStyle = stav === 'ustaleno' ? ZELENA : '#f5f5f7';
    kresli.font = '700 104px "SF Mono", ui-monospace, Menlo, monospace';
    kresli.textAlign = 'right';
    kresli.textBaseline = 'middle';
    kresli.fillText(String(gr), 400, 86);
    kresli.font = '600 54px -apple-system, "SF Pro Text", sans-serif';
    kresli.textAlign = 'left';
    kresli.fillStyle = '#8e8e93';
    kresli.fillText('g', 420, 96);
    if (stav === 'ustaleno') { kresli.fillStyle = ZELENA; kresli.beginPath(); kresli.arc(40, 80, 14, 0, Math.PI * 2); kresli.fill(); }
    textura.needsUpdate = true;
  }
  displej(0, '');

  /* kbelík: soustružený profil, bílý plast, uvnitř zbytky jídla (výška se mění) */
  const KBELIK_Y = PLOSINA_Y + 0.035;
  const R_DNO = 0.3, R_HORE = 0.36, VYSKA = 0.78;
  const profil = [
    new THREE.Vector2(0, 0), new THREE.Vector2(R_DNO - 0.03, 0), new THREE.Vector2(R_DNO, 0.025),
    new THREE.Vector2(R_HORE, VYSKA - 0.02), new THREE.Vector2(R_HORE + 0.025, VYSKA - 0.01), new THREE.Vector2(R_HORE + 0.028, VYSKA + 0.012),
    new THREE.Vector2(R_HORE - 0.012, VYSKA + 0.012),
  ];
  const kbelik = stin(new THREE.Mesh(new THREE.LatheGeometry(profil, 96), plast));
  kbelik.position.y = KBELIK_Y;
  sestava.add(kbelik);
  const vnitrek = new THREE.Mesh(new THREE.CylinderGeometry(R_HORE - 0.014, R_DNO - 0.018, VYSKA - 0.03, 96, 1, true), plastVnitrek);
  vnitrek.position.y = KBELIK_Y + 0.025 + (VYSKA - 0.03) / 2;
  sestava.add(vnitrek);
  /* poloměr stěny kbelíku ve výšce y (lokálně od dna), zbytky jsou kužel těsně uvnitř */
  const stena = y => R_DNO + (R_HORE - R_DNO) * clamp01((y - 0.025) / (VYSKA - 0.045));
  const napln = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96), zbytky);
  napln.receiveShadow = true;
  sestava.add(napln);
  const NAPLN_ZAC = 0.3, NAPLN_KONEC = 0.335;
  function nastavNapln(h) {
    napln.geometry.dispose();
    napln.geometry = new THREE.CylinderGeometry(stena(0.02 + h) - 0.02, R_DNO - 0.035, h, 96);
    napln.position.y = KBELIK_Y + 0.02 + h / 2;
  }
  nastavNapln(NAPLN_ZAC);
  /* hrbolky na povrchu zbytků, ať to není plochý kotouč */
  const hrbolky = new THREE.Group();
  sestava.add(hrbolky);
  const nahoda = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  for (let n = 0; n < 26; n++) {
    const a = nahoda() * Math.PI * 2, d = Math.sqrt(nahoda()) * 0.26;
    const h = stin(new THREE.Mesh(new THREE.SphereGeometry(0.03 + nahoda() * 0.03, 20, 14), nahoda() < 0.35 ? knedlik : zbytky));
    h.scale.y = 0.45;
    h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    hrbolky.add(h);
  }
  const hrbolkyNa = h => { hrbolky.position.y = KBELIK_Y + 0.02 + h; };
  hrbolkyNa(NAPLN_ZAC);

  /* Základní sestava má jeden pás a telefon. Tři patra patří do varianty pro Q&A;
     přesný počet a umístění snímačů určí až ověření výhledu v jídelně. */
  const PATRA = TRI_PATRA ? [0.52, 1.06, 1.60] : [0.98];
  const HLAVNI_PATRO = TRI_PATRA ? 1 : 0;
  const VYSKA_RAMU = PATRA[PATRA.length - 1] + 0.04;
  const PAS_X = -1.55, PAS_Z = -0.12, PAS_DELKA = 1.95, PAS_SIRKA = 0.70;
  const FOTO_X = -1.03;
  const pasMat = new THREE.MeshStandardMaterial({ color: 0x29453e, roughness: 0.88 });
  const tacekMat = new THREE.MeshPhysicalMaterial({ color: 0xd6ddd9, roughness: 0.55, clearcoat: 0.18 });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0, depthWrite: false });
  const snimace = [];
  const pasy = new THREE.Group();
  sestava.add(pasy);
  function kvadr(w,h,d,x,y,z,mat=nerez,r=0.012) {
    const m=stin(new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),mat));
    m.position.set(x,y,z);pasy.add(m);return m;
  }
  for (const x of [PAS_X-PAS_DELKA/2+0.07,PAS_X+PAS_DELKA/2-0.07]) {
    for (const z of [PAS_Z-PAS_SIRKA/2,PAS_Z+PAS_SIRKA/2]) {
      kvadr(0.045,VYSKA_RAMU,0.045,x,VYSKA_RAMU/2+0.02,z);
      kvadr(0.12,0.035,0.12,x,0.02,z,grafit);
    }
  }
  for (const [index,y] of PATRA.entries()) {
    kvadr(PAS_DELKA,0.065,PAS_SIRKA,PAS_X,y-0.045,PAS_Z);
    kvadr(PAS_DELKA-0.05,0.018,PAS_SIRKA-0.08,PAS_X,y,PAS_Z,pasMat);
    for (const z of [-1,1]) kvadr(PAS_DELKA,0.025,0.025,PAS_X,y+0.025,PAS_Z+z*(PAS_SIRKA/2-0.01),hlinik,0.008);
    // Direction markings on the moving surface.
    for (const x of [-2.16,-1.69]) {
      const arrow=new THREE.Shape();
      arrow.moveTo(-0.08,-0.025);arrow.lineTo(0.005,-0.025);arrow.lineTo(0.005,-0.055);
      arrow.lineTo(0.085,0);arrow.lineTo(0.005,0.055);arrow.lineTo(0.005,0.025);arrow.lineTo(-0.08,0.025);
      const mark=new THREE.Mesh(new THREE.ShapeGeometry(arrow),new THREE.MeshBasicMaterial({color:0x76bca0,side:THREE.DoubleSide}));
      mark.rotation.x=-Math.PI/2;mark.position.set(x,y+0.011,PAS_Z+0.19);pasy.add(mark);
    }
    // A clamp and short arm mount the phone above this level, not over the bin.
    kvadr(0.045,0.30,0.045,FOTO_X,y+0.15,PAS_Z-0.38,hlinik,0.008);
    kvadr(0.035,0.035,0.38,FOTO_X,y+0.30,PAS_Z-0.19,hlinik,0.008);
    const telefon=new THREE.Group();telefon.position.set(FOTO_X,y+0.28,PAS_Z);pasy.add(telefon);
    const teloTel=stin(new THREE.Mesh(new RoundedBoxGeometry(0.12,0.016,0.23,5,0.008),grafit));telefon.add(teloTel);
    const screen=new THREE.Mesh(new RoundedBoxGeometry(0.108,0.003,0.216,4,0.005),sklo);screen.position.y=0.009;telefon.add(screen);
    const objektiv=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.005,24),sklo);objektiv.position.set(-0.025,-0.011,-0.075);telefon.add(objektiv);
    const lensRing=new THREE.Mesh(new THREE.TorusGeometry(0.015,0.002,8,24),hlinik);lensRing.rotation.x=Math.PI/2;lensRing.position.copy(objektiv.position);lensRing.position.y-=0.003;telefon.add(lensRing);
    const light=new THREE.PointLight(0xffffff,0,0.7,2);light.position.set(FOTO_X,y+0.24,PAS_Z);pasy.add(light);
    const beam=new THREE.Mesh(new THREE.ConeGeometry(0.21,0.24,48,1,true),beamMat);
    beam.position.set(FOTO_X,y+0.14,PAS_Z);pasy.add(beam);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.215,0.004,8,64),ringMat);
    ring.rotation.x=Math.PI/2;ring.position.set(FOTO_X,y+0.025,PAS_Z);pasy.add(ring);
    snimace.push({beam,ring,light});
  }
  const zaber=snimace[0].beam,zaberKruh=snimace[0].ring;
  // Shared data connection is schematic; it does not depict a proven matching algorithm.
  const spojeni=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(FOTO_X,0.10,PAS_Z-0.38),new THREE.Vector3(-0.65,0.08,-0.50),new THREE.Vector3(0,0.08,-0.42)
  ]),24,0.006,8,false),new THREE.MeshStandardMaterial({color:0x248a3d,roughness:0.7}));
  sestava.add(spojeni);

  /* Aktivní talíř je na jediném pásu, nebo prostředním patře záložního modelu. Přesun je ilustrativní. */
  const talir = new THREE.Group();
  const TALIR_ZAC = new THREE.Vector3(FOTO_X, PATRA[HLAVNI_PATRO] + 0.045, PAS_Z);
  talir.scale.setScalar(1.2);
  scena.add(talir);
  const talirProfil = [
    new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.125, 0.012), new THREE.Vector2(0.17, 0.028),
    new THREE.Vector2(0.172, 0.034), new THREE.Vector2(0.165, 0.034), new THREE.Vector2(0.122, 0.018), new THREE.Vector2(0, 0.012),
  ];
  const talirMesh = stin(new THREE.Mesh(new THREE.LatheGeometry(talirProfil, 96), porcelan));
  talir.add(talirMesh);
  const jidlo = [];
  const pridejJidlo = (geo, mat, x, z, sy, rot) => {
    const m = stin(new THREE.Mesh(geo, mat));
    m.position.set(x, 0.02, z);
    m.scale.y = sy;
    m.rotation.y = rot || 0;
    talir.add(m);
    jidlo.push({ m, start: m.position.clone(), startRot: m.rotation.clone() });
  };
  pridejJidlo(new THREE.SphereGeometry(0.065, 32, 20), omacka, -0.02, 0.02, 0.3);
  pridejJidlo(new THREE.CylinderGeometry(0.04, 0.04, 0.022, 32), knedlik, 0.05, -0.03, 1, 0.3);
  pridejJidlo(new THREE.CylinderGeometry(0.04, 0.04, 0.022, 32), knedlik, -0.06, -0.05, 1, 1.1);
  pridejJidlo(new THREE.SphereGeometry(0.03, 24, 16), omacka, 0.06, 0.05, 0.4);

  // Každý pás nese jeden tác; pouze aktivní talíř ukazuje vysypání.
  for (const [index,y] of PATRA.entries()) {
    const tray=stin(new THREE.Mesh(new RoundedBoxGeometry(0.49,0.024,0.40,4,0.015),tacekMat));
    tray.position.set(FOTO_X,y+0.023,PAS_Z);scena.add(tray);
    if (index!==HLAVNI_PATRO) {
      const plate=talir.clone(true);plate.position.set(FOTO_X,y+0.045,PAS_Z);
      plate.rotation.y=index===0?0.35:-0.35;scena.add(plate);
    }
  }
  function talirPoloha(t) {
    const lift=easeIO(clamp01(t/0.62));
    const tip=easeIO(clamp01((t-0.62)/0.38));
    talir.position.copy(TALIR_ZAC).lerp(new THREE.Vector3(0.17,KBELIK_Y+VYSKA+0.29,0.08),lift);
    talir.position.y+=Math.sin(Math.PI*lift)*0.18;
    talir.rotation.set(-0.08*tip,0,1.20*tip);
  }

  /* Kompaktnější pohled zvětší jednoduchou sestavu; Q&A zachová celé tři úrovně. */
  const POHLEDY = TRI_PATRA ? [
    { poz: new THREE.Vector3(3.35,2.65,4.65), cil: new THREE.Vector3(-1.0,0.97,-0.05) },
    { poz: new THREE.Vector3(3.55,2.80,4.80), cil: new THREE.Vector3(-1.05,0.90,-0.05) },
    { poz: new THREE.Vector3(3.10,2.20,4.20), cil: new THREE.Vector3(-0.74,0.82,0.04) },
    { poz: new THREE.Vector3(3.35,2.65,4.65), cil: new THREE.Vector3(-1.0,0.97,-0.05) },
  ] : [
    { poz: new THREE.Vector3(2.95,2.50,4.15), cil: new THREE.Vector3(-1.0,0.70,-0.05) },
    { poz: new THREE.Vector3(3.05,2.65,4.25), cil: new THREE.Vector3(-1.03,0.78,-0.05) },
    { poz: new THREE.Vector3(2.80,2.25,3.95), cil: new THREE.Vector3(-0.84,0.70,0.04) },
    { poz: new THREE.Vector3(2.95,2.50,4.15), cil: new THREE.Vector3(-1.0,0.70,-0.05) },
  ];
  const kamPoz=POHLEDY[0].poz.clone(),kamCil=POHLEDY[0].cil.clone();

  /* štítky (HTML nad 3D, kotvené k bodům ve scéně) */
  const stitky = {};
  function stitek(id, html, bod) {
    const e = document.createElement('div');
    e.className = 'm3d-stitek';
    e.innerHTML = html;
    kontejner.appendChild(e);
    stitky[id] = { e, bod };
  }
  stitek('vaha', '<span class="tecka"></span>Přírůstek: <b class="o" data-g>+0 g</b>', new THREE.Vector3(0.15, 0.38, 0.62));
  stitek('foto', '<span class="tecka"></span>Talíř A · fotka + čas', new THREE.Vector3(FOTO_X, PATRA[PATRA.length - 1] + 0.37, PAS_Z));
  stitek('ai', TRI_PATRA ? 'Nejisté přiřazení → společná dávka' : 'Nejisté pořadí → společná dávka', new THREE.Vector3(-1.10, 0.12, 0.62));
  const vahaText = stitky.vaha.e.querySelector('[data-g]');

  /* stav */
  let krok = 0, bezi = false, raf = 0, sirka = 0, vyska = 0;
  let vyklopeniStart = null;  /* čas začátku vyklopení (krok 2), null = klid */
  let fotoStart = null;
  let t0 = performance.now(), holdTime = null;

  function velikost() {
    const w = kontejner.clientWidth, h = kontejner.clientHeight;
    if (!w || !h || (w === sirka && h === vyska)) return;
    sirka = w; vyska = h;
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    kamera.updateProjectionMatrix();
  }

  /* konečné stavy kroků (pro skok, zpět a tisk) */
  function stavPredVyklopenim() {
    talir.visible = true;
    talir.scale.setScalar(1.2);
    talirPoloha(0);
    talirMesh.material.opacity = 1;
    jidlo.forEach(j => { j.m.visible = true; j.m.position.copy(j.start); j.m.rotation.copy(j.startRot); });
    nastavNapln(NAPLN_ZAC); hrbolkyNa(NAPLN_ZAC);
    displej(0, '');
    vahaText.textContent = '+0 g';
  }
  function stavPoVyklopeni() {
    talir.visible = false;
    jidlo.forEach(j => { j.m.visible = false; });
    nastavNapln(NAPLN_KONEC); hrbolkyNa(NAPLN_KONEC);
    displej(ZBYTEK_G, 'ustaleno');
    vahaText.textContent = `+${ZBYTEK_G} g`;
  }

  function animujVyklopeni(cas) {
    const t = (cas - vyklopeniStart) / 1000;
    if (t < 0) return;
    talir.visible = true;
    talirPoloha(clamp01(t / 0.9));
    /* jídlo sjede z talíře a padá do kbelíku (parabola), postupně */
    const cilY = KBELIK_Y + 0.02 + NAPLN_KONEC;
    jidlo.forEach((j, n) => {
      const s = 0.85 + n * 0.08, u = clamp01((t - s) / 0.65);
      if (u <= 0) { j.m.visible = true; j.m.position.copy(j.start); return; }
      if (u >= 1) { j.m.visible = false; return; }
      /* přepočet do světa: z polohy na talíři k cíli v kbelíku */
      const zac = talir.localToWorld(j.start.clone());
      const cil = new THREE.Vector3(Math.sin(n * 2.1) * 0.12, cilY, Math.cos(n * 2.1) * 0.12);
      const p = zac.clone().lerp(cil, u);
      p.y = zac.y + (cil.y - zac.y) * u * u + Math.sin(Math.PI * u) * 0.05;
      talir.worldToLocal(p);
      j.m.position.copy(p);
      j.m.rotation.x = j.startRot.x + u * 3;
      j.m.visible = true;
    });
    const naplnU = ease(clamp01((t - 1.1) / 0.6));
    const h = NAPLN_ZAC + (NAPLN_KONEC - NAPLN_ZAC) * naplnU;
    nastavNapln(h); hrbolkyNa(h);
    const gU = ease(clamp01((t - 1.1) / 0.9));
    displej(ZBYTEK_G * gU, gU >= 1 ? 'ustaleno' : '');
    vahaText.textContent = `+${Math.round(ZBYTEK_G * gU)} g`;
    if (t > 2.0) {
      const f = clamp01((t - 2.0) / 0.4);
      talir.position.y += f * 0.25;
      talir.scale.setScalar(1.2 * (1 - f * 0.999));
      if (f >= 1) { talir.visible = false; talir.scale.setScalar(1.2); vyklopeniStart = null; stavPoVyklopeni(); }
    }
  }

  function snimek(cas) {
    if (holdTime !== null) cas = holdTime;
    velikost();
    /* kamera plynule doplouvá k cíli kroku, k tomu jemné dýchání (bez omezení pohybu) */
    const cil = POHLEDY[Math.min(krok, POHLEDY.length - 1)];
    const k = REDUKCE ? 1 : 0.055;
    kamPoz.lerp(cil.poz, k);
    kamCil.lerp(cil.cil, k);
    const dych = REDUKCE ? 0 : Math.sin((cas - t0) / 2600) * 0.12;
    const poz = kamPoz.clone();
    const uhel = dych * 0.35 + tah + (OTOCNY && !REDUKCE ? Math.sin((cas-t0)/6000)*0.14 : 0);
    const dx=kamPoz.x-kamCil.x,dz=kamPoz.z-kamCil.z;
    poz.x = kamCil.x + dx * Math.cos(uhel) - dz * Math.sin(uhel);
    poz.z = kamCil.z + dx * Math.sin(uhel) + dz * Math.cos(uhel);
    kamera.position.copy(poz);
    kamera.lookAt(kamCil);

    if (vyklopeniStart !== null) animujVyklopeni(cas);

    /* záběr kamery (krok 1): kužel a kroužek, záblesk objektivu */
    const zaberCil = OTOCNY ? 0.45 : krok === 1 ? 1 : 0;
    zaber.material.opacity += (zaberCil * 0.14 - zaber.material.opacity) * 0.1;
    zaberKruh.material.opacity += (zaberCil * 0.9 - zaberKruh.material.opacity) * 0.1;
    if (fotoStart !== null) {
      const f = (cas - fotoStart) / 1000;
      snimace.forEach(({light}) => { light.intensity = f < 0.5 ? Math.sin(Math.PI * clamp01(f / 0.5)) * 0.6 : 0; });
      if (f > 0.6) fotoStart = null;
    }

    /* štítky: projekce kotev do obrazovky */
    const vidim = OTOCNY ? {} : { vaha: krok === 2, foto: krok === 1, ai: krok >= 3 };
    for (const id in stitky) {
      const s = stitky[id];
      const p = s.bod.clone().project(kamera);
      s.e.style.left = ((p.x + 1) / 2 * sirka) + 'px';
      s.e.style.top = ((1 - p.y) / 2 * vyska) + 'px';
      s.e.classList.toggle('je', !!vidim[id]);
    }
    renderer.render(scena, kamera);
  }

  function smycka(cas) {
    if (!bezi) return;
    snimek(cas);
    raf = requestAnimationFrame(smycka);
  }

  const api = {
    start() { if (bezi) return; bezi = true; raf = requestAnimationFrame(smycka); },
    stop() { bezi = false; cancelAnimationFrame(raf); },
    krok(k, hned) {
      if (OTOCNY) return;
      const byl = krok;
      krok = k;
      if (k < 2) { vyklopeniStart=null;fotoStart=null;stavPredVyklopenim(); }
      else if (k === 2 && byl < 2 && !hned && !REDUKCE) { stavPredVyklopenim(); vyklopeniStart=performance.now()+300; }
      else { vyklopeniStart=null;stavPoVyklopeni(); }
      if (k === 1 && !hned && !REDUKCE) fotoStart=performance.now()+400;
      if (hned) { const c = POHLEDY[Math.min(k, POHLEDY.length - 1)]; kamPoz.copy(c.poz); kamCil.copy(c.cil); }
      if (!bezi) snimek(performance.now());
    },
    vykresli() { snimek(performance.now()); },
    transitionAnchor(hold) {
      if (hold && holdTime === null) holdTime = performance.now();
      if (!hold && holdTime !== null) { t0 += performance.now() - holdTime; holdTime = null; }
      [kbelik, vnitrek, napln, hrbolky].forEach(object => { object.visible = !hold; });
      snimek(performance.now());
      return screenBounds(kbelik, kamera, sirka, vyska);
    },
    transitionReveal() {
      [kbelik, vnitrek, napln, hrbolky].forEach(object => { object.visible = true; });
      snimek(performance.now());
    },
  };
  stavPredVyklopenim();
  // Titul ukazuje stejnou sestavu a talíř před vysypáním, bez simulace naměřeného výsledku.

  /* tažením myší se sestava otáčí (prezentující ji může před porotou natočit) */
  let tah = 0, tahZac = 0, x0 = 0, tahnu = false;
  kontejner.setAttribute('data-interaktivni', '');
  kontejner.style.cursor = 'grab';
  kontejner.addEventListener('pointerdown', e => { tahnu = true; x0 = e.clientX; tahZac = tah; kontejner.setPointerCapture(e.pointerId); kontejner.style.cursor = 'grabbing'; });
  kontejner.addEventListener('pointermove', e => { if (tahnu) tah = tahZac + (e.clientX - x0) * 0.006; });
  const pust = () => { tahnu = false; kontejner.style.cursor = 'grab'; };
  kontejner.addEventListener('pointerup', pust);
  kontejner.addEventListener('pointercancel', pust);
  return api;
}

function pripoj() {
  document.querySelectorAll('[data-model3d]').forEach(el => {
    if (el.__m3d) return;
    let api;
    try { api = postav(el); } catch (e) { console.warn('3D model se nepodařilo spustit:', e); return; }
    el.__m3d = api;
    const slajd = el.closest('.slajd');
    if (!slajd) { api.start(); return; }
    if (el.dataset.model3d === 'otocny') {
      slajd.addEventListener('vstup', () => api.start());
      slajd.addEventListener('krok', () => { if (slajd.classList.contains('aktivni')) api.start(); });
      slajd.addEventListener('odchod', () => api.stop());
      slajd.addEventListener('tisk', () => api.vykresli());
      if (slajd.classList.contains('aktivni')) api.start();
      return;
    }
    slajd.addEventListener('vstup', () => { api.krok(+(slajd.dataset.k || 0), true); api.start(); });
    slajd.addEventListener('krok', e => { api.krok(e.detail.k, e.detail.hned); if (slajd.classList.contains('aktivni')) api.start(); });
    slajd.addEventListener('odchod', () => api.stop());
    slajd.addEventListener('tisk', () => { api.krok(+(slajd.dataset.krok_tisk || 3), true); api.vykresli(); });
    if (slajd.classList.contains('aktivni')) { api.krok(+(slajd.dataset.k || 0), true); api.start(); }
  });
}
window.Model3D = { pripoj };
pripoj();
