/* Worker que roda o SlimSAM (Segment Anything compacto) para recortar a unha que a pessoa tocou na foto.
   O modelo (~38 MB) baixa uma vez de huggingface.co e o navegador guarda; tudo roda no aparelho, a foto não sai dele.
   Mensagens de entrada  -> saída
     { tipo: 'carregar' }                                  -> { tipo: 'progresso', pct, arquivo } ... { tipo: 'pronto', dispositivo }
     { tipo: 'analisar', id, rgba, w, h }                   -> { tipo: 'analisada', id }       (calcula a "leitura" da foto)
     { tipo: 'segmentar', id, pontos: [[x,y]], rotulos: [1|0] } -> { tipo: 'mascara', id, w, h, planos (3 máscaras w*h em sequência), scores }
     { tipo: 'melhorar', id, rgba, w, h }                   -> { tipo: 'melhorada', id, w, h, rgba }  (recorte ampliado 2x por IA, swin2SR)
   rotulos: 1 = ponto dentro da unha, 0 = ponto fora (para corrigir a borda). Erros: { tipo: 'erro', id, mensagem }. */
/* a build "transformers.min.js" é autossuficiente; a "transformers.web.min.js" importa "onnxruntime-web/webgpu" como
   módulo solto e não carrega no navegador sem bundler (descoberto no teste real no Chrome) */
import { SamModel, AutoProcessor, RawImage, pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js';

const MODELO = 'Xenova/slimsam-77-uniform';
const MODELO_SR = 'Xenova/swin2SR-lightweight-x2-64';   // super-resolução 2x (~8 MB), carregada só quando a pessoa pede
let superRes = null;
let modelo = null, processador = null, dispositivo = 'wasm';
let imagem = null, leitura = null;

/* progresso agregado dos arquivos do modelo */
const arquivos = new Map();
let maiorPct = 0;
function progresso(p) {
  if (p.status === 'progress' && p.total) {
    arquivos.set(p.file, { carregado: p.loaded, total: p.total });
    let c = 0, t = 0;
    arquivos.forEach((v) => { c += v.carregado; t += v.total; });
    maiorPct = Math.max(maiorPct, t ? Math.round((100 * c) / t) : 0); // só cresce (os arquivos começam em momentos diferentes)
    postMessage({ tipo: 'progresso', pct: maiorPct, arquivo: p.file });
  }
}

/* Combinações dispositivo/precisão, da mais rápida para a mais compatível:
   WebGPU em meia precisão (fp16, metade dos bytes) -> WebGPU normal -> WASM quantizado (q8, bem mais leve que fp32) */
let combos = null;
let comboAtual = 0;
async function listarCombos() {
  if (combos) return combos;
  combos = [];
  try {
    const gpu = self.navigator && self.navigator.gpu;
    const adp = gpu && (await gpu.requestAdapter());
    if (adp) {
      if (adp.features && adp.features.has('shader-f16')) combos.push({ device: 'webgpu', dtype: 'fp16' });
      combos.push({ device: 'webgpu', dtype: 'fp32' });
    }
  } catch (e) { /* sem WebGPU */ }
  combos.push({ device: 'wasm', dtype: 'q8' });
  return combos;
}

async function carregar() {
  if (modelo) { postMessage({ tipo: 'pronto', dispositivo }); return; }
  const lista = await listarCombos();
  let erro = null;
  for (; comboAtual < lista.length; comboAtual++) {
    const c = lista[comboAtual];
    try {
      modelo = await SamModel.from_pretrained(MODELO, { device: c.device, dtype: c.dtype, progress_callback: progresso });
      dispositivo = c.device + '/' + c.dtype;
      erro = null;
      break;
    } catch (e) { erro = e; modelo = null; }
  }
  if (!modelo) throw erro || new Error('Não foi possível carregar o modelo.');
  processador = await AutoProcessor.from_pretrained(MODELO);
  postMessage({ tipo: 'pronto', dispositivo });
}

/* O melhorador (super-resolução) não usa fp16: o swin2SR em meia precisão carrega, mas falha ao rodar no WebGPU
   (medido no Chrome). Vai de WebGPU fp32 para WASM q8; se rodar e falhar, `melhorar` troca de combinação. */
let carregandoSR = null;
let idxSR = 0;
function garantirSR() {
  if (superRes) return Promise.resolve(superRes);
  if (carregandoSR) return carregandoSR;
  carregandoSR = (async () => {
    const lista = (await listarCombos()).filter((c) => c.dtype !== 'fp16');
    let erroSR = null;
    for (; idxSR < lista.length; idxSR++) {
      try { superRes = await pipeline('image-to-image', MODELO_SR, { device: lista[idxSR].device, dtype: lista[idxSR].dtype }); return superRes; }
      catch (e) { erroSR = e; superRes = null; }
    }
    carregandoSR = null;
    throw erroSR || new Error('Não foi possível carregar o melhorador de imagem.');
  })();
  return carregandoSR;
}

/* "carregar" (pré-carga ao abrir o seletor de arquivo) e "analisar" chegam quase juntos: os dois esperam o mesmo carregamento */
let carregando = null;
const garantir = () => (carregando || (carregando = carregar().catch((e) => { carregando = null; throw e; })));

/* um pedido por vez: duas sessões do ONNX no WebGPU rodando juntas (recorte + melhorador) travam ou falham */
let fila = Promise.resolve();
onmessage = (ev) => { fila = fila.then(() => tratar(ev.data)); };

async function tratar(m) {
  try {
    if (m.tipo === 'carregar') { await garantir(); return; }
    if (m.tipo === 'melhorar') {
      /* recorte da unha (RGBA) -> o dobro do tamanho, com bordas limpas e sem o quadriculado de JPEG */
      const t0 = performance.now();
      const entrada = new RawImage(new Uint8ClampedArray(m.rgba), m.w, m.h, 4).rgb();
      let saida = null;
      for (let tent = 0; !saida; tent++) {
        await garantirSR();
        try { saida = await superRes(entrada); }
        catch (e) { superRes = null; carregandoSR = null; idxSR++; if (tent >= 1) throw e; } // falhou ao rodar: tenta a próxima combinação
      }
      const W2 = m.w * 2, H2 = m.h * 2;           // o modelo arredonda o tamanho para cima; recorta ao dobro exato
      const out = new Uint8ClampedArray(W2 * H2 * 4);
      const ch = saida.channels;
      for (let y = 0; y < H2; y++) {
        for (let x = 0; x < W2; x++) {
          const s = (Math.min(y, saida.height - 1) * saida.width + Math.min(x, saida.width - 1)) * ch, o = (y * W2 + x) * 4;
          out[o] = saida.data[s]; out[o + 1] = saida.data[s + 1]; out[o + 2] = saida.data[s + 2]; out[o + 3] = 255;
        }
      }
      postMessage({ tipo: 'melhorada', id: m.id, w: W2, h: H2, rgba: out.buffer, ms: Math.round(performance.now() - t0) }, [out.buffer]);
      return;
    }
    await garantir();
    if (m.tipo === 'analisar') {
      imagem = new RawImage(new Uint8ClampedArray(m.rgba), m.w, m.h, 4).rgb();
      const entradas = await processador(imagem);
      leitura = await modelo.get_image_embeddings(entradas);
      postMessage({ tipo: 'analisada', id: m.id, dispositivo });
    } else if (m.tipo === 'segmentar') {
      if (!leitura) throw new Error('A foto ainda não foi analisada.');
      const ent = await processador(imagem, { input_points: [[...m.pontos]], input_labels: [[...m.rotulos]] });
      const saida = await modelo({ ...leitura, input_points: ent.input_points, input_labels: ent.input_labels });
      const mascaras = await processador.post_process_masks(saida.pred_masks, ent.original_sizes, ent.reshaped_input_sizes);
      /* o modelo devolve 3 candidatos por toque (parte, objeto, conjunto): quem decide qual é a unha é a interface,
         pelo tamanho e pela pontuação, e a pessoa pode trocar por outro candidato */
      const scores = Array.from(saida.iou_scores.data);
      const t = mascaras[0][0];                       // [3, H, W]
      const H = t.dims[1], W = t.dims[2];
      const planos = new Uint8Array(3 * W * H);
      for (let p = 0; p < 3 * W * H; p++) planos[p] = t.data[p] ? 1 : 0;
      postMessage({ tipo: 'mascara', id: m.id, w: W, h: H, planos, scores }, [planos.buffer]);
    }
  } catch (e) {
    postMessage({ tipo: 'erro', id: m.id, mensagem: String((e && e.message) || e) });
  }
}
