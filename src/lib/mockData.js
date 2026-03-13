export const JUDGE_PERSONAS = [
  { id: 'strict', name: 'Strict Judge', emoji: '👨‍⚖️', description: 'By the book. No nonsense.' },
  { id: 'chill', name: 'Chill Judge', emoji: '😎', description: 'Laid back. Vibes-based justice.' },
  { id: 'dramatic', name: 'Drama Queen', emoji: '🎭', description: 'Soap opera energy. Maximum drama.' },
  { id: 'pirate', name: 'Pirate Judge', emoji: '🏴‍☠️', description: 'Arrr! Maritime law applies.' },
];

export const CASE_STATUSES = {
  pending_defendant: { label: 'Awaiting Defendant', color: 'court-gold' },
  opening_statements: { label: 'Opening Statements', color: 'court-blue' },
  rebuttals: { label: 'Rebuttals', color: 'court-blue' },
  closing_arguments: { label: 'Closing Arguments', color: 'court-blue' },
  judging: { label: 'Judge Deliberating', color: 'court-gold' },
  verdict_delivered: { label: 'Verdict Delivered', color: 'court-green' },
  appealed: { label: 'Under Appeal', color: 'court-red' },
};

export const MOCK_USERS = {
  u1: { id: 'u1', username: 'Alex', avatar_url: null, wins: 5, losses: 2 },
  u2: { id: 'u2', username: 'Jordan', avatar_url: null, wins: 3, losses: 4 },
  u3: { id: 'u3', username: 'Sam', avatar_url: null, wins: 7, losses: 1 },
};

export const MOCK_CASES = [
  {
    id: 'c1',
    title: 'The Case of the Stolen Leftovers',
    description: 'Alex claims Jordan ate their clearly labeled pasta from the shared fridge.',
    plaintiff: MOCK_USERS.u1,
    defendant: MOCK_USERS.u2,
    requested_compensation: 'Buy me a whole new pasta dinner + dessert',
    judge_persona: 'dramatic',
    status: 'opening_statements',
    created_at: '2026-03-10T14:30:00Z',
    rounds_completed: 1,
    total_rounds: 3,
  },
  {
    id: 'c2',
    title: 'Who Picks the Movie Tonight?',
    description: 'Sam insists it\'s their turn to pick the movie but Jordan disagrees.',
    plaintiff: MOCK_USERS.u3,
    defendant: MOCK_USERS.u2,
    requested_compensation: 'Movie pick rights for the next 3 weekends',
    judge_persona: 'chill',
    status: 'verdict_delivered',
    created_at: '2026-03-08T19:00:00Z',
    verdict: {
      winner: 'plaintiff',
      reasoning: 'After reviewing the movie night log, it is indeed Sam\'s turn. Jordan had the last two picks.',
      compensation: 'Sam picks tonight AND next weekend. Jordan gets snack duty.',
      drama_score: 4,
      notable_quote: 'The sacred movie night rotation must be respected.',
    },
    rounds_completed: 3,
    total_rounds: 3,
  },
  {
    id: 'c3',
    title: 'The Thermostat War',
    description: 'Alex keeps setting the thermostat to 72°F. Jordan wants it at 68°F.',
    plaintiff: MOCK_USERS.u2,
    defendant: MOCK_USERS.u1,
    requested_compensation: 'Thermostat control for the entire month + a blanket apology',
    judge_persona: 'strict',
    status: 'pending_defendant',
    created_at: '2026-03-13T10:00:00Z',
    rounds_completed: 0,
    total_rounds: 3,
  },
  {
    id: 'c4',
    title: 'Dishwashing Duty Dispute',
    description: 'Sam claims they have done dishes 5 days in a row while Jordan has done zero.',
    plaintiff: MOCK_USERS.u3,
    defendant: MOCK_USERS.u2,
    requested_compensation: 'Jordan does dishes for 2 full weeks',
    judge_persona: 'pirate',
    status: 'rebuttals',
    created_at: '2026-03-11T08:15:00Z',
    rounds_completed: 2,
    total_rounds: 3,
  },
];

export const MOCK_ARGUMENTS = {
  c1: [
    {
      id: 'a1',
      case_id: 'c1',
      user_id: 'u1',
      side: 'plaintiff',
      round_number: 1,
      content: 'Your Honor, on Tuesday evening I placed my clearly labeled container of homemade pesto pasta in the fridge. The label read "ALEX\'S - DO NOT EAT" in red marker. By Wednesday morning, it was gone. Only one other person had access to the fridge that night.',
      is_objection: false,
      created_at: '2026-03-10T15:00:00Z',
    },
    {
      id: 'a2',
      case_id: 'c1',
      user_id: 'u2',
      side: 'defendant',
      round_number: 1,
      content: 'Your Honor, I acknowledge the pasta was delicious -- I mean, present in the fridge. However, the label had fallen off and was found on the floor. I believed it was communal food left over from our dinner party the night before. This was an honest mistake.',
      is_objection: false,
      created_at: '2026-03-10T16:30:00Z',
    },
  ],
};
