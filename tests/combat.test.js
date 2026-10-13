import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCombat } from '../src/combat.js';

function setup() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const player = { id: 'test-player', x: 0, y: 0, z: 8, hp: 100, score: 0, vehicle: null };
  const events = [], combat = createCombat(THREE, scene, camera, player, event => events.push(event));
  for (const npc of combat.npcs) { npc.dead = true; npc.respawn = Infinity; npc.mesh.visible = false; }
  const target = combat.npcs[0];
  Object.assign(target, { x: 0, z: 0, hp: 80, dead: false, cooldown: 999 });
  camera.position.set(0, 1.3, 8); camera.lookAt(0, 1.3, 0); camera.updateMatrixWorld();
  return { scene, camera, player, events, combat, target };
}

test('aimed pistol damages nearest target and kill awards score exactly once', () => {
  const { combat, target, player, events } = setup();
  combat.shoot(0, true); assert.equal(target.hp, 48);
  combat.shoot(0, true); assert.equal(target.hp, 16);
  combat.shoot(0, true); assert.equal(target.dead, true);
  assert.equal(player.score, 150); assert.equal(target.mesh.visible, false);
  combat.shoot(0, true);
  assert.equal(player.score, 150); assert.equal(events.filter(e => e.type === 'kill').length, 1);
});

test('rifle and shotgun apply their respective weapon damage', () => {
  const rifle = setup(); rifle.combat.shoot(1, true); assert.equal(rifle.target.hp, 60);
  const shotgun = setup(); shotgun.combat.shoot(2, true);
  assert.equal(shotgun.target.dead, true); assert.equal(shotgun.player.score, 150);
});

test('locked city blocks occlude shots even when target is on crosshair', () => {
  const { combat, camera, player, target, events } = setup();
  Object.assign(player, { x: 12, z: 30 }); Object.assign(target, { x: 80, z: 30 });
  camera.position.set(12, 1.3, 30); camera.lookAt(80, 1.3, 30); camera.updateMatrixWorld();
  combat.shoot(0, true);
  assert.equal(target.hp, 80); assert.equal(events.some(e => e.type === 'hit'), false);
});

test('health drop heals, caps HP at 100 and is consumed once', () => {
  const { combat, target, player, events } = setup();
  target.hp = 1; combat.shoot(0, true);
  Object.assign(player, { x: target.x, z: target.z, hp: 90 });
  combat.update(1 / 60, 1); assert.equal(player.hp, 100);
  player.hp = 70; combat.update(1 / 60, 2); assert.equal(player.hp, 70);
  assert.equal(events.filter(e => e.type === 'health').length, 1);
});

test('reset revives NPCs, clears transient effects and leaves run score to root', () => {
  const { combat, target, player } = setup();
  target.hp = 1; combat.shoot(0, true); assert.ok(combat.effects.length > 0);
  const ids = combat.npcs.map(n => n.id);
  combat.reset();
  assert.deepEqual(combat.npcs.map(n => n.id), ids);
  assert.equal(combat.npcs.some(n => n.dead), false);
  assert.equal(target.hp, 80); assert.equal(target.alert, 0);
  assert.equal(player.score, 150); assert.equal(combat.effects.length, 0);
  // The root's restart explicitly resets player score, independently of NPC state.
  player.score = 0; combat.reset(); assert.equal(player.score, 0);
});

test('hostile damage respects line of sight and HP never falls below zero', () => {
  const { combat, target, player, events } = setup();
  player.hp = 3;
  for (let i = 0; i < 200; i++) { target.cooldown = 0; combat.update(1 / 60, i / 60); }
  assert.equal(player.hp, 0); assert.ok(events.some(e => e.type === 'damage'));
  assert.equal(combat.shoot(0, true), false);
  const hidden = setup();
  Object.assign(hidden.player, { x: 30, z: 12 }); Object.assign(hidden.target, { x: 30, z: 48, homeX: 30, alert: 20 });
  for (let i = 0; i < 100; i++) { hidden.target.cooldown = 0; hidden.combat.update(1 / 60, i / 60); }
  assert.equal(hidden.player.hp, 100);
});
