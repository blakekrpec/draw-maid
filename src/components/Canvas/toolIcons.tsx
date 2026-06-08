// Small inline icons for the canvas Controls tool toggle. Sized to match React
// Flow's control buttons; they inherit color via `currentColor`.

const common = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Hand = pan mode. */
export function HandIcon() {
  return (
    <svg {...common}>
      <path d="M18 11V6a2 2 0 0 0-4 0" />
      <path d="M14 10V4a2 2 0 0 0-4 0v2" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}

/** Dashed marquee = select mode. */
export function MarqueeIcon() {
  return (
    <svg {...common} strokeDasharray="3 2.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
