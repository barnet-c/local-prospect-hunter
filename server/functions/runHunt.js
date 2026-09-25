import { geocodeZip, milesToMeters, textSearchAllPages, placeDetails, isPlacesConfigured } from '../places.js';

const DEFAULT_CATEGORIES = [
  { id: 'medical', label: 'Medical', queries: ['medical office'] },
  { id: 'law', label: 'Law Firms', queries: ['law firm'] },
  { id: 'manufacturers', label: 'Manufacturers', queries: ['manufacturer'] },
  { id: 'hotels', label: 'Hotels', queries: ['hotel'] },
  { id: 'churches', label: 'Churches', queries: ['church'] },
  { id: 'schools', label: 'Schools', queries: ['school'] },
];

export async function runHunt({ user, entities, body }) {
  if (!isPlacesConfigured()) {
    const err = new Error('Google Places is not configured. Set GOOGLE_PLACES_API_KEY.');
    err.status = 503;
    err.code = 'places_not_configured';
    throw err;
  }

  const { zip_code, radius_miles, facility_types = [], categories = [] } = body;
  if (!zip_code || !radius_miles) {
    const err = new Error('zip_code and radius_miles are required');
    err.status = 400;
    throw err;
  }

  const location = await geocodeZip(zip_code);
  const radiusMeters = milesToMeters(radius_miles);

  const userCategories = Array.isArray(user.target_categories) ? user.target_categories : [];
  const categoryPool = [...userCategories, ...categories, ...DEFAULT_CATEGORIES];
  const selectedIds = new Set(facility_types.length ? facility_types : categoryPool.map((c) => c.id));
  const queries = [];
  for (const cat of categoryPool) {
    if (!selectedIds.has(cat.id)) continue;
    for (const q of cat.queries || []) queries.push({ query: q, facility_type: cat.label });
  }

  const search = entities.Search.create({ zip_code, radius_miles: Number(radius_miles), facility_types: [...selectedIds], results_count: 0 });

  const seenPlaceIds = new Set();
  let prospectsCount = 0;

  for (const { query, facility_type } of queries) {
    const results = await textSearchAllPages(query, location, radiusMeters);
    for (const place of results) {
      if (!place.place_id || seenPlaceIds.has(place.place_id)) continue;
      seenPlaceIds.add(place.place_id);

      const details = await placeDetails(place.place_id).catch(() => null);
      const source = details || place;
      const geometry = source.geometry?.location || place.geometry?.location || {};

      entities.Prospect.create({
        search_id: search.id,
        name: source.name || place.name,
        address: source.formatted_address || place.formatted_address,
        phone: source.formatted_phone_number,
        website: source.website,
        facility_type,
        place_id: place.place_id,
        lat: geometry.lat,
        lng: geometry.lng,
        scored: false,
      });
      prospectsCount += 1;
    }
  }

  entities.Search.update(search.id, { results_count: prospectsCount });

  return { search_id: search.id, prospects_count: prospectsCount };
}
