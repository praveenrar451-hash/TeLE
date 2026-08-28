// ==========================================
// INSTAGRAM ULTRA PRO - MASTER SCRIPT
// ==========================================

const SUPABASE_URL = "https://ydjbojsqeujahgqinfmk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI";

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
}

// Session Check on Load
window.addEventListener('DOMContentLoaded', () => {
    const activeUser = localStorage.getItem('currentUsername');
    if (activeUser) {
        document.getElementById('auth-container').classList.remove('active');
        document.getElementById('main-app-content').style.display = 'flex';
        
        const lastView = localStorage.getItem('activeAppView') || 'insta-feed-container';
        switchView(lastView);
        loadUserData(activeUser);
        loadFeedPosts();
    }
});

// Authentication Login / Signup
async function handleAuthLogin() {
    const usernameInput = document.getElementById('auth-username').value.trim();
    if (!usernameInput) {
        alert("Please enter a valid username!");
        return;
    }

    if (supabaseClient) {
        // Check or insert user in DB
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', usernameInput);

        if (!data || data.length === 0) {
            await supabaseClient.from('users').insert([{ username: usernameInput, bio: 'InstaUltra Creator 🚀' }]);
        }
    }

    localStorage.setItem('currentUsername', usernameInput);
    document.getElementById('auth-container').classList.remove('active');
    document.getElementById('main-app-content').style.display = 'flex';
    switchView('insta-feed-container');
    loadUserData(usernameInput);
    loadFeedPosts();
}

function handleLogout() {
    localStorage.removeItem('currentUsername');
    location.reload();
}

// View Switcher with Memory
window.switchView = function(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active', 'active-view'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active', 'active-view');
        localStorage.setItem('activeAppView', viewId);
    }
    if (viewId === 'insta-feed-container') loadFeedPosts();
};

// Load User Data & Profile
async function loadUserData(username) {
    const nameEls = document.querySelectorAll('#my-profile-username, #profile-display-name');
    nameEls.forEach(el => { if(el) el.textContent = username; });

    const savedAvatar = localStorage.getItem(`userAvatar_${username}`);
    const myAvatarDiv = document.getElementById('my-profile-avatar');
    if (savedAvatar && myAvatarDiv) {
        myAvatarDiv.style.backgroundImage = `url('${savedAvatar}')`;
        myAvatarDiv.textContent = '';
    } else if (myAvatarDiv) {
        myAvatarDiv.textContent = username.charAt(0).toUpperCase();
    }

    if (supabaseClient) {
        // Fetch posts count
        const { count: pCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
        const pCountEl = document.getElementById('profile-posts-count');
        if (pCountEl) pCountEl.textContent = pCount || 0;

        // Fetch followers count
        const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
        const fCountEl = document.getElementById('profile-followers-count');
        if (fCountEl) fCountEl.textContent = fCount || 0;

        // Fetch following count
        const { count: fgCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
        const fgCountEl = document.getElementById('profile-following-count');
        if (fgCountEl) fgCountEl.textContent = fgCount || 0;
    }
}

// Profile Picture Upload Handler
function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const imgSrc = e.target.result;
        const username = localStorage.getItem('currentUsername');
        localStorage.setItem(`userAvatar_${username}`, imgSrc);
        
        const avatarDiv = document.getElementById('my-profile-avatar');
        if (avatarDiv) {
            avatarDiv.style.backgroundImage = `url('${imgSrc}')`;
            avatarDiv.textContent = '';
        }
        alert("Profile picture updated successfully!");
    };
    reader.readAsDataURL(file);
}

// Create New Post
async function submitNewPost() {
    const imgUrl = document.getElementById('create-img-url').value.trim();
    const caption = document.getElementById('create-caption').value.trim();
    const username = localStorage.getItem('currentUsername');

    if (!imgUrl) {
        alert("Please provide an image URL!");
        return;
    }

    if (supabaseClient) {
        const { error } = await supabaseClient.from('posts').insert([{ username, image_url: imgUrl, caption }]);
        if (error) {
            alert("Error posting: " + error.message);
            return;
        }
    }

    alert("Post shared successfully!");
    document.getElementById('create-img-url').value = '';
    document.getElementById('create-caption').value = '';
    switchView('insta-feed-container');
}

// Load Feed Posts
async function loadFeedPosts() {
    const feedList = document.getElementById('feed-posts-list');
    if (!feedList) return;

    feedList.innerHTML = `<div style="text-align:center; padding:30px; color:#777;">Loading feed...</div>`;

    let posts = [];
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
        if (data) posts = data;
    }

    if (posts.length === 0) {
        feedList.innerHTML = `<div style="text-align:center; padding:40px; color:#777;">No posts yet. Be the first to share one!</div>`;
        return;
    }

    feedList.innerHTML = '';
    posts.forEach(post => {
        const userAvatar = localStorage.getItem(`userAvatar_${post.username}`) || '';
        const avatarStyle = userAvatar ? `background-image: url('${userAvatar}'); background-size: cover;` : '';

        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.innerHTML = `
            <div class="post-header">
                <div class="avatar" style="width: 32px; height: 32px; font-size: 14px; ${avatarStyle}">${userAvatar ? '' : post.username.charAt(0).toUpperCase()}</div>
                <b style="font-size: 14px; cursor: pointer;" onclick="openUserProfile('${post.username}')">${post.username}</b>
            </div>
            <img src="${post.image_url}" class="post-img" alt="Post Image">
            <div class="post-actions">
                <div>
                    <i class="fa-regular fa-heart" style="margin-right: 15px;" onclick="toggleLikePost(this)"></i>
                    <i class="fa-regular fa-comment" style="margin-right: 15px;"></i>
                    <i class="fa-regular fa-paper-plane"></i>
                </div>
                <i class="fa-regular fa-bookmark" onclick="toggleBookmarkPost(this)"></i>
            </div>
            <div class="post-details">
                <p><b>${post.username}</b> ${post.caption || ''}</p>
            </div>
        `;
        feedList.appendChild(postCard);
    });
}

// Search Users
async function handleUserSearch(query) {
    const resultsList = document.getElementById('search-results-list');
    if (!query.trim()) {
        resultsList.innerHTML = '';
        return;
    }

    if (supabaseClient) {
        const { data } = await supabaseClient.from('users').select('username, bio').ilike('username', `%${query}%`);
        resultsList.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach(user => {
                const row = document.createElement('div');
                row.style.cssText = "display:flex; align-items:center; padding:10px 16px; gap:12px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);";
                row.onclick = () => openUserProfile(user.username);
                row.innerHTML = `
                    <div class="avatar" style="width:40px; height:40px;">${user.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <b>${user.username}</b>
                        <p style="font-size:12px; color:#888;">${user.bio || 'Instagram User'}</p>
                    </div>
                `;
                resultsList.appendChild(row);
            });
        }
    }
}

// Open Any User Profile (Instagram Style)
async function openUserProfile(targetUsername) {
    const myName = localStorage.getItem('currentUsername');
    if (targetUsername === myName) {
        switchView('profile-container');
        return;
    }
    alert(`Opening profile of: ${targetUsername}`);
}

function toggleLikePost(icon) {
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
    icon.style.color = icon.classList.contains('fa-solid') ? '#ed4956' : '#fff';
}

function toggleBookmarkPost(icon) {
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
}
