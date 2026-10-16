/** Small neon illustrations for the how-to-play screen, drawn as inline SVG (no image files, always crisp). */

const INK = '#00f0ff';
const DIM = '#2a7f88';
const AMBER = '#ffb000';
const GOOD = '#7dff6b';
const BAD = '#ff3b3b';
const MAG = '#ff2bd6';

const ship = (x: number, y: number, rot: number, col = INK, s = 1): string =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M10 0 L-7 -6 L-4 0 L-7 6 Z" fill="rgba(0,240,255,.12)" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/></g>`;
const ring = (x: number, y: number, col = AMBER): string => `<ellipse cx="${x}" cy="${y}" rx="5" ry="13" fill="none" stroke="${col}" stroke-width="1.6"/>`;
const planet = (x: number, y: number, r: number, col = MAG): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(255,43,214,.14)" stroke="${col}" stroke-width="1.5"/>`;
const arrow = (x1: number, y1: number, x2: number, y2: number, col: string, dash = ''): string => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = (d: number): string => (x2 - 7 * Math.cos(a + d)).toFixed(1);
  const hy = (d: number): string => (y2 - 7 * Math.sin(a + d)).toFixed(1);
  return `<path d="M${x1} ${y1} L${x2} ${y2} M${hx(0.45)} ${hy(0.45)} L${x2} ${y2} L${hx(-0.45)} ${hy(-0.45)}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
};
const label = (x: number, y: number, t: string, col = INK, size = 9, anchor = 'middle'): string =>
  `<text x="${x}" y="${y}" fill="${col}" font-size="${size}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing=".5">${t}</text>`;
const ground = (y: number): string => `<path d="M4 ${y} H156" stroke="${DIM}" stroke-width="1.5"/>`;

const ART: Record<string, string> = {
  Objetivo:
    `<path d="M24 78 Q50 52 72 44 T118 40" fill="none" stroke="${DIM}" stroke-width="1.2" stroke-dasharray="3 4"/>` +
    ring(72, 44) + ring(118, 40) + ground(90) +
    `<path d="M126 90 H152" stroke="${GOOD}" stroke-width="3"/>` + label(139, 83, 'META', GOOD, 8) +
    ship(22, 80, -35) + ship(34, 86, -30, BAD, 0.8) + label(34, 99, 'RIVAL', BAD, 7),
  Gravedad:
    planet(80, 50, 15) + arrow(80, 10, 80, 30, AMBER) + arrow(20, 50, 58, 50, AMBER) + arrow(140, 50, 102, 50, AMBER) + arrow(80, 92, 80, 72, AMBER) +
    `<path d="M104 24 Q124 20 138 30" fill="none" stroke="${DIM}" stroke-width="1.2" stroke-dasharray="3 3"/>` + arrow(130, 24, 140, 31, DIM) +
    label(80, 99, 'todo cae hacia ellos', DIM, 8),
  Controles:
    `<circle cx="42" cy="72" r="9" fill="rgba(0,240,255,.18)" stroke="${INK}" stroke-width="1.5"/><circle cx="42" cy="72" r="3" fill="${INK}"/>` +
    arrow(46, 66, 104, 30, AMBER, '4 4') + ship(124, 20, -32) + label(80, 95, 'arrastrá para ir', DIM, 8),
  Aterrizar:
    ground(86) + `<path d="M54 86 H108" stroke="${AMBER}" stroke-width="4"/><path d="M60 82 L66 86 M74 82 L80 86 M88 82 L94 86 M102 82 L108 86" stroke="${AMBER}" stroke-width="1.2"/>` +
    ship(81, 52, 90) + arrow(81, 66, 81, 78, GOOD) + label(120, 48, '&lt; 60 u/s', AMBER, 9) + label(34, 48, 'derecha', GOOD, 8) + label(81, 99, 'estación: repara', DIM, 8),
  Vidas:
    `<text x="80" y="52" font-size="28" text-anchor="middle" fill="${BAD}" font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="6">♥♥♥</text>` +
    label(80, 76, '3 por etapa', AMBER, 9) + label(80, 92, 'sin vidas = etapa perdida', DIM, 8),
  Datos:
    `<g stroke="${BAD}" stroke-width="2" stroke-linecap="round"><path d="M28 42 L48 62 M48 42 L28 62"/></g>` + label(38, 78, 'explotás', BAD, 8) +
    arrow(54, 52, 94, 52, DIM, '3 4') + `<path d="M118 36 L132 52 L118 68 L104 52 Z" fill="rgba(255,176,0,.16)" stroke="${AMBER}" stroke-width="1.8"/>` +
    label(112, 82, 'baliza', AMBER, 8) + label(80, 98, 'recuperás tus datos', DIM, 8),
  'Honda gravitatoria':
    planet(88, 56, 14) + arrow(88, 36, 112, 36, DIM) +
    `<path d="M10 90 Q60 18 120 38 T152 16" fill="none" stroke="${GOOD}" stroke-width="1.6" stroke-dasharray="4 3"/>` + ship(46, 56, -48) +
    label(128, 78, '+ velocidad', GOOD, 8) + label(80, 99, 'pasá por detrás', DIM, 8),
  'Guías de carrera':
    `<path d="M10 82 H64" stroke="${GOOD}" stroke-width="2" stroke-dasharray="4 4"/>` +
    `<path d="M64 82 Q112 82 112 44" fill="none" stroke="${AMBER}" stroke-width="2" stroke-dasharray="4 4"/>` +
    `<path d="M112 44 V12" stroke="${GOOD}" stroke-width="2" stroke-dasharray="4 4"/>` + planet(138, 56, 11) +
    label(36, 74, 'recta', GOOD, 8) + label(86, 66, 'giro', AMBER, 8) + label(80, 98, 'verde recta · ámbar giro', DIM, 8),
  'Gran Premio':
    `<path d="M30 88 V66 H58 V88 M58 88 V50 H100 V88 M100 88 V74 H128 V88" fill="rgba(0,240,255,.10)" stroke="${INK}" stroke-width="1.5"/>` +
    label(44, 80, '2', INK, 11) + label(79, 74, '1', AMBER, 14) + label(114, 84, '3', INK, 11) +
    ship(44, 54, -90, INK, 0.9) + ship(79, 38, -90, AMBER, 1) + ship(114, 62, -90, INK, 0.9) + label(80, 99, 'top 3 = ganás', DIM, 8),
  Equipo:
    [26, 62, 98].map((x) => `<rect x="${x}" y="30" width="30" height="30" fill="rgba(0,240,255,.12)" stroke="${INK}" stroke-width="1.6"/>`).join('') +
    `<rect x="134" y="30" width="22" height="30" fill="none" stroke="${DIM}" stroke-width="1.4" stroke-dasharray="3 3"/>` +
    label(41, 50, '■', INK, 14) + label(77, 50, '■', INK, 14) + label(113, 50, '■', INK, 14) + label(145, 50, '✕', BAD, 12) +
    label(77, 80, '3 ranuras', AMBER, 9) + label(80, 96, 'elegí según el peligro', DIM, 8),
  'Etapas distintas':
    `<rect x="14" y="26" width="38" height="34" fill="none" stroke="${INK}" stroke-width="1.5"/>` + `<path d="M20 52 H46" stroke="${AMBER}" stroke-width="3"/>` + ship(33, 38, 90, INK, 0.7) +
    `<rect x="61" y="26" width="38" height="34" fill="none" stroke="${INK}" stroke-width="1.5"/>` + `<rect x="70" y="36" width="20" height="14" fill="none" stroke="${AMBER}" stroke-width="1.6"/>` +
    `<rect x="108" y="26" width="38" height="34" fill="none" stroke="${INK}" stroke-width="1.5"/>` + `<path d="M118 52 H136" stroke="${DIM}" stroke-width="2"/><path d="M118 52 H126" stroke="${BAD}" stroke-width="2"/>` +
    label(33, 76, 'escala', AMBER, 8) + label(80, 76, 'carga', AMBER, 8) + label(127, 76, 'tanque', AMBER, 8),
  Cápsulas:
    `<rect x="40" y="30" width="34" height="34" rx="6" fill="rgba(255,176,0,.14)" stroke="${AMBER}" stroke-width="1.8"/>` + label(57, 51, '▮', AMBER, 18) +
    `<rect x="86" y="30" width="34" height="34" rx="6" fill="rgba(125,255,107,.14)" stroke="${GOOD}" stroke-width="1.8"/>` + label(103, 52, '+', GOOD, 22) +
    label(52, 78, 'tanque', AMBER, 8) + label(108, 78, 'casco', GOOD, 8) + label(80, 96, 'botón CÁP', DIM, 8),
  Rival:
    ship(40, 46, 0, INK, 1.4) + ship(104, 46, 180, BAD, 1.4) +
    `<path d="M62 40 L72 50 M72 40 L62 50 M67 34 V56 M56 45 H78" stroke="${AMBER}" stroke-width="1.4" stroke-linecap="round" transform="translate(5 -2)"/>` +
    label(80, 80, 'FÁCIL·NORMAL·DIFÍCIL', AMBER, 8) + label(80, 96, 'se pueden chocar', DIM, 8),
  Práctica:
    ship(50, 44, -20) + ring(92, 38) + ring(124, 48) +
    `<rect x="46" y="70" width="68" height="16" fill="none" stroke="${GOOD}" stroke-width="1.4"/>` + label(80, 82, 'SIN VIDAS', GOOD, 8),
};

/** An inline SVG for a help section, or null if the title has no illustration. */
export function helpArt(title: string): HTMLElement | null {
  const body = ART[title];
  if (!body) return null;
  const fig = document.createElement('div');
  fig.className = 'helpfig';
  fig.setAttribute('aria-hidden', 'true');
  fig.innerHTML = `<svg viewBox="0 0 160 104" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;
  return fig;
}
