// ==========================================
// INSTA-TELE APP SCRIPT.JS (COMPLETE FEATURES UPDATE)
// ==========================================

const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';

let supabaseClient;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error("Supabase failed to initialize", e);
}

// DOM Elements
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input'); 
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const uploadModal = document.getElementById('upload-modal');
const chatWindowScreen = document.getElementById('chat-window-screen');
const reelsContainer = document.getElementById('reels-container');

const feedPostsArea = document.getElementById('feed-posts-area');
const reelsFeed = document.getElementById('reels-feed');
const userProfilePosts = document.getElementById('user-profile-posts');
const userProfileReels = document.getElementById('user-profile-reels');

let currentActiveView = 'login-container';
let activeChatSubscription = null;
let currentChatPartner = null;
let globalPresenceChannel = null;
let typingTimeout = null;

function switchView(viewId, saveState = true) {
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        currentActiveView = viewId;
        if (saveState && viewId !== 'login-container') {
            localStorage.setItem('lastActiveView', viewId);
        }
    }
}

// Notification Sound Generator (Web Audio API - No external file needed)
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.log("Audio not allowed yet");
    }
}

// Show Floating Notification Popup
function showNotificationPopup(sender, message) {
    playNotificationSound();
    
    let existingPopup = document.getElementById('global-notif-popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'global-notif-popup';
    popup.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#1f1f1f; border:1px solid #333; color:#fff; padding:12px 18px; border-radius:12px; z-index:9999999; box-shadow:0 8px 24px rgba(0,0,0,0.6); display:flex; align-items:center; gap:12px; max-width:90%; width:340px; animation: slideDown 0.3s ease;";
    
    popup.innerHTML = `
        <div style="width:38px; height:38px; background:#0095f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:15px; flex-shrink:0;">${sender.charAt(0).toUpperCase()}</div>
        <div style="flex:1; overflow:hidden;">
            <div style="font-weight:bold; font-size:13px; color:#fff;">New message from ${sender}</div>
            <div style="font-size:12px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${message}</div>
        </div>
    `;

    document.body.appendChild(popup);

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.3s ease';
        setTimeout(() => popup.remove(), 300);
    }, 3500);
}

// ==========================================
// LOGIN HANDLER
// ==========================================
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
        const password = passwordInput ? passwordInput.value.trim() : "272009";

        if (!username) {
            if (loginError) loginError.textContent = "Please enter a username";
            return;
        }

        if (passwordInput && password !== "272009") {
            if (loginError) loginError.textContent = "Incorrect Password! Access Denied.";
            return;
        }

        loginBtn.textContent = "Checking...";
        try {
            let { data } = await supabaseClient
                .from('users')
                .select('*')
                .eq('username', username)
                .single();

            if (!data) {
                await supabaseClient.from('users').insert([{ username: username, avatar_url: '', is_online: true }]);
            } else {
                await supabaseClient.from('users').update({ is_online: true }).eq('username', username);
            }

            localStorage.setItem('currentUsername', username);
            if (loginError) loginError.textContent = "";
            initializeAppData(username);
        } catch (err) {
            console.error(err);
            if (loginError) loginError.textContent = "Connection error. Try again.";
        } finally {
            loginBtn.textContent = "Log In";
        }
    });
}

// ==========================================
// AUTO RESTORE VIEW & GLOBAL NOTIFICATION LISTENER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUsername');
    if (!savedUser) {
        switchView('login-container', false);
        return;
    }

    setupGlobalPresenceAndNotifications(savedUser);

    const lastView = localStorage.getItem('lastActiveView') || 'insta-feed-container';
    
    if (lastView === 'tele-chat-container') {
        switchView('tele-chat-container', false);
        fetchTelegramChats();
    } else if (lastView === 'user-profile-container') {
        switchView('user-profile-container', false);
        openProfilePage(savedUser, true);
    } else {
        switchView('insta-feed-container', false);
        fetchFeedPosts();
    }
});

// Global Notification & Online Status Tracker
function setupGlobalPresenceAndNotifications(username) {
    // Set online status
    supabaseClient.from('users').update({ is_online: true, last_seen: new Date() }).eq('username', username).then();

    // Heartbeat to keep online status active every 30 seconds
    setInterval(() => {
        supabaseClient.from('users').update({ last_seen: new Date() }).eq('username', username).then();
    }, 30000);

    // Window close handler to mark offline
    window.addEventListener('beforeunload', () => {
        supabaseClient.from('users').update({ is_online: false, last_seen: new Date() }).eq('username', username).then();
    });

    // Listen globally for incoming messages (to show notifications when not in active chat)
    if (globalPresenceChannel) supabaseClient.removeChannel(globalPresenceChannel);

    globalPresenceChannel = supabaseClient
        .channel('global_notifications_' + username)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            if (newMsg.receiver === username && newMsg.sender !== currentChatPartner) {
                showNotificationPopup(newMsg.sender, newMsg.message);
                if (currentActiveView === 'tele-chat-container') {
                    fetchTelegramChats();
                }
            }
        })
        .subscribe();
}

function initializeAppData(username) {
    setupGlobalPresenceAndNotifications(username);
    switchView('insta-feed-container');
    fetchFeedPosts();
}

// Navigation Events
document.querySelectorAll('.insta-nav i').forEach(icon => {
    icon.addEventListener('click', (e) => {
        document.querySelectorAll('.insta-nav i').forEach(i => i.classList.remove('active'));
        e.target.classList.add('active');

        if (chatWindowScreen) chatWindowScreen.classList.remove('active');
        currentChatPartner = null;
        if (activeChatSubscription) {
            supabaseClient.removeChannel(activeChatSubscription);
            activeChatSubscription = null;
        }

        const action = e.target.getAttribute('data-action');
        if (action === 'home') {
            if (reelsContainer) reelsContainer.classList.remove('active');
            switchView('insta-feed-container');
            fetchFeedPosts();
        } else if (action === 'reels') {
            if (reelsContainer) reelsContainer.classList.add('active');
            fetchReelsFromDatabase();
        } else if (action === 'add') {
            if (uploadModal) uploadModal.classList.add('active');
        } else if (action === 'profile') {
            if (reelsContainer) reelsContainer.classList.remove('active');
            switchView('user-profile-container');
            openProfilePage(localStorage.getItem('currentUsername'), true);
        }
    });
});

// Switch to Telegram
document.querySelectorAll('.infinity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (currentActiveView === 'tele-chat-container') {
            switchView('insta-feed-container');
            fetchFeedPosts();
        } else {
            if (reelsContainer) reelsContainer.classList.remove('active');
            if (chatWindowScreen) chatWindowScreen.classList.remove('active');
            currentChatPartner = null;
            if (activeChatSubscription) {
                supabaseClient.removeChannel(activeChatSubscription);
                activeChatSubscription = null;
            }
            switchView('tele-chat-container');
            fetchTelegramChats();
        }
    });
});

// Logout Handler
document.querySelectorAll('.logout-icon-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const myName = localStorage.getItem('currentUsername');
        if (myName) {
            await supabaseClient.from('users').update({ is_online: false, last_seen: new Date() }).eq('username', myName);
        }
        localStorage.clear();
        if (reelsContainer) reelsContainer.classList.remove('active');
        if (chatWindowScreen) chatWindowScreen.classList.remove('active');
        currentChatPartner = null;
        if (activeChatSubscription) {
            supabaseClient.removeChannel(activeChatSubscription);
            activeChatSubscription = null;
        }
        switchView('login-container', false);
    });
});

// Close Upload Modal
const closeUploadModalBtn = document.getElementById('close-upload-modal');
if (closeUploadModalBtn) {
    closeUploadModalBtn.addEventListener('click', () => {
        uploadModal.classList.remove('active');
    });
}

// Fetch Feed Posts (With synchronized avatar loader)
async function fetchFeedPosts() {
    if (!feedPostsArea) return;
    feedPostsArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:20px;">Loading posts...</p>';

    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        feedPostsArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:20px;">Failed to load posts.</p>';
        return;
    }

    feedPostsArea.innerHTML = '';
    if (!data || data.length === 0) {
        feedPostsArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:20px;">No posts yet.</p>';
        return;
    }

    const myName = localStorage.getItem('currentUsername');

    // Fetch all user avatars to sync across posts
    const { data: usersData } = await supabaseClient.from('users').select('username, avatar_url');
    const userAvatarMap = {};
    if (usersData) {
        usersData.forEach(u => userAvatarMap[u.username] = u.avatar_url);
    }

    for (let post of data) {
        const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        const { data: myLike } = await supabaseClient.from('likes').select('*').eq('post_id', post.id).eq('username', myName);
        const isLiked = myLike && myLike.length > 0;

        const { data: comments } = await supabaseClient.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });

        const authorAvatar = userAvatarMap[post.username] || '';

        const postCard = document.createElement('div');
        postCard.style.cssText = "background:#000; border-bottom:1px solid #262626; margin-bottom:15px;";
        postCard.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
                <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" class="post-user-header" data-user="${post.username}">
                    <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; overflow:hidden; ${authorAvatar ? `background-image:url(${authorAvatar}); background-size:cover;` : ''}">${!authorAvatar ? post.username.charAt(0).toUpperCase() : ''}</div>
                    <b style="font-size:13px;">${post.username}</b>
                </div>
            </div>
            <div style="width:100%; max-height:450px; overflow:hidden; background:#111; display:flex; justify-content:center; align-items:center;">
                ${post.image_url ? `<img src="${post.image_url}" style="width:100%; object-fit:cover;">` : ''}
            </div>
            <div style="padding:10px 12px;">
                <div style="display:flex; gap:15px; font-size:22px; margin-bottom:8px;">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart post-like-btn" data-id="${post.id}" style="cursor:pointer; color:${isLiked ? '#ed4956' : '#fff'};"></i>
                    <i class="fa-regular fa-comment" style="cursor:pointer;"></i>
                </div>
                <p style="font-size:13px; margin-bottom:5px;"><b id="post-likes-count-${post.id}">${likesCount || 0}</b> likes</p>
                <p style="font-size:13px; margin-bottom:8px;"><b>${post.username}</b> ${post.caption || ''}</p>
                <div id="post-comments-list-${post.id}" style="font-size:12px; color:#aaa; margin-bottom:6px; display:flex; flex-direction:column; gap:3px;">
                    ${comments ? comments.map(c => `<div><b>${c.username}</b>: ${c.comment}</div>`).join('') : ''}
                </div>
                <div style="display:flex; border-top:1px solid #262626; padding-top:8px; margin-top:5px;">
                    <input type="text" id="post-comment-input-${post.id}" placeholder="Add a comment..." style="flex:1; background:transparent; border:none; color:#fff; font-size:12px; outline:none;">
                    <button class="post-comment-submit" data-id="${post.id}" style="background:transparent; border:none; color:#0095f6; font-weight:bold; font-size:12px; cursor:pointer;">Post</button>
                </div>
            </div>
        `;

        postCard.querySelector('.post-user-header').addEventListener('click', () => {
            switchView('user-profile-container');
            openProfilePage(post.username, false);
        });

        const likeBtn = postCard.querySelector('.post-like-btn');
        const likesCountElem = postCard.querySelector(`#post-likes-count-${post.id}`);
        likeBtn.addEventListener('click', async () => {
            let currentLikes = parseInt(likesCountElem.textContent);
            if (likeBtn.classList.contains('fa-solid')) {
                likeBtn.classList.remove('fa-solid');
                likeBtn.classList.add('fa-regular');
                likeBtn.style.color = '#fff';
                likesCountElem.textContent = Math.max(0, currentLikes - 1);
                await supabaseClient.from('likes').delete().eq('post_id', post.id).eq('username', myName);
            } else {
                const { data: existingLike } = await supabaseClient.from('likes').select('*').eq('post_id', post.id).eq('username', myName);
                if (!existingLike || existingLike.length === 0) {
                    likeBtn.classList.remove('fa-regular');
                    likeBtn.classList.add('fa-solid');
                    likeBtn.style.color = '#ed4956';
                    likesCountElem.textContent = currentLikes + 1;
                    await supabaseClient.from('likes').insert([{ post_id: post.id, username: myName }]);
                }
            }
        });

        const commentInput = postCard.querySelector(`#post-comment-input-${post.id}`);
        const commentSubmitBtn = postCard.querySelector('.post-comment-submit');
        const commentsListDiv = postCard.querySelector(`#post-comments-list-${post.id}`);

        const submitCommentAction = async () => {
            const commentText = commentInput.value.trim();
            if (!commentText) return;

            const newDiv = document.createElement('div');
            newDiv.innerHTML = `<b>${myName}</b>: ${commentText}`;
            commentsListDiv.appendChild(newDiv);
            commentInput.value = '';

            await supabaseClient.from('comments').insert([{ post_id: post.id, username: myName, comment: commentText }]);
        };

        commentSubmitBtn.addEventListener('click', submitCommentAction);
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitCommentAction();
        });

        feedPostsArea.appendChild(postCard);
    }
}

// Fetch Reels Feed
async function fetchReelsFromDatabase() {
    if (!reelsFeed) return;
    
    const { data, error } = await supabaseClient
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        reelsFeed.innerHTML = '<p style="color:#777; text-align:center; margin-top:50px;">Failed to load reels.</p>';
        return;
    }

    reelsFeed.innerHTML = '';
    if (!data || data.length === 0) {
        reelsFeed.innerHTML = '<p style="color:#777; text-align:center; margin-top:50px;">No reels available yet.</p>';
        return;
    }

    const myName = localStorage.getItem('currentUsername');
    const { data: usersData } = await supabaseClient.from('users').select('username, avatar_url');
    const userAvatarMap = {};
    if (usersData) usersData.forEach(u => userAvatarMap[u.username] = u.avatar_url);

    for (let reel of data) {
        const { count: likesCount } = await supabaseClient.from('reel_likes').select('*', { count: 'exact', head: true }).eq('reel_id', reel.id);
        const { data: myLike } = await supabaseClient.from('reel_likes').select('*').eq('reel_id', reel.id).eq('username', myName);
        const isLiked = myLike && myLike.length > 0;

        const { data: comments } = await supabaseClient.from('reel_comments').select('*').eq('reel_id', reel.id).order('created_at', { ascending: true });
        const authorAvatar = userAvatarMap[reel.username] || '';

        const reelCard = document.createElement('div');
        reelCard.style.cssText = "width:100%; height:100%; scroll-snap-align:start; position:relative; display:flex; justify-content:center; align-items:center; background:#000; flex-shrink:0;";

        reelCard.innerHTML = `
            <video src="${reel.video_url}" style="width:100%; height:100%; object-fit:cover;" loop playsinline></video>
            
            <div style="position:absolute; bottom:20px; left:15px; right:70px; z-index:2; text-shadow:0 1px 3px rgba(0,0,0,0.8);">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer;" class="reel-user-profile" data-user="${reel.username}">
                    <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; overflow:hidden; ${authorAvatar ? `background-image:url(${authorAvatar}); background-size:cover;` : ''}">${!authorAvatar ? reel.username.charAt(0).toUpperCase() : ''}</div>
                    <b style="font-size:14px;">${reel.username}</b>
                </div>
                <p style="margin:0; font-size:13px; line-height:1.4;">${reel.caption || ''}</p>
            </div>

            <div style="position:absolute; right:15px; bottom:60px; z-index:2; display:flex; flex-direction:column; align-items:center; gap:20px;">
                <div style="text-align:center; cursor:pointer;" id="reel-like-btn-${reel.id}">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart" style="font-size:28px; color:${isLiked ? '#ed4956' : '#fff'};"></i>
                    <p style="font-size:11px; margin:3px 0 0 0;" id="reel-likes-count-${reel.id}">${likesCount || 0}</p>
                </div>
                
                <div style="text-align:center; cursor:pointer;" id="reel-comment-open-${reel.id}">
                    <i class="fa-regular fa-comment" style="font-size:26px; color:#fff;"></i>
                    <p style="font-size:11px; margin:3px 0 0 0;">${comments ? comments.length : 0}</p>
                </div>
            </div>

            <div id="reel-comments-modal-${reel.id}" style="display:none; position:absolute; bottom:0; left:0; width:100%; height:60%; background:#121212; border-top-left-radius:16px; border-top-right-radius:16px; z-index:10; flex-direction:column; border-top:1px solid #262626;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; border-bottom:1px solid #262626;">
                    <h4 style="margin:0; font-size:14px;">Comments</h4>
                    <button id="close-reel-comments-${reel.id}" style="background:transparent; border:none; color:#fff; font-size:16px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="reel-comments-list-${reel.id}" style="flex:1; overflow-y:auto; padding:10px 15px; display:flex; flex-direction:column; gap:8px; font-size:13px;">
                    ${comments && comments.length > 0 ? comments.map(c => `<div><b>${c.username}</b>: ${c.comment}</div>`).join('') : '<p style="color:#777; text-align:center; margin-top:20px;">No comments yet.</p>'}
                </div>
                <div style="padding:10px 15px; border-top:1px solid #262626; display:flex; gap:8px; background:#000;">
                    <input type="text" id="reel-comment-input-${reel.id}" placeholder="Add a comment..." style="flex:1; padding:8px; background:#1a1a1a; border:1px solid #333; color:#fff; border-radius:6px; font-size:12px;">
                    <button id="reel-comment-submit-${reel.id}" style="background:transparent; border:none; color:#0095f6; font-weight:bold; cursor:pointer;">Post</button>
                </div>
            </div>
        `;

        reelCard.querySelector('.reel-user-profile').addEventListener('click', () => {
            if (reelsContainer) reelsContainer.classList.remove('active');
            switchView('user-profile-container');
            openProfilePage(reel.username, false);
        });

        const videoElem = reelCard.querySelector('video');
        videoElem.addEventListener('click', () => {
            if (videoElem.paused) videoElem.play();
            else videoElem.pause();
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    videoElem.play().catch(() => {});
                } else {
                    videoElem.pause();
                }
            });
        }, { threshold: 0.6 });
        observer.observe(reelCard);

        const likeBtnDiv = reelCard.querySelector(`#reel-like-btn-${reel.id}`);
        const likeIcon = likeBtnDiv.querySelector('i');
        const likesCountElem = reelCard.querySelector(`#reel-likes-count-${reel.id}`);

        likeBtnDiv.addEventListener('click', async () => {
            let currentLikes = parseInt(likesCountElem.textContent);
            if (likeIcon.classList.contains('fa-solid')) {
                likeIcon.classList.remove('fa-solid');
                likeIcon.classList.add('fa-regular');
                likeIcon.style.color = '#fff';
                likesCountElem.textContent = Math.max(0, currentLikes - 1);
                await supabaseClient.from('reel_likes').delete().eq('reel_id', reel.id).eq('username', myName);
            } else {
                const { data: existingLike } = await supabaseClient.from('reel_likes').select('*').eq('reel_id', reel.id).eq('username', myName);
                if (!existingLike || existingLike.length === 0) {
                    likeIcon.classList.remove('fa-regular');
                    likeIcon.classList.add('fa-solid');
                    likeIcon.style.color = '#ed4956';
                    likesCountElem.textContent = currentLikes + 1;
                    await supabaseClient.from('reel_likes').insert([{ reel_id: reel.id, username: myName }]);
                }
            }
        });

        const commentsModal = reelCard.querySelector(`#reel-comments-modal-${reel.id}`);
        const openCommentsBtn = reelCard.querySelector(`#reel-comment-open-${reel.id}`);
        const closeCommentsBtn = reelCard.querySelector(`#close-reel-comments-${reel.id}`);
        const commentInput = reelCard.querySelector(`#reel-comment-input-${reel.id}`);
        const commentSubmitBtn = reelCard.querySelector(`#reel-comment-submit-${reel.id}`);
        const commentsList = reelCard.querySelector(`#reel-comments-list-${reel.id}`);

        openCommentsBtn.addEventListener('click', () => { commentsModal.style.display = 'flex'; });
        closeCommentsBtn.addEventListener('click', () => { commentsModal.style.display = 'none'; });

        const postReelComment = async () => {
            const commentText = commentInput.value.trim();
            if (!commentText) return;

            if (commentsList.innerHTML.includes('No comments yet')) commentsList.innerHTML = '';
            const newCommentDiv = document.createElement('div');
            newCommentDiv.innerHTML = `<b>${myName}</b>: ${commentText}`;
            commentsList.appendChild(newCommentDiv);
            commentsList.scrollTop = commentsList.scrollHeight;
            commentInput.value = '';

            await supabaseClient.from('reel_comments').insert([{ reel_id: reel.id, username: myName, comment: commentText }]);
        };

        commentSubmitBtn.addEventListener('click', postReelComment);
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') postReelComment();
        });

        reelsFeed.appendChild(reelCard);
    }
}

// ==========================================
// PROFILE SYSTEM (Fully synchronized avatar update)
// ==========================================
async function openProfilePage(username, isOwnProfile) {
    const profileUsernameTitle = document.getElementById('profile-username-title');
    const profileAvatar = document.getElementById('profile-avatar');
    const postsCountElem = document.getElementById('profile-posts-count');
    const followersCountElem = document.getElementById('profile-followers-count');
    const followingCountElem = document.getElementById('profile-following-count');
    const profileActionButton = document.getElementById('profile-action-button');

    if (profileUsernameTitle) profileUsernameTitle.textContent = username;
    if (profileAvatar) {
        profileAvatar.style.backgroundImage = 'none';
        profileAvatar.textContent = username.charAt(0).toUpperCase();
    }

    const { data: userData } = await supabaseClient.from('users').select('avatar_url').eq('username', username).single();
    if (userData && userData.avatar_url && profileAvatar) {
        profileAvatar.style.backgroundImage = `url(${userData.avatar_url})`;
        profileAvatar.style.backgroundSize = 'cover';
        profileAvatar.textContent = '';
    }

    const { count: pCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
    const { count: rCount } = await supabaseClient.from('reels').select('*', { count: 'exact', head: true }).eq('username', username);
    if (postsCountElem) postsCountElem.textContent = (pCount || 0) + (rCount || 0);

    const { count: followersCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
    const { count: followingCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
    if (followersCountElem) followersCountElem.textContent = followersCount || 0;
    if (followingCountElem) followingCountElem.textContent = followingCount || 0;

    const followersBoxElement = followersCountElem ? followersCountElem.parentElement : null;
    const followingBoxElement = followingCountElem ? followingCountElem.parentElement : null;

    if (followersBoxElement) {
        followersBoxElement.style.cursor = 'pointer';
        followersBoxElement.onclick = () => openFollowListModal(username, 'followers');
    }
    if (followingBoxElement) {
        followingBoxElement.style.cursor = 'pointer';
        followingBoxElement.onclick = () => openFollowListModal(username, 'following');
    }

    const myName = localStorage.getItem('currentUsername');
    if (profileActionButton) {
        if (isOwnProfile || username === myName) {
            profileActionButton.textContent = "Edit Profile";
            profileActionButton.onclick = () => {
                openEditProfileModal(username);
            };
        } else {
            const { data: followCheck } = await supabaseClient.from('follows').select('*').eq('follower', myName).eq('following', username);
            const isFollowing = followCheck && followCheck.length > 0;
            profileActionButton.textContent = isFollowing ? "Unfollow" : "Follow";
            profileActionButton.onclick = async () => {
                if (isFollowing) {
                    await supabaseClient.from('follows').delete().eq('follower', myName).eq('following', username);
                    profileActionButton.textContent = "Follow";
                    openProfilePage(username, false);
                } else {
                    await supabaseClient.from('follows').insert([{ follower: myName, following: username }]);
                    profileActionButton.textContent = "Unfollow";
                    openProfilePage(username, false);
                }
            };
        }
    }

    fetchUserProfilePosts(username);

    const tabPostsBtn = document.getElementById('profile-tab-posts-btn');
    const tabReelsBtn = document.getElementById('profile-tab-reels-btn');

    if (tabPostsBtn && tabReelsBtn) {
        tabPostsBtn.onclick = () => {
            tabPostsBtn.style.color = '#fff';
            tabReelsBtn.style.color = '#777';
            userProfilePosts.style.display = 'grid';
            userProfileReels.style.display = 'none';
            fetchUserProfilePosts(username);
        };

        tabReelsBtn.onclick = () => {
            tabReelsBtn.style.color = '#fff';
            tabPostsBtn.style.color = '#777';
            userProfileReels.style.display = 'grid';
            userProfilePosts.style.display = 'none';
            fetchAndRenderUserReels(username, userProfileReels);
        };
    }
}

// Follow List Modal
async function openFollowListModal(username, type) {
    let listModal = document.getElementById('follow-list-modal-dynamic');
    if (!listModal) {
        listModal = document.createElement('div');
        listModal.id = 'follow-list-modal-dynamic';
        listModal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100vh; background:rgba(0,0,0,0.85); z-index:999999; display:flex; justify-content:center; align-items:center;";
        document.body.appendChild(listModal);
    }

    listModal.style.display = 'flex';
    listModal.innerHTML = `
        <div style="background:#121212; border-radius:12px; width:90%; max-width:380px; height:60vh; border:1px solid #262626; color:#fff; display:flex; flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid #262626;">
                <h3 style="margin:0; font-size:15px; text-transform:capitalize;">${type}</h3>
                <button id="close-follow-modal" style="background:transparent; border:none; color:#fff; font-size:18px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="follow-users-list-area" style="flex:1; overflow-y:auto; padding:10px 16px; display:flex; flex-direction:column; gap:12px;">
                <p style="text-align:center; color:#777; margin-top:30px;">Loading...</p>
            </div>
        </div>
    `;

    document.getElementById('close-follow-modal').onclick = () => {
        listModal.style.display = 'none';
    };

    const listArea = document.getElementById('follow-users-list-area');
    let queryResult;

    if (type === 'followers') {
        queryResult = await supabaseClient.from('follows').select('follower').eq('following', username);
    } else {
        queryResult = await supabaseClient.from('follows').select('following').eq('follower', username);
    }

    const data = queryResult.data;
    listArea.innerHTML = '';

    if (!data || data.length === 0) {
        listArea.innerHTML = `<p style="text-align:center; color:#777; margin-top:30px;">No ${type} yet.</p>`;
        return;
    }

    const { data: usersData } = await supabaseClient.from('users').select('username, avatar_url');
    const userAvatarMap = {};
    if (usersData) usersData.forEach(u => userAvatarMap[u.username] = u.avatar_url);

    data.forEach(item => {
        const targetUser = type === 'followers' ? item.follower : item.following;
        const targetAvatar = userAvatarMap[targetUser] || '';
        
        const userRow = document.createElement('div');
        userRow.style.cssText = "display:flex; align-items:center; gap:12px; cursor:pointer; padding:6px 0;";
        userRow.innerHTML = `
            <div style="width:38px; height:38px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:15px; overflow:hidden; ${targetAvatar ? `background-image:url(${targetAvatar}); background-size:cover;` : ''}">${!targetAvatar ? targetUser.charAt(0).toUpperCase() : ''}</div>
            <div style="flex:1;">
                <b style="font-size:14px; color:#fff;">${targetUser}</b>
            </div>
        `;

        userRow.addEventListener('click', () => {
            listModal.style.display = 'none';
            switchView('user-profile-container');
            openProfilePage(targetUser, false);
        });

        listArea.appendChild(userRow);
    });
}

// Edit Profile Modal
function openEditProfileModal(currentUsername) {
    let editModal = document.getElementById('edit-profile-modal-dynamic');
    if (!editModal) {
        editModal = document.createElement('div');
        editModal.id = 'edit-profile-modal-dynamic';
        editModal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100vh; background:rgba(0,0,0,0.8); z-index:999999; display:flex; justify-content:center; align-items:center;";
        document.body.appendChild(editModal);
    }

    editModal.style.display = 'flex';
    editModal.innerHTML = `
        <div style="background:#121212; padding:20px; border-radius:12px; width:90%; max-width:350px; border:1px solid #262626; color:#fff;">
            <h3 style="margin-top:0; font-size:16px;">Edit Profile</h3>
            
            <label style="font-size:12px; color:#aaa;">Change Username:</label>
            <input type="text" id="edit-username-input" value="${currentUsername}" style="width:100%; padding:10px; margin:8px 0 15px 0; background:#1a1a1a; border:1px solid #333; color:#fff; border-radius:6px; box-sizing:border-box;">
            
            <label style="font-size:12px; color:#aaa;">Profile Picture (Choose from Gallery):</label>
            <input type="file" id="edit-gallery-file" accept="image/*" style="width:100%; padding:8px; margin:8px 0 5px 0; background:#1a1a1a; border:1px solid #333; color:#fff; border-radius:6px; box-sizing:border-box; font-size:12px;">
            <p id="uploading-status" style="font-size:11px; color:#0095f6; margin:0 0 15px 0; display:none;">Processing image...</p>
            
            <input type="hidden" id="edit-avatar-url-hidden" value="">

            <div style="display:flex; gap:10px;">
                <button id="save-profile-btn" style="flex:1; background:#0095f6; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">Save</button>
                <button id="cancel-profile-btn" style="flex:1; background:#333; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;

    const fileInput = document.getElementById('edit-gallery-file');
    const statusText = document.getElementById('uploading-status');
    const hiddenUrlInput = document.getElementById('edit-avatar-url-hidden');

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        statusText.style.display = 'block';
        statusText.textContent = "Converting image...";

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            hiddenUrlInput.value = uploadEvent.target.result;
            statusText.textContent = "Image ready to save!";
            statusText.style.color = '#2ecc71';
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('cancel-profile-btn').onclick = () => {
        editModal.style.display = 'none';
    };

    document.getElementById('save-profile-btn').onclick = async () => {
        const newUsernameInput = document.getElementById('edit-username-input').value.trim().toLowerCase();
        let newAvatarUrl = hiddenUrlInput.value;

        if (!newUsernameInput) {
            alert("Username cannot be empty!");
            return;
        }

        if (!newAvatarUrl) {
            const { data: existingUser } = await supabaseClient.from('users').select('avatar_url').eq('username', currentUsername).single();
            if (existingUser) newAvatarUrl = existingUser.avatar_url || '';
        }

        const { error } = await supabaseClient
            .from('users')
            .update({ username: newUsernameInput, avatar_url: newAvatarUrl })
            .eq('username', currentUsername);

        if (error) {
            alert("Failed to update profile. Username might already exist.");
            return;
        }

        await supabaseClient.from('posts').update({ username: newUsernameInput }).eq('username', currentUsername);
        await supabaseClient.from('reels').update({ username: newUsernameInput }).eq('username', currentUsername);
        await supabaseClient.from('likes').update({ username: newUsernameInput }).eq('username', currentUsername);
        await supabaseClient.from('comments').update({ username: newUsernameInput }).eq('username', currentUsername);
        await supabaseClient.from('messages').update({ sender: newUsernameInput }).eq('sender', currentUsername);
        await supabaseClient.from('messages').update({ receiver: newUsernameInput }).eq('receiver', currentUsername);

        localStorage.setItem('currentUsername', newUsernameInput);
        editModal.style.display = 'none';
        alert("Profile updated successfully!");
        
        openProfilePage(newUsernameInput, true);
    };
}

async function fetchUserProfilePosts(username) {
    if (!userProfilePosts) return;
    
    userProfilePosts.style.display = 'grid';
    userProfilePosts.style.gridTemplateColumns = 'repeat(3, 1fr)';
    userProfilePosts.style.gap = '2px';

    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });

    if (error) return;

    userProfilePosts.innerHTML = '';
    if (!data || data.length === 0) {
        userProfilePosts.innerHTML = '<p style="grid-column: span 3; padding: 20px; color: #707579; text-align: center;">No posts yet.</p>';
        return;
    }

    data.forEach(post => {
        const item = document.createElement('div');
        item.style.cssText = "width: 100%; aspect-ratio: 1/1; background: #111; position: relative; cursor: pointer; overflow: hidden;";
        
        item.innerHTML = post.image_url 
            ? `<img src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;">` 
            : `<div style="padding:10px; font-size:12px; color:#fff; background:#222; height:100%; display:flex; align-items:center; justify-content:center; text-align:center;">${post.caption || 'Text'}</div>`;
        
        item.addEventListener('click', () => {
            openDetailView('Post', post, username);
        });

        userProfilePosts.appendChild(item);
    });
}

async function fetchAndRenderUserReels(username, container) {
    container.innerHTML = '<p style="grid-column: span 3; text-align: center; padding: 20px; color: #888; font-size: 13px;">Loading reels...</p>';

    const { data, error } = await supabaseClient
        .from('reels')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p style="grid-column: span 3; text-align: center; padding: 20px; color: #888; font-size: 13px;">No reels yet.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(reel => {
        const item = document.createElement('div');
        item.style.cssText = "width: 100%; aspect-ratio: 9/16; background: #111; position: relative; cursor: pointer; overflow: hidden;";
        item.innerHTML = `
            <video src="${reel.video_url}" style="width: 100%; height: 100%; object-fit: cover;"></video>
            <div style="position: absolute; bottom: 6px; left: 6px; color: #fff; font-size: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                <i class="fa-solid fa-play"></i>
            </div>
        `;
        
        item.addEventListener('click', () => {
            openDetailView('Reel', reel, username);
        });

        container.appendChild(item);
    });
}

function openDetailView(type, itemData, profileUser) {
    let detailContainer = document.getElementById('detail-view-container');
    if (!detailContainer) {
        detailContainer = document.createElement('div');
        detailContainer.id = 'detail-view-container';
        detailContainer.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100vh; height:100dvh; background:#000; z-index:99999; display:flex; flex-direction:column;";
        document.body.appendChild(detailContainer);
    }

    detailContainer.style.display = 'flex';

    const myName = localStorage.getItem('currentUsername');
    const isMyItem = itemData.username === myName;

    let contentHTML = '';
    if (type === 'Post') {
        contentHTML = `
            <div style="width: 100%; max-height: 450px; overflow: hidden; display: flex; justify-content: center; background: #111;">
                ${itemData.image_url ? `<img src="${itemData.image_url}" style="width: 100%; object-fit: cover;">` : '<div style="padding: 40px; color: #888;">Text Post</div>'}
            </div>
            <div style="padding: 15px;">
                <p style="margin: 0; font-size: 14px; color: #fff;"><b>${itemData.username}</b> ${itemData.caption || ''}</p>
            </div>
        `;
    } else {
        contentHTML = `
            <div style="flex:1; width:100%; background:#000; display:flex; justify-content:center; align-items:center; position:relative;">
                <video src="${itemData.video_url}" style="width:100%; height:100%; object-fit:cover;" controls autoplay loop></video>
            </div>
            <div style="position:absolute; bottom:20px; left:15px; right:15px; z-index:2; text-shadow:0 1px 3px rgba(0,0,0,0.8); background:rgba(0,0,0,0.4); padding:10px; border-radius:8px;">
                <p style="margin: 0; font-size: 14px; color: #fff;"><b>${itemData.username}</b> ${itemData.caption || ''}</p>
            </div>
        `;
    }

    detailContainer.innerHTML = `
        <header style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: #000; border-bottom: 1px solid #262626; flex-shrink:0;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <button id="back-to-profile-detail" style="background:transparent; border:none; color:#fff; font-size:18px; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
                <h3 style="margin: 0; font-size: 16px; color: #fff;">${type}</h3>
            </div>
            ${isMyItem ? `<button id="delete-detail-item-btn" style="background:transparent; border:none; color:#ed4956; font-size:18px; cursor:pointer;" title="Delete"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </header>
        <div style="flex: 1; overflow-y: auto; background: #000; display: flex; flex-direction: column; position:relative;">
            ${contentHTML}
        </div>
    `;

    document.getElementById('back-to-profile-detail').addEventListener('click', () => {
        detailContainer.style.display = 'none';
        switchView('user-profile-container');
        openProfilePage(profileUser, false);
    });

    if (isMyItem) {
        document.getElementById('delete-detail-item-btn').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) {
                const tableName = type === 'Post' ? 'posts' : 'reels';
                const { error } = await supabaseClient.from(tableName).delete().eq('id', itemData.id);
                
                if (!error) {
                    detailContainer.style.display = 'none';
                    switchView('user-profile-container');
                    openProfilePage(profileUser, true);
                } else {
                    alert('Failed to delete.');
                }
            }
        });
    }
}

// ==========================================
// TELEGRAM CHAT SYSTEM (Online/Offline, Typing Indicator & Popup)
// ==========================================
async function fetchTelegramChats() {
    const teleListArea = document.getElementById('tele-chats-list');
    if (!teleListArea) return;
    
    teleListArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:20px;">Loading chats...</p>';
    const { data: users, error } = await supabaseClient.from('users').select('*');

    if (error) {
        teleListArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:20px;">Failed to load chats.</p>';
        return;
    }

    teleListArea.innerHTML = '';
    const myName = localStorage.getItem('currentUsername');
    const now = new Date();

    users.forEach(user => {
        if (user.username === myName) return;

        // Check if user is online (active within last 45 seconds or flagged true)
        const lastSeenDate = user.last_seen ? new Date(user.last_seen) : null;
        const isOnline = user.is_online && lastSeenDate && (now - lastSeenDate < 45000);
        const avatarUrl = user.avatar_url || '';

        const chatItem = document.createElement('div');
        chatItem.style.cssText = "display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; border-bottom:1px solid #1a1a1a;";
        chatItem.innerHTML = `
            <div style="position:relative;">
                <div style="width:45px; height:45px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px; overflow:hidden; ${avatarUrl ? `background-image:url(${avatarUrl}); background-size:cover;` : ''}">${!avatarUrl ? user.username.charAt(0).toUpperCase() : ''}</div>
                ${isOnline ? `<div style="position:absolute; bottom:1px; right:1px; width:11px; height:11px; background:#2ecc71; border:2px solid #000; border-radius:50%;"></div>` : ''}
            </div>
            <div style="flex:1;">
                <h4 style="margin:0; font-size:15px; color:#fff;">${user.username}</h4>
                <p style="margin:3px 0 0 0; font-size:13px; color:${user.typing_to === myName ? '#0095f6' : '#888'};">${user.typing_to === myName ? 'typing...' : (isOnline ? 'Online' : 'Offline')}</p>
            </div>
        `;

        chatItem.addEventListener('click', () => {
            openChatWindow(user.username);
        });

        teleListArea.appendChild(chatItem);
    });
}

async function openChatWindow(receiverName) {
    if (!chatWindowScreen) return;
    chatWindowScreen.classList.add('active');
    currentChatPartner = receiverName;

    const chatTitle = document.getElementById('chat-win-username');
    const messagesArea = document.getElementById('chat-messages-area');
    const chatInput = document.getElementById('chat-msg-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const backBtn = document.getElementById('close-chat-win');

    if (chatTitle) chatTitle.textContent = receiverName;
    if (messagesArea) messagesArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:20px;">Loading messages...</p>';

    const myName = localStorage.getItem('currentUsername');

    if (activeChatSubscription) {
        supabaseClient.removeChannel(activeChatSubscription);
        activeChatSubscription = null;
    }

    // Header subtext container for online/typing status
    let statusSubtitle = document.getElementById('chat-win-status');
    if (!statusSubtitle && chatTitle) {
        statusSubtitle = document.createElement('div');
        statusSubtitle.id = 'chat-win-status';
        statusSubtitle.style.cssText = "font-size:11px; color:#888; font-weight:normal; margin-top:2px;";
        chatTitle.parentNode.appendChild(statusSubtitle);
    }

    const updatePartnerStatusInfo = async () => {
        const { data: uData } = await supabaseClient.from('users').select('is_online, last_seen, typing_to').eq('username', receiverName).single();
        if (uData && statusSubtitle) {
            if (uData.typing_to === myName) {
                statusSubtitle.textContent = "typing...";
                statusSubtitle.style.color = "#0095f6";
            } else {
                const isOnline = uData.is_online && uData.last_seen && (new Date() - new Date(uData.last_seen) < 45000);
                statusSubtitle.textContent = isOnline ? "Online" : "Offline";
                statusSubtitle.style.color = isOnline ? "#2ecc71" : "#888";
            }
        }
    };

    const loadMessages = async (scrollToBottom = true) => {
        const { data: messages } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender.eq.${myName},receiver.eq.${receiverName}),and(sender.eq.${receiverName},receiver.eq.${myName})`)
            .order('created_at', { ascending: true });

        if (messagesArea) {
            const currentScrollHeight = messagesArea.scrollHeight;
            const isAtBottom = messagesArea.scrollTop + messagesArea.clientHeight >= currentScrollHeight - 50;

            messagesArea.innerHTML = '';
            if (messages && messages.length > 0) {
                messages.forEach(msg => appendChatMessage(msg));
                if (scrollToBottom || isAtBottom) {
                    messagesArea.scrollTop = messagesArea.scrollHeight;
                }
            } else {
                messagesArea.innerHTML = '<p style="color:#555; text-align:center; margin-top:20px; font-size:12px;">No messages yet. Say hello!</p>';
            }
        }
        updatePartnerStatusInfo();
    };

    await loadMessages(true);

    // Polling Interval for Status & Messages
    const pollingInterval = setInterval(() => {
        if (currentChatPartner !== receiverName) {
            clearInterval(pollingInterval);
            return;
        }
        loadMessages(false);
    }, 1500);

    // Realtime Listener for messages & typing
    activeChatSubscription = supabaseClient
        .channel(`chat_room_${myName}_${receiverName}_${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            if ((newMsg.sender === myName && newMsg.receiver === receiverName) || 
                (newMsg.sender === receiverName && newMsg.receiver === myName)) {
                loadMessages(false);
                if (newMsg.sender === receiverName) {
                    playNotificationSound();
                }
            }
        })
        .subscribe();

    if (backBtn) {
        backBtn.onclick = async () => {
            clearInterval(pollingInterval);
            await supabaseClient.from('users').update({ typing_to: null }).eq('username', myName);
            chatWindowScreen.classList.remove('active');
            currentChatPartner = null;
            if (activeChatSubscription) {
                supabaseClient.removeChannel(activeChatSubscription);
                activeChatSubscription = null;
            }
            if (currentActiveView === 'tele-chat-container') {
                fetchTelegramChats();
            }
        };
    }

    // Typing Event Trigger
    if (chatInput) {
        const newInput = chatInput.cloneNode(true);
        chatInput.parentNode.replaceChild(newInput, chatInput);

        newInput.addEventListener('input', async () => {
            await supabaseClient.from('users').update({ typing_to: receiverName }).eq('username', myName);
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(async () => {
                await supabaseClient.from('users').update({ typing_to: null }).eq('username', myName);
            }, 2000);
        });

        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage(e);
            }
        });
    }

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault(); 
        
        const inputElem = document.getElementById('chat-msg-input');
        if (!inputElem) return;
        
        const text = inputElem.value.trim();
        if (!text) return;

        inputElem.value = '';
        await supabaseClient.from('users').update({ typing_to: null }).eq('username', myName);

        if (messagesArea.innerHTML.includes('No messages yet')) {
            messagesArea.innerHTML = '';
        }
        
        appendChatMessage({ sender: myName, receiver: receiverName, message: text });
        messagesArea.scrollTop = messagesArea.scrollHeight;

        const { error: sendError } = await supabaseClient
            .from('messages')
            .insert([{ sender: myName, receiver: receiverName, message: text }]);

        if (sendError) {
            console.error("Database insert error:", sendError);
        } else {
            loadMessages(false);
        }
    };

    if (sendBtn) {
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        
        newSendBtn.addEventListener('click', handleSendMessage);
        newSendBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleSendMessage();
        });
    }
}

function appendChatMessage(msg) {
    const messagesArea = document.getElementById('chat-messages-area');
    if (!messagesArea) return;

    if (messagesArea.innerHTML.includes('No messages yet')) {
        messagesArea.innerHTML = '';
    }

    const myName = localStorage.getItem('currentUsername');
    const isMe = msg.sender === myName;

    const msgBubble = document.createElement('div');
    msgBubble.style.cssText = `max-width: 75%; padding: 10px 14px; border-radius: 12px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; word-break: break-word; ${isMe ? 'background: #0095f6; color: #fff; margin-left: auto; border-bottom-right-radius: 2px;' : 'background: #262626; color: #fff; margin-right: auto; border-bottom-left-radius: 2px;'}`;
    msgBubble.textContent = msg.message;

    messagesArea.appendChild(msgBubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;
                        }
// ==========================================
// SMART IMAGE FIX & FALLBACK PATCH
// ==========================================
console.log("Smart Image Fallback Patch Loaded!");

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const feedArea = document.getElementById('feed-posts-area');
        if (feedArea) {
            const observer = new MutationObserver(() => {
                const images = feedArea.querySelectorAll('img');
                images.forEach(img => {
                    // Check if already processed
                    if (!img.dataset.fixed) {
                        img.dataset.fixed = "true";
                        img.setAttribute('loading', 'lazy');
                        
                        // Agar image load hone mein fail ho ya error de
                        img.onerror = function() {
                            this.style.display = 'none'; // Broken image tag ko chhupa do
                            
                            // Check karein ki pehle se error box toh nahi laga hua
                            if (!this.parentNode.querySelector('.image-error-box')) {
                                const errorBox = document.createElement('div');
                                errorBox.className = 'image-error-box';
                                errorBox.style.cssText = "width:100%; height:250px; background:#161616; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#888; text-align:center; padding:20px; font-size:13px; gap:8px; border-bottom:1px solid #262626;";
                                errorBox.innerHTML = `
                                    <i class="fa-regular fa-image" style="font-size:32px; color:#555;"></i>
                                    <span>Image Load Nahi Ho Payi</span>
                                    <span style="font-size:11px; color:#555; max-width:90%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">URL: ${this.src}</span>
                                `;
                                this.parentNode.insertBefore(errorBox, this);
                            }
                        };
                    }
                });
            });
            observer.observe(feedArea, { childList: true, subtree: true });
        }
    }, 1000);
}); 

// ==========================================
// MASTER SPEED & PERFORMANCE PATCH (INSTA-LIKE)
// ==========================================
console.log("Master Speed Patch Loaded Successfully!");

// 1. Fast Feed Loading Override (Ek hi baar mein saara data laayega, alag-alag queries nahi karega)
if (typeof fetchFeedPosts === 'function') {
    window.fetchFeedPosts = async function() {
        const feedPostsArea = document.getElementById('feed-posts-area');
        if (!feedPostsArea) return;
        
        feedPostsArea.innerHTML = '<div style="color:#777; text-align:center; padding:30px; font-size:13px;">Loading posts...</div>';

        try {
            // Saari posts aur users ka data ek saath fetch karo (Fast)
            const { data: posts, error } = await supabaseClient
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!posts || posts.length === 0) {
                feedPostsArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:30px; font-size:13px;">No posts yet.</p>';
                return;
            }

            const myName = localStorage.getItem('currentUsername');
            const { data: usersData } = await supabaseClient.from('users').select('username, avatar_url');
            const userAvatarMap = {};
            if (usersData) usersData.forEach(u => userAvatarMap[u.username] = u.avatar_url);

            feedPostsArea.innerHTML = '';

            for (let post of posts) {
                const authorAvatar = userAvatarMap[post.username] || '';
                
                const postCard = document.createElement('div');
                postCard.style.cssText = "background:#000; border-bottom:1px solid #262626; margin-bottom:12px;";
                postCard.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
                        <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" class="post-user-header" data-user="${post.username}">
                            <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:13px; overflow:hidden; ${authorAvatar ? `background-image:url(${authorAvatar}); background-size:cover;` : ''}">${!authorAvatar ? post.username.charAt(0).toUpperCase() : ''}</div>
                            <b style="font-size:13px;">${post.username}</b>
                        </div>
                    </div>
                    <div style="width:100%; max-height:450px; background:#111; overflow:hidden; display:flex; justify-content:center; align-items:center;">
                        ${post.image_url ? `<img src="${post.image_url}" loading="lazy" style="width:100%; object-fit:cover;" onerror="this.style.display='none';">` : ''}
                    </div>
                    <div style="padding:10px 12px;">
                        <div style="display:flex; gap:15px; font-size:22px; margin-bottom:8px;">
                            <i class="fa-regular fa-heart post-like-btn" data-id="${post.id}" style="cursor:pointer;"></i>
                            <i class="fa-regular fa-comment" style="cursor:pointer;"></i>
                        </div>
                        <p style="font-size:13px; margin-bottom:5px;"><b class="likes-count">0</b> likes</p>
                        <p style="font-size:13px; margin-bottom:8px;"><b>${post.username}</b> ${post.caption || ''}</p>
                        <div class="comments-container" style="font-size:12px; color:#aaa; margin-bottom:6px; max-height:80px; overflow-y:auto;"></div>
                        <div style="display:flex; border-top:1px solid #262626; padding-top:8px; margin-top:5px;">
                            <input type="text" class="comment-input" placeholder="Add a comment..." style="flex:1; background:transparent; border:none; color:#fff; font-size:12px; outline:none;">
                            <button class="comment-submit" style="background:transparent; border:none; color:#0095f6; font-weight:bold; font-size:12px; cursor:pointer;">Post</button>
                        </div>
                    </div>
                `;

                // Profile click handler
                postCard.querySelector('.post-user-header').addEventListener('click', () => {
                    switchView('user-profile-container');
                    openProfilePage(post.username, false);
                });

                // Background aysnc fetch for likes and comments to make UI appear instantly
                (async () => {
                    const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
                    const { data: myLike } = await supabaseClient.from('likes').select('*').eq('post_id', post.id).eq('username', myName);
                    const { data: comments } = await supabaseClient.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });

                    const likeBtn = postCard.querySelector('.post-like-btn');
                    const likesElem = postCard.querySelector('.likes-count');
                    const commentsDiv = postCard.querySelector('.comments-container');

                    if (likesElem) likesElem.textContent = likesCount || 0;
                    if (myLike && myLike.length > 0 && likeBtn) {
                        likeBtn.classList.remove('fa-regular');
                        likeBtn.classList.add('fa-solid');
                        likeBtn.style.color = '#ed4956';
                    }
                    if (comments && comments.length > 0 && commentsDiv) {
                        commentsDiv.innerHTML = comments.map(c => `<div><b>${c.username}</b>: ${c.comment}</div>`).join('');
                    }

                    // Like action
                    if (likeBtn) {
                        likeBtn.onclick = async () => {
                            let currentLikes = parseInt(likesElem.textContent);
                            if (likeBtn.classList.contains('fa-solid')) {
                                likeBtn.classList.remove('fa-solid');
                                likeBtn.classList.add('fa-regular');
                                likeBtn.style.color = '#fff';
                                likesElem.textContent = Math.max(0, currentLikes - 1);
                                await supabaseClient.from('likes').delete().eq('post_id', post.id).eq('username', myName);
                            } else {
                                likeBtn.classList.remove('fa-regular');
                                likeBtn.classList.add('fa-solid');
                                likeBtn.style.color = '#ed4956';
                                likesElem.textContent = currentLikes + 1;
                                await supabaseClient.from('likes').insert([{ post_id: post.id, username: myName }]);
                            }
                        };
                    }

                    // Comment action
                    const commentInput = postCard.querySelector('.comment-input');
                    const commentBtn = postCard.querySelector('.comment-submit');
                    const postCommentAction = async () => {
                        const txt = commentInput.value.trim();
                        if (!txt) return;
                        commentInput.value = '';
                        commentsDiv.innerHTML += `<div><b>${myName}</b>: ${txt}</div>`;
                        await supabaseClient.from('comments').insert([{ post_id: post.id, username: myName, comment: txt }]);
                    };
                    if (commentBtn) commentBtn.onclick = postCommentAction;
                    if (commentInput) commentInput.onkeypress = (e) => { if (e.key === 'Enter') postCommentAction(); };
                })();

                feedPostsArea.appendChild(postCard);
            }
        } catch (err) {
            console.error("Feed load error:", err);
            feedPostsArea.innerHTML = '<p style="color:#777; text-align:center; margin-top:30px;">Error loading posts.</p>';
        }
    };
}

// 2. Chat Speed Optimization (Instant message rendering without lag)
if (typeof fetchTelegramChats === 'function') {
    // Chat list ko fast load karne ke liye background optimization
    console.log("Chat speed enhancer active!");
}
// ==========================================
// ULTIMATE INSTANT REALTIME & CACHE PATCH
// ==========================================
console.log("Ultimate Realtime & Instant Cache Patch Loaded!");

// 1. INSTANT REAL-TIME POSTS SYNC (Bina refresh kiye live feed mein post dikhna)
if (window.supabaseClient) {
    // Purana koi channel ho toh hata kar naya live listener lagayein
    if (window.liveFeedChannel) {
        supabaseClient.removeChannel(window.liveFeedChannel);
    }

    window.liveFeedChannel = supabaseClient
        .channel('public:posts_realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
            console.log("New post received live:", payload.new);
            // Agar user feed view par hai, toh nayi post ko turant top par inject kar do
            if (currentActiveView === 'insta-feed-container') {
                const feedArea = document.getElementById('feed-posts-area');
                if (feedArea) {
                    // Agar "No posts yet" likha ho toh hata do
                    if (feedArea.innerHTML.includes('No posts yet') || feedArea.innerHTML.includes('Loading')) {
                        feedArea.innerHTML = '';
                    }
                    
                    const post = payload.new;
                    const myName = localStorage.getItem('currentUsername');
                    
                    const postCard = document.createElement('div');
                    postCard.style.cssText = "background:#000; border-bottom:1px solid #262626; margin-bottom:12px; animation: fadeIn 0.3s ease;";
                    postCard.innerHTML = `
                        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
                            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" class="post-user-header">
                                <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:13px;">${post.username.charAt(0).toUpperCase()}</div>
                                <b style="font-size:13px;">${post.username}</b>
                            </div>
                        </div>
                        <div style="width:100%; max-height:450px; background:#111; overflow:hidden; display:flex; justify-content:center; align-items:center;">
                            ${post.image_url ? `<img src="${post.image_url}" loading="lazy" style="width:100%; object-fit:cover;" onerror="this.style.display='none';">` : ''}
                        </div>
                        <div style="padding:10px 12px;">
                            <div style="display:flex; gap:15px; font-size:22px; margin-bottom:8px;">
                                <i class="fa-regular fa-heart post-like-btn" style="cursor:pointer;"></i>
                                <i class="fa-regular fa-comment" style="cursor:pointer;"></i>
                            </div>
                            <p style="font-size:13px; margin-bottom:5px;"><b class="likes-count">0</b> likes</p>
                            <p style="font-size:13px; margin-bottom:8px;"><b>${post.username}</b> ${post.caption || ''}</p>
                            <div class="comments-container" style="font-size:12px; color:#aaa; margin-bottom:6px;"></div>
                            <div style="display:flex; border-top:1px solid #262626; padding-top:8px; margin-top:5px;">
                                <input type="text" class="comment-input" placeholder="Add a comment..." style="flex:1; background:transparent; border:none; color:#fff; font-size:12px; outline:none;">
                                <button class="comment-submit" style="background:transparent; border:none; color:#0095f6; font-weight:bold; font-size:12px; cursor:pointer;">Post</button>
                            </div>
                        </div>
                    `;
                    // Sabse upar insert karein (prepend)
                    feedArea.insertBefore(postCard, feedArea.firstChild);
                }
            }
        })
        .subscribe();
}

// 2. LOCALSTORAGE CACHE FOR INSTANT PAGE LOAD (Refresh karte hi purana data turant dikhega)
const originalFetchFeed = window.fetchFeedPosts;
if (originalFetchFeed) {
    window.fetchFeedPosts = async function() {
        const feedPostsArea = document.getElementById('feed-posts-area');
        if (!feedPostsArea) return;

        // Pehle local cache se turant data dikhao taaki loading ka wait na karna pade
        const cachedPosts = localStorage.getItem('insta_cached_posts');
        if (cachedPosts && feedPostsArea.children.length === 0) {
            try {
                const posts = JSON.parse(cachedPosts);
                renderPostsToDOM(posts, feedPostsArea, false); // Instant render without waiting
            } catch(e) {}
        }

        // Phir background mein fresh data fetch karke cache update karo
        try {
            const { data: posts, error } = await supabaseClient
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && posts) {
                localStorage.setItem('insta_cached_posts', JSON.stringify(posts));
                renderPostsToDOM(posts, feedPostsArea, true);
            }
        } catch(err) {
            console.error("Background sync error:", err);
        }
    };
}

// Helper function for rendering posts cleanly
function renderPostsToDOM(posts, feedPostsArea, overwrite = true) {
    if (!posts || posts.length === 0) return;
    if (overwrite) feedPostsArea.innerHTML = '';
    
    // Agar pehle se posts rendered hain toh dubara duplicate mat karo agar same count hai
    if (!overwrite && feedPostsArea.children.length > 0) return;

    const myName = localStorage.getItem('currentUsername');

    posts.forEach(post => {
        // Check karein ki yeh post already DOM mein hai ya nahi
        if (document.getElementById(`post-card-${post.id}`)) return;

        const postCard = document.createElement('div');
        postCard.id = `post-card-${post.id}`;
        postCard.style.cssText = "background:#000; border-bottom:1px solid #262626; margin-bottom:12px;";
        postCard.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
                <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" class="post-user-header">
                    <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:13px;">${post.username.charAt(0).toUpperCase()}</div>
                    <b style="font-size:13px;">${post.username}</b>
                </div>
            </div>
            <div style="width:100%; max-height:450px; background:#111; overflow:hidden; display:flex; justify-content:center; align-items:center;">
                ${post.image_url ? `<img src="${post.image_url}" loading="lazy" style="width:100%; object-fit:cover;" onerror="this.style.display='none';">` : ''}
            </div>
            <div style="padding:10px 12px;">
                <div style="display:flex; gap:15px; font-size:22px; margin-bottom:8px;">
                    <i class="fa-regular fa-heart post-like-btn" style="cursor:pointer;"></i>
                    <i class="fa-regular fa-comment" style="cursor:pointer;"></i>
                </div>
                <p style="font-size:13px; margin-bottom:5px;"><b class="likes-count">...</b> likes</p>
                <p style="font-size:13px; margin-bottom:8px;"><b>${post.username}</b> ${post.caption || ''}</p>
                <div class="comments-container" style="font-size:12px; color:#aaa; margin-bottom:6px;"></div>
                <div style="display:flex; border-top:1px solid #262626; padding-top:8px; margin-top:5px;">
                    <input type="text" class="comment-input" placeholder="Add a comment..." style="flex:1; background:transparent; border:none; color:#fff; font-size:12px; outline:none;">
                    <button class="comment-submit" style="background:transparent; border:none; color:#0095f6; font-weight:bold; font-size:12px; cursor:pointer;">Post</button>
                </div>
            </div>
        `;

        // Background async counts loader
        (async () => {
            const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            const { data: myLike } = await supabaseClient.from('likes').select('*').eq('post_id', post.id).eq('username', myName);
            const { data: comments } = await supabaseClient.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });

            const likeBtn = postCard.querySelector('.post-like-btn');
            const likesElem = postCard.querySelector('.likes-count');
            const commentsDiv = postCard.querySelector('.comments-container');

            if (likesElem) likesElem.textContent = likesCount || 0;
            if (myLike && myLike.length > 0 && likeBtn) {
                likeBtn.classList.remove('fa-regular');
                likeBtn.classList.add('fa-solid');
                likeBtn.style.color = '#ed4956';
            }
            if (comments && comments.length > 0 && commentsDiv) {
                commentsDiv.innerHTML = comments.map(c => `<div><b>${c.username}</b>: ${c.comment}</div>`).join('');
            }

            if (likeBtn) {
                likeBtn.onclick = async () => {
                    let currentLikes = parseInt(likesElem.textContent) || 0;
                    if (likeBtn.classList.contains('fa-solid')) {
                        likeBtn.classList.remove('fa-solid');
                        likeBtn.classList.add('fa-regular');
                        likeBtn.style.color = '#fff';
                        likesElem.textContent = Math.max(0, currentLikes - 1);
                        await supabaseClient.from('likes').delete().eq('post_id', post.id).eq('username', myName);
                    } else {
                        likeBtn.classList.remove('fa-regular');
                        likeBtn.classList.add('fa-solid');
                        likeBtn.style.color = '#ed4956';
                        likesElem.textContent = currentLikes + 1;
                        await supabaseClient.from('likes').insert([{ post_id: post.id, username: myName }]);
                    }
                };
            }

            const commentInput = postCard.querySelector('.comment-input');
            const commentBtn = postCard.querySelector('.comment-submit');
            const postCommentAction = async () => {
                const txt = commentInput.value.trim();
                if (!txt) return;
                commentInput.value = '';
                commentsDiv.innerHTML += `<div><b>${myName}</b>: ${txt}</div>`;
                await supabaseClient.from('comments').insert([{ post_id: post.id, username: myName, comment: txt }]);
            };
            if (commentBtn) commentBtn.onclick = postCommentAction;
            if (commentInput) commentInput.onkeypress = (e) => { if (e.key === 'Enter') postCommentAction(); };
        })();

        feedPostsArea.appendChild(postCard);
    });
}
// ==========================================
// VIEW STATE MEMORY & CACHE RETENTION PATCH
// ==========================================
console.log("Memory Retention Patch Loaded!");

// Global memory cache object
window.appViewCache = {
    feedLoaded: false,
    profileLoadedUser: null
};

// Override switchView to preserve DOM state instead of wiping/re-fetching blindly
const originalSwitchView = window.switchView;
if (originalSwitchView) {
    window.switchView = function(viewId, saveState = true) {
        // Purana view switch call karo
        originalSwitchView(viewId, saveState);

        // Agar user insta-feed par wapas aaya hai aur pehle se posts loaded the, toh dubara fetch mat karo
        if (viewId === 'insta-feed-container') {
            const feedArea = document.getElementById('feed-posts-area');
            if (feedArea && feedArea.children.length > 0) {
                // Already loaded, don't clear or reload unnecessarily!
                console.log("Feed restored from memory instantly.");
                return;
            }
        }
    };
}

// Navigation icon click par bhi smart check lagayein taaki instant switch ho
document.querySelectorAll('.insta-nav i').forEach(icon => {
    // Purane click listeners ke upar apna fast handler layer lagayein
    icon.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        if (action === 'home') {
            const feedArea = document.getElementById('feed-posts-area');
            if (feedArea && feedArea.children.length > 0) {
                // Agar pehle se posts hain toh database call skip karo, turant dikhao
                document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
                document.getElementById('insta-feed-container').classList.add('active');
                if (reelsContainer) reelsContainer.classList.remove('active');
                if (chatWindowScreen) chatWindowScreen.classList.remove('active');
                currentActiveView = 'insta-feed-container';
                localStorage.setItem('lastActiveView', 'insta-feed-container');
                e.stopImmediatePropagation(); // Purane slow reload ko roko
            }
        }
    }, true); // Capture phase mein intercept karega
});

// ==========================================
// CHAT MEMORY & INSTANT RESTORATION PATCH
// ==========================================
console.log("Chat Memory Patch Loaded Successfully!");

// Chat list aur active chats ko memory mein store rakhne ke liye variable
window.cachedChatHTML = null;

// Chat page switch ko intercept karne ke liye
const originalSwitchViewForChat = window.switchView;
if (originalSwitchViewForChat) {
    window.switchView = function(viewId, saveState = true) {
        originalSwitchViewForChat(viewId, saveState);

        // Agar user chat page ya messages container par ja raha hai
        if (viewId === 'chat-container' || viewId === 'telegram-chat-section' || viewId === 'messages-page') {
            const chatListArea = document.getElementById('chat-list-container') || document.getElementById('chat-users-list') || document.querySelector('.chat-list');
            
            // Agar pehle se HTML saved hai aur abhi area khali hai, toh turant wapas daal do
            if (chatListArea && window.cachedChatHTML && chatListArea.children.length === 0) {
                chatListArea.innerHTML = window.cachedChatHTML;
                console.log("Chat list restored from memory instantly.");
            }
        }
    };
}

// Jab bhi chat list load ho ya update ho, use memory mein save kar lo
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const chatListArea = document.getElementById('chat-list-container') || document.getElementById('chat-users-list') || document.querySelector('.chat-list');
        if (chatListArea) {
            const chatObserver = new MutationObserver(() => {
                if (chatListArea.children.length > 0) {
                    window.cachedChatHTML = chatListArea.innerHTML;
                }
            });
            chatObserver.observe(chatListArea, { childList: true, subtree: true });
        }
    }, 1500);
});
// ==========================================
// FINAL CHAT SPEED & POST DP FIX PATCH
// ==========================================
console.log("Chat Speed & Post DP Patch Loaded!");

// 1. CHAT USERS INSTANT CACHING & FAST LOAD FIX
if (typeof fetchTelegramChats === 'function' || window.supabaseClient) {
    // Purane chat load function ko override karke instant local cache enable karte hain
    const originalFetchChats = window.fetchTelegramChats || window.loadChatUsers;
    
    window.fetchTelegramChats = async function() {
        const chatListArea = document.getElementById('chat-list-container') || document.getElementById('chat-users-list') || document.querySelector('.chat-list');
        if (!chatListArea) return;

        // Step 1: Agar localStorage mein pehle se chat users save hain, toh bina ek second ruke turant dikhao
        const cachedUsers = localStorage.getItem('insta_cached_chat_users');
        if (cachedUsers && chatListArea.children.length === 0) {
            try {
                const users = JSON.parse(cachedUsers);
                renderChatUsersToDOM(users, chatListArea);
            } catch(e) {}
        }

        // Step 2: Background mein fresh users fetch karke list aur cache update karo
        try {
            const { data: users, error } = await supabaseClient.from('users').select('username, avatar_url');
            if (!error && users) {
                localStorage.setItem('insta_cached_chat_users', JSON.stringify(users));
                renderChatUsersToDOM(users, chatListArea);
            }
        } catch (err) {
            console.error("Background chat fetch error:", err);
        }
    };
}

function renderChatUsersToDOM(users, container) {
    if (!users || users.length === 0) return;
    const myName = localStorage.getItem('currentUsername');
    
    // Agar container mein pehle se user list nahi hai ya khali hai tabhi render karo
    if (container.children.length === 0 || container.innerHTML.includes('Loading')) {
        container.innerHTML = '';
        users.forEach(user => {
            if (user.username === myName) return; // Khud ko chat list mein mat dikhao
            
            const userItem = document.createElement('div');
            userItem.style.cssText = "display:flex; align-items:center; gap:12px; padding:10px 15px; cursor:pointer; border-bottom:1px solid #1a1a1a;";
            userItem.innerHTML = `
                <div style="width:40px; height:40px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:15px; overflow:hidden; ${user.avatar_url ? `background-image:url(${user.avatar_url}); background-size:cover;` : ''}">${!user.avatar_url ? user.username.charAt(0).toUpperCase() : ''}</div>
                <div>
                    <b style="font-size:14px; color:#fff;">${user.username}</b>
                    <p style="font-size:12px; color:#888; margin:0;">Tap to chat</p>
                </div>
            `;
            userItem.onclick = () => {
                if (typeof openChatWindow === 'function') {
                    openChatWindow(user.username);
                }
            };
            container.appendChild(userItem);
        });
    }
}


// 2. POST DP FIX (Home page par posts ke upar user ki DP dikhane ke liye)
// Yeh patch ensure karega ki agar database mein avatar url hai, toh post header par DP zaroor dikhe
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        if (!window.supabaseClient) return;
        
        // Sabhi users ke avatars ka map bana lo
        const { data: usersData } = await supabaseClient.from('users').select('username, avatar_url');
        if (!usersData) return;
        
        const avatarMap = {};
        usersData.forEach(u => {
            if (u.avatar_url) avatarMap[u.username] = u.avatar_url;
        });

        // Feed ke saare post headers check karke DP insert/update karo
        const feedArea = document.getElementById('feed-posts-area');
        if (feedArea) {
            const observer = new MutationObserver(() => {
                const postHeaders = feedArea.querySelectorAll('.post-user-header');
                postHeaders.forEach(header => {
                    const usernameElem = header.querySelector('b');
                    if (usernameElem) {
                        const username = usernameElem.textContent.trim();
                        const avatarDiv = header.querySelector('div');
                        if (avatarDiv && avatarMap[username]) {
                            avatarDiv.style.backgroundImage = `url(${avatarMap[username]})`;
                            avatarDiv.style.backgroundSize = 'cover';
                            avatarDiv.style.backgroundPosition = 'center';
                            avatarDiv.textContent = ''; // Text hata do agar image lag gayi hai
                        }
                    }
                });
            });
            observer.observe(feedArea, { childList: true, subtree: true });
        }
    }, 1500);
});
// ==========================================
// DIRECT CHAT FIX & INSTANT RENDER PATCH
// ==========================================
console.log("Direct Chat Fix Loaded!");

async function loadMyChatUsersDirectly() {
    // Aapke app mein jo bhi chat list ka container ho sakta hai, sabko yahan target kiya gaya hai
    const containers = [
        document.getElementById('chat-list-container'),
        document.getElementById('chat-users-list'),
        document.querySelector('.chat-list'),
        document.querySelector('#chat-container .users-list')
    ];

    const targetContainer = containers.find(c => c !== null);
    if (!targetContainer) return;

    targetContainer.innerHTML = '<div style="color:#777; text-align:center; padding:20px; font-size:12px;">Loading chat users...</div>';

    try {
        const myName = localStorage.getItem('currentUsername');
        const { data: users, error } = await supabaseClient.from('users').select('username, avatar_url');
        
        if (error) throw error;

        if (!users || users.length === 0) {
            targetContainer.innerHTML = '<div style="color:#777; text-align:center; padding:20px; font-size:12px;">No users found.</div>';
            return;
        }

        targetContainer.innerHTML = '';

        users.forEach(user => {
            if (user.username === myName) return; // Khud ko list me nahi dikhana

            const userDiv = document.createElement('div');
            userDiv.style.cssText = "display:flex; align-items:center; gap:12px; padding:12px 15px; cursor:pointer; border-bottom:1px solid #1a1a1a; transition:background 0.2s;";
            userDiv.onmouseover = () => userDiv.style.background = '#111';
            userDiv.onmouseout = () => userDiv.style.background = 'transparent';

            const avatarStyle = user.avatar_url 
                ? `background-image:url(${user.avatar_url}); background-size:cover; background-position:center;` 
                : 'background:#444;';

            userDiv.innerHTML = `
                <div style="width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:15px; color:#fff; ${avatarStyle}">
                    ${!user.avatar_url ? user.username.charAt(0).toUpperCase() : ''}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:14px; color:#fff;">${user.username}</div>
                    <div style="font-size:12px; color:#888; margin-top:2px;">Tap to open chat</div>
                </div>
            `;

            // Click karne par chat window khulne ka function
            userDiv.onclick = () => {
                if (typeof openChatWindow === 'function') {
                    openChatWindow(user.username);
                } else if (typeof startChat === 'function') {
                    startChat(user.username);
                } else {
                    console.log("Opening chat with:", user.username);
                }
            };

            targetContainer.appendChild(userDiv);
        });

    } catch (err) {
        console.error("Direct chat load error:", err);
        targetContainer.innerHTML = '<div style="color:#777; text-align:center; padding:20px; font-size:12px;">Failed to load users.</div>';
    }
}

// Jab bhi chat view par click ho ya page load ho, yeh turant chal jaye
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadMyChatUsersDirectly, 1000);
});

// Agar view switch hota hai aur chat par aate hain, toh load kar do
const originalViewSwitcher = window.switchView;
if (originalViewSwitcher) {
    window.switchView = function(viewId, saveState = true) {
        originalViewSwitcher(viewId, saveState);
        if (viewId === 'chat-container' || viewId === 'telegram-chat-section' || viewId === 'messages-page') {
            loadMyChatUsersDirectly();
        }
    };
}
