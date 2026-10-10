import React, { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GameState } from '../types';
import { RoomStyle, room, cellsBlocked, footprint, furnitureById, wallLayout, Placed, canPlace } from '../shop';
import { CeilingPiece, FloorPiece, WallPiece, B } from './Furniture3D';
import { Cell, FigureLook, Walker, lookToFigure } from './People';

export interface SceneProps {
  s: GameState;
  /** uid of a furniture piece being moved, with its rotation. */
  placing: { uid: string; rot: 0 | 1 } | null;
  selected: string | null;
  onPlace: (x: number, z: number) => void;
  onSelect: (uid: string | null) => void;
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
  for (const st of seats) for (const c of near([st.x, st.z + 1], all).slice(0, furnitureById(st.id).seats || 1)) { waitPool.push(c); taken.add(`${c[0]},${c[1]}`); }
  for (const c of near([r.w - 1, r.d - 1], all)) { waitPool.push(c); taken.add(`${c[0]},${c[1]}`); }
  const staff = near([0, 0], all).slice(0, 6);
  staff.forEach((c) => taken.add(`${c[0]},${c[1]}`));
  const staffClient = staff.map((c) => {
    const n = near(c, all)[0] || c;
    taken.add(`${n[0]},${n[1]}`);
    return n;
  });
  const wait = waitPool.filter((c) => !staff.some((x) => x[0] === c[0] && x[1] === c[1]) && !staffClient.some((x) => x[0] === c[0] && x[1] === c[1]));
  // overflow queue on the pavement outside the door
  const street: Cell[] = Array.from({ length: 12 }, (_, k) => [door[0] + [1, -1, 2, -2][k % 4], r.d + 1 + Math.floor(k / 4)] as Cell);
  return { door, outside, style, divine, wait, staff, staffClient, street };
}

export function Room({ r, tier }: { r: RoomStyle; tier: number }) {
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
        Array.from({ length: Math.floor(r.w / 0.25) }, (_, i) => <B key={`rb${i}`} p={[0.12 + i * 0.25, H / 2, 0.01]} s={[0.05, H, 0.03]} c="#4E6670" m={0.3} r={0.6} />)}
      {ridges &&
        Array.from({ length: Math.floor(r.d / 0.25) }, (_, i) => <B key={`rl${i}`} p={[0.01, H / 2, 0.12 + i * 0.25]} s={[0.03, H, 0.05]} c="#4E6670" m={0.3} r={0.6} />)}
      {ridges && (
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

function Furniture({ s, selected, placing, onSelect }: Pick<SceneProps, 's' | 'selected' | 'placing' | 'onSelect'>) {
  const r = room(s.listing);
  const wl = wallLayout(s.furniture, s.listing);
  // colours of displayed stock, shared out to display furniture
  const shown = s.stock.filter((d) => d.displayed && d.pieces > 0);
  let cursor = 0;
  const take = (n: number) => {
    const out = shown.slice(cursor, cursor + n).map((d) => d.color);
    cursor += n;
    return out;
  };
  const ceiling = s.furniture.filter((p) => p.placed && furnitureById(p.id).mount === 'ceiling');
  return (
    <group>
      {s.furniture.filter((p) => p.placed).map((p) => {
        const f = furnitureById(p.id);
        if (f.mount === 'ceiling') return null;
        if (placing?.uid === p.uid) return null;
        const colors = f.slots ? take(f.slots) : [];
        const click = (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onSelect(p.uid);
        };
        if (f.mount === 'wall') {
          const at = wl[p.uid];
          if (!at) return null;
          const pos: [number, number, number] = at.side === 'back' ? [at.at + f.w / 2, 0, 0] : [0, 0, at.at + f.w / 2];
          return (
            <group key={p.uid} position={pos} rotation={[0, at.side === 'back' ? 0 : Math.PI / 2, 0]} onClick={click}>
              <WallPiece id={p.id} colors={colors} />
              {selected === p.uid && <B p={[0, 0.05, 0.3]} s={[f.w, 0.03, 0.5]} c="#F59E0B" e="#F59E0B" ei={0.6} o={0.6} />}
            </group>
          );
        }
        const { w, d } = footprint(p);
        return (
          <group key={p.uid} position={[p.x + w / 2, 0, p.z + d / 2]} rotation={[0, p.rot ? -Math.PI / 2 : 0, 0]} onClick={click}>
            <FloorPiece id={p.id} colors={colors} selected={selected === p.uid} />
          </group>
        );
      })}
      {ceiling.map((p, i) => (
        <CeilingPiece key={p.uid} id={p.id} h={r.height} at={[r.w / 2 + (i - (ceiling.length - 1) / 2) * 1.6, 0, r.d / 2 - 0.3]} />
      ))}
    </group>
  );
}

function PlacingGhost({ s, placing, cell }: { s: GameState; placing: NonNullable<SceneProps['placing']>; cell: Cell | null }) {
  if (!cell) return null;
  const p = s.furniture.find((x) => x.uid === placing.uid);
  if (!p) return null;
  const cand: Placed = { ...p, x: cell[0], z: cell[1], rot: placing.rot, placed: true };
  const ok = canPlace(s.furniture, s.listing, cand);
  const { w, d } = footprint(cand);
  return (
    <group position={[cell[0] + w / 2, 0, cell[1] + d / 2]}>
      <group rotation={[0, placing.rot ? -Math.PI / 2 : 0, 0]}>
        <FloorPiece id={p.id} colors={[]} />
      </group>
      <B p={[0, 0.03, 0]} s={[w - 0.04, 0.04, d - 0.04]} c={ok ? '#22C55E' : '#EF4444'} o={0.45} e={ok ? '#22C55E' : '#EF4444'} ei={0.5} />
    </group>
  );
}

export default function ShopScene(p: SceneProps) {
  const { s } = p;
  const r = room(s.listing);
  const [cell, setCell] = useState<Cell | null>(null);
  const blocked = useMemo(() => cellsBlocked(s.furniture, s.listing), [s.furniture, s.listing]);
  const sp = useMemo(() => spots(s), [s.furniture, s.listing]); // eslint-disable-line react-hooks/exhaustive-deps
  const cx = r.w / 2;
  const cz = r.d / 2;
  const dist = Math.max(r.w, r.d) * 1.25 + 3;

  // people
  const divineLook = useMemo<FigureLook>(() => lookToFigure(s.divine), [s.divine]);
  const lastSpot = useRef<Record<string, Cell>>({});
  const gone = useRef<Set<string> | null>(null);
  if (gone.current === null) gone.current = new Set((s.left || []).map((l) => l.key));
  const [, rerender] = useState(0);
  const people: React.ReactNode[] = [];
  people.push(<Walker key="divine" look={divineLook} spawn={sp.divine} target={sp.divine} blocked={blocked} w={r.w} d={r.d} />);
  s.staff.forEach((m, i) => {
    const c = sp.staff[i] || sp.divine;
    people.push(<Walker key={m.id} look={lookToFigure(m.look)} spawn={c} target={c} blocked={blocked} w={r.w} d={r.d} />);
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
          onClick={clickable ? () => p.onCustomer(v.c.id) : undefined}
        />,
      );
    }
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

  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 32, position: [cx + dist * 0.75, dist * 0.95, cz + dist * 1.05], near: 0.1, far: 200 }} style={{ background: p.night ? 'linear-gradient(#0b0d1a,#1a1630)' : 'linear-gradient(#24305a,#3a4a7a)' }}>
      <ambientLight intensity={p.night ? 0.35 : p.dark ? 0.3 : 0.6} />
      <hemisphereLight args={['#FFF4E0', '#3A3A50', p.night ? 0.3 : p.dark ? 0.25 : 0.55]} />
      <directionalLight position={[cx + 6, 12, cz + 8]} intensity={p.night ? 0.4 : 1.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <OrbitControls target={[cx, 0.6, cz]} enablePan={false} minPolarAngle={0.45} maxPolarAngle={1.2} minDistance={dist * 0.45} maxDistance={dist * 1.8} />
      <Room r={r} tier={s.tier} />
      <Furniture s={s} selected={p.selected} placing={p.placing} onSelect={p.onSelect} />
      {people}
      {p.placing && <PlacingGhost s={s} placing={p.placing} cell={cell} />}
      {/* invisible floor to catch clicks and the placing cursor */}
      <mesh
        position={[cx, 0.001, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          if (!p.placing) return;
          const fp = s.furniture.find((x) => x.uid === p.placing!.uid);
          const { w, d } = fp ? footprint({ id: fp.id, rot: p.placing.rot }) : { w: 1, d: 1 };
          setCell([Math.floor(e.point.x - w / 2 + 0.5), Math.floor(e.point.z - d / 2 + 0.5)]);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (p.placing && cell) p.onPlace(cell[0], cell[1]);
          else p.onSelect(null);
        }}
      >
        <planeGeometry args={[r.w, r.d]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </Canvas>
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
