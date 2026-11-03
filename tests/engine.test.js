import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  tick,
  act,
  exportSave,
  importSave,
  validateSave,
  wages,
  stationSpeed,
  seedNumber,
  score,
} from '../src/engine.js';
import { STATIONS } from '../src/data.js';

function accept(s, n = 1) {
  for (let i = 0; i < n; i++) {
    const offer = s.offers[0];
    if (offer) act(s, { type: 'accept', id: offer.id });
  }
}
function resolve(s) {
  if (s.event) act(s, { type: 'event', choice: s.event.key === 'rush' ? 0 : s.cash > 500 ? 0 : 1 });
}
function campaign(seed, scenario = 'garage') {
  const s = newGame(seed, scenario);
  for (let i = 0; i < 500 && s.status === 'playing'; i++) {
    resolve(s);
    const goal = scenario === 'crunch' ? 7 : 6;
    while (
      s.jobs.filter((j) => !j.warranty).length < 2 &&
      s.stats.accepted < goal &&
      s.offers.length
    )
      accept(s);
    tick(s);
  }
  return s;
}
test('the same seed, scenario, and actions produce identical runs', () => {
  assert.deepEqual(campaign('SAME-SEED'), campaign('SAME-SEED'));
  assert.notDeepEqual(newGame('ONE').offers, newGame('TWO').offers);
  assert.equal(seedNumber('hello'), seedNumber('hello'));
});
test('new factories have one of every stage and a fully assigned crew', () => {
  const s = newGame();
  assert.equal(s.stations.length, 4);
  assert.equal(s.workers.length, 4);
  assert.equal(new Set(s.stations.map((x) => x.worker)).size, 4);
  assert.deepEqual(new Set(s.stations.map((x) => x.type)), new Set(Object.keys(STATIONS)));
  assert.equal(s.cash, 3000);
  assert.equal(s.clock, 0);
  assert.equal(s.offers.length, 4);
  assert.equal(new Set(s.offers.map((o) => o.template)).size, 4);
});
test('save IDs and dictionary keys cannot inject HTML or access object prototypes', () => {
  const s = newGame();
  for (const mutate of [
    (x) => (x.scenario = 'constructor'),
    (x) => (x.stations[0].id = 's1" onclick="alert(1)'),
    (x) => (x.workers[0].type = 'toString'),
    (x) => (x.nextId = 20.5),
    (x) => (x.stations[0].policy = 'rush'),
    (x) => (x.stations[0].maintenance = 0.5),
  ]) {
    const bad = structuredClone(s);
    mutate(bad);
    assert.throws(() => validateSave(bad));
  }
  assert.equal(newGame('SAFE', 'constructor').scenario, 'garage');
  assert.equal(act(s, { type: 'build', station: '__proto__', x: 0, y: 0 }).ok, false);
});
test('acceptance gives no revenue; only a completed delivery pays', () => {
  const s = newGame('PAYMENT');
  accept(s);
  assert.equal(s.cash, 3000);
  assert.equal(s.delivered, 0);
  for (let i = 0; i < 100 && !s.delivered; i++) {
    resolve(s);
    tick(s);
  }
  assert.equal(s.delivered, 1);
  assert.ok(s.earned > 0);
  assert.ok(s.history.length);
});
test('payroll and rent are charged every eight working hours', () => {
  const s = newGame();
  const cost = wages(s);
  tick(s, 7);
  assert.equal(s.cash, 3000);
  tick(s);
  assert.equal(s.cash, 3000 - cost);
  assert.equal(s.daily.length, 1);
});
test('new workstations need staff and cannot overwrite an occupied tile', () => {
  const s = newGame();
  assert.equal(act(s, { type: 'build', station: 'build', x: 3, y: 1 }).ok, false);
  assert.equal(s.cash, 3000);
  assert.equal(act(s, { type: 'build', station: 'build', x: 4, y: 1 }).ok, true);
  const station = s.stations.at(-1);
  assert.equal(stationSpeed(s, station), 0);
  assert.equal(act(s, { type: 'hire', worker: 'agent' }).ok, true);
  assert.equal(act(s, { type: 'assign', id: station.id, worker: s.workers.at(-1).id }).ok, true);
  assert.ok(stationSpeed(s, station) > 0);
});
test('capacity, bounds, money, and required stages constrain construction', () => {
  const s = newGame();
  accept(s, 4);
  s.offers.push({ id: 'extra', template: 0, reward: 100, expires: 30 });
  assert.equal(act(s, { type: 'accept', id: 'extra' }).ok, false);
  assert.equal(act(s, { type: 'build', station: 'build', x: -1, y: 0 }).ok, false);
  assert.equal(act(s, { type: 'build', station: 'build', x: 2.5, y: 0 }).ok, false);
  assert.equal(act(s, { type: 'sell', id: 's1' }).ok, false);
  s.cash = 0;
  assert.equal(act(s, { type: 'hire', worker: 'maker' }).ok, false);
});
test('busy crew cannot be moved, removed, or switched to a new policy', () => {
  const s = newGame();
  accept(s);
  tick(s);
  const st = s.stations.find((x) => x.busy);
  assert.ok(st);
  assert.equal(act(s, { type: 'assign', id: st.id, worker: '' }).ok, false);
  assert.equal(act(s, { type: 'assign', id: 's4', worker: st.worker }).ok, false);
  assert.equal(act(s, { type: 'move', id: st.id, x: 0, y: 0 }).ok, false);
  assert.equal(act(s, { type: 'release', id: st.worker }).ok, false);
});
test('distance creates real transit delay', () => {
  const near = newGame('DISTANCE'),
    far = newGame('DISTANCE');
  near.stations[0].x = 0;
  near.stations[0].y = 0;
  far.stations[0].x = 6;
  far.stations[0].y = 4;
  accept(near);
  accept(far);
  tick(near);
  tick(far);
  assert.ok(far.jobs[0].readyAt > near.jobs[0].readyAt);
});
test('maintenance spends cash, resets wear, and removes debt after four hours', () => {
  const s = newGame();
  s.debt = 30;
  s.stations[1].wear = 70;
  assert.equal(act(s, { type: 'maintain', id: 's2' }).ok, true);
  tick(s, 3);
  assert.equal(s.stations[1].maintenance, 1);
  assert.equal(s.debt, 30);
  tick(s);
  assert.equal(s.debt, 20);
  assert.equal(s.stations[1].wear, 0);
  assert.equal(s.cash, 2900);
});
test('event decisions stop time and cannot be silently skipped', () => {
  const s = newGame();
  tick(s, 48);
  assert.ok(s.event);
  const clock = s.clock;
  tick(s, 100);
  assert.equal(s.clock, clock);
  assert.equal(act(s, { type: 'hire', worker: 'agent' }).ok, false);
  assert.equal(act(s, { type: 'event', choice: 3 }).ok, false);
  assert.equal(act(s, { type: 'event', choice: 0 }).ok, true);
  tick(s);
  assert.equal(s.clock, clock + 1);
});
test('dependency outage stops agents while humans continue', () => {
  const s = newGame();
  s.event = { key: 'outage' };
  act(s, { type: 'event', choice: 1 });
  assert.equal(stationSpeed(s, s.stations[1]), 0);
  assert.ok(stationSpeed(s, s.stations[0]) > 0);
  tick(s, 8);
  assert.ok(stationSpeed(s, s.stations[1]) > 0);
});
test('escaped defects create unpaid warranty work and reputational damage', () => {
  const s = newGame();
  s.warranty.push({ template: 0, origin: 'old', due: 1 });
  const cash = s.cash,
    rep = s.reputation;
  tick(s);
  assert.equal(s.escaped, 1);
  assert.equal(s.cash, cash - 180);
  assert.equal(s.reputation, rep - 12);
  assert.equal(s.jobs[0].warranty, true);
  assert.equal(s.jobs[0].reward, 0);
});
test('cancellation releases an occupied station and charges the penalty', () => {
  const s = newGame();
  accept(s);
  tick(s);
  const id = s.jobs[0].id;
  act(s, { type: 'cancel', id });
  assert.equal(s.jobs.length, 0);
  assert.equal(s.stations[0].busy, null);
  assert.equal(s.cash, 2900);
  assert.equal(s.reputation, 47);
});
test('save restores the exact RNG and simulation state, including an active job', () => {
  const s = newGame('SAVE');
  accept(s, 2);
  tick(s, 9);
  const restored = importSave(exportSave(s));
  assert.deepEqual(restored, s);
  tick(s, 20);
  tick(restored, 20);
  assert.deepEqual(restored, s);
});
test('malformed and oversized saves are rejected without affecting the current run', () => {
  const s = newGame('ORIGINAL');
  const before = structuredClone(s);
  assert.throws(() => importSave('{broken'));
  assert.throws(() => importSave('a'.repeat(500001)));
  for (const mutate of [
    (x) => (x.version = 900),
    (x) => (x.cash = null),
    (x) => (x.rng = 0),
    (x) => (x.stations[0].worker = 'missing'),
    (x) => (x.stations[1].x = x.stations[0].x),
    (x) => (x.jobs = new Array(51).fill({})),
    (x) => (x.reputation = Infinity),
    (x) => (x.stations[0].busy = 'ghost'),
    (x) => (x.event = { key: 'hacked' }),
  ]) {
    const bad = structuredClone(s);
    mutate(bad);
    assert.throws(() => validateSave(bad));
  }
  assert.deepEqual(s, before);
});
test('campaign deadline and insolvency produce a loss; sandbox remains open', () => {
  const s = newGame();
  s.clock = 239;
  s.cash = 1000;
  tick(s);
  assert.equal(s.status, 'lost');
  const broke = newGame();
  broke.cash = -501;
  tick(broke);
  assert.equal(broke.status, 'lost');
  const sandbox = newGame('SANDBOX', 'sandbox');
  sandbox.cash = -600;
  sandbox.clock = 500;
  tick(sandbox);
  assert.equal(sandbox.status, 'playing');
});
test('victory requires completed deliveries, cash, reputation and no pending obligations', () => {
  const s = newGame();
  s.delivered = 6;
  s.cash = 1000;
  s.reputation = 60;
  s.warranty.push({ template: 0, origin: 'past', due: 50 });
  tick(s);
  assert.equal(s.status, 'playing');
  s.warranty = [];
  tick(s);
  assert.equal(s.status, 'won');
  const clock = s.clock;
  tick(s, 10);
  assert.equal(s.clock, clock);
  assert.equal(act(s, { type: 'hire', worker: 'agent' }).ok, false);
  assert.ok(score(s) > 0);
});
test('garage campaign is winnable across 30 seeds with a simple conservative strategy', () => {
  const results = Array.from({ length: 30 }, (_, i) => campaign(`BALANCE-${i}`));
  const wins = results.filter((s) => s.status === 'won');
  assert.ok(
    wins.length >= 27,
    `Only ${wins.length}/30 wins. ${JSON.stringify(results.filter((s) => s.status !== 'won').map((s) => ({ seed: s.seed, cash: s.cash, delivered: s.delivered, reputation: s.reputation, jobs: s.jobs.length })))}`,
  );
  for (const s of results) assert.doesNotThrow(() => validateSave(s));
});
