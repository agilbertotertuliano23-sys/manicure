/* "Foto de referência": a pessoa envia UMA foto de unhas, toca na unha que quer copiar, e a arte dela vai para a unha
   da mão 3D. Tudo roda no aparelho (foto-worker.js, SlimSAM): a foto não sai do navegador.
   criarFotoUnha({ raiz, botao, alvoInicial(), aoAplicar(canvas384x640, indice) })
     botao        : o botão que abre o fluxo (escolhe o arquivo e abre o painel)
     alvoInicial  : devolve a unha selecionada na hora de abrir (-1 = nenhuma)
     aoAplicar    : recebe a textura pronta; indice -1 = todas as unhas, 0..4 = uma unha
   Fluxo: tocar na unha da foto -> máscara (3 candidatos, escolhe pelo tamanho/pontuação) -> textura reta com a ponta para cima
   (foto-textura.js) -> vai para o destino escolhido (e o destino avança para a próxima unha). Incluir/Excluir corrigem a borda. */
import { texturaDaMascara, ordemDosCandidatos, TEX_L, TEX_A } from './foto-textura.js';

const NOMES = ['Polegar', 'Indicador', 'Médio', 'Anelar', 'Mínimo'];
const MAX_LADO = 2000;     // a foto é reduzida a isto (celulares tiram fotos enormes)
const MAX_SR = 320;        // unha maior que isto (lado maior do recorte, em px) já tem detalhe para a textura 384x640: não passa pela IA (o custo cresce com os pixels)

export function criarFotoUnha({ raiz, botao, alvoInicial, aoAplicar }) {
  /* ---------- painel ---------- */
  const painel = document.createElement('div');
  painel.className = 'h3d__foto';
  painel.hidden = true;
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-modal', 'true');
  painel.setAttribute('aria-label', 'Recortar a unha de uma foto');
  painel.innerHTML = `
    <div class="h3d__foto-caixa">
      <div class="h3d__foto-topo">
        <strong>Foto de referência</strong>
        <button type="button" class="h3d__link" data-trocar>trocar foto</button>
        <button type="button" class="h3d__btn h3d__btn--cheio" data-fechar>Pronto</button>
      </div>
      <p class="h3d__foto-dica" data-dica aria-live="polite"></p>
      <div class="h3d__foto-tela">
        <canvas data-tela></canvas>
        <div class="h3d__foto-carga" data-carga hidden><span class="h3d__foto-giro"></span><span data-carga-texto></span></div>
      </div>
      <p class="h3d__rotulo">Mandar para</p>
      <div class="h3d__foto-destinos" data-destinos role="radiogroup" aria-label="Para qual unha mandar"></div>
      <div class="h3d__foto-opcoes">
        <div class="h3d__seg h3d__seg--peq" role="radiogroup" aria-label="Ao tocar na foto" data-modos>
          <button type="button" role="radio" data-modo="nova">Nova unha</button>
          <button type="button" role="radio" data-modo="incluir">+ Incluir</button>
          <button type="button" role="radio" data-modo="excluir">− Tirar</button>
        </div>
        <button type="button" class="h3d__link" data-outra>outra forma</button>
        <button type="button" class="h3d__link" data-virar>virar a ponta</button>
        <label class="h3d__check"><input type="checkbox" data-melhorar> Melhorar a qualidade da unha com IA (só para foto pequena; mais lento)</label>
        <label class="h3d__check"><input type="checkbox" data-semreflexo> Tirar o reflexo branco da foto</label>
      </div>
    </div>`;
  raiz.appendChild(painel);
  const $ = (s) => painel.querySelector(s);
  const tela = $('[data-tela]');
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  const dicaEl = $('[data-dica]');
  const cargaEl = $('[data-carga]');
  const cargaTxt = $('[data-carga-texto]');
  const caixaDestinos = $('[data-destinos]');
  const chkReflexo = $('[data-semreflexo]');
  const chkMelhorar = $('[data-melhorar]');
  const inArquivo = document.createElement('input');
  inArquivo.type = 'file';
  inArquivo.accept = 'image/*';
  inArquivo.hidden = true;
  painel.appendChild(inArquivo);

  /* ---------- estado ---------- */
  const base = document.createElement('canvas');   // a foto sem marcações
  let fotoW = 0, fotoH = 0, rgba = null;
  let alvo = -1;                                   // para onde vai o próximo recorte (-1 = todas)
  let modo = 'nova';
  let ultima = null;   // { pontos, rotulos, res: {w,h,planos,scores}, ordem, pos, virar, alvoAplicado }
  let analisada = false;
  let abertoPor = null;

  /* ---------- worker ---------- */
  let worker = null;
  let prontoModelo = false;
  let seq = 0;
  const pendentes = new Map();
  function iniciarWorker() {
    if (worker) return;
    try {
      worker = new Worker(new URL('./foto-worker.js', import.meta.url), { type: 'module' });
    } catch (e) {
      worker = null;
      dicaEl.textContent = 'Este navegador não conseguiu iniciar o recorte. Abra o site por um servidor (iniciar.bat) e tente de novo.';
      return;
    }
    worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.tipo === 'progresso') {
        if (!cargaEl.hidden) cargaTxt.textContent = m.pct >= 100 ? 'Preparando o recorte inteligente…' : `Baixando o recorte inteligente (uma vez só)… ${m.pct}%`;
        return;
      }
      if (m.tipo === 'pronto') { prontoModelo = true; return; }
      const p = pendentes.get(m.id);
      if (!p) return;
      pendentes.delete(m.id);
      if (m.tipo === 'erro') p.erro(new Error(m.mensagem)); else p.ok(m);
    };
    worker.onerror = () => { dicaEl.textContent = 'O recorte inteligente não carregou (sem internet ou navegador antigo).'; carga(false); };
    worker.postMessage({ tipo: 'carregar' }); // já começa a baixar o modelo enquanto a pessoa escolhe a foto
  }
  function pedir(msg, transfer) {
    return new Promise((ok, erro) => {
      const id = ++seq;
      pendentes.set(id, { ok, erro });
      worker.postMessage({ ...msg, id }, transfer || []);
    });
  }
  function carga(ligada, texto) {
    cargaEl.hidden = !ligada;
    if (texto) cargaTxt.textContent = texto;
  }

  /* ---------- destinos (Todas + 5 unhas), cada um com a miniatura da textura aplicada ---------- */
  const botoesDestino = [-1, 0, 1, 2, 3, 4].map((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.i = i;
    const mini = document.createElement('canvas');
    mini.width = 24; mini.height = 40;
    b.appendChild(mini);
    const t = document.createElement('span');
    t.textContent = i < 0 ? 'Todas' : NOMES[i];
    b.appendChild(t);
    b.addEventListener('click', () => { alvo = i; ultima = null; marcarDestino(); redesenhar(); dica(); });
    caixaDestinos.appendChild(b);
    return b;
  });
  function marcarDestino() {
    botoesDestino.forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.i === alvo)));
  }
  function miniatura(i, textura) {
    const quais = i < 0 ? [0, 1, 2, 3, 4] : [i];
    quais.forEach((k) => {
      const mini = botoesDestino[k + 1].querySelector('canvas');
      const g = mini.getContext('2d');
      g.clearRect(0, 0, 24, 40);
      g.drawImage(textura, 0, 0, 24, 40);
      botoesDestino[k + 1].classList.add('tem-arte');
    });
  }

  function dica() {
    if (!analisada) return;
    const quem = alvo < 0 ? 'todas as unhas' : NOMES[alvo].toLowerCase();
    dicaEl.textContent = ultima
      ? 'Ficou ruim? Toque em "+ Incluir" ou "− Tirar" e depois num ponto da foto, ou use "outra forma". Para a próxima unha, toque nela na foto.'
      : `Toque na unha da foto que você quer copiar para: ${quem}.`;
  }

  /* ---------- abrir / fechar ---------- */
  function abrir() {
    abertoPor = document.activeElement;
    alvo = typeof alvoInicial === 'function' ? alvoInicial() : -1;
    if (alvo < -1 || alvo > 4) alvo = -1;
    ultima = null;
    marcarDestino();
    painel.hidden = false;
    $('[data-fechar]').focus({ preventScroll: true });
  }
  function fechar() {
    painel.hidden = true;
    if (abertoPor && abertoPor.focus) abertoPor.focus({ preventScroll: true });
  }
  $('[data-fechar]').addEventListener('click', fechar);
  painel.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  $('[data-trocar]').addEventListener('click', () => inArquivo.click());
  botao.addEventListener('click', () => { iniciarWorker(); inArquivo.click(); });

  /* ---------- foto ---------- */
  inArquivo.addEventListener('change', async () => {
    const arq = inArquivo.files && inArquivo.files[0];
    inArquivo.value = '';
    if (arq) await carregarFoto(arq);
  });

  async function carregarFoto(arq) {
    if (!/^image\//.test(arq.type) && !/\.(jfif|jpe?g|png|webp|heic)$/i.test(arq.name)) {
      abrir(); dicaEl.textContent = 'Esse arquivo não parece ser uma imagem.'; return;
    }
    abrir();
    analisada = false;
    ultima = null;
    botoesDestino.forEach((b) => { b.classList.remove('tem-arte'); b.querySelector('canvas').getContext('2d').clearRect(0, 0, 24, 40); });
    dicaEl.textContent = '';
    carga(true, 'Abrindo a foto…');
    let bmp;
    try { bmp = await createImageBitmap(arq, { imageOrientation: 'from-image' }); }
    catch (e) { carga(false); dicaEl.textContent = 'Não consegui abrir essa imagem. Tente um JPG ou PNG.'; return; }
    const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    fotoW = Math.max(1, Math.round(bmp.width * k));
    fotoH = Math.max(1, Math.round(bmp.height * k));
    base.width = tela.width = fotoW;
    base.height = tela.height = fotoH;
    const gb = base.getContext('2d', { willReadFrequently: true });
    gb.drawImage(bmp, 0, 0, fotoW, fotoH);
    if (bmp.close) bmp.close();
    rgba = gb.getImageData(0, 0, fotoW, fotoH).data;
    redesenhar();
    iniciarWorker();
    if (!worker) { carga(false); return; }
    carga(true, prontoModelo ? 'Analisando a foto…' : 'Preparando o recorte inteligente…');
    try {
      const copia = rgba.slice().buffer;       // o worker recebe a própria cópia; a foto original fica para gerar as texturas
      await pedir({ tipo: 'analisar', rgba: copia, w: fotoW, h: fotoH }, [copia]);
      analisada = true;
      carga(false);
      dica();
    } catch (e) {
      carga(false);
      dicaEl.textContent = 'Não consegui analisar a foto: ' + e.message;
    }
  }

  /* ---------- desenho da foto com a máscara ---------- */
  function redesenhar() {
    ctx.drawImage(base, 0, 0);
    if (!ultima || !ultima.res) return;
    const { w, h, planos } = ultima.res;
    const k = ultima.ordem[ultima.pos];
    const n = w * h;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (!planos[k * n + p]) continue;
        const borda = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !planos[k * n + p - 1] || !planos[k * n + p + 1] || !planos[k * n + p - w] || !planos[k * n + p + w];
        const o = p * 4;
        if (borda) { d[o] = 40; d[o + 1] = 255; d[o + 2] = 160; }
        else { d[o] = d[o] * 0.6 + 40 * 0.4; d[o + 1] = d[o + 1] * 0.6 + 255 * 0.4; d[o + 2] = d[o + 2] * 0.6 + 160 * 0.4; }
      }
    }
    ctx.putImageData(img, 0, 0);
    const r = Math.max(5, Math.round(Math.max(fotoW, fotoH) / 110));
    ultima.pontos.forEach(([x, y], i) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = ultima.rotulos[i] ? '#14c97a' : '#e5384b';
      ctx.fill(); ctx.lineWidth = Math.max(2, r / 3); ctx.strokeStyle = '#fff'; ctx.stroke();
    });
  }

  /* ---------- tocar na foto ---------- */
  tela.addEventListener('click', async (e) => {
    if (!analisada || !worker) return;
    const r = tela.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) * tela.width) / r.width);
    const y = Math.round(((e.clientY - r.top) * tela.height) / r.height);
    const nova = modo === 'nova' || !ultima;
    if (nova) ultima = { pontos: [[x, y]], rotulos: [1], res: null, ordem: [], pos: 0, virar: false, alvoAplicado: alvo };
    else { ultima.pontos.push([x, y]); ultima.rotulos.push(modo === 'incluir' ? 1 : 0); }
    carga(true, 'Recortando…');
    try {
      const res = await pedir({ tipo: 'segmentar', pontos: ultima.pontos, rotulos: ultima.rotulos });
      ultima.res = res;
      ultima.ordem = ordemDosCandidatos(res.planos, res.w, res.h, res.scores);
      ultima.pos = 0;
      if (!ultima.ordem.length) throw new Error('nada encontrado nesse ponto');
      await aplicar();
      /* depois de uma "nova unha", o destino avança para a próxima unha (nas correções fica onde está) */
      if (nova && alvo >= 0) { alvo = (alvo + 1) % 5; marcarDestino(); dica(); }
      if (modo !== 'nova') setModo('nova');
    } catch (err) {
      ultima = null;
      redesenhar();
      dicaEl.textContent = 'Não consegui recortar aí (' + err.message + '). Toque no meio da unha.';
    } finally { carga(false); }
  });

  /* recorta só a unha (com folga), manda para a IA dobrar o tamanho e devolve foto, máscara e tamanho ampliados.
     Fotos em que a unha já é grande (> 700 px) não precisam: seguem como estão. O resultado fica em cache por máscara. */
  async function melhorada(mk, w, h, chave) {
    if (ultima.sr && ultima.sr.has(chave)) return ultima.sr.get(chave);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!mk[y * w + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const mx = Math.round((x1 - x0) * 0.08), my = Math.round((y1 - y0) * 0.08);
    x0 = Math.max(0, x0 - mx); y0 = Math.max(0, y0 - my); x1 = Math.min(w - 1, x1 + mx); y1 = Math.min(h - 1, y1 + my);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    if (Math.max(cw, ch) > MAX_SR) return { rgba, w, h, mask: mk };
    const recorte = new Uint8ClampedArray(cw * ch * 4);
    const mrec = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const s = ((y0 + y) * w + (x0 + x)) * 4, d = (y * cw + x) * 4;
      recorte[d] = rgba[s]; recorte[d + 1] = rgba[s + 1]; recorte[d + 2] = rgba[s + 2]; recorte[d + 3] = 255;
      mrec[y * cw + x] = mk[(y0 + y) * w + (x0 + x)];
    }
    const r = await pedir({ tipo: 'melhorar', rgba: recorte.buffer, w: cw, h: ch }, [recorte.buffer]);
    const mask2 = new Uint8Array(r.w * r.h);
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) mask2[y * r.w + x] = mrec[(y >> 1) * cw + (x >> 1)];
    const saida = { rgba: new Uint8ClampedArray(r.rgba), w: r.w, h: r.h, mask: mask2 };
    if (!ultima.sr) ultima.sr = new Map();
    ultima.sr.set(chave, saida);
    return saida;
  }

  /* gera a textura da máscara escolhida e manda para o destino (um toque mais novo cancela o anterior) */
  let versaoAplicar = 0;
  async function aplicar() {
    if (!ultima || !ultima.res) return;
    const meu = ++versaoAplicar;
    const { w, h, planos } = ultima.res;
    const k = ultima.ordem[ultima.pos];
    const mk = planos.subarray(k * w * h, (k + 1) * w * h);
    redesenhar();
    const alvoDaMascara = ultima.alvoAplicado;
    const opcoes = { virar: ultima.virar, semReflexo: chkReflexo.checked };
    /* 1) a unha aparece NA HORA, com a foto como está */
    const t = texturaDaMascara(rgba, w, h, mk, opcoes);
    if (!t) { dicaEl.textContent = 'Essa forma ficou pequena demais. Toque de novo no meio da unha ou use "outra forma".'; return; }
    publicar(t, alvoDaMascara);
    dica();
    if (!chkMelhorar.checked) return;
    /* 2) a IA melhora a unha em segundo plano e troca a textura quando terminar (se a pessoa não tiver tocado em outra coisa) */
    dicaEl.textContent = 'Melhorando a qualidade da unha em segundo plano…';
    let fonte = null;
    try { fonte = await melhorada(mk, w, h, `${k}|${JSON.stringify(ultima.pontos)}`); }
    catch (e) { if (meu === versaoAplicar) { dica(); dicaEl.textContent += ' (a melhoria com IA não funcionou: ficou a foto como está)'; } return; }
    if (meu !== versaoAplicar) return;
    dica();
    if (fonte.rgba === rgba) return;               // unha já grande: não precisou melhorar
    const t2 = texturaDaMascara(fonte.rgba, fonte.w, fonte.h, fonte.mask, opcoes);
    if (t2) publicar(t2, alvoDaMascara);
  }

  function publicar(t, destino) {
    const cv = document.createElement('canvas');
    cv.width = TEX_L; cv.height = TEX_A;
    cv.dataset.foto = '1';                       // o editor e o shader tratam arte de foto (luz já "assada") de outro jeito
    cv.getContext('2d').putImageData(new ImageData(t.data, TEX_L, TEX_A), 0, 0);
    aoAplicar(cv, destino);
    miniatura(destino, cv);
  }

  /* ---------- controles ---------- */
  const botoesModo = [...painel.querySelectorAll('[data-modo]')];
  function setModo(m) {
    modo = m;
    botoesModo.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.modo === m)));
  }
  botoesModo.forEach((b) => b.addEventListener('click', () => setModo(b.dataset.modo)));
  setModo('nova');
  $('[data-outra]').addEventListener('click', () => {
    if (!ultima || !ultima.res || ultima.ordem.length < 2) return;
    ultima.pos = (ultima.pos + 1) % ultima.ordem.length;
    aplicar();
  });
  $('[data-virar]').addEventListener('click', () => { if (ultima && ultima.res) { ultima.virar = !ultima.virar; aplicar(); } });
  chkReflexo.addEventListener('change', () => { if (ultima && ultima.res) aplicar(); });
  chkMelhorar.addEventListener('change', () => { if (ultima && ultima.res) aplicar(); });
}
