// Placeholder artwork for the MOCK data source only.
// Draws simple flat-lay garments as inline SVG data URIs, so the storefront looks right with
// no network and no image licences. The Supabase adapter (Step 12) returns real photo URLs
// in the same `images: string[]` shape, so nothing outside services/mock depends on this file.

const INK = '#2D1F1A';
const CREAM = '#FAF6F2';

const mix = (a, b, t) => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const toUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

let uid = 0;

const PATTERNS = {
  stripe: (id, a) => `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="5" height="16" fill="${a}" opacity=".75"/></pattern>`,
  dots: (id, a) => `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="3.2" fill="${a}"/></pattern>`,
  check: (id, a) => `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${a}" opacity=".45"/><rect x="12" y="12" width="12" height="12" fill="${a}" opacity=".45"/></pattern>`,
  rib: (id, a) => `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="2" height="8" fill="${a}" opacity=".16"/></pattern>`,
};

// The garment body: a filled path, plus an optional fabric pattern laid over it.
function fabric(d, { color, pattern, accent }) {
  const id = `f${++uid}`;
  const a = accent ?? (pattern === 'rib' ? INK : CREAM);
  return (
    (pattern ? `<defs>${PATTERNS[pattern](id, a)}</defs>` : '') +
    `<path d="${d}" fill="${color}" stroke="${mix(color, INK, 0.55)}" stroke-width="2" stroke-linejoin="round"/>` +
    (pattern ? `<path d="${d}" fill="url(#${id})"/>` : '')
  );
}

const stitch = (d, c, dash = true) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${dash ? ' stroke-dasharray="4 4"' : ''} opacity=".8"/>`;
const button = (x, y, c) =>
  `<circle cx="${x}" cy="${y}" r="4.5" fill="${mix(c, CREAM, 0.4)}" stroke="${mix(c, INK, 0.6)}" stroke-width="1.5"/>`;
const trim = (d, c) => `<path d="${d}" fill="${mix(c, INK, 0.14)}" stroke="${mix(c, INK, 0.55)}" stroke-width="2" stroke-linejoin="round"/>`;

// Every garment is drawn inside a 400 x 500 box.
const GARMENTS = {
  jacket(p) {
    const ink = mix(p.color, INK, 0.55);
    return (
      fabric('M130 118 L168 104 L200 128 L232 104 L270 118 L338 186 L346 336 L304 342 L296 236 L292 402 L108 402 L104 236 L96 342 L54 336 L62 186 Z', p) +
      trim('M168 104 L200 128 L232 104 L246 120 L200 160 L154 120 Z', p.color) +
      stitch('M200 160 V402', ink, false) +
      stitch('M138 214 H182 V260 H138 Z', ink) + stitch('M218 214 H262 V260 H218 Z', ink) +
      [190, 280, 330, 380].map((y) => button(200, y, p.color)).join('') +
      stitch('M114 388 H286', ink) + stitch('M58 322 L98 328', ink) + stitch('M342 322 L302 328', ink)
    );
  },
  cardigan(p) {
    const ink = mix(p.color, INK, 0.55);
    return (
      fabric('M140 112 L178 104 L200 168 L222 104 L260 112 L332 182 L342 334 L302 340 L294 232 L292 408 L108 408 L106 232 L98 340 L58 334 L68 182 Z', { ...p, pattern: p.pattern ?? 'rib' }) +
      `<path d="M178 104 L200 168 L222 104" fill="none" stroke="${ink}" stroke-width="6" stroke-linejoin="round" opacity=".55"/>` +
      stitch('M200 168 V408', ink, false) +
      [200, 245, 290, 335, 380].map((y) => button(200, y, p.color)).join('') +
      stitch('M110 390 H290', ink, false)
    );
  },
  sweater(p) {
    const ink = mix(p.color, INK, 0.55);
    return (
      fabric('M138 112 Q200 152 262 112 L334 184 L344 336 L304 342 L296 238 L292 410 L108 410 L104 238 L96 342 L56 336 L66 184 Z', { ...p, pattern: p.pattern ?? 'rib' }) +
      `<path d="M138 112 Q200 152 262 112" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" opacity=".55"/>` +
      stitch('M110 392 H290', ink, false) + stitch('M58 324 L98 330', ink, false) + stitch('M342 324 L302 330', ink, false)
    );
  },
  shirt(p) {
    const ink = mix(p.color, INK, 0.55);
    return (
      fabric('M134 112 L170 100 L200 122 L230 100 L266 112 L336 164 L308 220 L276 192 L276 412 L124 412 L124 192 L92 220 L64 164 Z', p) +
      trim('M170 100 L200 148 L230 100 L246 116 L200 164 L154 116 Z', p.color) +
      stitch('M200 164 V412', ink, false) +
      [192, 238, 284, 330, 376].map((y) => button(200, y, p.color)).join('') +
      stitch('M138 214 H176 V252 H138 Z', ink) + stitch('M128 398 H272', ink)
    );
  },
  dress(p) {
    const ink = mix(p.color, INK, 0.55);
    return (
      fabric('M168 92 L184 92 L200 130 L216 92 L232 92 L246 150 L240 232 L314 448 L86 448 L160 232 L154 150 Z', p) +
      `<path d="M158 226 H242 V244 H158 Z" fill="${mix(p.color, INK, 0.3)}" stroke="${ink}" stroke-width="2"/>` +
      stitch('M178 248 L152 442', ink) + stitch('M222 248 L248 442', ink) + stitch('M92 434 H308', ink)
    );
  },
  skirt(p) {
    const ink = mix(p.color, INK, 0.55);
    const pleats = Array.from({ length: 9 }, (_, i) => {
      const n = i + 1;
      return stitch(`M${142 + n * 11.6} 136 L${78 + n * 24.4} 440`, ink, false);
    }).join('');
    return (
      fabric('M142 112 H258 V136 L322 440 H78 L142 136 Z', p) +
      `<path d="M142 112 H258 V136 H142 Z" fill="${mix(p.color, INK, 0.18)}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>` +
      `<g opacity=".55">${pleats}</g>` + button(152, 124, p.color)
    );
  },
  trousers(p) {
    const ink = mix(p.color, INK, 0.55);
    return (
      fabric('M142 100 H258 L262 130 L318 446 L218 446 L200 236 L182 446 L82 446 L138 130 Z', p) +
      `<path d="M140 100 H260 V128 H140 Z" fill="${mix(p.color, INK, 0.18)}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>` +
      stitch('M200 128 V212', ink, false) + button(200, 114, p.color) +
      stitch('M146 132 Q168 170 176 198', ink, false) + stitch('M254 132 Q232 170 224 198', ink, false) +
      stitch('M150 240 L130 438', ink) + stitch('M250 240 L270 438', ink) +
      stitch('M88 432 H178', ink) + stitch('M222 432 H312', ink)
    );
  },
  bag(p) {
    const ink = mix(p.color, INK, 0.55);
    return (
      `<path d="M136 236 C136 100 264 100 264 236" fill="none" stroke="${mix(p.color, INK, 0.25)}" stroke-width="11" stroke-linecap="round"/>` +
      fabric('M104 236 H296 L308 408 H92 Z', p) +
      `<path d="M104 236 H296 L288 306 Q200 334 112 306 Z" fill="${mix(p.color, INK, 0.12)}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="200" cy="318" r="7" fill="#C9B08A" stroke="${ink}" stroke-width="1.5"/>` +
      stitch('M112 394 H288', ink)
    );
  },
};

const BACKGROUNDS = ['#E8D8CF', '#EBCFC5', '#DFCBBD', '#F0E4DA', '#E2CFC4'];

/** Portrait product photo stand-in (4:5). */
export function garmentImage({ kind, color, pattern, accent, bg = BACKGROUNDS[0] }) {
  const inner = GARMENTS[kind]({ color, pattern, accent });
  return toUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">` +
      `<rect width="400" height="500" fill="${bg}"/>` +
      `<g transform="translate(200 262) scale(.84) translate(-200 -274)">${inner}</g></svg>`
  );
}

/** Close-up of the sewn-in label: the "second photo" shown on card hover. */
export function labelImage({ brand, size, color, bg }) {
  const cloth = mix(color, INK, 0.12);
  return toUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">` +
      `<defs><pattern id="w" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6" stroke="${INK}" stroke-width=".6" opacity=".12"/></pattern></defs>` +
      `<rect width="400" height="500" fill="${cloth}"/><rect width="400" height="500" fill="url(#w)"/>` +
      `<g transform="rotate(-4 200 250)">` +
      `<rect x="82" y="186" width="236" height="128" fill="${bg ?? CREAM}" stroke="${INK}" stroke-width="1.5"/>` +
      `<rect x="92" y="196" width="216" height="108" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="3 4" opacity=".6"/>` +
      `<text x="200" y="244" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="25" fill="${INK}">${esc(brand)}</text>` +
      `<text x="200" y="278" text-anchor="middle" font-family="Georgia,serif" font-size="14" letter-spacing="3" fill="${INK}" opacity=".75">SIZE ${esc(size)}</text>` +
      `</g></svg>`
  );
}

/** Landscape editorial cover: garments hanging from a rail (4:3). */
export function coverArt({ items, bg = BACKGROUNDS[0] }) {
  const hung = items
    .map(({ kind, color, pattern, accent, cx, s = 1 }) => {
      const tx = cx - 200 * s;
      const ty = 160 - 100 * s;
      return (
        `<path d="M${cx} 100 V160" stroke="${INK}" stroke-width="2"/>` +
        `<g transform="translate(${tx} ${ty}) scale(${s})">${GARMENTS[kind]({ color, pattern, accent })}</g>`
      );
    })
    .join('');
  return toUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">` +
      `<rect width="800" height="600" fill="${bg}"/>` +
      `<path d="M30 100 H770" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
      hung +
      `</svg>`
  );
}

export { BACKGROUNDS };
