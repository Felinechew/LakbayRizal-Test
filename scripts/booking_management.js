import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, addDoc, collection, onSnapshot, getDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAvGncmdMSKa76z9oAZGSwLSU2TsL8vnDA",
    authDomain: "javaa-effc6.firebaseapp.com",
    projectId: "javaa-effc6",
    storageBucket: "javaa-effc6.firebasestorage.app",
    messagingSenderId: "57179868019",
    appId: "1:57179868019:web:4256551695a37cacf31306",
    measurementId: "G-GG3TZY7CLS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const bookingTable = document.getElementById("bookingTable").querySelector("tbody");

function formatDate(timestamp) {
    if (!timestamp) return "N/A";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}

function fetchBookings() {
    onSnapshot(collection(db, "booking_management"), (snapshot) => {
        bookingTable.innerHTML = "";
        snapshot.docs.forEach((doc) => {
            const booking = doc.data();
            const row = document.createElement("tr");

            const dateOfBooking = booking.dateofbooking ? formatDate(booking.dateofbooking) : "N/A";
            const dateOfTrip = booking.dateoftrip ? formatDate(booking.dateoftrip) : "N/A";

            row.innerHTML = `
                <td>${booking.name || "N/A"}</td>
                <td>${booking.tourGuide || "N/A"}</td>
                <td>${booking.destination || "N/A"}</td>
                <td>${dateOfBooking}</td>
                <td>${dateOfTrip}</td>
                <td>${booking.status || "N/A"}</td>
                <td>
                    <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="viewBooking('${doc.id}')"><i class="fas fa-eye"></i></button>
                    <button style="background: none; border: none; padding: 4px; cursor: pointer;" onclick="archiveBooking('${doc.id}')"><i class="fas fa-archive"></i></button>
                </td>
            `;
            bookingTable.appendChild(row);
        });
    });
}

fetchBookings();

window.viewBooking = async (id) => {
    try {
        const bookingDoc = doc(db, "booking_management", id);
        const docSnapshot = await getDoc(bookingDoc);

        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const dateOfBooking = data.dateofbooking ? formatDate(data.dateofbooking) : "N/A";
            const dateOfTrip = data.dateoftrip ? formatDate(data.dateoftrip) : "N/A";

            document.getElementById("viewName").textContent = data.name || "N/A";
            document.getElementById("viewTourGuide").textContent = data.tourGuide || "N/A";
            document.getElementById("viewDestination").textContent = data.destination || "N/A";
            document.getElementById("viewDateBooking").textContent = dateOfBooking;
            document.getElementById("viewDateTrip").textContent = dateOfTrip;
            document.getElementById("viewStatus").textContent = data.status || "N/A";

            document.getElementById("viewModal").style.display = "block";
        } else {
            alert("Booking not found!");
        }
    } catch (error) {
        console.error("Error fetching booking: ", error);
        alert("Error fetching booking details.");
    }
};

document.getElementById("viewClose").addEventListener("click", () => {
    document.getElementById("viewModal").style.display = "none";
});

window.archiveBooking = async (id) => {
    if (confirm("Are you sure you want to archive this booking?")) {
        const bookingDoc = doc(db, "booking_management", id);

        try {
            const docSnapshot = await getDoc(bookingDoc);
            if (docSnapshot.exists()) {
                const bookingData = docSnapshot.data();
                await addDoc(collection(db, "archived_bookings"), bookingData);
                await deleteDoc(bookingDoc);

                alert("Booking archived successfully!");
            } else {
                alert("Booking not found!");
            }
        } catch (error) {
            console.error("Error archiving booking: ", error);
            alert("Error archiving booking.");
        }
    }
};