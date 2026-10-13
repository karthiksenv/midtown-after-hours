import * as THREE from 'three';
import {WORLD,BLOCKS,moveCircle} from './world.js';
import {buildCity} from './city.js';
import {createVehicles} from './vehicles.js';
import {createCombat,makeCharacter} from './combat.js';
import {LocalSession} from './network.js';

const $=id=>document.getElementById(id),canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111c32);scene.fog=new THREE.FogExp2(0x142339,.0042);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,650);
scene.add(new THREE.HemisphereLight(0xb8d8ff,0x49455a,2.1));
const moon=new THREE.DirectionalLight(0xadcaff,2.3);moon.position.set(-60,120,70);scene.add(moon);
const fill=new THREE.DirectionalLight(0xffbca0,.65);fill.position.set(80,35,-40);scene.add(fill);
const city=buildCity(THREE,scene),vehicles=createVehicles(THREE,scene);
const vehicleInitial=vehicles.entities.map(v=>({id:v.id,x:v.x,z:v.z,yaw:v.yaw,route:v.route,routeIndex:v.routeIndex}));
const player={id:'local-1',x:WORLD.spawn.x,y:0,z:WORLD.spawn.z,yaw:0,hp:100,score:0,vehicle:null};
const avatar=makeCharacter(THREE,0xd1d8cf);scene.add(avatar);
const gun=new THREE.Mesh(new THREE.BoxGeometry(.12,.15,.5),new THREE.MeshStandardMaterial({color:0x202831,metalness:.7,roughness:.3}));gun.position.set(0,-.51,-.22);avatar.userData.rightArm.add(gun);
const playerLight=new THREE.PointLight(0xb4daff,8,12,2);scene.add(playerLight);
let hitFlash=0,damageFlash=0,toastTimer=0,best=0;
try{best=Number(localStorage.getItem('midtown-v1-best'))||0;}catch{}
const weapons=[{name:'01 / SERVICE PISTOL',capacity:12,ammo:12,reserve:120,rate:.25,reload:1.15},{name:'02 / AUTOMATIC RIFLE',capacity:30,ammo:30,reserve:240,rate:.09,reload:1.6},{name:'03 / PUMP SHOTGUN',capacity:6,ammo:6,reserve:60,rate:.75,reload:1.9}];
let weapon=0,fireTimer=0,reloadTimer=0,vy=0,yaw=0,pitch=.12,time=0,started=false,paused=true,dead=false,walk=0,driveScore=0,lastHealth=100;
let audioContext,engine,engineGain;
function initAudio(){if(!audioContext){audioContext=new AudioContext();engine=audioContext.createOscillator();engine.type='sawtooth';engineGain=audioContext.createGain();engineGain.gain.value=0;engine.connect(engineGain).connect(audioContext.destination);engine.start();}audioContext.resume();}
function sound(freq,duration,volume=.08,type='square'){if(!audioContext||!$('sound').checked)return;const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq*.22),audioContext.currentTime+duration);g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
function toast(text){$('toast').textContent=text;toastTimer=2.4;}
const combat=createCombat(THREE,scene,camera,player,event=>{
 if(event.type==='hit'){hitFlash=.16;sound(650,.06,.035);}
 if(event.type==='kill'){toast(`+${event.score}  ${event.hostile?'CREW TAKEDOWN':'STREET SCORE'}`);weapons.forEach(w=>w.reserve=Math.min(360,w.reserve+Math.ceil(w.capacity/2)));}
 if(event.type==='damage')damageFlash=.4;
 if(event.type==='shot'){sound([180,120,75][weapon],.12,.065,'sawtooth');pitch=Math.min(.85,pitch+.008);}
 if(event.type==='health'){toast('+20 HEALTH');sound(880,.15,.04,'sine');}
});
const session=new LocalSession(),keys=new Set();let firing=false,aiming=false;
function clearInput(){keys.clear();firing=false;aiming=false;}
function pause(){paused=true;clearInput();if(!dead){$('menu').style.display='flex';$('play').innerHTML='RESUME THE NIGHT <span>↗</span>';}if(engineGain)engineGain.gain.value=0;}
function start(){started=true;paused=false;$('menu').style.display='none';initAudio();try{const lock=canvas.requestPointerLock?.();lock?.catch(()=>toast('Mouse capture unavailable · drag to look'));}catch{toast('Drag to look');}}
$('play').onclick=start;
$('low').onchange=()=>{renderer.setPixelRatio($('low').checked?1:Math.min(devicePixelRatio,1));renderer.setSize(innerWidth,innerHeight);};
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&started&&!dead)pause();});
addEventListener('blur',pause);
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(!paused&&!dead&&(document.pointerLockElement===canvas||e.buttons)){yaw-=e.movementX*.0022;pitch=THREE.MathUtils.clamp(pitch+e.movementY*.0018,-.65,.85);}});
addEventListener('mousedown',e=>{if(paused||dead)return;if(e.button===0)firing=true;if(e.button===2)aiming=true;});
addEventListener('mouseup',e=>{if(e.button===0)firing=false;if(e.button===2)aiming=false;});
function reload(){const w=weapons[weapon];if(reloadTimer<=0&&w.ammo<w.capacity&&w.reserve>0){reloadTimer=w.reload;sound(420,.08,.025);}}
addEventListener('keydown',e=>{
 if(['Space','Tab','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 if(e.code==='KeyH'&&!e.repeat){if(paused)start();else{document.exitPointerLock?.();pause();}return;}
 if(paused||dead)return;keys.add(e.code);if(e.repeat)return;
 if(e.code==='KeyE'){toast(vehicles.interact(player));vy=0;}
 if(e.code==='KeyR')reload();
 if(['Digit1','Digit2','Digit3'].includes(e.code)){weapon=Number(e.code.slice(-1))-1;reloadTimer=0;}
 if(e.code==='Space'&&!player.vehicle&&player.y<=.001){vy=7.5;sound(180,.06,.012,'sine');}
});
addEventListener('keyup',e=>keys.delete(e.code));
$('restart').onclick=()=>{if(player.vehicle){const v=vehicles.entities.find(v=>v.id===player.vehicle);if(v){v.occupied=null;v.speed=0;}}for(const initial of vehicleInitial){const v=vehicles.entities.find(v=>v.id===initial.id);Object.assign(v,initial,{speed:0,occupied:null});}Object.assign(player,{x:WORLD.spawn.x,y:0,z:WORLD.spawn.z,yaw:0,hp:100,score:0,vehicle:null});weapons.forEach(w=>{w.ammo=w.capacity;w.reserve=w.capacity*10;});weapon=0;reloadTimer=0;vy=0;yaw=0;pitch=.12;dead=false;lastHealth=100;damageFlash=0;combat.reset();$('dead').style.display='none';start();};
const lookTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),cameraDelta=new THREE.Vector3(),cameraRay=new THREE.Ray(),wallPoint=new THREE.Vector3();
const cameraWalls=BLOCKS.map(b=>new THREE.Box3(new THREE.Vector3(b.minX-.35,0,b.minZ-.35),new THREE.Vector3(b.maxX+.35,160,b.maxZ+.35)));
camera.position.set(8,4.2,15);
function updateCamera(dt){
 const v=vehicles.entities.find(v=>v.id===player.vehicle),dist=v?8.5:aiming?2.7:5.6,height=v?1.6:keys.has('KeyC')?.95:1.5;
 lookTarget.set(player.x,player.y+height,player.z);
 desiredCamera.set(player.x+Math.sin(yaw)*dist*Math.cos(pitch),player.y+height+1.1+Math.sin(pitch)*dist,player.z+Math.cos(yaw)*dist*Math.cos(pitch));
 if(aiming&&!v){desiredCamera.x+=Math.cos(yaw)*.65;desiredCamera.z-=Math.sin(yaw)*.65;lookTarget.x+=Math.cos(yaw)*.65;lookTarget.z-=Math.sin(yaw)*.65;}
 cameraDelta.copy(desiredCamera).sub(lookTarget);let max=cameraDelta.length();cameraRay.set(lookTarget,cameraDelta.normalize());
 for(const wall of cameraWalls)if(cameraRay.intersectBox(wall,wallPoint))max=Math.min(max,wallPoint.distanceTo(lookTarget)-.15);
 desiredCamera.copy(lookTarget).addScaledVector(cameraDelta,Math.max(.4,max));desiredCamera.y=Math.max(.4,desiredCamera.y);
 camera.position.lerp(desiredCamera,1-Math.exp(-dt*14));
 const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
 camera.lookAt(camera.position.clone().addScaledVector(forward,50));
 camera.fov=THREE.MathUtils.lerp(camera.fov,aiming?48:v?70+Math.abs(v.speed)*.18:65,1-Math.exp(-dt*8));camera.updateProjectionMatrix();
}
function update(dt){
 time+=dt;session.tick++;const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),steer=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 const input={forward,steer,brake:keys.has('Space'),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),yaw,pitch,fire:firing,aim:aiming,weapon};session.sendInput(input);
 if(!player.vehicle){const crouch=keys.has('KeyC'),speed=crouch?2.2:input.sprint?9:5.3;let dx=-Math.sin(yaw)*forward+Math.cos(yaw)*steer,dz=-Math.cos(yaw)*forward-Math.sin(yaw)*steer;const len=Math.hypot(dx,dz);if(len){dx/=len;dz/=len;moveCircle(player,dx*speed*dt,dz*speed*dt,.45);if(!aiming&&!firing)player.yaw=Math.atan2(-dx,-dz);walk+=dt*speed*1.5;}if(aiming||firing)player.yaw=yaw;vy-=20*dt;player.y=Math.max(0,player.y+vy*dt);if(player.y===0)vy=0;avatar.scale.y=crouch?.68:1;
 const stride=len?Math.sin(walk)*.65:0;avatar.userData.leftLeg.rotation.x=stride;avatar.userData.rightLeg.rotation.x=-stride;avatar.userData.leftArm.rotation.x=-stride;avatar.userData.rightArm.rotation.x=aiming||firing?1.5:stride;
 }else{avatar.scale.y=.8;avatar.userData.leftLeg.rotation.x=1.2;avatar.userData.rightLeg.rotation.x=1.2;avatar.userData.leftArm.rotation.x=1.1;avatar.userData.rightArm.rotation.x=1.1;}
 gun.rotation.x=-avatar.userData.rightArm.rotation.x; vehicles.update(dt,input,player);const v=vehicles.entities.find(v=>v.id===player.vehicle);
 avatar.visible=!v||v.type==='bike';avatar.position.set(player.x,player.y+(v?.type==='bike'?.6:0)+.1,player.z);avatar.rotation.y=player.yaw;
 playerLight.position.set(player.x,player.y+3,player.z);
 if(v&&Math.abs(v.speed)>12){driveScore+=Math.abs(v.speed)*dt;if(driveScore>25){player.score+=10;driveScore-=25;}}
 updateCamera(dt);fireTimer=Math.max(0,fireTimer-dt);
 if(reloadTimer>0){reloadTimer-=dt;if(reloadTimer<=0){const w=weapons[weapon],n=Math.min(w.capacity-w.ammo,w.reserve);w.ammo+=n;w.reserve-=n;sound(520,.08,.02);}}
 if(firing&&fireTimer<=0&&reloadTimer<=0){const w=weapons[weapon];if(w.ammo>0){combat.shoot(weapon,aiming);w.ammo--;fireTimer=w.rate;}else reload();}
 combat.update(dt,time);city.update?.(dt,time);
 hitFlash=Math.max(0,hitFlash-dt);damageFlash=Math.max(0,damageFlash-dt);toastTimer-=dt;
 if(player.hp<lastHealth)damageFlash=.4;lastHealth=player.hp;
 if(player.score>best){best=player.score;try{localStorage.setItem('midtown-v1-best',String(best));}catch{}}
 if(audioContext){engine.frequency.setTargetAtTime(v?45+Math.abs(v.speed)*5:30,audioContext.currentTime,.1);engineGain.gain.setTargetAtTime(v&&$('sound').checked?.018:0,audioContext.currentTime,.1);}
 if(player.hp<=0&&!dead){dead=true;paused=true;clearInput();document.exitPointerLock?.();$('menu').style.display='none';$('dead').style.display='flex';$('runScore').textContent=`Street score ${player.score.toLocaleString()} · Best ${best.toLocaleString()}`;if(engineGain)engineGain.gain.value=0;}
}
const map=$('map').getContext('2d');
function drawMap(){const w=240,h=190,scale=.62;map.fillStyle='#091623';map.fillRect(0,0,w,h);map.save();map.translate(w/2,h/2);map.scale(scale,scale);map.translate(-player.x,-player.z);map.strokeStyle='#283e4d';map.lineWidth=20;map.beginPath();for(const x of WORLD.avenues){map.moveTo(x,-240);map.lineTo(x,240);}for(const z of WORLD.streets){map.moveTo(-240,z);map.lineTo(240,z);}map.stroke();map.strokeStyle='#456471';map.lineWidth=1;map.stroke();map.strokeStyle='#75949b';map.lineWidth=2;map.beginPath();map.moveTo(-240,0);map.lineTo(240,0);map.stroke();for(const v of vehicles.entities){map.fillStyle='#68cbe0';map.fillRect(v.x-2,v.z-2,4,4);}for(const n of combat.npcs)if(n.hostile&&!n.dead){map.fillStyle='#ff5f70';map.beginPath();map.arc(n.x,n.z,3.4,0,7);map.fill();}map.translate(player.x,player.z);map.rotate(-yaw);map.fillStyle='#ddff79';map.beginPath();map.moveTo(0,-8);map.lineTo(5,6);map.lineTo(0,3);map.lineTo(-5,6);map.closePath();map.fill();map.restore();map.fillStyle='#cbd9dc';map.font='9px Arial';map.fillText('N ↑',218,16);}
function hud(){const w=weapons[weapon];$('hp').textContent=Math.ceil(player.hp);$('healthbar').firstElementChild.style.width=`${player.hp}%`;$('healthbar').firstElementChild.style.background=player.hp<30?'#ff6474':'#dcfa85';$('scoreValue').textContent=String(player.score).padStart(6,'0');$('best').textContent=best.toLocaleString();$('weaponName').textContent=w.name;$('ammo').textContent=w.ammo;$('reserve').textContent=` / ${w.reserve}`;$('reload').textContent=reloadTimer>0?'RELOADING…':w.ammo===0?'R · RELOAD':'';$('hitmarker').style.opacity=hitFlash>0?1:0;$('damage').style.opacity=damageFlash*.65;if(toastTimer<=0)$('toast').textContent='';const v=vehicles.entities.find(v=>v.id===player.vehicle);$('speed').style.display=v?'block':'none';if(v){$('speed').querySelector('strong').textContent=Math.round(Math.abs(v.speed)*2.237);$('speed').querySelector('small').textContent=v.type==='bike'?'SPORT / MOTORCYCLE':'STREET / AUTOMOBILE';}$('prompt').textContent=paused||dead?'':v?'E · EXIT   /   SPACE · BRAKE':vehicles.nearest(player)?`E · RIDE ${vehicles.nearest(player).type==='bike'?'SPORT BIKE':'CAR'}`:'';$('heat').textContent=Array.from({length:5},(_,i)=>i<Math.min(5,Math.floor(player.score/500))?'●':'○').join(' ');$('challenge').innerHTML=player.score<500?'FIRST RUN <b>Score 500 points</b>':player.score<1500?'NIGHT RIDER <b>Reach 1,500 street score</b>':'AFTER HOURS <b>Keep the run alive</b>';drawMap();}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let last=performance.now(),acc=0,frames=0,fps=0,measure=last,hudTimer=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;if(!paused&&!dead){acc+=dt;while(acc>=WORLD.step){update(WORLD.step);acc-=WORLD.step;}}else{acc=0;if(!started){avatar.position.set(player.x,.1,player.z);updateCamera(dt);}}hudTimer+=dt;if(hudTimer>.08){hud();hudTimer=0;}renderer.render(scene,camera);frames++;if(now-measure>1000){fps=Math.round(frames*1000/(now-measure));frames=0;measure=now;}if(new URLSearchParams(location.search).has('dev'))$('dev').textContent=`${fps} FPS · ${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k tris\n${player.x.toFixed(1)}, ${player.z.toFixed(1)} · tick ${session.tick}`;}
$('loadStatus').textContent='Ready. Your bike is waiting.';hud();requestAnimationFrame(frame);
// Inspectable QA surface; explicit command injection uses the same simulation as physical input.
window.__game={player,vehicles,combat,world:WORLD,session,renderer,camera,keys,start,pause,step:update,snapshot:()=>session.snapshot(player,vehicles.entities,combat.npcs),setLook:(y,p)=>{yaw=y;pitch=p;},get state(){return {paused,dead,weapon,reloadTimer,fps,weapons};}};


if(new URLSearchParams(location.search).has('qa'))import('../tools/browser-smoke.js').then(m=>m.runSmoke(window.__game));
