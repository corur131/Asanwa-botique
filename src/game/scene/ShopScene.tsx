import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Pose } from '../types';
import { RoomStyle, finishes, room, cellsBlocked, footprint, furnitureById, wallLayout, Placed, canPlace, yardCapacity, Rot, rotAngle } from '../shop';
import { solarCap, source } from '../power';
import { stats } from '../engine';
import { ApplianceOn, CeilingPiece, FloorPiece, WallPiece, B, MirrorLive } from './Furniture3D';
import { Cell, FigureLook, Walker, lookToFigure } from './People';

export interface SceneProps {
  s: GameState;
  /** A floor piece in Divine's hands in build mode: where it would go. */
  placing: { uid: string; rot: Rot; x: number; z: number } | null;
  /** Build mode: grid on, taps select pieces to move. */
  build?: boolean;
  view?: View;
  selected: string | null;
  /** The placing cursor moved to a cell. */
  onHover?: (x: number, z: number) => void;
  /** Build mode: a piece was tapped (null: the floor). */
  onSelect: (uid: string | null) => void;
  /** Outside build mode: a piece was tapped. */
  onItem?: (uid: string) => void;
  /** Divine is using a piece. */
  act?: { uid: string; pose: Pose } | null;
  /** Live mirror reflections. */
  reflections?: boolean;
  onCustomer: (id: string) => void;
  night?: boolean;
  /** NEPA took light. */
  dark?: boolean;
}

/** Cells where people stand: the styling spot, Divine's spot, waiting spots, staff spots. */
export function spots(s: GameState) {
  const r = room(s.listing);
  const blocked = cellsBlocked(s.furniture, s.listing);
  const free = (x: number, z: number) => x >= 0 && x < r.w && z >= 0 && z < r.d && !blocked[z][x];
  const door: Cell = [Math.floor(r.w / 2), r.d - 1];
  const outside: Cell = [door[0], r.d + 2];
  // styling spot: in front of the best mirror
  let style: Cell | null = null;
  const placed = s.furniture.filter((p) => p.placed);
  const floorMirror = placed.filter((p) => ['standMirror', 'goldMirror'].includes(p.id)).sort((a, b) => (furnitureById(b.id).mirror || 0) - (furnitureById(a.id).mirror || 0))[0];
  if (floorMirror && free(floorMirror.x, floorMirror.z + 1)) style = [floorMirror.x, floorMirror.z + 1];
  if (!style) {
    const wl = wallLayout(s.furniture, s.listing);
    const wm = placed.find((p) => ['mirrorWall', 'crackedMirror'].includes(p.id) && wl[p.uid]);
    if (wm) {
      const at = wl[wm.uid];
      const c: Cell = at.side === 'back' ? [at.at, 0] : [0, at.at];
      for (const [dx, dz] of [[0, 0], [0, 1], [1, 0], [1, 1], [0, 2]]) if (free(c[0] + dx, c[1] + dz)) { style = [c[0] + dx, c[1] + dz]; break; }
    }
  }
  const all: Cell[] = [];
  for (let z = 0; z < r.d; z++) for (let x = 0; x < r.w; x++) if (free(x, z)) all.push([x, z]);
  if (!style) style = all.find((c) => c[1] < r.d - 1) || door;
  const taken = new Set([`${style[0]},${style[1]}`, `${door[0]},${door[1]}`]);
  const near = (c: Cell, list: Cell[]) => list.filter((x) => !taken.has(`${x[0]},${x[1]}`)).sort((a, b) => Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) - Math.abs(b[0] - c[0]) - Math.abs(b[1] - c[1]));
  const divine = near(style, all)[0] || style;
  taken.add(`${divine[0]},${divine[1]}`);
  // waiting: next to seats first, then along the front
  const seats = placed.filter((p) => (furnitureById(p.id).seats || 0) > 0);
  const waitPool: Cell[] = [];
  const seatWaitPool: { cell: Cell; position: [number, number, number]; face: number }[] = [];
  const seatLayout = (id: string, count: number): { x: number; z: number; top: number }[] => {
    switch (id) {
      case 'plasticChair': return [{ x: 0, z: 0.02, top: 0.44 }];
      case 'stool': return [{ x: 0, z: 0, top: 0.5 }];
      case 'bench': return [{ x: -0.55, z: 0, top: 0.485 }, { x: 0, z: 0, top: 0.485 }, { x: 0.55, z: 0, top: 0.485 }];
      case 'ottoman': return [{ x: -0.18, z: 0, top: 0.47 }, { x: 0.18, z: 0, top: 0.47 }];
      case 'sofa': return [{ x: -0.63, z: 0.02, top: 0.55 }, { x: -0.21, z: 0.02, top: 0.55 }, { x: 0.21, z: 0.02, top: 0.55 }, { x: 0.63, z: 0.02, top: 0.55 }];
      case 'velvetSofa': return [{ x: -1.0, z: 0.02, top: 0.55 }, { x: -0.6, z: 0.02, top: 0.55 }, { x: -0.2, z: 0.02, top: 0.55 }, { x: 0.2, z: 0.02, top: 0.55 }, { x: 0.6, z: 0.02, top: 0.55 }, { x: 1.0, z: 0.02, top: 0.55 }];
      case 'doubleSofa': return [{ x: -0.65, z: 0.02, top: 0.55 }, { x: -0.325, z: 0.02, top: 0.55 }, { x: 0, z: 0.02, top: 0.55 }, { x: 0.325, z: 0.02, top: 0.55 }, { x: 0.65, z: 0.02, top: 0.55 }];
      case 'luxeOttoman': return [{ x: -0.17, z: 0, top: 0.51 }, { x: 0.17, z: 0, top: 0.51 }];
      case 'shoeBench': return [{ x: -0.52, z: 0, top: 0.48 }, { x: 0.52, z: 0, top: 0.48 }];
      default: {
        const spread = count > 1 ? Math.min(0.42, 0.9 / (count - 1)) : 0;
        return Array.from({ length: count }, (_, i) => ({ x: (i - (count - 1) / 2) * spread, z: 0, top: 0.46 }));
      }
    }
  };
  for (const st of seats) {
    const f = furnitureById(st.id);
    const count = Math.max(1, f.seats || 1);
    const { w, d } = footprint(st);
    const centerX = st.x + w / 2;
    const centerZ = st.z + d / 2;
    const angle = rotAngle(st.rot);
    // Find walking cells immediately in front of the actual furniture, then
    // assign each arriving customer a real seat coordinate on its cushion.
    const frontDist = f.d / 2 + 0.1;
    const frontX = centerX + Math.sin(angle) * frontDist;
    const frontZ = centerZ + Math.cos(angle) * frontDist;
    const frontCell: Cell = [
      Math.max(0, Math.min(r.w - 1, Math.floor(frontX))),
      Math.max(0, Math.min(r.d - 1, Math.floor(frontZ))),
    ];
    const approaches = near(frontCell, all).slice(0, count);
    const offsets = seatLayout(st.id, count);
    approaches.forEach((c, i) => {
      const offset = offsets[i] || { x: 0, z: 0, top: 0.46 };
      const x = centerX + Math.cos(angle) * offset.x + Math.sin(angle) * offset.z;
      const z = centerZ - Math.sin(angle) * offset.x + Math.cos(angle) * offset.z;
      // Figure's seated hip pivot is 0.46 m above its floor-level root.
      // Put that pivot at the cushion top, rather than lifting the whole person.
      const y = Math.max(0, offset.top - 0.46);
      waitPool.push(c);
      seatWaitPool.push({ cell: c, position: [x, y, z], face: angle });
      taken.add(`${c[0]},${c[1]}`);
    });
  }
  for (const c of near([r.w - 1, r.d - 1], all)) { waitPool.push(c); taken.add(`${c[0]},${c[1]}`); }
  const staff = near([0, 0], all).slice(0, 6);
  staff.forEach((c) => taken.add(`${c[0]},${c[1]}`));
  const staffClient = staff.map((c) => {
    const n = near(c, all)[0] || c;
    taken.add(`${n[0]},${n[1]}`);
    return n;
  });
  const availableForCustomers = (c: Cell) => !staff.some((x) => x[0] === c[0] && x[1] === c[1]) && !staffClient.some((x) => x[0] === c[0] && x[1] === c[1]);
  const wait = waitPool.filter(availableForCustomers);
  const seatWait = seatWaitPool.filter((seat) => availableForCustomers(seat.cell));
  // overflow queue on the pavement outside the door
  const street: Cell[] = Array.from({ length: 12 }, (_, k) => [door[0] + [1, -1, 2, -2][k % 4], r.d + 1 + Math.floor(k / 4)] as Cell);
  return { door, outside, style, divine, wait, seatWait, staff, staffClient, street };
}

export function Room({ r, tier, painted }: { r: RoomStyle; tier: number; painted?: boolean }) {
  const H = r.height;
  const tiles = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let z = 0; z < r.d; z++)
      for (let x = 0; x < r.w; x++)
        out.push(
          <mesh key={`${x}-${z}`} position={[x + 0.5, -0.025, z + 0.5]} receiveShadow>
            <boxGeometry args={[0.98, 0.05, 0.98]} />
            <meshStandardMaterial color={(x + z) % 2 ? r.floor : r.floor2} roughness={r.kind === 'marble' || r.kind === 'flagship' ? 0.25 : 0.9} metalness={r.kind === 'flagship' ? 0.1 : 0} />
          </mesh>,
        );
    return out;
  }, [r]);
  const door = Math.floor(r.w / 2);
  const ridges = r.kind === 'container';
  return (
    <group>
      {/* street around the shop */}
      <mesh position={[r.w / 2, -0.07, r.d / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(r.w, r.d) * 1.1 + 4, 48]} />
        <meshStandardMaterial color={tier >= 3 ? '#5E7048' : '#6E6A58'} roughness={1} />
      </mesh>
      <mesh position={[r.w / 2, -0.06, r.d + 1.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[r.w + 6, 2.2]} />
        <meshStandardMaterial color="#9A968A" roughness={1} />
      </mesh>
      {tiles}
      {/* back wall */}
      <B p={[r.w / 2, H / 2, -0.06]} s={[r.w + 0.12, H, 0.12]} c={r.wall} r={ridges ? 0.6 : 0.9} m={ridges ? 0.3 : 0} />
      <B p={[r.w / 2, 0.35, 0.005]} s={[r.w, 0.7, 0.02]} c={r.wallLow} />
      {/* left wall */}
      <B p={[-0.06, H / 2, r.d / 2]} s={[0.12, H, r.d + 0.12]} c={r.wall} r={ridges ? 0.6 : 0.9} m={ridges ? 0.3 : 0} />
      <B p={[0.005, 0.35, r.d / 2]} s={[0.02, 0.7, r.d]} c={r.wallLow} />
      {/* low cutaway walls at the front and right */}
      <B p={[r.w + 0.06, 0.3, r.d / 2]} s={[0.12, 0.6, r.d + 0.12]} c={r.wall} />
      <B p={[door / 2, 0.3, r.d + 0.06]} s={[door, 0.6, 0.12]} c={r.wall} />
      <B p={[door + 1 + (r.w - door - 1) / 2, 0.3, r.d + 0.06]} s={[r.w - door - 1, 0.6, 0.12]} c={r.wall} />
      {/* trim */}
      <B p={[r.w / 2, H - 0.05, 0.01]} s={[r.w, 0.1, 0.03]} c={r.trim} m={r.kind === 'marble' || r.kind === 'flagship' ? 0.8 : 0} />
      <B p={[0.01, H - 0.05, r.d / 2]} s={[0.03, 0.1, r.d]} c={r.trim} m={r.kind === 'marble' || r.kind === 'flagship' ? 0.8 : 0} />
      {ridges &&
        Array.from({ length: Math.floor(r.w / 0.25) }, (_, i) => <B key={`rb${i}`} p={[0.12 + i * 0.25, H / 2, 0.01]} s={[0.05, H, 0.03]} c={painted ? r.wallLow : '#4E6670'} m={0.3} r={0.6} />)}
      {ridges &&
        Array.from({ length: Math.floor(r.d / 0.25) }, (_, i) => <B key={`rl${i}`} p={[0.01, H / 2, 0.12 + i * 0.25]} s={[0.03, H, 0.05]} c={painted ? r.wallLow : "#4E6670"} m={0.3} r={0.6} />)}
      {ridges && !painted && (
        <>
          {/* rust and peeling paint */}
          <B p={[1.2, 0.9, 0.03]} s={[0.6, 0.4, 0.01]} c="#8A4B2A" o={0.7} />
          <B p={[3.8, 1.8, 0.03]} s={[0.5, 0.3, 0.01]} c="#8A4B2A" o={0.6} />
          <B p={[0.03, 1.2, 2.2]} s={[0.01, 0.5, 0.7]} c="#9A5A2E" o={0.6} />
        </>
      )}
      {r.kind === 'plaster' && (
        <>
          <B p={[2.5, 1.9, 0.03]} s={[0.9, 0.5, 0.01]} c="#8A7A5A" o={0.25} />
          <B p={[0.03, 1.4, 3]} s={[0.01, 0.6, 0.8]} c="#8A7A5A" o={0.25} />
        </>
      )}
      {r.kind === 'flagship' && <B p={[r.w / 2, 1.6, 0.02]} s={[r.w - 0.4, 0.03, 0.01]} c={r.trim} m={0.9} e={r.trim} ei={0.3} />}
      {/* how well kept the place is */}
      {r.finish === 1 && r.kind !== 'container' && (
        <>
          <B p={[r.w * 0.3, 0.6, 0.03]} s={[0.8, 0.5, 0.01]} c="#5A4A36" o={0.35} />
          <B p={[r.w * 0.72, 1.7, 0.03]} s={[0.6, 0.9, 0.01]} c="#5A4A36" o={0.3} />
          <B p={[0.03, 1.1, r.d * 0.6]} s={[0.01, 0.7, 0.9]} c="#5A4A36" o={0.3} />
          <B p={[r.w * 0.55, 0.004, r.d * 0.45]} s={[1.6, 0.006, 0.08]} c="#3A3530" o={0.5} />
        </>
      )}
      {r.finish >= 3 && (
        <>
          <B p={[r.w / 2, 0.95, 0.02]} s={[r.w, 0.05, 0.03]} c={r.trim} m={r.kind === 'marble' || r.kind === 'flagship' ? 0.8 : 0.1} />
          <B p={[0.02, 0.95, r.d / 2]} s={[0.03, 0.05, r.d]} c={r.trim} m={r.kind === 'marble' || r.kind === 'flagship' ? 0.8 : 0.1} />
        </>
      )}
      {r.finish === 4 && (
        <>
          {/* feature wall and a warm light strip along the top */}
          <B p={[r.w / 2, H * 0.55, 0.025]} s={[Math.min(4, r.w * 0.4), H * 0.7, 0.02]} c={r.kind === 'flagship' ? '#2A2430' : r.trim} o={r.kind === 'flagship' ? 1 : 0.35} m={0.2} />
          <B p={[r.w / 2, H - 0.14, 0.04]} s={[r.w - 0.2, 0.03, 0.03]} c="#FFE7B0" e="#FFD27A" ei={1.2} />
          <B p={[0.04, H - 0.14, r.d / 2]} s={[0.03, 0.03, r.d - 0.2]} c="#FFE7B0" e="#FFD27A" ei={1.2} />
        </>
      )}
      {/* door mat */}
      <B p={[door + 0.5, 0.008, r.d - 0.35]} s={[0.8, 0.012, 0.45]} c="#8A6A44" />
      <B p={[door + 0.5, 0.01, r.d + 0.06]} s={[1, 0.02, 0.14]} c="#9A968C" />
    </group>
  );
}

/** Yard pieces in the order they stand: solar at the back, generators nearest the street. */
const yardOrder = (s: GameState) => s.furniture.filter((p) => p.placed && furnitureById(p.id).mount === 'yard').sort((a, b) => Number(!!furnitureById(a.id).gen) - Number(!!furnitureById(b.id).gen));

/** Which mirrors get a live reflection: the one or two biggest. */
function liveMirrorUids(s: GameState, on: boolean): Set<string> {
  if (!on) return new Set();
  const area = (id: string) => ({ mirrorWall: 6, wallMirror: 2.4, goldMirror: 1.2, archMirror: 1.1, standMirror: 0.9, vanity: 0.8, makeupStation: 0.7, crackedMirror: 0.6 } as Record<string, number>)[id] || 0;
  const ms = s.furniture.filter((p) => p.placed && area(p.id) > 0).sort((a, b) => area(b.id) - area(a.id));
  const n = ms[0] && area(ms[0].id) >= 2.4 ? 1 : 2; // one big wall mirror is enough
  return new Set(ms.slice(0, n).filter((p) => area(p.id) >= 0.9).map((p) => p.uid));
}

/** Where Divine stands to use a piece, and which way she faces. */
export function actionSpot(s: GameState, uid: string): { cell: Cell; face: number; onIt?: boolean; stand?: boolean } | null {
  const p = s.furniture.find((x) => x.uid === uid && x.placed);
  if (!p) return null;
  const f = furnitureById(p.id);
  const r = room(s.listing);
  const blocked = cellsBlocked(s.furniture, s.listing);
  const free = (x: number, z: number) => x >= 0 && x < r.w && z >= 0 && z < r.d && !blocked[z][x];
  const faceTo = (c: Cell, tx: number, tz: number) => Math.atan2(tx - (c[0] + 0.5), tz - (c[1] + 0.5));
  if (f.mount === 'yard') {
    const i = yardOrder(s).findIndex((x) => x.uid === uid);
    const cell: Cell = [r.w, i];
    return { cell, face: Math.PI / 2 };
  }
  if (f.mount === 'wall') {
    const at = wallLayout(s.furniture, s.listing)[uid];
    if (!at) return null;
    const mid = Math.min(Math.floor(at.at + f.w / 2), at.side === 'back' ? r.w - 1 : r.d - 2);
    const cands: Cell[] = at.side === 'back' ? [[mid, 0], [mid, 1], [mid - 1, 0], [mid + 1, 0], [mid, 2]] : [[0, mid], [1, mid], [0, mid - 1], [0, mid + 1], [2, mid]];
    const cell = cands.find((c) => free(c[0], c[1])) || cands[0];
    return { cell, face: at.side === 'back' ? Math.PI : -Math.PI / 2 };
  }
  if (f.mount === 'ceiling') {
    const ceiling = s.furniture.filter((x) => x.placed && furnitureById(x.id).mount === 'ceiling');
    const i = ceiling.findIndex((x) => x.uid === uid);
    const cx = Math.floor(((i + 1) * r.w) / (ceiling.length + 1));
    const cell: Cell = [Math.min(r.w - 1, cx), Math.floor(r.d / 2)];
    return { cell, face: 0.6 };
  }
  const { w, d } = footprint(p);
  const mx = p.x + w / 2;
  const mz = p.z + d / 2;
  // cells Divine can actually get to from the door
  const seen = new Set<string>();
  const stack: Cell[] = [[Math.floor(r.w / 2), r.d - 1]];
  while (stack.length) {
    const [x, z] = stack.pop()!;
    const k = `${x},${z}`;
    if (seen.has(k) || !free(x, z)) continue;
    seen.add(k);
    stack.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
  }
  const reach = (c: Cell) => seen.has(`${c[0]},${c[1]}`);
  const touching = (c: Cell) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => reach([c[0] + dx, c[1] + dz]));
  if (f.group === 'Seating') {
    const seatCells: Cell[] = [];
    for (let x = p.x; x < p.x + w; x++) for (let z = p.z; z < p.z + d; z++) seatCells.push([x, z]);
    const seat = seatCells.find(touching);
    if (seat) return { cell: seat, face: rotAngle(p.rot), onIt: true };
  }
  const ring: Cell[] = [];
  for (let x = p.x; x < p.x + w; x++) ring.push([x, p.z + d]);
  for (let z = p.z; z < p.z + d; z++) ring.push([p.x - 1, z], [p.x + w, z]);
  for (let x = p.x; x < p.x + w; x++) ring.push([x, p.z - 1]);
  let cell = ring.find(reach);
  if (!cell) {
    // boxed in: the nearest cell she can reach
    const all = [...seen].map((k) => k.split(',').map(Number) as Cell);
    cell = all.sort((a2, b2) => Math.hypot(a2[0] + 0.5 - mx, a2[1] + 0.5 - mz) - Math.hypot(b2[0] + 0.5 - mx, b2[1] + 0.5 - mz))[0] || ring[0];
  }
  return { cell, face: faceTo(cell, mx, mz), stand: f.group === 'Seating' };
}

function Shaker({ on, children }: { on: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    g.current.position.x = on ? Math.sin(t * 61) * 0.012 : 0;
    g.current.position.z = on ? Math.cos(t * 53) * 0.01 : 0;
    g.current.rotation.z = on ? Math.sin(t * 47) * 0.012 : 0;
  });
  return <group ref={g}>{children}</group>;
}

/** Grey puffs from the exhaust while the generator runs. */
function Smoke({ at, dense }: { at: [number, number, number]; dense: boolean }) {
  const puffs = useRef<(THREE.Mesh | null)[]>([]);
  const n = dense ? 7 : 4;
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const k = ((t * 0.55 + i / n) % 1);
      m.position.set(at[0] + k * 0.25 + Math.sin(t + i) * 0.04, at[1] + k * 1.3, at[2] + Math.cos(t * 0.7 + i) * 0.05);
      const sc = (dense ? 0.08 : 0.06) + k * (dense ? 0.3 : 0.22);
      m.scale.setScalar(sc);
      ((m.material as THREE.MeshStandardMaterial).opacity = (1 - k) * (dense ? 0.75 : 0.45));
    });
  });
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} ref={(el) => { puffs.current[i] = el; }}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={dense ? '#4A4A4A' : '#8A8A8A'} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The yard outside the right wall: generators and solar panels. */
function Yard({ s, selected, onTap }: { s: GameState; selected: string | null; onTap: (uid: string) => void }) {
  const r = room(s.listing);
  const items = yardOrder(s);
  const cap = yardCapacity(s.listing);
  const src = s.phase === 'shop' ? source(s) : 'grid';
  const cap2 = solarCap(s);
  const charge = s.power?.solar || 0;
  const led = src === 'solar' ? '#22E06A' : charge <= 0.5 ? '#FF3030' : charge < cap2 - 0.5 && s.phase === 'shop' && src === 'grid' && s.clock < 600 ? '#FFB020' : '#22E06A';
  const ledI = src === 'solar' ? 2.4 : 1.4;
  const st = stats(s);
  const running = !!s.power?.gen && src === 'gen';
  const X = r.w + 1.5;
  return (
    <group>
      {/* concrete strip with a low fence */}
      <mesh position={[X, -0.045, cap / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.9, cap + 0.2]} />
        <meshStandardMaterial color="#8E8A80" roughness={1} />
      </mesh>
      <B p={[X + 0.95, 0.35, cap / 2]} s={[0.06, 0.7, cap + 0.2]} c="#6A5A48" />
      {items.map((p, i) => {
        const f = furnitureById(p.id);
        const z = 0.5 + i;
        const tap = (e: { stopPropagation: () => void }) => { e.stopPropagation(); onTap(p.uid); };
        return (
          <group key={p.uid} position={[X, 0, z]} rotation={[0, -Math.PI / 2, 0]} onClick={tap} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
            {f.gen ? (
              <>
                <Shaker on={running && st.gen === f.gen}>
                  <FloorPiece id={p.id} colors={[]} />
                </Shaker>
                {running && st.gen === f.gen && <Smoke at={[0.3, 0.45, 0.1]} dense={f.gen === 'small'} />}
              </>
            ) : p.id === 'umbrellaCanopy' ? (
              <group>
                {/* A real street parasol: weighted foot, pole, broad fabric canopy and scalloped edge. */}
                <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.25, 0.25, 0.12, 20]} /><meshStandardMaterial color="#51483F" /></mesh>
                <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 1.85, 12]} /><meshStandardMaterial color="#C9CED6" metalness={0.65} /></mesh>
                <mesh position={[0, 1.92, 0]}>
                  <coneGeometry args={[0.9, 0.32, 10]} />
                  <meshStandardMaterial color="#C2262E" roughness={0.75} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 1.94, 0]}>
                  <torusGeometry args={[0.72, 0.028, 6, 24]} />
                  <meshStandardMaterial color="#F4EFE6" roughness={0.75} />
                </mesh>
                {Array.from({ length: 10 }, (_, i) => {
                  const a = (i * Math.PI * 2) / 10;
                  return <B key={i} p={[Math.cos(a) * 0.48, 1.98, Math.sin(a) * 0.48]} s={[0.035, 0.2, 0.035]} c="#E8B84A" rot={[0, -a, 0]} />;
                })}
                <mesh position={[0, 2.1, 0]} castShadow><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color="#D4AF37" metalness={0.8} /></mesh>
              </group>
            ) : (
              <group>
                {/* Tilted photovoltaic panel with cell grid, legs, and the charge controller below. */}
                <B p={[-0.35, 0.55, -0.2]} s={[0.05, 1.1, 0.05]} c="#888" m={0.6} />
                <B p={[0.35, 0.75, -0.2]} s={[0.05, 1.5, 0.05]} c="#888" m={0.6} />
                <B p={[0, 1.2, -0.2]} s={[0.98, 0.05, 0.78]} c="#303A50" m={0.65} r={0.25} rot={[0.5, 0, 0]} />
                <B p={[0, 1.225, -0.18]} s={[0.91, 0.012, 0.69]} c="#173B69" m={0.55} r={0.18} rot={[0.5, 0, 0]} />
                {[-0.3, -0.1, 0.1, 0.3].map((x) => <B key={x} p={[x, 1.24, -0.17]} s={[0.012, 0.012, 0.67]} c="#8DB9E7" rot={[0.5, 0, 0]} />)}
                {[-0.18, 0, 0.18].map((z) => <B key={z} p={[0, 1.24, -0.18 + z]} s={[0.9, 0.012, 0.012]} c="#8DB9E7" rot={[0.5, 0, 0]} />)}
                <B p={[0, 0.22, 0.25]} s={[0.42, 0.44, 0.26]} c="#E9EEF2" r={0.45} />
                <B p={[0, 0.25, 0.385]} s={[0.26, 0.16, 0.012]} c="#202B45" />
                <B p={[-0.07, 0.34, 0.392]} s={[0.14, 0.045, 0.01]} c="#123" e="#3AA0D0" ei={0.4} />
                <mesh position={[0.1, 0.34, 0.395]}>
                  <sphereGeometry args={[0.03, 10, 8]} />
                  <meshStandardMaterial color={led} emissive={led} emissiveIntensity={ledI} />
                </mesh>
                <mesh position={[0, 0.45, 0.25]}>
                  <sphereGeometry args={[0.035, 10, 8]} />
                  <meshStandardMaterial color={led} emissive={led} emissiveIntensity={ledI} />
                </mesh>
              </group>
            )}
            {selected === p.uid && <B p={[0, 0.012, 0]} s={[0.96, 0.02, 0.96]} c="#F59E0B" e="#F59E0B" ei={0.6} o={0.5} />}
          </group>
        );
      })}
    </group>
  );
}

function Furniture({ s, selected, placing, onTap, dark, reflections }: Pick<SceneProps, 's' | 'selected' | 'placing' | 'dark' | 'reflections'> & { onTap: (uid: string) => void }) {
  const r = room(s.listing);
  const wl = wallLayout(s.furniture, s.listing);
  const live = useMemo(() => liveMirrorUids(s, reflections !== false), [s.furniture, reflections]); // eslint-disable-line react-hooks/exhaustive-deps
  // colours of displayed stock, shared out to display furniture
  const shown = s.stock.filter((d) => d.displayed && d.pieces > 0);
  let cursor = 0;
  const take = (n: number) => {
    const out = shown.slice(cursor, cursor + n).map((d) => d.color);
    cursor += n;
    return out;
  };
  const ceiling = s.furniture.filter((p) => p.placed && furnitureById(p.id).mount === 'ceiling');
  // fans run when there is light (NEPA, solar or gen)
  const powered = !dark;
  const hover = { onPointerOver: () => (document.body.style.cursor = 'pointer'), onPointerOut: () => (document.body.style.cursor = '') };
  return (
    <group>
      {s.furniture.filter((p) => p.placed).map((p) => {
        const f = furnitureById(p.id);
        if (f.mount === 'ceiling' || f.mount === 'finish' || f.mount === 'yard') return null;
        if (placing?.uid === p.uid) return null;
        const colors = f.slots ? take(f.slots) : [];
        const click = (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onTap(p.uid);
        };
        if (f.mount === 'wall') {
          const at = wl[p.uid];
          if (!at) return null;
          const pos: [number, number, number] = at.side === 'back' ? [at.at + f.w / 2, 0, 0] : [0, 0, at.at + f.w / 2];
          return (
            <group key={p.uid} position={pos} rotation={[0, at.side === 'back' ? 0 : Math.PI / 2, 0]} onClick={click} {...hover}>
              <MirrorLive.Provider value={live.has(p.uid)}>
                <WallPiece id={p.id} colors={colors} />
              </MirrorLive.Provider>
              {selected === p.uid && <B p={[0, 0.05, 0.3]} s={[f.w, 0.03, 0.5]} c="#F59E0B" e="#F59E0B" ei={0.6} o={0.6} />}
            </group>
          );
        }
        const { w, d } = footprint(p);
        return (
          <group key={p.uid} position={[p.x + w / 2, 0, p.z + d / 2]} rotation={[0, rotAngle(p.rot), 0]} onClick={click} {...hover}>
            <MirrorLive.Provider value={live.has(p.uid)}>
              <ApplianceOn.Provider value={powered && !s.off?.[p.uid]}>
                <FloorPiece id={p.id} colors={colors} />
              </ApplianceOn.Provider>
            </MirrorLive.Provider>
            {selected === p.uid && <B p={[0, 0.012, 0]} s={[f.w - 0.04, 0.02, f.d - 0.04]} c="#F59E0B" e="#F59E0B" ei={0.6} o={0.5} />}
          </group>
        );
      })}
      <Yard s={s} selected={selected} onTap={onTap} />
      {ceiling.map((p, i) => (
        <group key={p.uid} onClick={(e) => { e.stopPropagation(); onTap(p.uid); }} {...hover}>
          <CeilingPiece id={p.id} off={dark || !!s.off?.[p.uid]} h={r.height} at={[((i + 1) * r.w) / (ceiling.length + 1), 0, r.d / 2 - 0.3]} />
          {selected === p.uid && <B p={[((i + 1) * r.w) / (ceiling.length + 1), r.height - 0.05, r.d / 2 - 0.3]} s={[0.8, 0.04, 0.8]} c="#F59E0B" e="#F59E0B" ei={0.6} o={0.6} />}
        </group>
      ))}
    </group>
  );
}

function PlacingGhost({ s, placing }: { s: GameState; placing: NonNullable<SceneProps['placing']> }) {
  const p = s.furniture.find((x) => x.uid === placing.uid);
  if (!p) return null;
  const cand: Placed = { ...p, x: placing.x, z: placing.z, rot: placing.rot, placed: true };
  const ok = canPlace(s.furniture, s.listing, cand);
  const { w, d } = footprint(cand);
  return (
    <group position={[placing.x + w / 2, 0, placing.z + d / 2]}>
      <group rotation={[0, rotAngle(placing.rot), 0]}>
        <FloorPiece id={p.id} colors={[]} />
      </group>
      <B p={[0, 0.03, 0]} s={[w - 0.04, 0.04, d - 0.04]} c={ok ? '#22C55E' : '#EF4444'} o={0.45} e={ok ? '#22C55E' : '#EF4444'} ei={0.5} />
    </group>
  );
}

/** Build-mode floor grid; the front walkway row is shaded. */
function BuildGrid({ r }: { r: RoomStyle }) {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= r.w; x++) lines.push(<mesh key={`x${x}`} position={[x, 0.012, r.d / 2]}><boxGeometry args={[0.05, 0.004, r.d]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.55} depthWrite={false} /></mesh>);
  for (let z = 0; z <= r.d; z++) lines.push(<mesh key={`z${z}`} position={[r.w / 2, 0.012, z]}><boxGeometry args={[r.w, 0.004, 0.05]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.55} depthWrite={false} /></mesh>);
  return (
    <group>
      {lines}
      <B p={[r.w / 2, 0.005, r.d - 0.5]} s={[r.w, 0.003, 1]} c="#F59E0B" o={0.18} />
    </group>
  );
}

export type View = 'angle' | 'top' | 'front' | 'free';

/** Moves the camera when the view changes. */
function CameraRig({ view, r }: { view: View; r: RoomStyle }) {
  const { camera } = useThree();
  const controls = useThree((st) => st.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const cx = r.w / 2;
  const cz = r.d / 2;
  const dist = Math.max(r.w, r.d) * 1.25 + 3;
  useEffect(() => {
    const pos: Record<View, [number, number, number]> = {
      angle: [cx + dist * 0.75, dist * 0.95, cz + dist * 1.05],
      top: [cx, dist * 1.75, cz + 0.01],
      front: [cx, 1.9, cz + dist * 1.35],
      free: [cx - dist * 0.8, dist * 0.7, cz + dist * 1.0],
    };
    camera.position.set(...pos[view]);
    if (controls) {
      controls.target.set(cx, view === 'front' ? 1.1 : 0.6, cz);
      controls.update();
    } else camera.lookAt(cx, 0.6, cz);
  }, [view, cx, cz, dist, camera, controls]);
  return null;
}

export default function ShopScene(p: SceneProps) {
  const { s } = p;
  const view = p.view || 'angle';
  const r = room(s.listing);
  const fin = finishes(s.furniture);
  const dressed: RoomStyle = { ...r, ...(fin.paint?.paint ? { wall: fin.paint.paint[0], wallLow: fin.paint.paint[1] } : {}), ...(fin.floor?.floorTiles ? { floor: fin.floor.floorTiles[0], floor2: fin.floor.floorTiles[1] } : {}) };
  const blocked = useMemo(() => cellsBlocked(s.furniture, s.listing), [s.furniture, s.listing]);
  const sp = useMemo(() => spots(s), [s.furniture, s.listing]); // eslint-disable-line react-hooks/exhaustive-deps
  const cx = r.w / 2;
  const cz = r.d / 2;
  const dist = Math.max(r.w, r.d) * 1.25 + 3;
  const tap = (uid: string) => (p.build ? p.onSelect(uid) : p.onItem ? p.onItem(uid) : p.onSelect(uid));

  // people
  const divineLook = useMemo<FigureLook>(() => lookToFigure(s.divine), [s.divine]);
  const lastSpot = useRef<Record<string, Cell>>({});
  const gone = useRef<Set<string> | null>(null);
  if (gone.current === null) gone.current = new Set((s.left || []).map((l) => l.key));
  const [, rerender] = useState(0);
  const people: React.ReactNode[] = [];
  // Divine: at work, busy with a piece of furniture, or out of the way in build mode
  const act = p.act ? actionSpot(s, p.act.uid) : null;
  const divineAt: Cell = p.build ? [Math.min(r.w, sp.door[0] + 2), r.d + 1] : act ? act.cell : sp.divine;
  const tired = s.energy !== undefined && s.energy < 30;
  people.push(<Walker key="divine" look={divineLook} spawn={sp.divine} target={divineAt} blocked={blocked} w={r.w} d={r.d} speed={tired ? 0.85 : 1.4} pose={act && !p.build ? (act.stand ? 'stand' : p.act!.pose) : undefined} face={act && !p.build ? act.face : undefined} />);
  s.staff.forEach((m, i) => {
    const c = p.build ? ([Math.max(-1, sp.door[0] - 2 - i), r.d + 1] as Cell) : sp.staff[i] || sp.divine;
    people.push(<Walker key={m.id} look={lookToFigure(m.look)} spawn={sp.staff[i] || sp.divine} target={c} blocked={blocked} w={r.w} d={r.d} />);
  });
  if (s.phase === 'shop') {
    let k = 0;
    const queue = [...s.inShop].sort((a, b) => a.arrived - b.arrived);
    for (const v of queue) {
      let target: Cell;
      if (v.by === 'divine') target = sp.style;
      else if (v.by) {
        const i = s.staff.findIndex((m) => m.id === v.by);
        target = sp.staffClient[i] || sp.style;
      } else {
        target = sp.wait[k] || sp.street[k - sp.wait.length] || sp.outside;
        k++;
      }
      lastSpot.current[v.c.id] = target;
      const seat = !v.by ? sp.seatWait.find((item) => item.cell[0] === target[0] && item.cell[1] === target[1]) : undefined;
      const mine = v.by === 'divine';
      const clickable = !v.by || mine;
      people.push(
        <Walker
          key={v.c.id}
          look={lookToFigure(v.c.look)}
          spawn={sp.outside}
          target={target}
          blocked={blocked}
          w={r.w}
          d={r.d}
          highlight={mine || (!s.serving && !v.by && k === 1)}
          pose={seat ? 'sit' : undefined}
          seatPosition={seat?.position}
          seatFace={seat?.face}
          onClick={clickable ? () => p.onCustomer(v.c.id) : undefined}
        />,
      );
    }
  }
  if (s.phase === 'shop' && s.visit) {
    const rv = s.rivals?.find((x) => x.id === s.visit!.rivalId);
    const target = s.visit.target ? lastSpot.current[s.visit.target] : undefined;
    const near: Cell = target ? [Math.min(rv ? r.w - 1 : 0, target[0] + 1), target[1]] : [sp.door[0], r.d - 1];
    if (rv) people.push(<Walker key={`visit-${rv.id}-${s.visit.at}`} look={lookToFigure(rv.look)} spawn={sp.outside} target={near} blocked={blocked} w={r.w} d={r.d} highlight />);
  }
  for (const l of s.left || []) {
    if (gone.current.has(l.key)) continue;
    people.push(
      <Walker
        key={`out-${l.key}`}
        look={lookToFigure(l.look)}
        spawn={lastSpot.current[l.id] || sp.style}
        target={sp.outside}
        blocked={blocked}
        w={r.w}
        d={r.d}
        carryBag={l.bag}
        onArrive={() => {
          gone.current!.add(l.key);
          rerender((n) => n + 1);
        }}
      />,
    );
  }

  const free = view === 'free';
  const top = view === 'top';
  const cellAt = (e: { point: THREE.Vector3 }) => {
    if (!p.placing) return null;
    const fp = s.furniture.find((x) => x.uid === p.placing!.uid);
    const { w, d } = fp ? footprint({ id: fp.id, rot: p.placing.rot }) : { w: 1, d: 1 };
    return [Math.floor(e.point.x - w / 2 + 0.5), Math.floor(e.point.z - d / 2 + 0.5)] as Cell;
  };
  return (
    <div style={{ width: '100%', height: '100%', touchAction: 'none' }}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 32, position: [cx + dist * 0.75, dist * 0.95, cz + dist * 1.05], near: 0.1, far: 200 }} style={{ background: p.night ? 'linear-gradient(#0b0d1a,#1a1630)' : 'linear-gradient(#24305a,#3a4a7a)' }}>
        <ambientLight intensity={p.night ? 0.35 : p.dark ? 0.14 : 0.6} />
        <hemisphereLight args={['#FFF4E0', '#3A3A50', p.night ? 0.3 : p.dark ? 0.12 : 0.55]} />
        <directionalLight position={[cx + 6, 12, cz + 8]} intensity={p.night ? 0.4 : p.dark ? 0.35 : 1.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
        <OrbitControls makeDefault target={[cx, 0.6, cz]} enablePan={free} enableRotate={!top} minPolarAngle={top ? 0 : free ? 0.05 : 0.45} maxPolarAngle={top ? 0.02 : free ? 1.52 : view === 'front' ? 1.45 : 1.2} minDistance={dist * 0.35} maxDistance={dist * 2} />
        <CameraRig view={view} r={r} />
        <Room r={dressed} tier={s.tier} painted={!!fin.paint} />
        <Furniture s={s} selected={p.selected} placing={p.placing} onTap={tap} dark={p.dark} reflections={p.reflections} />
        {p.build && <BuildGrid r={r} />}
        {people}
        {p.placing && <PlacingGhost s={s} placing={p.placing} />}
        {/* invisible floor to catch taps and the placing cursor */}
        <mesh
          position={[cx, 0.001, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={(e) => {
            const c = cellAt(e);
            if (c && e.pointerType === 'mouse' && (c[0] !== p.placing!.x || c[1] !== p.placing!.z)) p.onHover?.(c[0], c[1]);
          }}
          onClick={(e) => {
            e.stopPropagation();
            const c = cellAt(e);
            if (c) p.onHover?.(c[0], c[1]);
            else p.onSelect(null);
          }}
        >
          <planeGeometry args={[r.w, r.d]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Canvas>
    </div>
  );
}

/** A slowly turning look at an empty room, for the shop listings. */
export function RoomPreview({ tier, stars }: { tier: number; stars: number }) {
  const r = room({ tier, stars });
  const dist = Math.max(r.w, r.d) * 0.78 + 1.6;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 32, position: [r.w / 2 + dist * 0.75, dist * 0.95, r.d / 2 + dist * 1.05], near: 0.1, far: 200 }} style={{ background: 'linear-gradient(#24305a,#3a4a7a)' }}>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#FFF4E0', '#3A3A50', 0.55]} />
      <directionalLight position={[r.w / 2 + 6, 12, r.d / 2 + 8]} intensity={1.2} />
      <OrbitControls target={[r.w / 2, 0.6, r.d / 2]} enablePan={false} autoRotate autoRotateSpeed={0.6} minPolarAngle={0.45} maxPolarAngle={1.2} minDistance={dist * 0.45} maxDistance={dist * 1.8} />
      <Room r={r} tier={tier} />
    </Canvas>
  );
}
