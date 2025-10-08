import React, { useState, useEffect } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth"; // adjust path if different
import { View, Text } from "react-native";
import { getData, removeData } from "../lib/store-login";
import { handleLogin } from "../(auth)/login";

// This is now a redirect gate.
export default function Index() {
  const params = useLocalSearchParams();
  const { user, loading } = useAuth();

  const [loginStatus, setLoginStatus] = useState("Checking"); // new initial state
  const [isChecking, setIsChecking] = useState(true); // optional: to avoid premature render

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const storedUser = await getData("user");
        removeData("user");
        removeData("email");
        console.log("Stored user from AsyncStorage:", storedUser);
        if (storedUser) {
          setLoginStatus("Logged In");
        } else {
          setLoginStatus("Not Logged In");
          console.log("Not logged in, redirecting to login.");
          //handleLogin();
        }
      } catch (error) {
        console.error("Error checking login:", error);
        setLoginStatus("Not Logged In");
      } finally {
        setIsChecking(false);
      }
    };

    checkLogin();
  }, []);
  if (isChecking || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Checking login status...</Text>
      </View>
    );
  }

  if (loginStatus === "Logged In") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Welcome to the App!
        </Text>
        <Text style={{ marginTop: 10 }}>You are successfully logged in.</Text>
      </View>
    );
  }

  return <Redirect href="/(auth)/login" />;
}
