/**
 * A character drawn once and shown as an image.
 *
 * <CharacterSvg> builds hundreds of SVG shapes every time it appears. That is fine for the
 * styling screen (one character), but a Gidigram feed shows dozens at once and froze phones.
 * This draws each look once, turns it into a cached image, and reuses it everywhere the same
 * look appears. Drawing is spread across animation frames so opening a screen stays smooth.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterSvg } from './renderCharacter';
import type { CharacterConfig } from '../../types/character';

type Camera = React.ComponentProps<typeof CharacterSvg>['camera'];

const MAX_CACHED = 160;
const cache = new Map<string, string>(); // key -> object URL, oldest first
const waiting = new Map<string, Array<(url: string) => void>>();
const queue: Array<{ key: string; config: CharacterConfig; camera: Camera }> = [];
let scheduled = false;

function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function draw(config: CharacterConfig, camera: Camera, key: string): string {
  let svg = renderToStaticMarkup(<CharacterSvg config={config} idPrefix={`ci${hash(key)}`} camera={camera} className="" />);
  if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  // Give the image its natural size so it scales like the original drawing.
  const vb = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  if (vb && !/<svg[^>]*\swidth=/.test(svg)) svg = svg.replace('<svg', `<svg width="${vb[1]}" height="${vb[2]}"`);
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

function remember(key: string, url: string) {
  cache.set(key, url);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value as string;
    URL.revokeObjectURL(cache.get(oldest)!);
    cache.delete(oldest);
  }
}

function pump() {
  scheduled = false;
  const started = performance.now();
  // A few drawings per frame, never more than ~12 ms of work.
  while (queue.length && performance.now() - started < 12) {
    const job = queue.shift()!;
    if (cache.has(job.key)) continue;
    let url = '';
    try {
      url = draw(job.config, job.camera, job.key);
      remember(job.key, url);
    } catch {
      /* a broken look shows the placeholder */
    }
    (waiting.get(job.key) || []).forEach((cb) => cb(url));
    waiting.delete(job.key);
  }
  if (queue.length) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(pump);
}

function request(key: string, config: CharacterConfig, camera: Camera, cb: (url: string) => void) {
  const list = waiting.get(key);
  if (list) {
    list.push(cb);
    return;
  }
  waiting.set(key, [cb]);
  queue.push({ key, config, camera });
  schedule();
}

export const CharacterImg: React.FC<{ config: CharacterConfig; camera?: Camera; className?: string }> = ({ config, camera = 'full', className = 'w-full h-auto' }) => {
  const key = useMemo(() => JSON.stringify([camera, config]), [camera, config]);
  const [url, setUrl] = useState(() => cache.get(key) || '');
  useEffect(() => {
    const hit = cache.get(key);
    if (hit) {
      setUrl(hit);
      return;
    }
    let alive = true;
    request(key, config, camera, (u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!url) return <span className={className} style={{ display: 'block', minHeight: 24, background: 'rgba(255,255,255,0.05)' }} aria-hidden />;
  return <img src={url} alt="" draggable={false} decoding="async" className={className} style={{ objectFit: 'contain' }} />;
};
