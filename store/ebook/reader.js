/* ============================================================
   MOKSHARA 3D BOOK READER — Interactive Page-Flip System
   Dynamically compiles 2D scroll layouts into a 3D book
   ============================================================ */

window.addEventListener("load", () => {
  // ============================================================
  //  ACCESS SECURITY PAYWALL CHECK
  //  Checks localStorage for purchase verification from store
  //  book6-rise-transform.html is the FREE ebook (ID 6)
  // ============================================================
  const filename = window.location.pathname.split("/").pop();
  const bookFiles = {
    'book1-mindful-living.html': 1,
    'book2-inner-peace.html': 4,
    'book3-healing-within.html': 2,
    'book4-compassion-connection.html': 5,
    'book5-golden-years.html': 3,
    'book6-rise-transform.html': 6
  };
  const bookId = bookFiles[filename] || null;

  if (bookId) {
    let hasAccess = false;
    const sessionUid = localStorage.getItem('mokshara_session');

    if (sessionUid) {
      if (bookId === 6) {
        // Free book is unlocked automatically for any logged-in user
        hasAccess = true;
      } else {
        // Paid book requires transaction check
        try {
          const purchasedStr = localStorage.getItem('mokshara_purchased_books');
          if (purchasedStr) {
            const purchasedIds = JSON.parse(purchasedStr);
            if (Array.isArray(purchasedIds) && purchasedIds.includes(bookId)) {
              hasAccess = true;
            }
          }
        } catch(e) {
          console.warn('LocalStorage not available for auth check');
        }
      }
    }

    if (!hasAccess) {
      // Access Denied! Render paywall screen
      const deniedOverlay = document.createElement("div");
      deniedOverlay.style.cssText = "position: fixed; inset: 0; background: #060a14; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 999999; color: #f0eae0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 20px;";
      
      let lockIcon = "🔒";
      let headingText = "Premium Content";
      let bodyText = "You must purchase this ebook to access the interactive reader. Please sign in and buy it from our store.";
      let buttonText = "Go to Store";
      let redirectUrl = "../index.html";

      if (bookId === 6) {
        lockIcon = "🔑";
        headingText = "Account Required";
        bodyText = "This ebook is free, but you must create a Mokshara account or sign in to read it.";
        buttonText = "Sign Up / Sign In";
        redirectUrl = "../index.html?trigger_auth=true";
      }

      deniedOverlay.innerHTML = `
        <div style="font-size: 4.5rem; margin-bottom: 24px; filter: drop-shadow(0 0 10px rgba(201, 168, 76, 0.2));">${lockIcon}</div>
        <h1 style="font-family: serif; color: #c9a84c; margin-bottom: 12px; font-size: 2rem;">${headingText}</h1>
        <p style="color: #a8a0b0; max-width: 420px; line-height: 1.6; margin-bottom: 32px; font-size: 1rem;">
          ${bodyText}
        </p>
        <a href="${redirectUrl}" style="display: inline-flex; align-items: center; justify-content: center; padding: 12px 32px; background: linear-gradient(135deg, #c9a84c, #dfc06a); color: #060a14; border-radius: 30px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 15px rgba(201, 168, 76, 0.3); transition: all 0.2s ease;">
          ${buttonText}
        </a>
      `;
      document.body.appendChild(deniedOverlay);
      // Clean up body scroll
      document.body.style.overflow = "hidden";
      return; // Stop reader execution
    }
  }

  const printVersion = document.getElementById("print-version");
  const screenVersion = document.getElementById("screen-version");
  if (!printVersion || !screenVersion) return;

  const pages = Array.from(printVersion.querySelectorAll(".page"));
  if (pages.length === 0) return;

  // Temporary container to measure heights accurately within realistic page hierarchy
  const tempContainer = document.createElement("div");
  tempContainer.className = "page content-page";
  tempContainer.style.position = "absolute";
  tempContainer.style.visibility = "hidden";
  tempContainer.style.top = "-9999px";
  tempContainer.style.left = "-9999px";
  tempContainer.style.width = "450px"; // Match page-width token
  tempContainer.style.height = "auto"; // Auto height prevents margin-top: auto from absorbing page height!
  
  const tempInner = document.createElement("div");
  tempInner.className = "page-inner";
  tempContainer.appendChild(tempInner);
  document.body.appendChild(tempContainer);

  // Process and split pages dynamically (Section pages are split chronologically when they overflow)
  const processedPages = [];
  pages.forEach(page => {
    if (page.classList.contains("content-page")) {
      const label = page.querySelector(".section-label");
      const heading = page.querySelector("h2");
      const labelClone = label ? label.cloneNode(true) : null;
      const headingClone = heading ? heading.cloneNode(true) : null;
      
      let headerHeight = 0;
      if (labelClone || headingClone) {
        const headerDiv = document.createElement("div");
        if (labelClone) headerDiv.appendChild(labelClone.cloneNode(true));
        if (headingClone) headerDiv.appendChild(headingClone.cloneNode(true));
        tempInner.appendChild(headerDiv);
        headerHeight = headerDiv.getBoundingClientRect().height;
        tempInner.removeChild(headerDiv);
      }

      const maxPageHeight = 550; // High-precision safe threshold for page-inner (leaves 58px safety margin out of 608px usable height)
      const children = Array.from(page.children).filter(child => 
        !child.classList.contains("section-label") && 
        child.tagName.toLowerCase() !== "h2" && 
        !child.classList.contains("page-num")
      );

      let currentPage = createPageShell(label, heading, false);
      let currentHeight = headerHeight;

      children.forEach(child => {
        const clone = child.cloneNode(true);
        mapCompactClasses(clone); // Map classes before measuring height!

        tempInner.appendChild(clone);
        const styles = window.getComputedStyle(clone);
        const margins = parseFloat(styles.marginTop || 0) + parseFloat(styles.marginBottom || 0);
        let elementHeight = clone.getBoundingClientRect().height + margins;
        tempInner.removeChild(clone);

        // Determine if this element is an image/illustration
        const isImage = clone.tagName.toLowerCase() === "img" || clone.classList.contains("illus") || clone.classList.contains("page-illustration");

        if (isImage) {
          const imgEl = clone.tagName.toLowerCase() === "img" ? clone : clone.querySelector("img");
          if (imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
            const usableWidth = 394; // 450 - 56 = 394px usable width
            const scaledHeight = (imgEl.naturalHeight / imgEl.naturalWidth) * usableWidth;
            elementHeight = Math.min(scaledHeight, 380) + margins;
          } else {
            elementHeight = 260 + margins; // Safe fallback
          }
        }
        if (elementHeight < 10) {
          elementHeight = 40; // Safe fallback for other elements
        }

        const expectedHeight = currentHeight + elementHeight; // Margins are already pre-calculated in elementHeight!
        if (expectedHeight > maxPageHeight && currentHeight > headerHeight) {
          // For images: always push to next page whole (never split)
          // For non-images: finalize current page, start new one, then add element
          processedPages.push(currentPage);
          // Continuation pages have no heading, so use reduced header height
          const contHeaderHeight = label ? (() => {
            const labelDiv = document.createElement("div");
            labelDiv.appendChild(label.cloneNode(true));
            tempInner.appendChild(labelDiv);
            const h = labelDiv.getBoundingClientRect().height;
            tempInner.removeChild(labelDiv);
            return h;
          })() : 0;
          currentPage = createPageShell(label, heading, true);
          currentHeight = contHeaderHeight;
        }

        currentPage.appendChild(clone);
        currentHeight += elementHeight;
      });

      processedPages.push(currentPage);
    } else {
      // Keep cover, title, copyright, toc, closing as is
      processedPages.push(page.cloneNode(true));
    }
  });

  // Clean up measurer
  document.body.removeChild(tempContainer);

  function createPageShell(label, heading, isContinuation) {
    const p = document.createElement("div");
    p.className = "page content-page";
    if (label) p.appendChild(label.cloneNode(true));
    if (heading && !isContinuation) {
      p.appendChild(heading.cloneNode(true));
    }
    return p;
  }

  // Always append a beautiful back cover page to ensure book completeness
  const initialPagesCount = processedPages.length;
  const backCover = document.createElement("div");
  backCover.className = "page back-cover-page";
  backCover.innerHTML = `
    <div class="closing-content">
      <img src="images/logo.png" alt="Mokshara Logo" class="logo">
      <h2>Mókshara</h2>
      <p style="font-family: var(--font-ui); font-size: 0.6rem; letter-spacing: 3px; text-transform: uppercase; color: var(--teal); margin-bottom: 24px;">Healing Minds · Caring Hearts · Enriching Lives</p>
      <div class="divider"><span>✦</span></div>
      <p style="font-family: var(--font-body); font-style: italic; font-size: 0.85rem; color: var(--text-sec); max-width: 260px; margin: 16px auto; line-height: 1.5;">
        "Thank you for walking this path of awareness with us. May peace, healing, and transformation follow you always."
      </p>
      <div class="divider"><span>✦</span></div>
      <p style="color: var(--gold); font-family: var(--font-ui); font-size: 0.7rem; letter-spacing: 1px; margin-top: 20px;">mokshara.in</p>
    </div>
  `;

  if (initialPagesCount % 2 !== 0) {
    // Odd page count: appending back cover makes it even (cover sits on the back of last leaf)
    processedPages.push(backCover);
  } else {
    // Even page count: we insert a clean inside-back cover, then the back cover to keep it aligned
    const insideBackCover = document.createElement("div");
    insideBackCover.className = "page inside-back-cover-page";
    insideBackCover.innerHTML = `
      <div class="closing-content" style="justify-content: center; height: 100%; padding: 40px; background: var(--navy);">
        <img src="images/logo.png" alt="Mokshara Logo" class="logo" style="width: 50px; height: 50px; opacity: 0.15; filter: grayscale(1); border-radius: 50%; margin-bottom: 16px;">
        <div class="divider" style="max-width: 150px; margin: 12px auto; opacity: 0.15;"><span>✦</span></div>
        <p style="font-family: var(--font-body); font-style: italic; font-size: 0.8rem; color: var(--text-muted); max-width: 220px; line-height: 1.5; margin: 8px auto;">
          Mokshara Wellness Series
        </p>
      </div>
    `;
    processedPages.push(insideBackCover);
    processedPages.push(backCover);
  }

  const totalPages = processedPages.length;

  // Clean title for header (remove branding suffix if present)
  let docTitle = document.title || "Mokshara Wellness Guide";
  docTitle = docTitle.replace(/\s*[—–-]\s*Mokshara$/i, "");

  // Create UI Structure
  // 1. Ambient Background
  const bg = document.createElement("div");
  bg.className = "reader-bg";
  bg.innerHTML = `
    <div class="orb"></div>
    <div class="orb"></div>
    <div class="orb"></div>
  `;
  screenVersion.appendChild(bg);

  // Unique localStorage key based on book path filename
  const bookFileKey = window.location.pathname.split("/").pop() || "mokshara_book";

  // 2. Header
  const header = document.createElement("header");
  header.className = "reader-header";
  header.innerHTML = `
    <a href="../index.html" class="reader-logo">
      <img src="images/logo.png" alt="Mokshara Logo">
      Mókshara
    </a>
    <div class="reader-title">${docTitle.toUpperCase()}</div>
    <div class="header-actions">
      <div class="theme-switcher">
        <button class="theme-opt" id="theme-dark" title="Dark Theme">DARK</button>
        <button class="theme-opt" id="theme-light" title="Light Theme">LIGHT</button>
      </div>
      <button class="pin-btn" id="pin-page-btn" title="Pin this page spread">
        <svg class="pin-svg" viewBox="0 0 24 24" width="12" height="12">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8 1 .8-1v-6H18v-2l-2-2z" fill="currentColor"/>
        </svg>
        <span class="pin-label">PIN PAGE</span>
      </button>
      <button class="pin-btn jump-btn" id="jump-pin-btn" title="Go to pinned page spread" style="display: none;">
        <svg class="jump-svg" viewBox="0 0 24 24" width="12" height="12">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
        </svg>
        <span>GO TO PIN</span>
      </button>
      <div class="reader-page-info">PAGE <span id="current-page-num">1</span> OF ${totalPages}</div>
    </div>
  `;
  screenVersion.appendChild(header);

  // Apply visual theme to reader (Dark, Light, or Paint Theme)
  function applyTheme(themeName, customColor = null) {
    const root = document.documentElement;
    
    if (themeName === "dark") {
      root.style.setProperty("--bg-ambient", "#04060f");
      root.style.setProperty("--navy", "#0c1020"); /* Rich slate-navy page background */
      root.style.setProperty("--navy-light", "#141a30");
      root.style.setProperty("--text", "#f5ebd6"); /* Warm ivory/cream for heading reading text */
      root.style.setProperty("--text-sec", "#dcd5e4"); /* Soft comfortable lavender-cream text */
      root.style.setProperty("--text-muted", "#88829a");
      root.style.setProperty("--gold", "#c9a84c");
      root.style.setProperty("--gold-light", "#dfc06a");
      root.style.setProperty("--gold-pale", "#f5e6b8");
      root.style.setProperty("--teal", "#3ab5b0");
      root.style.setProperty("--teal-light", "#5cd4cf");
      root.style.setProperty("--gradient-gold", "linear-gradient(135deg, #dfc06a, #c9a84c)");
      root.style.setProperty("--gradient-teal", "linear-gradient(135deg, #5cd4cf, #3ab5b0)");
      root.style.setProperty("--navy-trans", "rgba(12, 16, 32, 0.85)");
      root.style.setProperty("--border-color", "rgba(201, 168, 76, 0.15)");
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      localStorage.setItem("mokshara_theme", "dark");
    } else if (themeName === "light") {
      root.style.setProperty("--bg-ambient", "#e2dacd"); /* Elegant warm desk color */
      root.style.setProperty("--navy", "#fbfaf5"); /* Premium warm ivory paper color */
      root.style.setProperty("--navy-light", "#f3ecd8");
      root.style.setProperty("--text", "#101626"); /* Dark slate-navy for extremely crisp text */
      root.style.setProperty("--text-sec", "#222d42"); /* Increased contrast for standard paragraph text */
      root.style.setProperty("--text-muted", "#5d6b82"); /* Legible gray-blue for subtext / page numbers */
      root.style.setProperty("--gold", "#8a6d2b"); /* Darker gold for h2 / headings to pass contrast check */
      root.style.setProperty("--gold-light", "#785c21"); /* Darker gold for h3 */
      root.style.setProperty("--gold-pale", "#5c471a"); /* High contrast bronze for quote text / cooling thoughts */
      root.style.setProperty("--teal", "#135d5a"); /* High contrast teal for section labels / science h4 */
      root.style.setProperty("--teal-light", "#186f6c");
      root.style.setProperty("--gradient-gold", "linear-gradient(135deg, #a8853b, #8a6d2b)");
      root.style.setProperty("--gradient-teal", "linear-gradient(135deg, #1c7c79, #135d5a)");
      root.style.setProperty("--navy-trans", "rgba(251, 250, 245, 0.85)");
      root.style.setProperty("--border-color", "rgba(138, 109, 43, 0.2)");
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      localStorage.setItem("mokshara_theme", "light");
    } else if (themeName === "paint" && customColor) {
      const r = parseInt(customColor.substring(1, 3), 16);
      const g = parseInt(customColor.substring(3, 5), 16);
      const b = parseInt(customColor.substring(5, 7), 16);
      
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const bgAmbientCol = adjustColorBrightness(customColor, -25); /* Darker ambient background */
      
      const textCol = luminance > 0.5 ? "#101626" : "#ffffff";
      const textSecCol = luminance > 0.5 ? "#222d42" : "#c5becf";
      const textMutedCol = luminance > 0.5 ? "#5d6b82" : "#88829a";
      const goldCol = luminance > 0.5 ? "#8a6d2b" : "#c9a84c";
      const goldLightCol = luminance > 0.5 ? "#785c21" : "#dfc06a";
      const goldPaleCol = luminance > 0.5 ? "#5c471a" : "#f5e6b8";
      const tealCol = luminance > 0.5 ? "#135d5a" : "#3ab5b0";
      const tealLightCol = luminance > 0.5 ? "#186f6c" : "#5cd4cf";
      const navyLightCol = luminance > 0.5 ? adjustColorBrightness(customColor, -10) : adjustColorBrightness(customColor, 10);
      const navyTransCol = `rgba(${r}, ${g}, ${b}, 0.85)`;
      const borderCol = luminance > 0.5 ? "rgba(138, 109, 43, 0.2)" : "rgba(201, 168, 76, 0.15)";
      const gradientGoldCol = luminance > 0.5 ? "linear-gradient(135deg, #a8853b, #8a6d2b)" : "linear-gradient(135deg, #dfc06a, #c9a84c)";
      const gradientTealCol = luminance > 0.5 ? "linear-gradient(135deg, #1c7c79, #135d5a)" : "linear-gradient(135deg, #5cd4cf, #3ab5b0)";
      
      root.style.setProperty("--bg-ambient", bgAmbientCol);
      root.style.setProperty("--navy", customColor);
      root.style.setProperty("--navy-light", navyLightCol);
      root.style.setProperty("--text", textCol);
      root.style.setProperty("--text-sec", textSecCol);
      root.style.setProperty("--text-muted", textMutedCol);
      root.style.setProperty("--gold", goldCol);
      root.style.setProperty("--gold-light", goldLightCol);
      root.style.setProperty("--gold-pale", goldPaleCol);
      root.style.setProperty("--teal", tealCol);
      root.style.setProperty("--teal-light", tealLightCol);
      root.style.setProperty("--navy-trans", navyTransCol);
      root.style.setProperty("--border-color", borderCol);
      root.style.setProperty("--gradient-gold", gradientGoldCol);
      root.style.setProperty("--gradient-teal", gradientTealCol);
      
      if (luminance > 0.5) {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
      } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
      }
      
      localStorage.setItem("mokshara_theme", "paint");
      localStorage.setItem("mokshara_theme_color", customColor);
      
      // Removed paintInput updates since color palette is disabled
    }

    document.querySelectorAll(".theme-opt").forEach(btn => btn.classList.remove("active"));
    if (themeName === "dark") {
      const btn = document.getElementById("theme-dark");
      if (btn) btn.classList.add("active");
    } else if (themeName === "light") {
      const btn = document.getElementById("theme-light");
      if (btn) btn.classList.add("active");
    }
  }

  function adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = (R > 0) ? R : 0;
    G = (G > 0) ? G : 0;
    B = (B > 0) ? B : 0;

    const rHex = R.toString(16).padStart(2, "0");
    const gHex = G.toString(16).padStart(2, "0");
    const bHex = B.toString(16).padStart(2, "0");

    return `#${rHex}${gHex}${bHex}`;
  }

  // Bind theme switcher event listeners
  const themeDarkBtn = document.getElementById("theme-dark");
  const themeLightBtn = document.getElementById("theme-light");
  if (themeDarkBtn) themeDarkBtn.addEventListener("click", () => applyTheme("dark"));
  if (themeLightBtn) themeLightBtn.addEventListener("click", () => applyTheme("light"));

  // Load and apply saved theme startup settings
  const savedTheme = localStorage.getItem("mokshara_theme") || "dark";
  const savedColor = localStorage.getItem("mokshara_theme_color");
  applyTheme(savedTheme, savedColor);

  // 3. Navigation Arrows
  const prevBtn = document.createElement("button");
  prevBtn.className = "nav-arrow nav-prev disabled";
  prevBtn.id = "prev-btn";
  prevBtn.setAttribute("aria-label", "Previous Page");
  prevBtn.innerHTML = "&#10094;";
  
  const nextBtn = document.createElement("button");
  nextBtn.className = "nav-arrow nav-next";
  nextBtn.id = "next-btn";
  nextBtn.setAttribute("aria-label", "Next Page");
  nextBtn.innerHTML = "&#10095;";

  screenVersion.appendChild(prevBtn);
  screenVersion.appendChild(nextBtn);

  // Create Floating Edge Triggers (hotspots) for Kindle/Apple Books-style page turns
  const triggerLeft = document.createElement("div");
  triggerLeft.className = "edge-trigger trigger-left";
  triggerLeft.innerHTML = `
    <div class="trigger-line"></div>
    <div class="trigger-arrow">&#10094;</div>
  `;
  triggerLeft.addEventListener("click", () => {
    goToState(currentState - 1);
  });

  const triggerRight = document.createElement("div");
  triggerRight.className = "edge-trigger trigger-right";
  triggerRight.innerHTML = `
    <div class="trigger-line"></div>
    <div class="trigger-arrow">&#10095;</div>
  `;
  triggerRight.addEventListener("click", () => {
    goToState(currentState + 1);
  });

  screenVersion.appendChild(triggerLeft);
  screenVersion.appendChild(triggerRight);

  // 4. Book Scene, Wrapper & Book Container
  const scene = document.createElement("div");
  scene.className = "book-scene";
  
  const wrapper = document.createElement("div");
  wrapper.className = "book-wrapper";
  wrapper.id = "book-wrapper";
  wrapper.style.transformOrigin = "center center";

  const book = document.createElement("div");
  book.className = "book state-start";
  book.id = "book";

  // Create Left & Right Book Stack Thickness layers
  const leftStack = document.createElement("div");
  leftStack.className = "book-stack left-stack";
  leftStack.innerHTML = `<div class="stack-paper-edge"></div>`;
  book.appendChild(leftStack);

  const rightStack = document.createElement("div");
  rightStack.className = "book-stack right-stack";
  rightStack.innerHTML = `<div class="stack-paper-edge"></div>`;
  book.appendChild(rightStack);

  const spine = document.createElement("div");
  spine.className = "book-spine";
  book.appendChild(spine);

  const coverBacking = document.createElement("div");
  coverBacking.className = "book-cover-backing";
  book.appendChild(coverBacking);
  
  wrapper.appendChild(book);
  scene.appendChild(wrapper);
  screenVersion.appendChild(scene);

  // 5. Progress Bar
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  progressBar.innerHTML = `<div class="progress-fill" id="progress-fill" style="width: 0%;"></div>`;
  screenVersion.appendChild(progressBar);

  // 6. Keyboard Hints
  const keyboardHint = document.createElement("div");
  keyboardHint.className = "keyboard-hint";
  keyboardHint.innerHTML = `
    <span>NAVIGATE:</span>
    <kbd>&larr;</kbd>
    <kbd>&rarr;</kbd>
    <span>OR CLICK PAGE CORNERS</span>
  `;
  screenVersion.appendChild(keyboardHint);

  // 7. Zoom Controls Widget
  const zoomControls = document.createElement("div");
  zoomControls.className = "zoom-controls";
  zoomControls.innerHTML = `
    <button class="zoom-btn" id="zoom-out" aria-label="Zoom Out" title="Zoom Out">−</button>
    <span class="zoom-level" id="zoom-level">100%</span>
    <button class="zoom-btn" id="zoom-in" aria-label="Zoom In" title="Zoom In">+</button>
    <button class="zoom-btn" id="zoom-reset" aria-label="Reset Zoom" title="Reset Zoom">↺</button>
  `;
  screenVersion.appendChild(zoomControls);

  // Build the Leaves
  const leaves = [];
  const leavesData = [];
  for (let i = 0; i < totalPages; i += 2) {
    leavesData.push({
      front: processedPages[i],
      back: processedPages[i + 1] || null
    });
  }

  const totalLeaves = leavesData.length;
  let currentState = 0;

  // Load saved pin state on page startup
  const savedPin = localStorage.getItem(`mokshara_pin_${bookFileKey}`);
  if (savedPin !== null) {
    const pinnedState = parseInt(savedPin, 10);
    if (!isNaN(pinnedState) && pinnedState >= 0 && pinnedState <= totalLeaves) {
      currentState = pinnedState;
    }
  }

  // Clear and migrate old zoom values to set default to 1.5 (150%)
  if (localStorage.getItem("mokshara_reader_zoom_v4") !== "true") {
    localStorage.setItem("mokshara_reader_zoom", "1.5");
    localStorage.setItem("mokshara_reader_zoom_v4", "true");
  }

  let activeTimers = [];
  let userZoom = parseFloat(localStorage.getItem("mokshara_reader_zoom") || "1.5");

  function clearActiveTimers() {
    activeTimers.forEach(t => clearTimeout(t));
    activeTimers = [];
  }

  // Helper to map spacious print classes to compact screen/reader classes
  function mapCompactClasses(element) {
    const mappings = {
      "science-box": "sci",
      "practice-box": "prac",
      "key-points": "kp",
      "pull-quote": "pq",
      "cooling-thought": "ct",
      "divider": "dv",
      "page-illustration": "illus"
    };
    for (const [origClass, newClass] of Object.entries(mappings)) {
      element.querySelectorAll("." + origClass).forEach(el => {
        el.classList.remove(origClass);
        el.classList.add(newClass);
      });
      if (element.classList.contains(origClass)) {
        element.classList.remove(origClass);
        element.classList.add(newClass);
      }
    }
  }

  function shouldShowPageNumber(pageEl) {
    if (!pageEl) return false;
    const classes = pageEl.classList;
    return !classes.contains("cover-page") &&
           !classes.contains("title-page") &&
           !classes.contains("copyright-page") &&
           !classes.contains("toc-page") &&
           !classes.contains("inside-back-cover-page") &&
           !classes.contains("back-cover-page");
  }

  leavesData.forEach((data, index) => {
    const leafIndex = index + 1; // 1-based index
    const leaf = document.createElement("div");
    leaf.className = "leaf";
    leaf.id = `leaf${leafIndex}`;

    // Front Face
    const frontFace = document.createElement("div");
    frontFace.className = "face front";
    if (data.front) {
      const clone = data.front.cloneNode(true);
      mapCompactClasses(clone);
      if (clone.classList.contains("cover-page") || clone.classList.contains("back-cover-page")) {
        frontFace.classList.add("cover-content");
        while (clone.firstChild) {
          frontFace.appendChild(clone.firstChild);
        }
      } else if (clone.classList.contains("title-page")) {
        frontFace.classList.add("title-content");
        while (clone.firstChild) {
          frontFace.appendChild(clone.firstChild);
        }
      } else {
        const pageInner = document.createElement("div");
        pageInner.className = "page-inner";
        if (clone.classList.contains("copyright-page")) pageInner.classList.add("copy-content");
        if (clone.classList.contains("toc-page")) pageInner.classList.add("toc-content");
        if (clone.classList.contains("closing-page")) pageInner.classList.add("closing-content");
        while (clone.firstChild) {
          pageInner.appendChild(clone.firstChild);
        }
        frontFace.appendChild(pageInner);
      }

      // Add page number to front face (right page)
      const pageNum = index * 2 + 1;
      if (shouldShowPageNumber(data.front)) {
        const pageNumSpan = document.createElement("span");
        pageNumSpan.className = "page-num";
        pageNumSpan.textContent = pageNum;
        frontFace.appendChild(pageNumSpan);
      }

      // 3D Dog-ear page corner fold wrapper
      const foldWrapper = document.createElement("div");
      foldWrapper.className = "page-fold-wrapper front-fold";
      const tooltipText = (leafIndex === 1) ? "OPEN BOOK ➔" : "CLICK TO TURN ➔";
      foldWrapper.innerHTML = `
        <div class="page-fold-flap"></div>
        <div class="page-fold-tooltip">${tooltipText}</div>
      `;
      frontFace.appendChild(foldWrapper);
    }

    // Back Face
    const backFace = document.createElement("div");
    backFace.className = "face back";
    if (data.back) {
      const clone = data.back.cloneNode(true);
      mapCompactClasses(clone);
      if (clone.classList.contains("cover-page") || clone.classList.contains("back-cover-page")) {
        backFace.classList.add("cover-content");
        while (clone.firstChild) {
          backFace.appendChild(clone.firstChild);
        }
      } else if (clone.classList.contains("title-page")) {
        backFace.classList.add("title-content");
        while (clone.firstChild) {
          backFace.appendChild(clone.firstChild);
        }
      } else {
        const pageInner = document.createElement("div");
        pageInner.className = "page-inner";
        if (clone.classList.contains("copyright-page")) pageInner.classList.add("copy-content");
        if (clone.classList.contains("toc-page")) pageInner.classList.add("toc-content");
        if (clone.classList.contains("closing-page")) pageInner.classList.add("closing-content");
        while (clone.firstChild) {
          pageInner.appendChild(clone.firstChild);
        }
        backFace.appendChild(pageInner);
      }

      // Add page number to back face (left page)
      const pageNum = index * 2 + 2;
      if (shouldShowPageNumber(data.back)) {
        const pageNumSpan = document.createElement("span");
        pageNumSpan.className = "page-num";
        pageNumSpan.textContent = pageNum;
        backFace.appendChild(pageNumSpan);
      }

      // 3D Dog-ear page corner fold wrapper
      const foldWrapper = document.createElement("div");
      foldWrapper.className = "page-fold-wrapper back-fold";
      const tooltipText = (leafIndex === totalLeaves) ? "🠘 CLOSE BOOK" : "🠘 GO BACK";
      foldWrapper.innerHTML = `
        <div class="page-fold-flap"></div>
        <div class="page-fold-tooltip">${tooltipText}</div>
      `;
      backFace.appendChild(foldWrapper);
    } else {
      // Empty back face page
      const pageInner = document.createElement("div");
      pageInner.className = "page-inner";
      backFace.appendChild(pageInner);
    }

    leaf.appendChild(frontFace);
    leaf.appendChild(backFace);
    book.appendChild(leaf);
    leaves.push(leaf);

    // Initial z-indexing (Cover on top, rest stacked under)
    leaf.style.zIndex = totalLeaves - leafIndex + 1;

    // Click handler directly on leaf to turn it (Resilient to overlaps & always goes in correct direction)
    leaf.addEventListener("click", (e) => {
      if (isPinPlacementMode) {
        e.preventDefault();
        e.stopPropagation();
        
        const faceEl = e.target.closest(".face");
        if (!faceEl) return;
        
        const isBack = faceEl.classList.contains("back");
        const rect = faceEl.getBoundingClientRect();
        
        let leftPct = ((e.clientX - rect.left) / rect.width) * 100;
        let topPct = ((e.clientY - rect.top) / rect.height) * 100;
        
        if (leftPct < 2) leftPct = 2;
        if (leftPct > 90) leftPct = 90;
        if (topPct < 2) topPct = 2;
        if (topPct > 95) topPct = 95;
        
        const pinData = {
          leafIndex: leafIndex,
          isBack: isBack,
          leftPct: parseFloat(leftPct.toFixed(2)),
          topPct: parseFloat(topPct.toFixed(2))
        };
        
        localStorage.setItem(`mokshara_pin_coord_${bookFileKey}`, JSON.stringify(pinData));
        
        const targetState = isBack ? leafIndex : leafIndex - 1;
        localStorage.setItem(`mokshara_pin_${bookFileKey}`, targetState.toString());
        
        exitPinPlacementMode();
        updatePinUI();
        return;
      }

      // Avoid action when clicking links, scrollbars or other interactive parts
      if (e.target.closest("a, button, select, input, textarea, .draggable-pin")) return;
      const selectedText = window.getSelection().toString();
      if (selectedText) return;

      if (leaf.classList.contains("flipped")) {
        goToState(currentState - 1);
      } else {
        goToState(currentState + 1);
      }
    });

    // Right-click anywhere on the left page to turn it back
    leaf.addEventListener("contextmenu", (e) => {
      if (isPinPlacementMode) {
        e.preventDefault();
        return;
      }
      // Avoid action when right-clicking links or inputs
      if (e.target.closest("a, button, select, input, textarea, .draggable-pin")) return;
      if (leaf.classList.contains("flipped")) {
        e.preventDefault(); // Prevent standard browser context menu
        goToState(currentState - 1); // Turn back
      }
    });
  });

  // State Navigation Logic
  let isFlipping = false; // Debounce guard for rapid page turns

  function goToState(newState) {
    if (newState < 0 || newState > totalLeaves) return;
    if (isFlipping) return; // Prevent rapid-fire flips from touchpad/scroll
    if (isPinPlacementMode) return; // Block page turning while placing a pin

    isFlipping = true;
    setTimeout(() => { isFlipping = false; }, 700); // Debounce matches the smooth flip animation duration

    currentState = newState;

    // Toggle central spine crease visibility (only visible when book is open)
    const spineEl = document.querySelector(".book-spine");
    if (spineEl) {
      if (currentState > 0 && currentState < totalLeaves) {
        spineEl.style.display = "block";
      } else {
        spineEl.style.display = "none";
      }
    }

    // Dynamic morphing cover backing board
    const backingEl = document.querySelector(".book-cover-backing");
    if (backingEl) {
      if (currentState === 0) {
        backingEl.style.left = "-4px";
        backingEl.style.width = "calc(var(--page-width) + 8px)";
        backingEl.style.borderRadius = "0 8px 8px 0";
      } else if (currentState === totalLeaves) {
        backingEl.style.left = "calc(-1 * var(--page-width) - 4px)";
        backingEl.style.width = "calc(var(--page-width) + 8px)";
        backingEl.style.borderRadius = "8px 0 0 8px";
      } else {
        backingEl.style.left = "calc(-1 * var(--page-width) - 8px)";
        backingEl.style.width = "calc(2 * var(--page-width) + 16px)";
        backingEl.style.borderRadius = "8px";
      }
    }

    // Calculate stack thickness (1.5px per leaf sheet)
    const leftStackWidth = currentState * 1.5;
    const rightStackWidth = (totalLeaves - currentState) * 1.5;
    const bookEl = document.getElementById("book");
    if (bookEl) {
      bookEl.style.setProperty("--left-stack-width", `${leftStackWidth}px`);
      bookEl.style.setProperty("--right-stack-width", `${rightStackWidth}px`);
    }

    // Hide stacks when book is closed on their respective sides
    const lStackEl = document.querySelector(".left-stack");
    const rStackEl = document.querySelector(".right-stack");
    if (lStackEl) lStackEl.style.opacity = currentState === 0 ? "0" : "1";
    if (rStackEl) rStackEl.style.opacity = currentState === totalLeaves ? "0" : "1";

    // Toggle visibility of the Kindle/Apple Books-style side margin triggers
    const tLeft = document.querySelector(".trigger-left");
    const tRight = document.querySelector(".trigger-right");
    if (tLeft) tLeft.style.display = currentState === 0 ? "none" : "flex";
    if (tRight) tRight.style.display = currentState === totalLeaves ? "none" : "flex";

    // Clear previous transitions immediately to prevent stuck states on fast double clicks
    clearActiveTimers();
    leaves.forEach(leaf => leaf.classList.remove("flipping"));

    // 1. Update book shift/skew class
    book.className = "book";
    if (currentState === 0) {
      book.classList.add("state-start");
    } else if (currentState === totalLeaves) {
      book.classList.add("state-end");
    } else {
      book.classList.add("state-open");
    }

    // 2. Flip Leaves & Manage Classes
    leaves.forEach((leaf, index) => {
      const leafIndex = index + 1;

      if (leafIndex <= currentState) {
        // Leaf is on the left
        if (!leaf.classList.contains("flipped")) {
          leaf.classList.add("flipped");
          leaf.classList.add("flipping");
          const t1 = setTimeout(() => leaf.classList.remove("flipping"), 700);
          activeTimers.push(t1);
        }
      } else {
        // Leaf is on the right
        if (leaf.classList.contains("flipped")) {
          leaf.classList.remove("flipped");
          leaf.classList.add("flipping");
          const t2 = setTimeout(() => leaf.classList.remove("flipping"), 700);
          activeTimers.push(t2);
        }
      }

      updateZIndex(leaf, leafIndex);
    });

    // 3. Dynamic Stacking Update (Clean stack layout)
    const t3 = setTimeout(() => {
      leaves.forEach((leaf, index) => {
        updateZIndex(leaf, index + 1);
      });
    }, 700);
    activeTimers.push(t3);

    // Helper to calculate correct overlapping z-index
    function updateZIndex(leaf, leafIndex) {
      if (leaf.classList.contains("flipping")) {
        leaf.style.zIndex = "10";
      } else {
        if (leafIndex <= currentState) {
          // Left stack: leaf 1 is bottom, leaf currentState is top
          leaf.style.zIndex = leafIndex;
        } else {
          // Right stack: leaf currentState+1 is top, leaf totalLeaves is bottom
          leaf.style.zIndex = totalLeaves - leafIndex + 1;
        }
      }
    }

    // 4. Update Navigation Controls
    if (currentState === 0) {
      prevBtn.classList.add("disabled");
    } else {
      prevBtn.classList.remove("disabled");
    }

    if (currentState === totalLeaves) {
      nextBtn.classList.add("disabled");
    } else {
      nextBtn.classList.remove("disabled");
    }

    // 5. Update Progress Bar
    const progressFill = document.getElementById("progress-fill");
    const percent = Math.min(100, Math.round(((currentState * 2) / totalPages) * 100));
    progressFill.style.width = (percent || 5) + "%";

    // 6. Update Header Counter
    const pageNumLabel = document.getElementById("current-page-num");
    if (currentState === 0) {
      pageNumLabel.textContent = "1";
    } else if (currentState === totalLeaves) {
      pageNumLabel.textContent = totalPages.toString();
    } else {
      pageNumLabel.textContent = `${currentState * 2}-${currentState * 2 + 1}`;
    }

    // 7. Update visual page pinning bookmark & buttons
    updatePinUI();
  }

  // Draggable pin helper to bind drag listeners with scale zoom corrections
  function makeElementDraggable(pinEl, pageInnerEl, leafIndex, isBackFace) {
    let isDragging = false;
    let startY = 0;
    let startX = 0;
    let startTop = 0;
    let startLeft = 0;

    function onStart(e) {
      e.preventDefault();
      e.stopPropagation(); // Avoid triggering parent page click turns
      
      isDragging = true;
      pinEl.style.cursor = "grabbing";
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      startTop = parseFloat(pinEl.style.top || 0);
      startLeft = parseFloat(pinEl.style.left || 0);
      
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    }

    function onMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      // Get zoom factor to adjust drag sensitivity
      const wrapperEl = document.getElementById("book-wrapper");
      let scale = 1.0;
      if (wrapperEl && wrapperEl.style.transform) {
        const match = wrapperEl.style.transform.match(/scale\(([^)]+)\)/);
        if (match) scale = parseFloat(match[1]);
      }
      if (scale <= 0) scale = 1.0;

      const rect = pageInnerEl.getBoundingClientRect();
      const newLeftPx = (startLeft / 100) * rect.width + deltaX;
      const newTopPx = (startTop / 100) * rect.height + deltaY;

      let newLeftPct = (newLeftPx / rect.width) * 100;
      let newTopPct = (newTopPx / rect.height) * 100;

      if (newLeftPct < 2) newLeftPct = 2;
      if (newLeftPct > 90) newLeftPct = 90;
      if (newTopPct < 2) newTopPct = 2;
      if (newTopPct > 95) newTopPct = 95;

      pinEl.style.left = `${newLeftPct}%`;
      pinEl.style.top = `${newTopPct}%`;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      pinEl.style.cursor = "grab";
      
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);

      const pinData = {
        leafIndex: leafIndex,
        isBack: isBackFace,
        leftPct: parseFloat(pinEl.style.left),
        topPct: parseFloat(pinEl.style.top)
      };
      localStorage.setItem(`mokshara_pin_coord_${bookFileKey}`, JSON.stringify(pinData));
      
      const targetState = isBackFace ? leafIndex : leafIndex - 1;
      localStorage.setItem(`mokshara_pin_${bookFileKey}`, targetState.toString());
      
      updatePinButtonsOnly(targetState);
    }

    pinEl.addEventListener("mousedown", onStart);
    pinEl.addEventListener("touchstart", onStart, { passive: false });
  }

  function updatePinButtonsOnly(targetState) {
    const pinnedStateStr = localStorage.getItem(`mokshara_pin_${bookFileKey}`);
    const pinnedState = pinnedStateStr !== null ? parseInt(pinnedStateStr, 10) : null;

    const pinBtn = document.getElementById("pin-page-btn");
    if (pinBtn) {
      if (currentState === pinnedState) {
        pinBtn.classList.add("is-pinned");
        pinBtn.querySelector(".pin-label").textContent = "PINNED";
      } else {
        pinBtn.classList.remove("is-pinned");
        pinBtn.querySelector(".pin-label").textContent = "PIN PAGE";
      }
    }

    const jumpBtn = document.getElementById("jump-pin-btn");
    if (jumpBtn) {
      if (pinnedState !== null && currentState !== pinnedState) {
        jumpBtn.style.display = "flex";
      } else {
        jumpBtn.style.display = "none";
      }
    }
  }

  // Interactive Pin/Bookmark Placement Mode state and helper functions
  let isPinPlacementMode = false;

  function enterPinPlacementMode() {
    isPinPlacementMode = true;
    document.body.classList.add("place-pin-active");
    
    // Update PIN PAGE button text and style
    const pinBtn = document.getElementById("pin-page-btn");
    if (pinBtn) {
      pinBtn.classList.add("placement-pending");
      pinBtn.querySelector(".pin-label").textContent = "CANCEL PIN";
    }
    
    // Show toast instructions
    let toast = document.getElementById("pin-placement-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pin-placement-toast";
      toast.className = "pin-toast";
      toast.innerHTML = "<span>📍</span> Click anywhere on either page to place the pin.";
      document.body.appendChild(toast);
    }
    // Force a reflow
    toast.offsetHeight;
    toast.classList.add("show");
  }

  function exitPinPlacementMode() {
    isPinPlacementMode = false;
    document.body.classList.remove("place-pin-active");
    
    const pinBtn = document.getElementById("pin-page-btn");
    if (pinBtn) {
      pinBtn.classList.remove("placement-pending");
    }
    
    const toast = document.getElementById("pin-placement-toast");
    if (toast) {
      toast.classList.remove("show");
    }
  }

  // Interactive Book Bookmark / Pin System Visual UI Updater
  function updatePinUI() {
    // Remove any existing pinned indicator elements
    document.querySelectorAll(".draggable-pin").forEach(el => el.remove());

    const pinnedStateStr = localStorage.getItem(`mokshara_pin_${bookFileKey}`);
    if (pinnedStateStr === null) {
      const pinBtn = document.getElementById("pin-page-btn");
      if (pinBtn) {
        pinBtn.classList.remove("is-pinned");
        pinBtn.querySelector(".pin-label").textContent = "PIN PAGE";
      }
      const jumpBtn = document.getElementById("jump-pin-btn");
      if (jumpBtn) jumpBtn.style.display = "none";
      return;
    }

    const pinnedState = parseInt(pinnedStateStr, 10);

    // Load or generate coordinates
    let coord = null;
    const savedCoordStr = localStorage.getItem(`mokshara_pin_coord_${bookFileKey}`);
    if (savedCoordStr) {
      try {
        coord = JSON.parse(savedCoordStr);
      } catch(e) {
        coord = null;
      }
    }
    if (!coord) {
      coord = {
        leafIndex: pinnedState === totalLeaves ? totalLeaves : pinnedState + 1,
        isBack: pinnedState === totalLeaves,
        leftPct: 15,
        topPct: 25
      };
      localStorage.setItem(`mokshara_pin_coord_${bookFileKey}`, JSON.stringify(coord));
    }

    // Render the physical draggable pin on the correct face
    const leafObj = leaves[coord.leafIndex - 1];
    if (leafObj) {
      const faceSelector = coord.isBack ? ".back" : ".front";
      const targetFace = leafObj.querySelector(faceSelector);
      if (targetFace) {
        const pinEl = document.createElement("div");
        pinEl.className = "draggable-pin";
        pinEl.textContent = "📍";
        pinEl.style.left = `${coord.leftPct}%`;
        pinEl.style.top = `${coord.topPct}%`;
        pinEl.title = "Drag me to mark where you stopped reading";
        
        targetFace.appendChild(pinEl);
        
        const pageInner = targetFace.querySelector(".page-inner") || targetFace;
        makeElementDraggable(pinEl, pageInner, coord.leafIndex, coord.isBack);
      }
    }

    // Update PIN PAGE button active state
    const pinBtn = document.getElementById("pin-page-btn");
    if (pinBtn) {
      if (currentState === pinnedState) {
        pinBtn.classList.add("is-pinned");
        pinBtn.querySelector(".pin-label").textContent = "PINNED";
      } else {
        pinBtn.classList.remove("is-pinned");
        pinBtn.querySelector(".pin-label").textContent = "PIN PAGE";
      }
    }

    // Toggle Jump to Pin button visibility
    const jumpBtn = document.getElementById("jump-pin-btn");
    if (jumpBtn) {
      if (currentState !== pinnedState) {
        jumpBtn.style.display = "flex";
      } else {
        jumpBtn.style.display = "none";
      }
    }
  }

  // Button Click Events
  prevBtn.addEventListener("click", () => goToState(currentState - 1));
  nextBtn.addEventListener("click", () => goToState(currentState + 1));

  // Pin Page Action Listener
  const pinPageBtn = document.getElementById("pin-page-btn");
  if (pinPageBtn) {
    pinPageBtn.addEventListener("click", () => {
      if (isPinPlacementMode) {
        exitPinPlacementMode();
        updatePinUI();
        return;
      }
      const pinnedStateStr = localStorage.getItem(`mokshara_pin_${bookFileKey}`);
      if (pinnedStateStr !== null && parseInt(pinnedStateStr, 10) === currentState) {
        localStorage.removeItem(`mokshara_pin_${bookFileKey}`);
        localStorage.removeItem(`mokshara_pin_coord_${bookFileKey}`);
        updatePinUI();
      } else {
        enterPinPlacementMode();
      }
    });
  }

  // Go to Pinned Page Action Listener
  const jumpPinBtn = document.getElementById("jump-pin-btn");
  if (jumpPinBtn) {
    jumpPinBtn.addEventListener("click", () => {
      const pinnedStateStr = localStorage.getItem(`mokshara_pin_${bookFileKey}`);
      if (pinnedStateStr !== null) {
        goToState(parseInt(pinnedStateStr, 10));
      }
    });
  }

  // Keyboard Navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      goToState(currentState - 1);
    } else if (e.key === "ArrowRight") {
      goToState(currentState + 1);
    }
  });

  // Touch Swipe Gesture Navigation
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const swipeDistance = touchEndX - touchStartX;
    const minDistance = 60; // minimum distance in px to detect swipe

    if (swipeDistance < -minDistance) {
      goToState(currentState + 1); // Swiped Left
    } else if (swipeDistance > minDistance) {
      goToState(currentState - 1); // Swiped Right
    }
  }, { passive: true });

  // 3D Scale Handler (Preserves layout on smaller screens)
  function scaleBook() {
    const wrapperEl = document.getElementById("book-wrapper");
    if (!wrapperEl) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Active design dimensions
    const bookWidth = 450 * 2; // 900px
    const bookHeight = 650; // 650px

    const widthScale = (screenWidth - 80) / bookWidth; // 40px left/right safety padding
    const heightScale = (screenHeight - 160) / bookHeight; // 80px top/bottom safety padding

    let scale = Math.min(widthScale, heightScale, 1) * userZoom;
    if (scale < 0.2) scale = 0.2; // minimum safety scale

    wrapperEl.style.transform = `scale(${scale})`;
  }

  // Zoom Control Button Listeners
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomResetBtn = document.getElementById("zoom-reset");
  const zoomLevelEl = document.getElementById("zoom-level");

  if (zoomInBtn && zoomOutBtn && zoomResetBtn && zoomLevelEl) {
    zoomLevelEl.textContent = `${Math.round(userZoom * 100)}%`;

    zoomInBtn.addEventListener("click", () => {
      if (userZoom < 1.8) {
        userZoom = parseFloat((userZoom + 0.1).toFixed(1));
        updateZoom();
      }
    });

    zoomOutBtn.addEventListener("click", () => {
      if (userZoom > 0.5) {
        userZoom = parseFloat((userZoom - 0.1).toFixed(1));
        updateZoom();
      }
    });

    zoomResetBtn.addEventListener("click", () => {
      userZoom = 1.5;
      updateZoom();
    });

    function updateZoom() {
      zoomLevelEl.textContent = `${Math.round(userZoom * 100)}%`;
      localStorage.setItem("mokshara_reader_zoom", userZoom.toString());
      scaleBook();
    }
  }

  scaleBook();
  window.addEventListener("resize", scaleBook);

  // Fade out keyboard hint after 5 seconds to clear reading view
  const kbHint = document.querySelector(".keyboard-hint");
  if (kbHint) {
    setTimeout(() => {
      kbHint.style.opacity = "0";
      kbHint.style.pointerEvents = "none";
    }, 5000);
  }

  // Initialize page spread state & bookmarks on startup
  goToState(currentState);
});
