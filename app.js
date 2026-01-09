/* ==================================================================
   FILE NAME: app.js
   DESCRIPTION: Updated Tracking for 'movies' folder
   ================================================================== */

// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyDqxDVOGJR1_i7HM0NtUlQ2vdVtEBTxQfc",
    authDomain: "easyfind-hk5x6.firebaseapp.com",
    databaseURL: "https://easyfind-hk5x6-default-rtdb.firebaseio.com",
    projectId: "easyfind-hk5x6",
    storageBucket: "easyfind-hk5x6.firebasestorage.app",
    messagingSenderId: "45912638549",
    appId: "1:45912638549:web:3e8732b2bd4d15f3a300dc"
};

// 2. FIREBASE INITIALIZE
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ================= TRACKING LOGIC START =================

function getTodayDateString() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

function getPageInfo() {
    const path = window.location.pathname;
    let type = null;
    let key = "unknown"; 

    // --- FIX IS HERE: Checking for 'movies' (plural) ---
    if (path.includes('/movies/')) {
        type = 'movies';
        key = path.split('/movies/')[1];
    } 
    else if (path.includes('/series/')) {
        type = 'series';
        key = path.split('/series/')[1];
    }

    if (key) {
        key = key.replace(/\/$/, "").replace(".html", "");
    }

    return { type, key };
}

(function startTracking() {
    if (window.location.pathname.includes('admin.html')) return;

    const { type, key } = getPageInfo();

    if (!type || !key) {
        console.log("Analytics: Tracking skipped (Not a movie/series page)");
        return;
    }

    const dateStr = getTodayDateString();
    const pathRef = `analytics/daily/${dateStr}/${type}/${key}`;

    // 1. VIEW COUNT
    const sessionKey = `viewed_${type}_${key}`;
    if (!sessionStorage.getItem(sessionKey)) {
        const viewRef = db.ref(`${pathRef}/views`);
        viewRef.transaction((currentViews) => {
            return (currentViews || 0) + 1;
        });
        sessionStorage.setItem(sessionKey, 'true');
    }

    // 2. TIME SPENT
    let startTime = Date.now();
    const saveTime = () => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000); 
        if (timeSpent > 0) {
            const timeRef = db.ref(`${pathRef}/totalTime`);
            timeRef.transaction((currentTime) => {
                return (currentTime || 0) + timeSpent;
            });
        }
    };

    window.addEventListener('beforeunload', saveTime);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveTime();
        } else {
            startTime = Date.now(); 
        }
    });

})();
