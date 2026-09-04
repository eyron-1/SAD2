// Philippine Standard Geographic Code (PSGC) API client with caching and fallbacks

const PSGC_BASE = 'https://psgc.gitlab.io/api';

// All 81 provinces + Metro Manila (NCR)
export const PROVINCES_LIST = [
  { code: '130000000', name: 'Metro Manila (NCR)', isRegion: true },
  { code: '140100000', name: 'Abra' },
  { code: '160200000', name: 'Agusan del Norte' },
  { code: '160300000', name: 'Agusan del Sur' },
  { code: '060400000', name: 'Aklan' },
  { code: '050500000', name: 'Albay' },
  { code: '060600000', name: 'Antique' },
  { code: '148100000', name: 'Apayao' },
  { code: '037700000', name: 'Aurora' },
  { code: '190700000', name: 'Basilan' },
  { code: '030800000', name: 'Bataan' },
  { code: '020900000', name: 'Batanes' },
  { code: '041000000', name: 'Batangas' },
  { code: '141100000', name: 'Benguet' },
  { code: '087800000', name: 'Biliran' },
  { code: '071200000', name: 'Bohol' },
  { code: '101300000', name: 'Bukidnon' },
  { code: '031400000', name: 'Bulacan' },
  { code: '021500000', name: 'Cagayan' },
  { code: '051600000', name: 'Camarines Norte' },
  { code: '051700000', name: 'Camarines Sur' },
  { code: '101800000', name: 'Camiguin' },
  { code: '061900000', name: 'Capiz' },
  { code: '052000000', name: 'Catanduanes' },
  { code: '042100000', name: 'Cavite' },
  { code: '072200000', name: 'Cebu' },
  { code: '118200000', name: 'Davao de Oro (Compostela Valley)' },
  { code: '112300000', name: 'Davao del Norte' },
  { code: '112400000', name: 'Davao del Sur' },
  { code: '118600000', name: 'Davao Occidental' },
  { code: '112500000', name: 'Davao Oriental' },
  { code: '168500000', name: 'Dinagat Islands' },
  { code: '082600000', name: 'Eastern Samar' },
  { code: '067900000', name: 'Guimaras' },
  { code: '142700000', name: 'Ifugao' },
  { code: '012800000', name: 'Ilocos Norte' },
  { code: '012900000', name: 'Ilocos Sur' },
  { code: '063000000', name: 'Iloilo' },
  { code: '023100000', name: 'Isabela' },
  { code: '143200000', name: 'Kalinga' },
  { code: '013300000', name: 'La Union' },
  { code: '043400000', name: 'Laguna' },
  { code: '103500000', name: 'Lanao del Norte' },
  { code: '193600000', name: 'Lanao del Sur' },
  { code: '083700000', name: 'Leyte' },
  { code: '193800000', name: 'Maguindanao del Norte' },
  { code: '193900000', name: 'Maguindanao del Sur' },
  { code: '174000000', name: 'Marinduque' },
  { code: '054100000', name: 'Masbate' },
  { code: '104200000', name: 'Misamis Occidental' },
  { code: '104300000', name: 'Misamis Oriental' },
  { code: '144400000', name: 'Mountain Province' },
  { code: '064500000', name: 'Negros Occidental' },
  { code: '074600000', name: 'Negros Oriental' },
  { code: '084800000', name: 'Northern Samar' },
  { code: '034900000', name: 'Nueva Ecija' },
  { code: '025000000', name: 'Nueva Vizcaya' },
  { code: '175100000', name: 'Occidental Mindoro' },
  { code: '175200000', name: 'Oriental Mindoro' },
  { code: '175300000', name: 'Palawan' },
  { code: '035400000', name: 'Pampanga' },
  { code: '015500000', name: 'Pangasinan' },
  { code: '045600000', name: 'Quezon' },
  { code: '025700000', name: 'Quirino' },
  { code: '045800000', name: 'Rizal' },
  { code: '175900000', name: 'Romblon' },
  { code: '086000000', name: 'Samar (Western Samar)' },
  { code: '128000000', name: 'Sarangani' },
  { code: '076100000', name: 'Siquijor' },
  { code: '056200000', name: 'Sorsogon' },
  { code: '126300000', name: 'South Cotabato' },
  { code: '086400000', name: 'Southern Leyte' },
  { code: '126500000', name: 'Sultan Kudarat' },
  { code: '196600000', name: 'Sulu' },
  { code: '166700000', name: 'Surigao del Norte' },
  { code: '166800000', name: 'Surigao del Sur' },
  { code: '036900000', name: 'Tarlac' },
  { code: '197000000', name: 'Tawi-Tawi' },
  { code: '037100000', name: 'Zambales' },
  { code: '097200000', name: 'Zamboanga del Norte' },
  { code: '097300000', name: 'Zamboanga del Sur' },
  { code: '098300000', name: 'Zamboanga Sibugay' }
].sort((a, b) => a.name.localeCompare(b.name));

const cache = new Map();

/**
 * Fetch cities and municipalities for a given province or region
 */
export async function getCitiesMunicipalities(provinceOrRegion) {
  if (!provinceOrRegion) return [];
  const cacheKey = `cm-${provinceOrRegion.code}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const url = provinceOrRegion.isRegion
    ? `${PSGC_BASE}/regions/${provinceOrRegion.code}/cities-municipalities.json`
    : `${PSGC_BASE}/provinces/${provinceOrRegion.code}/cities-municipalities.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch cities/municipalities');
    const data = await res.json();
    const sorted = (data || []).sort((a, b) => a.name.localeCompare(b.name));
    cache.set(cacheKey, sorted);
    return sorted;
  } catch (err) {
    console.error('Error fetching municipalities:', err);
    return [];
  }
}

/**
 * Fetch barangays for a given city or municipality
 */
export async function getBarangays(cityMunicipalityCode) {
  if (!cityMunicipalityCode) return [];
  const cacheKey = `brgy-${cityMunicipalityCode}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const res = await fetch(`${PSGC_BASE}/cities-municipalities/${cityMunicipalityCode}/barangays.json`);
    if (!res.ok) throw new Error('Failed to fetch barangays');
    const data = await res.json();
    const sorted = (data || []).sort((a, b) => a.name.localeCompare(b.name));
    cache.set(cacheKey, sorted);
    return sorted;
  } catch (err) {
    console.error('Error fetching barangays:', err);
    return [];
  }
}

/**
 * Helper to generate URL-safe slug from names
 */
export function generateSlug(barangayName, municipalityName = '') {
  const combined = municipalityName ? `${barangayName} ${municipalityName}` : barangayName;
  return combined
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
