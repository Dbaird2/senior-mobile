import { View, Text, StyleSheet } from "react-native";
export default function AuditScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit</Text>
      <Text>Put your audit UI here.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
});

