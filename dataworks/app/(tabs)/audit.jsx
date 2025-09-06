import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

export default function AuditScreen() {
  const [fileInfo, setFileInfo] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickExcel = async () => {
    setError("");
    setLoading(true);
    setPreviewRows([]);
    setColumns([]);

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          // common Excel & CSV types
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-excel", // .xls
          "text/csv", // .csv
          "*/*", // fallback
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (res.canceled) {
        setLoading(false);
        return;
      }

      const file = res.assets?.[0];
      setFileInfo({ name: file.name, size: file.size, uri: file.uri, mimeType: file.mimeType });

      // Read file as base64, then parse with sheetjs
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const wb = XLSX.read(base64, { type: "base64" });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];

      // Convert to JSON rows (array of objects)
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Compute columns from keys (first 20 columns to keep UI light)
      const cols = rows.length ? Object.keys(rows[0]).slice(0, 20) : [];

      // Keep a small preview (first 20 rows)
      setColumns(cols);
      setPreviewRows(rows.slice(0, 20));
    } catch (e) {
      console.log(e);
      setError("Could not read that file. Try a .xlsx, .xls, or .csv.");
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <View style={[styles.row, styles.headerRow]}>
      {columns.map((c) => (
        <Text key={c} style={[styles.cell, styles.headerCell]} numberOfLines={1}>
          {c}
        </Text>
      ))}
    </View>
  );

  const Row = ({ item }) => (
    <View style={styles.row}>
      {columns.map((c) => (
        <Text key={c} style={styles.cell} numberOfLines={1}>
          {String(item[c] ?? "")}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit</Text>

      <Pressable style={styles.button} onPress={pickExcel}>
        <Text style={styles.buttonText}>Upload Excel / CSV</Text>
      </Pressable>

      {loading && <ActivityIndicator size="large" />}

      {fileInfo && !loading && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.meta}>File: {fileInfo.name}</Text>
          {!!fileInfo.size && <Text style={styles.meta}>Size: {fileInfo.size} bytes</Text>}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {previewRows.length > 0 && (
        <View style={styles.table}>
          <Header />
          <FlatList
            data={previewRows}
            keyExtractor={(_, idx) => String(idx)}
            renderItem={Row}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  button: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  meta: { marginTop: 4, fontSize: 14 },
  error: { color: "red", marginTop: 10 },
  table: { marginTop: 16, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  row: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { backgroundColor: "#f2f2f2" },
  cell: { flex: 1, padding: 8, minWidth: 80 },
  headerCell: { fontWeight: "700" },
});

