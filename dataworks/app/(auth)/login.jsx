import React, { useEffect, useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { API_BASE } from "@/constants/env";
import { Redirect, useLocalSearchParams } from "expo-router";
import { getData, removeData, storeLogin } from "../lib/store-login";

import {
  initDb,
  logUserInfo,
  checkUser,
  dropAuth,
  listTables,
  clearUsers,
  deleteDatabase,
} from "../lib/sqlite";
import { store } from "expo-router/build/global-state/router-store";

const LOGIN_PATH = "/phone-api/check-login.php"; // change if backend route differs

export default function LoginScreen() {
  let [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      // 1) Send email/password to backend

      console.log("Existing stored user/email:", user, email);
      const url = "https://dataworks-7b7x.onrender.com";
      const res = await fetch(`${url}${LOGIN_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, pw: password }),
      });
      //console.log(res);
      // 2) Handle non-2xx
      if (!res.ok) {
        let msg = `HTTPS ${res.status}`;
        //console.log("Login failed:", msg);
        try {
          const errJson = await res.json();
          msg = errJson?.message || errJson?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      // 3) Parse JSON and extract a key/token
      const data = await res.json();
      let key =
        data?.api_key || data?.token || data?.access_token || data?.jwt || null;

      // 4) Save key to SQLite
      //dropAuth(); // clear old
      //clearUsers(); // clear old
      let username = email;
      const regex = /@/i;
      if (regex.test(email)) {
        username = email.split("@")[0];
        console.log("regex passed ", username, email);
      } else {
        username = email;
        email = username + "@csub.edu";
      }
      console.log("data", data.status);
      //await deleteDatabase('sqlite2.db');
      key = 0;
      let user;
      if (data.status === "success") {
        user = await checkUser(email);
        console.log("Final email/username:", email, username);
        if (user === undefined || user.length === 0) {
          const res = await logUserInfo(email, username);
          console.log("New user logged:", res);
          console.log("User created:", email, username);
        }
        user = await checkUser(email);
        console.log(user);
        // listTables().forEach((table) => console.log(table.name));
        console.log("Login successful, key saved." + key);
        // 5) Navigate into the app
        //router.replace("/(tabs)/home");
        storeLogin("user", username);
        storeLogin("email", email);

        router.push({
          pathname: "/(tabs)/search",
          query: { status: "Logged In" },
        });
      }
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
