// --- 1. SUPABASE INITIALIZATION ---
const SUPABASE_URL = 'https://ydjbojsqeujahgqinfmk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jxLWxWU876psNuIx-P7cCw_NR9JHzyI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PASS_CODE = '272009';

// --- 2. NAVIGATION LOGIC ---
function showScreen(screenId) {
    // Sab views se 'active' class hatao
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });
    // Target view ko 'active' karo
    const target = document.getElementById(screenId + '-view');
    if (target) {
        target.classList.add('active');
    }
}

// --- 3. LOGIN FUNCTION ---
async function handleLogin() {
    const userInp = document.getElementById('login-username');
    const passInp = document.getElementById('login-password');
    const errorMsg = document.getElementById('login-error');

    const username = userInp.value.trim();
    const password = passInp.value.trim();

    if (username === "") {
        errorMsg.textContent = "Please enter a username.";
        return;
    }

    if (password === PASS_CODE) {
        // Success: Storage mein save karo
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', username);

        // Turant Screen badlo
        showScreen('home');

        // Background mein Supabase par user register karo
        try {
            await supabase.from('users').upsert([{ username: username }]);
        } catch (e) {
            console.log("DB sync skipped or table missing.");
        }
    } else {
        errorMsg.textContent = "Incorrect password. Please try again.";
        passInp.value = "";
    }
}

// --- 4. EVENT LISTENERS ---
document.getElementById('login-btn').addEventListener('click', handleLogin);

// Login on 'Enter' key
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const loginView = document.getElementById('login-view');
        if (loginView.classList.contains('active')) {
            handleLogin();
        }
    }
});

// --- 5. SESSION CHECK ON START ---
window.onload = () => {
    const status = localStorage.getItem('isLoggedIn');
    if (status === 'true') {
        showScreen('home');
    } else {
        showScreen('login');
    }
};
