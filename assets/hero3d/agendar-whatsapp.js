/* Botão "Agendar": monta a mensagem com a cor, o serviço e a decoração de cada unha, tira uma foto da mão 3D
   e manda tudo para o WhatsApp da profissional.
   criarAgendamento({ gatilhos, capturar(), dados() })
     gatilhos  = elementos que abrem o agendamento (os botões "Agendar")
     capturar  = devolve um canvas com a imagem da mão (a cena já desenhada)
     dados     = { cor: { nome, hex }, servico, unhas: [{ unha, acab, arte }] }
   O link wa.me só leva texto, então a imagem sobe para o próprio site (enviar-visual.php) e o link dela entra
   na mensagem: o WhatsApp mostra a foto dentro da conversa. Se o envio da imagem falhar (site sem PHP, sem rede),
   cai no plano B: celular compartilha o arquivo; computador abre a conversa e deixa a imagem copiada/baixada. */
import { SERVICOS, FORMATOS, COMPRIMENTOS } from './unhas-tipos.js';

export const WHATSAPP_PROFISSIONAL = '5583999115266';
const URL_ENVIO = 'enviar-visual.php';

const TIPO_ACAB = { cor: 'só cor', detalhe: 'detalhe', desenho: 'desenho' };
const nomeDe = (lista, id) => (lista.find((x) => x.id === id) || { nome: id }).nome;

/* uma linha por grupo de unhas com a mesma decoração: "Decoração · Anelar · desenho · Francesinha rosa" */
function linhasDecoracao(unhas) {
  const rotulo = (u) => (u.acab === 'cor' ? 'só cor' : [TIPO_ACAB[u.acab] || u.acab, u.arte].filter(Boolean).join(' · '));
  const grupos = new Map();
  unhas.forEach((u) => {
    const r = rotulo(u);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r).push(u.unha);
  });
  if (grupos.size === 1) return [`Decoração · Todas as unhas · ${[...grupos.keys()][0]}`];
  return [...grupos].map(([r, nomes]) => `Decoração · ${nomes.join(', ')} · ${r}`);
}

/* mensagem curta: uma informação por linha, separada por "·". linkImagem vazio = sem link (plano B) */
export function montarMensagem(d, nomeCliente, linkImagem) {
  const s = d.servico;
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const linhas = [
    'Olá! Quero agendar este visual ✨',
    `Cor · ${d.cor.nome} · ${d.cor.hex}`,
    `Serviço · ${nomeDe(SERVICOS, s.servico)} · ${nomeDe(FORMATOS, s.formato)} · ${nomeDe(COMPRIMENTOS, s.comprimento)} · ${cap(s.acabamento)}`,
    ...linhasDecoracao(d.unhas)
  ];
  if (linkImagem) linhas.push(`Foto · ${linkImagem}`);
  const nome = (nomeCliente || '').trim();
  if (nome) linhas.push(`Nome · ${nome}`);
  linhas.push('Quais horários você tem?');
  return linhas.join('\n');
}

const canvasParaBlob = (cv) => new Promise((ok) => cv.toBlob(ok, 'image/png'));

/* sobe a imagem e devolve o endereço completo, ou '' se não deu */
async function subirImagem(blob) {
  try {
    const r = await fetch(URL_ENVIO, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob });
    if (!r.ok) return '';
    const j = await r.json();
    return j && typeof j.url === 'string' && /^visuais\/[a-z0-9-]+\.png$/.test(j.url) ? new URL(j.url, location.href).href : '';
  } catch (err) {
    return '';
  }
}

export function criarAgendamento({ gatilhos, capturar, dados }) {
  let blob = null;
  let url = '';
  let dadosAtuais = null;
  let linkImagem = '';   // preenchido depois que a imagem sobe

  const caixa = document.createElement('div');
  caixa.className = 'h3d__agenda';
  caixa.hidden = true;
  caixa.setAttribute('role', 'dialog');
  caixa.setAttribute('aria-modal', 'true');
  caixa.setAttribute('aria-label', 'Enviar o visual para a profissional');
  caixa.innerHTML = `
    <div class="h3d__agenda-fundo" data-ag-fechar></div>
    <div class="h3d__agenda-folha">
      <button type="button" class="h3d__agenda-x" data-ag-fechar aria-label="Fechar">✕</button>
      <span class="h3d__marca">Agendar</span>
      <strong class="h3d__agenda-tit">Enviar meu visual para a profissional</strong>
      <img class="h3d__agenda-img" alt="Imagem do modelo escolhido na mão 3D" data-ag-img>
      <label class="h3d__agenda-campo">Seu nome (opcional)<input type="text" data-ag-nome autocomplete="name" maxlength="60"></label>
      <textarea class="h3d__agenda-txt" data-ag-txt rows="7" aria-label="Mensagem que será enviada"></textarea>
      <div class="h3d__agenda-acoes">
        <button type="button" class="h3d__btn h3d__btn--cheio" data-ag-enviar>Enviar no WhatsApp</button>
        <button type="button" class="h3d__btn" data-ag-baixar>Baixar imagem</button>
      </div>
      <p class="h3d__agenda-aviso" data-ag-aviso aria-live="polite"></p>
    </div>`;
  document.body.appendChild(caixa);

  const $ = (s) => caixa.querySelector(s);
  const img = $('[data-ag-img]');
  const nome = $('[data-ag-nome]');
  const txt = $('[data-ag-txt]');
  const aviso = $('[data-ag-aviso]');
  const botaoEnviar = $('[data-ag-enviar]');

  /* o texto é refeito quando o nome muda; se a pessoa editou a mensagem à mão, o nome só entra no envio */
  let editadoAMao = false;
  txt.addEventListener('input', () => { editadoAMao = true; });
  const atualizarTexto = () => { if (dadosAtuais && !editadoAMao) txt.value = montarMensagem(dadosAtuais, nome.value, ''); };
  nome.addEventListener('input', atualizarTexto);

  function fechar() {
    caixa.hidden = true;
    document.body.classList.remove('h3d-agenda-aberta');
    if (url) { URL.revokeObjectURL(url); url = ''; }
    img.removeAttribute('src');
    blob = null;
    linkImagem = '';
  }
  caixa.querySelectorAll('[data-ag-fechar]').forEach((b) => b.addEventListener('click', fechar));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !caixa.hidden) fechar(); });

  async function abrir() {
    aviso.textContent = '';
    editadoAMao = false;
    linkImagem = '';
    dadosAtuais = dados();
    const cv = capturar(); // desenha a cena e copia o quadro no mesmo instante
    blob = cv ? await canvasParaBlob(cv) : null;
    if (url) URL.revokeObjectURL(url);
    url = blob ? URL.createObjectURL(blob) : '';
    if (url) img.src = url; else img.removeAttribute('src');
    img.hidden = !url;
    atualizarTexto();
    caixa.hidden = false;
    document.body.classList.add('h3d-agenda-aberta');
    botaoEnviar.focus({ preventScroll: true });
  }

  const arquivo = () => (blob ? new File([blob], 'meu-visual-belle.png', { type: 'image/png' }) : null);

  function baixar() {
    if (!blob) return false;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meu-visual-belle.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }
  $('[data-ag-baixar]').addEventListener('click', () => { aviso.textContent = baixar() ? 'Imagem baixada.' : 'Não foi possível gerar a imagem.'; });

  /* abre a conversa com a profissional já com o texto. A aba é aberta no toque do botão (antes do envio da imagem,
     que demora) e recebe o endereço depois: assim o navegador não a barra como pop-up */
  const enderecoConversa = (texto) => `https://wa.me/${WHATSAPP_PROFISSIONAL}?text=${encodeURIComponent(texto)}`;
  function abrirConversa(texto, aba) {
    if (aba && !aba.closed) { aba.location.href = enderecoConversa(texto); return; }
    window.open(enderecoConversa(texto), '_blank', 'noopener');
  }

  async function enviar() {
    if (botaoEnviar.disabled) return;
    botaoEnviar.disabled = true;
    const rotuloBotao = botaoEnviar.textContent;
    botaoEnviar.textContent = 'Enviando a imagem…';
    let aba = null;
    try { aba = window.open('about:blank', '_blank'); if (aba) aba.opener = null; } catch (err) { aba = null; }
    const fecharAba = () => { if (aba && !aba.closed) aba.close(); aba = null; };
    try {
      /* 1) a imagem sobe para o site e o link entra na mensagem */
      if (blob && !linkImagem) linkImagem = await subirImagem(blob);
      const base = editadoAMao ? txt.value : montarMensagem(dadosAtuais, nome.value, '');
      if (linkImagem) {
        const texto = editadoAMao ? `${base}\nFoto · ${linkImagem}` : montarMensagem(dadosAtuais, nome.value, linkImagem);
        txt.value = texto;
        abrirConversa(texto, aba);
        aviso.textContent = 'WhatsApp aberto com a configuração e a imagem. É só tocar em enviar.';
        return;
      }
      /* 2) plano B: celular compartilha o arquivo junto com o texto */
      fecharAba();
      const f = arquivo();
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
        try {
          await navigator.share({ files: [f], text: base });
          aviso.textContent = 'Escolha o WhatsApp da profissional (83 99911-5266) para enviar.';
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return; // a pessoa fechou a folha
        }
      }
      /* 3) computador sem envio: conversa aberta com o texto e a imagem copiada e baixada */
      let copiado = Promise.resolve(false);
      if (f && navigator.clipboard && window.ClipboardItem) {
        copiado = navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => true, () => false);
      }
      abrirConversa(base);
      const ok = await copiado;
      const baixou = baixar();
      aviso.textContent = ok
        ? 'WhatsApp aberto. A imagem foi copiada: cole na conversa (Ctrl+V) e envie.'
        : (baixou ? 'WhatsApp aberto. A imagem foi baixada: anexe na conversa e envie.' : 'WhatsApp aberto com a mensagem.');
    } finally {
      if (linkImagem) aba = null; // a aba já foi para o WhatsApp
      fecharAba();
      botaoEnviar.disabled = false;
      botaoEnviar.textContent = rotuloBotao;
    }
  }
  botaoEnviar.addEventListener('click', enviar);

  gatilhos.forEach((g) => g.addEventListener('click', (e) => { e.preventDefault(); abrir(); }));
  return { abrir, fechar };
}
