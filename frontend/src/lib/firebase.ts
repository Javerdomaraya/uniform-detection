import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdxHCjThJnaIj6V0CRsr-zvil2rLo9Jm4",
  authDomain: "uniform-compliance.firebaseapp.com",
  projectId: "uniform-compliance",
  storageBucket: "uniform-compliance.firebasestorage.app",
  messagingSenderId: "435993876842",
  appId: "1:435993876842:web:6ad33d74955f2da2d5ad13",
  measurementId: "G-0FG68PED85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;
