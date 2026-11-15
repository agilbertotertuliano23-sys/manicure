/* Geometria da unha 3D inteira (cutícula até a ponta), sem depender do three.js para poder ser
   conferida em Node/Blender.

   Unha NATURAL e LIMPA (07/11): a unha não copia mais o relevo da pele escaneada (que tinha calombos e deixava a
   unha ondulada). A superfície é uma placa LISA por dedo, ajustada por mínimos quadrados à pele medida
   (unhas-superficie.js) só na parte plana do leito, e depois da ponta do dedo segue a tangente da placa, quase reta.
   Quem se acomoda é a PELE (pele-unhas.js, com formaDaUnha): por baixo da unha ela desce, e em volta (dobras da
   cutícula e laterais) ela encosta na borda da unha. Assim não há fresta, nem pele furando a unha, nem ondas.

     - contorno: arco da cutícula em superelipse (U achatado, como a lúnula), laterais quase paralelas que abrem
       um pouco para a ponta, e a ponta no formato escolhido (larguraRelativa, unhas-tipos.js);
     - espessura do serviço (unhas-tipos.js, perfil): esmalte fino, gel cheio, ápice no ponto de tensão,
       borda livre mais fina ou mais grossa, curva C na ponta livre; fina na cutícula;
     - borda com quina arredondada (a espessura cai perto do contorno), como unha lixada.
   O quadro de cada unha vem de unhas.js: c = centro, u = rumo da ponta, v = largura, n = normal.
   gerarUnha(i, formato, k, perfil) -> { pos, idx, nail, contato, extL }
     pos  : Float32Array xyz (espaço do objeto da mão)
     idx  : Uint32Array
     nail : Float32Array (a, b) por vértice = posição no quadro da unha (a ao longo de u, b ao longo de v) */
import { UNHAS } from './unhas.js';
import { SUPERFICIE } from './unhas-superficie.js';
import { larguraRelativa, COMPRIMENTOS, SERVICOS } from './unhas-tipos.js';

export const LINHAS = 80;
export const COLUNAS = 31;
export const A_CUTICULA = -0.96; // onde a unha começa, em frações de hu (a unha pintada da textura vai de -hu a hu)
export const A_S = 0.4;          // até aqui a placa segue o ajuste; depois segue a tangente (a pele da polpa desce)
const RETA = 0.7;                // quanto da inclinação da placa a ponta livre mantém (1 = tangente pura)
const L_RETA = 0.5;              // distância (hu) em que a inclinação passa de 1 para RETA
const QUEDA = 0.03;              // queda suave da ponta livre (hu por hu²)
const LARG = 0.94;               // meia largura do corpo em frações de hv (um pouco menor que a unha pintada:
                                 // as dobras laterais de pele ficam dos dois lados, como num dedo real)
/* calibração por dedo, medida na largura e no centro do dedo visto de cima (unhas-superficie.js): a unha pintada
   do indicador é mais larga que o dedo e fica deslocada para um lado (o dedo também gira um pouco no quadro).
     larg  : meia largura da unha em hv          centro, giro : centro da unha em hv = centro + giro·(a/hu) */
const AJUSTE = [
  { larg: 0.88, centro: -0.04, giro: 0 },    // polegar: a unha ocupava o dedo inteiro vista de cima
  { larg: 0.84, centro: -0.22, giro: 0.08 }, // indicador
  { larg: LARG, centro: 0, giro: 0 },        // médio
  { larg: LARG, centro: 0, giro: 0 },        // anelar
  { larg: LARG, centro: 0, giro: 0 }         // mínimo
];
const larg = (i) => AJUSTE[i].larg;
const centroB = (i, A) => AJUSTE[i].centro + AJUSTE[i].giro * A; // em hv, A = a/hu
const ABRE = 0.03;              // a unha abre um pouco da cutícula para a ponta (fração da largura)
const ARCO = 0.95;               // comprimento do arco da cutícula, em meias larguras (1 = semicírculo inteiro)
const P_ARCO = 2.0;              // expoente da superelipse do arco (2 = elipse/semicírculo; maior = U mais achatado)
const FOLGA = 0.004;             // a face de baixo fica esta fração de hu acima da placa (a pele fica abaixo da placa)
const SAIA = 0.03;               // na borda encostada (laterais e base) a face de baixo desce isto (hu) para dentro da dobra
const PERFIL_PADRAO = SERVICOS[0].perfil;

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function kDoComprimento(id) {
  const c = COMPRIMENTOS.find((x) => x.id === id);
  return c ? c.k : COMPRIMENTOS[1].k;
}

/* ---------- placa lisa ----------
   Mínimos quadrados de h(a, b) ≈ Σ c·base(A, B), A = a/hu, B = b/hv, só sobre o leito plano da unha
   (a de -0,9 a 0,45 hu, |b| < hv): fora disso a pele já é a dobra da cutícula ou a polpa da ponta, que desce.
   B², B⁴ dão a curva de lado a lado; A, A² a curva ao longo do dedo; A·B², A·B deixam a curva mudar. */
const base = (A, B) => [1, A, A * A, B, B * B, B * B * B * B, A * B * B, A * B];

function resolver(M, y) { // eliminação de Gauss com pivô parcial (sistema pequeno)
  const n = y.length;
  const m = M.map((l, i) => [...l, y[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(m[l][c]) > Math.abs(m[p][c])) p = l;
    [m[c], m[p]] = [m[p], m[c]];
    for (let l = c + 1; l < n; l++) {
      const f = m[l][c] / m[c][c];
      for (let k = c; k <= n; k++) m[l][k] -= f * m[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let l = n - 1; l >= 0; l--) {
    let s = m[l][n];
    for (let k = l + 1; k < n; k++) s -= m[l][k] * x[k];
    x[l] = s / m[l][l];
  }
  return x;
}

function ajustarPlaca(S, U) {
  const { hu, hv } = U;
  const pts = [];
  for (let ia = 0; ia < S.na; ia++) {
    const a = S.a0 + ia * S.da;
    if (a < -0.9 * hu || a > 0.45 * hu) continue;
    for (let ib = 0; ib < S.nb; ib++) {
      const h = S.h[ia * S.nb + ib];
      const b = S.b0 + ib * S.db;
      if (h === null || Math.abs(b) > 1.0 * hv) continue;
      pts.push([a / hu, b / hv, h / hu, Math.abs(b) < 0.6 * hv ? 2 : 1]); // o meio pesa mais
    }
  }
  const n = base(0, 0).length;
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  const y = new Array(n).fill(0);
  for (const [A, B, h, w] of pts) {
    const f = base(A, B);
    for (let r = 0; r < n; r++) {
      y[r] += w * f[r] * h;
      for (let c = 0; c < n; c++) M[r][c] += w * f[r] * f[c];
    }
  }
  for (let r = 0; r < n; r++) M[r][r] += 1e-6; // regularização leve: sem termo explodindo onde há poucos pontos
  const coef = resolver(M, y);
  const [c0, c1, c2, c3, c4, c5, c6, c7] = coef;
  const poli = (A, B) => { // mesma soma de base(A, B)·coef, sem criar array (roda para cada vértice da mão HD)
    const B2 = B * B;
    return c0 + c1 * A + c2 * A * A + c3 * B + c4 * B2 + c5 * B2 * B2 + c6 * A * B2 + c7 * A * B;
  };
  return { coef, pts, poli };
}

/* altura da pele medida (unidades de hu) em (A, B), com os buracos preenchidos pela borda mais próxima da linha */
function amostraPele(S, U) {
  const { hu, hv } = U;
  const linha = (ia) => {
    const lin = S.h.slice(ia * S.nb, (ia + 1) * S.nb);
    const ok = lin.map((x, ib) => (x === null ? -1 : ib)).filter((x) => x >= 0);
    if (!ok.length) return null;
    return lin.map((x, ib) => (x !== null ? x : lin[ib < ok[0] ? ok[0] : ok[ok.length - 1]]));
  };
  const linhas = Array.from({ length: S.na }, (_, ia) => linha(ia));
  return (A, B) => {
    const fa = Math.min(S.na - 1, Math.max(0, (A * hu - S.a0) / S.da));
    const fb = Math.min(S.nb - 1, Math.max(0, (B * hv - S.b0) / S.db));
    const a0 = Math.floor(fa), b0 = Math.floor(fb), a1 = Math.min(S.na - 1, a0 + 1), b1 = Math.min(S.nb - 1, b0 + 1);
    const ta = fa - a0, tb = fb - b0;
    const L0 = linhas[a0] || linhas[a1], L1 = linhas[a1] || linhas[a0];
    if (!L0) return null;
    const v0 = L0[b0] * (1 - tb) + L0[b1] * tb, v1 = L1[b0] * (1 - tb) + L1[b1] * tb;
    return (v0 * (1 - ta) + v1 * ta) / hu;
  };
}

/* quanto a borda lateral precisa descer (unidades de hu, ≤ 0) para a unha abraçar o dedo: diferença entre a pele
   na borda da unha e a placa ajustada, muito suavizada ao longo do dedo (a borda não ondula) */
function criarAbraco(placa, S, U, i) {
  const pele = amostraPele(S, U);
  const N = 40, A0 = A_CUTICULA, A1 = A_S;
  const Lr = larg(i), cB = (A) => centroB(i, A);
  const lados = [-1, 1].map((sg) => {
    const t = new Float64Array(N + 1);
    for (let q = 0; q <= N; q++) {
      const A = A0 + ((A1 - A0) * q) / N;
      const Be = cB(A) + sg * Lr;
      const e = pele(A, Be);
      t[q] = e === null ? 0 : Math.max(-0.3, Math.min(0, e - placa.poli(A, Be)));
    }
    for (let pass = 0; pass < 40; pass++) {
      const c = Float64Array.from(t);
      for (let q = 1; q < N; q++) t[q] = (c[q - 1] + 2 * c[q] + c[q + 1]) / 4;
    }
    return t;
  });
  const media = lados[0].map((x, q) => (x + lados[1][q]) / 2);
  return (A, B) => {
    const t = Math.min(1, Math.max(0, (A - A0) / (A1 - A0))) * N;
    const k = Math.min(N - 1, Math.floor(t));
    const Bc = B - cB(Math.min(A, A1));
    const tab = media; // o mesmo abraço dos dois lados (simétrico)
    const d = tab[k] + (tab[k + 1] - tab[k]) * (t - k);
    const x = Math.min(1.08, Math.abs(Bc) / Lr);
    return d * x * x * x; // só perto da borda: o meio da unha continua a placa
  };
}

/* superfície da placa em unidades de hu, no quadro da unha: A = a/hu, B = b/hv (B limitado à borda da unha).
   Até A_S segue o ajuste; depois a tangente em A_S, endireitando para RETA, com uma queda leve. */
function criarSuperficie(placa, abraco, i) {
  const { poli } = placa;
  const dA = 0.01;
  const Lr = larg(i);
  /* curva de lado a lado SIMÉTRICA em volta do centro da unha (média dos dois lados) + só a inclinação do dedo.
     O ajuste cru caía muito mais de um lado (indicador): a borda livre torcia e a ponta ficava curva e estranha. */
  const pol = (A, B) => {
    const cB = centroB(i, Math.min(A, A_S)), x = B - cB, d0 = 0.5 * Lr;
    const c0 = poli(A, cB);
    const incl = (poli(A, cB + d0) - poli(A, cB - d0)) / (2 * d0);
    const curva = (poli(A, cB + x) + poli(A, cB - x)) / 2 - c0;
    /* limite SUAVE da queda nas bordas (o corte seco fazia uma quina que ondulava o reflexo) */
    return c0 + incl * x + (curva < 0 ? -0.4 * Math.tanh(-curva / 0.4) : 0.05 * Math.tanh(curva / 0.05));
  };
  return (A, B) => {
    const cB = centroB(i, Math.min(A, A_S));
    B = Math.max(cB - 1.08 * Lr, Math.min(cB + 1.08 * Lr, B));
    const lado = abraco(A, B);
    if (A <= A_S) return pol(A, B) + lado;
    /* ponta livre: a seção de A_S só desce ao longo da unha, com a inclinação do CENTRO (sem torcer) */
    const h0 = pol(A_S, B);
    const s0 = (pol(A_S + dA, cB) - pol(A_S - dA, cB)) / (2 * dA);
    const d = A - A_S, dd = Math.min(d, L_RETA);
    const integ = dd - ((1 - RETA) * dd * dd) / (2 * L_RETA) + Math.max(0, d - L_RETA) * RETA;
    return h0 + s0 * integ - QUEDA * d * d + lado;
  };
}

const PLACAS = SUPERFICIE.map((S, i) => ajustarPlaca(S, UNHAS[i]));
const SUPERF = PLACAS.map((pl, i) => criarSuperficie(pl, criarAbraco(pl, SUPERFICIE[i], UNHAS[i], i), i));

/* contorno do corpo (antes da ponta moldada): meia largura em a (unidades do objeto) */
function larguraCorpo(i, a) {
  const { hu, hv } = UNHAS[i];
  const Wn = larg(i) * hv;
  const aC = A_CUTICULA * hu, rc = ARCO * Wn;
  const W = Wn * (1 + ABRE * suave(-0.6 * hu, 0.6 * hu, a));
  if (a >= aC + rc) return W;
  if (a <= aC) return 0;
  const q = (aC + rc - a) / rc;
  return W * Math.pow(Math.max(0, 1 - Math.pow(q, P_ARCO)), 1 / P_ARCO);
}

/* Forma da unha para a pele se acomodar (pele-unhas.js). Só o corpo: a ponta moldada muda com formato/comprimento,
   a pele em volta dela não (a ponta livre não encosta em pele).
     surf(a, b)  : altura da face de baixo da unha (unidades do objeto) no quadro da unha
     dist(a, b)  : distância com sinal ao contorno do corpo (negativa = dentro), unidades do objeto
     esp         : espessura típica da unha natural (unidades do objeto) */
export function formaDaUnha(i) {
  const U = UNHAS[i];
  const { hu, hv } = U;
  const sup = SUPERF[i];
  const Wn = larg(i) * hv, aC = A_CUTICULA * hu, rc = ARCO * Wn;
  const aJ = aC + rc;
  const cb = (a) => centroB(i, Math.min(a, A_S * hu) / hu) * hv;
  return {
    ...U,
    aC, aJ,
    esp: PERFIL_PADRAO.esp * hu,
    surf: (a, b) => sup(a / hu, b / hv) * hu + FOLGA * hu,
    largura: (a) => larguraCorpo(i, a), // meia largura do corpo (unidades do objeto)
    centro: cb,                          // centro da unha em b (unidades do objeto)
    /* { d, ae, be }: distância com sinal ao contorno do corpo e o ponto do contorno mais perto (aproximado) */
    borda(a, b) {
      const c0 = cb(a), bl = b - c0;
      if (a >= aJ) {
        const W = larguraCorpo(i, a);
        return { d: Math.abs(bl) - W, ae: a, be: c0 + Math.sign(bl) * W };
      }
      /* arco da cutícula: distância aproximada à superelipse pela "norma p" normalizada */
      const W = Wn * (1 + ABRE * suave(-0.6 * hu, 0.6 * hu, aJ));
      const x = Math.abs(bl) / W, y = (aJ - a) / rc;
      const r = Math.max(1e-6, Math.pow(Math.pow(x, P_ARCO) + Math.pow(y, P_ARCO), 1 / P_ARCO));
      const ae = aJ - (aJ - a) / r;
      return { d: (r - 1) * Math.min(W, rc), ae, be: cb(ae) + bl / r };
    }
  };
}

export function gerarUnha(i, formato, k, perfil = PERFIL_PADRAO) {
  if (!Number.isInteger(i) || !UNHAS[i]) throw new RangeError('Índice de unha inválido');
  k = Number.isFinite(k) ? Math.min(0.7, Math.max(-0.14, k)) : kDoComprimento('natural');
  perfil = Object.fromEntries(Object.entries(PERFIL_PADRAO).map(([key, value]) =>
    [key, Number.isFinite(perfil?.[key]) ? Math.max(0, perfil[key]) : value]));
  const { c, u, v, n, hu, hv } = UNHAS[i];
  const sup = SUPERF[i];
  const extL = k * 2 * hu;                 // quanto passa de hu (a ponta fica em a = hu + extL)
  const aPonta = hu + extL;
  const aC = A_CUTICULA * hu;
  const aDedo = 0.8 * hu;                  // fim da pele sob a unha (medido: a polpa sobe e encontra a unha perto de hu)
  /* onde o formato começa a moldar a ponta: na unha curta começa um pouco antes, para a borda livre sair em arco
     (e não reta com cantos) */
  const aForma = Math.min(0.55 * hu, aPonta - Math.max(0.25 * hu, 0.9 * larg(i) * hv));
  const E = aPonta - aForma;
  const Wref = larguraCorpo(i, aForma);

  /* curva C (de lado a lado) a mais na ponta livre, no arco de um círculo: alongamentos fecham mais a ponta */
  const ratioC = 0.35 * perfil.curvaC;
  const curvaC = (a, x) => {
    if (ratioC <= 0) return 0;
    const t = suave(aDedo - 0.2 * hu, aDedo + 0.4 * hu, a);
    return t * ratioC * x * x * 0.5;
  };

  /* espessura ao longo da unha: camada do serviço + ápice no ponto de tensão, afinando para a borda livre */
  const esp = perfil.esp * hu, apice = perfil.apice * hu, borda = perfil.borda * hu;
  const aApice = 0.4 * hu + 0.15 * Math.max(0, extL);
  const sApice = 0.75 * hu + 0.25 * Math.max(0, extL);
  const espessura = (a) => {
    const corpo = esp + apice * Math.exp(-(((a - aApice) / sApice) ** 2));
    const naPonta = suave(Math.min(aDedo, aPonta - 0.18 * hu), aPonta, a);
    const cut = 0.25 + 0.75 * suave(aC, aC + 0.35 * hu, a); // fina na cutícula, onde o produto termina
    return (corpo * (1 - naPonta) + borda * naPonta) * cut;
  };

  const nv = LINHAS * COLUNAS;
  const pos = new Float32Array(nv * 2 * 3);
  const nail = new Float32Array(nv * 2 * 2);
  const contato = new Float32Array(nv * 2); // 0 = encosta na pele (borda e base), 1 = livre; o shader funde a borda com a pele

  for (let r = 0; r < LINHAS; r++) {
    const t = r / (LINHAS - 1);
    const a = aC + (aPonta - aC) * (0.5 - 0.5 * Math.cos(Math.PI * t)); // linhas mais juntas nas duas pontas
    let w = a > aForma ? Wref * larguraRelativa(formato, (a - aForma) / E, E, Wref) : larguraCorpo(i, a);
    if (w < 1e-6 * hv) w = 0;
    const espA = espessura(a);
    const livre = suave(aDedo - 0.25 * hu, aDedo + 0.2 * hu, a); // 0 = sobre a pele, 1 = ponta livre
    for (let j = 0; j < COLUNAS; j++) {
      /* colunas mais juntas perto da borda: a quina arredondada fica lisa */
      const s = -1 + (2 * j) / (COLUNAS - 1);
      const x = w === 0 ? 0 : Math.sin((Math.PI / 2) * s);
      const b = x * w + centroB(i, Math.min(a, A_S * hu) / hu) * hv; // centrada no dedo
      const placa = sup(a / hu, b / hv) * hu - curvaC(a, x) * hu + FOLGA * hu;
      /* quina arredondada: perto do contorno a espessura cai num quarto de círculo */
      const dist = Math.min((1 - Math.abs(x)) * w, aPonta - a, Math.max(0, a - aC));
      const raio = 1.6 * espA + 0.004 * hu;
      const q = Math.min(1, Math.max(0, 1 - dist / raio));
      const quina = Math.max(0.45, Math.sqrt(1 - q * q));
      const topo = placa + espA * quina;
      /* face de baixo: na borda encostada desce um pouco (some dentro da dobra da pele, sem fresta);
         na ponta livre fica logo abaixo da face de cima (a borda livre tem a espessura da unha) */
      const encostada = (1 - livre) * suave(0.7, 1, Math.abs(x) + (1 - suave(aC, aC + 0.3 * hu, a)));
      const baixo = Math.min(topo - 0.35 * espA, placa - SAIA * hu * encostada);
      const vi = r * COLUNAS + j;
      const dBorda = Math.min((1 - Math.abs(x)) * w, a - aC);
      const cTopo = 1 - (1 - suave(0, 0.5 * raio, dBorda)) * (1 - livre);
      for (let lado = 0; lado < 2; lado++) {
        contato[lado * nv + vi] = lado ? livre : cTopo;
        const h = lado ? baixo : topo;
        const o = (lado * nv + vi) * 3;
        pos[o]     = c[0] + u[0] * a + v[0] * b + n[0] * h;
        pos[o + 1] = c[1] + u[1] * a + v[1] * b + n[1] * h;
        pos[o + 2] = c[2] + u[2] * a + v[2] * b + n[2] * h;
        const qn = (lado * nv + vi) * 2;
        nail[qn] = a; nail[qn + 1] = x * w; // a arte fica centrada na unha
      }
    }
  }

  const idx = [];
  const topo = (r, j) => r * COLUNAS + j;
  const fundo = (r, j) => nv + r * COLUNAS + j;
  for (let r = 0; r < LINHAS - 1; r++) {
    for (let j = 0; j < COLUNAS - 1; j++) {
      idx.push(topo(r, j), topo(r + 1, j), topo(r, j + 1), topo(r, j + 1), topo(r + 1, j), topo(r + 1, j + 1));
      idx.push(fundo(r, j), fundo(r, j + 1), fundo(r + 1, j), fundo(r, j + 1), fundo(r + 1, j + 1), fundo(r + 1, j));
    }
  }
  /* paredes: laterais e a borda da ponta */
  for (let r = 0; r < LINHAS - 1; r++) {
    for (const j of [0, COLUNAS - 1]) {
      const faces = [topo(r, j), fundo(r, j), topo(r + 1, j), topo(r + 1, j), fundo(r, j), fundo(r + 1, j)];
      if (j === COLUNAS - 1) faces.reverse();
      idx.push(...faces);
    }
  }
  for (let j = 0; j < COLUNAS - 1; j++) {
    const r = LINHAS - 1;
    idx.push(topo(r, j), fundo(r, j), topo(r, j + 1), topo(r, j + 1), fundo(r, j), fundo(r, j + 1));
    // Fecha também a raiz (quando não colapsa no polo da cutícula).
    idx.push(topo(0, j), topo(0, j + 1), fundo(0, j), topo(0, j + 1), fundo(0, j + 1), fundo(0, j));
  }
  // Um vértice por polo: remove triângulos de área zero e permite normais contínuas.
  const vertices = [], uv = [], con = [], remap = [], unicos = new Map();
  for (let q = 0; q < pos.length / 3; q++) {
    const key = `${pos[q * 3]},${pos[q * 3 + 1]},${pos[q * 3 + 2]}`;
    if (!unicos.has(key)) {
      unicos.set(key, vertices.length / 3);
      vertices.push(...pos.subarray(q * 3, q * 3 + 3));
      uv.push(...nail.subarray(q * 2, q * 2 + 2));
      con.push(contato[q]);
    }
    remap[q] = unicos.get(key);
  }
  const faces = [];
  for (let q = 0; q < idx.length; q += 3) {
    const [a, b, c] = idx.slice(q, q + 3).map(x => remap[x]);
    if (a !== b && b !== c && c !== a) faces.push(a, b, c);
  }
  return { pos: new Float32Array(vertices), idx: new Uint32Array(faces), nail: new Float32Array(uv), contato: new Float32Array(con), extL };
}

/* diagnóstico (Node): a pele não precisa mais subir a unha (ela desce embaixo da unha em pele-unhas.js) */
export const sobePele = () => UNHAS.map(() => 0);
export function diagnosticoPlaca() {
  return PLACAS.map((pl, i) => {
    let s2 = 0, max = 0;
    for (const [A, B, h] of pl.pts) {
      const r = h - pl.poli(A, B);
      s2 += r * r; max = Math.max(max, Math.abs(r));
    }
    return { unha: UNHAS[i].nome, rms_hu: Math.sqrt(s2 / pl.pts.length), max_hu: max, sobe_hu: 0 };
  });
}
