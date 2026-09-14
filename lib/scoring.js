export function getLeadScore(lead, properties = []) {
  let points = 0;

  const timelinePoints = {
    "Within 30 days": 35,
    "1-3 months": 25,
    "3-6 months": 12,
    "Just exploring": 4,
  };
  points += timelinePoints[lead.timeline] || 0;

  if (lead.financing === "Self-funded") points += 18;
  else if (lead.financing === "Home loan") points += 14;
  else if (lead.financing === "Not decided") points += 5;

  if (Number(lead.budget) > 0) points += 12;
  if (lead.location?.trim()) points += 8;
  if (lead.propertyType?.trim()) points += 6;
  if (lead.bhk?.trim()) points += 6;

  const hasPropertyFit = properties.some((property) => isPropertyMatch(lead, property));
  if (hasPropertyFit) points += 15;

  if (points >= 75) return "Hot";
  if (points >= 45) return "Warm";
  return "Cold";
}

export function isPropertyMatch(lead, property) {
  const budget = Number(lead.budget || 0);
  const min = Number(property.priceMin || 0);
  const max = Number(property.priceMax || 0);

  const budgetFits = budget > 0 && min > 0 && max > 0
    ? budget >= min * 0.9 && budget <= max * 1.15
    : true;

  const typeFits = !lead.propertyType || !property.type ||
    lead.propertyType.toLowerCase() === property.type.toLowerCase();

  const bhkFits = !lead.bhk || !property.bhk ||
    lead.bhk.toLowerCase() === property.bhk.toLowerCase();

  const leadLocation = (lead.location || "").toLowerCase().trim();
  const propertyLocation = (property.location || "").toLowerCase().trim();
  const locationFits = !leadLocation || !propertyLocation ||
    propertyLocation.includes(leadLocation) ||
    leadLocation.includes(propertyLocation) ||
    propertyLocation.split(",")[0].trim() === leadLocation.split(",")[0].trim();

  return budgetFits && typeFits && bhkFits && locationFits;
}
