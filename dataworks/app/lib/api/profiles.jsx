// lib/api/profiles.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";
import { getData } from "../store-login";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://dataworks-7b7x.onrender.com";
const GET_PROFILES_PATH = "/phone-api/profiles/get-profiles.php"; // adjust if needed
const RENAME_PROFILES_PATH = "/phone-api/profiles/rename-profiles.php"; // adjust if needed
const DELETE_PROFILES_PATH = "/phone-api/profiles/delete-profiles.php"; // adjust if needed
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
  console.log("Using email/pw:", email, pw);
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
export async function auditProfile(id) {
  const res = await fetch(`${API_BASE_URL}/api/profiles/${id}/audit`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return handle(res); // optional: returns job id
}

/** Optional: “View” other user’s profile.
 * You could navigate, or request a server action.
 * For now this is a no-op you can customize.
 */
export async function viewOtherProfile(item) {
  // Example: navigate to a read-only viewer or call your backend
  return item;
}
