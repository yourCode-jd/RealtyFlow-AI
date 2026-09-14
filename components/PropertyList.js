"use client";

import { useState } from "react";

const blank = {
  project: "",
  location: "",
  priceMin: "",
  priceMax: "",
  bhk: "2 BHK",
  type: "Apartment",
  possession: "Ready to Move",
};

export default function PropertyList({ properties, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);

  function change(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(blank);
    setEditingId(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.project.trim() || !form.location.trim() || !form.priceMin || !form.priceMax) return;
    const property = { ...form, priceMin: Number(form.priceMin), priceMax: Number(form.priceMax) };
    if (editingId) await onUpdate(editingId, property);
    else await onAdd(property);
    reset();
  }

  function startEdit(property) {
    setEditingId(property.id);
    setForm({
      project: property.project,
      location: property.location,
      priceMin: property.priceMin,
      priceMax: property.priceMax,
      bhk: property.bhk || "2 BHK",
      type: property.type || "Apartment",
      possession: property.possession || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="property-layout">
      <form className="panel form-grid" onSubmit={submit}>
        <div className="panel-heading"><div><p className="eyebrow">Inventory</p><h2>{editingId ? "Edit property" : "Add property"}</h2></div>{editingId && <button className="text-button" type="button" onClick={reset}>Cancel</button>}</div>
        <label className="wide">Project name<input value={form.project} onChange={(e) => change("project", e.target.value)} placeholder="Skyline Residency" /></label>
        <label className="wide">Location<input value={form.location} onChange={(e) => change("location", e.target.value)} placeholder="Sector 79, Gurugram" /></label>
        <label>Min price (₹ lakh)<input type="number" value={form.priceMin} onChange={(e) => change("priceMin", e.target.value)} /></label>
        <label>Max price (₹ lakh)<input type="number" value={form.priceMax} onChange={(e) => change("priceMax", e.target.value)} /></label>
        <label>Property type<select value={form.type} onChange={(e) => change("type", e.target.value)}><option>Apartment</option><option>Plot</option><option>Villa</option><option>Commercial</option></select></label>
        <label>Requirement<select value={form.bhk} onChange={(e) => change("bhk", e.target.value)}><option>1 BHK</option><option>2 BHK</option><option>3 BHK</option><option>4 BHK</option><option>Not applicable</option></select></label>
        <label className="wide">Possession<input value={form.possession} onChange={(e) => change("possession", e.target.value)} placeholder="Ready to Move / Dec 2027" /></label>
        <button className="primary wide" type="submit">{editingId ? "Save changes" : "Add property"}</button>
      </form>

      <div className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Available inventory</p><h2>Properties</h2></div><span className="muted">{properties.length} total</span></div>
        {properties.length === 0 ? <div className="empty-state">No properties yet. Add your first property.</div> : <div className="property-grid">
          {properties.map((p) => <div className="property-card" key={p.id}>
            <div><strong>{p.project}</strong><p>{p.location}</p></div>
            <div className="property-meta"><span>{p.type}</span><span>{p.bhk}</span><span>₹{p.priceMin}–{p.priceMax}L</span><span>{p.possession}</span></div>
            <div className="property-actions"><button type="button" onClick={() => startEdit(p)}>Edit</button><button className="danger-button" type="button" onClick={() => onDelete(p.id)}>Delete</button></div>
          </div>)}
        </div>}
      </div>
    </div>
  );
}
