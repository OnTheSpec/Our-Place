const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "reflection", "tone", "items", "safety_level"],
  properties: {
    summary: { type: "string" },
    reflection: { type: "string" },
    tone: { type: "string" },
    safety_level: { type: "string", enum: ["routine", "concern", "urgent"] },
    items: { type: "array", items: { type: "object", additionalProperties: false, required: ["kind", "title", "detail", "source_quote"], properties: {
      kind: { type: "string", enum: ["life_update", "memory", "request", "possible_concern"] },
      title: { type: "string" }, detail: { type: "string" }, source_quote: { type: "string" },
    }}},
  },
};

const urgentLanguagePatterns = [
  /\b(?:i\s+(?:fell|have\s+fallen)|i['’]?ve\s+fallen)\s+(?:down\s+)?(?:and|,)\s+(?:i\s+)?(?:cannot|can['’]?t)\s+(?:get|stand)\s+up\b/i,
  /\b(?:i(?:\s+am|['’]m)\s+)?having\s+(?:a\s+)?heart\s+attack\b/i,
  /\bchest\s+pain\b/i,
  /\b(?:cannot|can['’]t)\s+breathe\b/i,
  /\bi(?:\s+am|['’]m)\s+suicidal\b/i,
  /\b(?:i\s+(?:have\s+)?)?suicidal\s+(?:thoughts?|intent|plans?|urges?)\b/i,
  /\b(?:i\s+)?(?:want|plan|intend|going)\s+to\s+(?:kill|hurt)\s+myself\b/i,
  /\b(?:i\s+)?(?:will|might)\s+kill\s+myself\b/i,
  /\bend\s+my\s+(?:own\s+)?life\b/i,
  /\boverdos(?:e|ed|ing)\b/i,
  /\b(?:my|the|our|a)\s+(?:home|house|apartment|room|bedroom|kitchen|living\s+room)\s+(?:is\s+)?(?:on\s+fire|burning)\b/i,
  /\b(?:there(?:\s+is|['’]s)|i\s+have|we\s+have)\s+(?:an?\s+)?(?:actual\s+)?fire\s+(?:inside|in)\s+(?:(?:my|the|our|a)\s+)?(?:home|house|apartment|room|bedroom|kitchen|living\s+room)\b/i,
  /\b(?:a|the)\s+fire\s+is\s+burning\s+(?:inside|in)\s+(?:(?:my|the|our|a)\s+)?(?:home|house|apartment|room|bedroom|kitchen|living\s+room)\b/i,
];

function hasUrgentLanguage(transcript: string) {
  return urgentLanguagePatterns.some((pattern) => pattern.test(transcript));
}
const maxAnswerLength = 600;
const demoAnswers = [
  "I’m feeling pretty good today. The sunshine has been lovely.",
  "I watered my tomatoes and remembered the blue porch swing Frank and I painted.",
  "I’m almost out of milk, and the kitchen light keeps flickering.",
];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Three short answers are required." }, { status: 400 });
  }

  const answers = body && typeof body === "object" ? (body as { answers?: unknown }).answers : undefined;
  if (!Array.isArray(answers) || answers.length !== 3 || answers.some((answer) => typeof answer !== "string" || answer.trim().length === 0 || answer.length > maxAnswerLength)) {
    return Response.json({ error: "Three non-empty short answers are required." }, { status: 400 });
  }

  const transcript = answers.join("\n");
  if (hasUrgentLanguage(transcript)) {
    return Response.json({ safety_level: "urgent", summary: "Evelyn may need immediate human help.", tone: "Needs attention", items: [], action: "Show the emergency screen and contact a trusted person or local emergency services now." });
  }

  if (!process.env.OPENAI_API_KEY) {
    const isExactDemo = answers.every((answer, index) => answer === demoAnswers[index]);
    return Response.json(isExactDemo ? demoExtraction() : groundedExtraction(answers));
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
      instructions: "You turn an older adult's check-in into a warm, factual family update. Use only supplied facts. Never diagnose, evaluate, praise, interpret, or tell the person how they should feel. Write one brief Rogerian, person-centered reflection that stays close to the speaker's own language and named feelings. Communicate empathic understanding and unconditional acceptance without claiming certainty. Do not infer an emotion, cause, need, or meaning the speaker did not express. Phrase the reflection tentatively and make it easy to correct. A possible_concern must be cautious and quote-grounded. Keep the summary under 70 words. Do not infer mood from silence.",
      input: transcript,
      text: { format: { type: "json_schema", name: "check_in_extraction", strict: true, schema } },
    }),
  });
  if (!upstream.ok) return Response.json({ error: "The check-in could not be processed." }, { status: 502 });
  const result = await upstream.json() as { output_text?: string };
  if (!result.output_text) return Response.json({ error: "No extraction returned." }, { status: 502 });
  return Response.json(JSON.parse(result.output_text));
}

function groundedExtraction(answers: string[]) {
  const ownWords = answers.map((answer) => answer.trim()).join(" ");
  const excerpt = ownWords.length > 420 ? `${ownWords.slice(0, 419).trimEnd()}…` : ownWords;
  return {
    summary: `Evelyn shared: “${excerpt}”`,
    reflection: `You shared: “${excerpt}” I’m keeping this close to the words you chose, without adding another meaning.`,
    tone: "In Evelyn’s own words",
    safety_level: "routine",
    items: [],
  };
}

function demoExtraction() {
  return {
    summary: "Evelyn said the sunshine felt lovely. While watering her tomatoes, she remembered painting a blue porch swing with Frank.", reflection: "You’re feeling pretty good today, and the sunshine has felt lovely. As you watered the tomatoes, you remembered the blue porch swing you painted with Frank.", tone: "In Evelyn’s own words", safety_level: "routine",
    items: [
      { kind: "life_update", title: "A sunny day", detail: "Watered her tomatoes.", source_quote: "The sunshine has been lovely." },
      { kind: "memory", title: "The blue porch swing", detail: "Evelyn and Frank painted their porch swing blue.", source_quote: "the blue porch swing Frank and I painted" },
      { kind: "request", title: "Pick up milk", detail: "Evelyn is almost out of milk.", source_quote: "I’m almost out of milk" },
      { kind: "request", title: "Check the kitchen light", detail: "The light keeps flickering.", source_quote: "the kitchen light keeps flickering" },
    ],
  };
}
