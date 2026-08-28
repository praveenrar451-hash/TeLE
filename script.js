window.onerror = function(msg, url, line) {
    alert("Error: " + msg + "\nLine: " + line);
};
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const loginContainer = document.getElementById('login-container');
const instaContainer = document.getElementById('insta-container');
const teleContainer = document.getElementById('tele-container');
const reelsContainer = document.getElementById('reels-container');
const profileContainer = document.getElementById('profile-container');
const chatWindow = document.getElementById('chat-window');

const loginUsernameInput = document.getElementById('login-username-input');
const loginPasswordInput = document.getElementById('login-password-input');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const loginErrorMsg = document.getElementById('login-error-msg');
const logoutBtn = document.getElementById('logout-btn');

const switchToTeleBtn = document.getElementById('switch-to-tele');
const switchToInstaBtn = document.getElementById('switch-to-insta');

const closeChatBtn = document.getElementById('close-chat');
const activeChatName = document.getElementById('active-chat-name');
const teleUserList = document.getElementById('tele-user-list');

const chatMessagesArea = document.getElementById('chat-messages-area');
const chatInputMsg = document.getElementById('chat-input-msg');
const sendChatBtn = document.getElementById('send-chat-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
let currentChatUser = '';
let chatSubscription = null;
let typingChannel = null;

const uploadModal = document.getElementById('upload-modal');
const navUploadBtn = document.getElementById('nav-upload-btn');
const closeUploadModalBtn = document.getElementById('close-upload-modal');
const submitPostBtn = document.getElementById('submit-post-btn');
const postFileInput = document.getElementById('post-file-input');
const postCaptionInput = document.getElementById('post-caption-input');
const postsFeed = document.getElementById('posts-feed');
const instaSearchInput = document.getElementById('insta-search-input');
const searchResultsBox = document.getElementById('search-results-box');

const userProfilePosts = document.getElementById('user-profile-posts');
const profileNameDisplay = document.getElementById('profile-name-display');
const profileUsernameTitle = document.getElementById('profile-username-title');
const profileInitial = document.getElementById('profile-initial');
const profilePostsCount = document.getElementById('profile-posts-count');
const profileFollowersCount = document.getElementById('profile-followers-count');
const profileFollowingCount = document.getElementById('profile-following-count');
const profileFollowBtn = document.getElementById('profile-follow-btn');
const followersCountBox = document.getElementById('profile-followers-box');
const followingCountBox = document.getElementById('profile-following-box');

const toggleEditProfileBtn = document.getElementById('toggle-edit-profile-btn');
const profileEditSection = document.getElementById('profile-edit-section');

const backFromReels = document.getElementById('back-from-reels');
const backFromProfile = document.getElementById('back-from-profile');

const navHomeBtn = document.getElementById('nav-home-btn');
const navSearchBtn = document.getElementById('nav-search-btn');
const navReelsBtn = document.getElementById('nav-reels-btn');
const navProfileBtn = document.getElementById('nav-profile-btn');

const CORRECT_PASSWORD = '272009';

// Typing indicator element setup
let typingIndicatorElem = document.getElementById('typing-indicator-box');
if (!typingIndicatorElem && chatWindow) {
    typingIndicatorElem = document.createElement('div');
    typingIndicatorElem.id = 'typing-indicator-box';
    typingIndicatorElem.style.cssText = "font-size: 11px; color: #0095f6; padding: 4px 15px; display: none; background: #000; border-bottom: 1px solid #222;";
    typingIndicatorElem.textContent = 'Typing...';
    const chatHeader = chatWindow.querySelector('.chat-header') || chatWindow.firstChild;
    chatHeader.after(typingIndicatorElem);
}

window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentView = localStorage.getItem('currentView') || 'home';
    const activeProfileUser = localStorage.getItem('activeProfileUser');
    const activeChat = localStorage.getItem('activeChatUser');

    if (isLoggedIn === 'true') {
        loginContainer.classList.remove('active');
        
        if (currentView === 'profile' && activeProfileUser) {
            openProfilePage(activeProfileUser, false);
        } else if (currentView === 'telegram') {
            instaContainer.classList.remove('active');
            teleContainer.classList.add('active');
            fetchRegisteredUsers();
            if (activeChat) {
                openChatWindow(activeChat);
            }
        } else if (currentView === 'reels') {
            hideAllViews();
            reelsContainer.classList.add('active');
            setActiveNav(navReelsBtn);
        } else {
            instaContainer.classList.add('active');
            setActiveNav(navHomeBtn);
            fetchPostsFromDatabase();
        }
    } else {
        loginContainer.classList.add('active');
    }
});

function saveViewState(viewName, profileUser = '') {
    localStorage.setItem('currentView', viewName);
    if (profileUser) localStorage.setItem('activeProfileUser', profileUser);
}

// Login Event Listeners
if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', handleLogin);
}

if (loginPasswordInput) {
    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

if (loginUsernameInput) {
    loginUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

async function handleLogin() {
    const enteredUsername = loginUsernameInput ? loginUsernameInput.value.trim() : '';
    const enteredPassword = loginPasswordInput ? loginPasswordInput.value.trim() : '';

    if (!loginErrorMsg) return;

    if (!enteredUsername) {
        loginErrorMsg.textContent = 'Please enter your username.';
        return;
    }

    if (enteredPassword === CORRECT_PASSWORD) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUsername', enteredUsername);
        
        try {
            await registerOrUpdateUser(enteredUsername);
        } catch (err) {
            console.error("Background user sync skipped:", err);
        }

        if (loginContainer) loginContainer.classList.remove('active');
        if (instaContainer) instaContainer.classList.add('active');
        saveViewState('home');
        setActiveNav(navHomeBtn);
        fetchPostsFromDatabase();
    } else {
        loginErrorMsg.textContent = 'Incorrect password. Access denied.';
        if (loginPasswordInput) loginPasswordInput.value = '';
    }
}

async function registerOrUpdateUser(username) {
    const { data, error } = await supabaseClient.from('users').select('*').eq('username', username);
    if (error) throw error;
    if (!data || data.length === 0) {
        await supabaseClient.from('users').insert([{ username: username }]);
    }
}

logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    hideAllViews();
    loginContainer.classList.add('active');
    loginUsernameInput.value = '';
    loginPasswordInput.value = '';
    loginErrorMsg.textContent = '';
});

function hideAllViews() {
    instaContainer.classList.remove('active');
    teleContainer.classList.remove('active');
    reelsContainer.classList.remove('active');
    profileContainer.classList.remove('active');
    chatWindow.classList.remove('active');
    if(profileEditSection) profileEditSection.style.display = 'none';
}

function setActiveNav(btnElement) {
    [navHomeBtn, navSearchBtn, navUploadBtn, navReelsBtn, navProfileBtn].forEach(btn => {
        if(btn) btn.style.color = '#888';
    });
    if(btnElement) btnElement.style.color = '#fff';
}

navHomeBtn.addEventListener('click', () => {
    hideAllViews();
    instaContainer.classList.add('active');
    saveViewState('home');
    setActiveNav(navHomeBtn);
    fetchPostsFromDatabase();
});

navSearchBtn.addEventListener('click', () => {
    hideAllViews();
    instaContainer.classList.add('active');
    saveViewState('home');
    setActiveNav(navSearchBtn);
    instaSearchInput.focus();
});

navUploadBtn.addEventListener('click', () => {
    uploadModal.style.display = 'flex';
});

navReelsBtn.addEventListener('click', () => {
    hideAllViews();
    reelsContainer.classList.add('active');
    saveViewState('reels');
    setActiveNav(navReelsBtn);
});

navProfileBtn.addEventListener('click', () => {
    const currentUsername = localStorage.getItem('currentUsername') || 'User';
    openProfilePage(currentUsername);
    setupProfileTabsAndContent(username);

});

backFromReels.addEventListener('click', () => {
    hideAllViews();
    instaContainer.classList.add('active');
    saveViewState('home');
    setActiveNav(navHomeBtn);
});

backFromProfile.addEventListener('click', () => {
    hideAllViews();
    instaContainer.classList.add('active');
    saveViewState('home');
    setActiveNav(navHomeBtn);
});

switchToTeleBtn.addEventListener('click', () => {
    instaContainer.classList.remove('active');
    teleContainer.classList.add('active');
    saveViewState('telegram');
    fetchRegisteredUsers();
});

switchToInstaBtn.addEventListener('click', () => {
    teleContainer.classList.remove('active');
    instaContainer.classList.add('active');
    saveViewState('home');
    localStorage.removeItem('activeChatUser');
    fetchPostsFromDatabase();
});

closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.style.display = 'none';
});

if (toggleEditProfileBtn) {
    toggleEditProfileBtn.addEventListener('click', () => {
        if (profileEditSection.style.display === 'none' || profileEditSection.style.display === '') {
            profileEditSection.style.display = 'block';
        } else {
            profileEditSection.style.display = 'none';
        }
    });
}

async function openProfilePage(username, saveState = true) {
    hideAllViews();
    profileContainer.classList.add('active');
    if (saveState) saveViewState('profile', username);
    
    profileNameDisplay.textContent = username;
    profileUsernameTitle.textContent = username;

    const { data: userData } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (userData && userData.avatar_url) {
        profileInitial.innerHTML = `<img src="${userData.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        profileInitial.textContent = username.charAt(0).toUpperCase();
    }

    const myName = localStorage.getItem('currentUsername');
    if (username === myName) {
        profileFollowBtn.style.display = 'none';
        if (toggleEditProfileBtn) toggleEditProfileBtn.style.display = 'inline-block';
        setActiveNav(navProfileBtn);
    } else {
        profileFollowBtn.style.display = 'block';
        if (toggleEditProfileBtn) toggleEditProfileBtn.style.display = 'none';
        if (profileEditSection) profileEditSection.style.display = 'none';
        checkIfFollowing(myName, username);
    }

    fetchUserProfilePosts(username);
    fetchProfileStats(username);
    setupProfileTabsAndContent(username);
}

async function fetchProfileStats(username) {
    const { count: pCount } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', username);
    profilePostsCount.textContent = pCount || 0;

    const { count: fCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', username);
    profileFollowersCount.textContent = fCount || 0;

    const { count: fgCount } = await supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', username);
    profileFollowingCount.textContent = fgCount || 0;
}

if (followersCountBox) {
    followersCountBox.addEventListener('click', () => {
        showUserListModal('Followers', profileNameDisplay.textContent, 'followers');
    });
}

if (followingCountBox) {
    followingCountBox.addEventListener('click', () => {
        showUserListModal('Following', profileNameDisplay.textContent, 'following');
    });
}

async function showUserListModal(title, username, type) {
    let existingModal = document.getElementById('user-list-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'user-list-modal';
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center;";
    
    let queryResult = [];
    if (type === 'followers') {
        const { data } = await supabaseClient.from('follows').select('follower').eq('following', username);
        queryResult = data ? data.map(item => item.follower) : [];
    } else {
        const { data } = await supabaseClient.from('follows').select('following').eq('follower', username);
        queryResult = data ? data.map(item => item.following) : [];
    }

    modal.innerHTML = `
        <div style="background:#121212; width:320px; max-height:400px; border-radius:10px; display:flex; flex-direction:column; border:1px solid #262626; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #262626;">
                <h3 style="color:#fff; margin:0; font-size:16px;">${title}</h3>
                <button id="close-user-modal" style="background:transparent; border:none; color:#fff; font-size:16px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="padding:10px; overflow-y:auto; flex:1;" id="modal-users-list">
                ${queryResult.length === 0 ? '<p style="color:#777; text-align:center; font-size:13px;">No users found.</p>' : queryResult.map(u => `<div class="modal-user-item" data-uname="${u}" style="padding:8px; color:#fff; cursor:pointer; border-bottom:1px solid #1f1f1f; display:flex; align-items:center; gap:10px;"><div style="width:28px;height:28px;background:#444;border-radius:50%;display:flex;align-items:center;justify-content:center;">${u.charAt(0).toUpperCase()}</div><b>${u}</b></div>`).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-user-modal').addEventListener('click', () => modal.remove());
    modal.querySelectorAll('.modal-user-item').forEach(el => {
        el.addEventListener('click', () => {
            modal.remove();
            openProfilePage(el.getAttribute('data-uname'));
        });
    });
}

async function checkIfFollowing(follower, following) {
    const { data } = await supabaseClient.from('follows').select('*').eq('follower', follower).eq('following', following);
    if (data && data.length > 0) {
        profileFollowBtn.textContent = 'Following';
        profileFollowBtn.style.background = '#333';
    } else {
        profileFollowBtn.textContent = 'Follow';
        profileFollowBtn.style.background = '#0095f6';
    }
}

profileFollowBtn.addEventListener('click', async () => {
    const myName = localStorage.getItem('currentUsername');
    const targetUser = profileNameDisplay.textContent;

    if (profileFollowBtn.textContent === 'Follow') {
        const { data } = await supabaseClient.from('follows').select('*').eq('follower', myName).eq('following', targetUser);
        if (!data || data.length === 0) {
            await supabaseClient.from('follows').insert([{ follower: myName, following: targetUser }]);
        }
        profileFollowBtn.textContent = 'Following';
        profileFollowBtn.style.background = '#333';
    } else {
        await supabaseClient.from('follows').delete().eq('follower', myName).eq('following', targetUser);
        profileFollowBtn.textContent = 'Follow';
        profileFollowBtn.style.background = '#0095f6';
    }
    fetchProfileStats(targetUser);
});

submitPostBtn.addEventListener('click', async () => {
    const captionText = postCaptionInput.value.trim();
    const file = postFileInput.files[0];
    const currentUsername = localStorage.getItem('currentUsername') || 'User';

    if (!file && !captionText) {
        alert('Please select an image or write a caption!');
        return;
    }

    let progressBanner = document.getElementById('upload-progress-banner');
    if (!progressBanner) {
        progressBanner = document.createElement('div');
        progressBanner.id = 'upload-progress-banner';
        progressBanner.style.cssText = "position:fixed; top:0; left:0; width:100%; background:#0095f6; color:#fff; text-align:center; padding:8px; font-size:14px; font-weight:bold; z-index:99999; transition:0.3s;";
        document.body.appendChild(progressBanner);
    }
    progressBanner.textContent = 'Preparing upload... 0%';
    progressBanner.style.display = 'block';

    let imageUrl = '';
    if (file) {
        progressBanner.textContent = 'Uploading media... 30%';
        const fileName = `${Date.now()}_${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('media')
            .upload(fileName, file);

        if (uploadError) {
            progressBanner.textContent = 'Upload failed!';
            setTimeout(() => progressBanner.style.display = 'none', 2000);
            alert('Failed to upload image: ' + uploadError.message);
            return;
        }

        progressBanner.textContent = 'Uploading media... 80%';
        const { data: publicUrlData } = supabaseClient.storage.from('media').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
    }

    progressBanner.textContent = 'Saving post... 95%';
    await savePostToSupabase(currentUsername, captionText, imageUrl, progressBanner);
});

async function savePostToSupabase(username, caption, imageUrl, progressBanner) {
    const { error } = await supabaseClient.from('posts').insert([{ username: username, caption: caption, image_url: imageUrl }]);
    if (error) {
        progressBanner.textContent = 'Failed to save post!';
        setTimeout(() => progressBanner.style.display = 'none', 2000);
        alert('Failed to save post: ' + error.message);
        return;
    }

    progressBanner.textContent = 'Post shared successfully! 100%';
    setTimeout(() => {
        progressBanner.style.display = 'none';
    }, 1500);

    postCaptionInput.value = '';
    postFileInput.value = '';
    uploadModal.style.display = 'none';
    fetchPostsFromDatabase();
}
//fetchPostsFromDatabase//

async function fetchPostsFromDatabase(searchQuery = '') {
    let query = supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
    if (searchQuery) query = query.ilike('caption', `%${searchQuery}%`);

    const { data, error } = await query;
    if (error) return;

    postsFeed.innerHTML = '';
    if (!data || data.length === 0) {
        postsFeed.innerHTML = '<p style="padding: 20px; color: #707579; text-align: center;">No posts found.</p>';
        return;
    }

    const myName = localStorage.getItem('currentUsername');

    for (let post of data) {
        // Data fetching
        const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        const { data: myLike } = await supabaseClient.from('likes').select('*').eq('post_id', post.id).eq('username', myName);
        const isLiked = myLike && myLike.length > 0;
        const { data: comments } = await supabaseClient.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
        const { data: postUserData } = await supabaseClient.from('users').select('avatar_url').eq('username', post.username).single();

        let avatarHTML = `<div style="width: 30px; height: 30px; background: #444; border-radius: 50%; margin-right: 10px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;">${post.username.charAt(0).toUpperCase()}</div>`;
        if (postUserData && postUserData.avatar_url) {
            avatarHTML = `<div style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; overflow: hidden; display:flex; align-items:center; justify-content:center;"><img src="${postUserData.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
        }

        const postCard = document.createElement('div');
        postCard.classList.add('post-card');
        postCard.style.cssText = "background: #000; border-bottom: 1px solid #262626; margin-bottom: 15px; padding-bottom: 10px; position: relative;";
        
        const isMyPost = post.username === myName;

        postCard.innerHTML = `
            <div class="post-header" style="display: flex; align-items: center; justify-content: space-between; padding: 10px;">
                <div style="display: flex; align-items: center; cursor: pointer;" class="profile-click-target" data-username="${post.username}">
                    ${avatarHTML}
                    <span><b>${post.username}</b></span>
                </div>
                ${isMyPost ? `<button class="delete-post-btn" data-postid="${post.id}" style="background:transparent; border:none; color:#ed4956; cursor:pointer; font-size:16px;"><i class="fa-solid fa-trash-can"></i></button>` : ''}
            </div>
            <div class="post-img-container" style="width: 100%; max-height: 400px; overflow: hidden; display: flex; justify-content: center; background: #111; position: relative;">
                ${post.image_url ? `<img src="${post.image_url}" style="width: 100%; object-fit: cover; cursor: pointer;">` : '<div style="padding: 40px; color: #888;">Text Post</div>'}
            </div>
            <div style="display: flex; gap: 15px; padding: 10px; font-size: 22px;">
                <i class="fa-${isLiked ? 'solid fa-heart' : 'regular fa-heart'}" id="like-btn-${post.id}" style="cursor: pointer; color: ${isLiked ? '#ed4956' : '#fff'};"></i>
                <i class="fa-regular fa-comment" style="color: #fff; cursor: pointer;"></i>
            </div>
            <div style="padding: 0 10px;">
                <p style="font-size: 14px; margin-bottom: 5px;"><b id="likes-count-${post.id}">${likesCount || 0}</b> likes</p>
                <p style="font-size: 14px;"><b>${post.username}</b> ${post.caption || ''}</p>
                <div id="comments-box-${post.id}" style="max-height: 80px; overflow-y: auto; font-size: 13px; color: #ccc; margin-top: 5px;">
                    ${comments && comments.length > 0 ? comments.map(c => `<div><b>${c.username}</b>: ${c.comment}</div>`).join('') : '<span style="color: #666; font-size: 12px;">No comments yet</span>'}
                </div>
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <input type="text" id="comment-input-${post.id}" placeholder="Add a comment..." style="flex: 1; padding: 6px; background: #1a1a1a; border: 1px solid #333; color: #fff; border-radius: 4px; font-size: 12px;">
                    <button id="comment-submit-${post.id}" style="background: transparent; border: none; color: #0095f6; font-weight: bold; font-size: 12px; cursor: pointer;">Post</button>
                </div>
            </div>
        `;

        // 1. Double Tap Logic Call
        const postImg = postCard.querySelector('img');
        if (postImg) {
            enableDoubleTapLike(postImg, post.id, 'post');
        }

        // 2. Profile Click
        postCard.querySelector('.profile-click-target').onclick = () => openProfilePage(post.username);

        // 3. Delete Post
        if (isMyPost) {
            postCard.querySelector('.delete-post-btn').onclick = async () => {
                if (confirm('Delete this post?')) {
                    await supabaseClient.from('posts').delete().eq('id', post.id);
                    fetchPostsFromDatabase(searchQuery);
                }
            };
        }

        // 4. Like/Unlike (Single Tap)
        const likeBtn = postCard.querySelector(`#like-btn-${post.id}`);
        const likesCountElem = postCard.querySelector(`#likes-count-${post.id}`);
        likeBtn.onclick = async () => {
            let currentLikes = parseInt(likesCountElem.textContent);
            if (likeBtn.classList.contains('fa-solid')) {

    const { data: usersData } = await supabaseClient.from('users').select('*').ilike('username', `%${searchText}%`);
    
    searchResultsBox.style.display = 'block';
    searchResultsBox.innerHTML = '<h5 style="color:#aaa; margin:5px 0;">Users Found:</h5>';
    
    if (usersData && usersData.length > 0) {
        usersData.forEach(u => {
            const uDiv = document.createElement('div');
            uDiv.innerHTML = `<div style="padding: 8px; background: #222; margin-bottom: 5px; border-radius: 5px; color: #fff; cursor: pointer;">👤 ${u.username}</div>`;
            uDiv.addEventListener('click', () => {
                searchResultsBox.style.display = 'none';
                openProfilePage(u.username);
            });
            searchResultsBox.appendChild(uDiv);
        });
    } else {
        searchResultsBox.innerHTML += '<p style="color:#666; font-size:13px;">No user found.</p>';
    }

    fetchPostsFromDatabase(searchText);
});

async function fetchRegisteredUsers(searchQuery = '') {
    let query = supabaseClient.from('users').select('*');
    if (searchQuery) query = query.ilike('username', `%${searchQuery}%`);

    const { data, error } = await query;
    if (error) return;

    teleUserList.innerHTML = '';
    teleUserList.style.cssText = "display: flex; flex-direction: column; gap: 12px; padding: 15px;";

    if (!data || data.length === 0) {
        teleUserList.innerHTML = '<p style="padding: 15px; color: #707579; text-align: center;">No users found.</p>';
        return;
    }

    const myName = localStorage.getItem('currentUsername');
    
    const uniqueMap = new Map();
    data.forEach(user => {
        if (!user || !user.username) return;
        const cleanName = user.username.trim();
        if (cleanName.toLowerCase() === myName.toLowerCase()) return;
        
        if (!uniqueMap.has(cleanName.toLowerCase())) {
            uniqueMap.set(cleanName.toLowerCase(), user);
        }
    });

    const uniqueUsers = Array.from(uniqueMap.values());

    if (uniqueUsers.length === 0) {
        teleUserList.innerHTML = '<p style="padding: 15px; color: #707579; text-align: center;">No other users found.</p>';
        return;
    }

    uniqueUsers.forEach(userObj => {
        const username = userObj.username;
        const avatarUrl = userObj.avatar_url;

        let avatarHTML = `<div style="width: 42px; height: 42px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 18px;">${username.charAt(0).toUpperCase()}</div>`;
        if (avatarUrl) {
            avatarHTML = `<div style="width: 42px; height: 42px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;"><img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
        }

        const userItem = document.createElement('div');
        userItem.classList.add('user-item');
        
        userItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            background: #161616;
            border: 1px solid #282828;
            padding: 12px 16px;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s;
        `;

        userItem.innerHTML = `
            ${avatarHTML}
            <div style="display: flex; flex-direction: column;">
                <h4 style="margin: 0; color: #fff; font-size: 16px; font-weight: 600;">${username}</h4>
                <p style="margin: 3px 0 0 0; color: #888; font-size: 13px;">Tap to chat...</p>
            </div>
        `;

        userItem.addEventListener('mouseover', () => { userItem.style.background = '#222'; });
        userItem.addEventListener('mouseout', () => { userItem.style.background = '#161616'; });

        userItem.addEventListener('click', () => {
            openChatWindow(username);
        });

        teleUserList.appendChild(userItem);
    });
}

async function openChatWindow(username) {
    currentChatUser = username;
    localStorage.setItem('activeChatUser', username);
    
    activeChatName.textContent = ''; 
    
    const { data: userData } = await supabaseClient.from('users').select('avatar_url').eq('username', username).single();
    
    let chatHeaderAvatar = document.getElementById('active-chat-avatar');
    if (!chatHeaderAvatar) {
        chatHeaderAvatar = document.createElement('div');
        chatHeaderAvatar.id = 'active-chat-avatar';
        chatHeaderAvatar.style.cssText = "width: 36px; height: 36px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-left: 10px; margin-right: 10px; background: #444; flex-shrink: 0;";
        activeChatName.before(chatHeaderAvatar);
    }

    if (userData && userData.avatar_url) {
        chatHeaderAvatar.innerHTML = `<img src="${userData.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        chatHeaderAvatar.innerHTML = `<span style="color:#fff; font-size:14px; font-weight:bold;">${username.charAt(0).toUpperCase()}</span>`;
    }

    activeChatName.textContent = username;

    chatWindow.classList.add('active');
    loadRealtimeMessages(localStorage.getItem('currentUsername'), currentChatUser);
    setupTypingChannel(localStorage.getItem('currentUsername'), currentChatUser);
}

closeChatBtn.addEventListener('click', () => {
    chatWindow.classList.remove('active');
    localStorage.removeItem('activeChatUser');
    if(chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
        chatSubscription = null;
    }
    if(typingChannel) {
        supabaseClient.removeChannel(typingChannel);
        typingChannel = null;
    }
    if(typingIndicatorElem) typingIndicatorElem.style.display = 'none';
});

if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
        if (!currentChatUser) return;
        const myName = localStorage.getItem('currentUsername');

        if (confirm(`Are you sure you want to delete all chat history with ${currentChatUser}?`)) {
            await supabaseClient
                .from('messages')
                .delete()
                .or(`and(sender.eq.${myName},receiver.eq.${currentChatUser}),and(sender.eq.${currentChatUser},receiver.eq.${myName})`);

            chatMessagesArea.innerHTML = '<p style="color:#777; text-align:center; font-size:13px; margin-top:20px;">No messages yet.</p>';
        }
    });
}

async function loadRealtimeMessages(user1, user2) {
    chatMessagesArea.innerHTML = '';
    
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender.eq.${user1},receiver.eq.${user2}),and(sender.eq.${user2},receiver.eq.${user1})`)
        .order('created_at', { ascending: true });

    if (!error && data) {
        if (data.length === 0) {
            chatMessagesArea.innerHTML = '<p style="color:#777; text-align:center; font-size:13px; margin-top:20px;">No messages yet.</p>';
        } else {
            for (let msg of data) {
                await appendMessageUI(msg);
                if (msg.receiver === user1 && !msg.is_seen) {
                    await supabaseClient.from('messages').update({ is_seen: true }).eq('id', msg.id);
                }
            }
        }
    }

    if (chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
    }
    
    const roomName = 'chat_' + [user1, user2].sort().join('_').replace(/[^a-zA-Z0-9_]/g, '_');

    chatSubscription = supabaseClient
        .channel(roomName)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'messages' 
        }, async payload => {
            if (payload.eventType === 'INSERT') {
                const newMsg = payload.new;
                if ((newMsg.sender === user1 && newMsg.receiver === user2) || (newMsg.sender === user2 && newMsg.receiver === user1)) {
                    if (!document.getElementById(`msg-${newMsg.id}`)) {
                        const emptyText = chatMessagesArea.querySelector('p');
                        if (emptyText) emptyText.remove();
                        await appendMessageUI(newMsg);
                        
                        if (newMsg.receiver === user1) {
                            await supabaseClient.from('messages').update({ is_seen: true }).eq('id', newMsg.id);
                        }
                    }
                }
            } else if (payload.eventType === 'UPDATE') {
                const updatedMsg = payload.new;
                const msgElem = document.getElementById(`msg-${updatedMsg.id}`);
                if (msgElem && updatedMsg.is_seen) {
                    let seenStatus = msgElem.querySelector('.seen-status');
                    if (!seenStatus) {
                        seenStatus = document.createElement('div');
                        seenStatus.className = 'seen-status';
                        seenStatus.style.cssText = "font-size: 10px; color: #0095f6; text-align: right; margin-top: 2px;";
                        msgElem.appendChild(seenStatus);
                    }
                    seenStatus.textContent = 'Seen';
                }
            }
        })
        .subscribe();
}

function setupTypingChannel(user1, user2) {
    if (typingChannel) supabaseClient.removeChannel(typingChannel);

    const typingRoomName = 'typing_' + [user1, user2].sort().join('_').replace(/[^a-zA-Z0-9_]/g, '_');

    typingChannel = supabaseClient.channel(typingRoomName)
        .on('broadcast', { event: 'typing' }, payload => {
            if (payload.payload.sender === currentChatUser) {
                typingIndicatorElem.style.display = 'block';
                clearTimeout(window.typingTimer);
                window.typingTimer = setTimeout(() => {
                    typingIndicatorElem.style.display = 'none';
                }, 1500);
            }
        })
        .subscribe();
}

chatInputMsg.addEventListener('input', () => {
    const myName = localStorage.getItem('currentUsername');
    if (!currentChatUser || !typingChannel) return;
    
    typingChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: myName }
    });
});

async function appendMessageUI(msg) {
    const myName = localStorage.getItem('currentUsername');
    const msgDiv = document.createElement('div');
    const isMe = msg.sender === myName;
    msgDiv.id = `msg-${msg.id || Date.now()}`;
    msgDiv.style.cssText = `margin: 8px 0; display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; width: 100%;`;
    
    let contentHTML = '';
    if (msg.message_type === 'image') {
        contentHTML = `<img src="${msg.message}" style="max-width: 200px; border-radius: 8px; display: block;">`;
    } else if (msg.message_type === 'audio') {
        contentHTML = `<audio controls src="${msg.message}" style="max-width: 220px; height: 35px;"></audio>`;
    } else {
        contentHTML = `<div>${msg.message}</div>`;
    }

    const { data: senderData } = await supabaseClient.from('users').select('avatar_url').eq('username', msg.sender).single();
    let senderAvatarHTML = `<div style="width: 22px; height: 22px; background: #444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff;">${msg.sender.charAt(0).toUpperCase()}</div>`;
    
    if (senderData && senderData.avatar_url) {
        senderAvatarHTML = `<div style="width: 22px; height: 22px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;"><img src="${senderData.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
    }

    let timeString = '';
    if (msg.created_at) {
        const date = new Date(msg.created_at);
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    let seenText = (isMe && msg.is_seen) ? `<div class="seen-status" style="font-size: 10px; color: #0095f6; text-align: right; margin-top: 2px;">Seen</div>` : '';

    msgDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px; ${isMe ? 'flex-direction: row-reverse;' : ''}">
            ${senderAvatarHTML}
            <span style="font-size: 11px; color: #888;">${msg.sender}</span>
        </div>
        <div style="background: ${isMe ? '#0095f6' : '#262626'}; color: #fff; padding: 8px 12px; border-radius: 12px; max-width: 75%; word-break: break-word; font-size: 14px; position:relative;">
            ${contentHTML}
            <div style="font-size: 9px; color: ${isMe ? 'rgba(255,255,255,0.7)' : '#888'}; text-align: right; margin-top: 4px;">${timeString}</div>
        </div>
        ${seenText}
        ${isMe ? `<span class="delete-msg-btn" data-msgid="${msg.id}" style="font-size:10px; color:#777; cursor:pointer; margin-top:2px;">Delete</span>` : ''}
    `;

    const deleteBtn = msgDiv.querySelector('.delete-msg-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (msg.id) {
                await supabaseClient.from('messages').delete().eq('id', msg.id);
            }
            msgDiv.remove();
        });
    }

    chatMessagesArea.appendChild(msgDiv);
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

sendChatBtn.addEventListener('click', sendChatMessage);
chatInputMsg.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

async function sendChatMessage() {
    const text = chatInputMsg.value.trim();
    if (!text || !currentChatUser) return;

    const myName = localStorage.getItem('currentUsername');
    chatInputMsg.value = '';

    const emptyText = chatMessagesArea.querySelector('p');
    if (emptyText) emptyText.remove();

    const { data, error } = await supabaseClient.from('messages').insert([
        { sender: myName, receiver: currentChatUser, message: text, message_type: 'text', is_seen: false }
    ]).select();

    if (error) {
        console.error("Supabase Error:", error);
        alert("Message send nahi hua! Error: " + error.message);
        return;
    }

    if (data && data.length > 0) {
        await appendMessageUI(data[0]);
    }
}

const chatInputContainer = chatInputMsg.parentElement;
if (chatInputContainer && !document.getElementById('chat-file-input')) {
    const mediaBtn = document.createElement('button');
    mediaBtn.innerHTML = '📷';
    mediaBtn.style.cssText = "background:transparent; border:none; font-size:18px; cursor:pointer; color:#fff;";
    
    const micBtn = document.createElement('button');
    micBtn.innerHTML = '🎙️';
    micBtn.style.cssText = "background:transparent; border:none; font-size:18px; cursor:pointer; color:#fff;";

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'chat-file-input';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    chatInputContainer.prepend(micBtn);
    chatInputContainer.prepend(mediaBtn);
    chatInputContainer.prepend(fileInput);

    mediaBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = `chat_${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage.from('media').upload(fileName, file);
        if (uploadError) {
            alert('Image upload failed: ' + uploadError.message);
            return;
        }

        const { data: urlData } = supabaseClient.storage.from('media').getPublicUrl(fileName);
        const imageUrl = urlData.publicUrl;
        const myName = localStorage.getItem('currentUsername');

        const { data, error } = await supabaseClient.from('messages').insert([
            { sender: myName, receiver: currentChatUser, message: imageUrl, message_type: 'image', is_seen: false }
        ]).select();

        if (error) {
            alert("Image message send nahi hua! Error: " + error.message);
            return;
        }

        if (data) await appendMessageUI(data[0]);
    });

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    micBtn.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    const fileName = `audio_${Date.now()}.mp3`;

                    micBtn.style.color = '#fff';
                    micBtn.innerHTML = '🎙️';

                    const { error: uploadError } = await supabaseClient.storage.from('media').upload(fileName, audioBlob);
                    if (uploadError) {
                        alert('Voice note upload failed: ' + uploadError.message);
                        return;
                    }

                    const { data: urlData } = supabaseClient.storage.from('media').getPublicUrl(fileName);
                    const audioUrl = urlData.publicUrl;
                    const myName = localStorage.getItem('currentUsername');

                    const { data, error } = await supabaseClient.from('messages').insert([
                        { sender: myName, receiver: currentChatUser, message: audioUrl, message_type: 'audio', is_seen: false }
                    ]).select();

                    if (error) {
                        alert("Voice note message send nahi hua! Error: " + error.message);
                        return;
                    }

                    if (data) await appendMessageUI(data[0]);
                };

                mediaRecorder.start();
                isRecording = true;
                micBtn.style.color = '#ed4956';
                micBtn.innerHTML = '⏹️';
            } catch (err) {
                alert('Microphone access denied or not supported.');
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
        }
    });
}

const teleUserSearch = document.getElementById('tele-user-search');
if (teleUserSearch) {
    teleUserSearch.addEventListener('input', (e) => {
        fetchRegisteredUsers(e.target.value.trim());
    });
}

document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'updateUsernameBtn') {
        const newUsername = document.getElementById('newUsernameInput').value.trim();
        if (!newUsername) {
            alert('Please enter a username!');
            return;
        }

        const currentUsername = localStorage.getItem('currentUsername');
        if (!currentUsername) {
            alert('You must be logged in!');
            return;
        }

        if (newUsername === currentUsername) {
            alert('This is already your username!');
            return;
        }

        try {
            const { data: existingUser } = await supabaseClient
                .from('users')
                .select('*')
                .eq('username', newUsername);

            if (existingUser && existingUser.length > 0) {
                alert('This username is already taken. Choose another one!');
                return;
            }

            const { error } = await supabaseClient
                .from('users')
                .update({ username: newUsername })
                .eq('username', currentUsername);

            if (error) throw error;

            localStorage.setItem('currentUsername', newUsername);
            alert('Username updated successfully! All your posts and chats are safe.');
            location.reload();
        } catch (err) {
            console.error(err);
            alert('Error updating username: ' + err.message);
        }
    }
});

document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'updateProfilePicBtn') {
        const fileInput = document.getElementById('profilePicInput');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select an image file first!');
            return;
        }

        const currentUsername = localStorage.getItem('currentUsername');
        if (!currentUsername) {
            alert('You must be logged in!');
            return;
        }

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage
                .from('media')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabaseClient
                .from('users')
                .update({ avatar_url: publicUrl }) 
                .eq('username', currentUsername);

            if (dbError) throw dbError;

            alert('Profile picture updated successfully!');
            location.reload();
        } catch (err) {
            console.error(err);
            alert('Error uploading profile picture: ' + err.message);
        }
    }
});

// ================= INSTAGRAM-LIKE REELS SYSTEM =================
const reelsCameraBtn = document.getElementById('reels-camera-btn');
const reelFileInput = document.getElementById('reel-file-input');
const reelUploadModal = document.getElementById('reel-upload-modal');
const closeReelModalBtn = document.getElementById('close-reel-modal');
const submitReelBtn = document.getElementById('submit-reel-btn');
const reelCaptionInput = document.getElementById('reel-caption-input');
const reelPreviewVideo = document.getElementById('reel-preview-video');
const reelsFeed = document.getElementById('reels-feed');

let selectedReelFile = null;

if (reelsCameraBtn && reelFileInput) {
    reelsCameraBtn.addEventListener('click', () => {
        reelFileInput.click();
    });

    reelFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        selectedReelFile = file;
        reelPreviewVideo.src = URL.createObjectURL(file);
        reelCaptionInput.value = '';
        reelUploadModal.style.display = 'flex';
    });
}

if (closeReelModalBtn) {
    closeReelModalBtn.addEventListener('click', () => {
        reelUploadModal.style.display = 'none';
        selectedReelFile = null;
    });
}

if (submitReelBtn) {
    submitReelBtn.addEventListener('click', async () => {
        if (!selectedReelFile) return;

        const caption = reelCaptionInput.value.trim();
        const currentUsername = localStorage.getItem('currentUsername') || 'User';

        let progressBanner = document.getElementById('upload-progress-banner');
        if (!progressBanner) {
            progressBanner = document.createElement('div');
            progressBanner.id = 'upload-progress-banner';
            progressBanner.style.cssText = "position:fixed; top:0; left:0; width:100%; background:#0095f6; color:#fff; text-align:center; padding:8px; font-size:14px; font-weight:bold; z-index:99999; transition:0.3s;";
            document.body.appendChild(progressBanner);
        }
        progressBanner.textContent = 'Uploading reel... 30%';
        progressBanner.style.display = 'block';

        const fileName = `reel_${Date.now()}_${selectedReelFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;

        try {
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('media')
                .upload(fileName, selectedReelFile, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: selectedReelFile.type || 'video/mp4'
                });

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            progressBanner.textContent = 'Saving reel... 85%';
            const { data: publicUrlData } = supabaseClient.storage.from('media').getPublicUrl(fileName);
            const videoUrl = publicUrlData.publicUrl;

            const { error: dbError } = await supabaseClient.from('reels').insert([
                { username: currentUsername, video_url: videoUrl, caption: caption }
            ]);

            if (dbError) {
                throw new Error(dbError.message);
            }

            progressBanner.textContent = 'Reel shared successfully! 100%';
            setTimeout(() => {
                progressBanner.style.display = 'none';
            }, 1500);

            reelUploadModal.style.display = 'none';
            reelFileInput.value = '';
            selectedReelFile = null;
            fetchReelsFromDatabase();

        } catch (err) {
            progressBanner.textContent = 'Upload failed!';
            setTimeout(() => progressBanner.style.display = 'none', 3000);
            console.error("Reel Upload Error:", err);
            alert('Upload Error Details: ' + err.message);
        }
    });
}

// Reels fetch karne aur feed banane ka function

async function fetchReelsFromDatabase() {
    if (!reelsFeed) return;
    reelsFeed.innerHTML = '<div style="text-align:center; padding:50px; color:#888;">Loading Reels...</div>';

    const { data: reels, error } = await supabaseClient
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        reelsFeed.innerHTML = '<div style="text-align:center; padding:50px; color:red;">Error loading reels</div>';
        return;
    }

    reelsFeed.innerHTML = '';
    const myName = localStorage.getItem('currentUsername');

    for (let reel of reels) {
        // 1. Database se current status fetch karein (Likes & Comments)
        const { count: likesCount } = await supabaseClient.from('reel_likes').select('*', { count: 'exact', head: true }).eq('reel_id', reel.id);
        const { data: myLike } = await supabaseClient.from('reel_likes').select('*').eq('reel_id', reel.id).eq('username', myName);
        const { data: comments } = await supabaseClient.from('reel_comments').select('*').eq('reel_id', reel.id).order('created_at', { ascending: true });

        const isLiked = myLike && myLike.length > 0;

        const reelCard = document.createElement('div');
        reelCard.className = 'reel-card'; // CSS class as per previous suggestion
        reelCard.style.cssText = "height: calc(100vh - 60px); width: 100%; scroll-snap-align: start; position: relative; background: #000; flex-shrink: 0;";

        reelCard.innerHTML = `
            <video src="${reel.video_url}" style="width:100%; height:100%; object-fit:cover;" loop playsinline></video>
            
            <!-- Bottom Info -->
            <div style="position:absolute; bottom:30px; left:15px; right:70px; z-index:5;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                    <div style="width:32px; height:32px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid #fff; color:#fff;">
                        ${reel.username.charAt(0).toUpperCase()}
                    </div>
                    <b style="color:#fff; text-shadow:1px 1px 2px #000;">${reel.username}</b>
                </div>
                <p style="color:#fff; font-size:14px; text-shadow:1px 1px 2px #000;">${reel.caption || ''}</p>
            </div>

            <!-- Side Buttons (Like & Comment) -->
            <div style="position:absolute; right:15px; bottom:40px; z-index:5; display:flex; flex-direction:column; align-items:center; gap:20px;">
                <div style="text-align:center; cursor:pointer;" class="like-btn-section">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart" style="font-size:30px; color:${isLiked ? '#ed4956' : '#fff'};"></i>
                    <p style="font-size:12px; margin-top:5px; color:#fff;" class="like-count-display">${likesCount || 0}</p>
                </div>
                <div style="text-align:center; cursor:pointer;" class="comment-btn-section">
                    <i class="fa-regular fa-comment" style="font-size:30px; color:#fff;"></i>
                    <p style="font-size:12px; margin-top:5px; color:#fff;">${comments ? comments.length : 0}</p>
                </div>
            </div>

            <!-- Comment Modal (Hidden by default) -->
            <div class="reel-comment-modal" style="display:none; position:absolute; bottom:0; left:0; width:100%; height:60%; background:#121212; border-radius:15px 15px 0 0; z-index:100; flex-direction:column; border-top:1px solid #333;">
                <div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #222;">
                    <h4 style="margin:0;">Comments</h4>
                    <button class="close-comment-btn" style="background:none; border:none; color:#fff; font-size:18px;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="comments-list-area" style="flex:1; overflow-y:auto; padding:15px; font-size:14px;">
                    ${comments && comments.length > 0 ? comments.map(c => `<div style="margin-bottom:10px;"><b>${c.username}</b>: ${c.comment}</div>`).join('') : '<p style="color:#777; text-align:center;">No comments yet.</p>'}
                </div>
                <div style="padding:10px; border-top:1px solid #222; display:flex; gap:10px; background:#000;">
                    <input type="text" class="reel-comment-input" placeholder="Add a comment..." style="flex:1; padding:8px; background:#222; border:none; border-radius:5px; color:#fff;">
                    <button class="send-comment-btn" style="background:none; border:none; color:#0095f6; font-weight:bold;">Post</button>
                </div>
            </div>
        `;

        // --- Logic: Like / Unlike ---
        const likeBtn = reelCard.querySelector('.like-btn-section');
        const likeIcon = likeBtn.querySelector('i');
        const likeCountElem = likeBtn.querySelector('.like-count-display');

        likeBtn.onclick = async (e) => {
            e.stopPropagation();
            let currentLikes = parseInt(likeCountElem.textContent);
            
            if (likeIcon.classList.contains('fa-solid')) {
                // Unlike Logic
                likeIcon.classList.replace('fa-solid', 'fa-regular');
                likeIcon.style.color = '#fff';
                likeCountElem.textContent = Math.max(0, currentLikes - 1);
                await supabaseClient.from('reel_likes').delete().eq('reel_id', reel.id).eq('username', myName);
            } else {
                // Like Logic (Single like check handles by DB or UI)
                likeIcon.classList.replace('fa-regular', 'fa-solid');
                likeIcon.style.color = '#ed4956';
                likeCountElem.textContent = currentLikes + 1;
                await supabaseClient.from('reel_likes').insert([{ reel_id: reel.id, username: myName }]);
            }
        };

        // --- Logic: Comments ---
        const commentModal = reelCard.querySelector('.reel-comment-modal');
        const openCommentBtn = reelCard.querySelector('.comment-btn-section');
        const closeCommentBtn = reelCard.querySelector('.close-comment-btn');
        const sendCommentBtn = reelCard.querySelector('.send-comment-btn');
        const commentInput = reelCard.querySelector('.reel-comment-input');
        const commentsListArea = reelCard.querySelector('.comments-list-area');

        openCommentBtn.onclick = () => { commentModal.style.display = 'flex'; };
        closeCommentBtn.onclick = () => { commentModal.style.display = 'none'; };

        sendCommentBtn.onclick = async () => {
            const commentVal = commentInput.value.trim();
            if(!commentVal) return;

            // UI update (Instant)
            if(commentsListArea.innerHTML.includes('No comments yet')) commentsListArea.innerHTML = '';
            commentsListArea.innerHTML += `<div style="margin-bottom:10px;"><b>${myName}</b>: ${commentVal}</div>`;
            commentsListArea.scrollTop = commentsListArea.scrollHeight;
            commentInput.value = '';

            // DB update
            await supabaseClient.from('reel_comments').insert([{ reel_id: reel.id, username: myName, comment: commentVal }]);
        };

        // --- Video Auto-play logic ---
        const video = reelCard.querySelector('video');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) video.play().catch(() => {});
                else video.pause();
            });
        }, { threshold: 0.7 });
        observer.observe(reelCard);

        reelsFeed.appendChild(reelCard);
    }

}
    
const navReelsBtnOriginal = document.getElementById('nav-reels-btn');
if (navReelsBtnOriginal) {
    navReelsBtnOriginal.addEventListener('click', () => {
        fetchReelsFromDatabase();
    });
}
// Profile render ya open hone par yeh function call karein
function setupProfileTabsAndContent(username) {
    const profileContainer = document.getElementById('profile-container'); // ya aapka jo bhi profile view element ho
    if (!profileContainer) return;

    // 1. Agar tabs bar pehle se nahi hai toh create karein
    if (!document.getElementById('profile-tabs-bar')) {
        const tabsBar = document.createElement('div');
        tabsBar.id = 'profile-tabs-bar';
        tabsBar.innerHTML = `
            <div id="tab-posts-btn" style="flex: 1; text-align: center; padding: 12px; font-size: 14px; font-weight: bold; color: #fff; cursor: pointer; border-bottom: 2px solid #fff;">Posts</div>
            <div id="tab-reels-btn" style="flex: 1; text-align: center; padding: 12px; font-size: 14px; font-weight: bold; color: #888; cursor: pointer;">Reels</div>
        `;
        
        // Isko profile stats ya bio ke baad insert kar dein
        const statsBox = profileContainer.querySelector('.profile-stats') || profileContainer.firstElementChild;
        if (statsBox) statsBox.after(tabsBar);
    }

    // 2. Reels container agar nahi hai toh profile ke andar banayein
    let reelsArea = document.getElementById('user-profile-reels');
    let postsArea = document.getElementById('user-profile-posts');

    if (!reelsArea) {
        reelsArea = document.createElement('div');
        reelsArea.id = 'user-profile-reels';
        reelsArea.style.display = 'none';
        if (postsArea) postsArea.after(reelsArea);
    }

    // Tab switching logic
    const tabPostsBtn = document.getElementById('tab-posts-btn');
    const tabReelsBtn = document.getElementById('tab-reels-btn');

    if (tabPostsBtn && tabReelsBtn) {
        tabPostsBtn.onclick = () => {
            tabPostsBtn.style.color = '#fff';
            tabPostsBtn.style.borderBottom = '2px solid #fff';
            tabReelsBtn.style.color = '#888';
            tabReelsBtn.style.borderBottom = 'none';
            if (postsArea) postsArea.style.display = 'grid';
            if (reelsArea) reelsArea.style.display = 'none';
        };

        tabReelsBtn.onclick = () => {
            tabReelsBtn.style.color = '#fff';
            tabReelsBtn.style.borderBottom = '2px solid #fff';
            tabPostsBtn.style.color = '#888';
            tabPostsBtn.style.borderBottom = 'none';
            if (postsArea) postsArea.style.display = 'none';
            if (reelsArea) reelsArea.style.display = 'grid';
            
            // Database se is user ki reels fetch karein
            fetchAndRenderUserReels(username, reelsArea);
        };
    }
}

// Supabase se user ki reels laane ka function
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
        
        // Yahan par click listener add kiya gaya hai jo detail view khulega
        item.addEventListener('click', () => {
            openDetailView('Reel', reel, username);
        });

        container.appendChild(item);
    });
}

// ================= DETAIL VIEW LOGIC (Add this at the end of script.js) =================

// 1. Naye Elements ko Select karna
const detailViewContainer = document.getElementById('detail-view-container');
const detailContent = document.getElementById('detail-content');
const backFromDetailBtn = document.getElementById('back-from-detail');

// 2. Detail View kholne ka Function
async function openDetailView(type, data, username) {
    hideAllViews(); // Saare views chupao
    if(detailViewContainer) detailViewContainer.classList.add('active'); // Detail screen dikhao
    
    const titleElem = document.getElementById('detail-view-title');
    if(titleElem) titleElem.textContent = type; 

    detailContent.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">Loading...</p>';

    if (type === 'Post') {
        renderSinglePostInDetail(data);
    } else {
        renderSingleReelInDetail(data);
    }
}

// Detail view se wapas jane ka button
const backBtnDetail = document.getElementById('back-from-detail');
if (backBtnDetail) {
    backBtnDetail.addEventListener('click', () => {
        // Detail view ko manually hide kar do
        document.getElementById('detail-view-container').classList.remove('active');
        
        // Profile page wapas kholo
        const activeProfileUser = localStorage.getItem('activeProfileUser') || localStorage.getItem('currentUsername');
        openProfilePage(activeProfileUser, true);
    });
}

// 4. Single Post Render karne ka tarika
async function renderSinglePostInDetail(post) {
    detailContent.innerHTML = '';
    const myName = localStorage.getItem('currentUsername');
    
    // Likes fetch logic
    const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
    
    const postCard = document.createElement('div');
    postCard.style.cssText = "background: #000; border-bottom: 1px solid #262626; padding-bottom: 20px;";
    
    postCard.innerHTML = `
        <div class="post-header" style="display: flex; align-items: center; padding: 10px;">
            <div style="width: 32px; height: 32px; background: #444; border-radius: 50%; margin-right: 10px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;">${post.username.charAt(0).toUpperCase()}</div>
            <span><b>${post.username}</b></span>
        </div>
        <div style="width: 100%; min-height: 300px; background: #111; display:flex; justify-content:center; align-items:center;">
            <img src="${post.image_url}" style="width: 100%; display:block;">
        </div>
        <div style="padding: 12px;">
            <p style="margin-bottom:5px;"><b>${likesCount || 0} likes</b></p>
            <p><b>${post.username}</b> ${post.caption || ''}</p>
        </div>
    `;
    detailContent.appendChild(postCard);
}

// 5. Single Reel Render karne ka tarika
async function renderSingleReelInDetail(reel) {
    const myName = localStorage.getItem('currentUsername');
    
    // Header mein se purana delete button hatana (taaki duplicate na ho)
    const oldDelBtn = document.getElementById('detail-delete-btn');
    if (oldDelBtn) oldDelBtn.remove();

    // Agar ye meri reel hai, toh header mein delete button add karo
    if (reel.username === myName) {
        const header = detailViewContainer.querySelector('.insta-header');
        const delBtn = document.createElement('button');
        delBtn.id = 'detail-delete-btn';
        delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        delBtn.style.cssText = "background:transparent; border:none; color:#ed4956; font-size:18px; cursor:pointer; margin-left: auto;";
        header.appendChild(delBtn);

        // Delete karne ka logic
        delBtn.onclick = async () => {
            if (confirm("Kya aap is reel ko delete karna chahte hain?")) {
                try {
                    // 1. Supabase se reel delete karna
                    const { error } = await supabaseClient
                        .from('reels')
                        .delete()
                        .eq('id', reel.id);

                    if (error) throw error;

                    // 2. Reel ke likes aur comments bhi clean up karna (optional but good)
                    await supabaseClient.from('reel_likes').delete().eq('reel_id', reel.id);
                    await supabaseClient.from('reel_comments').delete().eq('reel_id', reel.id);

                    alert("Reel delete ho gayi!");
                    
                    // 3. Wapas profile par bhejna aur refresh karna
                    detailViewContainer.classList.remove('active');
                    openProfilePage(myName, true);
                } catch (err) {
                    alert("Delete karne mein problem aayi: " + err.message);
                }
            }
        };
    }

    // Reel ka content dikhana
    detailContent.innerHTML = `
        <div style="width:100%; height:calc(100vh - 120px); background:#000; display:flex; flex-direction:column; justify-content:center;">
            <video src="${reel.video_url}" style="max-height:100%; width:100%; object-fit:contain;" controls autoplay loop></video>
        </div>
        <div style="padding:15px; background:#000; border-top:1px solid #262626;">
            <p style="font-size:15px;"><b>${reel.username}</b></p>
            <p style="font-size:14px; color:#ccc; margin-top:5px;">${reel.caption || ''}</p>
        </div>
    `;
}
//double tap to like //
function enableDoubleTapLike(element, postId, type = 'post') {
    let lastTap = 0;
    element.addEventListener('click', async (e) => {
        const now = Date.now();
        if ((now - lastTap) < 300) {
            // Heart Animation
            const heart = document.createElement('i');
            heart.className = "fa-solid fa-heart heart-animation";
            heart.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:80px; color:#fff; z-index:100; pointer-events:none;";
            element.parentElement.appendChild(heart);
            setTimeout(() => heart.remove(), 800);

            // Database Like
            const myName = localStorage.getItem('currentUsername');
            const likeIcon = document.getElementById(`like-btn-${postId}`) || document.querySelector(`#reel-like-btn-${postId}`);
            const countElem = document.getElementById(`likes-count-${postId}`) || document.querySelector(`#reel-likes-count-${postId}`);

            if (likeIcon && !likeIcon.classList.contains('fa-solid')) {
                likeIcon.classList.replace('fa-regular', 'fa-solid');
                likeIcon.style.color = '#ed4956';
                if(countElem) countElem.textContent = parseInt(countElem.textContent) + 1;
                const table = (type === 'post') ? 'likes' : 'reel_likes';
                const idCol = (type === 'post') ? 'post_id' : 'reel_id';
                await supabaseClient.from(table).insert([{ [idCol]: postId, username: myName }]);
            }
        }
        lastTap = now;
    });
        }
