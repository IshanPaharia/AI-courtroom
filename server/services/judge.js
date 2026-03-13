import { JUDGE_PERSONAS } from '../prompts/judge-personas.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-4-maverick',
  'anthropic/claude-3.5-haiku',
];

async function callOpenRouter(model, messages) {
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
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${response.status} - ${err}`);
  }

  return response.json();
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

  const messages = [
    { role: 'system', content: judgePersona.system },
    { role: 'user', content: caseContext },
  ];

  const primaryModel = process.env.OPENROUTER_MODEL || FALLBACK_MODELS[0];
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError;
  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}`);
      const data = await callOpenRouter(model, messages);
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from model');
      }

      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.log(`Model ${model} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}
