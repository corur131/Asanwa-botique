// Watches the frame rate while the shop is on screen and lowers people detail if the
// phone is struggling, so an older phone stays smooth.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { lowerPeopleQuality } from './quality';

export function PerfGuard() {
  const acc = useRef({ time: 0, frames: 0, slow: 0, settle: 3 });
  useFrame((_, dt) => {
    const a = acc.current;
    if (dt > 0.5) return; // tab was hidden or the app paused: not a real frame
    if (a.settle > 0) { a.settle -= dt; return; } // ignore start-up and loading hitches
    a.time += dt;
    a.frames += 1;
    if (a.time < 5) return;
    const fps = a.frames / a.time;
    a.time = 0;
    a.frames = 0;
    a.slow = fps < 32 ? a.slow + 1 : 0;
    if (a.slow >= 2 && lowerPeopleQuality()) { a.slow = 0; a.settle = 4; }
  });
  return null;
}
