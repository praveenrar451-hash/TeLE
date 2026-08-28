// 1. Supabase Initialization
const SB_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SB_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

// 2. Navigation Function
function goTo(viewId) {
    console.log("Switching to:", viewId);
    // Sab chhupa do
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    // Target dikhao
    const target = document.getElementById(viewId + '-view');
    if(target) target.classList.add('active');
}

// 3. Login Action
document.getElementById('login-btn').onclick = function() {
    const user = document.getElementById('user-inp').value.trim();
    const pass = document.getElementById('pass-inp').value.trim();
    const error = document.getElementById('err-msg');

    if(user === "") {
        error.textContent = "Username is required";
        return;
    }

    // PASSWORD CHECK
    if(pass === "272009") {
        // --- A. TURANT UI BADLO ---
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', user);
        goTo('home');

        // --- B. BACKGROUND DB SYNC (Fail hua to bhi chinta nahi) ---
        syncUser(user);
    } else {
        error.textContent = "Incorrect password.";
    }
};

async function syncUser(uname) {
    try {
        await supabase.from('users').upsert([{ username: uname }]);
        console.log("User synced with Supabase");
    } catch(e) {
        console.log("DB sync error (maybe table not ready)");
    }
}

// 4. Logout Action
document.getElementById('logout-btn').onclick = function() {
    localStorage.clear();
    location.reload();
};

// 5. Start App
window.onload = function() {
    if(localStorage.getItem('isLoggedIn') === 'true') {
        goTo('home');
    } else {
        goTo('login');
    }
};
