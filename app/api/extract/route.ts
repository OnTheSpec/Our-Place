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

const urgentLanguage = /(?:fell|can't get up|cannot get up|chest pain|can't breathe|cannot breathe|suicid|overdose|fire)/i;

export async function POST(request: Request) {
  const body = await request.json() as { answers?: string[] };
  if (!Array.isArray(body.answers) || body.answers.some((answer) => typeof answer !== "string") || body.answers.join(" ").length > 6000) {
    return Response.json({ error: "Three short answers are required." }, { status: 400 });
  }

  const transcript = body.answers.join("\n");
  if (urgentLanguage.test(transcript)) {
    return Response.json({ safety_level: "urgent", summary: "Evelyn may need immediate human help.", tone: "Needs attention", items: [], action: "Show the emergency screen and contact a trusted person or local emergency services now." });
  }

  if (!process.env.OPENAI_API_KEY) return Response.json(demoExtraction());

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
      instructions: "You turn an older adult's check-in into a warm, factual family update. Use only supplied facts. Never diagnose, evaluate, praise, or tell the person how they should feel. Write one tentative person-centered reflection beginning with 'It sounds like' or 'You seem to be saying' and preserve uncertainty. The reflection must be easy for the speaker to correct. A possible_concern must be cautious and quote-grounded. Keep the summary under 70 words. Do not infer mood from silence.",
      input: transcript,
      text: { format: { type: "json_schema", name: "check_in_extraction", strict: true, schema } },
    }),
  });
  if (!upstream.ok) return Response.json({ error: "The check-in could not be processed." }, { status: 502 });
  const result = await upstream.json() as { output_text?: string };
  if (!result.output_text) return Response.json({ error: "No extraction returned." }, { status: 502 });
  return Response.json(JSON.parse(result.output_text));
}

function demoExtraction() {
  return {
    summary: "Evelyn said the sunshine felt lovely. While watering her tomatoes, she remembered painting a blue porch swing with Frank.", reflection: "It sounds like the sunshine left you feeling a little lighter, and that Frank’s memory felt close today.", tone: "Warm and reflective", safety_level: "routine",
    items: [
      { kind: "life_update", title: "A sunny day", detail: "Watered her tomatoes.", source_quote: "The sunshine has been lovely." },
      { kind: "memory", title: "The blue porch swing", detail: "Evelyn and Frank painted their porch swing blue.", source_quote: "the blue porch swing Frank and I painted" },
      { kind: "request", title: "Pick up milk", detail: "Evelyn is almost out of milk.", source_quote: "I'm almost out of milk" },
      { kind: "request", title: "Check the kitchen light", detail: "The light keeps flickering.", source_quote: "the kitchen light keeps flickering" },
    ],
  };
}
