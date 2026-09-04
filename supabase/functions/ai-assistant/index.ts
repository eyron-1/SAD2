import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const SYSTEM_PROMPTS: Record<string, string> = {
  report_draft:
    'You are an expert AI assistant to a Philippine barangay official. Draft clear, formal, executive-ready report text ' +
    'from the notes and figures the official gives you. Use plain, professional English or ' +
    'Filipino (match the official\'s language). Never invent figures — if a number is missing, ' +
    'say so explicitly instead of guessing.',
  inquiry:
    'You are a legal & governance advisor to a Philippine barangay official. Answer questions about barangay ' +
    'governance, budgeting rules (e.g. IRA utilization, 20% Development Fund, SK 10% allocation, RA 7160 Local Government Code), ' +
    'and this system\'s own data when given as context. Be concise, accurate, and professional.',
  budget_forecast:
    'You are a financial planning analyst for a Philippine barangay. Given historical allocation ' +
    'and expense figures, produce a reasoned forecast with explicit assumptions. State your assumptions ' +
    'clearly and show the arithmetic.',
  accomplishment_report:
    'You are an executive assistant drafting an accomplishment report tying completed programs to their ' +
    'financial data (budget vs. actual spend, beneficiaries reached). Write in a formal register suitable ' +
    'for submission to the Sangguniang Barangay or DILG audit.',
};

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { mode, messages, context, apiKey: clientApiKey } = await req.json();
    console.log('Request received for Groq AI. mode:', mode, 'messages count:', messages?.length);

    if (!mode || !SYSTEM_PROMPTS[mode]) {
      return new Response(JSON.stringify({ error: 'Invalid or missing mode.' }), { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required.' }), { status: 400, headers: corsHeaders });
    }

    const apiKey = clientApiKey || Deno.env.get('GROQ_API_KEY') || Deno.env.get('GROCK_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY is missing on the server. Please enter your Groq API Key in the UI settings.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const systemText = SYSTEM_PROMPTS[mode] + (context ? `\n\nData context (from this barangay's records):\n${JSON.stringify(context).slice(0, 8000)}` : '');

    const groqMessages = [
      { role: 'system', content: systemText },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      let friendly = errText;
      try {
        const parsed = JSON.parse(errText);
        friendly = parsed?.error?.message || errText;
      } catch (_) { /* raw */ }

      if (groqRes.status === 401) {
        friendly = 'The Groq API key is invalid or expired. Check your GROQ_API_KEY in settings.';
      } else if (groqRes.status === 429) {
        friendly = 'Groq rate limit reached — please try again in a few seconds.';
      }

      return new Response(JSON.stringify({ error: friendly }), { status: 502, headers: corsHeaders });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      return new Response(JSON.stringify({ error: 'Groq API returned an empty response.' }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err: any) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});