// CONFIGURATION
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_PASS = '272009';

// DOM ELEMENTS
const views = {
    login: document.getElementById('login-view'),
    home: document.getElementById('home-view'),
    tele: document.getElementById('tele-view'),
    reels: document.getElementById('reels-view'),
    profile: document.getElementById('profile-view'),
    chat: document.getElementById('chat-window')
};

const bottomNav = document.getElementById('bottom-nav');

// --- VIEW CONTROLLER ---
function navigateTo(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');

    // Bottom Nav Visibility
    if(viewName === 'login' || viewName === 'chat') {
        bottomNav.style.display = 'none';
    } else {
        bottomNav.style.display = 'flex';
    }

    // Highlight Nav Icons
    document.querySelectorAll('.nav-item').forEach(icon => {
        icon.classList.remove('active');
        if(icon.getAttribute('data-view') === viewName) icon.classList.add('active');
    });
}

// --- LOGIN LOGIC ---
document.getElementById('login-btn').addEventListener('click', async () => {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errorBox = document.getElementById('login-error');

    if(pass === MASTER_PASS && user !== "") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUsername', user);
        
        // Supabase register (Optional background sync)
        try { await supabase.from('users').upsert([{ username: user }]); } catch(e) {}

        navigateTo('home');
        loadFeed();
    } else {
        errorBox.textContent = "Sorry, your password was incorrect. Please double-check your password.";
    }
});

// --- NAVIGATION EVENTS ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        const view = item.getAttribute('data-view');
        if(view) {
            navigateTo(view);
            if(view === 'home') loadFeed();
            if(view === 'reels') loadReels();
        }
    };
});

document.getElementById('switch-to-tele').onclick = () => navigateTo('tele');
document.getElementById('back-to-insta').onclick = () => navigateTo('home');
document.getElementById('logout-btn').onclick = () => {
    localStorage.clear();
    location.reload();
};

// --- DATA FETCHING (PLACEHOLDERS) ---
async function loadFeed() {
    const feed = document.getElementById('main-feed');
    feed.innerHTML = "<p style='padding:20px; text-align:center;'>Loading Feed...</p>";
    
    const { data } = await supabase.from('posts').select('*').order('created_at', {ascending: false});
    feed.innerHTML = "";
    data?.forEach(post => {
        const div = document.createElement('div');
        div.className = "post-card";
        div.style.paddingBottom = "15px";
        div.style.borderBottom = "1px solid #dbdbdb";
        div.innerHTML = `
            <div style="padding:10px; font-weight:bold;">${post.username}</div>
            <img src="${post.image_url}" style="width:100%;">
            <div style="padding:10px;"><b>${post.username}</b> ${post.caption}</div>
        `;
        feed.appendChild(div);
    });
}

async function loadReels() {
    const feed = document.getElementById('reels-feed');
    feed.innerHTML = "";
    const { data } = await supabase.from('reels').select('*');
    data?.forEach(reel => {
        const div = document.createElement('div');
        div.className = "reel-item";
        div.innerHTML = `<video src="${reel.video_url}" loop style="width:100%; height:100%; object-fit:cover;"></video>`;
        div.onclick = (e) => e.target.paused ? e.target.play() : e.target.pause();
        feed.appendChild(div);
    });
}

// --- INITIALIZE ---
window.onload = () => {
    if(localStorage.getItem('isLoggedIn') === 'true') {
        navigateTo('home');
        loadFeed();
    } else {
        navigateTo('login');
    }
};
