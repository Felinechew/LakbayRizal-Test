import { auth, db } from "../scripts/firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot  
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
  
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js";



const viewModal = document.getElementById("viewModal");
const closeViewModal = document.getElementById("closeViewModal");

let currentPage = 1;
const rowsPerPage = 10; //rito mo paltan kung ilan per row
let totalPages = 1;
let allDestinations = []; // Store all destinations

// Modify your existing Firebase data fetching
function fetchDestinations() {
  const destinationsRef = collection(db, "archive_destinations");
  
  onSnapshot(destinationsRef, (snapshot) => {
    allDestinations = [];
    snapshot.forEach((doc) => {
      allDestinations.push({ id: doc.id, ...doc.data() });
    });
    displayDestinations(allDestinations);
  });
}

function displayDestinations(destinations) {
  const destinationList = document.getElementById('destinationList');
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  // Sort destinations by dateAdded in descending order (latest first)
  const sortedDestinations = destinations.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

  const paginatedDestinations = sortedDestinations.slice(startIndex, endIndex);

  destinationList.innerHTML = '';

  if (paginatedDestinations.length === 0) {
    document.getElementById('noResultsMessage').style.display = 'block';
    updatePagination(0);
    return;
  }

  document.getElementById('noResultsMessage').style.display = 'none';

  paginatedDestinations.forEach((destination) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${destination.name}</td>
      <td>${destination.municipality}</td>
      <td>${destination.address}</td>
      <td>${destination.type.join(', ')}</td>
      <td>${destination.averagePrice}</td>
      <td>${destination.latitude}</td>
      <td>${destination.longitude}</td>
      <td>${destination.description.length > 20 ? encodeForHTML(destination.description.substring(0, 20)) + "..." : encodeForHTML(destination.description)}</td>
      <td>${new Date(destination.dateAdded).toLocaleDateString()}</td>
      <td>
        <button onclick="viewDestination('${destination.id}')">View</button>
          <button onclick="retrieveDestination('${destination.id}')">Retrieve</button>
      </td>
    `;

    destinationList.appendChild(row);
  });

  updatePagination(destinations.length);
}


function updatePagination(totalItems) {
  totalPages = Math.ceil(totalItems / rowsPerPage);
  
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages;
  
  const prevButton = document.getElementById('prevPage');
  const nextButton = document.getElementById('nextPage');
  
  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}

// Search function
function searchDestination() {
  currentPage = 1; // Reset to first page when searching
  const searchInput = document.getElementById('searchInput').value.toLowerCase();
  
  const filteredDestinations = allDestinations.filter(destination => 
    destination.name.toLowerCase().includes(searchInput) ||
    destination.municipality.toLowerCase().includes(searchInput) ||
    destination.address.toLowerCase().includes(searchInput)
  );
  
  displayDestinations(filteredDestinations);
}

// Event listeners for pagination
document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    displayDestinations(allDestinations);
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    displayDestinations(allDestinations);
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchDestinations();
  
  //Add search input event listener
  document.getElementById('searchInput').addEventListener('input', searchDestination);
});




// Modal close event listeners
closeViewModal.addEventListener("click", () => (viewModal.style.display = "none"));




function showMessage(message, divId) {
  var messageDiv = document.getElementById(divId);
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = 1;
  setTimeout(() => {
    messageDiv.style.opacity = 0;
    if (divId === "AddDestination") {
      // Hide add modal after successful addition
      setTimeout(() => {
        addModal.style.display = "none";
      }, 1000);
    }
  }, 5000);
}


// Function to safely encode text for HTML attributes
function encodeForHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}





const storage = getStorage();

// Update the loadTypes function to clear previous checkboxes
async function loadTypes() {
  const typeContainer = document.getElementById("typeContainer");
  typeContainer.innerHTML = ""; // Clear existing checkboxes

  try {
    const querySnapshot = await getDocs(collection(db, "typeofactivity"));

    if (querySnapshot.empty) {
      typeContainer.innerHTML = "<p>No types available</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `type-${doc.id}`;
      checkbox.value = data.name;
      checkbox.name = "types";

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = data.name;

      typeContainer.appendChild(checkbox);
      typeContainer.appendChild(label);
      typeContainer.appendChild(document.createElement("br"));
    });
  } catch (error) {
    console.error("Error loading types:", error);
    typeContainer.innerHTML = "<p>Error loading types</p>";
  }
}


   // View function
window.viewDestination = async (destinationId) => {
  try {
    const destinationDoc = await getDoc(doc(db, "archive_destinations", destinationId));
    if (!destinationDoc.exists()) {
      console.error("Destination not found");
      return;
    }
    
    const destination = destinationDoc.data();
    
    // Populate the view modal
    document.getElementById("viewName").textContent = destination.name || "N/A";
    document.getElementById("viewMunicipality").textContent = destination.municipality || "N/A";
    document.getElementById("viewAddress").textContent = destination.address || "N/A";
    document.getElementById("viewType").textContent = Array.isArray(destination.type) 
      ? destination.type.join(", ") 
      : destination.type || "N/A";
    document.getElementById("viewAvgPrice").textContent = destination.averagePrice || "N/A";
    document.getElementById("viewLatitude").textContent = destination.latitude || "N/A";
    document.getElementById("viewLongitude").textContent = destination.longitude || "N/A";
    document.getElementById("viewDescription").textContent = destination.description || "No description available";
    
    // Handle image
    const viewImage = document.getElementById("viewImage");
    viewImage.src = destination.imageUrl || "default-image-url.jpg";
    viewImage.onerror = () => {
      viewImage.src = "default-image-url.jpg";
    };

    // Show the modal
    document.getElementById("viewModal").style.display = "block";
  } catch (error) {
    console.error("Error viewing destination:", error);
    alert("Error viewing destination details");
  }
};




// Close modal functionality
document.getElementById("closeViewModal").addEventListener("click", () => {
  document.getElementById("viewModal").style.display = "none";
});





// Close modal if clicked outside the modal content
window.addEventListener("click", (event) => {
  if (event.target === document.getElementById("viewModal")) {
    document.getElementById("viewModal").style.display = "none";
  }
});

//archive
window.retrieveDestination = async (docId) => {
  if (!docId) {
    console.error("No destination ID provided");
    alert("Error: No destination ID provided");
    return;
  }

  if (confirm("Are you sure you want to restore this destination?")) {
    try {
      // Create a batch operation
      const batch = writeBatch(db);
      
      // Get the archived destination document
      const archivedDestinationDoc = doc(db, "archive_destinations", docId);
      const docSnapshot = await getDoc(archivedDestinationDoc);
      
      if (docSnapshot.exists()) {
        const destinationData = docSnapshot.data();
        
        // Set up batch operations
        const destinationRef = doc(db, "destinations", docId);
        
        // Add operations to the batch
        batch.set(destinationRef, destinationData);
        batch.delete(archivedDestinationDoc);
        
        // Commit the batch
        await batch.commit();
        
        alert("Destination restored successfully!");
        // Reload the destinations
        loadDestinations();
      } else {
        alert("Archived destination not found!");
      }
    } catch (error) {
      console.error("Error restoring destination:", error);
      alert("Error restoring destination.");
    }
  }
};