// WORLD CONTRACT v1. Never change these coordinates without a protocol version bump.
export const WORLD = Object.freeze({version:'midtown-v1',seed:4202026,halfSize:240,roadWidth:20,sidewalk:5,avenues:[-180,-90,0,90,180],streets:[-180,-120,-60,0,60,120,180],spawn:{x:8,z:8},step:1/60});
export function rng(seed=WORLD.seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export const BLOCKS=[];
for(let i=0;i<WORLD.avenues.length-1;i++)for(let j=0;j<WORLD.streets.length-1;j++)BLOCKS.push({id:`block-${i}-${j}`,minX:WORLD.avenues[i]+15,maxX:WORLD.avenues[i+1]-15,minZ:WORLD.streets[j]+15,maxZ:WORLD.streets[j+1]-15});
export function blocked(x,z,r=.5){return Math.abs(x)>WORLD.halfSize-r||Math.abs(z)>WORLD.halfSize-r||BLOCKS.some(b=>x>b.minX-r&&x<b.maxX+r&&z>b.minZ-r&&z<b.maxZ+r);}
export function moveCircle(entity,dx,dz,r=.5){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.5));let hit=false;for(let i=0;i<steps;i++){if(!blocked(entity.x+dx/steps,entity.z,r))entity.x+=dx/steps;else hit=true;if(!blocked(entity.x,entity.z+dz/steps,r))entity.z+=dz/steps;else hit=true;}return hit;}
