
import { auth, db } from "../scripts/firebase.js";
import { collection, onSnapshot, addDoc, deleteDoc, doc,} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";



// References for Type of Activity
const activityList = document.getElementById("activityList");
const addActivityButton = document.getElementById("addActivity");
const removeActivityButton = document.getElementById("removeActivity");
const searchActivityInput = document.getElementById("searchActivity");
const activitiesCollection = collection(db, "typeofactivity");
const addActivityModal = document.getElementById("addActivityModal");
const closeActivityModalButton = document.getElementById("closeActivityModal");
const saveActivityButton = document.getElementById("saveActivity");
const newActivityNameInput = document.getElementById("newActivityName");

// References for Type of Trip
const tripList = document.getElementById("tripList");
const addTripButton = document.getElementById("addTrip");
const removeTripButton = document.getElementById("removeTrip");
const searchTripInput = document.getElementById("searchTrip");
const tripsCollection = collection(db, "typeoftrip");
const addTripModal = document.getElementById("addTripModal");
const closeTripModalButton = document.getElementById("closeTripModal");
const saveTripButton = document.getElementById("saveTrip");
const newTripNameInput = document.getElementById("newTripName");



// Fetch and display activities
function loadActivities() {
  onSnapshot(activitiesCollection, (snapshot) => {
    activityList.innerHTML = ""; // Clear the list

    // Create a single container for all checkboxes
    const checkboxContainer = document.createElement("div");
    checkboxContainer.classList.add("checkbox-container");

    snapshot.forEach((doc) => {
      const activity = doc.data();

      // Create each checkbox item
      const activityItem = document.createElement("div");
      activityItem.classList.add("activity-item");
      activityItem.innerHTML = `
        <input type="checkbox" id="${doc.id}" value="${activity.name}">
        <label for="${doc.id}">${activity.name}</label>
      `;

      // Append each checkbox to the container
      checkboxContainer.appendChild(activityItem);
    });

    // Append the full checkbox container to the activity list
    activityList.appendChild(checkboxContainer);
  });
}


// Fetch and display trips
function loadTrips() {
  onSnapshot(tripsCollection, (snapshot) => {
    tripList.innerHTML = ""; // Clear the list

    // Create a single container for all trip checkboxes
    const checkboxContainer = document.createElement("div");
    checkboxContainer.classList.add("checkbox-container");

    snapshot.forEach((doc) => {
      const trip = doc.data();

      // Create each trip item
      const tripItem = document.createElement("div");
      tripItem.classList.add("trip-item");
      tripItem.innerHTML = `
        <input type="checkbox" id="${doc.id}" value="${trip.name}">
        <label for="${doc.id}">${trip.name}</label>
      `;

      // Append each trip item to the checkbox container
      checkboxContainer.appendChild(tripItem);
    });

    // Append the full checkbox container to the trip list
    tripList.appendChild(checkboxContainer);
  });
}


// Add a new activity
async function addActivity(name) {
  try {
    await addDoc(activitiesCollection, { name });
    console.log("Activity added:", name);
  } catch (error) {
    console.error("Error adding activity:", error);
  }
}

// Add a new trip
async function addTrip(name) {
  try {
    await addDoc(tripsCollection, { name });
    console.log("Trip added:", name);
  } catch (error) {
    console.error("Error adding trip:", error);
  }
}

// Remove an activity
async function removeActivity(id) {
  try {
    await deleteDoc(doc(db, "typeofactivity", id));
    console.log("Activity removed:", id);
  } catch (error) {
    console.error("Error removing activity:", error);
  }
}

// Remove a trip
async function removeTrip(id) {
  try {
    await deleteDoc(doc(db, "typeoftrip", id));
    console.log("Trip removed:", id);
  } catch (error) {
    console.error("Error removing trip:", error);
  }
}

// Render activities and trips from Firestore
loadActivities();
loadTrips();

// Add activity button functionality (open modal)
addActivityButton.addEventListener("click", () => {
  addActivityModal.style.display = "block"; // Show modal
});

// Add trip button functionality (open modal)
addTripButton.addEventListener("click", () => {
  addTripModal.style.display = "block"; // Show modal
});

// Close activity modal
closeActivityModalButton.addEventListener("click", () => {
  addActivityModal.style.display = "none"; // Hide modal
});

// Close trip modal
closeTripModalButton.addEventListener("click", () => {
  addTripModal.style.display = "none"; // Hide modal
});

// Save new activity
saveActivityButton.addEventListener("click", async () => {
  const newActivity = newActivityNameInput.value.trim();
  if (newActivity) {
    await addActivity(newActivity);
    newActivityNameInput.value = ""; // Clear input field
    addActivityModal.style.display = "none"; // Close modal
  } else {
    alert("Please enter an activity name");
  }
});

// Save new trip
saveTripButton.addEventListener("click", async () => {
  const newTrip = newTripNameInput.value.trim();
  if (newTrip) {
    await addTrip(newTrip);
    newTripNameInput.value = ""; // Clear input field
    addTripModal.style.display = "none"; // Close modal
  } else {
    alert("Please enter a trip name");
  }
});

// Remove selected activities
removeActivityButton.addEventListener("click", async () => {
  const checkboxes = activityList.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(async (checkbox) => {
    if (checkbox.checked) {
      await removeActivity(checkbox.id);
    }
  });
});

// Remove selected trips
removeTripButton.addEventListener("click", async () => {
  const checkboxes = tripList.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(async (checkbox) => {
    if (checkbox.checked) {
      await removeTrip(checkbox.id);
    }
  });
});

// Search activities
searchActivityInput.addEventListener("input", () => {
  const searchTerm = searchActivityInput.value.toLowerCase();
  const activityItems = activityList.querySelectorAll(".activity-item");
  activityItems.forEach((item) => {
    const label = item.querySelector("label").textContent.toLowerCase();
    item.style.display = label.includes(searchTerm) ? "flex" : "none";
  });
});

// Search trips
searchTripInput.addEventListener("input", () => {
  const searchTerm = searchTripInput.value.toLowerCase();
  const tripItems = tripList.querySelectorAll(".trip-item");
  tripItems.forEach((item) => {
    const label = item.querySelector("label").textContent.toLowerCase();
    item.style.display = label.includes(searchTerm) ? "flex" : "none";
  });
});
