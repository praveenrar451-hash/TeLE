// ==========================================
// SUPABASE CONFIG & INITIALIZATION
// ==========================================
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
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.classList.remove('active');
            authContainer.style.display = 'none';
        }
        const mainApp = document.getElementById('main-app-content');
        if (mainApp) mainApp.style.display = 'flex';
        
        const lastView = localStorage.getItem('activeAppView') || 'insta-feed-container';
        switchView(lastView);
        loadUserData(activeUser);
        loadFeedPosts();
    }
    
    initReelsUploadFeature();
    restoreChatMessagesFromCache();
    setTimeout(initGlobalWaListener, 1500);
    initGlobalRealtimeFeedListener();
});

// ==========================================
// AUTHENTICATION & MULTI-ACCOUNT MANAGEMENT
// ==========================================
async function handleAuthLogin() {
    const usernameInput = document.getElementById('auth-username').value.trim();
    if (!usernameInput) {
        alert("Enter username");
        return;
    }

    localStorage.setItem('currentUsername', usernameInput);
    saveAccountToList(usernameInput);

    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
        authContainer.classList.remove('active');
        authContainer.style.display = 'none';
    }
    const mainApp = document.getElementById('main-app-content');
    if (mainApp) mainApp.style.display = 'flex';
    switchView('insta-feed-container');

    if (supabaseClient) {
        try {
            const { data } = await supabaseClient.from('users').select('*').eq('username', usernameInput);
            if (!data || data.length === 0) {
                await supabaseClient.from('users').insert([{ username: usernameInput, bio: 'Digital Creator', avatar_url: '' }]);
            }
        } catch (err) {
            console.error("Background sync error:", err);
        }
    }

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

    if (!listEl) return;
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

// ==========================================
// VIEW SWITCHING & USER DATA
// ==========================================
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
};

async function loadUserData(username) {
    saveAccountToList(username);
    const topUserEl = document.getElementById('top-profile-username');
    const myNameEl = document.getElementById('my-profile-display-name');
    if (topUserEl) topUserEl.textContent = username;
    if (myNameEl) myNameEl.textContent = username;

    if (supabaseClient) {
        const { data: userData } = await supabaseClient.from('users').select('*').eq('username', username).single();
        if (userData) {
            const userBio = userData.bio || 'Digital Creator';
            const userAvatar = userData.avatar_url || '';

            const bioEl = document.getElementById('profile-bio-text');
            if (bioEl) bioEl.textContent = userBio;

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
        const pCountEl = document.getElementById('profile-posts-count');
        if (pCountEl) pCountEl.textContent = pCount || 0;

        const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
        const fCountEl = document.getElementById('profile-followers-count');
        if (fCountEl) fCountEl.textContent = fCount || 0;

        const { count: fgCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
        const fgCountEl = document.getElementById('profile-following-count');
        if (fgCountEl) fgCountEl.textContent = fgCount || 0;

        loadUserPostsGrid(username, 'my-profile-grid');
    }
}

// ==========================================
// POSTS, REELS & MEDIA UPLOAD MODULE
// ==========================================
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
    const captionEl = document.getElementById('create-caption');
    const caption = captionEl ? captionEl.value.trim() : '';
    const username = localStorage.getItem('currentUsername');

    if (!selectedPostImageBase64) {
        alert("Please select an image from gallery first!");
        return;
    }

    if (supabaseClient) {
        const { error } = await supabaseClient.from('posts').insert([{ 
            username, 
            image_url: selectedPostImageBase64, 
            caption, 
            is_reel: false,
            created_at: new Date().toISOString()
        }]);

        if (error) {
            alert("Error posting: " + error.message);
            return;
        }
    }

    selectedPostImageBase64 = "";
    if (captionEl) captionEl.value = '';
    
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

function initReelsUploadFeature() {
    const reelsView = document.getElementById('reels-container') || document.querySelector('.reels-view, #reels');
    if (reelsView) {
        let reelsHeader = reelsView.querySelector('.reels-header');
        if (!reelsHeader) {
            reelsHeader = document.createElement('div');
            reelsHeader.className = 'reels-header';
            reelsHeader.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #262626; position:sticky; top:0; background:#000; z-index:10;";
            reelsHeader.innerHTML = `<b>Reels</b><i class="fa-solid fa-plus" id="add-reel-btn" style="font-size:20px; cursor:pointer;"></i>`;
            reelsView.prepend(reelsHeader);
        } else if (!document.getElementById('add-reel-btn')) {
            const plusIcon = document.createElement('i');
            plusIcon.className = 'fa-solid fa-plus';
            plusIcon.id = 'add-reel-btn';
            plusIcon.style.cssText = "font-size:20px; cursor:pointer; margin-left:auto;";
            reelsHeader.appendChild(plusIcon);
        }

        let videoInput = document.getElementById('reel-file-input');
        if (!videoInput) {
            videoInput = document.createElement('input');
            videoInput.type = 'file';
            videoInput.id = 'reel-file-input';
            videoInput.accept = 'video/*';
            videoInput.style.display = 'none';
            document.body.appendChild(videoInput);

            videoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const currentUser = localStorage.getItem('currentUsername') || 'Anonymous';
                alert("Uploading Reel video... Please wait.");

                const reader = new FileReader();
                reader.onload = async function(uploadEvent) {
                    const videoDataUrl = uploadEvent.target.result;
                    if (supabaseClient) {
                        await supabaseClient.from('posts').insert([{
                            username: currentUser,
                            image_url: videoDataUrl,
                            caption: 'New Reel 🎥',
                            is_reel: true,
                            created_at: new Date().toISOString()
                        }]);
                    }
                    alert("Reel uploaded successfully!");
                };
                reader.readAsDataURL(file);
            });
        }

        document.getElementById('add-reel-btn')?.addEventListener('click', () => {
            videoInput.click();
        });
    }
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

        const { data } = await supabaseClient.from('posts').select('*').eq('is_reel', false).order('created_at', { ascending: false });
        if (data) posts = data;
    }

    if (posts.length === 0) {
        feedList.innerHTML = `<div style="text-align:center; padding:40px; color:#8e8e8e;">No posts yet</div>`;
        return;
    }

    feedList.innerHTML = '';
    posts.forEach(post => {
        renderPostCard(post, usersMap[post.username], feedList);
    });
}

function renderPostCard(post, userAvatar, container) {
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
    container.prepend(card);
}

function initGlobalRealtimeFeedListener() {
    if (!supabaseClient) return;
    supabaseClient
        .channel('public:posts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
            const newPost = payload.new;
            if (!newPost.is_reel) {
                const feedList = document.getElementById('feed-posts-list');
                if (feedList) {
                    const placeholder = feedList.querySelector('div[style*="text-align:center"]');
                    if (placeholder) placeholder.remove();
                    renderPostCard(newPost, '', feedList);
                }
            }
        })
        .subscribe();
}

// ==========================================
// SEARCH & USER PROFILE MODULE
// ==========================================
async function handleUserSearch(query) {
    const resultsList = document.getElementById('search-results-list');
    if (!supabaseClient || !resultsList) return;

    let queryBuilder = supabaseClient.from('users').select('username, bio, avatar_url');
    if (query && query.trim()) {
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
                    <span style="font-size:12px; color:#8e8e8e;" data-username="${user.username}">${user.bio || 'Digital Creator'} <span class="wa-online-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; margin-left:5px; background:#8696a0;"></span></span>
                </div>
            `;
            resultsList.appendChild(row);
        });
    } else {
        resultsList.innerHTML = `<div style="text-align:center; padding:20px; color:#8e8e8e; font-size:13px;">No users found</div>`;
    }
}

async function viewUserProfile(username) {
    const currentUser = localStorage.getItem('currentUsername');
    if (username === currentUser) {
        switchView('profile-container');
        return;
    }

    const topEl = document.getElementById('other-profile-username-top');
    const nameEl = document.getElementById('other-profile-display-name');
    if (topEl) topEl.textContent = username;
    if (nameEl) nameEl.textContent = username;

    const avatarEl = document.getElementById('other-profile-avatar');
    if (avatarEl) {
        avatarEl.style.backgroundImage = '';
        avatarEl.textContent = username.charAt(0).toUpperCase();
    }

    if (supabaseClient) {
        const { data: userData } = await supabaseClient.from('users').select('bio, avatar_url').eq('username', username).single();
        if (userData) {
            const bioTextEl = document.getElementById('other-profile-bio-text');
            if (userData.bio && bioTextEl) {
                bioTextEl.textContent = userData.bio;
            }
            if (userData.avatar_url && avatarEl) {
                avatarEl.style.backgroundImage = `url('${userData.avatar_url}')`;
                avatarEl.textContent = '';
            }
        }

        const { count: pCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
        const pCntEl = document.getElementById('other-profile-posts-count');
        if (pCntEl) pCntEl.textContent = pCount || 0;

        const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
        const fCntEl = document.getElementById('other-profile-followers-count');
        if (fCntEl) fCntEl.textContent = fCount || 0;

        const { count: fgCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
        const fgCntEl = document.getElementById('other-profile-following-count');
        if (fgCntEl) fgCntEl.textContent = fgCount || 0;

        const { data: followData } = await supabaseClient.from('follows').select('*').eq('follower', currentUser).eq('following', username);
        const followBtn = document.getElementById('other-follow-btn');
        if (followBtn) {
            if (followData && followData.length > 0) {
                followBtn.textContent = 'Following';
                followBtn.style.background = '#363636';
            } else {
                followBtn.textContent = 'Follow';
                followBtn.style.background = '#0095f6';
            }
        }

        loadUserPostsGrid(username, 'other-profile-grid');
    }

    switchView('user-profile-container');
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

// ==========================================
// ADVANCED CHAT, PRESENCE, TYPING & PERSISTENCE MODULE
// ==========================================
let activeChatUser = '';
let waLiveChannel = null;
let typingDebounceTimer = null;

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
            row.setAttribute('data-username', user.username);
            row.style.cssText = "display:flex; align-items:center; padding:10px 16px; gap:12px; cursor:pointer; justify-content:space-between;";
            row.onclick = () => openChatWith(user.username);
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="avatar" style="width:44px; height:44px; font-size:16px; ${avatarStyle}">${user.avatar_url ? '' : user.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <b style="font-size:14px; display:block;">${user.username}</b>
                        <span style="font-size:12px; color:#8e8e8e;">${user.bio || 'Active user'} <span class="wa-online-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; margin-left:4px; background:#8696a0;"></span></span>
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

async function openChatWith(username) {
    activeChatUser = username;
    switchView('chatroom-container');
    
    injectChatHeaderUI(username);
    await loadChatMessages();
    setupWaCompleteFeatures(username);
    markChatAsSeenAndNotify(username);
}

function injectChatHeaderUI(username) {
    const titleEl = document.getElementById('chatroom-title');
    if (titleEl) titleEl.textContent = username;
    
    const avatarEl = document.getElementById('chatroom-avatar');
    if (avatarEl) {
        avatarEl.style.backgroundImage = '';
        avatarEl.textContent = username.charAt(0).toUpperCase();
    }

    const chatHeader = document.querySelector('.chat-header, header, .chatroom-header');
    if (chatHeader) {
        if (!document.getElementById('wa-live-status')) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'wa-live-status';
            statusDiv.style.cssText = "font-size:11px; color:#00a884; font-weight:500; margin-top:2px;";
            statusDiv.textContent = "Connecting...";
            chatHeader.appendChild(statusDiv);
        }
        if (!document.getElementById('wa-typing-indicator-box')) {
            const typingDiv = document.createElement('div');
            typingDiv.id = 'wa-typing-indicator-box';
            typingDiv.style.cssText = "font-size:11px; color:#8696a0; font-style:italic; display:none; margin-top:2px;";
            typingDiv.textContent = "typing...";
            chatHeader.appendChild(typingDiv);
        }
    }

    const inputEl = document.getElementById('chatroom-input');
    if (inputEl && !inputEl.hasAttribute('data-typing-bound')) {
        inputEl.setAttribute('data-typing-bound', 'true');
        inputEl.addEventListener('input', handleUserTyping);
    }
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
    const timeString = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let tickIcon = '';
    if (isMe) {
        if (msg.seen) {
            tickIcon = `<i class="fa-solid fa-check-double message-tick" style="color:#53bdeb; font-size:11px; margin-left:4px;" title="Seen"></i>`;
        } else {
            tickIcon = `<i class="fa-solid fa-check message-tick" style="color:#8696a0; font-size:11px; margin-left:4px;" title="Sent"></i>`;
        }
    }

    const bubble = document.createElement('div');
    bubble.style.cssText = `max-width: 75%; padding: 10px 14px; border-radius: 12px; font-size: 14px; word-break: break-word; align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? '#005c4b' : '#202c33'}; color: #fff; display:flex; flex-direction:column; gap:4px; margin-bottom:8px; margin-left:${isMe ? 'auto' : '0'};`;
    
    let contentHtml = '';
    if (msg.type === 'image') {
        contentHtml = `<img src="${msg.message}" style="max-width:100%; border-radius:8px;">`;
    } else if (msg.type === 'audio') {
        contentHtml = `<audio controls src="${msg.message}" style="height:35px; width:200px;"></audio>`;
    } else {
        contentHtml = `<span>${msg.message}</span>`;
    }

    bubble.innerHTML = `
        ${contentHtml}
        <div style="display:flex; justify-content:flex-end; align-items:center; gap:3px; margin-top:2px;">
            <span style="font-size:9px; color:#8696a0;">${timeString}</span>
            ${tickIcon}
        </div>
    `;
    msgContainer.appendChild(bubble);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

setInterval(() => {
    try {
        const chatContainer = document.getElementById('chatroom-messages');
        if (chatContainer && chatContainer.innerHTML.trim()) {
            localStorage.setItem('wa_persisted_chat_html', chatContainer.innerHTML);
        }
    } catch (e) {}
}, 1500);

function restoreChatMessagesFromCache() {
    try {
        const savedChatHTML = localStorage.getItem('wa_persisted_chat_html');
        const chatContainer = document.getElementById('chatroom-messages');
        if (savedChatHTML && chatContainer && !chatContainer.innerHTML.trim()) {
            chatContainer.innerHTML = savedChatHTML;
        }
    } catch (e) {}
}

function setupWaCompleteFeatures(targetUser) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const currentUser = localStorage.getItem('currentUsername');
    if (!currentUser) return;

    if (waLiveChannel) {
        supabaseClient.removeChannel(waLiveChannel);
    }

    waLiveChannel = supabaseClient.channel('wa_complete_features_room_' + [currentUser, targetUser].sort().join('_'), {
        config: {
            presence: { key: currentUser },
            broadcast: { self: false }
        }
    });

    waLiveChannel
        .on('presence', { event: 'sync' }, () => {
            const state = waLiveChannel.presenceState();
            updateAllPresenceUI(state, targetUser);
        })
        .on('broadcast', { event: 'typing-action' }, ({ payload }) => {
            if (payload.receiver === currentUser && payload.sender === targetUser) {
                showTypingUI(payload.isTyping);
            }
        })
        .on('broadcast', { event: 'seen-action' }, ({ payload }) => {
            if (payload.receiver === currentUser || payload.sender === targetUser) {
                updateBlueTicksUI();
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            if (
                (newMsg.sender === currentUser && newMsg.receiver === activeChatUser) ||
                (newMsg.sender === activeChatUser && newMsg.receiver === currentUser)
            ) {
                appendMessageBubble(newMsg, currentUser);
                if (newMsg.receiver === currentUser) {
                    markChatAsSeenAndNotify(newMsg.sender);
                }
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await waLiveChannel.track({ online_at: new Date().toISOString() });
                const statusEl = document.getElementById('wa-live-status');
                if (statusEl) statusEl.textContent = "Online";
            }
        });
}

function updateAllPresenceUI(presenceState, targetUser) {
    document.querySelectorAll('[data-username]').forEach(el => {
        const uname = el.getAttribute('data-username');
        if (!uname) return;
        let dot = el.querySelector('.wa-online-dot');
        if (!dot) {
            dot = document.createElement('span');
            dot.className = 'wa-online-dot';
            dot.style.cssText = "display:inline-block; width:8px; height:8px; border-radius:50%; margin-left:5px;";
            el.appendChild(dot);
        }
        dot.style.backgroundColor = presenceState[uname] ? '#00a884' : '#8696a0';
    });

    if (targetUser) {
        const statusEl = document.getElementById('wa-live-status');
        if (statusEl) {
            statusEl.textContent = presenceState[targetUser] ? 'Online' : 'Offline (Last seen recently)';
        }
    }
}

function handleUserTyping() {
    if (!activeChatUser) return;
    const currentUser = localStorage.getItem('currentUsername');
    if (!currentUser || !waLiveChannel) return;

    waLiveChannel.send({
        type: 'broadcast',
        event: 'typing-action',
        payload: { sender: currentUser, receiver: activeChatUser, isTyping: true }
    });

    clearTimeout(typingDebounceTimer);
    typingDebounceTimer = setTimeout(() => {
        waLiveChannel.send({
            type: 'broadcast',
            event: 'typing-action',
            payload: { sender: currentUser, receiver: activeChatUser, isTyping: false }
        });
    }, 1200);
}

function showTypingUI(isTyping) {
    const typingBox = document.getElementById('wa-typing-indicator-box');
    if (typingBox) {
        typingBox.style.display = isTyping ? 'block' : 'none';
    }
}

function markChatAsSeenAndNotify(targetUser) {
    const currentUser = localStorage.getItem('currentUsername');
    if (!currentUser || !supabaseClient) return;

    supabaseClient
        .from('messages')
        .update({ seen: true })
        .eq('sender', targetUser)
        .eq('receiver', currentUser)
        .eq('seen', false)
        .then(() => {
            if (waLiveChannel) {
                waLiveChannel.send({
                    type: 'broadcast',
                    event: 'seen-action',
                    payload: { sender: currentUser, receiver: targetUser }
                });
            }
        });
}

function updateBlueTicksUI() {
    const ticks = document.querySelectorAll('.message-tick');
    ticks.forEach(t => {
        t.className = 'fa-solid fa-check-double message-tick';
        t.style.color = '#53bdeb';
    });
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chatroom-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    const currentUser = localStorage.getItem('currentUsername');

    if (!text || !supabaseClient) return;

    inputEl.value = '';
    const { data, error } = await supabaseClient.from('messages').insert([
        { sender: currentUser, receiver: activeChatUser, message: text, type: 'text', seen: false, created_at: new Date().toISOString() }
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

        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('messages').insert([
                { sender: currentUser, receiver: activeChatUser, message: imgSrc, type: 'image', seen: false, created_at: new Date().toISOString() }
            ]).select();

            if (!error && data && data.length > 0) {
                appendMessageBubble(data[0], currentUser);
            }
        }
    };
    reader.readAsDataURL(file);
}

// ==========================================
// WHATSAPP STYLE COMPLETE CALLING MODULE
// ==========================================
let waLocalStream = null;
let waRemoteStream = null;
let waPeerConnection = null;
let waSignalingChannel = null;
let waIsFrontCamera = true;
let waIsMuted = false;

const waRtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

function initGlobalWaListener() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const currentUser = localStorage.getItem('currentUsername');
    if (!currentUser) return;

    if (waSignalingChannel) supabaseClient.removeChannel(waSignalingChannel);

    waSignalingChannel = supabaseClient.channel(`wa_global_call_${currentUser}`, {
        config: { broadcast: { self: false } }
    });

    waSignalingChannel
        .on('broadcast', { event: 'wa-call-offer' }, async ({ payload }) => {
            if (payload.receiver === currentUser) {
                window.waPendingOffer = payload.offer;
                window.waCallerName = payload.caller;
                window.waCallType = payload.callType;
                showWaIncomingUI(payload.caller, payload.callType);
            }
        })
        .on('broadcast', { event: 'wa-call-answer' }, async ({ payload }) => {
            if (waPeerConnection && waPeerConnection.signalingState === 'have-local-offer') {
                await waPeerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
                updateWaStatus("Connected");
            }
        })
        .on('broadcast', { event: 'wa-ice-candidate' }, async ({ payload }) => {
            if (waPeerConnection && payload.candidate) {
                try {
                    await waPeerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e) {}
            }
        })
        .on('broadcast', { event: 'wa-call-ended' }, () => {
            endWaCallScreen(false);
        })
        .subscribe();
}

function startAudioCall() {
    if (typeof activeChatUser !== 'undefined' && activeChatUser) {
        startWaCall(false, activeChatUser);
    } else {
        alert("Pehle koi chat select karein!");
    }
}

function startVideoCall() {
    if (typeof activeChatUser !== 'undefined' && activeChatUser) {
        startWaCall(true, activeChatUser);
    } else {
        alert("Pehle koi chat select karein!");
    }
}

async function startWaCall(isVideo, targetUser) {
    showWaCallUI(isVideo, targetUser, "Calling...");

    try {
        waLocalStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? { facingMode: waIsFrontCamera ? 'user' : 'environment' } : false
        });
    } catch (err) {
        alert("Camera ya Microphone ki permission nahi mili.");
        endWaCallScreen(false);
        return;
    }

    const localVideoEl = document.getElementById('wa-local-video');
    if (localVideoEl && isVideo) localVideoEl.srcObject = waLocalStream;

    waPeerConnection = new RTCPeerConnection(waRtcConfig);
    waLocalStream.getTracks().forEach(track => waPeerConnection.addTrack(track, waLocalStream));

    waPeerConnection.ontrack = event => {
        waRemoteStream = event.streams[0];
        const remoteVideoEl = document.getElementById('wa-remote-video');
        if (remoteVideoEl && isVideo) remoteVideoEl.srcObject = waRemoteStream;
        const remoteAudioEl = document.getElementById('wa-remote-audio');
        if (remoteAudioEl) remoteAudioEl.srcObject = waRemoteStream;
    };

    waPeerConnection.onicecandidate = event => {
        if (event.candidate && supabaseClient) {
            supabaseClient.channel(`wa_global_call_${targetUser}`).send({
                type: 'broadcast',
                event: 'wa-ice-candidate',
                payload: { candidate: event.candidate }
            });
        }
    };

    const offer = await waPeerConnection.createOffer();
    await waPeerConnection.setLocalDescription(offer);

    const currentUser = localStorage.getItem('currentUsername');
    setTimeout(() => {
        if (supabaseClient) {
            supabaseClient.channel(`wa_global_call_${targetUser}`).send({
                type: 'broadcast',
                event: 'wa-call-offer',
                payload: { caller: currentUser, receiver: targetUser, offer, callType: isVideo ? 'video' : 'audio' }
            });
        }
    }, 500);
}

function showWaIncomingUI(caller, callType) {
    let overlay = document.getElementById('wa-call-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'wa-call-overlay';
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#0b141a; z-index:9999; display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:60px 20px; color:#fff;";
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:15px; margin-top:50px;">
            <div style="width:110px; height:110px; border-radius:50%; background:#202c33; display:flex; align-items:center; justify-content:center; font-size:45px; color:#8696a0; border: 2px solid #2a3942;">${caller.charAt(0).toUpperCase()}</div>
            <h2 style="font-size:26px; font-weight:500; margin:0;">${caller}</h2>
            <p style="font-size:15px; color:#8696a0; margin:0;">Incoming WhatsApp ${callType} call...</p>
        </div>
        <div style="display:flex; gap:80px; margin-bottom:50px; align-items:center;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                <button onclick="rejectWaCall()" style="width:65px; height:65px; border-radius:50%; background:#ea0038; border:none; color:#fff; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-phone-slash"></i></button>
                <span style="font-size:12px; color:#8696a0;">Decline</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                <button onclick="acceptWaCall()" style="width:65px; height:65px; border-radius:50%; background:#00a884; border:none; color:#fff; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-phone"></i></button>
                <span style="font-size:12px; color:#8696a0;">Accept</span>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

async function acceptWaCall() {
    const caller = window.waCallerName;
    const isVideo = window.waCallType === 'video';
    showWaCallUI(isVideo, caller, "Connected");

    try {
        waLocalStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? { facingMode: waIsFrontCamera ? 'user' : 'environment' } : false
        });
    } catch (err) {
        alert("Permission denied.");
        endWaCallScreen(false);
        return;
    }

    const localVideoEl = document.getElementById('wa-local-video');
    if (localVideoEl && isVideo) localVideoEl.srcObject = waLocalStream;

    waPeerConnection = new RTCPeerConnection(waRtcConfig);
    waLocalStream.getTracks().forEach(track => waPeerConnection.addTrack(track, waLocalStream));

    waPeerConnection.ontrack = event => {
        waRemoteStream = event.streams[0];
        const remoteVideoEl = document.getElementById('wa-remote-video');
        if (remoteVideoEl && isVideo) remoteVideoEl.srcObject = waRemoteStream;
        const remoteAudioEl = document.getElementById('wa-remote-audio');
        if (remoteAudioEl) remoteAudioEl.srcObject = waRemoteStream;
    };

    waPeerConnection.onicecandidate = event => {
        if (event.candidate && supabaseClient) {
            supabaseClient.channel(`wa_global_call_${caller}`).send({
                type: 'broadcast',
                event: 'wa-ice-candidate',
                payload: { candidate: event.candidate }
            });
        }
    };

    await waPeerConnection.setRemoteDescription(new RTCSessionDescription(window.waPendingOffer));
    const answer = await waPeerConnection.createAnswer();
    await waPeerConnection.setLocalDescription(answer);

    if (supabaseClient) {
        supabaseClient.channel(`wa_global_call_${caller}`).send({ 
            type: 'broadcast', 
            event: 'wa-call-answer', 
            payload: { answer } 
        });
    }
}

function rejectWaCall() {
    const caller = window.waCallerName;
    if (supabaseClient && caller) {
        supabaseClient.channel(`wa_global_call_${caller}`).send({ type: 'broadcast', event: 'wa-call-ended', payload: {} });
    }
    endWaCallScreen(false);
}

function showWaCallUI(isVideo, targetUser, statusText) {
    let overlay = document.getElementById('wa-call-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'wa-call-overlay';
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#0b141a; z-index:9999; overflow:hidden;";
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="position:relative; width:100%; height:100%; background:#0b141a;">
            ${isVideo ? `
                <video id="wa-remote-video" autoplay playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:1; background:#111;"></video>
                <div style="position:absolute; top:30px; left:20px; z-index:3; display:flex; flex-direction:column;">
                    <div style="font-weight:500; font-size:18px; color:#fff;">${targetUser}</div>
                    <div id="wa-status-text" style="font-size:13px; color:#8696a0;">${statusText}</div>
                </div>
                <video id="wa-local-video" autoplay playsinline muted style="position:absolute; top:30px; right:20px; width:100px; height:150px; object-fit:cover; border-radius:12px; z-index:2; border: 2px solid rgba(255,255,255,0.2);"></video>
            ` : `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; z-index:2; color:#fff;">
                    <div style="width:120px; height:120px; border-radius:50%; background:#202c33; display:flex; align-items:center; justify-content:center; font-size:50px; color:#8696a0; border: 2px solid #2a3942;">${targetUser.charAt(0).toUpperCase()}</div>
                    <h2 style="font-size:26px; font-weight:500; margin:0;">${targetUser}</h2>
                    <p style="font-size:14px; color:#8696a0; margin:0;" id="wa-status-text">${statusText}</p>
                </div>
                <audio id="wa-remote-audio" autoplay></audio>
            `}
            <div style="position:absolute; bottom:0; left:0; width:100%; padding:30px 20px 40px 20px; display:flex; justify-content:center; gap:25px; align-items:center; z-index:3; background: linear-gradient(to top, rgba(11,20,26,0.95) 60%, transparent);">
                <button onclick="toggleWaMute(this)" style="width:52px; height:52px; border-radius:50%; background:rgba(32,44,51,0.85); border: 1px solid rgba(255,255,255,0.15); color:#fff; font-size:18px; cursor:pointer;"><i class="fa-solid fa-microphone" id="wa-mic-icon"></i></button>
                ${isVideo ? `<button onclick="switchWaCamera()" style="width:52px; height:52px; border-radius:50%; background:rgba(32,44,51,0.85); border: 1px solid rgba(255,255,255,0.15); color:#fff; font-size:18px; cursor:pointer;"><i class="fa-solid fa-camera-rotate"></i></button>` : ''}
                <button onclick="endWaCallScreen(true)" style="width:62px; height:62px; border-radius:50%; background:#ea0038; border:none; color:#fff; font-size:22px; cursor:pointer;"><i class="fa-solid fa-phone-slash"></i></button>
            </div>
        </div>
    `;
    overlay.style.display = 'block';
}

function updateWaStatus(text) {
    const statusEl = document.getElementById('wa-status-text');
    if (statusEl) statusEl.textContent = text;
}

function toggleWaMute(btn) {
    if (!waLocalStream) return;
    const audioTrack = waLocalStream.getAudioTracks()[0];
    if (!audioTrack) return;

    waIsMuted = !waIsMuted;
    audioTrack.enabled = !waIsMuted;

    const icon = document.getElementById('wa-mic-icon');
    if (waIsMuted) {
        btn.style.background = '#fff';
        btn.style.color = '#000';
        icon.className = 'fa-solid fa-microphone-slash';
    } else {
        btn.style.background = 'rgba(32,44,51,0.85)';
        btn.style.color = '#fff';
        icon.className = 'fa-solid fa-microphone';
    }
}

async function switchWaCamera() {
    waIsFrontCamera = !waIsFrontCamera;
    if (waLocalStream) {
        waLocalStream.getVideoTracks().forEach(t => t.stop());
    }
    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode: waIsFrontCamera ? 'user' : 'environment' }
        });
        
        const videoTrack = newStream.getVideoTracks()[0];
        waLocalStream.addTrack(videoTrack);

        const localVideoEl = document.getElementById('wa-local-video');
        if (localVideoEl) localVideoEl.srcObject = waLocalStream;

        if (waPeerConnection) {
            const videoSender = waPeerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                videoSender.replaceTrack(videoTrack);
            }
        }
    } catch (e) {}
}

function endWaCallScreen(sendSignal = true) {
    const targetUser = window.waCallerName || activeChatUser;
    if (sendSignal && supabaseClient && targetUser) {
        supabaseClient.channel(`wa_global_call_${targetUser}`).send({ type: 'broadcast', event: 'wa-call-ended', payload: {} });
    }
    if (waLocalStream) {
        waLocalStream.getTracks().forEach(t => t.stop());
        waLocalStream = null;
    }
    if (waPeerConnection) {
        waPeerConnection.close();
        waPeerConnection = null;
    }
    const overlay = document.getElementById('wa-call-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.remove();
    }
                                        }
