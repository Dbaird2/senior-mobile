import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { getData, storeLogin } from "../lib/store-login";
import { useFocusEffect } from '@react-navigation/native';

import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteAuditingTable,
  insertIntoAuditing,
  insertIntoAuditingExcel,
  selectAllAuditing,
} from "../../src/sqlite.jsx";

/**
 * Simple, reusable ListSelector for React Native
 *
 * Props:
 * - items: Array<{ dept_name: string, dept_id?: string }>
 * - multi?: boolean (default false)
 * - initialSelected?: Array<string>
 * - onChange?: (selected: Array<string>) => void
 */

const COLORS = {
  primary: "#003594",
  gold: "#FFC72C",
  cream: "#F5E6BD",
  gray: "#707372",
  red: "#E74C3C",
  white: "#FFFFFF",
  border: "#DDDDDD",
};

// Reserve space so rows never sit behind the fixed bottom button.
const BOTTOM_BUTTON_SPACE = 120; // height of button + comfy buffer

function ListSelector({
  items = [],
  multi = false,
  initialSelected = [],
  onChange,
  placeholder = "Search...",
}) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(
    Array.isArray(initialSelected) ? initialSelected : []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        (it.dept_name && it.dept_name.toLowerCase().includes(q)) ||
        (it.dept_id && it.dept_id.toLowerCase().includes(q))
    );
  }, [items, query]);

  const toggle = useCallback(
    (dept_name) => {
      // single-select behavior (unchanged logic)
      setSelectedIds([dept_name]);
      onChange && onChange([dept_name]);
    },
    [onChange]
  );

  const isSelected = useCallback(
    (dept_name) => selectedIds.includes(dept_name),
    [selectedIds]
  );

  const clear = useCallback(() => {
    setSelectedIds([]);
    onChange && onChange([]);
  }, [onChange]);

  const renderItem = ({ item }) => {
    const selected = isSelected(item.dept_name);
    return (
      <TouchableOpacity
        onPress={() => toggle(item.dept_name)}
        style={[listStyles.item, selected && listStyles.itemSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <View style={listStyles.itemText}>
          <Text style={[listStyles.label, selected && listStyles.labelSelected]}>
            {item.dept_name}
          </Text>
          {item.dept_id ? (
            <Text style={listStyles.dept_id}>{item.dept_id}</Text>
          ) : null}
        </View>
        <View style={listStyles.check}>
          <Text style={[listStyles.checkText, selected && listStyles.checkTextOn]}>
            {selected ? "✓" : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={listStyles.container}>
      <View style={listStyles.controlsRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray}
          style={listStyles.search}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity onPress={clear} style={listStyles.controlButton}>
          <Text style={listStyles.controlText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={[listStyles.card, baseStyles.shadow, { padding: 0 }]}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.dept_name)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={listStyles.separator} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingVertical: 6,
            paddingBottom: BOTTOM_BUTTON_SPACE, // <-- ensures last rows clear the button
          }}
          ListEmptyComponent={() => (
            <View style={listStyles.empty}>
              <Text style={listStyles.emptyText}>No items</Text>
            </View>
          )}
          ListFooterComponent={<View style={{ height: 8 }} />}
        />
      </View>
    </View>
  );
}

async function startAuditFetch(dept) {
  const dept_name = dept[0];
  let email = await getData("email");
  email = JSON.parse(email).value;
  let pw = await getData("pw");
  pw = JSON.parse(pw).value;

  //console.log("Starting audit for dept_name:", dept_name);
  const res = await fetch(
    "https://dataworks-7b7x.onrender.com/phone-api/audit/start-audit.php",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dept_name: dept_name,
        email: email,
        pw: pw,
      }),
    }
  );
  await deleteAuditingTable();
  const data = await res.json();
  const new_data = data.data;

  //console.log("New data length:", new_data.length);
  for (let i = 0; i < new_data.length; i++) {
    /*console.log(
      "Inserting audit item:",
      new_data[i].asset_tag,
      new_data[i].asset_name
    );*/
    insertIntoAuditing([new_data[i]]);
  }
  await storeLogin('audit_dept', dept_name);
  //console.log("Audit data inserted into SQLite for dept_name:", dept_name);
  //const auditing_records = selectAllAuditing();
  //console.log("Auditing Records in SQLite:", auditing_records);
  router.push({
    pathname: "/(auth)/audit",
    query: { status: "Logged In" },
  });
}

export default function StartAudit() {
  const [sampleItems, setSampleItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);

  useFocusEffect(
    useCallback(() => {
      // This runs EVERY time the screen is focused
      const loadData = async () => {
        // e.g. read from SQLite again
        // const data = await getDataFromSQLite();
        // setItems(data);
        const data = await selectAllAuditing();
        await Promise.resolve(data);
        if (data.length > 0) {
          router.push({
            pathname: "/(auth)/audit",
          });
        }
      };

      loadData();

    }, [])
  );


  /* ===== Upload (logic unchanged) ===== */
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
      let data = XLSX.utils.sheet_to_json(ws);
      if (data[0]["Asset Inservice and by Dept ID"] !== undefined) {
        data = XLSX.utils.sheet_to_json(ws, { range: 1 });
      }
      //console.log("Imported data:", data);
      for (let i = 0; i < data.length; i++) {
        insertIntoAuditingExcel([data[i]]);
      }
      //const auditing_records = await selectAllAuditing();
      //console.log("Auditing Records in SQLite:", auditing_records);
    } catch (e) {
      console.error(e);
      setError("Import failed.");
    } finally {
      setLoading(false);
      router.push({
        pathname: "/(auth)/audit",
        query: { status: "Logged In" },
      });
    }
  };

  async function loadDepartments() {
    //console.log("Loading departments...");
    let email = await getData("email");
    email = JSON.parse(email).value;
    let pw = await getData("pw");
    pw = JSON.parse(pw).value;
    const dept_res = await fetch(
      "https://dataworks-7b7x.onrender.com/phone-api/get-all-depts.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email, pw: pw }),
      }
    );
    if (!dept_res.ok) {
      console.error("Failed to load departments:", dept_res.status);
      setError("Failed to load departments.");
      return;
    } 
    //console.log("Departments response status:", dept_res.status);
    const depts = await dept_res.json();
    //console.log("Departments loaded:", depts.data);
    setSampleItems(depts.data);
  }
  //console.log("Sample items length:", sampleItems.length);
  if (sampleItems.length === 0) {
    loadDepartments();
  }

  return (
    <SafeAreaView style={baseStyles.screen}>
      {/* Header to match (auth)/audit.jsx */}
      <View style={baseStyles.header}>
        <Text style={baseStyles.headerTitle}>Dataworks</Text>
        <Text style={baseStyles.headerSubtitle}>Start Audit</Text>
      </View>

      {/* Upload card */}
      <View style={[baseStyles.card, baseStyles.shadow]}>
        <Pressable
          style={[baseStyles.btn, baseStyles.btnOutline, { marginTop: 6 }]}
          onPress={pickExcel}
        >
          <Text style={baseStyles.btnOutlineText}>Upload Excel / CSV</Text>
        </Pressable>
        {error ? (
          <Text style={{ color: COLORS.red, marginTop: 8 }}>{error}</Text>
        ) : null}
      </View>

      {/* Selector list */}
      <View style={{ flex: 1 }}>
        <ListSelector
          items={sampleItems}
          multi={true}
          initialSelected={[]}
          onChange={(dept_name) => {
            setSelected(dept_name);
            //console.log("Selected dept_name:", dept_name);
          }}
        />
      </View>

      {/* Fixed bottom primary button */}
      <Pressable
        onPress={() => startAuditFetch(selected)}
        style={({ pressed }) => [
          baseStyles.bottomBar,
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text style={baseStyles.bottomBarText}>
          {selected.length
            ? `Start Audit — ${selected.join(", ")}`
            : "Start Audit"}
        </Text>
      </Pressable>
      {/* Safe spacing is handled by BOTTOM_BUTTON_SPACE in the list */}
    </SafeAreaView>
  );
}

/* ===== Shared “auth theme” styles ===== */
const baseStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

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

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBarText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 16,
  },
});

/* ===== List styles (cards + search + rows) ===== */
const listStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  search: {
    flex: 1,
    height: 42,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FAFAFA",
    color: COLORS.primary,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  controlText: {
    color: COLORS.white,
    fontWeight: "700",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  itemSelected: {
    backgroundColor: "#EAF2FF",
  },
  itemText: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  labelSelected: {
    fontWeight: "800",
    color: COLORS.primary,
  },
  dept_id: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  check: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    fontSize: 18,
    color: "transparent",
  },
  checkTextOn: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 12,
    marginRight: 12,
  },
  empty: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.gray,
  },
});
