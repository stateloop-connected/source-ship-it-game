import { STUDIOS, BADGES } from './data.js';
import { money } from './engine.js';
import { esc } from './floor.js';

export function studioChoices(selected) {
  return `<div class="studio-heading"><span class="eyebrow">PICK YOUR STUDIO PERSONALITY</span><span>One specialty. Plenty of ways to win.</span></div><div class="studio-choices">${Object.entries(
    STUDIOS,
  )
    .filter(([key]) => key !== 'classic' || selected === key)
    .map(
      ([key, d]) =>
        `<button class="studio-choice ${selected === key ? 'chosen' : ''}" data-action="studio" data-studio="${key}" aria-pressed="${selected === key}" style="--studio:${d.color}"><span class="studio-symbol">${d.symbol}</span><strong>${d.name}</strong><small>${d.benefit}</small></button>`,
    )
    .join('')}</div>`;
}

export function momentum(s) {
  const d = STUDIOS[s.studio];
  const remaining = Math.max(0, s.boostUntil - s.clock - 1);
  const cooldown = Math.max(0, s.boostReadyAt - s.clock);
  return `<div class="momentum-bar" style="--studio:${d.color}"><div class="studio-identity" title="${d.benefit}"><span class="studio-symbol">${d.symbol}</span><div><small>YOUR STUDIO</small><strong>${d.name}</strong></div></div><div class="streak-meter" title="Late deliveries and warranty claims reset the streak."><small>ON-TIME STREAK <b>${s.streak}</b></small><div class="streak-dots">${Array.from({ length: 5 }, (_, i) => `<i class="${s.streak > i ? 'lit' : ''}"></i>`).join('')}</div><span>Next on-time bonus: ${money(Math.min(s.streak, 4) * 50)}</span></div><button class="coffee-button ${remaining ? 'brewing' : ''}" data-action="coffee" data-focus="coffee" ${cooldown || s.cash < 80 || s.status !== 'playing' ? 'disabled' : ''} title="+35% throughput for four working hours. Available every 16 hours."><span aria-hidden="true">☕</span><strong>${remaining ? `Buzzing · ${remaining}h left` : cooldown ? `Coffee in ${cooldown}h` : 'Coffee run · $80'}</strong><small>${remaining ? '+35% throughput' : 'A little liquid ambition'}</small></button><button class="trophy-button" data-action="trophies" data-focus="trophies" aria-label="Trophy shelf, ${s.badges.length} of 6 unlocked"><span aria-hidden="true">★</span><strong>${s.badges.length}/6</strong></button></div>`;
}

export function trophyCards(s) {
  return `<div class="trophy-grid">${Object.entries(BADGES)
    .map(
      ([key, d]) =>
        `<article class="trophy-card ${s.badges.includes(key) ? 'unlocked' : ''}"><span class="trophy-medal">${d.symbol}</span><small>${s.badges.includes(key) ? 'EARNED THIS RUN' : 'STILL TO CHASE'}</small><h3>${d.name}</h3><p>${d.description}</p></article>`,
    )
    .join('')}</div>`;
}

export function crewLine(s) {
  if (s.boostUntil > s.clock + 1) return 'Patch: “My coffee has a dependency on more coffee.”';
  if (s.debt > 25) return 'QA: “The technical debt has started receiving mail here.”';
  if (s.streak >= 3) return 'Crew: “Same team. Different league.”';
  if (!s.jobs.length) return 'Patch: “I organized the cables. We need a contract.”';
  return [
    'QA: “It works on my machine is not a release strategy.”',
    'Patch: “Compiling. Please admire the conveyor belt.”',
    'Crew: “Small team. Suspiciously large ambitions.”',
    'QA: “A bug caught here is a weekend saved.”',
  ][Math.floor(s.clock / 8) % 4];
}

let celebrationTimer;
export function celebrate(s) {
  document.querySelector('.shipping-celebration')?.remove();
  clearTimeout(celebrationTimer);
  const h = s.history[0];
  if (!h) return;
  const el = document.createElement('div');
  el.className = 'shipping-celebration';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="delivery-stamp">SHIPPED!</span><strong>${esc(h.name)}</strong><span>${money(h.reward)} received${s.streak > 1 ? ` · ${s.streak} on time in a row` : ''}</span>${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--confetti:${['#b8f27c', '#b9a0ff', '#ffc974'][i % 3]}"></i>`).join('')}`;
  document.body.append(el);
  celebrationTimer = setTimeout(() => el.remove(), 3800);
}
