import React from 'react';

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
          <B p={[0, 0.95, 0.035]} s={[0.56, 1.6, 0.01]} c={MIRROR} m={0.9} r={0.05} />
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
          <B p={[0, 1.3, -0.3]} s={[1.05, 0.75, 0.01]} c={MIRROR} m={0.9} r={0.05} />
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
          <Cyl p={[0, 1.25, 0.05]} r1={0.24} h={0.08} c="#7FB8D8" rot={[Math.PI / 2, 0, 0]} />
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
          <B p={[0, 0.85, 0.035]} s={[0.6, 1.45, 0.01]} c={MIRROR} m={0.9} r={0.05} />
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
          <B p={[0, 1.4, -0.3]} s={[1.25, 0.95, 0.01]} c={MIRROR} m={0.95} r={0.03} />
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
    default:
      return <B p={[0, 0.4, 0]} s={[0.6, 0.8, 0.6]} c="#999" />;
  }
}

export function WallPiece({ id, colors }: { id: string; colors: string[] }) {
  switch (id) {
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
          <B p={[0, 0, 0.035]} s={[2.75, 2.15, 0.01]} c={MIRROR} m={1} r={0.03} />
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
          <B p={[0, 0, 0.025]} s={[0.42, 1.52, 0.01]} c={MIRROR} m={0.9} r={0.05} />
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
        <Cyl p={[0, h - 0.42, 0]} r1={0.1} h={0.1} c="#EEE" />
        {[0, 1, 2].map((i) => <B key={i} p={[Math.cos((i * Math.PI * 2) / 3) * 0.4, h - 0.44, Math.sin((i * Math.PI * 2) / 3) * 0.4]} s={[0.7, 0.02, 0.13]} c="#8A6440" rot={[0, (-i * Math.PI * 2) / 3, 0]} />)}
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
