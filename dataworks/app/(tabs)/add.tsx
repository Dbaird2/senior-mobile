import { View, Text, StyleSheet, Button } from "react-native";
export default function AddScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add</Text>
      <Button title="Add Item" onPress={() => { /* TODO */ }} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
});

