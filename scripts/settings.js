import { auth, db } from "../scripts/firebase.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"

// Check authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // First, check if the user is a superadmin
      const superadminsRef = collection(db, "superadmins")
      const superadminQuery = query(superadminsRef, where("email", "==", user.email))
      const superadminSnapshot = await getDocs(superadminQuery)

      if (!superadminSnapshot.empty) {
        // User is a superadmin
        const superadminDoc = superadminSnapshot.docs[0]
        const superadminData = superadminDoc.data()

        document.getElementById("admin-id").value = superadminDoc.id
        document.getElementById("email").value = superadminData.email || user.email
        document.getElementById("municipality").value = superadminData.location || ""
        document.getElementById("province").value = superadminData.province || ""
        document.getElementById("password").value = "••••••••"

        // You might want to add a visual indicator that this is a superadmin
        const accountForm = document.getElementById("accountForm")
        if (accountForm) {
          const roleIndicator = document.createElement("div")
          roleIndicator.className = "role-indicator"
          roleIndicator.innerHTML = "<span>Super Admin</span>"
          accountForm.prepend(roleIndicator)
        }

        return // Exit early since we've found and displayed superadmin data
      }

      // If not a superadmin, check if they're a regular admin
      let adminDoc = await getDoc(doc(db, "admins", user.uid))

      if (!adminDoc.exists()) {
        const adminsRef = collection(db, "admins")
        const q = query(adminsRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          adminDoc = querySnapshot.docs[0]
        } else {
          throw new Error("No admin document found")
        }
      }

      const adminData = adminDoc.data()
      document.getElementById("admin-id").value = adminDoc.id
      document.getElementById("email").value = adminData.email || user.email
      document.getElementById("municipality").value = adminData.municipality || ""
      document.getElementById("password").value = "••••••••"
    } catch (error) {
      console.error("Error fetching admin data:", error)
      alert("Error loading admin data. Please contact system administrator.")
    }
  } else {
    window.location.href = "../html/login.html"
  }
})

const modal = document.getElementById("backupModal")
const backupBtn = document.getElementById("backupDataBtn")
const closeBtn = document.getElementsByClassName("close")[0]
const modalBackupBtn = document.getElementById("backupButton")
const activityLogBtn = document.getElementById("activityLogBtn")
const importModal = document.getElementById("importModal")
const importBtn = document.getElementById("importDataBtn")
const importCloseBtn = document.getElementById("importCloseBtn")
const modalImportBtn = document.getElementById("importButton")
const fileInput = document.getElementById("fileInput")
const appSettingsBtn = document.getElementById("appSettingsBtn")

// App Settings button click handler
if (appSettingsBtn) {
  appSettingsBtn.addEventListener("click", async () => {
    try {
      // Log the activity
      await logActivity("navigation", "Navigated to App Settings page")
      // Navigate to app settings page
      window.location.href = "appsettings.html"
    } catch (error) {
      console.error("Error navigating to app settings:", error)
    }
  })
}

// Activity Log button click handler
if (activityLogBtn) {
  activityLogBtn.addEventListener("click", async () => {
    try {
      // Log the activity
      await logActivity("navigation", "Navigated to Activity Log page")
      // Navigate to activity log page
      window.location.href = "activitylog.html"
    } catch (error) {
      console.error("Error navigating to activity log:", error)
    }
  })
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

// Fetch data based on collection name
async function fetchCollectionData(collectionName) {
  try {
    const collectionRef = collection(db, collectionName)
    const querySnapshot = await getDocs(collectionRef)
    const data = []

    querySnapshot.forEach((doc) => {
      const itemData = doc.data()
      // Remove sensitive fields
      delete itemData.ProfilePictureUrl
      delete itemData.uid
      // Add document ID to the data
      itemData.id = doc.id
      data.push(itemData)
    })

    return data
  } catch (error) {
    console.error(`Error fetching data from ${collectionName}:`, error)
    return []
  }
}

// Get selected date range
function getDateRange(dateOption) {
  const now = new Date()
  const startDate = new Date()

  switch (dateOption) {
    case "today":
      startDate.setHours(0, 0, 0, 0)
      break
    case "week":
      startDate.setDate(now.getDate() - 7)
      break
    case "month":
      startDate.setMonth(now.getMonth() - 1)
      break
    case "year":
      startDate.setFullYear(now.getFullYear() - 1)
      break
    default:
      return null // 'all' case - no date filtering
  }

  return startDate
}

// Filter data by date
function filterByDate(data, dateOption) {
  const startDate = getDateRange(dateOption)
  if (!startDate) return data // Return all data if no date filter

  return data.filter((item) => {
    const itemDate = item.createdAt?.toDate() || new Date()
    return itemDate >= startDate
  })
}

backupBtn.onclick = async () => {
  resetCheckboxes()
  modal.style.display = "block"
}

closeBtn.onclick = () => {
  modal.style.display = "none"
  resetCheckboxes()
}

window.onclick = (event) => {
  if (event.target == modal) {
    modal.style.display = "none"
    resetCheckboxes()
  }
  if (event.target == importModal) {
    importModal.style.display = "none"
    resetImportCheckboxes()
  }
}

function resetCheckboxes() {
  document.querySelectorAll("#backupModal input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = false
  })
}

modalBackupBtn.onclick = async () => {
  const selectedDate = document.getElementById("backupDate").value
  const fileFormat = document.getElementById("fileFormat").value

  // Map of checkbox IDs to collection names
  const collectionMap = {
    travelerProfile: "travelers",
    tourGuideProfile: "tourguides",
    bookingHistory: "bookings",
    archivedTraveler: "archive_travelers",
    archivedTourGuide: "archive_tourguides",
    archivedItinerary: "archived_itineraries",
  }

  let backupCount = 0

  // Get data for each selected checkbox
  for (const [checkboxId, collectionName] of Object.entries(collectionMap)) {
    const checkbox = document.getElementById(checkboxId)
    if (checkbox && checkbox.checked) {
      try {
        let data = await fetchCollectionData(collectionName)
        if (data.length > 0) {
          data = filterByDate(data, selectedDate)
          if (fileFormat === "csv") {
            saveCSV(data, collectionName)
          } else {
            saveJSON(data, collectionName)
          }
          backupCount++
        } else {
          console.log(`No data found for ${collectionName}`)
        }
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error)
      }
    }
  }

  if (backupCount > 0) {
    // Log the backup activity
    await logActivity("backup", `Backed up ${backupCount} collection(s) in ${fileFormat} format`)
    alert(`Backup completed. ${backupCount} file(s) have been created.`)
  } else {
    alert("No data was backed up. Please make sure you've selected at least one option with available data.")
  }
  resetCheckboxes()
}

function saveFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  resetCheckboxes()
}

function saveCSV(data, collectionName) {
  if (data.length > 0) {
    const headers = Object.keys(data[0])
    let csvContent = headers.join(",") + "\n"

    data.forEach((item) => {
      csvContent +=
        headers
          .map((header) => {
            const value = item[header]
            return `"${value?.toString().replace(/"/g, '""') || ""}"`
          })
          .join(",") + "\n"
    })

    const date = new Date().toISOString().split("T")[0]
    saveFile(csvContent, `${collectionName}_${date}.csv`, "text/csv")
  }
  resetCheckboxes()
}

function saveJSON(data, collectionName) {
  const date = new Date().toISOString().split("T")[0]
  const jsonContent = JSON.stringify(data, null, 2)
  saveFile(jsonContent, `${collectionName}_${date}.json`, "application/json")
}

const logoutBtn = document.getElementById("logoutBtn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logActivity("logout", "User logged out")
      await signOut(auth)
      window.location.href = "../html/login.html"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  })
}

// Add import button click handler
if (importBtn) {
  importBtn.addEventListener("click", () => {
    resetImportCheckboxes()
    importModal.style.display = "block"
  })
}

// Add close button handler for import modal
if (importCloseBtn) {
  importCloseBtn.onclick = () => {
    importModal.style.display = "none"
    resetImportCheckboxes()
  }
}

// Reset import checkboxes
function resetImportCheckboxes() {
  document.querySelectorAll("#importModal input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = false
  })
  fileInput.value = ""
  document.getElementById("importPreview").innerHTML = ""
}

// Add file input change handler
if (fileInput) {
  fileInput.addEventListener("change", handleFileSelect)
}

// Handle file selection
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      let data
      if (file.name.endsWith(".csv")) {
        data = parseCSV(e.target.result)
      } else if (file.name.endsWith(".json")) {
        data = JSON.parse(e.target.result)
      } else {
        throw new Error("Unsupported file format")
      }

      // Preview the data
      showDataPreview(data)
    } catch (error) {
      console.error("Error parsing file:", error)
      alert("Error parsing file. Please make sure it's a valid CSV or JSON file.")
    }
  }

  if (file.name.endsWith(".csv")) {
    reader.readAsText(file)
  } else if (file.name.endsWith(".json")) {
    reader.readAsText(file)
  } else {
    alert("Please select a CSV or JSON file")
    fileInput.value = ""
  }
}

// Parse CSV data
function parseCSV(csvText) {
  const lines = csvText.split("\n")
  const headers = lines[0].split(",").map((header) => header.trim().replace(/^"(.*)"$/, "$1"))

  const data = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    // Handle quoted values with commas inside
    const values = []
    let inQuote = false
    let currentValue = ""

    for (const char of lines[i]) {
      if (char === '"') {
        inQuote = !inQuote
      } else if (char === "," && !inQuote) {
        values.push(currentValue.replace(/^"(.*)"$/, "$1"))
        currentValue = ""
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.replace(/^"(.*)"$/, "$1"))

    const row = {}
    headers.forEach((header, index) => {
      if (index < values.length) {
        row[header] = values[index]
      }
    })

    data.push(row)
  }

  return data
}

// Show data preview
function showDataPreview(data) {
  if (!data || data.length === 0) {
    document.getElementById("importPreview").innerHTML = "<p>No data found in file</p>"
    return
  }

  const previewCount = Math.min(5, data.length)
  let previewHTML = `<h3>Preview (${previewCount} of ${data.length} records)</h3>`

  // Create table for preview
  previewHTML += '<table class="preview-table"><thead><tr>'
  const headers = Object.keys(data[0])
  headers.forEach((header) => {
    previewHTML += `<th>${header}</th>`
  })
  previewHTML += "</tr></thead><tbody>"

  // Add rows
  for (let i = 0; i < previewCount; i++) {
    previewHTML += "<tr>"
    headers.forEach((header) => {
      previewHTML += `<td>${data[i][header] || ""}</td>`
    })
    previewHTML += "</tr>"
  }

  previewHTML += "</tbody></table>"
  document.getElementById("importPreview").innerHTML = previewHTML
}

// Add import button click handler
if (modalImportBtn) {
  modalImportBtn.addEventListener("click", async () => {
    const file = fileInput.files[0]
    if (!file) {
      alert("Please select a file to import")
      return
    }

    // Map of checkbox IDs to collection names
    const collectionMap = {
      importTravelerProfile: "travelers",
      importTourGuideProfile: "tourguides",
      importBookingHistory: "bookings",
      importArchivedTraveler: "archive_travelers",
      importArchivedTourGuide: "archive_tourguides",
      importArchivedItinerary: "archived_itineraries",
    }

    // Check if at least one checkbox is selected
    let selectedCollection = null
    for (const [checkboxId, collectionName] of Object.entries(collectionMap)) {
      const checkbox = document.getElementById(checkboxId)
      if (checkbox && checkbox.checked) {
        selectedCollection = collectionName
        break
      }
    }

    if (!selectedCollection) {
      alert("Please select a destination for the imported data")
      return
    }

    try {
      // Read and parse the file
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          let data
          if (file.name.endsWith(".csv")) {
            data = parseCSV(e.target.result)
          } else if (file.name.endsWith(".json")) {
            data = JSON.parse(e.target.result)
          } else {
            throw new Error("Unsupported file format")
          }

          if (!data || data.length === 0) {
            alert("No data found in the file")
            return
          }

          // Confirm import
          const confirmImport = confirm(
            `Are you sure you want to import ${data.length} records to ${selectedCollection}?`,
          )
          if (!confirmImport) return

          // Import data to Firestore
          const importedCount = await importToFirestore(data, selectedCollection)

          // Log the import activity
          await logActivity("import", `Imported ${importedCount} records to ${selectedCollection}`)

          alert(`Import completed. ${importedCount} records have been imported to ${selectedCollection}.`)
          importModal.style.display = "none"
          resetImportCheckboxes()
        } catch (error) {
          console.error("Error importing data:", error)
          alert(`Error importing data: ${error.message}`)
        }
      }

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file)
      } else if (file.name.endsWith(".json")) {
        reader.readAsText(file)
      }
    } catch (error) {
      console.error("Error reading file:", error)
      alert(`Error reading file: ${error.message}`)
    }
  })
}

// Import data to Firestore
async function importToFirestore(data, collectionName) {
  try {
    const user = auth.currentUser
    if (!user) {
      throw new Error("User not authenticated")
    }

    let importedCount = 0
    const collectionRef = collection(db, collectionName)

    // Process each record
    for (const record of data) {
      // Remove id field if it exists (to avoid conflicts)
      const { id, ...recordData } = record

      // Add metadata
      recordData.importedBy = user.uid
      recordData.importedAt = serverTimestamp()

      // Convert string timestamps to Firestore timestamps if needed
      for (const key in recordData) {
        if (key.toLowerCase().includes("date") || key.toLowerCase().includes("time")) {
          const dateValue = new Date(recordData[key])
          if (!isNaN(dateValue.getTime())) {
            recordData[key] = dateValue
          }
        }
      }

      // Add document to Firestore
      await addDoc(collectionRef, recordData)
      importedCount++
    }

    return importedCount
  } catch (error) {
    console.error("Error importing to Firestore:", error)
    throw error
  }
}