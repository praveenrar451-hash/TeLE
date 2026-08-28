const SUPABASE_URL = "https://ydjbojsqeujahgqinfmk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI";

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
}

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

async function handleAuthLogin() {
    const usernameInput = document.getElementById('auth-username').value.trim();
    if (!usernameInput) {
        alert("Enter username");
        return;
    }

    if (supabaseClient) {
        const { data } = await supabaseClient.from('users').select('*').eq('username', usernameInput);
        if (!data || data.length === 0) {
            await supabaseClient.from('users').insert([{ username: usernameInput, bio: 'Digital Creator' }]);
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

window.switchView = function(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active', 'active-view'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active', 'active-view');
        localStorage.setItem('activeAppView', viewId);
    }
    if (viewId === 'insta-feed-container') loadFeedPosts();
};

async function loadUserData(username) {
    document.getElementById('top-profile-username').textContent = username;
    document.getElementById('my-profile-display-name').textContent = username;

    const savedBio = localStorage.getItem(`userBio_${username}`) || 'Digital Creator';
    document.getElementById('profile-bio-text').textContent = savedBio;

    const savedAvatar = localStorage.getItem(`userAvatar_${username}`);
    const avatars = [
        document.getElementById('my-profile-avatar'), 
        document.getElementById('nav-mini-avatar'),
        document.getElementById('feed-story-avatar')
    ];
    
    avatars.forEach(el => {
        if (!el) return;
        if (savedAvatar) {
            el.style.backgroundImage = `url('${savedAvatar}')`;
            el.textContent = '';
        } else {
            el.textContent = username.charAt(0).toUpperCase();
        }
    });

    if (supabaseClient) {
        const { count: pCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
        document.getElementById('profile-posts-count').textContent = pCount || 0;

        const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
        document.getElementById('profile-followers-count').textContent = fCount || 0;

        const { count: fgCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
        document.getElementById('profile-following-count').textContent = fgCount || 0;
    }
}

// Edit Profile Modal Controllers
function openEditProfileModal() {
    const username = localStorage.getItem('currentUsername');
    const bio = document.getElementById('profile-bio-text').textContent;
    
    document.getElementById('edit-username-input').value = username;
    document.getElementById('edit-bio-input').value = bio;
    document.getElementById('edit-profile-modal').style.display = 'flex';
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').style.display = 'none';
}

async function saveProfileChanges() {
    const oldUsername = localStorage.getItem('currentUsername');
    const newUsername = document.getElementById('edit-username-input').value.trim();
    const newBio = document.getElementById('edit-bio-input').value.trim();

    if (!newUsername) {
        alert("Username cannot be empty");
        return;
    }

    if (supabaseClient && newUsername !== oldUsername) {
        await supabaseClient.from('users').update({ username: newUsername, bio: newBio }).eq('username', oldUsername);
    }

    localStorage.setItem('currentUsername', newUsername);
    localStorage.setItem(`userBio_${newUsername}`, newBio);
    
    closeEditProfileModal();
    loadUserData(newUsername);
    alert("Profile updated successfully!");
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const imgSrc = e.target.result;
        const username = localStorage.getItem('currentUsername');
        localStorage.setItem(`userAvatar_${username}`, imgSrc);
        loadUserData(username);
        alert("Profile picture updated!");
    };
    reader.readAsDataURL(file);
}

async function submitNewPost() {
    const imgUrl = document.getElementById('create-img-url').value.trim();
    const caption = document.getElementById('create-caption').value.trim();
    const username = localStorage.getItem('currentUsername');

    if (!imgUrl) {
        alert("Provide image URL");
        return;
    }

    if (supabaseClient) {
        await supabaseClient.from('posts').insert([{ username, image_url: imgUrl, caption }]);
    }

    alert("Posted successfully!");
    document.getElementById('create-img-url').value = '';
    document.getElementById('create-caption').value = '';
    switchView('insta-feed-container');
}

async function loadFeedPosts() {
    const feedList = document.getElementById('feed-posts-list');
    if (!feedList) return;

    let posts = [];
    if (supabaseClient) {
        const { data } = await supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
        if (data) posts = data;
    }

    if (posts.length === 0) {
        feedList.innerHTML = `<div style="text-align:center; padding:40px; color:#8e8e8e;">No posts yet</div>`;
        return;
    }

    feedList.innerHTML = '';
    posts.forEach(post => {
        const userAvatar = localStorage.getItem(`userAvatar_${post.username}`) || '';
        const avatarStyle = userAvatar ? `background-image: url('${userAvatar}');` : '';

        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <div class="post-header">
                <div class="avatar" style="width: 32px; height: 32px; font-size: 13px; ${avatarStyle}">${userAvatar ? '' : post.username.charAt(0).toUpperCase()}</div>
                <b style="font-size: 14px;">${post.username}</b>
            </div>
            <img src="${post.image_url}" class="post-img">
            <div class="post-actions">
                <div>
                    <i class="fa-regular fa-heart" style="margin-right: 16px;" onclick="this.classList.toggle('fa-regular'); this.classList.toggle('fa-solid'); this.style.color = this.classList.contains('fa-solid') ? '#ed4956' : '#fff';"></i>
                    <i class="fa-regular fa-comment" style="margin-right: 16px;"></i>
                    <i class="fa-regular fa-paper-plane"></i>
                </div>
                <i class="fa-regular fa-bookmark" onclick="this.classList.toggle('fa-regular'); this.classList.toggle('fa-solid');"></i>
            </div>
            <div class="post-details">
                <p><b>${post.username}</b> ${post.caption || ''}</p>
            </div>
        `;
        feedList.appendChild(card);
    });
}

async function handleUserSearch(query) {
    const resultsList = document.getElementById('search-results-list');
    if (!query.trim()) {
        resultsList.innerHTML = '';
        return;
    }

    if (supabaseClient) {
        const { data } = await supabaseClient.from('users').select('username, bio').ilike('username', `%${query}%`);
        resultsList.innerHTML = '';
        if (data) {
            data.forEach(user => {
                const row = document.createElement('div');
                row.style.cssText = "display:flex; align-items:center; padding:10px 16px; gap:12px;";
                row.innerHTML = `<div class="avatar" style="width:40px; height:40px;">${user.username.charAt(0).toUpperCase()}</div><b>${user.username}</b>`;
                resultsList.appendChild(row);
            });
        }
    }
}
