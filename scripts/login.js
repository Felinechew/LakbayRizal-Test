import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js"
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js"
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js"
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "AIzaSyAvGncmdMSKa76z9oAZGSwLSU2TsL8vnDA",
  authDomain: "javaa-effc6.firebaseapp.com",
  projectId: "javaa-effc6",
  storageBucket: "javaa-effc6.firebasestorage.app",
  messagingSenderId: "57179868019",
  appId: "1:57179868019:web:4256551695a37cacf31306",
  measurementId: "G-GG3TZY7CLS",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
const auth = getAuth()
const db = getFirestore(app)

function showMessage(message, divId) {
  var messageDiv = document.getElementById(divId)
  messageDiv.style.display = "block"
  messageDiv.innerHTML = message
  messageDiv.style.opacity = 1
  setTimeout(() => {
    messageDiv.style.opacity = 0
  }, 5000)
}

// Check if the municipality is in Rizal province
function isRizalMunicipality(municipality) {
  const rizalMunicipalities = [
    "Angono",
    "Antipolo",
    "Baras",
    "Binangonan",
    "Cainta",
    "Cardona",
    "Jalajala",
    "Morong",
    "Pililla",
    "Rodriguez",
    "San Mateo",
    "Tanay",
    "Taytay",
    "Teresa",
  ]

  return rizalMunicipalities.includes(municipality)
}

// Check user role and get municipality info if admin
async function checkUserRoleAndMunicipality(userId, email) {
  try {
    console.log("Checking role for user ID:", userId, "and email:", email)

    // First check if user is a superadmin
    const superAdminQuery = query(collection(db, "superadmins"), where("userId", "==", userId))
    const superAdminSnapshot = await getDocs(superAdminQuery)
    console.log("Superadmin query results:", superAdminSnapshot.size)

    // If superadmin found, return role without municipality
    if (!superAdminSnapshot.empty) {
      const superadminData = superAdminSnapshot.docs[0].data()
      const superadminId = superAdminSnapshot.docs[0].id

      localStorage.setItem("userRole", "superadmin")
      localStorage.setItem("adminId", superadminId)

      return {
        role: "superadmin",
        data: superadminData,
      }
    }

    // If not superadmin, check for admin role
    // Try multiple field options for flexibility
    const possibleFields = [
      { field: "userId", value: userId },
      { field: "uid", value: userId },
      { field: "id", value: userId },
      { field: "email", value: email },
    ]

    for (const { field, value } of possibleFields) {
      if (!value) continue

      const adminQuery = query(collection(db, "admins"), where(field, "==", value))
      const adminSnapshot = await getDocs(adminQuery)
      console.log(`Admin query with '${field}' field:`, adminSnapshot.size)

      if (!adminSnapshot.empty) {
        const adminData = adminSnapshot.docs[0].data()
        const adminId = adminSnapshot.docs[0].id

        // Store admin information
        localStorage.setItem("userRole", "admin")
        localStorage.setItem("adminId", adminId)

        if (adminData.municipality) {
          localStorage.setItem("adminMunicipality", adminData.municipality)
        }

        if (adminData.email) {
          localStorage.setItem("adminEmail", adminData.email)
        }

        return {
          role: "admin",
          data: adminData,
        }
      }
    }

    // If we reach here, user is not found in either table
    console.log("User not found in admin tables")
    return { role: null }
  } catch (error) {
    console.error("Error checking user role:", error)
    return { role: null, error }
  }
}

// Main login function
const signin = document.getElementById("submitSignIn")
signin.addEventListener("click", async (event) => {
  event.preventDefault()

  // Show loading indicator
  showMessage("Logging in...", "signInMessage")

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  try {
    console.log("Attempting to sign in with:", email)
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    console.log("User authenticated successfully:", user.uid)

    // Store user ID in localStorage
    localStorage.setItem("loggedInUserId", user.uid)

    // Check user role and get municipality info
    console.log("Checking user role and municipality...")
    const { role, data } = await checkUserRoleAndMunicipality(user.uid, user.email)
    console.log("User role determined:", role)

    if (role === "superadmin") {
      showMessage("Login successful! Redirecting to Super Admin Dashboard...", "signInMessage")
      // Redirect to superadmin dashboard
      window.location.href = "../html/dashboard.html"
    } else if (role === "admin") {
      showMessage("Login successful! Redirecting to Admin Dashboard...", "signInMessage")

      // Check municipality for admin
      if (data.municipality) {
        console.log("Admin municipality:", data.municipality)

        // Check if admin is from Rizal province
        if (isRizalMunicipality(data.municipality)) {
          // Redirect to the admin dashboard for Rizal municipalities
          window.location.href = "../admin/admin_dashboard.html"
        } else {
          // Redirect to general settings for non-Rizal municipalities
          window.location.href = "../admin/settings.html"
        }
      } else {
        // If no municipality specified, default to admin dashboard
        window.location.href = "../admin/admin_ashboard.html"
      }
    } else {
      // User is authenticated but not found in admin tables
      console.log("User not found in admin tables. Checking Firestore directly...")

      // Directly check if collections exist
      try {
        const adminCollRef = collection(db, "admins")
        const adminDocs = await getDocs(adminCollRef)
        console.log("Total documents in admins collection:", adminDocs.size)

        if (adminDocs.size > 0) {
          console.log("Sample admin document fields:", Object.keys(adminDocs.docs[0].data()))
        }
      } catch (e) {
        console.error("Error checking collections:", e)
      }

      showMessage("Account is not authorized as admin. Please contact support.", "signInMessage")
      // Sign out the user since they're not an admin
      auth.signOut()
      localStorage.removeItem("loggedInUserId")
    }
  } catch (error) {
    console.error("Login error:", error)
    const errorCode = error.code
    if (errorCode === "auth/invalid-credential") {
      showMessage("Incorrect Email or Password", "signInMessage")
    } else {
      showMessage("Account does not Exist", "signInMessage")
    }
  }
})
