import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  query,
  getDocs,
  getDoc,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"

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

// Global variables
let currentPage = 1
const itemsPerPage = 10
let currentTab = "application"
let allRatings = []
let currentRating = 0

function initStarRating() {
  const stars = document.querySelectorAll(".star")
  stars.forEach((star) => {
    star.addEventListener("click", (e) => {
      currentRating = Number.parseInt(e.target.dataset.value)
      updateRating()
    })
  })
}

function updateRating() {
  const stars = document.querySelectorAll(".star")
  stars.forEach((star) => {
    const value = Number.parseInt(star.dataset.value)
    star.classList.toggle("active", value <= currentRating)
  })
}

async function fetchRatings() {
  try {
    const feedbacksRef = collection(db, "archived_tourguide_ratings")
    const appFeedbacksRef = collection(db, "archived_application_ratings")

    const feedbacksQuery = query(feedbacksRef, orderBy("timestamp", "desc"))
    const appFeedbacksQuery = query(appFeedbacksRef, orderBy("timestamp", "desc"))

    const [feedbacksSnapshot, appFeedbacksSnapshot] = await Promise.all([
      getDocs(feedbacksQuery),
      getDocs(appFeedbacksQuery),
    ])

    const tourGuideRatings = feedbacksSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((rating) => rating.ratedEntity === "tourguide")

    const applicationRatings = appFeedbacksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      ratedEntity: "application",
    }))

    allRatings = [...tourGuideRatings, ...applicationRatings]

    displayRatings()
  } catch (error) {
    console.error("Error fetching ratings: ", error)
  }
}

function displayTourGuideRatings() {
  const tourGuideRatingGroups = {}

  allRatings
    .filter((rating) => rating.ratedEntity === "tourguide")
    .forEach((rating) => {
      if (!tourGuideRatingGroups[rating.fullname]) {
        tourGuideRatingGroups[rating.fullname] = {
          id: rating.id,
          name: rating.fullname,
          totalStars: 0,
          totalFeedback: 0,
        }
      }
      tourGuideRatingGroups[rating.fullname].totalStars += rating.rating
      tourGuideRatingGroups[rating.fullname].totalFeedback++
    })

  const tableBody = document.getElementById("ratings-table-body")
  tableBody.innerHTML = ""

  const searchTerm = document.getElementById("searchInput").value.toLowerCase()

  const filteredGuides = Object.values(tourGuideRatingGroups).filter((guide) =>
    guide.name.toLowerCase().includes(searchTerm),
  )

  // Sort the filtered guides alphabetically by name
  filteredGuides.sort((a, b) => a.name.localeCompare(b.name))

  const totalPages = Math.ceil(filteredGuides.length / itemsPerPage)
  const start = (currentPage - 1) * itemsPerPage
  const end = start + itemsPerPage
  const paginatedGuides = filteredGuides.slice(start, end)

  paginatedGuides.forEach((guide) => {
    const averageRating = (guide.totalStars / guide.totalFeedback).toFixed(1)
    const row = document.createElement("tr")

    row.innerHTML = `
      <td>${guide.id}</td>
      <td>${guide.name}</td>
      <td>${averageRating}/5</td>
      <td>${guide.totalStars}</td>
      <td>${guide.totalFeedback}</td>
      <td class="actions">
        <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="action-btn view" title="View Details"><i class="fas fa-eye"></i></button>
      </td>
    `

    row.querySelector(".view").addEventListener("click", () => viewTourGuideRatings(guide))

    tableBody.appendChild(row)
  })

  updatePagination(totalPages)
}

function viewTourGuideRatings(guide) {
  const modal = document.getElementById("viewModal")
  if (!modal) return

  const modalTitle = document.getElementById("modalTitle")
  if (modalTitle) {
    modalTitle.textContent = `Ratings for ${guide.name}`
  }

  const averageRating = document.getElementById("averageRating")
  if (averageRating) {
    averageRating.textContent = (guide.totalStars / guide.totalFeedback).toFixed(1)
  }

  const totalRatings = document.getElementById("totalRatings")
  if (totalRatings) {
    totalRatings.textContent = guide.totalFeedback
  }

  const ratingsList = document.getElementById("ratingsList")
  if (ratingsList) {
    ratingsList.innerHTML = allRatings
      .filter((rating) => rating.ratedEntity === "tourguide" && rating.fullname === guide.name)
      .map(
        (rating) => `
      <div class="rating-item">
        <div class="rating-header">
          <input type="checkbox" class="rating-checkbox" data-id="${rating.id}">
          <strong>${rating.fullname}</strong>
          <span class="rating-stars">${"★".repeat(rating.rating)}${"☆".repeat(5 - rating.rating)}</span>
        </div>
        <p class="rating-message">${rating.message}</p>
        <small class="rating-date">${new Date(rating.timestamp.seconds * 1000).toLocaleDateString()}</small>
      </div>
    `,
      )
      .join("")
  }

  document.getElementById("tourGuideRatingDetails").style.display = "block"
  document.getElementById("applicationRatingDetails").style.display = "none"

  const modalFooter = modal.querySelector(".modal-footer")
  if (modalFooter) {
    modalFooter.innerHTML = `
      <button class="cancel-btn">Cancel</button>
      <button class="retrieve-selected-btn">Retrieve Selected</button>
    `
    modalFooter.querySelector(".retrieve-selected-btn").addEventListener("click", retrieveSelectedRatings)
  }

  modal.style.display = "flex"

  setupModalEventListeners(modal)
}

function setupModalEventListeners(modal) {
  const cancelButton = modal.querySelector(".cancel-btn")
  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      modal.style.display = "none"
    })
  }

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  }
}

function displayRatings() {
  const tableBody = document.getElementById("ratings-table-body")
  tableBody.innerHTML = ""

  const ratingsToDisplay =
    currentTab === "application"
      ? allRatings.filter((rating) => rating.ratedEntity === "application")
      : allRatings.filter((rating) => rating.ratedEntity === "tourguide")

  const headerRow = document.querySelector("thead tr")
  const filterType = document.getElementById("filterType")

  if (currentTab === "tourguide") {
    headerRow.innerHTML = `
      <th>ID</th>
      <th>Name</th>
      <th>Average Rating</th>
      <th>Total Stars</th>
      <th>Total Feedback</th>
      <th>Actions</th>
    `
    displayTourGuideRatings()
    filterType.style.display = "none"
  } else {
    headerRow.innerHTML = `
      <th>ID</th>
      <th>Name</th>
      <th>Rating</th>
      <th>User Type</th>
      <th>Date</th>
      <th>Actions</th>
    `
    displayApplicationRatings(ratingsToDisplay)
    filterType.style.display = "inline-block"
  }
}

function displayApplicationRatings(applicationRatings) {
  const tableBody = document.getElementById("ratings-table-body")
  tableBody.innerHTML = ""

  const filteredRatings = applicationRatings.filter((rating) => {
    const typeFilter = document.getElementById("filterType")
    const searchTerm = document.getElementById("searchInput").value.toLowerCase()
    const matchesType =
      typeFilter.style.display === "none" ||
      typeFilter.value === "all" ||
      rating.userType.toLowerCase() === typeFilter.value.toLowerCase()
    const matchesSearch = rating.fullname.toLowerCase().includes(searchTerm)

    return matchesType && matchesSearch
  })

  // Sort the filtered ratings alphabetically by rater's name
  filteredRatings.sort((a, b) => a.fullname.localeCompare(b.fullname))

  const totalPages = Math.ceil(filteredRatings.length / itemsPerPage)
  const start = (currentPage - 1) * itemsPerPage
  const end = start + itemsPerPage
  const paginatedRatings = filteredRatings.slice(start, end)

  paginatedRatings.forEach((rating) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${rating.id}</td>
      <td>${rating.fullname}</td>
      <td>${"★".repeat(rating.rating)}${"☆".repeat(5 - rating.rating)}</td>
      <td>${rating.userType}</td>
      <td>${new Date(rating.timestamp.seconds * 1000).toLocaleDateString()}</td>
      <td class="actions">
        <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="action-btn view" title="View Details"><i class="fas fa-eye"></i></button>
        <button style="background: none; border: none; padding: 4px; cursor: pointer;" class="action-btn retrieve" title="Retrieve"><i class="fas fa-file-import"></i></button>
      </td>
    `

    const viewBtn = row.querySelector(".view")
    viewBtn.addEventListener("click", () => viewRatingDetails(rating))

    const retrieveBtn = row.querySelector(".retrieve")
    retrieveBtn.addEventListener("click", () => retrieveApplicationRating(rating.id))

    tableBody.appendChild(row)
  })

  updatePagination(totalPages)
}

function viewRatingDetails(rating) {
  const modal = document.getElementById("viewModal")
  if (!modal) return

  const modalTitle = document.getElementById("modalTitle")
  if (modalTitle) {
    modalTitle.textContent = rating.ratedEntity.charAt(0).toUpperCase() + rating.ratedEntity.slice(1) + " Rating"
  }

  const raterName = document.getElementById("raterName")
  if (raterName) {
    raterName.textContent = rating.fullname
  }

  const raterType = document.getElementById("raterType")
  if (raterType) {
    raterType.textContent = rating.userType
  }

  const ratedEntity = document.getElementById("ratedEntity")
  if (ratedEntity) {
    ratedEntity.textContent = rating.ratedEntity === "application" ? "Application" : rating.fullname
  }

  const ratingDate = document.getElementById("ratingDate")
  if (ratingDate) {
    ratingDate.textContent = new Date(rating.timestamp.seconds * 1000).toLocaleDateString()
  }

  const starRating = document.getElementById("starRating")
  if (starRating) {
    starRating.innerHTML = Array(rating.rating)
      .fill('<span class="star active">★</span>')
      .concat(Array(5 - rating.rating).fill('<span class="star">☆</span>'))
      .join("")
  }

  const feedbackMessage = document.getElementById("feedbackMessage")
  if (feedbackMessage) {
    feedbackMessage.textContent = rating.message
  }

  document.getElementById("applicationRatingDetails").style.display = "block"
  document.getElementById("tourGuideRatingDetails").style.display = "none"

  const modalFooter = modal.querySelector(".modal-footer")
  if (modalFooter) {
    if (rating.ratedEntity === "application") {
      modalFooter.innerHTML = `
        <button class="cancel-btn">Cancel</button>
        <button class="retrieve-btn">Retrieve</button>
      `
      modalFooter.querySelector(".retrieve-btn").addEventListener("click", () => retrieveApplicationRating(rating.id))
    } else {
      modalFooter.innerHTML = `
        <button class="cancel-btn">Cancel</button>
        <button class="retrieve-selected-btn">Retrieve Selected</button>
      `
      modalFooter.querySelector(".retrieve-selected-btn").addEventListener("click", retrieveSelectedRatings)
    }
  }

  modal.style.display = "flex"

  setupModalEventListeners(modal)
}

function updatePagination(totalPages) {
  const pagination = document.getElementById("pagination")
  pagination.innerHTML = ""

  const prevButton = document.createElement("button")
  prevButton.textContent = "←"
  prevButton.disabled = currentPage === 1
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--
      displayRatings()
    }
  })
  pagination.appendChild(prevButton)

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button")
    pageButton.textContent = i
    pageButton.classList.toggle("active", i === currentPage)
    pageButton.addEventListener("click", () => i === currentPage)
    pageButton.addEventListener("click", () => {
      currentPage = i
      displayRatings()
    })
    pagination.appendChild(pageButton)
  }

  const nextButton = document.createElement("button")
  nextButton.textContent = "→"
  nextButton.disabled = currentPage === totalPages
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++
      displayRatings()
    }
  })
  pagination.appendChild(nextButton)
}

async function retrieveSelectedRatings() {
    const selectedRatings = document.querySelectorAll(".archived-rating-checkbox:checked")
    const selectedIds = Array.from(selectedRatings).map((checkbox) => checkbox.getAttribute("data-id"))
  
    if (selectedIds.length === 0) {
      alert("Please select at least one archived rating to restore.")
      return
    }
  
    if (confirm(`Are you sure you want to restore ${selectedIds.length} selected archived rating(s)?`)) {
      try {
        let successCount = 0
        for (const ratingId of selectedIds) {
          const success = await retrieveTourGuideRating(ratingId)
          if (success) successCount++
        }
        
        alert(`Successfully restored ${successCount} rating(s).`)
        document.getElementById("archiveViewModal").style.display = "none"
        await fetchRatings()
      } catch (error) {
        console.error("Error restoring selected ratings:", error)
        alert("An error occurred while restoring the selected ratings. Please check the console for details.")
      }
    }
  }
  

  async function retrieveTourGuideRating(ratingId) {
    if (!ratingId) {
      console.error("No rating ID provided")
      return
    }
  
    try {
      const archivedRatingDoc = doc(db, "archived_tourguide_ratings", ratingId)
      const docSnapshot = await getDoc(archivedRatingDoc)
  
      if (docSnapshot.exists()) {
        const ratingData = docSnapshot.data()
        
        // Remove the archivedAt field before restoring
        const { archivedAt, ...dataToRestore } = ratingData
        
        // Restore to original collection
        await addDoc(collection(db, "feedbacks"), dataToRestore)
        console.log("Tour Guide rating restored successfully")
  
        // Delete from archive
        await deleteDoc(archivedRatingDoc)
        console.log("Archived Tour Guide rating document deleted")
        
        return true
      } else {
        console.log("Archived Tour Guide rating not found")
        return false
      }
    } catch (error) {
      console.error("Error restoring Tour Guide rating:", error)
      throw error
    }
  }

  async function retrieveApplicationRating(ratingId) {
    if (!ratingId) {
      console.error("No rating ID provided")
      alert("Error: No rating ID provided")
      return
    }
  
    if (confirm("Are you sure you want to restore this application rating?")) {
      try {
        const archivedRatingDoc = doc(db, "archived_application_ratings", ratingId)
        const docSnapshot = await getDoc(archivedRatingDoc)
  
        if (docSnapshot.exists()) {
          const ratingData = docSnapshot.data()
          
          // Remove the archivedAt field before restoring
          const { archivedAt, ...dataToRestore } = ratingData
          
          // Restore to original collection
          await addDoc(collection(db, "app-feedbacks"), dataToRestore)
          console.log("Application rating restored successfully")
  
          // Delete from archive
          await deleteDoc(archivedRatingDoc)
          console.log("Archived application rating document deleted")
  
          alert("Application rating restored successfully.")
          await fetchRatings()
          
          return true
        } else {
          alert("Archived application rating not found")
          return false
        }
      } catch (error) {
        console.error("Error restoring application rating:", error)
        alert("An error occurred during restoration. Check console for details.")
        throw error
      }
    }
    return false
  }

document.addEventListener("DOMContentLoaded", () => {
  initStarRating()

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
      currentTab = tab.dataset.tab
      currentPage = 1
      displayRatings()
    })
  })

  document.getElementById("filterType").addEventListener("change", () => {
    currentPage = 1
    displayRatings()
  })

  document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1
    displayRatings()
  })

  fetchRatings()
})
