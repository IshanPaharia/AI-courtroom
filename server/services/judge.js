import { JUDGE_PERSONAS } from '../prompts/judge-personas.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-4-maverick',
  'anthropic/claude-3.5-haiku',
];

async function callOpenRouter(model, messages, maxTokens = 1000) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'AI Courtroom',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${response.status} - ${err}`);
  }

  return response.json();
}

function parseJSON(content) {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

async function callWithFallback(messages, maxTokens = 1000) {
  const primaryModel = process.env.OPENROUTER_MODEL || FALLBACK_MODELS[0];
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError;
  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}`);
      const data = await callOpenRouter(model, messages, maxTokens);
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from model');
      return parseJSON(content);
    } catch (err) {
      console.log(`Model ${model} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

export async function getVerdict({ caseData, arguments: args, persona = 'strict' }) {
  const judgePersona = JUDGE_PERSONAS[persona] || JUDGE_PERSONAS.strict;

  const caseContext = `
CASE: "${caseData.title}"

PLAINTIFF'S COMPLAINT:
${caseData.description}

REQUESTED COMPENSATION:
${caseData.requestedCompensation}

--- ARGUMENTS ---
${args
  .sort((a, b) => a.roundNumber - b.roundNumber || new Date(a.createdAt) - new Date(b.createdAt))
  .map(
    (a) =>
      `[Round ${a.roundNumber}] ${a.side.toUpperCase()}${a.isObjection ? ' (OBJECTION)' : ''}:\n${a.content}`
  )
  .join('\n\n')}
--- END OF ARGUMENTS ---

Now deliver your verdict.`;

  return callWithFallback([
    { role: 'system', content: judgePersona.verdict || judgePersona.system },
    { role: 'user', content: caseContext },
  ]);
}

export async function getJudgeInterjection({ caseData, chatMessages, persona = 'strict', forceVerdict = false }) {
  const judgePersona = JUDGE_PERSONAS[persona] || JUDGE_PERSONAS.strict;

  const plaintiffName = caseData.plaintiffName || 'Plaintiff';
  const defendantName = caseData.defendantName || 'Defendant';

  const chatLog = chatMessages
    .map((m) => {
      const name = m.sender === 'plaintiff' ? plaintiffName
        : m.sender === 'defendant' ? defendantName
        : 'Judge';
      const prefix = m.type === 'warning' ? '[WARNING] '
        : m.type === 'timeout' ? '[TIMEOUT] '
        : m.type === 'comment' ? '[JUDGE] '
        : '';
      const attachment = m.attachmentUrl ? ` [Evidence attached: ${m.attachmentType || 'file'}]` : '';
      return `${prefix}${name}: ${m.content}${attachment}`;
    })
    .join('\n');

  const plaintiffCount = chatMessages.filter((m) => m.sender === 'plaintiff').length;
  const defendantCount = chatMessages.filter((m) => m.sender === 'defendant').length;

  const context = `
CASE: "${caseData.title}"
PLAINTIFF (${plaintiffName})'s COMPLAINT: ${caseData.description}
REQUESTED COMPENSATION: ${caseData.requestedCompensation}

--- LIVE COURTROOM CHAT ---
${chatLog}
--- END OF CHAT ---

Total messages from ${plaintiffName} (plaintiff): ${plaintiffCount}
Total messages from ${defendantName} (defendant): ${defendantCount}

${(() => {
  if (forceVerdict) {
    return 'BOTH PARTIES HAVE UNANIMOUSLY REQUESTED AN IMMEDIATE VERDICT. You MUST deliver your verdict NOW based on everything presented so far. Respond with type "verdict" only.';
  }
  if (plaintiffCount + defendantCount >= 8) {
    return 'The discussion has gone on long enough. Deliver your verdict NOW.';
  }
  if (plaintiffCount >= 2 && defendantCount >= 2) {
    return 'Both sides have presented their arguments. You should deliver your verdict now unless critical information is clearly missing.';
  }
  return 'Review the conversation and decide your next action.';
})()}`;

  return callWithFallback([
    { role: 'system', content: judgePersona.realtime },
    { role: 'user', content: context },
  ], 800);
}
