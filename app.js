/* ==================================================================
   FILE NAME: app.js
   DESCRIPTION: Ye code User Views aur Time Spent track karega
   ================================================================== */

// 1. FIREBASE CONFIGURATION (Yahan apni Firebase Keys Dalein)
// Ye wahi keys honi chahiye jo Admin panel me use ki hain
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
// Check karte hain ki Firebase pehle se load to nahi hai
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();


// ================= TRACKING LOGIC START =================

// Helper: Aaj ki date nikalne ke liye (YYYY-MM-DD format)
function getTodayDateString() {
    const date = new Date();
    // Timezone offset handle karte hain taki date sahi aaye
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

// Helper: URL se Movie/Series ka naam aur type nikalna
function getPageInfo() {
    const path = window.location.pathname;
    let type = null;
    let key = "unknown"; 

    // AGAR URL ME '/movie/' HAI
    if (path.includes('/movie/')) {
        type = 'movies';
        // URL se naam nikalna. Example: /movie/avatar -> avatar
        key = path.split('/movie/')[1];
    } 
    // AGAR URL ME '/series/' HAI
    else if (path.includes('/series/')) {
        type = 'series';
        key = path.split('/series/')[1];
    }

    // Key me se extra slashes (/) aur .html hatana
    if (key) {
        key = key.replace(/\/$/, "").replace(".html", "");
    }

    return { type, key };
}

// MAIN FUNCTION: Jo page load hote hi chalega
(function startTracking() {
    
    // Admin page par tracking nahi karni
    if (window.location.pathname.includes('admin.html')) return;

    // Page ki info nikalo
    const { type, key } = getPageInfo();

    // Agar ye Movie ya Series page nahi hai, to yahi ruk jao
    if (!type || !key) {
        console.log("Analytics: Tracking skipped (Not a movie/series page)");
        return;
    }

    // Database ka rasta (Path)
    const dateStr = getTodayDateString();
    const pathRef = `analytics/daily/${dateStr}/${type}/${key}`;

    // ---------------------------------------------------------
    // 1. VIEW COUNT TRACKING
    // ---------------------------------------------------------
    
    // SessionStorage use kar rahe hain taki REFRESH karne par view na badhe
    const sessionKey = `viewed_${type}_${key}`;
    
    if (!sessionStorage.getItem(sessionKey)) {
        const viewRef = db.ref(`${pathRef}/views`);
        
        // Transaction use karte hain taki count sahi se +1 ho
        viewRef.transaction((currentViews) => {
            return (currentViews || 0) + 1;
        });

        // Browser me save kar lo ki isne dekh liya
        sessionStorage.setItem(sessionKey, 'true');
        console.log(`Analytics: View counted for ${key}`);
    }

    // ---------------------------------------------------------
    // 2. TIME SPENT TRACKING
    // ---------------------------------------------------------
    let startTime = Date.now();

    // Time database me bhejne wala function
    const saveTime = () => {
        // Kitne seconds hue?
        const timeSpent = Math.floor((Date.now() - startTime) / 1000); 
        
        if (timeSpent > 0) {
            const timeRef = db.ref(`${pathRef}/totalTime`);
            timeRef.transaction((currentTime) => {
                return (currentTime || 0) + timeSpent;
            });
            console.log(`Analytics: Saved ${timeSpent}s for ${key}`);
        }
    };

    // Jab user Tab close kare ya Doosre page par jaye
    window.addEventListener('beforeunload', saveTime);
    
    // Jab user Mobile par App minimize kare ya Tab change kare
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveTime();
        } else {
            // Wapas aane par naya timer shuru
            startTime = Date.now(); 
        }
    });

})();
