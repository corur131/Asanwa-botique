import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CharacterConfig, Garment } from '../../types/character';
import { SKIN_TONES } from '../../constants/skinTones';
import { HAIR_PALETTES } from '../../components/renderer/hair';
import { itemById } from '../../constants/catalog';
import type { Pose } from '../types';

/**
 * Low-poly people for the shop floor. Each one wears the colours of their real outfit
 * (from the same CharacterConfig the 2D renderer uses), so a customer walks out looking
 * like what Divine put on them.
 */

export interface FigureLook {
  skin: string;
  hair: string;
  hairKind: 'long' | 'short' | 'bun' | 'afro' | 'bald' | 'braids' | 'puff';
  top: string;
  bottom: string;
  dress: string | null;
  dressLength: number; // 0..1, 1 = floor
  dressFlare: number;
  trousers: boolean;
  shoes: string;
  male: boolean;
  width: number;
  headwear: string | null;
  bag: string | null;
}

const LONG = new Set(['longBraids', 'boneStraight', 'bodyWave', 'sidePartFrontal', 'kinkyStraight', 'waterWave', 'butterflyLayers', 'deepCurly']);
const BRAIDS = new Set(['knotlessBraids', 'fulaniBraids', 'fauxLocs', 'passionTwists', 'goddessLocs', 'ghanaWeaving', 'longLocs']);
const AFRO = new Set(['afroWig', 'afro', 'curlyBob']);
const BUN = new Set(['highBun', 'sleekPonytail', 'bantuKnots']);
const PUFF = new Set(['afroPuff', 'highTopFade']);
const TROUSERS = new Set(['skinnyJeans', 'baggyJeans', 'wideLegTrousers', 'cargoPants', 'straightTrousers', 'trousers', 'jeans', 'chinos', 'mensCargo', 'sokoto', 'jumpsuit', 'joggers']);
const SHORT_BOTTOM = new Set(['miniSkirt', 'shorts', 'mensShorts', 'playsuit', 'bodyconMini']);

export function lookToFigure(cfg: CharacterConfig): FigureLook {
  const skin = SKIN_TONES[cfg.skinTone]?.base || '#8A5A3E';
  const pal = HAIR_PALETTES[cfg.hairColor] || HAIR_PALETTES.black;
  const male = cfg.body === 'male';
  const w = cfg.wardrobe || {};
  const g = (x?: Garment) => x?.color;
  const hair = cfg.hair as string;
  const hairKind: FigureLook['hairKind'] = hair === 'bald' ? 'bald' : LONG.has(hair) ? 'long' : BRAIDS.has(hair) ? 'braids' : AFRO.has(hair) ? 'afro' : BUN.has(hair) ? 'bun' : PUFF.has(hair) ? 'puff' : 'short';
  const dressItem = w.dress ? itemById(w.dress.style) : undefined;
  const isSet = !!dressItem && (dressItem.id === 'senator' || dressItem.id === 'kaftan' || dressItem.id === 'agbada');
  const dressLength = w.dress ? (SHORT_BOTTOM.has(w.dress.style) ? 0.35 : /maxi|Maxi|Gown|bubu|laceGown|corset|ball|slit|mermaid|offShoulderGown|adire|cape/i.test(w.dress.style) ? 1 : 0.62) : 0;
  const bottomStyle = w.bottom?.style || '';
  const acc = cfg.accessories;
  return {
    skin,
    hair: pal.mid,
    hairKind,
    top: g(w.top) || g(w.dress) || '#9A9A9A',
    bottom: g(w.bottom) || g(w.dress) || '#5A5A60',
    dress: w.dress && !isSet && w.dress.style !== 'jumpsuit' ? w.dress.color : null,
    dressLength: isSet ? 0.75 : dressLength,
    dressFlare: w.dress && /ball|maxiDress|ruffleMaxi|fitFlare|bubu|adire/i.test(w.dress.style) ? 0.18 : 0.06,
    trousers: isSet || TROUSERS.has(bottomStyle) || w.dress?.style === 'jumpsuit',
    shoes: acc?.shoesColor || '#3A3A40',
    male,
    width: cfg.body === 'femalePlus' ? 1.25 : cfg.body === 'femaleRegular' ? 1.08 : male ? 1.12 : 1,
    headwear: acc && acc.headwear && acc.headwear !== 'none' ? acc.headwearColor || '#C9A163' : null,
    bag: acc && acc.bag && acc.bag !== 'none' ? acc.bagColor || '#7A2A2A' : null,
  };
}

const M: React.FC<{ c: string; r?: number }> = ({ c, r = 0.85 }) => <meshStandardMaterial color={c} roughness={r} />;

/** One person, about 1.7 m tall, built from boxes, cylinders and spheres. `walk` swings the limbs. */
export const Figure: React.FC<{ look: FigureLook; walking: boolean; carryBag?: boolean; highlight?: boolean; pose?: Pose }> = ({ look: l, walking, carryBag, highlight, pose = 'stand' }) => {
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const t0 = useMemo(() => Math.random() * 10, []);
  const ps = walking ? 'stand' : pose;
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + t0;
    const sw = walking ? Math.sin(t * 8) * 0.55 : Math.sin(t * 1.5) * 0.03;
    const L = legL.current, Rl = legR.current, A = armL.current, B2 = armR.current, Bd = body.current;
    if (!L || !Rl || !A || !B2 || !Bd) return;
    // defaults: walking or standing
    let lx = sw, rx = -sw, ax = -sw * 0.8, bx = sw * 0.8, az = 0, bz = 0, y = walking ? Math.abs(Math.sin(t * 8)) * 0.03 : Math.sin(t * 1.5) * 0.005, ry = 0;
    switch (ps) {
      case 'sit':
        lx = rx = -1.45;
        ax = bx = -0.5;
        y = -0.36;
        break;
      case 'reach': // tidying a rail or shelf: arms up, hands working
        ax = -2.3 + Math.sin(t * 4) * 0.35;
        bx = -2.0 + Math.cos(t * 4) * 0.35;
        break;
      case 'phone': // selfie: phone held up in front
        bx = -2.1;
        bz = 0.25;
        ax = -0.2;
        y += Math.sin(t * 2) * 0.01;
        break;
      case 'drink':
        bx = -1.6 - (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.9;
        bz = 0.35;
        break;
      case 'dance': // filming a TikTok
        y = Math.abs(Math.sin(t * 5)) * 0.06;
        az = -0.5 - Math.sin(t * 5) * 0.4;
        bz = 0.5 + Math.sin(t * 5) * 0.4;
        ax = -1.2 + Math.sin(t * 5) * 0.4;
        bx = -1.2 - Math.sin(t * 5) * 0.4;
        lx = Math.sin(t * 5) * 0.25;
        rx = -lx;
        ry = Math.sin(t * 2.5) * 0.35;
        break;
      case 'work': // hands busy in front (hair, makeup, pouring fuel)
        ax = -1.25 + Math.sin(t * 6) * 0.18;
        bx = -1.35 + Math.cos(t * 6) * 0.18;
        az = -0.15;
        bz = 0.15;
        break;
      case 'count': // counting money at the counter
        ax = -1.0;
        bx = -1.0 + Math.abs(Math.sin(t * 9)) * 0.3;
        az = -0.2;
        bz = 0.2;
        break;
    }
    L.rotation.x = lx;
    Rl.rotation.x = rx;
    A.rotation.x = ax;
    A.rotation.z = az;
    B2.rotation.x = bx;
    B2.rotation.z = bz;
    Bd.position.y = y;
    Bd.rotation.y = ry;
  });
  const W = l.width;
  const hipY = 0.82;
  const legC = l.trousers ? l.bottom : l.skin;
  const torsoW = (l.male ? 0.36 : 0.3) * W;
  return (
    <group ref={body}>
      {highlight && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.4, 24]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
      )}
      {/* shadow blob */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28 * W, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} />
      </mesh>
      {/* legs */}
      {[[-0.085 * W, legL], [0.085 * W, legR]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, hipY, 0]}>
          <mesh position={[0, -0.38, 0]} castShadow>
            <cylinderGeometry args={[0.06 * W, 0.05 * W, 0.76, 8]} />
            <M c={legC} />
          </mesh>
          <mesh position={[0, -0.78, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.2]} />
            <M c={l.shoes} r={0.5} />
          </mesh>
        </group>
      ))}
      {/* skirt / dress / shorts */}
      {l.dress ? (
        <mesh position={[0, hipY + 0.32 - (l.dressLength * 0.85) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.16 * W, (0.16 + l.dressFlare + l.dressLength * 0.08) * W, 0.32 + l.dressLength * 0.85, 10]} />
          <M c={l.dress} />
        </mesh>
      ) : !l.trousers ? (
        <mesh position={[0, hipY - 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.16 * W, 0.22 * W, 0.42, 10]} />
          <M c={l.bottom} />
        </mesh>
      ) : (
        <mesh position={[0, hipY + 0.02, 0]} castShadow>
          <boxGeometry args={[0.3 * W, 0.14, 0.2 * W]} />
          <M c={l.bottom} />
        </mesh>
      )}
      {/* torso */}
      <mesh position={[0, hipY + 0.32, 0]} castShadow>
        <boxGeometry args={[torsoW, 0.5, 0.2 * W]} />
        <M c={l.dress || l.top} />
      </mesh>
      {!l.male && (
        <mesh position={[0, hipY + 0.42, 0.08 * W]} castShadow>
          <boxGeometry args={[torsoW * 0.85, 0.14, 0.08]} />
          <M c={l.dress || l.top} />
        </mesh>
      )}
      {/* arms */}
      {[[-(torsoW / 2 + 0.05), armL], [torsoW / 2 + 0.05, armR]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, hipY + 0.54, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.05 * W, 0.05 * W, 0.24, 8]} />
            <M c={l.dress || l.top} />
          </mesh>
          <mesh position={[0, -0.36, 0]} castShadow>
            <cylinderGeometry args={[0.04 * W, 0.035 * W, 0.26, 8]} />
            <M c={l.skin} />
          </mesh>
          {i === 1 && (ps === 'phone' || ps === 'dance') && (
            <mesh position={[0, -0.52, 0.03]}>
              <boxGeometry args={[0.07, 0.13, 0.015]} />
              <meshStandardMaterial color="#111" emissive="#7AB8FF" emissiveIntensity={0.4} />
            </mesh>
          )}
          {i === 1 && ps === 'drink' && (
            <mesh position={[0, -0.52, 0.04]}>
              <cylinderGeometry args={[0.035, 0.03, 0.09, 8]} />
              <meshStandardMaterial color="#E8F4FF" transparent opacity={0.8} />
            </mesh>
          )}
          {i === 1 && (carryBag || l.bag) && ps !== 'phone' && ps !== 'drink' && (
            <mesh position={[0.04, -0.55, 0]} castShadow>
              <boxGeometry args={[0.18, 0.16, 0.08]} />
              <M c={carryBag ? '#F4E4C8' : l.bag || '#7A2A2A'} />
            </mesh>
          )}
        </group>
      ))}
      {/* neck + head */}
      <mesh position={[0, hipY + 0.62, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.1, 8]} />
        <M c={l.skin} />
      </mesh>
      <mesh position={[0, hipY + 0.77, 0]} castShadow>
        <sphereGeometry args={[0.12, 14, 12]} />
        <M c={l.skin} r={0.6} />
      </mesh>
      {/* eyes so they read as facing forward */}
      {[-0.04, 0.04].map((x) => (
        <mesh key={x} position={[x, hipY + 0.79, 0.112]}>
          <sphereGeometry args={[0.014, 6, 6]} />
          <meshBasicMaterial color="#120806" />
        </mesh>
      ))}
      {/* hair */}
      {l.headwear ? (
        <mesh position={[0, hipY + 0.93, -0.01]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 0.2, 10]} />
          <M c={l.headwear} />
        </mesh>
      ) : (
        <Hair kind={l.hairKind} c={l.hair} y={hipY + 0.77} />
      )}
    </group>
  );
};

const Hair: React.FC<{ kind: FigureLook['hairKind']; c: string; y: number }> = ({ kind, c, y }) => {
  if (kind === 'bald') return null;
  const cap = (
    <mesh position={[0, y + 0.03, -0.012]} castShadow>
      <sphereGeometry args={[0.128, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      <M c={c} r={0.9} />
    </mesh>
  );
  switch (kind) {
    case 'long':
      return (
        <>
          {cap}
          <mesh position={[0, y - 0.18, -0.06]} castShadow>
            <boxGeometry args={[0.27, 0.42, 0.12]} />
            <M c={c} r={0.9} />
          </mesh>
        </>
      );
    case 'braids':
      return (
        <>
          {cap}
          {[-0.09, -0.03, 0.03, 0.09].map((x) => (
            <mesh key={x} position={[x, y - 0.22, -0.07]} castShadow>
              <cylinderGeometry args={[0.022, 0.018, 0.5, 6]} />
              <M c={c} r={0.9} />
            </mesh>
          ))}
        </>
      );
    case 'afro':
      return (
        <mesh position={[0, y + 0.06, -0.02]} castShadow>
          <sphereGeometry args={[0.2, 12, 10]} />
          <M c={c} r={1} />
        </mesh>
      );
    case 'bun':
      return (
        <>
          {cap}
          <mesh position={[0, y + 0.16, -0.04]} castShadow>
            <sphereGeometry args={[0.07, 10, 8]} />
            <M c={c} r={0.9} />
          </mesh>
        </>
      );
    case 'puff':
      return (
        <>
          {cap}
          <mesh position={[0, y + 0.17, -0.01]} castShadow>
            <sphereGeometry args={[0.12, 10, 8]} />
            <M c={c} r={1} />
          </mesh>
        </>
      );
    default:
      return cap;
  }
};

// ---------------------------------------------------------------------------
// Walking along a grid
// ---------------------------------------------------------------------------
export type Cell = [number, number];

/** A* over the floor grid; outside cells (z >= d) are always walkable. */
export function findPath(blocked: boolean[][], from: Cell, to: Cell, w: number, d: number): Cell[] {
  const key = (c: Cell) => `${c[0]},${c[1]}`;
  // Exterior paving runs along both sides and the full shop frontage.
  const free = (x: number, z: number) => x >= -1 && x <= w && z >= 0 && z <= d + 5 && (z >= d || x === -1 || x === w || (x >= 0 && x < w && !blocked[z]?.[x]));
  const door = Math.floor(w / 2);
  const open: { c: Cell; g: number; f: number }[] = [{ c: from, g: 0, f: 0 }];
  const came = new Map<string, Cell>();
  const gs = new Map<string, number>([[key(from), 0]]);
  const goal = key(to);
  let guard = 0;
  while (open.length && guard++ < 3000) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (key(cur.c) === goal) {
      const path: Cell[] = [cur.c];
      let k = key(cur.c);
      while (came.has(k)) {
        const p = came.get(k)!;
        path.unshift(p);
        k = key(p);
      }
      return path;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: Cell = [cur.c[0] + dx, cur.c[1] + dz];
      const nk = key(n);
      if (!free(n[0], n[1]) && nk !== goal) continue;
      // Only cross the shop's front wall at its door. Outside, the same
      // front pavement must connect to the left and right service lanes.
      const frontCrossing = (cur.c[1] === d - 1 && n[1] === d) || (cur.c[1] === d && n[1] === d - 1);
      const sideLane = cur.c[0] === -1 || cur.c[0] === w || n[0] === -1 || n[0] === w;
      if (frontCrossing && n[0] !== door && !sideLane) continue;
      // Side lanes are walkable, but never let a character pass through a side wall.
      if (n[1] < d && ((cur.c[0] === 0 && n[0] === -1) || (cur.c[0] === -1 && n[0] === 0) || (cur.c[0] === w - 1 && n[0] === w) || (cur.c[0] === w && n[0] === w - 1))) continue;
      const g = cur.g + 1;
      if (g < (gs.get(nk) ?? 1e9)) {
        gs.set(nk, g);
        came.set(nk, cur.c);
        open.push({ c: n, g, f: g + Math.abs(n[0] - to[0]) + Math.abs(n[1] - to[1]) });
      }
    }
  }
  return [from, to];
}

/**
 * A person who walks to `target` (a cell) along the grid. Starts at `spawn`.
 * Calls onArrive once when they get there.
 */
export const Walker: React.FC<{
  look: FigureLook;
  spawn: Cell;
  target: Cell;
  blocked: boolean[][];
  w: number;
  d: number;
  delay?: number;
  speed?: number;
  carryBag?: boolean;
  highlight?: boolean;
  faceCamera?: boolean;
  /** What they do once they get there. */
  pose?: Pose;
  /** Which way to face once there (radians); default toward the camera. */
  face?: number;
  /** Exact world-space cushion position for customers who are sitting. */
  seatPosition?: [number, number, number];
  /** Direction the customer faces while seated. */
  seatFace?: number;
  onArrive?: () => void;
  onClick?: () => void;
}> = ({ look, spawn, target, blocked, w, d, delay = 0, speed = 1.4, carryBag, highlight, pose, face, seatPosition, seatFace, onArrive, onClick }) => {
  const group = useRef<THREE.Group>(null);
  const state = useRef({ path: [] as Cell[], i: 0, pos: new THREE.Vector3(spawn[0] + 0.5, 0, spawn[1] + 0.5), wait: delay, arrived: false, key: '', walking: false });
  const [walking, setWalking] = React.useState(false);
  const tKey = `${target[0]},${target[1]}${seatPosition ? `|${seatPosition.join(',')}` : ''}`;
  if (state.current.key !== tKey) {
    const st = state.current;
    const fz = Math.floor(st.pos.z);
    const cur: Cell = [Math.max(fz >= d ? -1 : 0, Math.min(w, Math.floor(st.pos.x))), fz];
    st.path = findPath(blocked, cur, target, w, d);
    st.i = 1;
    st.arrived = false;
    st.key = tKey;
  }
  useFrame((_, dt) => {
    const st = state.current;
    const g = group.current;
    if (!g) return;
    if (st.wait > 0) {
      st.wait -= dt;
      g.visible = false;
      return;
    }
    g.visible = true;
    if (st.i < st.path.length) {
      st.pos.y = 0;
      const [cx, cz] = st.path[st.i];
      const tx = cx + 0.5;
      const tz = cz + 0.5;
      const dx = tx - st.pos.x;
      const dz = tz - st.pos.z;
      const dist = Math.hypot(dx, dz);
      const step = Math.min(dist, speed * dt);
      if (dist > 0.001) {
        st.pos.x += (dx / dist) * step;
        st.pos.z += (dz / dist) * step;
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dx, dz), 0.25);
      }
      if (dist < 0.02) st.i += 1;
      if (!st.walking) { st.walking = true; setWalking(true); }
    } else if (pose === 'sit' && seatPosition) {
      // The path ends on a walkable cell beside the furniture. Continue the last
      // short step onto the actual cushion instead of stopping beside/on air.
      const [sx, sy, sz] = seatPosition;
      const dx = sx - st.pos.x;
      const dz = sz - st.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.035) {
        const step = Math.min(dist, speed * dt);
        if (dist > 0.001) {
          st.pos.x += (dx / dist) * step;
          st.pos.z += (dz / dist) * step;
          g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dx, dz), 0.25);
        }
        st.pos.y = THREE.MathUtils.lerp(st.pos.y, sy, Math.min(1, dt * 8));
        if (!st.walking) { st.walking = true; setWalking(true); }
      } else {
        st.pos.set(sx, sy, sz);
        if (st.walking) { st.walking = false; setWalking(false); }
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, seatFace ?? 0.6, 0.12);
        if (!st.arrived) {
          st.arrived = true;
          onArrive?.();
        }
      }
    } else {
      if (st.walking) { st.walking = false; setWalking(false); }
      st.pos.y = 0;
      // face the shop front (toward the camera) while standing
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, face ?? 0.6, 0.08);
      if (!st.arrived) {
        st.arrived = true;
        onArrive?.();
      }
    }
    g.position.copy(st.pos);
  });
  return (
    <group
      ref={group}
      position={[spawn[0] + 0.5, 0, spawn[1] + 0.5]}
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => onClick && (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <Figure look={look} walking={walking} carryBag={carryBag} highlight={highlight} pose={pose} />
    </group>
  );
};
