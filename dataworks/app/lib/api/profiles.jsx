// lib/api/profiles.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";
import { getData } from "../store-login";
import {
  insertAuditInfo,
  getAllAuditing,
  deleteAuditingData,
} from "../../../src/sqlite";
import { router } from "expo-router";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://dataworks-7b7x.onrender.com";
const GET_PROFILES_PATH = "/phone-api/profiles/get-profiles.php"; // adjust if needed
const RENAME_PROFILES_PATH = "/phone-api/profiles/rename-profiles.php"; // adjust if needed
const DELETE_PROFILES_PATH = "/phone-api/profiles/delete-profiles.php";
const AUDIT_PROFILES_PATH = "/phone-api/profiles/get-profile-info.php";
/*const AUDIT_PROFILES_PATH = "/phone-api/to be figured out"; // adjust if needed
 */

// Helper to get auth headers with token from AsyncStorage
async function authHeaders() {
  const token = (await AsyncStorage.getItem("auth_token")) || "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : undefined,
  };
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Shape expected by the screen:
 * getMyProfiles() -> [{ id: string|number, name: string }]
 */
export async function getMyProfiles() {
  let email = await getData("email");
  email = JSON.parse(email).value;
  let pw = await getData("pw");
  pw = JSON.parse(pw).value;
  //console.log("Using email/pw:", email, pw);
  const res = await fetch(`${API_BASE_URL}${GET_PROFILES_PATH}`, {
    headers: await authHeaders(),
    method: "POST",
    body: JSON.stringify({ email: email, pw: pw }),
  });
  let id = 1;
  // Map your real response into {id, name}
  /*
  const text = await res.text();
  console.log("Raw profiles response:", text);
  const res2 = res.clone();
  */
  const data = await handle(res);
  console.log("Fetched profiles:", data);
  return data.profiles.map((p) => ({
    id: id++,
    name: p.name ?? p.profiles,
  }));
}

/** Other users profiles (initial list)
export async function getOtherProfiles() {
  let email = await getData("email");
  email = JSON.parse(email).value;
  let pw = await getData("pw");
  pw = JSON.parse(pw).value;
  const res = await fetch(`${API_BASE_URL}${GET_PROFILES_PATH}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ email: email, pw: pw }),
  });
  const data = await handle(res);
  console.log("Fetched other profiles:", data);
  // Expecting items like { id, email, profileName }
  return data;
}

/** Search by email
export async function searchProfilesByEmail(email) {
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/search?email=${encodeURIComponent(email)}`,
    {
      headers: await authHeaders(),
    }
  );
  const data = await handle(res);
  return data; // [{id,email,profileName}]
}

/** Add
export async function addProfile(name) {
  const res = await fetch(`${API_BASE_URL}/api/profiles`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ name }),
  });
  const p = await handle(res);
  return { id: p.id ?? p.profileId, name: p.name ?? p.profileName };
}*/

/** Rename **/
export async function renameProfile(old_name, new_name) {
  // pull creds from storage
  let email = await getData("email");
  email = JSON.parse(email).value;

  let pw = await getData("pw");
  pw = JSON.parse(pw).value;
  console.log(`${API_BASE_URL}${RENAME_PROFILES_PATH}`);
  // POST to PHP endpoint
  const res = await fetch(`${API_BASE_URL}${RENAME_PROFILES_PATH}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      email: email,
      pw: pw,
      old_name: old_name, // existing profile name
      new_name: new_name, // new profile name
    }),
  });
  const raw = await res.clone().text();
  console.log("Raw profiles response:", raw);

  return handle(res);
  // const res = await fetch(`${API_BASE_URL}${RENAME_PROFILES_PATH}`, {
  //   method: "PATCH",
  //   headers: await authHeaders(),
  //   body: JSON.stringify({ name }),
  // });
  // return handle(res);
}

/** Delete */
export async function deleteProfile(name) {
  let email = await getData("email");
  email = JSON.parse(email).value;

  let pw = await getData("pw");
  pw = JSON.parse(pw).value;
  const res = await fetch(`${API_BASE_URL}${DELETE_PROFILES_PATH}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      email: email,
      pw: pw,
      profile_name: name, // existing profile name
    }),
  });
  console.log("email, pw, name:", email, pw, name);
  const text = await res.text();
  console.log("Delete response:", text);
  const clone = res.clone();
  if (text.status === "Ok") {
  }
  return handle(clone);
}

/** Audit */
export async function auditProfile(name) {
  let email = await getData("email");
  email = JSON.parse(email).value;

  let pw = await getData("pw");
  pw = JSON.parse(pw).value;

  console.log(name.name);
  let profile_name = name.name.trim();
  const res = await fetch(`${API_BASE_URL}${AUDIT_PROFILES_PATH}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      email: email,
      pw: pw,
      profile: profile_name, // existing profile name
    }),
  });
  //console.log("email, pw, name:", email, pw, profile_name);
  const text = await res.json();
  //console.log("Auditing:", text);

  if (text.status === "Ok") {
  }
  await deleteAuditingData();
  //return handle(res); // optional: returns job id
  for (const p of text.profiles) {
    let assigned_to = "";
    if (p.notes != null) {
      let note_array = p.notes.split(" ");
      let dept = note_array[0];
      for (let i = 1; i < note_array.length; i++) {
        assigned_to = note_array[i];
      }
    } else {
      assigned_to = "N/A";
    }
    /*
    console.log(
      p.asset_tag,
      p.asset_name,
      assigned_to,
      p.dept_id,
      p.serial_num,
      p.po,
      p.asset_model || "N/A",
      p.make || "N/A",
      p.room_tag,
      p.type2 || "N/A",
      p.bus_unit,
      p.status || "In Service",
      p.date_added || "N/A",
      p.asset_price || 0,
      p.audit_id || 1,
      p.asset_notes || "N/A"
    );*/
    await insertAuditInfo(
      p.asset_tag,
      p.asset_name,
      p.dept_id,
      p.serial_num || "N/A",
      p.po || "N/A",
      p.asset_model || "N/A",
      p.make || "N/A",
      p.room_tag,
      p.type2 || "N/A",
      p.bus_unit,
      p.status || "In Service",
      assigned_to || "N/A",
      p.date_added || "N/A",
      p.asset_price || 0,
      p.audit_id || 1,
      p.asset_notes || "N/A"
    );
  }
  const audit_data = await getAllAuditing();
  //console.log("Audit data inserted:", audit_data);
  router.push({
    pathname: "/(tabs)/audit",
    query: { from: "Profiles" },
  });
}

/** Optional: “View” other user’s profile.
 * You could navigate, or request a server action.
 * For now this is a no-op you can customize.
 */
export async function viewOtherProfile(item) {
  // Example: navigate to a read-only viewer or call your backend
  return item;
}
