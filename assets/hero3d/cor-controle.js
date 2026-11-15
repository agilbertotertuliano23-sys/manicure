/* Controlador de cor do frasco "Sua cor": matiz, saturação, luz, código hex e seletor nativo.
   criarControle(el, { aoMudar(hex) }) monta os campos dentro de `el`
   e devolve { definir(hex) } para sincronizar quando a cor vem de outro lugar (frascos prontos). */

export function hexParaRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbParaHex(r, g, b) {
  return '#' + [r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function hslParaHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return rgbParaHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export function hexParaHsl(hex) {
  const [r, g, b] = hexParaRgb(hex).map((x) => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function luminancia(hex) {
  const pesos = [0.2126, 0.7152, 0.0722];
  return hexParaRgb(hex)
    .map((x) => x / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * pesos[i], 0);
}

export function contraste(a, b) {
  const x = luminancia(a), y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/* fundo da cena para uma cor livre: mesma família, um pouco mais clara e menos saturada */
export function fundoPara(hex) {
  const [h, s, l] = hexParaHsl(hex);
  return hslParaHex(h, Math.min(s, 78), Math.min(84, Math.max(22, l + (l < 50 ? 10 : 4))));
}

/* texto branco ou vinho, o que tiver mais contraste com o fundo */
export function textoPara(fundo) {
  return contraste(fundo, '#FFFFFF') >= contraste(fundo, '#3A0915') ? '#FFFFFF' : '#3A0915';
}

/* todas as cores prontas: 12 matizes em 3 tons + uma fileira de neutros e metálicos */
const NEUTROS = ['#FFFFFF', '#F3E3D3', '#E3AE97', '#C9A227', '#C0C0C8', '#8A8A94', '#4A4A52', '#000000'];
export const GRADE = [
  ...[78, 62, 44].flatMap((l) => Array.from({ length: 12 }, (_, k) => hslParaHex(k * 30, l > 70 ? 85 : 90, l))),
  ...NEUTROS
];

export function criarControle(el, { aoMudar, aoArco }) {
  el.innerHTML = `
    <p class="h3d__rotulo">Crie sua cor</p>
    <button type="button" class="h3d__arco" data-arco aria-pressed="true">Arco-íris, todas as cores</button>
    <div class="h3d__grade" role="group" aria-label="Todas as cores">${GRADE.map((h) => `<button type="button" style="background:${h}" data-cor="${h}" aria-label="${h}"></button>`).join('')}</div>
    <label class="h3d__faixa h3d__faixa--matiz"><span>Matiz</span><input type="range" min="0" max="360" step="1" data-h></label>
    <label class="h3d__faixa h3d__faixa--sat"><span>Saturação</span><input type="range" min="0" max="100" step="1" data-s></label>
    <label class="h3d__faixa h3d__faixa--luz"><span>Luz</span><input type="range" min="4" max="96" step="1" data-l></label>
    <div class="h3d__hexlinha">
      <input class="h3d__hex" type="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Código da cor (hex)" data-hex>
      <label class="h3d__mais">Mais cores<input type="color" data-nativo></label>
    </div>`;
  const iH = el.querySelector('[data-h]');
  const iS = el.querySelector('[data-s]');
  const iL = el.querySelector('[data-l]');
  const iHex = el.querySelector('[data-hex]');
  const iNat = el.querySelector('[data-nativo]');
  const bArco = el.querySelector('[data-arco]');

  let hsl = [330, 80, 40];

  function pintarFaixas() {
    const [h, s, l] = hsl;
    el.style.setProperty('--sat-a', hslParaHex(h, 0, l));
    el.style.setProperty('--sat-b', hslParaHex(h, 100, l));
    el.style.setProperty('--luz-m', hslParaHex(h, s, 50));
  }

  function mostrar(hex) {
    iH.value = hsl[0]; iS.value = hsl[1]; iL.value = hsl[2];
    iHex.value = hex;
    iNat.value = hex.toLowerCase();
    pintarFaixas();
  }

  function dosSliders() {
    hsl = [+iH.value, +iS.value, +iL.value];
    const hex = hslParaHex(...hsl);
    iHex.value = hex;
    iNat.value = hex.toLowerCase();
    pintarFaixas();
    aoMudar(hex);
  }
  [iH, iS, iL].forEach((i) => i.addEventListener('input', dosSliders));

  function deHex(hex) {
    hsl = hexParaHsl(hex);
    mostrar(hex);
    aoMudar(hex);
  }
  iHex.addEventListener('change', () => {
    let v = iHex.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map((c) => c + c).join('');
    if (/^#[0-9a-f]{6}$/i.test(v)) deHex(v.toUpperCase());
    else iHex.value = hslParaHex(...hsl);
  });
  iNat.addEventListener('input', () => deHex(iNat.value.toUpperCase()));

  function marcarArco(on) { bArco.setAttribute('aria-pressed', String(on)); }
  bArco.addEventListener('click', () => { marcarArco(true); aoArco && aoArco(); });
  el.querySelector('.h3d__grade').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cor]');
    if (b) deHex(b.dataset.cor);
  });
  /* qualquer escolha de cor desliga o arco-íris */
  const mudou = aoMudar;
  aoMudar = (hex) => { marcarArco(false); mudou(hex); };

  return {
    definir(hex) { hsl = hexParaHsl(hex); mostrar(hex); },
    arco: marcarArco
  };
}
