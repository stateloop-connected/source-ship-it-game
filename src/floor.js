import { STATIONS, CONTRACTS, GRID } from './data.js';
import { stationSpeed } from './engine.js';

export const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const point = (x, y) => [375 + (x - y) * 65, 105 + (x + y) * 30];
const path = (x, y) => `${x},${y - 28} ${x + 61},${y} ${x},${y + 28} ${x - 61},${y}`;
const cube = (x, y, h, color, width = 46, depth = 21) =>
  `<path d="M${x - width} ${y - h}l${width} ${-depth} ${width} ${depth}-${width} ${depth}z" fill="${color}"/><path d="M${x - width} ${y - h}l${width} ${depth}v${h}l-${width}-${depth}z" fill="${color}" filter="url(#shade)"/><path d="M${x} ${y - h + depth}l${width}-${depth}v${h}l-${width} ${depth}z" fill="${color}" filter="url(#darken)"/>`;
function plant(x, y) {
  return `<ellipse cx="${x}" cy="${y + 5}" rx="15" ry="7" fill="#07121c" opacity=".3"/>${cube(x, y, 12, '#b07857', 10, 5)}<path d="M${x} ${y - 8}q-30-30-9-28q17 4 9 28q21-40 29-26q3 13-29 26q-8-48 5-43q12 5-5 43" fill="#6da680"/><path d="M${x} ${y - 8}v-26" stroke="#badca3" stroke-width="2"/>`;
}
function worker(x, y, type, busy) {
  if (type === 'agent')
    return `<g class="${busy ? 'worker active' : 'worker'}"><ellipse cx="${x}" cy="${y + 9}" rx="10" ry="5" fill="#08121d" opacity=".3"/><rect x="${x - 9}" y="${y - 15}" width="18" height="22" rx="6" fill="#9daec3"/><rect x="${x - 7}" y="${y - 12}" width="14" height="9" rx="3" fill="#1b3745"/><path d="M${x - 3} ${y - 9}v3m6-3v3" stroke="#b8f27c" stroke-width="2"/><path d="M${x} ${y - 16}v-5" stroke="#9daec3" stroke-width="2"/><circle cx="${x}" cy="${y - 22}" r="2" fill="#b8f27c"/></g>`;
  return `<g class="${busy ? 'worker active' : 'worker'}"><ellipse cx="${x}" cy="${y + 9}" rx="10" ry="5" fill="#08121d" opacity=".3"/><path d="M${x - 5} ${y + 1}v8m10-8v8" stroke="#152438" stroke-width="5"/><path d="M${x - 8} ${y + 1}v-12q8-7 16 0v12z" fill="${type === 'specialist' ? '#f4d399' : '#9fafe0'}"/><circle cx="${x}" cy="${y - 18}" r="7" fill="#e9b18d"/><path d="M${x - 7} ${y - 18}q-2-11 8-8q8 2 6 10l-3-6-11 4" fill="#3a2a33"/></g>`;
}
function machine(st, s, selected) {
  const [x, y] = point(st.x, st.y);
  const d = STATIONS[st.type];
  const w = s.workers.find((w) => w.id === st.worker);
  const job = s.jobs.find((j) => j.id === st.busy);
  const running = job && stationSpeed(s, st) > 0;
  const title = `${d.name}, level ${st.level}, ${w ? w.name : 'unassigned'}, ${job ? CONTRACTS[job.template].name : st.maintenance ? 'maintenance' : 'idle'}`;
  let top = '';
  if (st.type === 'spec')
    top = `${cube(x - 8, y - 40, 2, '#d7dbe8', 19, 9)}<path d="M${x - 19} ${y - 45}l18 8m-12-13 18 8" stroke="#8c7cab" stroke-width="2"/>${cube(x + 20, y - 50, 20, '#a191bd', 13, 6)}<path d="M${x + 12} ${y - 66}l12 6m-12 0 8 4" stroke="#e7e0ff" stroke-width="2"/>`;
  if (st.type === 'build')
    top = `${cube(x, y - 46, 25, '#3c536c', 24, 11)}<path d="M${x - 20} ${y - 69}l36 17v18l-36-17z" fill="#0c222e"/><path d="M${x - 14} ${y - 61}l9 4m-9 2 20 9m-14 0 18 8" stroke="${d.color}" stroke-width="2"/><circle cx="${x + 26}" cy="${y - 42}" r="3" fill="#b8f27c" class="${running ? 'blink' : ''}"/>`;
  if (st.type === 'review')
    top = `${cube(x, y - 44, 20, '#d6b078', 27, 12)}<path d="M${x - 25} ${y - 62}l49 22v13l-49-22z" fill="#493d38"/><path d="M${x - 15} ${y - 52}l9 9 14-5" fill="none" stroke="#b8f27c" stroke-width="3"/>${cube(x + 21, y - 42, 6, '#f5e5c8', 9, 4)}`;
  if (st.type === 'ship')
    top = `${cube(x - 12, y - 43, 22, '#a1bc7e', 20, 9)}<path d="M${x - 12} ${y - 74}v22l20 9" fill="none" stroke="#d4e9b9" stroke-width="5"/>${cube(x + 23, y - 37, 13, '#d0aa75', 13, 6)}<path d="M${x + 23} ${y - 56}v13" stroke="#f6d896" stroke-width="4"/>`;
  return `<g class="station ${selected ? 'selected' : ''} ${running ? 'running' : ''}" data-action="station" data-id="${st.id}" data-focus="${st.id}" role="button" tabindex="0" aria-label="${esc(title)}"><title>${esc(title)}</title><polygon class="station-ring" points="${path(x, y)}" fill="${d.color}" fill-opacity="${selected ? '.22' : '.06'}" stroke="${selected ? d.color : '#506475'}" stroke-width="${selected ? 2 : 1}"/><ellipse cx="${x}" cy="${y + 10}" rx="49" ry="24" fill="#09121b" opacity=".3"/>${cube(x, y, 37, '#506174')}${cube(x, y - 35, 5, d.color)}${top}<path d="M${x - 39} ${y - 15}l23 11" stroke="${d.color}" stroke-width="3"/>${w ? worker(x + 40, y + 18, w.type, running) : `<circle cx="${x + 35}" cy="${y + 15}" r="9" fill="#e5ac68"/><text x="${x + 35}" y="${y + 19}" text-anchor="middle" font-size="12" fill="#152336">!</text>`}<g transform="translate(${x - 34} ${y + 39})"><rect width="68" height="19" rx="4" fill="#15232e"/><text x="34" y="13" fill="${d.color}" text-anchor="middle" font-size="9" font-weight="700" letter-spacing="1">${d.label} ${'·'.repeat(st.level)}</text></g>${st.maintenance ? `<text x="${x}" y="${y - 84}" text-anchor="middle" fill="#ffc974" font-size="12">MAINTENANCE ${st.maintenance}h</text>` : job ? `<g transform="translate(${x - 33} ${y - 90})"><rect width="66" height="20" rx="10" fill="${d.color}"/><text x="33" y="13" text-anchor="middle" fill="#12212d" font-size="9" font-weight="700">${job.readyAt > s.clock ? 'IN TRANSIT' : 'WORKING'}</text></g>` : ''}</g>`;
}
export function renderFloor(s, selected, mode, speed = 1) {
  let tiles = '';
  for (let y = 0; y < GRID.rows; y++)
    for (let x = 0; x < GRID.cols; x++) {
      const [px, py] = point(x, y);
      const occupied = s.stations.some((st) => st.x === x && st.y === y);
      tiles += `<g ${!occupied && mode ? `class="floor-tile placement" data-action="tile" data-x="${x}" data-y="${y}" data-focus="tile-${x}-${y}" role="button" tabindex="0" aria-label="Empty floor tile column ${x + 1}, row ${y + 1}"` : ''}><polygon points="${path(px, py)}" fill="${(x + y) % 2 ? '#283e4e' : '#2b4253'}" stroke="#3c5362" stroke-width=".6"/>${!occupied && mode ? `<text x="${px}" y="${py + 5}" text-anchor="middle" fill="#b8f27c" font-size="22">+</text>` : ''}</g>`;
    }
  let routes = '';
  for (let i = 0; i < 3; i++) {
    const types = ['spec', 'build', 'review', 'ship'];
    for (const from of s.stations.filter((st) => st.type === types[i])) {
      const to = s.stations
        .filter((st) => st.type === types[i + 1])
        .sort(
          (a, b) =>
            Math.abs(a.x - from.x) +
            Math.abs(a.y - from.y) -
            Math.abs(b.x - from.x) -
            Math.abs(b.y - from.y),
        )[0];
      if (!to) continue;
      const [x1, y1] = point(from.x, from.y);
      const [xm, ym] = point(to.x, from.y);
      const [x2, y2] = point(to.x, to.y);
      const d = `M${x1} ${y1}L${xm} ${ym}L${x2} ${y2}`;
      routes += `<path d="${d}" stroke="#122635" stroke-width="13" fill="none"/><path d="${d}" stroke="#6b7b75" stroke-width="8" stroke-dasharray="2 5" fill="none" class="conveyor"/><path d="${d}" stroke="${STATIONS[types[i]].color}" stroke-width="2" stroke-dasharray="3 18" fill="none" opacity=".7" class="flow"/>`;
    }
  }
  let packages = '';
  for (const st of s.stations) {
    const job = s.jobs.find((j) => j.id === st.busy && j.readyAt > s.clock);
    if (!job) continue;
    const [x0, y0] = job.lastCell;
    const distance = Math.abs(x0 - st.x) + Math.abs(y0 - st.y);
    const duration = Math.max(1, Math.ceil(distance / 3));
    const progress = Math.max(0, 1 - (job.readyAt - s.clock) / duration);
    const position = (fraction) => {
      const along = Math.min(distance, fraction * distance);
      const horizontal = Math.min(Math.abs(st.x - x0), along);
      return point(
        x0 + Math.sign(st.x - x0) * horizontal,
        y0 + Math.sign(st.y - y0) * Math.max(0, along - horizontal),
      );
    };
    const [x, y] = position(progress);
    const [endX, endY] = position(progress + 1 / duration);
    packages += `<g transform="translate(${x} ${y - 5})" aria-hidden="true"><g class="parcel" style="--dx:${endX - x}px;--dy:${endY - y}px;--travel:${1 / speed}s">${cube(0, 0, 10, STATIONS[st.type].color, 11, 5)}<path d="M0-15v10" stroke="#f0eed8" stroke-width="3"/></g></g>`;
  }
  const machines =
    packages +
    [...s.stations]
      .sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x)
      .map((st) => machine(st, s, st.id === selected))
      .join('');
  return `<svg class="workshop ${mode ? 'placing' : ''}" viewBox="0 0 940 560" xmlns="http://www.w3.org/2000/svg" aria-labelledby="floor-title floor-desc"><title id="floor-title">Your software factory floor</title><desc id="floor-desc">An isometric workshop. Select a station to manage it. Use Build a station to place more equipment. A station list is also available.</desc><defs><filter id="shade"><feColorMatrix type="matrix" values=".75 0 0 0 0 0 .75 0 0 0 0 0 .75 0 0 0 0 0 1 0"/></filter><filter id="darken"><feColorMatrix type="matrix" values=".55 0 0 0 0 0 .55 0 0 0 0 0 .55 0 0 0 0 0 1 0"/></filter><radialGradient id="glow"><stop stop-color="#668a88" stop-opacity=".18"/><stop offset="1" stop-color="#192b3a" stop-opacity="0"/></radialGradient><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#a9c4d2" opacity=".1"/></pattern></defs><rect width="940" height="560" fill="url(#dots)"/><ellipse cx="450" cy="300" rx="450" ry="260" fill="url(#glow)"/><ellipse cx="447" cy="333" rx="345" ry="134" fill="#07101a" opacity=".28"/><path d="M50 225L375 75 830 285 505 435z" fill="#4d6166"/><path d="M50 225v21l455 210v-21z" fill="#182d3d"/><path d="M505 435v21l325-150v-21z" fill="#122331"/><path d="M50 225V159L375 9v66z" fill="#273d4f"/><path d="M375 9l455 210v66L375 75z" fill="#223445"/><path d="M50 159L375 9l455 210" fill="none" stroke="#52697a" stroke-width="5"/><path d="M134 122l112-51v39l-112 52z" fill="#45677b"/><path d="M140 125l100-46v26l-100 46z" fill="#85b1c0" opacity=".35"/><path d="M191 101v33" stroke="#354d5b" stroke-width="5"/><path d="M555 108l108 50v31l-108-50z" fill="#182e3a"/><text x="566" y="-147" transform="skewY(25)" fill="#b8f27c" font-size="12" letter-spacing="4" font-weight="800">MAKE GOOD THINGS.</text>${tiles}${routes}${plant(91, 214)}${plant(775, 286)}${machines}<g transform="translate(120 388)"><path d="M0 0l20-9 70 32-20 9z" fill="#46565f"/><path d="M0 0v25l70 32V32z" fill="#243847"/><path d="M70 32l20-9v25l-20 9z" fill="#182c3c"/><path d="M12 4l18 8m-18 0 31 14" stroke="#91a5a6" stroke-width="2"/><text x="0" y="78" fill="#6f8899" font-size="10" letter-spacing="2">EST. THIS MORNING</text></g><g transform="translate(757 388)">${cube(0, 0, 20, '#c39b6c', 24, 11)}${cube(24, 13, 16, '#a78057', 18, 8)}<text x="-28" y="47" fill="#6f8899" font-size="10" letter-spacing="2">OUTBOUND</text></g><text x="480" y="510" fill="#6f8899" text-anchor="middle" font-size="11" letter-spacing="3">SMALL TEAM. BIG IDEAS.</text></svg>`;
}
