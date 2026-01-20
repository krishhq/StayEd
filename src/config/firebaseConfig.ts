import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore'; // NoSQL Database for Users, Complaints
import { getDatabase } from 'firebase/database'; // Realtime Database for Chat/Logs

// Updated with User provided credentials
export const firebaseConfig = {
    apiKey: "AIzaSyD798LOVbouHr4PphKgNzGvr4XvqCXZtpo",
    authDomain: "stayed-2b94c.firebaseapp.com",
    databaseURL: "https://stayed-2b94c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "stayed-2b94c",
    storageBucket: "stayed-2b94c.firebasestorage.app",
    messagingSenderId: "480056134372",
    appId: "1:480056134372:web:6d1804fb07c4f1d776faf1"
};

// Initialize Firebase
let app: any; // Using any to avoid complex type exports issues, or import FirebaseApp
let auth: Auth;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // Initialize Services
    // Use initializeAuth for persistence
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} else {
    app = getApp();
    auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
