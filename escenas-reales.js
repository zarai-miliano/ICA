/* Geometry, articulated characters and camera animation. No ICA calculation. */
import * as THREE from './assets/vendor/three.module.min.js';

const host=document.getElementById('scene3d-host');
const story=document.getElementById('historia');
const visual=story?.querySelector('.story-visual');
const status=document.getElementById('scene3d-status');
const rotateButton=story?.querySelector('.story-rotate');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

try {
  if(!host || !visual) throw new Error('Missing scene container');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.95;
  host.append(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,160);
  const skyLight=new THREE.HemisphereLight(0xe4f4ff,0x7d8163,2.1);
  scene.add(skyLight);
  const sun=new THREE.DirectionalLight(0xffedcc,3.8);
  sun.position.set(-4,10,6);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-9;sun.shadow.camera.right=9;
  sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;
  sun.shadow.normalBias=.035;
  scene.add(sun);scene.add(sun.target);
  const fill=new THREE.DirectionalLight(0xa8e8ff,1.5);fill.position.set(5,5,-6);scene.add(fill);

  const material=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const mats={sand:material(0xa9956a),earth:material(0x777c56),rock:material(0x8d9785),reed:material(0xa5ad6b),stem:material(0x576f42),skin:material(0xc99570,.65),hair:material(0x242b25,.9),green:material(0x536f58,.95),pants:material(0xa49976,.9),boots:material(0x253e3e,.48),glove:material(0x268dba,.5),white:material(0xe3e9df,.85),steel:material(0xa4b4b6,.35,.65),dark:material(0x233e48,.4,.35),black:material(0x152a34,.7),wood:material(0xb4a88c,.75),liquid:material(0x63aeb4,.25,.3)};
  mats.glass=new THREE.MeshPhysicalMaterial({color:0xb9e8e8,roughness:.12,metalness:.08,transparent:true,opacity:.38,clearcoat:1,depthWrite:false});
  // Small procedural textures add surface detail without photographic people.
  const terrainCanvas=document.createElement('canvas');terrainCanvas.width=256;terrainCanvas.height=256;
  const terrainPaint=terrainCanvas.getContext('2d');terrainPaint.fillStyle='#d2c8a2';terrainPaint.fillRect(0,0,256,256);
  let seed=741;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<12500;i++){terrainPaint.fillStyle=i%3?'#929b6b55':'#eee0b966';terrainPaint.fillRect(random()*256,random()*256,1+random()*2,1+random()*3);}
  const terrainTexture=new THREE.CanvasTexture(terrainCanvas);terrainTexture.wrapS=terrainTexture.wrapT=THREE.RepeatWrapping;terrainTexture.repeat.set(5,5);terrainTexture.colorSpace=THREE.SRGBColorSpace;
  mats.sand.map=terrainTexture;mats.sand.bumpMap=terrainTexture;mats.sand.bumpScale=.035;
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,w,h,d,mat,x=0,y=0,z=0){return mesh(parent,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
  function sphere(parent,r,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=mesh(parent,new THREE.SphereGeometry(r,20,14),mat,x,y,z);m.scale.set(sx,sy,sz);return m;}
  function cylinder(parent,rt,rb,h,mat,x=0,y=0,z=0,segments=24){return mesh(parent,new THREE.CylinderGeometry(rt,rb,h,segments),mat,x,y,z);}
  function limb(parent,r,mat){return mesh(parent,new THREE.CapsuleGeometry(r,1,5,12),mat);}
  const up=v(0,1,0),delta=new THREE.Vector3();
  function connect(object,a,b,r){delta.subVectors(b,a);object.position.copy(a).add(b).multiplyScalar(.5);object.quaternion.setFromUnitVectors(up,delta.clone().normalize());object.scale.set(1,Math.max(.01,delta.length()/(1+2*r)),1);}
  function labelTexture(lines,width=512,height=256){const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');g.fillStyle='#edf0df';g.fillRect(0,0,width,height);g.fillStyle='#244f45';g.textAlign='center';lines.forEach((text,i)=>{g.font=`${i===0?'500 32':'24'}px Arial`;g.fillText(text,width/2,65+i*56);});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
  function bottle(parent,scale=1){const g=new THREE.Group();parent.add(g);g.scale.setScalar(scale);cylinder(g,.085,.09,.3,mats.glass,0,.16,0);cylinder(g,.07,.075,.18,mats.liquid,0,.1,0);cylinder(g,.035,.045,.08,mats.glass,0,.35,0);g.userData.cap=cylinder(g,.05,.05,.045,mats.white,0,.4,0);mesh(g,new THREE.PlaneGeometry(.14,.12),new THREE.MeshStandardMaterial({map:labelTexture(['AGUA','Muestra']),roughness:.8}),0,.18,.088);return g;}

  // A human with independent, articulated torso, limbs, hands and head.
  function researcher(parent,lab=false){
    const root=new THREE.Group();parent.add(root);
    const cloth=lab?mats.white:mats.green;
    const torso=mesh(root,new THREE.CapsuleGeometry(.245,.43,7,22),cloth);
    torso.scale.set(1.25,1,.7);
    const pelvis=sphere(root,.23,mats.pants,0,0,0,1.2,.65,.8);
    const head=new THREE.Group();root.add(head);
    sphere(head,.205,mats.skin,0,0,0,.86,1.17,.91);
    cylinder(head,.072,.08,.15,mats.skin,0,-.23,0);
    sphere(head,.19,mats.hair,0,.095,-.025,.94,.81,.96);
    sphere(head,.055,mats.hair,0,.07,-.19,1.25,1.25,1);
    sphere(head,.05,mats.skin,0,-.02,.171,.62,.72,1.05);
    for(const side of [-1,1]){
      sphere(head,.036,mats.skin,side*.178,-.015,-.005,.55,1,.65);
      sphere(head,.029,mats.white,side*.068,.035,.162,1,.5,.35);
      sphere(head,.014,mats.hair,side*.068,.035,.172,.65,1,.3);
      const brow=box(head,.061,.012,.016,mats.hair,side*.07,.08,.16);brow.rotation.z=side*-.09;
    }
    const mouth=box(head,.067,.009,.013,material(0x8b5b4c),0,-.105,.166);
    if(lab){
      for(const side of [-1,1]){const frame=mesh(head,new THREE.TorusGeometry(.058,.006,6,24),mats.steel,side*.07,.035,.195);frame.scale.y=.7;sphere(head,.054,mats.glass,side*.07,.035,.194,1,.68,.2);}
      box(head,.03,.007,.008,mats.steel,0,.035,.198);
    }else{
      const cap=sphere(head,.213,cloth,0,.135,-.01,1,.45,1);
      sphere(head,.14,cloth,0,.12,.15,1,.09,1.05);
    }
    const upper=[],lower=[],palms=[],thighs=[],shins=[],feet=[];
    for(let i=0;i<2;i++){
      upper.push(limb(root,.093,cloth));lower.push(limb(root,.072,lab?cloth:mats.green));
      const palm=new THREE.Group();root.add(palm);sphere(palm,.065,mats.glove,0,0,0,.8,1.15,.45);
      for(let finger=0;finger<4;finger++){const f=mesh(palm,new THREE.CapsuleGeometry(.011,.045,3,6),mats.glove,(finger-1.5)*.022,-.065,.012);f.rotation.x=-.3;}
      sphere(palm,.023,mats.glove,.056,-.007,.012,.5,1.8,.7);palms.push(palm);
      thighs.push(limb(root,.118,mats.pants));shins.push(limb(root,.09,mats.pants));
      const boot=box(root,.19,.2,.36,mats.boots);feet.push(boot);
    }
    const collar=box(root,.09,.22,.018,lab?mats.green:mats.dark);
    const buttons=[];for(let i=0;i<3;i++) buttons.push(sphere(root,.012,mats.dark));
    const prop=lab?new THREE.Group():bottle(root,.65);
    if(lab){root.add(prop);cylinder(prop,.027,.025,.23,mats.white,0,-.1,0);cylinder(prop,.009,.022,.16,mats.steel,0,-.29,0);cylinder(prop,.035,.035,.035,mats.glove,0,.04,0);}
    else {prop.userData.cap.visible=false;cylinder(palms[0],.04,.04,.025,mats.white,0,-.06,.035);}
    function pose(time,freeze){
      const t=time;
      const cycle=(Math.sin(t*.95)+1)/2;
      const dip=lab?0:.5+.5*Math.sin(t*.72);
      const breath=Math.sin(t*1.5)*.008;
      const hipY=lab?.98:.56+.25*(1-dip);
      const lean=lab?.13:.35+.32*dip;
      pelvis.position.set(0,hipY,0);
      torso.position.set(0,hipY+.36+breath,lean*.48);torso.rotation.x=lean;
      head.position.set(0,hipY+.91+breath,lean*.85);head.rotation.x=lab?.18:.18+dip*.14;
      collar.position.set(0,hipY+.55,lean*.48+.18);collar.rotation.x=lean;
      buttons.forEach((b,i)=>b.position.set(0,hipY+.2+i*.12,lean*.48+.18));
      const shoulderY=hipY+.62,shoulderZ=lean*.58;
      for(let side=0;side<2;side++){
        const sign=side===0?-1:1;
        const shoulder=v(sign*.285,shoulderY,shoulderZ);
        let elbow,hand;
        if(lab){
          elbow=side===0?v(-.36,1.25,.34):v(.3,1.52,.45);
          hand=side===0?v(-.15,1.28,.73):v(.12,1.78+cycle*.24,.85);
        }else{
          elbow=side===0?v(-.4,hipY+.15,.46):v(.37,hipY+.02,.62);
          hand=side===0?v(-.2,hipY+.02,.51):v(.28,.06+(1-dip)*.65,.94);
        }
        connect(upper[side],shoulder,elbow,.093);connect(lower[side],elbow,hand,.072);
        palms[side].position.copy(hand);palms[side].rotation.x=side===1?.4:-.2;
        const hip=v(sign*.17,hipY,0);
        const knee=lab?v(sign*.19,.52,0):side===0?v(-.19,.39,.48):v(.2,.2,-.28);
        const ankle=lab?v(sign*.2,.14,.03):side===0?v(-.2,.14,.16):v(.2,.13,-.67);
        connect(thighs[side],hip,knee,.118);connect(shins[side],knee,ankle,.09);
        feet[side].position.copy(ankle).add(v(0,-.045,.07));
      }
      prop.position.copy(palms[1].position);prop.position.y-=lab?.04:.2;prop.rotation.x=lab?0:-.18+dip*.35;
      return {dip,hand:palms[1].position};
    }
    pose(0,true);return {root,pose};
  }

  // FIELD: terrain, articulated monitoring worker, water, reeds and sample rings.
  const field=new THREE.Group();scene.add(field);
  const base=cylinder(field,5.4,5.15,.35,mats.earth,0,-.2,0,80);
  const shore=mesh(field,new THREE.SphereGeometry(1,48,20),mats.sand,-1.6,-.03,-1.8);shore.scale.set(3.7,.35,3.5);
  const waterGeo=new THREE.RingGeometry(0,4.5,72,20);
  const waterMat=new THREE.MeshPhysicalMaterial({color:0x3c8d9b,roughness:.2,metalness:.4,clearcoat:1,transparent:true,opacity:.92});
  const water=mesh(field,waterGeo,waterMat, .5,.018,.7);water.rotation.x=-Math.PI/2;water.scale.set(1,.82,1);water.castShadow=false;
  const waterPositions=waterGeo.attributes.position;const waterRest=waterPositions.array.slice();
  const fieldPerson=researcher(field);fieldPerson.root.position.set(-1,.2,.55);fieldPerson.root.rotation.y=-.23;
  const ripples=[];for(let i=0;i<3;i++){const r=mesh(field,new THREE.RingGeometry(.38,.397,64),new THREE.MeshBasicMaterial({color:0xd6f3e9,transparent:true,opacity:.4,side:THREE.DoubleSide}),-.77,.05,1.42);r.rotation.x=-Math.PI/2;r.castShadow=false;ripples.push(r);}
  // Field meter and sample cooler.
  const cooler=box(field,.58,.35,.4,mats.white,-1.7,.38,.18);box(field,.61,.05,.43,mats.green,-1.7,.58,.18);
  const meter=box(field,.24,.04,.38,mats.dark,-1.36,.25,1.05);meter.rotation.y=.3;
  const meterFace=box(field,.15,.006,.14,mats.liquid,-1.36,.274,1.02);meterFace.rotation.y=.3;
  for(let i=0;i<36;i++){
    const angle=i*2.399,rad=3.2+(i%5)*.24;
    const x=Math.cos(angle)*rad-1,z=Math.sin(angle)*rad-1.4;
    if(z>1.1) continue;
    const rock=sphere(field,.18+(i%3)*.055,mats.rock,x,.15,z,1.3,.65,1);rock.rotation.y=angle;
  }
  const reeds=[];
  for(let i=0;i<48;i++){
    const angle=i*.26+1.7,rad=3.4+(i%4)*.21;
    const x=Math.cos(angle)*rad-.8,z=Math.sin(angle)*rad-1.2;
    if(z>1.7)continue;
    const reed=new THREE.Group();reed.position.set(x,.15,z);field.add(reed);
    const h=.65+(i%7)*.09;cylinder(reed,.012,.018,h,mats.stem,0,h/2,0,5);cylinder(reed,.037,.034,.22,mats.reed,0,h+.03,0,8);
    const leaf=mesh(reed,new THREE.ConeGeometry(.035,.5,5),mats.stem,.07,h*.4,0);leaf.rotation.z=-.4;reeds.push(reed);
  }
  for(let i=0;i<6;i++){
    const ridge=mesh(field,new THREE.SphereGeometry(1,18,10),material(i%2?0x738574:0x8a906b),-3.6+i*1.5,.1,-3.7);ridge.scale.set(1.5,.45+(i%3)*.25,.7);
  }

  // LAB: a volumetric room and working bench, pipette, rack and instrument.
  const lab=new THREE.Group();lab.position.x=14;scene.add(lab);
  box(lab,9,.2,7.5,mats.white,0,-.13,0);
  box(lab,9,3.8,.12,material(0xc4d4ca),0,1.8,-3.2);
  box(lab,.12,3.8,6.5,material(0xb2c7be),-4.4,1.8,0);
  const windowMat=new THREE.MeshBasicMaterial({color:0xaccfcb});box(lab,3.9,2,.04,windowMat,1.5,2.2,-3.11);
  for(const x of [-.45,1.5,3.45])box(lab,.05,2,.08,mats.white,x,2.2,-3.05);
  box(lab,3.95,.06,.08,mats.white,1.5,2.2,-3.05);
  const bench=box(lab,5.6,.15,1.8,mats.steel,0,1.08,.35);
  for(const x of [-2.5,2.5])for(const z of [-.35,1.05])box(lab,.09,1,.09,mats.steel,x,.5,z);
  const labPerson=researcher(lab,true);labPerson.root.position.set(.4,0,-.65);
  const rack=box(lab,1.25,.12,.5,mats.white,.2,1.2,.2);
  for(let i=0;i<6;i++){
    cylinder(lab,.045,.04,.3,mats.glass,-.3+i*.2,1.37,.2);
    cylinder(lab,.033,.033,.12,mats.liquid,-.3+i*.2,1.29,.2);
    if(i!==4)cylinder(lab,.055,.055,.05,mats.glove,-.3+i*.2,1.54,.2);
  }
  const analyzer=box(lab,1.35,.68,1,mats.white,-1.7,1.5,.15);
  const instrumentTexture=labelTexture(['ANÁLISIS','Calidad del agua']);
  const instrumentScreen=mesh(lab,new THREE.PlaneGeometry(.78,.35),new THREE.MeshBasicMaterial({map:instrumentTexture}),-1.7,1.56,.657);
  bottle(lab,.8).position.set(1.7,1.17,.2);bottle(lab,.7).position.set(2.12,1.17,.38);
  box(lab,2.3,.12,.45,mats.steel,-1.7,2.8,-3);
  for(let i=0;i<5;i++)bottle(lab,.8).position.set(-2.5+i*.4,2.88,-3);
  // A continuously moving indicator is illustrative, never a live analysis reading.
  const analysisLight=sphere(lab,.035,new THREE.MeshStandardMaterial({color:0x84c2a0,emissive:0x4c9e7a,emissiveIntensity:.6}),-1.12,1.4,.66);

  // COMPUTER: real hinged meshes with a canvas-rendered example of the page.
  const computer=new THREE.Group();computer.position.x=28;scene.add(computer);
  cylinder(computer,4.4,4.2,.25,material(0xc9d8c8),0,-.19,0,80);
  const laptop=new THREE.Group();computer.add(laptop);laptop.rotation.y=-.18;laptop.position.y=.1;
  box(laptop,3.85,.13,2.4,mats.steel,0,0,0);
  box(laptop,1.2,.009,.65,material(0x9db3b4,.4,.5),0,.071,.58);
  for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(laptop,.23,.024,.21,mats.dark,-1.52+col*.277,.079,-.82+row*.27);
  box(laptop,1.5,.023,.16,mats.dark,0,.08,.22);
  const hinge=new THREE.Group();hinge.position.set(0,.07,-1.14);laptop.add(hinge);
  box(hinge,3.85,2.45,.11,mats.dark,0,1.22,0);
  sphere(hinge,.022,mats.black,0,2.38,.061);
  const screenCanvas=document.createElement('canvas');screenCanvas.width=1024;screenCanvas.height=640;
  const ctx=screenCanvas.getContext('2d');const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
  const screenMesh=mesh(hinge,new THREE.PlaneGeometry(3.6,2.18),new THREE.MeshBasicMaterial({map:screenTexture}),0,1.22,.061);screenMesh.castShadow=false;
  let screenKey='';
  const fields=[['OD','6.75'],['pH','8.69'],['P total','0.005'],['N total','1.42'],['Hg','0.000045'],['Pb','0.0003'],['Zn','0.0055'],['Cu','0.00087'],['SST','1']];
  function drawScreen(count,result){
    const key=count+':'+result;if(key===screenKey)return;screenKey=key;
    ctx.fillStyle='#f4f7ee';ctx.fillRect(0,0,1024,640);ctx.fillStyle='#1b494b';ctx.fillRect(0,0,1024,68);
    ctx.fillStyle='#edf4e5';ctx.font='bold 27px Arial';ctx.fillText('Chinchaycocha',40,44);ctx.font='20px Arial';ctx.fillText('ICA-PE',880,44);
    ctx.fillStyle='#60856d';ctx.font='17px Arial';ctx.fillText('EJEMPLO HISTÓRICO · 9 MEDIDOS + 3 ESTIMADOS',40,108);
    ctx.fillStyle='#254c42';ctx.font='38px Georgia';ctx.fillText('Mediciones del monitoreo',40,157);
    fields.forEach(([name,value],i)=>{const x=40+(i%3)*318,y=182+Math.floor(i/3)*72;ctx.fillStyle='#e4eddf';ctx.fillRect(x,y,300,57);ctx.strokeStyle='#bed0b8';ctx.strokeRect(x,y,300,57);ctx.fillStyle='#54755d';ctx.font='20px Arial';ctx.fillText(name,x+13,y+35);if(i<count){ctx.fillStyle='#264c42';ctx.font='bold 22px Arial';ctx.textAlign='right';ctx.fillText(value,x+285,y+35);ctx.textAlign='left';}});
    ctx.fillStyle='#60856d';ctx.font='18px Arial';ctx.fillText('Estimaciones del modelo',40,437);
    if(count>=9){ctx.fillStyle='#355a47';ctx.font='19px Arial';ctx.fillText('DBO₅  1.2821',40,475);ctx.fillText('As  0.0031945',366,475);ctx.fillText('Coliformes  2.3483',680,475);}
    ctx.fillStyle='#204b52';ctx.fillRect(40,502,940,95);ctx.fillStyle='#dce9d9';ctx.font='23px Arial';ctx.fillText('ICA con estimaciones',65,554);
    if(result){ctx.font='55px Georgia';ctx.fillText('54.56',650,565);ctx.font='24px Arial';ctx.fillStyle='#e0d29d';ctx.fillText('Regular',828,557);}
    ctx.fillStyle='#6d8774';ctx.font='15px Arial';ctx.fillText('Panel parcial de 12 parámetros · ejemplo referencial',40,625);screenTexture.needsUpdate=true;
  }
  drawScreen(9,false);
  const dataDots=[];
  for(let i=0;i<12;i++){const dot=sphere(computer,.035,material(i<9?0x659e8a:0xb9ac72,.35),0,.4,0);dataDots.push(dot);}

  // Motion and camera follow the storytelling, while direct dragging changes view.
  let progress=0,targetProgress=0,visible=true,time=0,last=0,raf=0,lastPaint=0,azimuth=0,targetAzimuth=0,elevation=0,targetElevation=0,phase=0,phaseTime=0;
  let dragging=false,pointerX=0,pointerY=0;
  const lookTarget=v(0,1.1,0);
  const paused=()=>story.classList.contains('transitions-paused') || reduced.matches;
  story.addEventListener('storyprogress',event=>{targetProgress=event.detail.progress;requestFrame();});
  story.addEventListener('storymotionchange',requestFrame);
  rotateButton.addEventListener('click',()=>{targetAzimuth+=.5;requestFrame();});
  renderer.domElement.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')return;dragging=true;pointerX=event.clientX;pointerY=event.clientY;renderer.domElement.setPointerCapture(event.pointerId);});
  renderer.domElement.addEventListener('pointermove',event=>{if(!dragging)return;targetAzimuth+=(event.clientX-pointerX)*.008;targetElevation=THREE.MathUtils.clamp(targetElevation+(event.clientY-pointerY)*.005,-.3,.45);pointerX=event.clientX;pointerY=event.clientY;requestFrame();});
  renderer.domElement.addEventListener('pointerup',()=>{dragging=false;});
  renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;});
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();requestFrame();}
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestFrame();else{cancelAnimationFrame(raf);raf=0;}}).observe(visual);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else requestFrame();});
  reduced.addEventListener('change',requestFrame);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();visual.classList.remove('webgl-ready');status.textContent='Vista ilustrada · 3D no disponible';rotateButton.hidden=true;cancelAnimationFrame(raf);raf=0;});
  function requestFrame(){if(!raf && visible && !document.hidden)raf=requestAnimationFrame(frame);}
  function frame(now){
    raf=0;if(!visible||document.hidden)return;
    if(now-lastPaint<32){requestFrame();return;}lastPaint=now;
    const delta=Math.min((now-last)/1000,.06)||.016;last=now;
    const stopped=paused();if(!stopped){time+=delta;phaseTime+=delta;}
    progress=stopped?targetProgress:THREE.MathUtils.lerp(progress,targetProgress,.13);
    azimuth=THREE.MathUtils.lerp(azimuth,targetAzimuth,.12);elevation=THREE.MathUtils.lerp(elevation,targetElevation,.12);
    const active=Math.round(targetProgress);if(active!==phase){phase=active;phaseTime=0;}
    const travel=Math.min(progress,2);const center=travel*14;
    const blend=Math.sin((travel%1)*Math.PI);
    const distance=(host.clientWidth<500?8.8:8.4)+blend*6;
    const angle=.19+azimuth+(!stopped?Math.sin(time*.15)*.025:0);
    camera.position.set(center+Math.sin(angle)*distance,4.0+blend*2+elevation*7,Math.cos(angle)*distance);
    lookTarget.set(center+(phase===0?-.5:0),phase>=2?1.2:1,phase===0?.4:0);camera.lookAt(lookTarget);
    sun.position.x=center-4;sun.target.position.set(center,0,0);
    field.visible=travel<.85;lab.visible=travel>.15&&travel<1.85;computer.visible=travel>1.15;
    if(field.visible){
      fieldPerson.pose(time,stopped);
      reeds.forEach((reed,i)=>{reed.rotation.z=Math.sin(time*.8+i*.4)*.06;});
      for(let i=0;i<waterPositions.count;i++){const x=waterRest[i*3],y=waterRest[i*3+1];waterPositions.setZ(i,Math.sin(x*2.1+time*.9)*.025+Math.cos(y*2.5-time*.7)*.018);}
      waterPositions.needsUpdate=true;waterGeo.computeVertexNormals();
      ripples.forEach((ring,i)=>{const t=(time*.3+i/3)%1;ring.scale.setScalar(.25+t*1.7);ring.material.opacity=(1-t)*.45;});
    }
    if(lab.visible)labPerson.pose(time,stopped);
    analysisLight.material.emissiveIntensity=.45+Math.sin(time*1.4)*.2;
    const open=stopped?1:THREE.MathUtils.smoothstep(phaseTime,0,1.7);hinge.rotation.x=THREE.MathUtils.lerp(Math.PI/2,-.12,phase>=2?open:1);
    laptop.rotation.y=-.18+Math.sin(time*.25)*.025;
    const count=stopped||phase>=3?9:Math.min(9,Math.floor(phaseTime*2.8));drawScreen(count,phase>=3);
    dataDots.forEach((dot,i)=>{dot.visible=phase===2;const a=time*.6+i*.52;dot.position.set(Math.sin(a)*2.7,.6+Math.cos(a*.7)*.5,Math.cos(a)*1.8);});
    renderer.render(scene,camera);
    if(!visual.classList.contains('webgl-ready')){visual.classList.add('webgl-ready');status.textContent='Recreación 3D · gira para explorar';rotateButton.hidden=false;}
    if(!stopped || Math.abs(progress-targetProgress)>.003 || Math.abs(azimuth-targetAzimuth)>.003 || Math.abs(elevation-targetElevation)>.003)requestFrame();
  }
  // Read the existing chapter position when this module loads after the scroll script.
  targetProgress=Number(visual.style.getPropertyValue('--story-p'))||0;progress=targetProgress;
  resize();requestFrame();
}catch(error){
  if(status)status.textContent='Vista ilustrada · 3D no disponible';
  console.warn('No se pudo iniciar la escena 3D:',error.message);
}
