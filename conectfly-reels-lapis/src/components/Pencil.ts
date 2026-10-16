import * as THREE from "three";

/**
 * Lápis sextavado apontado, gerado como superfície paramétrica (unidades = mm).
 *
 * Raio da superfície no ângulo θ e altura y (ponta em y = 0, corpo para +y):
 *   r(θ, y) = min( hex(θ), cone(y) )
 * - hex(θ): seção sextavada (apótema a), cantos levemente arredondados;
 * - cone(y): cone do apontador. Onde o cone corta o sextavado surge a borda
 *   "recortada" (scalloped) entre tinta e madeira, como num lápis real.
 * Regiões (grupos de material): 0 = laca do corpo, 1 = madeira, 2 = grafite.
 */
export type PencilOpts = {
  apothem?: number; // 3,5 mm → lápis de 7 mm entre faces
  coneLen?: number; // comprimento da parte apontada
  bodyLen?: number;
  leadR?: number; // raio do grafite
  tipR?: number; // raio da ponta (levemente gasta)
  seg?: number; // segmentos ao redor
};

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number) => {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) {
    s += amp * vnoise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
};

export function makePencilGeometry(o: PencilOpts = {}) {
  const a = o.apothem ?? 3.5;
  const coneLen = o.coneLen ?? 19;
  const bodyLen = o.bodyLen ?? 140;
  const leadR = o.leadR ?? 1.0;
  const tipR = o.tipR ?? 0.16;
  const SEG = o.seg ?? 288;
  const corner = a / Math.cos(Math.PI / 6);
  const coneMax = corner * 1.015; // o cone passa um pouco dos cantos → borda recortada

  const hexR = (th: number) => {
    const sector = Math.PI / 3;
    const phi = ((((th % sector) + sector) % sector) - sector / 2);
    const r = a / Math.cos(phi);
    return Math.min(r, corner * 0.985); // cantos levemente arredondados
  };
  const coneR = (y: number) => {
    if (y >= coneLen) return Infinity;
    const lin = tipR + (coneMax - tipR) * (y / coneLen);
    // ponta arredondada nos primeiros décimos de milímetro
    return y < tipR ? Math.max(0.0005, tipR * Math.sqrt(Math.max(0, y) / tipR)) : lin;
  };

  // anéis ao longo do eixo: muito densos na ponta (macro) e espaçados no corpo
  const ys: number[] = [];
  for (let i = 0; i <= 60; i++) ys.push(Math.pow(i / 60, 2) * 1.2); // 0 → 1,2 mm
  for (let i = 1; i <= 260; i++) ys.push(1.2 + (i / 260) * (coneLen + 2 - 1.2));
  for (let i = 1; i <= 40; i++) ys.push(coneLen + 2 + (i / 40) * (bodyLen - coneLen - 2));

  const rows = ys.length;
  const cols = SEG + 1;
  const pos = new Float32Array(rows * cols * 3);
  const col = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  const region = new Uint8Array(rows * cols);

  const lacquer = new THREE.Color("#0b0d12");
  const woodA = new THREE.Color("#c99360");
  const woodB = new THREE.Color("#7e4620");
  const lead = new THREE.Color("#2b2c31");
  const tmp = new THREE.Color();

  for (let r = 0; r < rows; r++) {
    const y = ys[r];
    for (let c = 0; c < cols; c++) {
      const th = (c / SEG) * Math.PI * 2;
      const h = hexR(th);
      const cr = coneR(y);
      const rad = Math.min(h, cr);
      const k = r * cols + c;
      pos[k * 3] = Math.cos(th) * rad;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = Math.sin(th) * rad;
      uv[k * 2] = c / SEG;
      uv[k * 2 + 1] = y / bodyLen;
      let reg = 0;
      if (cr < h) reg = cr <= leadR ? 2 : 1;
      region[k] = reg;
      if (reg === 1) {
        // veios do cedro: anéis cortados obliquamente pelo apontador + fibras longitudinais
        const ring = Math.sin(rad * 5.2 + fbm(th * 3, y * 0.25) * 4.0);
        const fiber = fbm(th * 40, y * 0.9) * 0.6 + fbm(th * 9, y * 0.12) * 0.4;
        const m = THREE.MathUtils.clamp(0.42 + 0.55 * ring * 0.5 + 0.9 * (fiber - 0.5), 0, 1);
        tmp.copy(woodA).lerp(woodB, m);
        // escurece levemente perto do grafite (cola/grafite impregnado)
        const nearLead = THREE.MathUtils.clamp(1 - (rad - leadR) / 0.35, 0, 1);
        tmp.lerp(lead, nearLead * 0.55);
      } else if (reg === 2) {
        const g = 0.85 + 0.3 * fbm(th * 25, y * 6);
        tmp.copy(lead).multiplyScalar(g);
      } else {
        const g = 0.92 + 0.12 * fbm(th * 2, y * 0.05);
        tmp.copy(lacquer).multiplyScalar(g);
      }
      col.set([tmp.r, tmp.g, tmp.b], k * 3);
    }
  }

  // índices separados por região (grupos de material)
  const groups: number[][] = [[], [], []];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < SEG; c++) {
      const i0 = r * cols + c, i1 = i0 + 1, i2 = i0 + cols, i3 = i2 + 1;
      const reg = Math.max(region[i0], region[i1], region[i2], region[i3]) === 2 ? 2 : region[i0] === 0 && region[i2] === 0 ? 0 : 1;
      groups[reg].push(i0, i2, i1, i1, i2, i3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  // índice único com os três grupos em sequência (sem spread: são ~600 mil índices)
  const index = new Uint32Array(groups.reduce((n, g) => n + g.length, 0));
  let start = 0;
  groups.forEach((g, i) => {
    index.set(g, start);
    geo.addGroup(start, g.length, i);
    start += g.length;
  });
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  return geo;
}

export function makePencilMaterials(env: THREE.Texture | null) {
  const paint = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.18, envMap: env, envMapIntensity: 0.9 });
  const wood = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.0, sheen: 0.4, sheenRoughness: 0.8, envMap: env, envMapIntensity: 0.35 });
  const graphite = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.55, envMap: env, envMapIntensity: 1.1 });
  return [paint, wood, graphite];
}
