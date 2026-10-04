/** Shared contract for local and hosted sketch generation. */
export function sketchVisualParts(
  input: unknown,
): Array<{ inlineData: { mimeType: string; data: string } }> {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 4).map((image) => {
    if (
      !image ||
      !["image/png", "image/jpeg", "image/webp"].includes(image.mimeType) ||
      typeof image.data !== "string" ||
      image.data.length > 450000 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)
    ) {
      throw new Error(
        "Referência visual inválida ou grande demais. Envie uma imagem menor.",
      );
    }
    return { inlineData: { mimeType: image.mimeType, data: image.data } };
  });
}
export function sketchContext(body: {
  conversation?: Array<{ role?: string; content?: string; text?: string }>;
  characterReference?: unknown;
  runtimeError?: string;
}) {
  return `\nCONVERSA DO SKETCH (pedidos anteriores): ${JSON.stringify((body.conversation || []).slice(-8))}\nREFERÊNCIA DO PERSONAGEM (aparência e vistas): ${JSON.stringify(body.characterReference || null)}\nERRO OBSERVADO: ${String(body.runtimeError || "").slice(0, 1200)}\n`;
}
export const threeSketchRules = `
Para Three.js: produza objetos volumétricos reais, iluminação, sombras suaves e enquadramento que revele a forma. Se o pedido é personagem 3D, não devolva apenas plano, sprite, billboard ou imagem giratória. Interprete as imagens anexadas junto com os dados de aparência para construir a anatomia e preserve roupa, cores, proporções e traços reconhecíveis.
THREE já existe. CHARACTER contém a referência de personagem ou null. createCharacter3D(appearance) retorna um THREE.Group articulado inicial para bípedes, com userData.parts e userData.setPose(phase); refine os meshes e adicione detalhes para o pedido. Para animais, criaturas e planos corporais distintos, construa meshes próprios compatíveis com as vistas; não force o helper humano.
A imagem 2D é referência, não um modelo 3D pronto. Não prometa uma reconstrução exata ou um arquivo GLB inexistente. Não invente links de modelos.
Crie renderer com antialias, limite pixelRatio a 2, defina scene, camera, luzes e loop. Use STAGE.clientWidth/clientHeight com mínimo 1 e ResizeObserver, anexe renderer.domElement a STAGE e atualize camera.aspect. Para órbita sem bibliotecas adicionais, use pointerdown/move/up e wheel; dê suporte a toque. Exiba o personagem inteiro centrado e chão/sombra.
Só carregue texturas dos assets enviados. Não importe THREE novamente ou addons: não há OrbitControls global. Não escreva HTML, CSS ou tags script; somente JavaScript executável completo.
`;
