// Smooth, rigged people for the shop floor. Same props as the old block Figure, so
// Walker and everyone else can swap between them freely.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Pose } from '../../types';
import type { FigureLook } from '../People';
import { BodyAsset, PART } from './assets';

type Bones = Record<string, THREE.Bone>;

const tmp = new THREE.Color();
function shade(hex: string, k: number): string {
  return '#' + tmp.set(hex).multiplyScalar(k).getHex().toString(16).padStart(6, '0');
}

/**
 * Body material: one shader shared by everyone, with each person's outfit colours as uniforms.
 * Colours are decided per pixel from the body part and the rest-pose position, so necklines,
 * waistbands and sleeve hems are crisp lines instead of blotchy vertex colours.
 */
const BODY_KEY = 'asanwa-body-v2';
function bodyMaterial(asset: BodyAsset, l: FigureLook): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.72 });
  const { hipY, chestY } = asset.spec;
  const u = {
    uSkin: { value: new THREE.Color(l.skin) },
    uTorso: { value: new THREE.Color(l.torso) },
    uSleeve: { value: new THREE.Color(l.sleeveColor) },
    uLegs: { value: new THREE.Color(l.legColor) },
    uUnder: { value: new THREE.Color(l.skirt ? l.skirt.color : l.legColor) },
    uShoes: { value: new THREE.Color(l.shoes) },
    // neckline (0 high, 1 open, 2 strapless), sleeves (0 none, 1 short, 2 long), legs (0 bare, 1 trousers, 2 shorts)
    uMode: { value: new THREE.Vector3(l.neckline === 'high' ? 0 : l.neckline === 'open' ? 1 : 2, l.sleeves === 'none' ? 0 : l.sleeves === 'short' ? 1 : 2, l.legs === 'bare' ? 0 : l.legs === 'trousers' ? 1 : 2) },
    uY: { value: new THREE.Vector4(hipY, chestY, hipY + 0.075, asset.spec.neckY) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 region;\nattribute float along;\nvarying vec4 vRegion;\nvarying float vAlong;\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRegion = region;\nvAlong = along;\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uSkin, uTorso, uSleeve, uLegs, uUnder, uShoes, uMode;
uniform vec4 uY;
varying vec4 vRegion;
varying float vAlong;
varying vec3 vRest;
vec3 outfit() {
  float y = vRest.y, x = abs(vRest.x), z = vRest.z;
  if (vRegion.z > 0.5) return uMode.x < 0.5 && y < uY.w - 0.03 ? uTorso : uSkin; // head and neck; a collar for high necks
  if (vRegion.x > 0.5) {                                               // arms
    if (vRegion.w > 0.5) return uSkin;                                 // hands
    float hem = uMode.y < 0.5 ? -1.0 : uMode.y < 1.5 ? 0.36 : 0.97;
    return vAlong < hem ? uSleeve : uSkin;
  }
  if (vRegion.y > 0.5) {                                               // legs
    if (vRegion.w > 0.5) return uShoes;                                // feet
    if (uMode.z > 1.5) return vAlong < 0.3 ? uLegs : uSkin;            // shorts
    return uMode.z > 0.5 ? uLegs : uSkin;
  }
  // trunk
  if (y < uY.z) return uUnder;                                         // below the waistband
  if (uMode.x > 1.5) return y > uY.y + 0.075 - x * 0.18 ? uSkin : uTorso;   // strapless
  if (uMode.x > 0.5) {
    bool bare = uMode.y < 0.5;
    // open neck: a soft scoop at the front, higher at the back
    float w = bare ? 0.068 : 0.11;
    float scoop = z > 0.0 ? uY.y + 0.07 + (x / w) * (x / w) * 0.07 : uY.y + 0.15;
    if (x < w && y > scoop) return uSkin;
    // sleeveless: straps over the shoulders, bare arms-holes beside them
    if (bare && x > w + 0.026 && y > uY.y + 0.07) return uSkin;
  }
  return uTorso;
}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( outfit(), opacity );');
  };
  m.customProgramCacheKey = () => BODY_KEY;
  return m;
}

/** A skirt, gown or robe: a smooth bell from the waist, swaying with the hips and legs. */
function skirtGeometry(asset: BodyAsset, bones: string[], len: number, flare: number, bulk: number): THREE.BufferGeometry {
  const { hipY, hips, seat } = asset.spec;
  const top = hipY + 0.065;
  const rx = (0.112 + 0.04 * hips) * bulk;
  const hipR = (0.172 * hips + 0.03) * bulk;
  const rows = 14;
  const segs = 28;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = top - t * len;
    // waist -> hips (widest at ~0.16 m down) -> flare towards the hem
    const hipT = Math.min(1, (t * len) / 0.16);
    const r = rx + (hipR - rx) * Math.sin((hipT * Math.PI) / 2) + flare * Math.max(0, t * len - 0.16) * 1.6;
    pts.push(new THREE.Vector2(r, y));
  }
  const g = new THREE.LatheGeometry(pts, segs);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  const hipsI = bones.indexOf('hips');
  const lI = bones.indexOf('upperLeg.L');
  const rI = bones.indexOf('upperLeg.R');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let z = p.getZ(i);
    // oval, not round; a little room at the back for the seat
    z = z * 0.8 - (z < 0 ? 0.02 * seat : 0);
    p.setZ(i, z);
    const depth = (top - p.getY(i)) / Math.max(0.2, len);
    const legs = Math.min(0.62, Math.max(0, (depth - 0.12) * 0.9));
    const side = Math.max(-1, Math.min(1, x / Math.max(0.05, hipR)));
    skinIndex.push(hipsI, lI, rI, 0);
    skinWeight.push(1 - legs, legs * (0.5 + 0.5 * side), legs * (0.5 - 0.5 * side), 0);
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  g.computeVertexNormals();
  return g;
}

const SPHERE = new THREE.SphereGeometry(1, 16, 12);
const SPHERE_LO = new THREE.SphereGeometry(1, 10, 8);
const CAP = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8);

type Part = { geo: THREE.BufferGeometry; pos: [number, number, number]; scale: [number, number, number]; rot?: [number, number, number]; color: string; rough?: number; basic?: boolean };

/** Face, hair and headwear, positioned relative to the head bone. */
function headParts(asset: BodyAsset, l: FigureLook): Part[] {
  const H = asset.headScale;
  const head = asset.bones.find((b) => b.name === 'head')!.pos;
  const hc = asset.headCenter;
  const o = (x: number, y: number, z: number): [number, number, number] => [hc.x + x - head[0], hc.y + y - head[1], hc.z + z - head[2]];
  const front = (x: number, y: number) => 0.098 * H * Math.sqrt(Math.max(0, 1 - (x / (0.086 * H)) ** 2 - (y / (0.108 * H)) ** 2));
  const out: Part[] = [];
  const brow = shade(l.hair, 0.55);
  // eyes, brows, lips
  for (const s of [1, -1]) {
    const ex = 0.031 * H * s, ey = 0.006 * H;
    out.push({ geo: SPHERE_LO, pos: o(ex, ey, front(ex, ey) - 0.006), scale: [0.0135, 0.0085, 0.006], color: '#EDE6DC', basic: true });
    out.push({ geo: SPHERE_LO, pos: o(ex, ey, front(ex, ey) - 0.001), scale: [0.0072, 0.0075, 0.004], color: '#1A0E08', basic: true });
    out.push({ geo: BOX, pos: o(ex, ey + 0.026, front(ex, ey + 0.026) - 0.002), scale: [0.028, 0.0065, 0.008], rot: [0, 0, -0.12 * s], color: brow });
  }
  const ly = -0.056 * H;
  out.push({ geo: SPHERE_LO, pos: o(0, ly, front(0, ly) + 0.004), scale: [0.017, 0.0055, 0.006], color: l.lips, rough: 0.5 });
  if (l.beard) {
    // a short boxed beard along the jaw and chin
    out.push({ geo: SPHERE, pos: o(0, -0.074 * H, 0.04 * H), scale: [0.066 * H, 0.038 * H, 0.054 * H], color: shade(l.hair, 0.7), rough: 1 });
    out.push({ geo: BOX, pos: o(0, -0.036 * H, front(0, -0.036 * H) + 0.004), scale: [0.034, 0.007, 0.01], color: shade(l.hair, 0.8), rough: 1 });
  }

  // headwear replaces the hair
  if (l.headwear) {
    if (l.male) {
      out.push({ geo: CYL, pos: o(0, 0.085 * H, -0.006), scale: [0.096 * H, 0.085, 0.1 * H], rot: [-0.15, 0, 0.08], color: l.headwear });
    } else {
      // gele: a tall, wide wrap with a fan at the back
      out.push({ geo: SPHERE, pos: o(0, 0.07 * H, -0.01), scale: [0.112 * H, 0.085 * H, 0.112 * H], color: l.headwear, rough: 0.6 });
      out.push({ geo: SPHERE, pos: o(0, 0.135 * H, -0.03), scale: [0.17 * H, 0.06 * H, 0.06 * H], rot: [0.5, 0, 0], color: l.headwear, rough: 0.6 });
      out.push({ geo: SPHERE, pos: o(0.07 * H, 0.15 * H, 0.0), scale: [0.07 * H, 0.05 * H, 0.04 * H], rot: [0.3, 0, 0.6], color: l.headwear, rough: 0.6 });
    }
    return out;
  }
  const hair = l.hair;
  const cap = (k = 1.05, back = -0.6): Part => ({ geo: CAP, pos: o(0, 0.016 * H, -0.01), scale: [0.088 * H * k, 0.108 * H * k, 0.1 * H * k], rot: [back, 0, 0], color: hair, rough: 0.95 });
  switch (l.hairKind) {
    case 'bald': break;
    case 'short': out.push(cap(l.male ? 1.03 : 1.05, l.male ? -0.7 : -0.6)); break;
    case 'afro':
      out.push(cap(1.05));
      out.push({ geo: SPHERE, pos: o(0, 0.06 * H, -0.05 * H), scale: [0.145 * H, 0.135 * H, 0.125 * H], color: hair, rough: 1 });
      break;
    case 'puff':
      out.push(cap(1.04));
      out.push({ geo: SPHERE, pos: o(0, 0.13 * H, -0.03), scale: [0.085 * H, 0.08 * H, 0.085 * H], color: hair, rough: 1 });
      break;
    case 'bun':
      out.push(cap(1.06));
      out.push({ geo: SPHERE, pos: o(0, 0.09 * H, -0.095 * H), scale: [0.055 * H, 0.05 * H, 0.05 * H], color: hair, rough: 0.9 });
      break;
    case 'long':
      out.push(cap(1.06, -0.55));
      out.push({ geo: SPHERE, pos: o(0, -0.07 * H, -0.06 * H), scale: [0.105 * H, 0.2 * H, 0.06 * H], color: hair, rough: 0.85 });
      for (const s of [1, -1]) out.push({ geo: SPHERE, pos: o(0.085 * H * s, -0.045 * H, 0.012), scale: [0.025 * H, 0.12 * H, 0.05 * H], color: hair, rough: 0.85 });
      break;
    case 'braids':
      out.push(cap(1.06, -0.55));
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.15 + (0.7 * i) / 8);
        const x = Math.cos(a) * 0.09 * H;
        const z = -Math.sin(a) * 0.075 * H - 0.02;
        out.push({ geo: CYL, pos: o(x, -0.1 * H, z), scale: [0.011, 0.3, 0.011], rot: [-0.12, 0, x * 0.6], color: hair, rough: 0.9 });
      }
      break;
  }
  return out;
}

/** Build the skeleton for a body, in its rest pose. */
function makeBones(asset: BodyAsset): { list: THREE.Bone[]; map: Bones; rest: Record<string, THREE.Vector3> } {
  const map: Bones = {};
  const rest: Record<string, THREE.Vector3> = {};
  const list = asset.bones.map((b) => {
    const bone = new THREE.Bone();
    bone.name = b.name;
    map[b.name] = bone;
    return bone;
  });
  for (const b of asset.bones) {
    const bone = map[b.name];
    const parent = b.parent ? asset.bones.find((x) => x.name === b.parent)! : null;
    bone.position.set(b.pos[0] - (parent?.pos[0] || 0), b.pos[1] - (parent?.pos[1] || 0), b.pos[2] - (parent?.pos[2] || 0));
    rest[b.name] = bone.position.clone();
    if (parent) map[parent.name].add(bone);
  }
  return { list, map, rest };
}

interface Built {
  root: THREE.Group;
  bones: Bones;
  rest: Record<string, THREE.Vector3>;
  hand: THREE.Bone;
  dispose: () => void;
}

function build(asset: BodyAsset, l: FigureLook, shadows: boolean): Built {
  const { list, map, rest } = makeBones(asset);
  const names = asset.bones.map((b) => b.name);
  const skeleton = new THREE.Skeleton(list);
  const disposables: { dispose: () => void }[] = [];
  const root = new THREE.Group();
  root.scale.set(l.bulk, 1, l.bulk);

  // body
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', asset.position);
  g.setAttribute('normal', asset.normal);
  g.setAttribute('skinIndex', asset.skinIndex);
  g.setAttribute('skinWeight', asset.skinWeight);
  g.setAttribute('region', asset.region);
  g.setAttribute('along', asset.along);
  g.setIndex(asset.index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.1);
  const bodyMat = bodyMaterial(asset, l);
  const body = new THREE.SkinnedMesh(g, bodyMat);
  body.add(list[0]);
  body.updateMatrixWorld(true);
  body.bind(skeleton);
  body.castShadow = shadows;
  body.frustumCulled = false;
  root.add(body);
  disposables.push(bodyMat);

  // skirt / gown / robe, then a long coat over it
  const layers: { color: string; len: number; flare: number; grow: number }[] = [];
  if (l.skirt) layers.push({ ...l.skirt, grow: 1 });
  if (l.coat) layers.push({ color: l.coat.color, len: l.coat.len, flare: 0.08, grow: 1.08 });
  for (const layer of layers) {
    const sg = skirtGeometry(asset, names, layer.len, layer.flare, layer.grow);
    const sm = new THREE.MeshStandardMaterial({ color: layer.color, roughness: 0.78, side: THREE.DoubleSide });
    const skirt = new THREE.SkinnedMesh(sg, sm);
    skirt.bind(skeleton, body.bindMatrix);
    skirt.castShadow = shadows;
    skirt.frustumCulled = false;
    root.add(skirt);
    disposables.push(sg, sm);
  }

  // face, hair, headwear on the head bone
  const mats = new Map<string, THREE.Material>();
  const matFor = (p: Part) => {
    const key = `${p.color}|${p.rough ?? 0.8}|${p.basic ? 1 : 0}`;
    let m = mats.get(key);
    if (!m) {
      m = p.basic ? new THREE.MeshBasicMaterial({ color: p.color }) : new THREE.MeshStandardMaterial({ color: p.color, roughness: p.rough ?? 0.8 });
      mats.set(key, m);
      disposables.push(m);
    }
    return m;
  };
  for (const p of headParts(asset, l)) {
    const m = new THREE.Mesh(p.geo, matFor(p));
    m.position.set(...p.pos);
    m.scale.set(...p.scale);
    if (p.rot) m.rotation.set(...p.rot);
    m.castShadow = shadows && !p.basic && p.scale[0] > 0.05;
    map.head.add(m);
  }
  return { root, bones: map, rest, hand: map['hand.R'], dispose: () => disposables.forEach((d) => d.dispose()) };
}

// ---------------------------------------------------------------------------
// Animation: procedural, so every pose works on every body.
// Bones start in an A-pose; rotation.x swings a limb forward (-) or back (+).
// ---------------------------------------------------------------------------
function pose(b: Bones, rest: Record<string, THREE.Vector3>, hipY: number, t: number, walking: boolean, ps: Pose, stride = 1) {
  const set = (name: string, x = 0, y = 0, z = 0) => b[name]?.rotation.set(x, y, z);
  const sw = walking ? Math.sin(t * 8) : 0;
  const breath = Math.sin(t * 1.6);
  // defaults: arms relaxed at the sides, a gentle idle sway
  let armLX = walking ? sw * 0.5 : 0.04 + breath * 0.02, armRX = walking ? -sw * 0.5 : 0.04 - breath * 0.02;
  let armLZ = -0.03, armRZ = 0.03;
  let foreL = walking ? -0.25 - Math.max(0, sw) * 0.3 : -0.12, foreR = walking ? -0.25 - Math.max(0, -sw) * 0.3 : -0.12;
  // gowns and robes shorten the stride so the legs stay inside the fabric
  let legL = walking ? -sw * 0.5 * stride : 0, legR = walking ? sw * 0.5 * stride : 0;
  let kneeL = walking ? Math.max(0, sw) * 0.75 * stride + 0.06 : 0.03, kneeR = walking ? Math.max(0, -sw) * 0.75 * stride + 0.06 : 0.03;
  let footL = 0, footR = 0;
  let hipDrop = walking ? -Math.abs(Math.cos(t * 8)) * 0.025 + 0.012 : breath * 0.004;
  let hipTwist = walking ? sw * 0.08 : Math.sin(t * 0.7) * 0.03;
  let headY = walking ? 0 : Math.sin(t * 0.5) * 0.25;
  let headX = 0;
  let spineX = walking ? 0.04 : 0;
  let handLX = 0, handRX = 0;
  switch (walking ? 'stand' : ps) {
    case 'sit':
      legL = legR = -1.5;
      kneeL = kneeR = 1.45;
      footL = footR = 0.05;
      hipDrop = 0.46 - hipY;
      armLX = armRX = -0.45;
      foreL = foreR = -0.7;
      armLZ = -0.12; armRZ = 0.12;
      break;
    case 'reach':
      armLX = -2.5 + Math.sin(t * 4) * 0.25; armRX = -2.2 + Math.cos(t * 4) * 0.25;
      armLZ = -0.05; armRZ = 0.05;
      foreL = foreR = -0.35;
      headX = -0.25;
      break;
    case 'phone':
      armRX = -1.1; foreR = -1.5; armRZ = 0.35; handRX = -0.4;
      headX = 0.25;
      break;
    case 'drink': {
      const sip = Math.sin(t * 1.6) * 0.5 + 0.5;
      armRX = -0.7 - sip * 0.4; foreR = -1.3 - sip * 0.6; armRZ = 0.3;
      headX = -sip * 0.2;
      break;
    }
    case 'dance': {
      const d = Math.sin(t * 5);
      hipDrop = Math.abs(d) * 0.05 - 0.03;
      armLX = -1.4 + d * 0.5; armRX = -1.4 - d * 0.5;
      armLZ = -0.6 - d * 0.3; armRZ = 0.6 - d * 0.3;
      foreL = foreR = -0.8;
      legL = d * 0.25; legR = -d * 0.25;
      kneeL = 0.2 + Math.max(0, d) * 0.3; kneeR = 0.2 + Math.max(0, -d) * 0.3;
      hipTwist = Math.sin(t * 2.5) * 0.35;
      headY = d * 0.2;
      break;
    }
    case 'work':
      armLX = -0.75 + Math.sin(t * 6) * 0.12; armRX = -0.8 + Math.cos(t * 6) * 0.12;
      foreL = -1.0; foreR = -1.1;
      armLZ = -0.1; armRZ = 0.1;
      headX = 0.2;
      spineX = 0.08;
      break;
    case 'count':
      armLX = -0.55; armRX = -0.55 + Math.abs(Math.sin(t * 9)) * 0.15;
      foreL = foreR = -1.15;
      headX = 0.3;
      spineX = 0.06;
      break;
  }
  b.hips.position.set(rest.hips.x, rest.hips.y + hipDrop, rest.hips.z);
  set('hips', 0, hipTwist, 0);
  set('spine', spineX, -hipTwist * 0.5, 0);
  set('chest', 0, -hipTwist * 0.5, walking ? -sw * 0.03 : 0);
  set('neck', headX * 0.4, headY * 0.4, 0);
  set('head', headX * 0.6, headY * 0.6, 0);
  set('upperArm.L', armLX, 0, armLZ);
  set('upperArm.R', armRX, 0, armRZ);
  set('foreArm.L', foreL, 0, 0);
  set('foreArm.R', foreR, 0, 0);
  set('hand.L', handLX, 0, 0);
  set('hand.R', handRX, 0, 0);
  set('upperLeg.L', legL, 0, 0.02);
  set('upperLeg.R', legR, 0, -0.02);
  set('lowerLeg.L', kneeL, 0, 0);
  set('lowerLeg.R', kneeR, 0, 0);
  set('foot.L', footL - (walking ? Math.max(0, -sw) * 0.3 : 0), 0, 0);
  set('foot.R', footR - (walking ? Math.max(0, sw) * 0.3 : 0), 0, 0);
}

export const Character: React.FC<{ asset: BodyAsset; look: FigureLook; walking: boolean; carryBag?: boolean; highlight?: boolean; pose?: Pose; shadows?: boolean }> = ({ asset, look, walking, carryBag, highlight, pose: ps = 'stand', shadows = true }) => {
  // The look arrives as a fresh object on every render; rebuild only when it really changes.
  const lookKey = JSON.stringify(look);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const built = useMemo(() => build(asset, look, shadows), [asset, lookKey, shadows]);
  useEffect(() => () => built.dispose(), [built]);
  const t0 = useMemo(() => Math.random() * 10, []);
  const prop = useRef<THREE.Group>(null);
  const stride = look.skirt && look.skirt.len > 0.35 ? Math.max(0.45, Math.min(0.85, 1.05 - look.skirt.len * 0.75 + look.skirt.flare * 1.5)) : 1;
  useFrame(({ clock }) => pose(built.bones, built.rest, asset.spec.hipY, clock.getElapsedTime() + t0, walking, ps, Math.min(1, stride)));
  // props held in the right hand
  const holding = walking ? 'none' : ps === 'phone' || ps === 'dance' ? 'phone' : ps === 'drink' ? 'drink' : 'none';
  const bagColor = carryBag ? '#F4E4C8' : walking || ps === 'stand' ? look.bag : null;
  return (
    <group>
      {highlight && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 32]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
      )}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26 * look.bulk, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <primitive object={built.root} />
      <HandProp hand={built.hand} kind={holding} bag={holding === 'none' ? bagColor : null} ref={prop} />
    </group>
  );
};

/** Phone, drink or bag in the right hand, attached to the hand bone. */
const HandProp = React.forwardRef<THREE.Group, { hand: THREE.Bone; kind: 'phone' | 'drink' | 'none'; bag: string | null }>(({ hand, kind, bag }, ref) => {
  const group = useMemo(() => new THREE.Group(), []);
  useEffect(() => {
    hand.add(group);
    return () => { hand.remove(group); };
  }, [hand, group]);
  React.useImperativeHandle(ref, () => group, [group]);
  useEffect(() => {
    group.clear();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], scale: [number, number, number]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      m.scale.set(...scale);
      group.add(m);
    };
    const mats: THREE.Material[] = [];
    if (kind === 'phone') {
      const m = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#7AB8FF', emissiveIntensity: 0.4 });
      mats.push(m);
      add(BOX, m, [0, -0.1, 0.03], [0.07, 0.13, 0.012]);
    } else if (kind === 'drink') {
      const m = new THREE.MeshStandardMaterial({ color: '#E8F4FF', transparent: true, opacity: 0.8 });
      mats.push(m);
      add(CYL, m, [0, -0.09, 0.04], [0.032, 0.09, 0.032]);
    } else if (bag) {
      const m = new THREE.MeshStandardMaterial({ color: bag, roughness: 0.6 });
      mats.push(m);
      add(BOX, m, [0.03, -0.2, 0], [0.17, 0.15, 0.08]);
      add(BOX, m, [0.03, -0.1, 0], [0.012, 0.09, 0.012]);
    }
    return () => { group.clear(); mats.forEach((m) => m.dispose()); };
  }, [group, kind, bag]);
  return null;
});
HandProp.displayName = 'HandProp';
