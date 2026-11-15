/* A pele se acomoda à unha 3D (07/11). A unha é uma placa lisa (unha-extensao.js, formaDaUnha) e a pele escaneada
   tinha calombos que furavam a unha ou deixavam fresta. Aqui, só na direção da normal de cada unha:
     - DENTRO do contorno da unha a pele desce para logo abaixo da face de baixo da unha (nunca atravessa);
       perto da borda (laterais e cutícula) ela encosta exatamente nessa face, sem vão visível de lado;
     - na DOBRA em volta (cutícula e laterais) a pele sobe ou desce suavemente até a altura da borda da unha,
       como a prega de pele que abraça a unha; a influência some com a distância e com a diferença de altura
       (a lateral do dedo, bem mais baixa, não é puxada);
     - na ponta livre nada encosta: a polpa só desce se estiver acima da unha.
   UVs, índices e tudo fora dessas faixas ficam intactos. Funciona igual na mão leve e na HD (mesmo espaço do objeto). */
import { UNHAS } from './unhas.js';
import { formaDaUnha } from './unha-extensao.js';

export const PERFIS_PELE = UNHAS.map((u) => ({ nome: u.nome }));
const FORMAS = UNHAS.map((_, i) => formaDaUnha(i));
const EPS = 0.012;     // a pele fica esta fração de hu abaixo da face de baixo da unha
const BANDA = 0.18;    // faixa (em hv) dentro da borda em que a pele encosta na unha
const DOBRA = 0.45;    // largura da dobra em volta (em hv)
const LISA = 0.14;     // faixa rente à borda (em hv) em que a pele é inteiramente a prega lisa
const ROLO = 0.8;      // distância (em hv) em que a prega lateral em rolo termina
const DESCE = 0.3;     // quanto o rolo cai nessa distância (fração de hu)
const PROX = 0.06;     // altura do rolo de pele do lado de CIMA da unha (fração de hu)
const PROX_L = 0.42;   // largura (em hv) desse rolo, a partir da borda da unha
const PREGA = 0;       // quanto a prega sobe acima da borda da unha (fração de hu): 0 = a borda lisa da unha é o contorno visível
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ---------- PONTA DO DEDO ----------
   No escaneamento a polpa do dedo termina em ~0,62 hu; dali para a frente a malha é só a CASCA fina da unha
   amendoada original (a "unha sobrando"), que aparecia além da unha 3D curta como aba e garra.
   A casca é eliminada: cada vértice dela é recolhido sobre uma CALOTA (meio elipsoide) que fecha a polpa logo à
   frente, com a largura e a altura da própria polpa medidas na malha. A projeção sai do centro da polpa, então a
   casca vira a frente arredondada do dedo, sem dobra. Medidas em hu (a, h) e hv (b). */
const PONTA = { aCorte: 0.4, redondo: 0.9, baixo: -0.8, medir: [0.48, 0.6], entra: 0.12,
  encolhe: 1,
  desce: 0.045 };

function medirPolpa(pos, F) {
  const { hu, hv } = F, P = PONTA, c = F.c, u = F.u, v = F.v, n = F.n;
  let b0 = Infinity, b1 = -Infinity, h0 = Infinity, h1 = -Infinity;
  for (let q = 0; q < pos.length; q += 3) {
    const dx = pos[q] - c[0], dy = pos[q + 1] - c[1], dz = pos[q + 2] - c[2];
    const a = (dx * u[0] + dy * u[1] + dz * u[2]) / hu;
    if (a < P.medir[0] || a > P.medir[1]) continue;
    const b = (dx * v[0] + dy * v[1] + dz * v[2]) / hv;
    if (Math.abs(b) > 1.45) continue;
    const h = (dx * n[0] + dy * n[1] + dz * n[2]) / hu;
    if (h < -1.7 || h > 0.6) continue;
    b0 = Math.min(b0, b); b1 = Math.max(b1, b); h0 = Math.min(h0, h); h1 = Math.max(h1, h);
  }
  if (!isFinite(b0)) return null;
  const W = (b1 - b0) / 2;
  /* comprimento da calota proporcional à meia largura do dedo (em hu): a ponta sai em meia-lua vista de cima;
     com comprimento fixo o dedo largo (polegar) terminava reto */
  const calota = PONTA.encolhe * Math.min(0.38, Math.max(0.32, PONTA.redondo * W * hv / hu));
  return { cb: (b0 + b1) / 2, W, ch: (h0 + h1) / 2, H: (h1 - h0) / 2, calota };
}

/* ---------- DEDÃO MENOS INCHADO ----------
   O escaneamento deixa a ponta do polegar gorda e larga (balão) em volta da unha. A seção do dedo, da junta até a
   ponta, é encolhida em volta do eixo medido (largura em b, espessura em h), mais forte perto da ponta e sumindo
   em direção à junta, e só dentro da seção do polegar (o vizinho não é puxado). Tem de rodar ANTES de moldarPontas
   (que mede a polpa) e a pele se acomoda à unha depois. */
const AFINA = { larg: 0.11, esp: 0.07 };
function afinarDedo(pos, pesos) {
  const F = FORMAS[0], M = medirPolpa(pos, F);
  if (!M) return;
  const { hu, hv, c, u, v, n } = F, nV = pos.length / 3;
  for (let q = 0; q < nV; q++) {
    const o = q * 3, dx = pos[o] - c[0], dy = pos[o + 1] - c[1], dz = pos[o + 2] - c[2];
    const a = (dx * u[0] + dy * u[1] + dz * u[2]) / hu;
    if (a < -1.8 || a > 1.4) continue;
    const B = (dx * v[0] + dy * v[1] + dz * v[2]) / hv, db = B - M.cb;
    if (Math.abs(db) > 1.9) continue;
    const H = (dx * n[0] + dy * n[1] + dz * n[2]) / hu, dh = H - M.ch;
    if (Math.abs(dh / M.H) > 1.9) continue;
    const k = smooth(-1.8, -0.3, a) * (1 - smooth(1.0, 1.4, a)) * (1 - smooth(1.5, 1.9, Math.abs(db))) * (1 - smooth(1.5, 1.9, Math.abs(dh / M.H)));
    if (k <= 0) continue;
    const dB = -db * AFINA.larg * k * hv, dH = -dh * AFINA.esp * k * hu;
    for (let t = 0; t < 3; t++) pos[o + t] += v[t] * dB + n[t] * dH;
    pesos[q] = Math.max(pesos[q], k);
  }
}

/* mínimo suave (sem quina) */
const sminSuave = (x, y, k) => -k * Math.log(Math.exp(-x / k) + Math.exp(-y / k));

/* recolhe a casca das cinco pontas em pos (no lugar); devolve o peso da mudança por vértice */
function moldarPontas(pos) {
  const P = PONTA, nV = pos.length / 3, pesos = new Float32Array(nV);
  FORMAS.forEach((F) => {
    const M = medirPolpa(pos, F);
    if (!M) return;
    F._polpa = M;
    const { hu, hv } = F, c = F.c, u = F.u, v = F.v, n = F.n;
    for (let q = 0; q < nV; q++) {
      const o = q * 3;
      const dx = pos[o] - c[0], dy = pos[o + 1] - c[1], dz = pos[o + 2] - c[2];
      const a = (dx * u[0] + dy * u[1] + dz * u[2]) / hu;
      if (a <= P.aCorte - P.entra || a > 1.3) continue;
      const B = (dx * v[0] + dy * v[1] + dz * v[2]) / hv;
      const H = (dx * n[0] + dy * n[1] + dz * n[2]) / hu;
      const xa = Math.max(0, a - P.aCorte) / M.calota, xb = (B - M.cb) / M.W, xh = (H - M.ch) / M.H;
      if (Math.abs(xb) > 1.6 || Math.abs(xh) > 1.6) continue; // não é deste dedo
      const r = Math.hypot(xa, xb, xh);
      if (r < 1e-6) continue;
      /* ponto da calota na direção do vértice, visto do centro da polpa */
      const aN = P.aCorte + (xa / r) * M.calota, bN = M.cb + (xb / r) * M.W;
      /* o topo da calota fica abaixo do plano da unha por um mínimo SUAVE: sem isso a regra que impede a pele de
         atravessar a unha cortava o topo reto, num platô de cantos quadrados */
      const teto = F.surf(aN * hu, bN * hv) / hu - PONTA.desce;
      const hN = sminSuave(M.ch + (xh / r) * M.H, teto, 0.06);
      /* só a metade de CIMA (a casca da unha antiga); a parte de baixo do dedo fica como no original */
      const t = smooth(P.aCorte - P.entra, P.aCorte + P.entra, a) * smooth(P.baixo, P.baixo + 0.35, xh);
      const da = (aN - a) * t * hu, db = (bN - B) * t * hv, dh = (hN - H) * t * hu;
      for (let k = 0; k < 3; k++) pos[o + k] += u[k] * da + v[k] * db + n[k] * dh;
      pesos[q] = Math.max(pesos[q], t);
    }
  });
  return pesos;
}

/* Alisa a ponta (Taubin: passo que suaviza + passo que devolve o volume): as lâminas finas que sobram da garra
   antiga (bordas da unha amendoada) encolhem para dentro da polpa e a ponta fica redonda. Só nos vértices da
   ponta, com peso que entra aos poucos; vértices repetidos nas costuras de UV andam juntos. */
function alisar(pos, indices, pesoDe, pesosOut, passos) {
  if (!indices) return;
  const nV = pos.length / 3;
  const grupo = new Int32Array(nV), chave = new Map(), rep = [];
  for (let q = 0; q < nV; q++) {
    const k = `${Math.round(pos[q * 3] * 1e6)},${Math.round(pos[q * 3 + 1] * 1e6)},${Math.round(pos[q * 3 + 2] * 1e6)}`;
    let g = chave.get(k);
    if (g === undefined) { g = rep.length; chave.set(k, g); rep.push(q); }
    grupo[q] = g;
  }
  const nG = rep.length, peso = new Float32Array(nG);
  for (let g = 0; g < nG; g++) { const o = rep[g] * 3; peso[g] = pesoDe(pos[o], pos[o + 1], pos[o + 2]); }
  const viz = Array.from({ length: nG }, () => []);
  for (let t = 0; t < indices.length; t += 3) {
    const g = [grupo[indices[t]], grupo[indices[t + 1]], grupo[indices[t + 2]]];
    for (let i = 0; i < 3; i++) {
      const x = g[i], y = g[(i + 1) % 3];
      if (x === y || (!peso[x] && !peso[y])) continue;
      if (!viz[x].includes(y)) viz[x].push(y);
      if (!viz[y].includes(x)) viz[y].push(x);
    }
  }
  const P3 = new Float64Array(nG * 3);
  for (let g = 0; g < nG; g++) for (let k = 0; k < 3; k++) P3[g * 3 + k] = pos[rep[g] * 3 + k];
  const ativos = []; for (let g = 0; g < nG; g++) if (peso[g] > 0 && viz[g].length) ativos.push(g);
  const novo = new Float64Array(ativos.length * 3);
  for (let it = 0; it < passos * 2; it++) {
    const f = it % 2 ? -0.53 : 0.5;
    ativos.forEach((g, j) => {
      const vz = viz[g];
      for (let k = 0; k < 3; k++) {
        let m = 0; for (const y of vz) m += P3[y * 3 + k];
        novo[j * 3 + k] = P3[g * 3 + k] + f * peso[g] * (m / vz.length - P3[g * 3 + k]);
      }
    });
    ativos.forEach((g, j) => { for (let k = 0; k < 3; k++) P3[g * 3 + k] = novo[j * 3 + k]; });
  }
  for (let q = 0; q < nV; q++) {
    const g = grupo[q];
    if (!(peso[g] > 0) || !viz[g].length) continue;
    for (let k = 0; k < 3; k++) pos[q * 3 + k] = P3[g * 3 + k];
    pesosOut[q] = Math.max(pesosOut[q], peso[g]); // as normais desses vértices também são recalculadas
  }
}

/* peso do alisamento da PONTA (Taubin): a casca recolhida vira polpa redonda */
function pesoPonta(x, y, z) {
  const P = PONTA;
  let w = 0;
  for (const F of FORMAS) {
    const dx = x - F.c[0], dy = y - F.c[1], dz = z - F.c[2];
    const a = (dx * F.u[0] + dy * F.u[1] + dz * F.u[2]) / F.hu;
    if (a < P.aCorte - 0.15 || a > 1.3) continue;
    const b = (dx * F.v[0] + dy * F.v[1] + dz * F.v[2]) / F.hv;
    const h = (dx * F.n[0] + dy * F.n[1] + dz * F.n[2]) / F.hu;
    if (Math.abs(b) > 1.6 || h < -1.8 || h > 0.7) continue;
    const M = F._polpa, xh = M ? (h - M.ch) / M.H : 1;
    w = Math.max(w, smooth(P.aCorte - 0.15, P.aCorte + 0.02, a) * smooth(P.baixo - 1.3, P.baixo - 0.15, xh)); // inclui a emenda com a parte de baixo original
  }
  return w;
}

/* peso do alisamento das DOBRAS em volta da unha (cutícula e laterais): tira as pelinhas e rebarbas que o
   escaneamento deixou no contorno da unha antiga. Faixa de -0,1 a 0,7 hv do contorno, só na pele de cima. */
function pesoDobra(x, y, z) {
  let w = 0;
  for (const F of FORMAS) {
    const { hu, hv } = F;
    const dx = x - F.c[0], dy = y - F.c[1], dz = z - F.c[2];
    const a = (dx * F.u[0] + dy * F.u[1] + dz * F.u[2]);
    if (a < F.aC - 0.8 * hv || a > 0.75 * hu) continue;
    const b = (dx * F.v[0] + dy * F.v[1] + dz * F.v[2]);
    if (Math.abs(b) > 1.9 * hv) continue;
    const h = (dx * F.n[0] + dy * F.n[1] + dz * F.n[2]);
    const s = F.surf(a, b);
    if (h < s - 0.45 * hu || h > s + 0.3 * hu) continue;
    const d = F.borda(a, b).d;
    w = Math.max(w, smooth(-0.15 * hv, -0.02 * hv, d) * (1 - smooth(0.45 * hv, 0.75 * hv, d))
      * (1 - smooth(0.5 * hu, 0.75 * hu, a)) * (1 - smooth(0.25 * hu, 0.45 * hu, Math.abs(h - s))));
  }
  return w;
}

/* peso do alisamento do rolo do lado de CIMA da unha: tira o aspecto rasgado do escaneamento e arredonda o rolo */
function pesoCima(x, y, z) {
  let w = 0;
  for (const F of FORMAS) {
    const { hu, hv } = F;
    const dx = x - F.c[0], dy = y - F.c[1], dz = z - F.c[2];
    const a = dx * F.u[0] + dy * F.u[1] + dz * F.u[2];
    if (a < -0.7 * hu || a > 0.95 * hu) continue;
    const b = dx * F.v[0] + dy * F.v[1] + dz * F.v[2];
    if (b - F.centro(a) < 0 || b > 2.6 * hv) continue;
    const h = dx * F.n[0] + dy * F.n[1] + dz * F.n[2];
    const s = F.surf(a, b);
    if (h < s - 0.35 * hu || h > s + 0.3 * hu) continue;
    const d = F.borda(a, b).d;
    w = Math.max(w, smooth(0.1 * hv, 0.22 * hv, d) * (1 - smooth(0.9 * hv, 1.5 * hv, d))
      * smooth(-0.6 * hu, -0.25 * hu, a) * (1 - smooth(0.6 * hu, 0.9 * hu, a)));
  }
  return w;
}

/* meia largura relativa da ponta da unha rente em a (1 = corpo inteiro; arco até 0,72 hu, onde ela termina) */
function arcoRente(F, a) {
  /* mesma conta de aForma em unha-extensao.js para a unha rente (ponta em 0,72 hu): no polegar, largo, o arco começa
     bem antes que nos outros dedos */
  const aP = 0.72 * F.hu, W = F.largura(0.3 * F.hu);
  const aF = Math.min(0.55 * F.hu, aP - Math.max(0.25 * F.hu, 0.9 * W));
  const x = Math.min(1, Math.max(0, (a - aF) / (aP - aF)));
  return Math.sqrt(1 - x * x);
}

/* nova altura (no quadro da unha) para um ponto da pele; peso = quanto mudou (0 = intacto) */
function acomodar(F, a, b, h) {
  const { hu, hv } = F;
  if (a < F.aC - DOBRA * hv - 0.05 * hu || a > 0.9 * hu || Math.abs(b) > 1.6 * hv) return null;
  const { d, ae, be } = F.borda(a, b);
  if (d > Math.max(DOBRA, ROLO) * hv) return null;
  const s = F.surf(a, b);
  if (h < s - 0.5 * hu || h > s + 0.6 * hu) return null; // polpa, outro lado do dedo ou outro dedo
  /* dobras só na base e nas laterais (a ponta é livre); na parte que vira o arco da unha curta não há dobra
     encostando, senão os cantos dessa faixa ficam como abas ao lado da ponta da unha */
  /* a pele encosta na borda da unha ao longo de TODA a lateral, até onde a unha rente termina (antes só até 0,45 hu e
     ficava um vão escuro entre a unha e a pele na lateral, onde a pele passa da unha); a altura que ela sobe para
     fechar o vão é limitada por mesmaAltura (a lateral muito mais baixa do dedo não é puxada) */
  const lado = (1 - smooth(0.6 * hu, 0.9 * hu, a)) * (1 - smooth(0.85, 1, 1 - arcoRente(F, a) + 0.85));
  if (d < 0) {
    if (a > 0.95 * hu) return null;
    const alvo = s - EPS * hu;
    /* embaixo da borda livre da unha curta (até o fim da rente, 0,72 hu) a polpa sobe e encosta na unha: sem vão
       entre a unha e o dedo; só o topo do dedo (não a polpa de baixo) e só longe das laterais da ponta moldada */
    const juncao = smooth(0.3 * hu, 0.45 * hu, a) * (1 - smooth(0.58 * hu, 0.9 * hu, a))
      * smooth(0.2 * hv, 0.4 * hv, -d) * (1 - smooth(0.12 * hu, 0.6 * hu, alvo - h))
      /* só dentro da ponta ARREDONDADA da unha rente (o contorno do corpo é reto: os cantos ficavam de fora, como aba) */
      * (1 - smooth(arcoRente(F, a) - 1.0, arcoRente(F, a) - 0.4, Math.abs(b - F.centro(a)) / F.largura(a)));
    const encosta = Math.max((1 - smooth(0, BANDA * hv, -d)) * lado, juncao);
    let novo = Math.min(h, alvo);
    novo += (alvo - novo) * encosta;
    return novo === h ? null : { h: novo, peso: 1 };
  }
  /* dobra: rente à borda a pele fica numa faixa LISA definida (encosta na borda da unha, na altura do meio da
     parede fina, logo abaixo da quina, para a borda lisa da unha ser o contorno visível); depois volta à pele original. A faixa lisa tira o rebordo
     rasgado que o escaneamento tinha em volta da unha. */
  /* ROLO (anatomia: a prega lateral da unha é uma parede de pele em rolo que abraça a placa e, na ponta, morre suave
     no hiponíquio e na polpa, sem quina): a pele que passa de um quarto de círculo saindo da borda da unha (cai
     DESCE·hu até ROLO·hv de distância) é rebaixada até esse perfil. Só vale da metade da unha para a ponta; a prega
     proximal (cutícula) segue a faixa lisa de sempre. */
  const t = Math.min(1, d / (ROLO * hv));
  const rolo = F.surf(ae, be) - 0.006 * hu - DESCE * hu * (1 - Math.sqrt(1 - t * t)) * smooth(0.25 * hu, 0.5 * hu, a);
  if (h > rolo) {
    /* o rolo some devagar até 0,9 hu (onde acomodar para): sem isso a pele rebaixada deixava um degrau/vão no canto */
    const w2 = (1 - smooth(0.7 * ROLO * hv, ROLO * hv, d)) * (1 - smooth(0.5 * hu, 0.9 * hu, a));
    if (w2 <= 0) return null;
    return { h: h + (rolo - h) * w2, peso: w2 };
  }
  /* rolo de pele arredondado do lado de CIMA da unha (b > 0, o lado que fica para cima na vista da mão), onde a pele
     passa da unha: a pele sobe um pouco acima da borda e volta à pele, em sino (zero na borda: não cobre a placa),
     e some para a cutícula e para a ponta. Mesmo tratamento da prega que ficou boa na cutícula. */
  const cima = smooth(0, 0.15 * hv, b - F.centro(a));
  const ao = smooth(-0.55 * hu, -0.1 * hu, a) * (1 - smooth(0.6 * hu, 0.88 * hu, a));
  const prox = cima * ao * smooth(0, 0.5 * PROX_L * hv, d) * (1 - smooth(0.5 * PROX_L * hv, PROX_L * hv, d));
  const alvo = F.surf(ae, be) - 0.006 * hu + PREGA * hu * smooth(0, LISA * hv, d) + PROX * hu * prox;
  const perto = 1 - smooth(LISA * hv, DOBRA * hv, d);
  /* pele ACIMA da borda (a prega da cutícula escaneada) sempre desce; pele muito ABAIXO é a lateral do dedo
     e não é puxada para cima */
  const mesmaAltura = h > alvo ? 1 : 1 - smooth(0.22 * hu, 0.5 * hu, alvo - h);
  const w = perto * mesmaAltura * (h > alvo ? 1 : lado); // acima da borda desce em qualquer ponto; subir, só na base e nas laterais
  if (w <= 0) return null;
  return { h: h + (alvo - h) * w, peso: w };
}

/* qual unha influencia o ponto (para validação): { peso, dedo } */
export function regiaoPele(x, y, z) {
  let melhor = { peso: 0, dedo: -1 };
  for (let i = 0; i < FORMAS.length; i++) { // laço sem alocação: roda para cada vértice da mão HD
    const F = FORMAS[i], c = F.c, u = F.u, v = F.v, n = F.n;
    const dx = x - c[0], dy = y - c[1], dz = z - c[2];
    const a = dx * u[0] + dy * u[1] + dz * u[2];
    if (a < -1.6 * F.hu || a > F.hu) continue; // longe desta unha: nem calcula o resto
    const b = dx * v[0] + dy * v[1] + dz * v[2];
    if (Math.abs(b) > 1.6 * F.hv) continue;
    const h = dx * n[0] + dy * n[1] + dz * n[2];
    const r = acomodar(F, a, b, h);
    if (r && r.peso > melhor.peso) melhor = { peso: r.peso, dedo: i, h0: h, h: r.h };
  }
  return melhor;
}

export function refinarPosicoesPele(original, indices) {
  /* 1) a ponta do dedo vira polpa arredondada; 2) a pele se acomoda à unha; 3) as dobras em volta são alisadas;
     4) acomoda de novo, para o alisamento não deixar pele por cima da unha */
  const nVert = original.length / 3;
  const pos = new Float32Array(original);
  const afinados = new Float32Array(nVert);
  afinarDedo(pos, afinados);
  const pesos = moldarPontas(pos);
  for (let q = 0; q < nVert; q++) if (afinados[q] > pesos[q]) pesos[q] = afinados[q];
  alisar(pos, indices, pesoPonta, pesos, 140);
  const contagem = UNHAS.map(() => 0);
  const acomodarTudo = (conta) => {
    for (let q = 0; q < nVert; q++) {
      const reg = regiaoPele(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]);
      if (!reg.peso) continue;
      const n = FORMAS[reg.dedo].n, delta = reg.h - reg.h0;
      for (let k = 0; k < 3; k++) pos[q * 3 + k] += n[k] * delta;
      pesos[q] = Math.max(pesos[q], reg.peso);
      if (conta) contagem[reg.dedo]++;
    }
  };
  acomodarTudo(true);
  alisar(pos, indices, pesoDobra, pesos, 10);
  acomodarTudo(false);
  alisar(pos, indices, pesoCima, pesos, 70);
  /* A unha escaneada tinha uma parede em volta (às vezes com rebaixo). Achatada na direção da normal, parte dos
     triângulos dessa parede fica deitada ao contrário: de frente sumiria (buraco) e nas normais vira ponto escuro.
     Esses triângulos têm a ordem dos vértices trocada, para olharem para fora como a pele em volta. */
  let idx = null, viradas = 0;
  if (indices) {
    idx = Uint32Array.from(indices);
    const cruz = (p, a, b, c) => {
      const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
      const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
      return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    };
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      if (!pesos[a] && !pesos[b] && !pesos[c]) continue;
      const n0 = cruz(original, a, b, c), n1 = cruz(pos, a, b, c);
      if (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] < 0) { idx[t + 1] = c; idx[t + 2] = b; viradas++; }
    }
  }
  /* segunda passada de orientação: triângulos de costas para a vizinhança (virados contra a média das normais dos três
     vértices) deixam fios/rachaduras escuros na pele quando a mão desenha os dois lados; viram para fora */
  if (idx) {
    const nvx = new Float32Array(nVert * 3);
    const face = (a, b, c) => {
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    };
    for (let t = 0; t < idx.length; t += 3) {
      const f = face(idx[t], idx[t + 1], idx[t + 2]);
      for (let k = 0; k < 3; k++) for (let m = 0; m < 3; m++) nvx[idx[t + k] * 3 + m] += f[m];
    }
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      if (!(pesos[a] || pesos[b] || pesos[c])) continue;
      const f = face(a, b, c);
      let s = 0;
      for (let m = 0; m < 3; m++) s += f[m] * (nvx[a * 3 + m] + nvx[b * 3 + m] + nvx[c * 3 + m]);
      if (s < 0) { idx[t + 1] = c; idx[t + 2] = b; viradas++; }
    }
  }
  return { pos, pesos, contagem, idx, viradas };
}

/* Vértices repetidos na mesma posição (costuras de UV) tinham normais diferentes: aparecia uma faceta clara solta
   (o "ponto" embaixo do dedão) e linhas de sombreado. Aqui cada grupo de vértices coincidentes recebe a média. */
function soldarNormais(geometry) {
  const pos = geometry.getAttribute('position').array, nor = geometry.getAttribute('normal');
  if (!nor) return;
  const a = nor.array, grupos = new Map();
  for (let q = 0; q < pos.length / 3; q++) {
    const k = `${Math.round(pos[q * 3] * 1e5)},${Math.round(pos[q * 3 + 1] * 1e5)},${Math.round(pos[q * 3 + 2] * 1e5)}`;
    const g = grupos.get(k);
    if (g) g.push(q); else grupos.set(k, [q]);
  }
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    let x = 0, y = 0, z = 0;
    for (const q of g) { x += a[q * 3]; y += a[q * 3 + 1]; z += a[q * 3 + 2]; }
    const l = Math.hypot(x, y, z);
    if (l < 1e-6) continue; // normais opostas: não é a mesma superfície, deixa como está
    x /= l; y /= l; z /= l;
    for (const q of g) { a[q * 3] = x; a[q * 3 + 1] = y; a[q * 3 + 2] = z; }
  }
  nor.needsUpdate = true;
}

export function refinarPeleGeometria(geometry) {
  if (geometry.userData.peleRefinada) return geometry.userData.peleRefinada;
  const position = geometry.getAttribute('position');
  const resultado = refinarPosicoesPele(position.array, geometry.index?.array);
  position.array.set(resultado.pos); position.needsUpdate = true;
  if (resultado.viradas) { geometry.index.array.set(resultado.idx); geometry.index.needsUpdate = true; }
  const normal = geometry.getAttribute('normal');
  const antigas = normal ? new Float32Array(normal.array) : null;
  geometry.computeVertexNormals();
  if (antigas) {
    const novas = geometry.getAttribute('normal');
    for (let q = 0; q < resultado.pesos.length; q++) {
      const w = resultado.pesos[q];
      if (!w) { novas.array.set(antigas.subarray(q * 3, q * 3 + 3), q * 3); continue; }
      const v = [0, 1, 2].map(k => antigas[q * 3 + k] * (1 - w) + novas.array[q * 3 + k] * w);
      const len = Math.hypot(...v) || 1;
      for (let k = 0; k < 3; k++) novas.array[q * 3 + k] = v[k] / len;
    }
    novas.needsUpdate = true;
  }
  soldarNormais(geometry);
  geometry.computeBoundingSphere();
  geometry.userData.peleRefinada = { contagem: resultado.contagem };
  return geometry.userData.peleRefinada;
}
