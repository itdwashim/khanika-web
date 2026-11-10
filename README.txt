KHANIKA - WEB APP (version 1.25.1)
==================================
The same app as the desktop and Android versions, running in any browser and installable
to the home screen / desktop. Works offline after the first visit.

PUT IT ON THE INTERNET (GitHub Pages, free)
 1. On GitHub create a NEW repository (for example "khanika-app"). Do not reuse the website repository.
 2. Upload everything in this folder (index.html, web-shim.js, sw.js, manifest.webmanifest,
    the vendor and icons folders, .nojekyll and the .github folder) to the repository, branch "main".
 3. Repository > Settings > Pages > Build and deployment > Source: "GitHub Actions".
    (The included workflow .github/workflows/deploy-web.yml then publishes it on every upload.)
 4. After about a minute the app is at   https://YOUR-NAME.github.io/khanika-app/
    Open it, and:
      Phone (Chrome):  tap "Install" in the banner, or menu > Add to Home screen.
      iPhone (Safari): Share > Add to Home Screen.
      Computer (Chrome / Edge): click the install icon in the address bar.
 To use your own address (for example app.yourdomain.com) add it under Settings > Pages > Custom domain.

FIRST USE ON A NEW DEVICE
 - The app starts empty. Create the administrator account, then open
   Settings > Cloud sync and website sync, enter the same Google script address and key
   you use in the other apps, and press the sync button to bring in all your data.
 - Data is kept inside that browser on that device (and a daily copy for 14 days).
   Turn on Cloud sync so every device shows the same data. Also take a Backup (JSON) now and then.
 - Do not clear the browser's "site data" for this address, and do not use a private/incognito window.

THINGS THAT DIFFER FROM THE DESKTOP / ANDROID APPS
 - PDFs and Excel files download (on phones the Share sheet opens, so you can send them on WhatsApp / Gmail).
 - "Download auto-backup" (Settings > Data) downloads the newest daily backup instead of opening a folder.
 - Importing holidays from a website address may be blocked by the browser; copy the table and paste it instead.

UPDATING
 Upload the new files over the old ones. The app picks up the update the next time it is opened
 (close and reopen it once or twice).

PRIVACY
 Anyone who knows the web address can open the app screen, but they only see the data stored in THEIR own browser.
 Your real data is protected by your logins and, in the cloud, by the Google script key. Keep that key private.
