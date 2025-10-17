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
