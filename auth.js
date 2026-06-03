// ═══════════════════════════════════════════════════════════════
// AUTH.JS — Shared authentication module for all protected pages
// ═══════════════════════════════════════════════════════════════
// SETUP: Replace the firebaseConfig below with your own from
// https://console.firebase.google.com → Project Settings → Web App

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase (only once)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ═══════════════════════════════════════════════
// AUTH GATE UI
// ═══════════════════════════════════════════════
function createAuthGate() {
    const gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.style.cssText = 'position:fixed;inset:0;background:var(--bg,#f5f5f5);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Georgia,serif;';
    gate.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:1.5rem;margin-bottom:10px;">Checking access...</div><div style="color:#555;font-size:.9rem;">Please wait</div></div>';
    document.body.appendChild(gate);
    return gate;
}

function showAccessDenied() {
    const gate = document.getElementById('auth-gate');
    if (gate) {
        gate.innerHTML = '<div style="text-align:center;padding:40px;max-width:400px;">' +
            '<h2 style="color:#dc2626;margin-bottom:15px;">Access Required</h2>' +
            '<p style="color:#555;margin-bottom:20px;">Your account does not have access to this test. Please contact your teacher to request access.</p>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<a href="login.html" style="padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Back to Login</a>' +
            '<button onclick="authLogout()" style="padding:10px 20px;background:transparent;border:2px solid #ddd;border-radius:8px;cursor:pointer;">Log Out</button>' +
            '</div></div>';
    }
}

function hideAuthGate() {
    const gate = document.getElementById('auth-gate');
    if (gate) gate.style.display = 'none';
}

// ═══════════════════════════════════════════════
// CORE AUTH CHECK
// ═══════════════════════════════════════════════
// Call this on page load with the required access key
// e.g., checkPageAccess('sat-math-full')
function checkPageAccess(requiredAccess) {
    createAuthGate();

    auth.onAuthStateChanged(function(user) {
        if (!user) {
            // Not logged in → redirect to login
            var redirect = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = 'login.html?redirect=' + redirect;
            return;
        }

        // User is logged in — check Firestore access
        db.collection('users').doc(user.uid).get().then(function(doc) {
            if (!doc.exists) {
                // User authenticated but no Firestore record — create one with no access
                db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    access: {},
                    role: 'student'
                });
                showAccessDenied();
                return;
            }

            var data = doc.data();
            var hasAccess = data.role === 'admin' || data.access.all === true || data.access[requiredAccess] === true;

            if (!hasAccess) {
                showAccessDenied();
                return;
            }

            // Access granted!
            db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Expose current user globally
            window.currentUser = {
                uid: user.uid,
                name: data.displayName || user.displayName || user.email.split('@')[0],
                email: user.email,
                role: data.role
            };

            // Auto-fill student name if input exists
            var nameInput = document.getElementById('student-name');
            if (nameInput) {
                nameInput.value = window.currentUser.name;
                nameInput.readOnly = true;
                nameInput.style.background = 'var(--card, #fff)';
            }

            hideAuthGate();
        }).catch(function(err) {
            console.error('Firestore error:', err);
            showAccessDenied();
        });
    });
}

// ═══════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════
function authLogout() {
    auth.signOut().then(function() {
        window.location.href = 'login.html';
    });
}
