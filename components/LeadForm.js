"use client";

import { useState } from "react";
import { getLeadScore } from "../lib/scoring";

const emptyForm = {
  name: "",
  phone: "",
  source: "Website",
  budget: "",
  location: "",
  propertyType: "Apartment",
  bhk: "2 BHK",
  timeline: "1-3 months",
  financing: "Home loan",
  salesperson: "Unassigned"
};

export default function LeadForm({ onAdd, properties = [] }) {
  const [form, setForm] = useState(emptyForm);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.budget) return;

    const lead = {
      ...form,
      id: Date.now(),
      budget: Number(form.budget),
      status: "New",
      nextFollowup: "",
      visit: null
    };

    lead.score = getLeadScore(lead, properties);
    onAdd(lead);
    setForm(emptyForm);
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <div className="panel-heading">
        <div><p className="eyebrow">Lead capture</p><h2>Add new lead</h2></div>
      </div>

      <label>Name<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Rahul Sharma" /></label>
      <label>Phone<input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91..." /></label>
      <label>Source<select value={form.source} onChange={(e) => update("source", e.target.value)}><option>Website</option><option>Meta Ads</option><option>WhatsApp</option><option>99acres</option><option>MagicBricks</option><option>Manual</option></select></label>
      <label>Budget (₹ lakh)<input type="number" value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="90" /></label>
      <label className="wide">Preferred location<input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Sector 79, Gurugram" /></label>
      <label>Property type<select value={form.propertyType} onChange={(e) => update("propertyType", e.target.value)}><option>Apartment</option><option>Plot</option><option>Villa</option><option>Commercial</option></select></label>
      <label>Requirement<select value={form.bhk} onChange={(e) => update("bhk", e.target.value)}><option>1 BHK</option><option>2 BHK</option><option>3 BHK</option><option>4 BHK</option><option>Not applicable</option></select></label>
      <label>Buying timeline<select value={form.timeline} onChange={(e) => update("timeline", e.target.value)}><option>Within 30 days</option><option>1-3 months</option><option>3-6 months</option><option>Just exploring</option></select></label>
      <label>Financing<select value={form.financing} onChange={(e) => update("financing", e.target.value)}><option>Home loan</option><option>Self-funded</option><option>Not decided</option></select></label>
      <label className="wide">Salesperson<select value={form.salesperson} onChange={(e) => update("salesperson", e.target.value)}><option>Unassigned</option><option>Aman</option><option>Priya</option></select></label>
      <button className="primary wide" type="submit">Add lead</button>
    </form>
  );
}
