// Import Firebase modules
import { db } from "../scripts/firebase.js"
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"
import {
  getAuth,
  createUserWithEmailAndPassword,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"

// DOM Elements
const addApplicantForm = document.getElementById("addApplicantForm")
const applicantsTableBody = document.getElementById("applicantsTableBody")
const viewApplicantModal = document.getElementById("viewApplicantModal")
const declineReasonModal = document.getElementById("declineReasonModal")
const applicantDetails = document.getElementById("applicantDetails")
const approveButton = document.getElementById("approveButton")
const declineButton = document.getElementById("declineButton")
const submitDeclineReason = document.getElementById("submitDeclineReason")
const declineReasonInput = document.getElementById("declineReason")
const approveConfirmModal = document.getElementById("approveConfirmModal")
const confirmApproveButton = document.getElementById("confirmApproveButton")
const viewPendingApplicantsButton = document.getElementById("viewPendingApplicants")
const viewDeclinedApplicantsButton = document.getElementById("viewDeclinedApplicants")
const viewDeclinedApplicantModal = document.getElementById("viewDeclinedApplicantModal")
const declinedApplicantDetails = document.getElementById("declinedApplicantDetails")
const archiveButton = document.getElementById("archiveButton")
const noResultsMessage = document.getElementById("noResultsMessage")

let currentApplicantId = null
let currentApplicantEmail = ""
let currentApplicantName = ""
let currentViewType = "pending" // Track the current view type
let isLoadingApplicants = false // Flag to prevent multiple simultaneous loads

// Modal functionality
const modals = document.querySelectorAll(".modal")
const closeButtons = document.querySelectorAll(".close, .close-modal")

function openModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.style.display = "block"
}

function closeModal(modal) {
  if (modal) modal.style.display = "none"
}

function closeAllModals() {
  modals.forEach((modal) => {
    if (modal) modal.style.display = "none"
  })
}

closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest(".modal")
    closeModal(modal)
  })
})

window.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal")) {
    closeModal(event.target)
  }
})

// Load Applicants
async function loadApplicants(type = "pending") {
  // Prevent multiple simultaneous loads which could cause duplication
  if (isLoadingApplicants) {
    console.log("Already loading applicants, please wait...")
    return
  }

  isLoadingApplicants = true

  console.log(`Loading ${type} applicants...`)
  if (!applicantsTableBody) {
    console.error("applicantsTableBody element not found")
    isLoadingApplicants = false
    return
  }

  // Update current view type
  currentViewType = type

  // Update button styling to show active state
  if (viewPendingApplicantsButton && viewDeclinedApplicantsButton) {
    if (type === "pending") {
      viewPendingApplicantsButton.classList.add("active-btn")
      viewDeclinedApplicantsButton.classList.remove("active-btn")
    } else {
      viewDeclinedApplicantsButton.classList.add("active-btn")
      viewPendingApplicantsButton.classList.remove("active-btn")
    }
  }

  // Clear existing rows before adding new ones
  applicantsTableBody.innerHTML = ""

  try {
    let querySnapshot
    if (type === "pending") {
      querySnapshot = await getDocs(query(collection(db, "tourguideapplicants"), where("status", "==", "pending")))
    } else if (type === "declined") {
      querySnapshot = await getDocs(collection(db, "decline_tourguideapplicants"))
    }

    // Check if there are any results
    if (querySnapshot.empty) {
      if (noResultsMessage) {
        noResultsMessage.style.display = "block"
        noResultsMessage.innerHTML = `<p>No ${type} applicants found.</p>`
      }
    } else {
      if (noResultsMessage) noResultsMessage.style.display = "none"

      // Create a document fragment to improve performance
      const fragment = document.createDocumentFragment()

      querySnapshot.forEach((doc) => {
        const applicant = doc.data()
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${doc.id}</td>
          <td>${applicant.firstName || ""}</td>
          <td>${applicant.middleName || ""}</td>
          <td>${applicant.lastName || ""}</td>
          <td>${applicant.email || ""}</td>
          <td>${applicant.municipality || ""}</td>
          <td>${applicant.destination || ""}</td>
          <td>${applicant.status || "declined"}</td>
          <td><button style="background: none; border: none; padding: 4px; cursor: pointer;" class="view-applicant" data-id="${doc.id}" data-email="${applicant.email || ""}" data-name="${(applicant.firstName || "") + " " + (applicant.lastName || "")}" data-type="${type}"><i class="fas fa-eye"></i></button></td>
        `
        fragment.appendChild(row)
      })

      // Append all rows at once
      applicantsTableBody.appendChild(fragment)

      // Add event listeners to "View" buttons
      document.querySelectorAll(".view-applicant").forEach((button) => {
        button.addEventListener("click", (e) => {
          const target = e.target.closest(".view-applicant")
          if (!target) return

          currentApplicantId = target.dataset.id
          currentApplicantEmail = target.dataset.email
          currentApplicantName = target.dataset.name
          openViewModal(currentApplicantId, target.dataset.type)
        })
      })
    }
  } catch (error) {
    console.error(`Error loading ${type} applicants: `, error)
    alert(`Failed to load ${type} applicants. Please check the console for more details.`)
    if (noResultsMessage) {
      noResultsMessage.style.display = "block"
      noResultsMessage.innerHTML = `<p>Error loading ${type} applicants. Please try again.</p>`
    }
  } finally {
    isLoadingApplicants = false
  }

  // Make sure the buttons container is always visible
  const buttonsContainer = document.querySelector(".view-buttons-container")
  if (buttonsContainer) {
    buttonsContainer.style.display = "block"
  }
}

// Update openViewModal function
async function openViewModal(id, type) {
  try {
    if (!id) {
      console.error("No document ID provided")
      alert("Error: No applicant ID provided")
      return
    }

    let docSnap
    try {
      if (type === "pending") {
        docSnap = await getDoc(doc(db, "tourguideapplicants", id))
      } else if (type === "declined") {
        docSnap = await getDoc(doc(db, "decline_tourguideapplicants", id))
      }
    } catch (fetchError) {
      console.error("Error fetching document:", fetchError)
      alert("Error retrieving applicant. Please try again.")
      return
    }

    // Check if docSnap is defined and exists
    if (docSnap && docSnap.exists()) {
      const applicant = docSnap.data()
      if (type === "pending") {
        const profilePic = document.getElementById("applicantProfilePicture")
        const firstName = document.getElementById("applicantfirstName")
        const middleName = document.getElementById("applicantmiddleName")
        const lastName = document.getElementById("applicantlastName")
        const email = document.getElementById("applicantEmail")
        const tgRate = document.getElementById("applicantTGRate")
        const gcash = document.getElementById("applicantGCash")
        const municipality = document.getElementById("applicantMunicipality")
        const age = document.getElementById("applicantAge")
        const sex = document.getElementById("applicantSex")
        const destination = document.getElementById("applicantDestination")
        const status = document.getElementById("applicantStatus")
        const idPic = document.getElementById("applicantIDPicture")

        if (profilePic) profilePic.src = applicant.profilePictureUrl || ""
        if (firstName) firstName.textContent = applicant.firstName || ""
        if (middleName) middleName.textContent = applicant.middleName || ""
        if (lastName) lastName.textContent = applicant.lastName || ""
        if (email) email.textContent = applicant.email || ""
        if (tgRate) tgRate.textContent = applicant.tgrate || ""
        if (gcash) gcash.textContent = applicant.gcash || ""
        if (municipality) municipality.textContent = applicant.municipality || ""
        if (age) age.textContent = applicant.age || ""
        if (sex) sex.textContent = applicant.sex || ""
        if (destination) destination.textContent = applicant.destination || ""
        if (status) status.textContent = applicant.status || ""
        if (idPic) idPic.src = applicant.idPictureUrl || ""

        openModal("viewApplicantModal")
      } else if (type === "declined") {
        const profilePic = document.getElementById("declinedApplicantProfilePicture")
        const firstName = document.getElementById("declinedApplicantfirstName")
        const middleName = document.getElementById("declinedApplicantmiddleName")
        const lastName = document.getElementById("declinedApplicantlastName")
        const email = document.getElementById("declinedApplicantEmail")
        const tgRate = document.getElementById("declinedApplicantTGRate")
        const gcash = document.getElementById("declinedApplicantGCash")
        const municipality = document.getElementById("declinedApplicantMunicipality")
        const age = document.getElementById("declinedApplicantAge")
        const sex = document.getElementById("declinedApplicantSex")
        const destination = document.getElementById("declinedApplicantDestination")
        const status = document.getElementById("declinedApplicantStatus")
        const reason = document.getElementById("declinedApplicantReason")
        const idPic = document.getElementById("declinedApplicantIDPicture")

        if (profilePic) profilePic.src = applicant.profilePictureUrl || ""
        if (firstName) firstName.textContent = applicant.firstName || ""
        if (middleName) middleName.textContent = applicant.middleName || ""
        if (lastName) lastName.textContent = applicant.lastName || ""
        if (email) email.textContent = applicant.email || ""
        if (tgRate) tgRate.textContent = applicant.tgrate || ""
        if (gcash) gcash.textContent = applicant.gcash || ""
        if (municipality) municipality.textContent = applicant.municipality || ""
        if (age) age.textContent = applicant.age || ""
        if (sex) sex.textContent = applicant.sex || ""
        if (destination) destination.textContent = applicant.destination || ""
        if (status) status.textContent = applicant.status || "declined"
        if (reason) reason.textContent = applicant.declineReason || "No reason provided"
        if (idPic) idPic.src = applicant.idPictureUrl || ""

        openModal("viewDeclinedApplicantModal")
      }
    } else {
      console.log("No such document or document does not exist!")
      alert("Applicant not found or has been removed!")
    }
  } catch (error) {
    console.error("Error retrieving applicant:", error)
    alert("Error retrieving applicant details. Please try again.")
  }
}

// Approve Applicant
if (approveButton) {
  approveButton.addEventListener("click", () => {
    closeModal(document.getElementById("viewApplicantModal"))
    openModal("approveConfirmModal")
  })
}

// Submit Decline Reason
if (submitDeclineReason) {
  submitDeclineReason.addEventListener("click", async () => {
    if (!declineReasonInput) return

    const reason = declineReasonInput.value.trim()
    if (!reason) {
      alert("Please enter a reason.")
      return
    }

    try {
      // Get the current applicant's data
      const applicantDoc = await getDoc(doc(db, "tourguideapplicants", currentApplicantId))
      if (!applicantDoc || !applicantDoc.exists()) {
        throw new Error("Applicant not found")
      }
      const applicantData = applicantDoc.data()

      // Delete the user from Firebase Authentication
      const auth = getAuth()
      try {
        if (auth.currentUser) {
          await deleteUser(auth.currentUser)
          console.log("User deleted from authentication")
        } else {
          console.log("No current user to delete")
        }
      } catch (authError) {
        console.error("Error deleting user from authentication:", authError)
      }

      // Add the declined reason to the applicant data
      applicantData.status = "declined"
      applicantData.declineReason = reason
      applicantData.declinedAt = new Date()

      // Add the applicant to the decline_tourguideapplicants collection
      await addDoc(collection(db, "decline_tourguideapplicants"), applicantData)

      // Remove the applicant from the tourguideapplicants collection
      await deleteDoc(doc(db, "tourguideapplicants", currentApplicantId))

      await sendEmail({
        to: currentApplicantEmail,
        message: {
          subject: "Application Declined",
          text: `Dear ${currentApplicantName},\n\nWe regret to inform you that your application has been declined.\n\nReason: ${reason}\n\nBest regards,\nThe Team`,
        },
      })

      alert("Application declined, moved to declined applications, email sent, and user authentication deleted.")
      closeModal(document.getElementById("declineReasonModal"))
      loadApplicants("pending")
    } catch (error) {
      console.error("Error declining applicant:", error)
      alert("An error occurred while declining the application. Please try again.")
    }
  })
}

if (confirmApproveButton) {
  confirmApproveButton.addEventListener("click", async () => {
    closeModal(document.getElementById("approveConfirmModal"))
    try {
      // Get the applicant's data
      const applicantDoc = await getDoc(doc(db, "tourguideapplicants", currentApplicantId))
      if (!applicantDoc || !applicantDoc.exists()) {
        throw new Error("Applicant not found")
      }
      const applicantData = applicantDoc.data()

      // Add the applicant to the tourguides collection
      const tourguideRef = await addDoc(collection(db, "tourguides"), {
        firstName: applicantData.firstName || "",
        middleName: applicantData.middleName || "",
        lastName: applicantData.lastName || "",
        email: applicantData.email || "",
        tgrate: applicantData.tgrate || 0,
        gcash: applicantData.gcash || 0,
        municipality: applicantData.municipality || "",
        age: applicantData.age || 0,
        sex: applicantData.sex || "",
        destination: applicantData.destination || "",
        profilePictureUrl: applicantData.profilePictureUrl || "",
        idPictureUrl: applicantData.idPictureUrl || "",
        status: "active",
      })

      console.log("Tour guide added with ID: ", tourguideRef.id)

      // Add the user to Firebase Authentication
      try {
        const auth = getAuth()
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          applicantData.email,
          applicantData.password || "defaultPassword123",
        )
        console.log("User added to authentication with ID: ", userCredential.user.uid)
      } catch (authError) {
        console.error("Error creating user in authentication:", authError)
        // Continue with the process even if auth fails
      }

      // Update the applicant's status to approved
      try {
        await updateDoc(doc(db, "tourguideapplicants", currentApplicantId), { status: "approved" })
      } catch (updateError) {
        console.error("Error updating applicant status:", updateError)
      }

      // Send approval email
      await sendEmail({
        to: currentApplicantEmail,
        message: {
          subject: "Application Approved",
          text: `Dear ${currentApplicantName},\n\nCongratulations! Your tour guide application has been approved. Welcome to the team!\n\nBest regards,\nThe Team`,
        },
      })

      // Remove the applicant from the tourguideapplicants collection
      await deleteDoc(doc(db, "tourguideapplicants", currentApplicantId))

      // Show success message
      alert("Tour Guide Approved")
      loadApplicants("pending")
    } catch (error) {
      console.error("Error approving applicant:", error)
      alert("An error occurred while approving the applicant. Please check the console for details.")
    }
  })
}

// Decline Applicant
if (declineButton) {
  declineButton.addEventListener("click", () => {
    closeModal(document.getElementById("viewApplicantModal"))
    openModal("declineReasonModal")
  })
}

// Send Email Function
async function sendEmail(emailData) {
  try {
    await addDoc(collection(db, "mail"), emailData)
    console.log("Email queued successfully:", emailData)
  } catch (error) {
    console.error("Error queueing email:", error)
  }
}

// Add this function to handle file uploads
async function uploadFile(file, path) {
  const storage = getStorage()
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return await getDownloadURL(storageRef)
}

// Update the archive button event listener
if (archiveButton) {
  archiveButton.addEventListener("click", () => {
    archiveDeclinedApplicant(currentApplicantId)
    closeModal(document.getElementById("viewDeclinedApplicantModal"))
  })
}

// Archive Declined Applicant
async function archiveDeclinedApplicant(docId) {
  if (!docId) {
    console.error("No document ID provided")
    alert("Error: No applicant ID provided")
    return
  }

  if (confirm("Are you sure you want to archive this declined applicant?")) {
    const applicantDoc = doc(db, "decline_tourguideapplicants", docId)

    try {
      const docSnapshot = await getDoc(applicantDoc)

      if (docSnapshot && docSnapshot.exists()) {
        const applicantData = docSnapshot.data()

        // 1. Archive applicant data
        await addDoc(collection(db, "archived_tourguideapplicants"), {
          ...applicantData,
          archivedAt: new Date(),
        })
        console.log("Declined applicant data archived successfully")

        // 2. Delete the applicant from Firestore
        await deleteDoc(applicantDoc)
        console.log("Original declined applicant document deleted")

        alert("Declined applicant archived successfully.")
        const modal = document.getElementById("viewDeclinedApplicantModal")
        if (modal) modal.style.display = "none"
        loadApplicants("declined")
      } else {
        alert("Declined applicant not found")
      }
    } catch (error) {
      console.error("Error archiving declined applicant:", error)
      alert("An error occurred during archiving. Check console for details.")
    }
  }
}

function searchTourguideapp() {
  const searchInput = document.getElementById("searchInput")?.value.toLowerCase() || ""
  const tourguideRows = document.querySelectorAll("#applicantsTableBody tr")

  if (!tourguideRows.length) return

  let foundResults = false

  tourguideRows.forEach((row) => {
    const firstName = row.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || ""
    const middleName = row.querySelector("td:nth-child(3)")?.textContent.toLowerCase() || ""
    const lastName = row.querySelector("td:nth-child(4)")?.textContent.toLowerCase() || ""
    const email = row.querySelector("td:nth-child(5)")?.textContent.toLowerCase() || ""
    const municipality = row.querySelector("td:nth-child(6)")?.textContent.toLowerCase() || ""
    const destination = row.querySelector("td:nth-child(7)")?.textContent.toLowerCase() || ""
    const tourguideId = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || ""

    if (
      firstName.includes(searchInput) ||
      middleName.includes(searchInput) ||
      lastName.includes(searchInput) ||
      email.includes(searchInput) ||
      municipality.includes(searchInput) ||
      destination.includes(searchInput) ||
      tourguideId.includes(searchInput)
    ) {
      row.style.display = ""
      foundResults = true
    } else {
      row.style.display = "none"
    }
  })

  if (noResultsMessage) {
    noResultsMessage.style.display = foundResults ? "none" : "block"
    if (!foundResults) {
      noResultsMessage.innerHTML = `<p>No ${currentViewType} applicants found matching your search.</p>`
    }
  }
}

// Add event listeners for the view buttons
if (viewPendingApplicantsButton) {
  viewPendingApplicantsButton.addEventListener("click", () => {
    currentViewType = "pending"
    loadApplicants("pending")

    // Highlight the active button
    if (viewPendingApplicantsButton) viewPendingApplicantsButton.classList.add("active-btn")
    if (viewDeclinedApplicantsButton) viewDeclinedApplicantsButton.classList.remove("active-btn")
  })
}

if (viewDeclinedApplicantsButton) {
  viewDeclinedApplicantsButton.addEventListener("click", () => {
    currentViewType = "declined"
    loadApplicants("declined")

    // Highlight the active button
    if (viewDeclinedApplicantsButton) viewDeclinedApplicantsButton.classList.add("active-btn")
    if (viewPendingApplicantsButton) viewPendingApplicantsButton.classList.remove("active-btn")
  })
}

// Add this line to ensure the search function is called when the page loads
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the page
  loadApplicants("pending")

  // Set up search input event listener
  const searchInputElem = document.getElementById("searchInput")
  if (searchInputElem) {
    searchInputElem.addEventListener("input", searchTourguideapp)
  }

  // Initially highlight the pending button
  if (viewPendingApplicantsButton) viewPendingApplicantsButton.classList.add("active-btn")
})
