import './style.css';
import { STATIONS, WORKERS, SCENARIOS, CONTRACTS, EVENTS, STAGES } from './data.js';
import {
  newGame,
  tick,
  act,
  day,
  wages,
  money,
  activeJobs,
  queueFor,
  goalProgress,
  stationSpeed,
  score,
  exportSave,
  importSave,
} from './engine.js';
import { renderFloor, esc } from './floor.js';

const $ = (selector) => document.querySelector(selector);
const SAVE_KEY = 'ship-it-save-v1';
const SETTINGS_KEY = 'ship-it-settings-v1';
let saved = null,
  storageWarning = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) saved = importSave(raw);
} catch {
  storageWarning = true;
}
let settings = { sound: false, motion: !matchMedia('(prefers-reduced-motion: reduce)').matches };
try {
  const x = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (x && typeof x.sound === 'boolean' && typeof x.motion === 'boolean') settings = x;
} catch {
  /* optional settings */
}
const params = new URLSearchParams(location.search);
let s = saved || newGame(params.get('seed') || 'HELLO-WORLD', params.get('scenario') || 'garage');
let running = false,
  speed = 1,
  selected = 's2',
  tab = 'inbox',
  mode = null,
  floorView = 'floor',
  started = false;
let dialogKind = '',
  tutorialStep = 0,
  tutorial = false,
  startScenario = params.get('scenario') || 'garage';
if (!Object.hasOwn(SCENARIOS, startScenario)) startScenario = 'garage';
let toastTimer,
  audioContext,
  accumulator = 0,
  lastTime = performance.now(),
  resumeAfterEvent = false,
  importSequence = 0;
const icon = (name, size = 20) => {
  const paths = {
    factory: '<path d="M3 21V10l6 3V7l6 3V3h6v18H3Z"/><path d="M7 17h1m4 0h1m4 0h1"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l10 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    crew: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v2"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    tool: '<path d="m15 4-3 3 5 5 3-3a6 6 0 0 1-8 7l-7 5-3-3 5-7a6 6 0 0 1 8-7Z"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    sound: '<path d="m3 9 4 0 5-5v16l-5-5H3V9Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`;
};
function toast(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('show');
  if ($('#dialog').open) {
    let notice = $('#dialog .dialog-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'dialog-notice';
      notice.setAttribute('role', 'status');
      $('#dialog').append(notice);
    }
    notice.textContent = text;
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4200);
}
function beep(kind = 'click') {
  if (!settings.sound) return;
  try {
    audioContext ||= new AudioContext();
    audioContext.resume().catch(() => {});
    const now = audioContext.currentTime;
    const tones = kind === 'ship' ? [392, 494, 587] : kind === 'bad' ? [180, 140] : [520];
    tones.forEach((tone, i) => {
      const o = audioContext.createOscillator();
      const g = audioContext.createGain();
      o.type = 'sine';
      o.frequency.value = tone;
      o.connect(g);
      g.connect(audioContext.destination);
      const t = now + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch {
    /* sound is optional */
  }
}
function persist() {
  if (!started) return;
  try {
    localStorage.setItem(SAVE_KEY, exportSave(s));
    saved = s;
  } catch {
    if (!storageWarning) {
      toast('Browser saving is unavailable. Export a save from the menu.');
      storageWarning = true;
    }
  }
}
function settingSave() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* optional */
  }
  applyMotion();
}
function applyMotion() {
  document.documentElement.classList.toggle('reduce-motion', !settings.motion);
}
function closeDialog() {
  $('#dialog').close();
  dialogKind = '';
}
function showDialog(kind, html) {
  dialogKind = kind;
  $('#dialog').className = `modal modal-${kind}`;
  $('#dialog').innerHTML = html;
  if (!$('#dialog').open) $('#dialog').showModal();
}
const closeButton = () =>
  `<button class="icon-btn modal-close" data-action="close" aria-label="Close dialog">${icon('x')}</button>`;
function shell() {
  $('#app').innerHTML =
    `<header class="topbar"><a class="brand" href="#" data-action="brand" aria-label="Ship It! game menu"><span class="brand-mark">${icon('factory', 25)}</span><span>ship it<span class="brand-dot">!</span><small>THE SOFTWARE FACTORY GAME</small></span></a><div class="top-metrics" id="top-metrics"></div><div class="top-actions"><button class="icon-btn" data-action="sound" id="sound-toggle" aria-label="Toggle sound">${icon('sound')}</button><button class="icon-btn" data-action="help" aria-label="How to play">${icon('help')}</button><button class="icon-btn" data-action="menu" aria-label="Game menu">${icon('menu')}</button></div></header><main class="game-layout"><aside class="contracts-panel"><div class="panel-heading"><div><span class="eyebrow">YOUR NEXT BIG THING</span><h2>Work orders<span class="dot green"></span></h2></div>${icon('box', 23)}</div><div class="tabs" id="contract-tabs"></div><div id="contracts" class="contracts-content"></div><div class="panel-foot"><span class="dot green"></span> New opportunities every 2 days</div></aside><section class="center"><div class="floor-heading"><div><div class="eyebrow">OPERATIONS / <span id="scenario-label"></span></div><h1>Your little empire.</h1><p id="floor-subtitle">Good work starts with a good flow.</p></div><div class="view-toggle"><button data-action="view" data-view="floor" id="view-floor" aria-label="Show illustrated factory">${icon('factory', 17)} Floor</button><button data-action="view" data-view="list" id="view-list" aria-label="Show station list">${icon('menu', 17)} List</button></div></div><div id="tutorial"></div><div class="floor-wrap" id="factory" tabindex="-1"><div id="floor"></div><div id="placement-banner"></div><div class="floor-badge"><span class="live-dot"></span><span id="floor-status">SHIFT PAUSED</span></div></div><div id="pipeline" class="pipeline"></div><div class="build-toolbar"><div><span class="eyebrow">MAKE ROOM FOR WHAT’S NEXT</span><strong>Grow your workshop</strong></div><div class="build-actions"><button class="button secondary" data-action="crew">${icon('crew', 18)} Hire crew</button><button class="button primary" data-action="build-menu">${icon('plus', 18)} Build a station</button></div></div><section class="activity"><div class="section-heading"><h2>On the factory floor</h2><button class="text-btn" data-action="log">Full journal ${icon('arrow', 14)}</button></div><div id="activity"></div></section></section><aside class="inspector-panel"><div id="inspector"></div><div id="campaign"></div></aside></main><footer class="shiftbar"><div class="shift-info" id="shift-info"></div><div class="transport"><button class="button play-button" id="play-button" data-action="play" data-focus="play">${icon('play', 16)} Start shift</button><button class="icon-btn step-button" data-action="step" aria-label="Advance one working hour" title="Advance one hour (N)">${icon('arrow', 18)}</button><div class="speed-controls" role="group" aria-label="Simulation speed"><button data-action="speed" data-speed="1">1×</button><button data-action="speed" data-speed="2">2×</button><button data-action="speed" data-speed="4">4×</button></div></div><div class="save-status"><span class="dot green"></span><span id="save-label">Saved on this device</span><kbd>SPACE</kbd> pause</div></footer><input type="file" id="import-file" accept=".json,application/json" hidden />`;
  render();
}
function replace(id, html) {
  const target = $(`#${id}`);
  if (target.innerHTML === html) return;
  if (target.contains(document.activeElement) && document.activeElement.tagName === 'SELECT')
    return;
  const focus = target.contains(document.activeElement)
    ? document.activeElement?.dataset?.focus
    : null;
  target.innerHTML = html;
  if (focus)
    target.querySelector(`[data-focus="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
}
function render() {
  const def = SCENARIOS[s.scenario];
  replace(
    'top-metrics',
    `<div class="metric"><span>CASH ON HAND</span><strong class="${s.cash < 500 ? 'warning-text' : ''}">${money(s.cash)}</strong></div><div class="metric"><span>REPUTATION</span><strong>${Math.round(s.reputation)}<small>/100</small><i class="tiny-bar"><i style="width:${s.reputation}%"></i></i></strong></div><div class="metric"><span>SHIPPED</span><strong>${s.delivered}<small>${def.goal ? `/${def.goal}` : ' projects'}</small></strong></div>`,
  );
  replace(
    'contract-tabs',
    `<button data-action="tab" data-tab="inbox" class="${tab === 'inbox' ? 'active' : ''}">Inbox <span>${s.offers.length}</span></button><button data-action="tab" data-tab="active" class="${tab === 'active' ? 'active' : ''}">In progress <span>${s.jobs.length}</span></button>`,
  );
  replace('contracts', tab === 'inbox' ? inbox() : jobs());
  $('#scenario-label').textContent = def.name.toUpperCase();
  $('#floor-subtitle').textContent = mode
    ? 'Choose a highlighted tile. Escape cancels placement.'
    : s.event
      ? 'Your crew needs a decision before work continues.'
      : 'Good work starts with a good flow.';
  $('#view-floor').classList.toggle('active', floorView === 'floor');
  $('#view-list').classList.toggle('active', floorView === 'list');
  replace('floor', floorView === 'floor' ? renderFloor(s, selected, mode, speed) : stationList());
  replace(
    'placement-banner',
    mode
      ? `<div class="placement-note">${icon('plus', 16)} ${mode.move ? 'Move workstation' : `Place ${esc(STATIONS[mode.type].name)} · ${money(STATIONS[mode.type].cost)}`}<button data-action="cancel-mode" aria-label="Cancel placement">${icon('x', 15)}</button></div>`
      : '',
  );
  replace(
    'pipeline',
    STAGES.map((type) => {
      const count = queueFor(s, type).length;
      const working = s.stations.filter((st) => st.type === type && st.busy).length;
      return `<div class="pipe-stage" style="--stage:${STATIONS[type].color}"><span class="pipe-icon">${STATIONS[type].label}</span><div><strong>${STATIONS[type].short}</strong><span class="${count > 1 ? 'warning-text' : ''}">${working} working · ${count} waiting</span></div>${count > 1 ? '<i class="queue-alert" title="Work is accumulating here">!</i>' : ''}</div>`;
    }).join(''),
  );
  replace('inspector', inspector());
  replace('campaign', campaign());
  replace(
    'activity',
    s.log
      .slice(0, 3)
      .map(
        (item) =>
          `<div class="log-line"><span class="log-indicator ${item.kind}"></span><span>${esc(item.text)}</span><time>D${Math.floor(item.clock / 8) + 1}</time></div>`,
      )
      .join(''),
  );
  replace(
    'shift-info',
    `<span class="shift-number">${String(Math.min(day(s), def.days || day(s))).padStart(2, '0')}</span><div><strong>${def.days ? `DAY OF ${def.days}` : 'SANDBOX DAY'}</strong><span>Hour ${(s.clock % 8) + 1} of 8 · ${money(wages(s))}/day</span></div>`,
  );
  $('#play-button').innerHTML =
    `${icon(running ? 'pause' : 'play', 16)} ${running ? 'Pause shift' : s.clock ? 'Resume shift' : 'Start shift'}`;
  $('#play-button').disabled = s.status !== 'playing';
  $('.step-button').disabled = running || s.status !== 'playing';
  document
    .querySelectorAll('[data-action="speed"]')
    .forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === speed));
  $('#floor-status').textContent =
    s.status === 'won'
      ? 'CAMPAIGN COMPLETE'
      : s.status === 'lost'
        ? 'SHIFT ENDED'
        : running
          ? 'FACTORY RUNNING'
          : 'SHIFT PAUSED';
  $('.floor-badge').classList.toggle('is-running', running);
  document.documentElement.classList.toggle('is-paused', !running);
  $('#sound-toggle').classList.toggle('enabled', settings.sound);
  $('#sound-toggle').setAttribute('aria-pressed', String(settings.sound));
  $('#save-label').textContent = storageWarning
    ? 'Export a save to keep your progress'
    : 'Saved on this device';
  renderTutorial();
}
function inbox() {
  if (!s.offers.length)
    return `<div class="empty-state">${icon('box', 36)}<h3>A little breathing room.</h3><p>New contracts arrive every two days. Advance the shift to see the next batch.</p></div>`;
  return (
    `<div class="micro-label">${s.jobs.length}/4 active contracts <span>PAYMENT ON DELIVERY</span></div>` +
    s.offers
      .map((offer, i) => {
        const d = CONTRACTS[offer.template];
        return `<article class="contract-card"><div class="contract-top"><span class="client-icon color-${i}">${d.icon.slice(0, 2)}</span><span class="tag">${d.effort[1] > 12 ? 'GROWTH' : 'SMALL BIZ'}</span></div><h3>${d.name}</h3><p>${d.product}</p><div class="contract-facts"><strong>${money(offer.reward)}</strong><span>${d.days - (s.scenario === 'crunch' ? 1 : 0)} days to deliver</span></div><div class="effort-bar" aria-label="Workload: ${d.effort.reduce((a, b) => a + b)} units">${d.effort.map((e, n) => `<i style="flex:${e};background:${STATIONS[STAGES[n]].color}"></i>`).join('')}</div><button class="accept-btn" data-action="accept" data-id="${offer.id}" data-focus="accept-${offer.id}" ${s.jobs.length >= 4 ? 'disabled' : ''}>${s.jobs.length >= 4 ? 'Factory at capacity' : 'Accept contract'} ${icon('arrow', 15)}</button></article>`;
      })
      .join('')
  );
}
function jobs() {
  if (!s.jobs.length)
    return `<div class="empty-state">${icon('spark', 34)}<h3>Ready for the first order.</h3><p>Accept a contract from the inbox. Your crew will pick it up when the shift starts.</p><button class="button secondary" data-action="tab" data-tab="inbox">Browse contracts</button></div>`;
  return s.jobs
    .map((j) => {
      const d = CONTRACTS[j.template],
        remaining = Math.ceil((j.deadline - s.clock) / 8);
      const st = s.stations.find((st) => st.busy === j.id);
      return `<article class="contract-card active-job"><div class="contract-top"><span class="tag ${j.warranty ? 'warm' : ''}">${j.warranty ? 'WARRANTY REPAIR' : 'IN PROGRESS'}</span><span class="${remaining < 2 ? 'warning-text' : 'muted'}">${remaining >= 0 ? `${remaining}d left` : `${-remaining}d late`}</span></div><h3>${d.name}</h3><p>${j.warranty ? 'Make it right. No additional revenue.' : d.product}</p><div class="job-stages">${STAGES.map((type, i) => `<span class="${i <= STAGES.indexOf(j.stage) ? 'reached' : ''}" style="--stage:${STATIONS[type].color}" title="${STATIONS[type].short}">${i < STAGES.indexOf(j.stage) ? '✓' : i + 1}</span>`).join('')}</div><div class="job-state"><span class="dot" style="background:${STATIONS[j.stage].color}"></span>${STATIONS[j.stage].short} · ${j.status === 'queued' ? 'waiting for a station' : j.readyAt > s.clock ? 'in transit' : `${Math.ceil(j.remaining)} work units left`}</div><div class="contract-facts"><strong>${money(j.reward)}</strong>${j.reworks ? `<span>${j.reworks} rework${j.reworks === 1 ? '' : 's'}</span>` : ''}</div>${st ? `<button class="text-btn" data-action="station" data-id="${st.id}">View workstation ${icon('arrow', 13)}</button>` : ''}${!j.warranty ? `<button class="text-btn danger subtle" data-action="cancel-confirm" data-id="${j.id}">Cancel contract</button>` : ''}</article>`;
    })
    .join('');
}
function stationList() {
  return `<div class="station-list">${s.stations
    .map((st) => {
      const w = s.workers.find((w) => w.id === st.worker);
      return `<button class="station-list-item ${selected === st.id ? 'chosen' : ''}" data-action="station" data-id="${st.id}" data-focus="${st.id}" style="--stage:${STATIONS[st.type].color}"><span class="list-station-icon">${icon(st.type === 'ship' ? 'box' : 'factory', 24)}</span><span><strong>${STATIONS[st.type].name}</strong><small>Level ${st.level} · Tile ${st.x + 1}, ${st.y + 1}</small></span><span><strong>${w ? esc(w.name) : 'Unassigned'}</strong><small>${st.busy ? 'Working' : st.maintenance ? 'Maintenance' : 'Idle'}</small></span></button>`;
    })
    .join('')}${
    mode
      ? `<div class="list-placement"><strong>Choose an empty tile</strong>${Array.from(
          { length: 35 },
          (_, i) => {
            const x = i % 7,
              y = Math.floor(i / 7);
            return `<button data-action="tile" data-x="${x}" data-y="${y}" ${s.stations.some((st) => st.x === x && st.y === y) ? 'disabled' : ''}>${x + 1},${y + 1}</button>`;
          },
        ).join('')}</div>`
      : ''
  }</div>`;
}
function inspector() {
  const st = s.stations.find((x) => x.id === selected);
  if (!st)
    return `<div class="panel-heading"><h2>A place for good work.</h2></div><p class="inspector-empty">Select a workstation on the floor to manage crew, upgrade equipment, and adjust its policy.</p>`;
  const d = STATIONS[st.type];
  const w = s.workers.find((w) => w.id === st.worker);
  const job = s.jobs.find((j) => j.id === st.busy);
  return `<div class="inspector-header" style="--stage:${d.color}"><span class="eyebrow">WORKSTATION / ${d.label}</span><div class="machine-symbol">${icon(st.type === 'ship' ? 'box' : st.type === 'review' ? 'check' : st.type === 'build' ? 'tool' : 'spark', 34)}</div><h2>${d.name}</h2><span class="station-level">LEVEL ${st.level} <i>${'●'.repeat(st.level)}${'○'.repeat(3 - st.level)}</i></span></div><div class="inspector-body"><p class="station-description">${d.description}</p><div class="station-status ${job ? 'working' : ''}"><span class="dot" style="background:${d.color}"></span>${st.maintenance ? `Maintenance · ${st.maintenance}h remaining` : job ? `${job.readyAt > s.clock ? 'Receiving' : 'Working on'} ${CONTRACTS[job.template].name}` : w ? 'Ready for the next job' : 'Waiting for a crew member'}</div><label class="field-label" for="worker-select">ASSIGNED CREW</label><select id="worker-select" data-action="assign" data-id="${st.id}" ${st.busy || st.maintenance ? 'disabled' : ''}><option value="">No one assigned</option>${s.workers
    .map((worker) => {
      const prev = s.stations.find((x) => x.worker === worker.id);
      return `<option value="${worker.id}" ${st.worker === worker.id ? 'selected' : ''} ${prev && prev.id !== st.id && (prev.busy || prev.maintenance) ? 'disabled' : ''}>${esc(worker.name)} · ${WORKERS[worker.type].name}${prev && prev.id !== st.id ? ` (${STATIONS[prev.type].short})` : ''}</option>`;
    })
    .join(
      '',
    )}</select><div class="station-data"><div><span>THROUGHPUT</span><strong>${stationSpeed(s, st).toFixed(1)} <small>units/h</small></strong></div><div><span>PROCESSED</span><strong>${st.processed}<small> jobs</small></strong></div></div>${
    ['build', 'review'].includes(st.type)
      ? `<label class="field-label" for="policy-select">WORK POLICY</label><select id="policy-select" data-action="policy" data-id="${st.id}" ${st.busy ? 'disabled' : ''}>${(st.type ===
        'build'
          ? [
              ['balanced', 'Balanced · steady and careful'],
              ['rush', 'Rush · +55% speed, more defects'],
            ]
          : [
              ['thorough', 'Thorough · slower, catches more'],
              ['balanced', 'Quick review · more escaped bugs'],
            ]
        )
          .map(
            ([v, l]) => `<option value="${v}" ${st.policy === v ? 'selected' : ''}>${l}</option>`,
          )
          .join('')}</select>`
      : ''
  }<div class="wear-label"><span>EQUIPMENT WEAR</span><strong>${Math.round(st.wear)}%</strong></div><div class="bar"><i style="width:${st.wear}%;background:${st.wear > 60 ? '#e7ae75' : '#93aebc'}"></i></div><div class="inspector-buttons"><button class="button secondary" data-action="upgrade" data-id="${st.id}" ${st.level >= 3 || s.cash < st.level * 300 ? 'disabled' : ''}>${icon('spark', 15)} ${st.level >= 3 ? 'Fully upgraded' : `Upgrade · ${money(st.level * 300)}`}</button><button class="button quiet" data-action="maintain" data-id="${st.id}" ${st.busy || st.maintenance || s.cash < 100 ? 'disabled' : ''}>${icon('tool', 15)} Maintain · $100 / 4h</button></div><p class="tiny-note">Maintenance resets wear and removes 10 technical debt.</p><div class="station-footer"><button class="text-btn" data-action="move" data-id="${st.id}" ${st.busy || st.maintenance ? 'disabled' : ''}>Move station</button><button class="text-btn" data-action="sell" data-id="${st.id}" ${st.busy || st.maintenance || s.stations.filter((x) => x.type === st.type).length < 2 ? 'disabled' : ''}>Sell · ${money(d.cost * 0.5)}</button></div></div>`;
}
function campaign() {
  const def = SCENARIOS[s.scenario];
  const pts = s.daily
    .map(
      (d, i) =>
        `${(i / Math.max(1, s.daily.length - 1)) * 220},${40 - Math.max(0, Math.min(40, (d.cash / Math.max(5000, ...s.daily.map((x) => x.cash))) * 40))}`,
    )
    .join(' ');
  return `<div class="campaign-card"><div class="section-heading"><h3>${def.goal ? 'The big picture' : 'Your workshop'}</h3>${icon('spark', 17)}</div><p>${def.goal ? `Ship ${def.goal} contracts. Finish with 45+ reputation, positive cash, and no unfinished work.` : 'Build, experiment, and find your own rhythm.'}</p><div class="goal-label"><span>${def.goal ? 'CAMPAIGN PROGRESS' : 'CONTRACTS DELIVERED'}</span><strong>${s.delivered}${def.goal ? ` / ${def.goal}` : ''}</strong></div><div class="bar goal-bar"><i style="width:${goalProgress(s) * 100}%"></i></div><div class="debt-row"><span>Technical debt</span><strong class="${s.debt > 40 ? 'warning-text' : ''}">${Math.round(s.debt)}%</strong></div><div class="bar thin"><i style="width:${s.debt}%;background:#d5a4d1"></i></div><p class="tiny-note">Debt slows build work. Maintain idle stations to bring it down.</p>${pts ? `<svg viewBox="0 0 220 45" class="cash-chart" role="img" aria-label="Daily cash trend"><polyline points="${pts}" fill="none" stroke="#9bbf88" stroke-width="2"/></svg>` : ''}<button class="text-btn" data-action="report">View factory report ${icon('arrow', 14)}</button></div>`;
}
const TUTORIAL = [
  [
    'A little factory, ready to go.',
    'Your four stations already have crew. Accept a contract in the inbox to give them something to build.',
  ],
  [
    'Let the first shift begin.',
    'Press Start shift or Space. Work travels through Discover, Build, Review, and Ship automatically. N advances one hour while paused.',
  ],
  [
    'Read the queues.',
    'The strip below the floor shows working and waiting jobs. A growing queue tells you where an extra station or upgrade will help.',
  ],
  [
    'People make the machines work.',
    'Select a station to inspect it. Hire crew, then assign them to a new workstation. Staff can only switch stations when idle.',
  ],
  [
    'Fast is a choice. So is careful.',
    'Rush build makes work faster but creates more defects and debt. Thorough review catches mistakes before customers do.',
  ],
  [
    'Build a business that lasts.',
    'Deliver six contracts in 30 days, keep reputation at 45+, and finish with positive cash and no unfinished work. Your progress saves automatically.',
  ],
];
function renderTutorial() {
  replace(
    'tutorial',
    tutorial
      ? `<div class="tutorial-card"><span class="tutorial-number">${tutorialStep + 1}<small>/${TUTORIAL.length}</small></span><div><strong>${TUTORIAL[tutorialStep][0]}</strong><p>${TUTORIAL[tutorialStep][1]}</p></div><button class="button small" data-action="tutorial-next">${tutorialStep === TUTORIAL.length - 1 ? 'Got it' : 'Next'} ${icon('arrow', 14)}</button><button class="icon-btn" data-action="tutorial-skip" aria-label="Dismiss tutorial">${icon('x', 15)}</button></div>`
      : '',
  );
}
function startDialog() {
  running = false;
  render();
  showDialog(
    'start',
    `<div class="welcome-art"><span class="welcome-stamp">INDEPENDENT SOFTWARE. INDUSTRIAL AMBITION.</span><div class="hero-factory">${icon('factory', 80)}</div><span class="hero-crate crate-a">SPEC</span><span class="hero-crate crate-b">BUILD</span><span class="hero-crate crate-c">SHIP</span><div class="welcome-title"><span class="eyebrow">A SMALL TEAM. AN UNREASONABLE DEADLINE.</span><h2 id="dialog-title">Make good things.<br><em>Then ship them.</em></h2><p>A cozy strategy game about the messy business of making software.</p></div></div><div class="welcome-body">${started ? closeButton() : ''}<div class="welcome-intro"><h3>Choose your next chapter.</h3><p>Build your floor. Find your flow. Keep the lights on.</p></div><div class="scenario-options">${Object.entries(
      SCENARIOS,
    )
      .map(
        ([key, d]) =>
          `<button class="scenario-option ${startScenario === key ? 'chosen' : ''}" data-action="scenario" data-scenario="${key}" aria-pressed="${startScenario === key}"><span class="eyebrow">${d.difficulty}</span><strong>${d.name}</strong><small>${d.description}</small><span class="scenario-stats">${money(d.cash)} · ${d.days ? `${d.days} days · ${d.goal} deliveries` : 'Unlimited days'}</span></button>`,
      )
      .join(
        '',
      )}</div><label class="field-label" for="seed-input">CHALLENGE SEED <span>Same seed + same choices = same run</span></label><div class="seed-row"><input id="seed-input" maxlength="32" value="${esc(params.get('seed') || s.seed)}" spellcheck="false" autocomplete="off"/><button class="button secondary" data-action="random-seed" aria-label="Generate a new challenge seed">Shuffle</button></div><div class="start-buttons"><button class="button primary large" data-action="start">Start a new factory ${icon('arrow', 19)}</button>${saved ? '<button class="button secondary large" data-action="continue">Continue saved factory</button>' : ''}</div><p class="welcome-foot">Free to play. Runs on your device. No accounts, real agents, or purchases.</p>${saved ? '<p class="tiny-note">Starting a new factory replaces the local autosave. Export it from the menu first if you want to keep it.</p>' : ''}${storageWarning ? '<p class="warning-text">A previous save could not be loaded, or storage is unavailable. Use exported saves to keep your progress.</p>' : ''}</div>`,
  );
}
function buildDialog() {
  running = false;
  render();
  showDialog(
    'build',
    `${closeButton()}<span class="eyebrow">A LITTLE MORE CAPACITY</span><h2 id="dialog-title">Room to grow.</h2><p class="dialog-lede">Choose a station, then an empty tile on the floor. New stations need an assigned crew member.</p><div class="build-options">${Object.entries(
      STATIONS,
    )
      .map(
        ([type, d]) =>
          `<button class="build-option" data-action="choose-build" data-type="${type}" ${s.cash < d.cost ? 'disabled' : ''} style="--stage:${d.color}"><span class="build-symbol">${icon('factory', 29)}</span><div><h3>${d.name}</h3><p>${d.description}</p><strong>${money(d.cost)}</strong></div>${icon('arrow', 18)}</button>`,
      )
      .join(
        '',
      )}</div><p class="tiny-note">Stations occupy one tile. A package takes one hour per three tiles of Manhattan distance, rounded up. Moving idle stations is free.</p>`,
  );
}
function crewDialog() {
  running = false;
  render();
  showDialog(
    'crew',
    `${closeButton()}<span class="eyebrow">GOOD WORK IS A TEAM SPORT</span><h2 id="dialog-title">Meet your next teammate.</h2><p class="dialog-lede">${s.workers.length}/16 crew members · ${money(wages(s))} daily operating cost including rent.</p><div class="crew-options">${Object.entries(
      WORKERS,
    )
      .map(
        ([type, d]) =>
          `<article class="crew-card"><div class="crew-avatar ${type}">${d.icon}</div><h3>${d.name}</h3><p>${d.description}</p><div class="contract-facts"><strong>${money(d.cost)}</strong><span>+${money(d.wage)}/day</span></div><button class="button secondary" data-action="hire" data-worker="${type}" ${s.cash < d.cost || s.workers.length >= 16 ? 'disabled' : ''}>${icon('plus', 16)} Hire ${d.name.toLowerCase()}</button></article>`,
      )
      .join('')}</div><h3 class="roster-title">Your crew</h3><div class="roster">${s.workers
      .map((w) => {
        const st = s.stations.find((st) => st.worker === w.id);
        return `<div><span class="roster-badge">${WORKERS[w.type].icon}</span><span><strong>${esc(w.name)}</strong><small>${st ? STATIONS[st.type].name : 'Available for assignment'}</small></span><span>${money(WORKERS[w.type].wage)}/day</span>${!st ? `<button class="text-btn" data-action="release" data-id="${w.id}">Release</button>` : ''}</div>`;
      })
      .join(
        '',
      )}</div><p class="tiny-note">Select a station on the floor to assign crew. Hiring alone does not increase capacity.</p>`,
  );
}
function eventDialog() {
  const e = EVENTS.find((e) => e.key === s.event?.key);
  if (!e) return;
  showDialog(
    'event',
    `<span class="event-illustration">${icon(e.key === 'outage' ? 'tool' : 'spark', 44)}</span><span class="eyebrow">A MOMENT ON THE FACTORY FLOOR</span><h2 id="dialog-title">${e.title}</h2><p class="dialog-lede">${e.description}</p><div class="event-options">${e.options.map((o, i) => `<button data-action="event" data-choice="${i}" ${s.cash < o.cost && o.cost > 0 ? 'disabled' : ''}><strong>${o.label} ${icon('arrow', 17)}</strong><span>${o.detail}</span></button>`).join('')}</div><p class="tiny-note">The simulation waits here until you make a decision.</p>`,
  );
}
function reportDialog(end = false) {
  running = false;
  render();
  const won = s.status === 'won';
  showDialog(
    end ? 'end' : 'report',
    `${closeButton()}<span class="eyebrow">${end ? (won ? 'LOOK AT WHAT YOU BUILT' : 'EVERY FACTORY TEACHES YOU SOMETHING') : 'YOUR FACTORY, BY THE NUMBERS'}</span><h2 id="dialog-title">${end ? (won ? 'Small team. Big finish.' : 'A lesson worth keeping.') : 'The shift report.'}</h2><p class="dialog-lede">${end ? (won ? 'You met the delivery target, protected your reputation, and kept the business solvent.' : s.cash < -500 ? 'Operating costs exhausted your credit. Try accepting work earlier and expanding only at the busiest stage.' : 'The deadline arrived before all goals were met. Watch queues, accept contracts steadily, and leave time for the last delivery.') : 'A clear view of what your factory has accomplished.'}</p><div class="report-stats"><div><span>FACTORY SCORE</span><strong>${score(s).toLocaleString()}</strong></div><div><span>DELIVERIES</span><strong>${s.delivered}</strong></div><div><span>CASH</span><strong>${money(s.cash)}</strong></div><div><span>REPUTATION</span><strong>${Math.round(s.reputation)}</strong></div></div><div class="report-details"><div><span>Total revenue</span><strong>${money(s.earned)}</strong></div><div><span>Total costs</span><strong>${money(s.spent)}</strong></div><div><span>Defects caught / escaped</span><strong>${s.caught} / ${s.escaped}</strong></div><div><span>Late / cancelled contracts</span><strong>${s.stats.late} / ${s.stats.cancelled}</strong></div><div><span>Crew utilization</span><strong>${s.stats.staffedHours ? Math.round((s.stats.busyHours / s.stats.staffedHours) * 100) : 0}%</strong></div><div><span>Seed / scenario</span><strong>${esc(s.seed)} / ${SCENARIOS[s.scenario].name}</strong></div></div>${
      s.history.length
        ? `<h3>Out the door</h3><div class="delivery-list">${s.history
            .slice(0, 12)
            .map(
              (h) =>
                `<div>${icon('check', 16)}<span>${esc(h.name)}<small>Day ${Math.floor(h.clock / 8) + 1}${h.late ? ' · late' : ''}</small></span><strong>${money(h.reward)}</strong></div>`,
            )
            .join('')}</div>`
        : ''
    }<div class="dialog-actions"><button class="button primary" data-action="${end ? 'new' : 'close'}">${end ? 'Build another factory' : 'Back to the floor'}</button><button class="button secondary" data-action="share">Share this challenge</button><button class="button quiet" data-action="export">Export save</button></div><p class="tiny-note">Scores are local and unverified. Challenge links share starting conditions, not your saved progress.</p>`,
  );
}
function menuDialog() {
  running = false;
  render();
  showDialog(
    'menu',
    `${closeButton()}<span class="eyebrow">TAKE A BREATHER</span><h2 id="dialog-title">The workshop menu.</h2><div class="menu-grid"><button class="button secondary" data-action="export">${icon('download')} Export save</button><button class="button secondary" data-action="import">Import save</button><button class="button secondary" data-action="share">Share challenge</button><button class="button secondary" data-action="report">Factory report</button><button class="button secondary" data-action="help">How to play</button><button class="button secondary" data-action="new">New factory</button></div><div class="settings-row"><label for="sound-setting">Sound effects <small>Quiet feedback for actions and deliveries</small></label><input id="sound-setting" type="checkbox" data-setting="sound" ${settings.sound ? 'checked' : ''}/></div><div class="settings-row"><label for="motion-setting">Animated workshop <small>Switch off for reduced motion</small></label><input id="motion-setting" type="checkbox" data-setting="motion" ${settings.motion ? 'checked' : ''}/></div><p class="tiny-note">Autosaves stay in this browser. Export a save to move devices or keep multiple factories. Opening menus pauses the shift.</p><div class="about-line"><strong>Ship It! · v1.0.0</strong><span>Made for people who make things.</span></div>`,
  );
}
function helpDialog() {
  running = false;
  render();
  showDialog(
    'help',
    `${closeButton()}<span class="eyebrow">THE OWNER’S MANUAL</span><h2 id="dialog-title">Find your factory’s rhythm.</h2><p class="dialog-lede">Accept a contract, start the shift, and turn a client’s idea into a shipped product.</p><div class="help-flow">${STAGES.map((type) => `<div style="--stage:${STATIONS[type].color}"><strong>${STATIONS[type].short}</strong><p>${STATIONS[type].description}</p></div>`).join('')}</div><div class="help-grid"><section><h3>Grow at the bottleneck</h3><p>Watch the waiting counts. Add a station where work piles up, hire a worker, and assign them. A workstation without crew does no work.</p></section><section><h3>Keep the lights on</h3><p>Payroll, $25 rent, and $4 per station are charged every eight hours. Contracts pay on delivery. Late deliveries lose 30% of their fee and 4 reputation.</p></section><section><h3>Quality comes back around</h3><p>Review may send defects back for a smaller build. Escaped bugs return after 12 hours, cost $180 and 12 reputation, and create unpaid repair work.</p></section><section><h3>Take care of the machines</h3><p>Wear reduces throughput. Technical debt slows build work. Maintaining an idle station takes four hours, costs $100, resets its wear, and removes 10 debt.</p></section><section><h3>Finish strong</h3><p>Campaigns require the delivery goal, at least 45 reputation, nonnegative cash, and no active contracts or pending warranty claims. A cash balance below −$500 ends a campaign. Sandbox has no end condition.</p></section><section><h3>Take your time</h3><p>Pause whenever you like. Menus and crew decisions pause the simulation. Hidden tabs pause too. Use 1×, 2×, or 4× speed when the floor is flowing.</p></section></div><div class="keyboard-guide"><span><kbd>SPACE</kbd> play / pause</span><span><kbd>N</kbd> one hour</span><span><kbd>B</kbd> build</span><span><kbd>ESC</kbd> cancel / close</span></div><div class="dialog-actions"><button class="button primary" data-action="tutorial">Walk me through it</button><button class="button secondary" data-action="close">Back to the factory</button></div><p class="tiny-note">All businesses and events are fictional. Agent behavior is a game model; no AI service, payment, or real infrastructure is connected.</p>`,
  );
}
function download() {
  const url = URL.createObjectURL(new Blob([exportSave(s)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ship-it-${s.seed.replace(/[^a-z0-9_-]/gi, '-').slice(0, 32)}-day-${day(s)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Save exported. Keep this file to restore your factory.');
}
async function share() {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('seed', s.seed);
  url.searchParams.set('scenario', s.scenario);
  try {
    await navigator.clipboard.writeText(url.href);
    toast('Challenge link copied. It recreates the starting conditions.');
  } catch {
    showDialog(
      'share',
      `${closeButton()}<h2 id="dialog-title">Share this challenge.</h2><p>Copy this link to replay the same starting conditions.</p><input class="share-input" readonly value="${esc(url.href)}" aria-label="Challenge URL"/><button class="button primary" data-action="close">Done</button>`,
    );
    $('.share-input').select();
  }
}
function doAction(action, quiet = false) {
  const response = act(s, action);
  if (!quiet || !response.ok) toast(response.message);
  if (response.ok) {
    persist();
    beep();
  }
  render();
  return response.ok;
}
function advance(hours = 1) {
  const delivered = s.delivered,
    escaped = s.escaped;
  tick(s, hours);
  persist();
  render();
  if (s.delivered > delivered) {
    beep('ship');
    toast('A delivery is out the door. Payment received!');
  }
  if (s.escaped > escaped) beep('bad');
  if (s.event) {
    resumeAfterEvent = running;
    running = false;
    render();
    eventDialog();
  }
  if (s.status !== 'playing') {
    running = false;
    reportDialog(true);
  }
}
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (el.tagName === 'A') e.preventDefault();
  const a = el.dataset.action;
  if (a === 'play') {
    if (s.event) return eventDialog();
    if (s.status !== 'playing') return reportDialog(true);
    running = !running;
    accumulator = 0;
    if (running) beep();
    render();
  } else if (a === 'step') {
    if (!running && s.status === 'playing') advance();
  } else if (a === 'speed') {
    speed = Number(el.dataset.speed);
    render();
  } else if (a === 'tab') {
    tab = el.dataset.tab;
    render();
  } else if (a === 'station') {
    selected = el.dataset.id;
    mode = null;
    render();
    if (innerWidth < 900)
      $('#inspector').scrollIntoView({
        behavior: settings.motion ? 'smooth' : 'instant',
        block: 'start',
      });
  } else if (a === 'view') {
    floorView = el.dataset.view;
    render();
  } else if (a === 'accept') {
    if (doAction({ type: 'accept', id: el.dataset.id })) {
      tab = 'active';
      render();
    }
  } else if (a === 'build-menu') buildDialog();
  else if (a === 'choose-build') {
    mode = { type: el.dataset.type };
    closeDialog();
    render();
    $('#factory').scrollIntoView({
      block: 'center',
      behavior: settings.motion ? 'smooth' : 'instant',
    });
  } else if (a === 'tile') {
    if (!mode) return;
    const action = mode.move
      ? { type: 'move', id: mode.move }
      : { type: 'build', station: mode.type };
    if (doAction({ ...action, x: Number(el.dataset.x), y: Number(el.dataset.y) })) {
      selected = mode.move || s.stations.at(-1).id;
      mode = null;
      render();
    }
  } else if (a === 'cancel-mode') {
    mode = null;
    render();
  } else if (a === 'move') {
    mode = { move: el.dataset.id };
    running = false;
    render();
  } else if (['upgrade', 'maintain', 'sell'].includes(a)) doAction({ type: a, id: el.dataset.id });
  else if (a === 'crew') crewDialog();
  else if (a === 'hire') {
    if (doAction({ type: 'hire', worker: el.dataset.worker })) crewDialog();
  } else if (a === 'release') {
    if (doAction({ type: 'release', id: el.dataset.id })) crewDialog();
  } else if (a === 'cancel-confirm') {
    running = false;
    render();
    showDialog(
      'cancel',
      `${closeButton()}<h2 id="dialog-title">Cancel this contract?</h2><p>The client receives a cancellation. You lose $100 and 8 reputation.</p><div class="dialog-actions"><button class="button danger-button" data-action="cancel-job" data-id="${esc(el.dataset.id)}">Cancel contract</button><button class="button secondary" data-action="close">Keep working</button></div>`,
    );
  } else if (a === 'cancel-job') {
    doAction({ type: 'cancel', id: el.dataset.id });
    closeDialog();
  } else if (a === 'event') {
    if (doAction({ type: 'event', choice: Number(el.dataset.choice) })) {
      closeDialog();
      running = resumeAfterEvent;
      render();
    }
  } else if (a === 'menu' || a === 'brand') menuDialog();
  else if (a === 'help') helpDialog();
  else if (a === 'report') reportDialog();
  else if (a === 'log') {
    running = false;
    render();
    showDialog(
      'log',
      `${closeButton()}<span class="eyebrow">THE STORY SO FAR</span><h2 id="dialog-title">Factory journal.</h2><div class="journal">${s.log.map((l) => `<div class="journal-item ${l.kind}"><time>DAY ${Math.floor(l.clock / 8) + 1} · H${(l.clock % 8) + 1}</time><p>${esc(l.text)}</p></div>`).join('')}</div>`,
    );
  } else if (a === 'close') {
    if (s.event) eventDialog();
    else closeDialog();
  } else if (a === 'new') startDialog();
  else if (a === 'scenario') {
    startScenario = el.dataset.scenario;
    document.querySelectorAll('.scenario-option').forEach((b) => {
      const chosen = b.dataset.scenario === startScenario;
      b.classList.toggle('chosen', chosen);
      b.setAttribute('aria-pressed', String(chosen));
    });
  } else if (a === 'random-seed') {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    $('#seed-input').value = `SHIFT-${bytes[0].toString(36).toUpperCase()}`;
  } else if (a === 'start') {
    s = newGame($('#seed-input').value, startScenario);
    selected = 's2';
    tab = 'inbox';
    mode = null;
    started = true;
    tutorial = s.scenario === 'garage';
    tutorialStep = 0;
    closeDialog();
    persist();
    render();
  } else if (a === 'continue') {
    if (saved) {
      s = structuredClone(saved);
      started = true;
      selected = s.stations[0]?.id;
      closeDialog();
      render();
      if (s.event) eventDialog();
      else if (s.status !== 'playing') reportDialog(true);
    }
  } else if (a === 'export') download();
  else if (a === 'import') $('#import-file').click();
  else if (a === 'share') await share();
  else if (a === 'tutorial') {
    closeDialog();
    tutorial = true;
    tutorialStep = 0;
    render();
  } else if (a === 'tutorial-next') {
    if (++tutorialStep >= TUTORIAL.length) tutorial = false;
    render();
  } else if (a === 'tutorial-skip') {
    tutorial = false;
    render();
  } else if (a === 'sound') {
    settings.sound = !settings.sound;
    settingSave();
    if (settings.sound) beep();
    render();
    toast(`Sound ${settings.sound ? 'on' : 'off'}.`);
  }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.action === 'assign')
    doAction({ type: 'assign', id: el.dataset.id, worker: el.value });
  if (el.dataset.action === 'policy')
    doAction({ type: 'policy', id: el.dataset.id, policy: el.value });
  if (el.dataset.setting) {
    settings[el.dataset.setting] = el.checked;
    settingSave();
    render();
  }
});
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('svg [role="button"]')) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return;
  }
  if ($('#dialog').open) return;
  if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    $('#play-button').click();
  }
  if (e.key.toLowerCase() === 'n' && !running) {
    e.preventDefault();
    $('.step-button').click();
  }
  if (e.key.toLowerCase() === 'b') buildDialog();
  if (e.key === 'Escape') {
    mode = null;
    render();
  }
});
$('#dialog').addEventListener('cancel', (e) => {
  if (dialogKind === 'event' || (dialogKind === 'start' && !started)) e.preventDefault();
  else dialogKind = '';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) {
    running = false;
    persist();
    render();
  }
});
window.addEventListener('pagehide', persist);
shell();
applyMotion();
startDialog();
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const sequence = ++importSequence;
  try {
    if (file.size > 500000) throw new Error('Save files must be smaller than 500 KB.');
    const candidate = importSave(await file.text());
    if (sequence !== importSequence) return;
    s = candidate;
    started = true;
    running = false;
    selected = s.stations[0].id;
    mode = null;
    closeDialog();
    persist();
    render();
    toast('Factory restored. The shift is paused.');
    if (s.event) eventDialog();
    else if (s.status !== 'playing') reportDialog(true);
  } catch (error) {
    if (sequence === importSequence) toast(error.message || 'Could not import this save.');
  }
  if (sequence === importSequence) e.target.value = '';
});
setInterval(() => {
  const now = performance.now();
  const elapsed = Math.min(now - lastTime, 1000);
  lastTime = now;
  if (!running || $('#dialog').open || document.hidden) {
    accumulator = 0;
    return;
  }
  accumulator += elapsed * speed;
  if (accumulator >= 1000) {
    const hours = Math.min(4, Math.floor(accumulator / 1000));
    accumulator -= hours * 1000;
    advance(hours);
  }
}, 100);
