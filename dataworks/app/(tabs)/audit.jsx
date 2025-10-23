import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { useDispatch, useSelector } from "react-redux";
import { setData, toggleColumn, showColumn } from "../auditSlice";
import { Camera, CameraView } from "expo-camera";
import useLocation from "../../hooks/useLocation";

const MOCK = {
  doorTags: {
    "DOOR-1001": {
      RoomTag: "DOOR-1001",
      RoomLocation: "101A",
      BuildingName: "HQ East",
      assets: [],
    },
    "DOOR-2005": {
      RoomTag: "DOOR-2005",
      RoomLocation: "2F West",
      BuildingName: "HQ West",
      assets: [],
    },
  },
  assetsByCode: {
    "AST-0001": { AssetTag: "AST-0001", Description: "Office Chair", Serial: "CH-9931" },
    "AST-0002": { AssetTag: "AST-0002", Description: "Standing Desk", Serial: "SD-5542" },
    "AST-0003": { AssetTag: "AST-0003", Description: "Monitor 27in", Serial: "MN-2719" },
    "AST-QR-9": { AssetTag: "AST-QR-9", Description: "Label Printer", Serial: "LP-9009" },
  },
};

export default function AuditScreen() {
  const dispatch = useDispatch();
  const { fileInfo, rows, columns, hiddenCols } = useSelector((s) => s.audit);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);

  // contains: { type, data, location, scannedAt }
  const [scannedData, setScannedData] = useState(null);

  const { getCurrentLocation } = useLocation();

  // === audit working state
  const [currentDoor, setCurrentDoor] = useState(null); // { RoomTag, RoomLocation, BuildingName, assets[] }
  const [pickedAssets, setPickedAssets] = useState([]); // array of asset objects
  const [scanIntent, setScanIntent] = useState("asset"); // "door" | "asset"

  const COL_WIDTH = 140;
  const ROW_HEIGHT = 40;
  const HEADER_H = 46;
  const MAX_VISIBLE_ROWS = 40;

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols[c]),
    [columns, hiddenCols]
  );
  const hiddenList = useMemo(
    () => columns.filter((c) => !!hiddenCols[c]),
    [columns, hiddenCols]
  );
  const tableWidth = useMemo(
    () => Math.max(visibleColumns.length * COL_WIDTH, 1),
    [visibleColumns.length]
  );
  const listHeight = useMemo(
    () => Math.min(rows.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT,
    [rows.length]
  );

  // ====== CAMERA & SCAN ======
  const requestPermissionAndScan = async (intent = "asset") => {
    if (Platform.OS === "web") {
      alert("Scanning isn’t available on web.");
      return;
    }
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const granted = status === "granted";
      setHasPermission(granted);
      if (granted) {
        setScanIntent(intent);
        setScanning(true);
      }
    } catch (e) {
      console.warn("Camera permission error:", e);
      alert("Could not access the camera. Check app permissions.");
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
    setScanning(false);

    const loc = await getCurrentLocation(); // { coords, timestamp } | null

    const payload = {
      type,
      data: String(data),
      location: loc?.coords
        ? {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude ?? null,
            accuracy: loc.coords.accuracy ?? null,
          }
        : null,
      scannedAt: new Date().toISOString(),
    };
    setScannedData(payload);

    // honor intent: door vs asset
    if (scanIntent === "door") {
      const tag = payload.data;

      // find or create door
      const existing =
        MOCK.doorTags[tag] ||
        (MOCK.doorTags[tag] = {
          RoomTag: tag,
          RoomLocation: "Unknown",
          BuildingName: "Unknown",
          assets: [],
        });

      // write geolocation into RoomLocation
      const newRoomLocation = formatGeoToRoomLocation(payload.location);
      MOCK.doorTags[tag].RoomLocation = newRoomLocation;

      // set as current door
      const current = { ...MOCK.doorTags[tag] };
      setCurrentDoor(current);

      // load its assets into the working list
      const loadedAssets = (current.assets || []).map((assetTag) => {
        return (
          MOCK.assetsByCode[assetTag] ||
          (MOCK.assetsByCode[assetTag] = {
            AssetTag: assetTag,
            Description: "Mock Asset",
            Serial: `SN-${String(assetTag).slice(-4)}`,
          })
        );
      });
      setPickedAssets(loadedAssets);

      const where = payload.location
        ? ` @ (${payload.location.latitude.toFixed(6)}, ${payload.location.longitude.toFixed(6)})`
        : "";
      alert(
        `Door selected: ${tag}${where}\nRoomLocation updated to: ${newRoomLocation}`
      );
      return;
    }

    // asset intent
    if (!currentDoor) {
      alert("Scan a door tag first.");
      return;
    }

    const code = payload.data;
    const asset =
      MOCK.assetsByCode[code] ||
      (MOCK.assetsByCode[code] = {
        AssetTag: code,
        Description: "Mock Asset",
        Serial: `SN-${String(code).slice(-4)}`,
      });

    setPickedAssets((prev) =>
      prev.some((a) => a.AssetTag === asset.AssetTag) ? prev : [...prev, asset]
    );

    const where = payload.location
      ? ` @ (${payload.location.latitude.toFixed(6)}, ${payload.location.longitude.toFixed(6)})`
      : "";
    alert(`Asset added: ${asset.AssetTag}${where}`);
  };

  // remove asset from the working list
  const removeAsset = (assetTag) =>
    setPickedAssets((prev) => prev.filter((a) => a.AssetTag !== assetTag));

  // persist working list into the door tag
  const saveWork = () => {
    if (!currentDoor) {
      alert("Scan a door tag first.");
      return;
    }
    const ids = pickedAssets.map((a) => a.AssetTag);
    MOCK.doorTags[currentDoor.RoomTag].assets = ids;
    alert(
      `Saved ${ids.length} asset${ids.length === 1 ? "" : "s"} to ${currentDoor.RoomTag}.`
    );
    setPickedAssets([]);
    // keep the door selected so you can keep adding later
  };

  // Render full-screen camera when scanning
  if (scanning) {
    if (hasPermission === null) {
      return (
        <View style={styles.center}>
          <Text>Requesting camera permission…</Text>
        </View>
      );
    }
    if (hasPermission === false) {
      return (
        <View style={styles.center}>
          <Text>No camera permission. Enable it in system settings.</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "pdf417",
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "code93",
              "itf14",
              "codabar",
              "datamatrix",
              "aztec",
              "interleaved2of5",
            ],
          }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Cancel button overlay */}
        <View style={styles.cancelContainer}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => setScanning(false)}
            android_ripple={{ color: "#e5e7eb" }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ====== PICK EXCEL ======
  const pickExcel = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
          "*/*",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) {
        setLoading(false);
        return;
      }

      const file = res.assets?.[0];
      const nextFileInfo = {
        name: file.name,
        size: file.size,
        uri: file.uri,
        mimeType: file.mimeType,
      };

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const wb = XLSX.read(base64, { type: "base64" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const maxCols = aoa.reduce((m, r) => Math.max(m, r.length), 0);
      const headerIndex = aoa.findIndex(
        (r) =>
          r.length === maxCols &&
          r.slice(0, maxCols).every((c) => String(c).trim() !== ""
        )
      );
      const headerRow = headerIndex >= 0 ? aoa[headerIndex] : aoa[0] || [];

      let cols = headerRow.map((c, i) =>
        String(c).trim() ? String(c).trim() : `Column_${i + 1}`
      );
      const seen = new Map();
      cols = cols.map((name) => {
        const n = seen.get(name) || 0;
        seen.set(name, n + 1);
        return n === 0 ? name : `${name}_${n + 1}`;
      });

      const dataRows = (headerIndex >= 0 ? aoa.slice(headerIndex + 1) : aoa.slice(1)).map(
        (r) => {
          const o = {};
          cols.forEach((col, i) => {
            o[col] = r[i] ?? "";
          });
          return o;
        }
      );

      dispatch(setData({ fileInfo: nextFileInfo, columns: cols, rows: dataRows }));
    } catch (e) {
      console.log(e);
      setError("Could not read that file. Try a .xlsx, .xls, or .csv.");
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <View style={[styles.headerRow, { height: HEADER_H, width: tableWidth }]}>
      {visibleColumns.map((c, i) => (
        <Pressable
          key={`hdr-${i}-${c}`}
          onPress={() => dispatch(toggleColumn(c))}
          style={[styles.headerCell, { width: COL_WIDTH, height: HEADER_H }]}
          android_ripple={{ color: "#e5e7eb" }}
        >
          <Text style={styles.headerText} numberOfLines={1}>
            {c}
          </Text>
          <Text style={styles.headerHint}>tap to hide</Text>
        </Pressable>
      ))}
    </View>
  );

  const Row = ({ item, index }) => (
    <View
      style={[
        styles.row,
        index % 2 ? styles.altRow : null,
        { width: tableWidth, height: ROW_HEIGHT },
      ]}
    >
      {visibleColumns.map((c, i) => (
        <View
          key={`cell-${index}-${i}-${c}`}
          style={[styles.cell, { width: COL_WIDTH, height: ROW_HEIGHT }]}
        >
          <Text numberOfLines={1}>{String(item[c] ?? "")}</Text>
        </View>
      ))}
    </View>
  );

  // helper to show last scan info
  const renderLastScanned = () => {
    if (!scannedData) return null;
    const locText = scannedData.location
      ? `${scannedData.location.latitude.toFixed(6)}, ${scannedData.location.longitude.toFixed(6)}, ${
          typeof scannedData.location.altitude === "number"
            ? scannedData.location.altitude.toFixed(1)
            : "n/a"
        }`
      : "(no location)";
    return (
      <Text style={{ marginTop: 10, color: "#2563eb", textAlign: "center" }}>
        Last scanned: Type: {scannedData.type}, Data: {scannedData.data}, Location: {locText}
      </Text>
    );
  };

  const renderAuditTray = () => (
    <View style={styles.auditTray}>
      <Text style={styles.trayTitle}>Current Door</Text>
      {currentDoor ? (
        <View style={styles.doorCard}>
          <Text style={styles.doorLine}>
            <Text style={styles.bold}>RoomTag:</Text> {currentDoor.RoomTag}
          </Text>
          <Text style={styles.doorLine}>
            <Text style={styles.bold}>RoomLocation:</Text> {currentDoor.RoomLocation}
          </Text>
          <Text style={styles.doorLine}>
            <Text style={styles.bold}>BuildingName:</Text> {currentDoor.BuildingName}
          </Text>
        </View>
      ) : (
        <Text style={styles.trayHint}>Scan a door tag to start.</Text>
      )}

      <Text style={[styles.trayTitle, { marginTop: 12 }]}>Scanned Assets</Text>
      {pickedAssets.length === 0 ? (
        <Text style={styles.trayHint}>Scan assets — they’ll appear here.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {pickedAssets.map((a) => (
            <View key={a.AssetTag} style={styles.assetRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assetMain} numberOfLines={1}>
                  {a.AssetTag} — {a.Description}
                </Text>
                <Text style={styles.assetSub}>Serial: {a.Serial}</Text>
              </View>
              <Pressable
                onPress={() => removeAsset(a.AssetTag)}
                style={styles.removeBtn}
                android_ripple={{ color: "#fecaca" }}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        disabled={!currentDoor || pickedAssets.length === 0}
        onPress={saveWork}
        style={[
          styles.saveBtn,
          (!currentDoor || pickedAssets.length === 0) && { opacity: 0.5 },
        ]}
      >
        <Text style={styles.saveText}>Save Work</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit</Text>

      {/* Scan DOOR */}
      <Pressable
        style={[styles.button, { marginBottom: 10 }]}
        onPress={() => requestPermissionAndScan("door")}
      >
        <Text style={styles.buttonText}>Scan Door Tag</Text>
      </Pressable>

      {/* Scan ASSET */}
      <Pressable
        style={[styles.button, { marginBottom: 10 }]}
        onPress={() => requestPermissionAndScan("asset")}
      >
        <Text style={styles.buttonText}>Scan Asset</Text>
      </Pressable>

      {/* Upload */}
      <Pressable style={styles.button} onPress={pickExcel}>
        <Text style={styles.buttonText}>Upload Excel / CSV</Text>
      </Pressable>

      {renderLastScanned()}

      {/* Working tray */}
      {renderAuditTray()}

      {loading && <ActivityIndicator size="large" />}

      {fileInfo && !loading && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.meta}>File: {fileInfo.name}</Text>
          {!!fileInfo.size && <Text style={styles.meta}>Size: {fileInfo.size} bytes</Text>}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {hiddenList.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {hiddenList.map((c, i) => (
            <Pressable
              key={`hidden-${i}-${c}`}
              onPress={() => dispatch(showColumn(c))}
              style={styles.restoreChip}
              android_ripple={{ color: "#e5e7eb" }}
            >
              <Text style={styles.restoreText}>Show: {c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {rows.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ paddingTop: 8 }}
        >
          <View
            style={[styles.tableBox, { width: tableWidth, maxHeight: HEADER_H + listHeight }]}
          >
            <Header />
            <FlatList
              data={rows}
              keyExtractor={(_, idx) => String(idx)}
              renderItem={Row}
              showsVerticalScrollIndicator
              style={{ width: tableWidth, height: listHeight }}
              initialNumToRender={40}
              maxToRenderPerBatch={50}
              windowSize={10}
              removeClippedSubviews
              getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
              })}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  button: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  meta: { marginTop: 4, fontSize: 14 },
  error: { color: "red", marginTop: 10 },
  restoreChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginRight: 8,
  },
  restoreText: { fontSize: 12, color: "#111827", fontWeight: "500" },
  tableBox: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderColor: "#d1d5db",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f2f6ff",
    borderBottomWidth: 1,
    borderColor: "#cfe0ff",
  },
  headerCell: { paddingHorizontal: 10, justifyContent: "center" },
  headerText: { fontWeight: "700" },
  headerHint: { fontSize: 10, color: "#6b7280" },
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  altRow: { backgroundColor: "#fafafa" },
  cell: { paddingHorizontal: 10, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Cancel button styling (overlay)
  cancelContainer: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },

  // audit tray + red X list
  auditTray: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  trayTitle: { fontSize: 16, fontWeight: "700" },
  trayHint: { marginTop: 6, color: "#6b7280" },
  doorCard: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  doorLine: { fontSize: 14, marginBottom: 2 },
  bold: { fontWeight: "700" },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  assetMain: { fontSize: 14, fontWeight: "600" },
  assetSub: { fontSize: 12, color: "#6b7280" },
  removeBtn: {
    marginLeft: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  removeText: { fontSize: 18, fontWeight: "800", color: "#b91c1c", lineHeight: 18 },
  saveBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});

