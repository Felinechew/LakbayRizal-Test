import { db } from "../scripts/firebase.js";
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
  getMetadata,
  updateMetadata,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js"
const storage = getStorage()

// DOM Elements
const paymentForm = document.getElementById("paymentForm")
const paymentTable = document.getElementById("paymentTable")
const modal = document.getElementById("modal")
const closeModal = document.getElementById("closeModal")
const proofImage = document.getElementById("proofImage")
const fullSizeModal = document.getElementById("fullSizeModal")
const fullSizeImage = document.getElementById("fullSizeImage")


// Open the modal
function openModal() {
  modal.style.display = "flex";
}

// Close the modal
closeModal.onclick = () => {
  modal.style.display = "none";
};

// Close modal when clicking outside the content
window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};


// Fetch payments
async function fetchPayments() {
  const tbody = paymentTable.querySelector("tbody")
  tbody.innerHTML = ""

  try {
    const querySnapshot = await getDocs(collection(db, "payments"))
    querySnapshot.forEach((doc) => {
      const payment = doc.data()
      const row = tbody.insertRow()
      row.innerHTML = `
                <td>${payment.travelerName}</td>
                <td>${payment.tourGuide}</td>
                <td>${payment.paymentDate}</td>
                <td>${payment.referenceNumber}</td>
                <td><button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="viewPayment('${doc.id}')"><i class="fas fa-eye"></i></button>
                <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="Archive('${doc.id}')"><i class="fas fa-archive"></i></td>
                 `
    })
  } catch (error) {
    console.error("Error fetching payments: ", error)
  }
}

// View payment details
window.viewPayment = async (docId) => {
    try {
      const docRef = doc(db, "payments", docId);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const payment = docSnap.data();
  
        document.querySelector("#travelerNameDetail span").textContent = payment.travelerName || "N/A";
        document.querySelector("#tourGuideDetail span").textContent = payment.tourGuide || "N/A";
        document.querySelector("#paymentDateDetail span").textContent = payment.paymentDate || "N/A";
        document.querySelector("#referenceNumberDetail span").textContent = payment.referenceNumber || "N/A";
  
        proofImage.src = payment.proofImageURL || "";
        proofImage.style.display = payment.proofImageURL ? "block" : "none";
        proofImage.onclick = () => openFullSizeImage(payment.proofImageURL);
  
        // Display modal with flex
        modal.style.display = "flex";
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error fetching payment details: ", error);
    }
  };
  

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

// Archive attachment
window.Archive = async (docId) => {
    if (!docId) {
      console.error("No document ID provided")
      alert("Error: No payment ID provided")
      return
    }
  
    if (confirm("Are you sure you want to archive this payment?")) {
      const paymentDoc = doc(db, "payments", docId)
  
      try {
        const docSnapshot = await getDoc(paymentDoc)
  
        if (docSnapshot.exists()) {
          const paymentData = docSnapshot.data()
          const referenceNumber = paymentData.referenceNumber
  
          if (!referenceNumber) {
            console.error("No reference number found for this payment")
            alert("Error: No reference number found for this payment")
            return
          }
  
          // 1. Archive payment data
          const archivedDocRef = await addDoc(collection(db, "archive_payments"), {
            ...paymentData,
            originalId: docId, // Store the original ID in the archive
          })
          console.log("Payment data archived successfully")
  
          // 2. Move Proof of Payment Picture
          const oldProofPicRef = ref(storage, `payment_pic/${referenceNumber}`)
          const newProofPicRef = ref(storage, `archive_paymentpic/${referenceNumber}`)
  
          try {
            console.log("Attempting to copy proof of payment picture...")
            await uploadBytes(newProofPicRef, await getDownloadURL(oldProofPicRef)) // Corrected this line
            const proofMetadata = await getMetadata(oldProofPicRef)
            await updateMetadata(newProofPicRef, proofMetadata) 
            console.log("Proof of payment picture copied successfully")
            await deleteObject(oldProofPicRef)
            console.log("Original proof of payment picture deleted")
  
            // Update the archived document with the new URL
            const newProofPicUrl = await getDownloadURL(newProofPicRef)
            await updateDoc(archivedDocRef, {
              proofImageURL: newProofPicUrl,
            })
            console.log("Archived document updated with new picture URL")
          } catch (picError) {
            console.error("Error moving picture:", picError)
            alert("Error moving proof of payment picture. Payment partially archived.")
          }
  
          // 3. Delete the payment from Firestore
          await deleteDoc(paymentDoc)
          console.log("Original payment document deleted")
  
          alert("Payment archived successfully.")
          modal.style.display = "none"
          fetchPayments()
        } else {
          alert("Payment not found")
        }
      } catch (error) {
        console.error("Error archiving payment:", error)
        alert("An error occurred during archiving. Check console for details.")
      }
    }
  }

// Close modal
closeModal.onclick = () => {
  modal.style.display = "none"
}

// Initial fetch
fetchPayments()