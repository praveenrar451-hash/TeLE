// 1. CONFIG
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_PASS = '272009';

// 2. GUI NAVIGATION (Ye function page change karta hai)
function goTo(viewId) {
    console.log("Navigating to:", viewId);
    
    // Sab views hide karo
    const views = document.querySelectorAll('.app-view');
    views.forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none'; 
    });

    // Target view dikhao
    const target = document.getElementById('view-' + viewId);
    if(target) {
        target.classList.add('active');
        target.style.display = 'flex';
    }

    // Nav bar control
    const nav = document.getElementById('nav-bar');
    if(nav) {
        nav.style.display = (viewId === 'login') ? 'none' : 'flex';
    }
}

// 3. LOGIN LOGIC (Instant Response)
const loginBtn = document.getElementById('btn-login');
if(loginBtn) {
    loginBtn.onclick = async function() {
        const user = document.getElementById('inp-user').value.trim();
        const pass = document.getElementById('inp-pass').value.trim();
        const errorBox = document.getElementById('msg-error');

        if(user === "") {
            errorBox.textContent = "Enter a username";
            return;
        }

        if(pass === MASTER_PASS) {
            // SUCCESS: Turant aage badho
            console.log("Login Success!");
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', user);
            
            goTo('home'); // Login Page Chhor kar Home par jao

            // Ab background mein Supabase sync karo (Agar fail hua toh bhi fark nahi padega)
            try {
                await supabase.from('users').upsert([{ username: user }]);
                loadFeed();
            } catch(e) {
                console.log("Supabase sync failed, but it's okay.");
            }
        } else {
            errorBox.textContent = "Incorrect password.";
        }
    };
}

// 4. LOGOUT
const logoutBtn = document.getElementById('btn-logout');
if(logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        location.reload();
    };
}

// 5. APP STARTUP
window.onload = () => {
    if(localStorage.getItem('isLoggedIn') === 'true') {
        goTo('home');
        loadFeed();
    } else {
        goTo('login');
    }
};

// Placeholder Feed Load
async function loadFeed() {
    const feed = document.getElementById('feed-container');
    if(!feed) return;
    feed.innerHTML = "<p style='padding:20px; text-align:center;'>Loading Feed...</p>";
    
    try {
        const { data } = await supabase.from('posts').select('*').order('created_at', {ascending: false});
        if(data && data.length > 0) {
            feed.innerHTML = "";
            data.forEach(p => {
                feed.innerHTML += `<div style="border-bottom:1px solid #eee; padding-bottom:10px;">
                    <p style="padding:10px;"><b>${p.username}</b></p>
                    <img src="${p.image_url}" style="width:100%;">
                </div>`;
            });
        } else {
            feed.innerHTML = "<p style='padding:20px; text-align:center; color:gray;'>No posts yet.</p>";
        }
    } catch(e) {
        feed.innerHTML = "<p style='padding:20px; text-align:center;'>Feed offline.</p>";
    }
}
