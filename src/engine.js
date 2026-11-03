import {
  VERSION,
  HOURS_PER_DAY,
  GRID,
  STAGES,
  STATIONS,
  WORKERS,
  SCENARIOS,
  CONTRACTS,
  NAMES,
  EVENTS,
} from './data.js';

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const day = (s) => Math.floor(s.clock / HOURS_PER_DAY) + 1;
export const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
export const copy = (x) => structuredClone(x);
export function seedNumber(text) {
  let hash = 2166136261;
  for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}
export function random(s) {
  let x = s.rng;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.rng = x >>> 0 || 1;
  return s.rng / 4294967296;
}
function log(s, text, kind = 'info') {
  s.log.unshift({ clock: s.clock, text, kind });
  s.log = s.log.slice(0, 50);
}
function station(id, type, x, y, worker) {
  return {
    id,
    type,
    x,
    y,
    worker,
    level: 1,
    wear: 0,
    policy: type === 'review' ? 'thorough' : 'balanced',
    busy: null,
    maintenance: 0,
    processed: 0,
  };
}
export function newGame(seed = 'HELLO-WORLD', scenario = 'garage') {
  seed = String(seed).trim().slice(0, 32) || 'HELLO-WORLD';
  if (!Object.hasOwn(SCENARIOS, scenario)) scenario = 'garage';
  const settings = SCENARIOS[scenario];
  const s = {
    version: VERSION,
    seed,
    scenario,
    rng: seedNumber(seed),
    clock: 0,
    cash: settings.cash,
    reputation: settings.reputation,
    debt: 0,
    status: 'playing',
    nextId: 20,
    delivered: 0,
    earned: 0,
    spent: 0,
    caught: 0,
    escaped: 0,
    stations: [
      station('s1', 'spec', 1, 1, 'w1'),
      station('s2', 'build', 3, 1, 'w2'),
      station('s3', 'review', 3, 3, 'w3'),
      station('s4', 'ship', 5, 3, 'w4'),
    ],
    workers: [
      { id: 'w1', type: 'maker', name: 'Alex' },
      { id: 'w2', type: 'agent', name: 'Patch' },
      { id: 'w3', type: 'specialist', name: 'Morgan' },
      { id: 'w4', type: 'maker', name: 'Riley' },
    ],
    jobs: [],
    offers: [],
    history: [],
    log: [],
    event: null,
    eventCount: 0,
    outageUntil: 0,
    nextEvent: 48,
    warranty: [],
    daily: [],
    stats: { busyHours: 0, staffedHours: 0, late: 0, cancelled: 0, accepted: 0 },
  };
  refillOffers(s);
  log(s, 'The lights are on. Your first four workstations and crew are ready.', 'good');
  return s;
}
function refillOffers(s) {
  while (s.offers.length < 4) {
    const available = CONTRACTS.map((_, i) => i).filter(
      (i) => !s.offers.some((o) => o.template === i),
    );
    const template = available[Math.floor(random(s) * available.length)];
    const def = CONTRACTS[template];
    s.offers.push({
      id: `c${s.nextId++}`,
      template,
      reward: def.reward + Math.floor(random(s) * 4) * 50,
      expires: s.clock + 32,
    });
  }
}
export const activeJobs = (s) => s.jobs.filter((j) => j.status !== 'done');
export const wages = (s) =>
  s.workers.reduce((total, w) => total + WORKERS[w.type].wage, 0) + 25 + s.stations.length * 4;
export function queueFor(s, type) {
  return s.jobs.filter((j) => j.status === 'queued' && j.stage === type);
}
export function goalProgress(s) {
  return SCENARIOS[s.scenario].goal ? Math.min(s.delivered / SCENARIOS[s.scenario].goal, 1) : 0;
}
export function stationSpeed(s, st) {
  const worker = s.workers.find((w) => w.id === st.worker);
  if (!worker || st.maintenance > 0 || (worker.type === 'agent' && s.clock < s.outageUntil))
    return 0;
  let speed = WORKERS[worker.type].speed * (1 + (st.level - 1) * 0.35);
  if (worker.type === 'specialist' && st.type === 'review') speed *= 1.65;
  if (worker.type === 'maker' && (st.type === 'spec' || st.type === 'ship')) speed *= 1.2;
  if (st.type === 'build') speed *= (st.policy === 'rush' ? 1.55 : 1) * (1 - s.debt / 160);
  if (st.type === 'review' && st.policy === 'thorough') speed *= 0.72;
  return Math.max(0.15, speed * (1 - st.wear / 180));
}
function result(ok, message) {
  return { ok, message };
}
function pay(s, amount) {
  s.cash -= amount;
  s.spent += amount;
}
function isCell(x, y) {
  return (
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < GRID.cols && y >= 0 && y < GRID.rows
  );
}
export function act(s, action) {
  if (s.status !== 'playing')
    return result(false, 'This run has ended. Start a new shift to keep building.');
  const st = s.stations.find((x) => x.id === action.id);
  if (s.event && action.type !== 'event')
    return result(false, 'Resolve the crew decision before changing the factory.');
  switch (action.type) {
    case 'accept': {
      const offer = s.offers.find((x) => x.id === action.id);
      if (!offer) return result(false, 'That contract is no longer available.');
      if (activeJobs(s).length >= 4)
        return result(false, 'Four active contracts is the limit. Finish a delivery first.');
      const def = CONTRACTS[offer.template];
      s.jobs.push({
        id: offer.id,
        template: offer.template,
        reward: offer.reward,
        deadline: s.clock + def.days * 8 - (s.scenario === 'crunch' ? 8 : 0),
        stage: 'spec',
        remaining: def.effort[0] * (s.scenario === 'crunch' ? 1.45 : 1),
        status: 'queued',
        defects: 0,
        ambiguity: def.ambiguity,
        reworks: 0,
        warranty: false,
        lastCell: [0, 1],
        readyAt: s.clock,
        started: s.clock,
      });
      s.offers = s.offers.filter((x) => x !== offer);
      s.stats.accepted++;
      log(s, `${def.name} signed on. ${money(offer.reward)} on delivery.`, 'good');
      return result(true, 'Contract accepted. Discovery will pick it up automatically.');
    }
    case 'build': {
      const def = Object.hasOwn(STATIONS, action.station) ? STATIONS[action.station] : null;
      if (!def || !isCell(action.x, action.y)) return result(false, 'Choose a valid floor tile.');
      if (s.stations.length >= 20)
        return result(false, 'The workshop has room for at most 20 stations.');
      if (s.stations.some((x) => x.x === action.x && x.y === action.y))
        return result(false, 'That tile is already occupied.');
      if (s.cash < def.cost)
        return result(false, `You need ${money(def.cost)} for that workstation.`);
      pay(s, def.cost);
      s.stations.push(station(`s${s.nextId++}`, action.station, action.x, action.y, null));
      log(s, `${def.name} installed. Assign a crew member to bring it online.`);
      return result(true, 'Workstation installed. Select it to assign crew.');
    }
    case 'hire': {
      const def = Object.hasOwn(WORKERS, action.worker) ? WORKERS[action.worker] : null;
      if (!def) return result(false, 'Unknown crew type.');
      if (s.workers.length >= 16) return result(false, 'Your crew is at its 16-member limit.');
      if (s.cash < def.cost) return result(false, `Hiring requires ${money(def.cost)}.`);
      pay(s, def.cost);
      const index = s.nextId++;
      s.workers.push({
        id: `w${index}`,
        type: action.worker,
        name: action.worker === 'agent' ? `Patch ${index}` : NAMES[index % NAMES.length],
      });
      return result(true, `${def.name} hired. Assign them to an idle workstation.`);
    }
    case 'assign': {
      if (!st || st.busy || st.maintenance)
        return result(false, 'Wait until the workstation is idle.');
      const worker = action.worker === '' ? null : s.workers.find((w) => w.id === action.worker);
      if (action.worker !== '' && !worker) return result(false, 'Choose an available crew member.');
      const previous = s.stations.find((x) => worker && x.worker === worker.id);
      if (previous && (previous.busy || previous.maintenance))
        return result(false, 'That crew member is finishing a job.');
      if (previous) previous.worker = null;
      st.worker = worker?.id || null;
      return result(
        true,
        worker ? `${worker.name} is on the station.` : 'Station is now unstaffed.',
      );
    }
    case 'move': {
      if (!st || st.busy || st.maintenance)
        return result(false, 'Only idle workstations can be moved.');
      if (
        !isCell(action.x, action.y) ||
        s.stations.some((x) => x.x === action.x && x.y === action.y)
      )
        return result(false, 'Choose an empty floor tile.');
      st.x = action.x;
      st.y = action.y;
      return result(true, 'Station moved. Shorter routes reduce transport time.');
    }
    case 'upgrade': {
      if (!st || st.level >= 3) return result(false, 'This workstation is already fully upgraded.');
      const price = st.level * 300;
      if (s.cash < price) return result(false, `Upgrade requires ${money(price)}.`);
      pay(s, price);
      st.level++;
      return result(true, 'Upgraded. Workstation throughput increased.');
    }
    case 'policy': {
      if (!st || !['build', 'review'].includes(st.type))
        return result(false, 'This workstation has no adjustable policy.');
      const allowed = st.type === 'build' ? ['balanced', 'rush'] : ['balanced', 'thorough'];
      if (!allowed.includes(action.policy)) return result(false, 'Unknown policy.');
      if (st.busy) return result(false, 'Finish the current job before changing its policy.');
      st.policy = action.policy;
      return result(true, 'Workstation policy updated.');
    }
    case 'maintain': {
      if (!st || st.busy || st.maintenance)
        return result(false, 'Maintenance needs an idle workstation.');
      if (s.cash < 100) return result(false, 'Maintenance costs $100.');
      pay(s, 100);
      st.maintenance = 4;
      return result(true, 'Maintenance started. Back online in 4 working hours.');
    }
    case 'sell': {
      if (!st || st.busy || st.maintenance)
        return result(false, 'Only idle workstations can be sold.');
      if (s.stations.filter((x) => x.type === st.type).length === 1)
        return result(false, 'Keep at least one workstation of each type.');
      s.cash += Math.floor(STATIONS[st.type].cost * 0.5);
      s.stations = s.stations.filter((x) => x !== st);
      return result(true, 'Workstation sold for half its base price. Crew returned to the bench.');
    }
    case 'release': {
      const worker = s.workers.find((w) => w.id === action.id);
      if (!worker) return result(false, 'Unknown crew member.');
      if (s.stations.some((x) => x.worker === worker.id))
        return result(false, 'Unassign this crew member before releasing them.');
      s.workers = s.workers.filter((x) => x !== worker);
      return result(true, 'Crew member released. Daily payroll reduced.');
    }
    case 'cancel': {
      const job = s.jobs.find((j) => j.id === action.id && !j.warranty);
      if (!job) return result(false, 'This job cannot be cancelled.');
      for (const station of s.stations) if (station.busy === job.id) station.busy = null;
      s.jobs = s.jobs.filter((j) => j !== job);
      s.reputation = clamp(s.reputation - 8, 0, 100);
      pay(s, 100);
      s.stats.cancelled++;
      log(
        s,
        `${CONTRACTS[job.template].name} contract cancelled. $100 fee and 8 reputation lost.`,
        'bad',
      );
      return result(true, 'Contract cancelled.');
    }
    case 'event':
      return resolveEvent(s, action.choice);
    default:
      return result(false, 'Unknown action.');
  }
}
function resolveEvent(s, choice) {
  if (!s.event || ![0, 1].includes(choice))
    return result(false, 'Choose one of the two responses.');
  const event = EVENTS.find((e) => e.key === s.event.key);
  const option = event.options[choice];
  if (s.cash < option.cost && option.cost > 0)
    return result(false, 'There is not enough cash for that response.');
  pay(s, option.cost);
  if (event.key === 'scope' && choice === 1) {
    const job = s.jobs.find((j) => !j.warranty);
    if (job) {
      job.remaining += 5;
      job.reward += 250;
      job.ambiguity = clamp(job.ambiguity + 0.15, 0, 1);
    } else {
      s.cash += 100;
      log(s, 'No active client needed a change. You completed a $100 support task.');
    }
  }
  if (event.key === 'outage' && choice === 1) s.outageUntil = s.clock + 8;
  if (event.key === 'refactor') {
    if (choice === 0) s.debt = Math.max(0, s.debt - 18);
    else {
      s.cash += 100;
      s.earned += 100;
    }
  }
  if (event.key === 'rush') {
    if (choice === 0) s.reputation = clamp(s.reputation + 5, 0, 100);
    else {
      s.cash += 300;
      s.earned += 300;
      s.debt = clamp(s.debt + 14, 0, 100);
    }
  }
  log(s, `${event.title} ${option.label}.`);
  s.event = null;
  return result(true, 'Decision made. The shift can continue.');
}
function enqueue(s, j, nextStage, st, rework = false) {
  j.stage = nextStage;
  j.status = 'queued';
  j.remaining =
    CONTRACTS[j.template].effort[STAGES.indexOf(nextStage)] *
    (rework ? 0.45 : 1) *
    (s.scenario === 'crunch' ? 1.45 : 1);
  j.lastCell = [st.x, st.y];
  j.readyAt = s.clock + 1;
}
function complete(s, st, j) {
  const worker = s.workers.find((w) => w.id === st.worker);
  const def = CONTRACTS[j.template];
  st.busy = null;
  st.processed++;
  if (st.type === 'spec') {
    j.ambiguity *= worker.type === 'maker' ? 0.2 : 0.55;
    enqueue(s, j, 'build', st);
  } else if (st.type === 'build') {
    const chance = clamp(
      1 -
        WORKERS[worker.type].reliability +
        j.ambiguity +
        s.debt / 250 +
        (st.policy === 'rush' ? 0.22 : 0),
      0.02,
      0.9,
    );
    j.defects = random(s) < chance ? 1 : 0;
    s.debt = clamp(s.debt + (st.policy === 'rush' ? 6 : 1.2), 0, 100);
    enqueue(s, j, 'review', st);
  } else if (st.type === 'review') {
    const chance = clamp(
      (st.policy === 'thorough' ? 0.92 : 0.58) + (worker.type === 'specialist' ? 0.07 : 0),
      0,
      0.99,
    );
    if (j.defects && random(s) < chance) {
      j.defects = 0;
      j.reworks++;
      s.caught++;
      log(s, `${def.name}: review caught a defect. A smaller repair returns to build.`, 'warn');
      enqueue(s, j, 'build', st, true);
    } else enqueue(s, j, 'ship', st);
  } else {
    if (j.warranty) {
      s.reputation = clamp(s.reputation + 3, 0, 100);
      log(s, `${def.name}: warranty repair delivered. Trust is recovering.`, 'good');
    } else {
      const late = s.clock > j.deadline;
      const payout = Math.floor(j.reward * (late ? 0.7 : 1));
      s.cash += payout;
      s.earned += payout;
      s.delivered++;
      s.reputation = clamp(s.reputation + (late ? -4 : 6), 0, 100);
      if (late) s.stats.late++;
      s.history.unshift({
        name: def.name,
        reward: payout,
        clock: s.clock,
        late,
        quality: j.defects ? 'pending' : 'clean',
      });
      s.history = s.history.slice(0, 100);
      log(
        s,
        `${def.name} shipped! ${money(payout)} received${late ? ' (late delivery deduction)' : ''}.`,
        'good',
      );
      if (j.defects) s.warranty.push({ template: j.template, due: s.clock + 12, origin: j.id });
    }
    s.jobs = s.jobs.filter((x) => x !== j);
  }
}
export function tick(s, count = 1) {
  for (let i = 0; i < count; i++) {
    if (s.status !== 'playing' || s.event) break;
    s.clock++;
    for (const repair of s.warranty.filter((w) => w.due <= s.clock)) {
      pay(s, 180);
      s.escaped++;
      s.reputation = clamp(s.reputation - 12, 0, 100);
      s.jobs.push({
        id: `j${s.nextId++}`,
        template: repair.template,
        reward: 0,
        deadline: s.clock + 40,
        stage: 'build',
        remaining: 5,
        status: 'queued',
        defects: 0,
        ambiguity: 0,
        reworks: 0,
        warranty: true,
        lastCell: [6, 3],
        readyAt: s.clock,
        started: s.clock,
      });
      log(
        s,
        `${CONTRACTS[repair.template].name} reported a bug. $180 support cost and a warranty repair.`,
        'bad',
      );
    }
    s.warranty = s.warranty.filter((w) => w.due > s.clock);
    for (const st of s.stations) {
      if (st.maintenance > 0) {
        st.maintenance--;
        if (st.maintenance === 0) {
          st.wear = 0;
          s.debt = Math.max(0, s.debt - 10);
          log(s, `${STATIONS[st.type].name} maintained. 10 debt removed.`, 'good');
        }
        continue;
      }
      const speed = stationSpeed(s, st);
      if (st.worker) s.stats.staffedHours++;
      if (speed <= 0) continue;
      if (!st.busy) {
        const job = s.jobs
          .filter((j) => j.status === 'queued' && j.stage === st.type && j.readyAt <= s.clock)
          .sort((a, b) => Number(b.warranty) - Number(a.warranty) || a.deadline - b.deadline)[0];
        if (job) {
          st.busy = job.id;
          job.status = 'working';
          const distance = Math.abs(job.lastCell[0] - st.x) + Math.abs(job.lastCell[1] - st.y);
          job.readyAt = s.clock + Math.max(1, Math.ceil(distance / 3));
        }
      }
      const job = s.jobs.find((j) => j.id === st.busy);
      if (job && job.readyAt <= s.clock) {
        s.stats.busyHours++;
        st.wear = clamp(st.wear + 0.65, 0, 100);
        job.remaining -= speed;
        if (job.remaining <= 0) complete(s, st, job);
      }
    }
    if (s.clock % 8 === 0) {
      pay(s, wages(s));
      s.daily.push({
        day: day(s) - 1,
        cash: s.cash,
        reputation: s.reputation,
        delivered: s.delivered,
      });
      s.daily = s.daily.slice(-90);
      if (s.cash < 500)
        log(s, `Cash is ${money(s.cash)}. Daily operating cost: ${money(wages(s))}.`, 'warn');
    }
    if (s.clock % 16 === 0) {
      s.offers = s.offers.filter((x) => x.expires > s.clock);
      refillOffers(s);
    }
    const settings = SCENARIOS[s.scenario];
    const accomplished =
      settings.goal > 0 &&
      s.delivered >= settings.goal &&
      s.reputation >= 45 &&
      s.cash >= 0 &&
      !s.jobs.length &&
      !s.warranty.length;
    if (settings.days && s.cash < -500) {
      s.status = 'lost';
      log(s, 'The runway ran out. Your next factory starts with everything you learned.', 'bad');
    } else if (accomplished) {
      s.status = 'won';
      log(s, 'A factory worth believing in. Campaign complete!', 'good');
    } else if (settings.days && s.clock >= settings.days * 8) {
      s.status = 'lost';
      log(s, 'The campaign deadline arrived before every goal was met.', 'bad');
    }
    if (s.status === 'playing' && s.clock >= s.nextEvent) {
      let event = EVENTS[s.eventCount % EVENTS.length];
      if (event.key === 'scope' && !s.jobs.some((j) => !j.warranty))
        event = EVENTS.find((e) => e.key === 'refactor');
      s.event = { key: event.key };
      s.eventCount++;
      s.nextEvent += 48;
    }
  }
  return s;
}
export function score(s) {
  return Math.max(
    0,
    Math.round(
      s.delivered * 1000 + s.reputation * 20 + s.cash * 0.2 - s.escaped * 250 - s.stats.late * 100,
    ),
  );
}

// Saves are untrusted input. Bound collections and validate all simulation references.
export function validateSave(input) {
  const fail = () => {
    throw new Error('This save is damaged or belongs to an unsupported version.');
  };
  if (
    !input ||
    typeof input !== 'object' ||
    input.version !== VERSION ||
    !Object.hasOwn(SCENARIOS, input.scenario)
  )
    fail();
  const s = copy(input);
  const num = (v, lo = 0, hi = 1e9) =>
    typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const str = (v, max = 100) => typeof v === 'string' && v.length <= max;
  const id = (v, prefix) =>
    typeof v === 'string' && new RegExp(`^[${prefix}][1-9][0-9]{0,8}$`).test(v);
  if (
    !str(s.seed, 32) ||
    !num(s.rng, 1, 4294967295) ||
    !Number.isInteger(s.rng) ||
    !num(s.clock, 0, 1e7) ||
    !Number.isInteger(s.clock) ||
    !num(s.cash, -1e9) ||
    !num(s.reputation, 0, 100) ||
    !num(s.debt, 0, 100)
  )
    fail();
  if (!['playing', 'won', 'lost'].includes(s.status)) fail();
  for (const key of [
    'nextId',
    'delivered',
    'earned',
    'spent',
    'caught',
    'escaped',
    'eventCount',
    'outageUntil',
    'nextEvent',
  ])
    if (!num(s[key])) fail();
  if (
    !Number.isInteger(s.nextId) ||
    s.nextId < 20 ||
    !Number.isInteger(s.nextEvent) ||
    !Number.isInteger(s.eventCount)
  )
    fail();
  const limits = {
    stations: 20,
    workers: 16,
    jobs: 50,
    offers: 4,
    history: 100,
    log: 50,
    warranty: 50,
    daily: 90,
  };
  for (const [key, limit] of Object.entries(limits))
    if (!Array.isArray(s[key]) || s[key].length > limit) fail();
  if (
    !s.stats ||
    ['busyHours', 'staffedHours', 'late', 'cancelled', 'accepted'].some((k) => !num(s.stats[k]))
  )
    fail();
  const unique = (arr) => new Set(arr.map((x) => x.id)).size === arr.length;
  if (![s.stations, s.workers, s.jobs, s.offers].every(unique)) fail();
  for (const w of s.workers)
    if (!id(w.id, 'w') || !str(w.name, 40) || !Object.hasOwn(WORKERS, w.type)) fail();
  const cells = new Set();
  const assignments = new Set();
  const busy = new Set();
  for (const st of s.stations) {
    if (
      !id(st.id, 's') ||
      !Object.hasOwn(STATIONS, st.type) ||
      !isCell(st.x, st.y) ||
      !num(st.level, 1, 3) ||
      !Number.isInteger(st.level) ||
      !num(st.wear, 0, 100) ||
      !num(st.maintenance, 0, 4) ||
      !Number.isInteger(st.maintenance) ||
      !num(st.processed) ||
      !(
        st.type === 'build'
          ? ['balanced', 'rush']
          : st.type === 'review'
            ? ['balanced', 'thorough']
            : ['balanced']
      ).includes(st.policy)
    )
      fail();
    const cell = `${st.x},${st.y}`;
    if (cells.has(cell)) fail();
    cells.add(cell);
    if (st.worker !== null) {
      if (!s.workers.some((w) => w.id === st.worker) || assignments.has(st.worker)) fail();
      assignments.add(st.worker);
    }
    if (st.busy !== null) {
      if (
        !s.jobs.some((j) => j.id === st.busy && j.stage === st.type && j.status === 'working') ||
        !st.worker ||
        busy.has(st.busy)
      )
        fail();
      busy.add(st.busy);
    }
  }
  if (STAGES.some((type) => !s.stations.some((st) => st.type === type))) fail();
  const template = (v) => Number.isInteger(v) && v >= 0 && v < CONTRACTS.length;
  for (const j of s.jobs) {
    if (
      !id(j.id, 'cj') ||
      !template(j.template) ||
      !STAGES.includes(j.stage) ||
      !['queued', 'working'].includes(j.status)
    )
      fail();
    if (j.status === 'working' && !busy.has(j.id)) fail();
    for (const k of ['reward', 'deadline', 'remaining', 'readyAt', 'started', 'reworks'])
      if (!num(j[k])) fail();
    if (
      !num(j.defects, 0, 1) ||
      !Number.isInteger(j.defects) ||
      !num(j.ambiguity, 0, 1) ||
      typeof j.warranty !== 'boolean' ||
      !Array.isArray(j.lastCell) ||
      j.lastCell.length !== 2 ||
      !isCell(...j.lastCell)
    )
      fail();
  }
  for (const o of s.offers)
    if (!id(o.id, 'c') || !template(o.template) || !num(o.reward) || !num(o.expires)) fail();
  for (const w of s.warranty)
    if (!template(w.template) || !num(w.due) || !id(w.origin, 'c')) fail();
  const allIds = [...s.stations, ...s.workers, ...s.jobs, ...s.offers].map((x) => x.id);
  if (new Set(allIds).size !== allIds.length || allIds.some((v) => Number(v.slice(1)) >= s.nextId))
    fail();
  for (const item of s.log)
    if (
      !num(item.clock) ||
      !str(item.text, 400) ||
      !['info', 'good', 'warn', 'bad'].includes(item.kind)
    )
      fail();
  for (const item of s.history)
    if (
      !str(item.name) ||
      !num(item.reward) ||
      !num(item.clock) ||
      typeof item.late !== 'boolean' ||
      !['pending', 'clean'].includes(item.quality)
    )
      fail();
  for (const item of s.daily)
    if (
      !num(item.day) ||
      !num(item.cash, -1e9) ||
      !num(item.reputation, 0, 100) ||
      !num(item.delivered)
    )
      fail();
  if (s.event !== null && (!s.event || !EVENTS.some((e) => e.key === s.event.key))) fail();
  return s;
}
export function exportSave(s) {
  return JSON.stringify({ format: 'ship-it-save', state: s }, null, 2);
}
export function importSave(text) {
  if (typeof text !== 'string' || text.length > 500000)
    throw new Error('Save files must be smaller than 500 KB.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (data?.format !== 'ship-it-save') throw new Error('Choose a Ship It! save file.');
  try {
    return validateSave(data.state);
  } catch {
    throw new Error(
      'This save is damaged or belongs to an unsupported version. Your current factory has not changed.',
    );
  }
}
