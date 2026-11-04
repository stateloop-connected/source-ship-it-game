import test from 'node:test';
import assert from 'node:assert/strict';
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);
import {
  newGame,
  act,
  tick,
  wages,
  stationSpeed,
  transportHours,
  validateSave,
  exportSave,
  importSave,
} from '../src/engine.js';

test('studio specialties change their promised economics and stages only', () => {
  const classic = newGame('PERKS', 'garage', 'classic');
  const lean = newGame('PERKS', 'garage', 'lean');
  const craft = newGame('PERKS', 'garage', 'craft');
  const express = newGame('PERKS', 'garage', 'express');
  assert.ok(wages(lean) < wages(classic));
  close(stationSpeed(craft, craft.stations[0]), stationSpeed(classic, classic.stations[0]) * 1.15);
  close(
    stationSpeed(express, express.stations[3]),
    stationSpeed(classic, classic.stations[3]) * 1.25,
  );
  assert.equal(stationSpeed(craft, craft.stations[1]), stationSpeed(classic, classic.stations[1]));
  assert.equal(transportHours(express, 4), 1);
  assert.equal(transportHours(classic, 4), 2);
});

test('coffee costs cash, boosts four processing ticks, and survives save roundtrips', () => {
  const s = newGame();
  const base = stationSpeed(s, s.stations[0]);
  assert.equal(act(s, { type: 'coffee' }).ok, true);
  assert.equal(s.cash, 2920);
  assert.equal(act(s, { type: 'coffee' }).ok, false);
  assert.deepEqual(importSave(exportSave(s)), s);
  for (let hour = 1; hour <= 4; hour++) {
    tick(s);
    close(stationSpeed(s, s.stations[0]), base * 1.35);
  }
  tick(s);
  assert.equal(stationSpeed(s, s.stations[0]), base);
  tick(s, 11);
  assert.equal(act(s, { type: 'coffee' }).ok, true);
  const poor = newGame();
  poor.cash = 79;
  assert.equal(act(poor, { type: 'coffee' }).ok, false);
});

function deliver(s, late = false, defect = false) {
  assert.equal(act(s, { type: 'accept', id: s.offers[0].id }).ok, true);
  const j = s.jobs.at(-1),
    st = s.stations[3];
  Object.assign(j, {
    stage: 'ship',
    status: 'working',
    remaining: 0.01,
    readyAt: s.clock,
    deadline: late ? s.clock : s.clock + 100,
    defects: defect ? 1 : 0,
  });
  st.busy = j.id;
  tick(s);
}

test('shipping streaks pay increasing bonuses and late shipments reset them', () => {
  const s = newGame('STREAK', 'sandbox');
  deliver(s);
  deliver(s);
  deliver(s);
  assert.equal(s.streak, 3);
  assert.equal(s.comboBonus, 150);
  assert.deepEqual(s.badges, ['first', 'streak']);
  deliver(s, true);
  assert.equal(s.streak, 0);
  assert.equal(s.bestStreak, 3);
  assert.equal(s.comboBonus, 150);
  assert.deepEqual(validateSave(s), s);
});

test('warranty claims break a streak, while earned trophies remain', () => {
  const s = newGame('WARRANTY', 'sandbox');
  deliver(s, false, true);
  deliver(s);
  deliver(s);
  tick(s, 10);
  assert.equal(s.escaped, 1);
  assert.equal(s.streak, 0);
  assert.ok(s.badges.includes('streak'));
});

test('expansion and maintenance unlock each trophy once', () => {
  const s = newGame('TROPHIES', 'sandbox');
  act(s, { type: 'build', station: 'spec', x: 0, y: 0 });
  act(s, { type: 'build', station: 'build', x: 1, y: 0 });
  assert.ok(s.badges.includes('grow'));
  s.debt = 6;
  act(s, { type: 'maintain', id: 's1' });
  tick(s, 4);
  assert.ok(s.badges.includes('tidy'));
  s.debt = 3;
  act(s, { type: 'maintain', id: 's1' });
  tick(s, 4);
  assert.equal(s.badges.filter((b) => b === 'tidy').length, 1);
});

test('v1 saves migrate without changing cash, layout, jobs, or random state', () => {
  const old = newGame('LEGACY', 'garage', 'classic');
  act(old, { type: 'accept', id: old.offers[0].id });
  tick(old, 5);
  old.version = 1;
  for (const key of [
    'studio',
    'streak',
    'bestStreak',
    'comboBonus',
    'boostUntil',
    'boostReadyAt',
    'badges',
  ])
    delete old[key];
  const migrated = validateSave(old);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.studio, 'classic');
  for (const key of Object.keys(old).filter((k) => k !== 'version'))
    assert.deepEqual(migrated[key], old[key]);
  assert.deepEqual(migrated.badges, []);
});

test('new save fields reject invalid studios, trophies, streaks and timers', () => {
  for (const patch of [
    { studio: '__proto__' },
    { badges: ['first', 'first'] },
    { badges: ['fake'] },
    { streak: 2 },
    { boostUntil: 20, boostReadyAt: 10 },
    { comboBonus: -1 },
  ]) {
    assert.throws(() => validateSave(Object.assign(newGame(), patch)));
  }
});
