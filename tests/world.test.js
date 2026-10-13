import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,BLOCKS,blocked,moveCircle,rng} from '../src/world.js';

test('v1 world layout and player spawn remain stable for shared snapshots',()=>{
  assert.equal(WORLD.version,'midtown-v1');
  assert.deepEqual(WORLD.avenues,[-180,-90,0,90,180]);
  assert.deepEqual(WORLD.streets,[-180,-120,-60,0,60,120,180]);
  assert.deepEqual(WORLD.spawn,{x:8,z:8});
  assert.equal(WORLD.step,1/60);
  assert.equal(BLOCKS.length,24);
  assert.equal(new Set(BLOCKS.map(b=>b.id)).size,24);
  assert.equal(blocked(WORLD.spawn.x,WORLD.spawn.z),false);
});

test('every road is a connected clear corridor with usable sidewalk clearance',()=>{
  for(const x of WORLD.avenues)for(let z=-230;z<=230;z+=1){
    assert.equal(blocked(x,z,1.5),false,`avenue center ${x},${z}`);
    for(const side of [-1,1])assert.equal(blocked(x+side*12,z,.45),false,`avenue sidewalk ${x},${z}`);
  }
  for(const z of WORLD.streets)for(let x=-230;x<=230;x+=1){
    assert.equal(blocked(x,z,1.5),false,`street center ${x},${z}`);
    for(const side of [-1,1])assert.equal(blocked(x,z+side*12,.45),false,`street sidewalk ${x},${z}`);
  }
});

test('all building footprints block characters and vehicles',()=>{
  for(const b of BLOCKS){
    assert.equal(blocked((b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2),true);
    const z=(b.minZ+b.maxZ)/2;
    assert.equal(blocked(b.minX-1,z,1.2),true);
    assert.equal(blocked(b.minX-1.3,z,1.2),false);
  }
});

test('substepped movement cannot tunnel through a block at extreme speed',()=>{
  const p={x:0,z:30};
  assert.equal(moveCircle(p,200,0,.5),true);
  assert.ok(p.x<=14.5&&p.x>=14);
  assert.equal(p.z,30);
  assert.equal(blocked(p.x,p.z,.5),false);
});

test('diagonal movement slides along walls instead of freezing',()=>{
  const p={x:14,z:20};
  assert.equal(moveCircle(p,8,10,.5),true);
  assert.ok(p.x<=14.5);
  assert.ok(Math.abs(p.z-30)<1e-9);
  assert.equal(blocked(p.x,p.z,.5),false);
});

test('world boundary retains the full collision radius',()=>{
  const p={x:238,z:0};moveCircle(p,100,0,1.2);
  assert.ok(p.x<=WORLD.halfSize-1.2);
  assert.equal(blocked(p.x,p.z,1.2),false);
  assert.equal(blocked(240,0,1.2),true);
});

test('equal seeds produce stable independent generation streams',()=>{
  const first=rng(),second=rng(WORLD.seed),other=rng(WORLD.seed+1);
  const a=Array.from({length:1000},()=>first()),b=Array.from({length:1000},()=>second());
  assert.deepEqual(a,b);
  assert.ok(a.every(n=>n>=0&&n<1));
  assert.notDeepEqual(a.slice(0,10),Array.from({length:10},()=>other()));
});
