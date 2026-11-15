/* Biblioteca de modelos de nail art (vetor, fundo transparente).
   Cada modelo é um SVG 384 x 640 com a PONTA DA UNHA NO TOPO, igual ao canvas de arte-unha.js.
   A unha real ocupa mais ou menos o miolo (x 50..334, y 20..620): os motivos ficam dentro disso
   e as faixas de ponta (francesinha) vazam para fora de propósito, o shader recorta na unha.
   O ouro é reconhecido pelo shader pela cor (amarelo saturado) e vira metal brilhante. */

const W = 384, H = 640;

const DEFS = /* svg */`
<defs>
  <radialGradient id="ouro" cx="35%" cy="30%" r="75%">
    <stop offset="0" stop-color="#FFF1B8"/><stop offset=".45" stop-color="#E7B94A"/><stop offset="1" stop-color="#A9741B"/>
  </radialGradient>
  <linearGradient id="vinho" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7A0A1B"/><stop offset="1" stop-color="#C21A30"/>
  </linearGradient>
  <linearGradient id="vinhoFundo" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4F0716"/><stop offset="1" stop-color="#8A1027"/>
  </linearGradient>
</defs>`;

const svg = (corpo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="576" height="960" viewBox="0 0 ${W} ${H}">${DEFS}${corpo}</svg>`; // desenhado em 384 x 640, rasterizado em 576 x 960

const coracao = (cx, cy, s) =>
  `M${cx} ${cy + 0.9 * s} C${cx - 1.3 * s} ${cy - 0.2 * s} ${cx - 0.7 * s} ${cy - 1.1 * s} ${cx} ${cy - 0.35 * s} ` +
  `C${cx + 0.7 * s} ${cy - 1.1 * s} ${cx + 1.3 * s} ${cy - 0.2 * s} ${cx} ${cy + 0.9 * s}Z`;

function estrela(cx, cy, R, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r : R;
    p.push((cx + Math.cos(a) * k).toFixed(1) + ',' + (cy + Math.sin(a) * k).toFixed(1));
  }
  return p.join(' ');
}

/* pedrinha dourada com brilho */
const pedra = (x, y, r = 11) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ouro)"/>` +
  `<circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="#FFFBE6" opacity=".9"/>`;

const perola = (x, y, r = 12) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#F6EFE9"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#D8C9C0" stroke-width="1.5"/>` +
  `<circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff"/>`;

export const MODELOS = [
  { id: 'coracao-traco', nome: 'Coração em traço', svg: () => svg(`
      <path d="M-10 -10H394V150C330 235 54 235 -10 150Z" fill="url(#vinho)"/>
      <path d="M-10 168C54 252 330 252 394 168" fill="none" stroke="#B3152A" stroke-width="6" stroke-linecap="round"/>
      <path d="${coracao(192, 340, 78)}" fill="none" stroke="#B3152A" stroke-width="9" stroke-linejoin="round"/>
      ${pedra(118, 490, 13)}${pedra(152, 524, 10)}${pedra(90, 528, 10)}`) },

  { id: 'francesinha-vinho', nome: 'Francesinha vinho', svg: () => svg(`
      <path d="M-10 -10H394V190C320 290 64 290 -10 190Z" fill="url(#vinhoFundo)"/>
      <path d="M-10 206C64 306 320 306 394 206" fill="none" stroke="#E7B94A" stroke-width="5" stroke-linecap="round"/>`) },

  { id: 'estrela', nome: 'Estrela branca', svg: () => svg(`
      <polygon points="${estrela(192, 300, 112, 46)}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="10" stroke-linejoin="round"/>`) },

  { id: 'coracao-vazado', nome: 'Coração vazado', svg: () => svg(`
      <path d="${coracao(192, 330, 82)}" fill="none" stroke="#D61F3A" stroke-width="12" stroke-linejoin="round"/>`) },

  { id: 'flor', nome: 'Flor com pedra', svg: () => svg(`
      ${[0, 72, 144, 216, 288].map((g) =>
        `<ellipse cx="192" cy="232" rx="34" ry="58" fill="#FFFFFF" stroke="#E7D5D5" stroke-width="3" transform="rotate(${g} 192 300)"/>`
      ).join('')}
      ${pedra(192, 300, 26)}`) },

  { id: 'ondas-douradas', nome: 'Ondas douradas', svg: () => svg(
      [150, 270, 390].map((y) =>
        `<path d="M30 ${y}C100 ${y - 62} 160 ${y + 62} 230 ${y}S330 ${y - 50} 360 ${y - 10}" fill="none" stroke="#E7B94A" stroke-width="9" stroke-linecap="round"/>`
      ).join('')) },

  { id: 'pedrarias', nome: 'Pedrarias', svg: () => svg(`
      ${pedra(192, 488, 15)}${pedra(138, 518, 11)}${pedra(246, 518, 11)}${pedra(96, 552, 8)}${pedra(288, 552, 8)}
      ${perola(160, 440, 12)}${perola(226, 450, 10)}${pedra(192, 560, 7)}`) },

  { id: 'bordas-ouro', nome: 'Borda dourada', svg: () => svg(`
      <path d="M-10 70C70 130 314 130 394 70" fill="none" stroke="#E7B94A" stroke-width="12" stroke-linecap="round"/>
      <path d="M-10 108C70 168 314 168 394 108" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".9"/>`) },

  /* 10 Modelos de Manicure de Salão (Ajustados na Unha) */
  { id: 'salao-francesinha', nome: 'Francesinha Clássica', miniatura: 'assets/modelos/01-francesinha-classica/medio.png', url: 'assets/modelos/01-francesinha-classica/medio.png' },
  { id: 'salao-babyboomer', nome: 'Baby Boomer', miniatura: 'assets/modelos/02-baby-boomer/medio.png', url: 'assets/modelos/02-baby-boomer/medio.png' },
  { id: 'salao-filha-unica', nome: 'Filha Única com Foil', miniatura: 'assets/modelos/03-filha-unica-ouro/anelar.png', url: 'assets/modelos/03-filha-unica-ouro/anelar.png' },
  { id: 'salao-ponto-luz', nome: 'Ponto de Luz', miniatura: 'assets/modelos/04-ponto-de-luz/medio.png', url: 'assets/modelos/04-ponto-de-luz/medio.png' },
  { id: 'salao-micro-vinho', nome: 'Micro Francesinha Vinho', miniatura: 'assets/modelos/05-micro-francesinha-vinho/medio.png', url: 'assets/modelos/05-micro-francesinha-vinho/medio.png' },
  { id: 'salao-linhas', nome: 'Linhas Minimalistas', miniatura: 'assets/modelos/06-linhas-minimalistas/medio.png', url: 'assets/modelos/06-linhas-minimalistas/medio.png' },
  { id: 'salao-poa', nome: 'Poá Delicado', miniatura: 'assets/modelos/07-poa-delicado/medio.png', url: 'assets/modelos/07-poa-delicado/medio.png' },
  { id: 'salao-quartzo', nome: 'Marmorizado Quartzo', miniatura: 'assets/modelos/08-marmorizado-quartzo/medio.png', url: 'assets/modelos/08-marmorizado-quartzo/medio.png' },
  { id: 'salao-diagonal', nome: 'Francesinha Diagonal', miniatura: 'assets/modelos/09-francesinha-diagonal/medio.png', url: 'assets/modelos/09-francesinha-diagonal/medio.png' },
  { id: 'salao-meia-lua', nome: 'Meia-Lua Invertida', miniatura: 'assets/modelos/10-meia-lua-invertida/medio.png', url: 'assets/modelos/10-meia-lua-invertida/medio.png' }
];

const dados = (m) => m.miniatura || (m.svg ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m.svg()) : '');

/* carrega o SVG ou imagem PNG (usável por montarArte); guarda em cache */
const imagens = new Map();
export function imagemDoModelo(m) {
  if (!imagens.has(m.id)) {
    imagens.set(m.id, new Promise((ok, erro) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => erro(new Error('Não foi possível abrir o modelo.'));
      im.src = m.url || dados(m);
    }));
  }
  return imagens.get(m.id);
}
export const miniaturaDoModelo = dados;
