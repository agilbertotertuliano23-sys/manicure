/* "Pegar o modelo do cliente": a pessoa envia a foto do modelo de unha que o cliente escolheu e a IA (MAI Image 2.6 Flash,
   via servidor.py) devolve a arte das 5 unhas já ajustada ao contorno de cada unha da malha 3D.
   É um fluxo SEPARADO do "Copiar de uma foto" (foto-unha.js, recorte por toque): um não substitui o outro.
   criarArteIA({ botao, aoAplicar(canvas576x960, indice) })
     botao     : o botão que abre o seletor de arquivo (precisa de um [data-ia-texto] para o status)
     aoAplicar : recebe a textura pronta de cada dedo (0 = polegar ... 4 = mínimo)
   O ajuste é automático no servidor: ele acha cada unha na folha gerada, tira o fio de contorno, estica a arte para o
   contorno da malha e, se a folha vier ruim, tenta de novo sozinho (servidor.py: cortar_folha / do_POST). */
const NOMES = ['polegar', 'indicador', 'medio', 'anelar', 'minimo'];
const MAX_LADO = 1536;     // a foto vai reduzida (o gerador não precisa de mais, e o envio fica rápido)
const TEX_L = 576, TEX_A = 960;

export function criarArteIA({ botao, aoAplicar }) {
  const texto = botao.querySelector('[data-ia-texto]');
  const textoPadrao = texto.textContent;
  const status = document.createElement('p');
  status.className = 'h3d__ia-status';
  status.hidden = true;
  status.setAttribute('aria-live', 'polite');
  botao.insertAdjacentElement('afterend', status);
  const inArquivo = document.createElement('input');
  inArquivo.type = 'file';
  inArquivo.accept = 'image/*';
  inArquivo.hidden = true;
  botao.insertAdjacentElement('afterend', inArquivo);

  let ocupado = false;
  const dizer = (msg) => { status.textContent = msg; status.hidden = !msg; };

  botao.addEventListener('click', () => { if (!ocupado) inArquivo.click(); });
  inArquivo.addEventListener('change', async () => {
    const arq = inArquivo.files && inArquivo.files[0];
    inArquivo.value = '';
    if (arq) await gerar(arq);
  });

  async function fotoReduzida(arq) {
    const bmp = await createImageBitmap(arq, { imageOrientation: 'from-image' });
    const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    return c.toDataURL('image/jpeg', 0.88);
  }

  const carregar = (url) => new Promise((ok, erro) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => erro(new Error('A imagem gerada não abriu.'));
    im.src = url;
  });

  async function gerar(arq) {
    if (!/^image\//.test(arq.type) && !/\.(jfif|jpe?g|png|webp|heic)$/i.test(arq.name)) { dizer('Esse arquivo não parece ser uma imagem.'); return; }
    ocupado = true;
    botao.disabled = true;
    const t0 = performance.now();
    const relogio = setInterval(() => {
      const s = Math.round((performance.now() - t0) / 1000);
      texto.textContent = `Gerando a arte… ${s} s`;
    }, 500);
    texto.textContent = 'Gerando a arte… 0 s';
    dizer('A IA está lendo o modelo e desenhando as 5 unhas. Leva uns 20 a 40 segundos.');
    try {
      const foto = await fotoReduzida(arq);
      let resp;
      try {
        resp = await fetch('/api/arte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ foto }) });
      } catch (e) {
        throw new Error('Não consegui falar com o servidor. Abra o site pelo iniciar.bat (servidor com IA).');
      }
      const dados = await resp.json().catch(() => null);
      if (!dados || !dados.ok) throw new Error((dados && dados.erro) || 'O servidor não conseguiu gerar a arte.');
      let n = 0;
      for (let i = 0; i < NOMES.length; i++) {
        const url = dados.unhas[NOMES[i]];
        if (!url) continue;
        const im = await carregar(url);
        const cv = document.createElement('canvas');
        cv.width = TEX_L; cv.height = TEX_A;
        cv.getContext('2d').drawImage(im, 0, 0, TEX_L, TEX_A);   // arte plana: sem a marca "foto" (luz da foto) do outro fluxo
        aoAplicar(cv, i);
        n++;
      }
      dizer(n === 5 ? `Pronto: as 5 unhas foram geradas e ajustadas em ${dados.segundos} s.` : `Gerei ${n} de 5 unhas. Tente de novo com uma foto em que os dedos apareçam inteiros.`);
    } catch (e) {
      dizer(e.message || 'Não consegui gerar a arte.');
    } finally {
      clearInterval(relogio);
      texto.textContent = textoPadrao;
      botao.disabled = false;
      ocupado = false;
    }
  }
}
