import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"
import { auth, db } from "../scripts/firebase.js";
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
  updateMetadata
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"

// DOM Elements
const travelerForm = document.getElementById("travelerForm")
const viewModal = document.getElementById("viewModal")
const closeViewModal = document.getElementById("closeViewModal")
const editModal = document.getElementById("editModal")
const closeEditModal = document.getElementById("closeEditModal")
const editTravelerForm = document.getElementById("editTravelerForm")
closeViewModal.addEventListener("click", () => (viewModal.style.display = "none"))
closeEditModal.addEventListener("click", () => (editModal.style.display = "none"))

// function toggleModal(modal, show = true) {
//   modal.style.display = show ? "block" : "none";
// }

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
    const snapshot = await getDocs(query(collection(db, "travelers"), orderBy("firstName", "asc")))
    snapshot.forEach((doc) => {
      const traveler = doc.data()
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${traveler.uid || `traveler_${doc.id}`}</td>
        <td>${traveler.firstName}</td>
        <td>${traveler.middleName}</td>
        <td>${traveler.lastName}</td>
        <td>${traveler.email}</td>
        <td>${traveler.age}</td>
        <td>${traveler.sex}</td>
        <td>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="view" onclick="viewTraveler('${traveler.uid || `traveler_${doc.id}`}', '${traveler.firstName}', '${traveler.middleName}', '${traveler.lastName}', '${traveler.email}', '${traveler.age}', '${traveler.sex}', '${traveler.profilePictureUrl}')"><i class="fas fa-eye"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="edit" onclick="editTraveler('${doc.id}', '${traveler.firstName}', '${traveler.middleName}', '${traveler.lastName}', '${traveler.email}', '${traveler.age}', '${traveler.sex}', '${traveler.profilePictureUrl}')"><i class="fas fa-edit"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="archiveTraveler('${doc.id}')"><i class="fas fa-archive"></i></button>
        </td>`
      travelerList.appendChild(row)
    })
    searchTraveler() // Call searchTraveler after loading to apply any existing search filter
  } catch (error) {
    console.error("Error loading travelers:", error.message)
  }
}

window.viewTraveler = (uid, firstName, middleName, lastName, email, age, sex, profilePictureUrl) => {
  document.getElementById("viewtravelerId").textContent = uid
  document.getElementById("viewfirstName").textContent = firstName
  document.getElementById("viewmiddleName").textContent = middleName
  document.getElementById("viewlastName").textContent = lastName
  document.getElementById("viewemail").textContent = email
  document.getElementById("viewage").textContent = age
  document.getElementById("viewsex").textContent = sex
  document.getElementById("viewProfilePicture").src = profilePictureUrl 
  viewModal.style.display = "block"
}

window.editTraveler = (docId, firstName, middleName, lastName, email, age, sex, profilePictureUrl) => {
  const uid = `traveler_${docId}`
  document.getElementById("viewtravelerID").textContent = uid
  document.getElementById("editFirstName").value = firstName
  document.getElementById("editMiddleName").value = middleName
  document.getElementById("editLastName").value = lastName
  document.getElementById("viewEmail").value = email
  document.getElementById("editAge").value = age
  document.getElementById("editSex").value = sex
  document.getElementById("currentProfilePicture").src = profilePictureUrl
  editModal.style.display = "block"

  editTravelerForm.onsubmit = async (e) => {
    e.preventDefault()
    const updatedData = {
      firstName: document.getElementById("editFirstName").value,
      middleName: document.getElementById("editMiddleName").value,
      lastName: document.getElementById("editLastName").value,
      age: Number.parseInt(document.getElementById("editAge").value, 10),
      sex: document.getElementById("editSex").value,
      uid: uid,
    }

    const docRef = doc(db, "travelers", travelerId)
    try {
      await updateDoc(docRef, updatedData)
      showMessage("Traveler updated successfully", "AddTraveler")
      editModal.style.display = "none"
      loadTravelers()
    } catch (error) {
      console.error("Error updating traveler:", error)
      showMessage("Error updating traveler: " + error.message, "AddTraveler")
    }
  }
}

window.archiveTraveler = async (docId) => {
  if (!docId) {
    console.error("No document ID provided")
    alert("Error: No traveler ID provided")
    return
  }

  if (confirm("Are you sure you want to archive this user?")) {
    const userDoc = doc(db, "travelers", docId)

    try {
      const docSnapshot = await getDoc(userDoc)

      if (docSnapshot.exists()) {
        const travelerData = docSnapshot.data()
        const email = travelerData.email

        if (!email) {
          console.error("No email found for this traveler")
          alert("Error: No email found for this traveler")
          return
        }

        // 1. Archive traveler data
        const archivedDocRef = await addDoc(collection(db, "archive_travelers"), travelerData)
        console.log("Traveler data archived successfully")

        // 2. Move the profile picture
        const oldPicRef = ref(storage, `traveler_pictures/${email}`)
        const newPicName = `archivepictures_travelers/${email}`
        const newPicRef = ref(storage, newPicName)

        try {
          console.log("Attempting to copy profile picture")

          // Create a 1 byte placeholder file in the new location
          await uploadBytes(newPicRef)

          // Copy metadata from old file to new file
          const oldMetadata = await getMetadata(oldPicRef)
          await updateMetadata(newPicRef, oldMetadata)

          console.log("Profile picture copied successfully")

          console.log("Deleting original picture")
          await deleteObject(oldPicRef)
          console.log("Original picture deleted successfully")

          // Update the profilePictureUrl in the archived document
          const newPicUrl = await getDownloadURL(newPicRef)
          await updateDoc(archivedDocRef, {
            profilePictureUrl: newPicUrl,
          })
          console.log("Archived document updated with new picture URL")
        } catch (picError) {
          console.error("Error moving profile picture:", picError)
          if (picError.code === "storage/object-not-found") {
            console.log("No profile picture found for this user")
          } else {
            alert("Error moving profile picture. Traveler partially archived. Check console for details.")
          }
        }

        // 3. Delete the traveler from Firestore
        await deleteDoc(userDoc)
        console.log("Original traveler document deleted")

        alert("Traveler archived successfully.")
        loadTravelers()
      } else {
        alert("Traveler not found")
      }
    } catch (error) {
      console.error("Error archiving traveler:", error)
      alert("An error occurred during archiving. Check console for details.")
    }
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