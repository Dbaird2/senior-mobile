import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getMyProfiles,
  getOtherProfiles,
  searchProfilesByEmail,
  addProfile,
  renameProfile,
  deleteProfile,
  auditProfile,
  viewOtherProfile, // optional passthrough, e.g. navigate or open
} from "../lib/api/profiles.jsx";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry.js";
let count = 0;
export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [myProfiles, setMyProfiles] = useState([]); // [{id, name}]
  const [others, setOthers] = useState([]); // [{email, profileName, id}]
  const [searchEmail, setSearchEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [newName, setNewName] = useState("");

  // initial load
  useEffect(() => {
    (async () => {
      try {
        //setLoading(true);
        console.log("Loading...", count);
        const [mine, other] = await Promise.all([
          getMyProfiles(),
          //getOtherProfiles(),
        ]);
        setMyProfiles(mine);
        setOthers(other || []);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load profiles.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshing]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log("Refreshing...", count);
      const [mine, other] = await Promise.all([
        getMyProfiles(),
        //getOtherProfiles(),
      ]);
      setMyProfiles(mine);
      setOthers(other);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const canAdd = useMemo(() => addName.trim().length > 0, [addName]);

  const handleAdd = async () => {
    if (!canAdd) return;
    try {
      const created = await addProfile(addName.trim());
      setMyProfiles((prev) => [created, ...prev]);
      setAddName("");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not add profile.");
    }
  };

  const handleRename = async (currentName) => {
    // Simple inline rename via prompt-style Alert
    // let oldName = currentName;
    // console.log("New name:", newName);
    // let newNameTrimmed = newName.trim();
    // if (!newNameTrimmed || newNameTrimmed === oldName) return;
    // console.log("Renaming profile:", oldName);
    // renameProfile(oldName, newName);
    // setNewName("");
    // count++;
    // setMyProfiles("");
    // console.log(count);
    const newNameTrimmed = newName.trim();
    if (!newNameTrimmed || newNameTrimmed === currentName) return;
    try {
      await renameProfile(currentName, newNameTrimmed); // send old/new names
      setNewName("");
      await onRefresh(); // ← actually refetch from backend
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Rename failed.");
    }
    // // On iOS/Android there isn’t a native prompt in RN; use a quick mini “edit field” sheet.
    // To keep this file self-contained, we’ll reuse Alert for confirmation + TextInput row.
    /*
    Alert.prompt?.(
      "Rename Profile",
      "Enter a new profile name:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Save",
          onPress: async (text) => {
            const next = text?.trim();
            if (!next || next === currentName) return;
            try {
              await renameProfile(id, next);
              setMyProfiles((prev) =>
                prev.map((p) => (p.id === id ? { ...p, name: next } : p))
              );
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Rename failed.");
            }
          },
        },
      ],
      "plain-text",
      currentName
    );

    // If Alert.prompt is unavailable (Android), fall back to an inline edit row.
    // Quick Android fallback:
    if (!Alert.prompt) {
      // Render a lightweight inline editor by swapping the row to “edit mode”.
      setMyProfiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, __editing: true, __draft: p.name } : p
        )
      );
    }
      */
  };

  const commitInlineRename = async (id, draft) => {
    const next = draft.trim();
    if (!next) return;
    try {
      await renameProfile(id, next);
      setMyProfiles((prev) =>
        prev.map((p) =>
          p.id === id
            ? { id: p.id, name: next } // remove edit flags
            : p
        )
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Rename failed.");
    }
  };

  const cancelInlineRename = (id) => {
    setMyProfiles((prev) =>
      prev.map((p) => (p.id === id ? { id: p.id, name: p.name } : p))
    );
    onRefresh();
  };

  const handleDelete = (idOrName) => {
    Alert.alert(
      "Delete Profile",
      "Are you sure you want to delete this profile?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // await deleteProfile(id);
              // setMyProfiles((prev) => prev.filter((p) => p.id !== id));
              await deleteProfile(idOrName); // this preserves call site
              await onRefresh(); // ← refetch from server
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Delete failed.");
            }
          },
        },
      ]
    );
  };

  const handleAudit = async (id) => {
    try {
      await auditProfile(id);
      Alert.alert("Audit queued", "An audit was triggered for this profile.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Audit failed to start.");
    }
  };

  const handleSearch = async () => {
    try {
      const trimmed = searchEmail.trim();
      if (!trimmed) {
        const data = await getOtherProfiles();
        setOthers(data);
        return;
      }
      const results = await searchProfilesByEmail(trimmed);
      setOthers(results);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Search failed.");
    }
  };

  const renderMyProfile = ({ item }) => {
    if (item.__editing) {
      return (
        <View style={[styles.cardRow, styles.cardRowEditing]}>
          <TextInput
            style={[styles.input, styles.profileInput]}
            defaultValue={item.__draft}
            onChangeText={(t) =>
              setMyProfiles((prev) =>
                prev.map((p) => (p.id === item.id ? { ...p, __draft: t } : p))
              )
            }
            placeholder="New name"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => commitInlineRename(item.id, item.__draft)}
          >
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={() => cancelInlineRename(item.id)}
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          {/* <TextInput
            style={[styles.input, styles.profileInput, { opacity: 0.95 }]}
            editable={true}
            onChangeText={setNewName}
          >
            {item.name}
          </TextInput> */}
          <TextInput
            style={[styles.input, styles.profileInput, { opacity: 0.95 }]}
            defaultValue={item.name}     // ← shows current name
            editable={true}
            onChangeText={setNewName}
          />
        </View>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={async () => handleRename(item.name)}
        >
          <Text style={styles.btnText}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={() => handleDelete(item.name)}
        >
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnWarning]}
          onPress={() => handleAudit(item.id)}
        >
          <Text style={styles.btnText}>Audit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOther = ({ item }) => (
    <View style={styles.cardRow}>
      <View style={[styles.emailBubble]}>
        <Text style={styles.emailText} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <TextInput
          style={[styles.input, styles.profileInput, { opacity: 0.95 }]}
          value={item.profileName || ""}
          editable={false}
        />
      </View>
      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary]}
        onPress={() => viewOtherProfile(item)} // define in api to navigate/open
      >
        <Text style={styles.btnText}>View</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.btnDanger]}
        onPress={() =>
          Alert.alert("Delete", "Delete this profile?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  //await deleteProfile(item.id);
                  setOthers((prev) => prev.filter((p) => p.id !== item.id));
                  count++;
                  setMyProfiles("");
                  console.log(count);
                } catch (err) {
                  console.error(err);
                  Alert.alert("Error", "Delete failed.");
                }
              },
            },
          ])
        }
      >
        <Text style={styles.btnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Page Title */}
            <Text style={styles.title}>Profile Management</Text>

            {/* Add Profile */}
            <View style={[styles.card, styles.shadow]}>
              <View style={styles.addRow}>
                <TextInput
                  value={addName}
                  onChangeText={setAddName}
                  placeholder="Profile name..."
                  style={[styles.input, styles.addInput]}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                <TouchableOpacity
                  disabled={!canAdd}
                  style={[
                    styles.btn,
                    styles.btnPrimary,
                    !canAdd && styles.btnDisabled,
                  ]}
                  onPress={handleAdd}
                >
                  <Text style={styles.btnText}>Add Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Grid */}
            <View style={styles.grid}>
              {/* Your Profiles */}
              <View style={[styles.panel, styles.shadow]}>
                <Text style={styles.panelTitle}>Your Profiles</Text>
                {loading && myProfiles.length === 0 ? (
                  <ActivityIndicator style={{ marginVertical: 16 }} />
                ) : (
                  <FlatList
                    data={myProfiles}
                    keyExtractor={(it) => String(it.id)}
                    renderItem={renderMyProfile}
                    ItemSeparatorComponent={() => (
                      <View style={{ height: 10 }} />
                    )}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No profiles yet.</Text>
                    }
                  />
                )}
              </View>

              {/* Other Users + Search */}
              <View style={[styles.panel, styles.shadow]}>
                <Text style={styles.panelTitle}>Other Users Profiles</Text>

                <View style={styles.searchRow}>
                  <TextInput
                    value={searchEmail}
                    onChangeText={setSearchEmail}
                    placeholder="Search for email…"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.input, styles.searchInput]}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={handleSearch}
                  >
                    <Text style={styles.btnText}>Search</Text>
                  </TouchableOpacity>
                </View>

                {loading && others.length === 0 ? (
                  <ActivityIndicator style={{ marginVertical: 16 }} />
                ) : (
                  <FlatList
                    data={others}
                    keyExtractor={(it, idx) =>
                      String(it.id ?? `${it.email}-${idx}`)
                    }
                    renderItem={renderOther}
                    ItemSeparatorComponent={() => (
                      <View style={{ height: 10 }} />
                    )}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No results.</Text>
                    }
                  />
                )}
              </View>
            </View>
          </>
        }
        data={[]} // we render everything in header; keeps pull-to-refresh
        renderItem={null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const BLUE = "#003594";
const RED = "#E74C3C";
const GOLD = "#FFC72C";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 24,
    marginBottom: 16,
    color: BLUE,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  addRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  addInput: { flex: 1 },

  grid: {
    gap: 14,
    marginHorizontal: 16,
  },

  panel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
  },
  panelTitle: {
    backgroundColor: BLUE,
    color: "white",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    fontWeight: "700",
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F0FF",
    borderRadius: 12,
    padding: 8,
  },
  cardRowEditing: {
    backgroundColor: "#EFEFEF",
  },

  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E3E3E8",
    minWidth: 15,
  },
  profileInput: {
    fontWeight: "600",
  },

  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "white", fontWeight: "700" },

  btnPrimary: { backgroundColor: BLUE },
  btnDisabled: { opacity: 0.5 },
  btnDanger: { backgroundColor: RED },
  btnWarning: { backgroundColor: GOLD },
  btnGhost: { backgroundColor: "#9aa0a6" },

  emailBubble: {
    backgroundColor: "#E9E6FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emailText: { color: "#333", fontWeight: "700", maxWidth: 180 },

  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  searchInput: { flex: 1, marginRight: 8 },

  emptyText: { color: "#777", textAlign: "center", paddingVertical: 10 },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
