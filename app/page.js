"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import LeadForm from "../components/LeadForm";
import LeadTable from "../components/LeadTable";
import LeadDetail from "../components/LeadDetail";
import PropertyList from "../components/PropertyList";
import AuthGate from "../components/AuthGate";
import AIQualification from "../components/AIQualification";
import { initialLeads, initialProperties } from "../lib/mockData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { createLead, createSiteVisit, loadBusinessData, updateLeadRecord, createProperty, updatePropertyRecord, deletePropertyRecord, createConversation, saveConversationMessage, attachLeadToConversation } from "../lib/data";
import { getLeadScore } from "../lib/scoring";

function App() {
  const [leads, setLeads] = useState(isSupabaseConfigured ? [] : initialLeads);
  const [properties, setProperties] = useState(isSupabaseConfigured ? [] : initialProperties);
  const [selectedId, setSelectedId] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSelectedId(initialLeads[0]?.id ?? null);
      return;
    }

    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await loadBusinessData();
        if (!alive) return;
        setBusinessId(data.businessId);
        setLeads(data.leads);
        setProperties(data.properties);
        setSelectedId(data.leads[0]?.id ?? null);
      } catch (err) {
        if (alive) setError(err.message || "Could not load business data.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const selectedLead = leads.find((lead) => lead.id === selectedId);
  const stats = useMemo(() => ({
    hot: leads.filter((lead) => lead.score === "Hot").length,
    visits: leads.filter((lead) => lead.visit).length,
    followups: leads.filter((lead) => lead.nextFollowup).length,
  }), [leads]);

  async function addLead(lead) {
    setError("");
    try {
      const scoredLead = { ...lead, score: getLeadScore(lead, properties) };
      const saved = isSupabaseConfigured ? await createLead(businessId, scoredLead) : scoredLead;
      setLeads((prev) => [saved, ...prev]);
      setSelectedId(saved.id);
    } catch (err) {
      setError(err.message || "Could not add lead.");
    }
  }

  async function updateLead(id, changes) {
    setError("");
    try {
      if (isSupabaseConfigured) {
        await updateLeadRecord(id, changes);
        if (changes.visit) await createSiteVisit(businessId, id, changes.visit);
      }
      setLeads((prev) => prev.map((lead) => lead.id === id ? { ...lead, ...changes } : lead));
    } catch (err) {
      setError(err.message || "Could not update lead.");
    }
  }

  async function addAIQualifiedLead(lead, conversationId) {
    const scoredLead = { ...lead, score: getLeadScore(lead, properties) };
    const saved = isSupabaseConfigured ? await createLead(businessId, scoredLead) : { ...scoredLead, id: Date.now() };
    if (isSupabaseConfigured && conversationId) await attachLeadToConversation(conversationId, saved.id);
    setLeads((prev) => [saved, ...prev]);
    setSelectedId(saved.id);
    return saved;
  }

  async function startAIConversation() {
    if (!isSupabaseConfigured) return `demo-${Date.now()}`;
    return createConversation(businessId);
  }

  async function saveAIMessage(conversationId, role, text) {
    if (!isSupabaseConfigured || String(conversationId).startsWith("demo-")) return;
    return saveConversationMessage(businessId, conversationId, role, text);
  }

  async function addProperty(property) {
    setError("");
    try {
      const saved = isSupabaseConfigured ? await createProperty(businessId, property) : { ...property, id: Date.now() };
      setProperties((prev) => [saved, ...prev]);
    } catch (err) {
      setError(err.message || "Could not add property.");
    }
  }

  async function updateProperty(id, property) {
    setError("");
    try {
      const saved = isSupabaseConfigured ? await updatePropertyRecord(id, property) : { ...property, id };
      setProperties((prev) => prev.map((item) => item.id === id ? saved : item));
    } catch (err) {
      setError(err.message || "Could not update property.");
    }
  }

  async function deleteProperty(id) {
    const hasVisit = leads.some((lead) => lead.visit?.propertyId === id);
    if (hasVisit) {
      setError("This property is linked to a site visit. Keep it for now or change the visit first.");
      return;
    }
    if (!window.confirm("Delete this property from inventory?")) return;
    setError("");
    try {
      if (isSupabaseConfigured) await deletePropertyRecord(id);
      setProperties((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || "Could not delete property.");
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  if (loading) return <div className="center-screen">Loading your workspace…</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">RE</div><div><strong>RealtyFlow AI</strong><span>Sales assistant MVP</span></div></div>
        <nav>{["dashboard", "ai", "leads", "properties"].map((item) => <button key={item} className={view === item ? "nav-active" : ""} onClick={() => setView(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
        <div className="sidebar-note"><span>Current goal</span><strong>Convert more leads into site visits.</strong></div>
        {isSupabaseConfigured && <button className="sidebar-signout" onClick={signOut}>Sign out</button>}
      </aside>

      <main className="main">
        <header className="topbar">
          <div><p className="eyebrow">Real Estate AI Business Assistant</p><h1>{view === "dashboard" ? "Sales dashboard" : view === "ai" ? "AI qualification" : view === "leads" ? "Lead management" : "Property inventory"}</h1></div>
          <div className="demo-badge">{isSupabaseConfigured ? "Supabase connected" : "Demo · Mock data"}</div>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {!isSupabaseConfigured && <div className="setup-banner"><strong>Demo mode:</strong> add Supabase environment variables to enable login and persistent data.</div>}

        {view === "dashboard" && <>
          <section className="stats-grid"><StatCard label="Total leads" value={leads.length} helper="Current pipeline"/><StatCard label="Hot leads" value={stats.hot} helper="Prioritize today"/><StatCard label="Follow-ups" value={stats.followups} helper="Scheduled"/><StatCard label="Site visits" value={stats.visits} helper="Booked"/></section>
          <section className="two-col"><LeadTable leads={leads} selectedId={selectedId} onSelect={setSelectedId} onStatusChange={(id, status) => updateLead(id, { status })}/><LeadDetail lead={selectedLead} properties={properties} onUpdate={updateLead}/></section>
        </>}

        {view === "ai" && <AIQualification properties={properties} onQualifiedLead={addAIQualifiedLead} onStartConversation={startAIConversation} onSaveMessage={saveAIMessage} />}

        {view === "leads" && <>
          <section className="two-col form-layout"><LeadForm onAdd={addLead} properties={properties}/><LeadDetail lead={selectedLead} properties={properties} onUpdate={updateLead}/></section>
          <LeadTable leads={leads} selectedId={selectedId} onSelect={setSelectedId} onStatusChange={(id, status) => updateLead(id, { status })}/>
        </>}

        {view === "properties" && <PropertyList properties={properties} onAdd={addProperty} onUpdate={updateProperty} onDelete={deleteProperty}/>} 
      </main>
    </div>
  );
}

export default function Home() {
  if (!isSupabaseConfigured) return <App />;
  return <AuthGate><App /></AuthGate>;
}
