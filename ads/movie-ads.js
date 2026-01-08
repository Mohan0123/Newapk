document.addEventListener("DOMContentLoaded", function () {

  const banner = document.getElementById("ad-banner");
  if (!banner) return;

  // STEP 1: atOptions define
  const script1 = document.createElement("script");
  script1.type = "text/javascript";
  script1.innerHTML = `
    atOptions = {
      'key' : 'e3a409083f8368fff12736cae6f9853a',
      'format' : 'iframe',
      'height' : 90,
      'width' : 728,
      'params' : {}
    };
  `;

  // STEP 2: invoke.js load
  const script2 = document.createElement("script");
  script2.type = "text/javascript";
  script2.src = "https://joyfullybarn.com/e3a409083f8368fff12736cae6f9853a/invoke.js";

  // STEP 3: inject into ad box
  banner.appendChild(script1);
  banner.appendChild(script2);

});
