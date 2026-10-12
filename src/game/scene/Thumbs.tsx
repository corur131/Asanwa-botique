/**
 * Little pictures of furniture for the build-mode catalogue. One hidden
 * canvas draws each piece in turn and keeps the picture, so the strip can show
 * dozens of items without dozens of 3D views.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { furnitureById } from '../shop';
import { B, CeilingPiece, FloorPiece, WallPiece } from './Furniture3D';
import { YardModel } from './YardModels';

const SAMPLE = ['#C2262E', '#2846A8', '#E3B23C', '#2F5D3A', '#7A3A8C', '#F6F1E8', '#E86A2E', '#1E1E24', '#E07AA0', '#3C5A8A', '#C9A163', '#6B8E23', '#8E1F3A', '#1F6FB2', '#5A3A28', '#F2C8CC'];

const STORE = 'asanwa-thumbs-v5';
const cache = new Map<string, string>(
  (() => {
    try {
      return Object.entries(JSON.parse(localStorage.getItem(STORE) || '{}') as Record<string, string>);
    } catch {
      return [];
    }
  })(),
);
let saveTimer = 0;
function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(cache)));
    } catch {
      /* storage full or blocked: pictures are redrawn next time */
    }
  }, 800);
}
const queue: string[] = [];
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

function want(id: string) {
  if (cache.has(id) || queue.includes(id)) return;
  queue.push(id);
  notify();
}

/** The picture of a piece, once it has been drawn. */
export function useThumb(id: string): string | undefined {
  const [, rerender] = useState(0);
  useEffect(() => {
    const f = () => rerender((n) => n + 1);
    subs.add(f);
    want(id);
    return () => {
      subs.delete(f);
    };
  }, [id]);
  return cache.get(id);
}

function Stage({ id, onDone }: { id: string; onDone: (url: string) => void }) {
  const f = furnitureById(id);
  const { camera, gl, scene } = useThree();
  const frames = useRef(0);
  const big = Math.max(f.w, f.d, 1);
  const h = 2.6;
  const ceiling = f.mount === 'ceiling';
  const wall = f.mount === 'wall';
  useLayoutEffect(() => {
    const ty = ceiling ? h - 0.55 : wall ? 1.2 : f.mount === 'finish' ? 0 : 0.7;
    camera.position.set(big * 0.95 + 0.4, ceiling ? h - 0.35 : wall ? 1.5 : 1.6, big * 1.35 + 1.0);
    camera.lookAt(0, ty, wall ? 0.2 : 0);
    camera.updateProjectionMatrix();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    frames.current++;
    if (frames.current === 2) {
      gl.render(scene, camera);
      onDone(gl.domElement.toDataURL('image/png'));
    }
  });
  if (f.mount === 'finish') {
    const c = f.paint || f.floorTiles || ['#999', '#777'];
    return (
      <group>
        {f.paint ? (
          <>
            <B p={[0, 1.2, -0.3]} s={[2.4, 2.4, 0.1]} c={c[0]} r={0.95} />
            <B p={[0, 0.3, -0.24]} s={[2.4, 0.6, 0.02]} c={c[1]} r={0.95} />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <B key={i} p={[(i % 2) - 0.5, -0.02, Math.floor(i / 2) - 0.5]} s={[0.98, 0.04, 0.98]} c={(i + Math.floor(i / 2)) % 2 ? c[0] : c[1]} r={0.5} />)
        )}
      </group>
    );
  }
  return (
    <group>
      <B p={[0, -0.02, 0]} s={[big + 1.2, 0.04, big + 1.2]} c="#8C8478" />
      {wall && <B p={[0, h / 2, -0.06]} s={[f.w + 1, h, 0.1]} c="#B9AE98" />}
      {(f.mount === 'floor' || (f.mount === 'yard' && id !== 'umbrellaCanopy' && id !== 'securityPost')) && <FloorPiece id={id} colors={SAMPLE.slice(0, f.slots || 0)} />}
      {f.mount === 'yard' && (id === 'umbrellaCanopy' || id === 'securityPost') && <YardModel id={id} />}
      {f.mount === 'yard' && f.solar && (
        <group>
          <B p={[0, 1.0, 0]} s={[0.95, 0.04, 0.75]} c="#1B2A4A" m={0.5} r={0.2} rot={[0.5, 0, 0]} />
          <B p={[0, 0.5, 0]} s={[0.05, 1.0, 0.05]} c="#888" />
          <B p={[0.5, 0.22, 0.3]} s={[0.4, 0.44, 0.26]} c="#E9EEF2" />
        </group>
      )}
      {wall && <WallPiece id={id} colors={SAMPLE.slice(0, f.slots || 0)} />}
      {ceiling && <CeilingPiece id={id} h={h} at={[0, 0, 0]} />}
    </group>
  );
}

/** Mount once while the catalogue is open: draws pictures as they are asked for. */
export function ThumbStudio() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const f = () => rerender((n) => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  const id = queue[0];
  if (!id) return null;
  return (
    <div style={{ position: 'fixed', left: -400, top: 0, width: 128, height: 128, pointerEvents: 'none', opacity: 0 }} aria-hidden>
      <Canvas gl={{ preserveDrawingBuffer: true, antialias: true }} dpr={1} camera={{ fov: 35, near: 0.1, far: 50 }} style={{ background: '#2b2440' }}>
        <color attach="background" args={['#2b2440']} />
        <ambientLight intensity={0.75} />
        <hemisphereLight args={['#FFF4E0', '#3A3A50', 0.6]} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <Stage
          key={id}
          id={id}
          onDone={(url) => {
            cache.set(id, url);
            persist();
            queue.shift();
            notify();
          }}
        />
      </Canvas>
    </div>
  );
}
