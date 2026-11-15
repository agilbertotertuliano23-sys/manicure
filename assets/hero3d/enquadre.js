/* Enquadramento da câmera em tela em pé (celular).
   Dado um conjunto de pontos do mundo (frascos, dedos...) e o retângulo livre da tela (o que sobra depois do texto em
   cima ou do cartão embaixo), acha a distância da câmera e o deslocamento em pixels para o conjunto caber e ficar
   centrado nesse retângulo. É só a conta: não toca na cena (por isso dá para testar em Node, passando o THREE). */
export function criarEnquadre(T) {
  const cam = new T.PerspectiveCamera(30, 1, 0.05, 30);
  const alvo = new T.Vector3();
  const pos = new T.Vector3();
  const q = new T.Vector3();

  /* caixa, em pixels, que os pontos ocupam com a câmera na distância `f` (múltiplo da distância da vista) */
  function caixa(vista, up, f, pts, W, H, fov) {
    cam.fov = fov;
    cam.aspect = W / H;
    cam.up.set(up[0], up[1], up[2]);
    alvo.set(vista.alvo[0], vista.alvo[1], vista.alvo[2]);
    pos.set(vista.pos[0], vista.pos[1], vista.pos[2]).sub(alvo).multiplyScalar(f).add(alvo);
    cam.position.copy(pos);
    cam.lookAt(alvo);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const v of pts) {
      q.copy(v).project(cam);
      const px = ((q.x + 1) / 2) * W;
      const py = ((1 - q.y) / 2) * H;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    return { x0, x1, y0, y1 };
  }

  /* devolve { f, dx, dy }: f multiplica a distância da vista; dx/dy são o quanto a imagem desce/vai à direita (px) */
  function ajustar({ vista, up = [0, 1, 0], pts, W, H, fov, rect, fMin = 0.5, fMax = 4 }) {
    const larg = Math.max(40, rect.x1 - rect.x0);
    const alt = Math.max(40, rect.y1 - rect.y0);
    let f = 1;
    for (let i = 0; i < 6; i++) {
      const b = caixa(vista, up, f, pts, W, H, fov);
      const s = Math.max((b.x1 - b.x0) / larg, (b.y1 - b.y0) / alt);
      f = Math.min(fMax, Math.max(fMin, f * s));
    }
    const b = caixa(vista, up, f, pts, W, H, fov);
    return {
      f,
      dx: (rect.x0 + rect.x1) / 2 - (b.x0 + b.x1) / 2,
      dy: (rect.y0 + rect.y1) / 2 - (b.y0 + b.y1) / 2,
      caixa: b
    };
  }

  return { ajustar, caixa };
}
