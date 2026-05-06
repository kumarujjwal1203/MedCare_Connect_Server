const PLACES_NEW_BASE = "https://places.googleapis.com/v1";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

const mapsKey = () => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || key === "your_google_maps_api_key_here") {
    return "";
  }
  return key;
};

const hasGoogleMapsKey = () => Boolean(mapsKey());

/**
 * Find pharmacies near a coordinate using Google Places API (New), with
 * OpenStreetMap fallback when Google is not configured or rejects the request.
 */
export const findNearbyPharmacies = async (lat, lng, radiusMeters = 5000) => {
  if (!hasGoogleMapsKey()) {
    return findNearbyPharmaciesWithOpenStreetMap(lat, lng, radiusMeters);
  }

  try {
    return await findNearbyPharmaciesWithGooglePlacesNew(lat, lng, radiusMeters);
  } catch (error) {
    console.warn(
      "Google Places API unavailable; falling back to OpenStreetMap:",
      error.message
    );
    return findNearbyPharmaciesWithOpenStreetMap(lat, lng, radiusMeters);
  }
};

/**
 * Get detailed info (phone, website) for a specific place.
 */
export const getPlaceDetails = async (placeId) => {
  if (!hasGoogleMapsKey() || placeId?.startsWith("osm-")) {
    return {
      placeId,
      name: "Pharmacy",
      address: "",
      phone: null,
      website: null,
      openNow: null,
      hours: [],
    };
  }

  try {
    const res = await fetch(`${PLACES_NEW_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": mapsKey(),
        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "formattedAddress",
          "nationalPhoneNumber",
          "internationalPhoneNumber",
          "websiteUri",
          "currentOpeningHours.openNow",
          "currentOpeningHours.weekdayDescriptions",
        ].join(","),
      },
    });

    const data = await parseGoogleJsonResponse(res, "Google Place details");

    return {
      placeId: data.id || placeId,
      name: data.displayName?.text || "Pharmacy",
      address: data.formattedAddress || "",
      phone: data.nationalPhoneNumber || data.internationalPhoneNumber || null,
      website: data.websiteUri || null,
      openNow: data.currentOpeningHours?.openNow ?? null,
      hours: data.currentOpeningHours?.weekdayDescriptions || [],
    };
  } catch (error) {
    console.warn("Google Place details unavailable:", error.message);
    return {
      placeId,
      name: "Pharmacy",
      address: "",
      phone: null,
      website: null,
      openNow: null,
      hours: [],
    };
  }
};

/**
 * Reverse-geocode a lat/lng to a human-readable address.
 */
export const reverseGeocode = async (lat, lng) => {
  if (!hasGoogleMapsKey()) {
    return reverseGeocodeWithOpenStreetMap(lat, lng);
  }

  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: mapsKey(),
    });

    const res = await fetch(`${GEOCODE_BASE}?${params}`);
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      return reverseGeocodeWithOpenStreetMap(lat, lng);
    }

    return data.results[0].formatted_address;
  } catch {
    return reverseGeocodeWithOpenStreetMap(lat, lng);
  }
};

const findNearbyPharmaciesWithGooglePlacesNew = async (lat, lng, radiusMeters = 5000) => {
  const safeRadius = Math.min(Math.max(Number(radiusMeters) || 5000, 500), 10000);
  const response = await fetch(`${PLACES_NEW_BASE}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": mapsKey(),
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.rating",
        "places.userRatingCount",
        "places.currentOpeningHours.openNow",
        "places.location",
      ].join(","),
    },
    body: JSON.stringify({
      includedTypes: ["pharmacy"],
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: {
            latitude: Number(lat),
            longitude: Number(lng),
          },
          radius: safeRadius,
        },
      },
    }),
  });

  const data = await parseGoogleJsonResponse(response, "Google Places API");

  return (data.places || [])
    .map((place) => {
      const itemLat = place.location?.latitude;
      const itemLng = place.location?.longitude;
      if (!itemLat || !itemLng) {
        return null;
      }

      return {
        placeId: place.id,
        source: "google_places_new",
        confidence: "google_verified",
        name: place.displayName?.text || "Pharmacy",
        address: place.formattedAddress || "Address not available",
        rating: place.rating ?? null,
        totalRatings: place.userRatingCount ?? 0,
        isOpen: place.currentOpeningHours?.openNow ?? null,
        location: {
          lat: itemLat,
          lng: itemLng,
        },
        distance: haversineKm(lat, lng, itemLat, itemLng),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);
};

const parseGoogleJsonResponse = async (response, label) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = data.error?.status || response.status;
    const message = data.error?.message || response.statusText || "unknown";
    throw new Error(`${label} error: ${status} - ${message}`);
  }
  return data;
};

// Haversine formula — straight-line km between two coordinates
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deg2rad(d) { return d * (Math.PI / 180); }

const findNearbyPharmaciesWithOpenStreetMap = async (lat, lng, radiusMeters = 5000) => {
  const safeRadius = Math.min(Math.max(Number(radiusMeters) || 5000, 500), 10000);
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="pharmacy"](around:${safeRadius},${lat},${lng});
      way["amenity"="pharmacy"](around:${safeRadius},${lat},${lng});
      relation["amenity"="pharmacy"](around:${safeRadius},${lat},${lng});
      node["healthcare"="pharmacy"](around:${safeRadius},${lat},${lng});
      way["healthcare"="pharmacy"](around:${safeRadius},${lat},${lng});
      relation["healthcare"="pharmacy"](around:${safeRadius},${lat},${lng});
      node["shop"~"^(chemist|medical_supply)$"](around:${safeRadius},${lat},${lng});
      way["shop"~"^(chemist|medical_supply)$"](around:${safeRadius},${lat},${lng});
      relation["shop"~"^(chemist|medical_supply)$"](around:${safeRadius},${lat},${lng});
    );
    out center tags;
  `;

  try {
    for (const overpassUrl of OVERPASS_URLS) {
      const response = await fetch(overpassUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ data: query }),
      });

      if (response.ok) {
        const data = await response.json();
        const pharmacies = normalizeOverpassPharmacies(data.elements || [], lat, lng);
        if (pharmacies.length > 0) {
          return pharmacies;
        }
      }
    }
  } catch {
    // Fall through to Nominatim search below.
  }

  return findNearbyPharmaciesWithNominatim(lat, lng, safeRadius);
};

const normalizeOverpassPharmacies = (elements, lat, lng) =>
  elements
    .map((item) => {
      const itemLat = item.lat ?? item.center?.lat;
      const itemLng = item.lon ?? item.center?.lon;
      if (!itemLat || !itemLng) {
        return null;
      }

      const tags = item.tags || {};
      const isPharmacyPoi =
        tags.amenity === "pharmacy" ||
        tags.healthcare === "pharmacy" ||
        tags.shop === "chemist" ||
        tags.shop === "medical_supply";

      if (!isPharmacyPoi) {
        return null;
      }

      const address = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:suburb"],
        tags["addr:city"],
      ].filter(Boolean).join(", ");

      return {
        placeId: `osm-${item.type}-${item.id}`,
        source: "openstreetmap",
        confidence: "verified_pharmacy",
        name: tags.name || "Medical Store",
        address: address || tags["addr:full"] || tags.description || "Address not available",
        rating: null,
        totalRatings: 0,
        isOpen: null,
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || tags["contact:website"] || null,
        location: {
          lat: itemLat,
          lng: itemLng,
        },
        distance: haversineKm(lat, lng, itemLat, itemLng),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

const findNearbyPharmaciesWithNominatim = async (lat, lng, radiusMeters) => {
  const radiusKm = radiusMeters / 1000;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(deg2rad(lat)) || 1);
  const params = new URLSearchParams({
    format: "jsonv2",
    q: "pharmacy",
    bounded: "1",
    limit: "30",
    viewbox: [
      lng - lngDelta,
      lat + latDelta,
      lng + lngDelta,
      lat - latDelta,
    ].join(","),
  });

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`, {
    headers: {
      "User-Agent": "MedCare Connect/1.0 local development",
    },
  });

  if (!response.ok) {
    throw new Error("OpenStreetMap pharmacy search is temporarily unavailable");
  }

  const data = await response.json();

  return (data || [])
    .filter((item) => {
      const category = item.category || item.class;
      return (
        (category === "amenity" && item.type === "pharmacy") ||
        (category === "healthcare" && item.type === "pharmacy") ||
        (category === "shop" && ["chemist", "medical_supply"].includes(item.type))
      );
    })
    .map((item) => {
      const itemLat = Number(item.lat);
      const itemLng = Number(item.lon);
      if (!itemLat || !itemLng) {
        return null;
      }

      const distance = haversineKm(lat, lng, itemLat, itemLng);
      if (distance > radiusMeters / 1000) {
        return null;
      }

      return {
        placeId: `osm-nominatim-${item.osm_type}-${item.osm_id}`,
        source: "openstreetmap",
        confidence: "verified_pharmacy",
        name: item.name || item.display_name?.split(",")[0] || "Medical Store",
        address: item.display_name || "Address not available",
        rating: null,
        totalRatings: 0,
        isOpen: null,
        phone: null,
        website: null,
        location: {
          lat: itemLat,
          lng: itemLng,
        },
        distance,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);
};

const reverseGeocodeWithOpenStreetMap = async (lat, lng) => {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      "User-Agent": "MedCare Connect/1.0 local development",
    },
  });

  if (!response.ok) {
    return "";
  }

  const data = await response.json();
  return data.display_name || "";
};
