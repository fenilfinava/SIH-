import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZJjMriGgNWtrV_uFGiMrn64QK86hz5Tk",
  authDomain: "krushi-sarathi.firebaseapp.com",
  projectId: "krushi-sarathi",
  storageBucket: "krushi-sarathi.firebasestorage.app",
  messagingSenderId: "599008190907",
  appId: "1:599008190907:web:402eda8a1e97cb50f2649e",
  measurementId: "G-8KGGRCPVVZ"
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// To ensure Recaptcha works smoothly
auth.useDeviceLanguage();

export { auth };
