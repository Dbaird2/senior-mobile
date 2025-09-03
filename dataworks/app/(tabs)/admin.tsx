import { View, Text, StyleSheet, Switch } from "react-native";
import { useState } from "react";
export default function AdminScreen() {
  const [enabled, setEnabled] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text>Enable maintenance mode</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
});

