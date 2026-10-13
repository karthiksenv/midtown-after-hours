import { WORLD, BLOCKS, rng, moveCircle } from './world.js';

// Each articulated part is one vertex-colored draw, with cached geometry shared
// by every NPC wearing the same jacket. No texture or model assets are used.
const characterCaches = new WeakMap();
function characterTemplate(THREE, color) {
  let cache = characterCaches.get(THREE);
  if (!cache) {
    cache = { geometries: new Map(), material: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88 }) };
    characterCaches.set(THREE, cache);
  }
  if (!cache.geometries.has(color)) {
    const pants = 0x171d2b, skin = 0xb98060;
    function merge(parts) {
      const positions = [], normals = [], colors = [];
      for (const [w, h, d, x, y, z, tint] of parts) {
        const indexed = new THREE.BoxGeometry(w, h, d);
        const geometry = indexed.toNonIndexed(); indexed.dispose(); geometry.translate(x, y, z);
        const vertexColor = new THREE.Color(tint);
        positions.push(...geometry.attributes.position.array); normals.push(...geometry.attributes.normal.array);
        for (let i = 0; i < geometry.attributes.position.count; i++) colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
        geometry.dispose();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere(); return geometry;
    }
    cache.geometries.set(color, {
      body: merge([[.48, .6, .27, 0, 1.22, 0, color], [.3, .33, .3, 0, 1.72, 0, skin], [.32, .10, .32, 0, 1.9, -.01, pants]]),
      arm: merge([[.16, .47, .2, 0, -.2, 0, color], [.15, .17, .18, 0, -.49, 0, skin]]),
      leg: merge([[.2, .79, .23, 0, -.4, 0, pants], [.23, .14, .35, 0, -.87, -.04, pants]])
    });
  }
  return { ...cache.geometries.get(color), material: cache.material };
}

// Models and simulation entities are separate: network snapshots can replace NPC
// state without rebuilding geometry. World positions always use contract v1.
export function makeCharacter(THREE, color = 0x30495f) {
  const group = new THREE.Group(), template = characterTemplate(THREE, color);
  const body = new THREE.Mesh(template.body, template.material); body.castShadow = true; group.add(body);
  function limb(geometry, x, y) {
    const pivot = new THREE.Group(), mesh = new THREE.Mesh(geometry, template.material);
    pivot.position.set(x, y, 0); mesh.castShadow = true; pivot.add(mesh); group.add(pivot); return pivot;
  }
  const leftArm = limb(template.arm, -.32, 1.48), rightArm = limb(template.arm, .32, 1.48);
  const leftLeg = limb(template.leg, -.135, .96), rightLeg = limb(template.leg, .135, .96);
  group.userData = { leftArm, rightArm, leftLeg, rightLeg, limbs: { leftArm, rightArm, leftLeg, rightLeg } };
  return group;
}

export function createCombat(THREE, scene, camera, player, onEvent = () => {}) {
  const random = rng(WORLD.seed + 17), npcs = [], effects = [], pickups = [];
  const ray = new THREE.Ray(), origin = new THREE.Vector3(), direction = new THREE.Vector3();
  const point = new THREE.Vector3(), box = new THREE.Box3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let alarm = 0, clock = 0;
  const walls = BLOCKS.map(v => new THREE.Box3(new THREE.Vector3(v.minX, 0, v.minZ), new THREE.Vector3(v.maxX, 150, v.maxZ)));
  function wallDistance(r, limit) {
    let nearest = limit;
    for (const wall of walls) if (r.intersectBox(wall, point)) nearest = Math.min(nearest, point.distanceTo(r.origin));
    return nearest;
  }
  function visible(x, z) {
    a.set(x, 1.35, z); b.set(player.x, 1.2 + (player.y || 0), player.z).sub(a);
    const distance = b.length(); ray.set(a, b.normalize());
    return wallDistance(ray, distance) >= distance - .3;
  }
  function tracer(start, end, color = 0xffe797) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mesh = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .95 }));
    scene.add(mesh); effects.push({ mesh, life: .085, max: .085 });
  }
  function burst(x, y, z, color, count = 4) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.065, .065, .065), new THREE.MeshBasicMaterial({ color, transparent: true }));
      mesh.position.set(x, y, z); scene.add(mesh);
      effects.push({ mesh, life: .25, max: .25, vx: (random() - .5) * 4, vy: random() * 3, vz: (random() - .5) * 4 });
    }
  }
  function spawn(npc, first = false) {
    let x, z;
    if (first && npc.hostile && npc.index < 8) {
      x = npc.index % 2 ? -12 : 12; z = [28, -26, 43, -43, 74, -74, 95, -95][npc.index];
    } else {
      const avenue = WORLD.avenues[Math.floor(random() * WORLD.avenues.length)];
      x = avenue + (random() < .5 ? -12 : 12); z = -172 + random() * 344;
    }
    npc.x = x; npc.z = z; npc.homeX = x; npc.hp = npc.hostile ? 80 : 60;
    npc.dead = false; npc.respawn = 0; npc.direction = random() < .5 ? -1 : 1;
    npc.cooldown = 1 + random() * 3; npc.alert = 0; npc.mesh.visible = Math.hypot(x - player.x, z - player.z) <= 100;
    npc.mesh.position.set(x, 0, z);
  }
  const gunGeometry = new THREE.BoxGeometry(.09, .12, .35);
  const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x141923, metalness: .8, roughness: .3 });
  const markerGeometry = new THREE.OctahedronGeometry(.13);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff4b66 });
  for (let i = 0; i < 36; i++) {
    const hostile = i < 12;
    const mesh = makeCharacter(THREE, hostile ? 0xb52c4a : [0x435e76, 0x896e55, 0x5f6685, 0x446d61][i % 4]);
    if (hostile) {
      const gun = new THREE.Mesh(gunGeometry, gunMaterial);
      gun.position.set(0, -.51, -.16); mesh.userData.rightArm.add(gun);
      mesh.userData.gun = gun;
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.y = 2.32; mesh.add(marker); mesh.userData.marker = marker;
    }
    const npc = { id: `npc-${String(i).padStart(3, '0')}`, index: i, hostile, mesh, x: 0, z: 0, hp: 80 };
    spawn(npc, true); scene.add(mesh); npcs.push(npc);
  }
  function dropHealth(npc) {
    if (pickups.length >= 10) return;
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.32), new THREE.MeshBasicMaterial({ color: 0x65ffd1 }));
    mesh.position.set(npc.x, .7, npc.z); scene.add(mesh);
    pickups.push({ mesh, x: npc.x, z: npc.z, life: 35 });
  }
  function removeMesh(mesh) {
    scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose();
  }
  function shoot(weaponIndex = 0, aiming = false) {
    if (player.hp <= 0) return false;
    alarm = 13;
    const shotgun = weaponIndex === 2, damage = [32, 20, 15][weaponIndex] || 32;
    camera.getWorldPosition(origin); camera.getWorldDirection(direction);
    const baseDirection = direction.clone();
    for (let pellet = 0; pellet < (shotgun ? 7 : 1); pellet++) {
      const spread = shotgun ? .045 : aiming ? .0015 : .006;
      direction.copy(baseDirection).add(new THREE.Vector3((random() - .5) * spread, (random() - .5) * spread, (random() - .5) * spread)).normalize();
      ray.set(origin, direction);
      let nearest = wallDistance(ray, shotgun ? 65 : 160), target = null;
      for (const npc of npcs) {
        if (npc.dead) continue;
        box.min.set(npc.x - .42, 0, npc.z - .42); box.max.set(npc.x + .42, 1.96, npc.z + .42);
        if (ray.intersectBox(box, point)) {
          const distance = point.distanceTo(origin);
          if (distance < nearest) { nearest = distance; target = npc; }
        }
      }
      const end = ray.at(nearest, new THREE.Vector3());
      const muzzle = new THREE.Vector3(player.x, (player.y || 0) + 1.4, player.z).addScaledVector(baseDirection, .65);
      tracer(muzzle, end);
      if (target) {
        target.hp -= damage; target.alert = 15;
        burst(end.x, end.y, end.z, 0xffbb67, 3);
        onEvent({ type: 'hit', damage, targetId: target.id });
        if (target.hp <= 0) {
          target.dead = true; target.mesh.visible = false; target.respawn = 18 + random() * 12;
          const score = target.hostile ? 150 : 25; player.score += score;
          onEvent({ type: 'kill', score, hostile: target.hostile, targetId: target.id });
          if (target.hostile) dropHealth(target);
        }
      } else if (nearest < 159) burst(end.x, end.y, end.z, 0xf8dd8a, 2);
    }
    onEvent({ type: 'shot', weaponIndex }); return true;
  }
  function update(dt, time) {
    clock = time ?? clock + dt; alarm = Math.max(0, alarm - dt);
    for (const npc of npcs) {
      if (npc.dead) { npc.respawn -= dt; if (npc.respawn <= 0) spawn(npc); continue; }
      const distance = Math.hypot(player.x - npc.x, player.z - npc.z);
      npc.mesh.visible = distance <= 100;
      npc.cooldown -= dt; npc.alert = Math.max(0, (npc.alert || 0) - dt);
      const engaging = npc.hostile && player.hp > 0 && distance < 46 && (alarm > 0 || npc.alert > 0 || distance < 11);
      let walking = true;
      if (engaging && visible(npc.x, npc.z)) {
        npc.yaw = Math.atan2(player.x - npc.x, player.z - npc.z) + Math.PI;
        walking = distance > 17;
        if (walking) moveCircle(npc, (player.x - npc.x) / distance * dt * 1.7, (player.z - npc.z) / distance * dt * 1.7, .42);
        npc.mesh.userData.rightArm.rotation.x = 1.4;
        if (npc.cooldown <= 0) {
          npc.cooldown = 1.6 + random() * 2.3;
          tracer(new THREE.Vector3(npc.x, 1.4, npc.z), new THREE.Vector3(player.x + (random() - .5), (player.y || 0) + 1.2, player.z), 0xff5569);
          if (random() < .55 && player.hp > 0) {
            const damage = player.vehicle ? 2 : 4;
            player.hp = Math.max(0, player.hp - damage); onEvent({ type: 'damage', damage, sourceId: npc.id });
          }
        }
      } else {
        const speed = !npc.hostile && alarm > 0 && distance < 42 ? 3.5 : 1.2;
        const dx = Math.max(-1, Math.min(1, npc.homeX - npc.x)) * dt;
        if (moveCircle(npc, dx, npc.direction * dt * speed, .4) || Math.abs(npc.z) > 197) npc.direction *= -1;
        npc.yaw = npc.direction > 0 ? Math.PI : 0;
      }
      npc.mesh.position.set(npc.x, 0, npc.z); npc.mesh.rotation.y = npc.yaw || 0;
      const stride = walking ? Math.sin(clock * 7 + npc.index) * .4 : 0;
      npc.mesh.userData.leftLeg.rotation.x = stride; npc.mesh.userData.rightLeg.rotation.x = -stride;
      npc.mesh.userData.leftArm.rotation.x = -stride;
      if (!engaging) npc.mesh.userData.rightArm.rotation.x = stride;
      if (npc.mesh.userData.gun) npc.mesh.userData.gun.rotation.x = -npc.mesh.userData.rightArm.rotation.x;
      if (npc.mesh.userData.marker) {
        npc.mesh.userData.marker.visible = distance < 65;
        npc.mesh.userData.marker.rotation.y = clock;
      }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i]; effect.life -= dt;
      if (effect.life <= 0) { removeMesh(effect.mesh); effects.splice(i, 1); continue; }
      effect.mesh.material.opacity = effect.life / effect.max;
      if (effect.vy !== undefined) { effect.mesh.position.x += effect.vx * dt; effect.mesh.position.y += effect.vy * dt; effect.mesh.position.z += effect.vz * dt; effect.vy -= dt * 8; }
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i]; pickup.life -= dt; pickup.mesh.rotation.y += dt * 2;
      pickup.mesh.position.y = .75 + Math.sin(clock * 3) * .15;
      if (Math.hypot(pickup.x - player.x, pickup.z - player.z) < 2 && player.hp > 0 && player.hp < 100) {
        player.hp = Math.min(100, player.hp + 20); pickup.life = 0;
        onEvent({ type: 'health', amount: 20 });
      }
      if (pickup.life <= 0) { removeMesh(pickup.mesh); pickups.splice(i, 1); }
    }
  }
  function reset() {
    alarm = 0;
    for (const npc of npcs) spawn(npc, true);
    for (const effect of effects) removeMesh(effect.mesh); effects.length = 0;
    for (const pickup of pickups) removeMesh(pickup.mesh); pickups.length = 0;
  }
  return { npcs, update, shoot, reset, effects };
}
