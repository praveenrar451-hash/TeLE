const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';

let supabaseClient = null;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {}

let currentChatRecipient = null;

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUsername');
    if (savedUser) {
        enterApp(savedUser);
    } else {
        document.getElementById('auth-container').classList.add('active');
    }
});

function toggleAuthMode(isSignup) {
    document.getElementById('login-form-box').style.display = isSignup ? 'none' : 'block';
    document.getElementById('signup-form-box').style.display = isSignup ? 'block' : 'none';
}

async function handleSignup() {
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    if (!username || !email || !password) { alert("Sabhi fields bharein!"); return; }

    if (supabaseClient) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) { alert(error.message); return; }
        await supabaseClient.from('users').insert([{ username, email }]);
    }
    localStorage.setItem('currentUsername', username);
    enterApp(username);
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) { alert("Email aur password dalein!"); return; }

    if (supabaseClient) {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { alert("Login failed: " + error.message); return; }
    }
    let username = email.split('@')[0];
    localStorage.setItem('currentUsername', username);
    enterApp(username);
}

function enterApp(username) {
    document.getElementById('auth-container').classList.remove('active');
    document.getElementById('main-bottom-nav').style.display = 'flex';
    switchView('insta-feed-container');
    
    document.getElementById('profile-display-name').textContent = username;
    document.getElementById('my-profile-username').textContent = username;
    document.getElementById('my-profile-avatar').textContent = username.charAt(0).toUpperCase();
}

function handleLogout() {
    localStorage.removeItem('currentUsername');
    location.reload();
}

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'insta-feed-container') fetchFeedPosts();
    if (viewId === 'chat-container') fetchActiveChats();
}

// --- INSTAGRAM FEED ---
async function fetchFeedPosts() {
    const feedArea = document.getElementById('feed-posts-area');
    feedArea.innerHTML = '<div style="text-align:center; color:#777; padding:20px;">Loading...</div>';
    let posts = [];
    if (supabaseClient) {
        const { data } = await supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
        posts = data || [];
    }
    feedArea.innerHTML = posts.length === 0 ? '<div style="text-align:center; color:#777; padding:40px;">No posts yet.</div>' : '';
    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <div class="post-header">
                <div class="avatar">${post.username.charAt(0).toUpperCase()}</div>
                <b>${post.username}</b>
            </div>
            <div class="post-img-container"><img src="${post.image_url}"></div>
            <div class="post-actions">
                <i class="fa-regular fa-heart" onclick="this.classList.toggle('fa-solid'); this.style.color=this.classList.contains('fa-solid')?'#ed4956':'#fff'"></i>
                <i class="fa-regular fa-comment"></i>
            </div>
            <div class="post-details"><p><b>${post.username}</b> ${post.caption || ''}</p></div>
        `;
        feedArea.appendChild(card);
    });
}

function openUploadModal() { document.getElementById('upload-modal').style.display = 'flex'; }
function closeUploadModal() { document.getElementById('upload-modal').style.display = 'none'; }

async function submitNewPost() {
    const imageUrl = document.getElementById('upload-image-url').value.trim();
    const caption = document.getElementById('upload-caption-text').value.trim();
    const username = localStorage.getItem('currentUsername');

    if (!imageUrl) { alert("Image URL dalein!"); return; }

    if (supabaseClient) {
        await supabaseClient.from('posts').insert([{ username, image_url: imageUrl, caption }]);
    }
    closeUploadModal();
    document.getElementById('upload-image-url').value = '';
    document.getElementById('upload-caption-text').value = '';
    switchView('insta-feed-container');
}

// --- EXPLORE & SEARCH USERS ---
async function searchGlobalUsers(query) {
    const list = document.getElementById('search-results-list');
    if (!query.trim()) { list.innerHTML = ''; return; }

    if (supabaseClient) {
        const { data } = await supabaseClient.from('users').select('username').ilike('username', `%${query}%`);
        list.innerHTML = '';
        const myName = localStorage.getItem('currentUsername');
        (data || []).forEach(u => {
            if (u.username === myName) return;
            const row = document.createElement('div');
            row.className = 'chat-user-row';
            row.innerHTML = `<div class="avatar">${u.username.charAt(0).toUpperCase()}</div><b>${u.username}</b>`;
            row.onclick = () => {
                switchView('chat-container');
                openChatWindow(u.username);
            };
            list.appendChild(row);
        });
    }
}

// --- TELEGRAM ACTIVE CHATS (Sirf wahi users jinse chat hui hai) ---
async function fetchActiveChats() {
    const chatList = document.getElementById('chat-users-list');
    chatList.innerHTML = '<div style="text-align:center; color:#777; padding:20px;">Loading chats...</div>';
    const myName = localStorage.getItem('currentUsername');

    let activeUsers = new Set();
    if (supabaseClient) {
        const { data } = await supabaseClient.from('messages')
            .select('sender, receiver')
            .or(`sender.eq.${myName},receiver.eq.${myName}`);
        
        if (data) {
            data.forEach(m => {
                if (m.sender !== myName) activeUsers.add(m.sender);
                if (m.receiver !== myName) activeUsers.add(m.receiver);
            });
        }
    }

    chatList.innerHTML = '';
    if (activeUsers.size === 0) {
        chatList.innerHTML = '<div style="text-align:center; color:#777; padding:40px;">No active chats yet. Use search in explore to message someone.</div>';
        return;
    }

    activeUsers.forEach(username => {
        const row = document.createElement('div');
        row.className = 'chat-user-row';
        row.innerHTML = `
            <div class="avatar">${username.charAt(0).toUpperCase()}</div>
            <div><b>${username}</b><p style="font-size:12px; color:#888;">Tap to open chat</p></div>
        `;
        row.onclick = () => openChatWindow(username);
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
    fetchActiveChats();
}

async function loadMessages() {
    const msgBox = document.getElementById('chat-messages-list');
    const myName = localStorage.getItem('currentUsername');
    msgBox.innerHTML = '';

    let messages = [];
    if (supabaseClient) {
        const { data } = await supabaseClient.from('messages')
            .select('*')
            .or(`and(sender.eq.${myName},receiver.eq.${currentChatRecipient}),and(sender.eq.${currentChatRecipient},receiver.eq.${myName})`)
            .order('created_at', { ascending: true });
        messages = data || [];
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
    }

    input.value = '';
    loadMessages();
}
// --- INSTAGRAM PROFILE EXTENSIONS ---
// Jab bhi profile view khulegi, yeh function user ke posts load karega
async function loadUserProfilePosts() {
    const username = localStorage.getItem('currentUsername');
    const gridArea = document.getElementById('my-profile-grid');
    if (!gridArea) return;

    gridArea.innerHTML = '<div style="grid-column: span 3; text-align:center; color:#777; padding:20px;">Loading...</div>';

    let posts = [];
    if (supabaseClient) {
        const { data } = await supabaseClient.from('posts').select('*').eq('username', username).order('created_at', { ascending: false });
        posts = data || [];
    }

    document.getElementById('profile-posts-count').textContent = posts.length;
    gridArea.innerHTML = '';

    if (posts.length === 0) {
        gridArea.innerHTML = '<div style="grid-column: span 3; text-align:center; color:#777; padding:40px; font-size:13px;">No Posts Yet</div>';
        return;
    }

    posts.forEach(post => {
        const img = document.createElement('img');
        img.src = post.image_url;
        img.onerror = () => { img.style.background = '#222'; };
        gridArea.appendChild(img);
    });
}

function editProfileBio() {
    const newBio = prompt("Enter new bio:", "Building InstaTelegram 🚀");
    if (newBio !== null) {
        document.getElementById('profile-bio-text').textContent = newBio;
    }
}

// SwitchView function mein profile trigger add karne ke liye check karein
const originalSwitchView = window.switchView;
window.switchView = function(viewId) {
    if (typeof originalSwitchView === 'function') {
        originalSwitchView(viewId);
    }
    if (viewId === 'profile-container') {
        loadUserProfilePosts();
    }
};
// ==========================================
// ADVANCED PROFILE & FOLLOW SYSTEM FIX
// ==========================================

// 1. Profile HTML update karein taaki modal aur dynamic list kaam kare
document.addEventListener("DOMContentLoaded", () => {
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer) {
        // Stats container ko clickable banate hain taaki followers/following list khul sake
        const statsBar = profileContainer.querySelector('div[style*="justify-content: space-around"]');
        if (statsBar) {
            statsBar.children[1].style.cursor = "pointer";
            statsBar.children[1].onclick = () => openFollowersList('followers');
            
            statsBar.children[2].style.cursor = "pointer";
            statsBar.children[2].onclick = () => openFollowersList('following');
        }
    }
});

// 2. Real Followers & Following Fetch Karne ka Function
async function loadRealProfileStats(username) {
    if (!supabaseClient) return;

    // Posts count
    const { count: postCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
    document.getElementById('profile-posts-count').textContent = postCount || 0;

    // Followers count
    const { count: followersCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
    const followersEl = document.getElementById('profile-followers-count');
    if (followersEl) followersEl.textContent = followersCount || 0;

    // Following count
    const { count: followingCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
    const followingEl = document.getElementById('profile-following-count');
    if (followingEl) followingEl.textContent = followingCount || 0;
}

// 3. Followers / Following List Modal Show Karne ke liye
async function openFollowersList(type) {
    const myName = localStorage.getItem('currentUsername');
    let modal = document.getElementById('follow-list-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'follow-list-modal';
        modal.style.cssText = "display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:400; justify-content:center; align-items:center; padding:20px;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:#121212; width:100%; max-width:350px; border-radius:12px; border:1px solid #262626; overflow:hidden; display:flex; flex-direction:column; max-height:80vh;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #262626;">
                <b style="text-transform: capitalize;">${type}</b>
                <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:18px;" onclick="document.getElementById('follow-list-modal').style.display='none'"></i>
            </div>
            <div id="follow-modal-users" style="padding:10px; overflow-y:auto; flex:1;">
                <div style="text-align:center; color:#777; padding:20px;">Loading...</div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    let usersList = [];
    if (supabaseClient) {
        if (type === 'followers') {
            const { data } = await supabaseClient.from('follows').select('follower').eq('following', myName);
            usersList = (data || []).map(item => item.follower);
        } else {
            const { data } = await supabaseClient.from('follows').select('following').eq('follower', myName);
            usersList = (data || []).map(item => item.following);
        }
    }

    const container = document.getElementById('follow-modal-users');
    container.innerHTML = '';
    
    if (usersList.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#777; padding:30px; font-size:13px;">No ${type} yet</div>`;
        return;
    }

    usersList.forEach(user => {
        const row = document.createElement('div');
        row.className = 'chat-user-row';
        row.innerHTML = `<div class="avatar">${user.charAt(0).toUpperCase()}</div><b>${user}</b>`;
        row.onclick = () => {
            modal.style.display = 'none';
            openUserProfile(user);
        };
        container.appendChild(row);
    });
}

// 4. Instagram Style Edit Profile Modal
window.editProfileBio = function() {
    const currentName = document.getElementById('profile-display-name').textContent;
    const currentBio = document.getElementById('profile-bio-text').textContent;

    let modal = document.getElementById('edit-profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-profile-modal';
        modal.style.cssText = "display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:400; justify-content:center; align-items:center; padding:20px;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:#121212; width:100%; max-width:380px; padding:20px; border-radius:12px; border:1px solid #262626;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="font-size:16px;">Edit Profile</h3>
                <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:18px;" onclick="document.getElementById('edit-profile-modal').style.display='none'"></i>
            </div>
            <label style="font-size:12px; color:#aaa;">Name</label>
            <input type="text" id="edit-name-input" class="auth-input" value="${currentName}" style="margin-top:4px;">
            
            <label style="font-size:12px; color:#aaa; margin-top:10px; display:block;">Bio</label>
            <textarea id="edit-bio-input" class="auth-input" style="height:70px; resize:none; margin-top:4px;">${currentBio}</textarea>
            
            <button class="auth-btn" onclick="saveProfileChanges()">Done</button>
        </div>
    `;
    modal.style.display = 'flex';
}

function saveProfileChanges() {
    const newName = document.getElementById('edit-name-input').value.trim();
    const newBio = document.getElementById('edit-bio-input').value.trim();

    if (newName) {
        document.getElementById('profile-display-name').textContent = newName;
        document.getElementById('my-profile-username').textContent = newName;
    }
    if (newBio) {
        document.getElementById('profile-bio-text').textContent = newBio;
    }

    document.getElementById('edit-profile-modal').style.display = 'none';
}

// 5. Kisi aur ki Profile kholne par Instagram jaisa Follow/Message buttons dena
async function openUserProfile(targetUsername) {
    const myName = localStorage.getItem('currentUsername');
    if (targetUsername === myName) {
        switchView('profile-container');
        return;
    }

    let view = document.getElementById('other-profile-container');
    if (!view) {
        view = document.createElement('div');
        view.id = 'other-profile-container';
        view.className = 'app-view';
        document.getElementById('app-container').appendChild(view);
    }

    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    view.classList.add('active');
    view.innerHTML = '<div style="text-align:center; color:#777; padding:40px;">Loading profile...</div>';

    // Check if already following
    let isFollowing = false;
    if (supabaseClient) {
        const { data } = await supabaseClient.from('follows').select('*').eq('follower', myName).eq('following', targetUsername).single();
        if (data) isFollowing = true;
    }

    view.innerHTML = `
        <div class="top-header">
            <div style="display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-arrow-left" onclick="switchView('insta-feed-container')" style="cursor:pointer;"></i>
                <h2>${targetUsername}</h2>
            </div>
        </div>
        <div style="padding:15px 16px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div class="avatar" style="width:80px; height:80px; font-size:30px;">${targetUsername.charAt(0).toUpperCase()}</div>
                <div style="display:flex; gap:20px; text-align:center; flex:1; justify-content:space-around; margin-left:15px;">
                    <div><b>-</b><p style="font-size:12px; color:#aaa;">Posts</p></div>
                    <div><b>-</b><p style="font-size:12px; color:#aaa;">Followers</p></div>
                    <div><b>-</b><p style="font-size:12px; color:#aaa;">Following</p></div>
                </div>
            </div>
            <div style="margin-top:12px;">
                <b>${targetUsername}</b>
                <p style="font-size:13px; color:#ddd; margin-top:2px;">InstaTelegram User</p>
            </div>
            <div style="display:flex; gap:8px; margin-top:15px;">
                <button id="follow-action-btn" onclick="toggleFollowUser('${targetUsername}')" style="flex:1; background:${isFollowing ? '#262626' : '#0095f6'}; color:#fff; border:none; padding:7px; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer;">${isFollowing ? 'Following' : 'Follow'}</button>
                <button onclick="switchView('chat-container'); openChatWindow('${targetUsername}');" style="flex:1; background:#262626; color:#fff; border:none; padding:7px; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer;">Message</button>
            </div>
        </div>
    `;
}

// 6. Follow / Unfollow Toggle Functionality
async function toggleFollowUser(targetUsername) {
    const myName = localStorage.getItem('currentUsername');
    const btn = document.getElementById('follow-action-btn');
    
    if (!supabaseClient) return;

    if (btn.textContent === 'Follow') {
        const { error } = await supabaseClient.from('follows').insert([{ follower: myName, following: targetUsername }]);
        if (!error) {
            btn.textContent = 'Following';
            btn.style.background = '#262626';
        }
    } else {
        const { error } = await supabaseClient.from('follows').delete().eq('follower', myName).eq('following', targetUsername);
        if (!error) {
            btn.textContent = 'Follow';
            btn.style.background = '#0095f6';
        }
    }
}
// ==========================================
// INSTAGRAM PROFILE & FOLLOW SYSTEM LOGIC
// ==========================================

// Profile tabs toggle (Posts vs Saved)
function switchProfileTab(tabType) {
    const postsBtn = document.getElementById('tab-posts-btn');
    const savedBtn = document.getElementById('tab-saved-btn');
    const gridArea = document.getElementById('my-profile-grid');

    if (tabType === 'posts') {
        postsBtn.style.borderBottom = '2px solid #fff';
        postsBtn.style.color = '#fff';
        savedBtn.style.borderBottom = 'none';
        savedBtn.style.color = '#777';
        loadUserProfilePosts();
    } else {
        savedBtn.style.borderBottom = '2px solid #fff';
        savedBtn.style.color = '#fff';
        postsBtn.style.borderBottom = 'none';
        postsBtn.style.color = '#777';
        gridArea.innerHTML = '<div style="grid-column: span 3; text-align:center; color:#777; padding:40px; font-size:13px;">No Saved Posts</div>';
    }
}

// Profile Picture Change Function
function changeProfilePicture() {
    const newImgUrl = prompt("Enter profile picture image URL:");
    if (newImgUrl) {
        localStorage.setItem('userAvatarUrl', newImgUrl);
        updateAvatarUI(newImgUrl);
    }
}

function updateAvatarUI(url) {
    const avatars = document.querySelectorAll('#my-profile-avatar, .my-avatar-display');
    avatars.forEach(av => {
        if (url) {
            av.style.backgroundImage = `url('${url}')`;
            av.textContent = '';
        }
    });
}

// Real Followers & Following Loader
async function loadRealProfileStats(username) {
    if (!supabaseClient) return;

    // 1. Posts count & grid
    const { data: posts } = await supabaseClient.from('posts').select('*').eq('username', username).order('created_at', { ascending: false });
    document.getElementById('profile-posts-count').textContent = posts ? posts.length : 0;

    // 2. Followers count (jin logo ne mujhe follow kiya hai)
    const { count: followersCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
    document.getElementById('profile-followers-count').textContent = followersCount || 0;

    // 3. Following count (jinko maine follow kiya hai)
    const { count: followingCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
    document.getElementById('profile-following-count').textContent = followingCount || 0;

    // Click events for Followers & Following lists popup
    document.getElementById('followers-tab-btn').onclick = () => openFollowersModal('followers', username);
    document.getElementById('following-tab-btn').onclick = () => openFollowersModal('following', username);
}

// Followers/Following List Modal Popup
async function openFollowersModal(type, username) {
    let modal = document.getElementById('follow-list-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'follow-list-modal';
        modal.style.cssText = "display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:400; justify-content:center; align-items:center; padding:20px;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:#121212; width:100%; max-width:350px; border-radius:12px; border:1px solid #262626; overflow:hidden; display:flex; flex-direction:column; max-height:80vh;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #262626;">
                <b style="text-transform: capitalize; font-size:14px;">${type}</b>
                <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:18px;" onclick="document.getElementById('follow-list-modal').style.display='none'"></i>
            </div>
            <div id="follow-modal-users" style="padding:10px; overflow-y:auto; flex:1;">
                <div style="text-align:center; color:#777; padding:20px;">Loading...</div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    let usersList = [];
    if (supabaseClient) {
        if (type === 'followers') {
            const { data } = await supabaseClient.from('follows').select('follower').eq('following', username);
            usersList = (data || []).map(item => item.follower);
        } else {
            const { data } = await supabaseClient.from('follows').select('following').eq('follower', username);
            usersList = (data || []).map(item => item.following);
        }
    }

    const container = document.getElementById('follow-modal-users');
    container.innerHTML = '';
    
    if (usersList.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#777; padding:30px; font-size:13px;">No ${type} yet</div>`;
        return;
    }

    usersList.forEach(uName => {
        const row = document.createElement('div');
        row.className = 'chat-user-row';
        row.innerHTML = `<div class="avatar">${uName.charAt(0).toUpperCase()}</div><b>${uName}</b>`;
        row.onclick = () => {
            modal.style.display = 'none';
            openUserProfile(uName);
        };
        container.appendChild(row);
    });
}

// Load user's own posts grid
async function loadUserProfilePosts() {
    const username = localStorage.getItem('currentUsername');
    const gridArea = document.getElementById('my-profile-grid');
    if (!gridArea) return;

    gridArea.innerHTML = '<div style="grid-column: span 3; text-align:center; color:#777; padding:20px;">Loading...</div>';

    let posts = [];
    if (supabaseClient) {
        const { data } = await supabaseClient.from('posts').select('*').eq('username', username).order('created_at', { ascending: false });
        posts = data || [];
    }

    gridArea.innerHTML = '';
    if (posts.length === 0) {
        gridArea.innerHTML = '<div style="grid-column: span 3; text-align:center; color:#777; padding:40px; font-size:13px;">No Posts Yet</div>';
        return;
    }

    posts.forEach(post => {
        const img = document.createElement('img');
        img.src = post.image_url;
        img.style.cssText = "width:100%; aspect-ratio:1/1; object-fit:cover; background:#111;";
        gridArea.appendChild(img);
    });
}

// Hook into switchView to refresh stats when profile opens
const existingSwitchView = window.switchView;
window.switchView = function(viewId) {
    if (typeof existingSwitchView === 'function') existingSwitchView(viewId);
    if (viewId === 'profile-container') {
        const username = localStorage.getItem('currentUsername');
        loadRealProfileStats(username);
        loadUserProfilePosts();
        const savedAvatar = localStorage.getItem('userAvatarUrl');
        if (savedAvatar) updateAvatarUI(savedAvatar);
    }
};

// Share profile link function
function shareProfileLink() {
    navigator.clipboard?.writeText(window.location.href);
    alert("Profile link copied to clipboard!");
}
// --- GLOBAL PROFILE PICTURE SYNC ---

// 1. Avatar apply karne ka universal function
window.updateGlobalAvatar = function(username, imageUrl) {
    if (!imageUrl) return;
    
    // Sabhi jagah jahan ye user ki id/avatar show ho raha hai
    document.querySelectorAll(`.avatar-container-${username}, [data-username="${username}"]`).forEach(el => {
        const avatarDiv = el.querySelector('.avatar');
        if (avatarDiv) {
            avatarDiv.style.backgroundImage = `url('${imageUrl}')`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            avatarDiv.textContent = '';
        }
    });
};

// 2. Profile picture set ya change karne ka advanced option (Edit Profile ya Avatar click par)
window.changeProfilePicture = function() {
    const imgUrl = prompt("Enter Image URL for your Profile Picture:");
    if (imgUrl) {
        const username = localStorage.getItem('currentUsername');
        localStorage.setItem(`userAvatar_${username}`, imgUrl);
        
        // Khud ki profile par apply karein
        const myAvatar = document.getElementById('my-profile-avatar');
        if (myAvatar) {
            myAvatar.style.backgroundImage = `url('${imgUrl}')`;
            myAvatar.style.backgroundSize = 'cover';
            myAvatar.style.backgroundPosition = 'center';
            myAvatar.textContent = '';
        }
        
        // Global sync call
        updateGlobalAvatar(username, imgUrl);
    }
};

// 3. App load hone par saved avatar restore karna
window.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('currentUsername');
    if (username) {
        const savedUrl = localStorage.getItem(`userAvatar_${username}`);
        if (savedUrl) {
            setTimeout(() => {
                const myAvatar = document.getElementById('my-profile-avatar');
                if (myAvatar) {
                    myAvatar.style.backgroundImage = `url('${savedUrl}')`;
                    myAvatar.style.backgroundSize = 'cover';
                    myAvatar.style.backgroundPosition = 'center';
                    myAvatar.textContent = '';
                }
                updateGlobalAvatar(username, savedUrl);
            }, 500);
        }
    }
});
// ==========================================
// INSTAGRAM STYLE CROPPING & SEARCH FIX
// ==========================================

let selectedImageBase64 = null;

// 1. Gallery se image select karne par Crop Preview Modal kholna
function handleImageCropSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedImageBase64 = e.target.result;
        showCropModal(selectedImageBase64);
    };
    reader.readAsDataURL(file);
}

function showCropModal(imgSrc) {
    let modal = document.getElementById('crop-preview-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'crop-preview-modal';
        modal.style.cssText = "display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:999; justify-content:center; align-items:center; padding:20px;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:#121212; padding:20px; border-radius:12px; width:100%; max-width:320px; text-align:center; border:1px solid #262626;">
            <h3 style="font-size:15px; margin-bottom:15px; color:#fff;">Profile Picture Preview</h3>
            <div style="width: 160px; height: 160px; border-radius: 50%; overflow: hidden; margin: 0 auto 15px auto; border: 3px solid #0095f6; background: #000;">
                <img id="crop-preview-img" src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <p style="font-size:12px; color:#aaa; margin-bottom:15px;">Instagram style circle crop ready</p>
            <div style="display:flex; gap:10px;">
                <button onclick="saveCroppedProfilePic()" style="flex:1; background:#0095f6; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">Done</button>
                <button onclick="document.getElementById('crop-preview-modal').style.display='none'" style="flex:1; background:#333; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function saveCroppedProfilePic() {
    if (!selectedImageBase64) return;
    const username = localStorage.getItem('currentUsername');
    
    // Save locally & globally
    localStorage.setItem(`userAvatar_${username}`, selectedImageBase64);
    
    const myAvatar = document.getElementById('my-profile-avatar');
    if (myAvatar) {
        myAvatar.style.backgroundImage = `url('${selectedImageBase64}')`;
        myAvatar.style.backgroundSize = 'cover';
        myAvatar.style.backgroundPosition = 'center';
        myAvatar.textContent = '';
    }

    document.getElementById('crop-preview-modal').style.display = 'none';
    alert("Profile picture updated successfully!");
}


// 2. Homepage Search Button Logic (User ID / Profile Open karne ke liye)
// Homepage header mein search icon ya input add karne ke liye function:
function setupHomepageSearch() {
    const feedHeader = document.querySelector('#insta-feed-container .top-header');
    if (feedHeader && !document.getElementById('home-search-icon')) {
        const iconsDiv = feedHeader.querySelector('div');
        if (iconsDiv) {
            const searchIcon = document.createElement('i');
            searchIcon.id = 'home-search-icon';
            searchIcon.className = 'fa-solid fa-magnifying-glass';
            searchIcon.style.cssText = "cursor:pointer; font-size:20px; margin-right:5px;";
            searchIcon.onclick = () => {
                // Explore view ya search modal kholo jo user ki profile khol sake
                switchView('explore-container');
            };
            iconsDiv.prepend(searchIcon);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setupHomepageSearch();
    // Restore saved avatar
    const username = localStorage.getItem('currentUsername');
    if (username) {
        const savedPic = localStorage.getItem(`userAvatar_${username}`);
        if (savedPic) {
            const myAvatar = document.getElementById('my-profile-avatar');
            if (myAvatar) {
                myAvatar.style.backgroundImage = `url('${savedPic}')`;
                myAvatar.style.backgroundSize = 'cover';
                myAvatar.style.backgroundPosition = 'center';
                myAvatar.textContent = '';
            }
        }
    }
});
// ==========================================
// ALL-IN-ONE FIX: AVATAR, USERNAME & VIEW MEMORY
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Refresh karne par wahi page kholne ka fix jahan user tha
    const lastActiveView = localStorage.getItem('activeAppView');
    if (lastActiveView && document.getElementById(lastActiveView)) {
        setTimeout(() => {
            switchView(lastActiveView);
        }, 150);
    }

    // 2. Profile open hone par real username aur DP load karna
    const currentUname = localStorage.getItem('currentUsername');
    if (currentUname) {
        const nameEl = document.getElementById('my-profile-username');
        const dispEl = document.getElementById('profile-display-name');
        if (nameEl) nameEl.textContent = currentUname;
        if (dispEl) dispEl.textContent = currentUname;

        // Saved DP restore karna
        const savedPic = localStorage.getItem(`userAvatar_${currentUname}`);
        if (savedPic) {
            applyAvatarToElement(document.getElementById('my-profile-avatar'), savedPic);
        }
    }

    // 3. Global avatars apply karna
    applyGlobalAvatarsToAll();
});

// View switch karte waqt view yaad rakhna
const originalSwitchFunc = window.switchView;
window.switchView = function(viewId) {
    if (typeof originalSwitchFunc === 'function') {
        originalSwitchFunc(viewId);
    }
    localStorage.setItem('activeAppView', viewId);
    setTimeout(applyGlobalAvatarsToAll, 200);
};

// Global Avatars ko har jagah (feed, chat, comments, profile) dikhane ka function
function applyGlobalAvatarsToAll() {
    // Sabhi elements jinme data-username ya avatar classes hain
    document.querySelectorAll('.avatar, [data-username]').forEach(el => {
        let uname = el.getAttribute('data-username');
        if (!uname) {
            // Agar parent ya row se username mil jaye
            const parentRow = el.closest('[data-username]') || el.closest('.chat-user-row') || el.closest('.post-card');
            if (parentRow) uname = parentRow.getAttribute('data-username');
        }
        
        if (uname) {
            const userPic = localStorage.getItem(`userAvatar_${uname}`);
            if (userPic) {
                const targetDiv = el.classList.contains('avatar') ? el : el.querySelector('.avatar');
                if (targetDiv) {
                    targetDiv.style.backgroundImage = `url('${userPic}')`;
                    targetDiv.style.backgroundSize = 'cover';
                    targetDiv.style.backgroundPosition = 'center';
                    targetDiv.textContent = '';
                }
            }
        }
    });
}

function applyAvatarToElement(el, url) {
    if (el && url) {
        el.style.backgroundImage = `url('${url}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
    }
}

// 4. Username aur Bio change karke Database & LocalStorage me permanently save karne ka fix
window.saveProfileChanges = async function() {
    const oldUname = localStorage.getItem('currentUsername');
    const newUnameInput = document.getElementById('edit-name-input');
    const newBioInput = document.getElementById('edit-bio-input');
    
    if (!newUnameInput) return;
    const newUname = newUnameInput.value.trim();
    const newBio = newBioInput ? newBioInput.value.trim() : '';

    if (!newUname) {
        alert("Username cannot be empty!");
        return;
    }

    if (window.supabaseClient) {
        // Supabase database me username update karein
        const { error } = await window.supabaseClient
            .from('users')
            .update({ username: newUname, bio: newBio })
            .eq('username', oldUname);

        if (error) {
            alert("Error updating: " + error.message);
            return;
        }
    }

    // LocalStorage update taaki refresh par purana na ho
    localStorage.setItem('currentUsername', newUname);
    
    // Agar DP bhi thi to naye username ke sath map karein
    const oldPic = localStorage.getItem(`userAvatar_${oldUname}`);
    if (oldPic) {
        localStorage.setItem(`userAvatar_${newUname}`, oldPic);
    }

    alert("Profile updated successfully!");
    location.reload();
};
