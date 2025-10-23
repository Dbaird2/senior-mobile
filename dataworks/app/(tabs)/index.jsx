<<<<<<< HEAD
import { Image, Button, View } from 'react-native';
import { Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
=======
"use client"
>>>>>>> origin

import { useState, useEffect } from "react"
import { router, useLocalSearchParams, Redirect } from "expo-router"
import { useAuth } from "../../hooks/useAuth"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { getData, removeData } from "../lib/store-login"

const COLORS = {
  primary: "#003594", // CSUB Blue
  gold: "#FFC72C", // CSUB Gold
  accent: "#E74C3C", // Red accent
  cream: "#F5E6BD", // Light cream
  gray: "#707372", // Medium gray
  white: "#FFFFFF",
}

export default function Index() {
  const params = useLocalSearchParams()
  const { loading } = useAuth()

  const [isChecking, setIsChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const storedUser = await getData("user")
        setIsLoggedIn(!!storedUser)
      } catch (e) {
        console.error("Error checking login:", e)
        setIsLoggedIn(false)
      } finally {
        setIsChecking(false)
      }
    }
    checkLogin()
  }, [])

  const handleLogout = async () => {
    try {
      // clear what was saved on login
      await Promise.all([removeData("user"), removeData("email"), removeData("pw")])
      setIsLoggedIn(false)
      // send them back to the login screen and remove Home from history
      router.replace("/(auth)/login")
    } catch (e) {
      console.error("Logout error:", e)
    }
  }

  if (isChecking || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking login status...</Text>
      </View>
    )
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />
  }

  return (
<<<<<<< HEAD
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>

      {/* ✅ Add this button to test the camera */}
      <View style={{ marginTop: 20 }}>
        <Button title="Open Camera" onPress={() => router.push('/camera')} />
      </View>
    </ParallaxScrollView>
  );
=======
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dataworks</Text>
        <Text style={styles.headerSubtitle}>Home Portal</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={styles.welcomeText}>You are successfully logged in to the Home Portal.</Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.85}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}></Text>
      </View>
    </View>
  )
>>>>>>> origin
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.cream,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
  },
<<<<<<< HEAD
});

=======
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 6,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gold,
    textAlign: "center",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  welcomeCard: {
    backgroundColor: COLORS.white,
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 24,
  },
  logoutButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
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
    color: COLORS.cream,
    textAlign: "center",
  },
})

// import React, { useState, useEffect } from "react";
// import { Redirect, useLocalSearchParams, router } from "expo-router";
// import { useAuth } from "../../hooks/useAuth"; // adjust path if different
// // import { View, Text } from "react-native";
// // import { getData, removeData } from "../lib/store-login";
// // import { handleLogin } from "../(auth)/login";
// import { View, Text, TouchableOpacity } from "react-native";
// import { getData } from "../lib/store-login";

// // This is now a redirect gate.
// export default function Index() {
//   const params = useLocalSearchParams();
//   const { user, loading } = useAuth();

//   const [loginStatus, setLoginStatus] = useState("Checking"); // new initial state
//   const [isChecking, setIsChecking] = useState(true); // optional: to avoid premature render

//   useEffect(() => {
//     const checkLogin = async () => {
//       try {
//         const storedUser = await getData("user");
//         removeData("user");
//         removeData("email");
//         console.log("Stored user from AsyncStorage:", storedUser);
//         if (storedUser) {
//           setLoginStatus("Logged In");
//         } else {
//           setLoginStatus("Not Logged In");
//           console.log("Not logged in, redirecting to login.");
//           //handleLogin();
//         }
//       } catch (error) {
//         console.error("Error checking login:", error);
//         setLoginStatus("Not Logged In");
//       } finally {
//         setIsChecking(false);
//       }
//     };

//     checkLogin();
//   }, []);
//   if (isChecking || loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <Text>Checking login status...</Text>
//       </View>
//     );
//   }

//   if (loginStatus === "Logged In") {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <Text style={{ fontSize: 18, fontWeight: "bold" }}>
//           Welcome to the App!
//         </Text>
//         <Text style={{ marginTop: 10 }}>You are successfully logged in.</Text>
//       </View>
//     );
//   }

//   //return <Redirect href="/(auth)/login" />;
//   return (
//   <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//     <Text style={{ fontSize: 18, marginBottom: 16 }}>You’re not logged in.</Text>
//      <TouchableOpacity
//        onPress={() => router.push("/(auth)/login")}
//        style={{
//          backgroundColor: "#FFC72C",
//          paddingVertical: 12,
//          paddingHorizontal: 20,
//          borderRadius: 8,
//        }}
//      >
//        <Text style={{ color: "#003594", fontWeight: "bold" }}>Go to Login</Text>
//      </TouchableOpacity>
//    </View>
//  );
// }
>>>>>>> origin
