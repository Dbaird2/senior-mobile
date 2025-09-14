import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async (text) => {
    setQuery(text);
    try {
      // Replace with your real API endpoint
      const response = await fetch(`http://your-api-url.com/search?q=${text}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error getting your search:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <TextInput
        placeholder="What you want?"
        style={styles.input}
        value={query}
        onChangeText={handleSearch}
      />

      <FlatList
        data={results}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
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
