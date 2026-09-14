"use client";

import { useMemo, useState } from "react";
import { isPropertyMatch } from "../lib/scoring";

export default function LeadDetail({ lead, properties, onUpdate }) {
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("11:00");
  const [propertyId, setPropertyId] = useState("");

  const matches = useMemo(() => {
    if (!lead) return [];
    return properties.filter((property) => isPropertyMatch(lead, property));
  }, [lead, properties]);

  if (!lead) return <div className="panel empty-state">Select a lead to see details.</div>;

  function scheduleVisit() {
    if (!visitDate || !propertyId) return;
    onUpdate(lead.id, {
      status: "Site Visit Booked",
      visit: { date: visitDate, time: visitTime, propertyId, status: "Confirmed" }
    });
  }

  return (
    <div className="panel detail-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Lead detail</p><h2>{lead.name}</h2></div>
        <span className={`pill ${lead.score.toLowerCase()}`}>{lead.score}</span>
      </div>

      <div className="detail-grid">
        <div><span>Phone</span><strong>{lead.phone}</strong></div>
        <div><span>Budget</span><strong>₹{lead.budget} lakh</strong></div>
        <div><span>Requirement</span><strong>{lead.bhk} · {lead.propertyType}</strong></div>
        <div><span>Timeline</span><strong>{lead.timeline}</strong></div>
        <div><span>Financing</span><strong>{lead.financing}</strong></div>
        <div><span>Salesperson</span><strong>{lead.salesperson}</strong></div>
      </div>

      <div className="section">
        <div className="section-title"><h3>Property matches</h3><span className="muted">{matches.length} found</span></div>
        <div className="match-list">
          {matches.length ? matches.map((property) => (
            <div className="match-card" key={property.id}>
              <div><strong>{property.project}</strong><p>{property.location} · {property.bhk} · {property.type}</p></div>
              <span>₹{property.priceMin}–{property.priceMax}L</span>
            </div>
          )) : <p className="muted">No close matches yet. Add or update inventory in Properties.</p>}
        </div>
      </div>

      <div className="section"><h3>Next follow-up</h3><input type="date" value={lead.nextFollowup || ""} onChange={(e) => onUpdate(lead.id, { nextFollowup: e.target.value })} /></div>

      <div className="section">
        <h3>Book site visit</h3>
        <div className="visit-grid">
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}><option value="">Choose property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.project}</option>)}</select>
          <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
          <button className="primary" onClick={scheduleVisit}>Book visit</button>
        </div>
      </div>

      {lead.visit && <div className="visit-summary"><strong>Visit booked</strong><span>{lead.visit.date} at {lead.visit.time}</span></div>}
    </div>
  );
}
