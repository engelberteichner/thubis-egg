import { motion } from "framer-motion";
import type { Size } from "@/lib/egg-timer";

type Variant = "soft" | "medium" | "hard";

// Belly color changes from warm orange (soft yolk) → pale yellow (hard yolk).
// The shell itself stays eggshell white for all variants.
const BELLY: Record<Variant, { fill: string; ring: string }> = {
  soft:   { fill: "#ffa94d", ring: "#e8862b" }, // orange
  medium: { fill: "#ffd24a", ring: "#e0a91f" }, // yolk yellow
  hard:   { fill: "#fff1a8", ring: "#e8c95a" }, // pale yellow
};

const SHELL = { light: "#ffffff", base: "#fbf6e7", shade: "#ecdfba", cheek: "#f6b89a" };

const SIZE_SCALE: Record<Size, number> = { S: 0.7, M: 0.9, L: 1.1, XL: 1.3 };

interface Props {
  variant: Variant;
  size?: Size;
  cooking?: boolean;
  done?: boolean;
  pxSize?: number;
  ribbon?: boolean;
}

export function EggCharacter({
  variant,
  size = "M",
  cooking = false,
  done = false,
  pxSize = 180,
  ribbon = false,
}: Props) {
  const belly = BELLY[variant];
  const scale = SIZE_SCALE[size];

  // Gentle, consistent happy bobbing for every variant.
  const idle = { y: [0, -5, 0, -2, 0], rotate: [-1.2, 1.2, -0.8, 0.8, -1.2] };
  const duration = 2.4;

  return (
    <motion.div
      style={{ width: pxSize, height: pxSize }}
      animate={idle}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.svg
        viewBox="0 0 200 240"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        <defs>
          <radialGradient id="g-shell" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={SHELL.light} stopOpacity="0.95" />
            <stop offset="55%" stopColor={SHELL.base} />
            <stop offset="100%" stopColor={SHELL.shade} />
          </radialGradient>
          <radialGradient id={`g-belly-${variant}`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="60%" stopColor={belly.fill} />
            <stop offset="100%" stopColor={belly.ring} />
          </radialGradient>
          <clipPath id="clip-egg">
            <path d="M100 30 C 55 30 30 110 30 160 C 30 205 60 225 100 225 C 140 225 170 205 170 160 C 170 110 145 30 100 30 Z" />
          </clipPath>
        </defs>

        {/* Shadow */}
        <motion.ellipse
          cx="100" cy="225" rx="55" ry="6"
          fill="#000" opacity="0.12"
          animate={{ rx: [55, 48, 55] }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Steam (only while cooking) */}
        {cooking && !done && (
          <g opacity="0.6">
            {[0, 1, 2].map((i) => (
              <motion.path
                key={i}
                d="M 0 0 q 8 -12 0 -24 q -8 -12 0 -24"
                stroke="#cfc6b0"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                style={{ transformOrigin: "center", transform: `translate(${75 + i * 25}px, 40px)` }}
                animate={{ opacity: [0, 0.7, 0], y: [0, -20, -35] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
              />
            ))}
          </g>
        )}

        {/* Eggshell body */}
        <path
          d="M100 30 C 55 30 30 110 30 160 C 30 205 60 225 100 225 C 140 225 170 205 170 160 C 170 110 145 30 100 30 Z"
          fill="url(#g-shell)"
          stroke={SHELL.shade}
          strokeWidth="2"
        />

        {/* Pink ribbon (🎀) — tilted on the upper-left side of the head */}
        {ribbon && (
          <g transform="translate(58 52) rotate(-22)">
            {/* Tails / streamers */}
            <path d="M -3 6 Q -10 16 -14 26 L -6 26 Q -1 16 3 8 Z" fill="#ec4899" />
            <path d="M 3 6 Q 10 16 14 26 L 6 26 Q 1 16 -3 8 Z" fill="#ec4899" />
            {/* Left loop */}
            <path
              d="M 0 0 C -14 -10 -22 -6 -22 2 C -22 10 -12 12 0 6 Z"
              fill="#f472b6"
              stroke="#ec4899"
              strokeWidth="1.2"
            />
            {/* Right loop */}
            <path
              d="M 0 0 C 14 -10 22 -6 22 2 C 22 10 12 12 0 6 Z"
              fill="#f472b6"
              stroke="#ec4899"
              strokeWidth="1.2"
            />
            {/* Loop highlights */}
            <ellipse cx="-12" cy="-2" rx="4" ry="1.4" fill="#fbcfe8" opacity="0.9" />
            <ellipse cx="12" cy="-2" rx="4" ry="1.4" fill="#fbcfe8" opacity="0.9" />
            {/* Center knot */}
            <ellipse cx="0" cy="3" rx="4.5" ry="6" fill="#ec4899" />
            <ellipse cx="0" cy="2" rx="2" ry="3.5" fill="#f9a8d4" />
          </g>
        )}

        {/* Yolk belly — color animates with variant */}
        <g clipPath="url(#clip-egg)">
          <motion.ellipse
            cx="100" cy="170" rx="62" ry="48"
            fill={`url(#g-belly-${variant})`}
            stroke={belly.ring}
            strokeWidth="2"
            initial={false}
            animate={{ fill: belly.fill }}
            transition={{ duration: 0.4 }}
          />
        </g>

        {/* Cheeks */}
        <ellipse cx="62" cy="148" rx="11" ry="6" fill={SHELL.cheek} opacity="0.75" />
        <ellipse cx="138" cy="148" rx="11" ry="6" fill={SHELL.cheek} opacity="0.75" />

        {/* Eyes */}
        {done ? (
          <>
            <path d="M 70 132 q 8 -10 16 0" stroke="#3b2a1a" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 114 132 q 8 -10 16 0" stroke="#3b2a1a" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <motion.ellipse
              cx="78" cy="134" rx="5" ry="7" fill="#3b2a1a"
              animate={{ ry: [7, 1, 7] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 1], ease: "easeInOut" }}
            />
            <motion.ellipse
              cx="122" cy="134" rx="5" ry="7" fill="#3b2a1a"
              animate={{ ry: [7, 1, 7] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 1], ease: "easeInOut" }}
            />
            <circle cx="79.5" cy="132" r="1.6" fill="#fff" />
            <circle cx="123.5" cy="132" r="1.6" fill="#fff" />
          </>
        )}

        {/* Smile */}
        <path
          d="M 82 162 Q 100 180 118 162"
          stroke="#3b2a1a"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Sparkles when done */}
        {done && (
          <g>
            {[
              [40, 60], [160, 70], [30, 130], [170, 140], [50, 200], [155, 200],
            ].map(([x, y], i) => (
              <motion.g
                key={i}
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              >
                <path
                  d={`M ${x} ${y - 6} L ${x + 2} ${y - 2} L ${x + 6} ${y} L ${x + 2} ${y + 2} L ${x} ${y + 6} L ${x - 2} ${y + 2} L ${x - 6} ${y} L ${x - 2} ${y - 2} Z`}
                  fill="#f3c14a"
                />
              </motion.g>
            ))}
          </g>
        )}
      </motion.svg>
    </motion.div>
  );
}
