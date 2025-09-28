import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../hooks/useAuth"; // adjust path if different

// This is now a redirect gate. 
export default function Index() {
  const { user, loading } = useAuth(); // or { token, loading }

  if (loading) return null; // could return a splash/loading screen

  return !user
    ? <Redirect href="/(auth)/login" />
    : <Redirect href="/(tabs)/home" />;
}