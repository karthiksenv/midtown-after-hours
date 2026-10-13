import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVehicles} from '../src/vehicles.js';
import {blocked} from '../src/world.js';

const player = () => ({id:'test-player',x:8,y:0,z:8,yaw:0,hp:100,vehicle:null});
function fixture() {return {system:createVehicles(THREE,new THREE.Scene()),p:player()};}
function step(system,p,input,count) {for(let i=0;i<count;i++)system.update(1/60,input,p);}

test('five minutes of traffic stay on roads and every car keeps circulating',()=>{
  const {system,p}=fixture();
  for(let i=0;i<18000;i++) {
    system.update(1/60,{},p);
    for(const e of system.entities) assert.equal(blocked(e.x,e.z,e.radius),false,`${e.id} entered a building or escaped map`);
  }
  for(const e of system.entities.filter(e=>e.route)) assert.ok(e.distance>1500,`${e.id} stalled: traveled ${e.distance}`);
});

test('spawn motorcycle enters, accelerates, brakes, reverses and exits safely',()=>{
  const {system,p}=fixture();
  assert.equal(system.nearest(p).id,'vehicle-bike-01');
  system.interact(p);
  const e=system.entities.find(e=>e.id===p.vehicle);
  assert.equal(e.occupied,p.id);
  step(system,p,{forward:1},50);
  assert.ok(e.speed>14);
  assert.equal(p.x,e.x); assert.equal(p.z,e.z);
  assert.match(system.interact(p),/Slow down/);
  step(system,p,{brake:true},60);
  assert.ok(Math.abs(e.speed)<1);
  step(system,p,{forward:-1,steer:1},20);
  assert.ok(e.speed<0);
  assert.ok(e.yaw>0,'right steering reverses yaw direction while backing up');
  system.interact(p);
  assert.equal(p.vehicle,null);assert.equal(e.occupied,null);
  assert.equal(blocked(p.x,p.z,.5),false);
  assert.ok(Math.hypot(p.x-e.x,p.z-e.z)>2);
});

test('driving into a building stops the vehicle and keeps rider inside valid world space',()=>{
  const {system,p}=fixture(); system.interact(p);
  const e=system.entities.find(e=>e.id===p.vehicle);
  e.x=10;e.z=30;e.yaw=-Math.PI/2;e.speed=35;
  step(system,p,{forward:1},30);
  assert.equal(blocked(e.x,e.z,e.radius),false);
  assert.ok(e.x<15); assert.ok(p.hp<100);
  assert.equal(p.x,e.x);assert.equal(p.z,e.z);
});
