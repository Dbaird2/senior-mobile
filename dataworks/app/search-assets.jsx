import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  initDb,
  getAllItems,
  searchItems,
  getItem,
  getAllDepartments,
  getAllBuildings,
  searchDeptItems,
} from "../src/db";
import DropDownPicker from "react-native-dropdown-picker";

export default function SearchAssetsScreen() {
  const { results: resultsParam } = useLocalSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: "Assets", value: "asset" },
    { label: "Department", value: "department" },
    { label: "Building", value: "building" },
  ]);
  const [offset, setOffset] = useState(0);
  const didInit = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    let usedParams = false;
    if (resultsParam) {
      try {
        const parsed = JSON.parse(String(resultsParam));
        if (Array.isArray(parsed)) {
          setResults(parsed);
          usedParams = true;
        }
      } catch {}
    }

    initDb();
    let data = [];
    if (value === "department") {
      data = getAllDepartments(50, offset);
    } else if (value === "building") {
      data = getAllBuildings(50, offset);
    } else {
      data = getAllItems(50, offset);
    }
    setResults(data);
  }, [resultsParam, setValue]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const q = text.trim();
      if (q) {
        const exact = getItem(q);
        setSelected(exact || null);
      } else {
        setSelected(null);
      }

      let hits = [];
      if (value === "asset" || value === null) {
        const searchRegex = new RegExp(/^D\d+/i);
        const deptSearch = searchRegex.test(q);
        if (deptSearch) {
          hits = searchDeptItems(q, 50, 0);
        } else {
          hits = q ? searchItems(q, 50, 0) : getAllItems(50, 0);
        }
      } else if (value === "department") {
        hits = getAllDepartments(50, 0);
      } else if (value === "building") {
        hits = getAllBuildings(50, 0);
      }
      setResults(hits || []);
    }, 250);
  };

  const renderRow = ({ item }) => (
    <View
      style={[
        styles.row,
        selected &&
        (item.tag === selected.tag || item.dept_id === selected.dept_id)
          ? styles.rowActive
          : null,
      ]}
    >
      <Text style={styles.rowText}>
        {item?.tag || item?.dept_id} — {item.name} - {item.room_tag} -{" "}
        {item.dept_id}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>

      {/* Dropdown */}
      <View style={styles.ddpWrapper}>
        <DropDownPicker
          open={open}
          value={value}
          items={items}
          setOpen={setOpen}
          setValue={setValue}
          setItems={setItems}
          placeholder="Select a category"
          style={styles.ddp}
          dropDownContainerStyle={styles.ddpDropdown}
          listItemContainerStyle={styles.ddpItem}
          itemSeparator={true}
          itemSeparatorStyle={styles.ddpItemSeparator}
          selectedItemContainerStyle={styles.ddpItemSelected}
          selectedItemLabelStyle={styles.ddpItemLabelSelected}
          placeholderStyle={styles.ddpPlaceholder}
          labelStyle={styles.ddpLabel}
          arrowIconStyle={styles.ddpArrow}
          tickIconStyle={styles.ddpTick}
        />
      </View>

      
      <TextInput
        placeholder="Type an asset TAG"
        placeholderTextColor="#6B7280"
        style={styles.input}
        value={query}
        onChangeText={handleSearch}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {selected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Asset Info</Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Tag: </Text>
            {selected?.tag || selected?.dept_id}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Name: </Text>
            {selected?.name}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Room Tag: </Text>
            {selected?.room_tag}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Serial ID: </Text>
            {selected?.serial}
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, i) => String(item.id ?? `${item.tag}-${i}`)}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.empty}>No results</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    padding: 16,
    paddingTop: 50,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
    color: "#003594",
    borderBottomWidth: 4,
    borderBottomColor: "#FFC72C",
    alignSelf: "center",
    paddingBottom: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    color: "#0A0A0A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#003594",
    shadowColor: "#003594",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#003594",
    shadowColor: "#003594",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardTitle: {
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 8,
    color: "#FFC72C",
    textTransform: "uppercase",
  },
  cardLine: {
    fontSize: 16,
    marginTop: 4,
    color: "#0A0A0A",
  },
  label: {
    fontWeight: "700",
    color: "#003594",
  },
  row: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#003594",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rowActive: {
    borderColor: "#003594",
    backgroundColor: "rgba(255, 199, 44, 0.25)",
    shadowColor: "#FFC72C",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: {width:0, height: 3 },
  },
  rowText: {
    fontSize: 16,
    color: "#003594",
  },
  empty: {
    textAlign: "center",
    marginTop: 24,
    color: "#888",
    fontStyle: "italic",
  },

  ddpWrapper: {
    zIndex: 1000,
    elevation: 1000,
    marginBottom: 12,
  },
  ddp: {
    backgroundColor: "#FFFFFF",
    borderColor: "#003594",
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 46,
  },
  ddpDropdown: {
    backgroundColor: "#FFFFFF",
    borderColor: "#003594",
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  ddpPlaceholder: {
    color: "#6B7280",
    fontSize: 16,
  },
  ddpLabel: {
    color: "#003594",
    fontSize: 16,
    fontWeight: "600",
  },
  ddpItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ddpItemSeparator: {
    height: 1,
    backgroundColor: "#E3E7EF",
    marginHorizontal: 10,
  },
  ddpItemSelected: {
    backgroundColor: "rgba(255, 199, 44, 0.20)",
  },
  ddpItemLabelSelected: {
    color: "#003594",
    fontWeight: "700",
  },
  ddpArrow: {
    tintColor: "#003594",
  },
  ddpTick: {
    tintColor: "#FFC72C",
  },
});
