import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList } from "react-native";
import { initDb, getAllItems, searchItems, getItem } from "../src/db";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const didInit = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    initDb();
    const data = getAllItems(50, 0) || getAllItems();
    setResults(data || []);
  }, []);

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
      const hits = q ? searchItems(q, 50, 0) : getAllItems(50, 0);
      setResults(hits || []);
    }, 250);
  };

  const renderRow = ({ item, index }) => (
    <View
      style={[
        styles.row,
        selected && item.tag === selected.tag ? styles.rowActive : null,
      ]}
    >
      <Text style={styles.rowText}>
        {item.tag} — {item.name} - {item.room_tag}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <TextInput
        placeholder="Type an asset TAG"
        placeholderTextColor="#ccc"
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
            {selected.tag}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Name: </Text>
            {selected.name}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Room Tag: </Text>
            {selected.room_tag}
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
    backgroundColor: "#FFC72C", // yellow background
    padding: 16,
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#000000", // keep "Search" black
  },
  input: {
    backgroundColor: "#003594", // blue search bar
    color: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontWeight: "700", fontSize: 18, marginBottom: 8 },
  cardLine: { fontSize: 16, marginTop: 4 },
  label: { fontWeight: "600" },

  row: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  rowActive: { borderColor: "#003594", borderWidth: 2 },
  rowText: { fontSize: 16 },
  empty: { textAlign: "center", marginTop: 24, opacity: 0.6 },
});
