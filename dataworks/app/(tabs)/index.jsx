import React, { useState, useEffect } from "react";
import { router, useLocalSearchParams, Redirect } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { View, Text, TouchableOpacity } from "react-native";
import { getData, removeData } from "../lib/store-login";

export default function Index() {
  const params = useLocalSearchParams();
  const { loading } = useAuth();

  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const storedUser = await getData("user");
        setIsLoggedIn(!!storedUser);
      } catch (e) {
        console.error("Error checking login:", e);
        setIsLoggedIn(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkLogin();
  }, []);

  const handleLogout = async () => {
    try {
      // clear what was saved on login
      await Promise.all([
        removeData("user"),
        removeData("email"),
        removeData("pw"),
      ]);
      setIsLoggedIn(false);
      // send them back to the login screen and remove Home from history
      router.replace("/(auth)/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  if (isChecking || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Checking login status...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Logged in → show welcome + Logout button
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        Welcome to the App!
      </Text>
      <Text style={{ marginTop: 10 }}>You are successfully logged in.</Text>

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          marginTop: 24,
          backgroundColor: "#E74C3C",
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        activeOpacity={0.85}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
