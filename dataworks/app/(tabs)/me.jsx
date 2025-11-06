import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert, Pressable } from "react-native";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";

export default function MeScreen() {
  const api = useApi();
  const { logout } = useAuth();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Update this path when your backend is live
        const data = await api.get("/phone-api/me.php");
        setMe(data.user || data);
      } catch (e) {
        Alert.alert("Profile Error", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        {me?.email ? `Welcome, ${me.email}` : "Welcome!"}
      </Text>

      <Pressable
        onPress={logout}
        style={{ marginTop: 8, padding: 10, borderWidth: 1, borderRadius: 8, alignSelf: "flex-start" }}
      >
        <Text>Log out</Text>
      </Pressable>
    </View>
  );
}
