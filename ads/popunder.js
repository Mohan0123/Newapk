/* ===============================
   POPUNDER AD
================================ */
(function () {
  let popTriggered = false;

  function openPop() {
    if (popTriggered) return;
    popTriggered = true;

    window.open(
      "https://YOUR_POPUNDER_AD_URL",
      "_blank"
    );

    document.removeEventListener("click", openPop);
  }

  document.addEventListener("click", openPop);
})();

/* ===============================
   SOCIAL BAR (EXTERNAL SCRIPT)
================================ */
(function () {
  const s = document.createElement("script");
  s.src = "https://joyfullybarn.com/f5/76/ea/f576ea86d7e7c1a91485425829516236.js";
  s.async = true;
  document.body.appendChild(s);
})();
