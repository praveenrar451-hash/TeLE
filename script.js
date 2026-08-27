const SUPABASE_URL = 'https://mgrvkfcpuxubhzmylewv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7BjPkCUaH1EgtAdNWs7gSA_7dBN-98n';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesBox = document.getElementById('messages-box');
const userEmailDisplay = document.getElementById('user-email-display');

let currentUser = null;

// Login / Signup Handler with Error Alerts for Tablet debugging
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) return alert('Please enter email and password');

    // Pehle Sign In try karo
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        // Agar login fail ho, toh error message screen par dikhao
        alert("Login Error: " + error.message);
        
        // Phir Sign Up try karo agar account nahi hai
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
            alert("Sign Up Error: " + signUpError.message);
            return;
        } else {
            alert('Account created successfully! Now click login again.');
        }
    } else {
        checkUser();
    }
});

// Logout Handler
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

// Check current session
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        userEmailDisplay.innerText = currentUser.email;
        loginContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        loadMessages();
        subscribeToRealtime();
    }
}

// Send Message
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text) return;

    const { error } = await supabase.from('messages').insert([
        { content: text, sender_email: currentUser.email }
    ]);

    if (error) alert("Send Error: " + error.message);
    else messageInput.value = '';
});

// Load Old Messages from Database
async function loadMessages() {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) return alert("Load Error: " + error.message);

    messagesBox.innerHTML = '';
    if (data) {
        data.forEach(msg => appendMessage(msg));
    }
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

// Realtime Listeners for New Messages
function subscribeToRealtime() {
    supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            appendMessage(payload.new);
            messagesBox.scrollTop = messagesBox.scrollHeight;
        })
        .subscribe();
}

// Append Message UI Helper
function appendMessage(msg) {
    const div = document.createElement('div');
    const isMine = msg.sender_email === currentUser?.email;
    div.className = `message ${isMine ? 'my-message' : 'other-message'}`;
    
    div.innerHTML = `
        <span class="sender">${msg.sender_email}</span>
        <span>${msg.content}</span>
    `;
    messagesBox.appendChild(div);
}

// Run on page load
checkUser();
