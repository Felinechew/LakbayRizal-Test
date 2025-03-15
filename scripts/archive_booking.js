import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"
import {
  getFirestore,
  collection,
  onSnapshot,
  getDoc,
  doc,
  writeBatch,
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

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const bookingTable = document.getElementById("bookingTable").querySelector("tbody")

// Real-time search functionality
function searchBooking() {
  const searchInput = document.getElementById("searchInput").value.toLowerCase()
  const bookingRows = document.querySelectorAll("#bookingTable tbody tr")
  const noResultsMessage = document.getElementById("noResultsMessage")
  let foundResults = false

  bookingRows.forEach((row) => {
    const name = row.querySelector("td:nth-child(1)").textContent.toLowerCase()
    const tourGuide = row.querySelector("td:nth-child(2)").textContent.toLowerCase()
    const destination = row.querySelector("td:nth-child(3)").textContent.toLowerCase()
    const dateBooking = row.querySelector("td:nth-child(4)").textContent.toLowerCase()
    const dateTrip = row.querySelector("td:nth-child(5)").textContent.toLowerCase()
    const status = row.querySelector("td:nth-child(6)").textContent.toLowerCase()

    if (
      name.includes(searchInput) ||
      tourGuide.includes(searchInput) ||
      destination.includes(searchInput) ||
      dateBooking.includes(searchInput) ||
      dateTrip.includes(searchInput) ||
      status.includes(searchInput)
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

// Add event listener for real-time search
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("input", searchBooking)
  }
})

function formatDate(timestamp) {
  if (!timestamp) return "N/A"

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function fetchBookings() {
  onSnapshot(collection(db, "archived_bookings"), (snapshot) => {
    bookingTable.innerHTML = ""

    if (snapshot.empty) {
      document.getElementById("noResultsMessage").style.display = "block"
      return
    }

    snapshot.docs.forEach((doc) => {
      const booking = doc.data()
      const row = document.createElement("tr")

      const dateOfBooking = booking.dateofbooking ? formatDate(booking.dateofbooking) : "N/A"
      const dateOfTrip = booking.dateoftrip ? formatDate(booking.dateoftrip) : "N/A"

      row.innerHTML = `
                <td>${booking.name || "N/A"}</td>
                <td>${booking.tourGuide || "N/A"}</td>
                <td>${booking.destination || "N/A"}</td>
                <td>${dateOfBooking}</td>
                <td>${dateOfTrip}</td>
                <td>${booking.status || "N/A"}</td>
                <td>
                    <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="viewBooking('${doc.id}')"><i class="fas fa-eye"></i></button>
                    <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="retrieveBooking('${doc.id}')"><i class="fas fa-file-import"></i></button>
                </td>
            `
      bookingTable.appendChild(row)
    })

    // Hide no results message initially
    document.getElementById("noResultsMessage").style.display = "none"

    // Apply search filter if there's already a value in the search input
    if (document.getElementById("searchInput").value.trim() !== "") {
      searchBooking()
    }
  })
}

fetchBookings()

window.viewBooking = async (id) => {
  try {
    const bookingDoc = doc(db, "archived_bookings", id)
    const docSnapshot = await getDoc(bookingDoc)

    if (docSnapshot.exists()) {
      const data = docSnapshot.data()
      const dateOfBooking = data.dateofbooking ? formatDate(data.dateofbooking) : "N/A"
      const dateOfTrip = data.dateoftrip ? formatDate(data.dateoftrip) : "N/A"

      document.getElementById("viewName").textContent = data.name || "N/A"
      document.getElementById("viewTourGuide").textContent = data.tourGuide || "N/A"
      document.getElementById("viewDestination").textContent = data.destination || "N/A"
      document.getElementById("viewDateBooking").textContent = dateOfBooking
      document.getElementById("viewDateTrip").textContent = dateOfTrip
      document.getElementById("viewStatus").textContent = data.status || "N/A"

      document.getElementById("viewModal").style.display = "block"
    } else {
      alert("Booking not found!")
    }
  } catch (error) {
    console.error("Error fetching booking: ", error)
    alert("Error fetching booking details.")
  }
}

document.getElementById("viewClose").addEventListener("click", () => {
  document.getElementById("viewModal").style.display = "none"
})

window.retrieveBooking = async (id) => {
  if (!id) {
    console.error("No booking ID provided")
    alert("Error: No booking ID provided")
    return
  }

  if (confirm("Are you sure you want to restore this booking?")) {
    try {
      // Create a batch operation
      const batch = writeBatch(db)

      // Get the archived booking document
      const archivedBookingDoc = doc(db, "archived_bookings", id)
      const docSnapshot = await getDoc(archivedBookingDoc)

      if (docSnapshot.exists()) {
        const bookingData = docSnapshot.data()

        // Set up batch operations
        const bookingRef = doc(db, "booking_management", id)

        // Add operations to the batch
        batch.set(bookingRef, bookingData)
        batch.delete(archivedBookingDoc)

        // Commit the batch
        await batch.commit()

        alert("Booking restored successfully!")
        // The bookings list will refresh automatically due to the onSnapshot listener
      } else {
        alert("Archived booking not found!")
      }
    } catch (error) {
      console.error("Error restoring booking: ", error)
      alert("Error restoring booking.")
    }
  }
}
