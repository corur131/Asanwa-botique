import React from 'react';

/**
 * Shared SVG filters mounted once globally.
 * Characters reference these shared blur filters without creating duplicate filter instances,
 * ensuring fast GPU performance and clean rasterization with 4 full characters on screen.
 */
export const SharedDefs: React.FC = () => {
  return (
    <svg
      width="0"
      height="0"
      className="absolute w-0 h-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0 }}
    >
      <defs>
        {/* Subtle blur for eye lid crease, lip line softness, nose bridge shading */}
        <filter id="global-blur-xs" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1200" height="2200">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>

        {/* Small blur for contour boundaries and clavicle hollows */}
        <filter id="global-blur-sm" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1200" height="2200">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>

        {/* Medium blur for cheekbone contour, jaw shadow, arm shading */}
        <filter id="global-blur-md" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1200" height="2200">
          <feGaussianBlur stdDeviation="7" />
        </filter>

        {/* Broad blur for facial contouring, temple shadows, forehead transition */}
        <filter id="global-blur-lg" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1200" height="2200">
          <feGaussianBlur stdDeviation="13" />
        </filter>

        {/* Specialized soft blur for high-end glowing cheek blush */}
        <filter id="global-blur-blush" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1200" height="2200">
          <feGaussianBlur stdDeviation="16" />
        </filter>

        {/* Speckle texture for short and coily hair: keeps only the noise peaks of the shape it is applied to */}
        <filter id="global-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 3 -1.45" result="specks" />
          <feComposite in="SourceGraphic" in2="specks" operator="in" />
        </filter>

        {/* Background ambient radial glow */}
        <filter id="global-blur-glow" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1200" height="2200">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>
    </svg>
  );
};
