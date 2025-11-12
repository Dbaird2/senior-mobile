import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { checkUser, initDb, logUserInfo } from "../../src/sqlite";
import { storeLogin } from "../lib/store-login";

const LOGIN_PATH = "/phone-api/check-login.php";

// CSUB Brand Colors
const COLORS = {
  primary: "#003594", // CSUB Blue
  gold: "#FFC72C", // CSUB Gold
  accent: "#E74C3C", // Red accent
  cream: "#F5E6BD", // Light cream
  gray: "#707372", // Medium gray
  white: "#FFFFFF",
  lightGray: "#F5F5F5",
  border: "#DDDDDD",
};

export default function LoginScreen() {
  let [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter email and password.");
      return;
    }
    initDb();


    setLoading(true);
    //try {
    // console.log("Existing stored user/email:", email);
    const url = "https://dataworks-7b7x.onrender.com";
    const res = await fetch(`${url}${LOGIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, pw: password }),
    });

    if (!res.ok) {
      let msg = `HTTPS ${res.status}`;
      try {
        const errJson = await res.json();
        msg = errJson?.message || errJson?.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    let key =
      data?.api_key || data?.token || data?.access_token || data?.jwt || null;

    let username = email;
    const regex = /@/i;
    if (regex.test(email)) {
      username = email.split("@")[0];
      // console.log("regex passed ", username, email);
    } else {
      username = email;
      email = username + "@csub.edu";
    }
    // console.log("data", data.status);

    key = 0;
    let user;
    if (data.status === "success") {
      //user = await checkUser(email);
      // console.log("Final email/username:", email, username);
      if (user === undefined || user.length === 0) {
        logUserInfo(email, username);
        // console.log("New user logged:", res);
        // console.log("User created:", email, username);
      }
      //user = await checkUser(email);
      // console.log(user);
      // console.log("Login successful, key saved." + key);

      storeLogin("user", username);
      storeLogin("email", email);
      storeLogin("pw", password);

      router.push({
        pathname: "/",
        query: { status: "Logged In" },
      });
    }
    /*} catch (err) {
      // console.log("Login error:", err);
      Alert.alert("Login failed", err?.message || "Please try again.");
    } finally {*/
    setLoading(false);
    //}
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dataworks</Text>
        <Text style={styles.subtitle}>Login Portal</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="username@csub.edu"
            placeholderTextColor={COLORS.gray}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={COLORS.gray}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}></Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream, // Using cream background instead of light gray
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gold,
    textAlign: "center",
    fontWeight: "600", // Made subtitle bolder
  },
  formContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 2, // Thicker border for better definition
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    color: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPassword: {
    marginTop: 16,
    alignItems: "center",
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600", // Made link text bolder
  },
  footer: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.cream, // Using cream color for footer text
    textAlign: "center",
  },
});
