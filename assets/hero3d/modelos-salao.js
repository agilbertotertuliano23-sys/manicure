/* Biblioteca de Modelos de Manicure para a Hero 3D (Janela Modal Centralizada com Abas).
   Texturas modulares 100% transparentes: apenas o detalhe/desenho é aplicado sobre
   qualquer cor de esmalte escolhida na cena 3D.
   - Cards mostram APENAS a silhueta da unha com a arte.
   - Ao clicar em uma unha, o menu se move para a esquerda e reduz de tamanho,
     permitindo visualizar a mão 3D livremente enquanto troca de modelo. */

import { TEX_L, TEX_A } from './foto-textura.js';
import { MODELOS_GABARITO } from './modelos-gabarito-dados.js?v=1';   // gerado por tools/gerar-dados-biblioteca.py

/* Os 6 primeiros (N1..N6) vêm dos gabaritos novos (assets/gabarito-*.png), cortados em 5 texturas por dedo
   (tools/arte-do-gabarito.py + tools/limpar-arte.py). `mao` = miniatura quadrada da mão com o modelo pronto. */
export const MODELOS_SALAO = [
  {
    id: 'n1-francesinha-rosa', num: 'N1', titulo: 'Francesinha Rosa', subtitulo: 'Ponta rosa clara com três pérolas',
    categoria: 'novos', categoriaNome: 'Francesinhas',
    pasta: 'assets/francesinha-rosa', mao: 'assets/francesinha-rosa/mao.jpg'
  },
  {
    id: 'n2-francesinha-vermelha', num: 'N2', titulo: 'Francesinha Vermelha', subtitulo: 'Ponta vermelha profunda sobre nude',
    categoria: 'novos', categoriaNome: 'Francesinhas',
    pasta: 'assets/modelos-gabarito/francesinha-vermelha', mao: 'assets/modelos-gabarito/francesinha-vermelha/mao.jpg'
  },
  {
    id: 'n3-matcha', num: 'N3', titulo: 'Verde Matcha', subtitulo: 'Cor única em verde matcha',
    categoria: 'novos', categoriaNome: 'Cores',
    pasta: 'assets/modelos-gabarito/matcha', mao: 'assets/modelos-gabarito/matcha/mao.jpg'
  },
  {
    id: 'n4-margaridas', num: 'N4', titulo: 'Margaridas', subtitulo: 'Flores e folhas sobre nude',
    categoria: 'novos', categoriaNome: 'Nail art',
    pasta: 'assets/modelos-gabarito/margaridas', mao: 'assets/modelos-gabarito/margaridas/mao.jpg'
  },
  {
    id: 'n5-cromado-rosa', num: 'N5', titulo: 'Cromado Rosa', subtitulo: 'Efeito espelhado rosa e lilás',
    categoria: 'novos', categoriaNome: 'Cromados',
    pasta: 'assets/modelos-gabarito/cromado-rosa', mao: 'assets/modelos-gabarito/cromado-rosa/mao.jpg'
  },
  {
    id: 'n6-marmorizado-verde', num: 'N6', titulo: 'Marmorizado Verde', subtitulo: 'Veios de jade com fios brancos',
    categoria: 'novos', categoriaNome: 'Nail art',
    pasta: 'assets/modelos-gabarito/marmorizado-verde', mao: 'assets/modelos-gabarito/marmorizado-verde/mao.jpg'
  },
  {
    id: '01-francesinha-classica',
    num: '01',
    titulo: 'Francesinha Clássica',
    subtitulo: 'Ponta branca curva modular',
    categoria: 'classicos',
    categoriaNome: 'Clássicos',
    pasta: 'assets/modelos/01-francesinha-classica'
  },
  {
    id: '02-baby-boomer',
    num: '02',
    titulo: 'Baby Boomer',
    subtitulo: 'Degradê suave para ponta branca',
    categoria: 'degrades',
    categoriaNome: 'Degradê',
    pasta: 'assets/modelos/02-baby-boomer'
  },
  {
    id: '03-filha-unica-ouro',
    num: '03',
    titulo: 'Filha Única Dourada',
    subtitulo: 'Foil de ouro metálico no anelar',
    categoria: 'degrades',
    categoriaNome: 'Foil & Ouro',
    pasta: 'assets/modelos/03-filha-unica-ouro'
  },
  {
    id: '04-ponto-de-luz',
    num: '04',
    titulo: 'Ponto de Luz',
    subtitulo: 'Strass solitário na cutícula',
    categoria: 'degrades',
    categoriaNome: 'Joias & Strass',
    pasta: 'assets/modelos/04-ponto-de-luz'
  },
  {
    id: '05-micro-francesinha-vinho',
    num: '05',
    titulo: 'Micro Francesinha Vinho',
    subtitulo: 'Traço ultrafino em bordô na ponta',
    categoria: 'classicos',
    categoriaNome: 'Francesinhas',
    pasta: 'assets/modelos/05-micro-francesinha-vinho'
  },
  {
    id: '06-linhas-minimalistas',
    num: '06',
    titulo: 'Linhas Minimalistas',
    subtitulo: 'Ondas em branco e dourado',
    categoria: 'artisticos',
    categoriaNome: 'Editorial',
    pasta: 'assets/modelos/06-linhas-minimalistas'
  },
  {
    id: '07-poa-delicado',
    num: '07',
    titulo: 'Poá Retrô Delicado',
    subtitulo: 'Pontinhos simétricos brancos',
    categoria: 'artisticos',
    categoriaNome: 'Romântico',
    pasta: 'assets/modelos/07-poa-delicado'
  },
  {
    id: '08-marmorizado-quartzo',
    num: '08',
    titulo: 'Marmorizado Quartzo',
    subtitulo: 'Veios minerais translúcidos',
    categoria: 'artisticos',
    categoriaNome: 'Efeitos',
    pasta: 'assets/modelos/08-marmorizado-quartzo'
  },
  {
    id: '09-francesinha-diagonal',
    num: '09',
    titulo: 'Francesinha Diagonal',
    subtitulo: 'Canto angular com filete dourado',
    categoria: 'classicos',
    categoriaNome: 'Geométricos',
    pasta: 'assets/modelos/09-francesinha-diagonal'
  },
  {
    id: '10-meia-lua-invertida',
    num: '10',
    titulo: 'Meia-Lua Invertida',
    subtitulo: 'Lúnula branca na raiz da cutícula',
    categoria: 'classicos',
    categoriaNome: 'Vintage',
    pasta: 'assets/modelos/10-meia-lua-invertida'
  }
];

/* hashtags de cada modelo (sem acento e sem espaço, como se escreve no Instagram); clicar numa filtra a lista */
const TAGS = {
  'n1-francesinha-rosa': ['francesinha', 'perolas', 'rosa'],
  'n2-francesinha-vermelha': ['francesinha', 'vermelho', 'classico'],
  'n3-matcha': ['matcha', 'verde', 'corunica'],
  'n4-margaridas': ['margaridas', 'floral', 'nailart'],
  'n5-cromado-rosa': ['cromado', 'rosa', 'espelhado'],
  'n6-marmorizado-verde': ['marmorizado', 'verde', 'nailart'],
  '01-francesinha-classica': ['francesinha', 'classico', 'nude'],
  '02-baby-boomer': ['babyboomer', 'degrade', 'nude'],
  '03-filha-unica-ouro': ['foil', 'ouro', 'filhaunica'],
  '04-ponto-de-luz': ['strass', 'minimalista', 'perolado'],
  '05-micro-francesinha-vinho': ['francesinha', 'vinho', 'minimalista'],
  '06-linhas-minimalistas': ['linhas', 'minimalista', 'dourado'],
  '07-poa-delicado': ['poa', 'retro', 'romantico'],
  '08-marmorizado-quartzo': ['marmorizado', 'quartzo', 'rosa'],
  '09-francesinha-diagonal': ['francesinha', 'geometrico', 'dourado'],
  '10-meia-lua-invertida': ['meialua', 'vinho', 'vintage']
};
MODELOS_SALAO.splice(6, 0, ...MODELOS_GABARITO);   // os importados (modelos-gabarito-dados.js) entram logo depois dos 6 destaques
MODELOS_SALAO.forEach((m) => { m.tags = m.tags || TAGS[m.id] || []; });

const NOMES_DEDOS = ['polegar', 'indicador', 'medio', 'anelar', 'minimo'];
const NOMES_EXIBICAO = ['Polegar', 'Indicador', 'Médio', 'Anelar', 'Mínimo'];

const cacheImagens = new Map();
function carregarImagem(url) {
  if (cacheImagens.has(url)) return cacheImagens.get(url);
  const p = new Promise((ok, erro) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => erro(new Error(`Não foi possível carregar ${url}`));
    im.src = url;
  });
  cacheImagens.set(url, p);
  return p;
}

async function renderizarCanvasUnha(url) {
  const img = await carregarImagem(url);
  const cv = document.createElement('canvas');
  cv.width = TEX_L;
  cv.height = TEX_A;
  const ctx = cv.getContext('2d');
  // Garante que o canvas começa limpo e 100% transparente
  ctx.clearRect(0, 0, TEX_L, TEX_A);
  ctx.drawImage(img, 0, 0, TEX_L, TEX_A);
  return cv;
}

export function iniciarModelosSalao({ modal, botaoAbrir, getAlvo, setAlvo, aoAplicar }) {
  if (!modal) return;

  const gradeEl = modal.querySelector('[data-modal-grade]');
  const statusEl = modal.querySelector('[data-modal-status]');
  const btnFecharList = modal.querySelectorAll('[data-modal-fechar]');
  const btnPosicao = modal.querySelector('[data-modal-posicao]');
  /* abas montadas aqui (cada uma agrupa uma ou mais categorias dos modelos); o HTML só traz o contêiner */
  const ABAS = [
    { id: 'todas', rotulo: 'Todos', cats: null },
    { id: 'novos', rotulo: 'Destaques', cats: ['novos'] },
    { id: 'naturais', rotulo: 'Naturais', cats: ['naturais'] },
    { id: 'francesinhas', rotulo: 'Francesinhas', cats: ['francesinhas'] },
    { id: 'cores', rotulo: 'Cores', cats: ['cores'] },
    { id: 'acabamentos', rotulo: 'Acabamentos', cats: ['acabamentos'] },
    { id: 'nailart', rotulo: 'Nail art', cats: ['nailart'] },
    { id: 'modulares', rotulo: 'Modulares', cats: ['classicos', 'degrades', 'artisticos'] }
  ];
  const abasEl = modal.querySelector('.h3d__modal-abas');
  if (abasEl) {
    abasEl.innerHTML = '';
    ABAS.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.className = 'h3d__modal-aba' + (i === 0 ? ' ativa' : '');
      b.dataset.aba = a.id;
      b.dataset.rotulo = a.rotulo;
      b.textContent = a.rotulo;
      abasEl.appendChild(b);
    });
  }
  const abas = modal.querySelectorAll('[data-aba]');
  const botoesDestino = modal.querySelectorAll('[data-modal-destinos] button');

  let categoriaAtual = 'todas';
  let tagAtual = '';            // hashtag escolhida para filtrar ('' = todas)
  let alvoAtual = getAlvo ? getAlvo() : -1;
  let modeloAtivoId = null;

  function abrirModal() {
    alvoAtual = getAlvo ? getAlvo() : -1;
    sincronizarDestinos();
    modal.classList.remove('lateral'); // abre centralizado
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function fecharModal() {
    modal.hidden = true;
    modal.classList.remove('lateral');
    document.body.style.overflow = '';
  }

  if (botaoAbrir) {
    botaoAbrir.addEventListener('click', abrirModal);
  }

  if (btnPosicao) {
    btnPosicao.addEventListener('click', () => {
      const eLateral = modal.classList.toggle('lateral');
      document.body.style.overflow = eLateral ? '' : 'hidden';
      btnPosicao.title = eLateral ? 'Centralizar na tela' : 'Mover para lateral';
      btnPosicao.textContent = eLateral ? '⤢' : '⤡';
    });
  }

  btnFecharList.forEach((btn) => btn.addEventListener('click', fecharModal));

  modal.addEventListener('click', (e) => {
    // Se não estiver em modo lateral, clicar no backdrop fecha
    if (!modal.classList.contains('lateral') && e.target === modal) fecharModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) fecharModal();
  });

  function sincronizarDestinos() {
    botoesDestino.forEach((b) => {
      b.setAttribute('aria-checked', String(+b.dataset.i === alvoAtual));
    });
  }

  botoesDestino.forEach((b) => {
    b.addEventListener('click', () => {
      alvoAtual = +b.dataset.i;
      sincronizarDestinos();
      if (setAlvo) setAlvo(alvoAtual);
    });
  });

  // Filtro por abas
  abas.forEach((aba) => {
    aba.addEventListener('click', () => {
      abas.forEach((a) => a.classList.remove('ativa'));
      aba.classList.add('ativa');
      categoriaAtual = aba.dataset.aba;
      renderizarGrade();
    });
  });

  function avisar(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.hidden = !msg;
    if (msg) {
      setTimeout(() => {
        if (statusEl.textContent === msg) statusEl.hidden = true;
      }, 3500);
    }
  }

  async function aplicarModelo(m) {
    // Movimento suave para a esquerda diminuindo de tamanho ao selecionar uma unha!
    modal.classList.add('lateral');
    document.body.style.overflow = '';
    if (btnPosicao) {
      btnPosicao.title = 'Centralizar na tela';
      btnPosicao.textContent = '⤢';
    }

    avisar(`Aplicando ${m.titulo}…`);
    try {
      if (alvoAtual >= 0) {
        // Aplica na unha específica
        const dedo = NOMES_DEDOS[alvoAtual];
        const url = `${m.pasta}/${dedo}.${m.ext || 'png'}?v=3`;
        const cv = await renderizarCanvasUnha(url);
        aoAplicar(cv, alvoAtual);
        avisar(`✓ ${m.titulo} aplicado no ${NOMES_EXIBICAO[alvoAtual]}`);
      } else {
        // Aplica nas 5 unhas
        for (let i = 0; i < NOMES_DEDOS.length; i++) {
          const dedo = NOMES_DEDOS[i];
          const url = `${m.pasta}/${dedo}.${m.ext || 'png'}?v=3`;
          const cv = await renderizarCanvasUnha(url);
          aoAplicar(cv, i);
        }
        avisar(`✓ ${m.titulo} aplicado nas 5 unhas`);
      }
      modeloAtivoId = m.id;
      marcarAtivo();
    } catch (err) {
      avisar(`Erro ao aplicar o modelo: ${err.message}`);
    }
  }

  const tagbarEl = modal.querySelector('[data-modal-tagbar]');

  /* filtra a lista por hashtag e mostra a faixa "Filtrando por #tag · limpar" */
  function filtrarTag(t) {
    tagAtual = t;
    if (tagbarEl) {
      tagbarEl.hidden = !t;
      tagbarEl.innerHTML = '';
      if (t) {
        const rot = document.createElement('span');
        rot.textContent = `Filtrando por #${t}`;
        const limpar = document.createElement('button');
        limpar.type = 'button';
        limpar.className = 'h3d__modal-tag ativa';
        limpar.textContent = 'limpar ✕';
        limpar.addEventListener('click', () => filtrarTag(''));
        tagbarEl.append(rot, limpar);
      }
    }
    renderizarGrade();
  }

  /* números das abas e do botão "N modelos" saem dos dados (não ficam escritos à mão no HTML) */
  function atualizarContagens() {
    abas.forEach((aba) => {
      if (!aba.dataset.rotulo) aba.dataset.rotulo = aba.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
      const def = ABAS.find((x) => x.id === aba.dataset.aba);
      const n = def.cats ? MODELOS_SALAO.filter((m) => def.cats.includes(m.categoria)).length : MODELOS_SALAO.length;
      aba.textContent = `${aba.dataset.rotulo} (${n})`;
    });
    document.querySelectorAll('[data-modelos-total]').forEach((el) => { el.textContent = `${MODELOS_SALAO.length} modelos`; });
  }

  function marcarAtivo() {
    if (!gradeEl) return;
    gradeEl.querySelectorAll('.h3d__modal-card').forEach((c) => {
      c.setAttribute('aria-checked', String(c.dataset.id === modeloAtivoId));
    });
  }

  function renderizarGrade() {
    if (!gradeEl) return;
    atualizarContagens();
    gradeEl.innerHTML = '';

    const filtrados = MODELOS_SALAO.filter((m) => {
      if (tagAtual && !m.tags.includes(tagAtual)) return false;
      const aba = ABAS.find((a) => a.id === categoriaAtual);
      if (!aba || !aba.cats) return true;
      return aba.cats.includes(m.categoria);
    });

    filtrados.forEach((m) => {
      const item = document.createElement('div');
      item.className = 'h3d__modal-item';

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'h3d__modal-card h3d__modal-card--so-unha';
      card.dataset.id = m.id;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', String(m.id === modeloAtivoId));
      card.title = `${m.num} · ${m.titulo} (${m.categoriaNome})`;
      card.setAttribute('aria-label', `${m.num} · ${m.titulo}`);

      // Exibe apenas a imagem / silhueta da unha
      if (m.mao) card.className = 'h3d__modal-card h3d__modal-card--mao';   // modelo novo: a mão inteira em quadrado
      const dedoPreview = m.id === '03-filha-unica-ouro' ? 'anelar' : 'medio';
      card.innerHTML = `
        <div class="h3d__unha-figura">
          <img src="${m.mao || `${m.pasta}/${dedoPreview}.png`}" alt="${m.titulo}" loading="lazy">
        </div>
      `;

      card.addEventListener('click', () => aplicarModelo(m));

      const rotulo = document.createElement('span');
      rotulo.className = 'h3d__modal-item-nome';
      rotulo.textContent = `${m.num} · ${m.titulo}`;

      item.appendChild(card);
      item.appendChild(rotulo);
      if (m.tags.length) {
        const tg = document.createElement('div');
        tg.className = 'h3d__modal-tags';
        m.tags.forEach((t) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'h3d__modal-tag' + (t === tagAtual ? ' ativa' : '');
          b.textContent = `#${t}`;
          b.title = t === tagAtual ? 'Tirar o filtro' : `Ver só #${t}`;
          b.addEventListener('click', () => filtrarTag(t === tagAtual ? '' : t));
          tg.appendChild(b);
        });
        item.appendChild(tg);
      }
      gradeEl.appendChild(item);
    });
  }

  renderizarGrade();

  return {
    atualizarAlvo() {
      if (getAlvo) {
        alvoAtual = getAlvo();
        sincronizarDestinos();
      }
    },
    abrir: abrirModal,
    /* abre já no modo lateral: o menu fica pequeno à esquerda e a mão (vista de cima) continua à mostra */
    abrirLateral() {
      abrirModal();
      modal.classList.add('lateral');
      document.body.style.overflow = '';
      if (btnPosicao) { btnPosicao.title = 'Centralizar na tela'; btnPosicao.textContent = '⤢'; }
    },
    fechar: fecharModal
  };
}
