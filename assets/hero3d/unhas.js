/* Posição das 5 unhas na malha da mão (espaço do objeto 'mao', igual na versão leve e na HD).
 Calculado da textura: pontos de esmalte carmim agrupados por dedo, eixos por PCA.
   c  = centro    u = direção da ponta do dedo    v = largura    n = normal (para fora)
   hu = meio comprimento    hv = meia largura (metros) */
export const UNHAS = [
  { nome: 'polegar', c: [0.1696, 0.0666, 0.2546], u: [0.9543, -0.2943, 0.0511], v: [0.2589, 0.7294, -0.6332], n: [0.1491, 0.6176, 0.7723], hu: 0.0384, hv: 0.0299 },
  { nome: 'indicador', c: [0.3895, 0.0691, 0.2271], u: [0.7911, -0.5222, 0.3187], v: [0.3166, -0.0964, -0.9437], n: [0.5235, 0.8474, 0.0891], hu: 0.0356, hv: 0.0221 },
  { nome: 'medio', c: [0.4559, 0.0652, 0.1669], u: [0.8452, -0.4652, 0.2632], v: [0.2818, -0.0306, -0.959], n: [0.4542, 0.8847, 0.1053], hu: 0.0381, hv: 0.0201 },
  { nome: 'anelar', c: [0.4367, 0.0714, 0.0889], u: [0.8602, -0.4278, 0.2775], v: [0.2326, -0.1552, -0.9601], n: [0.4538, 0.8905, -0.034], hu: 0.0361, hv: 0.0185 },
  { nome: 'minimo', c: [0.3863, 0.0833, 0.011], u: [0.8469, -0.4148, 0.3327], v: [0.2864, -0.1713, -0.9427], n: [0.448, 0.8936, -0.0263], hu: 0.0327, hv: 0.0143 }
];

/* índice da unha de destaque (anelar) */
export const ANELAR = 3;
