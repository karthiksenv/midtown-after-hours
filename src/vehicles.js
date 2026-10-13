import {WORLD, rng, moveCircle} from './world.js';

// Serializable vehicle state uses the same immutable world coordinates as players.
export function createVehicles(THREE, scene) {
  const entities = [], random = rng(WORLD.seed + 17);
  const mat = (color, metalness = .1, roughness = .5, emissive) => new THREE.MeshStandardMaterial({color, metalness, roughness, ...(emissive ? {emissive, emissiveIntensity: 2.8} : {})});
  const rubber = mat(0x10131b, .05, .85), chrome = mat(0xa8b5cc, .85, .24), black = mat(0x141b28, .5, .3), glass = mat(0x122d48, .65, .13);
  const headlight = mat(0xe8f7ff, .1, .2, 0xa7dcff), redlight = mat(0xff334c, .1, .2, 0xff1636);
  const box = (g, w, h, d, x, y, z, material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  // Bake static pieces by material; wheels retain their independent spin transforms.
  function batchParts(group) {
    const batches=new Map();
    for(const child of [...group.children]) {
      if(!child.isMesh)continue;
      child.updateMatrix();
      const geo=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);
      if(!batches.has(child.material))batches.set(child.material,[]);
      batches.get(child.material).push(geo);group.remove(child);child.geometry.dispose();
    }
    for(const [material,parts] of batches) {
      const geometry=new THREE.BufferGeometry();
      for(const name of ['position','normal','uv']) {
        const arrays=parts.map(g=>g.getAttribute(name).array),length=arrays.reduce((sum,a)=>sum+a.length,0),data=new Float32Array(length);
        let offset=0;for(const a of arrays){data.set(a,offset);offset+=a.length;}
        geometry.setAttribute(name,new THREE.BufferAttribute(data,name==='uv'?2:3));
      }
      const merged=new THREE.Mesh(geometry,material);merged.castShadow=true;merged.receiveShadow=true;group.add(merged);
      parts.forEach(g=>g.dispose());
    }
  }
  function wheel(g, x, y, z, r, width) {
    const pivot = new THREE.Group(); pivot.position.set(x, y, z); g.add(pivot);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 14).rotateZ(Math.PI / 2), rubber); tire.castShadow = true; pivot.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r*.62, r*.62, width+.015, 10).rotateZ(Math.PI/2), chrome); pivot.add(rim);
    for(let j=0;j<5;j++) {const spoke=box(pivot,width+.025,r*1.05,.055,0,0,0,black);spoke.rotation.x=j*Math.PI/5;}
    batchParts(pivot);
    return pivot;
  }
  function buildCar(color, taxi=false) {
    const group = new THREE.Group(), paint = mat(color, .65, .27), wheels=[];
    box(group,1.95,.55,4.15,0,.66,0,paint);
    box(group,1.83,.15,1.22,0,1.0,-1.36,paint);
    box(group,1.63,.62,1.97,0,1.23,.15,glass);
    box(group,1.73,.10,1.8,0,1.58,.24,paint);
    box(group,1.80,.18,1.12,0,1.0,1.55,paint);
    for(const x of [-.84,.84]) {
      box(group,.075,.63,.12,x,1.24,-.65,paint);
      box(group,.075,.63,.12,x,1.24,.99,paint);
      box(group,.07,.60,.075,x,1.23,.15,black);
      box(group,.23,.15,.34,x*1.2,1.08,-.52,paint);
      box(group,.025,.055,.23,x*1.17,.94,.25,chrome);
      for(const z of [-1.32,1.28]) wheels.push(wheel(group,x*1.14,.43,z,.43,.24));
    }
    box(group,1.95,.17,.15,0,.49,-2.1,chrome);
    box(group,1.95,.17,.15,0,.49,2.1,black);
    box(group,.72,.2,.03,0,.75,-2.095,black);
    for(const x of [-.68,.68]) {
      box(group,.48,.17,.04,x,.85,-2.09,headlight);
      box(group,.51,.14,.04,x,.86,2.09,redlight);
    }
    box(group,.45,.14,.035,0,.61,2.19,mat(0xffd383));
    if(taxi) {box(group,.77,.2,.4,0,1.74,.24,mat(0xffdc72,.2,.4,0xa98022));box(group,1.96,.14,.9,0,.78,.15,black);}
    batchParts(group);
    return {group,wheels};
  }
  function buildBike(color) {
    const group=new THREE.Group(), paint=mat(color,.65,.23), wheels=[];
    wheels.push(wheel(group,0,.45,-1.12,.45,.21),wheel(group,0,.46,1.04,.46,.27));
    box(group,.35,.36,1.5,0,.65,.13,black);
    box(group,.62,.52,.9,0,1.04,-.25,paint).rotation.x=-.2;
    box(group,.49,.2,.92,0,1.14,.47,black).rotation.x=-.13;
    box(group,.43,.30,.75,0,1.02,.91,paint).rotation.x=-.22;
    box(group,.52,.45,.32,0,1.19,-.80,paint).rotation.x=.3;
    box(group,.43,.30,.06,0,1.48,-.88,glass).rotation.x=.45;
    box(group,.8,.065,.08,0,1.27,-.55,chrome);
    for(const x of [-.16,.16]) {
      box(group,.065,.87,.065,x,.85,-.94,chrome).rotation.x=-.2;
      box(group,.08,.15,1.03,x,.45,.58,chrome).rotation.x=.12;
      box(group,.17,.21,.68,x*2,.55,.7,chrome).rotation.x=-.1;
      box(group,.17,.12,.04,x,1.17,-.98,headlight);
    }
    box(group,.32,.07,.055,0,1.17,1.29,redlight);
    box(group,.35,.1,.06,0,.89,1.4,mat(0xffd383));
    batchParts(group);
    return {group,wheels};
  }
  function spawn(id,type,x,z,yaw,color,route=null,taxi=false) {
    const built=type==='bike'?buildBike(color):buildCar(color,taxi);
    const mesh = new THREE.Group(); mesh.add(built.group); scene.add(mesh);
    const e={id,type,x,z,yaw,speed:0,mesh,body:built.group,wheels:built.wheels,occupied:null,route,routeIndex:0,cruise:8+random()*6,radius:type==='bike'?.7:1.25,steering:0,distance:0};
    mesh.position.set(x,.03,z);mesh.rotation.y=yaw;entities.push(e);return e;
  }
  spawn('vehicle-bike-01','bike',5,5,0,0x23e7d7);
  spawn('vehicle-car-01','car',-5,8,0,0xf0375d);
  spawn('vehicle-bike-02','bike',100,-8,Math.PI/2,0xf5a829);
  spawn('vehicle-car-02','car',-101,-65,Math.PI,0x6861e5);
  // Clockwise loops are in permanent road lanes, not in building footprints.
  const routes=[
    [{x:-176,z:-116},{x:-94,z:-116},{x:-94,z:116},{x:-176,z:116}],
    [{x:94,z:-176},{x:176,z:-176},{x:176,z:176},{x:94,z:176}],
    [{x:-86,z:-56},{x:86,z:-56},{x:86,z:56},{x:-86,z:56}],
  ];
  for(let i=0;i<12;i++) {
    const route=routes[i%3], n=Math.floor(i/3), a=route[n],b=route[(n+1)%4];
    const t=.18+random()*.45,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    const e=spawn(`traffic-${String(i).padStart(2,'0')}`,'car',x,z,Math.atan2(-(b.x-a.x),-(b.z-a.z)),[0xffb91d,0xe9edf4,0x207b9f,0x343949,0xa82451][i%5],route,i%5===0);
    e.routeIndex=(n+1)%4;
  }
  function nearest(player) {
    let best=null, distance=5;
    for(const e of entities) {const d=Math.hypot(e.x-player.x,e.z-player.z);if(!e.occupied&&d<distance){distance=d;best=e;}}
    return best;
  }
  function interact(player) {
    if(player.vehicle) {
      const e=entities.find(v=>v.id===player.vehicle);if(!e){player.vehicle=null;return 'On foot';}
      if(Math.abs(e.speed)>14)return 'Slow down to exit';
      let exit=null;
      for(const side of [1,-1]) {
        const candidate={x:e.x,z:e.z};
        const hit=moveCircle(candidate,Math.cos(e.yaw)*2.6*side,-Math.sin(e.yaw)*2.6*side,.5);
        if(!hit&&!entities.some(o=>o!==e&&Math.hypot(o.x-candidate.x,o.z-candidate.z)<o.radius+.5)){exit=candidate;break;}
      }
      if(!exit)return 'Move into the street to exit';
      player.x=exit.x;player.z=exit.z;player.y=0;player.vehicle=null;e.occupied=null;e.speed=0;return 'On foot';
    }
    const e=nearest(player);if(!e)return 'Get closer to a vehicle';
    player.vehicle=e.id;e.occupied=player.id||'local';e.route=null;player.x=e.x;player.z=e.z;player.y=0;player.yaw=e.yaw;
    return e.type==='bike'?'SPORT BIKE · W accelerate · S reverse · Space brake':'STREET CAR · W accelerate · S reverse · Space brake';
  }
  const angle = a => Math.atan2(Math.sin(a),Math.cos(a));
  function update(dt,input,player) {
    dt=Math.min(dt,.05);
    for(const e of entities) {
      const driven=player.vehicle===e.id;
      if(driven) {
        const bike=e.type==='bike', throttle=input.forward||0, max=bike?43:34;
        const acceleration=throttle>=0?(bike?22:16):23;
        e.speed+=throttle*acceleration*dt;
        if(!throttle)e.speed*=Math.exp(-.65*dt);
        if(input.brake)e.speed*=Math.exp(-5*dt);
        e.speed=Math.max(-10,Math.min(max+(input.sprint?8:0),e.speed));
        const targetSteering=input.steer||0;e.steering+=(targetSteering-e.steering)*(1-Math.exp(-9*dt));
        const turn=bike?1.65:1.25;
        e.yaw-=e.steering*turn*Math.min(1,Math.abs(e.speed)/5)*Math.sign(e.speed)*dt/(1+Math.abs(e.speed)/55);
      } else if(e.route&&!e.occupied) {
        let target=e.route[e.routeIndex],dx=target.x-e.x,dz=target.z-e.z;
        if(Math.hypot(dx,dz)<3){e.routeIndex=(e.routeIndex+1)%e.route.length;target=e.route[e.routeIndex];dx=target.x-e.x;dz=target.z-e.z;}
        const desired=Math.atan2(-dx,-dz),change=angle(desired-e.yaw);
        e.yaw+=Math.max(-2*dt,Math.min(2*dt,change));
        const obstruction=entities.some(other=>{if(other===e)return false;const ox=other.x-e.x,oz=other.z-e.z,along=-Math.sin(e.yaw)*ox-Math.cos(e.yaw)*oz,across=Math.cos(e.yaw)*ox-Math.sin(e.yaw)*oz;return along>0&&along<7&&Math.abs(across)<e.radius+other.radius+.3;});
        const desiredSpeed=obstruction?0:e.cruise*Math.max(.25,1-Math.abs(change));
        e.speed+=(desiredSpeed-e.speed)*Math.min(1,dt*2.5);
      } else e.speed*=Math.exp(-2*dt);
      const dx=-Math.sin(e.yaw)*e.speed*dt,dz=-Math.cos(e.yaw)*e.speed*dt;
      const oldX=e.x,oldZ=e.z;
      if(moveCircle(e,dx,dz,e.radius)) {
        if(driven&&Math.abs(e.speed)>12)player.hp=Math.max(0,player.hp-Math.min(9,Math.abs(e.speed)*.15));
        e.speed*=-.18;
      }
      for(const other of entities) {
        if(other===e)continue;
        const separation=Math.hypot(e.x-other.x,e.z-other.z);
        if(separation<e.radius+other.radius&&separation>.001) {
          e.x=oldX;e.z=oldZ;
          if(driven) {other.speed=e.speed*.25;e.speed*=-.22;} else e.speed=0;
          break;
        }
      }
      e.distance+=e.speed*dt;
      e.mesh.position.set(e.x,.035,e.z);e.mesh.rotation.y=e.yaw;
      e.body.rotation.z+=( (e.type==='bike'&&driven?e.steering*Math.min(Math.abs(e.speed)/35,.38):0)-e.body.rotation.z)*Math.min(1,dt*8);
      for(const w of e.wheels)w.rotation.x=-e.distance/.44;
      if(driven){player.x=e.x;player.z=e.z;player.y=0;player.yaw=e.yaw;}
    }
  }
  return {entities,update,interact,nearest};
}
