// Small inline icon set (1.5px stroke) so the project needs no icon dependency.
// Icons are decorative by default (aria-hidden). Pass `title` to make one meaningful.

function Svg({ children, size = 20, title, className, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      className={className}
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Svg>
);
export const BagIcon = (p) => (
  <Svg {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Svg>
);
export const HeartIcon = ({ filled = false, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </Svg>
);
export const MenuIcon = (p) => (<Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>);
export const CloseIcon = (p) => (<Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>);
export const ChevronIcon = ({ direction = 'down', ...p }) => {
  const rotate = { down: 0, up: 180, left: 90, right: -90 }[direction];
  return (
    <Svg {...p} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
};
export const CheckIcon = (p) => (<Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>);
export const PlusIcon = (p) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>);
export const UserIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></Svg>
);
export const ImageIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="14" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
  </Svg>
);
export const AlertIcon = (p) => (
  <Svg {...p}><path d="M12 4 3 19.5h18L12 4Z" /><path d="M12 10v4.5M12 17.2v.1" /></Svg>
);
export const InfoIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8.2v.1" /></Svg>
);
export const StarIcon = ({ filled = false, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.8Z" />
  </Svg>
);
export const UploadIcon = (p) => (
  <Svg {...p}><path d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14" /></Svg>
);
export const SortIcon = ({ direction, ...p }) => (
  <Svg {...p}>
    <path d="m8 10 4-4 4 4" opacity={direction === 'desc' ? 0.3 : 1} />
    <path d="m8 14 4 4 4-4" opacity={direction === 'asc' ? 0.3 : 1} />
  </Svg>
);
