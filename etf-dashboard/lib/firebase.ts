/**
 * Firebase configuration and initialization for TickerTrace.
 *
 * Provides the Firebase app instance and Auth object for use
 * throughout the frontend.
 */

import { initializeApp, getApps } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    type User,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAM6OfVJ0ZnQ-9SVTq2sb6jHRlK7KnNMMw",
    authDomain: "ticker-trace.firebaseapp.com",
    projectId: "ticker-trace",
    storageBucket: "ticker-trace.firebasestorage.app",
    messagingSenderId: "148847674689",
    appId: "1:148847674689:web:0614f7d404a3eb62850dc0",
    measurementId: "G-SYRWGDY0Y3",
};

// Initialize only once (handles hot reload in dev)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
    auth,
    googleProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    type User,
};
