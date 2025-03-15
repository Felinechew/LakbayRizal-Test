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





const destinationForm = document.getElementById("destinationForm");
const viewModal = document.getElementById("viewModal");
const closeViewModal = document.getElementById("closeViewModal");
const editModal = document.getElementById("editModal");
const closeEditModal = document.getElementById("closeEditModal");
const addModal = document.getElementById("addModal");
const closeAddModal = document.getElementById("closeAddModal");
//const editDestinationForm = document.getElementById("editDestinationForm");
const destinationList = document.getElementById("destinationList");



let currentPage = 1;
const rowsPerPage = 10; //rito mo paltan kung ilan per row
let totalPages = 1;
let allDestinations = []; // Store all destinations

// Modify your existing Firebase data fetching
function fetchDestinations() {
  const destinationsRef = collection(db, "destinations");
  
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
        <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="viewDestination('${destination.id}')" class="action-button view">
          <i class="fas fa-eye"></i>
        </button>
        <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="editDestination('${destination.id}')" class="action-button edit">
          <i class="fas fa-edit"></i>
        </button>
        <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="deleteDestination('${destination.id}')" class="action-button delete">
          <i class="fas fa-trash"></i>
        </button>
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
closeEditModal.addEventListener("click", () => (editModal.style.display = "none"));
closeAddModal.addEventListener("click", () => {
  addModal.style.display = "none";
  destinationForm.reset(); // Reset form when closing
});








// Add button click handler
window.openAddModal = () => {
  addModal.style.display = "block";
};





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





// Remove the old event listener
document.getElementById("addModal").removeEventListener("click", loadTypes);

// Add event listener to the Add button instead
document.getElementById("addDestinationBtn").addEventListener("click", async () => {
  // First show the modal
  document.getElementById("addModal").style.display = "block";
  
  // Then load the types
  await loadTypes();
});

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

      // Create wrapper div for proper alignment
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("item"); // Apply CSS flex styling

      // Create checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `type-${doc.id}`;
      checkbox.value = data.name;
      checkbox.name = "types";

      // Create label
      const label = document.createElement("label");
      label.setAttribute("for", checkbox.id);
      label.textContent = data.name;

      // Append checkbox and label inside the wrapper div
      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);

      // Append the wrapper div to the container
      typeContainer.appendChild(itemDiv);
    });
  } catch (error) {
    console.error("Error loading types:", error);
    typeContainer.innerHTML = "<p>Error loading types</p>";
  }
}



// Form Submission Handler
document.getElementById("destinationForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const name = document.getElementById("name").value;
    const municipality = document.getElementById("municipality").value;
    const address = document.getElementById("address").value;
    const avgPrice = Number.parseInt(document.getElementById("avgPrice").value, 10) || 0;
    const latitude = document.getElementById("latitude").value;
    const longitude = document.getElementById("longitude").value;
    const description = document.getElementById("description").value;
    const imageFile = document.getElementById("image").files[0];

    const destinationId = `DESTINATION_${Date.now()}`;
    const dateAdded = new Date().toISOString();

    let imageUrl = "";
    if (imageFile) {
      const storageRef = ref(storage, `destination_images/${name}_image`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    // Collect multiple selected types 
    const selectedTypes = Array.from(
      document.querySelectorAll('input[name="types"]:checked')
    ).map(checkbox => checkbox.value);

    const destinationData = {
      name,
      municipality,
      address,
      type: selectedTypes.length > 0 ? selectedTypes : ["other"], // Ensuring type is always an array
      averagePrice: avgPrice,
      latitude,
      longitude,
      description,
      imageUrl,
      dateAdded,
    };

    // Add to Firestore
    await addDoc(collection(db, "destinations"), destinationData);

    alert("Destination added successfully!");

    // Reset form and reload destinations
    document.getElementById("destinationForm").reset();
    loadDestinations();

    // Close the add modal
    try {
      document.getElementById("addModal").style.display = "none"; // Ensure modal closes
    } catch (error) {
      console.warn("Modal could not be closed:", error.message);
    }
    
  } catch (error) {
    console.error("Error adding destination:", error);
    alert("Error adding destination: " + error.message);
  }
})

   // View function
window.viewDestination = async (destinationId) => {
  try {
    const destinationDoc = await getDoc(doc(db, "destinations", destinationId));
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





// Function to load types into the edit modal
async function loadEditTypes(selectedTypes = []) {
  const typeContainer = document.getElementById("editTypeContainer");
  
  try {
    const querySnapshot = await getDocs(collection(db, "typeofactivity"));

    if (querySnapshot.empty) {
      typeContainer.innerHTML = "<p>No types available</p>";
      return;
    }

    typeContainer.innerHTML = ""; // Clear previous content

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Create a wrapper div to ensure proper alignment
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("item"); // Use CSS class for styling

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `edit-type-${doc.id}`;
      checkbox.value = data.name;
      checkbox.name = "editTypes";
      
      // Check if this type was previously selected
      if (selectedTypes.includes(data.name)) {
        checkbox.checked = true;
      }

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = data.name;

      // Append checkbox and label to the wrapper div
      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);

      // Append the wrapper div to the container
      typeContainer.appendChild(itemDiv);
    });
  } catch (error) {
    console.error("Error loading types for edit:", error);
    typeContainer.innerHTML = "<p>Error loading types</p>";
  }
}






window.editDestination = async (docId) => {
  try {
    // Fetch the latest data directly from Firestore
    const destinationDoc = await getDoc(doc(db, "destinations", docId));
    if (!destinationDoc.exists()) {
      console.error("Destination not found");
      return;
    }

    const destination = destinationDoc.data();

    // Populate form fields
    document.getElementById("editName").value = destination.name;
    document.getElementById("editMunicipality").value = destination.municipality;
    document.getElementById("editAddress").value = destination.address;
    document.getElementById("editAvgPrice").value = destination.averagePrice;
    document.getElementById("editLatitude").value = destination.latitude;
    document.getElementById("editLongitude").value = destination.longitude;
    document.getElementById("editDescription").value = destination.description;

    // Handle image
    const currentImage = document.getElementById("currentImage");
    currentImage.src = destination.imageUrl || "default-image-url.jpg";

    // Convert type to array if it isn't already
    const typeArray = Array.isArray(destination.type) ? destination.type : [destination.type];

    // Load types and set checkboxes
    await loadEditTypes(typeArray);

    // Show edit modal
    const editModal = document.getElementById("editModal");
    editModal.style.display = "block";

    // Form submission handler
    const handleEditSubmit = async (e) => {
      e.preventDefault();

      try {
        // Get selected types from checkboxes
        const selectedTypes = Array.from(
          document.querySelectorAll('input[name="editTypes"]:checked')
        ).map(checkbox => checkbox.value);

        const updatedData = {
          name: document.getElementById("editName").value,
          municipality: document.getElementById("editMunicipality").value,
          address: document.getElementById("editAddress").value,
          type: selectedTypes.length > 0 ? selectedTypes : ["other"],
          averagePrice: Number.parseInt(document.getElementById("editAvgPrice").value, 10),
          latitude: document.getElementById("editLatitude").value,
          longitude: document.getElementById("editLongitude").value,
          description: document.getElementById("editDescription").value,
        };

        // Image upload logic
        const updatedImageFile = document.getElementById("editImage").files[0];
        if (updatedImageFile) {
          // Delete the previous image if it exists
          if (destination.imageUrl) {
            const previousImageRef = ref(storage, destination.imageUrl);
            await deleteObject(previousImageRef);
          }

          // Upload the new image
          const storageRef = ref(storage, `destination_images/${docId}_image`);
          await uploadBytes(storageRef, updatedImageFile);
          const updatedImageUrl = await getDownloadURL(storageRef);
          updatedData.imageUrl = updatedImageUrl;
        } else {
          // Keep the existing image URL if no new image is uploaded
          updatedData.imageUrl = destination.imageUrl;
        }

        // Update Firestore document
        await updateDoc(doc(db, "destinations", docId), updatedData);

        // Show success message
        alert("Destination updated successfully!");

        // Reset the form, close modal, and refresh the table
        const editDestinationForm = document.getElementById("editDestinationForm");
        editDestinationForm.reset();
        editModal.style.display = "none";
        await loadDestinations();

      } catch (error) {
        console.error("Error updating destination: ", error);
      }
    };

    // Remove previous listeners to prevent duplicates and add new submit listener
    const editDestinationForm = document.getElementById("editDestinationForm");
    editDestinationForm.removeEventListener("submit", handleEditSubmit);
    editDestinationForm.addEventListener("submit", handleEditSubmit);
    
  } catch (error) {
    console.error("Error loading destination for edit:", error);
  }
};



//archive
window.archiveDestination = async (docId) => {
    try {
      // Fetch the destination data from the original "destinations" collection
      const destinationDocRef = doc(db, "destinations", docId);
      const destinationDoc = await getDoc(destinationDocRef);
  
      if (destinationDoc.exists()) {
        // Get the data of the destination to move
        const destinationData = destinationDoc.data();
  
        // Add the destination to the "destination_archives" collection
        await addDoc(collection(db, "destination_archives"), destinationData);
  
        // Delete the destination from the original "destinations" collection
        await deleteDoc(destinationDocRef);
  
        // Reload the destinations
        loadDestinations();
      } else {
        console.error("No such document!");
      }
    } catch (error) {
      console.error("Error archiving destination:", error.message);
    }
  };  
  

document.addEventListener("DOMContentLoaded", loadDestinations);