import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDS3qMVjUiJo7xWGMNnPD24g39o5_Xf84U",
  authDomain: "smartcal-4ddce.firebaseapp.com",
  projectId: "smartcal-4ddce",
  storageBucket: "smartcal-4ddce.firebasestorage.app",
  messagingSenderId: "335166793360",
  appId: "1:335166793360:web:c8bba7acfd3617d8bb1a15",
  measurementId: "G-5P4MQ8TPYY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { auth, db, analytics };