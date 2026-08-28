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
            await supabaseClient.from('users').insert([{ username: usernameInput, bio: 'Digital Creator', avatar_url: '' }]);
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
            row.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:#121212; border-radius:6px; margin-bottom:6px;";
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar" style="width:30px; height:30px; font-size:12px;">${acc.charAt(0).toUpperCase()}</div>
                    <span style="font-size:14px; font-weight:${acc === current ? 'bold' : 'normal'}">${acc} ${acc === current ? '(Active)' : ''}</span>
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
    localStorage.setItem('currentUsername', username);
    location.reload();
}

async function addAndSwitchAccount() {
    const inputAcc = document.getElementById('new-switch-username').value.trim();
    if (!inputAcc) return;
    
    if (supabaseClient) {
        const { data } = await supabaseClient.from('users').select('*').eq('username', inputAcc);
        if (!data || data.length === 0) {
            await supabaseClient.from('users').insert([{ username: inputAcc, bio: 'Digital Creator', avatar_url: '' }]);
        }
    }
    
    saveAccountToList(inputAcc);
    localStorage.setItem('currentUsername', inputAcc);
    location.reload();
}

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
                document.getElementById('nav-mini-avatar'),
                document.getElementById('feed-story-avatar')
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

// Edit Profile Modal
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

    if (supabaseClient) {
        await supabaseClient.from('users').update({ username: newUsername, bio: newBio }).eq('username', oldUsername);
    }

    localStorage.setItem('currentUsername', newUsername);
    saveAccountToList(newUsername);
    
    closeEditProfileModal();
    loadUserData(newUsername);
    alert("Profile updated successfully!");
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
                <i class="fa-regular fa-bookmark" onclick="this.classList.toggle('fa-regular'); this.classList.toggle('fa-solid');"></i>
            </div>
            <div class="post-details">
                <p><b>${post.username}</b> ${post.caption || ''}</p>
            </div>
        `;
        feedList.appendChild(card);
    });
}

// SEARCH & OTHER USER PROFILE LOGIC
async function handleUserSearch(query) {
    const resultsList = document.getElementById('search-results-list');
    if (!supabaseClient) return;

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
            row.onclick = () => viewUserProfile(user.username);
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
            if (userData.bio) {
                document.getElementById('other-profile-bio-text').textContent = userData.bio;
            }
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

// CHAT SECTION LOGIC
async function openChatList() {
    switchView('chat-container');
    const chatUsersList = document.getElementById('chat-users-list');
    const currentUser = localStorage.getItem('currentUsername');
    
    if (!supabaseClient) return;

    const { data } = await supabaseClient.from('users').select('username, bio, avatar_url').neq('username', currentUser);
    chatUsersList.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(user => {
            const avatarStyle = user.avatar_url ? `background-image: url('${user.avatar_url}');` : '';
            const row = document.createElement('div');
            row.style.cssText = "display:flex; align-items:center; padding:10px 16px; gap:12px; cursor:pointer; justify-content:space-between;";
            row.onclick = () => openChatWith(user.username);
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="avatar" style="width:44px; height:44px; font-size:16px; ${avatarStyle}">${user.avatar_url ? '' : user.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <b style="font-size:14px; display:block;">${user.username}</b>
                        <span style="font-size:12px; color:#8e8e8e;">${user.bio || 'Active user'}</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right" style="font-size:12px; color:#8e8e8e;"></i>
            `;
            chatUsersList.appendChild(row);
        });
    } else {
        chatUsersList.innerHTML = `<div style="text-align:center; padding:40px; color:#8e8e8e; font-size:13px;">No other users found to chat.</div>`;
    }
}

let activeChatUser = '';
let activeChatSubscription = null;

async function openChatWith(username) {
    activeChatUser = username;
    switchView('chatroom-container');
    document.getElementById('chatroom-title').textContent = username;
    
    const avatarEl = document.getElementById('chatroom-avatar');
    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = username.charAt(0).toUpperCase();

    if (supabaseClient) {
        const { data: userData } = await supabaseClient.from('users').select('avatar_url').eq('username', username).single();
        if (userData && userData.avatar_url) {
            avatarEl.style.backgroundImage = `url('${userData.avatar_url}')`;
            avatarEl.textContent = '';
        }
    }
    
    await loadChatMessages();
    setupRealtimeChat();
}

async function loadChatMessages() {
    const msgContainer = document.getElementById('chatroom-messages');
    const currentUser = localStorage.getItem('currentUsername');
    msgContainer.innerHTML = '';

    if (!supabaseClient) return;

    const { data } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender.eq.${currentUser},receiver.eq.${activeChatUser}),and(sender.eq.${activeChatUser},receiver.eq.${currentUser})`)
        .order('created_at', { ascending: true });

    if (data && data.length > 0) {
        data.forEach(msg => {
            const isMe = msg.sender === currentUser;
            const bubble = document.createElement('div');
            bubble.style.cssText = `max-width: 70%; padding: 10px 14px; border-radius: 14px; font-size: 14px; word-break: break-word; align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? '#0095f6' : '#262626'}; color: #fff;`;
            bubble.textContent = msg.message;
            msgContainer.appendChild(bubble);
        });
    } else {
        msgContainer.innerHTML = `<div style="text-align:center; color:#8e8e8e; font-size:13px; margin-top:20px;">No messages yet. Say hello!</div>`;
    }
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function setupRealtimeChat() {
    if (!supabaseClient) return;
    if (activeChatSubscription) {
        supabaseClient.removeChannel(activeChatSubscription);
    }

    // Unique channel name for each chat session to avoid caching conflicts
    const channelName = `public:messages_${Date.now()}`;

    activeChatSubscription = supabaseClient
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            },
            payload => {
                const newMsg = payload.new;
                const currentUser = localStorage.getItem('currentUsername');
                
                if (
                    (newMsg.sender === currentUser && newMsg.receiver === activeChatUser) ||
                    (newMsg.sender === activeChatUser && newMsg.receiver === currentUser)
                ) {
                    appendMessageToDOM(newMsg);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("Realtime connected successfully!");
            }
        });
}

function appendMessageToDOM(msg) {
    const msgContainer = document.getElementById('chatroom-messages');
    const currentUser = localStorage.getItem('currentUsername');
    
    const placeholder = msgContainer.querySelector('div[style*="text-align:center"]');
    if (placeholder) placeholder.remove();

    const isMe = msg.sender === currentUser;
    const bubble = document.createElement('div');
    bubble.style.cssText = `max-width: 70%; padding: 10px 14px; border-radius: 14px; font-size: 14px; word-break: break-word; align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? '#0095f6' : '#262626'}; color: #fff;`;
    bubble.textContent = msg.message;
    msgContainer.appendChild(bubble);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chatroom-input');
    const text = inputEl.value.trim();
    const currentUser = localStorage.getItem('currentUsername');

    if (!text || !supabaseClient) return;

    inputEl.value = '';
    const { error } = await supabaseClient.from('messages').insert([
        { sender: currentUser, receiver: activeChatUser, message: text }
    ]);

    if (error) {
        alert("Failed to send message.");
    }
}

function openChatWithUser() {
    openChatWith(viewingTargetUser);
                                                                 }
