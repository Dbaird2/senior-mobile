import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { initDb, insertItem, searchItems } from "../../src/db";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [go, setGo] = useState(false);
  const fetchData = async (text) => {
    setQuery(text);
    try {
      const response = await fetch(
        "https://dataworks-7b7x.onrender.com/phone-api/get-all-assets.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: 123 }),
        }
      );
      initDb();
      const data = await response.json();
      const rows = Array.isArray(data?.data) ? data.data : [];
      rows.forEach((tag) => {
        try {
          insertItem(tag.asset_tag, tag.asset_name);
        } catch {}
      });

      setResults(Array.isArray(data?.data) ? data.data : []);
      router.push({
        pathname: "/search-assets",
        params: { results: JSON.stringify("234") },
      });
    } catch (error) {
      console.error("Error getting your search:", error);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  return (
    <View>
      <Text>Loading Data</Text>
    </View>
  );
}
