# RealtyFlow AI — v0.4 AI Qualification

This version adds the first real AI-agent workflow to the working Supabase MVP.

## What works

- Supabase authentication + persistent business workspace
- Persistent leads, properties and site visits
- Lead scoring and deterministic property matching
- Real property add/edit/delete
- **AI buyer qualification chat**
- AI extracts name, phone, budget, location, property type, BHK, timeline and financing
- AI asks one missing question at a time
- Qualified leads are automatically saved to Supabase
- Conversation messages are saved to Supabase
- Property matches appear live as requirements are collected
- Qualified lead appears in Leads and Dashboard

## Important: run the v0.4 database migration

Because you already have the earlier Supabase schema installed:

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Open `supabase/migration-v4.sql` from this project.
4. Copy all SQL from that file into Supabase.
5. Click **Run**.

This adds `conversations` and `conversation_messages` without deleting your existing leads or properties.

## Add the OpenAI API key

Keep your existing Supabase values in `.env.local` and add:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-luna
```

Do **not** use `NEXT_PUBLIC_` on the OpenAI key. The key must stay server-side.

After changing `.env.local`, restart the app:

```bash
npm run dev
```

## Test the agent

Open **AI** in the left sidebar. Try a natural conversation such as:

> I am looking for a 3 BHK apartment in Sector 79 Gurgaon. My budget is around 95 lakh and I want to buy this month.

The assistant should ask only for missing information such as your name, phone and financing. When qualification is complete, the lead is automatically saved.

## Architecture in v0.4

Buyer chat → `/api/qualify` server route → OpenAI Responses API → structured lead JSON → deterministic score/property matching → Supabase lead + conversation storage.

The OpenAI API key never goes to the browser.

## Current boundary

This is a signed-in internal MVP that simulates the buyer experience. It is not yet a public website/WhatsApp endpoint. Public anonymous lead capture will need a server-side ingestion endpoint with abuse controls before launch.

## Next stage

- Public lead-capture chat widget
- Salesperson handoff notifications
- WhatsApp Cloud API
- Follow-up scheduling engine
- Conversation history screen
