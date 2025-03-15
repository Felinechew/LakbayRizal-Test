import { db } from "../scripts/firebase.js"
import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"
import { getStorage } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"
const storage = getStorage()

// DOM Elements
const paymentTable = document.getElementById("paymentTable")
const modal = document.getElementById("modal")
const closeModal = document.getElementById("closeModal")
const proofImage = document.getElementById("proofImage")
const fullSizeModal = document.getElementById("fullSizeModal")
const fullSizeImage = document.getElementById("fullSizeImage")

// Real-time search functionality
function searchPayment() {
  const searchInput = document.getElementById("searchInput").value.toLowerCase()
  const paymentRows = document.querySelectorAll("#paymentTable tbody tr")
  const noResultsMessage = document.getElementById("noResultsMessage")
  let foundResults = false

  paymentRows.forEach((row) => {
    const paymentId = row.querySelector("td:nth-child(1)").textContent.toLowerCase()
    const travelerName = row.querySelector("td:nth-child(2)").textContent.toLowerCase()
    const tourGuide = row.querySelector("td:nth-child(3)").textContent.toLowerCase()
    const paymentDate = row.querySelector("td:nth-child(4)").textContent.toLowerCase()
    const referenceNumber = row.querySelector("td:nth-child(5)").textContent.toLowerCase()

    if (
      paymentId.includes(searchInput) ||
      travelerName.includes(searchInput) ||
      tourGuide.includes(searchInput) ||
      paymentDate.includes(searchInput) ||
      referenceNumber.includes(searchInput)
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
  document.getElementById("searchInput").addEventListener("input", searchPayment)

  // Initial fetch of payments
  fetchPayments()
})

// Fetch payments
async function fetchPayments() {
  const tbody = paymentTable.querySelector("tbody")
  tbody.innerHTML = ""

  try {
    const querySnapshot = await getDocs(collection(db, "archive_payments"))

    if (querySnapshot.empty) {
      document.getElementById("noResultsMessage").style.display = "block"
      return
    }

    querySnapshot.forEach((doc) => {
      const payment = doc.data()
      const row = tbody.insertRow()
      row.innerHTML = `
        <td>${payment.travelerName || ""}</td>
        <td>${payment.tourGuide || ""}</td>
        <td>${payment.paymentDate || ""}</td>
        <td>${payment.referenceNumber || ""}</td>
        <td>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="viewPayment('${doc.id}')"><i class="fas fa-eye"></i></button>
          <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="retrievepayments('${doc.id}')"><i class="fas fa-file-import"></i></button>
        </td>
      `
    })

    // Hide no results message initially
    // document.getElementById("noResultsMessage").style.display = "none"

    // Apply search filter if there's already a value in the search input
    if (document.getElementById("searchInput").value.trim() !== "") {
      searchPayment()
    }
  } catch (error) {
    console.error("Error fetching payments: ", error)
    tbody.innerHTML = `<tr><td colspan="6">Error fetching payments: ${error.message}</td></tr>`
  }
}

// View payment details
window.viewPayment = async (docId) => {
  try {
    const docRef = doc(db, "archive_payments", docId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const payment = docSnap.data()
      // document.querySelector("#paymentid span").textContent = docId
      document.querySelector("#travelerNameDetail span").textContent = payment.travelerName || ""
      document.querySelector("#tourGuideDetail span").textContent = payment.tourGuide || ""
      document.querySelector("#paymentDateDetail span").textContent = payment.paymentDate || ""
      document.querySelector("#referenceNumberDetail span").textContent = payment.referenceNumber || ""

      proofImage.src = payment.proofImageURL || ""
      proofImage.style.display = payment.proofImageURL ? "block" : "none"
      proofImage.onclick = () => openFullSizeImage(payment.proofImageURL)
      modal.style.display = "block"
    } else {
      console.log("No such document!")
    }
  } catch (error) {
    console.error("Error fetching payment details: ", error)
  }
}

// Open full-size image
function openFullSizeImage(imageUrl) {
  fullSizeImage.src = imageUrl
  fullSizeModal.style.display = "block"
}

// Close full-size image modal
fullSizeModal.querySelector(".close").onclick = () => {
  fullSizeModal.style.display = "none"
}

// Close full-size image modal when clicking outside the image
fullSizeModal.onclick = (event) => {
  if (event.target === fullSizeModal) {
    fullSizeModal.style.display = "none"
  }
}

window.retrievepayments = async (docId) => {
  try {
    // If docId is provided, retrieve only that specific payment
    if (docId) {
      const archiveDocRef = doc(db, "archive_payments", docId)
      const archiveDocSnap = await getDoc(archiveDocRef)

      if (!archiveDocSnap.exists()) {
        alert("Payment not found in archive.")
        return
      }

      const paymentData = archiveDocSnap.data()
      const batch = writeBatch(db)

      // Create in payments collection
      const newPaymentRef = doc(db, "payments", docId)
      batch.set(newPaymentRef, paymentData)

      // Delete from archive
      batch.delete(archiveDocRef)

      await batch.commit()
      alert("Payment has been restored successfully.")
    } else {
      // Retrieve all archived payments
      const archiveCollection = collection(db, "archive_payments")
      const archiveSnapshot = await getDocs(archiveCollection)

      if (archiveSnapshot.empty) {
        alert("No archived payments found.")
        return
      }

      const batch = writeBatch(db)

      archiveSnapshot.forEach((doc) => {
        const paymentData = doc.data()
        const newPaymentRef = doc(db, "payments", doc.id)

        batch.set(newPaymentRef, paymentData)
        batch.delete(doc.ref)
      })

      await batch.commit()

      alert("All archived payments have been restored successfully.")
    }

    // Refresh the payments list
    fetchPayments()
  } catch (error) {
    console.error("Error retrieving archived payments:", error)
    alert("An error occurred while retrieving payments. Check console for details.")
  }
}

// Close modal
closeModal.onclick = () => {
  modal.style.display = "none"
}

