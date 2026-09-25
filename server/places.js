const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const TEXTSEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const MAX_PAGES_PER_QUERY = 3;

export function isPlacesConfigured() {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geocodeZip(zipCode) {
  const params = new URLSearchParams({ address: zipCode, key: process.env.GOOGLE_PLACES_API_KEY });
  const res = await fetch(`${GEOCODE_URL}?${params.toString()}`);
  const data = await res.json();
  if (!data.results?.length) {
    const err = new Error(`Could not geocode ZIP code "${zipCode}"`);
    err.status = 400;
    throw err;
  }
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}

export function milesToMeters(miles) {
  return Math.round(Number(miles) * 1609.344);
}

async function textSearchPage(query, location, radius, pagetoken) {
  const params = new URLSearchParams({ key: process.env.GOOGLE_PLACES_API_KEY });
  if (pagetoken) {
    params.set('pagetoken', pagetoken);
  } else {
    params.set('query', query);
    params.set('location', `${location.lat},${location.lng}`);
    params.set('radius', String(radius));
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`${TEXTSEARCH_URL}?${params.toString()}`);
    const data = await res.json();
    if (data.status === 'INVALID_REQUEST' && pagetoken) {
      // page token not yet active — wait and retry
      await sleep(2000);
      continue;
    }
    return data;
  }
  return { results: [], status: 'INVALID_REQUEST' };
}

// Runs a single text-search query through up to MAX_PAGES_PER_QUERY pages,
// returning raw Places results (each with at least place_id/name).
export async function textSearchAllPages(query, location, radius) {
  const all = [];
  let pageToken = null;
  for (let page = 0; page < MAX_PAGES_PER_QUERY; page += 1) {
    const data = await textSearchPage(query, location, radius, pageToken || undefined);
    if (Array.isArray(data.results)) all.push(...data.results);
    if (!data.next_page_token) break;
    pageToken = data.next_page_token;
    await sleep(2500);
  }
  return all;
}

export async function placeDetails(placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,website,place_id,geometry',
    key: process.env.GOOGLE_PLACES_API_KEY,
  });
  const res = await fetch(`${DETAILS_URL}?${params.toString()}`);
  const data = await res.json();
  return data.result || null;
}
