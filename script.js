// 1. CONFIGURATION
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_PASS = '272009';

// 2. VIEW CONTROLLER (Login se aage le jaane wala function)
function navigateTo(viewName) {
    console.log("Navigating to:", viewName);
    
    // Saare views hide karo
    const allViews = document.querySelectorAll('.app-view');
    allViews.forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none'; // Extra safety
    });

    // Target view show karo
    const target = document.getElementById(viewName + '-view') || document.getElementById(viewName + '-container');
    if (target) {
        target.classList.add('active');
        target.style.display = 'flex';
    }

    // Nav bar control
    const bottomNav = document.getElementById('bottom-nav') || document.getElementById('insta-nav');
    if (bottomNav) {
        if (viewName === 'login' || viewName === 'chat') {
            bottomNav.style.display = 'none';
        } else {
            bottomNav.style.display = 'flex';
        }
    }
}

// 3. LOGIN LOGIC (Fail-Safe Version)
async function handleLogin() {
    console.log("Login attempt started...");
    
    // IDs check karein (HTML ke hisaab se)
    const userField = document.getElementById('login-username') || document.getElementById('login-username-input');
    const passField = document.getElementById('login-password') || document.getElementById('login-password-input');
    const errorBox = document.getElementById('login-error') || document.getElementById('login-error-msg');

    const user = userField.value.trim();
    const pass = passField.value.trim();

    if (user === "") {
        if(errorBox) errorBox.textContent = "Please enter a username.";
        return;
    }

    if (pass === MASTER_PASS) {
        console.log("Password Correct!");
        
        // 1. Pehle LocalStorage save karo
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUsername', user);
        
        // 2. UI ko Turant change karo (Database ka wait mat karo)
        navigateTo('home');

        // 3. Background mein database update karo (Try-Catch taaki error app na roke)
        try {
            console.log("Syncing user with database...");
            await supabase.from('users').upsert([{ username: user }]);
            loadFeed(); // Feed load karo
        } catch (dbError) {
            console.warn("Database sync failed, but login allowed:", dbError);
        }

    } else {
        console.log("Wrong Password!");
        if(errorBox) errorBox.textContent = "Incorrect password. Please try again.";
        passField.value = ""; // Clear password field
    }
}

// Event Listeners set karo
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn') || document.getElementById('login-submit-btn');
    if (loginBtn) {
        loginBtn.onclick = handleLogin;
    }

    // Enter key support
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeView = document.querySelector('.app-view.active');
            if (activeView && activeView.id.includes('login')) {
                handleLogin();
            }
        }
    });

    // Check session
    if (localStorage.getItem('isLoggedIn') === 'true') {
        navigateTo('home');
        loadFeed();
    } else {
        navigateTo('login');
    }
});

// --- DUMMY FEED LOAD (Taaki screen khali na dikhe) ---
async function loadFeed() {
    const feed = document.getElementById('main-feed') || document.getElementById('posts-feed');
    if (!feed) return;
    
    try {
        const { data, error } = await supabase.from('posts').select('*').order('created_at', {ascending: false});
        if (error) throw error;
        
        feed.innerHTML = "";
        if (!data || data.length === 0) {
            feed.innerHTML = "<p style='padding:20px; color:grey; text-align:center;'>No posts yet. Be the first to share!</p>";
            return;
        }

        data.forEach(post => {
            const div = document.createElement('div');
            div.className = "post-card";
            div.style.borderBottom = "1px solid #dbdbdb";
            div.innerHTML = `
                <div style="padding:10px; font-weight:bold;">${post.username}</div>
                <img src="${post.image_url}" style="width:100%; display:block;">
                <div style="padding:10px;"><b>${post.username}</b> ${post.caption || ''}</div>
            `;
            feed.appendChild(div);
        });
    } catch (err) {
        feed.innerHTML = "<p style='padding:20px; color:red; text-align:center;'>Error loading feed. Check internet.</p>";
    }
}
