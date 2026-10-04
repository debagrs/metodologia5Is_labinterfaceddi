/** Accept common model output wrappers without rendering source as HTML. */
export function normalizeSketchCode(source: string): string {
  let code = String(source || "")
    .trim()
    .replace(/^```(?:javascript|js|typescript|html)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (/^\s*(?:<!doctype|<html|<script)/i.test(code)) {
    const scripts = [...code.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter(Boolean);
    if (!scripts.length)
      throw new Error(
        "O resultado contém HTML sem um sketch executável. Peça uma nova geração.",
      );
    code = scripts.join("\n");
  }
  // The sandbox supplies THREE; remove only its redundant namespace import.
  return code.replace(
    /^\s*import\s+\*\s+as\s+THREE\s+from\s+['"][^'"]+['"];?\s*$/gm,
    "",
  );
}

export const character3DHelper = `
function createCharacter3D(appearance = {}) {
  const character = new THREE.Group();
  const a = appearance;
  const skin = new THREE.MeshStandardMaterial({color:a.surfaceColor || a.skinColor || '#EAC3A9', roughness:.7});
  const cloth = new THREE.MeshStandardMaterial({color:a.outfitPrimary || '#3D8C8C', roughness:.85});
  const pants = new THREE.MeshStandardMaterial({color:a.outfitSecondary || '#465D75', roughness:.8});
  const hair = new THREE.MeshStandardMaterial({color:a.hairColor || '#604136', roughness:.9});
  const iris = new THREE.MeshStandardMaterial({color:a.eyeColor || '#664839', roughness:.35});
  const white = new THREE.MeshStandardMaterial({color:'#fff', roughness:.4});
  const parts = {};
  function ellipsoid(parent, name, material, x,y,z,sx,sy,sz) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;
    parent.add(mesh);parts[name]=mesh;return mesh;
  }
  ellipsoid(character,'torso',a.outfitStyle==='none'?skin:cloth,0,1.45,0,.32,.46,.19);
  ellipsoid(character,'pelvis',a.outfitStyle==='none'?skin:pants,0,1.03,0,.3,.2,.18);
  ellipsoid(character,'neck',skin,0,1.92,0,.11,.18,.1);
  const head = new THREE.Group();head.position.y=2.24;character.add(head);parts.head=head;
  ellipsoid(head,'face',skin,0,0,0,.31,.4,.27);
  [-1,1].forEach(side=>{
    ellipsoid(head,'ear'+side,skin,side*.3,-.03,0,.065,.105,.065);
    ellipsoid(head,'eye'+side,white,side*.12,.035,.246,.085,.06,.027);
    ellipsoid(head,'iris'+side,iris,side*.12,.035,.271,.035,.043,.01);
    ellipsoid(head,'glint'+side,white,side*.11,.05,.281,.009,.01,.006);
  });
  ellipsoid(head,'nose',skin,0,-.04,.278,.036,.062,.05);
  ellipsoid(head,'mouth',new THREE.MeshStandardMaterial({color:'#AD626A'}),0,-.18,.23,.085,.018,.024);
  if(a.hairStyle!=='none')ellipsoid(head,'hair',hair,0,.19,-.04,.33,.27,.29);
  [-1,1].forEach(side=>{
    const arm = new THREE.Group();arm.position.set(side*.3,1.78,0);character.add(arm);parts[side<0?'leftArm':'rightArm']=arm;
    ellipsoid(arm,'upperArm'+side,skin,side*.07,-.22,0,.085,.25,.09);
    const elbow=new THREE.Group();elbow.position.set(side*.1,-.43,0);arm.add(elbow);parts[side<0?'leftElbow':'rightElbow']=elbow;
    ellipsoid(elbow,'forearm'+side,skin,0,-.2,0,.07,.22,.075);
    ellipsoid(elbow,'hand'+side,skin,0,-.43,.02,.075,.1,.045);
    const leg=new THREE.Group();leg.position.set(side*.15,.99,0);character.add(leg);parts[side<0?'leftLeg':'rightLeg']=leg;
    ellipsoid(leg,'thigh'+side,pants,0,-.24,0,.115,.27,.12);
    const knee=new THREE.Group();knee.position.y=-.48;leg.add(knee);parts[side<0?'leftKnee':'rightKnee']=knee;
    ellipsoid(knee,'shin'+side,pants,0,-.2,0,.085,.22,.09);
    ellipsoid(knee,'shoe'+side,hair,0,-.43,.065,.1,.06,.17);
  });
  character.userData.parts=parts;
  character.userData.setPose=function(phase){
    const swing=Math.sin(phase)*.55;
    parts.leftLeg.rotation.x=swing;parts.rightLeg.rotation.x=-swing;
    parts.leftKnee.rotation.x=Math.max(0,-swing)*1.4;parts.rightKnee.rotation.x=Math.max(0,swing)*1.4;
    parts.leftArm.rotation.x=-swing;parts.rightArm.rotation.x=swing;
  };
  return character;
}
window.createCharacter3D=createCharacter3D;
`;

export const characterSceneCode = `
const scene = new THREE.Scene(); scene.background = new THREE.Color('#eeeae5');
const camera = new THREE.PerspectiveCamera(38,1,.1,100);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
STAGE.appendChild(renderer.domElement);
const character=createCharacter3D(CHARACTER?.appearance || {});scene.add(character);
scene.add(new THREE.HemisphereLight('#ffffff','#6b6573',2));
const key=new THREE.DirectionalLight('#fff0dd',3);key.position.set(3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
const rim=new THREE.DirectionalLight('#c4dce9',1.5);rim.position.set(-3,3,-3);scene.add(rim);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#eeeae5',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
let angle=.25,elevation=1.6,distance=5.5,drag=false,lastX=0,lastY=0;
renderer.domElement.style.touchAction='none';
renderer.domElement.addEventListener('pointerdown',event=>{drag=true;lastX=event.clientX;lastY=event.clientY;renderer.domElement.setPointerCapture(event.pointerId);});
renderer.domElement.addEventListener('pointermove',event=>{if(!drag)return;angle-=(event.clientX-lastX)*.008;elevation=Math.max(.5,Math.min(3.5,elevation+(event.clientY-lastY)*.008));lastX=event.clientX;lastY=event.clientY;});
renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointercancel',()=>drag=false);
renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();distance=Math.max(3.4,Math.min(9,distance+event.deltaY*.003));},{passive:false});
const resize=()=>{const w=Math.max(1,STAGE.clientWidth),h=Math.max(1,STAGE.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(STAGE);resize();
function render(){requestAnimationFrame(render);camera.position.set(Math.sin(angle)*distance,elevation,Math.cos(angle)*distance);camera.lookAt(0,1.35,0);renderer.render(scene,camera);}render();
`;
