"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { useDispatch, useSelector } from "react-redux";
import { setData } from "../auditSlice";
import { Camera, CameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useLocation from "../../hooks/useLocation";
import * as SQLite from "expo-sqlite";
import { initDb, getItem } from "../../src/sqlite";

const COLORS = {
  primary: "#003594",
  gold: "#FFC72C",
  cream: "#F5E6BD",
  gray: "#707372",
  red: "#E74C3C",
  white: "#FFFFFF",
  border: "#DDDDDD",
};

export default function AuditScreen() {
  const dispatch = useDispatch();
  const { fileInfo } = useSelector((s) => s.audit);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scanLockRef = useRef(false);

  const [scannedData, setScannedData] = useState(null);
  const { getCurrentLocation } = useLocation();

  const [currentDoor, setCurrentDoor] = useState(null);
  const [pickedAssets, setPickedAssets] = useState([]);

  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  // estimate tab bar height, then size our list shorter so footer is never hidden
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

  const saveWork = async () => {
    if (!currentDoor || pickedAssets.length === 0) {
      alert("Scan a door and at least one asset first.");
      return;
    }
    try {
      await initDb();
      const db = await SQLite.openDatabaseAsync("app.db");
      for (const a of pickedAssets) {
        await db.runAsync(
          `INSERT INTO auditing (tag, name, serial, dept_id)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(tag) DO UPDATE SET name=excluded.name`,
          [a.AssetTag, a.Description, a.Serial, currentDoor.RoomTag]
        );
      }
      alert("Work saved!");
      setPickedAssets([]);
      setCurrentDoor(null);
    } catch (e) {
      console.warn(e);
      alert("Failed to save audit.");
    }
  };

  /* ===== Upload ===== */
  const pickExcel = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) {
        setLoading(false);
        return;
      }
      const file = res.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const wb = XLSX.read(base64, { type: "base64" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      dispatch(setData({ fileInfo: file, rows: data }));
    } catch (e) {
      console.error(e);
      setError("Import failed.");
    } finally {
      setLoading(false);
    }
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
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={requestPermissionAndScan}>
          <Text style={styles.btnText}>Scan QR / Barcode</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnOutline, { marginTop: 10 }]} onPress={pickExcel}>
          <Text style={styles.btnOutlineText}>Upload Excel / CSV</Text>
        </Pressable>
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
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={saveWork}>
                  <Text style={styles.btnText}>Save Work</Text>
                </Pressable>
              </View>
            )}
            ListFooterComponentStyle={{}}
          />
        )}
      </View>

      {loading && <ActivityIndicator size="large" color={COLORS.primary} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  btnOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  btnOutlineText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },

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

  // Camera cancel overlay
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

  error: { color: COLORS.red, textAlign: "center", marginTop: 8 },
});

