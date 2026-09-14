"use client";

import { useMemo, useState } from "react";
import { isPropertyMatch } from "../lib/scoring";

const greeting = {
  role: "assistant",
  text: "Hi! I can help with your property requirement. Tell me what you're looking for — location, budget, or property type is a good place to start."
};

function valueOrDash(value) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

export default function AIQualification({ properties, onQualifiedLead, onSaveMessage, onStartConversation }) {
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState("");
  const [leadDraft, setLeadDraft] = useState({});
  const [conversationId, setConversationId] = useState(null);
  const [savedLead, setSavedLead] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const draftForMatch = useMemo(() => ({
    budget: leadDraft.budgetLakh || 0,
    location: leadDraft.preferredLocation || "",
    propertyType: leadDraft.propertyType || "",
    bhk: leadDraft.bhk || ""
  }), [leadDraft]);

  const matches = useMemo(
    () => properties.filter((property) => isPropertyMatch(draftForMatch, property)).slice(0, 3),
    [draftForMatch, properties]
  );

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const id = await onStartConversation();
    setConversationId(id);
    return id;
  }

  async function send(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError("");
    setInput("");
    setSending(true);

    try {
      const convId = await ensureConversation();
      const userMessage = { role: "user", text };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      await onSaveMessage(convId, "user", text);

      const response = await fetch("/api/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, properties })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI qualification failed.");

      const assistantMessage = { role: "assistant", text: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);
      setLeadDraft(data.lead || {});
      await onSaveMessage(convId, "assistant", data.reply);

      if (data.complete && !savedLead) {
        const lead = await onQualifiedLead({
          name: data.lead.name,
          phone: data.lead.phone,
          source: "AI Chat",
          budget: data.lead.budgetLakh,
          location: data.lead.preferredLocation,
          propertyType: data.lead.propertyType,
          bhk: data.lead.bhk,
          timeline: data.lead.buyingTimeline,
          financing: data.lead.financing,
          status: "Qualified",
          salesperson: "Unassigned",
          nextFollowup: ""
        }, convId);
        setSavedLead(lead);
      }
    } catch (err) {
      setError(err.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    setMessages([greeting]);
    setInput("");
    setLeadDraft({});
    setConversationId(null);
    setSavedLead(null);
    setError("");
  }

  return (
    <div className="ai-layout">
      <section className="panel chat-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Buyer-facing AI</p><h2>Lead qualification chat</h2></div>
          <button className="secondary-button" type="button" onClick={newChat}>New chat</button>
        </div>

        <div className="chat-window">
          {messages.map((message, index) => (
            <div key={index} className={`chat-row ${message.role}`}>
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))}
          {sending && <div className="chat-row assistant"><div className="chat-bubble typing">Thinking…</div></div>}
        </div>

        {error && <div className="error-banner chat-error">{error}</div>}

        <form className="chat-composer" onSubmit={send}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Example: I need a 3 BHK in Sector 79 around ₹60 lakh"
            disabled={sending || !!savedLead}
          />
          <button className="primary" type="submit" disabled={sending || !!savedLead}>Send</button>
        </form>
        {savedLead && <div className="success-banner"><strong>Qualified lead saved.</strong> It is now visible in Leads and Dashboard.</div>}
      </section>

      <aside className="panel qualification-panel">
        <div className="panel-heading"><div><p className="eyebrow">Live extraction</p><h2>Buyer profile</h2></div></div>
        <div className="qualification-grid">
          <div><span>Name</span><strong>{valueOrDash(leadDraft.name)}</strong></div>
          <div><span>Phone</span><strong>{valueOrDash(leadDraft.phone)}</strong></div>
          <div><span>Budget</span><strong>{leadDraft.budgetLakh ? `₹${leadDraft.budgetLakh}L` : "—"}</strong></div>
          <div><span>Location</span><strong>{valueOrDash(leadDraft.preferredLocation)}</strong></div>
          <div><span>Property</span><strong>{valueOrDash(leadDraft.propertyType)}</strong></div>
          <div><span>Requirement</span><strong>{valueOrDash(leadDraft.bhk)}</strong></div>
          <div><span>Timeline</span><strong>{valueOrDash(leadDraft.buyingTimeline)}</strong></div>
          <div><span>Financing</span><strong>{valueOrDash(leadDraft.financing)}</strong></div>
        </div>

        <div className="section">
          <div className="section-title"><h3>Live property matches</h3><span className="muted">{matches.length} found</span></div>
          <div className="match-list">
            {matches.length ? matches.map((property) => (
              <div className="match-card" key={property.id}>
                <div><strong>{property.project}</strong><p>{property.location} · {property.bhk}</p></div>
                <span>₹{property.priceMin}–{property.priceMax}L</span>
              </div>
            )) : <p className="muted">Matches appear as the buyer shares requirements.</p>}
          </div>
        </div>

        <div className="agent-note">
          <strong>Agent boundary</strong>
          <p>This MVP qualifies and matches leads. It does not promise discounts, legal status, loan approval, or investment returns.</p>
        </div>
      </aside>
    </div>
  );
}
