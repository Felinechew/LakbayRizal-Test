import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvGncmdMSKa76z9oAZGSwLSU2TsL8vnDA",
  authDomain: "javaa-effc6.firebaseapp.com",
  projectId: "javaa-effc6",
  storageBucket: "javaa-effc6.appspot.com", // Corrected storageBucket
  messagingSenderId: "57179868019",
  appId: "1:57179868019:web:4256551695a37cacf31306",
  measurementId: "G-GG3TZY7CLS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Check authentication state
onAuthStateChanged(auth, (user) => {
  const loggedInUserId = localStorage.getItem("loggedInUserId");
  if (user && loggedInUserId) {
    console.log("User ID:", loggedInUserId);

    const docRef = doc(db, "admin", loggedInUserId);
    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          console.log("User Data:", userData);

          document.getElementById("loggedUserFName").innerText =
            userData.firstName || "No first name";
        } else {
          console.log("No document found matching the ID");
        }
      })
      .catch((error) => {
        console.error("Error retrieving document:", error);
      });
  } else {
    console.log("User not authenticated or ID not found in Local Storage");
    window.location.href = "../html/login.html"; // Redirect to login page if unauthenticated
  }
});

// Logout functionality
const logoutButton = document.getElementById("logout");

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("loggedInUserId");
  signOut(auth)
    .then(() => {
      console.log("User signed out successfully");
      window.location.href = "../html/login.html"; // Redirect to login page

      // Prevent back navigation
      history.pushState(null, null, "../html/login.html");
      window.addEventListener("popstate", function () {
        history.pushState(null, null, "../html/login.html");
      });
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
});