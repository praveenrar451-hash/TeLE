// ==================== INITIAL DATA & STORAGE SETUP ====================
// User ki fixed ID rakhi gayi hai taaki username badalne par bhi posts/reels na badlein
let currentUser = JSON.parse(localStorage.getItem('app_user')) || {
    id: "user_12345", // Fixed Unique ID
    username: "DefaultUser",
    profilePic: "",
    posts: ["My First Post", "Cool Sunset Reel"], // Yeh data username change hone par bhi same rahega
    reels: ["Reel #1"]
};

// Page load hone par check karein ki user pehle se logged-in hai ya nahi
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        loadDashboard();
    }
});


// ==================== 1. LOGIN LOGIC ====================
function handleLogin() {
    const usernameInput = document.getElementById('loginUser').value.trim();
    const passwordInput = document.getElementById('loginPass').value.trim();

    // Fixed password check (Strictly '272009' bina kisi hint ke)
    if (passwordInput === "272009") {
        if (usernameInput !== "") {
            currentUser.username = usernameInput;
        }
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('app_user', JSON.stringify(currentUser));
        loadDashboard();
    } else {
        alert("Incorrect Password! Access Denied.");
    }
}

function loadDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.remove('hidden');
    
    // UI par user ka naam update karein
    document.getElementById('displayUsername').innerText = currentUser.username;
    document.getElementById('newUsernameInput').value = currentUser.username;
    document.getElementById('currentPic').src = currentUser.profilePic || "https://via.placeholder.com/100";
    
    // Live chat messages ko load karein aur listener start karein
    startLiveChatListener();
}

function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    location.reload(); // Page refresh karke login screen par bhej dega
}

// Navigation helper sections ke liye
function showSection(sectionId) {
    document.getElementById('editProfileSection').classList.add('hidden');
    document.getElementById('chatSection').classList.add('hidden');
    document.getElementById(sectionId).classList.remove('hidden');
}


// ==================== 2. EDIT PROFILE LOGIC ====================
function saveProfile() {
    const newName = document.getElementById('newUsernameInput').value.trim();
    const newPic = document.getElementById('newPicInput').value.trim();

    if (newName === "") {
        alert("Username cannot be empty!");
        return;
    }

    // IMPORTANT: Hum yahan user ki ID (`user_12345`) ko nahi badal rahe hain.
    // Sirf fields update ho rahi hain, isliye purani posts aur reels isi account me safe rahengi.
    currentUser.username = newName;
    if (newPic !== "") {
        currentUser.profilePic = newPic;
        document.getElementById('currentPic').src = newPic;
    }

    // Local storage me updated data save karein
    localStorage.setItem('app_user', JSON.stringify(currentUser));
    document.getElementById('displayUsername').innerText = currentUser.username;
    
    alert("Profile updated successfully! Username badal gaya hai par aapki saari posts aur reels safe hain.");
}


// ==================== 3. LIVE CHAT LOGIC (Fixing back/refresh issue) ====================
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;

    // Apna message chat box me turant append karein (Outgoing)
    appendMessage(text, 'outgoing', currentUser.username);
    
    // Chat history me save karein
    saveToChatHistory({ sender: currentUser.username, text: text, type: 'outgoing' });

    input.value = '';

    // Test karne ke liye auto-simulation (Real app me yahan WebSocket ya Socket.io ka code aayega)
    setTimeout(() => {
        simulateIncomingMessage("Yeh message bina back kiye live screen par update ho gaya hai!");
    }, 3000);
}

function appendMessage(text, type, sender) {
    const chatBox = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom taaki naya msg dikhe
}

function saveToChatHistory(messageObj) {
    let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];
    chatHistory.push(messageObj);
    localStorage.setItem('chat_history', JSON.stringify(chatHistory));
}

function simulateIncomingMessage(text) {
    appendMessage(text, 'incoming', 'Friend');
    saveToChatHistory({ sender: 'Friend', text: text, type: 'incoming' });
}

// Live Chat Listener Function (Bina back kiye chat updates ke liye)
function startLiveChatListener() {
    const chatBox = document.getElementById('chatMessages');
    chatBox.innerHTML = ""; // Purani chat clear karke fresh load karein
    
    let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];
    chatHistory.forEach(msg => {
        appendMessage(msg.text, msg.type, msg.sender);
    });

    // NOTE: Agar aap real backend (Socket.io) use kar rahe hain, toh yahan socket.on() event listener lagega:
    /*
    const socket = io(); // Connect server
    socket.on('receive_message', (data) => {
        appendMessage(data.text, 'incoming', data.sender);
        saveToChatHistory({ sender: data.sender, text: data.text, type: 'incoming' });
    });
    */
}
