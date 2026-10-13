import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Pose } from '../types';
import { RoomStyle, finishes, room, cellsBlocked, footprint, furnitureById, wallLayout, Placed, canPlace, yardCapacity, Rot, rotAngle } from '../shop';
import { solarCap, source } from '../power';
import { stats } from '../engine';
import { ApplianceOn, CeilingPiece, FloorPiece, WallPiece, B, MirrorLive } from './Furniture3D';
import { Cell, Figure, FigureLook, Walker, lookToFigure } from './People';
import { productKey } from '../market';

export interface SceneProps {
  s: GameState;
  /** A floor piece in Divine's hands in build mode: where it would go. */
  placing: { uid: string; rot: Rot; x: number; z: number; id?: string; yardSide?: 'left' | 'right' } | null;
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
  /** Last manually chosen destination for Divine; kept so she stays where the player leaves her. */
  manualTarget?: Cell | null;
  /** Player clicked/tapped an open floor cell. */
  onMoveTo?: (x: number, z: number) => void;
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
  const seatWaitPool: { uid: string; cell: Cell; position: [number, number, number]; face: number }[] = [];
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
      seatWaitPool.push({ uid: st.uid, cell: c, position: [x, y, z], face: angle });
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
  return { door, outside, style, divine, wait, seatWait, seatSpots: seatWaitPool, staff, staffClient, street };
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
            <meshStandardMaterial
              color={r.signature
                ? (Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? r.floor : r.floor2
                : (x + z) % 2 ? r.floor : r.floor2}
              roughness={r.signature ? 0.18 : r.kind === 'marble' || r.kind === 'flagship' || r.kind === 'maison' || r.kind === 'empire' ? 0.25 : 0.9}
              metalness={r.signature ? 0.08 : r.kind === 'flagship' || r.kind === 'maison' || r.kind === 'empire' ? 0.1 : 0}
            />
          </mesh>,
        );
    return out;
  }, [r]);
  const door = Math.floor(r.w / 2);
  const ridges = r.kind === 'container' && !r.signature;
  const signatureGold = ['#78C8D5', '#A8BCFF', '#FFD54A', '#D6B86C', '#F0CD78', '#D7B879', '#E4C56E'][tier] || '#F0CD78';
  const signatureAccent = ['#315E67', '#2D306E', '#936013', '#173D32', '#281B2D', '#6A5440', '#171521'][tier] || '#281B2D';
  const signatureInset = ['#EAFBFD', '#F4F6FF', '#FFF2B2', '#E1D4B9', '#E9E1D6', '#FBF7EF', '#F7F0E5'][tier] || '#E9E1D6';
  const runwayColor = ['#8FCED7', '#5B56AA', '#E7C23D', '#1B4A3D', '#4B1425', '#D5C8B4', '#31263B'][tier] || '#4B1425';
  const carpetWidth = Math.min(3.2, Math.max(2.25, r.w * 0.095));
  const portalCenter = door + 0.5;
  const portalLeft = portalCenter - carpetWidth / 2 - 0.18;
  const portalRight = portalCenter + carpetWidth / 2 + 0.18;
  const featureWidth = Math.max(4.6, r.w * 0.58);
  const featureHeight = Math.min(2.65, H * 0.62);
  const glassXCount = Math.max(4, Math.floor(r.w / 1.8)) + 1;
  const glassZCount = Math.max(3, Math.floor(r.d / 1.8)) + 1;
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
      {/* Actual internal partitions for the Level 6 Maison and Level 7 Empire House.
          The grid definition and this geometry share the same doorway openings. */}
      {(r.partitions || []).map((partition, partitionIndex) => {
        const runs: Array<[number, number]> = [];
        let runStart: number | null = null;
        for (let along = partition.start; along <= partition.end + 1; along++) {
          const isWall = along <= partition.end && !partition.openings.includes(along);
          if (isWall && runStart === null) runStart = along;
          if (!isWall && runStart !== null) {
            runs.push([runStart, along - 1]);
            runStart = null;
          }
        }
        return (
          <React.Fragment key={'partition-' + partitionIndex}>
            {runs.map(([start, end], runIndex) => {
              const length = end - start + 1;
              const horizontal = partition.axis === 'horizontal';
              const p: [number, number, number] = horizontal
                ? [(start + end + 1) / 2, 0.78, partition.at + 0.5]
                : [partition.at + 0.5, 0.78, (start + end + 1) / 2];
              const lowerSize: [number, number, number] = horizontal ? [length, 1.56, 0.12] : [0.12, 1.56, length];
              const glassPosition: [number, number, number] = [p[0], 2.38, p[2]];
              const glassSize: [number, number, number] = horizontal ? [Math.max(0.2, length - 0.08), 1.55, 0.065] : [0.065, 1.55, Math.max(0.2, length - 0.08)];
              const capPosition: [number, number, number] = horizontal ? [p[0], 1.58, p[2]] : [p[0], 1.58, p[2]];
              const capSize: [number, number, number] = horizontal ? [length, 0.06, 0.16] : [0.16, 0.06, length];
              const brass = r.kind === 'empire' ? '#E4C56E' : '#C6A66D';
              return (
                <React.Fragment key={'partition-run-' + runIndex}>
                  <B p={p} s={lowerSize} c={r.kind === 'empire' ? '#292331' : '#CFC3B1'} r={0.62} />
                  <B p={glassPosition} s={glassSize} c={r.kind === 'empire' ? '#B8A8C9' : '#DCE8E7'} r={0.22} m={0.12} o={0.34} />
                  <B p={capPosition} s={capSize} c={brass} m={0.78} r={0.26} />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
      {/* back wall */}
      <B p={[r.w / 2, H / 2, -0.06]} s={[r.w + 0.12, H, 0.12]} c={r.wall} r={r.signature && tier <= 1 ? 0.16 : ridges ? 0.6 : 0.9} m={r.signature && tier <= 1 ? 0.22 : ridges ? 0.3 : 0} o={r.signature && tier === 0 ? 0.32 : undefined} />
      <B p={[r.w / 2, 0.35, 0.005]} s={[r.w, 0.7, 0.02]} c={r.wallLow} />
      {/* left wall */}
      <B p={[-0.06, H / 2, r.d / 2]} s={[0.12, H, r.d + 0.12]} c={r.wall} r={r.signature && tier <= 1 ? 0.16 : ridges ? 0.6 : 0.9} m={r.signature && tier <= 1 ? 0.22 : ridges ? 0.3 : 0} o={r.signature && tier === 0 ? 0.32 : undefined} />
      <B p={[0.005, 0.35, r.d / 2]} s={[0.02, 0.7, r.d]} c={r.wallLow} />
      {/* low cutaway walls at the front and right */}
      <B p={[r.w + 0.06, 0.3, r.d / 2]} s={[0.12, 0.6, r.d + 0.12]} c={r.wall} o={r.signature && tier === 0 ? 0.38 : undefined} />
      <B p={[door / 2, 0.3, r.d + 0.06]} s={[door, 0.6, 0.12]} c={r.wall} />
      <B p={[door + 1 + (r.w - door - 1) / 2, 0.3, r.d + 0.06]} s={[r.w - door - 1, 0.6, 0.12]} c={r.wall} />
      {/* trim */}
      <B p={[r.w / 2, H - 0.05, 0.01]} s={[r.w, 0.1, 0.03]} c={r.trim} m={r.signature || r.kind === 'marble' || r.kind === 'flagship' || r.kind === 'maison' || r.kind === 'empire' ? 0.8 : 0} />
      <B p={[0.01, H - 0.05, r.d / 2]} s={[0.03, 0.1, r.d]} c={r.trim} m={r.signature || r.kind === 'marble' || r.kind === 'flagship' ? 0.8 : 0} />

      {r.signature && tier === 0 && (
        <>
          {/* Glasshouse mullions and transparent roof panels: a real architectural identity. */}
          {Array.from({ length: glassXCount }, (_, i) => (
            <B key={'glass-back-mullion-' + i} p={[0.18 + i * (r.w - 0.36) / Math.max(1, glassXCount - 1), H / 2, -0.14]} s={[0.065, H, 0.065]} c="#6AA9B7" m={0.82} r={0.18} />
          ))}
          {Array.from({ length: glassZCount }, (_, i) => (
            <B key={'glass-side-mullion-' + i} p={[-0.14, H / 2, 0.16 + i * (r.d - 0.32) / Math.max(1, glassZCount - 1)]} s={[0.065, H, 0.065]} c="#6AA9B7" m={0.82} r={0.18} />
          ))}
          <B p={[r.w / 2, H * 0.33, -0.15]} s={[r.w, 0.055, 0.07]} c="#6AA9B7" m={0.82} r={0.18} />
          <B p={[r.w / 2, H * 0.68, -0.15]} s={[r.w, 0.055, 0.07]} c="#6AA9B7" m={0.82} r={0.18} />
          <B p={[0.05, H * 0.35, r.d / 2]} s={[0.07, 0.055, r.d]} c="#6AA9B7" m={0.82} r={0.18} />
          <B p={[0.05, H * 0.68, r.d / 2]} s={[0.07, 0.055, r.d]} c="#6AA9B7" m={0.82} r={0.18} />
          {Array.from({ length: glassZCount }, (_, i) => (
            <React.Fragment key={'glass-roof-bay-' + i}>
              <B p={[r.w / 2, H + 0.005, 0.6 + (i + 0.5) * (r.d - 1.2) / glassZCount]} s={[r.w - 0.12, 0.025, Math.max(0.2, (r.d - 1.2) / glassZCount - 0.04)]} c="#E7F8FB" r={0.12} m={0.08} o={0.18} />
              <B p={[r.w / 2, H + 0.025, 0.6 + i * (r.d - 1.2) / Math.max(1, glassZCount - 1)]} s={[r.w, 0.045, 0.045]} c="#B5DCE3" m={0.6} o={0.68} />
            </React.Fragment>
          ))}
        </>
      )}

      {r.signature && tier === 1 && (
        <>
          {/* Sky pavilion: a floating light canopy, luminous arches, and pearl-blue crystal geometry. */}
          {Array.from({ length: 5 }, (_, i) => (
            <group key={'sky-arch-' + i} position={[r.w * (0.18 + i * 0.16), H - 0.22, r.d * 0.52]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.65 + (i % 2) * 0.16, 0.045, 10, 48]} />
                <meshStandardMaterial color="#A8BCFF" metalness={0.76} roughness={0.18} emissive="#7A95FF" emissiveIntensity={0.34} />
              </mesh>
            </group>
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={'sky-crystal-' + i} position={[r.w * (0.14 + (i % 5) * 0.18), H * (0.48 + (i % 3) * 0.12), 0.23]} rotation={[0.3, i * 0.6, Math.PI / 4]}>
              <octahedronGeometry args={[0.1 + (i % 3) * 0.035, 0]} />
              <meshStandardMaterial color="#EAF0FF" metalness={0.3} roughness={0.14} emissive="#9CB5FF" emissiveIntensity={0.72} />
            </mesh>
          ))}
        </>
      )}

      {r.signature && tier === 2 && (
        <>
          {/* The gold tier is intentionally lavish: polished gold reveals and sparkling stones. */}
          <B p={[r.w / 2, H * 0.54, 0.2]} s={[r.w * 0.72, H * 0.56, 0.12]} c="#F4C643" m={0.88} r={0.16} e="#EAB72E" ei={0.28} />
          <B p={[r.w / 2, H * 0.54, 0.27]} s={[r.w * 0.67, H * 0.51, 0.04]} c="#FFF1A8" m={0.82} r={0.12} e="#FFE27A" ei={0.42} />
          <B p={[r.w / 2, H * 0.54, 0.30]} s={[r.w * 0.61, H * 0.45, 0.03]} c="#FFF8D9" m={0.52} r={0.12} />
          {Array.from({ length: 22 }, (_, i) => {
            const x = 0.7 + ((i * 17) % Math.max(2, Math.floor(r.w - 1.4)));
            const y = 0.8 + ((i * 11) % Math.max(2, Math.floor(H * 0.8)));
            return (
              <mesh key={'gold-spark-' + i} position={[x, y, 0.36]} rotation={[i * 0.4, i * 0.5, Math.PI / 4]}>
                <octahedronGeometry args={[0.045 + (i % 3) * 0.018, 0]} />
                <meshStandardMaterial color="#FFF7C2" metalness={0.4} roughness={0.12} emissive="#FFE55C" emissiveIntensity={0.85} />
              </mesh>
            );
          })}
          {Array.from({ length: 20 }, (_, i) => {
            const a = (i / 20) * Math.PI * 2;
            const x = r.w / 2 + Math.cos(a) * Math.max(2, r.w * 0.33);
            const z = r.d / 2 + Math.sin(a) * Math.max(1.5, r.d * 0.33);
            return <B key={'gold-floor-inlay-' + i} p={[x, 0.025, z]} s={[0.07, 0.025, 0.07]} c="#FFE56A" m={0.85} e="#FFE56A" ei={0.85} />;
          })}
        </>
      )}
      {r.signature && (
        <>
          {/* Grand entrance portal: the Signature shop reads as a destination from the doorway. */}
          <B p={[portalLeft, H / 2, r.d + 0.1]} s={[0.26, H + 0.08, 0.24]} c={signatureGold} m={0.82} e={signatureGold} ei={0.16} />
          <B p={[portalRight, H / 2, r.d + 0.1]} s={[0.26, H + 0.08, 0.24]} c={signatureGold} m={0.82} e={signatureGold} ei={0.16} />
          <B p={[portalCenter, H - 0.08, r.d + 0.1]} s={[portalRight - portalLeft + 0.3, 0.24, 0.25]} c={signatureGold} m={0.82} e={signatureGold} ei={0.18} />
          <B p={[portalCenter, 0.035, r.d + 0.18]} s={[carpetWidth + 0.48, 0.07, 0.55]} c={signatureGold} m={0.72} e={signatureGold} ei={0.12} />
          <B p={[portalCenter, 0.075, r.d + 0.18]} s={[carpetWidth + 0.26, 0.025, 0.39]} c={signatureAccent} />

          {/* A wide runway carpet with twin brass runners and stone inlay around the whole room. */}
          <B p={[portalCenter, 0.008, r.d / 2 + 0.28]} s={[carpetWidth, 0.016, r.d + 0.82]} c={runwayColor} r={tier <= 1 ? 0.16 : 0.92} m={tier === 2 ? 0.32 : 0.04} e={tier === 2 ? '#FFD54A' : undefined} ei={tier === 2 ? 0.12 : 0} />
          <B p={[portalCenter - carpetWidth / 2 + 0.08, 0.022, r.d / 2 + 0.28]} s={[0.045, 0.018, r.d + 0.72]} c={signatureGold} m={0.74} e={signatureGold} ei={0.08} />
          <B p={[portalCenter + carpetWidth / 2 - 0.08, 0.022, r.d / 2 + 0.28]} s={[0.045, 0.018, r.d + 0.72]} c={signatureGold} m={0.74} e={signatureGold} ei={0.08} />
          <B p={[r.w / 2, 0.016, 0.3]} s={[r.w - 0.55, 0.018, 0.045]} c={signatureGold} m={0.72} e={signatureGold} ei={0.08} />
          <B p={[r.w / 2, 0.016, r.d - 0.3]} s={[r.w - 0.55, 0.018, 0.045]} c={signatureGold} m={0.72} e={signatureGold} ei={0.08} />
          <B p={[0.31, 0.015, r.d / 2]} s={[0.045, 0.018, r.d - 0.55]} c={signatureGold} m={0.72} />
          <B p={[r.w - 0.31, 0.015, r.d / 2]} s={[0.045, 0.018, r.d - 0.55]} c={signatureGold} m={0.72} />

          {/* Oversized back-wall feature gallery: layered panel, brass frame, and house emblem. */}
          <B p={[r.w / 2, H * 0.57, 0.055]} s={[featureWidth, featureHeight, 0.08]} c={signatureAccent} m={0.12} r={0.55} />
          <B p={[r.w / 2, H * 0.57, 0.104]} s={[featureWidth - 0.25, featureHeight - 0.24, 0.025]} c={signatureGold} m={0.72} r={0.28} />
          <B p={[r.w / 2, H * 0.57, 0.124]} s={[featureWidth - 0.43, featureHeight - 0.42, 0.022]} c={signatureInset} m={0.05} r={0.45} />
          <B p={[r.w / 2, H * 0.75, 0.145]} s={[featureWidth - 0.85, 0.045, 0.022]} c={signatureGold} m={0.78} e={signatureGold} ei={0.12} />
          <B p={[r.w / 2, H * 0.39, 0.145]} s={[featureWidth - 0.85, 0.045, 0.022]} c={signatureGold} m={0.78} e={signatureGold} ei={0.12} />
          <mesh position={[r.w / 2, H * 0.57, 0.17]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.72, 0.72, 0.06]} />
            <meshStandardMaterial color={signatureGold} metalness={0.78} roughness={0.25} emissive={signatureGold} emissiveIntensity={0.12} />
          </mesh>
          <mesh position={[r.w / 2, H * 0.57, 0.215]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.43, 0.43, 0.06]} />
            <meshStandardMaterial color={signatureAccent} metalness={0.25} roughness={0.3} />
          </mesh>

          {/* Full-height fluted wall treatment on the long side wall. */}
          {Array.from({ length: Math.max(4, Math.floor(r.d / 1.7)) }, (_, i) => {
            const count = Math.max(4, Math.floor(r.d / 1.7));
            const z = 0.65 + (i * Math.max(0, r.d - 1.3)) / Math.max(1, count - 1);
            return (
              <React.Fragment key={'signature-flute-' + i}>
                <B p={[0.075, H * 0.5, z]} s={[0.075, H * 0.78, 0.07]} c={signatureGold} m={0.75} r={0.28} />
                <B p={[0.12, H * 0.5, z + 0.15]} s={[0.035, H * 0.66, 0.2]} c={tier === 4 ? '#47334B' : '#C9A99A'} r={0.62} />
              </React.Fragment>
            );
          })}

          {/* A floor medallion and ceiling-hung ring chandeliers establish a grand hall scale. */}
          <mesh position={[r.w * 0.77, 0.022, r.d * 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[Math.min(1.05, r.d * 0.14), 0.035, 8, 40]} />
            <meshStandardMaterial color={signatureGold} metalness={0.8} roughness={0.22} emissive={signatureGold} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[r.w * 0.77, 0.024, r.d * 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[Math.min(0.72, r.d * 0.095), 0.018, 8, 40]} />
            <meshStandardMaterial color={signatureGold} metalness={0.8} roughness={0.22} />
          </mesh>
          {Array.from({ length: tier >= 3 ? 4 : tier === 2 ? 6 : tier === 1 ? 4 : 2 }, (_, i) => {
            const x = r.w * (tier >= 3 || tier === 2 || tier === 1 ? (i % 2 === 0 ? 0.3 : 0.7) : (i === 0 ? 0.38 : 0.62));
            const z = r.d * (tier >= 3 || tier === 2 || tier === 1 ? (i < 2 ? 0.28 : 0.72) : 0.52);
            const radius = tier === 2 ? 0.86 : tier >= 3 ? 0.72 : tier === 1 ? 0.66 : 0.56;
            return (
              <group key={'signature-chandelier-' + i} position={[x, H - 0.26, z]}>
                <B p={[0, 0.02, 0]} s={[0.08, 0.4, 0.08]} c={signatureGold} m={0.8} />
                <mesh position={[0, -0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[radius, 0.045, 8, 32]} />
                  <meshStandardMaterial color={signatureGold} metalness={0.82} roughness={0.2} emissive={signatureGold} emissiveIntensity={0.16} />
                </mesh>
                <mesh position={[0, -0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[radius * 0.73, 0.025, 8, 32]} />
                  <meshStandardMaterial color="#FFF2CC" metalness={0.55} roughness={0.2} emissive="#FFE9AB" emissiveIntensity={0.2} />
                </mesh>
                <mesh position={[0, -0.39, 0]}>
                  <sphereGeometry args={[0.14, 14, 10]} />
                  <meshStandardMaterial color="#FFF4CF" emissive="#FFD778" emissiveIntensity={0.62} roughness={0.22} />
                </mesh>
                {[-1, 1].map((side) => (
                  <mesh key={side} position={[side * radius * 0.82, -0.31, 0]}>
                    <sphereGeometry args={[0.075, 10, 8]} />
                    <meshStandardMaterial color="#FFF4D0" emissive="#FFD778" emissiveIntensity={0.45} roughness={0.2} />
                  </mesh>
                ))}
              </group>
            );
          })}

          {tier === 2 && Array.from({ length: 18 }, (_, i) => {
            const x = r.w * (0.08 + (i % 9) * 0.105);
            const z = r.d * (i < 9 ? 0.12 : 0.88);
            return (
              <mesh key={'gold-ceiling-spark-' + i} position={[x, H - 0.08, z]}>
                <octahedronGeometry args={[0.07 + (i % 3) * 0.025, 0]} />
                <meshStandardMaterial color="#FFF1A1" metalness={0.65} roughness={0.15} emissive="#FFD84C" emissiveIntensity={0.9} />
              </mesh>
            );
          })}
        </>
      )}
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
      {r.kind === 'maison' && (
        <>
          {/* Maison: layered travertine and champagne-brass couture gallery. */}
          <B p={[r.w / 2, H * 0.53, 0.025]} s={[r.w * 0.62, H * 0.66, 0.055]} c="#B5A58D" r={0.48} />
          <B p={[r.w / 2, H * 0.53, 0.065]} s={[r.w * 0.59, H * 0.62, 0.025]} c="#E6D9C5" r={0.34} />
          {Array.from({ length: Math.max(8, Math.floor(r.w / 1.65)) }, (_, i) => {
            const x = 0.55 + i * (r.w - 1.1) / Math.max(1, Math.max(8, Math.floor(r.w / 1.65)) - 1);
            return <B key={'maison-fin-' + i} p={[x, H * 0.5, -0.15]} s={[0.045, H * 0.84, 0.08]} c="#C6A66D" m={0.78} r={0.27} />;
          })}
          <B p={[r.w / 2, H - 0.18, r.d * 0.52]} s={[r.w * 0.84, 0.045, 0.045]} c="#E8D9B9" m={0.68} e="#E8D9B9" ei={0.2} />
        </>
      )}
      {r.kind === 'empire' && (
        <>
          {/* Empire House: dark stone, monumental bronze portal and a dramatic couture wall. */}
          <B p={[r.w / 2, H * 0.54, 0.025]} s={[r.w * 0.73, H * 0.72, 0.07]} c="#33283B" r={0.32} m={0.2} />
          <B p={[r.w / 2, H * 0.54, 0.075]} s={[r.w * 0.69, H * 0.68, 0.026]} c="#E4C56E" r={0.24} m={0.82} />
          <B p={[r.w / 2, H * 0.54, 0.095]} s={[r.w * 0.65, H * 0.63, 0.022]} c="#1F1A28" r={0.28} m={0.18} />
          {Array.from({ length: 8 }, (_, i) => {
            const x = r.w * (0.12 + i * 0.108);
            return (
              <React.Fragment key={'empire-pilaster-' + i}>
                <B p={[x, H * 0.5, -0.19]} s={[0.16, H * 0.92, 0.16]} c="#9B7845" m={0.78} r={0.24} />
                <B p={[x, H * 0.5, -0.285]} s={[0.055, H * 0.82, 0.045]} c="#F0D58C" m={0.82} r={0.2} e="#C7A04D" ei={0.12} />
              </React.Fragment>
            );
          })}
          <B p={[r.w / 2, H - 0.12, r.d * 0.52]} s={[r.w * 0.9, 0.07, 0.07]} c="#E4C56E" m={0.8} e="#E4C56E" ei={0.45} />
          <B p={[0.12, H * 0.5, r.d / 2]} s={[0.08, H * 0.9, r.d * 0.88]} c="#E4C56E" m={0.78} r={0.24} />
          <B p={[r.w - 0.12, H * 0.5, r.d / 2]} s={[0.08, H * 0.9, r.d * 0.88]} c="#E4C56E" m={0.78} r={0.24} />
        </>
      )}
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
          <B p={[r.w / 2, 0.95, 0.02]} s={[r.w, 0.05, 0.03]} c={r.trim} m={r.kind === 'marble' || r.kind === 'flagship' || r.kind === 'maison' || r.kind === 'empire' ? 0.8 : 0.1} />
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
    const side = p.yardSide || 'right';
    const sideItems = yardOrder(s).filter((x) => (x.yardSide || 'right') === side);
    const i = sideItems.findIndex((x) => x.uid === uid);
    const cell: Cell = [side === 'left' ? -1 : r.w, i];
    return { cell, face: side === 'left' ? -Math.PI / 2 : Math.PI / 2 };
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
  if (f.group === 'Seating' || p.id === 'makeupChair' || p.id === 'salonChair') {
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

/** Staff wander, take short idle breaks, and use a seat when one is free. */
function StaffRoutine({ look, spawn, workTarget, blocked, w, d, assigned, leaving, seats }: {
  look: FigureLook; spawn: Cell; workTarget: Cell; blocked: boolean[][]; w: number; d: number;
  assigned: boolean; leaving: boolean; seats: { cell: Cell; position: [number, number, number]; face: number }[];
}) {
  const [routine, setRoutine] = useState<{ target: Cell; pose: Pose; seatPosition?: [number, number, number]; seatFace?: number }>({ target: spawn, pose: 'stand' });
  useEffect(() => {
    // Build mode has priority over the normal idle/work routine: staff should
    // physically walk through the shop entrance rather than wander inside.
    if (leaving) {
      setRoutine({ target: workTarget, pose: 'stand' });
      return;
    }
    if (assigned) {
      setRoutine({ target: workTarget, pose: 'work' });
      return;
    }
    setRoutine({ target: spawn, pose: 'stand' });
    const timer = window.setInterval(() => {
      if (seats.length && Math.random() < 0.24) {
        const seat = seats[Math.floor(Math.random() * seats.length)];
        setRoutine({ target: seat.cell, pose: 'sit', seatPosition: seat.position, seatFace: seat.face });
        return;
      }
      const free: Cell[] = [];
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) if (!blocked[z]?.[x]) free.push([x, z]);
      const target = free[Math.floor(Math.random() * free.length)] || spawn;
      const poses: Pose[] = ['stand', 'phone', 'drink', 'reach'];
      setRoutine({ target, pose: poses[Math.floor(Math.random() * poses.length)] });
    }, 8500);
    return () => window.clearInterval(timer);
  }, [assigned, leaving, workTarget[0], workTarget[1], spawn[0], spawn[1], seats, blocked, w, d]);
  const target = leaving || assigned ? workTarget : routine.target;
  const pose: Pose = leaving ? 'stand' : assigned ? 'work' : routine.pose;
  return <Walker look={look} spawn={spawn} target={target} blocked={blocked} w={w} d={d} speed={1.15} pose={pose} seatPosition={leaving || assigned ? undefined : routine.seatPosition} seatFace={leaving || assigned ? undefined : routine.seatFace} />;
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
  const rightX = r.w + 1.5;
  const leftX = -1.5;
  const X = rightX; // gallons and guard remain near the main service side unless assigned to a side
  return (
    <group>
      {/* Matching concrete service strips on both sides of the shop. */}
      {[leftX, rightX].map((x) => <React.Fragment key={x}>
        <mesh position={[x, -0.045, cap / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.9, cap + 0.2]} />
          <meshStandardMaterial color="#8E8A80" roughness={1} />
        </mesh>
        <B p={[x + (x < 0 ? -0.95 : 0.95), 0.35, cap / 2]} s={[0.06, 0.7, cap + 0.2]} c="#6A5A48" />
      </React.Fragment>)}
      {items.map((p, i) => {
        const f = furnitureById(p.id);
        const side = p.yardSide || 'right';
        const sideItems = items.filter((item) => (item.yardSide || 'right') === side);
        const z = 0.5 + sideItems.findIndex((item) => item.uid === p.uid);
        const X = side === 'left' ? leftX : rightX;
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
            ) : p.id === 'securityPost' ? (
              <group>
                {/* Small staffed booth: base, walls, front window, and a projecting roof. */}
                <B p={[0, 0.06, 0]} s={[0.9, 0.12, 0.82]} c="#77736B" />
                <B p={[0, 0.48, -0.34]} s={[0.72, 0.76, 0.08]} c="#D6C6A6" />
                <B p={[-0.34, 0.48, 0]} s={[0.08, 0.76, 0.68]} c="#B7A789" />
                <B p={[0.34, 0.48, 0]} s={[0.08, 0.76, 0.68]} c="#B7A789" />
                <B p={[0, 0.84, 0]} s={[0.96, 0.12, 0.92]} c="#2F4858" />
                <B p={[0, 0.48, 0.08]} s={[0.5, 0.34, 0.025]} c="#6BA5B8" m={0.2} />
                <B p={[0, 0.29, 0.095]} s={[0.54, 0.035, 0.04]} c="#E9D5A2" />
                <B p={[0, 0.98, 0]} s={[1.05, 0.08, 1.0]} c="#1E252B" />
                <B p={[0, 1.045, 0]} s={[0.62, 0.035, 0.35]} c="#E8B84A" />
                <mesh position={[0.2, 1.12, 0.12]}>
                  <sphereGeometry args={[0.045, 8, 8]} />
                  <meshStandardMaterial color={s.security?.trip ? "#E8B84A" : "#46A36B"} emissive={s.security?.trip ? "#E8B84A" : "#46A36B"} emissiveIntensity={0.4} />
                </mesh>
              </group>
            ) : p.id === 'umbrellaCanopy' ? (
              <group>
                {/* Distinctive parasol silhouette: tapered fabric, raised crown, rounded scalloped rim. */}
                <mesh position={[0, 0.07, 0]} castShadow>
                  <cylinderGeometry args={[0.27, 0.3, 0.14, 24]} />
                  <meshStandardMaterial color="#51483F" roughness={0.75} />
                </mesh>
                <mesh position={[0, 1.03, 0]} castShadow>
                  <cylinderGeometry args={[0.032, 0.042, 1.82, 12]} />
                  <meshStandardMaterial color="#C9CED6" metalness={0.65} roughness={0.35} />
                </mesh>
                {/* The cone gives a clear sloping canopy rather than a flat square slab. */}
                <mesh position={[0, 2.03, 0]} castShadow>
                  <coneGeometry args={[0.98, 0.52, 24, 1, false]} />
                  <meshStandardMaterial color="#C2262E" roughness={0.82} side={THREE.DoubleSide} />
                </mesh>
                {/* Alternating soft scallops break up the edge like a real market umbrella. */}
                {Array.from({ length: 16 }, (_, i) => {
                  const a = (i * Math.PI * 2) / 16;
                  return (
                    <mesh key={i} position={[Math.cos(a) * 0.91, 1.79, Math.sin(a) * 0.91]} scale={[0.14, 0.075, 0.14]} castShadow>
                      <sphereGeometry args={[1, 12, 8]} />
                      <meshStandardMaterial color={i % 2 ? "#B91F2A" : "#D83A42"} roughness={0.82} />
                    </mesh>
                  );
                })}
                <mesh position={[0, 1.79, 0]}>
                  <torusGeometry args={[0.91, 0.022, 8, 48]} />
                  <meshStandardMaterial color="#F4EFE6" roughness={0.75} />
                </mesh>
                {/* Radial ribs run down the underside of the fabric from crown to rim. */}
                {Array.from({ length: 12 }, (_, i) => {
                  const a = (i * Math.PI * 2) / 12;
                  return <mesh key={`rib-${i}`} position={[Math.cos(a) * 0.46, 1.94, Math.sin(a) * 0.46]} rotation={[0, -a, Math.PI / 4]}>
                    <cylinderGeometry args={[0.009, 0.009, 0.96, 5]} />
                    <meshStandardMaterial color="#E8B84A" metalness={0.45} />
                  </mesh>;
                })}
                <mesh position={[0, 2.31, 0]} castShadow>
                  <sphereGeometry args={[0.06, 12, 8]} />
                  <meshStandardMaterial color="#D4AF37" metalness={0.8} />
                </mesh>
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
      {/* Fuel gallons are physical objects: click one to choose a generator to refill. */}
      {(s.security?.gallons || []).map((g, i) => (
        <group key={g.id} position={[X + 0.42, 0, 0.5 + items.filter((p) => (p.yardSide || 'right') === 'right').length + i]} onClick={(e) => { e.stopPropagation(); onTap(`fuel-gallon:${g.id}`); }} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
          <mesh position={[0, 0.19, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.34, 12]} />
            <meshStandardMaterial color="#E5B82E" roughness={0.68} />
          </mesh>
          <mesh position={[0, 0.39, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.08, 10]} />
            <meshStandardMaterial color="#30343A" />
          </mesh>
          <mesh position={[0.07, 0.36, 0]}>
            <torusGeometry args={[0.075, 0.018, 5, 10, Math.PI]} />
            <meshStandardMaterial color="#30343A" />
          </mesh>
        </group>
      ))}
      {s.security?.guard && s.security?.trip?.carrier !== 'guard' && (() => {
        const post = items.find((p) => p.id === 'securityPost');
        if (!post) return null;
        const side = post.yardSide || 'right';
        const sideX = side === 'left' ? leftX : rightX;
        const index = items.filter((p) => (p.yardSide || 'right') === side).findIndex((p) => p.uid === post.uid);
        return <group key={s.security.guard.id} position={[sideX + (side === 'left' ? -0.42 : 0.42), 0, 0.5 + index + 0.55]} rotation={[0, -0.25, 0]}>
          <Figure look={lookToFigure(s.security.guard.look)} walking={false} pose="stand" />
        </group>;
      })()}
    </group>
  );
}

function Furniture({ s, selected, placing, onTap, dark, reflections }: Pick<SceneProps, 's' | 'selected' | 'placing' | 'dark' | 'reflections'> & { onTap: (uid: string) => void }) {
  const r = room(s.listing);
  const wl = wallLayout(s.furniture, s.listing);
  const live = useMemo(() => liveMirrorUids(s, reflections !== false), [s.furniture, reflections]); // eslint-disable-line react-hooks/exhaustive-deps
  // One rack/drawer slot represents one style. Individual colourways stay in stock,
  // but only the first in-stock colour paints a representative garment on the rack.
  const shown: typeof s.stock = [];
  const seenStyles = new Set<string>();
  for (const d of s.stock) {
    if (!d.displayed || d.pieces <= 0) continue;
    const key = productKey(d);
    if (seenStyles.has(key)) continue;
    seenStyles.add(key);
    shown.push(d);
  }
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
  // Divine's job/interaction takes priority; otherwise she remains at the player's last destination.
  const act = p.act ? actionSpot(s, p.act.uid) : null;
  const manual = p.manualTarget &&
    p.manualTarget[0] >= -1 && p.manualTarget[0] <= r.w &&
    p.manualTarget[1] >= 0 && p.manualTarget[1] <= r.d + 5 &&
    (p.manualTarget[1] >= r.d || p.manualTarget[0] === -1 || p.manualTarget[0] === r.w || !blocked[p.manualTarget[1]]?.[p.manualTarget[0]])
      ? p.manualTarget
      : null;
  const trip = s.security?.trip;
  const errandTarget: Cell | null = trip?.carrier === 'divine' ? (trip.remaining > trip.total / 2 ? sp.outside : sp.door) : null;
  const divineSeat = !p.build && p.act?.pose === 'sit' ? sp.seatSpots.find((seat) => seat.uid === p.act!.uid) : undefined;
  const divineAt: Cell = p.build ? [Math.min(r.w, sp.door[0] + 2), r.d + 1] : errandTarget || (divineSeat?.cell || (act ? act.cell : manual || sp.divine));
  const tired = s.energy !== undefined && s.energy < 30;
  const carryingFuel = !!trip && trip.carrier === 'divine' && trip.remaining <= trip.total / 2;
  people.push(<Walker key="divine" look={divineLook} spawn={sp.divine} target={divineAt} blocked={blocked} w={r.w} d={r.d} speed={tired ? 0.85 : 1.4} carryBag={carryingFuel} pose={!errandTarget && act && !p.build ? (act.stand ? 'stand' : p.act!.pose) : undefined} face={!errandTarget && act && !p.build ? act.face : undefined} seatPosition={divineSeat?.position} seatFace={divineSeat?.face ?? act?.face} />);
  const serviceStation = (profession: 'stylist' | 'makeup' | undefined) => {
    const ids = profession === 'makeup'
      ? ['makeupChair', 'salonChair', 'makeupStation', 'vanity', 'hairStation']
      : ['salonChair', 'makeupChair', 'hairStation', 'hoodDryer', 'makeupStation', 'vanity'];
    const piece = s.furniture.find((x) => x.placed && ids.includes(x.id));
    return piece ? actionSpot(s, piece.uid)?.cell || null : null;
  };
  const nextTo = (c: Cell): Cell => {
    const candidates: Cell[] = [[c[0] + 1, c[1]], [c[0] - 1, c[1]], [c[0], c[1] + 1], [c[0], c[1] - 1]];
    return candidates.find(([x, z]) => x >= 0 && x < r.w && z >= 0 && z < r.d && !blocked[z]?.[x]) || c;
  };
  s.staff.forEach((m, i) => {
    const assigned = s.inShop.find((v) => v.by === m.id);
    const station = assigned ? serviceStation(m.profession) : null;
    const workCell = station || sp.staffClient[i] || sp.style;
    const c = p.build ? ([Math.max(-1, sp.door[0] - 2 - i), r.d + 1] as Cell) : assigned ? nextTo(workCell) : sp.staff[i] || sp.divine;
    people.push(<StaffRoutine key={m.id} look={lookToFigure(m.look)} spawn={sp.staff[i] || sp.divine} workTarget={c} blocked={blocked} w={r.w} d={r.d} assigned={!!assigned && !p.build} leaving={!!p.build} seats={sp.seatWait} />);
  });
  if (s.phase === 'shop') {
    let k = 0;
    const queue = [...s.inShop].sort((a, b) => a.arrived - b.arrived);
    for (const v of queue) {
      let target: Cell;
      if (v.by === 'divine') target = sp.style;
      else if (v.by) {
        const worker = s.staff.find((m) => m.id === v.by);
        const station = serviceStation(worker?.profession);
        target = station || sp.staffClient[s.staff.findIndex((m) => m.id === v.by)] || sp.style;
      } else {
        target = sp.wait[k] || sp.street[k - sp.wait.length] || sp.outside;
        k++;
      }
      lastSpot.current[v.c.id] = target;
      const seat = !v.by ? sp.seatWait.find((item) => item.cell[0] === target[0] && item.cell[1] === target[1]) : undefined;
      const serviceWorker = v.by && v.by !== 'divine' ? s.staff.find((m) => m.id === v.by) : undefined;
      const serviceChair = serviceWorker && v.c.service
        ? s.furniture.find((x) => x.placed && (serviceWorker.profession === 'makeup' ? ['makeupChair', 'salonChair'].includes(x.id) : ['salonChair', 'makeupChair'].includes(x.id)))
        : undefined;
      const serviceSeatPosition: [number, number, number] | undefined = serviceChair ? [serviceChair.x + 0.5, 0.08, serviceChair.z + 0.5] : undefined;
      const serviceSeatFace = serviceChair ? rotAngle(serviceChair.rot) : undefined;
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
          pose={seat || (v.by && v.by !== 'divine' && v.c.service) ? 'sit' : undefined}
          seatPosition={serviceSeatPosition || seat?.position}
          seatFace={serviceSeatFace ?? seat?.face}
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
  const cellAt = (e: { point: THREE.Vector3 }): Cell => {
    if (p.placing) {
      const fp = s.furniture.find((x) => x.uid === p.placing!.uid);
      const { w, d } = fp ? footprint({ id: fp.id, rot: p.placing.rot }) : { w: 1, d: 1 };
      return [Math.floor(e.point.x - w / 2 + 0.5), Math.floor(e.point.z - d / 2 + 0.5)];
    }
    return [
      Math.max(-1, Math.min(r.w, Math.floor(e.point.x))),
      Math.max(0, Math.min(r.d + 5, Math.floor(e.point.z))),
    ];
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
          position={[cx, 0.001, (r.d + 5) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={(e) => {
            if (!p.placing) return;
            const c = cellAt(e);
            if (e.pointerType === 'mouse' && (c[0] !== p.placing.x || c[1] !== p.placing.z)) p.onHover?.(c[0], c[1]);
          }}
          onClick={(e) => {
            e.stopPropagation();
            const c = cellAt(e);
            if (p.placing) {
              p.onHover?.(c[0], c[1]);
              return;
            }
            if (p.build) {
              p.onSelect(null);
              return;
            }
            if (c[1] >= r.d || c[0] === -1 || c[0] === r.w || (c[0] >= 0 && c[0] < r.w && c[1] < r.d && !blocked[c[1]]?.[c[0]])) {
              p.onMoveTo?.(c[0], c[1]);
            } else {
              p.onSelect(null);
            }
          }}
        >
          <planeGeometry args={[r.w + 4, r.d + 5]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Canvas>
    </div>
  );
}

/** A slowly turning look at an empty room, for the shop listings. */
export function RoomPreview({ tier, stars, signature }: { tier: number; stars: number; signature?: boolean }) {
  const r = room({ tier, stars, signature });
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
