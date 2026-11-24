/* ============================================================
   whiny.baby — Web Audio Soothing Engine, Checklist & Kit
   ============================================================ */

(function () {
  "use strict";

  const CONFIG = window.WHINY_CONFIG || {
    amazonTag: "balmy06-20",
    survivalKit: []
  };

  function withAmazonTag(rawUrl) {
    try {
      const url = new URL(rawUrl);
      if (CONFIG.amazonTag && CONFIG.amazonTag.trim() !== "") {
        url.searchParams.set("tag", CONFIG.amazonTag.trim());
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  }

  /* ----------------------------------------------------------
     1. 3 AM Nursery Night Mode
     ---------------------------------------------------------- */
  const nightToggle = document.getElementById("nightModeToggle");
  const root = document.documentElement;

  function applyTheme(isNight) {
    if (isNight) {
      root.setAttribute("data-theme", "night");
      nightToggle.setAttribute("aria-pressed", "true");
      nightToggle.querySelector(".night-icon").textContent = "☀️";
      nightToggle.querySelector(".night-label").textContent = "Day Mode";
    } else {
      root.removeAttribute("data-theme");
      nightToggle.setAttribute("aria-pressed", "false");
      nightToggle.querySelector(".night-icon").textContent = "🌙";
      nightToggle.querySelector(".night-label").textContent = "3 AM Mode";
    }
  }

  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("whiny_theme");
  } catch {
    // ignore
  }
  const hour = new Date().getHours();
  applyTheme(savedTheme ? savedTheme === "night" : hour >= 22 || hour < 5);

  nightToggle.addEventListener("click", () => {
    const nextNight = root.getAttribute("data-theme") !== "night";
    applyTheme(nextNight);
    try {
      localStorage.setItem("whiny_theme", nextNight ? "night" : "day");
    } catch {
      // ignore
    }
  });

  /* ----------------------------------------------------------
     2. Web Audio API Soothing Sound Synthesizer (Zero MP3s!)
     ---------------------------------------------------------- */
  const SOUND_LABELS = {
    brown: "Womb Brown Noise",
    shush: "Rhythmic Shusher",
    rain: "Soft Rain",
    fan: "Nursery Box Fan"
  };

  const soundCards = document.querySelectorAll(".sound-card");
  const playToggle = document.getElementById("playToggle");
  const playIcon = document.getElementById("playIcon");
  const playLabel = document.getElementById("playLabel");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const timerPills = document.querySelectorAll(".timer-pill");
  const timerCountdown = document.getElementById("timerCountdown");

  let audioCtx = null;
  let masterGain = null;
  let activeNodes = [];
  let isPlaying = false;
  let currentSound = "brown";
  let timerMinutes = 0;
  let timerRemainingSec = 0;
  let timerInterval = null;

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function createNoiseBuffer(ctx, type) {
    const bufferSize = ctx.sampleRate * 4; // 4-second seamless loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "brown") {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.2;
      }
    } else if (type === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }
    } else {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
    }
    return buffer;
  }

  function clearActiveNodes() {
    activeNodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
        node.disconnect();
      } catch {
        // ignore
      }
    });
    activeNodes = [];
  }

  function startSoundNodes(type) {
    clearActiveNodes();
    const ctx = audioCtx;

    if (type === "brown") {
      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, "brown");
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 340;

      src.connect(lowpass);
      lowpass.connect(masterGain);
      src.start();
      activeNodes = [src, lowpass];
    } else if (type === "rain") {
      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, "pink");
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;

      src.connect(filter);
      filter.connect(masterGain);
      src.start();
      activeNodes = [src, filter];
    } else if (type === "fan") {
      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, "pink");
      src.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 420;
      bandpass.Q.value = 0.65;

      const hum = ctx.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 82;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.04;

      src.connect(bandpass);
      bandpass.connect(masterGain);
      hum.connect(humGain);
      humGain.connect(masterGain);

      src.start();
      hum.start();
      activeNodes = [src, bandpass, hum, humGain];
    } else if (type === "shush") {
      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, "white");
      src.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 1450;
      bandpass.Q.value = 1.1;

      const shushGate = ctx.createGain();
      shushGate.gain.value = 0.48;

      // Gentle ~0.82 Hz LFO (~49 breaths/min) for rhythmic "shhh... shhh..."
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.82;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.42;

      lfo.connect(lfoDepth);
      lfoDepth.connect(shushGate.gain);

      src.connect(bandpass);
      bandpass.connect(shushGate);
      shushGate.connect(masterGain);

      src.start();
      lfo.start();
      activeNodes = [src, bandpass, shushGate, lfo, lfoDepth];
    }
  }

  function targetGain() {
    // Keep maximum gain comfortable and smooth (0.0 to 0.7)
    return (parseInt(volumeSlider.value, 10) / 100) * 0.7;
  }

  function updatePlayUI() {
    playToggle.classList.toggle("is-playing", isPlaying);
    playToggle.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    playIcon.textContent = isPlaying ? "⏸" : "▶";
    playLabel.textContent = isPlaying
      ? `Pause ${SOUND_LABELS[currentSound]}`
      : `Play ${SOUND_LABELS[currentSound]}`;
  }

  function startPlayback() {
    ensureAudioContext();
    startSoundNodes(currentSound);
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.0001), now);
    masterGain.gain.linearRampToValueAtTime(targetGain(), now + 0.6);
    isPlaying = true;
    updatePlayUI();
    startTimerIfSet();
  }

  function stopPlayback(fadeSeconds = 0.5) {
    if (audioCtx && masterGain) {
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
      setTimeout(() => {
        if (!isPlaying) clearActiveNodes();
      }, fadeSeconds * 1000 + 80);
    }
    isPlaying = false;
    stopTimer();
    updatePlayUI();
  }

  function formatCountdown(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")} left`;
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerCountdown.textContent = timerMinutes === 0 ? "Continuous" : `${timerMinutes} min`;
  }

  function startTimerIfSet() {
    if (timerInterval) clearInterval(timerInterval);
    if (timerMinutes === 0) {
      timerCountdown.textContent = "Continuous";
      return;
    }
    timerRemainingSec = timerMinutes * 60;
    timerCountdown.textContent = formatCountdown(timerRemainingSec);
    timerInterval = setInterval(() => {
      timerRemainingSec -= 1;
      if (timerRemainingSec <= 0) {
        stopPlayback(4.0); // Gentle 4-second fade out so baby stays asleep
      } else {
        timerCountdown.textContent = formatCountdown(timerRemainingSec);
      }
    }, 1000);
  }

  playToggle.addEventListener("click", () => {
    if (isPlaying) {
      stopPlayback(0.5);
    } else {
      startPlayback();
    }
  });

  soundCards.forEach((card) => {
    card.addEventListener("click", () => {
      currentSound = card.dataset.sound;
      soundCards.forEach((c) => {
        const active = c === card;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (isPlaying) {
        startSoundNodes(currentSound);
      }
      updatePlayUI();
    });
  });

  volumeSlider.addEventListener("input", () => {
    volumeValue.textContent = `${volumeSlider.value}%`;
    if (isPlaying && audioCtx && masterGain) {
      masterGain.gain.setTargetAtTime(targetGain(), audioCtx.currentTime, 0.08);
    }
  });

  timerPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      timerMinutes = parseInt(pill.dataset.minutes, 10);
      timerPills.forEach((p) => p.classList.toggle("is-active", p === pill));
      if (isPlaying) {
        startTimerIfSet();
      } else {
        timerCountdown.textContent = timerMinutes === 0 ? "Continuous" : `${timerMinutes} min`;
      }
    });
  });

  /* ----------------------------------------------------------
     3. 60-Second Checklist Progress Counters
     ---------------------------------------------------------- */
  function updateChecklistCounts() {
    const basics = document.querySelectorAll('input[data-group="basics"]');
    const basicsChecked = Array.from(basics).filter((i) => i.checked).length;
    document.getElementById("basicsCount").textContent = `${basicsChecked} / ${basics.length} checked`;

    const fives = document.querySelectorAll('input[data-group="fives"]');
    const fivesChecked = Array.from(fives).filter((i) => i.checked).length;
    document.getElementById("fivesCount").textContent = `${fivesChecked} / ${fives.length} checked`;
  }

  document.querySelectorAll('input[data-group]').forEach((cb) => {
    cb.addEventListener("change", updateChecklistCounts);
  });

  /* ----------------------------------------------------------
     4. Render Soothing Kit
     ---------------------------------------------------------- */
  const kitGrid = document.getElementById("kitGrid");
  if (kitGrid && Array.isArray(CONFIG.survivalKit)) {
    kitGrid.innerHTML = CONFIG.survivalKit
      .map(
        (item) => `
        <article class="kit-card">
          <div>
            <div class="kit-meta">
              <span class="kit-cat">${item.category}</span>
              <span class="kit-badge">${item.badge}</span>
            </div>
            <h3>${item.name}</h3>
            <p>${item.why}</p>
          </div>
          <a
            class="btn btn-primary"
            href="${withAmazonTag(item.url)}"
            target="_blank"
            rel="nofollow sponsored noopener"
          >
            ${item.cta} &rarr;
          </a>
        </article>
      `
      )
      .join("");
  }

  const yearSpan = document.getElementById("yearSpan");
  if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());
})();
