/* As cinco unhas modeladas na mão: uma unha 3D inteira por dedo (cutícula até a ponta, formato + comprimento,
   gerada em unha-extensao.js sobre a pele medida) e o acabamento do esmalte. Ela cobre a unha pintada da textura,
   que o shader da mão (hero3d.js) transforma em leito de unha.
   criarUnhasModelo(malhaMao, uBase) -> { definir({ formato, comprimento, servico }), acabamento({ capa, capaRug }),
                                          arte(ativos), k, geomArte(i) }
     malhaMao : a malha da mão (as extensões viram filhas dela e herdam a posição)
     uBase    : uniforms do shader da mão (uCor, uArte, uArteOn, uArteAsp, uExtK, uRug, uBrilhoK, uMetal …),
                compartilhados para a unha nova ter exatamente a mesma cor, arte e acabamento da unha da mão.
   A arte cobre a unha inteira (da cutícula até a ponta nova): o mapeamento em hero3d.js (mão) e aqui (extensão)
   usa a mesma conta: centro = metade da extensão, meia altura hl = hu + extL/2. */
import * as THREE from 'three';
import { UNHAS } from './unhas.js';
import { gerarUnha, kDoComprimento } from './unha-extensao.js';
import { perfilDoServico } from './unhas-tipos.js';

/* reflexo de verniz: duas faixas de luz ao longo da unha (nab.x = ao longo, nab.y = de lado a lado) */
export const GLSL_VERNIZ_FN = /* glsl */`
float reflexoVerniz(vec2 nab) {
  float f1 = (1.0 - smoothstep(0.0, 0.1, abs(nab.y + 0.46 - 0.1 * nab.x * nab.x))) * (1.0 - smoothstep(0.35, 0.95, abs(nab.x + 0.1)));
  float f2 = (1.0 - smoothstep(0.0, 0.05, abs(nab.y - 0.62 + 0.1 * nab.x))) * (1.0 - smoothstep(0.2, 0.7, abs(nab.x - 0.25)));
  return f1 * 0.34 + f2 * 0.2;
}`;

const GLSL_DECL = /* glsl */`
uniform vec3 uCor;
uniform float uHU; uniform float uHV; uniform float uSlot; uniform float uLiga; uniform float uFoto;
uniform float uExtK; uniform float uRug; uniform float uBrilhoK; uniform float uMetal;
uniform float uSelUnha; uniform float uTempo;
uniform sampler2D uArte; uniform float uArteOn; uniform float uArteAsp;
varying vec2 vNail;
varying float vContato;
${GLSL_VERNIZ_FN}`;

const GLSL_COR = /* glsl */`
  float extL = uExtK * 2.0 * uHU;
  float hl = 0.98 * uHU + 0.5 * extL;
  float centro = 0.02 * uHU + 0.5 * extL;
  diffuseColor.rgb = pow(clamp(uCor, 0.0, 1.0), vec3(2.2));
  vec2 nuv = vec2(-vNail.y, vNail.x - centro);
  vec2 auv = vec2(nuv.x / (uHV * 1.05), nuv.y / (hl * 1.05)) * 0.5 + 0.5;
  float dentroImg = step(0.0, auv.x) * step(auv.x, 1.0) * step(0.0, auv.y) * step(auv.y, 1.0);
  vec2 auvA = vec2((uSlot + clamp(auv.x, 0.002, 0.998)) / 5.0, clamp(auv.y, 0.002, 0.998));
  vec4 arte = texture2D(uArte, auvA);
  float wArte = arte.a * dentroImg * uArteOn * uLiga;
  diffuseColor.rgb = mix(diffuseColor.rgb, arte.rgb, wArte);
  /* arte vinda de FOTO já traz a luz e o brilho da foto: sob a luz da cena ela estoura e perde cor. 40% da cor vai para a
     emissão (não depende da luz) e 60% fica como cor difusa; o reflexo de verniz extra quase some */
  float fotoW = wArte * uFoto;
  vec3 artEmissive = arte.rgb * fotoW * 0.4;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.6, fotoW);
  float ouro = wArte * smoothstep(0.3, 0.5, arte.r - arte.b) * smoothstep(0.28, 0.42, arte.g) * step(arte.g, arte.r + 0.02);
  float cromo = uMetal;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.3 + 0.05, cromo);
  vec2 nabG = vec2((vNail.x - centro) / hl, vNail.y / uHV);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), (1.0 - ouro) * reflexoVerniz(nabG) * uBrilhoK * (1.0 - 0.8 * uFoto));
  /* unha em edição: pulsa de leve (a seleção também acende a unha, qualquer que seja o formato) */
  float sel = step(abs(uSlot - uSelUnha), 0.1);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), sel * (0.16 + 0.1 * sin(uTempo * 4.0)));
  /* onde a unha encosta na pele (laterais e base) o esmalte se funde ao tom da pele e escurece de leve, como o produto
     entrando na dobra da cutícula: some o fio claro e serrilhado da borda */
  float fundeP = 1.0 - smoothstep(0.0, 1.0, vContato);
  vec3 tomPele = pow(vec3(0.80, 0.55, 0.49), vec3(2.2));
  diffuseColor.rgb = mix(diffuseColor.rgb, tomPele, fundeP * 0.6);
`;

function materialExtensao(uBase, i) {
  /* físico para ter verniz (clearcoat): esmalte comum tem pouco, gel tem a camada de vitrine.
     clearcoat nunca vai a 0 (mudar de 0 para > 0 recompila o shader) */
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0, side: THREE.DoubleSide,
    clearcoat: 0.35, clearcoatRoughness: 0.08,
    /* a unha ganha empates de profundidade com a pele: onde a malha da mão encosta na unha fina, aparece a unha */
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const proprios = {
    uHU: { value: UNHAS[i].hu }, uHV: { value: UNHAS[i].hv },
    uSlot: { value: i }, uLiga: { value: 0 }, uFoto: { value: 0 }
  };
  m.userData.proprios = proprios;
  m.onBeforeCompile = (s) => {
    for (const nome of ['uCor', 'uArte', 'uArteOn', 'uArteAsp', 'uExtK', 'uRug', 'uBrilhoK', 'uMetal', 'uSelUnha', 'uTempo']) s.uniforms[nome] = uBase[nome];
    Object.assign(s.uniforms, proprios);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aNail;\nattribute float aContato;\nvarying vec2 vNail;\nvarying float vContato;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNail = aNail;\nvContato = aContato;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_DECL)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + GLSL_COR)
      .replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = uRug;\nroughnessFactor = mix(roughnessFactor, 0.16, ouro);\nroughnessFactor = mix(roughnessFactor, 0.12, cromo);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.92, max(ouro, cromo));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += artEmissive;');
  };
  m.customProgramCacheKey = () => 'unha-extensao';
  return m;
}

export function criarUnhasModelo(malhaMao, uBase) {
  const grupo = new THREE.Group();
  grupo.name = 'unhas-extensao';
  malhaMao.add(grupo);
  const materiais = UNHAS.map((_, i) => materialExtensao(uBase, i));
  const malhas = UNHAS.map((_, i) => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), materiais[i]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.userData.unha = i;
    grupo.add(mesh);
    return mesh;
  });

  let k = kDoComprimento('natural');
  let ultimaGeometria = '';

  /* formato + comprimento + serviço (o serviço define espessura, ápice, borda e curva C da peça) */
  function definir({ formato, comprimento, servico }) {
    k = kDoComprimento(comprimento);
    uBase.uExtK.value = k;
    const chave = `${formato}/${k}/${servico}`;
    if (chave === ultimaGeometria) return;
    const perfil = perfilDoServico(servico);
    UNHAS.forEach((u, i) => {
      const g = gerarUnha(i, formato, k, perfil);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3));
      geo.setAttribute('aNail', new THREE.BufferAttribute(g.nail, 2));
      geo.setAttribute('aContato', new THREE.BufferAttribute(g.contato, 1));
      geo.setIndex(new THREE.BufferAttribute(g.idx, 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const velha = malhas[i].geometry;
      malhas[i].geometry = geo;
      velha.dispose();
    });
    ultimaGeometria = chave;
  }

  /* verniz por cima do esmalte: capa 0..1 (força) e capaRug (0 = espelho) */
  function acabamento({ capa, capaRug }) {
    materiais.forEach((m) => {
      m.clearcoat = Math.max(0.001, capa);
      m.clearcoatRoughness = capaRug;
    });
  }

  function arte(ativos) {
    /* ativos[i]: 0 = sem arte, 1 = arte desenhada/modelo, 2 = arte vinda de foto */
    ativos.forEach((a, i) => {
      materiais[i].userData.proprios.uLiga.value = a ? 1 : 0;
      materiais[i].userData.proprios.uFoto.value = a === 2 ? 1 : 0;
    });
  }

  /* centro e meia altura da arte da unha i, em unidades do objeto (para arrastar a arte com o dedo) */
  function geomArte(i) {
    const hu = UNHAS[i].hu;
    const extL = k * 2 * hu;
    return { hl: 0.98 * hu + 0.5 * extL, cc: 0.02 * hu + 0.5 * extL, hw: UNHAS[i].hv };
  }

  return { definir, acabamento, arte, geomArte, get k() { return k; }, grupo, malhas };
}
