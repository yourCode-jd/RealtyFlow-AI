export const runtime = "nodejs";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    complete: { type: "boolean" },
    lead: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        budgetLakh: { type: ["number", "null"] },
        preferredLocation: { type: ["string", "null"] },
        propertyType: { type: ["string", "null"] },
        bhk: { type: ["string", "null"] },
        buyingTimeline: { type: ["string", "null"] },
        financing: { type: ["string", "null"] }
      },
      required: ["name", "phone", "budgetLakh", "preferredLocation", "propertyType", "bhk", "buyingTimeline", "financing"]
    }
  },
  required: ["reply", "complete", "lead"]
};

function responseText(data) {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text;
  for (const item of data.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing. Add it to .env.local and restart npm run dev." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-18) : [];
    const properties = Array.isArray(body.properties) ? body.properties.slice(0, 40) : [];

    const propertyContext = properties.map((p) => ({
      project: p.project,
      location: p.location,
      priceMinLakh: p.priceMin,
      priceMaxLakh: p.priceMax,
      propertyType: p.type,
      bhk: p.bhk,
      possession: p.possession
    }));

    const instructions = `You are the buyer-facing qualification assistant for an Indian real-estate sales team.
Your job is to naturally collect a buyer's requirements and produce structured lead data.

Rules:
- Be concise, warm, and professional. Use simple Indian English. If the buyer uses Hindi/Hinglish, you may reply naturally in Hinglish.
- Ask at most ONE important missing question per turn.
- Never invent a field the buyer has not provided. Keep unknown values null.
- Extract lakh amounts correctly: “55 lakh” => 55; “1 crore” => 100; “1.2 cr” => 120.
- Normalize propertyType to one of: Apartment, Plot, Villa, Commercial, when possible.
- Normalize bhk to one of: 1 BHK, 2 BHK, 3 BHK, 4 BHK, Not applicable, when possible. For Plot or Commercial, use Not applicable unless the user explicitly gives a relevant BHK requirement.
- Normalize buyingTimeline to one of: Within 30 days, 1-3 months, 3-6 months, Just exploring.
- Normalize financing to one of: Home loan, Self-funded, Not decided.
- Do NOT promise availability, pricing, discounts, legal status, loan approval, or investment returns.
- Inventory is context only. Never invent a property that is not listed.
- complete=true only when you know: name, phone, budget, preferred location, property type, buying timeline, and financing; and bhk is known or not applicable.
- When complete=true, summarize the requirement in the reply and say a sales advisor can take it forward. Do not ask another question.

Available inventory (may be empty):\n${JSON.stringify(propertyContext)}`;

    const input = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: String(m.text || "") }]
    }));

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        reasoning: { effort: "low" },
        instructions,
        input,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "real_estate_lead_qualification",
            strict: true,
            schema
          }
        }
      })
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      return Response.json({ error: data?.error?.message || "OpenAI request failed." }, { status: apiResponse.status });
    }

    const text = responseText(data);
    if (!text) return Response.json({ error: "The AI returned no usable response." }, { status: 502 });

    const parsed = JSON.parse(text);
    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: error.message || "Qualification failed." }, { status: 500 });
  }
}
