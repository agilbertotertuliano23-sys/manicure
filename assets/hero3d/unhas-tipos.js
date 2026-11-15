/* Catálogo de serviços de unha e formatos (dados + a forma de cada formato).
   Textos e prazos vêm de pesquisa em guias de beleza brasileiros (Elle Brasil, Beleza na Web,
   Correio Braziliense, Drogaraia, entre outros). Os prazos variam de fonte para fonte e de
   pessoa para pessoa: a tela avisa para confirmar com a manicure. Valores (R$) não entram
   aqui de propósito: cada salão define os seus. */

/* ---------- serviços ----------
   perfil = como o produto muda a unha 3D (unha-extensao.js), em frações do meio comprimento da unha (hu):
     esp    espessura da camada sobre a unha (esmalte fino → acrílico grosso)
     apice  volume extra no ponto de tensão (o "ápice" que o alongamento constrói perto da ponta do dedo)
     borda  espessura na ponta livre (acrílico deixa a borda mais grossa que fibra e gel)
     curvaC quanto a ponta livre se curva de lado a lado (a "curva C"; 0 = a curva da própria unha)
     capa   verniz por cima (0 = esmalte comum, 1 = gel com brilho de vitrine); vidro = brilho ainda mais liso
   muda = frase curta do que se vê na unha 3D ao escolher o serviço. */
export const SERVICOS = [
  { id: 'natural', grupo: 'natural', nome: 'Unha natural',
    desc: 'Cuticulagem, lixa no formato que você escolher e esmalte comum, sem nada por baixo.',
    dura: 'cerca de 1 semana', manut: 'refazer o esmalte quando começar a soltar', acab: 'esmalte',
    muda: 'camada fina que segue a curva da sua unha, com brilho de esmalte comum',
    perfil: { esp: 0.022, apice: 0, borda: 0.02, curvaC: 0, capa: 0.35 } },
  { id: 'gel', grupo: 'natural', nome: 'Esmaltação em gel',
    desc: 'Esmalte em gel curado na cabine de LED: brilho forte, sem tempo de secagem e mais opções de cor e efeito.',
    dura: '15 a 21 dias', manut: 'a cada 15 a 21 dias', acab: 'gel',
    muda: 'camada lisa e um pouco mais cheia, com brilho de gel',
    perfil: { esp: 0.032, apice: 0.006, borda: 0.026, curvaC: 0, capa: 1 } },
  { id: 'blindagem', grupo: 'natural', nome: 'Blindagem',
    desc: 'Base em gel fina sobre a unha natural para dar resistência e deixar a superfície lisa antes do esmalte.',
    dura: '15 a 21 dias', manut: 'a cada 15 a 21 dias', acab: 'gel',
    muda: 'base de gel que nivela a unha e reforça a ponta',
    perfil: { esp: 0.04, apice: 0.014, borda: 0.032, curvaC: 0.02, capa: 1 } },
  { id: 'banho', grupo: 'natural', nome: 'Banho de gel',
    desc: 'Camada de gel mais espessa que a blindagem: segura a unha que está crescendo e dá efeito de vidro.',
    dura: 'até cerca de 60 dias com cuidado', manut: 'a cada 15 a 20 dias', acab: 'gel',
    muda: 'camada grossa e abaulada, com efeito vidro',
    perfil: { esp: 0.05, apice: 0.03, borda: 0.036, curvaC: 0.05, capa: 1, vidro: 1 } },

  { id: 'fibra', grupo: 'alongamento', nome: 'Fibra de vidro',
    desc: 'Fios de fibra de vidro fixados com gel de extensão. Resultado natural e resistente; leva mais tempo para fazer.',
    dura: 'de 20 a 30 dias entre manutenções', manut: 'a cada 20 a 30 dias', acab: 'gel',
    muda: 'ápice discreto e ponta fina: a mais parecida com uma unha natural comprida',
    perfil: { esp: 0.04, apice: 0.05, borda: 0.022, curvaC: 0.14, capa: 1 } },
  { id: 'gelmoldado', grupo: 'alongamento', nome: 'Gel moldado',
    desc: 'Alongamento em gel modelado sobre a unha, leve e flexível, que acompanha o formato da sua unha.',
    dura: 'cerca de 20 dias entre manutenções', manut: 'a cada 20 dias', acab: 'gel',
    muda: 'ápice arredondado, curva C média e ponta leve',
    perfil: { esp: 0.044, apice: 0.075, borda: 0.026, curvaC: 0.22, capa: 1 } },
  { id: 'acrilico', grupo: 'alongamento', nome: 'Acrílico',
    desc: 'Pó acrílico com líquido monômero, que endurece ao ar. A técnica mais antiga: muito resistente e menos flexível.',
    dura: 'de 2 a 4 semanas entre manutenções', manut: 'a cada 2 a 4 semanas', acab: 'gel',
    muda: 'ápice alto, curva C fechada e borda mais grossa: a mais estruturada',
    perfil: { esp: 0.05, apice: 0.1, borda: 0.042, curvaC: 0.34, capa: 1 } },
  { id: 'acrigel', grupo: 'alongamento', nome: 'Acrigel',
    desc: 'Mistura de gel e pó acrílico: a modelagem do gel com a firmeza do acrílico.',
    dura: 'cerca de 20 dias entre manutenções', manut: 'a cada 20 dias', acab: 'gel',
    muda: 'entre o gel e o acrílico: ápice firme e curva C marcada',
    perfil: { esp: 0.046, apice: 0.085, borda: 0.032, curvaC: 0.28, capa: 1 } }
];

export const perfilDoServico = (id) => (SERVICOS.find((s) => s.id === id) || SERVICOS[0]).perfil;

export const GRUPOS = [
  { id: 'natural', nome: 'Na unha natural' },
  { id: 'alongamento', nome: 'Alongamento' }
];

/* ---------- comprimentos ----------
   k = quanto a ponta passa do fim da unha pintada no modelo (a = hu), em comprimentos de unha (2·hu).
   A ponta do dedo (vista de cima) fica entre a = 0,8·hu e 0,9·hu: "rente" termina nela.
   grupos = em que tipo de serviço o comprimento existe (unha natural não vira longa; alongamento não é rente). */
export const COMPRIMENTOS = [
  { id: 'rente', nome: 'Rente', k: -0.14, grupos: ['natural'], desc: 'termina junto com a ponta do dedo' },
  { id: 'natural', nome: 'Natural', k: -0.02, grupos: ['natural'], desc: 'a borda livre aparece um pouco' },
  { id: 'curta', nome: 'Curta', k: 0.14, grupos: ['natural', 'alongamento'], desc: 'passa um pouco da ponta do dedo' },
  { id: 'media', nome: 'Média', k: 0.4, grupos: ['alongamento'], desc: 'o comprimento mais pedido no alongamento' },
  { id: 'longa', nome: 'Longa', k: 0.7, grupos: ['alongamento'], desc: 'pede ápice bem construído' }
];

export const ehAlongamento = (servicoId) => {
  const s = SERVICOS.find((x) => x.id === servicoId);
  return !!s && s.grupo === 'alongamento';
};

/* ---------- formatos ---------- */
export const FORMATOS = [
  { id: 'quadrada', nome: 'Quadrada', desc: 'Laterais paralelas e ponta reta, cantos marcados. Prática, com visual limpo.' },
  { id: 'squoval', nome: 'Squoval', desc: 'Quadrada com os cantos arredondados: a reta da quadrada sem os cantos que enroscam.' },
  { id: 'redonda', nome: 'Redonda', desc: 'Ponta em meia-lua que acompanha a ponta do dedo. A melhor para unhas curtas.' },
  { id: 'oval', nome: 'Oval', desc: 'Ponta em meio ovo, mais comprida que a redonda: alonga os dedos.' },
  { id: 'amendoada', nome: 'Amendoada', desc: 'Laterais que afinam em curva até uma ponta estreita e arredondada.', minK: -0.05 },
  { id: 'bailarina', nome: 'Bailarina', desc: 'Laterais afuniladas e ponta reta (o "coffin"). Pede mais manutenção.', soAlongamento: true },
  { id: 'stiletto', nome: 'Stiletto', desc: 'Afina até a ponta fechada. Pede unha reforçada para não quebrar.', soAlongamento: true }
];

/* desenho de cada formato visto de cima, a partir de onde a unha começa a se moldar (s = 0) até a ponta (s = 1):
     ponta  meia largura na ponta, antes do arremate (fração da largura da base)
     curva  expoente do afinamento das laterais (1 = reta; > 1 = lateral cheia que afina perto do fim)
     cap    comprimento do arremate da ponta, em meias larguras da base (0 = ponta fechada)
     p      expoente do arremate (2 = arco de elipse; maior = mais reto, com cantos) */
const DESENHO = {
  quadrada:  { ponta: 1,    curva: 1,   cap: 0.1,  p: 6 },
  squoval:   { ponta: 1,    curva: 1,   cap: 0.42, p: 3 },
  redonda:   { ponta: 1,    curva: 1,   cap: 1.0,  p: 2 },
  oval:      { ponta: 0.86, curva: 2,   cap: 1.25, p: 2 },
  amendoada: { ponta: 0.42, curva: 1.6, cap: 1.0, p: 2 },
  bailarina: { ponta: 0.56, curva: 1.15, cap: 0.08, p: 6 },
  stiletto:  { ponta: 0.04, curva: 1.35, cap: 0.05, p: 2 }
};

/* meia largura relativa (0..1 da largura da base) em s (0 = base, 1 = ponta).
   E = comprimento da parte moldada e Wb = meia largura da base, na mesma unidade.
   Laterais afinam até d.ponta e a ponta fecha com uma meia superelipse de comprimento cap·Wb·ponta;
   se a unha é curta demais para o desenho inteiro, o arremate encolhe junto. */
export function larguraRelativa(formato, s, E, Wb) {
  s = Math.min(1, Math.max(0, Number.isFinite(s) ? s : 0));
  if (!(E > 0) || !(Wb > 0)) return 0;
  const d = DESENHO[formato] || DESENHO.oval;
  // Curvas únicas evitam a quebra de tangente entre o afunilamento e a tampa.
  if (formato === 'amendoada') return s === 1 ? 0 : Math.pow(Math.cos(s * Math.PI / 2), 0.8);
  if (formato === 'stiletto') return 1 - Math.pow(s, 1.2);
  // Cantos com raio pequeno e segmento frontal reto, sem fechar em um bico.
  if (formato === 'quadrada' || formato === 'squoval' || formato === 'bailarina') {
    const ponta = formato === 'bailarina' ? 0.56 : 1;
    const raio = formato === 'squoval' ? 0.26 : 0.055;
    const inicio = 1 - Math.min(0.3, raio * Wb / E);
    const t = Math.min(1, s / inicio);
    const lateral = 1 - (1 - ponta) * t * t * (2 - t);
    if (s <= inicio) return lateral;
    const q = (s - inicio) / (1 - inicio);
    return ponta - raio * (1 - Math.sqrt(Math.max(0, 1 - q * q)));
  }
  const L = Math.min(E, d.cap * Wb * Math.max(d.ponta, 0.35));
  /* onde começa o arremate. Na unha curta ele ocupa quase todo o comprimento (borda livre em arco, sem cantos
     retos) e o afinamento das laterais encolhe junto, para não haver degrau na largura; na longa quase nada muda. */
  const sc = Math.max(0, 1 - L / E);
  const ponta = 1 - (1 - d.ponta) * Math.min(1, sc / 0.42);
  const lateral = (x) => 1 - (1 - ponta) * Math.pow(Math.min(1, Math.max(0, x)) ** 2 * (2 - Math.min(1, Math.max(0, x))), d.curva);
  if (L <= 0) return lateral(s);
  if (s <= sc) return sc > 0 ? lateral(s / sc) : 1;
  const w0 = lateral(1);
  const x = (s - sc) / (1 - sc);
  return w0 * Math.pow(Math.max(0, 1 - Math.pow(x, d.p)), 1 / d.p);
}
