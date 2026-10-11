import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

/**
 * Low-poly furniture, built from boxes and cylinders.
 * Floor pieces: centred on their footprint, base at y = 0, front facing +z (toward the shop front).
 * Wall pieces: centred along their width, hanging on a wall at z = 0, sticking out along +z.
 * Ceiling pieces: hang from the ceiling at the given height.
 */

type V3 = [number, number, number];
interface BoxP { p: V3; s: V3; c: string; r?: number; m?: number; e?: string; ei?: number; o?: number; rot?: V3 }
export const B: React.FC<BoxP> = ({ p, s, c, r = 0.75, m = 0, e, ei = 0, o, rot }) => (
  <mesh position={p} rotation={rot} castShadow receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e || '#000000'} emissiveIntensity={ei} transparent={o !== undefined} opacity={o ?? 1} />
  </mesh>
);
const Cyl: React.FC<{ p: V3; r1: number; r2?: number; h: number; c: string; seg?: number; m?: number; rough?: number; rot?: V3; e?: string; ei?: number }> = ({ p, r1, r2, h, c, seg = 12, m = 0, rough = 0.7, rot, e, ei = 0 }) => (
  <mesh position={p} rotation={rot} castShadow receiveShadow>
    <cylinderGeometry args={[r1, r2 ?? r1, h, seg]} />
    <meshStandardMaterial color={c} metalness={m} roughness={rough} emissive={e || '#000000'} emissiveIntensity={ei} />
  </mesh>
);
const Ball: React.FC<{ p: V3; r: number; c: string; e?: string; ei?: number; m?: number; rough?: number; o?: number }> = ({ p, r, c, e, ei = 0, m = 0, rough = 0.6, o }) => (
  <mesh position={p} castShadow>
    <sphereGeometry args={[r, 14, 10]} />
    <meshStandardMaterial color={c} emissive={e || '#000000'} emissiveIntensity={ei} metalness={m} roughness={rough} transparent={o !== undefined} opacity={o ?? 1} />
  </mesh>
);

const MIRROR = '#BFD6E2';

/** Whether this appliance has power and is switched on (fans spin, etc.). */
export const ApplianceOn = createContext(true);

/** Spins its children around one axis; speeds up and slows down smoothly. */
function Spin({ axis, speed, on, sway, children }: { axis: 'y' | 'z'; speed: number; on: boolean; sway?: boolean; children: React.ReactNode }) {
  const spin = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const v = useRef(on ? speed : 0);
  useFrame(({ clock }, dt) => {
    const target = on ? speed : 0;
    v.current += (target - v.current) * Math.min(1, dt * (on ? 1.2 : 0.6));
    if (spin.current) spin.current.rotation[axis] += v.current * dt;
    // a standing fan's head turns slowly from side to side while it runs
    if (sway && head.current) head.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.6;
  });
  return (
    <group ref={head}>
      <group ref={spin}>{children}</group>
    </group>
  );
}

function StandingFanHead() {
  const on = useContext(ApplianceOn);
  return (
    <group position={[0, 1.25, 0]}>
      <Spin axis="y" speed={0} on={false} sway={on}>
        <group>
          {/* motor at the back, cage and spinning blades in front */}
          <Cyl p={[0, 0, -0.08]} r1={0.07} h={0.14} c="#E8E8E8" rot={[Math.PI / 2, 0, 0]} />
          <mesh position={[0, 0, 0.05]}>
            <torusGeometry args={[0.24, 0.012, 6, 28]} />
            <meshStandardMaterial color="#DADADA" metalness={0.4} roughness={0.4} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <B key={i} p={[0, 0, 0.05]} s={[0.48, 0.006, 0.006]} c="#CFCFCF" rot={[0, 0, (i * Math.PI) / 4]} />
          ))}
          <group position={[0, 0, 0.03]}>
            <Spin axis="z" speed={22} on={on}>
              <Cyl p={[0, 0, 0]} r1={0.035} h={0.04} c="#7FB8D8" rot={[Math.PI / 2, 0, 0]} />
              {[0, 1, 2].map((i) => (
                <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
                  <mesh position={[0.11, 0, 0]} rotation={[0.35, 0, 0]}>
                    <boxGeometry args={[0.2, 0.09, 0.008]} />
                    <meshStandardMaterial color="#7FB8D8" transparent opacity={0.85} />
                  </mesh>
                </group>
              ))}
            </Spin>
          </group>
        </group>
      </Spin>
    </group>
  );
}

function CeilingFanBlades({ y }: { y: number }) {
  const on = useContext(ApplianceOn);
  return (
    <group position={[0, y, 0]}>
      <Spin axis="y" speed={9} on={on}>
        <Cyl p={[0, 0.02, 0]} r1={0.1} h={0.1} c="#EEE" />
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, (-i * Math.PI * 2) / 3, 0]}>
            <B p={[0.4, 0, 0]} s={[0.7, 0.02, 0.13]} c="#8A6440" rot={[0.12, 0, 0]} />
          </group>
        ))}
      </Spin>
    </group>
  );
}

/** Whether the mirror glass inside this piece shows a live reflection. */
export const MirrorLive = createContext(false);

/**
 * Mirror glass, facing +z. The biggest mirrors in the shop get a live
 * reflection; the rest get a glassy sheen with a slow light sweep.
 */
export function Glass({ p, s }: { p: V3; s: V3 }) {
  const live = useContext(MirrorLive);
  return live ? <LiveGlass p={p} w={s[0]} h={s[1]} /> : <FakeGlass p={p} w={s[0]} h={s[1]} />;
}

function LiveGlass({ p, w, h }: { p: V3; w: number; h: number }) {
  const mirror = useMemo(() => {
    const k = 420 / Math.max(w, h);
    const r = new Reflector(new THREE.PlaneGeometry(w, h), { textureWidth: Math.round(w * k), textureHeight: Math.round(h * k), color: new THREE.Color('#D8E4EA'), clipBias: 0.003 });
    return r;
  }, [w, h]);
  useEffect(() => () => {
    mirror.geometry.dispose();
    mirror.dispose();
  }, [mirror]);
  return (
    <group position={[p[0], p[1], p[2] + 0.007]}>
      <primitive object={mirror} />
    </group>
  );
}

function FakeGlass({ p, w, h }: { p: V3; w: number; h: number }) {
  const sweep = useRef<THREE.Mesh>(null);
  const t0 = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const m = sweep.current;
    if (!m) return;
    const t = ((clock.getElapsedTime() + t0) % 7) / 7; // one sweep every 7 seconds
    m.position.x = -w / 2 - 0.2 + t * (w + 0.4);
    m.visible = m.position.x > -w / 2 + 0.04 && m.position.x < w / 2 - 0.04;
  });
  const band = Math.min(0.14, w * 0.18);
  return (
    <group position={p}>
      <mesh>
        <boxGeometry args={[w, h, 0.01]} />
        <meshStandardMaterial color={MIRROR} metalness={0.55} roughness={0.08} />
      </mesh>
      {/* a soft lighter top, like a reflected ceiling */}
      <mesh position={[0, h * 0.25, 0.006]}>
        <planeGeometry args={[w * 0.98, h * 0.48]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.12} />
      </mesh>
      {/* two fixed streaks */}
      <mesh position={[-w * 0.22, h * 0.05, 0.007]} rotation={[0, 0, -0.5]}>
        <planeGeometry args={[band * 0.5, h * 0.9]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.16} />
      </mesh>
      <mesh position={[-w * 0.1, h * 0.05, 0.007]} rotation={[0, 0, -0.5]}>
        <planeGeometry args={[band * 0.2, h * 0.9]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.12} />
      </mesh>
      {/* the moving light sweep */}
      <mesh ref={sweep} position={[0, 0, 0.008]} rotation={[0, 0, -0.45]}>
        <planeGeometry args={[band, h * 0.8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}
const GOLD = '#D4AF37';
const CHROME = '#C9CED6';
const pal = (colors: string[], i: number, fb: string) => colors.length ? colors[i % colors.length] : fb;

/** A clothes rail with garments in the colours of what is on display. */
function Rail({ len, metal, metalness, colors, n }: { len: number; metal: string; metalness: number; colors: string[]; n: number }) {
  const half = len / 2 - 0.08;
  const items = Math.min(n, colors.length);
  return (
    <group>
      {[-half, half].map((x) => (
        <group key={x}>
          <Cyl p={[x, 0.8, 0]} r1={0.025} h={1.6} c={metal} m={metalness} rough={0.35} />
          <B p={[x, 0.02, 0]} s={[0.08, 0.04, 0.5]} c={metal} m={metalness} r={0.4} />
        </group>
      ))}
      <Cyl p={[0, 1.58, 0]} r1={0.02} h={len - 0.1} c={metal} m={metalness} rough={0.35} rot={[0, 0, Math.PI / 2]} />
      {Array.from({ length: items }, (_, i) => {
        const x = -half + 0.12 + (i * (2 * half - 0.24)) / Math.max(1, items - 1);
        const c = colors[i];
        const long = i % 3 === 1;
        return (
          <group key={i} position={[items === 1 ? 0 : x, 0, 0]}>
            <B p={[0, 1.52, 0]} s={[0.02, 0.1, 0.32]} c="#444" />
            <B p={[0, long ? 1.0 : 1.18, 0]} s={[0.07, long ? 0.95 : 0.6, 0.42]} c={c} r={0.9} />
          </group>
        );
      })}
    </group>
  );
}

function FoldedPile({ colors, n, w, y, d = 0.35 }: { colors: string[]; n: number; w: number; y: number; d?: number }) {
  const k = Math.min(n, colors.length);
  return (
    <>
      {Array.from({ length: k }, (_, i) => (
        <B key={i} p={[-w / 2 + (w / k) * (i + 0.5), y + 0.05, 0]} s={[(w / k) * 0.8, 0.1, d]} c={colors[i]} r={0.9} />
      ))}
    </>
  );
}

export function FloorPiece({ id, colors, selected }: { id: string; colors: string[]; selected?: boolean }) {
  const glow = selected ? <B p={[0, 0.01, 0]} s={[0.98, 0.02, 0.98]} c="#F59E0B" e="#F59E0B" ei={0.6} o={0.5} /> : null;
  switch (id) {
    case 'rustyRail':
      return <group>{glow}<Rail len={1.8} metal="#8A4B2A" metalness={0.3} colors={colors} n={10} /><B p={[0.5, 1.2, 0.02]} s={[0.15, 0.08, 0.02]} c="#5A2E16" /></group>;
    case 'chromeRail':
      return <group>{glow}<Rail len={1.8} metal={CHROME} metalness={0.9} colors={colors} n={15} /></group>;
    case 'goldRail':
      return <group>{glow}<Rail len={1.8} metal={GOLD} metalness={0.9} colors={colors} n={20} /><B p={[0, 0.06, 0]} s={[1.9, 0.12, 0.6]} c="#F4EFE6" /></group>;
    case 'woodTable':
      return (
        <group rotation={[0, 0, 0.02]}>
          {glow}
          <B p={[0, 0.74, 0]} s={[0.85, 0.05, 0.6]} c="#8A6440" r={0.95} />
          {[[-0.36, -0.24], [0.36, -0.24], [-0.36, 0.24], [0.36, 0.22]].map(([x, z], i) => (
            <B key={i} p={[x, 0.36, z]} s={[0.05, i === 3 ? 0.68 : 0.72, 0.05]} c="#6E4E30" />
          ))}
          <FoldedPile colors={colors} n={4} w={0.75} y={0.77} d={0.4} />
        </group>
      );
    case 'shoeRack':
      return (
        <group>
          {glow}
          {[0.15, 0.45, 0.75].map((y) => <B key={y} p={[0, y, 0]} s={[0.85, 0.03, 0.4]} c="#3A2A1E" />)}
          {[-0.42, 0.42].map((x) => <B key={x} p={[x, 0.45, 0]} s={[0.03, 0.9, 0.4]} c="#3A2A1E" />)}
          {Array.from({ length: Math.min(5, colors.length) }, (_, i) => (
            <group key={i} position={[-0.28 + (i % 3) * 0.28, 0.2 + Math.floor(i / 3) * 0.3, 0]}>
              <B p={[-0.05, 0.03, 0]} s={[0.07, 0.06, 0.22]} c={colors[i]} />
              <B p={[0.05, 0.03, 0]} s={[0.07, 0.06, 0.22]} c={colors[i]} />
            </group>
          ))}
        </group>
      );
    case 'mannequin':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.03, 0]} r1={0.22} h={0.05} c="#222" />
          <Cyl p={[0, 0.5, 0]} r1={0.02} h={0.95} c={CHROME} m={0.8} />
          <Cyl p={[0, 1.25, 0]} r1={0.16} r2={0.22} h={0.6} c={pal(colors, 0, '#EEE')} />
          <Cyl p={[0, 0.9, 0]} r1={0.3} r2={0.16} h={0.45} c={pal(colors, 1, '#DDD')} />
          <Ball p={[0, 1.66, 0]} r={0.1} c="#F2EDE6" />
        </group>
      );
    case 'jewelCounter':
      return (
        <group>
          {glow}
          <B p={[0, 0.45, 0]} s={[1.85, 0.9, 0.6]} c="#F4EFE6" />
          <B p={[0, 0.92, 0]} s={[1.85, 0.04, 0.6]} c={GOLD} m={0.8} r={0.3} />
          <B p={[0, 1.05, 0]} s={[1.75, 0.22, 0.5]} c="#CFE8F0" o={0.35} r={0.05} />
          {Array.from({ length: Math.min(8, Math.max(colors.length, 3)) }, (_, i) => (
            <Ball key={i} p={[-0.75 + i * 0.21, 0.98, 0.05 * (i % 2)]} r={0.035} c={GOLD} m={1} rough={0.2} e="#806010" ei={0.3} />
          ))}
        </group>
      );
    case 'standMirror':
    case 'goldMirror': {
      const f = id === 'goldMirror' ? GOLD : '#2A2A2E';
      return (
        <group rotation={[-0.06, 0, 0]}>
          {glow}
          <B p={[0, 0.95, 0]} s={[0.66, 1.7, 0.06]} c={f} m={id === 'goldMirror' ? 0.9 : 0.2} r={0.3} />
          <Glass p={[0, 0.95, 0.035]} s={[0.56, 1.6, 0.01]} />
          <B p={[0, 0.5, -0.25]} s={[0.04, 1, 0.04]} c={f} rot={[0.45, 0, 0]} />
        </group>
      );
    }
    case 'plasticChair':
      return (
        <group>
          {glow}
          <B p={[0, 0.42, 0]} s={[0.42, 0.04, 0.42]} c="#F2F2EE" />
          <B p={[0, 0.66, -0.2]} s={[0.42, 0.46, 0.04]} c="#F2F2EE" rot={[-0.12, 0, 0]} />
          {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z], i) => <B key={i} p={[x, 0.2, z]} s={[0.04, 0.42, 0.04]} c="#E6E6E0" />)}
        </group>
      );
    case 'hairStation':
    case 'salonChair': {
      const lux = id === 'salonChair';
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.06, 0.1]} r1={0.25} h={0.08} c={CHROME} m={0.8} />
          <Cyl p={[0, 0.25, 0.1]} r1={0.05} h={0.35} c={CHROME} m={0.8} />
          <B p={[0, 0.48, 0.1]} s={[0.5, 0.12, 0.5]} c={lux ? '#8E1F3A' : '#1E1E24'} />
          <B p={[0, 0.8, -0.12]} s={[0.5, 0.6, 0.1]} c={lux ? '#8E1F3A' : '#1E1E24'} />
          {lux ? (
            <>
              <Cyl p={[0, 1.15, -0.35]} r1={0.03} h={1.2} c={CHROME} m={0.8} rot={[0.3, 0, 0]} />
              <Ball p={[0, 1.5, 0.05]} r={0.26} c="#F2EDE6" />
            </>
          ) : (
            <B p={[0.38, 0.4, -0.3]} s={[0.25, 0.8, 0.25]} c="#6E4E30" />
          )}
        </group>
      );
    }
    case 'ringLight':
      return (
        <group>
          {glow}
          {[0, 2.1, 4.2].map((a) => <B key={a} p={[Math.cos(a) * 0.15, 0.4, Math.sin(a) * 0.15]} s={[0.02, 0.85, 0.02]} c="#222" rot={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]} />)}
          <Cyl p={[0, 1.1, 0]} r1={0.015} h={0.6} c="#222" />
          <mesh position={[0, 1.5, 0]} castShadow>
            <torusGeometry args={[0.2, 0.025, 8, 24]} />
            <meshStandardMaterial color="#FFF" emissive="#FFF6E0" emissiveIntensity={1.2} />
          </mesh>
        </group>
      );
    case 'makeupStation':
      return (
        <group>
          {glow}
          <B p={[0, 0.74, -0.1]} s={[1.6, 0.06, 0.5]} c="#F4EFE6" />
          {[-0.75, 0.75].map((x) => <B key={x} p={[x, 0.37, -0.1]} s={[0.06, 0.74, 0.46]} c="#E6DED2" />)}
          <B p={[0, 1.3, -0.33]} s={[1.2, 0.9, 0.04]} c="#E6DED2" />
          <Glass p={[0, 1.3, -0.3]} s={[1.05, 0.75, 0.01]} />
          {Array.from({ length: 8 }, (_, i) => <Ball key={i} p={[-0.56 + (i % 4) * 0.37 + (i < 4 ? 0 : 0), i < 4 ? 1.74 : 0.86, -0.29]} r={0.035} c="#FFF" e="#FFF3C8" ei={1.4} />)}
          <Cyl p={[0, 0.25, 0.35]} r1={0.18} h={0.45} c="#E46A9A" />
          {['#C2262E', '#E46A9A', '#1E1E24', GOLD].map((c, i) => <Cyl key={i} p={[-0.5 + i * 0.14, 0.82, 0]} r1={0.025} h={0.1} c={c} />)}
        </group>
      );
    case 'bench':
      return (
        <group>
          {glow}
          <B p={[0, 0.45, 0]} s={[1.8, 0.07, 0.42]} c="#8A6440" r={0.9} />
          {[-0.8, 0.8].map((x) => <B key={x} p={[x, 0.22, 0]} s={[0.07, 0.44, 0.38]} c="#6E4E30" />)}
        </group>
      );
    case 'sofa':
    case 'velvetSofa': {
      const lux = id === 'velvetSofa';
      const len = lux ? 2.8 : 1.85;
      const c = lux ? '#1F7A5A' : '#5A6C8A';
      return (
        <group>
          {glow}
          <B p={[0, 0.25, 0.02]} s={[len, 0.3, 0.75]} c={c} r={0.95} />
          <B p={[0, 0.48, 0.06]} s={[len - 0.3, 0.14, 0.62]} c={c} r={0.95} />
          <B p={[0, 0.72, -0.3]} s={[len, 0.6, 0.18]} c={c} r={0.95} />
          {[-len / 2 + 0.08, len / 2 - 0.08].map((x) => <B key={x} p={[x, 0.5, 0.02]} s={[0.16, 0.42, 0.75]} c={c} r={0.95} />)}
          {lux && [-len / 2 + 0.15, len / 2 - 0.15].map((x) => <Cyl key={x} p={[x, 0.05, 0.25]} r1={0.03} h={0.1} c={GOLD} m={0.9} />)}
        </group>
      );
    }
    case 'fan':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.03, 0]} r1={0.2} h={0.05} c="#EEE" />
          <Cyl p={[0, 0.6, 0]} r1={0.02} h={1.15} c="#DDD" />
          <StandingFanHead />
        </group>
      );
    case 'generator':
      return (
        <group>
          {glow}
          <B p={[0, 0.3, 0]} s={[0.8, 0.5, 0.55]} c="#2F5D3A" />
          <B p={[0, 0.58, 0]} s={[0.84, 0.06, 0.58]} c="#1E1E24" />
          {[-0.3, 0.3].map((x) => <Cyl key={x} p={[x, 0.08, 0.3]} r1={0.08} h={0.06} c="#1E1E24" rot={[Math.PI / 2, 0, 0]} />)}
          <B p={[0.25, 0.4, 0.28]} s={[0.2, 0.12, 0.02]} c="#333" />
        </group>
      );
    case 'plant':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.2, 0]} r1={0.18} r2={0.14} h={0.4} c="#B8553A" />
          <Ball p={[0, 0.65, 0]} r={0.28} c="#2F7A3A" rough={0.9} />
          <Ball p={[0.12, 0.9, 0.05]} r={0.18} c="#3A8E46" rough={0.9} />
          <Ball p={[-0.1, 0.85, -0.05]} r={0.16} c="#2A6A34" rough={0.9} />
        </group>
      );
    case 'rug':
      return (
        <group>
          <B p={[0, 0.012, 0]} s={[1.8, 0.02, 1.8]} c="#8E1F3A" r={1} />
          <B p={[0, 0.024, 0]} s={[1.4, 0.01, 1.4]} c="#C9A163" r={1} />
          <B p={[0, 0.03, 0]} s={[1.2, 0.01, 1.2]} c="#8E1F3A" r={1} />
        </group>
      );
    case 'fittingRoom':
      return (
        <group>
          {glow}
          {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, z], i) => <Cyl key={i} p={[x, 1.1, z]} r1={0.03} h={2.2} c={GOLD} m={0.8} />)}
          <B p={[0, 2.2, 0]} s={[1.85, 0.05, 1.85]} c={GOLD} m={0.8} />
          <B p={[0, 1.15, -0.9]} s={[1.8, 2.05, 0.04]} c="#7A3A8C" r={1} />
          <B p={[-0.9, 1.15, 0]} s={[0.04, 2.05, 1.8]} c="#7A3A8C" r={1} />
          <B p={[0.45, 1.15, 0.9]} s={[0.9, 2.05, 0.04]} c="#8A4A9C" r={1} />
          <B p={[0.9, 1.15, 0]} s={[0.04, 2.05, 1.8]} c="#7A3A8C" r={1} />
        </group>
      );
    case 'rollingRail':
      return (
        <group>
          {glow}
          <Rail len={0.9} metal={CHROME} metalness={0.8} colors={colors} n={8} />
          {[-0.37, 0.37].map((x) => [-0.2, 0.2].map((z) => <Ball key={`${x}${z}`} p={[x, 0.04, z]} r={0.04} c="#222" />))}
        </group>
      );
    case 'zRack':
      return (
        <group>
          {glow}
          <B p={[-0.3, 0.03, 0]} s={[1.3, 0.05, 0.08]} c="#1E1E24" rot={[0, 0.5, 0]} />
          <B p={[0.3, 0.03, 0]} s={[1.3, 0.05, 0.08]} c="#1E1E24" rot={[0, 0.5, 0]} />
          <Rail len={1.8} metal="#2A2A30" metalness={0.6} colors={colors} n={20} />
        </group>
      );
    case 'doubleRail':
      return (
        <group>
          {glow}
          <Rail len={1.8} metal={CHROME} metalness={0.9} colors={colors.slice(0, 12)} n={12} />
          <group position={[0, -0.75, 0]} scale={[1, 0.55, 1]}>
            <Cyl p={[0, 1.58, 0]} r1={0.02} h={1.7} c={CHROME} m={0.9} rough={0.35} rot={[0, 0, Math.PI / 2]} />
          </group>
          {colors.slice(12, 24).map((c, i, a) => <B key={i} p={[-0.75 + (i * 1.5) / Math.max(1, a.length - 1), 0.35, 0]} s={[0.07, 0.42, 0.4]} c={c} r={0.9} />)}
        </group>
      );
    case 'roundRack':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.03, 0]} r1={0.45} h={0.05} c="#2A2A30" m={0.6} />
          <Cyl p={[0, 0.7, 0]} r1={0.03} h={1.4} c={CHROME} m={0.9} />
          <mesh position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.72, 0.02, 6, 32]} />
            <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.3} />
          </mesh>
          {colors.slice(0, 30).map((c, i, a) => {
            const ang = (i / Math.max(1, a.length)) * Math.PI * 2;
            return <B key={i} p={[Math.cos(ang) * 0.72, 1.02, Math.sin(ang) * 0.72]} s={[0.06, 0.62, 0.34]} c={c} r={0.9} rot={[0, -ang, 0]} />;
          })}
        </group>
      );
    case 'nestingTables':
      return (
        <group>
          {glow}
          {[[-0.55, 0.75, 0.6], [0.05, 0.6, 0.6], [0.6, 0.45, 0.5]].map(([x, h, w], k) => (
            <group key={k} position={[x, 0, 0]}>
              <B p={[0, h, 0]} s={[w, 0.04, 0.55]} c="#C9A27A" />
              {[-w / 2 + 0.04, w / 2 - 0.04].map((lx) => <B key={lx} p={[lx, h / 2, 0]} s={[0.04, h, 0.5]} c="#B08A62" />)}
              <FoldedPile colors={colors.slice(k * 4)} n={4} w={w - 0.08} y={h + 0.02} d={0.4} />
            </group>
          ))}
        </group>
      );
    case 'spinner':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.03, 0]} r1={0.25} h={0.05} c="#222" />
          <Cyl p={[0, 0.8, 0]} r1={0.02} h={1.55} c={CHROME} m={0.9} />
          {[0.9, 1.2, 1.5].map((y, k) => (
            <group key={y}>
              <Cyl p={[0, y, 0]} r1={0.22} h={0.02} c={CHROME} m={0.9} />
              {Array.from({ length: 4 }, (_, i) => <Ball key={i} p={[Math.cos(i * 1.57 + k) * 0.2, y - 0.07, Math.sin(i * 1.57 + k) * 0.2]} r={0.035} c={pal(colors, i + k * 4, GOLD)} m={0.6} />)}
            </group>
          ))}
        </group>
      );
    case 'woodShelving':
      return (
        <group position={[0, 0, -0.1]}>
          {glow}
          {[-0.9, 0.9].map((x) => <B key={x} p={[x, 0.9, 0]} s={[0.05, 1.8, 0.45]} c="#9A6E44" />)}
          <B p={[0, 0.9, -0.21]} s={[1.8, 1.8, 0.03]} c="#B4865A" />
          {[0.15, 0.6, 1.05, 1.5].map((y, k) => (
            <group key={y}>
              <B p={[0, y, 0]} s={[1.78, 0.04, 0.44]} c="#9A6E44" />
              <FoldedPile colors={colors.slice(k * 5)} n={5} w={1.6} y={y + 0.02} d={0.34} />
            </group>
          ))}
        </group>
      );
    case 'islandTable':
      return (
        <group>
          {glow}
          <B p={[0, 0.4, 0]} s={[1.6, 0.8, 1.2]} c="#F4EFE6" />
          <B p={[0, 0.82, 0]} s={[1.7, 0.04, 1.3]} c={GOLD} m={0.8} r={0.3} />
          <B p={[0, 0.1, 0]} s={[1.5, 0.04, 1.1]} c="#FFF4DD" e="#FFE9B0" ei={0.6} />
          <FoldedPile colors={colors} n={7} w={1.5} y={0.85} d={0.5} />
          <group position={[0, 0, 0.35]}><FoldedPile colors={colors.slice(7)} n={7} w={1.5} y={0.85} d={0.3} /></group>
        </group>
      );
    case 'glassCabinet':
      return (
        <group position={[0, 0, -0.05]}>
          {glow}
          <B p={[0, 0.06, 0]} s={[1.85, 0.12, 0.55]} c="#1E1B22" />
          <B p={[0, 1.95, 0]} s={[1.85, 0.08, 0.55]} c="#1E1B22" e="#FFE7B0" ei={0.15} />
          <B p={[0, 1.0, 0]} s={[1.8, 1.8, 0.5]} c="#D6EEF5" o={0.22} r={0.05} />
          {[-0.92, 0.92].map((x) => <B key={x} p={[x, 1.0, 0]} s={[0.04, 1.9, 0.55]} c={GOLD} m={0.9} r={0.3} />)}
          {[0.5, 1.0, 1.5].map((y, k) => (
            <group key={y}>
              <B p={[0, y, 0]} s={[1.75, 0.02, 0.45]} c="#E8F6FA" o={0.5} />
              <FoldedPile colors={colors.slice(k * 5)} n={5} w={1.5} y={y + 0.01} d={0.3} />
            </group>
          ))}
        </group>
      );
    case 'archMirror':
      return (
        <group rotation={[-0.05, 0, 0]}>
          {glow}
          <B p={[0, 0.85, 0]} s={[0.7, 1.5, 0.06]} c="#E8D9B0" m={0.4} r={0.3} />
          <Cyl p={[0, 1.6, 0]} r1={0.35} h={0.06} c="#E8D9B0" rot={[Math.PI / 2, 0, 0]} seg={20} m={0.4} />
          <Glass p={[0, 0.85, 0.035]} s={[0.6, 1.45, 0.01]} />
          <Cyl p={[0, 1.6, 0.035]} r1={0.3} h={0.01} c={MIRROR} rot={[Math.PI / 2, 0, 0]} seg={20} m={0.9} />
        </group>
      );
    case 'hoodDryer':
      return (
        <group>
          {glow}
          <B p={[0, 0.42, 0.05]} s={[0.5, 0.1, 0.5]} c="#2A2A30" />
          <B p={[0, 0.7, -0.15]} s={[0.5, 0.5, 0.08]} c="#2A2A30" />
          {[-0.22, 0.22].map((x) => <B key={x} p={[x, 0.2, 0.05]} s={[0.04, 0.4, 0.45]} c={CHROME} m={0.8} />)}
          <Cyl p={[0, 1.1, -0.25]} r1={0.025} h={0.9} c={CHROME} m={0.8} />
          <Ball p={[0, 1.28, -0.05]} r={0.24} c="#F2EDE6" />
        </group>
      );
    case 'vanity':
      return (
        <group>
          {glow}
          <B p={[0, 0.74, -0.1]} s={[1.7, 0.06, 0.5]} c="#F8F4EE" />
          <B p={[0, 0.37, -0.1]} s={[1.6, 0.7, 0.44]} c="#F2E8DA" />
          <B p={[0, 1.4, -0.33]} s={[1.4, 1.1, 0.05]} c={GOLD} m={0.8} r={0.3} />
          <Glass p={[0, 1.4, -0.3]} s={[1.25, 0.95, 0.01]} />
          {Array.from({ length: 14 }, (_, i) => {
            const side = i < 4 ? [-0.66, 1.0 + i * 0.27] : i < 8 ? [0.66, 1.0 + (i - 4) * 0.27] : [-0.55 + (i - 8) * 0.22, 1.93];
            return <Ball key={i} p={[side[0], side[1], -0.28]} r={0.04} c="#FFF" e="#FFF3C8" ei={1.6} />;
          })}
          <Cyl p={[0, 0.25, 0.35]} r1={0.2} h={0.45} c="#F2CACC" />
        </group>
      );
    case 'steamer':
      return (
        <group>
          {glow}
          <B p={[0, 0.15, 0]} s={[0.35, 0.3, 0.3]} c="#E9EEF2" />
          <Cyl p={[0, 0.85, -0.05]} r1={0.015} h={1.3} c={CHROME} m={0.8} />
          <Cyl p={[0.12, 0.7, 0.05]} r1={0.02} h={0.9} c="#2A2A30" rot={[0, 0, 0.25]} />
          <B p={[0.22, 1.15, 0.08]} s={[0.08, 0.16, 0.06]} c="#E46A9A" />
        </group>
      );
    case 'stool':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.45, 0]} r1={0.2} h={0.1} c="#C2262E" rough={0.95} />
          {[0, 2.1, 4.2].map((a) => <B key={a} p={[Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12]} s={[0.03, 0.42, 0.03]} c="#3A2A1E" rot={[Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15]} />)}
        </group>
      );
    case 'ottoman':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.22, 0]} r1={0.38} h={0.42} c="#E07AA0" rough={0.95} seg={20} />
          <Cyl p={[0, 0.45, 0]} r1={0.36} h={0.04} c="#F2A6C2" rough={0.95} seg={20} />
          <Ball p={[0, 0.47, 0]} r={0.03} c={GOLD} m={0.9} />
        </group>
      );
    case 'standingAc':
      return (
        <group position={[0, 0, -0.1]}>
          {glow}
          <B p={[0, 0.9, 0]} s={[0.45, 1.8, 0.35]} c="#F6F6F2" />
          <B p={[0, 1.35, 0.18]} s={[0.35, 0.5, 0.02]} c="#CCD3D8" />
          <B p={[0, 0.7, 0.18]} s={[0.1, 0.05, 0.01]} c="#2A8A5A" e="#3AD08A" ei={1} />
        </group>
      );
    case 'smallGen':
      return (
        <group>
          {glow}
          <B p={[0, 0.25, 0]} s={[0.6, 0.38, 0.42]} c="#C2262E" />
          <B p={[0, 0.48, 0]} s={[0.5, 0.08, 0.3]} c="#D8D8D8" m={0.6} />
          <Cyl p={[-0.2, 0.25, 0.22]} r1={0.08} h={0.04} c="#222" rot={[Math.PI / 2, 0, 0]} />
          <Cyl p={[0.3, 0.12, 0.1]} r1={0.03} h={0.2} c="#555" rot={[0, 0, Math.PI / 2]} />
        </group>
      );
    case 'waterDispenser':
      return (
        <group>
          {glow}
          <B p={[0, 0.5, 0]} s={[0.35, 1.0, 0.35]} c="#F2F2EE" />
          <Cyl p={[0, 1.22, 0]} r1={0.16} r2={0.14} h={0.42} c="#9FD3EE" />
          <B p={[-0.07, 0.75, 0.18]} s={[0.04, 0.05, 0.03]} c="#3A7BD5" />
          <B p={[0.07, 0.75, 0.18]} s={[0.04, 0.05, 0.03]} c="#C2262E" />
        </group>
      );
    case 'speaker':
      return (
        <group>
          {glow}
          <B p={[0, 0.35, 0]} s={[0.3, 0.7, 0.28]} c="#1E1E24" />
          <Cyl p={[0, 0.5, 0.145]} r1={0.09} h={0.02} c="#333" rot={[Math.PI / 2, 0, 0]} />
          <Cyl p={[0, 0.25, 0.145]} r1={0.06} h={0.02} c="#333" rot={[Math.PI / 2, 0, 0]} />
          <B p={[0, 0.66, 0.145]} s={[0.2, 0.02, 0.01]} c="#3AD0FF" e="#3AD0FF" ei={1.2} />
        </group>
      );
    case 'diffuser':
      return (
        <group>
          {glow}
          <B p={[0, 0.3, 0]} s={[0.3, 0.6, 0.3]} c="#C9A27A" />
          <Cyl p={[0, 0.7, 0]} r1={0.1} r2={0.06} h={0.2} c="#F2EDE6" />
          <Ball p={[0, 0.9, 0]} r={0.08} c="#FFFFFF" o={0.3} />
        </group>
      );
    case 'snakePlant':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.2, 0]} r1={0.16} h={0.4} c="#F2EDE6" />
          {[-0.08, 0, 0.08, -0.04, 0.05].map((x, i) => <B key={i} p={[x, 0.75 + (i % 2) * 0.1, (i - 2) * 0.03]} s={[0.05, 0.75 + (i % 3) * 0.15, 0.015]} c={i % 2 ? '#3A6A2E' : '#5A8A3A'} rot={[0, i * 0.7, (i - 2) * 0.06]} />)}
        </group>
      );
    case 'palm':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.22, 0]} r1={0.2} r2={0.16} h={0.44} c="#1E1E24" />
          <Cyl p={[0, 0.9, 0]} r1={0.04} h={1.0} c="#7A5A3A" />
          {Array.from({ length: 7 }, (_, i) => <B key={i} p={[Math.cos(i * 0.9) * 0.3, 1.45, Math.sin(i * 0.9) * 0.3]} s={[0.7, 0.02, 0.16]} c="#2F7A3A" rot={[0, -i * 0.9, -0.5]} />)}
        </group>
      );
    case 'flowers':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.35, 0]} r1={0.12} r2={0.18} h={0.7} c="#F2EDE6" />
          <Cyl p={[0, 0.8, 0]} r1={0.08} h={0.2} c="#CFE8F0" />
          {Array.from({ length: 7 }, (_, i) => <Ball key={i} p={[Math.cos(i) * 0.12, 1.0 + (i % 3) * 0.05, Math.sin(i) * 0.12]} r={0.06} c={i % 2 ? '#E0457A' : '#F6A6C0'} />)}
        </group>
      );
    case 'fluffyRug':
      return <Cyl p={[0, 0.015, 0]} r1={0.95} h={0.03} c="#F6C6D6" rough={1} seg={28} />;
    case 'persianRug':
      return (
        <group>
          <B p={[0, 0.012, 0]} s={[2.8, 0.02, 1.8]} c="#7A1E26" r={1} />
          <B p={[0, 0.024, 0]} s={[2.4, 0.01, 1.4]} c="#C9A163" r={1} />
          <B p={[0, 0.03, 0]} s={[2.2, 0.01, 1.2]} c="#8E2A30" r={1} />
          <B p={[0, 0.036, 0]} s={[0.8, 0.01, 0.5]} c="#1F3A5A" r={1} />
        </group>
      );
    case 'curtainCorner':
      return (
        <group>
          {glow}
          <Cyl p={[0.45, 1.1, 0.45]} r1={0.02} h={2.2} c={CHROME} m={0.8} />
          <B p={[0, 2.2, -0.45]} s={[0.95, 0.03, 0.03]} c={CHROME} m={0.8} />
          <B p={[0.45, 2.2, 0]} s={[0.03, 0.03, 0.95]} c={CHROME} m={0.8} />
          <B p={[-0.05, 1.15, -0.45]} s={[0.85, 2.0, 0.03]} c="#E8D9B0" r={1} />
          <B p={[0.45, 1.15, -0.1]} s={[0.03, 2.0, 0.6]} c="#E8D9B0" r={1} />
        </group>
      );
    case 'windowPodium':
      return (
        <group>
          {glow}
          <B p={[0, 0.12, 0]} s={[1.8, 0.24, 0.8]} c="#F4EFE6" />
          {[-0.45, 0.45].map((x, k) => (
            <group key={x} position={[x, 0.24, 0]}>
              <Cyl p={[0, 0.45, 0]} r1={0.02} h={0.9} c={CHROME} m={0.8} />
              <Cyl p={[0, 1.15, 0]} r1={0.15} r2={0.2} h={0.55} c={pal(colors, k * 2, '#E86A2E')} />
              <Cyl p={[0, 0.8, 0]} r1={0.28} r2={0.15} h={0.45} c={pal(colors, k * 2 + 1, '#2846A8')} />
              <Ball p={[0, 1.52, 0]} r={0.09} c="#F2EDE6" />
            </group>
          ))}
        </group>
      );
    case 'boutiqueDesk':
      return <group>{glow}<B p={[0,0.48,0]} s={[0.9,0.9,0.65]} c="#7A4A2A" r={0.65}/><B p={[0,0.95,0.02]} s={[1,0.08,0.72]} c="#C69A63" r={0.4}/><B p={[0,0.72,0.35]} s={[0.58,0.18,0.02]} c="#F4EFE6"/><B p={[0.25,1.02,0.02]} s={[0.2,0.02,0.12]} c={GOLD}/></group>;
    case 'doubleSofa':
      return <group>{glow}<B p={[0,0.25,0]} s={[1.85,0.3,0.78]} c="#4F688B" r={0.95}/><B p={[0,0.48,-0.25]} s={[1.85,0.55,0.22]} c="#3F5474" r={0.95}/>{[-0.48,0.48].map(x=><B key={x} p={[x,0.5,0.03]} s={[0.76,0.12,0.54]} c="#6F87A9" r={0.95}/>)}{[-0.86,0.86].map(x=><B key={x} p={[x,0.43,0.02]} s={[0.14,0.42,0.78]} c="#344660" r={0.95}/>)}</group>;
    case 'luxeOttoman':
      return <group>{glow}<Cyl p={[0,0.22,0]} r1={0.36} h={0.42} c="#8E1F3A" seg={16}/><Cyl p={[0,0.45,0]} r1={0.38} h={0.12} c="#C85C7A" seg={16}/><Cyl p={[0,0.05,0]} r1={0.29} h={0.08} c={GOLD} seg={16} m={0.7}/></group>;
    case 'litMannequin':
    case 'goldMannequin':
      return <group>{glow}<Cyl p={[0,0.04,0]} r1={0.28} h={0.08} c={id==='goldMannequin'?GOLD:'#292929'} m={0.65}/><Cyl p={[0,0.52,0]} r1={0.025} h={0.9} c={CHROME} m={0.85}/><Cyl p={[0,1.13,0]} r1={0.16} r2={0.22} h={0.52} c={pal(colors,0,'#E9A4B7')}/><Cyl p={[0,0.83,0]} r1={0.25} r2={0.14} h={0.38} c={pal(colors,1,'#263C69')}/><Ball p={[0,1.48,0]} r={0.095} c="#F2EDE6"/>{id==='goldMannequin'&&<Cyl p={[0,0.1,0]} r1={0.2} h={0.08} c={GOLD} m={0.8}/>}</group>;
    case 'sunglassesSpinner':
      return <group>{glow}<Cyl p={[0,0.08,0]} r1={0.3} h={0.14} c={CHROME} m={0.8}/><Cyl p={[0,0.53,0]} r1={0.035} h={0.85} c={GOLD} m={0.8}/><Cyl p={[0,0.98,0]} r1={0.28} h={0.06} c="#222" m={0.4}/>{Array.from({length:8},(_,i)=><group key={i} rotation={[0,i*Math.PI/4,0]}><B p={[0,0.82,0.24]} s={[0.2,0.06,0.1]} c={['#222','#8E1F3A','#C69A63'][i%3]}/><B p={[0,0.88,0.29]} s={[0.08,0.05,0.02]} c="#171717"/></group>)}</group>;
    case 'jewelleryDisplay':
      return <group>{glow}<B p={[0,0.42,0]} s={[1.75,0.8,0.58]} c="#E9E2D7"/><B p={[0,0.84,0]} s={[1.8,0.06,0.62]} c={GOLD} m={0.8}/><B p={[0,1.03,0]} s={[1.72,0.3,0.55]} c="#BBD8E6" o={0.32}/>{Array.from({length:8},(_,i)=><group key={i} position={[-0.72+i*0.205,0.9,0]}><Cyl p={[0,0.03,0]} r1={0.045} h={0.025} c={GOLD} m={0.8}/><Ball p={[0,0.08,0]} r={0.035} c={['#C2262E','#3C6EAA','#58A879'][i%3]} e="#FFFFFF" ei={0.15}/></group>)}</group>;
    case 'purseIsland':
      return <group>{glow}<B p={[0,0.12,0]} s={[1.8,0.24,1.65]} c="#E7D8C2"/><B p={[0,0.25,0]} s={[1.72,0.06,1.55]} c={GOLD} m={0.65}/>{[-0.55,0,0.55].map((x,i)=><group key={x} position={[x,0.28,0]}><B p={[0,0.24,0]} s={[0.34,0.42,0.24]} c={['#8E1F3A','#171717','#C69A63'][i]}/><mesh position={[0,0.49,0]}><torusGeometry args={[0.09,0.018,6,12]}/><meshStandardMaterial color={GOLD} metalness={0.7}/></mesh><B p={[0,0.5,0]} s={[0.16,0.02,0.02]} c={GOLD}/></group>)}</group>;
    case 'scarfStand':
      return <group>{glow}<Cyl p={[0,0.08,0]} r1={0.26} h={0.14} c="#6B452E"/><Cyl p={[0,0.65,0]} r1={0.025} h={1.15} c={GOLD} m={0.65}/><Cyl p={[0,1.22,0]} r1={0.32} h={0.06} c="#8A6440"/>{Array.from({length:7},(_,i)=><B key={i} p={[Math.cos(i*Math.PI*2/7)*0.24,0.98,Math.sin(i*Math.PI*2/7)*0.24]} s={[0.16,0.28,0.05]} c={['#C2262E','#F2C14E','#1C7C54','#6D4AA0'][i%4]} rot={[0,i*Math.PI/3,0]}/>)}</group>;
    case 'shoeBench':
      return <group>{glow}<B p={[0,0.42,0]} s={[1.82,0.12,0.55]} c="#8A6440" r={0.6}/>{[-0.78,0.78].map(x=><B key={x} p={[x,0.21,0]} s={[0.08,0.42,0.5]} c="#5B3B26"/>)}<B p={[0,0.5,-0.2]} s={[1.8,0.04,0.08]} c={GOLD}/></group>;
    case 'premiumFitting':
      return <group>{glow}<B p={[0,1,0]} s={[1.8,0.08,1.8]} c="#D6C5A6"/>{[-0.82,0.82].map(x=><B key={x} p={[x,1,0]} s={[0.08,2,1.8]} c="#8E1F3A"/>)}<B p={[0,1,0.9]} s={[1.8,2,0.08]} c="#8E1F3A"/><B p={[0,1.97,0.82]} s={[1.7,0.06,0.06]} c={GOLD}/><B p={[0.55,0.9,0.96]} s={[0.28,0.12,0.02]} c="#E8C7D0"/></group>;
    case 'makeupChair':
      return <group>{glow}<Cyl p={[0,0.07,0]} r1={0.22} h={0.12} c={CHROME} m={0.8}/><Cyl p={[0,0.28,0]} r1={0.045} h={0.34} c={CHROME}/><B p={[0,0.48,0]} s={[0.55,0.14,0.52]} c="#8E1F3A" r={0.95}/><B p={[0,0.82,-0.18]} s={[0.55,0.62,0.12]} c="#8E1F3A" r={0.95}/><B p={[0,1.16,-0.2]} s={[0.48,0.08,0.12]} c={GOLD}/></group>;
    case 'hairMirror':
    case 'fullLengthMirror':
      return <group>{glow}<B p={[0,0.98,-0.04]} s={[0.76,1.78,0.08]} c={id==='fullLengthMirror'?GOLD:'#2A2A2E'} m={id==='fullLengthMirror'?0.75:0.2}/><Glass p={[0,0.98,0.01]} s={[0.64,1.62,0.01]}/>{id==='hairMirror'&&<><B p={[0,0.18,0.2]} s={[0.8,0.32,0.48]} c="#8A6440"/><B p={[0,0.38,0.42]} s={[0.72,0.08,0.05]} c="#C69A63"/>{[-0.25,0,0.25].map(x=><Cyl key={x} p={[x,0.48,0.42]} r1={0.035} h={0.12} c={GOLD}/>)}</>}</group>;
    case 'salonWashBasin':
      return <group>{glow}<B p={[0,0.36,0]} s={[0.72,0.68,0.55]} c="#F4EFE6"/><B p={[0,0.72,0]} s={[0.78,0.08,0.6]} c="#E7E9EC"/><B p={[0,0.78,0.04]} s={[0.54,0.03,0.34]} c="#BBD8E6" o={0.8}/><Cyl p={[0,0.84,-0.15]} r1={0.025} h={0.2} c={CHROME}/><B p={[0,0.94,-0.15]} s={[0.16,0.03,0.04]} c={CHROME}/></group>;
    case 'nailPolishRack':
      return <group>{glow}<B p={[0,0.36,0]} s={[0.82,0.72,0.42]} c="#8A6440"/>{[0.18,0.4,0.62].map((y,k)=><B key={y} p={[0,y,0.23]} s={[0.78,0.035,0.03]} c={GOLD}/>)}{Array.from({length:12},(_,i)=><group key={i} position={[-0.34+(i%4)*0.23,0.24+Math.floor(i/4)*0.2,0.26]}><Cyl p={[0,0.05,0]} r1={0.035} h={0.1} c={['#C2262E','#F06292','#6D4AA0','#171717','#E8B84A'][i%5]}/><Cyl p={[0,0.12,0]} r1={0.014} h={0.05} c="#222"/></group>)}</group>;
    case 'nailDryer':
      return <group>{glow}<B p={[0,0.22,0]} s={[0.82,0.4,0.56]} c="#E9E9E5" r={0.4}/><B p={[0,0.44,0.02]} s={[0.5,0.06,0.38]} c="#C9D6DF"/><B p={[0,0.27,0.29]} s={[0.4,0.08,0.02]} c="#333"/><Ball p={[0,0.3,0.31]} r={0.035} c="#35B8D8" e="#35B8D8" ei={0.7}/></group>;
    case 'softboxLight':
      return <group>{glow}{[-0.3,0.3].map(x=><B key={x} p={[x,0.62,0]} s={[0.035,1.2,0.035]} c="#222"/>) }<B p={[0,1.22,0]} s={[0.78,0.65,0.1]} c="#222"/><B p={[0,1.22,0.06]} s={[0.68,0.55,0.02]} c="#FFF7E6" e="#FFF1CC" ei={0.6}/><Cyl p={[0,0.06,0]} r1={0.28} h={0.08} c="#222"/></group>;
    case 'aromaMachine':
      return <group>{glow}<Cyl p={[0,0.23,0]} r1={0.22} h={0.42} c="#E9E3D7" seg={16}/><Cyl p={[0,0.47,0]} r1={0.17} h={0.06} c={GOLD}/><Cyl p={[0,0.52,0]} r1={0.035} h={0.12} c="#444"/><Ball p={[0,0.68,0]} r={0.12} c="#DCECF5" o={0.25}/></group>;
    case 'chilledWater':
      return <group>{glow}<B p={[0,0.48,0]} s={[0.52,0.88,0.5]} c="#F4EFE6"/><B p={[0,0.92,0]} s={[0.56,0.06,0.54]} c="#C9D6DF"/><Cyl p={[0,1.22,0]} r1={0.17} r2={0.2} h={0.52} c="#BBD8E6"/><Cyl p={[0,1.28,0]} r1={0.18} h={0.06} c="#5B8CB8"/><B p={[0,0.67,0.28]} s={[0.08,0.18,0.02]} c="#C2262E"/><B p={[0.15,0.67,0.28]} s={[0.08,0.18,0.02]} c="#2C6DA4"/></group>;
    case 'inverterPanel':
      return <group>{glow}<B p={[0,0.55,0]} s={[0.95,0.05,0.68]} c="#202B45" m={0.35} rot={[0.35,0,0]}/><B p={[0,0.57,0.02]} s={[0.88,0.015,0.6]} c="#3268A5" m={0.4} rot={[0.35,0,0]}/>{[-0.3,0,0.3].map(x=><B key={x} p={[x,0.6,0.05]} s={[0.01,0.02,0.56]} c="#8DB9E7" rot={[0.35,0,0]}/>)}</group>;
    case 'nailStation':
      return (
        <group>
          {glow}
          <B p={[0, 0.72, -0.04]} s={[1.08, 0.09, 0.58]} c="#F4EFE6" r={0.38} />
          <B p={[0, 0.47, -0.04]} s={[0.84, 0.42, 0.45]} c="#E7DED2" r={0.5} />
          <B p={[0, 0.51, 0.2]} s={[0.78, 0.06, 0.04]} c={GOLD} m={0.65} />
          {[-0.46, 0.46].map((x) => <B key={x} p={[x, 0.35, -0.04]} s={[0.06, 0.68, 0.5]} c="#C8BBAA" r={0.45} />)}
          <B p={[0, 0.8, 0.16]} s={[0.4, 0.1, 0.2]} c="#E5A6BA" r={0.95} />
          {Array.from({ length: 7 }, (_, i) => (
            <group key={i} position={[-0.43 + i * 0.14, 0.82, -0.15]}>
              <Cyl p={[0, 0.06, 0]} r1={0.035} h={0.12} c={['#C2262E', '#E46A9A', '#6D4AA0', '#111827', '#E8B84A'][i % 5]} seg={10} />
              <Cyl p={[0, 0.13, 0]} r1={0.014} h={0.035} c="#27272A" seg={8} />
            </group>
          ))}
          <Cyl p={[0.34, 0.84, 0.01]} r1={0.1} h={0.035} c={CHROME} m={0.75} />
          <Cyl p={[0.37, 0.98, 0.01]} r1={0.018} h={0.26} c={CHROME} m={0.7} rot={[0, 0, -0.35]} />
          <B p={[0.3, 1.1, 0.04]} s={[0.22, 0.06, 0.16]} c="#FDFDF8" e="#FFF1D0" ei={0.25} />
          <B p={[0, 0.05, 0]} s={[1.0, 0.04, 0.55]} c="#8A6440" />
        </group>
      );
    case 'posTerminal':
      return (
        <group>
          {glow}
          <B p={[0, 0.08, 0]} s={[0.46, 0.12, 0.38]} c="#30343B" r={0.35} />
          <B p={[0, 0.42, -0.02]} s={[0.1, 0.62, 0.1]} c={CHROME} m={0.7} r={0.35} />
          <B p={[0, 0.77, 0]} s={[0.42, 0.26, 0.34]} c="#242832" r={0.35} rot={[-0.22, 0, 0]} />
          <B p={[0, 0.79, 0.176]} s={[0.32, 0.15, 0.012]} c="#17354C" e="#235C83" ei={0.55} rot={[-0.22, 0, 0]} />
          <B p={[0, 0.69, 0.18]} s={[0.18, 0.025, 0.012]} c="#DDECF7" rot={[-0.22, 0, 0]} />
          {Array.from({ length: 9 }, (_, i) => (
            <B key={i} p={[-0.105 + (i % 3) * 0.105, 0.73 - Math.floor(i / 3) * 0.045, 0.19]} s={[0.045, 0.025, 0.012]} c={i === 8 ? '#56B982' : '#CBD2D9'} r={0.4} />
          ))}
          <B p={[0.16, 0.74, 0.18]} s={[0.06, 0.06, 0.018]} c="#E8B84A" r={0.4} />
          <B p={[0, 0.63, 0.2]} s={[0.12, 0.025, 0.02]} c="#15171B" />
        </group>
      );
    case 'alterationsCorner':
      return (
        <group>
          {glow}
          <B p={[0, 0.7, 0]} s={[1.72, 0.08, 0.58]} c="#A77A4E" r={0.85} />
          {[-0.75, 0.75].map((x) => <B key={x} p={[x, 0.35, 0]} s={[0.08, 0.68, 0.5]} c="#6E4E30" />)}
          <B p={[-0.35, 0.88, -0.03]} s={[0.55, 0.28, 0.3]} c="#E3E5E8" r={0.45} />
          <B p={[-0.14, 1.0, 0.0]} s={[0.16, 0.26, 0.3]} c="#D7DBE0" r={0.45} />
          <B p={[-0.1, 1.08, 0.16]} s={[0.28, 0.06, 0.1]} c="#C2C7CE" />
          <Cyl p={[-0.1, 1.13, 0.13]} r1={0.015} h={0.22} c="#33383F" seg={8} />
          <Cyl p={[-0.36, 1.09, -0.08]} r1={0.07} h={0.12} c="#F4EFE6" seg={12} />
          <Cyl p={[-0.36, 1.17, -0.08]} r1={0.035} h={0.06} c="#E46A9A" seg={10} />
          <B p={[0.46, 0.79, -0.03]} s={[0.36, 0.04, 0.28]} c="#D5C1AA" r={0.9} />
          <B p={[0.46, 0.75, 0.13]} s={[0.28, 0.012, 0.22]} c="#8E1F3A" o={0.9} />
          <B p={[0.56, 0.05, 0]} s={[0.36, 0.04, 0.4]} c="#6E4E30" />
          <B p={[0.56, 0.24, 0]} s={[0.28, 0.38, 0.04]} c="#6E4E30" />
        </group>
      );
    case 'rechargeableFan':
      return (
        <group>
          {glow}
          <Cyl p={[0, 0.04, 0]} r1={0.24} h={0.07} c="#373A40" seg={20} />
          <Cyl p={[0, 0.62, 0]} r1={0.025} h={1.12} c={CHROME} m={0.7} />
          <B p={[0.1, 0.52, 0.04]} s={[0.16, 0.28, 0.1]} c="#F4EFE6" r={0.35} />
          <B p={[0.1, 0.56, 0.095]} s={[0.08, 0.04, 0.012]} c="#287D9B" e="#38BFE5" ei={0.45} />
          <StandingFanHead />
        </group>
      );
    default:
      return <B p={[0, 0.4, 0]} s={[0.6, 0.8, 0.6]} c="#999" />;
  }
}

export function WallPiece({ id, colors }: { id: string; colors: string[] }) {
  switch (id) {
    case 'hangerWall':
      return <group position={[0,0,0.16]}><B p={[0,1.4,0]} s={[1.9,1.8,0.08]} c="#6B452E"/>{[0.85,1.35,1.85].map(y=><group key={y}><B p={[0,y,0.13]} s={[1.8,0.04,0.24]} c={GOLD}/><B p={[0,y+0.12,0.1]} s={[1.7,0.12,0.05]} c="#8A6440"/>{Array.from({length:6},(_,i)=><group key={i} position={[-0.72+i*0.29,y+0.12,0.18]}><Cyl p={[0,0.08,0]} r1={0.012} h={0.16} c={CHROME}/><B p={[0,0.02,0]} s={[0.16,0.12,0.035]} c={pal(colors,i,'#C2262E')}/></group>)}</group>)}</group>;
    case 'bagWall':
      return <group position={[0,0,0.12]}><B p={[0,1.4,0]} s={[1.9,1.8,0.08]} c="#E9E0D3"/>{[0,1,2,3,4].map(i=><group key={i} position={[-0.75+i*0.37,1.25+(i%2)*0.28,0.1]}><B p={[0,0,0]} s={[0.26,0.28,0.13]} c={['#8E1F3A','#171717','#C69A63','#315D87'][i%4]}/><mesh position={[0,0.17,0]}><torusGeometry args={[0.07,0.012,6,12,Math.PI]}/><meshStandardMaterial color={GOLD} metalness={0.65}/></mesh><B p={[0,0.05,0.075]} s={[0.18,0.04,0.01]} c={GOLD}/></group>)}</group>;
    case 'shopAlarm':
      return <group position={[0,1.95,0.04]}><B p={[0,0,0]} s={[0.48,0.28,0.08]} c="#F4EFE6"/><Ball p={[0.14,0,0.06]} r={0.06} c="#C2262E" e="#C2262E" ei={0.5}/><B p={[-0.08,0,0.05]} s={[0.14,0.09,0.02]} c="#222"/></group>;
    case 'fireBlanket':
      return <group position={[0,1.65,0.04]}><B p={[0,0,0]} s={[0.48,0.6,0.08]} c="#C2262E"/><B p={[0,0,0.05]} s={[0.35,0.45,0.02]} c="#F4EFE6"/><B p={[0,0.05,0.07]} s={[0.25,0.05,0.02]} c="#C2262E"/><B p={[0,-0.05,0.07]} s={[0.25,0.05,0.02]} c="#C2262E"/></group>;
    case 'cctv':
      return (
        <group position={[0, 1.95, 0.08]}>
          <B p={[0, 0, -0.02]} s={[0.28, 0.1, 0.14]} c="#50535A" r={0.35} />
          <B p={[0, -0.07, 0.08]} s={[0.22, 0.12, 0.2]} c="#DDE0E4" r={0.45} rot={[-0.2, 0, 0]} />
          <Cyl p={[0, -0.12, 0.2]} r1={0.075} h={0.12} c="#232832" seg={16} rot={[Math.PI / 2, 0, 0]} />
          <Ball p={[0, -0.12, 0.265]} r={0.04} c="#101722" />
          <Ball p={[0, -0.12, 0.298]} r={0.018} c="#4C9ED9" e="#4C9ED9" ei={0.7} />
          <B p={[0, -0.17, 0.13]} s={[0.07, 0.025, 0.07]} c="#343840" />
        </group>
      );
    case 'fireExtinguisher':
      return (
        <group position={[0, 1.25, 0.08]}>
          <Cyl p={[0, 0, 0]} r1={0.12} h={0.5} c="#C2262E" seg={16} rough={0.45} />
          <Cyl p={[0, 0.27, 0]} r1={0.085} r2={0.12} h={0.1} c="#C2262E" seg={16} />
          <Cyl p={[0, 0.34, 0]} r1={0.045} h={0.07} c="#292D32" seg={10} />
          <B p={[0.02, 0.4, 0]} s={[0.18, 0.025, 0.035]} c="#262A30" />
          <Cyl p={[0.12, 0.23, 0.015]} r1={0.012} h={0.28} c="#262A30" seg={8} rot={[0, 0, -0.35]} />
          <Ball p={[0, 0.36, 0.03]} r={0.025} c={GOLD} m={0.8} />
          <B p={[0, -0.04, 0.125]} s={[0.13, 0.1, 0.012]} c="#F4EFE6" />
          <B p={[0, -0.04, 0.134]} s={[0.09, 0.035, 0.01]} c="#C2262E" />
        </group>
      );
    case 'flowerWall':
      return (
        <group position={[0, 1.4, 0.04]}>
          <B p={[0, 0, 0]} s={[1.9, 1.8, 0.08]} c="#29372F" r={0.95} />
          {Array.from({ length: 30 }, (_, i) => {
            const x = -0.78 + (i % 6) * 0.31;
            const y = -0.62 + Math.floor(i / 6) * 0.31;
            const petal = ['#F7C7D7', '#FFF2E0', '#E8A7BF', '#F3B6A9', '#DAB6F0'][i % 5];
            return (
              <group key={i} position={[x, y, 0.065]}>
                {[0, 1, 2, 3, 4].map((k) => {
                  const a = (k * Math.PI * 2) / 5;
                  return <Ball key={k} p={[Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0]} r={0.04} c={petal} rough={0.95} />;
                })}
                <Ball p={[0, 0, 0.035]} r={0.025} c="#E8B84A" />
                <B p={[0.07, -0.06, -0.01]} s={[0.055, 0.1, 0.015]} c="#367A4B" rot={[0, 0, -0.6]} />
              </group>
            );
          })}
        </group>
      );
    case 'crackedMirror':
      return (
        <group position={[0, 1.45, 0.03]}>
          <B p={[0, 0, 0]} s={[0.5, 0.75, 0.04]} c="#5A4A3A" />
          <B p={[0, 0, 0.025]} s={[0.42, 0.67, 0.01]} c="#9FB2BC" m={0.6} r={0.25} />
          <B p={[0.02, 0.05, 0.032]} s={[0.012, 0.5, 0.003]} c="#2A2A2A" rot={[0, 0, 0.5]} />
          <B p={[-0.08, -0.1, 0.032]} s={[0.01, 0.3, 0.003]} c="#2A2A2A" rot={[0, 0, -0.7]} />
        </group>
      );
    case 'wallShelf':
      return (
        <group position={[0, 0, 0.18]}>
          {[1.1, 1.6].map((y, k) => (
            <group key={y}>
              <B p={[0, y, 0]} s={[1.8, 0.04, 0.34]} c="#8A6440" />
              <FoldedPile colors={colors.slice(k * 3)} n={3} w={1.6} y={y + 0.02} d={0.28} />
            </group>
          ))}
        </group>
      );
    case 'displayWall':
      return (
        <group position={[0, 0, 0.1]}>
          <B p={[0, 1.4, -0.04]} s={[2.9, 2.2, 0.06]} c="#F4EFE6" e="#FFF4DD" ei={0.35} />
          {[0.75, 1.25, 1.75, 2.25].map((y, k) => (
            <group key={y}>
              <B p={[0, y, 0.12]} s={[2.7, 0.03, 0.3]} c={GOLD} m={0.8} r={0.3} />
              <FoldedPile colors={colors.slice(k * 4)} n={4} w={2.5} y={y + 0.02} d={0.24} />
            </group>
          ))}
        </group>
      );
    case 'mirrorWall':
      return (
        <group position={[0, 1.4, 0.04]}>
          <B p={[0, 0, 0]} s={[2.9, 2.3, 0.06]} c={GOLD} m={0.9} r={0.3} />
          <Glass p={[0, 0, 0.035]} s={[2.75, 2.15, 0.01]} />
        </group>
      );
    case 'ac':
      return (
        <group position={[0, 2.1, 0.12]}>
          <B p={[0, 0, 0]} s={[0.9, 0.3, 0.22]} c="#F6F6F2" />
          <B p={[0, -0.1, 0.11]} s={[0.8, 0.04, 0.02]} c="#BBB" />
        </group>
      );
    case 'cardboardSign':
      return (
        <group position={[0, 1.95, 0.02]} rotation={[0, 0, -0.04]}>
          <B p={[0, 0, 0]} s={[0.7, 0.3, 0.02]} c="#B48A5A" r={1} />
          {[-0.22, -0.08, 0.06, 0.2].map((x) => <B key={x} p={[x, 0, 0.012]} s={[0.09, 0.12, 0.003]} c="#1E1E24" />)}
        </group>
      );
    case 'wallArt':
      return (
        <group position={[0, 1.6, 0.03]}>
          <B p={[0, 0, 0]} s={[0.55, 0.7, 0.04]} c={GOLD} m={0.7} />
          <B p={[0, 0, 0.022]} s={[0.47, 0.62, 0.01]} c="#F6F1E8" />
          <B p={[0, 0.05, 0.03]} s={[0.15, 0.4, 0.005]} c="#C2262E" />
          <Ball p={[0, 0.3, 0.03]} r={0.05} c="#5A3A28" />
        </group>
      );
    case 'shopSign':
      return (
        <group position={[0, 2.15, 0.06]}>
          <B p={[0, 0, 0]} s={[1.7, 0.42, 0.1]} c="#1E1E24" />
          <B p={[0, 0, 0.055]} s={[1.5, 0.22, 0.01]} c={GOLD} e={GOLD} ei={0.7} m={0.6} />
        </group>
      );
    case 'neon':
      return (
        <group position={[0, 1.9, 0.06]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[-0.7 + i * 0.28, 0, 0]}>
              <torusGeometry args={[0.1, 0.018, 6, 16, i % 2 ? Math.PI * 1.4 : Math.PI * 2]} />
              <meshStandardMaterial color="#FF6AB8" emissive="#FF4AA8" emissiveIntensity={2.2} />
            </mesh>
          ))}
        </group>
      );
    case 'wallRail':
      return (
        <group position={[0, 0, 0.12]}>
          {[-0.85, 0.85].map((x) => <B key={x} p={[x, 1.75, -0.06]} s={[0.04, 0.04, 0.16]} c={CHROME} m={0.9} />)}
          <Cyl p={[0, 1.75, 0]} r1={0.02} h={1.75} c={CHROME} m={0.9} rot={[0, 0, Math.PI / 2]} />
          {colors.slice(0, 10).map((c, i, a) => <B key={i} p={[-0.75 + (i * 1.5) / Math.max(1, a.length - 1), 1.35, 0]} s={[0.12, 0.7, 0.04]} c={c} r={0.9} />)}
        </group>
      );
    case 'shoeWall':
      return (
        <group position={[0, 0, 0.1]}>
          {[0.7, 1.05, 1.4, 1.75].map((y, k) => (
            <group key={y}>
              <B p={[0, y, 0]} s={[1.8, 0.03, 0.22]} c="#F4EFE6" rot={[0.2, 0, 0]} />
              {Array.from({ length: 3 }, (_, i) => <B key={i} p={[-0.6 + i * 0.6, y + 0.05, 0]} s={[0.22, 0.07, 0.18]} c={pal(colors, k * 3 + i, '#555')} rot={[0.2, 0, 0]} />)}
            </group>
          ))}
        </group>
      );
    case 'slatwall':
      return (
        <group position={[0, 0, 0.04]}>
          <B p={[0, 1.3, -0.02]} s={[2.9, 2.0, 0.03]} c="#E8E2D6" />
          {Array.from({ length: 10 }, (_, i) => <B key={i} p={[0, 0.4 + i * 0.2, 0]} s={[2.9, 0.02, 0.02]} c="#BDB4A2" />)}
          {colors.slice(0, 9).map((c, i) => <B key={i} p={[-1.1 + (i % 9) * 0.27, 1.55, 0.08]} s={[0.1, 0.6, 0.04]} c={c} r={0.9} />)}
          <B p={[0, 0.85, 0.13]} s={[2.6, 0.03, 0.26]} c="#F4EFE6" />
          <FoldedPile colors={colors.slice(9)} n={9} w={2.5} y={0.87} d={0.22} />
        </group>
      );
    case 'wallMirror':
      return (
        <group position={[0, 1.15, 0.03]}>
          <B p={[0, 0, 0]} s={[0.5, 1.6, 0.04]} c="#1E1E24" />
          <Glass p={[0, 0, 0.025]} s={[0.42, 1.52, 0.01]} />
        </group>
      );
    case 'inverter':
      return (
        <group position={[0, 1.2, 0.1]}>
          <B p={[0, 0, 0]} s={[0.45, 0.6, 0.18]} c="#E9EEF2" />
          <B p={[0, 0.12, 0.095]} s={[0.25, 0.12, 0.01]} c="#123" e="#3AD08A" ei={0.8} />
          <B p={[0, -0.6, 0]} s={[0.5, 0.35, 0.25]} c="#2A2A30" />
        </group>
      );
    case 'tv':
      return (
        <group position={[0, 1.75, 0.05]}>
          <B p={[0, 0, 0]} s={[1.5, 0.85, 0.06]} c="#111" />
          <B p={[0, 0, 0.032]} s={[1.4, 0.76, 0.01]} c="#2A1E3A" e="#C86AB8" ei={0.5} />
          <B p={[-0.2, -0.1, 0.04]} s={[0.12, 0.45, 0.005]} c="#F2EDE6" e="#FFFFFF" ei={0.3} />
          <B p={[0.25, -0.1, 0.04]} s={[0.12, 0.45, 0.005]} c="#E3B23C" e="#E3B23C" ei={0.3} />
        </group>
      );
    case 'ledStrip':
      return (
        <group position={[0, 0, 0.03]}>
          <B p={[0, 2.25, 0]} s={[1.9, 0.03, 0.03]} c="#FFE7F2" e="#FF8AC8" ei={1.6} />
          <B p={[0, 0.25, 0]} s={[1.9, 0.03, 0.03]} c="#FFE7F2" e="#FF8AC8" ei={1.2} />
        </group>
      );
    case 'paintedSign':
      return (
        <group position={[0, 2.05, 0.03]}>
          <B p={[0, 0, 0]} s={[1.6, 0.4, 0.04]} c="#2846A8" />
          {Array.from({ length: 7 }, (_, i) => <B key={i} p={[-0.6 + i * 0.2, 0, 0.025]} s={[0.12, 0.18, 0.004]} c="#F6F1E8" />)}
        </group>
      );
    case 'ankaraArt':
      return (
        <group position={[0, 1.55, 0.03]}>
          {[-0.45, 0.45].map((x, k) => (
            <group key={x} position={[x, 0, 0]}>
              <B p={[0, 0, 0]} s={[0.75, 0.9, 0.04]} c="#1E1E24" />
              <B p={[0, 0, 0.022]} s={[0.67, 0.82, 0.01]} c={k ? '#D8892F' : '#2F5D3A'} />
              {Array.from({ length: 4 }, (_, i) => <Ball key={i} p={[-0.15 + (i % 2) * 0.3, -0.18 + Math.floor(i / 2) * 0.36, 0.03]} r={0.09} c={k ? '#2F5D3A' : '#D8892F'} />)}
            </group>
          ))}
        </group>
      );
    case 'clock':
      return (
        <group position={[0, 2.0, 0.03]}>
          <Cyl p={[0, 0, 0]} r1={0.2} h={0.04} c="#1E1E24" rot={[Math.PI / 2, 0, 0]} seg={20} />
          <Cyl p={[0, 0, 0.022]} r1={0.17} h={0.01} c="#F6F1E8" rot={[Math.PI / 2, 0, 0]} seg={20} />
          <B p={[0, 0.05, 0.03]} s={[0.015, 0.11, 0.005]} c="#111" />
          <B p={[0.04, 0, 0.03]} s={[0.09, 0.015, 0.005]} c="#111" />
        </group>
      );
    default:
      return <B p={[0, 1.5, 0.05]} s={[0.6, 0.4, 0.1]} c="#999" />;
  }
}

export function CeilingPiece({ id, h, at, off }: { id: string; h: number; at: V3; off?: boolean }) {
  const glowK = off ? 0 : 1;
  if (id === 'bareBulb')
    return (
      <group position={at}>
        <B p={[0, h - 0.3, 0]} s={[0.01, 0.6, 0.01]} c="#111" />
        <Ball p={[0, h - 0.65, 0]} r={0.06} c="#FFF2C0" e="#FFE29A" ei={2 * glowK} />
        {!off && <pointLight position={[0, h - 0.75, 0]} intensity={3} distance={6} color="#FFD58A" />}
      </group>
    );
  if (id === 'ceilingFan')
    return (
      <group position={at}>
        <B p={[0, h - 0.2, 0]} s={[0.03, 0.4, 0.03]} c="#DDD" />
        <ApplianceOn.Provider value={!off}>
          <CeilingFanBlades y={h - 0.44} />
        </ApplianceOn.Provider>
      </group>
    );
  if (id === 'tubeLight')
    return (
      <group position={at}>
        <B p={[0, h - 0.05, 0]} s={[1.2, 0.05, 0.12]} c="#EEE" />
        <Cyl p={[0, h - 0.11, 0]} r1={0.025} h={1.15} c="#FFF" e="#F2F8FF" ei={2 * glowK} rot={[0, 0, Math.PI / 2]} />
        {!off && <pointLight position={[0, h - 0.4, 0]} intensity={4} distance={7} color="#EEF4FF" />}
      </group>
    );
  if (id === 'trackLights')
    return (
      <group position={at}>
        <B p={[0, h - 0.04, 0]} s={[2.4, 0.04, 0.06]} c="#1E1E24" />
        {[-1, -0.35, 0.35, 1].map((x, i) => (
          <group key={x} position={[x, h - 0.15, 0]} rotation={[i % 2 ? 0.5 : -0.5, 0, 0]}>
            <Cyl p={[0, 0, 0]} r1={0.05} r2={0.07} h={0.16} c="#1E1E24" />
            <Cyl p={[0, -0.085, 0]} r1={0.055} h={0.01} c="#FFF" e="#FFF0D0" ei={2 * glowK} />
          </group>
        ))}
        {!off && <pointLight position={[0, h - 0.6, 0.4]} intensity={5} distance={8} color="#FFF0D8" />}
      </group>
    );
  if (id === 'pendants')
    return (
      <group position={at}>
        {[-1.2, 0, 1.2].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <B p={[0, h - 0.35, 0]} s={[0.01, 0.7, 0.01]} c="#111" />
            <Cyl p={[0, h - 0.78, 0]} r1={0.06} r2={0.2} h={0.18} c="#1E1E24" />
            <Ball p={[0, h - 0.88, 0]} r={0.05} c="#FFF" e="#FFE9B0" ei={2 * glowK} />
          </group>
        ))}
        {!off && <pointLight position={[0, h - 1, 0]} intensity={5} distance={8} color="#FFE2B0" />}
      </group>
    );
  if (id === 'ceilingSpots')
    return <group position={at}>
      <B p={[0,h-0.05,0]} s={[1.25,0.06,0.12]} c={GOLD} m={0.7}/>
      {[-0.42,0,0.42].map((x,i)=><group key={x} position={[x,h-0.13,0]}><Cyl p={[0,0,0]} r1={0.09} r2={0.12} h={0.14} c="#292929"/><Ball p={[0,-0.08,0]} r={0.055} c="#FFF3D0" e="#FFF0C0" ei={1.6*glowK}/></group>)}
      {!off && <pointLight position={[0,h-0.45,0.3]} intensity={3.2} distance={6} color="#FFF0D8"/>}
    </group>;
  if (id === 'fireAlarm')
    return <group position={at}>
      <B p={[0,h-0.08,0]} s={[0.26,0.08,0.26]} c="#E8E8E2"/>
      <B p={[0,h-0.14,0]} s={[0.2,0.04,0.2]} c="#C2262E" e="#C2262E" ei={off?0:0.3}/>
      {!off && <pointLight position={[0,h-0.25,0]} intensity={0.2} distance={2} color="#FF4444"/>}
    </group>;
  if (id === 'chandelier')
    return (
      <group position={at}>
        <B p={[0, h - 0.25, 0]} s={[0.02, 0.5, 0.02]} c={GOLD} />
        {[0.5, 0.35, 0.2].map((r, k) =>
          Array.from({ length: 10 - k * 2 }, (_, i) => {
            const a = (i / (10 - k * 2)) * Math.PI * 2;
            return <Ball key={`${k}-${i}`} p={[Math.cos(a) * r, h - 0.6 - k * 0.18, Math.sin(a) * r]} r={0.05} c="#EAF6FF" e="#FFFFFF" ei={0.8 * glowK} m={0.3} rough={0.05} o={0.85} />;
          }),
        )}
        {!off && <pointLight position={[0, h - 1, 0]} intensity={8} distance={12} color="#FFF4E0" />}
      </group>
    );
  return null;
}
