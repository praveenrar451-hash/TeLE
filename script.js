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

// GALLERY IMAGE SELECTION FOR CREATING POST
let selectedPostImageBase64 = "";

function previewSelectedImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedPostImageBase64 = e.target.result;
        const previewBox = document.getElementById('post-preview-box');
        if (previewBox) {
            previewBox.style.backgroundImage = `url('${selectedPostImageBase64}')`;
            previewBox.style.backgroundSize = 'cover';
            previewBox.style.backgroundPosition = 'center';
            previewBox.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

async function submitNewPost() {
    const caption = document.getElementById('create-caption').value.trim();
    const username = localStorage.getItem('currentUsername');

    if (!selectedPostImageBase64) {
        alert("Please select an image from gallery first!");
        return;
    }

    if (supabaseClient) {
        await supabaseClient.from('posts').insert([{ username, image_url: selectedPostImageBase64, caption }]);
    }

    alert("Posted successfully in real-time!");
    selectedPostImageBase64 = "";
    document.getElementById('create-caption').value = '';
    
    const previewBox = document.getElementById('post-preview-box');
    if (previewBox) {
        previewBox.style.backgroundImage = '';
        previewBox.innerHTML = `
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:36px; color:#8e8e8e; margin-bottom:10px;"></i>
            <span style="color:#8e8e8e; font-size:14px;">Tap to select photo from gallery</span>
        `;
    }
    
    switchView('insta-feed-container');
    loadFeedPosts();
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
    
    if (!supabaseClient || !chatUsersList) return;

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
        msgContainer.innerHTML = `<div style="text-align:center; color:#8e8e8e; font-size:13px; margin-top:20px;">No messages yet. Say hello!</div>`;
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

    bubble.innerHTML = contentHtml;
    msgContainer.appendChild(bubble);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

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
                    appendMessageBubble(newMsg, currentUser);
                }
            }
        )
        .subscribe();
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chatroom-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    const currentUser = localStorage.getItem('currentUsername');

    if (!text || !supabaseClient) return;

    inputEl.value = '';
    const { data, error } = await supabaseClient.from('messages').insert([
        { sender: currentUser, receiver: activeChatUser, message: text, type: 'text' }
    ]).select();

    if (!error && data && data.length > 0) {
        appendMessageBubble(data[0], currentUser);
    }
}

// SEND PHOTO IN CHAT
async function sendChatPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const imgSrc = e.target.result;
        const currentUser = localStorage.getItem('currentUsername');

        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('messages').insert([
                { sender: currentUser, receiver: activeChatUser, message: imgSrc, type: 'image' }
            ]).select();

            if (!error && data && data.length > 0) {
                appendMessageBubble(data[0], currentUser);
            }
        }
    };
    reader.readAsDataURL(file);
}

// VOICE NOTE IN CHAT
let mediaRecorder;
let audioChunks = [];

async function recordVoiceNote() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Audio recording is not supported in your browser.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const reader = new FileReader();
            reader.onload = async function(e) {
                const audioBase64 = e.target.result;
                const currentUser = localStorage.getItem('currentUsername');

                if (supabaseClient) {
                    const { data, error } = await supabaseClient.from('messages').insert([
                        { sender: currentUser, receiver: activeChatUser, message: audioBase64, type: 'audio' }
                    ]).select();

                    if (!error && data && data.length > 0) {
                        appendMessageBubble(data[0], currentUser);
                    }
                }
            };
            reader.readAsDataURL(audioBlob);
            
            // Stop mic track
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        alert("Recording voice note... Tap OK to stop and send.");
        mediaRecorder.stop();
    } catch (err) {
        console.error("Microphone access error:", err);
        alert("Could not access microphone.");
    }
}

// INSTAGRAM-STYLE REAL-TIME CALLING UI OVERLAY
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

    const titleType = type === 'video' ? 'Video Calling...' : 'Audio Calling...';

    callOverlay.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:15px; margin-top:40px;">
            <div class="avatar" style="width:90px; height:90px; font-size:35px; background-color:#363636;">${targetUser ? targetUser.charAt(0).toUpperCase() : 'U'}</div>
            <h2 style="font-size:22px; font-weight:500;">${targetUser || 'User'}</h2>
            <p style="font-size:14px; color:#a8a8a8;" id="call-status-text">${titleType}</p>
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
// ==========================================
// 100% WORKING DATABASE-BASED WEBRTC CALLING
// ==========================================

let localStream = null;
let remoteStream = null;
let peerConnection = null;
let callCheckInterval = null;
let currentCallId = null;

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Listen for incoming calls via Supabase messages table
function startListeningForCalls() {
    if (!supabaseClient) return;
    const currentUser = localStorage.getItem('currentUsername');

    // Realtime subscription for call signals
    supabaseClient
        .channel(`calls_${currentUser}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver=eq.${currentUser}`
            },
            async payload => {
                const msg = payload.new;
                if (msg.type === 'call-offer') {
                    const callData = JSON.parse(msg.message);
                    currentCallId = msg.id;
                    
                    const accept = confirm(`Incoming ${callData.callType.toUpperCase()} Call from ${msg.sender}! Accept?`);
                    if (accept) {
                        showCallUI(callData.callType, msg.sender, true);
                        await setupWebRTCStream(callData.callType === 'video');
                        createPeerConnection(msg.sender);

                        await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);

                        // Send Answer back
                        await supabaseClient.from('messages').insert([{
                            sender: currentUser,
                            receiver: msg.sender,
                            message: JSON.stringify({ type: 'call-answer', answer }),
                            type: 'call-answer'
                        }]);

                        startIceCandidatePolling(msg.sender);
                    } else {
                        // Reject call
                        await supabaseClient.from('messages').insert([{
                            sender: currentUser,
                            receiver: msg.sender,
                            message: JSON.stringify({ type: 'call-rejected' }),
                            type: 'call-rejected'
                        }]);
                    }
                }
            }
        )
        .subscribe();
}

// Poll for answers and ICE candidates
function startIceCandidatePolling(targetUser) {
    const currentUser = localStorage.getItem('currentUsername');
    if (callCheckInterval) clearInterval(callCheckInterval);

    callCheckInterval = setInterval(async () => {
        if (!supabaseClient || !peerConnection) return;

        const { data } = await supabaseClient
            .from('messages')
            .select('*')
            .eq('receiver', currentUser)
            .eq('sender', targetUser)
            .order('created_at', { ascending: false })
            .limit(5);

        if (data) {
            for (let msg of data) {
                try {
                    const parsed = JSON.parse(msg.message);
                    if (parsed.type === 'call-answer' && peerConnection.signalingState === 'have-local-offer') {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(parsed.answer));
                        const statusText = document.getElementById('call-status-text');
                        if (statusText) statusText.textContent = "Connected";
                    } else if (parsed.type === 'ice-candidate' && parsed.candidate) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(parsed.candidate));
                        } catch (e) {}
                    } else if (parsed.type === 'call-rejected') {
                        alert("Call was declined.");
                        endCallScreen();
                    }
                } catch (e) {}
            }
        }
    }, 2000);
}

async function setupWebRTCStream(isVideo) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? { width: 1280, height: 720 } : false
        });

        const localVideoEl = document.getElementById('local-video-preview');
        if (localVideoEl) {
            localVideoEl.srcObject = localStream;
        }
    } catch (err) {
        alert("Could not access camera or microphone. Please check permissions.");
    }
}

function createPeerConnection(receiver) {
    peerConnection = new RTCPeerConnection(rtcConfig);
    const currentUser = localStorage.getItem('currentUsername');

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    remoteStream = new MediaStream();
    const remoteVideoEl = document.getElementById('remote-video-display');
    if (remoteVideoEl) {
        remoteVideoEl.srcObject = remoteStream;
    }

    peerConnection.ontrack = event => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
        const statusText = document.getElementById('call-status-text');
        if (statusText) statusText.textContent = "Connected";
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate && supabaseClient) {
            supabaseClient.from('messages').insert([{
                sender: currentUser,
                receiver: receiver,
                message: JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }),
                type: 'ice-candidate'
            }]).then();
        }
    };
}

// Trigger Audio Call
window.startAudioCall = async function() {
    if (!activeChatUser) {
        alert("Open a chat to call!");
        return;
    }
    const currentUser = localStorage.getItem('currentUsername');
    showCallUI('audio', activeChatUser, false);
    await setupWebRTCStream(false);
    createPeerConnection(activeChatUser);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await supabaseClient.from('messages').insert([{
        sender: currentUser,
        receiver: activeChatUser,
        message: JSON.stringify({ type: 'call-offer', callType: 'audio', offer }),
        type: 'call-offer'
    }]);

    startIceCandidatePkg(activeChatUser);
};

// Trigger Video Call
window.startVideoCall = async function() {
    if (!activeChatUser) {
        alert("Open a chat to call!");
        return;
    }
    const currentUser = localStorage.getItem('currentUsername');
    showCallUI('video', activeChatUser, false);
    await setupWebRTCStream(true);
    createPeerConnection(activeChatUser);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await supabaseClient.from('messages').insert([{
        sender: currentUser,
        receiver: activeChatUser,
        message: JSON.stringify({ type: 'call-offer', callType: 'video', offer }),
        type: 'call-offer'
    }]);

    startIceCandidatePkg(activeChatUser);
};

function startIceCandidatePkg(targetUser) {
    startIceCandidatePolling(targetUser);
}

function showCallUI(type, targetUser, isReceiver) {
    let callOverlay = document.getElementById('instagram-call-overlay');
    if (!callOverlay) {
        callOverlay = document.createElement('div');
        callOverlay.id = 'instagram-call-overlay';
        callOverlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#1a1a1a; z-index:9999; display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:40px 20px; color:#fff;";
        document.body.appendChild(callOverlay);
    }

    const titleType = isReceiver ? `Incoming ${type} call...` : 'Calling... (Connecting)';

    callOverlay.innerHTML = `
        <div style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; justify-content:space-between; align-items:center;">
            <video id="remote-video-display" autoplay playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:1; background:#000;"></video>
            
            <div style="z-index:2; display:flex; flex-direction:column; align-items:center; gap:10px; margin-top:40px; background:rgba(0,0,0,0.5); padding:15px 30px; border-radius:20px;">
                <div class="avatar" style="width:70px; height:70px; font-size:28px; background-color:#363636;">${targetUser ? targetUser.charAt(0).toUpperCase() : 'U'}</div>
                <h2 style="font-size:20px; font-weight:500; margin:0;">${targetUser || 'User'}</h2>
                <p style="font-size:13px; color:#ccc; margin:0;" id="call-status-text">${titleType}</p>
            </div>

            ${type === 'video' ? `<video id="local-video-preview" autoplay playsinline muted style="position:absolute; top:20px; right:20px; width:100px; height:150px; object-fit:cover; border-radius:12px; z-index:3; border:2px solid #fff;"></video>` : ''}

            <div style="z-index:2; display:flex; gap:30px; margin-bottom:40px; align-items:center;">
                <button onclick="toggleCallMute(this)" style="width:55px; height:55px; border-radius:50%; background:#262626; border:none; color:#fff; font-size:20px; cursor:pointer;"><i class="fa-solid fa-microphone"></i></button>
                <button onclick="endCallScreen()" style="width:65px; height:65px; border-radius:50%; background:#ed4956; border:none; color:#fff; font-size:24px; cursor:pointer;"><i class="fa-solid fa-phone-slash"></i></button>
                ${type === 'video' ? `<button onclick="toggleCamera(this)" style="width:55px; height:55px; border-radius:50%; background:#262626; border:none; color:#fff; font-size:20px; cursor:pointer;"><i class="fa-solid fa-video"></i></button>` : ''}
            </div>
        </div>
    `;
    callOverlay.style.display = 'flex';
}

window.endCallScreen = function() {
    if (callCheckInterval) clearInterval(callCheckInterval);
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    const callOverlay = document.getElementById('instagram-call-overlay');
    if (callOverlay) {
        callOverlay.style.display = 'none';
        callOverlay.remove();
    }
}

window.toggleCallMute = function(btn) {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            btn.style.background = audioTrack.enabled ? '#262626' : '#fff';
            btn.style.color = audioTrack.enabled ? '#fff' : '#000';
        }
    }
}

window.toggleCamera = function(btn) {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            btn.style.background = videoTrack.enabled ? '#262626' : '#fff';
            btn.style.color = videoTrack.enabled ? '#fff' : '#000';
        }
    }
}

// Start listening for calls when app loads
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(startListeningForCalls, 2000);
});
