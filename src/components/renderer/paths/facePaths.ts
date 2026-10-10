import {
  BrowPreset,
  EyeShapePreset,
  FaceShapePreset,
  LipShapePreset,
  NosePreset,
  FacialHairPreset,
  BodyType,
} from '../../../types/character';

export interface FaceOutline {
  path: string;
  width: number;
  chinY: number;
}

/**
 * Returns face outline path adapted to preset and body type.
 * Face center is around (300, 210).
 */
export function getFaceOutline(preset: FaceShapePreset, body: BodyType): string {
  const isMale = body === 'male';
  const isPlus = body === 'femalePlus';

  if (isMale) {
    if (preset === 'square') {
      // Strong chiseled masculine square jaw
      return `
        M 300 110
        C 240 110 220 150 216 195
        C 212 240 222 280 236 310
        C 250 330 268 335 300 335
        C 332 335 350 330 364 310
        C 378 280 388 240 384 195
        C 380 150 360 110 300 110
        Z
      `;
    }
    if (preset === 'heart') {
      // Angular tapered jaw
      return `
        M 300 110
        C 238 110 218 150 216 195
        C 214 235 228 275 250 310
        C 264 330 280 335 300 335
        C 320 335 336 330 350 310
        C 372 275 386 235 384 195
        C 382 150 362 110 300 110
        Z
      `;
    }
    // Oval masculine
    return `
      M 300 110
      C 240 110 220 150 218 195
      C 216 238 226 278 244 312
      C 258 332 276 336 300 336
      C 324 336 342 332 356 312
      C 374 278 384 238 382 195
      C 380 150 360 110 300 110
      Z
    `;
  }

  if (isPlus) {
    // Fuller cheeks and soft graceful jaw
    if (preset === 'heart') {
      return `
        M 300 110
        C 236 110 216 150 214 195
        C 212 245 226 285 252 318
        C 268 332 284 334 300 334
        C 316 334 332 332 348 318
        C 374 285 388 245 386 195
        C 384 150 364 110 300 110
        Z
      `;
    }
    if (preset === 'square') {
      return `
        M 300 110
        C 238 110 218 150 216 195
        C 214 245 228 285 248 316
        C 262 332 280 336 300 336
        C 320 336 338 332 352 316
        C 372 285 386 245 384 195
        C 382 150 362 110 300 110
        Z
      `;
    }
    // Oval plus
    return `
      M 300 110
      C 238 110 216 150 214 195
      C 212 246 226 288 250 320
      C 266 334 282 336 300 336
      C 318 334 334 320 350 320
      C 374 288 388 246 386 195
      C 384 150 362 110 300 110
      Z
    `;
  }

  // femaleRegular (Divine standard)
  if (preset === 'heart') {
    return `
      M 300 110
      C 240 110 222 150 220 195
      C 218 238 232 278 256 314
      C 270 328 284 330 300 330
      C 316 330 330 328 344 314
      C 368 278 382 238 380 195
      C 378 150 360 110 300 110
      Z
    `;
  }
  if (preset === 'square') {
    return `
      M 300 110
      C 242 110 224 150 222 195
      C 220 238 230 276 250 312
      C 264 328 280 332 300 332
      C 320 332 336 328 350 312
      C 370 276 380 238 378 195
      C 376 150 358 110 300 110
      Z
    `;
  }
  // Oval (Divine exact shape)
  return `
    M 300 110
    C 242 110 224 150 222 195
    C 220 240 232 280 252 316
    C 266 330 282 334 300 334
    C 318 334 334 330 348 316
    C 368 280 380 240 378 195
    C 376 150 358 110 300 110
    Z
  `;
}

export interface EyeGeometry {
  leftSclera: string;
  rightSclera: string;
  leftCenter: { x: number; y: number };
  rightCenter: { x: number; y: number };
  leftUpperLid: string;
  rightUpperLid: string;
  leftCrease: string;
  rightCrease: string;
  leftWing: string;
  rightWing: string;
  lashes: Array<{ path: string; isUpper: boolean; isRight: boolean }>;
}

export function getEyeGeometry(preset: EyeShapePreset, makeupState: { liner: boolean; lashes: 'natural' | 'full' }): EyeGeometry {
  const isFullLashes = makeupState.lashes === 'full';

  // Base eye centers: Left at 262, 218; Right at 338, 218
  const lc = { x: 262, y: 218 };
  const rc = { x: 338, y: 218 };

  let leftSclera = '';
  let rightSclera = '';
  let leftUpperLid = '';
  let rightUpperLid = '';
  let leftCrease = '';
  let rightCrease = '';
  let leftWing = '';
  let rightWing = '';

  if (preset === 'upturned') {
    leftSclera = `
      M 240 220
      C 248 209 274 207 284 214
      C 280 224 258 227 240 220
      Z
    `;
    rightSclera = `
      M 316 214
      C 326 207 352 209 360 220
      C 342 227 320 224 316 214
      Z
    `;
    leftUpperLid = 'M 238 221 C 248 208 274 206 286 213';
    rightUpperLid = 'M 314 213 C 326 206 352 208 362 221';
    leftCrease = 'M 244 210 C 255 201 272 202 282 208';
    rightCrease = 'M 318 208 C 328 202 345 201 356 210';
    leftWing = 'M 239 221 L 232 216';
    rightWing = 'M 361 221 L 368 216';
  } else if (preset === 'doe') {
    leftSclera = `
      M 241 218
      C 248 207 274 207 283 218
      C 274 228 248 228 241 218
      Z
    `;
    rightSclera = `
      M 317 218
      C 326 207 352 207 359 218
      C 352 228 326 228 317 218
      Z
    `;
    leftUpperLid = 'M 239 218 C 248 206 274 206 285 218';
    rightUpperLid = 'M 315 218 C 326 206 352 206 361 218';
    leftCrease = 'M 243 209 C 254 200 270 200 281 209';
    rightCrease = 'M 319 209 C 330 200 346 200 357 209';
    leftWing = 'M 240 219 L 235 216';
    rightWing = 'M 360 219 L 365 216';
  } else if (preset === 'hooded') {
    leftSclera = `
      M 241 220
      C 248 211 273 211 283 218
      C 275 226 250 227 241 220
      Z
    `;
    rightSclera = `
      M 317 218
      C 327 211 352 211 359 220
      C 350 227 325 226 317 218
      Z
    `;
    leftUpperLid = 'M 240 221 C 248 210 274 210 284 219';
    rightUpperLid = 'M 316 219 C 326 210 352 210 360 221';
    leftCrease = 'M 240 215 C 252 208 270 208 284 215';
    rightCrease = 'M 316 215 C 330 208 348 208 360 215';
    leftWing = 'M 240 221 L 234 218';
    rightWing = 'M 360 221 L 366 218';
  } else {
    // almond (Divine exact shape)
    leftSclera = `
      M 241 219
      C 248 209 273 208 283 217
      C 275 226 250 227 241 219
      Z
    `;
    rightSclera = `
      M 317 217
      C 327 208 352 209 359 219
      C 350 227 325 226 317 217
      Z
    `;
    leftUpperLid = 'M 240 220 C 248 208 274 207 284 218';
    rightUpperLid = 'M 316 218 C 326 207 352 208 360 220';
    leftCrease = 'M 244 210 C 254 202 270 202 280 210';
    rightCrease = 'M 320 210 C 330 202 346 202 356 210';
    leftWing = 'M 240 220 L 233 216';
    rightWing = 'M 360 220 L 367 216';
  }

  // Generate individual lashes
  const lashes: Array<{ path: string; isUpper: boolean; isRight: boolean }> = [];
  const upperCount = isFullLashes ? 9 : 6;
  const lashLen = isFullLashes ? 6 : 4;

  // Left eye upper lashes
  for (let i = 0; i < upperCount; i++) {
    const t = (i + 0.5) / upperCount;
    const x = 283 - t * 42;
    const y = 217 - Math.sin(t * Math.PI) * 8.5;
    const angle = -Math.PI / 2 + (0.5 - t) * 0.9;
    const endX = x + Math.cos(angle) * lashLen - 2;
    const endY = y + Math.sin(angle) * lashLen - 1;
    lashes.push({
      path: `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x - 1).toFixed(1)} ${(y - lashLen * 0.5).toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
      isUpper: true,
      isRight: false,
    });
  }

  // Right eye upper lashes
  for (let i = 0; i < upperCount; i++) {
    const t = (i + 0.5) / upperCount;
    const x = 317 + t * 42;
    const y = 217 - Math.sin(t * Math.PI) * 8.5;
    const angle = -Math.PI / 2 - (0.5 - t) * 0.9;
    const endX = x + Math.cos(angle) * lashLen + 2;
    const endY = y + Math.sin(angle) * lashLen - 1;
    lashes.push({
      path: `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + 1).toFixed(1)} ${(y - lashLen * 0.5).toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
      isUpper: true,
      isRight: true,
    });
  }

  // Lower subtle lashes (3 per eye)
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 4;
    const lx = 280 - t * 35;
    const ly = 222 + Math.sin(t * Math.PI) * 4;
    lashes.push({
      path: `M ${lx.toFixed(1)} ${ly.toFixed(1)} L ${(lx - 1).toFixed(1)} ${(ly + 2.5).toFixed(1)}`,
      isUpper: false,
      isRight: false,
    });

    const rx = 320 + t * 35;
    const ry = 222 + Math.sin(t * Math.PI) * 4;
    lashes.push({
      path: `M ${rx.toFixed(1)} ${ry.toFixed(1)} L ${(rx + 1).toFixed(1)} ${(ry + 2.5).toFixed(1)}`,
      isUpper: false,
      isRight: true,
    });
  }

  return {
    leftSclera,
    rightSclera,
    leftCenter: lc,
    rightCenter: rc,
    leftUpperLid,
    rightUpperLid,
    leftCrease,
    rightCrease,
    leftWing,
    rightWing,
    lashes,
  };
}

export interface BrowGeometry {
  leftBase: string;
  rightBase: string;
  hairs: string[];
}

export function getBrowGeometry(preset: BrowPreset, isMale: boolean): BrowGeometry {
  let leftBase = '';
  let rightBase = '';
  const hairs: string[] = [];

  if (preset === 'straightDefined') {
    leftBase = isMale
      ? 'M 284 195 C 270 193 250 193 234 196 C 248 190 270 190 284 192 Z'
      : 'M 282 196 C 270 195 252 195 236 197 C 248 193 270 193 282 194 Z';
    rightBase = isMale
      ? 'M 316 195 C 330 193 350 193 366 196 C 352 190 330 190 316 192 Z'
      : 'M 318 196 C 330 195 348 195 364 197 C 352 193 330 193 318 194 Z';

    // Individual hair strokes along straight brow
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const lx = 283 - t * 48;
      const ly = 194 - t * 1;
      hairs.push(`M ${lx.toFixed(1)} ${(ly + 2).toFixed(1)} L ${(lx - 2).toFixed(1)} ${(ly - 2).toFixed(1)}`);
      const rx = 317 + t * 48;
      const ry = 194 - t * 1;
      hairs.push(`M ${rx.toFixed(1)} ${(ry + 2).toFixed(1)} L ${(rx + 2).toFixed(1)} ${(ry - 2).toFixed(1)}`);
    }
  } else if (preset === 'softNatural') {
    leftBase = 'M 283 197 C 268 192 250 190 235 198 C 248 192 268 190 283 194 Z';
    rightBase = 'M 317 197 C 332 192 350 190 365 198 C 352 192 332 190 317 194 Z';

    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const lx = 283 - t * 47;
      const ly = 195 - Math.sin(t * Math.PI) * 4;
      hairs.push(`M ${lx.toFixed(1)} ${(ly + 2).toFixed(1)} Q ${(lx - 1).toFixed(1)} ${ly.toFixed(1)} ${(lx - 2.5).toFixed(1)} ${(ly - 2).toFixed(1)}`);
      const rx = 317 + t * 47;
      const ry = 195 - Math.sin(t * Math.PI) * 4;
      hairs.push(`M ${rx.toFixed(1)} ${(ry + 2).toFixed(1)} Q ${(rx + 1).toFixed(1)} ${ry.toFixed(1)} ${(rx + 2.5).toFixed(1)} ${(ry - 2).toFixed(1)}`);
    }
  } else {
    // featheredArch (Divine exact shape)
    leftBase = 'M 283 198 C 268 191 254 188 236 199 C 248 191 268 189 283 195 Z';
    rightBase = 'M 317 198 C 332 191 346 188 364 199 C 352 191 332 189 317 195 Z';

    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const lx = 283 - t * 46;
      const ly = 196 - (t < 0.6 ? t * 7 : (1 - t) * 10 + 2.8);
      hairs.push(`M ${lx.toFixed(1)} ${(ly + 2).toFixed(1)} Q ${(lx - 1).toFixed(1)} ${ly.toFixed(1)} ${(lx - 2.8).toFixed(1)} ${(ly - 2.4).toFixed(1)}`);
      const rx = 317 + t * 46;
      const ry = 196 - (t < 0.6 ? t * 7 : (1 - t) * 10 + 2.8);
      hairs.push(`M ${rx.toFixed(1)} ${(ry + 2).toFixed(1)} Q ${(rx + 1).toFixed(1)} ${ry.toFixed(1)} ${(rx + 2.8).toFixed(1)} ${(ry - 2.4).toFixed(1)}`);
    }
  }

  return { leftBase, rightBase, hairs };
}

export interface NoseGeometry {
  leftBridge: string;
  rightBridge: string;
  tipHighlight: { x: number; y: number; r: number };
  tipContour: string;
  leftNostrilWing: string;
  rightNostrilWing: string;
  leftNostrilHole: string;
  rightNostrilHole: string;
  septumLine: string;
}

export function getNoseGeometry(preset: NosePreset): NoseGeometry {
  if (preset === 'broadAfrican') {
    // Sculpted broader bridge, royal flared wings
    return {
      leftBridge: 'M 292 214 C 291 228 290 240 286 249',
      rightBridge: 'M 308 214 C 309 228 310 240 314 249',
      tipHighlight: { x: 300, y: 251, r: 6.5 },
      tipContour: 'M 290 252 C 294 258 306 258 310 252',
      leftNostrilWing: 'M 284 250 C 277 253 277 257 284 258',
      rightNostrilWing: 'M 316 250 C 323 253 323 257 316 258',
      leftNostrilHole: 'M 285 255 C 288 253 294 254 294 257 C 292 258 286 258 285 255 Z',
      rightNostrilHole: 'M 315 255 C 312 253 306 254 306 257 C 308 258 314 258 315 255 Z',
      septumLine: 'M 296 256 C 298 259 302 259 304 256',
    };
  }

  if (preset === 'button') {
    // Cute upturned rounded button
    return {
      leftBridge: 'M 295 218 C 295 228 294 238 290 248',
      rightBridge: 'M 305 218 C 305 228 306 238 310 248',
      tipHighlight: { x: 300, y: 247, r: 5 },
      tipContour: 'M 293 248 C 296 253 304 253 307 248',
      leftNostrilWing: 'M 288 249 C 284 251 284 254 288 255',
      rightNostrilWing: 'M 312 249 C 316 251 316 254 312 255',
      leftNostrilHole: 'M 289 253 C 291 251 295 252 295 254 C 293 255 290 255 289 253 Z',
      rightNostrilHole: 'M 311 253 C 309 251 305 252 305 254 C 307 255 310 255 311 253 Z',
      septumLine: 'M 297 253 C 299 255 301 255 303 253',
    };
  }

  if (preset === 'softRegal') {
    return {
      leftBridge: 'M 293 212 C 293 226 292 238 288 250',
      rightBridge: 'M 307 212 C 307 226 308 238 312 250',
      tipHighlight: { x: 300, y: 250, r: 5.5 },
      tipContour: 'M 291 251 C 295 256 305 256 309 251',
      leftNostrilWing: 'M 286 250 C 280 252 280 256 286 257',
      rightNostrilWing: 'M 314 250 C 320 252 320 256 314 257',
      leftNostrilHole: 'M 287 254 C 290 252 295 253 295 256 C 293 257 288 257 287 254 Z',
      rightNostrilHole: 'M 313 254 C 310 252 305 253 305 256 C 307 257 312 257 313 254 Z',
      septumLine: 'M 297 255 C 299 258 301 258 303 255',
    };
  }

  // narrowDefined (Divine exact shape)
  return {
    leftBridge: 'M 294 214 C 294 226 293 238 289 249',
    rightBridge: 'M 306 214 C 306 226 307 238 311 249',
    tipHighlight: { x: 300, y: 249, r: 5.2 },
    tipContour: 'M 292 250 C 295 255 305 255 308 250',
    leftNostrilWing: 'M 287 249 C 282 252 282 255 287 256',
    rightNostrilWing: 'M 313 249 C 318 252 318 255 313 256',
    leftNostrilHole: 'M 288 254 C 290 252 295 253 295 255 C 293 256 289 256 288 254 Z',
    rightNostrilHole: 'M 312 254 C 310 252 305 253 305 255 C 307 256 311 256 312 254 Z',
    septumLine: 'M 297 254 C 299 257 301 257 303 254',
  };
}

export interface LipGeometry {
  upperLip: string;
  lowerLip: string;
  lipLine: string;
  cornerLeft: { x: number; y: number };
  cornerRight: { x: number; y: number };
  glossHighlightLower: string;
  cupidHighlights: Array<{ x: number; y: number }>;
}

export function getLipGeometry(preset: LipShapePreset): LipGeometry {
  if (preset === 'definedCupid') {
    return {
      upperLip: `
        M 276 278
        C 284 274 292 268 296 270
        C 298 271 300 274 300 274
        C 300 274 302 271 304 270
        C 308 268 316 274 324 278
        C 316 281 308 281 300 281
        C 292 281 284 281 276 278
        Z
      `,
      lowerLip: `
        M 276 278
        C 284 281 292 281 300 281
        C 308 281 316 281 324 278
        C 320 289 312 295 300 295
        C 288 295 280 289 276 278
        Z
      `,
      lipLine: 'M 275 278 C 286 280 300 280.5 314 280 C 325 278 325 278 325 278',
      cornerLeft: { x: 275, y: 278 },
      cornerRight: { x: 325, y: 278 },
      glossHighlightLower: 'M 288 285 C 294 287 306 287 312 285 C 306 289 294 289 288 285 Z',
      cupidHighlights: [{ x: 296, y: 271 }, { x: 304, y: 271 }],
    };
  }

  if (preset === 'widePillowy') {
    return {
      upperLip: `
        M 270 278
        C 280 273 292 270 297 271
        C 299 272 300 274 300 274
        C 300 274 301 272 303 271
        C 308 270 320 273 330 278
        C 320 282 310 282 300 282
        C 290 282 280 282 270 278
        Z
      `,
      lowerLip: `
        M 270 278
        C 280 282 290 282 300 282
        C 310 282 320 282 330 278
        C 324 292 314 297 300 297
        C 286 297 276 292 270 278
        Z
      `,
      lipLine: 'M 269 278 C 282 281 300 281.5 318 281 C 331 278 331 278 331 278',
      cornerLeft: { x: 269, y: 278 },
      cornerRight: { x: 331, y: 278 },
      glossHighlightLower: 'M 284 286 C 292 288 308 288 316 286 C 308 291 292 291 284 286 Z',
      cupidHighlights: [{ x: 297, y: 272 }, { x: 303, y: 272 }],
    };
  }

  if (preset === 'subtleSoft') {
    return {
      upperLip: `
        M 278 279
        C 285 276 294 273 297 274
        C 299 275 300 276 300 276
        C 300 276 301 275 303 274
        C 306 273 315 276 322 279
        C 315 281 308 281 300 281
        C 292 281 285 281 278 279
        Z
      `,
      lowerLip: `
        M 278 279
        C 285 281 292 281 300 281
        C 308 281 315 281 322 279
        C 318 287 310 291 300 291
        C 290 291 282 287 278 279
        Z
      `,
      lipLine: 'M 277 279 C 287 280.5 300 280.8 313 280.5 C 323 279 323 279 323 279',
      cornerLeft: { x: 277, y: 279 },
      cornerRight: { x: 323, y: 279 },
      glossHighlightLower: 'M 290 284 C 295 286 305 286 310 284 C 305 287 295 287 290 284 Z',
      cupidHighlights: [{ x: 297, y: 274 }, { x: 303, y: 274 }],
    };
  }

  // fullPout (Divine exact shape)
  return {
    upperLip: `
      M 274 278
      C 282 273 292 269 297 271
      C 299 272 300 275 300 275
      C 300 275 301 272 303 271
      C 308 269 318 273 326 278
      C 318 281 309 281 300 281
      C 291 281 282 281 274 278
      Z
    `,
    lowerLip: `
      M 274 278
      C 282 281 291 281 300 281
      C 309 281 318 281 326 278
      C 321 291 312 296 300 296
      C 288 296 279 291 274 278
      Z
    `,
    lipLine: 'M 273 278 C 285 280.5 300 281 315 280.5 C 327 278 327 278 327 278',
    cornerLeft: { x: 273, y: 278 },
    cornerRight: { x: 327, y: 278 },
    glossHighlightLower: 'M 286 285 C 293 287.5 307 287.5 314 285 C 307 289.5 293 289.5 286 285 Z',
    cupidHighlights: [{ x: 297, y: 272 }, { x: 303, y: 272 }],
  };
}

export function getFacialHairPaths(preset: FacialHairPreset): { stubblePaths: string[]; beardOutline: string; hairs: string[] } {
  if (preset === 'none') {
    return { stubblePaths: [], beardOutline: '', hairs: [] };
  }

  if (preset === 'stubble') {
    const stubblePaths: string[] = [];
    // Jaw & chin fine stipples
    for (let i = 0; i < 45; i++) {
      const angle = (i / 45) * Math.PI;
      const r = 40 + (i % 3) * 6;
      const x = 300 + Math.cos(angle) * r * 1.3;
      const y = 300 + Math.sin(angle) * 32;
      stubblePaths.push(`M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + 1).toFixed(1)} ${(y + 1.5).toFixed(1)}`);
    }
    // Upper lip stubble
    for (let i = 0; i < 20; i++) {
      const x = 282 + (i % 10) * 4;
      const y = 265 + Math.floor(i / 10) * 3;
      stubblePaths.push(`M ${x} ${y} L ${x + 1} ${y + 1}`);
    }
    return { stubblePaths, beardOutline: '', hairs: [] };
  }

  // fullBeard
  const beardOutline = `
    M 226 230
    C 232 270 244 315 264 340
    C 278 355 300 358 300 358
    C 300 358 322 355 336 340
    C 356 315 368 270 374 230
    C 366 260 348 290 334 300
    C 322 308 308 308 300 308
    C 292 308 278 308 266 300
    C 252 290 234 260 226 230
    Z
  `;

  const hairs: string[] = [];
  for (let i = 0; i < 35; i++) {
    const t = i / 34;
    const x = 245 + t * 110;
    const y = 315 + Math.sin(t * Math.PI) * 30;
    hairs.push(`M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + 1).toFixed(1)} ${(y + 4).toFixed(1)} ${(x - 1).toFixed(1)} ${(y + 8).toFixed(1)}`);
  }

  return { stubblePaths: [], beardOutline, hairs };
}
