// ==========================================
// INSTATELEGRAM - COMPLETE SCRIPT & SUPABASE SYNC
// ==========================================

const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';

let supabaseClient = null;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase connected successfully!");
} catch(e) {
    console.warn("Supabase initialization failed, running in local storage fallback mode.");
}

let currentActiveView = 'auth-container';
let currentChatRecipient = null;

// --- AUTHENTICATION MODE TOGGLE ---
function toggleAuthMode(isSignup) {
    document.getElementById('login-form-box').style.display = isSignup ? 'none' : 'block';
    document.getElementById('signup-form-box').style.display = isSignup ? 'block' : 'none';
}

// --- USER SIGNUP ---
async function handleSignup() {
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    if (!username || !email || !password) {
        alert("Kripya sabhi fields bharein!");
        return;
    }

    if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) { 
            alert("Signup Error: " + error.message); 
            return; 
        }
        
        // Save user details in database users table
        await supabaseClient.from('users').insert([{ username, email, avatar_url: '' }]);
    }

    localStorage.setItem('currentUsername', username);
    alert("Account successfully ban gaya!");
    enterApp(username);
}

// --- USER LOGIN ---
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        alert("Kripya email aur password dalein!");
        return;
    }

    if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { 
            alert("Login failed: " + error.message); 
            return; 
        }
    }

    let username = email.split('@')[0];
    localStorage.setItem('currentUsername', username);
    enterApp(username);
}

// --- GOOGLE LOGIN ---
async function handleGoogleLogin() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) alert("Google Login Error: " + error.message);
    } else {
        const googleUser = prompt("Enter your Google Username:");
        if (googleUser) {
            localStorage.setItem('currentUsername', googleUser);
            enterApp(googleUser);
        }
    }
}

// --- ENTER APP DASHBOARD ---
function enterApp(username) {
    document.getElementById('auth-container').classList.remove('active');
    document.getElementById('main-bottom-nav').style.display = 'flex';
    switchView('insta-feed-container');
    
    document.getElementById('profile-display-name').textContent = username;
    document.getElementById('my-profile-username').textContent = username;
    document.getElementById('my-profile-avatar').textContent = username.charAt(0).toUpperCase();

    fetchFeedPosts();
    fetchChatUsers();
}

// --- LOGOUT ---
function handleLogout() {
    localStorage.removeItem('currentUsername');
    location.reload();
}

// --- VIEW ROUTER ---
function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    currentActiveView = viewId;

    if (viewId === 'insta-feed-container') fetchFeedPosts();
    if (viewId === 'chat-container') fetchChatUsers();
}

// --- INSTAGRAM FEED & POSTS ---
async function fetchFeedPosts() {
    const feedArea = document.getElementById('feed-posts-area');
    feedArea.innerHTML = '<div style="text-align:center; color:#777; padding:20px;">Loading posts...</div>';

    let posts = [];
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
        if (!error && data) posts = data;
    } else {
        posts = JSON.parse(localStorage.getItem('local_posts') || '[]');
    }

    if (posts.length === 0) {
        feedArea.innerHTML = '<div style="text-align:center; color:#777; padding:40px;">No posts yet. Tap + to upload!</div>';
        return;
    }

    feedArea.innerHTML = '';
    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <div class="post-header">
                <div class="avatar">${post.username ? post.username.charAt(0).toUpperCase() : 'U'}</div>
                <b>${post.username || 'Anonymous'}</b>
            </div>
            <div class="post-img-container">
                <img src="${post.image_url}" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="post-actions">
                <i class="fa-regular fa-heart" onclick="this.classList.toggle('fa-solid'); this.style.color=this.classList.contains('fa-solid')?'#ed4956':'#fff'"></i>
                <i class="fa-regular fa-comment"></i>
            </div>
            <div class="post-details">
                <p style="margin-bottom:4px;"><b>${post.username || 'Anonymous'}</b> ${post.caption || ''}</p>
            </div>
        `;
        feedArea.appendChild(card);
    });
}

function openUploadModal() {
    document.getElementById('upload-modal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('upload-modal').style.display = 'none';
}

async function submitNewPost() {
    const imageUrl = document.getElementById('upload-image-url').value.trim();
    const caption = document.getElementById('upload-caption-text').value.trim();
    const username = localStorage.getItem('currentUsername');

    if (!imageUrl) {
        alert("Kripya image URL dalein!");
        return;
    }

    if (supabaseClient) {
        const { error } = await supabaseClient.from('posts').insert([{ username, image_url: imageUrl, caption }]);
        if (error) {
            alert("Post upload failed: " + error.message);
            return;
        }
    } else {
        let posts = JSON.parse(localStorage.getItem('local_posts') || '[]');
        posts.unshift({ username, image_url: imageUrl, caption, created_at: new Date() });
        localStorage.setItem('local_posts', JSON.stringify(posts));
    }

    closeUploadModal();
    document.getElementById('upload-image-url').value = '';
    document.getElementById('upload-caption-text').value = '';
    switchView('insta-feed-container');
}

// --- TELEGRAM CHAT & MESSAGING ---
async function fetchChatUsers() {
    const chatList = document.getElementById('chat-users-list');
    chatList.innerHTML = '<div style="text-align:center; color:#777; padding:20px;">Loading users...</div>';

    let users = [];
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('users').select('username');
        if (!error && data) users = data;
    } else {
        users = [{username: 'Aman_Dev'}, {username: 'Priya_Tech'}, {username: 'Rahul_99'}];
    }

    const myName = localStorage.getItem('currentUsername');
    chatList.innerHTML = '';

    users.forEach(u => {
        if (u.username === myName) return;
        const row = document.createElement('div');
        row.className = 'chat-user-row';
        row.innerHTML = `
            <div class="avatar">${u.username.charAt(0).toUpperCase()}</div>
            <div>
                <b>${u.username}</b>
                <p style="font-size:12px; color:#888; margin-top:2px;">Tap to open chat</p>
            </div>
        `;
        row.onclick = () => openChatWindow(u.username);
        chatList.appendChild(row);
    });
}

function openChatWindow(recipient) {
    currentChatRecipient = recipient;
    document.getElementById('active-chat-username').textContent = recipient;
    document.getElementById('active-chat-window').style.display = 'flex';
    loadMessages();
}

function closeChatWindow() {
    document.getElementById('active-chat-window').style.display = 'none';
    currentChatRecipient = null;
}

async function loadMessages() {
    const msgBox = document.getElementById('chat-messages-list');
    const myName = localStorage.getItem('currentUsername');
    msgBox.innerHTML = '';

    let messages = [];
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('messages')
            .select('*')
            .or(`and(sender.eq.${myName},receiver.eq.${currentChatRecipient}),and(sender.eq.${currentChatRecipient},receiver.eq.${myName})`)
            .order('created_at', { ascending: true });
        if (!error && data) messages = data;
    } else {
        messages = JSON.parse(localStorage.getItem(`chat_${myName}_${currentChatRecipient}`) || '[]');
    }

    messages.forEach(m => {
        const div = document.createElement('div');
        div.className = `chat-msg ${m.sender === myName ? 'sent' : 'received'}`;
        div.textContent = m.message;
        msgBox.appendChild(div);
    });
    msgBox.scrollTop = msgBox.scrollHeight;
}

async function sendDirectMessage() {
    const input = document.getElementById('chat-message-input');
    const text = input.value.trim();
    if (!text || !currentChatRecipient) return;

    const myName = localStorage.getItem('currentUsername');

    if (supabaseClient) {
        await supabaseClient.from('messages').insert([
            { sender: myName, receiver: currentChatRecipient, message: text }
        ]);
    } else {
        let key = `chat_${myName}_${currentChatRecipient}`;
        let keyReverse = `chat_${currentChatRecipient}_${myName}`;
        let messages = JSON.parse(localStorage.getItem(key) || '[]');
        messages.push({ sender: myName, receiver: currentChatRecipient, message: text });
        localStorage.setItem(key, JSON.stringify(messages));
        localStorage.setItem(keyReverse, JSON.stringify(messages));
    }

    input.value = '';
    loadMessages();
}

// Auto-login check on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUsername');
    if (savedUser) {
        enterApp(savedUser);
    }
});
