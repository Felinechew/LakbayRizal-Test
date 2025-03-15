import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  startAt,
  endAt,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"
import { auth } from "../scripts/firebase.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"

// Firebase configuration
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
const db = getFirestore(app)
const storage = getStorage(app)

let currentPage = 1
const itemsPerPage = 10
let lastVisible = null
let firstVisible = null
let selectedImage = null
let currentPromoId = null

// Function to get the current date in YYYY-MM-DD format
function getCurrentDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Function to open modal
window.openModal = () => {
  document.getElementById("addModal").style.display = "block"
  // Reset form and image preview
  document.getElementById("promotionForm").reset()
  document.getElementById("previewImage").style.display = "none"
  document.getElementById("uploadPlaceholder").style.display = "block"
  selectedImage = null

  // Set minimum date for date inputs
  const currentDate = getCurrentDate()
  document.getElementById("dateAdded").min = currentDate
  document.getElementById("endDate").min = currentDate
}

// Function to close modal
window.closeModal = () => {
  document.getElementById("addModal").style.display = "none"
}

// Update the renderTable function
async function renderTable(searchTerm = "") {
  const tableBody = document.getElementById("promotionsTableBody")
  tableBody.innerHTML = ""

  let promotionsQuery

  if (searchTerm) {
    const searchTermLower = searchTerm.toLowerCase()
    promotionsQuery = query(
      collection(db, "promotions"),
      orderBy("companyNameLower"),
      startAt(searchTermLower),
      endAt(searchTermLower + "\uf8ff"),
      limit(itemsPerPage),
    )
  } else {
    promotionsQuery = query(collection(db, "promotions"), orderBy("dateAdded", "desc"), limit(itemsPerPage))
  }

  const querySnapshot = await getDocs(promotionsQuery)

  if (!querySnapshot.empty) {
    lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]
    firstVisible = querySnapshot.docs[0]
  } else {
    tableBody.innerHTML = '<tr><td colspan="5">No results found</td></tr>'
    return
  }

  querySnapshot.forEach((doc) => {
    const promo = doc.data()
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>${doc.id}</td>
            <td>${promo.companyName}</td>
            <td>${promo.dateAdded}</td>
            <td>${promo.endDate}</td>
            <td class="actions-cell">
                <button onclick="viewPromotion('${doc.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
                <button onclick="editPromotion('${doc.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
            </td>
        `
    tableBody.appendChild(row)
  })
}

// Pagination functions
window.nextPage = async () => {
  if (lastVisible) {
    const next = query(
      collection(db, "promotions"),
      orderBy("dateAdded", "desc"),
      startAfter(lastVisible),
      limit(itemsPerPage),
    )
    currentPage++
    await renderTable()
  }
}

window.prevPage = async () => {
  if (firstVisible && currentPage > 1) {
    const prev = query(
      collection(db, "promotions"),
      orderBy("dateAdded", "desc"),
      endBefore(firstVisible),
      limitToLast(itemsPerPage),
    )
    currentPage--
    await renderTable()
  }
}

// Function to handle image upload
window.handleImageUpload = async (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedImage = file
    const preview = document.getElementById("previewImage")
    const placeholder = document.getElementById("uploadPlaceholder")

    const reader = new FileReader()
    reader.onload = (e) => {
      preview.src = e.target.result
      preview.style.display = "block"
      placeholder.style.display = "none"
    }
    reader.readAsDataURL(file)
  }
}

// Update the form submission to include the lowercase company name
document.getElementById("promotionForm").addEventListener("submit", async function (e) {
  e.preventDefault()

  let imageUrl = ""
  if (selectedImage) {
    const storageRef = ref(storage, `promotions/${Date.now()}_${selectedImage.name}`)
    await uploadBytes(storageRef, selectedImage)
    imageUrl = await getDownloadURL(storageRef)
  }

  const companyName = document.getElementById("companyName").value
  const newPromo = {
    companyName: companyName,
    companyNameLower: companyName.toLowerCase(),
    municipality: document.getElementById("municipality").value,
    dateAdded: document.getElementById("dateAdded").value,
    endDate: document.getElementById("endDate").value,
    link: document.getElementById("promoLink").value,
    imageUrl: imageUrl,
  }

  try {
    await addDoc(collection(db, "promotions"), newPromo)
    closeModal()
    await renderTable()
    this.reset()
  } catch (error) {
    console.error("Error adding document: ", error)
  }
})

// Search functionality
document.getElementById("searchInput").addEventListener(
  "input",
  debounce(async (e) => {
    const searchTerm = e.target.value.trim()
    currentPage = 1
    await renderTable(searchTerm)
  }, 300),
)

// View promotion details
window.viewPromotion = async (id) => {
  currentPromoId = id
  const docRef = doc(db, "promotions", id)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    const data = docSnap.data()
    document.getElementById("viewId").value = id
    document.getElementById("viewCompanyName").value = data.companyName
    document.getElementById("viewMunicipality").value = data.municipality
    document.getElementById("viewDateAdded").value = data.dateAdded
    document.getElementById("viewEndDate").value = data.endDate
    document.getElementById("viewLink").value = data.link
    document.getElementById("viewImage").src = data.imageUrl || "/placeholder.svg"
    document.getElementById("viewModal").style.display = "block"
  }
}

// Close view modal
window.closeViewModal = () => {
  document.getElementById("viewModal").style.display = "none"
  currentPromoId = null
}

// Archive from view modal
window.archiveFromView = async () => {
  if (confirm("Are you sure you want to archive this promotion?")) {
    try {
      const docRef = doc(db, "promotions", currentPromoId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const promoData = docSnap.data()

        // 1. Archive promotion data
        await addDoc(collection(db, "archived_promotions"), {
          ...promoData,
          archivedAt: new Date(),
        })
        console.log("Promotion data archived successfully")

        // 2. Delete the promotion from Firestore
        await deleteDoc(docRef)
        console.log("Original promotion document deleted")

        alert("Promotion archived successfully.")
        closeViewModal()
        await renderTable()
      } else {
        alert("Promotion not found")
      }
    } catch (error) {
      console.error("Error archiving promotion:", error)
      alert("An error occurred during archiving. Check console for details.")
    }
  }
}

// Function to open edit modal
window.openEditModal = (id) => {
  document.getElementById("editModal").style.display = "block"
  populateEditForm(id)
}

// Function to close edit modal
window.closeEditModal = () => {
  document.getElementById("editModal").style.display = "none"
}

// Function to handle image upload for edit form
window.handleEditImageUpload = async (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedImage = file
    const preview = document.getElementById("editPreviewImage")
    const placeholder = document.getElementById("editUploadPlaceholder")

    const reader = new FileReader()
    reader.onload = (e) => {
      preview.src = e.target.result
      preview.style.display = "block"
      placeholder.style.display = "none"
    }
    reader.readAsDataURL(file)
  }
}

// Function to populate edit form
async function populateEditForm(id) {
  const docRef = doc(db, "promotions", id)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    const data = docSnap.data()
    document.getElementById("editId").value = id
    document.getElementById("editCompanyName").value = data.companyName
    document.getElementById("editMunicipality").value = data.municipality
    document.getElementById("editDateAdded").value = data.dateAdded
    document.getElementById("editEndDate").value = data.endDate
    document.getElementById("editPromoLink").value = data.link

    // Set minimum date for date inputs
    const currentDate = getCurrentDate()
    document.getElementById("editDateAdded").min = currentDate
    document.getElementById("editEndDate").min = currentDate

    if (data.imageUrl) {
      document.getElementById("editPreviewImage").src = data.imageUrl
      document.getElementById("editPreviewImage").style.display = "block"
      document.getElementById("editUploadPlaceholder").style.display = "none"
    } else {
      document.getElementById("editPreviewImage").style.display = "none"
      document.getElementById("editUploadPlaceholder").style.display = "block"
    }
  }
}

// Update the editPromotion function
window.editPromotion = (id) => {
  openEditModal(id)
}

// Update the edit form submission as well
document.getElementById("editPromotionForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const id = document.getElementById("editId").value
  let imageUrl = document.getElementById("editPreviewImage").src

  if (selectedImage) {
    const storageRef = ref(storage, `promotions/${Date.now()}_${selectedImage.name}`)
    await uploadBytes(storageRef, selectedImage)
    imageUrl = await getDownloadURL(storageRef)
  }

  const companyName = document.getElementById("editCompanyName").value
  const updatedPromo = {
    companyName: companyName,
    companyNameLower: companyName.toLowerCase(),
    municipality: document.getElementById("editMunicipality").value,
    dateAdded: document.getElementById("editDateAdded").value,
    endDate: document.getElementById("editEndDate").value,
    link: document.getElementById("editPromoLink").value,
    imageUrl: imageUrl,
  }

  try {
    await updateDoc(doc(db, "promotions", id), updatedPromo)
    closeEditModal()
    await renderTable()
  } catch (error) {
    console.error("Error updating document: ", error)
  }
})

// Update the window.onclick function to include the edit modal
window.onclick = (event) => {
  if (event.target == document.getElementById("addModal")) {
    closeModal()
  }
  if (event.target == document.getElementById("viewModal")) {
    closeViewModal()
  }
  if (event.target == document.getElementById("editModal")) {
    closeEditModal()
  }
}

// Add this debounce function at the end of the file
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Initialize table
renderTable()

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // User is signed out, redirect to login
    window.location.href = "../html/login.html"
  }
})

// Handle logout
const logoutBtn = document.getElementById("logoutBtn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth)
      window.location.href = "../html/login.html"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  })
}