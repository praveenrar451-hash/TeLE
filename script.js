// 1. CONFIGURATION (Const ko const kiya - case sensitive fix)
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const CORRECT_PASSWORD = '272009';

// 2. DOM ELEMENTS
const loginContainer = document.getElementById('login-container');
const instaContainer = document.getElementById('insta-container');
const teleContainer = document.getElementById('tele-container');
const reelsContainer = document.getElementById('reels-container');
const profileContainer = document.getElementById('profile-container');
const chatWindow = document.getElementById('chat-window');
const uploadModal = document.getElementById('upload-modal');
const bottomNav = document.getElementById('insta-nav'); // Bottom Nav Select kiya

// Inputs & Buttons
const loginUsernameInput = document.getElementById('login-username-input');
const loginPasswordInput = document.getElementById('login-password-input');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const loginErrorMsg = document.getElementById('login-error-msg');

// Navigation Buttons
const navHomeBtn = document.getElementById('nav-home-btn');
const navSearchBtn = document.getElementById('nav-search-btn');
const navUploadBtn = document.getElementById('nav-upload-btn');
const navReelsBtn = document.getElementById('nav-reels-btn');
const navProfileBtn = document.getElementById('nav-profile-btn');

// --- 3. LOGIN LOGIC (FIXED) ---
async function handleLogin() {
    const user = loginUsernameInput.value.trim();
    const pass = loginPasswordInput.value.trim();

    if (!user) {
        loginErrorMsg.textContent = "Please enter username!";
        return;
    }

    if (pass === CORRECT_PASSWORD) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUsername', user);
        
        // Background sync to Supabase
        try {
            await supabaseClient.from('users').upsert([{ username: user }]);
        } catch(e) { console.log("DB Sync error", e); }

        loginContainer.classList.remove('active');
        instaContainer.classList.add('active');
        if(bottomNav) bottomNav.style.display = 'flex'; // Nav show karein
        
        fetchPostsFromDatabase();
    } else {
        loginErrorMsg.textContent = "Incorrect Password!";
    }
}

if(loginSubmitBtn) loginSubmitBtn.onclick = handleLogin;

// --- 4. VIEW SWITCHING LOGIC (SMOOTH) ---
function hideAllViews() {
    [loginContainer, instaContainer, teleContainer, reelsContainer, profileContainer, chatWindow].forEach(view => {
        if(view) view.classList.remove('active');
    });
}

function showView(viewElement, navBtn) {
    hideAllViews();
    viewElement.classList.add('active');
    
    // Nav Icons Color Update
    [navHomeBtn, navSearchBtn, navUploadBtn, navReelsBtn, navProfileBtn].forEach(btn => {
        if(btn) btn.style.color = '#888';
    });
    if(navBtn) navBtn.style.color = '#fff';
}

// Navigation Listeners
navHomeBtn.onclick = () => { showView(instaContainer, navHomeBtn); fetchPostsFromDatabase(); };
navReelsBtn.onclick = () => { showView(reelsContainer, navReelsBtn); fetchReelsFromDatabase(); };
navProfileBtn.onclick = () => { 
    const currentUsername = localStorage.getItem('currentUsername');
    openProfilePage(currentUsername); // Variable fix: currentUsername
};

// --- 5. DOUBLE TAP TO LIKE (NEW FEATURE) ---
function addDoubleTapHeart(element, postId) {
    let lastTap = 0;
    element.addEventListener('click', async (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
            // Heart Animation Create
            const heart = document.createElement('i');
            heart.className = 'fa-solid fa-heart heart-animation-icon';
            heart.style.cssText = `
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 80px; color: white; opacity: 0.9; z-index: 10; pointer-events: none;
                animation: heartPop 0.8s ease-out;
            `;
            element.appendChild(heart);
            setTimeout(() => heart.remove(), 800);

            // DB Update
            const myName = localStorage.getItem('currentUsername');
            await supabaseClient.from('likes').insert([{ post_id: postId, username: myName }]);
        }
        lastTap = now;
    });
}

// --- 6. UPDATED POST FEED (With Double Tap) ---
async function fetchPostsFromDatabase() {
    const postsFeed = document.getElementById('posts-feed');
    postsFeed.innerHTML = "<p style='text-align:center; padding:20px;'>Loading feed...</p>";
    
    const { data, error } = await supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
    if (error) return;

    postsFeed.innerHTML = '';
    data.forEach(post => {
        const card = document.createElement('div');
        card.className = "post-card";
        card.style.cssText = "border-bottom: 1px solid #262626; margin-bottom: 15px;";
        
        card.innerHTML = `
            <div style="padding: 10px; display: flex; align-items: center; gap: 10px;">
                <div style="width:32px; height:32px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center;">${post.username[0].toUpperCase()}</div>
                <b>${post.username}</b>
            </div>
            <div class="post-media-box" style="position:relative; width:100%; aspect-ratio:1; background:#111;">
                <img src="${post.image_url}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="padding:12px;">
                <div style="font-size:20px; margin-bottom:8px; display:flex; gap:15px;">
                    <i class="fa-regular fa-heart"></i>
                    <i class="fa-regular fa-comment"></i>
                    <i class="fa-regular fa-paper-plane"></i>
                </div>
                <p><b>${post.username}</b> ${post.caption || ''}</p>
            </div>
        `;
        
        // Double tap apply karein image box par
        const mediaBox = card.querySelector('.post-media-box');
        addDoubleTapHeart(mediaBox, post.id);
        
        postsFeed.appendChild(card);
    });
}

// --- 7. TELEGRAM SWITCHER ---
document.getElementById('switch-to-tele').onclick = () => {
    instaContainer.classList.remove('active');
    teleContainer.classList.add('active');
    fetchRegisteredUsers();
};

document.getElementById('switch-to-insta').onclick = () => {
    teleContainer.classList.remove('active');
    instaContainer.classList.add('active');
};

// --- 8. REELS (Native Snapping Logic) ---
async function fetchReelsFromDatabase() {
    const reelsFeed = document.getElementById('reels-feed');
    reelsFeed.innerHTML = "";
    
    const { data } = await supabaseClient.from('reels').select('*').order('created_at', { ascending: false });
    
    data?.forEach(reel => {
        const reelBox = document.createElement('div');
        reelBox.className = "reel-snap-item";
        reelBox.style.cssText = "width:100%; height:100vh; scroll-snap-align: start; position:relative; background:#000;";
        
        reelBox.innerHTML = `
            <video src="${reel.video_url}" loop style="width:100%; height:100%; object-fit:cover;"></video>
            <div style="position:absolute; bottom:80px; left:15px; z-index:5;">
                <b>@${reel.username}</b>
                <p>${reel.caption || ''}</p>
            </div>
        `;
        
        const video = reelBox.querySelector('video');
        reelBox.onclick = () => video.paused ? video.play() : video.pause();
        
        reelsFeed.appendChild(reelBox);
    });
}

// --- 9. STARTUP CHECK ---
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        loginContainer.classList.remove('active');
        instaContainer.classList.add('active');
        if(bottomNav) bottomNav.style.display = 'flex';
        fetchPostsFromDatabase();
    } else {
        loginContainer.classList.add('active');
        if(bottomNav) bottomNav.style.display = 'none';
    }
});

// Purane Chat, Voice Note, aur Upload functions ko niche as it is rakhein...
// (Maine upar basic flow theek kar diya hai taaki app crash na ho)
