// Loads the rigged body meshes made by tools/people/make_bodies.py.
// Each body is shared by every person of that build; per-person data (colours, skeleton)
// is created on top of the shared buffers so a busy shop stays cheap.
import * as THREE from 'three';
import womanUrl from './woman.json?url';
import womanCurvyUrl from './womanCurvy.json?url';
import manUrl from './man.json?url';
import womanLoUrl from './woman-lo.json?url';
import womanCurvyLoUrl from './womanCurvy-lo.json?url';
import manLoUrl from './man-lo.json?url';

export type BodyKey = 'woman' | 'womanCurvy' | 'man';

/** Body parts recorded per vertex. Keep in sync with tools/people/make_bodies.py. */
export const PART = { head: 0, neck: 1, chest: 2, belly: 3, pelvis: 4, upperArm: 5, foreArm: 6, hand: 7, thigh: 8, shin: 9, foot: 10 } as const;

export interface BoneSpec { name: string; parent: string | null; pos: [number, number, number] }
export interface BodySpec {
  hipY: number; chestY: number; neckY: number; shoulderY: number; shoulder: number;
  hipX: number; kneeY: number; width: number; hips: number; seat: number; waist: number; bust: number;
}
export interface BodyAsset {
  key: BodyKey;
  bones: BoneSpec[];
  spec: BodySpec;
  headCenter: THREE.Vector3;
  headScale: number;
  /** Shared, never modified per person. */
  position: THREE.BufferAttribute;
  normal: THREE.BufferAttribute;
  skinIndex: THREE.BufferAttribute;
  skinWeight: THREE.BufferAttribute;
  index: THREE.BufferAttribute;
  part: Uint8Array;
  /** Clothing masks for the outfit shader: arm, leg, head, hand/foot flags and position along the limb. */
  region: THREE.BufferAttribute;
  along: THREE.BufferAttribute;
}

export type Detail = 'hi' | 'lo';
const URLS: Record<Detail, Record<BodyKey, string>> = {
  hi: { woman: womanUrl, womanCurvy: womanCurvyUrl, man: manUrl },
  lo: { woman: womanLoUrl, womanCurvy: womanCurvyLoUrl, man: manLoUrl },
};

function bytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

interface RawBody {
  name: string; count: number; bones: BoneSpec[]; spec: BodySpec; headCenter: [number, number, number]; headScale: number;
  position: string; index: string; skinIndex: string; skinWeight: string; part: string; region: string; along: string; normal?: string;
}

function decode(key: BodyKey, raw: RawBody): BodyAsset {
  const pos = new Float32Array(bytes(raw.position).buffer);
  const idxBytes = bytes(raw.index);
  const index = raw.count < 65536 ? new Uint16Array(idxBytes.buffer) : new Uint32Array(idxBytes.buffer);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  // Smooth normals straight from the sculpted shape (older files fall back to computed ones).
  if (raw.normal) g.setAttribute('normal', new THREE.Int8BufferAttribute(new Int8Array(bytes(raw.normal).buffer), 3, true));
  else g.computeVertexNormals();
  return {
    key,
    bones: raw.bones,
    spec: raw.spec,
    headCenter: new THREE.Vector3(...raw.headCenter),
    headScale: raw.headScale,
    position: g.getAttribute('position') as THREE.BufferAttribute,
    normal: g.getAttribute('normal') as THREE.BufferAttribute,
    skinIndex: new THREE.Uint8BufferAttribute(bytes(raw.skinIndex), 4),
    skinWeight: new THREE.Uint8BufferAttribute(bytes(raw.skinWeight), 4, true),
    index: g.getIndex()!,
    part: bytes(raw.part),
    region: new THREE.Uint8BufferAttribute(bytes(raw.region), 4, true),
    along: new THREE.Uint8BufferAttribute(bytes(raw.along), 1, true),
  };
}

type BodySet = Partial<Record<BodyKey, BodyAsset>>;
const loaded: Partial<Record<Detail, BodySet>> = {};
const loading: Partial<Record<Detail, Promise<void>>> = {};
const listeners = new Set<() => void>();

/** Start loading one detail level of the bodies (once). */
export function loadBodies(detail: Detail = 'hi'): Promise<void> {
  const busy = loading[detail];
  if (busy) return busy;
  const job = Promise.all((Object.keys(URLS[detail]) as BodyKey[]).map(async (k) => {
    const res = await fetch(URLS[detail][k]);
    if (!res.ok) throw new Error(`body ${k}: ${res.status}`);
    return [k, decode(k, await res.json())] as const;
  })).then((pairs) => {
    loaded[detail] = Object.fromEntries(pairs);
    listeners.forEach((f) => f());
  }).catch((err) => {
    // Keep the old block figures if the bodies can't load (offline first visit, old browser).
    console.warn('people: falling back to simple figures', err);
  });
  loading[detail] = job;
  return job;
}

export const bodiesReady = (detail: Detail = 'hi') => loaded[detail] || null;

/** Subscribe to bodies finishing loading (for React). */
export function onBodiesReady(f: () => void): () => void {
  listeners.add(f);
  return () => { listeners.delete(f); };
}
