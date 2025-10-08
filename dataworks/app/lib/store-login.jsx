import AsyncStorage from "@react-native-async-storage/async-storage";

const storeLogin = async (key, value) => {
  try {
    const ttl = Date.now() + 0.01666 * 60 /*hours*/ * 60 * 1000; // 12 hours from now
    const data = {
      value: value,
      expiration: ttl,
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving data:", e);
  }
};
const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch (e) {
    console.error("Error reading data:", e);
  }
};
const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error("Error removing data:", e);
  }
};

export { storeLogin, getData, removeData };
