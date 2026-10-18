// Flat, shaded vector art inspired by the "In a Nutshell" look:
// deep space navy, saturated colour, no outlines, a dark shade on one side and a soft highlight.

export const PALETTE = ['#ef476f', '#ff5d8f', '#ff9f1c', '#ffd166', '#06d6a0', '#2ec4b6', '#4cc9f0', '#5a63f0', '#9b5de5', '#e76f51'];

const SH = 'fill="#000" fill-opacity=".2"';
const HI = 'fill="#fff" fill-opacity=".38"';
const CREAM = '#fff4e0';
const DARK = '#151640';

// Shade crescent on the lower-right of a circle.
function crescent(cx, cy, r, k = 1.3) {
  const a = (-50 * Math.PI) / 180;
  const b = (140 * Math.PI) / 180;
  const ax = cx + r * Math.cos(a), ay = cy + r * Math.sin(a);
  const bx = cx + r * Math.cos(b), by = cy + r * Math.sin(b);
  const R = r * k;
  return `M${ax.toFixed(2)} ${ay.toFixed(2)}A${r} ${r} 0 1 1 ${bx.toFixed(2)} ${by.toFixed(2)}A${R} ${R} 0 0 0 ${ax.toFixed(2)} ${ay.toFixed(2)}Z`;
}

function dnaPaths(c) {
  let a = '', b = '', rungs = '';
  for (let y = 4; y <= 44; y += 1) {
    const t = (Math.PI * (y - 4)) / 12;
    const xa = 24 - 8 * Math.cos(t), xb = 24 + 8 * Math.cos(t);
    a += (y === 4 ? 'M' : 'L') + xa.toFixed(2) + ' ' + y;
    b += (y === 4 ? 'M' : 'L') + xb.toFixed(2) + ' ' + y;
    if ((y - 6) % 4 === 0) rungs += `M${Math.min(xa, xb).toFixed(2)} ${y}H${Math.max(xa, xb).toFixed(2)}`;
  }
  return `<path d="${rungs}" stroke="${CREAM}" stroke-opacity=".8" stroke-width="2.4" stroke-linecap="round"/>
    <path d="${b}" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".65"/>
    <path d="${a}" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

const ICONS = {
  heart: (c) => `<path d="M24 42C11 33 5 25.5 5 17.5 5 11 9.8 6 16 6c3.7 0 6.6 1.8 8 4.6C25.4 7.8 28.3 6 32 6c6.2 0 11 5 11 11.5C43 25.5 37 33 24 42z" fill="${c}"/>
    <path d="M24 42c13-9 19-16.5 19-24.5C43 11 38.2 6 32 6c-3.7 0-6.6 1.8-8 4.6z" ${SH}/>
    <ellipse cx="14" cy="15" rx="4.5" ry="2.6" transform="rotate(-40 14 15)" ${HI}/>`,
  lungs: (c) => `<path d="M20 14C12 13 6 21 6 31c0 8 3 12 8 12 4 0 7-3 7-8V17c0-1.6-.4-3-1-3z" fill="${c}"/>
    <path d="M28 14c8-1 14 7 14 17 0 8-3 12-8 12-4 0-7-3-7-8V17c0-1.6.4-3 1-3z" fill="${c}"/>
    <path d="M28 14c8-1 14 7 14 17 0 8-3 12-8 12-4 0-7-3-7-8V17c0-1.6.4-3 1-3z" ${SH}/>
    <ellipse cx="12" cy="25" rx="2.4" ry="5" transform="rotate(18 12 25)" ${HI}/>
    <path d="M24 5v14m0 0l-5 5m5-5l5 5" stroke="${CREAM}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  brain: (c) => `<path d="M24 9c-2-3-6-4-9-2.5-3 1.4-4.5 4-4 7-3.6 1.5-5.5 5.5-4 9.5-2 3-1.5 7.5 1.5 10 1 4 5 6.5 9 5.5 2 2.5 5 3 6.5 1.5z" fill="${c}"/>
    <path d="M24 9c2-3 6-4 9-2.5 3 1.4 4.5 4 4 7 3.6 1.5 5.5 5.5 4 9.5 2 3 1.5 7.5-1.5 10-1 4-5 6.5-9 5.5-2 2.5-5 3-6.5 1.5z" fill="${c}"/>
    <path d="M24 9c2-3 6-4 9-2.5 3 1.4 4.5 4 4 7 3.6 1.5 5.5 5.5 4 9.5 2 3 1.5 7.5-1.5 10-1 4-5 6.5-9 5.5-2 2.5-5 3-6.5 1.5z" ${SH}/>
    <path d="M24 10v30M15 15c3 0 5 2 5 5M12 26c3-1 6 0 7 3M33 15c-3 0-5 2-5 5M36 26c-3-1-6 0-7 3M17 35c1-2 3-3 5-3M31 35c-1-2-3-3-5-3" stroke="#000" stroke-opacity=".25" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="14.5" cy="12.5" rx="3" ry="1.8" transform="rotate(-30 14.5 12.5)" ${HI}/>`,
  bone: () => `<g transform="rotate(-40 24 24)">
      <rect x="11" y="20" width="26" height="8" fill="${CREAM}"/>
      <circle cx="11" cy="19.5" r="5.2" fill="${CREAM}"/><circle cx="11" cy="28.5" r="5.2" fill="${CREAM}"/>
      <circle cx="37" cy="19.5" r="5.2" fill="${CREAM}"/><circle cx="37" cy="28.5" r="5.2" fill="${CREAM}"/>
      <path d="M6 29a5.2 5.2 0 0010.4 0V28h15.2v1a5.2 5.2 0 0010.4 0z" ${SH}/>
      <rect x="14" y="21.5" width="18" height="2" rx="1" ${HI}/></g>`,
  pill: (c) => `<g transform="rotate(45 24 24)">
      <rect x="17" y="6" width="14" height="36" rx="7" fill="${CREAM}"/>
      <path d="M17 24V13a7 7 0 0114 0v11z" fill="${c}"/>
      <path d="M24 6a7 7 0 017 7v22a7 7 0 01-7 7z" ${SH}/>
      <rect x="19.5" y="10" width="2.6" height="10" rx="1.3" ${HI}/></g>`,
  cell: (c) => `<circle cx="24" cy="24" r="19" fill="${c}"/>
    <circle cx="24" cy="24" r="15.5" fill="#fff" fill-opacity=".12"/>
    <circle cx="26" cy="25" r="7" fill="${DARK}" fill-opacity=".55"/>
    <circle cx="27.5" cy="23.5" r="2.4" fill="${c}"/>
    <circle cx="14" cy="28" r="2" fill="${CREAM}" fill-opacity=".7"/><circle cx="33" cy="14" r="1.6" fill="${CREAM}" fill-opacity=".7"/><circle cx="17" cy="15" r="1.3" fill="${CREAM}" fill-opacity=".7"/>
    <path d="${crescent(24, 24, 19)}" ${SH}/>
    <ellipse cx="15" cy="12" rx="4" ry="2.2" transform="rotate(-35 15 12)" ${HI}/>`,
  virus: (c) => {
    let spikes = '';
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2;
      const x1 = 24 + 13 * Math.cos(t), y1 = 24 + 13 * Math.sin(t);
      const x2 = 24 + 19 * Math.cos(t), y2 = 24 + 19 * Math.sin(t);
      spikes += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${c}" stroke-width="2.4"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.6" fill="${CREAM}"/>`;
    }
    return `${spikes}<circle cx="24" cy="24" r="14" fill="${c}"/>
      <circle cx="20" cy="22" r="2.2" fill="${DARK}" fill-opacity=".35"/><circle cx="28" cy="28" r="3" fill="${DARK}" fill-opacity=".35"/><circle cx="27" cy="18" r="1.6" fill="${DARK}" fill-opacity=".35"/>
      <path d="${crescent(24, 24, 14)}" ${SH}/><ellipse cx="18" cy="16" rx="3.2" ry="1.8" transform="rotate(-35 18 16)" ${HI}/>`;
  },
  bacteria: (c) => `<path d="M38 18c4-1 5 3 8 2M37 30c4 1 4 5 8 5M10 18c-4-1-5 3-8 2M11 30c-4 1-4 5-8 5" stroke="${CREAM}" stroke-opacity=".8" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="6" y="14" width="36" height="20" rx="10" fill="${c}"/>
    <path d="M6 24a10 10 0 0010 10h16a10 10 0 0010-10z" ${SH}/>
    <circle cx="17" cy="24" r="2.4" fill="${DARK}" fill-opacity=".35"/><circle cx="27" cy="21" r="2" fill="${DARK}" fill-opacity=".35"/><circle cx="32" cy="27" r="1.6" fill="${DARK}" fill-opacity=".35"/>
    <rect x="12" y="17" width="12" height="2.6" rx="1.3" ${HI}/>`,
  dna: (c) => dnaPaths(c),
  kidney: (c) => `<path d="M36 25c4 2 6 10 8 18" stroke="${CREAM}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M28 5c-9 0-16 8-16 19s7 19 16 19c6 0 10-4 10-9 0-3-2-5-4-7-1.4-1.3-1.4-3.5 0-4.8 2-2 4-4 4-7.2C38 9 34 5 28 5z" fill="${c}"/>
    <path d="M12 24c0 11 7 19 16 19 6 0 10-4 10-9 0-3-2-5-4-7z" ${SH}/>
    <ellipse cx="20" cy="13" rx="3.4" ry="2" transform="rotate(-40 20 13)" ${HI}/>`,
  stomach: (c) => `<path d="M17 3h7v9c0 3 2 4.5 5 4.5 8 0 14 6 14 13.5C43 39 35 45 25 45c-7 0-12-3-14-8-1-3 1-5.5 4-5.5 3 0 4.5 2.5 7.5 2.5 4 0 6.5-3 6.5-6s-2.6-5-6-5c-4 0-6-3-6-6.5z" fill="${c}"/>
    <path d="M43 30c0 9-8 15-18 15-7 0-12-3-14-8 6 3 12 4 18 2 7-2 11-6 14-9z" ${SH}/>
    <rect x="18.5" y="6" width="2.4" height="9" rx="1.2" ${HI}/>`,
  drop: (c) => `<path d="M24 5S10 21 10 30a14 14 0 0028 0C38 21 24 5 24 5z" fill="${c}"/>
    <path d="M24 5s14 16 14 25a14 14 0 01-14 14z" ${SH}/>
    <ellipse cx="18" cy="31" rx="2.4" ry="5" transform="rotate(15 18 31)" ${HI}/>`,
  baby: (c) => `<circle cx="24" cy="27" r="15" fill="#ffd8b5"/>
    <path d="M9 25a15 15 0 0130 0z" fill="${c}"/><circle cx="24" cy="10" r="3" fill="${c}"/>
    <path d="M17 29q2.5 2 5 0M26 29q2.5 2 5 0" stroke="${DARK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="15.5" cy="33" r="2.4" fill="#ff8fab" fill-opacity=".7"/><circle cx="32.5" cy="33" r="2.4" fill="#ff8fab" fill-opacity=".7"/>
    <path d="M21.5 36q2.5 2 5 0" stroke="${DARK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="${crescent(24, 27, 15, 1.5)}" fill="#000" fill-opacity=".12"/>`,
  womb: (c) => `<path d="M17 15c-4-5-8-6-11-3M31 15c4-5 8-6 11-3" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="7" cy="18" r="3.4" fill="${CREAM}"/><circle cx="41" cy="18" r="3.4" fill="${CREAM}"/>
    <path d="M14 13c0 10 4 15 7 17v9c0 2 1.3 3.5 3 3.5s3-1.5 3-3.5v-9c3-2 7-7 7-17 0-2-1-3-3-3H17c-2 0-3 1-3 3z" fill="${c}"/>
    <path d="M24 10h7c2 0 3 1 3 3 0 10-4 15-7 17v9c0 2-1.3 3.5-3 3.5z" ${SH}/>
    <ellipse cx="19" cy="15" rx="2.4" ry="1.5" ${HI}/>`,
  mind: (c) => `<path d="M30 43v-6c5-1 8-4.5 8-8l3.2-1.2c.8-.3 1-1.2.6-1.9L38 20c0-8.5-6.5-15-15-15S9 11.5 9 20.5c0 5.5 2.6 10 6.5 12.5V43z" fill="${c}"/>
    <path d="M38 20l3.8 5.9c.4.7.2 1.6-.6 1.9L38 29c0 3.5-3 7-8 8v6h-6V5c8.5 0 14 6.5 14 15z" ${SH}/>
    <path d="M23 19.5a2.5 2.5 0 1 1 2.5 2.5 5 5 0 1 1-5-5 7.5 7.5 0 1 1 7.5 7.5" stroke="${CREAM}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  scalpel: (c) => `<g transform="rotate(-40 24 24)">
      <rect x="3" y="21" width="24" height="6.5" rx="2.5" fill="${c}"/>
      <rect x="3" y="24.25" width="24" height="3.25" rx="1.6" ${SH}/>
      <path d="M27 21h9c4.5 0 8 2.5 9.5 5-3.5 2-9 2.5-18.5 1.5z" fill="#e8ecff"/>
      <path d="M27 24.5h18.2c.2.2.2.3.3.5-3.5 2-9 2.5-18.5 1.5z" fill="#000" fill-opacity=".12"/>
      <rect x="6" y="22.5" width="10" height="1.6" rx=".8" ${HI}/></g>`,
  siren: (c) => `<path d="M24 4v4M9 11l3 3M39 11l-3 3M4 24h4M44 24h-4" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>
    <path d="M13 34V24a11 11 0 0122 0v10z" fill="${c}"/>
    <path d="M24 13a11 11 0 0111 11v10H24z" ${SH}/>
    <rect x="17" y="18" width="3" height="10" rx="1.5" ${HI}/>
    <rect x="9" y="34" width="30" height="8" rx="3" fill="${CREAM}"/><rect x="9" y="38" width="30" height="4" rx="2" fill="#000" fill-opacity=".12"/>`,
  house: (c) => `<rect x="10" y="21" width="28" height="22" rx="2" fill="${CREAM}"/>
    <rect x="24" y="21" width="14" height="22" fill="#000" fill-opacity=".1"/>
    <path d="M4 24L24 6l20 18c1 1 .5 2.5-1 2.5-.6 0-1.1-.2-1.5-.6L24 10 6.5 25.9c-.4.4-.9.6-1.5.6-1.5 0-2-1.5-1-2.5z" fill="${c}"/>
    <path d="M22 26h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="${c}"/>`,
  book: (c) => `<rect x="9" y="5" width="30" height="38" rx="3" fill="${c}"/>
    <path d="M13 37h26v6H13a3 3 0 010-6z" fill="${CREAM}"/>
    <rect x="9" y="5" width="5" height="38" rx="2" ${SH}/>
    <path d="M28 5h6v14l-3-2.5-3 2.5z" fill="#ffd166"/>
    <rect x="17" y="12" width="8" height="2.4" rx="1.2" ${HI}/><rect x="17" y="17" width="12" height="2.4" rx="1.2" ${HI}/>`,
  stethoscope: (c) => `<path d="M13 6v10a9 9 0 0018 0V6" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M22 25v6a8 8 0 0016 0v-4" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="38" cy="23" r="6" fill="${CREAM}"/><circle cx="38" cy="23" r="3" fill="${c}"/>
    <circle cx="13" cy="5.5" r="2.6" fill="${CREAM}"/><circle cx="31" cy="5.5" r="2.6" fill="${CREAM}"/>`,
  clipboard: (c) => `<rect x="8" y="7" width="32" height="38" rx="4" fill="${c}"/>
    <rect x="24" y="7" width="16" height="38" rx="0" ${SH}/>
    <rect x="12" y="11" width="24" height="30" rx="2" fill="${CREAM}"/>
    <rect x="17" y="4" width="14" height="8" rx="3" fill="${DARK}"/>
    <path d="M17 26l5 5 9-10" stroke="#06d6a0" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  microscope: (c) => `<rect x="8" y="39" width="32" height="5" rx="2.5" fill="${c}"/>
    <path d="M31 39c6-4 7-12 2-18" stroke="${c}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <g transform="rotate(-28 22 18)"><rect x="17" y="4" width="9" height="24" rx="2.5" fill="${CREAM}"/><rect x="21.5" y="4" width="4.5" height="24" rx="0" fill="#000" fill-opacity=".12"/><rect x="15.5" y="2" width="12" height="4" rx="2" fill="${c}"/></g>
    <rect x="10" y="31" width="20" height="3.4" rx="1.7" fill="${CREAM}"/>`,
  pulse: (c) => `<rect x="4" y="9" width="40" height="30" rx="7" fill="${c}"/>
    <rect x="8" y="13" width="32" height="22" rx="4" fill="${DARK}" fill-opacity=".8"/>
    <path d="M10 25h7l3-7 4 13 3-9 2 3h9" stroke="${CREAM}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="4" y="33" width="40" height="6" rx="3" ${SH}/>`,
  flask: (c) => `<path d="M19 5h10v13l11 19c1.2 2.2-.3 5-2.8 5H10.8c-2.5 0-4-2.8-2.8-5L19 18z" fill="#fff" fill-opacity=".22"/>
    <path d="M13.5 29h21l5.5 8c1.2 2.2-.3 5-2.8 5H10.8c-2.5 0-4-2.8-2.8-5z" fill="${c}"/>
    <path d="M24 29h10.5l5.5 8c1.2 2.2-.3 5-2.8 5H24z" ${SH}/>
    <rect x="17" y="3" width="14" height="4" rx="2" fill="${CREAM}"/>
    <circle cx="20" cy="35" r="2" fill="${CREAM}" fill-opacity=".8"/><circle cx="26" cy="23" r="1.6" fill="${c}"/><circle cx="23" cy="16" r="1.2" fill="${c}"/>`,
  shield: (c) => `<path d="M24 4l17 6.5V22c0 10.5-7.4 17.6-17 22C14.4 39.6 7 32.5 7 22V10.5z" fill="${c}"/>
    <path d="M24 4l17 6.5V22c0 10.5-7.4 17.6-17 22z" ${SH}/>
    <path d="M21 15h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="${CREAM}"/>`,
  eye: (c) => `<path d="M3 24C9 14 16 10 24 10s15 4 21 14c-6 10-13 14-21 14S9 34 3 24z" fill="${CREAM}"/>
    <circle cx="24" cy="24" r="9" fill="${c}"/><circle cx="24" cy="24" r="4.4" fill="${DARK}"/>
    <path d="${crescent(24, 24, 9)}" ${SH}/><circle cx="21" cy="21" r="2" fill="#fff"/>`,
  star: (c) => `<path d="M24 4l5.9 12 13.1 1.9-9.5 9.3 2.2 13.1L24 34.1l-11.7 6.2 2.2-13.1L5 17.9 18.1 16z" fill="${c}"/>
    <path d="M24 4l5.9 12 13.1 1.9-9.5 9.3 2.2 13.1L24 34.1z" ${SH}/>`,
  folder: (c) => `<path d="M4 12a4 4 0 014-4h10l4 4h18a4 4 0 014 4v20a4 4 0 01-4 4H8a4 4 0 01-4-4z" fill="${c}"/>
    <path d="M4 20h40v16a4 4 0 01-4 4H8a4 4 0 01-4-4z" fill="#fff" fill-opacity=".18"/>
    <path d="M4 32h40v4a4 4 0 01-4 4H8a4 4 0 01-4-4z" ${SH}/>`,
};

export const ICON_NAMES = Object.keys(ICONS);

export function icon(name, color = '#ff9f1c', size = 48) {
  const fn = ICONS[name] || ICONS.folder;
  return `<svg class="ico" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">${fn(color)}</svg>`;
}

// Icon sitting on a little dark "planet" disc with a coloured glow ring.
export function planetIcon(name, color, size = 56) {
  return `<span class="planet" style="--c:${color};width:${size}px;height:${size}px">${icon(name, color, Math.round(size * 0.66))}</span>`;
}

// The app mascot: a round, cheerful cell.
export function mascot(mood = 'happy', size = 120, color = '#ff9f1c') {
  const mouths = {
    happy: '<path d="M40 60q10 10 20 0" stroke="#151640" stroke-width="3.6" fill="none" stroke-linecap="round"/>',
    joy: '<path d="M38 58q12 16 24 0z" fill="#151640"/><path d="M43 63q7 4 14 0" stroke="#ff5d8f" stroke-width="3" fill="none" stroke-linecap="round"/>',
    neutral: '<path d="M42 62h16" stroke="#151640" stroke-width="3.6" stroke-linecap="round"/>',
    sad: '<path d="M40 66q10-9 20 0" stroke="#151640" stroke-width="3.6" fill="none" stroke-linecap="round"/>',
    wow: '<ellipse cx="50" cy="63" rx="5" ry="6" fill="#151640"/>',
    think: '<path d="M44 63q6-3 12 1" stroke="#151640" stroke-width="3.6" fill="none" stroke-linecap="round"/>',
  };
  const lookUp = mood === 'think';
  const px = lookUp ? 2 : 0, py = lookUp ? -3 : 0;
  let bumps = '';
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2;
    bumps += `<circle cx="${(50 + 38 * Math.cos(t)).toFixed(1)}" cy="${(52 + 38 * Math.sin(t)).toFixed(1)}" r="4.5" fill="${color}"/>`;
  }
  return `<svg class="mascot mood-${mood}" viewBox="0 0 100 104" width="${size}" height="${size}" aria-hidden="true">
    <ellipse cx="50" cy="99" rx="26" ry="4" fill="#000" fill-opacity=".25"/>
    ${bumps}
    <circle cx="50" cy="52" r="38" fill="${color}"/>
    <path d="${crescent(50, 52, 38, 1.35)}" fill="#000" fill-opacity=".16"/>
    <circle cx="70" cy="72" r="5" fill="#000" fill-opacity=".1"/><circle cx="28" cy="70" r="3" fill="#fff" fill-opacity=".18"/>
    <ellipse cx="33" cy="32" rx="9" ry="5" transform="rotate(-35 33 32)" fill="#fff" fill-opacity=".4"/>
    <ellipse cx="38" cy="47" rx="8" ry="9.5" fill="#fff"/><ellipse cx="62" cy="47" rx="8" ry="9.5" fill="#fff"/>
    <circle cx="${39 + px}" cy="${49 + py}" r="4.6" fill="#151640"/><circle cx="${63 + px}" cy="${49 + py}" r="4.6" fill="#151640"/>
    <circle cx="${41 + px}" cy="${47 + py}" r="1.6" fill="#fff"/><circle cx="${65 + px}" cy="${47 + py}" r="1.6" fill="#fff"/>
    ${mood === 'sad' ? '<path d="M30 40l12-4M70 40l-12-4" stroke="#151640" stroke-width="3" stroke-linecap="round"/>' : ''}
    <circle cx="27" cy="60" r="5" fill="#ff5d8f" fill-opacity=".55"/><circle cx="73" cy="60" r="5" fill="#ff5d8f" fill-opacity=".55"/>
    ${mouths[mood] || mouths.happy}
  </svg>`;
}

// Home screen scene: mascot floating in space beside a big cell-planet.
export function heroScene() {
  return `<svg class="hero-art" viewBox="0 0 360 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9b5de5" stop-opacity=".55"/><stop offset="1" stop-color="#9b5de5" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="300" cy="150" r="130" fill="url(#glow)"/>
    <g class="float-slow">
      <circle cx="300" cy="168" r="92" fill="#5a63f0"/>
      <circle cx="300" cy="168" r="78" fill="#fff" fill-opacity=".08"/>
      <circle cx="318" cy="150" r="30" fill="#151640" fill-opacity=".45"/>
      <circle cx="324" cy="144" r="10" fill="#9b5de5"/>
      <circle cx="252" cy="118" r="7" fill="#4cc9f0" fill-opacity=".8"/><circle cx="270" cy="200" r="9" fill="#ff5d8f" fill-opacity=".7"/><circle cx="350" cy="110" r="5" fill="#ffd166" fill-opacity=".8"/>
      <path d="${crescent(300, 168, 92, 1.25)}" fill="#000" fill-opacity=".22"/>
      <ellipse cx="258" cy="96" rx="20" ry="9" transform="rotate(-35 258 96)" fill="#fff" fill-opacity=".22"/>
    </g>
    <g class="float-a"><g transform="translate(160 92) rotate(30)">
      <rect x="-9" y="-22" width="18" height="44" rx="9" fill="#fff4e0"/><path d="M-9 0v-13a9 9 0 0118 0V0z" fill="#ef476f"/><path d="M0-22a9 9 0 019 9v26a9 9 0 01-9 9z" fill="#000" fill-opacity=".18"/>
    </g></g>
    <g class="float-b"><g transform="translate(206 26) scale(.6)">${ICONS.virus('#06d6a0')}</g></g>
    <g class="float-c"><g transform="translate(18 120) scale(.75)">${ICONS.heart('#ff5d8f')}</g></g>
    <g class="float-a"><g transform="translate(46 8) scale(1.15)">${mascotInner()}</g></g>
    <circle cx="120" cy="30" r="2" fill="#fff"/><circle cx="240" cy="70" r="1.5" fill="#fff"/><circle cx="20" cy="40" r="1.3" fill="#fff"/><circle cx="180" cy="160" r="1.6" fill="#fff"/><circle cx="110" cy="170" r="1.2" fill="#fff" fill-opacity=".7"/>
  </svg>`;
}

function mascotInner() {
  // Strip the outer <svg> so the mascot can be nested in a scene.
  return mascot('happy', 100).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

// Starfield behind everything. Deterministic so it does not jump between loads.
export function starfield() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let s = '';
  for (let i = 0; i < 90; i++) {
    const x = (rnd() * 400).toFixed(1), y = (rnd() * 900).toFixed(1);
    const r = (rnd() * 1.3 + 0.3).toFixed(2), o = (rnd() * 0.6 + 0.25).toFixed(2);
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity="${o}"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const x = (rnd() * 400).toFixed(0), y = (rnd() * 900).toFixed(0);
    s += `<path d="M${x} ${y - 5}v10M${x - 5} ${y}h10" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">${s}</svg>`;
}

// Score ring for results / exam cards.
export function ring(pct, size = 64, stroke = 7) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const col = pct == null ? '#5a63f0' : p >= 75 ? '#06d6a0' : p >= 50 ? '#ffd166' : '#ef476f';
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="#fff" stroke-opacity=".1" stroke-width="${stroke}" fill="none"/>
    ${pct == null ? '' : `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${col}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
      stroke-dasharray="${((c * p) / 100).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`}
    <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-size="${size * 0.26}" font-weight="800" fill="#fff">${pct == null ? '–' : Math.round(p) + '%'}</text>
  </svg>`;
}
