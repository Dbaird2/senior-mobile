import React,{ useState } from "react";
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
      const response = await fetch(`https://dataworks-7b7x.onrender.com/phone-api/get-all-assets.php`, 
	{
		method: 'POST', 
		headers: {'Content-Type': 'application/json'}, 
		body: JSON.stringify({key:123})
	});
      const data = await response.json();
	  console.log("API:", data);
      setResults(data.data);
    } catch (error) {
      console.error("Error getting your search:", error);
    }
  };
const new_data = results.slice(20,40);
  return (
	<View style={styles.container}>
<TextInput
  placeholder="Please type asset ID"
  style={styles.input}
  value={query}
  onChangeText={handleSearch}
/>
      <Text style={styles.title}>Search</Text>
	  {new_data.map((item, index)=> 
		<Text key={index} style={styles.itemText}>
          {item.bus_unit} - {item.asset_tag} - {item.asset_name} - {item.serial_num}
        </Text>
	)}

      {/* <FlatList
        data={results}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      /> */}
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
