import type { InteractiveEngine } from "../types";
export interface LibraryEffect {
  id: string;
  label: string;
  category: string;
  hint: string;
}
const list = (category: string, entries: Array<[string, string, string]>) =>
  entries.map(([id, label, hint]) => ({ id, label, hint, category }));
export const EFFECT_CATALOG: Record<InteractiveEngine, LibraryEffect[]> = {
  svg: list("Vetor", [
    ["network", "Rede viva", "Conecta os elementos reais do SVG."],
    ["breathe", "Respiração", "Pulsa sem redesenhar."],
    ["draw", "Revelar traçados", "Desenha as linhas progressivamente."],
    ["wave", "Onda sequencial", "Anima em sequência."],
    ["explode", "Explosão ao toque", "Separa e retorna elasticamente."],
    ["drift", "Deriva suave", "Movimento orgânico dos elementos."],
  ]),
  p5: [
    ...list("Partículas", [
      ["particles", "Partículas interativas", "Seguem o toque ou o mouse."],
      ["flow", "Campo de fluxo", "Trajetórias com ruído Perlin."],
      ["orbit", "Órbitas", "Sistema de pontos em órbita."],
    ]),
    ...list("Desenho generativo", [
      ["waves", "Ondas", "Faixas senoidais animadas."],
      ["rings", "Anéis", "Círculos concêntricos em movimento."],
      ["noise", "Topografia", "Curvas geradas por ruído."],
      ["mosaic", "Mosaico", "Grade de formas pulsantes."],
      ["brush", "Pincel interativo", "Desenhe com mouse ou toque."],
    ]),
  ],
  gsap: list("Motion", [
    ["float", "Flutuação", "Oscilação vertical suave."],
    ["pulse", "Pulsação", "Escala ritmada."],
    ["spin", "Rotação", "Giro contínuo."],
    ["orbit", "Órbita", "Trajetória circular."],
    ["stagger", "Sequência", "Entrada escalonada de elementos."],
    ["bounce", "Elasticidade", "Movimento com retorno elástico."],
    ["follow", "Seguir ponteiro", "Aproxima-se do mouse ou toque."],
  ]),
  anime: list("Motion", [
    ["float", "Flutuação", "Oscilação vertical suave."],
    ["pulse", "Pulsação", "Escala ritmada."],
    ["spin", "Rotação", "Giro contínuo."],
    ["orbit", "Órbita", "Trajetória circular."],
    ["stagger", "Sequência", "Entrada escalonada de elementos."],
    ["bounce", "Elasticidade", "Movimento com retorno elástico."],
    ["follow", "Seguir ponteiro", "Aproxima-se do mouse ou toque."],
  ]),
  matter: list("Física", [
    ["fall", "Gravidade", "Corpos caem e colidem."],
    ["rain", "Chuva de corpos", "Partículas com colisões."],
    ["stack", "Pilha", "Blocos que podem ser arrastados."],
    ["spring", "Pêndulo elástico", "Corpo suspenso por uma mola."],
    ["cradle", "Pêndulos", "Corpos conectados por restrições."],
  ]),
  three: list("Cena 3D", [
    ["character", "Personagem 3D", "Modelo articulado a partir da referência."],
    ["sculpture", "Escultura orbital", "Formas com luz e câmera orbital."],
    ["galaxy", "Galáxia", "Partículas em espiral com profundidade."],
    ["wave", "Malha ondulante", "Superfície com vértices animados."],
    ["cloud", "Nuvem de partículas", "Volume de pontos em movimento."],
    ["image", "Imagem em 3D", "Imagem aplicada como textura de um plano."],
  ]),
};
export const LIBRARY_DOCS: Record<InteractiveEngine, string> = {
  svg: "https://svgjs.dev/docs/3.0/",
  p5: "https://p5js.org/reference/",
  gsap: "https://gsap.com/docs/v3/",
  anime: "https://animejs.com/v3/documentation/",
  matter: "https://brm.io/matter-js/docs/",
  three: "https://threejs.org/docs/",
};
export function buildLibraryEffect(
  engine: InteractiveEngine,
  id: string,
): string {
  if (engine === "p5")
    return `
let points=[],assetImage,phase=0;const EFFECT=${JSON.stringify(id)};
function preload(){if(ASSET?.url)assetImage=loadImage(ASSET.url,()=>{},()=>assetImage=null);}
function setup(){const c=createCanvas(Math.max(1,STAGE.clientWidth),Math.max(1,STAGE.clientHeight));c.parent(STAGE);pixelDensity(Math.min(window.devicePixelRatio||1,2));for(let i=0;i<100;i++)points.push(createVector(random(width),random(height)));background('#11272C');}
function windowResized(){resizeCanvas(STAGE.clientWidth,STAGE.clientHeight);}
function draw(){phase+=.015;if(EFFECT==='brush'){if(mouseIsPressed){noStroke();fill('#63DCCE');circle(mouseX,mouseY,15);}return;}background('#11272C');noFill();stroke('#63DCCE');strokeWeight(1.5);
if(EFFECT==='particles'||EFFECT==='flow'){points.forEach((p,i)=>{const angle=EFFECT==='flow'?noise(p.x*.005,p.y*.005,phase*.1)*TAU*2:atan2(mouseY-p.y,mouseX-p.x);p.add(p5.Vector.fromAngle(angle).mult(EFFECT==='flow'?1.2:.6));p.x=(p.x+width)%width;p.y=(p.y+height)%height;circle(p.x,p.y,3+i%4);});}
if(EFFECT==='orbit'){translate(width/2,height/2);points.forEach((p,i)=>{let r=20+i*min(width,height)/240;circle(cos(phase+i)*r,sin(phase+i)*r,4);});}
if(EFFECT==='waves'||EFFECT==='noise'){for(let y=20;y<height;y+=16){beginShape();for(let x=0;x<=width;x+=8){let wave=EFFECT==='noise'?(noise(x*.006,y*.008,phase*.3)-.5)*90:sin(x*.016+phase+y*.03)*18;vertex(x,y+wave);}endShape();}}
if(EFFECT==='rings'){translate(width/2,height/2);for(let i=0;i<14;i++)circle(0,0,(i+1)*min(width,height)/16+sin(phase+i)*8);}
if(EFFECT==='mosaic'){noStroke();for(let x=15;x<width;x+=30)for(let y=15;y<height;y+=30){fill(x%60?'#63DCCE':'#9F81C5');circle(x,y,14+sin(phase+x*.02+y*.02)*10);}}
if(assetImage){resetMatrix();const size=min(width,height)*.45;imageMode(CENTER);image(assetImage,width/2,height/2,size,size*assetImage.height/assetImage.width);}}
`;
  if (engine === "gsap" || engine === "anime")
    return `
const EFFECT=${JSON.stringify(id)};STAGE.style.cssText='background:#142B30;display:flex;align-items:center;justify-content:center;gap:14px;';
const items=[];for(let i=0;i<(EFFECT==='stagger'?7:1);i++){const el=document.createElement(ASSET?.url?'img':'div');if(ASSET?.url){el.src=ASSET.url;el.style.objectFit='contain';}el.style.cssText+='width:'+ (EFFECT==='stagger'?'9vw':'min(42vw,240px)')+';height:'+ (EFFECT==='stagger'?'9vw':'min(42vw,240px)')+';border-radius:18px;'+(!ASSET?.url?'background:#5DD9CA;':'');STAGE.appendChild(el);items.push(el);}
${
  engine === "gsap"
    ? `const props=EFFECT==='float'?{y:-28}:EFFECT==='pulse'?{scale:1.15}:EFFECT==='spin'?{rotation:360}:EFFECT==='bounce'?{y:-70}:EFFECT==='orbit'?{x:60,y:-50,rotation:360}: {y:-40,opacity:.35};
if(EFFECT==='follow'){const x=gsap.quickTo(items[0],'x',{duration:.4}),y=gsap.quickTo(items[0],'y',{duration:.4});STAGE.onpointermove=e=>{const b=STAGE.getBoundingClientRect();x(e.clientX-b.left-b.width/2);y(e.clientY-b.top-b.height/2);};}else gsap.to(items,{...props,duration:EFFECT==='spin'?6:1.5,repeat:-1,yoyo:EFFECT!=='spin',stagger:EFFECT==='stagger'?.12:0,ease:EFFECT==='bounce'?'elastic.out(1,.5)':EFFECT==='spin'?'none':'sine.inOut'});`
    : `const props=EFFECT==='float'?{translateY:[0,-28]}:EFFECT==='pulse'?{scale:[1,1.15]}:EFFECT==='spin'?{rotate:[0,360]}:EFFECT==='bounce'?{translateY:[0,-70]}:EFFECT==='orbit'?{translateX:[-60,60],translateY:[50,-50],rotate:360}:{translateY:[0,-40],opacity:[1,.35]};
if(EFFECT==='follow')STAGE.onpointermove=e=>{const b=STAGE.getBoundingClientRect();anime.remove(items);anime({targets:items,translateX:e.clientX-b.left-b.width/2,translateY:e.clientY-b.top-b.height/2,duration:500,easing:'easeOutQuad'});};else anime({targets:items,...props,duration:EFFECT==='spin'?6000:1500,loop:true,direction:EFFECT==='spin'?'normal':'alternate',delay:anime.stagger(EFFECT==='stagger'?120:0),easing:EFFECT==='bounce'?'easeOutElastic(1,.5)':EFFECT==='spin'?'linear':'easeInOutSine'});`
}
`;
  if (engine === "matter")
    return `
const EFFECT=${JSON.stringify(id)},w=STAGE.clientWidth,h=STAGE.clientHeight;const engine=Matter.Engine.create(),render=Matter.Render.create({element:STAGE,engine,options:{width:w,height:h,wireframes:false,background:'#142B30',pixelRatio:Math.min(window.devicePixelRatio||1,2)}});Matter.Render.run(render);Matter.Runner.run(Matter.Runner.create(),engine);
const walls=[Matter.Bodies.rectangle(w/2,h+25,w,50,{isStatic:true}),Matter.Bodies.rectangle(-25,h/2,50,h*3,{isStatic:true}),Matter.Bodies.rectangle(w+25,h/2,50,h*3,{isStatic:true})];Matter.Composite.add(engine.world,walls);
const count=EFFECT==='rain'?36:EFFECT==='spring'?1:EFFECT==='cradle'?5:12;
for(let i=0;i<count;i++){const x=EFFECT==='cradle'?w/2+(i-2)*34:EFFECT==='stack'?w/2+(i%3-1)*40:40+(i*61)%Math.max(1,w-80),y=EFFECT==='cradle'||EFFECT==='spring'?h*.48:EFFECT==='stack'?h*.7-Math.floor(i/3)*38:30-Math.floor(i/4)*40;const body=EFFECT==='stack'?Matter.Bodies.rectangle(x,y,36,34,{render:{fillStyle:'#63DCCE'}}):Matter.Bodies.circle(x,y,EFFECT==='rain'?9:16,{restitution:.85,render:{fillStyle:i%2?'#9F81C5':'#63DCCE'}});Matter.Composite.add(engine.world,body);if(EFFECT==='spring'||EFFECT==='cradle')Matter.Composite.add(engine.world,Matter.Constraint.create({pointA:{x,y:30},bodyB:body,length:h*.4,stiffness:EFFECT==='spring'?.015:.95}));if(ASSET?.url){const image=new Image();image.onload=()=>{body.render.sprite={texture:ASSET.url,xScale:32/image.naturalWidth,yScale:32/image.naturalHeight};};image.src=ASSET.url;}}
const mouse=Matter.Mouse.create(render.canvas);Matter.Composite.add(engine.world,Matter.MouseConstraint.create(engine,{mouse,constraint:{stiffness:.2,render:{visible:false}}}));render.mouse=mouse;render.canvas.style.touchAction='none';new ResizeObserver(()=>{Matter.Render.setSize(render,STAGE.clientWidth,STAGE.clientHeight);Matter.Body.setPosition(walls[0],{x:STAGE.clientWidth/2,y:STAGE.clientHeight+25});Matter.Body.setPosition(walls[2],{x:STAGE.clientWidth+25,y:STAGE.clientHeight/2});}).observe(STAGE);
`;
  if (engine === "three")
    return `
const EFFECT=${JSON.stringify(id)},scene=new THREE.Scene();scene.background=new THREE.Color('#15272F');const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,1,6);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));STAGE.appendChild(renderer.domElement);scene.add(new THREE.HemisphereLight('#fff','#2C3E4A',2));const light=new THREE.DirectionalLight('#fff1dd',3);light.position.set(3,5,4);scene.add(light);
const group=new THREE.Group();scene.add(group);let surface=null;
if(EFFECT==='image'){if(!ASSET?.url)throw new Error('Escolha uma imagem antes de aplicar Imagem em 3D.');new THREE.TextureLoader().load(ASSET.url,t=>{t.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3,3*t.image.height/t.image.width),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide,transparent:true}));group.add(mesh);},undefined,()=>{throw new Error('A textura não pôde ser carregada.');});}
else if(EFFECT==='sculpture'){for(let i=0;i<4;i++){const mesh=new THREE.Mesh(i%2?new THREE.TorusKnotGeometry(.35,.12,100,16):new THREE.IcosahedronGeometry(.65,3),new THREE.MeshStandardMaterial({color:i%2?'#A38CCF':'#63DCCE',roughness:.35,metalness:.2}));mesh.position.set(Math.sin(i*1.7)*1.3,Math.cos(i*1.7)*1.1,Math.sin(i)*.4);group.add(mesh);}}
else if(EFFECT==='wave'){surface=new THREE.Mesh(new THREE.PlaneGeometry(4,3,55,40),new THREE.MeshStandardMaterial({color:'#63DCCE',wireframe:true,side:THREE.DoubleSide}));surface.rotation.x=-.6;group.add(surface);}
else {const geometry=new THREE.BufferGeometry(),positions=new Float32Array(1800*3);for(let i=0;i<1800;i++){const angle=i*.13,r=Math.sqrt(i/1800)*2.4;positions[i*3]=EFFECT==='galaxy'?Math.cos(angle)*r:(Math.random()-.5)*4;positions[i*3+1]=EFFECT==='galaxy'?(Math.random()-.5)*.4:(Math.random()-.5)*3;positions[i*3+2]=EFFECT==='galaxy'?Math.sin(angle)*r:(Math.random()-.5)*4;}geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));group.add(new THREE.Points(geometry,new THREE.PointsMaterial({size:.027,color:'#81DFD5'})));}
let targetX=0,targetY=0;renderer.domElement.onpointermove=e=>{const b=renderer.domElement.getBoundingClientRect();targetX=(e.clientX-b.left)/b.width-.5;targetY=(e.clientY-b.top)/b.height-.5;};const resize=()=>{renderer.setSize(STAGE.clientWidth,STAGE.clientHeight);camera.aspect=STAGE.clientWidth/Math.max(1,STAGE.clientHeight);camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(STAGE);resize();const clock=new THREE.Clock();function tick(){requestAnimationFrame(tick);const time=clock.getElapsedTime();group.rotation.y=time*.15+targetX*.6;group.rotation.x=targetY*.2;if(surface){const p=surface.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*3+time)*.15+Math.cos(p.getY(i)*4+time)*.12);p.needsUpdate=true;}renderer.render(scene,camera);}tick();
`;
  throw new Error("Selecione um efeito compatível com a biblioteca.");
}
