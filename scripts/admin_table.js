import { createUserWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"
import { auth, db } from "../scripts/firebase.js"
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"

//add admin
document.getElementById("addAdminForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const municipality = document.getElementById("municipality").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!municipality || !contact || !email || !password) {
      alert("Please fill out all fields.");
      return;
  }

  try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user || !user.uid) {
          throw new Error("User UID is undefined. Cannot add to Firestore.");
      }

      console.log("User created:", user); 

      // Store admin data in Firestore (without UID)
      await addDoc(collection(db, "admins"), {
          municipality,
          contact,
          email,
      });

      alert("Admin added successfully!");

      // Reset form and close modal
      document.getElementById("addAdminForm").reset();
      // closeModal();

      // Refresh admin list
      fetchAdmins();
  } catch (error) {
      console.error("Error adding admin:", error);

      let errorMessage = "Error adding admin.";
      if (error.code === "auth/email-already-in-use") {
          errorMessage = "Email is already in use.";
      } else if (error.code === "auth/weak-password") {
          errorMessage = "Password should be at least 6 characters.";
      }
      alert(errorMessage);
  }
});



// Fetch and display admins
async function fetchAdmins() {
  const adminTableBody = document.querySelector("#adminTable tbody")
  adminTableBody.innerHTML = ""

  const querySnapshot = await getDocs(collection(db, "admins"))
  querySnapshot.forEach((doc) => {
    const admin = doc.data()
    const row = `
      <tr>
        <td>${doc.id}</td>
        <td>${admin.municipality}</td>
        <td>${admin.contact}</td>
        <td>${admin.email}</td>
        <td>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="viewAdmin('${doc.id}')"><i class="fas fa-eye"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="editAdmin('${doc.id}')"><i class="fas fa-edit"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="archiveAdmin('${doc.id}')"><i class="fas fa-archive"></i></button>
        </td>
      </tr>
    `
    adminTableBody.insertAdjacentHTML("beforeend", row)
  })
}

// View admin details
window.viewAdmin = async (adminId) => {
  const adminDoc = await getDoc(doc(db, "admins", adminId))
  const admin = adminDoc.data()
  document.getElementById("viewadminid").textContent = adminId
  document.getElementById("viewMunicipality").textContent = admin.municipality
  document.getElementById("viewContact").textContent = admin.contact
  document.getElementById("viewEmail").textContent = admin.email
  document.getElementById("viewModal").style.display = "block"
}

// Edit admin
window.editAdmin = async (adminId) => {
  console.log("Editing Admin ID:", adminId)

  const adminDoc = await getDoc(doc(db, "admins", adminId))
  if (!adminDoc.exists()) {
    console.error("Admin document not found")
    return
  }

  const admin = adminDoc.data()
  console.log("Admin Data:", admin)

  document.getElementById("editAdminId").textContent = adminId
  document.getElementById("editMunicipality").value = admin.municipality || ""
  document.getElementById("editContact").value = admin.contact || ""
  document.getElementById("editEmail").value = admin.email || ""

  document.getElementById("editModal").style.display = "block"
}

// Update admin
document.getElementById("editAdminForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const adminId = document.getElementById("editAdminId").textContent
  const municipality = document.getElementById("editMunicipality").value
  const contact = document.getElementById("editContact").value
  const email = document.getElementById("editEmail").value

  try {
    await updateDoc(doc(db, "admins", adminId), {
      municipality,
      contact,
      email,
    })

    alert("Admin updated successfully")
    document.getElementById("editModal").style.display = "none"
    fetchAdmins()
  } catch (error) {
    console.error("Error updating admin: ", error)
    alert("Error updating admin")
  }
})

// Archive admin
window.archiveAdmin = async (adminId) => {
  if (confirm("Are you sure you want to archive this admin?")) {
    const adminDoc = await getDoc(doc(db, "admins", adminId))
    const admin = adminDoc.data()

    // Move admin to archive_admin collection
    await addDoc(collection(db, "archive_admins"), admin)

    // Delete admin from admins collection
    await deleteDoc(doc(db, "admins", adminId))

    // Disable user in Firebase Auth
    await deleteUser(auth.currentUser)

    alert("Admin archived successfully")
    fetchAdmins()
  }
}

// Open Add Admin Modal
document.getElementById("openAddAdminModal").addEventListener("click", () => {
  document.getElementById("addAdminModal").style.display = "block"
})

// Close modals
document.querySelectorAll(".close").forEach((closeBtn) => {
  closeBtn.onclick = function () {
    this.closest(".modal").style.display = "none"
  }
})

// Close modal if clicked outside
window.onclick = (event) => {
  if (event.target.className === "modal") {
    event.target.style.display = "none"
  }
}

// Add the following function after the existing functions

function searchAdmin() {
  const searchInput = document.getElementById("searchInput").value.toLowerCase()
  const adminRows = document.querySelectorAll("#adminTable tbody tr")
  const noResultsMessage = document.getElementById("noResultsMessage")
  let foundResults = false

  adminRows.forEach((row) => {
    const adminId = row.querySelector("td:nth-child(1)").textContent.toLowerCase()
    const municipality = row.querySelector("td:nth-child(2)").textContent.toLowerCase()
    const contact = row.querySelector("td:nth-child(3)").textContent.toLowerCase()
    const email = row.querySelector("td:nth-child(4)").textContent.toLowerCase()

    if (
      adminId.includes(searchInput) ||
      municipality.includes(searchInput) ||
      contact.includes(searchInput) ||
      email.includes(searchInput)
    ) {
      row.style.display = ""
      foundResults = true
    } else {
      row.style.display = "none"
    }
  })

  if (foundResults) {
    noResultsMessage.style.display = "none"
  } else {
    noResultsMessage.style.display = "block"
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchInput").addEventListener("input", searchAdmin)
  fetchAdmins()
})