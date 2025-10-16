import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import {
  getItemCount,
  initDb,
  insertItem,
  getRoomCount,
  getCustCount,
  getDeptCount,
  getBldgCount,
  insertDeptRooms,
  insertDeptCustodian,
  insertDept,
  insertBldg,
} from "../../src/db";

export default function SearchScreen() {
  useEffect(() => {
    const fetchData = async () => {
      try {
        initDb();

        // --- Buildings ---
        const bldgRes = await fetch(
          "https://dataworks-7b7x.onrender.com/phone-api/get-all-bldgs.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: 123 }),
          }
        );
        const bldgJson = await bldgRes.json();
        const bldgRows = Array.isArray(bldgJson?.data) ? bldgJson.data : [];
        const bldgCount = getBldgCount();
        console.log("Building Count: ", bldgCount);
        if (bldgCount === bldgJson?.count) {
          console.log("True");
        }
        if (bldgCount !== bldgJson?.count) {
          console.log("Did not skip", bldgCount, bldgJson.count);
          bldgRows.forEach((r) => insertBldg(r.bldg_name, r.bldg_id));
        }

        // --- Rooms ---
        const roomRes = await fetch(
          "https://dataworks-7b7x.onrender.com/phone-api/get-all-rooms.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: 123 }),
          }
        );
        const roomJson = await roomRes.json();
        const roomRows = Array.isArray(roomJson?.data) ? roomJson.data : [];
        const roomCount = getRoomCount();
        console.log("Room Count: ", roomCount);
        if (roomCount === roomJson?.count) {
          console.log("True");
        }
        if (roomCount !== roomJson?.count) {
          console.log("Did not skip", roomCount, roomJson.count);
          roomRows.forEach((r) => {
            if (r.bldg_id && r.room_tag && r.room_loc)
              insertDeptRooms(r.room_tag, r.room_loc, r.bldg_id);
            //console.log(r.room_tag, r.room_loc, r.bldg_id);
          });
        }

        // --- Departments ---
        const deptRes = await fetch(
          "https://dataworks-7b7x.onrender.com/phone-api/get-all-depts.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: 123 }),
          }
        );
        const deptJson = await deptRes.json();
        const deptRows = Array.isArray(deptJson?.data) ? deptJson.data : [];
        const deptCount = getDeptCount();
        console.log("Department Count: ", deptCount, deptJson.count);
        if (deptCount === deptJson?.count) {
          console.log("True");
        }
        if (deptCount !== deptJson?.count) {
          console.log("Did not skip", deptCount, deptJson.count);
          deptRows.forEach((r) => {
            insertDept(r.dept_name, r.dept_id, r.dept_manager);
            //console.log(r.dept_name, r.dept_id, r.dept_manager);
          });
        }

        // --- Custodians ---
        const custRes = await fetch(
          "https://dataworks-7b7x.onrender.com/phone-api/get-all-users.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: 123 }),
          }
        );
        const custJson = await custRes.json();
        const custRows = Array.isArray(custJson?.data) ? custJson.data : [];
        const custCount = getCustCount();
        console.log("Custodian Count: ", custCount);
        if (custCount === custJson?.count) {
          console.log("True");
        }
        if (custCount !== custJson?.count) {
          console.log("Did not skip", custCount, custJson.count);
          custRows.forEach((r) => {
            insertDeptCustodian(r.custodian, r.dept_id);
          });
        }

        // --- Assets ---
        const assetsRes = await fetch(
          "https://dataworks-7b7x.onrender.com/phone-api/get-all-assets.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: 123 }),
          }
        );
        const assetsJson = await assetsRes.json();
        const rows = Array.isArray(assetsJson?.data) ? assetsJson.data : [];
        let localAssetCount = getItemCount();
        console.log("Asset Count: ", localAssetCount);
        if (localAssetCount === assetsJson?.count) {
          console.log("True");
        }
        if (localAssetCount !== assetsJson?.count) {
          console.log("Did not skip", localAssetCount, assetsJson.count);
          rows.forEach((r) => {
            insertItem(
              r.asset_tag,
              r.asset_name,
              r.room_tag,
              r.serial_num,
              r.dept_id
            );
          });
        }
        localAssetCount = getItemCount();
        console.log("Asset Count: ", localAssetCount);
        // Navigate with actual results
        router.push({
          pathname: "/search-assets",
          params: { results: JSON.stringify() },
        });
      } catch (e) {
        console.error("Data load error:", e);
        router.push("/search-assets"); // fallback
      }
    };

    fetchData();
  }, []);

  return (
    <View style={{ paddingTop: 50, padding: 16 }}>
      <Text>Retrieving data…</Text>
    </View>
  );
}
