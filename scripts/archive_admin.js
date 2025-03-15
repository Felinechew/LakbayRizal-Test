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


// Fetch and display admins
async function fetchAdmins() {
  const adminTableBody = document.querySelector("#adminTable tbody")
  adminTableBody.innerHTML = ""

  const querySnapshot = await getDocs(collection(db, "archive_admins"))
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
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="retrieveAdmin('${doc.id}')"><i class="fas fa-file-import"></i></button>
        </td>
      </tr>
    `
    adminTableBody.insertAdjacentHTML("beforeend", row)
  })
}

// View admin details
window.viewAdmin = async (adminId) => {
  const adminDoc = await getDoc(doc(db, "archive_admins", adminId))
  const admin = adminDoc.data()
  document.getElementById("viewadminid").textContent = adminId
  document.getElementById("viewMunicipality").textContent = admin.municipality
  document.getElementById("viewContact").textContent = admin.contact
  document.getElementById("viewEmail").textContent = admin.email
  document.getElementById("viewModal").style.display = "block"
}

window.retrieveAdmin = async (adminId) => {
    if (!adminId) {
      console.error("No admin ID provided");
      alert("Error: No admin ID provided");
      return;
    }
  
    if (confirm("Are you sure you want to restore this admin?")) {
      const archivedAdminDoc = doc(db, "archive_admins", adminId);
  
      try {
        const docSnapshot = await getDoc(archivedAdminDoc);
  
        if (docSnapshot.exists()) {
          const adminData = docSnapshot.data();
          
          // 1. Restore admin data to the main collection
          await addDoc(collection(db, "admins"), adminData);
          console.log("Admin restored successfully in Firestore");
  
          // 2. Delete the archived admin
          await deleteDoc(archivedAdminDoc);
          console.log("Archived admin document deleted");
  
          alert("Admin document restored successfully. Note: The Firebase Authentication user account cannot be automatically restored if it was deleted.");
          fetchAdmins(); // Refresh the admin list
        } else {
          alert("Archived admin not found");
        }
      } catch (error) {
        console.error("Error restoring admin:", error);
        alert("An error occurred during restoration. Check console for details.");
      }
    }
  };

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