const ICON_PATHS = {
  select: ["M4 3l7 17 2.5-7.5L21 10 4 3z"],
  text: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  draw: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
  highlight: ["m9 11-6 6v3h9l3-3", "m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"],
  whiteout: [
    "m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",
    "M22 21H7",
    "m5 11 9 9",
  ],
  image: [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    "m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21",
  ],
  undo: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  redo: ["m15 14 5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H13"],
  rotateCw: ["M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8", "M21 3v5h-5"],
  rotateCcw: ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.7 2.7L3 8", "M3 3v5h5"],
  trash: ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
  plus: ["M5 12h14", "M12 5v14"],
  minus: ["M5 12h14"],
  open: [
    "m6 14 1.5-2.9A2 2 0 0 1 9.2 10H20a2 2 0 0 1 1.9 2.5l-1.5 6a2 2 0 0 1-2 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.7.9l.8 1.2a2 2 0 0 0 1.7.9H18a2 2 0 0 1 2 2v2",
  ],
  save: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  filePlus: [
    "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z",
    "M14 2v6h6",
    "M12 18v-6",
    "M9 15h6",
  ],
  fileBlank: ["M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z", "M14 2v6h6"],
  close: ["M18 6 6 18", "m6 6 12 12"],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
