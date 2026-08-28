// 1. Supabase Setup (Aapki Keys)
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_PASS = '272009';

// 2. Navigation Function (Pura Control Iske Paas Hai)
function changeScreen(viewId) {
    console.log("Changing screen to:", viewId);
    // Sab ko hide karo
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    // Target ko show karo
    const target = document.getElementById('view-' + viewId);
    if(target) {
        target.classList.add('active');
    }
}

// 3. Login Button Click
document.getElementById('login-btn').addEventListener('click', function() {
    const user = document.getElementById('user-inp').value.trim();
    const pass = document.getElementById('pass-inp').value.trim();
    const error = document.getElementById('err-msg');

    console.log("Button Clicked! User:", user, "Pass:", pass);

    if(user === "") {
        error.textContent = "Enter username first!";
        return;
    }

    if(pass === MASTER_PASS) {
        // SUCCESS: Turant screen badlo
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', user);
        
        alert("Login Successful! Moving to Home..."); // Test ke liye
        changeScreen('home');

        // Database wala kaam login ke BAAD background mein hoga
        syncUser(user);
    } else {
        error.textContent = "Wrong password!";
    }
});

// 4. Background Database Sync
async function syncUser(username) {
    try {
        await supabase.from('users').upsert([{ username: username }]);
        console.log("Database updated!");
    } catch(e) {
        console.warn("DB table users not found, but it's okay!");
    }
}

// 5. Logout
document.getElementById('logout-btn').onclick = () => {
    localStorage.clear();
    location.reload();
};

// 6. Check Session on Start
window.onload = () => {
    if(localStorage.getItem('isLoggedIn') === 'true') {
        changeScreen('home');
    } else {
        changeScreen('login');
    }
};
