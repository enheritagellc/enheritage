/**
 * Google Maps Geocoding API provider.
 *
 * Used to enrich GPE (geopolitical entity) and LOC entities with
 * a formatted address, lat/lng, and a Maps embed URL.
 *
 * Skipped gracefully when GOOGLE_MAPS_API_KEY is not configured.
 */
import axios from 'axios';
import { config } from '../config.js';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface GoogleMapsResult {
  formattedAddress: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  mapsEmbed: string;
}

export async function enrichWithGoogleMaps(place: string): Promise<GoogleMapsResult | null> {
  if (!config.GOOGLE_MAPS_API_KEY) return null;

  try {
    const { data } = await axios.get<{
      status: string;
      results?: {
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }[];
    }>(GEOCODE_URL, {
      params: { address: place, key: config.GOOGLE_MAPS_API_KEY },
      timeout: 8_000,
    });

    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    const lat = result.geometry?.location?.lat ?? 0;
    const lng = result.geometry?.location?.lng ?? 0;
    const formattedAddress = result.formatted_address ?? place;
    const encodedAddr = encodeURIComponent(formattedAddress);

    return {
      formattedAddress,
      lat,
      lng,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodedAddr}`,
      mapsEmbed: `https://www.google.com/maps/embed/v1/place?key=${config.GOOGLE_MAPS_API_KEY}&q=${encodedAddr}`,
    };
  } catch {
    return null;
  }
}
