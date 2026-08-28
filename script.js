// ==========================================
// INSTAGRAM CLONE - MASTER SCRIPT (FULL CODE)
// ==========================================

// 1. Global View Switch & State Memory
const originalSwitchView = window.switchView;
window.switchView = function(viewId) {
    if (typeof originalSwitchView === 'function') {
        originalSwitchView(viewId);
    }
    localStorage.setItem('activeAppView', viewId);
    setTimeout(renderAllAvatars, 200);
};

// Page load hone par active view aur avatars restore karna
window.addEventListener('DOMContentLoaded', () => {
    const lastActiveView = localStorage.getItem('activeAppView');
    if (lastActiveView && document.getElementById(lastActiveView)) {
        setTimeout(() => {
            switchView(lastActiveView);
        }, 150);
    }
    
    // Load own profile data
    const currentUname = localStorage.getItem('currentUsername');
    if (currentUname) {
        const nameEl = document.getElementById('my-profile-username');
        const dispEl = document.getElementById('profile-display-name');
        if (nameEl) nameEl.textContent = currentUname;
        if (dispEl) dispEl.textContent = currentUname;
    }
    
    renderAllAvatars();
});

// 2. Global Avatar (DP) Renderer across all sections
window.renderAllAvatars = function() {
    document.querySelectorAll('.avatar, [data-username]').forEach(el => {
        let username = el.getAttribute('data-username');
        if (!username) {
            const parent = el.closest('[data-username]') || el.closest('.chat-user-row') || el.closest('.post-card');
            if (parent) username = parent.getAttribute('data-username');
        }

        if (username) {
            const dpUrl = localStorage.getItem(`userAvatar_${username}`);
            const targetAvatar = el.classList.contains('avatar') ? el : el.querySelector('.avatar');
            
            if (targetAvatar && dpUrl) {
                targetAvatar.style.backgroundImage = `url('${dpUrl}')`;
                targetAvatar.style.backgroundSize = 'cover';
                targetAvatar.style.backgroundPosition = 'center';
                targetAvatar.textContent = '';
            }
        }
    });
};

// 3. Open Any User's Profile (Instagram Style)
window.openUserProfile = async function(targetUsername) {
    const myName = localStorage.getItem('currentUsername');
    if (!targetUsername) return;

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
    view.style.display = 'block';

    view.innerHTML = `<div style="text-align:center; color:#777; padding:50px;">Loading profile...</div>`;

    let isFollowing = false;
    let postCount = 0;
    let followersCount = 0;
    let followingCount = 0;
    let targetBio = "Instagram User 🚀";

    if (window.supabaseClient) {
        // Check follow status
        const { data: followData } = await window.supabaseClient
            .from('follows')
            .select('*')
            .eq('follower', myName)
            .eq('following', targetUsername);
        
        if (followData && followData.length > 0) isFollowing = true;

        // Fetch counts
        const { count: pCount } = await window.supabaseClient.from('posts').select('*', { count: 'exact', head: true }).eq('username', targetUsername);
        postCount = pCount || 0;

        const { count: fCount } = await window.supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following', targetUsername);
        followersCount = fCount || 0;

        const { count: fgCount } = await window.supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower', targetUsername);
        followingCount = fgCount || 0;

        // Fetch Bio
        const { data: userData } = await window.supabaseClient.from('users').select('bio').eq('username', targetUsername).single();
        if (userData && userData.bio) targetBio = userData.bio;
    }

    const dp = localStorage.getItem(`userAvatar_${targetUsername}`) || '';
    const dpStyle = dp ? `background-image: url('${dp}'); background-size: cover; background-position: center;` : '';

    view.innerHTML = `
        <div class="top-header">
            <div style="display:flex; align-items:center; gap:15px;">
                <i class="fa-solid fa-arrow-left" onclick="switchView('insta-feed-container')" style="cursor:pointer; font-size:18px;"></i>
                <h2 style="font-size:16px;">${targetUsername}</h2>
            </div>
        </div>
        <div style="padding:15px 16px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div class="avatar" style="width:80px; height:80px; font-size:30px; ${dpStyle}">${dp ? '' : targetUsername.charAt(0).toUpperCase()}</div>
                <div style="display:flex; gap:15px; text-align:center; flex:1; justify-content:space-around; margin-left:15px;">
                    <div><b>${postCount}</b><p style="font-size:12px; color:#aaa;">Posts</p></div>
                    <div><b>${followersCount}</b><p style="font-size:12px; color:#aaa;">Followers</p></div>
                    <div><b>${followingCount}</b><p style="font-size:12px; color:#aaa;">Following</p></div>
                </div>
            </div>
            <div style="margin-top:12px;">
                <b style="font-size:14px;">${targetUsername}</b>
                <p style="font-size:13px; color:#ddd; margin-top:2px;">${targetBio}</p>
            </div>
            <div style="display:flex; gap:8px; margin-top:15px;">
                <button id="dynamic-follow-btn" onclick="toggleFollowUser('${targetUsername}')" style="flex:1; background:${isFollowing ? '#262626' : '#0095f6'}; color:#fff; border:none; padding:8px; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer;">${isFollowing ? 'Following' : 'Follow'}</button>
                <button onclick="switchView('chat-container'); setTimeout(() => openChatWindow('${targetUsername}'), 200);" style="flex:1; background:#262626; color:#fff; border:none; padding:8px; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer;">Message</button>
            </div>
        </div>
    `;
};

// 4. Follow / Unfollow Toggle Handler
window.toggleFollowUser = async function(targetUsername) {
    const myName = localStorage.getItem('currentUsername');
    const btn = document.getElementById('dynamic-follow-btn');
    if (!window.supabaseClient || !btn || !myName) return;

    if (btn.textContent === 'Follow') {
        const { error } = await window.supabaseClient.from('follows').insert([{ follower: myName, following: targetUsername }]);
        if (!error) {
            btn.textContent = 'Following';
            btn.style.background = '#262626';
        } else {
            alert("Follow error: " + error.message);
        }
    } else {
        const { error } = await window.supabaseClient.from('follows').delete().eq('follower', myName).eq('following', targetUsername);
        if (!error) {
            btn.textContent = 'Follow';
            btn.style.background = '#0095f6';
        } else {
            alert("Unfollow error: " + error.message);
        }
    }
};

// 5. Clickable Usernames across the app to open profile
document.addEventListener('click', (e) => {
    const userElement = e.target.closest('[data-username], .chat-user-row');
    if (userElement) {
        let username = userElement.getAttribute('data-username');
        if (!username && userElement.classList.contains('chat-user-row')) {
            username = userElement.querySelector('b')?.textContent;
        }
        
        const myName = localStorage.getItem('currentUsername');
        if (username && username.trim() !== myName && !e.target.closest('button') && !e.target.closest('input')) {
            if (username.trim().length > 0) {
                openUserProfile(username.trim());
            }
        }
    }
});

// 6. Profile Picture Cropping & Upload Handler
window.handleImageCropSelection = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const imgSrc = e.target.result;
        const username = localStorage.getItem('currentUsername');
        
        // Save locally & globally
        localStorage.setItem(`userAvatar_${username}`, imgSrc);
        
        const myAvatar = document.getElementById('my-profile-avatar');
        if (myAvatar) {
            myAvatar.style.backgroundImage = `url('${imgSrc}')`;
            myAvatar.style.backgroundSize = 'cover';
            myAvatar.style.backgroundPosition = 'center';
            myAvatar.textContent = '';
        }
        renderAllAvatars();
        alert("Profile picture updated successfully!");
    };
    reader.readAsDataURL(file);
};

// 7. Profile Edit & Save Changes
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
        const { error } = await window.supabaseClient
            .from('users')
            .update({ username: newUname, bio: newBio })
            .eq('username', oldUname);

        if (error) {
            alert("Error updating profile: " + error.message);
            return;
        }
    }

    localStorage.setItem('currentUsername', newUname);
    alert("Profile updated successfully!");
    location.reload();
};

// 8. Continuous Live Background Sync Interval
setInterval(() => {
    if (typeof window.renderAllAvatars === 'function') {
        window.renderAllAvatars();
    }
}, 1000);
