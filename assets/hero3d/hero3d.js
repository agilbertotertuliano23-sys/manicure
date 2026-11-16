/* Hero 3D da Belle, em duas etapas:

   1. Frascos: mão ao fundo + fileira de seis cores prontas + frasco "Sua cor" à esquerda,

      que aceita qualquer cor pelo controlador (matiz, saturação, luz, hex). Botão "Escolher cor".

   2. Mão: close da mão inteira com a cor escolhida + cartão de acabamento

      (só cor / detalhe / desenho). No detalhe e no desenho a pessoa envia uma imagem de

      referência e o shader a projeta sobre cada unha, recortada no formato da unha.

   Modelo: assets/3d/esmalte-mao.glb (nós mao, frasco_fechado, frasco_aberto — este fica oculto)

   e assets/3d/mao-hd.glb (mão em alta, baixada só na etapa 2). */

import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { CORES, INICIAL } from './cores.js';

import { UNHAS } from './unhas.js';

import { criarControle, fundoPara, textoPara } from './cor-controle.js';

import { ARTE_ASP } from './arte-unha.js';

import { criarEditor } from './unhas-editor.js';

import { criarUnhasModelo } from './unhas-modelo.js';

import { criarServicos, paramsAcabamento } from './unhas-servicos.js';

import { criarFotoUnha } from './foto-unha.js';

import { criarArteIA } from './foto-ia.js';

import { iniciarModelosSalao } from './modelos-salao.js?v=6';

import { criarEnquadre } from './enquadre.js';

import { aplicarArteInicial } from './arte-inicial.js?v=2';

import { refinarPeleGeometria } from './pele-unhas.js?v=19';



const URL_MODELO = new URL('../3d/esmalte-mao.glb', import.meta.url).href;

const URL_MAO_HD = new URL('../3d/mao-hd.glb', import.meta.url).href;

const URL_DRACO = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';



/* posições em metros (y para cima); conferidas com prévias no Blender */

const MAO = { x: -0.27, z: -0.25 };

const FILEIRA = { x0: 0.1, z: 0.2, passo: 0.145, escala: 0.62 };

const SUA_FRASCO = { x: -0.47, z: 0.16, escala: 0.9 };

const VISTAS = {

  frascos: { pos: [0.04, 1.26, 1.26], alvo: [0.04, 0, -0.24] },

  mao:     { pos: [0.59, 1.85, -0.62], alvo: [-0.17, 0.02, -0.34] }

};

const FOV = 24;



/* tela em pé (celular): pontos que precisam caber na parte livre da tela (enquadre.js).

   Frascos: a fileira inteira. Mão: os cinco dedos, da ponta (+6 cm) até o nó (-22 cm); o punho fica por baixo do cartão. */

const ENQ = criarEnquadre(THREE);

const PTS_FRASCOS = [-0.54, 0.51].flatMap((x) => [0, 0.3].map((y) => new THREE.Vector3(x, y, 0.18)));

const PTS_DEDOS = UNHAS.flatMap((u) => [-0.22, 0.06].map((k) =>

  new THREE.Vector3(u.c[0] + u.u[0] * k + MAO.x, u.c[1] + u.u[1] * k, u.c[2] + u.u[2] * k + MAO.z)));

const UP_DEDOS = [1, 0, 0]; // com a mão em pé, a ponta dos dedos (+x do modelo) aponta para cima na tela



/* frasco "Sua cor" (índice 6 da paleta): cor mutável */

const SUA = { id: 'sua', nome: 'Sua cor', desc: '', esmalte: '#9B6BD6', fundo: '', texto: '', arco: true };

SUA.fundo = fundoPara(SUA.esmalte);

SUA.texto = textoPara(SUA.fundo);

const PALETA = [...CORES, SUA];

const I_SUA = PALETA.length - 1;



/* ---------- shaders ---------- */

/* frascos: o líquido é o único carmim da textura, basta a razão vermelho/verde */

const GLSL_FRASCO = /* glsl */`

  vec3 sg = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));

  float bMask = smoothstep(1.9, 2.6, sg.r / (sg.g + 0.02)) * smoothstep(0.1, 0.22, sg.r);

  float lumE = dot(sg, vec3(0.299, 0.587, 0.114));

  float ouro = 0.0;

  float cromo = 0.0;

  /* arco-íris: o matiz sobe pelo líquido e desliza com o tempo (uArco 1 = arco-íris, 0 = cor única) */

  float hArco = fract(vPosObj.y * 4.2 + vPosObj.x * 1.6 - uArcoT * 0.07);

  vec3 corArco = clamp(abs(mod(hArco * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);

  corArco = mix(vec3(1.0), corArco, 0.88);

  vec3 corLiq = mix(uCor, corArco, uArco);

  vec3 novaCor = clamp(corLiq * (lumE / 0.26), 0.0, 1.0);

  novaCor = mix(novaCor, vec3(1.0), smoothstep(0.55, 0.95, lumE) * 0.5);

  diffuseColor.rgb = mix(diffuseColor.rgb, pow(novaCor, vec3(2.2)), bMask);

`;



/* mão: a unha que vinha pintada na textura (carmim) vira cor de leito da unha; quem aparece como unha é a

   malha 3D de unhas-modelo.js, assentada por cima (cor, arte, brilho e formato ficam lá). A pele também é

   avermelhada, então a troca só vale dentro das caixas das 5 unhas (unhas.js) e onde a textura é carmim. */

const GLSL_MAO = /* glsl */`

  vec3 sg = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));

  float razao = sg.r / (sg.g + 0.02);

  float caixa = 0.0;

  float alem = 0.0; // 1 = além da ponta da unha 3D (unha rente mais curta que a pintada)

  float raio = 9.0; // distância normalizada ao centro da unha mais próxima (1 = contorno da unha pintada)

  for (int i = 0; i < 5; i++) {

    vec3 d = vPosObj - uUnhaC[i];

    float pa = dot(d, uUnhaU[i]);

    float pb = dot(d, uUnhaV[i]);

    float pn = dot(d, uUnhaN[i]);

    /* caixa larga o bastante para o degradê da pele terminar dentro dela (antes ela cortava o degradê) */

    float dentro = (1.0 - smoothstep(1.25, 1.65, abs(pa / uUnhaH[i].x)))

                 * (1.0 - smoothstep(1.35, 1.8, abs(pb / uUnhaH[i].y)))

                 * (1.0 - smoothstep(0.022, 0.035, pn))

                 * (1.0 - smoothstep(0.45, 0.75, -pn / uUnhaH[i].x)); // só o dorso: a lateral e a parte de baixo do dedo ficam com a textura original

    if (dentro > caixa) {

      caixa = dentro;

      raio = length(vec2(pa / uUnhaH[i].x, pb / uUnhaH[i].y));

      float ponta = 1.0 + 2.0 * uExtK;

      alem = smoothstep(ponta - 0.06, ponta + 0.02, pa / uUnhaH[i].x);

    }

  }

  /* a unha pintada da textura (carmim) E a faixa clara/rasgada da dobra ao redor dela viram o mesmo tom de pele:

     sem franja avermelhada nem fio branco (aspecto de machucado) quando a câmera chega perto */

  float rubro = smoothstep(2.0, 3.0, razao) * smoothstep(0.1, 0.22, sg.r);

  float claro = smoothstep(0.6, 0.72, min(sg.r, min(sg.g, sg.b))); // pele normal: canal mínimo ~0,52; a dobra pálida passa de 0,6

  /* em volta da unha 3D a textura ainda tem o contorno rasgado da unha amendoada escaneada (rebordo claro e

     irregular): rente à unha a pele vira o tom médio da mão e, em DEGRADÊ, volta à textura original

     (raio 1 = contorno da unha pintada; some até 1,5) */

  float limpa = 1.0 - smoothstep(1.05, 1.8, raio); // degradê longo e suave até a pele original

  /* a textura escaneada tem pele de baixo/lateral do dedão (e da palma) em vermelho escuro de esmalte, que fica

     avermelhada e manchada ao lado do dorso claro, com pontos de esmalte soltos: em qualquer ponto da mão onde a

     textura é muito mais vermelha que pele (razão r/g > ~2) ela vira o mesmo tom natural da pele, com o sombreado */

  float verm = smoothstep(1.9, 3.1, razao) * smoothstep(0.15, 0.30, sg.r);

  float bMask = max(caixa * max(max(rubro, claro), limpa), verm);

  float lumE = dot(sg, vec3(0.299, 0.587, 0.114));

  /* tom médio da pele da textura (mediana medida: 0,92/0,56/0,52), com a luz da própria textura atenuada, para o

     degradê não deixar contorno mais claro nem mais escuro. O carmim (que fica sob a unha) é bem mais escuro: usa

     outra referência de luminância. */

  float lumRef = mix(0.665, 0.26, rubro);

  /* mantém 35% do sombreado da própria textura (sem isso a pele em volta parecia plástico); a faixa pálida e o

     carmim não trazem sombreado nenhum */

  float luzE = mix(clamp(mix(1.0, lumE / lumRef, 0.35 + 0.65 * rubro), 0.88, 1.06), 1.0, claro);

  luzE = max(luzE, 0.93 * verm); // pele recolorida fora das unhas não fica mais escura que a vizinha

  /* tom medido na pele em volta de cada unha (mediana do anel 1,5–2,4 na textura: igual nos cinco dedos) */

  vec3 pele = clamp(vec3(0.935, 0.555, 0.522) * luzE, 0.0, 1.0);

  /* o que a unha 3D não cobrir é pele (nunca a cor do esmalte: esmalte fora da unha parecia vazamento) */

  diffuseColor.rgb = mix(diffuseColor.rgb, pow(pele, vec3(2.2)), bMask);

  float ouro = 0.0;

  float cromo = 0.0;

`;



function hexV(h) {

  const n = parseInt(h.slice(1), 16);

  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);

}



function materialEsmalte(base, aspereza, brilhoEsmalte, extra) {

  const m = base.clone();

  m.metalness = 0;

  m.roughness = aspereza;

  const u = Object.assign({ uCor: { value: new THREE.Vector3() }, uArco: { value: 0 }, uArcoT: { value: 0 } }, extra || {});

  const daMao = !!extra;

  m.userData.u = u;

  m.onBeforeCompile = (s) => {

    Object.assign(s.uniforms, u);

    let decl = 'uniform vec3 uCor;\nuniform float uArco;\nuniform float uArcoT;\nvarying vec3 vPosObj;';

    if (daMao) {

      decl += '\nuniform vec3 uUnhaC[5];\nuniform vec3 uUnhaU[5];\nuniform vec3 uUnhaV[5];\nuniform vec3 uUnhaN[5];\nuniform vec2 uUnhaH[5];\nuniform float uExtK;';

    }

    s.vertexShader = s.vertexShader

      .replace('#include <common>', '#include <common>\nvarying vec3 vPosObj;')

      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosObj = position;');

    s.fragmentShader = s.fragmentShader

      .replace('#include <common>', '#include <common>\n' + decl)

      .replace('#include <map_fragment>', '#include <map_fragment>\n' + (daMao ? GLSL_MAO : GLSL_FRASCO))

      .replace('#include <roughnessmap_fragment>',

        '#include <roughnessmap_fragment>\n' + (daMao ? '' : 'roughnessFactor = mix(roughnessFactor, ' + brilhoEsmalte.toFixed(2) + ', bMask);\nroughnessFactor = mix(roughnessFactor, 0.16, ouro);\nroughnessFactor = mix(roughnessFactor, 0.12, cromo);'))

      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.92, max(ouro, cromo));');

  };

  m.customProgramCacheKey = () => (daMao ? 'mao-' : 'frasco-') + aspereza + '-' + brilhoEsmalte;

  return m;

}



/* anel de arco-íris no chão, embaixo do frasco "Sua cor" */

function texturaArcoIris() {

  const c = document.createElement('canvas');

  c.width = c.height = 256;

  const g = c.getContext('2d');

  const grad = g.createConicGradient(0, 128, 128);

  for (let k = 0; k <= 6; k++) grad.addColorStop(k / 6, `hsl(${k * 60}, 85%, 62%)`);

  g.fillStyle = grad;

  g.fillRect(0, 0, 256, 256);

  const t = new THREE.CanvasTexture(c);

  t.colorSpace = THREE.SRGBColorSpace;

  return t;

}



const raiz = document.getElementById('hero3d');

if (raiz) iniciar(raiz);



function iniciar(raiz) {

  const $ = (s) => raiz.querySelector(s);

  const canvas = $('.h3d__cena');

  const nomeEl = $('[data-nome]');

  const descEl = $('[data-desc]');

  const amostrasEl = $('.h3d__amostras');

  const btnEscolher = $('[data-escolher]');

  const etiquetaSua = $('[data-sua]');

  const cartao = $('[data-arte]');

  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;



  /* celular (toque): menos pixels e sombra mais leve, para a mão girar sem engasgar */

  const celular = matchMedia('(pointer: coarse)').matches;

  const razaoPixel = () => Math.min(devicePixelRatio, celular ? (modoMao ? 1.75 : 1.5) : (modoMao ? 2 : 1.75));



  let atual = INICIAL;

  let modoMao = false;

  let cena3d = null; // preenchido quando o modelo carrega



  /* ======================= ETAPA 1: escolher a cor ======================= */

  const botoes = PALETA.map((c, i) => {

    const b = document.createElement('button');

    b.type = 'button';

    b.className = 'h3d__amostra' + (i === I_SUA ? ' h3d__amostra--sua' : '');

    b.style.setProperty('--c', c.esmalte);

    b.setAttribute('role', 'radio');

    b.setAttribute('aria-label', i === I_SUA ? 'Sua cor (personalizada)' : c.nome);

    b.addEventListener('click', () => { parar(); escolher(i); });

    amostrasEl.appendChild(b);

    return b;

  });

  amostrasEl.addEventListener('keydown', (e) => {

    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];

    if (!passo) return;

    e.preventDefault();

    parar();

    escolher((atual + passo + PALETA.length) % PALETA.length);

    botoes[atual].focus();

  });



  const controle = criarControle($('[data-controle]'), {

    aoMudar(hex) {

      parar();

      SUA.arco = false;

      SUA.esmalte = hex;

      SUA.fundo = fundoPara(hex);

      SUA.texto = textoPara(SUA.fundo);

      botoes[I_SUA].style.setProperty('--c', hex);

      if (cena3d) cena3d.corFrasco(I_SUA, hex);

      escolher(I_SUA, atual === I_SUA);

    },

    aoArco() {

      parar();

      SUA.arco = true;

      escolher(I_SUA, atual === I_SUA);

    }

  });



  controle.arco(SUA.arco);

  let trocaTimer = 0;

  function escolher(i, semFade) {

    const mudouFrasco = i !== atual;

    atual = i;

    const c = PALETA[i];

    const desc = i === I_SUA ? (SUA.arco ? 'Todas as cores num só frasco: o esmalte passa por todo o arco-íris. Toque numa cor para fixar.' : `Qualquer tom que você imaginar. Código ${c.esmalte}.`) : c.desc;

    raiz.style.setProperty('--fundo', c.fundo);

    raiz.style.setProperty('--tinta', c.texto);

    raiz.style.setProperty('--esmalte', c.esmalte);

    raiz.classList.toggle('na-sua', i === I_SUA);

    botoes.forEach((b, k) => {

      b.setAttribute('aria-checked', String(k === i));

      b.tabIndex = k === i ? 0 : -1;

    });

    if (i !== I_SUA) controle.definir(c.esmalte);

    nomeArte.textContent = c.nome;

    if (semFade || reduz || !mudouFrasco) {

      nomeEl.textContent = c.nome;

      descEl.textContent = desc;

    } else {

      raiz.classList.add('troca');

      clearTimeout(trocaTimer);

      trocaTimer = setTimeout(() => {

        nomeEl.textContent = c.nome;

        descEl.textContent = desc;

        raiz.classList.remove('troca');

      }, 190);

    }

    if (cena3d) cena3d.cor(i);

  }



  /* troca automática entre as cores prontas até a pessoa interagir */

  let auto = 0;

  function parar() { clearInterval(auto); auto = 0; }

  function ligarAuto() {

    if (reduz || auto) return;

    auto = setInterval(() => escolher((atual + 1) % CORES.length), 5000);

  }



  etiquetaSua.addEventListener('click', () => {

    parar();

    escolher(I_SUA);

    $('[data-controle] [data-h]').focus();

  });



  /* ======================= ETAPA 2: a mão e a arte, unha por unha ======================= */

  const nomeArte = $('[data-nome2]');

  let unhaSel = -1;                 // unha em edição (-1 = todas / mão inteira)

  let ativosArte = [0, 0, 0, 0, 0]; // quais unhas têm arte

  const editor = criarEditor(cartao, {

    aoMudar(atlas, ativos) { ativosArte = ativos; if (cena3d) cena3d.arte(ativos); },

    aoSelecionar(i) {

      unhaSel = i;

      raiz.classList.toggle('editando', i >= 0); // com uma unha escolhida, arrastar no canvas move a arte (sem rolar a página)

      if (i >= 0) recolherCartao(false);          // tocar numa unha na mão abre o painel para editar

      if (seletorModelos) seletorModelos.atualizarAlvo();

    }

  });



  /* celular: o cartão vira uma folha que recolhe para a mão aparecer inteira */

  const alca = $('[data-recolher]');

  const alcaTxt = alca.querySelector('span');

  function recolherCartao(sim) {

    if (cartao.classList.contains('recolhido') === sim) return;

    cartao.classList.toggle('recolhido', sim);

    alca.setAttribute('aria-expanded', String(!sim));

    alcaTxt.textContent = sim ? 'Abrir painel' : 'Ver a mão';

  }

  alca.addEventListener('click', () => recolherCartao(!cartao.classList.contains('recolhido')));

  /* serviço, formato, comprimento e acabamento do esmalte (a geometria e os uniforms são aplicados em aplicarForma,

     que roda quando a mão carrega e a cada escolha) */

  const servicos = criarServicos($('[data-servicos]'), { aoMudar() { aplicarForma(); } });

  /* "Copiar de uma foto": a pessoa toca numa unha da foto e a arte vai para a unha da mão (foto-unha.js) */

  criarFotoUnha({

    raiz,

    botao: $('[data-foto-abrir]'),

    alvoInicial: () => editor.sel,

    aoAplicar: (canvas, indice) => editor.aplicarFoto(canvas, indice)

  });

  /* "Pegar o modelo do cliente": a IA recebe a foto do modelo e devolve a arte das 5 unhas, já ajustada (foto-ia.js + servidor.py) */

  criarArteIA({

    botao: $('[data-ia-abrir]'),

    aoAplicar: (canvas, indice) => editor.aplicarFoto(canvas, indice)

  });

  /* "Modelos mais pedidos": 10 referências clássicas e modernas selecionáveis */
  /* "Biblioteca de Modelos": janela modal centralizada com abas */
  const seletorModelos = iniciarModelosSalao({
    modal: $('[data-modal-modelos]'),
    botaoAbrir: $('[data-modelos-abrir]'),
    getAlvo: () => editor.sel,
    setAlvo: (i) => editor.selecionar(i),
    aoAplicar: (canvas, indice) => editor.aplicarFoto(canvas, indice)
  });



  /* ao abrir o modelo as cinco unhas já vêm com a francesinha rosa (arte-inicial.js) */
  /* celular: sem a francesinha de abertura, para a unha da mão mostrar a cor do esmalte escolhido desde o início */
  if (!matchMedia('(max-width:760px)').matches) aplicarArteInicial(editor);

  /* biblioteca de modelos logo abaixo das tonalidades (etapa 1): vai para a mão vista de cima e abre a biblioteca ao lado */
  const botaoLibInicio = $('[data-modelos-inicio]');
  if (botaoLibInicio) {
    botaoLibInicio.addEventListener('click', () => {
      irParaMao(true);
      setTimeout(() => { if (seletorModelos) seletorModelos.abrirLateral(); }, reduz ? 0 : 450);
    });
  }

  /* biblioteca aberta ao lado: avisa a cena (classe + reenquadre) para a mão ficar na parte livre, sem ser coberta */
  const modalModelos = $('[data-modal-modelos]');
  const caixaModelos = modalModelos && modalModelos.querySelector('.h3d__modal-caixa');
  function bibliotecaLateral() {
    return !!(caixaModelos && !modalModelos.hidden && modalModelos.classList.contains('lateral'));
  }
  if (modalModelos && caixaModelos) {
    new MutationObserver(() => {
      /* celular: ao abrir a biblioteca a seção ocupa a tela toda; leva a página até ela */
      const abriu = !modalModelos.hidden && !raiz.classList.contains('biblioteca-aberta');
      if (abriu && matchMedia('(max-width:760px)').matches) raiz.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
      raiz.classList.toggle('biblioteca-aberta', !modalModelos.hidden);
      raiz.classList.toggle('biblioteca-lateral', bibliotecaLateral());
      enquadrar();
    }).observe(modalModelos, { attributes: true, attributeFilter: ['hidden', 'class'] });
    new ResizeObserver(() => { if (bibliotecaLateral()) enquadrar(); }).observe(caixaModelos); // a janela muda de largura ao deslizar
  }

  /* celular: a imagem em quadrado (lightbox) abre como folha embaixo; a mão é reenquadrada (centro + zoom) na parte livre de cima */
  const lightboxModelo = $('[data-lightbox-modelo]');
  const caixaLightbox = lightboxModelo && lightboxModelo.querySelector('.h3d__lightbox-caixa');
  if (lightboxModelo && caixaLightbox) {
    new MutationObserver(() => enquadrar()).observe(lightboxModelo, { attributes: true, attributeFilter: ['hidden'] });
    new ResizeObserver(() => { if (!lightboxModelo.hidden) enquadrar(); }).observe(caixaLightbox);
  }

  /* troca de etapa: o painel some, troca e volta */

  let painelTimer = 0;

  function irParaMao(sim) {

    parar();

    modoMao = sim;

    if (mao && sim) mao.visible = true;

    if (!sim && editor.sel >= 0) editor.selecionar(-1);

    if (!sim) {
      girar(0); // ao voltar para os frascos a mão volta para a frente
      ajustarZoom(1.0, true);
    }

    recolherCartao(false);

    if (renderer) {

      if (modoMao) carregarMaoHD();

      renderer.setPixelRatio(razaoPixel());

      enquadrar();

    }

    clearTimeout(painelTimer);

    const trocar = () => {

      raiz.classList.toggle('modo-mao', modoMao);

      cartao.setAttribute('aria-hidden', String(!modoMao));

      $('.h3d__info').setAttribute('aria-hidden', String(modoMao));

      raiz.classList.remove('painel-saindo');

      (modoMao ? cartao.querySelector('[data-unhas] button') : btnEscolher).focus({ preventScroll: true });

    };

    if (reduz) { trocar(); return; }

    raiz.classList.add('painel-saindo');

    painelTimer = setTimeout(trocar, modoMao ? 420 : 260);

  }

  btnEscolher.addEventListener('click', () => irParaMao(true));

  $('[data-voltar]').addEventListener('click', () => irParaMao(false));



  escolher(atual, true);



  /* ======================= cena 3D ======================= */

  let renderer;

  try {

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });

  } catch (err) {

    console.warn('[hero3d] WebGL indisponível', err);

    raiz.classList.add('sem3d');

    return;

  }

  renderer.setPixelRatio(razaoPixel());

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.toneMapping = THREE.NeutralToneMapping;

  renderer.toneMappingExposure = 1.02;

  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type = THREE.PCFShadowMap;



  const cena = new THREE.Scene();

  const pmrem = new THREE.PMREMGenerator(renderer);

  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  cena.environmentIntensity = 0.5;



  const cam = new THREE.PerspectiveCamera(FOV, 2, 0.05, 30);



  cena.add(new THREE.HemisphereLight(0xffffff, 0xf2c4d2, 1.0));

  const sol = new THREE.DirectionalLight(0xffffff, 2.1);

  sol.position.set(-0.8, 2.0, 1.0);

  sol.castShadow = true;

  sol.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048);

  Object.assign(sol.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 0.5, far: 5 });

  sol.shadow.radius = 5;

  sol.shadow.bias = -0.0004;

  sol.shadow.normalBias = 0.012;

  cena.add(sol);



  const chao = new THREE.Mesh(

    new THREE.PlaneGeometry(10, 10),

    new THREE.ShadowMaterial({ opacity: 0.32, color: new THREE.Color(PALETA[atual].fundo).multiplyScalar(0.35) })

  );

  chao.rotation.x = -Math.PI / 2;

  chao.receiveShadow = true;

  cena.add(chao);



  /* câmera animada */

  const camPos = new THREE.Vector3(...VISTAS.frascos.pos);

  const camAlvo = new THREE.Vector3(...VISTAS.frascos.alvo);

  const paralaxe = new THREE.Vector2();

  const paralaxeAlvo = new THREE.Vector2();

  const tmpPos = new THREE.Vector3();

  const tmpAlvo = new THREE.Vector3();

  const tmpProj = new THREE.Vector3();

  const camUp = new THREE.Vector3(0, 1, 0);

  const camUpAlvo = new THREE.Vector3(0, 1, 0);

  let largura = 1, altura = 1, deslocX = 0, deslocY = 0; // deslocamentos em pixels (> 0 = a imagem vai para a direita / para baixo)

  let etiquetaLarg = 120;

  /* tela em pé: enquadramento de cada vista dentro da parte livre da tela (muda com o texto e o cartão) */

  let encFrascos = { f: 1, dx: 0, dy: 0 }, encMao = { f: 1, dx: 0, dy: 0 }, encUnha = { f: 1.5, dx: 0, dy: 0 };
  let encLivre = false; // tela larga com a biblioteca aberta ao lado: a mão é enquadrada na faixa livre (calcularEnquadreLivre)

  const infoEl = $('.h3d__info');

  const giroEl = $('.h3d__giro');



  function enquadrar() {

    const r = raiz.getBoundingClientRect();

    const w = Math.max(1, r.width), h = Math.max(1, r.height);

    if (w !== largura || h !== altura) {

      largura = w; altura = h;

      renderer.setSize(largura, altura, false);

    }

    cam.aspect = largura / altura;

    cam.fov = cam.aspect < 1 ? 30 : FOV;

    calcularEnquadres();

    aplicarDesloc();

  }



  /* tela em pé: o texto fica em cima (etapa 1) e o cartão embaixo (etapa 2). Cada vista é ajustada para caber, e

     ficar centrada, no que sobra: os frascos abaixo do texto; a mão (dedos para cima) acima da barra de girar. */

  /* tela larga com a biblioteca de modelos aberta ao lado: a mão (e a unha em foco) ficam na faixa livre, entre a janela da
     biblioteca e o cartão da direita (que se esconde em telas até 1100 px), acima da barra de girar */
  function calcularEnquadreLivre() {
    const rr = raiz.getBoundingClientRect();
    const cr = caixaModelos.getBoundingClientRect();
    const cartaoVisivel = !matchMedia('(max-width:1100px)').matches && !cartao.classList.contains('recolhido');
    const x0 = cr.right - rr.left + 18;
    const x1 = Math.max(x0 + 220, (cartaoVisivel ? cartao.getBoundingClientRect().left - rr.left : largura) - 18);
    const y0 = 18;
    const y1 = Math.max(y0 + 220, altura - giroEl.offsetHeight - 44);
    const rect = { x0, x1, y0, y1 };
    encMao = ENQ.ajustar({ vista: VISTAS.mao, up: [0, 1, 0], pts: PTS_DEDOS, W: largura, H: altura, fov: cam.fov, rect, fMin: afastamento(VISTAS.mao) });
    encMao.cx = (x0 + x1) / 2 - largura / 2; encMao.cy = y0 + (y1 - y0) * 0.22 - altura / 2; // o zoom cresce em torno deste ponto (perto das unhas)
    encUnha = { f: 1, dx: (x0 + x1) / 2 - largura / 2, dy: (y0 + y1) / 2 - altura / 2 };
    raiz.style.setProperty('--giro-x', (x0 + x1) / 2 + 'px');
    encLivre = true;
  }

  function calcularEnquadres() {

    etiquetaLarg = etiquetaSua.offsetWidth || etiquetaLarg;

    encLivre = false;
    raiz.style.removeProperty('--giro-x');
    const lateral = modoMao && bibliotecaLateral();
    if (cam.aspect >= 1) { if (lateral) calcularEnquadreLivre(); return; }

    /* celular: com a biblioteca aberta ela vira uma gaveta embaixo (no lugar do cartão); a mão fica na parte de cima */
    const rr = raiz.getBoundingClientRect();
    let topoJanela = lateral ? caixaModelos.getBoundingClientRect().top - rr.top : cartao.offsetTop;
    /* folha do quadrado aberta (ancorada embaixo da tela): usa offsetHeight, que ignora a animação de entrada */
    if (modoMao && lightboxModelo && !lightboxModelo.hidden && caixaLightbox) {
      topoJanela = Math.min(topoJanela, innerHeight - caixaLightbox.offsetHeight - rr.top);
    }
    const folha = Math.max(0, altura - topoJanela); // altura do cartão + a margem de baixo

    raiz.style.setProperty('--folha', folha + 'px');

    const topo = 14, lado = 10;

    const fimMao = Math.max(topo + 140, altura - folha - giroEl.offsetHeight - 26);

    const rectMao = { x0: lado, x1: largura - lado, y0: topo, y1: fimMao };

    encMao = ENQ.ajustar({ vista: VISTAS.mao, up: UP_DEDOS, pts: PTS_DEDOS, W: largura, H: altura, fov: cam.fov, rect: rectMao, fMin: 0.45 });

    encMao.cx = (rectMao.x0 + rectMao.x1) / 2 - largura / 2; encMao.cy = rectMao.y0 + (rectMao.y1 - rectMao.y0) * 0.22 - altura / 2; // idem

    encUnha = { f: 1.5, dx: 0, dy: (rectMao.y0 + rectMao.y1) / 2 - altura / 2 };

    const y0Fr = Math.max(infoEl.offsetTop + infoEl.offsetHeight + 18, Math.round(altura * 0.38));
    const rectFr = { x0: lado, x1: largura - lado, y0: y0Fr, y1: altura - 36 };

    encFrascos = ENQ.ajustar({ vista: VISTAS.frascos, pts: PTS_FRASCOS, W: largura, H: altura, fov: cam.fov, rect: rectFr, fMin: 0.85 });

  }



  /* a câmera é deslocada na janela (setViewOffset), sem mexer no alvo */

  function aplicarDesloc() {

    if (Math.abs(deslocX) > 0.5 || Math.abs(deslocY) > 0.5) cam.setViewOffset(largura, altura, -deslocX, -deslocY, largura, altura);

    else cam.clearViewOffset();

    cam.updateProjectionMatrix();

  }



  /* distância extra em telas mais estreitas que 2:1, para os frascos não saírem pelos lados */

  function afastamento(vista) {

    const base = new THREE.Vector3(...vista.pos).distanceTo(new THREE.Vector3(...vista.alvo));

    const a = cam.aspect;

    if (a >= 2) return 1;

    const meiaLargura = THREE.MathUtils.clamp(0.64 + (a - 0.6) * 0.14, 0.64, 0.833);

    const d = meiaLargura / (Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * a);

    return Math.max(1, d / base);

  }



  /* o cartão e o texto mudam de altura (recolher, "Sua cor" abre o controlador, fonte carregando): reenquadra */

  const observador = new ResizeObserver(enquadrar);

  [raiz, cartao, infoEl, giroEl].forEach((el) => observador.observe(el));

  enquadrar();



  /* ---------- modelo ---------- */

  const frascos = [];

  const matsFrasco = [];

  let mao = null, matMao = null, fileira = null, anel = null, modelo = null;

  const corUnhaAlvo = hexV(PALETA[atual].esmalte);

  const sombraAlvo = new THREE.Color(PALETA[atual].fundo).multiplyScalar(0.35);



  /* dados das unhas para o shader da mão */

  const v3 = (a) => new THREE.Vector3(...a);

  const texArte = new THREE.CanvasTexture(editor.atlas);

  texArte.colorSpace = THREE.SRGBColorSpace;

  texArte.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const uniformsMao = {

    uUnhaC: { value: UNHAS.map((u) => v3(u.c)) },

    uUnhaU: { value: UNHAS.map((u) => v3(u.u)) },

    uUnhaV: { value: UNHAS.map((u) => v3(u.v)) },

    uUnhaN: { value: UNHAS.map((u) => v3(u.n)) },

    uUnhaH: { value: UNHAS.map((u) => new THREE.Vector2(u.hu, u.hv)) },

    uUnhaArte: { value: UNHAS.map(() => 0) },

    uArte: { value: texArte },

    uArteOn: { value: 0 },

    uArteAsp: { value: ARTE_ASP },

    uSelUnha: { value: -1 },

    uTempo: { value: 0 },

    /* modelagem e acabamento (unhas-modelo.js / unhas-servicos.js) */

    uExtK: { value: 0 },      // quanto a unha passa da ponta do dedo, em comprimentos de unha

    uRug: { value: 0.14 },    // rugosidade do esmalte

    uBrilhoK: { value: 1 },   // força das faixas de reflexo

    uMetal: { value: 0 }      // 1 = cromado

  };



  /* o modelo principal agora vem comprimido (Draco + WebP): 2,9 MB -> 0,65 MB, mesma geometria */
  const dracoBase = new DRACOLoader().setDecoderPath(URL_DRACO);

  new GLTFLoader().setDRACOLoader(dracoBase).load(URL_MODELO, (gltf) => {

    dracoBase.dispose(); // a geometria já foi decodificada; libera os workers

    const g = gltf.scene;

    const noMao = g.getObjectByName('mao');

    const noFechado = g.getObjectByName('frasco_fechado');

    const noAberto = g.getObjectByName('frasco_aberto');

    if (!noMao || !noFechado) { raiz.classList.add('sem3d'); return; }



    const malhas = [];

    g.traverse((o) => { if (o.isMesh) malhas.push(o); });

    const matBase = malhas[0].material;

    if (matBase.map) {

      matBase.map.anisotropy = renderer.capabilities.getMaxAnisotropy();

      matBase.map.colorSpace = THREE.SRGBColorSpace;

    }



    /* mão */

    mao = noMao;

    matMao = materialEsmalte(matBase, 0.62, 0.14, uniformsMao);

    /* a pele refinada deixa triângulos de costas nas laterais da unha (furinhos pretos na prega): desenha os dois lados */

    matMao.side = THREE.DoubleSide;

    matMao.userData.u.uCor.value.copy(corUnhaAlvo);

    mao.traverse((o) => { if (o.isMesh) { refinarPeleGeometria(o.geometry); o.material = matMao; o.castShadow = true; o.receiveShadow = true; } });

    mao.position.set(MAO.x, 0, MAO.z);

    mao.rotation.set(0, 0, 0);

    mao.visible = modoMao;

    cena.add(mao);



    /* unhas modeladas: extensão 3D (formato + comprimento) presa à malha da mão */

    let malhaMao = null;

    mao.traverse((o) => { if (o.isMesh && !malhaMao) malhaMao = o; });

    if (malhaMao) {

      modelo = criarUnhasModelo(malhaMao, matMao.userData.u);

      aplicarForma();

      modelo.arte(ativosArte);

    }



    /* fileira: seis cores prontas + o frasco "Sua cor" à esquerda */

    fileira = new THREE.Group();

    cena.add(fileira);

    PALETA.forEach((c, i) => {

      const grupo = new THREE.Group();

      const f = noFechado.clone();

      f.position.set(0, 0, 0);

      f.rotation.set(0, 0, 0);

      const mat = materialEsmalte(matBase, 0.22, 0.1);

      mat.userData.u.uCor.value.copy(hexV(c.esmalte));

      f.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = true; } });

      grupo.add(f);

      if (i === I_SUA) {

        grupo.scale.setScalar(SUA_FRASCO.escala);

        grupo.position.set(SUA_FRASCO.x, 0, SUA_FRASCO.z);

      } else {

        grupo.scale.setScalar(FILEIRA.escala);

        grupo.position.set(FILEIRA.x0 + (i - (CORES.length - 1) / 2) * FILEIRA.passo, 0, FILEIRA.z);

      }

      grupo.userData.indice = i;

      grupo.userData.y = 0;

      fileira.add(grupo);

      frascos.push(grupo);

      matsFrasco.push(mat);

    });

    anel = new THREE.Mesh(

      new THREE.RingGeometry(0.088, 0.104, 96),

      new THREE.MeshBasicMaterial({ map: texturaArcoIris(), transparent: true, opacity: 0.95, depthWrite: false })

    );

    anel.rotation.x = -Math.PI / 2;

    anel.position.set(SUA_FRASCO.x, 0.002, SUA_FRASCO.z);

    fileira.add(anel);



    /* frasco aberto: no projeto, mas oculto */

    if (noAberto) {

      noAberto.visible = false;

      const matAberto = materialEsmalte(matBase, 0.22, 0.1);

      matAberto.userData.u.uCor.value.copy(corUnhaAlvo);

      noAberto.traverse((o) => { if (o.isMesh) { o.material = matAberto; o.castShadow = true; } });

      noAberto.position.set(0.42, 0, 0.02);

      cena.add(noAberto);

    }



    cena3d = { cor: definirCor, corFrasco, arte: definirArte };

    window.belleHero = { cena, camera: cam, mao, frascos, frascoAberto: noAberto || null, escolher, irParaMao, ajustarZoom, getZoom: () => zoomAlvo };

    definirCor(atual);

    definirArte(ativosArte);

    raiz.classList.add('pronto');

    ligarAuto();

  }, undefined, (err) => {

    console.warn('[hero3d] não foi possível carregar o modelo', err);

    raiz.classList.add('sem3d');

  });



  function definirCor(i) {

    corUnhaAlvo.copy(hexV(PALETA[i].esmalte));

    sombraAlvo.set(PALETA[i].fundo).multiplyScalar(0.35);

  }

  function corFrasco(i, hex) {

    if (matsFrasco[i]) matsFrasco[i].userData.u.uCor.value.copy(hexV(hex));

  }

  /* cor do arco-íris no instante t (matiz 0..1), para as unhas acompanharem o frasco */

  function corArcoIris(t, alvo) {

    const f = (n) => Math.min(1, Math.max(0, Math.abs(((t * 6 + n) % 6) - 3) - 1));

    return alvo.set(0.12 + 0.82 * f(0), 0.12 + 0.82 * f(4), 0.12 + 0.82 * f(2));

  }

  /* aplica a escolha de serviço/formato/comprimento/acabamento: geometria da extensão + uniforms do esmalte */

  function aplicarForma() {

    const e = servicos.estado;

    if (modelo) modelo.definir({ formato: e.formato, comprimento: e.comprimento, servico: e.servico });

    else uniformsMao.uExtK.value = servicos.k;

    const p = paramsAcabamento(e);

    uniformsMao.uRug.value = p.rug;

    uniformsMao.uBrilhoK.value = p.brilho;

    uniformsMao.uMetal.value = p.metal;

    if (modelo) modelo.acabamento(p);

  }

  function definirArte(ativos) {

    if (modelo) modelo.arte(ativos);

    texArte.needsUpdate = true;

    uniformsMao.uArteOn.value = ativos.some(Boolean) ? 1 : 0;

    uniformsMao.uUnhaArte.value = ativos.slice();

  }



  /* câmera de frente para a unha escolhida, com a ponta do dedo para cima */

  function vistaUnha(i) {

    const u = UNHAS[i];

    const c = new THREE.Vector3(...u.c).add(mao.position);

    const dir = new THREE.Vector3(...u.n).addScaledVector(new THREE.Vector3(...u.u), -0.35).normalize();

    return { pos: c.clone().addScaledVector(dir, 0.42).toArray(), alvo: c.toArray(), up: u.u };

  }



  /* mão em alta: troca malha e textura (mesma origem, não muda de lugar) */

  let hdPedido = false;

  function carregarMaoHD() {

    if (hdPedido || !mao) return;

    hdPedido = true;

    const draco = new DRACOLoader().setDecoderPath(URL_DRACO);

    new GLTFLoader().setDRACOLoader(draco).load(URL_MAO_HD, (gltf) => {

      let hd = null;

      gltf.scene.traverse((o) => { if (o.isMesh && !hd) hd = o; });

      let alvo = null;

      mao.traverse((o) => { if (o.isMesh && !alvo) alvo = o; });

      if (!hd || !alvo) return;

      refinarPeleGeometria(hd.geometry);

      const velha = alvo.geometry;

      alvo.geometry = hd.geometry;

      velha.dispose();

      const tex = hd.material.map;

      if (tex) {

        tex.colorSpace = THREE.SRGBColorSpace;

        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

        matMao.map = tex;

        matMao.needsUpdate = true;

      }

      draco.dispose();

    }, undefined, (err) => {

      console.warn('[hero3d] mão HD não carregou; segue a versão leve', err);

      draco.dispose();

    });

  }



  /* ---------- ponteiro: hover e clique nos frascos ---------- */

  const ray = new THREE.Raycaster();

  const ptr = new THREE.Vector2(9, 9);

  let sobre = -1;



  function lerPonteiro(e) {

    const r = canvas.getBoundingClientRect();

    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;

    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;

  }

  function testar() {

    sobre = -1;

    if (!frascos.length || modoMao) return;

    ray.setFromCamera(ptr, cam);

    const hit = ray.intersectObjects(frascos, true)[0];

    let o = hit && hit.object;

    while (o && o.userData.indice === undefined) o = o.parent;

    if (o) sobre = o.userData.indice;

  }

  /* etapa 2: qual unha está sob o ponteiro (mesmas caixas do shader) */

  const tmpLocal = new THREE.Vector3();

  function unhaNoPonteiro() {

    if (!mao) return null;

    ray.setFromCamera(ptr, cam);

    const hit = ray.intersectObject(mao, true)[0];

    if (!hit) return null;

    tmpLocal.copy(hit.point);

    mao.worldToLocal(tmpLocal);

    // O raycast identifica a própria malha, inclusive a ponta do alongamento.

    // A pele entre os dedos não deve selecionar uma unha vizinha.

    const indice = hit.object.userData.unha;

    if (Number.isInteger(indice)) {

      const u = UNHAS[indice];

      const d = tmpLocal.clone().sub(uniformsMao.uUnhaC.value[indice]);

      return { i: indice, pa: d.dot(uniformsMao.uUnhaU.value[indice]), pb: d.dot(uniformsMao.uUnhaV.value[indice]), hu: u.hu };

    }

    if (modelo) return null;

    let melhor = null, menor = Infinity;

    UNHAS.forEach((u, i) => {

      const d = tmpLocal.clone().sub(uniformsMao.uUnhaC.value[i]);

      const pa = d.dot(uniformsMao.uUnhaU.value[i]);

      const pb = d.dot(uniformsMao.uUnhaV.value[i]);

      const pn = d.dot(uniformsMao.uUnhaN.value[i]);

      const a = pa / u.hu, b = pb / u.hv;

      const alongue = modelo ? modelo.k * 2 : 0; // a extensão estende a área tocável para a ponta

      if (a > -1.6 && a < 1.6 + alongue && Math.abs(b) < 1.8 && Math.abs(pn) < 0.035 && a * a + b * b < menor) {

        menor = a * a + b * b;

        melhor = { i, pa, pb, hu: u.hu };

      }

    });

    return melhor;

  }

  /* ponto tocado -> centro da arte (fração do canvas; mesma conta do shader) */

  function moverArte(u) {

    const g = modelo ? modelo.geomArte(u.i) : { hl: u.hu, cc: 0, hw: UNHAS[u.i].hv }; // a arte cobre a unha inteira, extensão incluída

    editor.posicionar((-u.pb / (g.hw * 1.05)) * 0.5, -((u.pa - g.cc) / (g.hl * 1.05)) * 0.5);

  }

  /* ---------- girar a mão (etapa 2): arrastar na mão, barra ou botões ----------

     A câmera orbita em volta da mão (eixo vertical): giro > 0 = a mão gira para a direita. */

  const GIRO_MAX = THREE.MathUtils.degToRad(85);

  const EIXO_Y = new THREE.Vector3(0, 1, 0);

  const PIVO_GIRO = new THREE.Vector3(0.05, 0.05, -0.18); // entre o centro da mão e as unhas (mundo)

  const giroFaixa = $('[data-giro-faixa]');

  let giro = 0;

  let orbitando = false, orbX = 0, orbGiro = 0;

  function girar(rad) {

    giro = THREE.MathUtils.clamp(rad, -GIRO_MAX, GIRO_MAX);

    giroFaixa.value = String(Math.round(THREE.MathUtils.radToDeg(giro)));

  }

  /* girar pelos controles sai da vista de uma unha e volta para a mão inteira */

  const girarPelosControles = (rad) => { if (editor.sel >= 0) editor.selecionar(-1); girar(rad); };

  giroFaixa.addEventListener('input', () => girarPelosControles(THREE.MathUtils.degToRad(+giroFaixa.value)));

  $('[data-giro-esq]').addEventListener('click', () => girarPelosControles(giro - THREE.MathUtils.degToRad(15)));

  $('[data-giro-dir]').addEventListener('click', () => girarPelosControles(giro + THREE.MathUtils.degToRad(15)));

  $('[data-giro-zero]').addEventListener('click', () => { girarPelosControles(0); ajustarZoom(1.0); });

  /* ---------- zoom lateral da mão (etapa 2) ---------- */
  let zoomNivel = 1.0;
  let zoomAlvo = 1.0;
  const ZOOM_MIN = 0.75;
  const ZOOM_MAX = 2.6;

  const zoomLateralEl = $('[data-zoom-lateral]');
  const btnZoomMais = $('[data-zoom-mais]');
  const btnZoomMenos = $('[data-zoom-menos]');
  const zoomFaixaEl = $('[data-zoom-faixa]');
  const zoomValorEl = $('[data-zoom-valor]');
  const btnZoomReset = $('[data-zoom-reset]');

  function ajustarZoom(novo, instantaneo) {
    zoomAlvo = THREE.MathUtils.clamp(novo, ZOOM_MIN, ZOOM_MAX);
    if (instantaneo) zoomNivel = zoomAlvo;
    const pct = Math.round(zoomAlvo * 100);
    if (zoomValorEl) zoomValorEl.textContent = `${pct}%`;
    if (zoomFaixaEl) zoomFaixaEl.value = String(pct);
  }

  if (btnZoomMais) btnZoomMais.addEventListener('click', () => ajustarZoom(zoomAlvo + 0.25));
  if (btnZoomMenos) btnZoomMenos.addEventListener('click', () => ajustarZoom(zoomAlvo - 0.25));
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => ajustarZoom(1.0));
  if (zoomFaixaEl) {
    zoomFaixaEl.addEventListener('input', () => ajustarZoom(+zoomFaixaEl.value / 100));
  }

  // Zoom com a roda do mouse sobre o canvas
  canvas.addEventListener('wheel', (e) => {
    if (!modoMao) return;
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.15;
    ajustarZoom(zoomAlvo + delta);
  }, { passive: false });

  // Pinch-to-zoom com 2 dedos em dispositivos touch
  let distPinch0 = 0;
  let zoomBasePinch = 1.0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 2 && modoMao) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      distPinch0 = Math.hypot(dx, dy);
      zoomBasePinch = zoomAlvo;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length === 2 && modoMao && distPinch0 > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / distPinch0;
      ajustarZoom(zoomBasePinch * ratio);
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches && e.touches.length < 2) distPinch0 = 0;
  }, { passive: true });



  let arrastando = false;

  canvas.addEventListener('pointerdown', (e) => {

    if (!modoMao) return;

    lerPonteiro(e);

    const u = unhaNoPonteiro();

    if (!u) { // fora das unhas: arrastar gira a mão (e sai da vista de uma unha, se estiver nela)

      if (editor.sel >= 0) editor.selecionar(-1);

      orbitando = true; orbX = e.clientX; orbGiro = giro;

      canvas.setPointerCapture(e.pointerId);

      canvas.style.cursor = 'grabbing';

      return;

    }

    if (editor.sel !== u.i) { editor.selecionar(u.i); return; }

    if (!editor.temArte(u.i)) return;

    arrastando = true;

    canvas.setPointerCapture(e.pointerId);

    moverArte(u);

  });

  const soltar = () => {

    arrastando = false;

    if (orbitando) { orbitando = false; canvas.style.cursor = modoMao ? 'grab' : ''; }

  };

  canvas.addEventListener('pointerup', soltar);

  canvas.addEventListener('pointercancel', soltar);



  canvas.addEventListener('pointermove', (e) => {

    lerPonteiro(e);

    if (orbitando) { // largura inteira da tela arrastada = cerca de 140 graus

      girar(orbGiro + ((e.clientX - orbX) / Math.max(300, largura)) * 2.4);

      return;

    }

    if (arrastando) {

      const u = unhaNoPonteiro();

      if (u && u.i === editor.sel) moverArte(u);

      return;

    }

    paralaxeAlvo.set(ptr.x, ptr.y);

    testar();

    canvas.style.cursor = modoMao ? 'grab' : (sobre >= 0 ? 'pointer' : '');

  });

  canvas.addEventListener('pointerleave', () => {

    sobre = -1; ptr.set(9, 9); paralaxeAlvo.set(0, 0); canvas.style.cursor = '';

  });

  canvas.addEventListener('click', (e) => {

    lerPonteiro(e);

    testar();

    if (sobre >= 0) { parar(); escolher(sobre); }

  });



  /* ---------- laço de desenho (só com a hero na tela) ---------- */

  let visivel = true, raf = 0, ultimo = performance.now();

  new IntersectionObserver(([e]) => {

    visivel = e.isIntersecting;

    if (visivel) { if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); } }

    else parar();

  }, { threshold: 0.05 }).observe(raiz);

  document.addEventListener('visibilitychange', () => {

    if (!document.hidden && visivel && !raf) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); }

  });



  function quadro(agora) {

    raf = 0;

    if (!visivel || document.hidden) return;

    const dt = Math.min(0.05, (agora - ultimo) / 1000);

    ultimo = agora;

    const k = (v) => (reduz ? 1 : 1 - Math.exp(-v * dt));



    /* câmera */

    const naUnha = modoMao && unhaSel >= 0 && mao;

    const vista = naUnha ? vistaUnha(unhaSel) : modoMao ? VISTAS.mao : VISTAS.frascos;

    const emPe = cam.aspect < 1;

    const enc = naUnha ? encUnha : modoMao ? encMao : encFrascos;

    const usaEnc = emPe || (encLivre && modoMao);
    const fatorBase = usaEnc ? enc.f : naUnha ? 1 : afastamento(vista);

    // Zoom suave e interativo na mão
    zoomNivel = THREE.MathUtils.lerp(zoomNivel, zoomAlvo, k(orbitando ? 16 : 4.5));
    const fator = fatorBase / (modoMao ? zoomNivel : 1.0);

    tmpAlvo.set(...vista.alvo);

    tmpPos.set(...vista.pos).sub(tmpAlvo).multiplyScalar(fator).add(tmpAlvo);

    if (modoMao && !naUnha && giro) { // órbita da câmera (e do alvo) em volta de um ponto perto das unhas

      tmpPos.sub(PIVO_GIRO).applyAxisAngle(EIXO_Y, -giro).add(PIVO_GIRO);

      tmpAlvo.sub(PIVO_GIRO).applyAxisAngle(EIXO_Y, -giro).add(PIVO_GIRO);

    }

    camUpAlvo.set(...(vista.up || [0, 1, 0]));

    if (emPe && modoMao && !naUnha) { // celular: mão em pé, dedos para cima (acompanha o giro)

      camUpAlvo.set(...UP_DEDOS);

      if (giro) camUpAlvo.applyAxisAngle(EIXO_Y, -giro);

    }

    camUp.lerp(camUpAlvo, k(2.6)).normalize();

    cam.up.copy(camUp);

    camPos.lerp(tmpPos, k(orbitando ? 16 : 2.6)); // arrastando a mão a câmera acompanha o dedo quase sem atraso

    camAlvo.lerp(tmpAlvo, k(2.6));

    paralaxe.lerp(paralaxeAlvo, k(2.5));

    const forca = reduz ? 0 : naUnha ? 0.06 : modoMao ? 0.4 : 1;

    cam.position.set(camPos.x + paralaxe.x * 0.05 * forca, camPos.y + paralaxe.y * 0.03 * forca, camPos.z);

    cam.lookAt(camAlvo);

    let alvoX = usaEnc ? enc.dx : 0, alvoY = usaEnc ? enc.dy : 0;

    /* zoom da mão: a câmera se aproxima do alvo, e a mão sairia do centro do espaço livre. Compensa o deslocamento para que
       ela cresça em torno do centro desse espaço (dx_z = z·dx + (1−z)·centro) e continue visível ao ampliar */
    if (usaEnc && modoMao && !naUnha && enc.cx !== undefined) {
      alvoX = zoomNivel * enc.dx + (1 - zoomNivel) * enc.cx;
      alvoY = zoomNivel * enc.dy + (1 - zoomNivel) * enc.cy;
    }

    if (Math.abs(alvoX - deslocX) + Math.abs(alvoY - deslocY) > 0.2) {

      deslocX += (alvoX - deslocX) * k(3);

      deslocY += (alvoY - deslocY) * k(3);

      aplicarDesloc();

    }



    /* frasco "Sua cor": arco-íris corre pelo líquido; com o arco ligado as unhas passam pelas mesmas cores */

    if (matsFrasco[I_SUA]) {

      const uf = matsFrasco[I_SUA].userData.u;

      uf.uArcoT.value = agora / 1000;

      uf.uArco.value += ((SUA.arco ? 1 : 0) - uf.uArco.value) * k(5);

      if (SUA.arco && atual === I_SUA) corArcoIris((agora / 1000) * 0.07 % 1, corUnhaAlvo);

    }



    /* cores das unhas e da sombra */

    if (matMao) {

      matMao.userData.u.uCor.value.lerp(corUnhaAlvo, k(4));

      uniformsMao.uTempo.value = agora / 1000;

      uniformsMao.uSelUnha.value = naUnha ? unhaSel : -1;

      chao.material.color.lerp(sombraAlvo, k(3));

      chao.material.opacity += ((modoMao ? 0.2 : 0.32) - chao.material.opacity) * k(3);

    }



    /* frascos: o escolhido sobe, o de baixo do ponteiro sobe um pouco; saem por baixo na etapa 2 */

    if (fileira) {

      fileira.position.z += ((modoMao ? 1.5 : 0) - fileira.position.z) * k(modoMao ? 4.5 : 3.5);

      fileira.visible = !(modoMao && fileira.position.z > 1.3);

      const t = agora / 1000;

      frascos.forEach((f, i) => {

        const alvoY = (i === atual ? 0.03 : 0) + (i === sobre ? 0.02 : 0);

        f.userData.y += (alvoY - f.userData.y) * k(8);

        f.position.y = f.userData.y;

        f.rotation.y = i === atual && !reduz ? Math.sin(t * 0.9) * 0.12 : f.rotation.y * 0.9;

      });

      if (anel && !reduz) anel.rotation.z += dt * 0.4;



    if (mao) {
      /* celular (tela em pé): a mão já aparece ao lado dos esmaltes na primeira tela */
      mao.visible = modoMao || cam.aspect < 1 || (fileira && fileira.position.z > 0.3);
    }

      /* etiqueta HTML "Sua cor" presa à frente do frasco da esquerda */

      tmpProj.set(SUA_FRASCO.x, 0, SUA_FRASCO.z + 0.13).add(fileira.position).project(cam);

      const meia = etiquetaLarg / 2 + 8; // o frasco fica na borda da tela em pé: a etiqueta não pode sair pelo lado

      const ex = Math.min(largura - meia, Math.max(meia, ((tmpProj.x + 1) / 2) * largura));

      etiquetaSua.style.transform = `translate(${ex}px, ${((1 - tmpProj.y) / 2) * altura}px) translate(-50%, 0)`;

    }



    renderer.render(cena, cam);

    raf = requestAnimationFrame(quadro);

  }

  raf = requestAnimationFrame(quadro);

}
