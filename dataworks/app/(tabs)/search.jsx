import { View, Text, StyleSheet, TextInput } from "react-native";
export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <TextInput placeholder="Type to search…" style={styles.input} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
  input: { width: "100%", borderWidth: 1, borderRadius: 8, padding: 12 },
});

