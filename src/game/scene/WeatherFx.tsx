// What today's weather looks like around the shop: rain and storms with lightning,
// harmattan haze and dust, wet streets. The shop is roofed, so nothing falls inside it.
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LagosWeather } from '../types';

/** Sky behind the shop, by weather, for normal (non-signature) shops. */
export function skyFor(weather: LagosWeather | undefined, night: boolean): string {
  if (night) return weather === 'storm' || weather === 'rainy' ? 'linear-gradient(#07090f,#151a26)' : 'linear-gradient(#0b0d1a,#1a1630)';
  switch (weather) {
    case 'sunny': return 'linear-gradient(#3d78c9,#a9cdef)';
    case 'cloudy': return 'linear-gradient(#59647a,#9aa4b3)';
    case 'rainy': return 'linear-gradient(#36414f,#66717f)';
    case 'storm': return 'linear-gradient(#171d27,#3a4350)';
    case 'harmattan': return 'linear-gradient(#a98b62,#e0c89c)';
    default: return 'linear-gradient(#24305a,#3a4a7a)';
  }
}

/** How strong daylight is under today's sky (1 = a normal day). */
export function daylightFor(weather: LagosWeather | undefined): number {
  return { sunny: 1.15, cloudy: 0.85, rainy: 0.72, storm: 0.58, harmattan: 0.9 }[weather || 'cloudy'] ?? 1;
}

type Area = { w: number; d: number; radius: number };

/** Random spot on the street around the shop, never inside it. */
function outsideSpot(a: Area): [number, number] {
  for (let i = 0; i < 20; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * a.radius;
    const x = a.w / 2 + Math.cos(ang) * rad;
    const z = a.d / 2 + Math.sin(ang) * rad;
    if (x < -0.3 || x > a.w + 0.3 || z < -0.3 || z > a.d + 0.3) return [x, z];
  }
  return [-1, -1];
}

const Rain: React.FC<{ area: Area; heavy: boolean }> = ({ area, heavy }) => {
  const count = heavy ? 900 : 520;
  const ref = useRef<THREE.InstancedMesh>(null);
  const drops = useMemo(() => Array.from({ length: count }, () => {
    const [x, z] = outsideSpot(area);
    return { x, z, y: Math.random() * 9, v: 9 + Math.random() * 4 };
  }), [area, count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const slant = heavy ? 0.18 : 0.05;
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < drops.length; i++) {
      const p = drops[i];
      p.y -= p.v * step;
      p.x += p.v * step * slant;
      if (p.y < 0) {
        const [x, z] = outsideSpot(area);
        p.x = x; p.z = z; p.y = 7 + Math.random() * 2;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, 0, -slant);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.018, heavy ? 0.42 : 0.32, 0.018]} />
      <meshBasicMaterial color="#b9d0ee" transparent opacity={heavy ? 0.6 : 0.5} />
    </instancedMesh>
  );
};

/** Floating harmattan dust, inside and out. */
const Dust: React.FC<{ area: Area }> = ({ area }) => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 420;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * area.radius;
      pos[i * 3] = area.w / 2 + Math.cos(ang) * rad;
      pos[i * 3 + 1] = Math.random() * 4;
      pos[i * 3 + 2] = area.d / 2 + Math.sin(ang) * rad;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [area]);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x = Math.sin(clock.elapsedTime * 0.15) * 0.8;
      ref.current.position.z = Math.cos(clock.elapsedTime * 0.11) * 0.5;
    }
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#e2c38f" size={0.06} transparent opacity={0.55} depthWrite={false} />
    </points>
  );
};

/** Lightning: a bright double flash every few seconds. */
const Lightning: React.FC = () => {
  const light = useRef<THREE.AmbientLight>(null);
  const next = useRef(2 + Math.random() * 4);
  const flashAt = useRef(-10);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t > next.current) { flashAt.current = t; next.current = t + 4 + Math.random() * 7; }
    const since = t - flashAt.current;
    const on = (since >= 0 && since < 0.08) || (since > 0.16 && since < 0.24);
    if (light.current) light.current.intensity = on ? 2.4 : 0;
  });
  return <ambientLight ref={light} color="#dfe8ff" intensity={0} />;
};

/** Harmattan haze: the far edges of the street fade into dusty light. */
const Haze: React.FC<{ dist: number }> = ({ dist }) => {
  const scene = useThree((st) => st.scene);
  React.useEffect(() => {
    const prev = scene.fog;
    scene.fog = new THREE.Fog('#cdb38a', dist * 1.5, dist * 4.2);
    return () => { scene.fog = prev; };
  }, [scene, dist]);
  return null;
};

export const WeatherFx: React.FC<{ weather?: LagosWeather; w: number; d: number }> = ({ weather, w, d }) => {
  const radius = Math.max(w, d) * 1.1 + 4;
  const area = useMemo(() => ({ w, d, radius }), [w, d, radius]);
  if (!weather) return null;
  const wet = weather === 'rainy' || weather === 'storm';
  return (
    <>
      {wet && (
        // A dark sheen on the street: wet tarmac.
        <mesh position={[w / 2, -0.065, d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[radius, 48]} />
          <meshStandardMaterial color="#1d2a3a" transparent opacity={weather === 'storm' ? 0.42 : 0.3} roughness={0.15} metalness={0.3} />
        </mesh>
      )}
      {wet && <Rain area={area} heavy={weather === 'storm'} />}
      {weather === 'storm' && <Lightning />}
      {weather === 'harmattan' && <><Haze dist={radius} /><Dust area={area} /></>}
    </>
  );
};
