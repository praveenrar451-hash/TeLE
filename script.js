const SUPABASE_URL = "https://ydjbojsqeujahgqinfmk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI";

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
}

window.addEventListener('DOMContentLoaded', () => {
    const activeUser = localStorage.getItem('currentUsername');
    if (activeUser && activeUser.trim() !== "") {
        // Agar user pehle se logged in hai, toh login container chhupao aur feed dikhao
        document.getElementById('auth-container').classList.remove('active');
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-app-content').style.display = 'flex';
        
        const lastView = localStorage.getItem('activeAppView') || 'insta-feed-container';
        switchView(lastView);
        loadUserData(activeUser);
        loadFeedPosts();
        updateUserOnlineStatus(activeUser, true);
    } else {
        // Agar logged in nahi hai, toh login page dikhao
        document.getElementById('auth-container').classList.add('active');
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('main-app-content').style.display = 'none';
    }

    window.addEventListener('beforeunload', () => {
        const activeUser = localStorage.getItem('currentUsername');
        if (activeUser) {
            updateUserOnlineStatus(activeUser, false);
        }
    });
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
            await supabaseClient.from('users').insert([{ username: usernameInput, bio: 'Digital Creator', avatar_url: '', is_online: true }]);
        } else {
            await supabaseClient.from('users').update({ is_online: true }).eq('username', usernameInput);
        }
    }

    saveAccountToList(usernameInput);
    localStorage.setItem('currentUsername', usernameInput);
    document.getElementById('auth-container').classList.remove('active');
    document.getElementById('main-app-content').style.display = 'flex';
    switchView('insta-feed-container');
    loadUserData(usernameInput);
    loadFeedPosts();
}

async function updateUserOnlineStatus(username, status) {
    if (!supabaseClient || !username) return;
    await supabaseClient.from('users').update({ is_online: status, last_seen: new Date() }).eq('username', username);
}

function saveAccountToList(username) {
    let accounts = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
    if (!accounts.includes(username)) {
        accounts.push(username);
        localStorage.setItem('savedAccounts', JSON.stringify(accounts));
    }
}

function openSwitchAccountModal() {
    const listEl = document.getElementById('saved-accounts-list');
    const accounts = JSON.parse(localStorage.getItem('savedAccounts') || '[]');
    const current = localStorage.getItem('currentUsername');

    listEl.innerHTML = '';
    if (accounts.length === 0) {
        listEl.innerHTML = `<div style="color:#8e8e8e; font-size:13px; text-align:center;">No saved accounts</div>`;
    } else {
        accounts.forEach(acc => {
            const row = document.createElement('div');
            row.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:#121212; border-radius:6px;";
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar" style="width:30px; height:30px; font-size:12px;">${acc.charAt(0).toUpperCase()}</div>
                    <span style="font-size:14px; font-weight:${acc === current ? 'bold' : 'normal'}">${acc}</span>
                </div>
                ${acc !== current ? `<button onclick="switchToAccount('${acc}')" style="background:#0095f6; border:none; color:#fff; padding:4px 10px; border-radius:4px; font-size:12px; cursor:pointer;">Switch</button>` : ''}
            `;
            listEl.appendChild(row);
        });
    }
    document.getElementById('switch-account-modal').style.display = 'flex';
}

function closeSwitchAccountModal() {
    document.getElementById('switch-account-modal').style.display = 'none';
}

function switchToAccount(username) {
    const prevUser = localStorage.getItem('currentUsername');
    if (prevUser) updateUserOnlineStatus(prevUser, false);
    localStorage.setItem('currentUsername', username);
    location.reload();
}

async function addAndSwitchAccount() {
    const inputAcc = document.getElementById('new-switch-username').value.trim();
    if (!inputAcc) return;
    
    if (supabaseClient) {
        const { data } = await supabaseClient.from('users').select('*').eq('username', inputAcc);
        if (!data || data.length === 0) {
            await supabaseClient.from('users').insert([{ username: inputAcc, bio: 'Digital Creator', avatar_url: '', is_online: true }]);
        } else {
            await supabaseClient.from('users').update({ is_online: true }).eq('username', inputAcc);
        }
    }
    
    saveAccountToList(inputAcc);
    localStorage.setItem('currentUsername', inputAcc);
    location.reload();
}

let activeChatSubscription = null;

window.switchView = function(viewId) {
    if (activeChatSubscription && viewId !== 'chatroom-container') {
        supabaseClient.removeChannel(activeChatSubscription);
        activeChatSubscription = null;
    }

    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active', 'active-view'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active', 'active-view');
        localStorage.setItem('activeAppView', viewId);
    }
    if (viewId === 'insta-feed-container') loadFeedPosts();
    if (viewId === 'explore-container') handleUserSearch('');
    if (viewId === 'chat-container') openChatList();
    if (viewId === 'reels-container') loadReelsFeed();
};

async function loadUserData(username) {
    saveAccountToList(username);
    document.getElementById('top-profile-username').textContent = username;
    document.getElementById('my-profile-display-name').textContent = username;

    if (supabaseClient) {
        const { data: userData } = await supabaseClient.from('users').select('*').eq('username', username).single();
        if (userData) {
            const userBio = userData.bio || 'Digital Creator';
            const userAvatar = userData.avatar_url || '';

            document.getElementById('profile-bio-text').textContent = userBio;

            const avatars = [
                document.getElementById('my-profile-avatar'), 
                document.getElementById('nav-mini-avatar')
            ];
            
            avatars.forEach(el => {
                if (!el) return;
                if (userAvatar) {
                    el.style.backgroundImage = `url('${userAvatar}')`;
                    el.textContent = '';
                } else {
                    el.style.backgroundImage = '';
                    el.textContent = username.charAt(0).toUpperCase();
                }
            });
        }

        const { count: pCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
        document.getElementById('profile-posts-count').textContent = pCount || 0;

        const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
        document.getElementById('profile-followers-count').textContent = fCount || 0;

        const { count: fgCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
        document.getElementById('profile-following-count').textContent = fgCount || 0;

        loadUserPostsGrid(username, 'my-profile-grid');
    }
}

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

    if (!newUsername) return;

    if (supabaseClient) {
        await supabaseClient.from('users').update({ username: newUsername, bio: newBio }).eq('username', oldUsername);
    }

    localStorage.setItem('currentUsername', newUsername);
    saveAccountToList(newUsername);
    closeEditProfileModal();
    loadUserData(newUsername);
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const imgSrc = e.target.result;
        const username = localStorage.getItem('currentUsername');
        if (supabaseClient) {
            await supabaseClient.from('users').update({ avatar_url: imgSrc }).eq('username', username);
        }
        loadUserData(username);
    };
    reader.readAsDataURL(file);
}

async function submitNewPost() {
    const imgUrl = document.getElementById('create-img-url').value.trim();
    const caption = document.getElementById('create-caption').value.trim();
    const username = localStorage.getItem('currentUsername');

    if (!imgUrl) return;

    if (supabaseClient) {
        await supabaseClient.from('posts').insert([{ username, image_url: imgUrl, caption }]);
    }

    document.getElementById('create-img-url').value = '';
    document.getElementById('create-caption').value = '';
    switchView('insta-feed-container');
}

async function loadFeedPosts() {
    const feedList = document.getElementById('feed-posts-list');
    if (!feedList) return;

    let posts = [];
    let usersMap = {};
    if (supabaseClient) {
        const { data: usersData } = await supabaseClient.from('users').select('username, avatar_url');
        if (usersData) {
            usersData.forEach(u => { usersMap[u.username] = u.avatar_url; });
        }

        const { data } = await supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
        if (data) posts = data;
    }

    if (posts.length === 0) {
        feedList.innerHTML = `<div style="text-align:center; padding:40px; color:#8e8e8e;">No posts yet</div>`;
        return;
    }

    feedList.innerHTML = '';
    posts.forEach(post => {
        const userAvatar = usersMap[post.username] || '';
        const avatarStyle = userAvatar ? `background-image: url('${userAvatar}');` : '';

        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <div class="post-header" onclick="viewUserProfile('${post.username}')" style="cursor:pointer;">
                <div class="avatar" style="width: 32px; height: 32px; font-size: 13px; ${avatarStyle}">${userAvatar ? '' : post.username.charAt(0).toUpperCase()}</div>
                <b style="font-size: 14px;">${post.username}</b>
            </div>
            <img src="${post.image_url}" class="post-img">
            <div class="post-actions">
                <div>
                    <i class="fa-regular fa-heart" style="margin-right: 16px;" onclick="this.classList.toggle('fa-regular'); this.classList.toggle('fa-solid'); this.style.color = this.classList.contains('fa-solid') ? '#ed4956' : '#fff';"></i>
                    <i class="fa-regular fa-comment" style="margin-right: 16px;"></i>
                    <i class="fa-regular fa-paper-plane" onclick="openChatWith('${post.username}')"></i>
                </div>
                <i class="fa-regular fa-bookmark" onclick="toggleSavePost('${post.id}', this)"></i>
            </div>
            <div class="post-details">
                <p><b>${post.username}</b> ${post.caption || ''}</p>
            </div>
        `;
        feedList.appendChild(card);
    });
}

async function toggleSavePost(postId, iconEl) {
    const currentUser = localStorage.getItem('currentUsername');
    if (!supabaseClient) return;

    const isSaved = iconEl.classList.contains('fa-solid');
    if (!isSaved) {
        iconEl.classList.remove('fa-regular');
        iconEl.classList.add('fa-solid');
        await supabaseClient.from('saved_posts').insert([{ username: currentUser, post_id: postId }]);
    } else {
        iconEl.classList.remove('fa-solid');
        iconEl.classList.add('fa-regular');
        await supabaseClient.from('saved_posts').delete().eq('username', currentUser).eq('post_id', postId);
    }
}

async function loadSavedPostsGrid() {
    const gridEl = document.getElementById('my-profile-grid');
    const currentUser = localStorage.getItem('currentUsername');
    if (!supabaseClient || !gridEl) return;

    const { data: savedData } = await supabaseClient.from('saved_posts').select('post_id').eq('username', currentUser);
    gridEl.innerHTML = '';

    if (savedData && savedData.length > 0) {
        const postIds = savedData.map(s => s.post_id);
        const { data: posts } = await supabaseClient.from('posts').select('*').in('id', postIds);
        
        if (posts && posts.length > 0) {
            posts.forEach(post => {
                const cell = document.createElement('div');
                cell.style.cssText = "aspect-ratio: 1/1; background-size: cover; background-position: center;";
                cell.style.backgroundImage = `url('${post.image_url}')`;
                gridEl.appendChild(cell);
            });
            return;
        }
    }
    gridEl.innerHTML = `<div style="grid-column: span 3; text-align:center; padding:30px; color:#8e8e8e; font-size:13px;">No saved posts</div>`;
}

async function loadReelsFeed() {
    const reelsContainer = document.getElementById('reels-container');
    if (!reelsContainer) return;

    let reels = [];
    if (supabaseClient) {
        const { data } = await supabaseClient.from('reels').select('*').order('created_at', { ascending: false });
        if (data) reels = data;
    }

    reelsContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid #262626; background:#000;">
            <b>Reels</b>
        </div>
        <div id="reels-feed-list" style="flex:1; overflow-y:auto; scroll-snap-type: y mandatory;"></div>
    `;

    const feedList = document.getElementById('reels-feed-list');
    if (reels.length === 0) {
        feedList.innerHTML = `<div style="text-align:center; padding:50px; color:#8e8e8e;">No reels available yet</div>`;
        return;
    }

    reels.forEach(reel => {
        const videoCard = document.createElement('div');
        videoCard.style.cssText = "height:100%; scroll-snap-align: start; position:relative; background:#000; display:flex; justify-content:center; align-items:center;";
        videoCard.innerHTML = `
            <video src="${reel.video_url}" loop autoplay muted style="width:100%; height:100%; object-fit:cover;"></video>
            <div style="position:absolute; bottom:20px; left:15px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.8);">
                <b>@${reel.username}</b>
                <p style="font-size:13px; margin-top:5px;">${reel.caption || ''}</p>
            </div>
        `;
        feedList.appendChild(videoCard);
    });
}

// HOME / EXPLORE SCREEN SEARCH (Opens User Profile ID)
async function handleUserSearch(query) {
    const resultsList = document.getElementById('search-results-list');
    if (!supabaseClient || !resultsList) return;

    let queryBuilder = supabaseClient.from('users').select('username, bio, avatar_url');
    if (query.trim()) {
        queryBuilder = queryBuilder.ilike('username', `%${query}%`);
    }

    const { data } = await queryBuilder;
    resultsList.innerHTML = '';
    
    if (data && data.length > 0) {
        data.forEach(user => {
            const avatarStyle = user.avatar_url ? `background-image: url('${user.avatar_url}');` : '';
            const row = document.createElement('div');
            row.style.cssText = "display:flex; align-items:center; padding:10px 0; gap:12px; cursor:pointer; border-bottom:1px solid #1a1a1a;";
            row.onclick = () => viewUserProfile(user.username); // Opens Profile ID
            row.innerHTML = `
                <div class="avatar" style="width:44px; height:44px; font-size:16px; ${avatarStyle}">${user.avatar_url ? '' : user.username.charAt(0).toUpperCase()}</div>
                <div>
                    <b style="font-size:14px; display:block;">${user.username}</b>
                    <span style="font-size:12px; color:#8e8e8e;">${user.bio || 'Digital Creator'}</span>
                </div>
            `;
            resultsList.appendChild(row);
        });
    } else {
        resultsList.innerHTML = `<div style="text-align:center; padding:20px; color:#8e8e8e; font-size:13px;">No users found</div>`;
    }
}

let viewingTargetUser = '';

async function viewUserProfile(username) {
    const currentUser = localStorage.getItem('currentUsername');
    if (username === currentUser) {
        switchView('profile-container');
        return;
    }

    viewingTargetUser = username;
    document.getElementById('other-profile-username-top').textContent = username;
    document.getElementById('other-profile-display-name').textContent = username;

    const avatarEl = document.getElementById('other-profile-avatar');
    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = username.charAt(0).toUpperCase();

    if (supabaseClient) {
        const { data: userData } = await supabaseClient.from('users').select('bio, avatar_url').eq('username', username).single();
        if (userData) {
            if (userData.bio) document.getElementById('other-profile-bio-text').textContent = userData.bio;
            if (userData.avatar_url) {
                avatarEl.style.backgroundImage = `url('${userData.avatar_url}')`;
                avatarEl.textContent = '';
            }
        }

        const { count: pCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
        document.getElementById('other-profile-posts-count').textContent = pCount || 0;

        const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
        document.getElementById('other-profile-followers-count').textContent = fCount || 0;

        const { count: fgCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
        document.getElementById('other-profile-following-count').textContent = fgCount || 0;

        const { data: followData } = await supabaseClient.from('follows').select('*').eq('follower', currentUser).eq('following', username);
        const followBtn = document.getElementById('other-follow-btn');
        if (followData && followData.length > 0) {
            followBtn.textContent = 'Following';
            followBtn.style.background = '#363636';
        } else {
            followBtn.textContent = 'Follow';
            followBtn.style.background = '#0095f6';
        }

        loadUserPostsGrid(username, 'other-profile-grid');
    }

    switchView('user-profile-container');
}

async function toggleFollowUser() {
    const currentUser = localStorage.getItem('currentUsername');
    const followBtn = document.getElementById('other-follow-btn');
    if (!supabaseClient) return;

    if (followBtn.textContent === 'Follow') {
        await supabaseClient.from('follows').insert([{ follower: currentUser, following: viewingTargetUser }]);
        followBtn.textContent = 'Following';
        followBtn.style.background = '#363636';
    } else {
        await supabaseClient.from('follows').delete().eq('follower', currentUser).eq('following', viewingTargetUser);
        followBtn.textContent = 'Follow';
        followBtn.style.background = '#0095f6';
    }
    
    const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', viewingTargetUser);
    document.getElementById('other-profile-followers-count').textContent = fCount || 0;
}

async function loadUserPostsGrid(username, gridId) {
    const gridEl = document.getElementById(gridId);
    if (!gridEl || !supabaseClient) return;

    const { data } = await supabaseClient.from('posts').select('image_url').eq('username', username).order('created_at', { ascending: false });
    gridEl.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(post => {
            const cell = document.createElement('div');
            cell.style.cssText = "aspect-ratio: 1/1; background-size: cover; background-position: center;";
            cell.style.backgroundImage = `url('${post.image_url}')`;
            gridEl.appendChild(cell);
        });
    }
}

async function openFollowersList(username) {
    createFollowModalDOM();
    const modal = document.getElementById('follow-list-modal');
    document.getElementById('follow-modal-title').textContent = "Followers";
    modal.style.display = 'flex';
    const listContainer = document.getElementById('follow-modal-users-list');
    listContainer.innerHTML = '<div style="text-align:center; color:#8e8e8e; padding:20px;">Loading...</div>';

    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('follows').select('follower').eq('following', username);
    listContainer.innerHTML = '';

    if (data && data.length > 0) {
        for (let item of data) {
            const { data: uData } = await supabaseClient.from('users').select('username, bio, avatar_url').eq('username', item.follower).single();
            if (uData) appendUserRowToModal(uData, listContainer);
        }
    } else {
        listContainer.innerHTML = '<div style="text-align:center; color:#8e8e8e; padding:20px;">No followers yet</div>';
    }
}

async function openFollowingList(username) {
    createFollowModalDOM();
    const modal = document.getElementById('follow-list-modal');
    document.getElementById('follow-modal-title').textContent = "Following";
    modal.style.display = 'flex';
    const listContainer = document.getElementById('follow-modal-users-list');
    listContainer.innerHTML = '<div style="text-align:center; color:#8e8e8e; padding:20px;">Loading...</div>';

    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('follows').select('following').eq('follower', username);
    listContainer.innerHTML = '';

    if (data && data.length > 0) {
        for (let item of data) {
            const { data: uData } = await supabaseClient.from('users').select('username, bio, avatar_url').eq('username', item.following).single();
            if (uData) appendUserRowToModal(uData, listContainer);
        }
    } else {
        listContainer.innerHTML = '<div style="text-align:center; color:#8e8e8e; padding:20px;">Not following anyone</div>';
    }
}

function createFollowModalDOM() {
    if (document.getElementById('follow-list-modal')) return;
    const div = document.createElement('div');
    div.id = 'follow-list-modal';
    div.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; justify-content:center; align-items:center;";
    div.innerHTML = `
        <div style="background:#262626; width:90%; max-width:400px; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; max-height:80vh;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #363636;">
                <b id="follow-modal-title" style="font-size:16px; color:#fff;">Users</b>
                <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:18px; color:#fff;" onclick="closeFollowModal()"></i>
            </div>
            <div id="follow-modal-users-list" style="overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:10px;"></div>
        </div>
    `;
    document.body.appendChild(div);
}

function appendUserRowToModal(user, container) {
    const avatarStyle = user.avatar_url ? `background-image: url('${user.avatar_url}');` : '';
    const row = document.createElement('div');
    row.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:8px; cursor:pointer;";
    row.onclick = () => {
        closeFollowModal();
        viewUserProfile(user.username);
    };
    row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar" style="width:36px; height:36px; font-size:14px; ${avatarStyle}">${user.avatar_url ? '' : user.username.charAt(0).toUpperCase()}</div>
            <div>
                <b style="font-size:14px; display:block; color:#fff;">${user.username}</b>
                <span style="font-size:12px; color:#8e8e8e;">${user.bio || 'Digital Creator'}</span>
            </div>
        </div>
    `;
    container.appendChild(row);
}

function closeFollowModal() {
    const modal = document.getElementById('follow-list-modal');
    if (modal) modal.style.display = 'none';
}

// CHAT LIST WITH BUILT-IN SEARCH (Tapping opens Chat Room directly)
async function openChatList() {
    switchView('chat-container');
    const chatContainer = document.getElementById('chat-container');
    
    // Ensure chat container structure includes search bar
    chatContainer.innerHTML = `
        <div class="top-bar">
            <i class="fa-solid fa-arrow-left" style="cursor:pointer;" onclick="switchView('insta-feed-container')"></i>
            <b>Messages</b>
            <div></div>
        </div>
        <div style="padding: 10px 16px; border-bottom: 1px solid #262626;">
            <input type="text" id="chat-search-input" placeholder="Search messages or users..." oninput="filterChatUsers(this.value)" style="width:100%; background:#262626; border:none; padding:8px 12px; border-radius:8px; color:#fff; outline:none; font-size:13px;">
        </div>
        <div id="chat-users-list" style="flex:1; overflow-y:auto;"></div>
    `;

    await renderChatUsersList('');
}

async function renderChatUsersList(filterQuery) {
    const chatUsersList = document.getElementById('chat-users-list');
    const currentUser = localStorage.getItem('currentUsername');
    if (!supabaseClient || !chatUsersList) return;

    let queryBuilder = supabaseClient.from('users').select('username, bio, avatar_url, is_online').neq('username', currentUser);
    if (filterQuery.trim()) {
        queryBuilder = queryBuilder.ilike('username', `%${filterQuery}%`);
    }

    const { data } = await queryBuilder;
    chatUsersList.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(user => {
            const avatarStyle = user.avatar_url ? `background-image: url('${user.avatar_url}');` : '';
            const onlineDot = user.is_online ? `<span style="width:8px; height:8px; background:#31a24c; border-radius:50%; display:inline-block; margin-left:6px;"></span>` : '';
            const row = document.createElement('div');
            row.style.cssText = "display:flex; align-items:center; padding:10px 16px; gap:12px; cursor:pointer; justify-content:space-between;";
            row.onclick = () => openChatWith(user.username); // Opens Chat Directly
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="avatar" style="width:44px; height:44px; font-size:16px; ${avatarStyle}">${user.avatar_url ? '' : user.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <b style="font-size:14px; display:flex; align-items:center;">${user.username} ${onlineDot}</b>
                        <span style="font-size:12px; color:#8e8e8e;">${user.is_online ? 'Active now' : 'Offline'}</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right" style="font-size:12px; color:#8e8e8e;"></i>
            `;
            chatUsersList.appendChild(row);
        });
    } else {
        chatUsersList.innerHTML = `<div style="text-align:center; padding:40px; color:#8e8e8e; font-size:13px;">No users found.</div>`;
    }
}

function filterChatUsers(query) {
    renderChatUsersList(query);
}

let activeChatUser = '';

async function openChatWith(username) {
    activeChatUser = username;
    switchView('chatroom-container');
    document.getElementById('chatroom-title').textContent = username;
    
    const avatarEl = document.getElementById('chatroom-avatar');
    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = username.charAt(0).toUpperCase();

    if (supabaseClient) {
        const { data: userData } = await supabaseClient.from('users').select('avatar_url, is_online').eq('username', username).single();
        if (userData) {
            if (userData.avatar_url) {
                avatarEl.style.backgroundImage = `url('${userData.avatar_url}')`;
                avatarEl.textContent = '';
            }
            document.getElementById('chatroom-title').innerHTML = `${username} <span style="font-size:11px; color:${userData.is_online ? '#31a24c':'#8e8e8e'}; display:block;">${userData.is_online ? 'Online' : 'Offline'}</span>`;
        }
    }
    
    await loadChatMessages();
    setupRealtimeChat();
}

async function loadChatMessages() {
    const msgContainer = document.getElementById('chatroom-messages');
    const currentUser = localStorage.getItem('currentUsername');
    if (!msgContainer) return;
    msgContainer.innerHTML = '';

    if (!supabaseClient) return;

    const { data } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender.eq.${currentUser},receiver.eq.${activeChatUser}),and(sender.eq.${activeChatUser},receiver.eq.${currentUser})`)
        .order('created_at', { ascending: true });

    if (data && data.length > 0) {
        data.forEach(msg => {
            appendMessageBubble(msg, currentUser);
        });
    } else {
        msgContainer.innerHTML = `<div style="text-align:center; color:#8e8e8e; font-size:13px; margin-top:20px;">No messages yet</div>`;
    }
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function appendMessageBubble(msg, currentUser) {
    const msgContainer = document.getElementById('chatroom-messages');
    if (!msgContainer) return;
    const placeholder = msgContainer.querySelector('div[style*="text-align:center"]');
    if (placeholder) placeholder.remove();

    const isMe = msg.sender === currentUser;
    const bubble = document.createElement('div');
    bubble.style.cssText = `max-width: 70%; padding: 10px 14px; border-radius: 14px; font-size: 14px; word-break: break-word; align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? '#0095f6' : '#262626'}; color: #fff; display:flex; flex-direction:column; gap:4px;`;
    
    let contentHtml = '';
    if (msg.type === 'image') {
        contentHtml = `<img src="${msg.message}" style="max-width:100%; border-radius:8px;">`;
    } else if (msg.type === 'audio') {
        contentHtml = `<audio controls src="${msg.message}" style="height:35px; width:200px;"></audio>`;
    } else {
        contentHtml = `<span>${msg.message}</span>`;
    }

    const seenTick = isMe ? `<span style="font-size:10px; align-self:flex-end; color:${msg.is_seen ? '#53bdeb' : '#a8a8a8'};">${msg.is_seen ? 'Seen' : 'Sent'}</span>` : '';

    bubble.innerHTML = `${contentHtml} ${seenTick}`;
    msgContainer.appendChild(bubble);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

// REAL-TIME CHAT SYNC FIX
function setupRealtimeChat() {
    if (!supabaseClient) return;
    if (activeChatSubscription) {
        supabaseClient.removeChannel(activeChatSubscription);
    }

    const channelName = `public:messages_${Date.now()}`;
    activeChatSubscription = supabaseClient
        .channel(channelName)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            payload => {
                const newMsg = payload.new;
                const currentUser = localStorage.getItem('currentUsername');
                
                if (
                    (newMsg.sender === currentUser && newMsg.receiver === activeChatUser) ||
                    (newMsg.sender === activeChatUser && newMsg.receiver === currentUser)
                ) {
                    appendMessageBubble(newMsg, currentUser);
                    if (newMsg.receiver === currentUser) {
                        supabaseClient.from('messages').update({ is_seen: true }).eq('id', newMsg.id);
                    }
                }
            }
        )
        .subscribe();
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chatroom-input');
    const text = inputEl.value.trim();
    const currentUser = localStorage.getItem('currentUsername');

    if (!text || !supabaseClient) return;

    inputEl.value = '';
    await supabaseClient.from('messages'].insert([
        { sender: currentUser, receiver: activeChatUser, message: text, type: 'text', is_seen: false }
    ]);
}

// Instant message send fix wrapper
async function sendChatMessage() {
    const inputEl = document.getElementById('chatroom-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    const currentUser = localStorage.getItem('currentUsername');

    if (!text || !supabaseClient) return;

    inputEl.value = '';
    const { data, error } = await supabaseClient.from('messages').insert([
        { sender: currentUser, receiver: activeChatUser, message: text, type: 'text', is_seen: false }
    ]).select();

    if (!error && data && data.length > 0) {
        appendMessageBubble(data[0], currentUser);
    }
}

async function sendChatPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const imgSrc = e.target.result;
        const currentUser = localStorage.getItem('currentUsername');
        const { data, error } = await supabaseClient.from('messages').insert([
            { sender: currentUser, receiver: activeChatUser, message: imgSrc, type: 'image', is_seen: false }
        ]).select();

        if (!error && data && data.length > 0) {
            appendMessageBubble(data[0], currentUser);
        }
    };
    reader.readAsDataURL(file);
}

let mediaRecorder = null;
let audioChunks = [];

async function recordVoiceNote() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Audio recording not supported");
        return;
    }

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async function() {
                    const base64Audio = reader.result;
                    const currentUser = localStorage.getItem('currentUsername');
                    if (supabaseClient) {
                        const { data, error } = await supabaseClient.from('messages').insert([
                            { sender: currentUser, receiver: activeChatUser, message: base64Audio, type: 'audio', is_seen: false }
                        ]).select();

                        if (!error && data && data.length > 0) {
                            appendMessageBubble(data[0], currentUser);
                        }
                    }
                };
            };

            mediaRecorder.start();
            alert("Recording started... Tap microphone icon again to stop and send.");
        } catch (err) {
            alert("Microphone permission denied.");
        }
    } else if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        alert("Voice note sent!");
    }
}

// INSTAGRAM-STYLE CALLING UI OVERLAY
function startAudioCall() {
    showCallUI('audio', activeChatUser);
}

function startVideoCall() {
    showCallUI('video', activeChatUser);
}

function showCallUI(type, targetUser) {
    let callOverlay = document.getElementById('instagram-call-overlay');
    if (!callOverlay) {
        callOverlay = document.createElement('div');
        callOverlay.id = 'instagram-call-overlay';
        callOverlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#1a1a1a; z-index:9999; display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:50px 20px; color:#fff;";
        document.body.appendChild(callOverlay);
    }

    callOverlay.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:15px; margin-top:40px;">
            <div class="avatar" style="width:90px; height:90px; font-size:35px; background-color:#363636;">${targetUser.charAt(0).toUpperCase()}</div>
            <h2 style="font-size:22px; font-weight:500;">${targetUser}</h2>
            <p style="font-size:14px; color:#a8a8a8;" id="call-status-text">Ringing...</p>
        </div>
        <div style="display:flex; gap:30px; margin-bottom:50px; align-items:center;">
            <button onclick="toggleCallMute(this)" style="width:55px; height:55px; border-radius:50%; background:#262626; border:none; color:#fff; font-size:20px; cursor:pointer;"><i class="fa-solid fa-microphone"></i></button>
            <button onclick="endCallScreen()" style="width:65px; height:65px; border-radius:50%; background:#ed4956; border:none; color:#fff; font-size:24px; cursor:pointer;"><i class="fa-solid fa-phone-slash"></i></button>
            ${type === 'video' ? `<button onclick="toggleCamera(this)" style="width:55px; height:55px; border-radius:50%; background:#262626; border:none; color:#fff; font-size:20px; cursor:pointer;"><i class="fa-solid fa-video"></i></button>` : ''}
        </div>
    `;
    callOverlay.style.display = 'flex';
}

function endCallScreen() {
    const callOverlay = document.getElementById('instagram-call-overlay');
    if (callOverlay) {
        callOverlay.style.display = 'none';
    }
}

function toggleCallMute(btn) {
    const isMuted = btn.style.background === 'rgb(54, 54, 54)';
    // Toggle style state
    btn.style.background = isMuted ? '#fff' : '#262626';
    btn.style.color = isMuted ? '#000' : '#fff';
}

function toggleCamera(btn) {
    const isOff = btn.style.background === 'rgb(54, 54, 54)';
    btn.style.background = isOff ? '#fff' : '#262626';
    btn.style.color = isOff ? '#000' : '#fff';
}

function openChatWithUser() {
    openChatWith(viewingTargetUser);
        }
