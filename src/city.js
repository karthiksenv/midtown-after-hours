import {WORLD,BLOCKS,rng} from './world.js';

// Static visual generation is deterministic and deliberately independent of simulation.
export function buildCity(THREE,scene){
  const random=rng(WORLD.seed), batches=new Map(), windowBatches=new Map(), group=new THREE.Group();
  group.name='Midtown static scenery v1'; scene.add(group);
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.82,...extra});
  const materials={asphalt:mat('#172332'),sidewalk:mat('#526071'),curb:mat('#8594a1'),line:mat('#b0b7af'),yellow:mat('#b9a451'),glass:mat('#101f30',{metalness:.65,roughness:.3}),stone:mat('#3f4a5e'),brick:mat('#574451'),steel:mat('#273547'),trim:mat('#788294'),dark:mat('#080f1c'),cyan:mat('#76e9ff',{emissive:'#51b9e8',emissiveIntensity:1.7}),warm:mat('#ffdc99',{emissive:'#ffc769',emissiveIntensity:1.25}),cool:mat('#a5c0eb',{emissive:'#7295cf',emissiveIntensity:.8}),pink:mat('#fa63bc',{emissive:'#e63ea7',emissiveIntensity:1.7}),green:mat('#456955')};
  function box(key,x,y,z,w,h,d,rot=0){if(!batches.has(key))batches.set(key,[]);batches.get(key).push([x,y,z,w,h,d,rot]);}
  let windowChunk='skyline';
  function windowPane(key,x,y,z,w,h,rot=0){if(!windowBatches.has(windowChunk))windowBatches.set(windowChunk,[]);windowBatches.get(windowChunk).push([key,x,y,z,w,h,rot]);}
  box('asphalt',0,-.22,0,510,.4,510);
  for(const b of BLOCKS){
    windowChunk=b.id;
    const cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,w=b.maxX-b.minX,d=b.maxZ-b.minZ;
    box('curb',cx,.015,cz,w+10,.13,d+10);box('sidewalk',cx,.08,cz,w+9.6,.13,d+9.6);
    // Three individual towers create a street wall without changing collision bounds.
    for(let k=0;k<3;k++){
      const bw=w/3,x=b.minX+bw*(k+.5),height=24+random()*65;
      const face=['glass','stone','brick','steel'][Math.floor(random()*4)];
      box(face,x,height/2,cz,bw-.3,height,d-.15);
      box('dark',x,2,cz,bw,4,d+.06);
      box('trim',x,4.2,cz,bw+.03,.25,d+.1);
      box('trim',x,height-.5,cz,bw+.02,.55,d+.1);
      // Rooftop mechanical plant, restrained setbacks and architectural fins.
      box('steel',x,height+1.6,cz,bw*.57,3.2,d*.58);
      if(random()>.6){box('glass',x,height+6,cz,bw*.68,12,d*.6);box('trim',x,height+12,cz,bw*.72,.4,d*.64);}
      for(let wx=x-bw/2+1.6;wx<x+bw/2-1;wx+=2.8){
        for(let wy=6;wy<height-2;wy+=3){
          for(const sz of [-1,1])if(random()>.30)windowPane(random()>.5?'warm':'cool',wx,wy,cz+sz*(d/2+.04),1.35,1.65,sz<0?Math.PI:0);
        }
        box('steel',wx,height/2+2,cz-d/2-.065,.13,height-5,.12);
        box('steel',wx,height/2+2,cz+d/2+.065,.13,height-5,.12);
      }
      if(k===0||k===2){const side=k===0?-1:1;
        for(let wz=cz-d/2+1.5;wz<cz+d/2-1;wz+=2.8)for(let wy=6;wy<height-2;wy+=3)if(random()>.32)windowPane(random()>.55?'warm':'cool',x+side*(bw/2+.045),wy,wz,1.35,1.7,side*Math.PI/2);
      }
      for(const sz of [-1,1]){
        for(let xx=x-bw/2+2;xx<x+bw/2;xx+=4.5){windowPane('cool',xx,1.9,cz+sz*(d/2+.09),3.4,2.8,sz<0?Math.PI:0);box('steel',xx,1.6,cz+sz*(d/2+.12),.12,3.2,.12);}
        box(random()>.5?'cyan':'pink',x,3.65,cz+sz*(d/2+.18),bw-.5,.13,.15);
        box('dark',x,2.6,cz+sz*(d/2+.7),bw*.84,.16,1.3);
      }
    }
    // Little sidewalk fixtures, never in the drive lanes.
    for(const sign of [-1,1]){const z=cz+sign*(d/2+3);box('steel',cx-18,.65,z,1.2,1.3,1.2);box('trim',cx+16,.42,z,3.4,.13,1.1);box('steel',cx+14.7,.2,z,.14,.4,.85);box('steel',cx+17.3,.2,z,.14,.4,.85);}
  }
  // Exact road axes shared with world.js: dashed traffic lines and broad crossings.
  for(const x of WORLD.avenues){
    for(let z=-234;z<240;z+=8){if(WORLD.streets.some(s=>Math.abs(s-z)<14))continue;box('yellow',x-.2,.006,z,.13,.015,4);box('yellow',x+.2,.006,z,.13,.015,4);for(const side of [-1,1])box('line',x+side*5,.006,z,.13,.015,3);}
  }
  for(const z of WORLD.streets){
    for(let x=-234;x<240;x+=8){if(WORLD.avenues.some(a=>Math.abs(a-x)<14))continue;box('yellow',x,.008,z-.15,4,.015,.13);box('yellow',x,.008,z+.15,4,.015,.13);}
  }
  for(const x of WORLD.avenues)for(const z of WORLD.streets){
    for(const s of [-1,1])for(let t=-8;t<=8;t+=2.4){box('line',x+t,.012,z+s*12,1.15,.018,3.5);box('line',x+s*12,.012,z+t,3.5,.018,1.15);}
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const lx=x+sx*12.9,lz=z+sz*13;
      box('steel',lx,3.75,lz,.19,7.5,.19);box('steel',lx-sx*1.1,7.4,lz,2.4,.18,.2);box('warm',lx-sx*2.1,7.32,lz,.75,.09,.45);
      box('steel',lx,5.8,lz-sz*.35,.65,1.4,.48);box('green',lx,5.35,lz-sz*.605,.24,.24,.045);
      // Light pools are transparent, flat code-generated gradients, shared below.
    }
  }
  // Perimeter towers keep the street horizon dense while leaving all playable roads clear.
  windowChunk='skyline';
  for(let i=0;i<42;i++){
    const side=i%4,t=-225+Math.floor(i/4)*45,x=side===0?-260:side===1?260:t,z=side===2?-260:side===3?260:t;
    const h=50+random()*130;box('steel',x,h/2,z,28,h,29);
    for(let yy=8;yy<h;yy+=7)windowPane('cool',x,yy,z+(z>0?-14.6:14.6),23,.45,z>0?Math.PI:0);
  }
  const geo=new THREE.BoxGeometry(1,1,1),planeGeo=new THREE.PlaneGeometry(1,1),dummy=new THREE.Object3D();
  for(const [key,items] of batches){const flat=key==='line'||key==='yellow',mesh=new THREE.InstancedMesh(flat?planeGeo:geo,materials[key],items.length);mesh.name='City '+key;items.forEach((a,i)=>{dummy.position.set(a[0],a[1],a[2]);dummy.scale.set(a[3],flat?a[5]:a[4],flat?1:a[5]);dummy.rotation.set(flat?-Math.PI/2:0,a[6],0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);}
  // One two-triangle pane per window; block-sized batches permit frustum culling.
  // Emissive panes need no per-fragment standard-material light calculations.
  const windowMat=new THREE.MeshBasicMaterial({color:0xffffff});
  const windowColors={warm:new THREE.Color('#ffe1aa').multiplyScalar(1.8),cool:new THREE.Color('#bdd8ff').multiplyScalar(1.25)};
  for(const [id,items] of windowBatches){const mesh=new THREE.InstancedMesh(planeGeo,windowMat,items.length);mesh.name='Windows '+id;items.forEach((a,i)=>{dummy.position.set(a[1],a[2],a[3]);dummy.scale.set(a[4],a[5],1);dummy.rotation.set(0,a[6],0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,windowColors[a[0]]);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);}
  function labelCanvas(title,subtitle,color,bg='#101326',wide=false){
    const c=document.createElement('canvas');c.width=1024;c.height=wide?256:768;const ctx=c.getContext('2d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
    const grad=ctx.createLinearGradient(0,0,c.width,c.height);grad.addColorStop(0,color);grad.addColorStop(1,'#18142d');ctx.fillStyle=grad;ctx.fillRect(20,20,c.width-40,c.height-40);
    ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font=`900 ${wide?100:116}px Arial`;ctx.fillText(title,512,wide?125:230,930);
    ctx.font=`500 ${wide?33:40}px Arial`;ctx.fillText(subtitle,512,wide?192:310,930);
    if(!wide){ctx.strokeStyle='#ffffff66';ctx.lineWidth=12;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(512,520,55+i*33,0,Math.PI*2);ctx.stroke();}ctx.font='bold 26px Arial';ctx.fillText('MIDTOWN • NEW YORK',512,720);}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  const advertisements=[['AFTERHOURS','THE CITY IS YOURS','#602fff'],['PULSE','MAKE SOME NOISE','#e92382'],['MIDNIGHT RUN','NEW YORK NEVER WAITS','#0078a5'],['NORTHSTAR','GO BEYOND','#1656ca'],['KICKFLIP','FIND YOUR FREQUENCY','#c34512'],['CITY / SIGNAL','LIVE FROM TIMES SQUARE','#126d58']];
  const panelBatches=new Map();
  function panel(tex,x,y,z,w,h,ry){if(!panelBatches.has(tex))panelBatches.set(tex,[]);panelBatches.get(tex).push([x,y,z,w,h,ry]);}
  const ads=advertisements.map(a=>labelCanvas(...a));
  for(let i=0;i<BLOCKS.length;i++){const b=BLOCKS[i],cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
    if(Math.abs(cx)<100){panel(ads[i%ads.length],cx,14,b.maxZ+.19,17,12,0);panel(ads[(i+2)%ads.length],cx,24,b.minZ-.19,17,15,Math.PI);
      if(b.minX===15)panel(ads[(i+1)%ads.length],b.minX-.2,16,cz,21,14,-Math.PI/2);
      if(b.maxX===-15)panel(ads[(i+3)%ads.length],b.maxX+.2,19,cz,21,20,Math.PI/2);
    }
  }
  const streetNames=['W 39 ST','W 40 ST','W 41 ST','WEST 42ND STREET','W 43 ST','W 44 ST','W 45 ST'];
  const streetTextures=streetNames.map(s=>labelCanvas(s,'MIDTOWN MANHATTAN','#14664b','#061d17',true));
  for(const x of [-90,0,90])for(let j=0;j<WORLD.streets.length;j++){const z=WORLD.streets[j];panel(streetTextures[j],x+12.8,4.5,z+12.65,4,.95,0);}
  const shopTex=labelCanvas('DELI • COFFEE','OPEN ALL NIGHT','#966029','#171313',true);for(const b of BLOCKS.filter((_,i)=>i%3===0))panel(shopTex,b.minX+10,3.1,b.maxZ+.3,10,1.1,0);
  for(const [tex,items] of panelBatches){const m=new THREE.InstancedMesh(planeGeo,new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false}),items.length);items.forEach((a,i)=>{dummy.position.set(a[0],a[1],a[2]);dummy.scale.set(a[3],a[4],1);dummy.rotation.set(0,a[5],0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();group.add(m);}
  // Cheap procedural halos give every streetlight a pool without dozens of point lights.
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,212,134,.22)');g.addColorStop(1,'rgba(255,212,134,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const lightMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const lightMesh=new THREE.InstancedMesh(planeGeo,lightMat,WORLD.avenues.length*WORLD.streets.length*2);let lightIndex=0;
  for(const x of WORLD.avenues)for(const z of WORLD.streets)for(const s of [-1,1]){dummy.rotation.set(-Math.PI/2,0,0);dummy.position.set(x+s*11,.025,z+13);dummy.scale.set(15,15,1);dummy.updateMatrix();lightMesh.setMatrixAt(lightIndex++,dummy.matrix);}
  lightMesh.instanceMatrix.needsUpdate=true;lightMesh.computeBoundingSphere();group.add(lightMesh);
  // A few genuine lights at the starting intersection illuminate moving actors.
  for(const [x,z,color] of [[-12,-12,0x319dff],[12,-12,0xf848ba],[-12,12,0xffd38a],[12,12,0x5fc5ff]]){const l=new THREE.PointLight(color,48,35,2);l.position.set(x,6,z);group.add(l);}
  return {colliders:[],update(){},group};
}
