import React, { useState } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth"; // adjust path if different
import { View, Text } from "react-native";

// This is now a redirect gate.
export default function Index() {
  const { user, loading } = useAuth(); // or { token, loading }
  const params = useLocalSearchParams();
  const [loginStatus, setLoginStatus] = useState("Not Logged In");

  if (params.statuus === "Logged In") {
    console.log("User logged in successfully and routed to index.");
    setLoginStatus("Logged In");
  }

  console.log("Auth loading/user/status:", loading, user, loginStatus);
  if (loginStatus === "Logged In") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Welcome to the App!
        </Text>
        <Text style={{ marginTop: 10 }}>You are successfully logged in.</Text>
      </View>
    );
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}
