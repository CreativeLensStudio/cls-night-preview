/* =====================================================================
   Creative Lens Studio — experimental behaviour
   Iris splash · film morph · edge parallax · horizontal services ·
   sticky stats · crew reveal · film lightbox.
   ===================================================================== */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const desktop = () => window.matchMedia("(min-width: 901px)").matches;

  /* ------------------------------------------------------------------
     Splash — blades draw, then iris opens onto the page
     ------------------------------------------------------------------ */
  const splash = $("#splash");
  const splashSkip = $("#splash-skip");
  const SPLASH_KEY = "cls-x-night-splash-seen";
  let splashTimers = [];
  let entered = false;

  function enterPage() {
    if (entered) return;
    entered = true;
    splashTimers.forEach(clearTimeout);

    body.classList.add("entering");
    requestAnimationFrame(() => {
      body.classList.remove("is-loading");
      body.classList.add("ready");
      splash.classList.add("swoop");
    });

    setTimeout(() => {
      splash.remove();
      body.classList.remove("entering");
    }, 1600);
  }

  function runSplash() {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_KEY) === "1";
    } catch (_) {
      /* ignore */
    }

    if (reduceMotion || seen) {
      splash.remove();
      body.classList.remove("is-loading");
      body.classList.add("ready");
      entered = true;
      return;
    }

    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch (_) {
      /* ignore */
    }

    splashTimers.push(setTimeout(() => splash.classList.add("draw"), 80));
    splashTimers.push(setTimeout(enterPage, 2500));
    splashSkip.addEventListener("click", enterPage);
    splash.addEventListener("click", (e) => {
      if (e.target === splash) enterPage();
    });
  }

  /* ------------------------------------------------------------------
     Header + menu
     ------------------------------------------------------------------ */
  const header = $("#header");
  const navToggle = $("#nav-toggle");
  const menu = $("#menu");

  function onHeaderScroll() {
    header.classList.toggle("scrolled", window.scrollY > 24);
  }

  function setMenu(open) {
    navToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("open"));
      body.classList.add("menu-open");
    } else {
      menu.classList.remove("open");
      body.classList.remove("menu-open");
      setTimeout(() => {
        if (!menu.classList.contains("open")) menu.hidden = true;
      }, 800);
    }
  }

  navToggle.addEventListener("click", () => {
    setMenu(navToggle.getAttribute("aria-expanded") !== "true");
  });

  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ------------------------------------------------------------------
     Reveal + manifesto word split
     ------------------------------------------------------------------ */
  $$("[data-words]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "w";
      span.style.setProperty("--d", `${i * 0.09}s`);
      span.textContent = word;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.setAttribute("data-reveal", "");
    el.style.setProperty("--d", "0s");
  });

  const revealTargets = $$("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-in"));
  }

  /* ------------------------------------------------------------------
     Edge environment — mouse parallax (translate only, 3 layers)
     ------------------------------------------------------------------ */
  const envLayers = $$(".env-layer[data-depth]")
    .filter((el, i) => i !== 2)
    .slice(0, 3)
    .map((el) => ({
      el,
      depth: parseFloat(el.dataset.depth || "1"),
    }));

  const env = { tx: 0, ty: 0, x: 0, y: 0 };
  const nightVeil = $("#night-veil");
  const nightZone = $("#night-zone");
  const servicesEl = $("#services");
  const root = document.documentElement;
  let nightVal = 0;
  let nightOn = false;

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function nightStep() {
    if (!nightZone || !nightVeil) return Math.abs(nightVal) > 0.001;
    const rect = nightZone.getBoundingClientRect();
    const cap = $(".film-caption")?.getBoundingClientRect();
    const vh = window.innerHeight;
    const capTop = cap ? cap.top : rect.top + rect.height * 0.55;

    let target = 0;
    if (reduceMotion) {
      const svc = servicesEl?.getBoundingClientRect();
      const svcP = svc ? clamp01(-svc.top / Math.max(1, svc.height - vh)) : 1;
      const inView = capTop < vh * 0.5 && rect.bottom > vh * 0.25;
      target = inView || svcP < 0.32 ? 1 : 0;
    } else {
      const enter = clamp01((vh * 0.7 - capTop) / (vh * 0.85));
      let leave = 1;
      if (servicesEl) {
        const svc = servicesEl.getBoundingClientRect();
        const svcP = clamp01(-svc.top / Math.max(1, svc.height - vh));
        leave = svcP <= 0.32 ? 1 : clamp01(1 - (svcP - 0.32) / 0.3);
      }
      target = easeInOut(Math.min(enter, leave));
    }

    nightVal += (target - nightVal) * (reduceMotion ? 1 : 0.12);
    if (Math.abs(target - nightVal) < 0.002) nightVal = target;
    nightVeil.style.opacity = nightVal.toFixed(3);

    const shouldNight = nightVal > 0.42;
    if (shouldNight !== nightOn) {
      nightOn = shouldNight;
      root.classList.toggle("is-night", nightOn);
    }
    return Math.abs(target - nightVal) > 0.002;
  }

  function envStep() {
    if (reduceMotion || !envLayers.length) return false;
    env.x += (env.tx - env.x) * 0.08;
    env.y += (env.ty - env.y) * 0.08;
    const sy = window.scrollY * 0.012;
    for (let i = 0; i < envLayers.length; i += 1) {
      const { el, depth } = envLayers[i];
      const mx = (env.x * depth * 18) | 0;
      const my = (env.y * depth * 13 - sy * depth) | 0;
      el.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }
    return Math.abs(env.tx - env.x) > 0.002 || Math.abs(env.ty - env.y) > 0.002;
  }

  if (!reduceMotion) {
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        env.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        env.ty = (e.clientY / window.innerHeight - 0.5) * 2;
        kickTick();
      },
      { passive: true }
    );
    document.addEventListener(
      "pointerleave",
      () => {
        env.tx = 0;
        env.ty = 0;
        kickTick();
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------
     Film — circle morphs into a full frame as it enters
     ------------------------------------------------------------------ */
  const film = $(".film");
  const stage = $("#film-stage");
  let lastClip = "";

  function filmMorph() {
    if (!film || !stage || reduceMotion || !desktop()) {
      if (stage && lastClip) {
        stage.style.clipPath = "";
        lastClip = "";
      }
      return;
    }
    const rect = film.getBoundingClientRect();
    const vh = window.innerHeight;
    const raw = (vh * 0.75 - rect.top) / (vh * 0.57);
    const p = Math.min(1, Math.max(0, raw));
    const eased = 1 - Math.pow(1 - p, 2.4);
    const next = `inset(${(6 - 6 * eased).toFixed(1)}% ${(26 - 26 * eased).toFixed(1)}% round ${(60 - 54 * eased).toFixed(0)}vmin)`;
    if (next !== lastClip) {
      lastClip = next;
      stage.style.clipPath = next;
    }
  }

  /* ------------------------------------------------------------------
     Services — pinned horizontal scroll
     ------------------------------------------------------------------ */
  const services = $("#services");
  const track = $("#services-track");
  const indexEl = $("#services-index");
  const ticks = $$("#services-ticks span");
  const panels = $$("[data-panel]");
  let hsActive = false;
  let lastIndex = -1;
  let play = 0;
  let vel = 0;
  let lastSnapped = false;
  let snapDir = 0;
  let snapTo = 1;
  let snapStart = 0;
  let snapFrom = 0;
  let snapDuration = 1200;
  let lastTarget = 0;
  let laneLock = 0;
  let layoutDirty = true;
  const layout = {
    maxShift: 0,
    destBack: 2 / 3,
    destForward: 1,
    centerLast: 0,
    centerThird: 0,
    lane: 1 / 3,
    armFwd: 0.8,
    armBack: 0.9,
    leaveLane: 0.64,
  };

  function measureServices() {
    const span = Math.max(1, panels.length - 1);
    const last = panels[3];
    const third = panels[2];
    const pin = last?.closest(".services-pin");
    const pad = pin ? parseFloat(getComputedStyle(pin).paddingLeft) || 0 : 0;
    const maxShift = Math.max(0, track.scrollWidth - window.innerWidth);
    const centerOf = (panel) =>
      Math.max(0, pad + panel.offsetLeft - (window.innerWidth - panel.offsetWidth) / 2);
    layout.maxShift = maxShift;
    layout.centerLast = last ? centerOf(last) : maxShift;
    layout.centerThird = third ? centerOf(third) : maxShift * (2 / span);
    layout.destForward = 1;
    layout.destBack = maxShift > 0 ? Math.min(0.98, layout.centerThird / maxShift) : 2 / span;
    layout.lane = Math.max(0.05, layout.destForward - layout.destBack);
    layout.armFwd = layout.destBack + layout.lane * 0.3;
    layout.armBack = layout.destBack + layout.lane * 0.7;
    layout.leaveLane = layout.destBack - 0.025;
    layoutDirty = false;
  }

  function releaseLastSnap() {
    lastSnapped = false;
    snapDir = 0;
    snapStart = 0;
    snapFrom = 0;
    snapDuration = 1200;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function snapMsFromPace(speed, remain) {
    const ratio = Math.min(2.4, Math.max(0.45, Math.abs(speed) / 0.005));
    const dist = Math.min(1.2, Math.max(0.35, remain / 0.233));
    return Math.max(480, Math.min(2000, (1200 * dist) / ratio));
  }

  function armSnap(dir, dest, from, speed) {
    lastSnapped = true;
    snapDir = dir;
    snapTo = dest;
    snapFrom = from;
    snapStart = performance.now();
    snapDuration = snapMsFromPace(speed, Math.abs(dest - from));
  }

  const analyticsVeil = $("#analytics-veil");
  const avScene = $("#av-scene");
  let analyticsOn = false;

  function setAnalyticsChrome(t) {
    if (!analyticsVeil) return;
    const amt = Math.min(1, Math.max(0, t));
    analyticsVeil.style.opacity = amt.toFixed(3);
    const on = amt > 0.4;
    if (on !== analyticsOn) {
      analyticsOn = on;
      root.classList.toggle("is-analytics", on);
    }
  }

  function updateAnalyticsParallax() {
    if (!avScene || reduceMotion) return;
    const rx = env.y * -7.5;
    const ry = env.x * 9.5;
    const tx = env.x * 38;
    const ty = env.y * 24;
    avScene.style.transform =
      `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
  }

  function resetServicesMotion() {
    play = 0;
    vel = 0;
    track.style.transform = "";
    panels.forEach((panel) => {
      panel.style.transform = "";
      panel.style.opacity = "";
    });
    setAnalyticsChrome(0);
    if (avScene) avScene.style.transform = "";
    releaseLastSnap();
    laneLock = 0;
  }

  function servicesFrame() {
    const rect = services.getBoundingClientRect();
    const vh = window.innerHeight;

    if (!desktop() || reduceMotion) {
      if (hsActive) {
        resetServicesMotion();
        hsActive = false;
      }
      if (!reduceMotion && panels[3]) {
        const r = panels[3].getBoundingClientRect();
        const inView = r.top < vh * 0.72 && r.bottom > vh * 0.28;
        setAnalyticsChrome(inView ? 1 : 0);
      }
      return false;
    }
    hsActive = true;

    const total = Math.max(1, rect.height - vh);
    const raw = -rect.top / total;
    const target = Math.min(1, Math.max(0, raw));
    const span = Math.max(1, panels.length - 1);
    if (layoutDirty) measureServices();
    const {
      destForward,
      destBack,
      armFwd,
      armBack,
      leaveLane,
      lane,
      centerThird,
      centerLast,
    } = layout;

    const targetDelta = target - lastTarget;
    lastTarget = target;
    const pace = Math.max(Math.abs(vel), Math.abs(targetDelta));

    if (target < leaveLane) {
      releaseLastSnap();
      laneLock = 0;
    }

    if (lastSnapped) {
      if (snapDir > 0 && targetDelta < -0.004 && target < armBack) {
        armSnap(-1, destBack, play, pace);
      } else if (snapDir < 0 && targetDelta > 0.004 && target > armFwd) {
        armSnap(1, destForward, play, pace);
      }
    }

    if (lastSnapped) {
      const t = Math.min(1, (performance.now() - snapStart) / Math.max(80, snapDuration));
      play = snapFrom + (snapTo - snapFrom) * easeOutCubic(t);
      vel = 0;
      if (t >= 1) {
        play = snapTo;
        laneLock = snapDir;
        releaseLastSnap();
      }
    } else if (laneLock === 1) {
      play = destForward;
      vel = 0;
      if (target < armBack && targetDelta < -0.0004) {
        armSnap(-1, destBack, play, pace);
      }
    } else if (laneLock === -1) {
      play = destBack;
      vel = 0;
      if (target > armFwd && targetDelta > 0.0004) {
        armSnap(1, destForward, play, pace);
      }
    } else {
      vel = vel * 0.8 + (target - play) * 0.075;
      play += vel;
      if (Math.abs(target - play) < 0.0002 && Math.abs(vel) < 0.0002) {
        play = target;
        vel = 0;
      }

      if (play > armFwd && target > armFwd && vel >= 0 && play < 0.97) {
        armSnap(1, destForward, play, pace);
      }
    }

    const pos =
      play <= destBack
        ? destBack > 0
          ? (play / destBack) * 2
          : 0
        : 2 + (play - destBack) / lane;
    let shift;
    if (play <= destBack) {
      shift = destBack > 0 ? (play / destBack) * centerThird : 0;
    } else {
      const u = Math.min(1, (play - destBack) / lane);
      const eased = u * u * (3 - 2 * u);
      shift = centerThird + (centerLast - centerThird) * eased;
    }
    track.style.transform = `translate3d(${(-shift).toFixed(2)}px, 0, 0)`;

    const idx = Math.min(span, Math.round(pos));
    if (idx !== lastIndex) {
      lastIndex = idx;
      indexEl.textContent = String(idx + 1).padStart(2, "0");
      ticks.forEach((tick, i) => tick.classList.toggle("is-on", i === idx));
    }

    let analyticsT = 0;
    if (raw < 0) analyticsT = 0;
    else if (raw > 1) analyticsT = Math.max(0, 1 - (raw - 1) / 0.35);
    else analyticsT = Math.min(1, Math.max(0, (pos - 2.05) / 0.85));
    setAnalyticsChrome(analyticsT);
    updateAnalyticsParallax();

    for (let i = 0; i < panels.length; i++) {
      const t = Math.min(1, Math.abs(pos - i));
      const s = t * t * (3 - 2 * t);
      const scale = 1 - 0.32 * s;
      const y = 42 * s;
      const opacity = 1 - 0.2 * s;
      panels[i].style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      panels[i].style.opacity = opacity.toFixed(3);
    }

    return (
      Math.abs(target - play) > 0.0002 ||
      Math.abs(vel) > 0.0002 ||
      lastSnapped
    );
  }

  /* ------------------------------------------------------------------
     Stats — count up inside each sticky panel
     ------------------------------------------------------------------ */
  function formatNumber(n) {
    return n.toLocaleString("en-US");
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.count || "0");
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const duration = 1600;
    const start = performance.now();

    if (reduceMotion) {
      el.textContent = `${prefix}${formatNumber(target)}${suffix}`;
      return;
    }

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${prefix}${formatNumber(Math.round(target * eased))}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const stats = $$(".stat");
  const statNums = $$(".stat-num [data-count]");
  if ("IntersectionObserver" in window) {
    const statIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          const num = entry.target.querySelector("[data-count]");
          if (num && !num.dataset.done) {
            num.dataset.done = "1";
            countUp(num);
          }
          statIO.unobserve(entry.target);
        });
      },
      { threshold: 0.45 }
    );
    stats.forEach((el) => statIO.observe(el));
  } else {
    stats.forEach((el) => el.classList.add("is-in"));
    statNums.forEach(countUp);
  }

  /* ------------------------------------------------------------------
     Crew
     ------------------------------------------------------------------ */
  const crewRow = $("#crew-row");
  if (crewRow && "IntersectionObserver" in window) {
    const crewIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          crewRow.classList.add("is-in");
          crewIO.disconnect();
        });
      },
      { threshold: 0.18 }
    );
    crewIO.observe(crewRow);
  } else if (crewRow) {
    crewRow.classList.add("is-in");
  }

  /* ------------------------------------------------------------------
     Film preview, cursor chip, lightbox
     ------------------------------------------------------------------ */
  const preview = $("#film-preview");
  const chip = $("#cursor-chip");
  const lightbox = $("#lightbox");
  const lightboxClose = $("#lightbox-close");
  const filmVideo = $("#film-video");
  const filmEmpty = $("#lightbox-empty");
  const filmInput = $("#film-input");
  let filmAvailable = false;
  let lastTrigger = null;

  preview.addEventListener("loadeddata", () => {
    if (preview.videoWidth > 0) {
      filmAvailable = true;
      stage.classList.add("has-video");
      preview.play().catch(() => {});
    }
  });
  preview.addEventListener("error", () => {
    filmAvailable = false;
    stage.classList.remove("has-video");
  });

  if ("IntersectionObserver" in window) {
    const previewIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!filmAvailable) return;
          if (entry.isIntersecting) preview.play().catch(() => {});
          else preview.pause();
        });
      },
      { threshold: 0.2 }
    );
    previewIO.observe(stage);
  }

  if (finePointer) {
    let chipX = 0;
    let chipY = 0;
    let chipRaf = 0;

    const moveChip = () => {
      chip.style.left = `${chipX}px`;
      chip.style.top = `${chipY}px`;
      chipRaf = 0;
    };

    stage.addEventListener("pointerenter", () => chip.classList.add("show"));
    stage.addEventListener("pointerleave", () => chip.classList.remove("show"));
    stage.addEventListener(
      "pointermove",
      (e) => {
        chipX = e.clientX;
        chipY = e.clientY;
        if (!chipRaf) chipRaf = requestAnimationFrame(moveChip);
      },
      { passive: true }
    );
  }

  function openLightbox(trigger) {
    lastTrigger = trigger || null;
    lightbox.hidden = false;
    body.classList.add("lightbox-open");
    chip.classList.remove("show");
    filmEmpty.hidden = filmAvailable;
    filmVideo.style.visibility = filmAvailable ? "visible" : "hidden";

    requestAnimationFrame(() => {
      lightbox.classList.add("open");
      lightboxClose.focus({ preventScroll: true });
      if (filmAvailable) {
        filmVideo.currentTime = 0;
        filmVideo.play().catch(() => {});
      }
    });
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    body.classList.remove("lightbox-open");
    filmVideo.pause();
    setTimeout(() => {
      if (!lightbox.classList.contains("open")) lightbox.hidden = true;
    }, 450);
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus({ preventScroll: true });
    }
  }

  $$("[data-open-film]").forEach((el) => el.addEventListener("click", () => openLightbox(el)));
  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!lightbox.hidden) closeLightbox();
      else if (menu.classList.contains("open")) setMenu(false);
    }
  });

  filmInput.addEventListener("change", () => {
    const file = filmInput.files && filmInput.files[0];
    if (!file || !file.type.startsWith("video/")) return;
    const url = URL.createObjectURL(file);
    filmAvailable = true;
    filmVideo.src = url;
    preview.src = url;
    preview.load();
    stage.classList.add("has-video");
    filmEmpty.hidden = true;
    filmVideo.style.visibility = "visible";
    filmVideo.play().catch(() => {});
  });

  /* ------------------------------------------------------------------
     Magnetic buttons
     ------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.18;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.18;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------
     Contact form
     ------------------------------------------------------------------ */
  const form = $("#contact-form");
  const status = $("#form-status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const business = String(data.get("business") || "").trim();
    const reach = String(data.get("reach") || "").trim();

    if (!name || !business || !reach) {
      status.textContent = "Name, the business, and a way to reach you.";
      return;
    }

    status.textContent = "Received on this page. Nothing has left the machine yet.";
    form.reset();
  });

  $("#year").textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------
     Single rAF loop
     ------------------------------------------------------------------ */
  let ticking = false;
  function tick() {
    ticking = false;
    onHeaderScroll();
    filmMorph();
    const keepServices = servicesFrame();
    const keepNight = nightStep();
    const keepEnv = envStep();
    if (keepNight || keepEnv || keepServices) kickTick();
  }

  function kickTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", kickTick, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      layoutDirty = true;
      kickTick();
    },
    { passive: true }
  );
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      layoutDirty = true;
      kickTick();
    });
  }

  onHeaderScroll();
  filmMorph();
  nightStep();
  servicesFrame();
  runSplash();
})();
