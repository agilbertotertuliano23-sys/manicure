/* Prepara a imagem de referência para ser aplicada nas unhas.
   O resultado é um canvas em pé (proporção de unha) que o shader da mão projeta
   sobre cada unha, com o topo da imagem voltado para a ponta do dedo.
     desenho: a imagem cobre a unha inteira
     detalhe: a imagem menor no centro, sobre a cor do esmalte (de preferência sem fundo) */

import { TEX_L, TEX_A } from './foto-textura.js';

/* tamanho da textura de cada unha: o mesmo que foto-textura.js gera (576 x 960, razão 0,6) */
export const ARTE_LARG = TEX_L;
export const ARTE_ALT = TEX_A;
export const ARTE_ASP = ARTE_LARG / ARTE_ALT;

export function lerArquivo(arquivo) {
  return new Promise((ok, erro) => {
    if (!arquivo || !/^image\//.test(arquivo.type)) { erro(new Error('O arquivo não é uma imagem.')); return; }
    const url = URL.createObjectURL(arquivo);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); ok(im); };
    im.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não foi possível abrir a imagem.')); };
    im.src = url;
  });
}

/* imagem de exemplo: florzinha em traço, para testar sem enviar nada */
export function exemplo() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9AD3E6';
  g.fillRect(0, 0, 512, 512);
  g.translate(256, 256);
  g.lineWidth = 10;
  g.strokeStyle = '#2A1A1F';
  for (let i = 0; i < 6; i++) {
    g.save();
    g.rotate((i * Math.PI) / 3);
    g.beginPath();
    g.ellipse(0, -118, 62, 108, 0, 0, Math.PI * 2);
    g.fillStyle = '#FFFFFF';
    g.fill();
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, 70, 0, Math.PI * 2);
  g.fillStyle = '#F2C230';
  g.fill();
  g.stroke();
  return c;
}

/* copia a fonte para um canvas de no máximo 900 px (mais rápido de processar) */
function paraCanvas(fonte) {
  const w0 = fonte.naturalWidth || fonte.width, h0 = fonte.naturalHeight || fonte.height;
  const k = Math.min(1, 1400 / Math.max(w0, h0)); // as texturas de unha (576 x 960) não podem ser reduzidas
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w0 * k));
  c.height = Math.max(1, Math.round(h0 * k));
  c.getContext('2d').drawImage(fonte, 0, 0, c.width, c.height);
  return c;
}

/* tira o fundo quando a borda da imagem é de uma cor só (foto de produto, desenho em papel, logo) */
function tirarFundo(c) {
  const g = c.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = c;
  const dados = g.getImageData(0, 0, w, h);
  const p = dados.data;
  const borda = [];
  const passo = Math.max(1, Math.floor((w + h) / 300));
  const pega = (x, y) => { const i = (y * w + x) * 4; if (p[i + 3] > 200) borda.push([p[i], p[i + 1], p[i + 2]]); };
  for (let x = 0; x < w; x += passo) { pega(x, 0); pega(x, h - 1); }
  for (let y = 0; y < h; y += passo) { pega(0, y); pega(w - 1, y); }
  if (borda.length < 20) return false; // já tem transparência ou é minúscula
  const med = [0, 1, 2].map((k) => borda.map((b) => b[k]).sort((a, b) => a - b)[borda.length >> 1]);
  const dist = (r, gg, b) => Math.hypot(r - med[0], gg - med[1], b - med[2]);
  const espalhamento = borda.reduce((s, b) => s + dist(...b), 0) / borda.length;
  if (espalhamento > 55) return false; // fundo com muita variação: mantém a imagem como está
  for (let i = 0; i < p.length; i += 4) {
    const a = Math.min(1, Math.max(0, (dist(p[i], p[i + 1], p[i + 2]) - 26) / 40));
    p[i + 3] = p[i + 3] * a;
  }
  g.putImageData(dados, 0, 0);
  return true;
}

/* desenha a arte final em `destino` (ARTE_LARG x ARTE_ALT).
   opcoes: { modo: 'desenho' | 'detalhe', tamanho: 0.3..2.2, semFundo: bool,
             dx, dy: deslocamento em fração da largura/altura (+dx direita, +dy para a cutícula),
             rot: giro em graus }
   devolve { fundoRemovido } para a interface avisar quando não deu para tirar o fundo */
const cache = new WeakMap();
export function montarArte(destino, fonte, { modo, tamanho, semFundo, dx = 0, dy = 0, rot = 0 }) {
  if (destino.width !== ARTE_LARG) destino.width = ARTE_LARG;
  if (destino.height !== ARTE_ALT) destino.height = ARTE_ALT;
  const g = destino.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, ARTE_LARG, ARTE_ALT);
  if (!fonte) return { fundoRemovido: false };

  let entrada = cache.get(fonte);
  if (!entrada) { entrada = {}; cache.set(fonte, entrada); }
  const chave = semFundo ? 'sem' : 'com';
  if (!entrada[chave]) {
    const c = paraCanvas(fonte);
    const removido = semFundo ? tirarFundo(c) : false;
    entrada[chave] = { c, removido };
  }
  const { c, removido } = entrada[chave];

  const escala = modo === 'desenho'
    ? Math.max(ARTE_LARG / c.width, ARTE_ALT / c.height) * tamanho      // cobre a unha
    : Math.min(ARTE_LARG / c.width, ARTE_ALT / c.height) * 0.62 * tamanho; // motivo no centro
  const dw = c.width * escala, dh = c.height * escala;
  g.filter = 'saturate(1.12) contrast(1.06)';
  g.imageSmoothingQuality = 'high';
  g.translate(ARTE_LARG / 2 + dx * ARTE_LARG, ARTE_ALT / 2 + dy * ARTE_ALT);
  g.rotate((rot * Math.PI) / 180);
  g.drawImage(c, -dw / 2, -dh / 2, dw, dh);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = 'none';
  return { fundoRemovido: removido };
}
