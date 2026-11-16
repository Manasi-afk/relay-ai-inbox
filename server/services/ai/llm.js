// Thin LLM client: Anthropic (Claude) or Google Gemini, chosen by env vars.
import { config, aiProvider } from '../../config.js';

export async function callLLM({ system, user, maxTokens = 1200, temperature = 0.2 }) {
  if (aiProvider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.ai.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.ai.anthropicModel,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data.content.map((c) => c.text || '').join('');
  }

  if (aiProvider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.geminiModel}:generateContent?key=${config.ai.geminiKey}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  }

  throw new Error('No LLM provider configured');
}

export const engineName = () =>
  aiProvider === 'anthropic' ? `claude:${config.ai.anthropicModel}` : aiProvider === 'gemini' ? `gemini:${config.ai.geminiModel}` : 'rules';
