import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"
import { auth, db } from "../scripts/firebase.js"
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  doc,
  where,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"

// DOM Elements
const userForm = document.getElementById("userForm")
const viewModal = document.getElementById("viewModal")
const closeViewModal = document.getElementById("closeViewModal")
const editModal = document.getElementById("editModal")
const closeEditModal = document.getElementById("closeEditModal")
const editUserForm = document.getElementById("editUserForm")
const logoutBtn = document.getElementById("logoutBtn")
const municipalityTitle = document.getElementById("municipalityTitle")
const adminEmailDisplay = document.getElementById("adminEmail")

// Get admin municipality from localStorage
const adminMunicipality = localStorage.getItem('adminMunicipality') || '';
const adminEmail = localStorage.getItem('adminEmail') || '';

// Set up event listeners
closeViewModal.addEventListener("click", () => (viewModal.style.display = "none"))
closeEditModal.addEventListener("click", () => (editModal.style.display = "none"))
logoutBtn.addEventListener("click", handleLogout)

// Initialize the page
function initPage() {
  // Display admin info
  municipalityTitle.textContent = adminMunicipality || 'All Municipalities';
  adminEmailDisplay.textContent = adminEmail || 'Admin';
  
  // Set the municipality dropdown to the admin's municipality
  const municipalitySelect = document.getElementById("municipality");
  if (adminMunicipality && municipalitySelect) {
    municipalitySelect.value = adminMunicipality;
    
    // If admin is from a specific municipality, disable other options
    if (adminMunicipality !== '') {
      Array.from(municipalitySelect.options).forEach(option => {
        if (option.value !== adminMunicipality && option.value !== '') {
          option.disabled = true;
        }
      });
    }
  }
  
  // Update page title to reflect tour guides
  document.title = "Tour Guide Management";
  const pageTitle = document.querySelector("h1");
  if (pageTitle) {
    pageTitle.textContent = "Tour Guide Management - " + (adminMunicipality || 'All Municipalities');
  }
  
  // Update search placeholder
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.placeholder = "Search Tour Guides";
  }
  
  // Load tour guides
  loadTourGuides();
}

// Handle logout
async function handleLogout() {
  try {
    await signOut(auth);
    // Clear localStorage
    localStorage.removeItem('adminMunicipality');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminId');
    // Redirect to login page
    window.location.href = 'login.html';
  } catch (error) {
    console.error("Error signing out:", error);
    showMessage("Error signing out. Please try again.", "message");
  }
}

// Show message function
function showMessage(message, divId) {
  var messageDiv = document.getElementById(divId)
  messageDiv.style.display = "block"
  messageDiv.innerHTML = message
  messageDiv.style.opacity = 1
  setTimeout(() => {
    messageDiv.style.opacity = 0
  }, 5000)
}

// Storage reference
const storage = getStorage()

// Load Tour Guides
async function loadTourGuides() {
  const userList = document.getElementById("userList")
  userList.innerHTML = "" // Clear list
  const noResultsMessage = document.getElementById("noResultsMessage")

  try {
    let q;
    
    // If admin has a municipality, filter tour guides by that municipality
    if (adminMunicipality) {
      q = query(
        collection(db, "tourguides"), 
        where("municipality", "==", adminMunicipality),
        orderBy("firstName", "asc")
      );
    } else {
      // If no municipality (super admin), show all tour guides
      q = query(collection(db, "tourguides"), orderBy("firstName", "asc"));
    }

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      // No tour guides found
      noResultsMessage.style.display = "block"
    } else {
      noResultsMessage.style.display = "none"

      snapshot.forEach((doc) => {
        const tourguide = doc.data()
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${doc.id}</td>
          <td>${tourguide.firstName}</td>
          <td>${tourguide.middleName || ""}</td>
          <td>${tourguide.lastName}</td>
          <td>${tourguide.municipality}</td>
          <td>${tourguide.email}</td>
          <td>${tourguide.age}</td>
          <td>${tourguide.sex}</td>
          <td>${tourguide.destination || ""}</td>
          <td>
            <button class="view" onclick="viewTourGuide('${doc.id}')">View</button>
            <button class="edit" onclick="editTourGuide('${doc.id}')">Edit</button>
            <button onclick="archiveTourGuide('${doc.id}')">Archive</button>
          </td>`
        userList.appendChild(row)
      })
    }

    searchTourGuides() // Call searchTourGuides after loading to apply any existing search filter
  } catch (error) {
    console.error("Error loading tour guides:", error.message)
    noResultsMessage.style.display = "block"
  }
}

// View Tour Guide
window.viewTourGuide = async (tourguideId) => {
  try {
    const tourguideDoc = await getDoc(doc(db, "tourguides", tourguideId));
    if (tourguideDoc.exists()) {
      const tourguide = tourguideDoc.data();
      document.getElementById("viewUserId").textContent = tourguideId;
      document.getElementById("viewFirstName").textContent = tourguide.firstName;
      document.getElementById("viewMiddleName").textContent = tourguide.middleName || "";
      document.getElementById("viewLastName").textContent = tourguide.lastName;
      document.getElementById("viewTgrate").textContent = tourguide.tgrate || "";
      document.getElementById("viewGcash").textContent = tourguide.gcash || "";
      document.getElementById("viewMunicipality").textContent = tourguide.municipality;
      document.getElementById("viewEmail").textContent = tourguide.email;
      document.getElementById("viewAge").textContent = tourguide.age;
      document.getElementById("viewSex").textContent = tourguide.sex;
      document.getElementById("viewDestination").textContent = tourguide.destination || "";
      
      if (tourguide.profilePictureUrl) {
        document.getElementById("viewProfilePicture").src = tourguide.profilePictureUrl;
        document.getElementById("viewProfilePicture").style.display = "block";
      } else {
        document.getElementById("viewProfilePicture").style.display = "none";
      }
      
      if (tourguide.idPictureUrl) {
        document.getElementById("viewIdPicture").src = tourguide.idPictureUrl;
        document.getElementById("viewIdPicture").style.display = "block";
      } else {
        document.getElementById("viewIdPicture").style.display = "none";
      }
      
      viewModal.style.display = "block";
    } else {
      showMessage("Tour guide not found", "message");
    }
  } catch (error) {
    console.error("Error viewing tour guide:", error);
    showMessage("Error viewing tour guide: " + error.message, "message");
  }
}

// Edit Tour Guide
window.editTourGuide = async (tourguideId) => {
  try {
    const tourguideDoc = await getDoc(doc(db, "tourguides", tourguideId));
    if (tourguideDoc.exists()) {
      const tourguide = tourguideDoc.data();
      
      // Reset and set modal fields
      document.getElementById("editUserForm").reset();
      document.getElementById("editUserId").textContent = tourguideId;
      document.getElementById("editFirstName").value = tourguide.firstName;
      document.getElementById("editMiddleName").value = tourguide.middleName || "";
      document.getElementById("editLastName").value = tourguide.lastName;
      document.getElementById("editTgrate").value = tourguide.tgrate || "";
      document.getElementById("editGcash").value = tourguide.gcash || "";
      document.getElementById("editMunicipality").value = tourguide.municipality;
      document.getElementById("editEmail").value = tourguide.email;
      document.getElementById("editAge").value = tourguide.age;
      document.getElementById("editSex").value = tourguide.sex;
      document.getElementById("editDestination").value = tourguide.destination || "";
      
      if (tourguide.profilePictureUrl) {
        document.getElementById("currentProfilePicture").src = tourguide.profilePictureUrl;
        document.getElementById("currentProfilePicture").style.display = "block";
      } else {
        document.getElementById("currentProfilePicture").style.display = "none";
      }
      
      if (tourguide.idPictureUrl) {
        document.getElementById("currentIdPicture").src = tourguide.idPictureUrl;
        document.getElementById("currentIdPicture").style.display = "block";
      } else {
        document.getElementById("currentIdPicture").style.display = "none";
      }
      
      // If admin has a municipality, disable municipality selection
      if (adminMunicipality) {
        const editMunicipalitySelect = document.getElementById("editMunicipality");
        editMunicipalitySelect.value = adminMunicipality;
        Array.from(editMunicipalitySelect.options).forEach(option => {
          if (option.value !== adminMunicipality && option.value !== '') {
            option.disabled = true;
          }
        });
      }
      
      // Show the edit modal
      editModal.style.display = "block";
      
      // Handle form submission
      editUserForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const updatedData = {
          firstName: document.getElementById("editFirstName").value,
          middleName: document.getElementById("editMiddleName").value,
          lastName: document.getElementById("editLastName").value,
          tgrate: Number.parseInt(document.getElementById("editTgrate").value, 10) || 0,
          gcash: Number.parseInt(document.getElementById("editGcash").value, 10) || 0,
          municipality: document.getElementById("editMunicipality").value,
          age: Number.parseInt(document.getElementById("editAge").value, 10) || 0,
          sex: document.getElementById("editSex").value,
          destination: document.getElementById("editDestination").value,
        };
        
        // Check if the municipality matches the admin's municipality
        if (adminMunicipality && updatedData.municipality !== adminMunicipality) {
          showMessage(`You can only manage tour guides from ${adminMunicipality}`, "message");
          return;
        }
        
        // Check if profile picture was updated
        const newProfilePicture = document.getElementById("editProfilePicture").files[0];
        if (newProfilePicture) {
          const storageRef = ref(storage, `tourguide_pictures/${tourguide.email}`);
          await uploadBytes(storageRef, newProfilePicture);
          updatedData.profilePictureUrl = await getDownloadURL(storageRef);
        }
        
        // Check if ID picture was updated
        const newIdPicture = document.getElementById("editIdPicture").files[0];
        if (newIdPicture) {
          const storageRef = ref(storage, `tourguide_pictures/${tourguide.email}_id`);
          await uploadBytes(storageRef, newIdPicture);
          updatedData.idPictureUrl = await getDownloadURL(storageRef);
        }
        
        const docRef = doc(db, "tourguides", tourguideId);
        
        try {
          await updateDoc(docRef, updatedData);
          showMessage("Tour guide updated successfully", "message");
          editModal.style.display = "none"; // Close modal
          loadTourGuides(); // Reload list
        } catch (error) {
          console.error("Error updating tour guide:", error);
          showMessage("Error updating tour guide: " + error.message, "message");
        }
      };
    } else {
      showMessage("Tour guide not found", "message");
    }
  } catch (error) {
    console.error("Error editing tour guide:", error);
    showMessage("Error editing tour guide: " + error.message, "message");
  }
}

// Archive Tour Guide
window.archiveTourGuide = async (tourguideId) => {
  if (!tourguideId) {
    console.error("No document ID provided");
    alert("Error: No tour guide ID provided");
    return;
  }

  if (confirm("Are you sure you want to archive this tour guide?")) {
    const tourguideDoc = doc(db, "tourguides", tourguideId);

    try {
      const docSnapshot = await getDoc(tourguideDoc);

      if (docSnapshot.exists()) {
        const tourguideData = docSnapshot.data();
        
        // Check if the tour guide's municipality matches the admin's municipality
        if (adminMunicipality && tourguideData.municipality !== adminMunicipality) {
          alert(`You can only manage tour guides from ${adminMunicipality}`);
          return;
        }
        
        // 1. Archive tour guide data
        await addDoc(collection(db, "archive_tourguides"), {
          ...tourguideData,
          archivedAt: new Date(),
        });
        console.log("Tour guide data archived successfully");

        // 2. Delete the tour guide from Firestore
        await deleteDoc(tourguideDoc);
        console.log("Original tour guide document deleted");

        alert("Tour guide archived successfully.");
        loadTourGuides();
      } else {
        alert("Tour guide not found");
      }
    } catch (error) {
      console.error("Error archiving tour guide:", error);
      alert("An error occurred during archiving. Check console for details.");
    }
  }
}

// Search Tour Guides
window.searchTourGuides = function() {
  const searchInput = document.getElementById("searchInput").value.toLowerCase();
  const tourguideRows = document.querySelectorAll("#userList tr");
  const noResultsMessage = document.getElementById("noResultsMessage");
  let foundResults = false;

  tourguideRows.forEach((row) => {
    const firstName = row.querySelector("td:nth-child(2)").textContent.toLowerCase();
    const middleName = row.querySelector("td:nth-child(3)").textContent.toLowerCase();
    const lastName = row.querySelector("td:nth-child(4)").textContent.toLowerCase();
    const municipality = row.querySelector("td:nth-child(5)").textContent.toLowerCase();
    const email = row.querySelector("td:nth-child(6)").textContent.toLowerCase();
    const destination = row.querySelector("td:nth-child(9)").textContent.toLowerCase();
    const tourguideId = row.querySelector("td:nth-child(1)").textContent.toLowerCase();

    if (
      firstName.includes(searchInput) ||
      middleName.includes(searchInput) ||
      lastName.includes(searchInput) ||
      municipality.includes(searchInput) ||
      email.includes(searchInput) ||
      destination.includes(searchInput) ||
      tourguideId.includes(searchInput)
    ) {
      row.style.display = "";
      foundResults = true;
    } else {
      row.style.display = "none";
    }
  });

  if (foundResults) {
    noResultsMessage.style.display = "none";
  } else {
    noResultsMessage.style.display = "block";
  }
}

// Function to switch between entities
window.switchEntity = function() {
  const entityType = document.getElementById("entityDropdown").value;
  
  // Redirect to the appropriate page based on selection
  switch(entityType) {
    case "users":
      window.location.href = "adminusermanagement.html";
      break;
    case "admins":
      window.location.href = "adminmanagement.html";
      break;
    case "payments":
      window.location.href = "adminpaymentmanagement.html";
      break;
    case "bookings":
      window.location.href = "adminbookingmanagement.html";
      break;
    case "destinations":
      window.location.href = "admindestinationmanagement.html";
      break;
    case "feedbacks":
      window.location.href = "adminfeedbackmanagement.html";
      break;
    // For "tourguides", we stay on the current page
  }
}

// Initialize the page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  auth.onAuthStateChanged(user => {
    if (user) {
      initPage();
    } else {
      // Redirect to login if not logged in
      window.location.href = 'login.html';
    }
  });
  
  // Set up search input event listener
  document.getElementById("searchInput").addEventListener("input", searchTourGuides);
});