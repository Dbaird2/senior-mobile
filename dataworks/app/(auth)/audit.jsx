"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useDispatch } from "react-redux";
import { Camera, CameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useLocation from "../../hooks/useLocation";

import {
  initDb,
  getItem,
  updateAuditingFoundStatus,
  selectAllAuditing,
} from "../../src/sqlite";

const COLORS = {
  primary: "#003594",
  gold: "#FFC72C",
  cream: "#F5E6BD",
  gray: "#707372",
  red: "#E74C3C",
  white: "#FFFFFF",
  border: "#DDDDDD",
};

const COMPLETE_AUDIT_URL =
  "https://dataworks-7b7x.onrender.com/phone-api/audit/complete-audit.php";

export default function AuditScreen() {
  const dispatch = useDispatch();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scanLockRef = useRef(false);

  const [scannedData, setScannedData] = useState(null);
  const { getCurrentLocation } = useLocation();

  const [currentDoor, setCurrentDoor] = useState(null);
  const [pickedAssets, setPickedAssets] = useState([]);
  const [busy, setBusy] = useState(false);

  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const TABBAR = Platform.select({ ios: 64, android: 88, default: 72 });
  const ASSETS_LIST_HEIGHT = Math.max(240, Math.floor(screenH * 0.42));

  useEffect(() => {
    initDb().catch((e) => console.warn("DB init error:", e));
  }, []);

  /* ===== Camera & Scan ===== */
  const requestPermissionAndScan = async () => {
    if (Platform.OS === "web") {
      alert("Scanning isn’t available on web.");
      return;
    }
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      if (status === "granted") {
        scanLockRef.current = false;
        setScanning(true);
      } else {
        alert("Camera permission is required to scan.");
      }
    } catch (e) {
      console.warn("Camera permission error:", e);
      alert("Could not access the camera.");
    }
  };

  const formatGeoToRoomLocation = (coords) => {
    if (!coords) return "Unknown";
    const lat = coords.latitude?.toFixed(6);
    const lon = coords.longitude?.toFixed(6);
    const alt =
      typeof coords.altitude === "number" ? coords.altitude.toFixed(1) : "n/a";
    return `${lat}, ${lon}, ${alt}`;
  };

  const handleBarcodeScanned = async ({ type, data }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanning(false);

    await initDb();

    const loc = await getCurrentLocation();
    const payload = {
      type,
      data: String(data),
      location: loc?.coords
        ? {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude ?? null,
          }
        : null,
    };
    setScannedData(payload);

    // First scan = door selection
    if (!currentDoor) {
      const tag = payload.data;
      const newRoomLocation = formatGeoToRoomLocation(payload.location);
      setCurrentDoor({
        RoomTag: tag,
        RoomLocation: newRoomLocation,
        BuildingName: "Unknown",
      });
      setPickedAssets([]);
      alert(`Door selected: ${tag}`);
      setTimeout(() => (scanLockRef.current = false), 400);
      return;
    }

    // Subsequent scans = assets for the selected door
    try {
      const code = payload.data;
      let existing = null;
      try {
        existing = await getItem(code);
      } catch {
        existing = null;
      }
      const asset = existing
        ? {
            AssetTag: existing.tag,
            Description: existing.name,
            Serial: existing.serial,
          }
        : {
            AssetTag: code,
            Description: "Unknown Asset",
            Serial: `SN-${String(code).slice(-4)}`,
          };
      setPickedAssets((prev) =>
        prev.some((a) => a.AssetTag === asset.AssetTag) ? prev : [...prev, asset]
      );
    } finally {
      setTimeout(() => (scanLockRef.current = false), 400);
    }
  };

  const removeAsset = (tag) =>
    setPickedAssets((prev) => prev.filter((a) => a.AssetTag !== tag));

  /** SAVE WORK
   * Confirm Yes/No, then call only updateAuditingFoundStatus per asset.
   * After success, reset the door + scanned assets.
   */
  const saveWork = async () => {
    if (!currentDoor || pickedAssets.length === 0) {
      alert("Scan a door and at least one asset first.");
      return;
    }

    Alert.alert("Save Work?", "Record the scanned assets for this door?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          setBusy(true);
          try {
            await initDb();

            // fresh geo
            const loc = await getCurrentLocation();
            const geoX = loc?.coords?.latitude ?? null;
            const geoY = loc?.coords?.longitude ?? null;
            const elevation =
              typeof loc?.coords?.altitude === "number"
                ? loc.coords.altitude
                : null;

            // If you have a true dept_id available, pass it instead of RoomTag.
            const deptId = currentDoor.RoomTag;

            const failed = [];
            for (const a of pickedAssets) {
              try {
                await updateAuditingFoundStatus(
                  a.AssetTag,
                  geoX,
                  geoY,
                  elevation,
                  currentDoor.RoomTag, // found_room_tag
                  deptId                // dept_id for server lookup (kept as-is)
                );
              } catch (err) {
                console.warn("updateAuditingFoundStatus failed:", a.AssetTag, err);
                failed.push(a.AssetTag);
              }
            }

            if (failed.length) {
              Alert.alert(
                "Partial save",
                `Saved most items, but these failed:\n${failed.join(", ")}`
              );
            } else {
              alert("Work saved!");
              setPickedAssets([]);
              setCurrentDoor(null);
            }
          } catch (e) {
            console.warn("Save Work error:", e);
            alert("Failed to save audit.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  /** FINISH AUDIT
   * Confirm text: “Do you want to finish and save this audit?”
   * Sends entire local auditing table to server.
   */
  const finishAudit = async () => {
    Alert.alert(
      "Finish Audit?",
      "Do you want to finish and save this audit?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setBusy(true);
              await initDb();

              const rows = await selectAllAuditing();
              const res = await fetch(COMPLETE_AUDIT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: rows }),
              });

              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const json = await res.json();
              console.log("Finish Audit response:", json);
              alert("Audit submitted successfully.");
            } catch (e) {
              console.warn("Finish audit failed:", e);
              alert("Failed to submit audit.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const renderAsset = ({ item }) => (
    <View style={styles.assetRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.assetMain} numberOfLines={1}>
          {item.AssetTag} — {item.Description}
        </Text>
        <Text style={styles.assetSub}>Serial: {item.Serial}</Text>
      </View>
      <Pressable style={styles.removeBtn} onPress={() => removeAsset(item.AssetTag)}>
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  );

  /* ===== Scanning full-screen ===== */
  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "code128", "ean13", "ean8", "upc_a", "upc_e", "code39"],
          }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.cancelContainer}>
          <Pressable style={styles.cancelButton} onPress={() => setScanning(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dataworks</Text>
        <Text style={styles.headerSubtitle}>Audit</Text>
      </View>

      {/* Top actions */}
      <View style={[styles.card, styles.shadow]}>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={requestPermissionAndScan}
          disabled={busy}
        >
          <Text style={styles.btnText}>
            {busy ? "Working..." : "Scan QR / Barcode"}
          </Text>
        </Pressable>

        {/* Centered Finish Audit button */}
        <View style={{ marginTop: 10, alignItems: "center" }}>
          <Pressable
            style={[styles.btn, styles.btnOutlineSmall]}
            onPress={finishAudit}
            disabled={busy}
          >
            <Text style={styles.btnOutlineSmallText}>Finish Audit</Text>
          </Pressable>
        </View>

        {scannedData && (
          <Text style={styles.lastScanText}>Last scanned: {scannedData.data}</Text>
        )}
      </View>

      {/* Current Door */}
      <View style={[styles.card, styles.shadow]}>
        <Text style={styles.sectionTitle}>Current Door</Text>
        {currentDoor ? (
          <View style={styles.doorBox}>
            <Text style={styles.doorLine}>
              <Text style={styles.bold}>RoomTag: </Text>
              {currentDoor.RoomTag}
            </Text>
            <Text style={styles.doorLine}>
              <Text style={styles.bold}>RoomLocation: </Text>
              {currentDoor.RoomLocation}
            </Text>
            <Text style={styles.doorLine}>
              <Text style={styles.bold}>BuildingName: </Text>
              {currentDoor.BuildingName}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            Scan a door tag to start. While a door is selected, scans are treated as assets.
          </Text>
        )}
      </View>

      {/* Scanned Assets */}
      <View style={[styles.card, styles.shadow]}>
        <Text style={styles.sectionTitle}>Scanned Assets</Text>

        {pickedAssets.length === 0 ? (
          <Text style={styles.hint}>Scan assets — they’ll appear here.</Text>
        ) : (
          <FlatList
            data={pickedAssets}
            renderItem={renderAsset}
            keyExtractor={(a) => a.AssetTag}
            style={{ height: ASSETS_LIST_HEIGHT }}
            showsVerticalScrollIndicator
            contentContainerStyle={{
              gap: 8,
              paddingBottom: 16 + TABBAR + insets.bottom + 16,
            }}
            ListFooterComponent={() => (
              <View
                style={{
                  paddingTop: 8,
                  marginBottom: TABBAR + insets.bottom + 24,
                }}
              >
                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={saveWork}
                  disabled={busy}
                >
                  <Text style={styles.btnText}>Save Work</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

/* ----------------- STYLES ----------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "ios" ? 0 : 40,
    paddingBottom: 18,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.gold,
    fontWeight: "600",
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },

  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },

  // Centered outline button for "Finish Audit"
  btnOutlineSmall: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "center",
  },
  btnOutlineSmallText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },

  sectionTitle: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 10,
  },

  doorBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  doorLine: { fontSize: 14, marginBottom: 4, color: COLORS.primary },
  bold: { fontWeight: "700" },
  hint: { color: COLORS.gray },

  lastScanText: {
    marginTop: 10,
    color: COLORS.primary,
    textAlign: "center",
    fontSize: 13,
  },

  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  assetMain: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  assetSub: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  removeBtn: {
    marginLeft: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  removeText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.red,
    lineHeight: 18,
  },

  cancelContainer: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 16,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});

