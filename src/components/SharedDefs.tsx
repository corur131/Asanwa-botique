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
        <filter id="global-blur-xs" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>

        {/* Small blur for contour boundaries and clavicle hollows */}
        <filter id="global-blur-sm" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>

        {/* Medium blur for cheekbone contour, jaw shadow, arm shading */}
        <filter id="global-blur-md" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>

        {/* Broad blur for facial contouring, temple shadows, forehead transition */}
        <filter id="global-blur-lg" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="13" />
        </filter>

        {/* Specialized soft blur for high-end glowing cheek blush */}
        <filter id="global-blur-blush" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>

        {/* Background ambient radial glow */}
        <filter id="global-blur-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>
    </svg>
  );
};
