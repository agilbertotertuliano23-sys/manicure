/* Cores da hero 3D, da esquerda para a direita na fileira de frascos.
   esmalte: cor aplicada no líquido dos frascos e nas unhas da mão.
   fundo:   cor da cena inteira quando a cor está escolhida.
   texto:   cor do texto sobre o fundo (contraste conferido: >= 4,9:1). */
export const CORES = [
  { id: 'nude',      nome: 'Nude Seda', desc: 'Quase cor de pele, com brilho de vidro. Unhas limpas e luminosas.', esmalte: '#E3AE97', fundo: '#EDB79F', texto: '#3A0915' },
  { id: 'rose',      nome: 'Rosé',      desc: 'Rosa delicado para o dia a dia, que combina com tudo.',               esmalte: '#E48AA3', fundo: '#E68BA7', texto: '#3A0915' },
  { id: 'coral',     nome: 'Coral',     desc: 'Quente e alegre. Fica lindo em pele dourada.',                         esmalte: '#EE4B3E', fundo: '#F0655B', texto: '#3A0915' },
  { id: 'cereja',    nome: 'Cereja',    desc: 'O vermelho clássico, intenso e com brilho espelhado.',                esmalte: '#C20F2B', fundo: '#D9203E', texto: '#FFFFFF' },
  { id: 'framboesa', nome: 'Framboesa', desc: 'Rosa profundo, entre o pink e o vinho. A cor da estação.',            esmalte: '#A8104D', fundo: '#C8155F', texto: '#FFFFFF' },
  { id: 'ameixa',    nome: 'Ameixa',    desc: 'Escuro e elegante, com fundo arroxeado.',                             esmalte: '#4C0D2C', fundo: '#74224C', texto: '#FFFFFF' }
];

/* Cor que abre a página (Framboesa, como no vídeo de referência). */
export const INICIAL = 4;
