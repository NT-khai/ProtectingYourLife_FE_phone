import * as Location from 'expo-location';

export interface LocationResult {
  latitude: number;
  longitude: number;
  address: string;
  accuracy?: number | null;
}

export async function getCurrentGPSLocation(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Quyền truy cập vị trí (GPS) đã bị từ chối.');
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude, accuracy } = pos.coords;

  let resolvedAddress = `Tọa độ: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  try {
    // Reverse geocoding via OpenStreetMap Nominatim
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi`,
      {
        headers: {
          'User-Agent': 'ProtectingYourLifeMobile/1.0',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        resolvedAddress = data.display_name;
      }
    }
  } catch {
    // Fallback if nominatim network is slow
  }

  return {
    latitude,
    longitude,
    address: resolvedAddress,
    accuracy,
  };
}
