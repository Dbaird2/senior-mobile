import React, { useEffect, useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { API_BASE } from "@/constants/env";
import { initDb, saveAuthKey } from "@/lib/db";

const LOGIN_PATH = "/auth/login"; // change if your backend route differs

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initDb(); // make sure the table exists
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      // 1) Send email/password to backend
      const res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // 2) Handle non-2xx
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          msg = errJson?.message || errJson?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      // 3) Parse JSON and extract a key/token
      const data = await res.json();
      const key =
        data?.key ||
        data?.token ||
        data?.access_token ||
        data?.jwt ||
        null;

      if (!key) throw new Error("No key returned from server.");

      // 4) Save key to SQLite
      await saveAuthKey(key);

      // 5) Navigate into the app
      router.replace("/(tabs)/home");
    } catch (err) {
      console.log("Login error:", err);
      Alert.alert("Login failed", err?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title={loading ? "Signing in..." : "Sign in"}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
});
