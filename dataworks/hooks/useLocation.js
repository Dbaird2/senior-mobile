import { useCallback } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";

export default function useLocation() {
  const getCurrentLocation = useCallback(async () => {
    try {
      if (Platform.OS === "web" && navigator?.geolocation) {
        const coords = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            { enableHighAccuracy: true, maximumAge: 0 }
          );
        });
        return { coords, timestamp: Date.now() };
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied");
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return { coords: position.coords, timestamp: position.timestamp };
    } catch (e) {
      console.error("getCurrentLocation error:", e);
      return null;
    }
  }, []);

  return { getCurrentLocation };
}

