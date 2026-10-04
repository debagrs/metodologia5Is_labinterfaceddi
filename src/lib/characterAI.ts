export async function characterImageForAI(url: string) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('A referência demorou demais para carregar.')), 12000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('Não foi possível ler o desenho. Envie-o pelo upload de referências.')); };
    image.src = url;
  });
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('A imagem está vazia.');
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 960 / Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width = Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height = Math.max(1,Math.round(image.naturalHeight*scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar o desenho para a IA.');
  context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  try {
    let data = canvas.toDataURL('image/jpeg',.86).split(',')[1];
    if (data.length > 450000) data = canvas.toDataURL('image/jpeg',.65).split(',')[1];
    if (data.length > 450000) throw new Error('Imagem muito detalhada. Reduza o tamanho e tente novamente.');
    return { mimeType: 'image/jpeg', data };
  } catch (error) {
    if (error instanceof DOMException) throw new Error('Essa imagem bloqueia a leitura. Baixe-a e use o upload de referências.');
    throw error;
  }
}

export function validateCharacterSvg(svg: string) {
  const parsed = new DOMParser().parseFromString(svg,'image/svg+xml');
  if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg') throw new Error('A IA retornou um SVG malformado. Tente novamente.');
  if (!parsed.querySelector('path,ellipse,circle,rect,polygon,polyline,line')) throw new Error('A IA retornou uma ilustração vazia.');
  return svg;
}
