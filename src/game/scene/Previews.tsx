import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { furnitureById } from '../shop';
import { B, CeilingPiece, FloorPiece, WallPiece } from './Furniture3D';
import { YardModel } from './YardModels';

export { RoomPreview } from './ShopScene';

const SAMPLE = ['#C2262E', '#2846A8', '#E3B23C', '#2F5D3A', '#7A3A8C', '#F6F1E8', '#E86A2E', '#1E1E24', '#E07AA0', '#3C5A8A', '#C9A163', '#6B8E23', '#8E1F3A', '#1F6FB2', '#5A3A28', '#F2C8CC'];

/** One piece of furniture on a turntable, before buying it. */
export function FurniturePreview({ id }: { id: string }) {
  const f = furnitureById(id);
  const big = Math.max(f.w, f.d, 1.2);
  const ceiling = f.mount === 'ceiling';
  const h = 2.6;
  const target: [number, number, number] = ceiling ? [0, h - 0.6, 0] : [0, f.mount === 'wall' ? 1.2 : 0.6, f.mount === 'wall' ? 0.3 : 0];
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 35, position: [big * 0.9 + 0.5, ceiling ? h - 0.3 : 1.5, big * 1.2 + 0.9], near: 0.1, far: 50 }} style={{ background: 'linear-gradient(#2b2440,#15131c)' }}>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#FFF4E0', '#3A3A50', 0.6]} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <OrbitControls target={target} enablePan={false} enableZoom={false} autoRotate={f.mount === 'floor'} autoRotateSpeed={1.4} minPolarAngle={0.5} maxPolarAngle={1.35} />
      {/* a bit of floor (and wall) so it reads at the right size */}
      <B p={[0, -0.02, 0]} s={[big + 1.4, 0.04, big + 1.4]} c="#8C8478" />
      {f.mount === 'wall' && <B p={[0, h / 2, -0.06]} s={[f.w + 1, h, 0.1]} c="#B9AE98" />}
      {f.mount === 'floor' && <FloorPiece id={id} colors={SAMPLE.slice(0, f.slots || 0)} />}
      {f.mount === 'yard' && (id === 'umbrellaCanopy' || id === 'securityPost') && <YardModel id={id} />}
      {f.mount === 'yard' && id !== 'umbrellaCanopy' && id !== 'securityPost' && <FloorPiece id={id} colors={SAMPLE.slice(0, f.slots || 0)} />}
      {f.mount === 'wall' && <WallPiece id={id} colors={SAMPLE.slice(0, f.slots || 0)} />}
      {ceiling && <CeilingPiece id={id} h={h} at={[0, 0, 0]} />}
    </Canvas>
  );
}
