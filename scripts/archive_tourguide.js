import { auth, db } from "../scripts/firebase.js"
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
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
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"

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

async function loadTourguide() {
  const tourguideList = document.getElementById("tourguideList")
  tourguideList.innerHTML = "" // Clear list

  try {
    const snapshot = await getDocs(query(collection(db, "archive_tourguides"), orderBy("firstName", "asc")))
    snapshot.forEach((doc) => {
      const tourguide = doc.data()
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${doc.id}}</td>
        <td>${tourguide.firstName}</td>
        <td>${tourguide.middleName}</td>
        <td>${tourguide.lastName}</td>
        <td>${tourguide.municipality}</td>
        <td>${tourguide.email}</td>
        <td>${tourguide.age}</td>
        <td>${tourguide.sex}</td>
        <td>${tourguide.destination}</td>
        <td>
            <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="view" onclick="viewtourguide('${doc.id}}', '${tourguide.firstName}', '${tourguide.middleName}', '${tourguide.lastName}', '${tourguide.tgrate}', '${tourguide.gcash}', '${tourguide.municipality}', '${tourguide.email}', '${tourguide.age}', '${tourguide.sex}', '${tourguide.profilePictureUrl}', '${tourguide.destination}', '${tourguide.idPictureUrl}')"><i class="fas fa-eye"></i></button>
            <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="retrieveTourguide('${doc.id}')"><i class="fas fa-file-import"></i></button>
        </td>`
      tourguideList.appendChild(row)
    })
    searchTourguide() // Call searchTourguide after loading to apply any existing search filter
  } catch (error) {
    console.error("Error loading tour guides:", error.message)
  }
}

window.viewtourguide = (
  tourguideId,
  firstName,
  middleName,
  lastName,
  tgrate,
  gcash,
  municipality,
  email,
  age,
  sex,
  profilePictureUrl,
  destination,
  idPictureUrl,
) => {
  document.getElementById("viewtourguideId").textContent = tourguideId
  document.getElementById("viewfirstName").textContent = firstName
  document.getElementById("viewmiddleName").textContent = middleName
  document.getElementById("viewlastName").textContent = lastName
  document.getElementById("viewtgrate").textContent = tgrate
  document.getElementById("viewgcash").textContent = gcash
  document.getElementById("viewmunicipality").textContent = municipality
  document.getElementById("viewemail").textContent = email
  document.getElementById("viewage").textContent = age
  document.getElementById("viewsex").textContent = sex
  document.getElementById("viewProfilePicture").src = profilePictureUrl
  document.getElementById("viewdestination").textContent = destination
  document.getElementById("viewIdPicture").src = idPictureUrl
  viewModal.style.display = "block"
}

// Archive Tour Guide
window.retrieveTourguide = async (docId) => {
    if (!docId) {
      console.error("No document ID provided");
      alert("Error: No tour guide ID provided");
      return;
    }
  
    if (confirm("Are you sure you want to restore this tour guide?")) {
      const archivedTourguideDoc = doc(db, "archive_tourguides", docId);
  
      try {
        const docSnapshot = await getDoc(archivedTourguideDoc);
  
        if (docSnapshot.exists()) {
          const tourguideData = docSnapshot.data();
          
          // Remove the archivedAt field before restoring
          const { archivedAt, ...dataToRestore } = tourguideData;
          
          // 1. Restore tour guide data to the main collection
          await addDoc(collection(db, "tourguides"), dataToRestore);
          console.log("Tour guide restored successfully");
  
          // 2. Delete the archived tour guide
          await deleteDoc(archivedTourguideDoc);
          console.log("Archived tour guide document deleted");
  
          alert("Tour guide restored successfully.");
          loadTourguide(); // Refresh the tour guide list
        } else {
          alert("Archived tour guide not found");
        }
      } catch (error) {
        console.error("Error restoring tour guide:", error);
        alert("An error occurred during restoration. Check console for details.");
      }
    }
  };


function searchTourguide() {
  const searchInput = document.getElementById("searchInput").value.toLowerCase()
  const tourguideRows = document.querySelectorAll("#tourguideList tr")
  const noResultsMessage = document.getElementById("noResultsMessage")
  let foundResults = false

  tourguideRows.forEach((row) => {
    const firstName = row.querySelector("td:nth-child(2)").textContent.toLowerCase()
    const middleName = row.querySelector("td:nth-child(3)").textContent.toLowerCase()
    const lastName = row.querySelector("td:nth-child(4)").textContent.toLowerCase()
    const email = row.querySelector("td:nth-child(8)").textContent.toLowerCase() // Updated index for email
    const tourguideId = row.querySelector("td:nth-child(1)").textContent.toLowerCase()

    if (
      firstName.includes(searchInput) ||
      middleName.includes(searchInput) ||
      lastName.includes(searchInput) ||
      email.includes(searchInput) ||
      tourguideId.includes(searchInput)
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
  document.getElementById("searchInput").addEventListener("input", searchTourguide)
})

loadTourguide()
