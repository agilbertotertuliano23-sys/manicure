/* Seletor de serviço, formato, comprimento e acabamento (cartão da etapa 2).
   criarServicos(container, { aoMudar(estado) }) -> { estado, k }
   estado = { servico, formato, comprimento, acabamento }
   Cada categoria muda a unha 3D de um jeito próprio:
     - serviço: espessura da camada, ápice, borda e curva C (perfil em unhas-tipos.js) + verniz (esmalte ou gel);
     - formato: o contorno da ponta;  comprimento: até onde a ponta vai;  acabamento: brilho, fosco ou cromado.
   As regras seguem o que as manicures oferecem:
     - na unha natural (natural, gel, blindagem, banho de gel) o comprimento é rente, natural ou curto, e os formatos
       bailarina e stiletto ficam bloqueados (só em alongamento); amendoada pede mais que rente;
     - em alongamento (fibra, gel moldado, acrílico, acrigel) o cliente escolhe curta, média ou longa.
   Não chama aoMudar na criação: quem cria aplica o estado inicial quando a cena estiver pronta. */
import { SERVICOS, GRUPOS, FORMATOS, COMPRIMENTOS, larguraRelativa, perfilDoServico } from './unhas-tipos.js';
import { kDoComprimento } from './unha-extensao.js';

const ACABAMENTOS = [
  { id: 'brilho', nome: 'Brilho' },
  { id: 'fosco', nome: 'Fosco' },
  { id: 'cromado', nome: 'Cromado' }
];

/* esmalte para o shader: rugosidade, força das faixas de reflexo, metal, e o verniz por cima (capa) */
export function paramsAcabamento(e) {
  const p = perfilDoServico(e.servico);
  if (e.acabamento === 'fosco') return { rug: 0.85, brilho: 0, metal: 0, capa: 0, capaRug: 1 };
  if (e.acabamento === 'cromado') return { rug: 0.12, brilho: 0.25, metal: 1, capa: 1, capaRug: 0.04 };
  if (p.capa < 0.5) return { rug: 0.32, brilho: 0.55, metal: 0, capa: p.capa, capaRug: 0.22 }; // esmalte comum
  return { rug: 0.16, brilho: 1, metal: 0, capa: p.capa, capaRug: p.vidro ? 0.01 : 0.05 };       // gel
}

/* o que a regra deixa escolher, por categoria */
const grupoDe = (servico) => (SERVICOS.find((s) => s.id === servico) || SERVICOS[0]).grupo;
const comprimentoLivre = (c, grupo) => c.grupos.includes(grupo);
function bloqueioFormato(f, grupo, k) {
  if (f.soAlongamento && grupo !== 'alongamento') return 'só em alongamento';
  if (f.minK !== undefined && k < f.minK) return 'pede unha maior que rente';
  return '';
}

/* ícone do formato: o contorno da própria função que modela a unha 3D (ponta para cima), com o arco da cutícula */
function icone(formato) {
  const Wb = 12, E = 34, x0 = 20, yBase = 42, fundo = 9;
  const esq = [], dir = [];
  for (let i = 0; i <= 32; i++) {
    const s = 1 - Math.pow(1 - i / 32, 2);
    const w = larguraRelativa(formato, s, E, Wb) * Wb;
    const y = yBase - s * E;
    esq.push(`${(x0 - w).toFixed(1)},${y.toFixed(1)}`);
    dir.push(`${(x0 + w).toFixed(1)},${y.toFixed(1)}`);
  }
  const arco = []; // da base direita para a esquerda, curvando para baixo (a cutícula)
  for (let i = 1; i < 16; i++) {
    const t = Math.PI * (i / 16);
    arco.push(`${(x0 + Wb * Math.cos(t)).toFixed(1)},${(yBase + fundo * Math.sin(t)).toFixed(1)}`);
  }
  const pontos = esq.concat(dir.reverse()).concat(arco).join(' ');
  return `<svg viewBox="0 0 40 58" aria-hidden="true"><polygon points="${pontos}" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}

export function criarServicos(container, { aoMudar }) {
  const estado = { servico: 'natural', formato: 'oval', comprimento: 'natural', acabamento: 'brilho' };

  container.innerHTML = '';
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  const rotulo = (t) => container.appendChild(el('p', 'h3d__rotulo', t));

  /* serviços */
  rotulo('Serviço');
  const botoesServico = new Map();
  GRUPOS.forEach((g) => {
    container.appendChild(el('p', 'h3d__grupo', g.nome));
    const lista = container.appendChild(el('div', 'h3d__opcoes'));
    lista.setAttribute('role', 'radiogroup');
    lista.setAttribute('aria-label', g.nome);
    SERVICOS.filter((s) => s.grupo === g.id).forEach((s) => {
      const b = el('button', 'h3d__opc', s.nome);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => escolherServico(s.id));
      lista.appendChild(b);
      botoesServico.set(s.id, b);
    });
  });
  const info = container.appendChild(el('p', 'h3d__servico-info'));
  info.setAttribute('aria-live', 'polite');

  /* formato */
  rotulo('Formato');
  const gradeFormatos = container.appendChild(el('div', 'h3d__formatos'));
  gradeFormatos.setAttribute('role', 'radiogroup');
  gradeFormatos.setAttribute('aria-label', 'Formato da unha');
  const botoesFormato = new Map();
  FORMATOS.forEach((f) => {
    const b = el('button', 'h3d__formato', icone(f.id) + `<span>${f.nome}</span>`);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.title = f.desc;
    b.addEventListener('click', () => { estado.formato = f.id; atualizar(); });
    gradeFormatos.appendChild(b);
    botoesFormato.set(f.id, b);
  });
  const infoFormato = container.appendChild(el('p', 'h3d__servico-info'));

  /* comprimento */
  rotulo('Comprimento');
  const segComp = container.appendChild(el('div', 'h3d__seg h3d__seg--peq'));
  segComp.setAttribute('role', 'radiogroup');
  segComp.setAttribute('aria-label', 'Comprimento');
  const botoesComp = new Map();
  COMPRIMENTOS.forEach((c) => {
    const b = el('button', '', c.nome);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => { estado.comprimento = c.id; atualizar(); });
    segComp.appendChild(b);
    botoesComp.set(c.id, b);
  });
  const infoComp = container.appendChild(el('p', 'h3d__servico-info'));

  /* acabamento do esmalte */
  rotulo('Acabamento do esmalte');
  const segAcab = container.appendChild(el('div', 'h3d__seg h3d__seg--peq'));
  segAcab.setAttribute('role', 'radiogroup');
  segAcab.setAttribute('aria-label', 'Acabamento do esmalte');
  const botoesAcab = new Map();
  ACABAMENTOS.forEach((a) => {
    const b = el('button', '', a.nome);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => { estado.acabamento = a.id; atualizar(); });
    segAcab.appendChild(b);
    botoesAcab.set(a.id, b);
  });

  container.appendChild(el('p', 'h3d__dica',
    'Prazos e valores variam com o tipo de unha e a profissional: confirme na hora de agendar.'));

  function escolherServico(id) {
    estado.servico = id;
    atualizar();
  }

  /* aplica as regras e redesenha os botões; notifica só se algo mudou */
  /* regras entre as categorias:
       serviço → que comprimentos existem (unha natural: rente/natural/curta; alongamento: curta/média/longa);
       serviço + comprimento → que formatos dá para lixar (bailarina e stiletto só em alongamento;
       amendoada não cabe numa unha rente). Se a escolha atual sai das regras, cai na opção mais próxima. */
  function atualizar(inicial) {
    const grupo = grupoDe(estado.servico);
    const compAtual = COMPRIMENTOS.find((c) => c.id === estado.comprimento);
    if (!compAtual || !comprimentoLivre(compAtual, grupo)) {
      estado.comprimento = grupo === 'alongamento' ? 'media' : 'natural';
    }
    const k = kDoComprimento(estado.comprimento);
    let fmt = FORMATOS.find((f) => f.id === estado.formato);
    if (!fmt || bloqueioFormato(fmt, grupo, k)) {
      fmt = FORMATOS.find((f) => f.id === (grupo === 'alongamento' ? 'amendoada' : 'redonda'));
      estado.formato = fmt.id;
    }

    botoesServico.forEach((b, id) => b.setAttribute('aria-checked', String(id === estado.servico)));
    botoesFormato.forEach((b, id) => {
      const f = FORMATOS.find((x) => x.id === id);
      const motivo = bloqueioFormato(f, grupo, k);
      b.setAttribute('aria-checked', String(id === estado.formato));
      b.disabled = !!motivo;
      b.title = motivo ? `${f.nome}: ${motivo}` : f.desc;
    });
    botoesComp.forEach((b, id) => {
      const c = COMPRIMENTOS.find((x) => x.id === id);
      const livre = comprimentoLivre(c, grupo);
      b.setAttribute('aria-checked', String(id === estado.comprimento));
      b.disabled = !livre;
      b.title = livre ? c.desc : `${c.nome}: ${grupo === 'alongamento' ? 'na unha natural' : 'só com alongamento'}`;
    });
    botoesAcab.forEach((b, id) => b.setAttribute('aria-checked', String(id === estado.acabamento)));

    const s = SERVICOS.find((x) => x.id === estado.servico);
    info.innerHTML = `<strong>${s.nome}.</strong> ${s.desc} <span>Na unha: ${s.muda}. Dura ${s.dura}.</span>`;
    infoFormato.innerHTML = fmt ? `<strong>${fmt.nome}.</strong> ${fmt.desc}` : '';
    const c = COMPRIMENTOS.find((x) => x.id === estado.comprimento);
    infoComp.innerHTML = `<strong>${c.nome}:</strong> ${c.desc}.`;
    if (!inicial) aoMudar({ ...estado });
  }
  atualizar(true);

  return { estado, get k() { return kDoComprimento(estado.comprimento); } };
}
