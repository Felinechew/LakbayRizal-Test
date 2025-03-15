// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

const firebaseConfig = {
apiKey: "AIzaSyAvGncmdMSKa76z9oAZGSwLSU2TsL8vnDA",
authDomain: "javaa-effc6.firebaseapp.com",
projectId: "javaa-effc6",
storageBucket: "javaa-effc6.firebasestorage.app",
messagingSenderId: "57179868019",
appId: "1:57179868019:web:4256551695a37cacf31306",
measurementId: "G-GG3TZY7CLS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);
export { db };