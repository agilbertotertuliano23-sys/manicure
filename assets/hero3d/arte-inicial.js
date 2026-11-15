/* Arte que as cinco unhas já trazem ao abrir o modelo (francesinha rosa com pérolas).
   As texturas 576 x 960 saem de assets/gabarito-francesinha-rosa.png por tools/arte-do-gabarito.py, já ajustadas ao
   contorno da malha 3D (reference/gabarito-unhas.json), e ficam em assets/francesinha-rosa/<dedo>.png.
   Para trocar a arte de abertura: gerar outra pasta com o mesmo script e mudar PASTA (ou passar `pasta`). */
import { TEX_L, TEX_A } from './foto-textura.js';

const DEDOS = ['polegar', 'indicador', 'medio', 'anelar', 'minimo']; // mesma ordem de UNHAS (unhas.js)
const PASTA = 'assets/francesinha-rosa/';

function carregar(url) {
  return new Promise((ok, erro) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => erro(new Error(`Não foi possível carregar ${url}`));
    im.src = url;
  });
}

/* Aplica a arte nas cinco unhas. Não mexe numa unha que a pessoa já decorou antes da imagem chegar. Se algo falhar,
   as unhas ficam como estavam (só cor). */
export async function aplicarArteInicial(editor, { pasta = PASTA, versao = 2 } = {}) {
  try {
    const imgs = await Promise.all(DEDOS.map((d) => carregar(`${pasta}${d}.png?v=${versao}`)));
    imgs.forEach((im, i) => {
      if (editor.temArte(i)) return;
      const cv = document.createElement('canvas');
      cv.width = TEX_L;
      cv.height = TEX_A;
      cv.getContext('2d').drawImage(im, 0, 0, TEX_L, TEX_A);
      editor.aplicarFoto(cv, i);
    });
  } catch (e) {
    console.warn('[arte-inicial]', e.message);
  }
}
