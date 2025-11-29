"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addProfile,
  auditProfile,
  deleteProfile,
  getMyProfiles,
  getOtherProfiles,
  renameProfile,
  searchProfilesByEmail,
  viewOtherProfile,
} from "../lib/api/profiles.jsx";

const COLORS = {
  primary: "#003594", // CSUB Blue
  gold: "#FFC72C", // CSUB Gold
  cream: "#F5E6BD", // Light cream background
  gray: "#707372", // Neutral gray
  red: "#E74C3C", // Accent red
  white: "#FFFFFF",
  lightGray: "#F5F5F5",
  border: "#DDDDDD",
};

let count = 0;

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [myProfiles, setMyProfiles] = useState([]);
  const [others, setOthers] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [newName, setNewName] = useState("");

  // initial load
  useEffect(() => {
    (async () => {
      try {
        // console.log("Loading...", count);
        const [mine, other] = await Promise.all([getMyProfiles()]);
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
      // console.log("Refreshing...", count);
      const [mine, other] = await Promise.all([getMyProfiles()]);
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
    const newNameTrimmed = newName.trim();
    if (!newNameTrimmed || newNameTrimmed === currentName) return;
    try {
      await renameProfile(currentName, newNameTrimmed);
      setNewName("");
      await onRefresh();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Rename failed.");
    }
  };

  const commitInlineRename = async (id, draft) => {
    const next = draft.trim();
    if (!next) return;
    try {
      await renameProfile(id, next);
      setMyProfiles((prev) =>
        prev.map((p) => (p.id === id ? { id: p.id, name: next } : p))
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
              await deleteProfile(idOrName);
              await onRefresh();
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
      // send profile name, email, pw, then get all info from that profile and store it in the table auditing. Then redirect to audit tab, depends on monique.
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
          <TextInput
            style={[styles.input, styles.profileInput, { opacity: 0.95 }]}
            defaultValue={item.name}
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
          onPress={() => handleAudit(item)}
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
        onPress={() => viewOtherProfile(item)}
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
                  setOthers((prev) => prev.filter((p) => p.id !== item.id));
                  count++;
                  setMyProfiles("");
                  // console.log(count);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dataworks</Text>
        <Text style={styles.headerSubtitle}>Profile Management</Text>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Add Profile */}
            <View style={[styles.card, styles.shadow]}>
              <View style={styles.addRow}>
                <TextInput
                  value={addName}
                  onChangeText={setAddName}
                  placeholder="Profile name..."
                  placeholderTextColor={COLORS.gray}
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
                  <ActivityIndicator
                    style={{ marginVertical: 16 }}
                    color={COLORS.primary}
                  />
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
              {/*
              <View style={[styles.panel, styles.shadow]}>
                <Text style={styles.panelTitle}>Other Users Profiles</Text>

                <View style={styles.searchRow}>
                  <TextInput
                    value={searchEmail}
                    onChangeText={setSearchEmail}
                    placeholder="Search for email…"
                    placeholderTextColor={COLORS.gray}
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
                  <ActivityIndicator
                    style={{ marginVertical: 16 }}
                    color={COLORS.primary}
                  />
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
              */}
            </View>
          </>
        }
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "ios" ? 0 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.gold,
    textAlign: "center",
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addInput: { flex: 1 },

  grid: {
    gap: 14,
    marginHorizontal: 16,
  },

  panel: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  panelTitle: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 14,
    fontWeight: "700",
    fontSize: 15,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cream,
    borderRadius: 10,
    padding: 10,
  },
  cardRowEditing: {
    backgroundColor: COLORS.lightGray,
  },

  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 15,
    fontSize: 14,
  },
  profileInput: {
    fontWeight: "600",
    color: COLORS.primary,
  },

  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },

  btnPrimary: { backgroundColor: COLORS.primary },
  btnDisabled: { opacity: 0.5 },
  btnDanger: { backgroundColor: COLORS.red },
  btnWarning: { backgroundColor: COLORS.gold },
  btnGhost: { backgroundColor: COLORS.gray },

  emailBubble: {
    backgroundColor: COLORS.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emailText: {
    color: COLORS.primary,
    fontWeight: "600",
    maxWidth: 180,
    fontSize: 13,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginRight: 8,
  },

  emptyText: {
    color: COLORS.gray,
    textAlign: "center",
    paddingVertical: 12,
    fontSize: 14,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  footer: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.gold,
    textAlign: "center",
  },
});

