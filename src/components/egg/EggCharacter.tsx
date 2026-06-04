import { motion } from "framer-motion";
import type { Size } from "@/lib/egg-timer";

type Variant = "soft" | "medium" | "hard";

const PALETTE: Record<Variant, { shell: string; shade: string; cheek: string }> = {
  soft:   { shell: "#fbf6e4", shade: "#efe4be", cheek: "#f6c6b0" },
  medium: { shell: "#f5e6b8", shade: "#e6cf86", cheek: "#f0a584" },
  hard:   { shell: "#e9cf8a", shade: "#cda85a", cheek: "#d97a55" },
};

const SIZE_SCALE: Record<Size, number> = { S: 0.85, M: 1, L: 1.1, XL: 1.2 };

interface Props {
  variant: Variant;
  size?: Size;
  cooking?: boolean;
  done?: boolean;
  pxSize?: number;
}

export function EggCharacter({
  variant,
  size = "M",
  cooking = false,
  done = false,
  pxSize = 180,
}: Props) {
  const p = PALETTE[variant];
  const scale = SIZE_SCALE[size];

  // animation per variant
  const idle =
    variant === "soft"
      ? { scaleX: [1, 1.05, 0.97, 1], scaleY: [1, 0.95, 1.03, 1] }
      : variant === "medium"
        ? { y: [0, -4, 0, -2, 0], rotate: [-1.5, 1.5, -1, 1, -1.5] }
        : { y: [0, -8, 0], rotate: [0, -2, 2, 0] };

  const duration = variant === "soft" ? 1.8 : variant === "medium" ? 2.6 : 1.2;

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
        style={{ transform: `scale(${scale})`, transformOrigin: "center bottom", overflow: "visible" }}
      >
        <defs>
          <radialGradient id={`g-${variant}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="55%" stopColor={p.shell} />
            <stop offset="100%" stopColor={p.shade} />
          </radialGradient>
        </defs>

        {/* Shadow */}
        <motion.ellipse
          cx="100"
          cy="225"
          rx="55"
          ry="6"
          fill="#000"
          opacity="0.12"
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

        {/* Egg body */}
        <path
          d="M100 30 C 55 30 30 110 30 160 C 30 205 60 225 100 225 C 140 225 170 205 170 160 C 170 110 145 30 100 30 Z"
          fill={`url(#g-${variant})`}
          stroke={p.shade}
          strokeWidth="2"
        />

        {/* Cheeks */}
        <ellipse cx="65" cy="155" rx="11" ry="6" fill={p.cheek} opacity="0.7" />
        <ellipse cx="135" cy="155" rx="11" ry="6" fill={p.cheek} opacity="0.7" />

        {/* Eyes */}
        {done ? (
          <>
            <path d="M 70 138 q 8 -10 16 0" stroke="#3b2a1a" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 114 138 q 8 -10 16 0" stroke="#3b2a1a" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <motion.ellipse
              cx="78" cy="140" rx="5" ry="7" fill="#3b2a1a"
              animate={{ ry: [7, 1, 7] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 1], ease: "easeInOut" }}
            />
            <motion.ellipse
              cx="122" cy="140" rx="5" ry="7" fill="#3b2a1a"
              animate={{ ry: [7, 1, 7] }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 1], ease: "easeInOut" }}
            />
            <circle cx="79.5" cy="138" r="1.6" fill="#fff" />
            <circle cx="123.5" cy="138" r="1.6" fill="#fff" />
          </>
        )}

        {/* Smile */}
        <path
          d="M 80 168 Q 100 185 120 168"
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
