"use client"

import { useState, useEffect } from "react"
import { router, useLocalSearchParams, Redirect } from "expo-router"
import { useAuth } from "../../hooks/useAuth"
import { View, Text, TouchableOpacity, ScrollView } from "react-native"
import { getData, removeData } from "../lib/store-login"

const COLORS = {
  primary: "#003594", // CSUB Blue
  gold: "#FFC72C", // CSUB Gold
  cream: "#F5E6BD", // Light cream background
  gray: "#707372", // Neutral gray
  red: "#E74C3C", // Accent red
  white: "#FFFFFF",
  lightGray: "#F5F5F5",
  border: "#DDDDDD",
}

export default function Index() {
  const params = useLocalSearchParams()
  const { loading } = useAuth()

  const [isChecking, setIsChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selfAuditNumbers, setSelfAuditNumbers] = useState({ completed: 0, inProgress: 0 })
  const [mgmtAuditNumbers, setMgmtAuditNumbers] = useState({ completed: 0, inProgress: 0 })
  const [auditChecked, setAuditChecked] = useState(false)

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

  const getAuditNumbers = async () => {
    try {
      const email = await getData("email")
      const pw = await getData("pw")

      const res = await fetch("https://dataworks-7b7x.onrender.com/phone-api/audit-info.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email, pw: pw }),
      })
      const data = await res.json()
      if (data.status === "Ok") {
        setSelfAuditNumbers({ completed: data.selfCompleted, inProgress: data.selfInProgress })
        setMgmtAuditNumbers({ completed: data.mgmtCompleted, inProgress: data.mgmtInProgress })
        setAuditChecked(true)
      }
    } catch (error) {
      console.error("Error fetching audit numbers:", error)
    }
  }

  if (!auditChecked && isLoggedIn) {
    getAuditNumbers()
  }

  const handleLogout = async () => {
    try {
      await Promise.all([removeData("user"), removeData("email"), removeData("pw")])
      setIsLoggedIn(false)
      router.replace("/(auth)/login")
    } catch (e) {
      console.error("Logout error:", e)
    }
  }

  const handleAudit = async () => {
    try {
      router.replace("/audit")
    } catch (e) {
      console.error("Audit navigation error:", e)
    }
  }

  const handleSearch = async () => {
    try {
      router.replace("/search")
    } catch (e) {
      console.error("Search navigation error:", e)
    }
  }

  const handleProfiles = async () => {
    try {
      router.replace("/profile")
    } catch (e) {
      console.error("Profile navigation error:", e)
    }
  }

  if (isChecking || loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.cream,
        }}
      >
        <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: "500" }}>Checking login status...</Text>
      </View>
    )
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.cream }} contentContainerStyle={{ paddingVertical: 0 }}>
      {/* Header Section */}
      <View
        style={{
          backgroundColor: COLORS.primary,
          paddingHorizontal: 24,
          paddingTop: 48,
          paddingBottom: 32,
        }}
      >
        <Text style={{ color: COLORS.gold, fontSize: 14, fontWeight: "600" }}>Asset Auditing System</Text>
        <Text
          style={{
            color: COLORS.white,
            fontSize: 28,
            fontWeight: "700",
            marginTop: 8,
          }}
        >
          Welcome Back!
        </Text>
        <Text
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: 14,
            marginTop: 8,
            lineHeight: 20,
          }}
        >
          You're successfully logged in. Manage your assets and audits below.
        </Text>
      </View>

      {/* Audit Progress Section */}
      <View style={{ paddingHorizontal: 16, paddingTop: 28 }}>
        <Text
          style={{
            color: COLORS.primary,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          Audit Progress
        </Text>

        <View style={{ gap: 12 }}>
          {/* Row 1 */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Self Completed */}
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.white,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color: COLORS.gray,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                SELF COMPLETED
              </Text>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 28,
                  fontWeight: "700",
                  marginTop: 8,
                }}
              >
                {selfAuditNumbers.completed}
              </Text>
            </View>

            {/* Self In Progress */}
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.gold,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "rgba(255, 199, 44, 0.3)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                SELF IN PROGRESS
              </Text>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 28,
                  fontWeight: "700",
                  marginTop: 8,
                }}
              >
                {selfAuditNumbers.inProgress}
              </Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Management Completed */}
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.white,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color: COLORS.gray,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                MGMT COMPLETED
              </Text>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 28,
                  fontWeight: "700",
                  marginTop: 8,
                }}
              >
                {mgmtAuditNumbers.completed}
              </Text>
            </View>

            {/* Management In Progress */}
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.gold,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "rgba(255, 199, 44, 0.3)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                MGMT IN PROGRESS
              </Text>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 28,
                  fontWeight: "700",
                  marginTop: 8,
                }}
              >
                {mgmtAuditNumbers.inProgress}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={{ paddingHorizontal: 16, paddingTop: 28 }}>
        <Text
          style={{
            color: COLORS.primary,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          Quick Actions
        </Text>

        <View style={{ gap: 12 }}>
          {/* Action Card 1 */}
          <TouchableOpacity
            onPress={handleAudit}
            activeOpacity={0.7}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderLeftWidth: 4,
              borderLeftColor: COLORS.primary,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: "rgba(0, 53, 148, 0.1)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>📋</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                New Audit
              </Text>
              <Text
                style={{
                  color: COLORS.gray,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Start a new asset audit
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: COLORS.primary }}>›</Text>
          </TouchableOpacity>

          {/* Action Card 2 */}
          <TouchableOpacity
            onPress={handleSearch}
            activeOpacity={0.7}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderLeftWidth: 4,
              borderLeftColor: COLORS.gold,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: "rgba(255, 199, 44, 0.1)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>🔍</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                Search Audits
              </Text>
              <Text
                style={{
                  color: COLORS.gray,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Find and search audits
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: COLORS.primary }}>›</Text>
          </TouchableOpacity>

          {/* Action Card 3 */}
          <TouchableOpacity
            onPress={handleProfiles}
            activeOpacity={0.7}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderLeftWidth: 4,
              borderLeftColor: COLORS.red,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: "rgba(231, 76, 60, 0.1)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                Profiles
              </Text>
              <Text
                style={{
                  color: COLORS.gray,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Manage your profiles
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: COLORS.primary }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <View style={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 24 }}>
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: COLORS.red,
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 24,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: COLORS.white,
              fontWeight: "700",
              fontSize: 16,
              letterSpacing: 0.5,
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
