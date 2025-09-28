import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import React, { useEffect } from "react";
import Constants from "expo-constants";
import { Provider } from "react-redux";

import { useColorScheme } from "@/hooks/useColorScheme"; // if this alias errors, use ../hooks/useColorScheme
import { store as reduxStore } from "../store";

import { AuthProvider, useAuth } from "../hooks/useAuth";
import { API_BASE, AUTH_REQUIRED } from "../constants/env";

// Redirects to /login when AUTH_REQUIRED is true and no token is present
function Guard() {
  const { token, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;
    const inAuth = segments[0] === "(auth)";

    if (AUTH_REQUIRED && !token && !inAuth) {
      router.replace("/(auth)/login");
    } else if (token && inAuth) {
      router.replace("/");
    }
  }, [initialized, token, segments, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Config sanity log so you can confirm values in Metro
  useEffect(() => {
    console.log("CONFIG CHECK →", {
      API_BASE,
      AUTH_REQUIRED,
      extra: (Constants.expoConfig && Constants.expoConfig.extra) || {},
    });
  }, []);

  if (!loaded) return null;

  return (
    <Provider store={reduxStore}>
      <AuthProvider>
        <Guard />
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}
