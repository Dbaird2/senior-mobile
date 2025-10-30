"use client";

import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import DropDownPicker from "react-native-dropdown-picker";
import Icon from "react-native-vector-icons/FontAwesome";

export default function SearchAssetsScreen() {
  const { results: resultsParam } = useLocalSearchParams();
  const [query, setQuery] = useState("");
  const results = useRef([]);
  const [selected, setSelected] = useState(null);
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState([
    { label: "Assets", value: "asset" },
    { label: "Department", value: "department" },
    { label: "Building", value: "building" },
  ]);
  const didInit = useRef(false);
  const debounceRef = useRef(null);
  const isLoadingRef = useRef(false);

  const [opacity] = useState(new Animated.Value(0));
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 230,
        useNativeDriver: true,
      }).start();
    }, 600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    console.log("Search Params: ", resultsParam);
    let alive = true;

    const run = async () => {
      setLoading(true);

      const limit = 30;
      const skip = offset;
      const q = (query || "").trim();

      if (q.length >= 3 || q.length === 0) {
        if (value === "asset" || value === null) {
          console.log("Searching items with query:", q, limit, skip);
          const assetsRes = await fetch(
            "https://dataworks-7b7x.onrender.com/phone-api/search-info/get-asset-offset.php",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ offset: skip, limit: limit, search: q }),
            }
          );
          const assetsJson = await assetsRes.json();
          results.current = assetsJson?.data || [];
        } else if (value === "department") {
          console.log("Searching departments with query:", q, limit, skip);
          const assetsRes = await fetch(
            "https://dataworks-7b7x.onrender.com/phone-api/search-info/get-dept-offset.php",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ offset: skip, limit: limit, search: q }),
            }
          );
          const assetsJson = await assetsRes.json();
          results.current = assetsJson?.data || [];
          console.log("Fetched departments length:", results.current);
        } else if (value === "building") {
          console.log("Searching buildings with query:", q);
          const assetsRes = await fetch(
            "https://dataworks-7b7x.onrender.com/phone-api/search-info/get-bldg-offset.php",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ offset: skip, limit: limit, search: q }),
            }
          );
          const assetsJson = await assetsRes.json();
          results.current = assetsJson?.data || [];
          console.log("Fetched buildings length:", results.current);
        }

        if (!alive) return;
        console.log(results.current);
        console.log("In Run Function: ", results.current.length);
        console.log("Setting refresh key", refreshKey);
      }
      setRefreshKey((prev) => prev + 1);
      isLoadingRef.current = false;

      setLoading(false);
    };

    run();
    return () => {
      alive = false;
    };
  }, [query, value, offset]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = (text) => {
    setQuery(text);
    setOffset(0);
  };

  const renderAsset = ({ item }) => (
    <View
      style={[
        styles.row,
        selected &&
        (item.tag === selected.tag || item.dept_id === selected.dept_id)
          ? styles.rowActive
          : null,
      ]}
    >
      <Text style={styles.rowText}>
        {item.tag} - {item?.name} - {item?.serial} - {item?.dept_id}
      </Text>
    </View>
  );

  const renderBuilding = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.rowText}>
        {item?.bldg_id} — {item?.bldg_name} — {item?.room_tag}
      </Text>
    </View>
  );

  const renderDept = ({ item }) => {
    const cleanCustodian = String(item?.custodian)
      .replace(/[\[\]{}"]/g, "")
      .trim();

    return (
      <View
        style={[
          styles.row,
          selected &&
          (item.tag === selected?.tag || item.dept_id === selected?.dept_id)
            ? styles.rowActive
            : null,
        ]}
      >
        <Text style={styles.rowText}>
          {item?.dept_id} — {item?.dept_name} - {cleanCustodian} -{" "}
          {item?.dept_manager}
        </Text>
      </View>
    );
  };

  const checkSearchType = ({ item }) => {
    if (value === "building") {
      return renderBuilding({ item });
    } else if (value === "department") {
      return renderDept({ item });
    } else {
      return renderAsset({ item });
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>

      <View style={styles.ddpWrapper}>
        <DropDownPicker
          open={open}
          value={value}
          items={items}
          setOpen={setOpen}
          setValue={setValue}
          setItems={setItems}
          placeholder="Select a category"
          style={styles.ddp}
          dropDownContainerStyle={styles.ddpDropdown}
          listItemContainerStyle={styles.ddpItem}
          itemSeparator={true}
          itemSeparatorStyle={styles.ddpItemSeparator}
          selectedItemContainerStyle={styles.ddpItemSelected}
          selectedItemLabelStyle={styles.ddpItemLabelSelected}
          placeholderStyle={styles.ddpPlaceholder}
          labelStyle={styles.ddpLabel}
          arrowIconStyle={styles.ddpArrow}
          tickIconStyle={styles.ddpTick}
          onChangeValue={(newValue) => {
            setValue(newValue);
            setOffset(0);
          }}
        />
      </View>

      <TextInput
        placeholder="Type an asset TAG"
        placeholderTextColor="#6B7280"
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
            {selected?.tag || selected?.dept_id || selected?.Building}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Name: </Text>
            {selected?.name}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Room Tag: </Text>
            {selected?.room_tag}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.label}>Serial ID: </Text>
            {selected?.serial}
          </Text>
        </View>
      )}

      <FlatList
        data={results.current}
        key={refreshKey}
        keyExtractor={(item, i) => String(item.id ?? `${item.tag}-${i}`)}
        renderItem={checkSearchType}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.empty}>No results</Text>}
      />
      <Animated.View style={[styles.paginationContainer, { opacity }]}>
        <TouchableOpacity
          onPress={() => setOffset((o) => Math.max(0, o - 30))}
          style={[
            styles.arrowButton,
            offset === 0 && styles.arrowButtonDisabled,
          ]}
          disabled={offset === 0}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={18} color="#003594" />
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            Page {Math.floor(offset / 30) + 1}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setOffset((o) => o + 30)}
          style={styles.arrowButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-right" size={18} color="#003594" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    padding: 12,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 80,
    color: "#003594",
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "#FFFFFF",
    color: "#0A0A0A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#003594",
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#003594",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 6,
    color: "#FFC72C",
    textTransform: "uppercase",
  },
  cardLine: {
    fontSize: 15,
    marginTop: 3,
    color: "#0A0A0A",
  },
  label: {
    fontWeight: "600",
    color: "#003594",
  },
  row: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowActive: {
    borderColor: "#003594",
    backgroundColor: "rgba(255, 199, 44, 0.15)",
  },
  rowText: {
    fontSize: 15,
    color: "#003594",
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "#888",
    fontStyle: "italic",
  },

  ddpWrapper: {
    zIndex: 1000,
    elevation: 1000,
    marginBottom: 10,
  },
  ddp: {
    backgroundColor: "#FFFFFF",
    borderColor: "#003594",
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
  },
  ddpDropdown: {
    backgroundColor: "#FFFFFF",
    borderColor: "#003594",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  ddpPlaceholder: {
    color: "#6B7280",
    fontSize: 15,
  },
  ddpLabel: {
    color: "#003594",
    fontSize: 15,
    fontWeight: "600",
  },
  ddpItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ddpItemSeparator: {
    height: 1,
    backgroundColor: "#E3E7EF",
    marginHorizontal: 8,
  },
  ddpItemSelected: {
    backgroundColor: "rgba(255, 199, 44, 0.15)",
  },
  ddpItemLabelSelected: {
    color: "#003594",
    fontWeight: "700",
  },
  ddpArrow: {
    tintColor: "#003594",
  },
  ddpTick: {
    tintColor: "#FFC72C",
  },

  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
    marginTop: 4,
  },
  arrowButton: {
    width: 36,
    height: 36,
    backgroundColor: "#FFC72C",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#003594",
  },
  arrowButtonDisabled: {
    backgroundColor: "#E5E7EB",
    borderColor: "#D1D5DB",
    opacity: 0.5,
  },
  pageIndicator: {
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 10,
  },
  pageText: {
    fontSize: 14,
    color: "#003594",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
