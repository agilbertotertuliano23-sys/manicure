/* Máscara de uma unha numa foto -> textura reta 384 x 640 com a ponta para cima (o formato de arte-unha.js).
   Função pura (só typed arrays, sem DOM), para poder ser testada em Node.
   texturaDaMascara(rgba, w, h, mascara, { virar, semReflexo }) -> { data, larg, alt, virada } | null
     rgba     : Uint8ClampedArray/Uint8Array RGBA da foto (w x h)
     mascara  : Uint8Array w*h (0 = fora, != 0 = unha)
     virar    : inverte a ponta (quando a ponta foi adivinhada ao contrário)
     semReflexo : trata o brilho branco da foto como buraco e preenche com a cor vizinha
   Passos: eixo maior da máscara (PCA) -> ponta = extremidade mais estreita -> reamostra a unha em pé, com o comprimento
   inteiro da unha ocupando os 640 px (mesma escala nos dois eixos, para o desenho não deformar) -> o que fica fora da
   unha da foto é preenchido com a cor mais próxima (o formato escolhido no 3D é que recorta). */

/* tamanho da textura de cada unha (a razão 0,6 é a que o shader espera; arte-unha.js usa estes mesmos valores).
   576 x 960 aproveita o detalhe extra que a super-resolução (foto-worker.js, 'melhorar') devolve. */
export const TEX_L = 576;
export const TEX_A = 960;

/* Os 3 candidatos de máscara que o modelo devolve por toque são parte / objeto / conjunto, e a ordem varia de foto para foto:
   às vezes o candidato 0 é a unha, às vezes é o dedo inteiro (10% a 23% da foto) ou só o enfeite (< 0,5%).
   Regra (testada em 18 toques de 3 fotos): entre os candidatos com tamanho de unha (0,7% a 6% da foto) vale o de maior
   pontuação; se nenhum tiver esse tamanho (foto muito de perto), vale o de maior pontuação geral.
   Devolve a ordem de preferência [melhor, segundo, terceiro] para a pessoa poder trocar por "outra forma". */
export function ordemDosCandidatos(planos, w, h, scores) {
  const n = w * h;
  const pct = [0, 1, 2].map((k) => {
    let a = 0;
    for (let p = k * n; p < (k + 1) * n; p++) a += planos[p];
    return (100 * a) / n;
  });
  const naMedida = (k) => pct[k] >= 0.7 && pct[k] <= 6;
  const ordem = [0, 1, 2].sort((a, b) => {
    if (naMedida(a) !== naMedida(b)) return naMedida(a) ? -1 : 1;
    return scores[b] - scores[a];
  });
  return ordem.filter((k) => pct[k] >= 0.05); // descarta máscara vazia
}

/* encolhe a máscara em r pixels (mínimo em janela quadrada, separável), só dentro da caixa dada */
function erodir(mascara, w, h, r, x0, y0, x1, y1) {
  if (r < 1) return mascara;
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let ok = 1;
      for (let d = -r; d <= r && ok; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= w || !mascara[y * w + xx]) ok = 0;
      }
      tmp[y * w + x] = ok;
    }
  }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let ok = 1;
      for (let d = -r; d <= r && ok; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= h || !tmp[yy * w + x]) ok = 0;
      }
      out[y * w + x] = ok;
    }
  }
  return out;
}

/* para cada texel inválido, copia a cor do texel válido mais próximo (duas passadas de distância) */
function preencher(pix, valido, W, H) {
  const perto = new Int32Array(W * H).fill(-1);
  const dist = new Float32Array(W * H).fill(1e9);
  for (let i = 0; i < W * H; i++) if (valido[i]) { perto[i] = i; dist[i] = 0; }
  const tenta = (x, y, i, nx, ny) => {
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    const s = perto[ny * W + nx];
    if (s < 0) return;
    const d = Math.hypot(x - (s % W), y - ((s / W) | 0));
    if (d < dist[i]) { dist[i] = d; perto[i] = s; }
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    tenta(x, y, i, x - 1, y); tenta(x, y, i, x, y - 1); tenta(x, y, i, x - 1, y - 1); tenta(x, y, i, x + 1, y - 1);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    tenta(x, y, i, x + 1, y); tenta(x, y, i, x, y + 1); tenta(x, y, i, x + 1, y + 1); tenta(x, y, i, x - 1, y + 1);
  }
  for (let i = 0; i < W * H; i++) {
    const s = perto[i];
    if (s >= 0 && s !== i) { pix[i * 4] = pix[s * 4]; pix[i * 4 + 1] = pix[s * 4 + 1]; pix[i * 4 + 2] = pix[s * 4 + 2]; }
  }
  /* repetir o pixel mais próximo deixa riscos radiais: longe da unha troca por uma média suave das cores,
     com transição de ~6 px para não aparecer degrau na borda */
  const R = Math.round((18 * W) / 384);   // os raios foram acertados para 384 de largura
  const canais = [0, 1, 2].map((c) => {
    const a = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = pix[i * 4 + c];
    borrar(a, W, H, R); borrar(a, W, H, R);
    return a;
  });
  for (let i = 0; i < W * H; i++) {
    if (valido[i]) continue;
    const t = Math.min(1, dist[i] / ((6 * W) / 384));
    for (let c = 0; c < 3; c++) pix[i * 4 + c] = pix[i * 4 + c] * (1 - t) + canais[c][i] * t;
  }
}

/* desfoque de caixa separável (soma corrida, bordas repetidas), no lugar */
function borrar(a, W, H, r) {
  const tmp = new Float32Array(W * H);
  const jan = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let soma = 0;
    for (let d = -r; d <= r; d++) soma += a[y * W + Math.min(W - 1, Math.max(0, d))];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = soma / jan;
      soma += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let soma = 0;
    for (let d = -r; d <= r; d++) soma += tmp[Math.min(H - 1, Math.max(0, d)) * W + x];
    for (let y = 0; y < H; y++) {
      a[y * W + x] = soma / jan;
      soma += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
}

/* nitidez leve (unsharp mask com desfoque de caixa), só nos canais de cor: devolve o contraste que o aumento da foto tirou */
function afiar(pix, W, H, quantidade) {
  const canais = [0, 1, 2].map((c) => {
    const a = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = pix[i * 4 + c];
    return a;
  });
  const borrados = canais.map((a) => { const b = Float32Array.from(a); borrar(b, W, H, 2); borrar(b, W, H, 2); return b; });
  for (let i = 0; i < W * H; i++) {
    for (let c = 0; c < 3; c++) {
      const v = canais[c][i] + quantidade * (canais[c][i] - borrados[c][i]);
      pix[i * 4 + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
}

export function texturaDaMascara(rgba, w, h, mascara, { virar = false, semReflexo = false, nitidez = 0.55 } = {}) {
  /* centro, caixa e covariância da máscara */
  let n = 0, sx = 0, sy = 0, bx0 = w, by0 = h, bx1 = -1, by1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mascara[y * w + x]) continue;
      n++; sx += x; sy += y;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
    }
  }
  if (n < 80) return null;
  const cx = sx / n, cy = sy / n;
  let cxx = 0, cyy = 0, cxy = 0;
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      if (!mascara[y * w + x]) continue;
      const dx = x - cx, dy = y - cy;
      cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
    }
  }
  const th = 0.5 * Math.atan2(2 * cxy, cxx - cyy);   // direção do eixo maior
  let ex = Math.cos(th), ey = Math.sin(th);

  const medir = () => {
    let lo = Infinity, hi = -Infinity;
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!mascara[y * w + x]) continue;
      const p = (x - cx) * ex + (y - cy) * ey;
      if (p < lo) lo = p;
      if (p > hi) hi = p;
    }
    return { lo, hi };
  };
  let { lo, hi } = medir();
  const larg = (a, b) => {
    let q0 = Infinity, q1 = -Infinity;
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!mascara[y * w + x]) continue;
      const p = ((x - cx) * ex + (y - cy) * ey - lo) / (hi - lo);
      if (p < a || p > b) continue;
      const q = -(x - cx) * ey + (y - cy) * ex;
      if (q < q0) q0 = q;
      if (q > q1) q1 = q;
    }
    return q1 > q0 ? q1 - q0 : 0;
  };
  /* e aponta para a ponta = extremidade estreita; a cutícula é a larga e arredondada */
  let virada = false;
  if (!(larg(0.8, 0.95) < larg(0.05, 0.2))) { ex = -ex; ey = -ey; virada = true; }
  if (virar) { ex = -ex; ey = -ey; virada = !virada; }
  ({ lo, hi } = medir());
  const L = hi - lo;
  let q0 = Infinity, q1 = -Infinity;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    if (!mascara[y * w + x]) continue;
    const q = -(x - cx) * ey + (y - cy) * ex;
    if (q < q0) q0 = q;
    if (q > q1) q1 = q;
  }
  const qc = (q0 + q1) / 2;
  const rx = -ey, ry = ex; // direita da textura (ponta para cima na foto => direita da foto)

  /* a borda da máscara costuma pegar pele e sombra: encolhe um pouco */
  const raio = Math.max(1, Math.round(L * 0.025));
  const m = erodir(mascara, w, h, raio, bx0, by0, bx1, by1);

  /* reamostra: v = 0 é a ponta, v = TEX_A é a cutícula; mesma escala nos dois eixos */
  const esc = TEX_A / L;
  const pix = new Uint8ClampedArray(TEX_L * TEX_A * 4);
  const valido = new Uint8Array(TEX_L * TEX_A);
  for (let v = 0; v < TEX_A; v++) {
    const p = hi - ((v + 0.5) / TEX_A) * L;
    for (let u = 0; u < TEX_L; u++) {
      const q = qc + (u + 0.5 - TEX_L / 2) / esc;
      const x = cx + ex * p + rx * q;
      const y = cy + ey * p + ry * q;
      const xi = Math.round(x), yi = Math.round(y);
      const i = v * TEX_L + u;
      if (xi < 0 || yi < 0 || xi >= w || yi >= h || !m[yi * w + xi]) continue;
      const x0 = Math.max(0, Math.min(w - 2, Math.floor(x))), y0 = Math.max(0, Math.min(h - 2, Math.floor(y)));
      const fx = Math.min(1, Math.max(0, x - x0)), fy = Math.min(1, Math.max(0, y - y0));
      let r = 0, g = 0, b = 0;
      for (let c = 0; c < 4; c++) {
        const px = x0 + (c & 1), py = y0 + (c >> 1);
        const wgt = (c & 1 ? fx : 1 - fx) * (c >> 1 ? fy : 1 - fy);
        const o = (py * w + px) * 4;
        r += rgba[o] * wgt; g += rgba[o + 1] * wgt; b += rgba[o + 2] * wgt;
      }
      pix[i * 4] = r; pix[i * 4 + 1] = g; pix[i * 4 + 2] = b; pix[i * 4 + 3] = 255;
      valido[i] = 1;
    }
  }

  /* brilho branco da foto: vira buraco e é preenchido; os vizinhos de 1 px também (vêm meio claros) */
  if (semReflexo) {
    const marca = new Uint8Array(TEX_L * TEX_A);
    for (let i = 0; i < TEX_L * TEX_A; i++) {
      if (!valido[i]) continue;
      const r = pix[i * 4], g = pix[i * 4 + 1], b = pix[i * 4 + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const espalha = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      if (lum > 0.89 && espalha < 0.13) marca[i] = 1;
    }
    for (let v = 1; v < TEX_A - 1; v++) for (let u = 1; u < TEX_L - 1; u++) {
      const i = v * TEX_L + u;
      if (marca[i - 1] || marca[i + 1] || marca[i - TEX_L] || marca[i + TEX_L]) valido[i] = 0;
    }
    for (let i = 0; i < TEX_L * TEX_A; i++) if (marca[i]) valido[i] = 0;
  }

  let algum = 0;
  for (let i = 0; i < TEX_L * TEX_A; i++) algum += valido[i];
  if (algum < 200) return null;
  preencher(pix, valido, TEX_L, TEX_A);
  if (nitidez > 0) afiar(pix, TEX_L, TEX_A, nitidez);
  for (let i = 0; i < TEX_L * TEX_A; i++) pix[i * 4 + 3] = 255;
  return { data: pix, larg: TEX_L, alt: TEX_A, virada };
}
