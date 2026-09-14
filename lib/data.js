import { supabase } from "./supabase";

function mapLead(row, visits = []) {
  const visit = visits.find((item) => item.lead_id === row.id) || null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    source: row.source,
    budget: Number(row.budget_lakh || 0),
    location: row.preferred_location || "",
    propertyType: row.property_type || "Apartment",
    bhk: row.bhk || "",
    timeline: row.buying_timeline || "",
    financing: row.financing || "",
    status: row.status,
    score: row.score,
    nextFollowup: row.next_followup || "",
    salesperson: row.salesperson || "Unassigned",
    visit: visit
      ? {
          id: visit.id,
          date: visit.visit_date,
          time: visit.visit_time?.slice(0, 5) || "",
          propertyId: visit.property_id,
          status: visit.status,
        }
      : null,
  };
}

function mapProperty(row) {
  return {
    id: row.id,
    project: row.project,
    location: row.location,
    priceMin: Number(row.price_min_lakh || 0),
    priceMax: Number(row.price_max_lakh || 0),
    bhk: row.bhk,
    type: row.property_type,
    possession: row.possession,
  };
}

export async function getCurrentBusinessId() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .single();

  if (error) throw error;
  return data.business_id;
}

export async function loadBusinessData() {
  const businessId = await getCurrentBusinessId();

  const [leadsResult, propertiesResult, visitsResult] = await Promise.all([
    supabase.from("leads").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("properties").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("site_visits").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  ]);

  if (leadsResult.error) throw leadsResult.error;
  if (propertiesResult.error) throw propertiesResult.error;
  if (visitsResult.error) throw visitsResult.error;

  return {
    businessId,
    leads: leadsResult.data.map((row) => mapLead(row, visitsResult.data)),
    properties: propertiesResult.data.map(mapProperty),
  };
}

export async function createLead(businessId, lead) {
  const payload = {
    business_id: businessId,
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
    budget_lakh: lead.budget,
    preferred_location: lead.location,
    property_type: lead.propertyType,
    bhk: lead.bhk,
    buying_timeline: lead.timeline,
    financing: lead.financing,
    status: lead.status || "New",
    score: lead.score || "Warm",
    next_followup: lead.nextFollowup || null,
    salesperson: lead.salesperson || "Unassigned",
  };

  const { data, error } = await supabase.from("leads").insert(payload).select().single();
  if (error) throw error;
  return mapLead(data);
}

export async function updateLeadRecord(id, changes) {
  const payload = {};
  if ("status" in changes) payload.status = changes.status;
  if ("score" in changes) payload.score = changes.score;
  if ("nextFollowup" in changes) payload.next_followup = changes.nextFollowup || null;
  if ("salesperson" in changes) payload.salesperson = changes.salesperson;

  if (Object.keys(payload).length) {
    const { error } = await supabase.from("leads").update(payload).eq("id", id);
    if (error) throw error;
  }
}

export async function createSiteVisit(businessId, leadId, visit) {
  const { data: existing } = await supabase
    .from("site_visits")
    .select("id")
    .eq("lead_id", leadId)
    .limit(1)
    .maybeSingle();

  const payload = {
    business_id: businessId,
    lead_id: leadId,
    property_id: visit.propertyId,
    visit_date: visit.date,
    visit_time: visit.time,
    status: visit.status || "Confirmed",
  };

  const result = existing?.id
    ? await supabase.from("site_visits").update(payload).eq("id", existing.id).select().single()
    : await supabase.from("site_visits").insert(payload).select().single();

  if (result.error) throw result.error;
  return result.data;
}

export async function createProperty(businessId, property) {
  const payload = {
    business_id: businessId,
    project: property.project,
    location: property.location,
    price_min_lakh: property.priceMin,
    price_max_lakh: property.priceMax,
    bhk: property.bhk,
    property_type: property.type,
    possession: property.possession,
  };

  const { data, error } = await supabase.from("properties").insert(payload).select().single();
  if (error) throw error;
  return mapProperty(data);
}

export async function updatePropertyRecord(id, property) {
  const payload = {
    project: property.project,
    location: property.location,
    price_min_lakh: property.priceMin,
    price_max_lakh: property.priceMax,
    bhk: property.bhk,
    property_type: property.type,
    possession: property.possession,
  };

  const { data, error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapProperty(data);
}

export async function deletePropertyRecord(id) {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;
}


export async function createConversation(businessId) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ business_id: businessId, channel: "AI Chat", status: "Open" })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

export async function saveConversationMessage(businessId, conversationId, role, text) {
  const { error } = await supabase.from("conversation_messages").insert({
    business_id: businessId,
    conversation_id: conversationId,
    role,
    message_text: text,
  });
  if (error) throw error;
}

export async function attachLeadToConversation(conversationId, leadId) {
  const { error } = await supabase
    .from("conversations")
    .update({ lead_id: leadId, status: "Qualified", updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw error;
}
