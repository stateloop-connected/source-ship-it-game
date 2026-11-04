import { SCENARIOS } from './data.js';

export function nextStep(s, running) {
  const goal = SCENARIOS[s.scenario].goal;
  if (s.status !== 'playing')
    return {
      title: s.status === 'won' ? 'You did it!' : 'Try another factory.',
      text: 'Open your report to see how you did.',
      action: 'report',
      label: 'See results',
    };
  if (s.event)
    return {
      title: 'Your team needs a decision.',
      text: 'Choose an option in the message to continue.',
    };
  const blocked = s.stations.some(
    (st) =>
      !st.worker &&
      s.jobs.some((j) => j.stage === st.type) &&
      !s.stations.some((other) => other.type === st.type && other.worker),
  );
  if (blocked)
    return {
      title: 'A workstation needs a teammate.',
      text: 'Open the controls, select the empty station, and assign someone to it.',
      action: 'manage',
      label: 'Manage team',
    };
  if (!s.jobs.length && !s.warranty.length && (!goal || s.delivered < goal)) {
    return s.offers.length
      ? {
          title: s.delivered ? 'Paid! Pick your next job.' : 'Pick a job.',
          text: s.delivered
            ? `You have shipped ${s.delivered}${goal ? ` of ${goal}` : ''} jobs. Choose another from New jobs.`
            : 'Your team is already hired. Choose a job to give them something to make.',
          action: 'browse',
          label: 'Choose a job',
        }
      : {
          title: 'Wait for new jobs.',
          text: 'New jobs arrive every two game days.',
          ...(!running ? { action: 'play', label: 'Play' } : {}),
        };
  }
  if (!running)
    return {
      title: 'Press Play.',
      text: 'Your team plans, builds, checks, and ships the work automatically. You can pause any time.',
      action: 'play',
      label: 'Play',
    };
  if (!s.jobs.length && s.warranty.length)
    return {
      title: 'Let customers check their delivery.',
      text: 'Keep time running until the final checks finish. Your team handles any repairs.',
    };
  if (!s.jobs.length && goal && s.delivered >= goal)
    return {
      title: 'Check what is left to finish.',
      text: 'Winning also needs $0 or more, 45 reputation, and no unfinished jobs or repairs.',
      action: 'report',
      label: 'See results',
    };
  if (s.stats.accepted === 1 && !s.delivered)
    return {
      title: 'Your first job is underway.',
      text: 'We picked your first job and started the team for you. Watch it move through Plan, Build, Check, and Ship. You can pause any time.',
    };
  return {
    title: 'Your team is working.',
    text: 'Watch the job move along the four steps below. You get paid when it ships. No clicking is needed.',
  };
}
