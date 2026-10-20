import type { CSSProperties, FC } from 'react';

interface IconProps {
  size?: number | string;
  className?: string;
  color?: string;
  style?: CSSProperties;
}

export const GearIcon: FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`cnp-icon cnp-icon-gear ${className}`}
    style={style}
    aria-hidden="true"
  >
    {/* 12-tooth precision mechanical gear */}
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SpannerIcon: FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`cnp-icon cnp-icon-spanner ${className}`}
    style={style}
    aria-hidden="true"
  >
    {/* Open-ended angled spanner / wrench */}
    <path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ScrewdriverIcon: FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`cnp-icon cnp-icon-screwdriver ${className}`}
    style={style}
    aria-hidden="true"
  >
    {/* Precision screwdriver with blade, bolster, and grip handle */}
    {/* Blade & Tip */}
    <path
      d="M19.5 4.5L16.2 7.8M14.5 9.5L10 14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Slotted blade tip */}
    <path
      d="M21 3L18.5 5.5"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="square"
    />
    {/* Bolster / Collar */}
    <path
      d="M16 6.2L17.8 8"
      stroke="#f5a623"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Handle with contour grip */}
    <path
      d="M10.8 13.2L13.2 15.6C14.2 16.6 14.2 18.2 13.2 19.2L12.2 20.2C11.2 21.2 9.6 21.2 8.6 20.2L3.8 15.4C2.8 14.4 2.8 12.8 3.8 11.8L4.8 10.8C5.8 9.8 7.4 9.8 8.4 10.8L10.8 13.2Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Handle fluting/groove accents */}
    <path
      d="M6 14.2L9.8 18M7.8 12.4L11.6 16.2"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.75"
    />
  </svg>
);

export const ToolEmblem: FC<{
  size?: number;
  className?: string;
}> = ({ size = 110, className = '' }) => {
  return (
    <div
      className={`cnp-tool-emblem ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="emblemPlateGrad" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#223152" />
            <stop offset="70%" stopColor="#141c2e" />
            <stop offset="100%" stopColor="#0b101c" />
          </radialGradient>
          <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbd38d" />
            <stop offset="50%" stopColor="#f5a623" />
            <stop offset="100%" stopColor="#b7791f" />
          </linearGradient>
          <linearGradient id="steelBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* Outer stamped technical ring */}
        <circle cx="60" cy="60" r="56" fill="url(#emblemPlateGrad)" stroke="#32446a" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="51" stroke="url(#goldRimGrad)" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />

        {/* Outer perimeter micro-rivets */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 60 + 53.5 * Math.cos(rad);
          const cy = 60 + 53.5 * Math.sin(rad);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="1.4"
              fill="#94a3b8"
              stroke="#0f172a"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Center Gear in the backdrop */}
        <g transform="translate(60, 60)" className="cnp-emblem-gear">
          {/* 12-tooth Gear Path */}
          <path
            d="M-5 -26 H5 L7 -21 L12 -23 L18 -18 L16 -13 L21 -9 L23 -3 V3 L21 9 L16 13 L18 18 L12 23 L7 21 L5 26 H-5 L-7 21 L-12 23 L-18 18 L-16 13 L-21 9 L-23 3 V-3 L-21 -9 L-16 -13 L-18 -18 L-12 -23 L-7 -21 Z"
            fill="#1c2844"
            stroke="#3b4d75"
            strokeWidth="1.5"
          />
          <circle cx="0" cy="0" r="14" fill="#141c2e" stroke="#253556" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="6" fill="#0b101c" stroke="url(#goldRimGrad)" strokeWidth="1.2" />
        </g>

        {/* Crossed Spanner (top-left to bottom-right) */}
        <g transform="translate(60, 60) rotate(-28)">
          <rect x="-3" y="-22" width="6" height="44" rx="2" fill="url(#steelBladeGrad)" stroke="#1e293b" strokeWidth="0.8" />
          {/* Spanner Head Top */}
          <path
            d="M-7 -22 C-7 -28 7 -28 7 -22 C7 -20 4 -19 4 -17 H-4 C-4 -19 -7 -20 -7 -22 Z"
            fill="url(#steelBladeGrad)"
            stroke="#1e293b"
            strokeWidth="0.8"
          />
          {/* Ring End Bottom */}
          <circle cx="0" cy="22" r="6" fill="url(#steelBladeGrad)" stroke="#1e293b" strokeWidth="0.8" />
          <circle cx="0" cy="22" r="3" fill="#141c2e" />
        </g>

        {/* Crossed Screwdriver (bottom-left to top-right) */}
        <g transform="translate(60, 60) rotate(32)">
          {/* Shaft & Tip */}
          <rect x="-1.8" y="-27" width="3.6" height="30" rx="1" fill="url(#steelBladeGrad)" stroke="#1e293b" strokeWidth="0.6" />
          <path d="M-2.5 -27 H2.5 L1 -30 H-1 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.5" />
          {/* Gold Bolster */}
          <rect x="-3.5" y="0" width="7" height="3" rx="0.5" fill="url(#goldRimGrad)" stroke="#b7791f" strokeWidth="0.5" />
          {/* Grip Handle */}
          <path
            d="M-4.5 3 C-4.5 3 -5.5 12 -4 20 C-3 26 3 26 4 20 C5.5 12 4.5 3 4.5 3 Z"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1"
          />
          {/* Grip flutes */}
          <line x1="-1.5" y1="5" x2="-1.5" y2="19" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
          <line x1="1.5" y1="5" x2="1.5" y2="19" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
          <line x1="0" y1="5" x2="0" y2="20" stroke="url(#goldRimGrad)" strokeWidth="1" />
        </g>

        {/* Circular text label track */}
        <text
          x="60"
          y="18"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="5.8"
          fontWeight="700"
          letterSpacing="1.2"
          fontFamily="Inter, sans-serif"
        >
          CNP DEPARTMENT
        </text>
        <text
          x="60"
          y="107"
          textAnchor="middle"
          fill="#f5a623"
          fontSize="5"
          fontWeight="600"
          letterSpacing="1"
          fontFamily="Inter, sans-serif"
        >
          SMC • GUIITAR LABS
        </text>
      </svg>
    </div>
  );
};
