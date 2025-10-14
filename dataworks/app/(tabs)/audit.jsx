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
import { Camera, CameraView } from "expo-camera"; // ← use expo-camera

export default function AuditScreen() {
  const dispatch = useDispatch();
  const { fileInfo, rows, columns, hiddenCols } = useSelector((s) => s.audit);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Camera / scanning state
  const [hasPermission, setHasPermission] = useState(null); // null | boolean
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState("");

  // ====== CONFIG ======
  const COL_WIDTH = 140;
  const ROW_HEIGHT = 40;
  const HEADER_H = 46;
  const MAX_VISIBLE_ROWS = 40;
  // ====================

  // Derived values
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

  // -------- QR via expo-camera --------
  const requestPermissionAndScan = async () => {
    if (Platform.OS === "web") {
      alert("Scanning isn’t available on web.");
      return;
    }
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const granted = status === "granted";
      setHasPermission(granted);
      if (granted) setScanning(true);
    } catch (e) {
      console.warn("Camera permission error:", e);
      alert("Could not access the camera. Check app permissions.");
    }
  };

  const handleBarcodeScanned = ({ type, data }) => {
    // Close the camera and store/display the result
    setScanning(false);
    setScannedData(`Type: ${type}, Data: ${data}`);
    // Example place to hook into your table search:
    // const match = rows.find(r => Object.values(r).some(v => String(v ?? "").includes(data)));
    alert(`Scanned: ${data}`);
  };
  // ------------------------------------

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
          // Stop emitting events after a successful scan by closing the view (we setScanning(false) above)
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
      </View>
    );
  }

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

      // Detect header row
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const maxCols = aoa.reduce((m, r) => Math.max(m, r.length), 0);
      const headerIndex = aoa.findIndex(
        (r) =>
          r.length === maxCols &&
          r.slice(0, maxCols).every((c) => String(c).trim() !== "")
      );
      const headerRow = headerIndex >= 0 ? aoa[headerIndex] : aoa[0] || [];

      // Build column names (unique, non-empty)
      let cols = headerRow.map((c, i) =>
        String(c).trim() ? String(c).trim() : `Column_${i + 1}`
      );
      const seen = new Map();
      cols = cols.map((name) => {
        const n = seen.get(name) || 0;
        seen.set(name, n + 1);
        return n === 0 ? name : `${name}_${n + 1}`;
      });

      // Data rows → array of objects
      const dataRows = (headerIndex >= 0 ? aoa.slice(headerIndex + 1) : aoa.slice(1)).map((r) => {
        const o = {};
        cols.forEach((col, i) => {
          o[col] = r[i] ?? "";
        });
        return o;
      });

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit</Text>

      {/* Scan */}
      <Pressable
        style={[styles.button, { marginBottom: 10 }]}
        onPress={requestPermissionAndScan}
      >
        <Text style={styles.buttonText}>Scan QR / Barcode</Text>
      </Pressable>

      {/* Upload */}
      <Pressable style={styles.button} onPress={pickExcel}>
        <Text style={styles.buttonText}>Upload Excel / CSV</Text>
      </Pressable>

      {scannedData ? (
        <Text style={{ marginTop: 10, color: "#2563eb", textAlign: "center" }}>
          Last scanned: {scannedData}
        </Text>
      ) : null}

      {loading && <ActivityIndicator size="large" />}

      {fileInfo && !loading && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.meta}>File: {fileInfo.name}</Text>
          {!!fileInfo.size && <Text style={styles.meta}>Size: {fileInfo.size} bytes</Text>}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* hidden columns restore chips */}
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

      {/* table */}
      {rows.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingTop: 8 }}>
          <View style={[styles.tableBox, { width: tableWidth, maxHeight: HEADER_H + listHeight }]}>
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
  row: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  altRow: { backgroundColor: "#fafafa" },
  cell: { paddingHorizontal: 10, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

