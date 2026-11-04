export const VERSION = 2;
export const STUDIOS = {
  lean: {
    name: 'Bootstrappers',
    symbol: '$',
    color: '#b8f27c',
    motto: 'Small budget. Unreasonable ambition.',
    benefit: '15% lower crew wages.',
    description: 'Keep a longer runway and invest the savings in your next workstation.',
  },
  craft: {
    name: 'Craft Club',
    symbol: '✓',
    color: '#b9a0ff',
    motto: 'Ship something you would use.',
    benefit: '15% faster discovery. +4 points to defect detection.',
    description: 'A little more care at the start. A few fewer surprises at the end.',
  },
  express: {
    name: 'Night Owls',
    symbol: '↗',
    color: '#ffc974',
    motto: 'One more release before sunrise.',
    benefit: '25% faster shipping. Packages travel 4 tiles/hour.',
    description: 'Keep your releases moving and protect that on-time streak.',
  },
  classic: {
    name: 'Original crew',
    symbol: '·',
    color: '#79c9ff',
    motto: 'The garage that started it all.',
    benefit: 'Original v1.0 work rates.',
    description: 'Preserved for imported factories and classic challenges.',
  },
};
export const BADGES = {
  first: { name: 'Hello, world!', symbol: '01', description: 'Deliver your first paid contract.' },
  streak: {
    name: 'On a roll',
    symbol: '3×',
    description: 'Ship three contracts on time in a row.',
  },
  bugs: {
    name: 'Bug whisperer',
    symbol: '{}',
    description: 'Catch three defects before they reach customers.',
  },
  grow: {
    name: 'Need a bigger garage',
    symbol: '06',
    description: 'Operate six workstations at once.',
  },
  tidy: {
    name: 'Clean slate',
    symbol: '0%',
    description: 'Clear remaining technical debt with maintenance.',
  },
  finish: { name: 'Open for business', symbol: '★', description: 'Win a campaign.' },
};
export const HOURS_PER_DAY = 8;
export const GRID = { cols: 7, rows: 5 };
export const STAGES = ['spec', 'build', 'review', 'ship'];
export const STATIONS = {
  spec: {
    name: 'Discovery desk',
    short: 'Plan',
    label: 'SPEC',
    color: '#b9a0ff',
    cost: 350,
    description: 'Turn ambiguous requests into a buildable brief. Good discovery prevents defects.',
  },
  build: {
    name: 'Build bench',
    short: 'Build',
    label: 'BUILD',
    color: '#79c9ff',
    cost: 500,
    description: 'Write the software. Rush mode moves faster but creates debt and more defects.',
  },
  review: {
    name: 'Quality lab',
    short: 'Check',
    label: 'QA',
    color: '#ffc974',
    cost: 400,
    description:
      'Catch defects before customers do. Thorough review takes longer and catches more.',
  },
  ship: {
    name: 'Launch dock',
    short: 'Ship',
    label: 'SHIP',
    color: '#b8f27c',
    cost: 300,
    description: 'Package the release and deliver it. Revenue arrives only when a contract ships.',
  },
};
export const WORKERS = {
  maker: {
    name: 'Developer',
    cost: 150,
    wage: 28,
    speed: 1.3,
    reliability: 0.9,
    icon: 'DEV',
    description: 'Reliable all-rounder. Especially good at discovery and delivery.',
  },
  agent: {
    name: 'AI agent',
    cost: 200,
    wage: 18,
    speed: 2,
    reliability: 0.67,
    icon: 'AI',
    description: 'Fast builder, cheaper to run. Needs a good brief and careful review.',
  },
  specialist: {
    name: 'QA engineer',
    cost: 180,
    wage: 32,
    speed: 1.15,
    reliability: 0.97,
    icon: 'QA',
    description: 'Finds almost every defect. Works 65% faster in the quality lab.',
  },
};
export const SCENARIOS = {
  garage: {
    name: 'Garage days',
    subtitle: 'Your first factory',
    days: 30,
    cash: 3000,
    goal: 6,
    reputation: 55,
    description:
      'A furnished garage, a small crew, and 30 days to deliver six contracts. The best place to start.',
    difficulty: 'STANDARD',
  },
  crunch: {
    name: 'The Friday release',
    subtitle: 'Pressure makes bugs',
    days: 20,
    cash: 2400,
    goal: 7,
    reputation: 50,
    description:
      'Seven deliveries in 20 days, with 45% more work per stage. Upgrade wisely and keep the queues moving.',
    difficulty: 'CHALLENGING',
  },
  sandbox: {
    name: 'Open workshop',
    subtitle: 'Room to experiment',
    days: 0,
    cash: 9000,
    goal: 0,
    reputation: 65,
    description:
      'No deadline or campaign ending. Experiment with layouts, policies, and different crews.',
    difficulty: 'SANDBOX',
  },
};
export const CONTRACTS = [
  {
    name: 'Moonbeam Books',
    product: 'A cozy online bookstore',
    icon: 'BOOK',
    effort: [3, 11, 5, 2],
    reward: 1200,
    days: 9,
    ambiguity: 0.2,
  },
  {
    name: 'Clover Coffee',
    product: 'A loyalty card that actually works',
    icon: 'CAFE',
    effort: [2, 8, 4, 2],
    reward: 950,
    days: 7,
    ambiguity: 0.12,
  },
  {
    name: 'Orbit Bicycle Co.',
    product: 'Repairs, bookings, happy cyclists',
    icon: 'BIKE',
    effort: [4, 15, 6, 3],
    reward: 1650,
    days: 11,
    ambiguity: 0.25,
  },
  {
    name: 'Tiny Planet',
    product: 'A membership portal for a museum',
    icon: 'ART',
    effort: [4, 13, 6, 3],
    reward: 1500,
    days: 10,
    ambiguity: 0.28,
  },
  {
    name: 'Moss & Fern',
    product: 'A little shop for little plants',
    icon: 'LEAF',
    effort: [2, 9, 4, 2],
    reward: 1000,
    days: 8,
    ambiguity: 0.15,
  },
  {
    name: 'Sunday Market',
    product: 'A stall map and vendor directory',
    icon: 'MAP',
    effort: [3, 12, 5, 2],
    reward: 1350,
    days: 9,
    ambiguity: 0.2,
  },
  {
    name: 'Beacon Studio',
    product: 'A portfolio for local artists',
    icon: 'INK',
    effort: [3, 10, 4, 2],
    reward: 1100,
    days: 8,
    ambiguity: 0.18,
  },
  {
    name: 'Good Dog Club',
    product: 'Walks, bookings, and good dogs',
    icon: 'PAW',
    effort: [4, 14, 6, 3],
    reward: 1600,
    days: 10,
    ambiguity: 0.3,
  },
];
export const NAMES = [
  'Alex',
  'Morgan',
  'Patch',
  'Riley',
  'Sam',
  'Kit',
  'Robin',
  'Jules',
  'Scout',
  'Remy',
  'Ash',
  'Rowan',
  'Quinn',
  'Casey',
  'Lee',
  'Ari',
];
export const EVENTS = [
  {
    key: 'scope',
    title: '“One tiny change…”',
    description: 'A client wants a new feature halfway through the job.',
    options: [
      { label: 'Clarify the scope', detail: 'Spend $120. Keep the original plan.', cost: 120 },
      { label: 'Squeeze it in', detail: 'Add build work and $250 to the contract.', cost: 0 },
    ],
  },
  {
    key: 'outage',
    title: 'The dependency is down',
    description: 'The service behind your AI tools has gone quiet.',
    options: [
      { label: 'Use a local fallback', detail: 'Spend $180. Keep production moving.', cost: 180 },
      { label: 'Wait it out', detail: 'AI agents pause for 8 working hours.', cost: 0 },
    ],
  },
  {
    key: 'refactor',
    title: 'A quieter afternoon',
    description: 'Your crew spots a chance to simplify the machinery.',
    options: [
      { label: 'Invest in cleanup', detail: 'Spend $150. Remove 18 technical debt.', cost: 150 },
      { label: 'Keep the momentum', detail: 'Receive $100 for a small support job.', cost: 0 },
    ],
  },
  {
    key: 'rush',
    title: 'An offer with a catch',
    description: 'A customer offers a bonus if the team skips the careful bit.',
    options: [
      { label: 'Protect the process', detail: 'Gain 5 reputation. Stay the course.', cost: 0 },
      { label: 'Take the shortcut', detail: 'Receive $300. Add 14 technical debt.', cost: 0 },
    ],
  },
];
