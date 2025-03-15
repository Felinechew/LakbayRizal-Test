import { createUserWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"
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
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  updateMetadata,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"

// DOM Elements
const viewModal = document.getElementById("viewModal")
const closeViewModal = document.getElementById("closeViewModal")
closeViewModal.addEventListener("click", () => (viewModal.style.display = "none"))

function showMessage(message, divId) {
  var messageDiv = document.getElementById(divId)
  messageDiv.style.display = "block"
  messageDiv.innerHTML = message
  messageDiv.style.opacity = 1
  setTimeout(() => {
    messageDiv.style.opacity = 0
  }, 5000)
}

const storage = getStorage()

async function loadTravelers() {
  const travelerList = document.getElementById("travelerList")
  travelerList.innerHTML = "" // Clear list

  try {
    const snapshot = await getDocs(query(collection(db, "archive_travelers"), orderBy("firstName", "asc")))
    snapshot.forEach((doc) => {
      const traveler = doc.data()
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${doc.id}</td>
        <td>${traveler.firstName}</td>
        <td>${traveler.middleName}</td>
        <td>${traveler.lastName}</td>
        <td>${traveler.email}</td>
        <td>${traveler.age}</td>
        <td>${traveler.sex}</td>
        <td>********</td>
        <td>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="view" onclick="viewTraveler('${doc.id}', '${traveler.firstName}', '${traveler.middleName}', '${traveler.lastName}', '${traveler.email}', '${traveler.age}', '${traveler.sex}', '${traveler.profilePictureUrl}')"><i class="fas fa-eye"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="retrieveTraveler('${doc.id}')"><i class="fas fa-file-import"></i></button>
        </td>`
      travelerList.appendChild(row)
    })
    searchTraveler() // Call searchTraveler after loading to apply any existing search filter
  } catch (error) {
    console.error("Error loading travelers:", error.message)
  }
}

window.viewTraveler = (travelerId, firstName, middleName, lastName, email, age, sex, profilePictureUrl) => {
  document.getElementById("viewtravelerId").textContent = travelerId
  document.getElementById("viewfirstName").textContent = firstName
  document.getElementById("viewmiddleName").textContent = middleName
  document.getElementById("viewlastName").textContent = lastName
  document.getElementById("viewemail").textContent = email
  document.getElementById("viewage").textContent = age
  document.getElementById("viewsex").textContent = sex
  document.getElementById("viewProfilePicture").src = profilePictureUrl
  viewModal.style.display = "block"
}


window.retrieveArchivedTravelers = async () => {
    try {
      const archiveCollection = collection(db, "archive_travelers");
      const archiveSnapshot = await getDocs(archiveCollection);
  
      if (archiveSnapshot.empty) {
        alert("No archived travelers found.");
        return;
      }
  
      const batch = writeBatch(db);
  
      archiveSnapshot.forEach((doc) => {
        const travelerData = doc.data();
        const newTravelerRef = doc(db, "travelers", doc.id);
        
        batch.set(newTravelerRef, travelerData);
        batch.delete(doc.ref);
      });
  
      await batch.commit();
      
      alert("All archived travelers have been restored successfully.");
      loadTravelers();
    } catch (error) {
      console.error("Error retrieving archived travelers:", error);
      alert("An error occurred while retrieving travelers. Check console for details.");
    }
  };

function searchTraveler() {
  const searchInput = document.getElementById("searchInput").value.toLowerCase()
  const travelerRows = document.querySelectorAll("#travelerList tr")
  const noResultsMessage = document.getElementById("noResultsMessage")
  let foundResults = false

  travelerRows.forEach((row) => {
    const firstName = row.querySelector("td:nth-child(2)").textContent.toLowerCase()
    const middleName = row.querySelector("td:nth-child(3)").textContent.toLowerCase()
    const lastName = row.querySelector("td:nth-child(4)").textContent.toLowerCase()
    const email = row.querySelector("td:nth-child(5)").textContent.toLowerCase()
    const travelerId = row.querySelector("td:nth-child(1)").textContent.toLowerCase()

    if (
      firstName.includes(searchInput) ||
      middleName.includes(searchInput) ||
      lastName.includes(searchInput) ||
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

// Add this line to ensure the search function is called when the page loads
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchInput").addEventListener("input", searchTraveler)
})

loadTravelers()