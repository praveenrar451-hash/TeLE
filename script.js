// CONFIG
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_PASS = '272009';

// FUNCTION: VIEW CHANGER
function goTo(viewId) {
    console.log("Moving to view:", viewId);
    // Hide all
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    // Show target
    const target = document.getElementById('view-' + viewId);
    if(target) target.classList.add('active');

    // Nav bar control
    const nav = document.getElementById('nav-bar');
    if(viewId === 'login') {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
    }
}

// LOGIN LOGIC
document.getElementById('btn-login').addEventListener('click', async function() {
    console.log("Login button clicked!"); // Debugging
    
    const user = document.getElementById('inp-user').value.trim();
    const pass = document.getElementById('inp-pass').value.trim();
    const errorBox = document.getElementById('msg-error');

    if(user === "") {
        errorBox.textContent = "Enter username";
        return;
    }

    if(pass === MASTER_PASS) {
        // SUCCESS
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', user);
        
        // Change view immediately
        goTo('home');
        
        // Sync with DB in background (ignore errors)
        try {
            await supabase.from('users').upsert([{ username: user }]);
        } catch(e) { console.log("DB sync skipped"); }
        
    } else {
        // WRONG PASSWORD
        errorBox.textContent = "Incorrect password. Try again.";
        document.getElementById('inp-pass').value = ""; // Clear pass
    }
});

// LOGOUT
document.getElementById('btn-logout').onclick = () => {
    localStorage.clear();
    location.reload();
};

// CHECK SESSION ON LOAD
window.onload = () => {
    if(localStorage.getItem('isLoggedIn') === 'true') {
        goTo('home');
    } else {
        goTo('login');
    }
};
