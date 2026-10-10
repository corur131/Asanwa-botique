import { HairColorId, HairStyle } from '../../../types/character';

export interface HairPalette {
  base: string;
  darkShadow: string;
  mid: string;
  strandHighlight: string;
  specular: string;
}

export const HAIR_PALETTES: Record<HairColorId, HairPalette> = {
  black: {
    base: '#1a1311',
    darkShadow: '#0d0908',
    mid: '#2b1e1a',
    strandHighlight: '#443029',
    specular: '#62463b',
  },
  darkBrown: {
    base: '#2e1c14',
    darkShadow: '#1a0f0b',
    mid: '#442b20',
    strandHighlight: '#684333',
    specular: '#8a5c48',
  },
  burgundy: {
    base: '#3a0f18',
    darkShadow: '#22080d',
    mid: '#5c1727',
    strandHighlight: '#85243a',
    specular: '#aa3a54',
  },
  honeyBlonde: {
    base: '#875d27',
    darkShadow: '#573812',
    mid: '#b07f3c',
    strandHighlight: '#d8a55b',
    specular: '#f2c884',
  },
};

export interface HairRenderData {
  backHairPath: string;
  frontHairPath: string;
  strands: string[];
  sideBraidsLeft?: { ribbon: string; plaits: string[]; strands: string[] };
  sideBraidsRight?: { ribbon: string; plaits: string[]; strands: string[] };
  babyHairs?: string[];
  flyaways?: string[];
  wavesLines?: string[];
  dreadLocs?: Array<{ path: string; highlights: string[] }>;
}

export function getHairRenderData(
  style: HairStyle,
  isPlain: boolean
): HairRenderData {
  const strands: string[] = [];
  const babyHairs: string[] = [];
  const flyaways: string[] = [];

  // Plain state adds frizz and flyaway strands
  if (isPlain) {
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 1.5 - 0.25 * Math.PI;
      const x = 300 + Math.cos(angle) * (95 + (i % 5) * 8);
      const y = 175 + Math.sin(angle) * (95 + (i % 4) * 8);
      const dx = (Math.random() - 0.5) * 18;
      const dy = (Math.random() - 0.5) * 18;
      flyaways.push(`M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)} ${(x + dx * 1.6).toFixed(1)} ${(y + dy * 1.6).toFixed(1)}`);
    }
  }

  // 1. LONG BRAIDS (Divine signature style)
  if (style === 'longBraids') {
    const backHairPath = `
      M 300 80
      C 220 80 180 120 160 170
      C 140 220 135 280 135 350
      C 135 430 145 520 155 600
      C 165 670 180 730 190 770
      L 220 760
      C 210 700 200 620 195 530
      C 190 440 195 360 215 310
      L 385 310
      C 405 360 410 440 405 530
      C 400 620 390 700 380 760
      L 410 770
      C 420 730 435 670 445 600
      C 455 520 465 430 465 350
      C 465 280 460 220 440 170
      C 420 120 380 80 300 80
      Z
    `;

    const frontHairPath = `
      M 300 82
      C 230 82 205 115 198 165
      C 192 210 200 245 208 275
      C 212 288 220 295 224 290
      C 228 280 224 250 220 220
      C 216 185 228 150 255 130
      C 275 116 295 114 300 114
      C 305 114 325 116 345 130
      C 372 150 384 185 380 220
      C 376 250 372 280 376 290
      C 380 295 388 288 392 275
      C 400 245 408 210 402 165
      C 395 115 370 82 300 82
      Z
    `;

    // Crown flowing strand lines
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      const lx = 295 - t * 75;
      strands.push(`M ${lx} 85 C ${(lx - 10)} 110 ${(lx - 20)} 140 ${(lx - 28)} 185`);
      const rx = 305 + t * 75;
      strands.push(`M ${rx} 85 C ${(rx + 10)} 110 ${(rx + 20)} 140 ${(rx + 28)} 185`);
    }

    // Side ribbon braids cascading over shoulders (exact match to divine.svg)
    // Left ribbon braid (flowing waves)
    const leftRibbon = `
      M 215 285
      C 195 330 185 375 195 420
      C 205 465 190 515 178 565
      C 166 615 176 665 186 715
      C 196 765 170 815 155 860
      C 145 890 148 915 160 920
      C 172 925 185 905 192 870
      C 206 820 224 770 216 720
      C 208 670 218 620 230 570
      C 242 520 232 470 222 425
      C 212 380 226 335 238 290
      Z
    `;

    const leftPlaits: string[] = [];
    const leftStrands: string[] = [];
    // Procedural wavy segments for left braid
    for (let y = 300; y < 880; y += 38) {
      const wave = Math.sin((y / 70) * Math.PI) * 16;
      const bx = 205 + wave;
      leftPlaits.push(`M ${(bx - 18).toFixed(1)} ${y} Q ${bx.toFixed(1)} ${(y + 12).toFixed(1)} ${(bx + 18).toFixed(1)} ${(y + 4).toFixed(1)}`);
      leftStrands.push(`M ${(bx - 12).toFixed(1)} ${(y + 2).toFixed(1)} Q ${bx.toFixed(1)} ${(y + 16).toFixed(1)} ${(bx + 12).toFixed(1)} ${(y + 6).toFixed(1)}`);
    }

    // Right ribbon braid
    const rightRibbon = `
      M 385 285
      C 405 330 415 375 405 420
      C 395 465 410 515 422 565
      C 434 615 424 665 414 715
      C 404 765 430 815 445 860
      C 455 890 452 915 440 920
      C 428 925 415 905 408 870
      C 394 820 376 770 384 720
      C 392 670 382 620 370 570
      C 358 520 368 470 378 425
      C 388 380 374 335 362 290
      Z
    `;

    const rightPlaits: string[] = [];
    const rightStrands: string[] = [];
    for (let y = 300; y < 880; y += 38) {
      const wave = -Math.sin((y / 70) * Math.PI) * 16;
      const bx = 395 + wave;
      rightPlaits.push(`M ${(bx - 18).toFixed(1)} ${y} Q ${bx.toFixed(1)} ${(y + 12).toFixed(1)} ${(bx + 18).toFixed(1)} ${(y + 4).toFixed(1)}`);
      rightStrands.push(`M ${(bx - 12).toFixed(1)} ${(y + 2).toFixed(1)} Q ${bx.toFixed(1)} ${(y + 16).toFixed(1)} ${(bx + 12).toFixed(1)} ${(y + 6).toFixed(1)}`);
    }

    // Swirling delicate edge curls (laid edges) on forehead / temple (divine.svg signature)
    if (!isPlain) {
      babyHairs.push(
        // Right temple swirl 1
        'M 368 152 C 372 155 374 162 370 166 C 366 170 361 166 363 161 C 365 157 372 158 373 162',
        // Right temple swirl 2
        'M 370 168 C 374 171 376 178 372 182 C 368 186 363 182 365 177 C 367 173 374 174 375 178',
        // Right temple swirl 3
        'M 372 184 C 376 187 378 194 374 198 C 370 202 365 198 367 193 C 369 189 376 190 377 194',
        // Left temple gentle edge
        'M 235 156 C 230 162 227 170 231 176 C 234 180 238 178 236 172'
      );
    }

    return {
      backHairPath,
      frontHairPath,
      strands,
      sideBraidsLeft: { ribbon: leftRibbon, plaits: leftPlaits, strands: leftStrands },
      sideBraidsRight: { ribbon: rightRibbon, plaits: rightPlaits, strands: rightStrands },
      babyHairs,
      flyaways,
    };
  }

  // 2. BONE STRAIGHT
  if (style === 'boneStraight') {
    const backHairPath = `
      M 300 80
      C 220 80 180 115 160 160
      C 142 205 138 260 136 330
      C 134 420 136 530 140 640
      C 142 700 148 760 156 810
      L 220 805
      C 210 740 202 660 198 560
      C 194 460 202 370 220 310
      L 380 310
      C 398 370 406 460 402 560
      C 398 660 390 740 380 805
      L 444 810
      C 452 760 458 700 460 640
      C 464 530 466 420 464 330
      C 462 260 458 205 440 160
      C 420 115 380 80 300 80
      Z
    `;

    const frontHairPath = `
      M 300 80
      C 230 80 205 115 198 160
      C 192 205 198 250 206 290
      C 214 340 220 410 222 490
      C 224 550 220 620 216 680
      L 242 675
      C 246 615 248 545 244 480
      C 240 400 230 330 224 270
      C 220 220 230 170 256 135
      C 275 118 296 115 300 115
      C 304 115 325 118 344 135
      C 370 170 380 220 376 270
      C 370 330 360 400 356 480
      C 352 545 354 615 358 675
      L 384 680
      C 380 620 376 550 378 490
      C 380 410 386 340 394 290
      C 402 250 408 205 402 160
      C 395 115 370 80 300 80
      Z
    `;

    // Sleek silky vertical strand highlights
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const x = 160 + t * 280;
      if (Math.abs(x - 300) > 35) {
        strands.push(`M ${x} 120 L ${(x + (x < 300 ? -8 : 8))} 650`);
      }
    }

    if (!isPlain) {
      babyHairs.push(
        'M 298 116 L 298 135',
        'M 302 116 L 302 135'
      );
    }

    return { backHairPath, frontHairPath, strands, babyHairs, flyaways };
  }

  // 3. CORNROWS
  if (style === 'cornrows') {
    const backHairPath = `
      M 300 95
      C 230 95 190 130 175 180
      C 160 230 156 300 160 380
      C 164 450 176 530 190 610
      L 225 600
      C 212 525 204 450 205 380
      L 395 380
      C 396 450 388 525 375 600
      L 410 610
      C 424 530 436 450 440 380
      C 444 300 440 230 425 180
      C 410 130 370 95 300 95
      Z
    `;

    const frontHairPath = `
      M 300 95
      C 240 95 210 125 200 165
      C 194 195 200 230 206 260
      C 210 270 216 270 218 260
      C 222 225 220 185 240 150
      C 255 125 278 116 300 116
      C 322 116 345 125 360 150
      C 380 185 378 225 382 260
      C 384 270 390 270 394 260
      C 400 230 406 195 400 165
      C 390 125 360 95 300 95
      Z
    `;

    // Procedural cornrow braided rows radiating from center forehead
    const cornrowRows = [
      { startX: 300, startY: 116, endX: 300, endY: 82 },
      { startX: 288, startY: 120, endX: 265, endY: 86 },
      { startX: 275, startY: 130, endX: 235, endY: 96 },
      { startX: 260, startY: 145, endX: 210, endY: 115 },
      { startX: 245, startY: 165, endX: 195, endY: 145 },
      { startX: 312, startY: 120, endX: 335, endY: 86 },
      { startX: 325, startY: 130, endX: 365, endY: 96 },
      { startX: 340, startY: 145, endX: 390, endY: 115 },
      { startX: 355, startY: 165, endX: 405, endY: 145 },
    ];

    cornrowRows.forEach((row) => {
      strands.push(`M ${row.startX} ${row.startY} Q ${(row.startX + row.endX) / 2} ${((row.startY + row.endY) / 2) - 5} ${row.endX} ${row.endY}`);
      // Plaits on each cornrow track
      for (let s = 0.2; s <= 0.8; s += 0.15) {
        const px = row.startX + (row.endX - row.startX) * s;
        const py = row.startY + (row.endY - row.startY) * s;
        strands.push(`M ${(px - 3).toFixed(1)} ${(py - 1).toFixed(1)} L ${(px + 3).toFixed(1)} ${(py + 1).toFixed(1)}`);
      }
    });

    if (!isPlain) {
      babyHairs.push(
        'M 284 123 C 280 128 276 134 279 138 C 282 140 286 138 284 133',
        'M 316 123 C 320 128 324 134 321 138 C 318 140 314 138 316 133'
      );
    }

    return { backHairPath, frontHairPath, strands, babyHairs, flyaways };
  }

  // 4. AFRO PUFF
  if (style === 'afroPuff') {
    // Large glorious cloud puff on crown
    const backHairPath = `
      M 300 45
      C 220 45 160 85 150 145
      C 142 195 170 235 220 250
      C 240 256 260 258 300 258
      C 340 258 360 256 380 250
      C 430 235 458 195 450 145
      C 440 85 380 45 300 45
      Z
    `;

    // Sleeked base hairline + hairband
    const frontHairPath = `
      M 300 115
      C 255 115 224 135 216 170
      C 212 195 218 220 224 235
      C 228 242 236 240 238 232
      C 244 200 255 170 280 152
      C 290 146 300 145 300 145
      C 300 145 310 146 320 152
      C 345 170 356 200 362 232
      C 364 240 372 242 376 235
      C 382 220 388 195 384 170
      C 376 135 345 115 300 115
      Z
    `;

    // Voluminous afro coil texture strokes
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const r = 60 + (i % 6) * 16;
      const cx = 300 + Math.cos(angle) * r * 1.3;
      const cy = 145 + Math.sin(angle) * r * 0.85;
      strands.push(`M ${cx.toFixed(1)} ${cy.toFixed(1)} C ${(cx + 4).toFixed(1)} ${(cy - 4).toFixed(1)} ${(cx - 4).toFixed(1)} ${(cy + 5).toFixed(1)} ${(cx + 3).toFixed(1)} ${(cy + 6).toFixed(1)}`);
    }

    if (!isPlain) {
      babyHairs.push(
        'M 270 140 C 265 145 260 150 263 154 C 266 156 270 154 268 148',
        'M 330 140 C 335 145 340 150 337 154 C 334 156 330 154 332 148'
      );
    }

    return { backHairPath, frontHairPath, strands, babyHairs, flyaways };
  }

  // 5. SHORT NATURAL (TWA - Teeny Weeny Afro)
  if (style === 'shortNatural') {
    const backHairPath = `
      M 300 95
      C 235 95 208 125 204 165
      C 200 195 206 215 210 225
      L 390 225
      C 394 215 400 195 396 165
      C 392 125 365 95 300 95
      Z
    `;

    const frontHairPath = `
      M 300 95
      C 245 95 218 120 214 155
      C 212 175 216 195 220 210
      C 222 215 228 214 230 208
      C 236 180 250 150 275 136
      C 285 130 300 130 300 130
      C 300 130 315 130 325 136
      C 350 150 364 180 370 208
      C 372 214 378 215 380 210
      C 384 195 388 175 386 155
      C 382 120 355 95 300 95
      Z
    `;

    // Tightly coiled texture curls across the crown
    for (let i = 0; i < 35; i++) {
      const angle = (i / 35) * Math.PI;
      const r = 35 + (i % 5) * 12;
      const x = 300 + Math.cos(angle) * r * 1.4;
      const y = 145 - Math.sin(angle) * r * 0.7;
      strands.push(`M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + 3).toFixed(1)} ${(y - 3).toFixed(1)} ${(x - 1).toFixed(1)} ${(y + 4).toFixed(1)}`);
    }

    return { backHairPath, frontHairPath, strands, babyHairs, flyaways };
  }

  // 6. MALE LOW CUT (Clean 360 wave fade + razor edge-up)
  if (style === 'lowCut') {
    const backHairPath = `
      M 300 95
      C 235 95 208 120 204 160
      C 200 195 205 215 210 225
      L 390 225
      C 395 215 400 195 396 160
      C 392 120 365 95 300 95
      Z
    `;

    // Crisp square hairline tape edge-up
    const frontHairPath = `
      M 300 98
      C 246 98 220 120 216 155
      C 214 170 216 185 222 195
      L 230 195
      L 230 178
      L 245 178
      L 245 155
      C 260 148 280 145 300 145
      C 320 145 340 148 355 155
      L 355 178
      L 370 178
      L 370 195
      L 378 195
      C 384 185 386 170 384 155
      C 380 120 354 98 300 98
      Z
    `;

    const wavesLines: string[] = [
      'M 255 130 C 275 124 325 124 345 130',
      'M 245 140 C 270 134 330 134 355 140',
      'M 235 155 C 265 146 335 146 365 155',
    ];

    return { backHairPath, frontHairPath, strands, wavesLines, flyaways };
  }

  // 7. MALE WAVES (Deep 360 wave ripples + edge-up)
  if (style === 'waves') {
    const backHairPath = `
      M 300 94
      C 234 94 206 120 202 160
      C 198 195 204 215 208 225
      L 392 225
      C 396 215 402 195 398 160
      C 394 120 366 94 300 94
      Z
    `;

    const frontHairPath = `
      M 300 96
      C 245 96 218 120 214 155
      C 212 170 214 185 220 195
      L 228 195
      L 228 178
      L 244 178
      L 244 155
      C 260 148 280 145 300 145
      C 320 145 340 148 356 155
      L 356 178
      L 372 178
      L 372 195
      L 380 195
      C 386 185 388 170 386 155
      C 382 120 355 96 300 96
      Z
    `;

    // Deep spinning wave arcs across crown
    const wavesLines: string[] = [
      'M 270 115 C 285 110 315 110 330 115',
      'M 255 125 C 280 118 320 118 345 125',
      'M 245 136 C 275 127 325 127 355 136',
      'M 238 148 C 270 138 330 138 362 148',
      'M 232 162 C 268 150 332 150 368 162',
      'M 226 178 C 265 164 335 164 374 178',
    ];

    return { backHairPath, frontHairPath, strands, wavesLines, flyaways };
  }

  // 8. MALE SHORT DREADS
  // Short locs falling naturally over crown and temples
  const backHairPath = `
    M 300 90
    C 230 90 200 125 190 170
    C 180 210 185 240 195 260
    L 405 260
    C 415 240 420 210 410 170
    C 400 125 370 90 300 90
    Z
  `;

  const frontHairPath = `
    M 300 98
    C 246 98 220 124 214 158
    C 210 185 218 215 226 230
    L 374 230
    C 382 215 390 185 386 158
    C 380 124 354 98 300 98
    Z
  `;

  const dreadLocs: Array<{ path: string; highlights: string[] }> = [
    // Left side locs
    { path: 'M 255 135 Q 235 160 224 195', highlights: ['M 252 140 Q 234 163 225 190'] },
    { path: 'M 268 130 Q 248 165 240 205', highlights: ['M 265 135 Q 247 168 241 200'] },
    { path: 'M 245 145 Q 225 175 215 215', highlights: ['M 242 150 Q 224 178 216 210'] },
    { path: 'M 278 128 Q 260 170 255 218', highlights: ['M 275 132 Q 259 172 256 212'] },
    // Center & front dangling locs
    { path: 'M 292 125 Q 285 165 280 210', highlights: ['M 290 130 Q 284 168 281 205'] },
    { path: 'M 308 125 Q 315 165 320 210', highlights: ['M 310 130 Q 316 168 319 205'] },
    // Right side locs
    { path: 'M 322 128 Q 340 170 345 218', highlights: ['M 325 132 Q 341 172 344 212'] },
    { path: 'M 332 130 Q 352 165 360 205', highlights: ['M 335 135 Q 353 168 359 200'] },
    { path: 'M 345 135 Q 365 160 376 195', highlights: ['M 348 140 Q 366 163 375 190'] },
    { path: 'M 355 145 Q 375 175 385 215', highlights: ['M 358 150 Q 376 178 384 210'] },
  ];

  return { backHairPath, frontHairPath, strands, dreadLocs, flyaways };
}
