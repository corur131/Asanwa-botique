import React from 'react';
import * as THREE from 'three';
import { B } from './Furniture3D';

/** Shared miniature outdoor models used by the yard and furniture previews. */
export function YardModel({ id }: { id: string }) {
  if (id === 'umbrellaCanopy') return (
    <group>
      <mesh position={[0, 0.07, 0]} castShadow><cylinderGeometry args={[0.27, 0.3, 0.14, 24]} /><meshStandardMaterial color="#51483F" roughness={0.75} /></mesh>
      <mesh position={[0, 1.03, 0]} castShadow><cylinderGeometry args={[0.032, 0.042, 1.82, 12]} /><meshStandardMaterial color="#C9CED6" metalness={0.65} roughness={0.35} /></mesh>
      <mesh position={[0, 2.03, 0]} castShadow><coneGeometry args={[0.98, 0.52, 24, 1, false]} /><meshStandardMaterial color="#C2262E" roughness={0.82} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI * 2) / 16;
        return <mesh key={i} position={[Math.cos(a) * 0.91, 1.79, Math.sin(a) * 0.91]} scale={[0.14, 0.075, 0.14]} castShadow><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={i % 2 ? '#B91F2A' : '#D83A42'} roughness={0.82} /></mesh>;
      })}
      <mesh position={[0, 1.79, 0]}><torusGeometry args={[0.91, 0.022, 8, 48]} /><meshStandardMaterial color="#F4EFE6" roughness={0.75} /></mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI * 2) / 12;
        return <mesh key={i} position={[Math.cos(a) * 0.46, 1.94, Math.sin(a) * 0.46]} rotation={[0, -a, Math.PI / 4]}><cylinderGeometry args={[0.009, 0.009, 0.96, 5]} /><meshStandardMaterial color="#E8B84A" metalness={0.45} /></mesh>;
      })}
      <mesh position={[0, 2.31, 0]} castShadow><sphereGeometry args={[0.06, 12, 8]} /><meshStandardMaterial color="#D4AF37" metalness={0.8} /></mesh>
    </group>
  );
  if (id === 'securityPost') return (
    <group>
      <B p={[0, 0.06, 0]} s={[0.9, 0.12, 0.82]} c="#77736B" />
      <B p={[0, 0.48, -0.34]} s={[0.72, 0.76, 0.08]} c="#D6C6A6" />
      <B p={[-0.34, 0.48, 0]} s={[0.08, 0.76, 0.68]} c="#B7A789" />
      <B p={[0.34, 0.48, 0]} s={[0.08, 0.76, 0.68]} c="#B7A789" />
      <B p={[0, 0.84, 0]} s={[0.96, 0.12, 0.92]} c="#2F4858" />
      <B p={[0, 0.48, 0.08]} s={[0.5, 0.34, 0.025]} c="#6BA5B8" m={0.2} />
      <B p={[0, 0.29, 0.095]} s={[0.54, 0.035, 0.04]} c="#E9D5A2" />
      <B p={[0, 0.98, 0]} s={[1.05, 0.08, 1.0]} c="#1E252B" />
      <B p={[0, 1.045, 0]} s={[0.62, 0.035, 0.35]} c="#E8B84A" />
      <mesh position={[0.2, 1.12, 0.12]}><sphereGeometry args={[0.045, 8, 8]} /><meshStandardMaterial color="#46A36B" emissive="#46A36B" emissiveIntensity={0.4} /></mesh>
    </group>
  );
  return null;
}
