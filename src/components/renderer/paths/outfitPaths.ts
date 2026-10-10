import { BodyType, CharacterState } from '../../../types/character';

export interface OutfitGeometries {
  top: string;
  topNecklineCutout?: string;
  collar?: string;
  shirtButtons?: Array<{ x: number; y: number }>;
  bottom: string;
  bottomWaistband: string;
  shoesLeft: string;
  shoesRight: string;
  wrinkles?: string[];
}

export function getOutfitGeometries(body: BodyType, state: CharacterState): OutfitGeometries {
  const isPlain = state === 'plain';

  if (body === 'male') {
    // Male: Tailored button shirt + trousers + leather loafers
    const top = `
      M 244 395
      C 210 405 175 415 152 430
      C 142 445 130 510 122 575
      C 118 640 120 700 124 750
      L 164 745
      C 160 705 158 650 162 600
      C 166 550 178 495 186 465
      L 190 635
      C 220 638 270 640 300 640
      C 330 640 380 638 410 635
      L 414 465
      C 422 495 434 550 438 600
      C 442 650 440 705 436 745
      L 476 750
      C 480 700 482 640 478 575
      C 470 510 458 445 448 430
      C 425 415 390 405 356 395
      L 330 425
      L 300 445
      L 270 425
      Z
    `;

    const collar = `
      M 260 395
      L 282 435
      L 300 445
      L 318 435
      L 340 395
      L 300 410
      Z
    `;

    const shirtButtons = [
      { x: 300, y: 465 },
      { x: 300, y: 505 },
      { x: 300, y: 545 },
      { x: 300, y: 585 },
      { x: 300, y: 620 },
    ];

    const bottom = `
      M 190 635
      C 220 638 270 640 300 640
      C 330 640 380 638 410 635
      C 406 670 404 705 408 745
      C 414 785 418 820 418 850
      L 364 1395
      L 316 1395
      C 314 1330 310 1260 306 1190
      C 302 1120 300 1040 300 980
      C 300 1040 298 1120 294 1190
      C 290 1260 286 1330 284 1395
      L 236 1395
      L 182 850
      C 182 820 186 785 192 745
      C 196 705 194 670 190 635
      Z
    `;

    const bottomWaistband = 'M 190 635 C 220 638 270 640 300 640 C 330 640 380 638 410 635 L 410 648 C 380 651 330 653 300 653 C 270 653 220 651 190 648 Z';

    const shoesLeft = 'M 234 1395 C 230 1420 220 1445 208 1460 L 260 1460 C 262 1435 264 1410 262 1395 Z';
    const shoesRight = 'M 338 1395 C 336 1410 338 1435 340 1460 L 392 1460 C 380 1445 370 1420 366 1395 Z';

    const wrinkles = isPlain
      ? [
          'M 270 510 Q 285 515 300 512',
          'M 300 560 Q 320 565 335 558',
          'M 230 920 Q 250 930 270 918',
          'M 330 918 Q 350 930 370 920',
          'M 250 1220 Q 265 1230 280 1222',
          'M 320 1222 Q 335 1230 350 1220',
        ]
      : [];

    return { top, collar, shirtButtons, bottom, bottomWaistband, shoesLeft, shoesRight, wrinkles };
  }

  if (body === 'femalePlus') {
    // Female Plus: Fitted halter / scoop camisole top + high-waisted midi skirt + heels
    const top = `
      M 230 425
      C 255 465 275 480 300 480
      C 325 480 345 465 370 425
      C 395 440 420 460 426 490
      C 434 530 426 575 410 620
      C 400 645 392 658 392 658
      L 208 658
      C 208 658 200 645 190 620
      C 174 575 166 530 174 490
      C 180 460 205 440 230 425
      Z
    `;

    const bottom = `
      M 208 658
      C 230 664 270 668 300 668
      C 330 668 370 664 392 658
      C 412 690 432 730 440 780
      C 446 830 438 880 428 930
      C 418 980 404 1025 394 1055
      L 206 1055
      C 196 1025 182 980 172 930
      C 162 880 154 830 160 780
      C 168 730 188 690 208 658
      Z
    `;

    const bottomWaistband = 'M 208 658 C 230 664 270 668 300 668 C 330 668 370 664 392 658 L 392 672 C 370 678 330 682 300 682 C 270 682 230 678 208 672 Z';

    const shoesLeft = 'M 194 1395 C 192 1420 188 1445 184 1460 L 244 1460 C 246 1440 248 1415 246 1395 Z';
    const shoesRight = 'M 320 1395 C 318 1415 320 1440 322 1460 L 382 1460 C 378 1445 374 1420 372 1395 Z';

    const wrinkles = isPlain
      ? [
          'M 240 560 Q 260 570 280 562',
          'M 320 562 Q 340 570 360 560',
          'M 220 740 Q 250 755 280 745',
          'M 320 745 Q 350 755 380 740',
          'M 230 890 Q 260 905 290 895',
        ]
      : [];

    return { top, bottom, bottomWaistband, shoesLeft, shoesRight, wrinkles };
  }

  // Female Regular: Fitted scoop camisole / corset top + high-waisted pencil skirt + heels
  const top = `
    M 235 420
    C 255 455 275 470 300 470
    C 325 470 345 455 365 420
    C 388 435 410 455 414 480
    C 420 515 408 555 394 595
    C 386 615 380 625 380 625
    L 220 625
    C 220 625 214 615 206 595
    C 192 555 180 515 186 480
    C 190 455 212 435 235 420
    Z
  `;

  const bottom = `
    M 220 625
    C 240 630 270 634 300 634
    C 330 634 360 630 380 625
    C 400 655 416 695 422 740
    C 426 780 420 830 410 880
    C 400 930 388 975 378 1015
    L 222 1015
    C 212 975 200 930 190 880
    C 180 830 174 780 178 740
    C 184 695 200 655 220 625
    Z
  `;

  const bottomWaistband = 'M 220 625 C 240 630 270 634 300 634 C 330 634 360 630 380 625 L 380 638 C 360 643 330 647 300 647 C 270 647 240 643 220 638 Z';

  const shoesLeft = 'M 204 1365 C 202 1395 198 1425 194 1445 L 246 1445 C 248 1420 250 1390 248 1365 Z';
  const shoesRight = 'M 320 1365 C 318 1390 320 1420 322 1445 L 374 1445 C 370 1425 366 1395 364 1365 Z';

  const wrinkles = isPlain
    ? [
        'M 250 535 Q 275 545 300 538',
        'M 300 538 Q 325 545 350 535',
        'M 240 710 Q 270 725 300 715',
        'M 300 715 Q 330 725 360 710',
        'M 245 850 Q 275 865 300 855',
      ]
    : [];

  return { top, bottom, bottomWaistband, shoesLeft, shoesRight, wrinkles };
}
