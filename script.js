// ==========================================
// INSTA-TELE APP SCRIPT.JS (FIXED REAL-TIME & STATE)
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
let currentChatPartner = null; // Track current open chat

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

// ==========================================
// LOGIN HANDLER WITH FIXED PASSWORD (272009)
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
                await supabaseClient.from('users').insert([{ username: username, avatar_url: '' }]);
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
// AUTO RESTORE VIEW & STATE ON REFRESH
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUsername');
    if (!savedUser) {
        switchView('login-container', false);
        return;
    }

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

function initializeAppData(username) {
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
    btn.addEventListener('click', () => {
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

// Fetch Feed Posts
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

    for (let post of data) {
        const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        const { data: myLike } = await supabaseClient.from('likes').select('*').eq('post_id', post.id).eq('username', myName);
        const isLiked = myLike && myLike.length > 0;

        const { data: comments } = await supabaseClient.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });

        const postCard = document.createElement('div');
        postCard.style.cssText = "background:#000; border-bottom:1px solid #262626; margin-bottom:15px;";
        postCard.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
                <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" class="post-user-header" data-user="${post.username}">
                    <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${post.username.charAt(0).toUpperCase()}</div>
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

    for (let reel of data) {
        const { count: likesCount } = await supabaseClient.from('reel_likes').select('*', { count: 'exact', head: true }).eq('reel_id', reel.id);
        const { data: myLike } = await supabaseClient.from('reel_likes').select('*').eq('reel_id', reel.id).eq('username', myName);
        const isLiked = myLike && myLike.length > 0;

        const { data: comments } = await supabaseClient.from('reel_comments').select('*').eq('reel_id', reel.id).order('created_at', { ascending: true });

        const reelCard = document.createElement('div');
        reelCard.style.cssText = "width:100%; height:100%; scroll-snap-align:start; position:relative; display:flex; justify-content:center; align-items:center; background:#000; flex-shrink:0;";

        reelCard.innerHTML = `
            <video src="${reel.video_url}" style="width:100%; height:100%; object-fit:cover;" loop playsinline></video>
            
            <div style="position:absolute; bottom:20px; left:15px; right:70px; z-index:2; text-shadow:0 1px 3px rgba(0,0,0,0.8);">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer;" class="reel-user-profile" data-user="${reel.username}">
                    <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${reel.username.charAt(0).toUpperCase()}</div>
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
// PROFILE SYSTEM
// ==========================================
async function openProfilePage(username, isOwnProfile) {
    const profileUsernameTitle = document.getElementById('profile-username-title');
    const profileAvatar = document.getElementById('profile-avatar');
    const postsCountElem = document.getElementById('profile-posts-count');
    const followersCountElem = document.getElementById('profile-followers-count');
    const followingCountElem = document.getElementById('profile-following-count');
    const profileActionButton = document.getElementById('profile-action-button');

    if (profileUsernameTitle) profileUsernameTitle.textContent = username;
    if (profileAvatar) profileAvatar.textContent = username.charAt(0).toUpperCase();

    const { data: userData } = await supabaseClient.from('users').select('avatar_url').eq('username', username).single();
    if (userData && userData.avatar_url && profileAvatar) {
        profileAvatar.style.backgroundImage = `url(${userData.avatar_url})`;
        profileAvatar.style.backgroundSize = 'cover';
        profileAvatar.textContent = '';
    } else if (profileAvatar) {
        profileAvatar.style.backgroundImage = 'none';
        profileAvatar.textContent = username.charAt(0).toUpperCase();
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

// Follower / Following List Popup Modal
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

    data.forEach(item => {
        const targetUser = type === 'followers' ? item.follower : item.following;
        
        const userRow = document.createElement('div');
        userRow.style.cssText = "display:flex; align-items:center; gap:12px; cursor:pointer; padding:6px 0;";
        userRow.innerHTML = `
            <div style="width:38px; height:38px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:15px;">${targetUser.charAt(0).toUpperCase()}</div>
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

// Telegram Chat System
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

    users.forEach(user => {
        if (user.username === myName) return;

        const chatItem = document.createElement('div');
        chatItem.style.cssText = "display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; border-bottom:1px solid #1a1a1a;";
        chatItem.innerHTML = `
            <div style="width:45px; height:45px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${user.username.charAt(0).toUpperCase()}</div>
            <div style="flex:1;">
                <h4 style="margin:0; font-size:15px; color:#fff;">${user.username}</h4>
                <p style="margin:3px 0 0 0; font-size:13px; color:#888;">Tap to chat</p>
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

    // Fetch existing messages
    const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender.eq.${myName},receiver.eq.${receiverName}),and(sender.eq.${receiverName},receiver.eq.${myName})`)
        .order('created_at', { ascending: true });

    if (messagesArea) {
        messagesArea.innerHTML = '';
        if (messages && messages.length > 0) {
            messages.forEach(msg => appendChatMessage(msg));
        } else {
            messagesArea.innerHTML = '<p style="color:#555; text-align:center; margin-top:20px; font-size:12px;">No messages yet. Say hello!</p>';
        }
    }

    // REAL-TIME LISTENER FIX: BOTH SENT AND RECEIVED MESSAGES APPEAR INSTANTLY
    activeChatSubscription = supabaseClient
        .channel(`chat_${myName}_${receiverName}_${Date.now()}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages' 
        }, payload => {
            const newMsg = payload.new;
            // Check if message belongs to current chat conversation
            if ((newMsg.sender === myName && newMsg.receiver === receiverName) || 
                (newMsg.sender === receiverName && newMsg.receiver === myName)) {
                
                // Avoid duplicating messages sent locally by current user
                if (newMsg.sender !== myName) {
                    if (messagesArea.innerHTML.includes('No messages yet')) {
                        messagesArea.innerHTML = '';
                    }
                    appendChatMessage(newMsg);
                }
            }
        })
        .subscribe();

    if (backBtn) {
        backBtn.onclick = () => {
            chatWindowScreen.classList.remove('active');
            currentChatPartner = null;
            if (activeChatSubscription) {
                supabaseClient.removeChannel(activeChatSubscription);
                activeChatSubscription = null;
            }
        };
    }

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault(); 
        
        const inputElem = document.getElementById('chat-msg-input');
        if (!inputElem) return;
        
        const text = inputElem.value.trim();
        if (!text) return;

        inputElem.value = '';

        if (messagesArea.innerHTML.includes('No messages yet')) {
            messagesArea.innerHTML = '';
        }
        
        // Optimistically display sent message instantly
        appendChatMessage({ sender: myName, receiver: receiverName, message: text });

        const { error: sendError } = await supabaseClient
            .from('messages')
            .insert([{ sender: myName, receiver: receiverName, message: text }]);

        if (sendError) {
            console.error("Database insert error:", sendError);
            alert("Database Error: " + (sendError.message || "Failed to send message"));
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

    if (chatInput) {
        const newInput = chatInput.cloneNode(true);
        chatInput.parentNode.replaceChild(newInput, chatInput);

        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage(e);
            }
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
