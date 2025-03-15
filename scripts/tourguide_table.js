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

const viewModal = document.getElementById("viewModal")
const closeViewModal = document.getElementById("closeViewModal")
const editModal = document.getElementById("editModal")
const closeEditModal = document.getElementById("closeEditModal")
const editTourguideForm = document.getElementById("editTourguideForm")
closeViewModal.addEventListener("click", () => (viewModal.style.display = "none"))
closeEditModal.addEventListener("click", () => (editModal.style.display = "none"))

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
    const snapshot = await getDocs(query(collection(db, "tourguides"), orderBy("firstName", "asc")))
    snapshot.forEach((doc) => {
      const tourguide = doc.data()
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${tourguide.uid || `tourguide_${doc.id}`}</td>
        <td>${tourguide.firstName}</td>
        <td>${tourguide.middleName}</td>
        <td>${tourguide.lastName}</td>
        <td>${tourguide.municipality}</td>
        <td>${tourguide.email}</td>
        <td>${tourguide.age}</td>
        <td>${tourguide.sex}</td>
        <td>${tourguide.destination}</td>
        <td>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="view" onclick="viewtourguide('${tourguide.uid || `tourguide_${doc.id}`}', '${tourguide.firstName}', '${tourguide.middleName}', '${tourguide.lastName}', '${tourguide.tgrate}', '${tourguide.gcash}', '${tourguide.municipality}', '${tourguide.email}', '${tourguide.age}', '${tourguide.sex}', '${tourguide.profilePictureUrl}', '${tourguide.destination}', '${tourguide.idPictureUrl}')"><i class="fas fa-eye"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="edit" onclick="edittourguide('${doc.id}', '${tourguide.firstName}', '${tourguide.middleName}', '${tourguide.lastName}', '${tourguide.tgrate}', '${tourguide.gcash}', '${tourguide.municipality}', '${tourguide.email}', '${tourguide.age}', '${tourguide.sex}', '${tourguide.profilePictureUrl}', '${tourguide.destination}', '${tourguide.idPictureUrl}')"><i class="fas fa-edit"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="archiveTourguide('${doc.id}')"><i class="fas fa-archive"></i></button>
        </td>`
      tourguideList.appendChild(row)
    })
    searchTourguide() // Call searchTourguide after loading to apply any existing search filter
  } catch (error) {
    console.error("Error loading tour guides:", error.message)
  }
}

window.viewtourguide = (
  uid,
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
  document.getElementById("viewtourguideId").textContent = uid
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

window.edittourguide = (
  docId,
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
  // Reset and set modal fields
  document.getElementById("editTourguideForm").reset()
  const uid = `tourguide_${docId}`
  document.getElementById("viewtourguideID").textContent = uid
  document.getElementById("viewtourguideID").textContent = docId 
  document.getElementById("editfirstName").value = firstName
  document.getElementById("editmiddleName").value = middleName
  document.getElementById("editlastName").value = lastName
  document.getElementById("edittgrate").value = tgrate
  document.getElementById("editgcash").value = gcash
  document.getElementById("editmunicipality").value = municipality
  document.getElementById("editEmail").value = email // Set the email value
  document.getElementById("editage").value = age
  document.getElementById("editsex").value = sex
  document.getElementById("currentProfilePicture").src = profilePictureUrl
  document.getElementById("editdestination").value = destination
  document.getElementById("currentIdPicture").src = idPictureUrl

  // Show the edit modal
  editModal.style.display = "block"

  // Handle form submission
  editTourguideForm.onsubmit = async (e) => {
    e.preventDefault()

    const updatedData = {
      firstName: document.getElementById("editfirstName").value,
      middleName: document.getElementById("editmiddleName").value,
      lastName: document.getElementById("editlastName").value,
      tgrate: Number.parseInt(document.getElementById("edittgrate").value, 10) || 0,
      gcash: Number.parseInt(document.getElementById("editgcash").value, 10) || 0,
      municipality: document.getElementById("editmunicipality").value,
      age: Number.parseInt(document.getElementById("editage").value, 10) || 0,
      sex: document.getElementById("editsex").value,
      destination: document.getElementById("editdestination").value,
    }

    const docRef = doc(db, "tourguides", docId)

    try {
      await updateDoc(docRef, updatedData)
      showMessage("Tour guide updated successfully", "AddTourguide")
      editModal.style.display = "none" // Close modal
      loadTourguide() // Reload list
    } catch (error) {
      console.error("Error updating tour guide:", error)
      showMessage("Error updating tour guide: " + error.message, "AddTourguide")
    }
  }
}

// Archive Tour Guide
window.archiveTourguide = async (docId) => {
  if (!docId) {
    console.error("No document ID provided");
    alert("Error: No tour guide ID provided");
    return;
  }

  if (confirm("Are you sure you want to archive this tour guide?")) {
    const userDoc = doc(db, "tourguides", docId);

    try {
      const docSnapshot = await getDoc(userDoc);

      if (docSnapshot.exists()) {
        const tourguideData = docSnapshot.data();
        const email = tourguideData.email;

        if (!email) {
          console.error("No email found for this tour guide");
          alert("Error: No email found for this tour guide");
          return;
        }

        // 1. Archive tour guide data
        const archivedDocRef = await addDoc(collection(db, "archive_tourguides"), {
          ...tourguideData,
          originalId: docId, // Store the original ID in the archive
        });
        console.log("Tour guide data archived successfully");

        // 2. Move Profile Picture
        const oldProfilePicRef = ref(storage, `tourguide_pictures/${email}`);
        const newProfilePicRef = ref(storage, `archivepictures_tourguides/${email}`);

        // 3. Move Tour Guide ID Picture
        const oldIdPicRef = ref(storage, `tourguide_pictures/${email}_id`);
        const newIdPicRef = ref(storage, `archiveidpictures_tourguides/${email}_id`);

        try {
          console.log("Attempting to copy profile picture...");
          await uploadBytes(newProfilePicRef);
          const profileMetadata = await getMetadata(oldProfilePicRef);
          await updateMetadata(newProfilePicRef, profileMetadata);
          console.log("Profile picture copied successfully");
          await deleteObject(oldProfilePicRef);
          console.log("Original profile picture deleted");

          console.log("Attempting to copy ID picture...");
          await uploadBytes(newIdPicRef);
          const idMetadata = await getMetadata(oldIdPicRef);
          await updateMetadata(newIdPicRef, idMetadata);
          console.log("ID picture copied successfully");
          await deleteObject(oldIdPicRef);
          console.log("Original ID picture deleted");

          // Update the archived document with the new URLs
          const newProfilePicUrl = await getDownloadURL(newProfilePicRef);
          const newIdPicUrl = await getDownloadURL(newIdPicRef);
          await updateDoc(archivedDocRef, {
            profilePictureUrl: newProfilePicUrl,
            idPictureUrl: newIdPicUrl,
          });
          console.log("Archived document updated with new picture URLs");
        } catch (picError) {
          console.error("Error moving pictures:", picError);
          alert("Error moving profile or ID picture. Tour guide partially archived.");
        }

        // 4. Delete the tour guide from Firestore
        await deleteDoc(userDoc);
        console.log("Original tour guide document deleted");

        alert("Tour guide archived successfully.");
        loadTourguide();
      } else {
        alert("Tour guide not found");
      }
    } catch (error) {
      console.error("Error archiving tour guide:", error);
      alert("An error occurred during archiving. Check console for details.");
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