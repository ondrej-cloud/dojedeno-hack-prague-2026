/* Dojezeno · návrh pilotní sestavy (jeden pás, snímání talířů a samostatně vážený kbelík; volitelně tři patra) jako produktová fotka v prohlížeči.
   Kroky slajdu: 0 celek, 1 fotka na pásu, 2 přírůstek váhy při vysypání, 3 návrh přiřazení. Animace je ilustrativní.
   Připojení: prvek s atributem data-model3d uvnitř .slajd; poslouchá události slajdu 'vstup', 'krok', 'odchod', 'tisk'.
   Sestavuje se esbuildem do js/model3d.js (IIFE, funguje z file://). Bez sítě. */
import * as THREE from 'three';
import { screenBounds } from './projection.js';
import { RECEPTY, materialyJidel, geometrieJidel, obed } from './jidla.js';
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
  kontejner.dataset.modelVariant = TRI_PATRA ? 'three' : 'single';
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
  /* titul (OTOCNY) navazuje na úvodní film: kbelík přijede skoro plný a s jídlem na povrchu */
  const NAPLN_ZAC = OTOCNY ? 0.56 : 0.3, NAPLN_KONEC = 0.335;
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
  let zaber = null, zaberKruh = null;
  if (TRI_PATRA) {
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
  zaber=snimace[0].beam; zaberKruh=snimace[0].ring;
  // Shared data connection is schematic; it does not depict a proven matching algorithm.
  const spojeni=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(FOTO_X,0.10,PAS_Z-0.38),new THREE.Vector3(-0.65,0.08,-0.50),new THREE.Vector3(0,0.08,-0.42)
  ]),24,0.006,8,false),new THREE.MeshStandardMaterial({color:0x248a3d,roughness:0.7}));
  sestava.add(spojeni);
  }

  /* Aktivní talíř je na jediném pásu, nebo prostředním patře záložního modelu. Přesun je ilustrativní. */
  const talir = new THREE.Group();
  const TALIR_ZAC = new THREE.Vector3(FOTO_X, PATRA[HLAVNI_PATRO] + 0.045, PAS_Z);
  const TALIR_START = TALIR_ZAC.clone();
  talir.scale.setScalar(1.2);
  scena.add(talir);
  const talirProfil = [
    new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.125, 0.012), new THREE.Vector2(0.17, 0.028),
    new THREE.Vector2(0.172, 0.034), new THREE.Vector2(0.165, 0.034), new THREE.Vector2(0.122, 0.018), new THREE.Vector2(0, 0.012),
  ];
  const talirMesh = stin(new THREE.Mesh(new THREE.LatheGeometry(talirProfil, 96), porcelan));
  talir.add(talirMesh);
  const jidlo = [];
  /* jídla jako v úvodním filmu (jidla.js), talíř je tu 1,25× větší; sledovaný talíř nese guláš s knedlíkem */
  const GEO_J = geometrieJidel(), MAT_J = materialyJidel();

  /* titul: na hladině zbytků leží skutečné kousky jídla, stejně jako na konci úvodního filmu */
  const hromadka = new THREE.Group();
  if (OTOCNY) {
    const DRUHY = ['kned', 'kned', 'maso', 'spagety', 'ryze', 'kase', 'kure', 'rizek', 'hrasek', 'mrkev', 'okurka', 'omacka', 'zeli', 'kned'];
    const nah = (() => { let x = 19; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
    for (let n = 0; n < 70; n++) {
      const druh = DRUHY[n % DRUHY.length];
      const m = stin(new THREE.Mesh(GEO_J[druh], MAT_J[druh]));
      const a = nah() * Math.PI * 2, d = Math.sqrt(nah()) * 0.27;
      m.position.set(Math.cos(a) * d, -nah() * 0.012, Math.sin(a) * d);
      m.rotation.set((nah() - 0.5) * 0.6, nah() * Math.PI * 2, (nah() - 0.5) * 0.4);
      m.scale.setScalar(1.25 * (druh === 'rizek' || druh === 'kase' || druh === 'ryze' ? 0.6 : 1));
      if (druh === 'zeli') m.rotation.x = 1.5;
      hromadka.add(m);
    }
    hromadka.position.y = KBELIK_Y + 0.02 + NAPLN_ZAC;
    hrbolky.visible = false;
  }
  sestava.add(hromadka);
  for (const m of [...obed(0, GEO_J, MAT_J).children]) {
    m.position.multiplyScalar(1.25); m.scale.multiplyScalar(1.25);
    talir.add(m);
    jidlo.push({ m, start: m.position.clone(), startRot: m.rotation.clone() });
  }
  /* kulisa: kopie talíře s dalším z obědů dokola */
  let dalsiObed = 1;
  const kulisa = () => {
    const k = talir.clone(true);
    k.children.slice(1).forEach(c => k.remove(c));
    k.add(obed(dalsiObed++ % RECEPTY.length, GEO_J, MAT_J, 1.25));
    return k;
  };

  // Každý pás nese jeden tác; pouze aktivní talíř ukazuje vysypání.
  if (TRI_PATRA) for (const [index,y] of PATRA.entries()) {
    const tray=stin(new THREE.Mesh(new RoundedBoxGeometry(0.49,0.024,0.40,4,0.015),tacekMat));
    tray.position.set(FOTO_X,y+0.023,PAS_Z);scena.add(tray);
    if (index!==HLAVNI_PATRO) {
      const plate=kulisa();plate.position.set(FOTO_X,y+0.045,PAS_Z);
      plate.rotation.y=index===0?0.35:-0.35;scena.add(plate);
    }
  }

  /* Jeden otočný pás (karusel) jako v jídelně: tácy jedou dokola. Polovina smyčky je v jídelně (žáci odkládají tácy),
     za zdí s okénkem je myčka (kuchařka tácy odebírá). Kamera visí nad místem odběru, vedle stojí kbelík na váze.
     Krok 1: pás 3 s veze tác k odběru, pak záblesk a fotka; krok 2: kuchařka vezme talíř a vysype ho; krok 3: spojení podle pořadí. */
  const KAR = { Y: PATRA[0], XC: -1.72, ZC: -0.02, L: 1.30, R: 0.42, PASKA: 0.30 };
  const OBVOD = 2 * KAR.L + 2 * Math.PI * KAR.R;
  const S_ODBER = KAR.L + Math.PI * KAR.R / 2, S_ZAC = 0.10, S_FOTO = KAR.L / 2 + 0.32;  /* odběr = vrchol oblouku u kbelíku, foto za jízdy */
  let vyfoceno = false;
  const tacky = [];
  let pasB = S_ZAC, pasAnim = null;
  function bodPasu(s) {
    const { XC, ZC, L, R } = KAR;
    s = ((s % OBVOD) + OBVOD) % OBVOD;
    const oblouk = Math.PI * R;
    if (s < L) return { x: XC - L / 2 + s, z: ZC + R, dx: 1, dz: 0 };
    s -= L;
    if (s < oblouk) { const u = s / R, a = Math.PI / 2 - u; return { x: XC + L / 2 + R * Math.cos(a), z: ZC + R * Math.sin(a), dx: Math.sin(a), dz: -Math.cos(a) }; }
    s -= oblouk;
    if (s < L) return { x: XC + L / 2 - s, z: ZC - R, dx: -1, dz: 0 };
    s -= L;
    const u = s / R, a = -Math.PI / 2 - u; return { x: XC - L / 2 + R * Math.cos(a), z: ZC + R * Math.sin(a), dx: Math.sin(a), dz: -Math.cos(a) };
  }
  if (!TRI_PATRA) {
    const { Y, XC, ZC, L, R, PASKA } = KAR;
    const stadion = (r) => { const sh = new THREE.Shape(); sh.absarc(XC + L / 2, -ZC, r, -Math.PI / 2, Math.PI / 2, false); sh.absarc(XC - L / 2, -ZC, r, Math.PI / 2, Math.PI * 1.5, false); sh.closePath(); return sh; };
    const tela = new THREE.ExtrudeGeometry(stadion(R + PASKA / 2 + 0.05), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 48 });
    const telo = stin(new THREE.Mesh(tela, nerez)); telo.rotation.x = -Math.PI / 2; telo.position.y = Y - 0.14; pasy.add(telo);
    const prstenec = stadion(R + PASKA / 2); prstenec.holes.push(stadion(R - PASKA / 2));
    const paska = new THREE.Mesh(new THREE.ExtrudeGeometry(prstenec, { depth: 0.02, bevelEnabled: false, curveSegments: 64 }), pasMat);
    paska.rotation.x = -Math.PI / 2; paska.position.y = Y - 0.012; paska.receiveShadow = true; pasy.add(paska);
    for (const okraj of [R + PASKA / 2 + 0.012, R - PASKA / 2 - 0.012]) {
      const body = []; for (let i = 0; i < 160; i++) { const b = bodPasu(i / 160 * OBVOD), nx = -b.dz, nz = b.dx, o = okraj - R; body.push(new THREE.Vector3(b.x + nx * o, Y + 0.018, b.z + nz * o)); }
      pasy.add(stin(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(body, true), 200, 0.011, 8, true), hlinik)));
    }
    for (let i = 0; i < 6; i++) { const b = bodPasu((i + 0.5) / 6 * OBVOD), nx = -b.dz, nz = b.dx; kvadr(0.05, Y - 0.14, 0.05, b.x - nx * 0.12, (Y - 0.14) / 2, b.z - nz * 0.12); kvadr(0.12, 0.03, 0.12, b.x - nx * 0.12, 0.016, b.z - nz * 0.12, grafit); }
    const sipka = new THREE.Shape(); sipka.moveTo(-0.06, -0.02); sipka.lineTo(0.0, -0.02); sipka.lineTo(0.0, -0.045); sipka.lineTo(0.065, 0); sipka.lineTo(0.0, 0.045); sipka.lineTo(0.0, 0.02); sipka.lineTo(-0.06, 0.02);
    const sipkaGeo = new THREE.ShapeGeometry(sipka), sipkaMat = new THREE.MeshBasicMaterial({ color: 0x76bca0, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) { const s0 = (i + 0.25) / 10 * OBVOD, b = bodPasu(s0); const m = new THREE.Mesh(sipkaGeo, sipkaMat); m.rotation.set(-Math.PI / 2, 0, Math.atan2(-b.dz, b.dx)); m.position.set(b.x, Y + 0.011, b.z); pasy.add(m); }
    /* zeď s okénky: vlevo jídelna, vpravo myčka; průsvitná, ať je vidět skrz */
    const zedMat = new THREE.MeshPhysicalMaterial({ color: 0xe6e8ec, roughness: 0.9, transparent: true, opacity: 0.55, depthWrite: false });
    const zed = (w, h, z, y) => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.05, h, w, 2, 0.01), zedMat); m.position.set(XC, y, z); pasy.add(m); };
    const Z0 = ZC - R - 0.95, Z1 = ZC + R + 0.95, HORNI = Y + 0.34, SPODNI = Y - 0.16, VYS = 2.05;
    zed(Z1 - Z0, VYS - HORNI, (Z0 + Z1) / 2, (HORNI + VYS) / 2);
    zed(Z1 - Z0, SPODNI, (Z0 + Z1) / 2, SPODNI / 2);
    zed(Z1 - (ZC + R + 0.24), HORNI - SPODNI, (Z1 + ZC + R + 0.24) / 2, (HORNI + SPODNI) / 2);
    zed((ZC - R - 0.24) - Z0, HORNI - SPODNI, (Z0 + ZC - R - 0.24) / 2, (HORNI + SPODNI) / 2);
    zed((ZC + R - 0.24) - (ZC - R + 0.24), HORNI - SPODNI, ZC, (HORNI + SPODNI) / 2);
    /* rám zdi a okének, ať je jasné, že pás prochází zdí */
    kvadr(0.055, 0.02, Z1 - Z0, XC, VYS, (Z0 + Z1) / 2, hlinik, 0.006);
    for (const zc of [ZC + R, ZC - R]) { kvadr(0.055, 0.02, 0.48, XC, HORNI, zc, hlinik, 0.006); }
    /* kamera Raspberry Pi nad místem odběru */
    const odber = bodPasu(S_FOTO), KX = odber.x, KZ = odber.z;
    kvadr(0.04, 0.62, 0.04, KX, Y + 0.31, KZ - 0.36, hlinik, 0.008);
    kvadr(0.03, 0.03, 0.40, KX, Y + 0.60, KZ - 0.18, hlinik, 0.008);
    const kam = new THREE.Group(); kam.position.set(KX, Y + 0.57, KZ); pasy.add(kam);
    kam.add(stin(new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.05, 0.09, 4, 0.012), grafit)));
    const cocka = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 24), sklo); cocka.position.y = -0.03; kam.add(cocka);
    const svetlo = new THREE.PointLight(0xffffff, 0, 0.9, 2); svetlo.position.set(KX, Y + 0.50, KZ); pasy.add(svetlo);
    const kuzel = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 48, 1, true), beamMat); kuzel.position.set(KX, Y + 0.29, KZ); pasy.add(kuzel);
    const kruh = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.004, 8, 64), ringMat); kruh.rotation.x = Math.PI / 2; kruh.position.set(KX, Y + 0.03, KZ); pasy.add(kruh);
    snimace.push({ beam: kuzel, ring: kruh, light: svetlo });
    zaber = kuzel; zaberKruh = kruh;
    /* tácy dokola; aktivní tác 0 nese talíř se zbytkem, ostatní talíře jsou jen kulisa */
    const POCET = 8;
    for (let i = 0; i < POCET; i++) {
      const t = stin(new THREE.Mesh(new RoundedBoxGeometry(0.40, 0.022, 0.30, 4, 0.014), tacekMat)); scena.add(t);
      const tal = i === 0 && !OTOCNY ? null : kulisa(); if (tal) { tal.scale.setScalar(1.05); scena.add(tal); }
      const obedTal = tal && tal.children[tal.children.length - 1];
      tacky.push({ t, tal, obedTal, obedZac: obedTal && obedTal.position.clone(), rozestup: i * OBVOD / POCET, predS: null, skok: null, naroste: null });
    }
  }
  /* titul (OTOCNY): talíře nemizí. U kbelíku (S_ODBER) jídlo skočí obloukem do kbelíku a talíř jede dál prázdný;
     nové jídlo dostane daleko vlevo za zdí (S_NOVE), kde nenápadně naroste. */
  const S_NOVE = 2 * KAR.L + 1.5 * Math.PI * KAR.R;
  const SKOK_S = 0.85, NAROST_S = 0.5;
  const pomV = new THREE.Vector3();
  function polozTacky(b, cas = performance.now()) {
    if (TRI_PATRA) return;
    for (const tk of tacky) {
      const s = b + tk.rozestup, p = bodPasu(s), uhel = Math.atan2(-p.dz, p.dx);
      tk.t.position.set(p.x, KAR.Y + 0.012, p.z); tk.t.rotation.y = uhel;
      if (tk.tal) {
        const sm = ((s % OBVOD) + OBVOD) % OBVOD;
        tk.tal.position.set(p.x, KAR.Y + 0.034, p.z); tk.tal.rotation.y = uhel + 0.4;
        if (!OTOCNY) {
          tk.tal.visible = !(sm > S_ODBER && sm < OBVOD - Math.PI * KAR.R * 0.55);
          continue;
        }
        tk.tal.visible = true;
        /* úsek za kbelíkem až po místo plnění = talíř je prázdný; podle polohy, ne jen podle průjezdu (robustní i při trhaném snímkování) */
        const zaKbelikem = sm >= S_ODBER && sm < S_NOVE;
        if (tk.predS === null && zaKbelikem) tk.obedTal.visible = false;  /* první snímek: tyhle talíře už jsou vysypané */
        tk.predS = sm;
        if (zaKbelikem && tk.obedTal.visible && !tk.skok) {
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 0.16;
          tk.skok = { start: cas, cil: new THREE.Vector3(Math.cos(a) * d, KBELIK_Y + 0.02 + NAPLN_ZAC + 0.03, Math.sin(a) * d) };
        }
        if (!zaKbelikem && !tk.obedTal.visible && !tk.skok) {
          tk.obedTal.visible = true; tk.obedTal.position.copy(tk.obedZac); tk.obedTal.rotation.set(0, 0, 0); tk.naroste = cas;
        }
        tk.tal.updateMatrixWorld(true);
        if (tk.skok) {
          const u = clamp01((cas - tk.skok.start) / 1000 / SKOK_S);
          const zac = tk.tal.localToWorld(tk.obedZac.clone());
          pomV.lerpVectors(zac, tk.skok.cil, easeIO(u));
          pomV.y = zac.y + (tk.skok.cil.y - zac.y) * u * u + Math.sin(Math.PI * u) * 0.32;
          tk.tal.worldToLocal(pomV);
          tk.obedTal.position.copy(pomV);
          tk.obedTal.rotation.set(u * 2.2, u * 1.4, 0);
          tk.obedTal.scale.setScalar(1.25 * (1 - 0.35 * u));
          if (u >= 1) { tk.obedTal.visible = false; tk.obedTal.scale.setScalar(1.25); tk.skok = null; }
        } else if (tk.naroste !== null) {
          const u = clamp01((cas - tk.naroste) / 1000 / NAROST_S);
          tk.obedTal.scale.setScalar(1.25 * Math.max(0.001, easeIO(u)));
          if (u >= 1) tk.naroste = null;
        }
      }
    }
    const p0 = bodPasu(b);
    TALIR_ZAC.set(p0.x, KAR.Y + 0.034, p0.z);
  }
  /* zelený kroužek kolem sledovaného talíře (jen u něj, ne u kulis) */
  const zvyrazneni = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.009, 10, 72), new THREE.MeshBasicMaterial({ color: 0x30d158 }));
  zvyrazneni.rotation.x = Math.PI / 2; zvyrazneni.position.y = 0.036; talir.add(zvyrazneni);
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
    { poz: new THREE.Vector3(1.55,3.45,5.35), cil: new THREE.Vector3(-1.25,0.55,-0.15) },
    { poz: new THREE.Vector3(1.20,2.85,4.35), cil: new THREE.Vector3(-1.00,0.72,0.05) },
    { poz: new THREE.Vector3(1.55,2.55,4.20), cil: new THREE.Vector3(-0.45,0.62,0.05) },
    { poz: new THREE.Vector3(1.55,3.45,5.35), cil: new THREE.Vector3(-1.25,0.55,-0.15) },
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
  if (TRI_PATRA) {
    stitek('foto', '<span class="tecka"></span>Talíř A · fotka + čas', new THREE.Vector3(FOTO_X, PATRA[PATRA.length - 1] + 0.37, PAS_Z));
    stitek('ai', 'Nejisté přiřazení → společná dávka', new THREE.Vector3(-1.10, 0.12, 0.62));
  } else {
    const o = bodPasu(S_FOTO);
    stitek('foto', '<span class="tecka"></span>Fotka talíře: <b class="o">co zbylo</b>', new THREE.Vector3(o.x, KAR.Y + 0.72, o.z));
    stitek('ai', '<span class="tecka"></span>Talíř 1 ↔ <b class="o">+150 g</b> · podle pořadí', new THREE.Vector3(0, KBELIK_Y + VYSKA + 0.16, 0));
    stitek('jidelna', 'Jídelna · <b>žáci odkládají tácy</b>', new THREE.Vector3(KAR.XC - 0.55, KAR.Y + 0.32, KAR.ZC + KAR.R + 0.30));
    stitek('mycka', 'Myčka · <b>kuchařka bere tácy</b>', new THREE.Vector3(KAR.XC + 0.75, KAR.Y + 0.50, KAR.ZC - KAR.R - 0.05));
  }
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
    talir.visible = !OTOCNY;  /* v titulu nese jídlo i tác 0 jako ostatní */
    zvyrazneni.visible = !OTOCNY && !TRI_PATRA;
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
    zvyrazneni.visible = false;
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

    if (!TRI_PATRA) {
      if (OTOCNY && !REDUKCE) { pasB = S_ZAC + ((cas - t0) / 1000) * 0.15; }
      else if (pasAnim) {
        /* plynulá jízda: krátký rozjezd a dojezd, jinak stálá rychlost; fotka v okamžiku průjezdu pod kamerou */
        const u = clamp01((cas - pasAnim.start) / pasAnim.dur);
        const TA = 0.15, TD = 0.15, VM = 1 / (1 - TA / 2 - TD / 2);
        const e = u < TA ? 0.5 * VM * u * u / TA : u < 1 - TD ? 0.5 * VM * TA + VM * (u - TA) : 1 - 0.5 * VM * (1 - u) * (1 - u) / TD;
        const predtim = pasB;
        pasB = pasAnim.from + (pasAnim.to - pasAnim.from) * Math.min(1, Math.max(0, e));
        if (!vyfoceno && predtim < S_FOTO && pasB >= S_FOTO) { vyfoceno = true; fotoStart = cas; }
        if (u >= 1) pasAnim = null;
      }
      polozTacky(pasB, cas);
      if (vyklopeniStart === null && talir.visible) { talirPoloha(0); talir.rotation.y = 0.4; }
    }
    if (vyklopeniStart !== null) animujVyklopeni(cas);

    /* záběr kamery (krok 1): kužel a kroužek, záblesk objektivu */
    const fotoTed = fotoStart !== null && cas - fotoStart < 900;
    const zaberCil = OTOCNY ? 0.45 : TRI_PATRA ? (krok === 1 ? 1 : 0) : (krok === 1 ? (fotoTed ? 1 : 0.3) : 0);
    zaber.material.opacity += (zaberCil * 0.14 - zaber.material.opacity) * 0.1;
    zaberKruh.material.opacity += (zaberCil * 0.9 - zaberKruh.material.opacity) * 0.1;
    if (fotoStart !== null) {
      const f = (cas - fotoStart) / 1000;
      snimace.forEach(({light}) => { light.intensity = f < 0.5 ? Math.sin(Math.PI * clamp01(f / 0.5)) * 0.6 : 0; });
      if (f > 0.6) fotoStart = null;
    }

    /* štítky: projekce kotev do obrazovky */
    const vidim = OTOCNY ? {} : TRI_PATRA ? { vaha: krok === 2, foto: krok === 1, ai: krok >= 3 }
      : { foto: true };  /* jeden pás: celou dobu jen „Fotka talíře: co zbylo“, ostatní popisky jsou vpravo na slajdu */
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
      if (!TRI_PATRA) {
        pasAnim = null;
        if (k === 0) { pasB = S_ZAC; vyfoceno = false; }
        else if (k === 1 && byl < 1 && !hned && !REDUKCE) { pasB = S_ZAC; vyfoceno = false; pasAnim = { start: performance.now() + 250, from: S_ZAC, to: S_ODBER, dur: 3400 }; }
        else { pasB = S_ODBER; vyfoceno = true; }
        polozTacky(pasB);
      }
      if (k < 2) { vyklopeniStart=null;fotoStart=null;stavPredVyklopenim(); }
      else if (k === 2 && byl < 2 && !hned && !REDUKCE) { stavPredVyklopenim(); vyklopeniStart=performance.now()+300; }
      else { vyklopeniStart=null;stavPoVyklopeni(); }
      if (TRI_PATRA && k === 1 && !hned && !REDUKCE) fotoStart=performance.now()+400;
      if (hned) { const c = POHLEDY[Math.min(k, POHLEDY.length - 1)]; kamPoz.copy(c.poz); kamCil.copy(c.cil); }
      if (!bezi) snimek(performance.now());
    },
    vykresli() { snimek(performance.now()); },
    transitionAnchor(hold) {
      if (hold && holdTime === null) holdTime = performance.now();
      if (!hold && holdTime !== null) { t0 += performance.now() - holdTime; holdTime = null; }
      [kbelik, vnitrek, napln, hrbolky, hromadka].forEach(object => { object.visible = !hold; });
      if (OTOCNY) hrbolky.visible = false;
      snimek(performance.now());
      return screenBounds(kbelik, kamera, sirka, vyska);
    },
    transitionReveal() {
      [kbelik, vnitrek, napln, hromadka].forEach(object => { object.visible = true; });
      hrbolky.visible = !OTOCNY;
      snimek(performance.now());
    },
  };
  polozTacky(pasB);
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
