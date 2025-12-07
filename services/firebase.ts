import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDS3qMVjUiJo7xWGMNnPD24g39o5_Xf84U",
  authDomain: "smartcal-4ddce.firebaseapp.com",
  projectId: "smartcal-4ddce",
  storageBucket: "smartcal-4ddce.firebasestorage.app",
  messagingSenderId: "335166793360",
  appId: "1:335166793360:web:c8bba7acfd3617d8bb1a15",
  measurementId: "G-5P4MQ8TPYY"
};

// Initialize Firebase
// Check if apps are already initialized to avoid hot-reload errors
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = firebase.analytics();
}

export { auth, db, analytics };