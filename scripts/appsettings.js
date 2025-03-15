import { auth, db, storage } from "../scripts/firebase.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"

// Global variables
let currentOfficesPage = 1
let lastOfficeDoc = null
const officesPerPage = 10
let currentFaqPage = 1
let lastFaqDoc = null
const faqsPerPage = 10
let currentOfficeId = null
let currentFaqId = null
let itemToDelete = null
let deleteType = null

// Check authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Load app logo
      await loadAppLogo()

      // Load tourism offices
      await loadTourismOffices()

      // Load FAQs
      await loadFaqs()

      // Set up event listeners
      setupEventListeners()
    } catch (error) {
      console.error("Error loading app settings:", error)
      alert("Error loading app settings. Please try again later.")
    }
  } else {
    window.location.href = "../html/login.html"
  }
})

// Load app logo from Firestore
async function loadAppLogo() {
  try {
    const logoDoc = await getDoc(doc(db, "application_logo", "Logo"))

    if (logoDoc.exists()) {
      const logoData = logoDoc.data()

      // Show logo preview if exists
      if (logoData.logo_url) {
        const currentLogo = document.getElementById("currentLogo")
        if (currentLogo) {
          currentLogo.src = logoData.logo_url
        }
      }
    }
  } catch (error) {
    console.error("Error loading app logo:", error)
    throw error
  }
}

// Update the loadTourismOffices function to match the simplified fields
async function loadTourismOffices(searchTerm = "") {
  try {
    const officesTableBody = document.getElementById("officesTableBody")
    officesTableBody.innerHTML = '<tr><td colspan="5" class="loading-message">Loading offices...</td></tr>'

    let officesQuery

    if (searchTerm) {
      // Case-insensitive search is limited in Firestore, so we'll fetch all and filter client-side
      officesQuery = query(collection(db, "tourism_offices"), orderBy("name"))
    } else {
      officesQuery = query(collection(db, "tourism_offices"), orderBy("name"), limit(officesPerPage))

      if (lastOfficeDoc && currentOfficesPage > 1) {
        officesQuery = query(
          collection(db, "tourism_offices"),
          orderBy("name"),
          startAfter(lastOfficeDoc),
          limit(officesPerPage),
        )
      }
    }

    const officesSnapshot = await getDocs(officesQuery)

    if (officesSnapshot.empty) {
      officesTableBody.innerHTML = '<tr><td colspan="5" class="empty-message">No tourism offices found</td></tr>'
      updateOfficesPagination(0)
      return
    }

    // Clear the table
    officesTableBody.innerHTML = ""

    let offices = []
    officesSnapshot.forEach((doc) => {
      offices.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    // Filter by search term if provided
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase()
      offices = offices.filter(
        (office) =>
          office.name.toLowerCase().includes(searchTermLower) ||
          office.location.toLowerCase().includes(searchTermLower) ||
          office.contact.toLowerCase().includes(searchTermLower) ||
          office.email.toLowerCase().includes(searchTermLower),
      )

      // Only take the current page's worth of results
      const startIndex = (currentOfficesPage - 1) * officesPerPage
      offices = offices.slice(startIndex, startIndex + officesPerPage)
    }

    if (offices.length === 0) {
      officesTableBody.innerHTML =
        '<tr><td colspan="5" class="empty-message">No matching tourism offices found</td></tr>'
      updateOfficesPagination(0)
      return
    }

    // Remember the last document for pagination
    lastOfficeDoc = officesSnapshot.docs[officesSnapshot.docs.length - 1]

    // Populate the table
    offices.forEach((office) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${office.name || ""}</td>
        <td>${office.location || ""}</td>
        <td>${office.contact || ""}</td>
        <td>${office.email || ""}</td>
        <td class="actions-cell">
          <button class="edit-btn" data-id="${office.id}">Edit</button>
          <button class="delete-btn" data-id="${office.id}" data-name="${office.name}">Archive</button>
        </td>
      `
      officesTableBody.appendChild(row)
    })

    // Add event listeners to the edit and delete buttons
    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const officeId = e.target.getAttribute("data-id")
        openOfficeModal(officeId)
      })
    })

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const officeId = e.target.getAttribute("data-id")
        const officeName = e.target.getAttribute("data-name")
        openDeleteConfirmationModal("office", officeId, officeName)
      })
    })

    // Update pagination
    updateOfficesPagination(officesSnapshot.size)
  } catch (error) {
    console.error("Error loading tourism offices:", error)
    const officesTableBody = document.getElementById("officesTableBody")
    officesTableBody.innerHTML = '<tr><td colspan="5" class="error-message">Error loading tourism offices</td></tr>'
  }
}

// Load FAQs from Firestore
async function loadFaqs(searchTerm = "") {
  try {
    const faqAccordion = document.getElementById("faqAccordion")
    faqAccordion.innerHTML = '<div class="loading-message">Loading FAQs...</div>'

    let faqsQuery = query(collection(db, "faqs"), where("archived", "!=", true), limit(faqsPerPage))

    if (lastFaqDoc && currentFaqPage > 1) {
      faqsQuery = query(
        collection(db, "faqs"),
        where("archived", "!=", true),
        startAfter(lastFaqDoc),
        limit(faqsPerPage),
      )
    }

    const faqsSnapshot = await getDocs(faqsQuery)

    if (faqsSnapshot.empty) {
      faqAccordion.innerHTML = '<div class="empty-message">No FAQs found</div>'
      updateFaqsPagination(0)
      return
    }

    // Clear the accordion
    faqAccordion.innerHTML = ""

    let faqs = []
    faqsSnapshot.forEach((doc) => {
      faqs.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    // Filter by search term if provided
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase()
      faqs = faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchTermLower) || faq.answer.toLowerCase().includes(searchTermLower),
      )
    }

    if (faqs.length === 0) {
      faqAccordion.innerHTML = '<div class="empty-message">No matching FAQs found</div>'
      updateFaqsPagination(0)
      return
    }

    // Remember the last document for pagination
    lastFaqDoc = faqsSnapshot.docs[faqsSnapshot.docs.length - 1]

    // Populate the accordion
    faqs.forEach((faq) => {
      const faqItem = document.createElement("div")
      faqItem.className = "faq-item"
      faqItem.innerHTML = `
        <div class="faq-question">
          <span>${faq.question || ""}</span>
          <div class="faq-actions">
            <button class="edit-faq-btn" data-id="${faq.id}">Edit</button>
            <button class="delete-faq-btn" data-id="${faq.id}" data-question="${faq.question}">Archive</button>
          </div>
        </div>
        <div class="faq-answer">
          <p>${faq.answer || ""}</p>
        </div>
      `
      faqAccordion.appendChild(faqItem)
    })

    // Add event listeners to the FAQ items
    document.querySelectorAll(".faq-question").forEach((question) => {
      question.addEventListener("click", (e) => {
        // Don't toggle if clicking on the buttons
        if (e.target.tagName === "BUTTON") return

        const faqItem = question.parentElement
        faqItem.classList.toggle("active")
      })
    })

    // Add event listeners to the edit and delete buttons
    document.querySelectorAll(".edit-faq-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent accordion from toggling
        const faqId = e.target.getAttribute("data-id")
        openFaqModal(faqId)
      })
    })

    document.querySelectorAll(".delete-faq-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent accordion from toggling
        const faqId = e.target.getAttribute("data-id")
        const faqQuestion = e.target.getAttribute("data-question")
        openDeleteConfirmationModal("faq", faqId, faqQuestion)
      })
    })

    // Update pagination
    updateFaqsPagination(faqsSnapshot.size)
  } catch (error) {
    console.error("Error loading FAQs:", error)
    const faqAccordion = document.getElementById("faqAccordion")
    faqAccordion.innerHTML = '<div class="error-message">Error loading FAQs</div>'
  }
}

// Update offices pagination
function updateOfficesPagination(totalItems) {
  const pageInfo = document.getElementById("pageInfo")
  const prevPageBtn = document.getElementById("prevPage")
  const nextPageBtn = document.getElementById("nextPage")

  const totalPages = Math.ceil(totalItems / officesPerPage) || 1

  pageInfo.textContent = `Page ${currentOfficesPage} of ${totalPages}`

  prevPageBtn.disabled = currentOfficesPage <= 1
  nextPageBtn.disabled = currentOfficesPage >= totalPages || totalItems < officesPerPage
}

// Update FAQs pagination
function updateFaqsPagination(totalItems) {
  const pageInfo = document.getElementById("faqPageInfo")
  const prevPageBtn = document.getElementById("prevFaqPage")
  const nextPageBtn = document.getElementById("nextFaqPage")

  const totalPages = Math.ceil(totalItems / faqsPerPage) || 1

  pageInfo.textContent = `Page ${currentFaqPage} of ${totalPages}`

  prevPageBtn.disabled = currentFaqPage <= 1
  nextPageBtn.disabled = currentFaqPage >= totalPages || totalItems < faqsPerPage
}

// Set up event listeners
function setupEventListeners() {
  // Logo form submission
  const logoForm = document.getElementById("logoForm")
  if (logoForm) {
    logoForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      await updateAppLogo()
    })
  }

  // Office search
  const officeSearch = document.getElementById("officeSearch")
  if (officeSearch) {
    officeSearch.addEventListener(
      "input",
      debounce(() => {
        currentOfficesPage = 1
        lastOfficeDoc = null
        loadTourismOffices(officeSearch.value)
      }, 300),
    )
  }

  // FAQ search
  const faqSearch = document.getElementById("faqSearch")

  if (faqSearch) {
    faqSearch.addEventListener(
      "input",
      debounce(() => {
        currentFaqPage = 1
        lastFaqDoc = null
        loadFaqs(faqSearch.value)
      }, 300),
    )
  }

  // Hide the category filter since we're not using categories anymore
  const faqCategory = document.getElementById("faqCategory")
  if (faqCategory) {
    faqCategory.style.display = "none"
  }

  // Pagination buttons
  const prevPageBtn = document.getElementById("prevPage")
  const nextPageBtn = document.getElementById("nextPage")

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentOfficesPage > 1) {
        currentOfficesPage--
        lastOfficeDoc = null // Reset to fetch from beginning
        loadTourismOffices(officeSearch.value)
      }
    })
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      currentOfficesPage++
      loadTourismOffices(officeSearch.value)
    })
  }

  // FAQ pagination buttons
  const prevFaqPageBtn = document.getElementById("prevFaqPage")
  const nextFaqPageBtn = document.getElementById("nextFaqPage")

  if (prevFaqPageBtn) {
    prevFaqPageBtn.addEventListener("click", () => {
      if (currentFaqPage > 1) {
        currentFaqPage--
        lastFaqDoc = null // Reset to fetch from beginning
        loadFaqs(faqSearch.value)
      }
    })
  }

  if (nextFaqPageBtn) {
    nextFaqPageBtn.addEventListener("click", () => {
      currentFaqPage++
      loadFaqs(faqSearch.value)
    })
  }

  // Add Office button
  const addOfficeBtn = document.getElementById("addOfficeBtn")
  if (addOfficeBtn) {
    addOfficeBtn.addEventListener("click", () => {
      openOfficeModal()
    })
  }

  // Add FAQ button
  const addFaqBtn = document.getElementById("addFaqBtn")
  if (addFaqBtn) {
    addFaqBtn.addEventListener("click", () => {
      openFaqModal()
    })
  }

  // Office form submission
  const officeForm = document.getElementById("officeForm")
  if (officeForm) {
    officeForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      await saveOffice()
    })
  }

  // FAQ form submission
  const faqForm = document.getElementById("faqForm")
  if (faqForm) {
    faqForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      await saveFaq()
    })
  }

  // Modal close buttons
  const closeOfficeModal = document.getElementById("closeOfficeModal")
  const closeFaqModal = document.getElementById("closeFaqModal")
  const closeDeleteModal = document.getElementById("closeDeleteModal")

  if (closeOfficeModal) {
    closeOfficeModal.addEventListener("click", () => {
      document.getElementById("officeModal").style.display = "none"
    })
  }

  if (closeFaqModal) {
    closeFaqModal.addEventListener("click", () => {
      document.getElementById("faqModal").style.display = "none"
    })
  }

  if (closeDeleteModal) {
    closeDeleteModal.addEventListener("click", () => {
      document.getElementById("deleteConfirmModal").style.display = "none"
    })
  }

  // Cancel buttons
  const cancelOfficeBtn = document.getElementById("cancelOfficeBtn")
  const cancelFaqBtn = document.getElementById("cancelFaqBtn")
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn")

  if (cancelOfficeBtn) {
    cancelOfficeBtn.addEventListener("click", () => {
      document.getElementById("officeModal").style.display = "none"
    })
  }

  if (cancelFaqBtn) {
    cancelFaqBtn.addEventListener("click", () => {
      document.getElementById("faqModal").style.display = "none"
    })
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      document.getElementById("deleteConfirmModal").style.display = "none"
    })
  }

  // Confirm delete button
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn")
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (deleteType === "office") {
        await archiveOffice()
      } else if (deleteType === "faq") {
        await archiveFaq()
      }
    })
  }

  // Office logo preview
  const officeLogo = document.getElementById("officeLogo")
  if (officeLogo) {
    officeLogo.addEventListener("change", handleOfficeLogoUpload)
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logActivity("logout", "User logged out")
        await signOut(auth)
        window.location.href = "login.html"
      } catch (error) {
        console.error("Error signing out:", error)
      }
    })
  }
}

// Handle office logo upload and preview
function handleOfficeLogoUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const logoPreview = document.getElementById("officeLogoPreview")
    logoPreview.innerHTML = `<img src="${e.target.result}" alt="Office Logo Preview" style="max-width: 200px; max-height: 100px;">`
  }
  reader.readAsDataURL(file)
}

// Handle app logo upload and update
async function updateAppLogo() {
  try {
    const logoFile = document.getElementById("appLogo").files[0]
    if (!logoFile) {
      alert("Please select a logo file to upload")
      return
    }

    // Show loading state
    const submitButton = document.querySelector("#logoForm .action-button")
    const originalButtonText = submitButton.textContent
    submitButton.textContent = "Uploading..."
    submitButton.disabled = true

    // Upload logo to Firebase Storage with fixed path and name
    const storageRef = ref(storage, "application_logo/Application_logo.png")
    const uploadTask = await uploadBytes(storageRef, logoFile)
    const logo_url = await getDownloadURL(uploadTask.ref)

    // Update logo URL in Firestore - using the correct path
    await setDoc(
      doc(db, "application_logo", "Logo"),
      {
        logo_url,
      },
      { merge: true },
    )

    // Update the logo preview
    document.getElementById("currentLogo").src = logo_url

    // Log the activity
    await logActivity("settings", "Updated app logo")

    // Reset form and show success message
    document.getElementById("appLogo").value = ""
    submitButton.textContent = originalButtonText
    submitButton.disabled = false

    alert("App logo updated successfully")
  } catch (error) {
    console.error("Error updating app logo:", error)
    alert("Error updating app logo. Please try again.")

    // Reset button state
    const submitButton = document.querySelector("#logoForm .action-button")
    submitButton.textContent = "Update Logo"
    submitButton.disabled = false
  }
}

// Open office modal for add/edit
async function openOfficeModal(officeId = null) {
  try {
    const modal = document.getElementById("officeModal")
    const modalTitle = document.getElementById("officeModalTitle")
    const form = document.getElementById("officeForm")

    // Reset form
    form.reset()

    if (officeId) {
      // Edit mode
      modalTitle.textContent = "Edit Tourism Office"
      currentOfficeId = officeId

      // Fetch office data
      const officeDoc = await getDoc(doc(db, "tourism_offices", officeId))
      if (officeDoc.exists()) {
        const officeData = officeDoc.data()

        // Populate form fields
        document.getElementById("officeId").value = officeId
        document.getElementById("officeName").value = officeData.name || ""
        document.getElementById("officeLocation").value = officeData.location || ""
        document.getElementById("officeContact").value = officeData.contact || ""
        document.getElementById("officeEmail").value = officeData.email || ""
      }
    } else {
      // Add mode
      modalTitle.textContent = "Add Tourism Office"
      currentOfficeId = null
      document.getElementById("officeId").value = ""
    }

    // Show modal
    modal.style.display = "block"
  } catch (error) {
    console.error("Error opening office modal:", error)
    alert("Error loading office data. Please try again.")
  }
}

// Open FAQ modal for add/edit
async function openFaqModal(faqId = null) {
  try {
    const modal = document.getElementById("faqModal")
    const modalTitle = document.getElementById("faqModalTitle")
    const form = document.getElementById("faqForm")

    // Reset form
    form.reset()

    // Hide category and order fields since we're not using them anymore
    const categoryGroup = document.querySelector("#faqForm .form-group:nth-of-type(3)")
    const orderGroup = document.querySelector("#faqForm .form-group:nth-of-type(4)")
    if (categoryGroup) categoryGroup.style.display = "none"
    if (orderGroup) orderGroup.style.display = "none"

    if (faqId) {
      // Edit mode
      modalTitle.textContent = "Edit FAQ"
      currentFaqId = faqId

      // Fetch FAQ data
      const faqDoc = await getDoc(doc(db, "faqs", faqId))
      if (faqDoc.exists()) {
        const faqData = faqDoc.data()

        // Populate form fields
        document.getElementById("faqId").value = faqId
        document.getElementById("faqQuestion").value = faqData.question || ""
        document.getElementById("faqAnswer").value = faqData.answer || ""
      }
    } else {
      // Add mode
      modalTitle.textContent = "Add FAQ"
      currentFaqId = null
      document.getElementById("faqId").value = ""
    }

    // Show modal
    modal.style.display = "block"
  } catch (error) {
    console.error("Error opening FAQ modal:", error)
    alert("Error loading FAQ data. Please try again.")
  }
}

// Open delete confirmation modal
function openDeleteConfirmationModal(type, id, name) {
  const modal = document.getElementById("deleteConfirmModal")
  const message = document.getElementById("deleteConfirmMessage")
  const confirmBtn = document.getElementById("confirmDeleteBtn")

  deleteType = type
  itemToDelete = id

  if (type === "office") {
    message.textContent = `Are you sure you want to archive the tourism office "${name}"?`
  } else if (type === "faq") {
    message.textContent = `Are you sure you want to archive the FAQ "${name}"?`
  }

  // Change button text from "Delete" to "Archive"
  confirmBtn.textContent = "Archive"

  modal.style.display = "block"
}

// Save office to Firestore
async function saveOffice() {
  try {
    // Get form values
    const officeId = document.getElementById("officeId").value
    const name = document.getElementById("officeName").value
    const location = document.getElementById("officeLocation").value
    const contact = document.getElementById("officeContact").value
    const email = document.getElementById("officeEmail").value

    // Show loading state
    const submitButton = document.querySelector("#officeForm .submit-button")
    const originalButtonText = submitButton.textContent
    submitButton.textContent = "Saving..."
    submitButton.disabled = true

    // Prepare office data - removed timestamp and user tracking fields
    const officeData = {
      name,
      location,
      contact,
      email,
    }

    // Save to Firestore
    if (officeId) {
      // Update existing office
      await updateDoc(doc(db, "tourism_offices", officeId), officeData)
      await logActivity("office", `Updated tourism office: ${name}`)
    } else {
      // Add new office - removed timestamp and user tracking fields
      await addDoc(collection(db, "tourism_offices"), officeData)
      await logActivity("office", `Added new tourism office: ${name}`)
    }

    // Close modal and refresh list
    document.getElementById("officeModal").style.display = "none"
    await loadTourismOffices()

    // Reset button state
    submitButton.textContent = originalButtonText
    submitButton.disabled = false

    alert(`Tourism office ${officeId ? "updated" : "added"} successfully`)
  } catch (error) {
    console.error("Error saving office:", error)
    alert("Error saving office. Please try again.")

    // Reset button state
    const submitButton = document.querySelector("#officeForm .submit-button")
    submitButton.textContent = "Save Office"
    submitButton.disabled = false
  }
}

// Save FAQ to Firestore
async function saveFaq() {
  try {
    // Get form values
    const faqId = document.getElementById("faqId").value
    const question = document.getElementById("faqQuestion").value
    const answer = document.getElementById("faqAnswer").value

    // Show loading state
    const submitButton = document.querySelector("#faqForm .submit-button")
    const originalButtonText = submitButton.textContent
    submitButton.textContent = "Saving..."
    submitButton.disabled = true

    // Prepare FAQ data - only question and answer
    const faqData = {
      question,
      answer,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.uid,
    }

    // Save to Firestore
    if (faqId) {
      // Update existing FAQ
      await updateDoc(doc(db, "faqs", faqId), faqData)
      await logActivity("faq", `Updated FAQ: ${question}`)
    } else {
      // Add new FAQ
      faqData.createdAt = serverTimestamp()
      faqData.createdBy = auth.currentUser.uid
      faqData.archived = false
      await addDoc(collection(db, "faqs"), faqData)
      await logActivity("faq", `Added new FAQ: ${question}`)
    }

    // Close modal and refresh list
    document.getElementById("faqModal").style.display = "none"
    await loadFaqs()

    // Reset button state
    submitButton.textContent = originalButtonText
    submitButton.disabled = false

    alert(`FAQ ${faqId ? "updated" : "added"} successfully`)
  } catch (error) {
    console.error("Error saving FAQ:", error)
    alert("Error saving FAQ. Please try again.")

    // Reset button state
    const submitButton = document.querySelector("#faqForm .submit-button")
    submitButton.textContent = "Save FAQ"
    submitButton.disabled = false
  }
}

// Archive item (office or FAQ) instead of deleting
async function archiveOffice() {
  try {
    if (!itemToDelete) {
      alert("Invalid archive request")
      return
    }

    // Show loading state
    const archiveButton = document.getElementById("confirmDeleteBtn")
    const originalButtonText = archiveButton.textContent
    archiveButton.textContent = "Archiving..."
    archiveButton.disabled = true

    // Get office name for logging
    const officeDoc = await getDoc(doc(db, "tourism_offices", itemToDelete))
    const officeName = officeDoc.exists() ? officeDoc.data().name : "Unknown office"

    // Archive office instead of deleting
    await updateDoc(doc(db, "tourism_offices", itemToDelete), {
      archived: true,
      archivedAt: serverTimestamp(),
      archivedBy: auth.currentUser.uid,
    })
    await logActivity("office", `Archived tourism office: ${officeName}`)

    // Refresh offices list
    await loadTourismOffices()

    // Close modal
    document.getElementById("deleteConfirmModal").style.display = "none"

    // Reset state
    archiveButton.textContent = originalButtonText
    archiveButton.disabled = false
    itemToDelete = null
    deleteType = null

    alert("Office archived successfully")
  } catch (error) {
    console.error("Error archiving office:", error)
    alert("Error archiving office. Please try again.")

    // Reset button state
    const archiveButton = document.getElementById("confirmDeleteBtn")
    archiveButton.textContent = "Archive"
    archiveButton.disabled = false
  }
}

async function archiveFaq() {
  try {
    if (!itemToDelete) {
      alert("Invalid archive request")
      return
    }

    // Show loading state
    const archiveButton = document.getElementById("confirmDeleteBtn")
    const originalButtonText = archiveButton.textContent
    archiveButton.textContent = "Archiving..."
    archiveButton.disabled = true

    // Get FAQ question for logging
    const faqDoc = await getDoc(doc(db, "faqs", itemToDelete))
    const faqQuestion = faqDoc.exists() ? faqDoc.data().question : "Unknown FAQ"

    // Archive FAQ instead of deleting
    await updateDoc(doc(db, "faqs", itemToDelete), {
      archived: true,
      archivedAt: serverTimestamp(),
      archivedBy: auth.currentUser.uid,
    })
    await logActivity("faq", `Archived FAQ: ${faqQuestion}`)

    // Refresh FAQs list
    await loadFaqs()

    // Close modal
    document.getElementById("deleteConfirmModal").style.display = "none"

    // Reset state
    archiveButton.textContent = originalButtonText
    archiveButton.disabled = false
    itemToDelete = null
    deleteType = null

    alert("FAQ archived successfully")
  } catch (error) {
    console.error("Error archiving FAQ:", error)
    alert("Error archiving FAQ. Please try again.")

    // Reset button state
    const archiveButton = document.getElementById("confirmDeleteBtn")
    archiveButton.textContent = "Archive"
    archiveButton.disabled = false
  }
}

// Update settings in Firestore
async function updateSettings(settingsData) {
  try {
    const settingsRef = doc(db, "application_logo", "Logo")
    const settingsDoc = await getDoc(settingsRef)

    if (settingsDoc.exists()) {
      // Update existing document without timestamp and user tracking fields
      await setDoc(
        settingsRef,
        {
          ...settingsDoc.data(),
          ...settingsData,
        },
        { merge: true },
      )
    } else {
      // Create new document without timestamp and user tracking fields
      await setDoc(settingsRef, {
        ...settingsData,
      })
    }
  } catch (error) {
    console.error("Error updating settings:", error)
    throw error
  }
}

// Function to log user activity
async function logActivity(activityType, description) {
  try {
    const user = auth.currentUser
    if (!user) return

    const activityData = {
      userId: user.uid,
      userEmail: user.email,
      activityType: activityType,
      description: description,
      timestamp: serverTimestamp(),
      ipAddress: await getIPAddress(),
    }

    await addDoc(collection(db, "activity_logs"), activityData)
  } catch (error) {
    console.error("Error logging activity:", error)
  }
}

// Get user's IP address
async function getIPAddress() {
  try {
    const response = await fetch("https://api.ipify.org?format=json")
    const data = await response.json()
    return data.ip
  } catch (error) {
    console.error("Error getting IP address:", error)
    return "Unknown"
  }
}

// Debounce function for search inputs
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