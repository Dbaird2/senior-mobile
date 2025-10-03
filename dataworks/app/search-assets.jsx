import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { initDb, getAllItems, insertItem, searchItems } from "../src/db";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const handleSearch = async (text) => {};
    const didInit = useRef(false);

  useEffect(() => {
     if (didInit.current) return;
     didInit.current = true;
      initDb();

    const data = getAllItems();
    setResults(data);
  }, []);
  // const new_data = results.slice(20, 40);
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Please type asset ID"
        style={styles.input}
        value={query}
        onChangeText={handleSearch}
      />
      <Text style={styles.title}>Search</Text>
      {results.map((item, index) => (
        <Text key={index} style={styles.itemText}>
          {item.tag} - {item.name}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
  input: { width: "100%", borderWidth: 1, borderRadius: 8, padding: 12 },
  resultItem: {
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    width: "100%",
  },
});
