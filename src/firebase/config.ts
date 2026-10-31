// Your web app's Firebase configuration with Cloudflare / environment variable support
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAXA-mRInS2LqWzxU43eKNbVl_l-WQZang",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "moovie-35706.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "moovie-35706",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "moovie-35706.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1046379679363",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1046379679363:web:f37ebc4a08008f58d695b6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DRMJYG3RW5"
};

