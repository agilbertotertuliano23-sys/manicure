/* Editor de arte por unha (etapa 2 da hero).
   Cada unha guarda o próprio estado: acabamento, imagem, tamanho, posição e giro.
   As 5 artes são desenhadas lado a lado num atlas (5 × 384 × 640) que vira uma única
   textura; o shader da mão lê a faixa da unha certa.
   criarEditor(cartao, { aoMudar(atlas, ativos[5]), aoSelecionar(indice | -1) })
   devolve { atlas, selecionar(i), posicionar(dx, dy), get sel } */
import { ARTE_LARG, ARTE_ALT, lerArquivo, montarArte, exemplo } from './arte-unha.js';
import { UNHAS } from './unhas.js';
import { MODELOS, imagemDoModelo, miniaturaDoModelo } from './arte-modelos.js';

const ROTULOS = ['Polegar', 'Indicador', 'Médio', 'Anelar', 'Mínimo'];
const novo = () => ({ acab: 'cor', fonte: null, tamanho: 1, dx: 0, dy: 0, rot: 0, semFundo: false });

export function criarEditor(cartao, { aoMudar, aoSelecionar }) {
  const $ = (s) => cartao.querySelector(s);
  const atlas = document.createElement('canvas');
  atlas.width = ARTE_LARG * UNHAS.length;
  atlas.height = ARTE_ALT;
  const ga = atlas.getContext('2d');
  const slots = UNHAS.map(() => {
    const c = document.createElement('canvas');
    c.width = ARTE_LARG; c.height = ARTE_ALT;
    return c;
  });

  const estados = UNHAS.map(novo);
  const modelo = novo(); // o que aparece nos controles quando "Todas" está escolhido
  let sel = -1;          // -1 = todas as unhas

  /* ---------- elementos ---------- */
  const listaUnhas = $('[data-unhas]');
  const alvoEl = $('[data-alvo]');
  const refBox = $('[data-ref]');
  const ajustes = $('[data-ajustes]');
  const inArquivo = $('[data-arquivo]');
  const avisoEl = $('[data-aviso]');
  const previa = $('[data-previa]');
  const telaPrevia = document.createElement('canvas');
  telaPrevia.width = ARTE_LARG; telaPrevia.height = ARTE_ALT;
  previa.appendChild(telaPrevia);
  const segAcab = [...cartao.querySelectorAll('[data-acab]')];
  const faixas = {
    tamanho: $('[data-tamanho]'),
    dx: $('[data-dx]'),
    dy: $('[data-dy]'),
    rot: $('[data-rot]')
  };
  const inSemFundo = $('[data-semfundo]');
  const btnCopiar = $('[data-copiar]');

  const botoesUnha = [-1, ...UNHAS.map((_, i) => i)].map((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.textContent = i < 0 ? 'Todas' : ROTULOS[i];
    b.dataset.i = i;
    b.addEventListener('click', () => selecionar(i));
    listaUnhas.appendChild(b);
    return b;
  });

  const atual = () => (sel < 0 ? modelo : estados[sel]);
  const alvos = () => (sel < 0 ? estados.map((_, i) => i) : [sel]);

  /* ---------- desenho ---------- */
  let avisoFundo = '';
  function desenhar(i) {
    const e = estados[i];
    const temArte = e.acab !== 'cor' && e.fonte;
    const r = montarArte(slots[i], temArte ? e.fonte : null, {
      modo: e.acab, tamanho: e.tamanho, semFundo: e.semFundo, dx: e.dx, dy: e.dy, rot: e.rot
    });
    if (temArte && e.semFundo && !r.fundoRemovido) avisoFundo = 'O fundo dessa imagem tem muitas cores, então ele foi mantido.';
    ga.clearRect(i * ARTE_LARG, 0, ARTE_LARG, ARTE_ALT);
    if (temArte) ga.drawImage(slots[i], i * ARTE_LARG, 0);
  }

  let pendente = new Set(), agendado = 0;
  function redesenhar(quais) {
    quais.forEach((i) => pendente.add(i));
    if (agendado) return;
    agendado = requestAnimationFrame(() => {
      agendado = 0;
      avisoFundo = '';
      pendente.forEach(desenhar);
      pendente = new Set();
      /* 0 = sem arte, 1 = arte desenhada/modelo, 2 = arte vinda de foto (foto-unha.js marca o canvas com data-foto) */
      aoMudar(atlas, estados.map((e) => (e.acab !== 'cor' && e.fonte ? (e.fonte.dataset && e.fonte.dataset.foto ? 2 : 1) : 0)));
      mostrar();
    });
  }

  /* ---------- controles ---------- */
  function mostrar() {
    const e = atual();
    botoesUnha.forEach((b) => {
      const i = +b.dataset.i;
      b.setAttribute('aria-checked', String(i === sel));
      b.classList.toggle('tem-arte', i >= 0 && estados[i].acab !== 'cor' && !!estados[i].fonte);
    });
    alvoEl.textContent = sel < 0 ? '· todas as unhas' : '· ' + ROTULOS[sel].toLowerCase();
    segAcab.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.acab === e.acab)));
    refBox.hidden = e.acab === 'cor';
    ajustes.classList.toggle('desligado', !e.fonte);
    faixas.tamanho.value = Math.round(e.tamanho * 100);
    faixas.dx.value = Math.round(e.dx * 100);
    faixas.dy.value = Math.round(e.dy * 100);
    faixas.rot.value = Math.round(e.rot);
    inSemFundo.checked = e.semFundo;
    btnCopiar.hidden = sel < 0;
    previa.hidden = !e.fonte;
    const gp = telaPrevia.getContext('2d');
    gp.clearRect(0, 0, ARTE_LARG, ARTE_ALT);
    const fonteSlot = slots[sel < 0 ? 0 : sel];
    if (e.fonte) gp.drawImage(fonteSlot, 0, 0);
    avisoEl.textContent = avisoFundo;
  }

  function mudar(campos) {
    Object.assign(atual(), campos);
    if (sel < 0) estados.forEach((e) => Object.assign(e, campos));
    redesenhar(alvos());
  }

  segAcab.forEach((b) => b.addEventListener('click', () => {
    const acab = b.dataset.acab;
    if (acab === 'detalhe') mudar({ acab, tamanho: 0.7, semFundo: true, dx: 0, dy: 0, rot: 0 });
    else if (acab === 'desenho') mudar({ acab, tamanho: 1, semFundo: false, dx: 0, dy: 0, rot: 0 });
    else mudar({ acab });
  }));
  faixas.tamanho.addEventListener('input', () => mudar({ tamanho: faixas.tamanho.value / 100 }));
  faixas.dx.addEventListener('input', () => mudar({ dx: faixas.dx.value / 100 }));
  faixas.dy.addEventListener('input', () => mudar({ dy: faixas.dy.value / 100 }));
  faixas.rot.addEventListener('input', () => mudar({ rot: +faixas.rot.value }));
  inSemFundo.addEventListener('change', () => mudar({ semFundo: inSemFundo.checked }));

  let leitura = 0;
  async function usarArquivo(arq) {
    const pedido = ++leitura, destino = sel, quais = alvos();
    try {
      const fonte = await lerArquivo(arq);
      if (pedido !== leitura) return;
      quais.forEach(i => Object.assign(estados[i], { fonte }));
      if (destino < 0) modelo.fonte = fonte;
      redesenhar(quais);
    }
    catch (err) { avisoEl.textContent = err.message; }
  }
  inArquivo.addEventListener('change', () => { if (inArquivo.files[0]) usarArquivo(inArquivo.files[0]); inArquivo.value = ''; });
  cartao.addEventListener('dragover', (e) => { e.preventDefault(); cartao.classList.add('soltando'); });
  cartao.addEventListener('dragleave', () => cartao.classList.remove('soltando'));
  cartao.addEventListener('drop', (e) => {
    e.preventDefault();
    cartao.classList.remove('soltando');
    const arq = e.dataTransfer.files && e.dataTransfer.files[0];
    if (arq) usarArquivo(arq);
  });
  $('[data-exemplo]').addEventListener('click', () => mudar({ fonte: exemplo() }));

  /* modelos prontos (arte-modelos.js): vetor com fundo transparente, cobre a unha inteira */
  const gradeModelos = $('[data-modelos]');
  MODELOS.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'h3d__modelo';
    b.title = m.nome;
    b.setAttribute('aria-label', 'Modelo ' + m.nome);
    const mini = document.createElement('img');
    mini.src = miniaturaDoModelo(m);
    mini.alt = '';
    b.appendChild(mini);
    b.addEventListener('click', async () => {
      try {
        const fonte = await imagemDoModelo(m);
        mudar({ acab: 'desenho', fonte, tamanho: 1, semFundo: false, dx: 0, dy: 0, rot: 0 });
      } catch (err) { avisoEl.textContent = err.message; }
    });
    gradeModelos.appendChild(b);
  });

  btnCopiar.addEventListener('click', () => {
    if (sel < 0) return;
    const base = { ...estados[sel] };
    estados.forEach((e) => Object.assign(e, base));
    Object.assign(modelo, base);
    redesenhar(estados.map((_, i) => i));
  });
  $('[data-limpar]').addEventListener('click', () => {
    if (sel < 0) { estados.forEach((e) => Object.assign(e, novo())); Object.assign(modelo, novo()); }
    else Object.assign(estados[sel], novo());
    redesenhar(alvos());
  });

  /* arte vinda de uma foto (foto-unha.js): textura pronta 384 x 640 que cobre a unha inteira.
     indice -1 = todas as unhas; 0..4 = só aquela unha */
  function aplicarFoto(canvas, indice) {
    if (!Number.isInteger(indice) || indice < -1 || indice >= estados.length) return;
    const campos = { acab: 'desenho', fonte: canvas, tamanho: 1, semFundo: false, dx: 0, dy: 0, rot: 0 };
    const quais = indice < 0 ? estados.map((_, i) => i) : [indice];
    quais.forEach((i) => Object.assign(estados[i], campos));
    Object.assign(modelo, campos); // o controle "todas as unhas" também passa a mostrar Desenho (senão ficava em "Só cor")
    redesenhar(quais);
  }

  function selecionar(i) {
    if (!Number.isInteger(i) || i < -1 || i >= estados.length) return;
    sel = i;
    mostrar();
    aoSelecionar(i);
  }

  /* arrastar na unha (vem da cena): dx/dy em fração do canvas */
  function posicionar(dx, dy) {
    if (sel < 0) return;
    const lim = (v) => Math.max(-0.7, Math.min(0.7, v));
    mudar({ dx: lim(dx), dy: lim(dy) });
  }

  mostrar();
  return {
    atlas,
    selecionar,
    aplicarFoto,
    posicionar,
    get sel() { return sel; },
    temArte(i) { return estados[i].acab !== 'cor' && !!estados[i].fonte; }
  };
}
