import React from 'react';
import { useArcade } from '../../context/ArcadeContext.tsx';

/**
 * Subtle voxel-sky world backdrop: faint pixel grid, small blocky clouds,
 * subtle pixel stars in dark sky, and stepped terrain blocks along bottom edge.
 * Designed for low visual noise so question cards remain crisp and legible.
 */
export const VoxelBackdrop: React.FC = () => {
  const { uiTheme, reducedMotion } = useArcade();
  const isDark = uiTheme === 'dark';

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle 32px pixel tile grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(to right, rgba(148,163,184,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.045) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(30,58,138,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,58,138,0.045) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Twinkling Pixel Stars (Dark Sky only) */}
      {isDark && (
        <svg
          className="absolute inset-x-0 top-14 w-full h-72 opacity-55"
          viewBox="0 0 1200 260"
          preserveAspectRatio="xMidYMin slice"
          shapeRendering="crispEdges"
        >
          <rect x="85" y="42" width="4" height="4" fill="#E2E8F0" />
          <rect x="210" y="96" width="3" height="3" fill="#FACC15" />
          <rect x="345" y="34" width="4" height="4" fill="#38BDF8" />
          <rect x="490" y="112" width="3" height="3" fill="#E2E8F0" />
          <rect x="660" y="54" width="4" height="4" fill="#FACC15" />
          <rect x="815" y="88" width="3" height="3" fill="#E2E8F0" />
          <rect x="970" y="38" width="4" height="4" fill="#38BDF8" />
          <rect x="1110" y="116" width="4" height="4" fill="#4ADE80" />
          <rect x="148" y="184" width="3" height="3" fill="#94A3B8" />
          <rect x="1030" y="176" width="3" height="3" fill="#94A3B8" />
        </svg>
      )}

      {/* Subtle Blocky Pixel Clouds */}
      <div
        className={`absolute top-20 left-[6%] opacity-35 ${
          reducedMotion ? '' : 'voxel-cloud-drift-slow'
        }`}
      >
        <svg width="96" height="36" viewBox="0 0 24 9" shapeRendering="crispEdges">
          <rect x="6" y="1" width="10" height="3" fill={isDark ? '#334155' : '#FFFFFF'} />
          <rect x="3" y="3" width="18" height="4" fill={isDark ? '#334155' : '#FFFFFF'} />
          <rect x="1" y="5" width="22" height="3" fill={isDark ? '#1E293B' : '#DBEAFE'} />
        </svg>
      </div>

      <div
        className={`hidden sm:block absolute top-28 right-[8%] opacity-30 ${
          reducedMotion ? '' : 'voxel-cloud-drift-reverse'
        }`}
      >
        <svg width="112" height="40" viewBox="0 0 28 10" shapeRendering="crispEdges">
          <rect x="8" y="1" width="11" height="3" fill={isDark ? '#334155' : '#FFFFFF'} />
          <rect x="4" y="4" width="20" height="4" fill={isDark ? '#334155' : '#FFFFFF'} />
          <rect x="2" y="6" width="24" height="3" fill={isDark ? '#1E293B' : '#DBEAFE'} />
        </svg>
      </div>

      {/* Subtle Stepped Voxel Horizon Silhouette at Bottom */}
      <svg
        className="absolute bottom-0 inset-x-0 w-full h-14 sm:h-16 opacity-35"
        viewBox="0 0 640 32"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        {/* Distant hill blocks */}
        <rect x="0" y="20" width="96" height="12" fill={isDark ? '#1E293B' : '#86EFAC'} />
        <rect x="96" y="16" width="64" height="16" fill={isDark ? '#1E293B' : '#86EFAC'} />
        <rect x="160" y="22" width="112" height="10" fill={isDark ? '#1E293B' : '#86EFAC'} />
        <rect x="272" y="14" width="80" height="18" fill={isDark ? '#1E293B' : '#86EFAC'} />
        <rect x="352" y="20" width="128" height="12" fill={isDark ? '#1E293B' : '#86EFAC'} />
        <rect x="480" y="16" width="80" height="16" fill={isDark ? '#1E293B' : '#86EFAC'} />
        <rect x="560" y="22" width="80" height="10" fill={isDark ? '#1E293B' : '#86EFAC'} />
        {/* Top grass/stone pixel rim */}
        <rect x="0" y="26" width="640" height="6" fill={isDark ? '#0F172A' : '#4ADE80'} />
      </svg>
    </div>
  );
};
