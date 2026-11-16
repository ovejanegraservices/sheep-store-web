const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const categoryTabs = document.querySelectorAll(".category-tab");
const currentYear = document.querySelector("#current-year");
const categoryMarquee = document.querySelector(".product-marquee");
const categoryMarqueeTrack = document.querySelector(".product-marquee-track");
const categoryMarqueeGroup = document.querySelector(".product-marquee-group");
let categoryMarqueeCopy = null;
let selectedCategoryFilter = "todos";
let categoryMarqueeOffset = 0;
let categoryMarqueeResumeTimer = 0;
let wheelFrame = 0;
let previousWheelFrame = 0;
const categoryMarqueeDuration = 76000;

if (
  categoryMarquee instanceof HTMLElement &&
  categoryMarqueeTrack instanceof HTMLElement &&
  categoryMarqueeGroup instanceof HTMLElement
) {
  const duplicateGroup = categoryMarqueeGroup.cloneNode(true);
  if (duplicateGroup instanceof HTMLElement) {
    categoryMarqueeCopy = duplicateGroup;
    duplicateGroup.classList.add("product-marquee-group-copy");
    duplicateGroup.setAttribute("aria-hidden", "true");

    const idMap = new Map();
    duplicateGroup.querySelectorAll("[id]").forEach((element) => {
      const oldId = element.id;
      const newId = `${oldId}-marquee-copy`;
      idMap.set(oldId, newId);
      element.id = newId;
    });
    duplicateGroup.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        idMap.forEach((newId, oldId) => {
          attribute.value = attribute.value.replaceAll(`#${oldId}`, `#${newId}`);
        });
      });
    });
    duplicateGroup.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((element) => {
      element.tabIndex = -1;
    });
    categoryMarqueeTrack.append(duplicateGroup);
    categoryMarquee.classList.add("is-animated");
  }
}

const readAnimatedCategoryOffset = () => {
  if (
    !(categoryMarqueeTrack instanceof HTMLElement) ||
    !(categoryMarqueeGroup instanceof HTMLElement) ||
    !(categoryMarquee instanceof HTMLElement)
  ) return categoryMarqueeOffset;

  const transform = new DOMMatrixReadOnly(getComputedStyle(categoryMarqueeTrack).transform);
  const groupWidth = categoryMarqueeGroup.offsetWidth;
  return groupWidth ? ((-transform.m41 % groupWidth) + groupWidth) % groupWidth : 0;
};

const resumeCategoryAnimation = () => {
  if (
    selectedCategoryFilter !== "todos" ||
    !(categoryMarquee instanceof HTMLElement) ||
    !(categoryMarqueeGroup instanceof HTMLElement) ||
    !(categoryMarqueeCopy instanceof HTMLElement)
  ) return;

  const groupWidth = categoryMarqueeGroup.offsetWidth;
  if (wheelFrame) window.cancelAnimationFrame(wheelFrame);
  wheelFrame = 0;
  previousWheelFrame = 0;
  categoryMarqueeOffset = groupWidth ? categoryMarquee.scrollLeft % groupWidth : 0;
  const progress = groupWidth ? categoryMarqueeOffset / groupWidth : 0;
  categoryMarquee.style.setProperty("--marquee-delay", `${-progress * categoryMarqueeDuration}ms`);
  categoryMarquee.scrollLeft = 0;
  categoryMarqueeCopy.hidden = false;
  categoryMarquee.classList.remove("is-manual", "is-dragging");
  categoryMarquee.classList.add("is-animated");
};

const scheduleCategoryAnimationResume = () => {
  if (selectedCategoryFilter !== "todos") return;
  window.clearTimeout(categoryMarqueeResumeTimer);
  categoryMarqueeResumeTimer = window.setTimeout(resumeCategoryAnimation, 1400);
};

const useManualCategoryScroll = () => {
  if (
    !(categoryMarquee instanceof HTMLElement) ||
    !(categoryMarqueeTrack instanceof HTMLElement) ||
    !(categoryMarqueeGroup instanceof HTMLElement)
  ) return;

  if (categoryMarquee.classList.contains("is-animated")) {
    categoryMarqueeOffset = readAnimatedCategoryOffset();
    categoryMarquee.scrollLeft = categoryMarqueeOffset;
  }

  categoryMarquee.classList.remove("is-animated");
  categoryMarquee.classList.add("is-manual");
  if (categoryMarqueeCopy instanceof HTMLElement) {
    categoryMarqueeCopy.hidden = selectedCategoryFilter !== "todos";
  }
};

if (categoryMarquee instanceof HTMLElement) {
  let pointerStartX = 0;
  let pointerStartScroll = 0;
  let activePointerId = null;
  let isDragging = false;
  let suppressClick = false;
  let wheelTarget = 0;
  const reduceMarqueeMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const animateWheelScroll = (timestamp) => {
    if (!(categoryMarquee instanceof HTMLElement)) return;
    if (!previousWheelFrame) previousWheelFrame = timestamp;
    const elapsed = Math.min(48, timestamp - previousWheelFrame);
    previousWheelFrame = timestamp;
    const remaining = wheelTarget - categoryMarquee.scrollLeft;
    const step = remaining * (1 - Math.exp(-elapsed / 400));

    if (Math.abs(remaining) < 0.6) {
      categoryMarquee.scrollLeft = wheelTarget;
      wheelFrame = 0;
      previousWheelFrame = 0;
      return;
    }

    categoryMarquee.scrollLeft += step;
    wheelFrame = window.requestAnimationFrame(animateWheelScroll);
  };

  categoryMarquee.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartScroll = categoryMarquee.scrollLeft;
    isDragging = false;
  });

  categoryMarquee.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;
    const deltaX = event.clientX - pointerStartX;
    if (!isDragging && Math.abs(deltaX) > 6) {
      isDragging = true;
      useManualCategoryScroll();
      pointerStartScroll = categoryMarquee.scrollLeft;
      categoryMarquee.classList.add("is-dragging");
      categoryMarquee.setPointerCapture(event.pointerId);
    }
    if (isDragging) {
      event.preventDefault();
      categoryMarquee.scrollLeft = pointerStartScroll - deltaX;
    }
  });

  const finishCategoryDrag = (event) => {
    if (event.pointerId !== activePointerId) return;
    if (isDragging) {
      suppressClick = true;
      categoryMarquee.classList.remove("is-dragging");
      window.setTimeout(() => { suppressClick = false; }, 0);
      scheduleCategoryAnimationResume();
    }
    isDragging = false;
    activePointerId = null;
  };

  categoryMarquee.addEventListener("pointerup", finishCategoryDrag);
  categoryMarquee.addEventListener("pointercancel", finishCategoryDrag);
  categoryMarquee.addEventListener("scroll", () => {
    if (!categoryMarquee.classList.contains("is-manual") || selectedCategoryFilter !== "todos") return;
    categoryMarqueeOffset = categoryMarquee.scrollLeft;
    if (!isDragging) scheduleCategoryAnimationResume();
  });
  categoryMarquee.addEventListener("click", (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);
  categoryMarquee.addEventListener("wheel", (event) => {
    const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? categoryMarquee.clientWidth
        : 1;
    const delta = Math.max(-18, Math.min(18, rawDelta * unit * 0.1));
    if (!delta) return;
    useManualCategoryScroll();
    if (!wheelFrame) wheelTarget = categoryMarquee.scrollLeft;
    wheelTarget = Math.max(
      0,
      Math.min(categoryMarquee.scrollWidth - categoryMarquee.clientWidth, wheelTarget + delta)
    );
    event.preventDefault();
    if (reduceMarqueeMotion.matches) {
      categoryMarquee.scrollLeft = wheelTarget;
    } else if (!wheelFrame) {
      wheelFrame = window.requestAnimationFrame(animateWheelScroll);
    }
    scheduleCategoryAnimationResume();
  }, { passive: false });
}

const threadsCanvas = document.querySelector(".threads-canvas");

if (threadsCanvas instanceof HTMLCanvasElement) {
  const context = threadsCanvas.getContext("2d", { alpha: true });

  if (!context) {
    throw new Error("No se pudo inicializar el fondo animado de hilos.");
  }

  const hero = threadsCanvas.closest(".hero");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const threadCount = 64;
  const segments = 72;
  let width = 0;
  let height = 0;
  let frameId = 0;
  let elapsed = 0;
  let previousFrame = 0;
  let visible = true;

  const resizeCanvas = () => {
    const bounds = threadsCanvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    width = bounds.width;
    height = bounds.height;
    threadsCanvas.width = Math.round(width * pixelRatio);
    threadsCanvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawThreads();
  };

  const drawThreads = () => {
    context.clearRect(0, 0, width, height);
    if (!width || !height) return;

    const centerY = height * 0.48;
    const spread = height * (width < 600 ? 0.85 : 0.72);
    const amplitude = height * (width < 600 ? 0.105 : 0.145);
    const phase = elapsed * 0.00042;

    for (let thread = 0; thread < threadCount; thread += 1) {
      const progress = thread / (threadCount - 1);
      const offset = (progress - 0.5) * spread;
      const opacity = 0.12 + Math.sin(progress * Math.PI) * 0.37;

      context.beginPath();

      for (let segment = 0; segment <= segments; segment += 1) {
        const xProgress = segment / segments;
        const x = xProgress * width;
        const envelope = Math.sin(xProgress * Math.PI * 0.88);
        const convergence = 1 - xProgress * 0.57;
        const wave = Math.sin(
          xProgress * 8.6 - phase + progress * 5.2
        ) * 0.68 + Math.sin(
          xProgress * 3.4 + phase * 0.73 + progress * 2.7
        ) * 0.32;
        const y = centerY + offset * convergence + wave * amplitude * envelope;

        if (segment === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.strokeStyle = `rgba(235, 235, 235, ${opacity})`;
      context.lineWidth = 0.7 + Math.sin(progress * Math.PI) * 0.35;
      context.stroke();
    }

    const shimmer = context.createRadialGradient(
      width * 0.7,
      height * 0.35,
      0,
      width * 0.7,
      height * 0.35,
      Math.max(width, height) * 0.4
    );
    shimmer.addColorStop(0, "rgba(255, 255, 255, 0.13)");
    shimmer.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = shimmer;
    context.fillRect(0, 0, width, height);
  };

  const animateThreads = (timestamp) => {
    frameId = 0;
    if (!visible || document.hidden || reducedMotion.matches) return;

    if (timestamp - previousFrame >= 1000 / 30) {
      elapsed += timestamp - previousFrame;
      previousFrame = timestamp;
      drawThreads();
    }

    frameId = window.requestAnimationFrame(animateThreads);
  };

  const updateAnimation = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    if (visible && !document.hidden && !reducedMotion.matches) {
      previousFrame = performance.now();
      frameId = window.requestAnimationFrame(animateThreads);
    } else {
      drawThreads();
    }
  };

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(threadsCanvas);

  if (hero && "IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateAnimation();
    });
    visibilityObserver.observe(hero);
  }

  reducedMotion.addEventListener("change", updateAnimation);
  document.addEventListener("visibilitychange", updateAnimation);
  resizeCanvas();
  updateAnimation();
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    mainNav.classList.toggle("is-open", !isOpen);
  });

  mainNav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
      mainNav.classList.remove("is-open");
    }
  });
}

if (mainNav) {
  const soundToggle = document.querySelector(".nav-sound-toggle");
  let audioContext = null;
  let hoverSoundEnabled = true;
  let lastHoverSound = 0;
  let soundResumePending = false;

  const playHoverSound = (link = null) => {
    if (!hoverSoundEnabled || !audioContext || audioContext.state !== "running") return;

    const now = performance.now();
    if (now - lastHoverSound < 100) return;
    lastHoverSound = now;

    const start = audioContext.currentTime;
    const frequencies = link?.dataset.hoverSound === "contact" ? [587, 440] : [740, 990];
    frequencies.forEach((frequency, index) => {
      const toneStart = start + index * 0.025;
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, toneStart + 0.075);
      volume.gain.setValueAtTime(0.0001, toneStart);
      volume.gain.exponentialRampToValueAtTime(0.07, toneStart + 0.009);
      volume.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.11);

      oscillator.connect(volume);
      volume.connect(audioContext.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + 0.115);
    });
  };

  const playClickTone = () => {
    if (!hoverSoundEnabled || !audioContext || audioContext.state !== "running") return;

    const start = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1150, start);
    oscillator.frequency.exponentialRampToValueAtTime(760, start + 0.045);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(0.075, start + 0.004);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.055);

    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.06);
  };

  const playClickSound = () => {
    if (!hoverSoundEnabled) return;

    if (audioContext?.state === "running") {
      playClickTone();
      return;
    }

    try {
      if (!audioContext) audioContext = new AudioContext();
    } catch (error) {
      console.error("No se pudo iniciar el sonido de clic.", error);
      return;
    }

    audioContext.resume().then(() => {
      if (!hoverSoundEnabled) return;
      updateSoundToggle();
      playClickTone();
    }).catch((error) => {
      console.error("No se pudo reproducir el sonido de clic.", error);
    });
  };

  const updateSoundToggle = () => {
    if (!soundToggle) return;
    const label = hoverSoundEnabled ? "Silenciar sonido de navegación" : "Activar sonido de navegación";
    soundToggle.setAttribute("aria-pressed", String(hoverSoundEnabled));
    soundToggle.setAttribute("aria-label", label);
    soundToggle.title = label;
  };

  const enableHoverSound = (playConfirmation = false, confirmationLink = null) => {
    if (typeof window.AudioContext !== "function") {
      console.warn("El navegador no admite el sonido de navegación.");
      return;
    }

    try {
      if (!audioContext) audioContext = new AudioContext();
    } catch (error) {
      console.error("No se pudo iniciar el sonido de navegación.", error);
      return;
    }

    if (audioContext.state === "running") {
      hoverSoundEnabled = true;
      updateSoundToggle();
      if (playConfirmation) playHoverSound(confirmationLink);
      return;
    }

    if (soundResumePending) return;
    soundResumePending = true;
    audioContext.resume().then(() => {
      soundResumePending = false;
      hoverSoundEnabled = true;
      updateSoundToggle();
      if (playConfirmation) playHoverSound(confirmationLink);
    }).catch((error) => {
      soundResumePending = false;
      console.error("No se pudo activar el sonido de navegación.", error);
    });
  };

  updateSoundToggle();

  soundToggle?.addEventListener("click", () => {
    if (hoverSoundEnabled) {
      hoverSoundEnabled = false;
      updateSoundToggle();
      if (audioContext?.state === "running") {
        audioContext.suspend().catch((error) => {
          console.error("No se pudo silenciar el sonido de navegación.", error);
        });
      }
      return;
    }

    enableHoverSound(true);
  });

  const unlockHoverSound = (event) => {
    if (event.target instanceof Element && event.target.closest(".nav-sound-toggle")) return;
    if (hoverSoundEnabled && audioContext?.state !== "running") enableHoverSound();
  };

  document.addEventListener("pointerdown", unlockHoverSound, { passive: true });
  document.addEventListener("keydown", unlockHoverSound);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest("a, button, [role='button']");
    if (
      !control ||
      control.matches(":disabled, [aria-disabled='true'], [data-game-launch], .nav-sound-toggle")
    ) return;
    playClickSound();
  });

  const getSoundLink = (target) => {
    if (!(target instanceof Element)) return null;
    return target.closest("a[data-hover-sound]");
  };

  mainNav.addEventListener("pointerover", (event) => {
    const link = getSoundLink(event.target);
    if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;
    if (hoverSoundEnabled && audioContext?.state !== "running") {
      enableHoverSound(true, link);
      return;
    }
    playHoverSound(link);
  });

  mainNav.addEventListener("focusin", (event) => {
    const link = getSoundLink(event.target);
    if (!link) return;
    if (hoverSoundEnabled && audioContext?.state !== "running") {
      enableHoverSound(true, link);
      return;
    }
    playHoverSound(link);
  });
}

const musicToggle = document.querySelector(".music-toggle");

if (musicToggle instanceof HTMLButtonElement) {
  const AudioContextConstructor = window.AudioContext;
  const chords = [
    [60, 64, 67, 71],
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [55, 59, 62, 65],
  ];
  let musicContext = null;
  let musicTimer = 0;
  let musicEnabled = true;
  let musicStartPending = false;
  let nextMusicStepTime = 0;
  let musicStep = 0;
  let noiseBuffer = null;
  let musicMasterGain = null;

  const updateMusicToggle = () => {
    const label = musicEnabled ? "Detener música lofi hip hop" : "Reproducir música lofi hip hop";
    musicToggle.setAttribute("aria-pressed", String(musicEnabled));
    musicToggle.setAttribute("aria-label", label);
    musicToggle.title = label;
    musicToggle.querySelector(".music-toggle-label").textContent = musicEnabled ? "Música lofi" : "Activar música";
  };

  const midiToFrequency = (note) => 440 * 2 ** ((note - 69) / 12);

  const playNote = (note, time, duration, volume, type = "triangle") => {
    const oscillator = musicContext.createOscillator();
    const filter = musicContext.createBiquadFilter();
    const gain = musicContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(midiToFrequency(note), time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1500, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.12);
    gain.gain.setValueAtTime(volume, time + duration * 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(musicMasterGain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  };

  const playKick = (time) => {
    const oscillator = musicContext.createOscillator();
    const gain = musicContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(105, time);
    oscillator.frequency.exponentialRampToValueAtTime(48, time + 0.18);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.28, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    oscillator.connect(gain);
    gain.connect(musicMasterGain);
    oscillator.start(time);
    oscillator.stop(time + 0.23);
  };

  const playNoise = (time, duration, volume, frequency) => {
    const source = musicContext.createBufferSource();
    const filter = musicContext.createBiquadFilter();
    const gain = musicContext.createGain();

    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(musicMasterGain);
    source.start(time);
    source.stop(time + duration + 0.01);
  };

  const scheduleMusicStep = (time) => {
    const step = musicStep % 16;
    const chord = chords[Math.floor(musicStep / 16) % chords.length];

    if (step === 0 || step === 8) {
      chord.forEach((note, index) => playNote(note, time, 2.4, index === 3 ? 0.012 : 0.02));
    }
    if (step === 0 || step === 10) playNote(chord[0] - 24, time, 0.45, 0.11, "sine");
    if (step === 0 || step === 8) playKick(time);
    if (step === 4 || step === 12) playNoise(time, 0.16, 0.055, 1200);
    playNoise(time, 0.035, step % 4 === 0 ? 0.012 : 0.007, 6500);

    musicStep = (musicStep + 1) % (chords.length * 16);
  };

  const startMusicScheduler = () => {
    if (!musicEnabled || musicTimer || musicContext.state !== "running") return;
    nextMusicStepTime = musicContext.currentTime + 0.05;
    const stepDuration = 60 / 82 / 2;
    const scheduleAhead = () => {
      if (!musicEnabled || musicContext.state !== "running") return;
      while (nextMusicStepTime < musicContext.currentTime + 0.18) {
        scheduleMusicStep(nextMusicStepTime);
        nextMusicStepTime += stepDuration;
      }
    };

    scheduleAhead();
    musicTimer = window.setInterval(scheduleAhead, 80);
  };

  const startMusic = () => {
    if (!musicEnabled || musicStartPending) return;
    if (typeof AudioContextConstructor !== "function") {
      console.warn("El navegador no admite la música de fondo.");
      musicEnabled = false;
      updateMusicToggle();
      return;
    }

    try {
      if (!musicContext) {
        musicContext = new AudioContextConstructor();
        musicMasterGain = musicContext.createGain();
        musicMasterGain.gain.value = 0.06;
        musicMasterGain.connect(musicContext.destination);
        noiseBuffer = musicContext.createBuffer(1, musicContext.sampleRate, musicContext.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let index = 0; index < samples.length; index += 1) {
          samples[index] = Math.random() * 2 - 1;
        }
      }
    } catch (error) {
      console.error("No se pudo preparar la música de fondo.", error);
      musicEnabled = false;
      updateMusicToggle();
      return;
    }

    if (musicContext.state === "running") {
      startMusicScheduler();
      return;
    }

    musicStartPending = true;
    musicContext.resume().then(() => {
      musicStartPending = false;
      startMusicScheduler();
    }).catch((error) => {
      musicStartPending = false;
      console.error("No se pudo reproducir la música de fondo.", error);
      musicEnabled = false;
      updateMusicToggle();
    });
  };

  updateMusicToggle();
  document.addEventListener("pointerdown", startMusic, { once: true });
  document.addEventListener("keydown", startMusic, { once: true });

  musicToggle.addEventListener("click", () => {
    musicEnabled = !musicEnabled;
    updateMusicToggle();

    if (!musicEnabled) {
      window.clearInterval(musicTimer);
      musicTimer = 0;
      if (musicContext?.state === "running") {
        musicContext.suspend().catch((error) => {
          console.error("No se pudo detener la música de fondo.", error);
        });
      }
      return;
    }

    startMusic();
  });
}

const wallpaperMainImage = document.querySelector("#wallpaper-main-image");
const wallpaperMainTitle = document.querySelector("#wallpaper-main-title");
const wallpaperMainDescription = document.querySelector("#wallpaper-main-description");
const wallpaperMainCount = document.querySelector("#wallpaper-main-count");
const wallpaperMainDownload = document.querySelector("#wallpaper-main-download");
const wallpaperThumbs = document.querySelectorAll("[data-wallpaper-thumb]");
const wallpaperPrevious = document.querySelector(".wallpaper-arrow-previous");
const wallpaperNext = document.querySelector(".wallpaper-arrow-next");
const wallpaperStrip = document.querySelector(".wallpaper-strip");
const wallpaperGallery = document.querySelector("#wallpaper-gallery");

if (
  wallpaperMainImage instanceof HTMLImageElement &&
  wallpaperMainTitle &&
  wallpaperMainDescription &&
  wallpaperMainCount &&
  wallpaperMainDownload instanceof HTMLAnchorElement &&
  wallpaperThumbs.length &&
  wallpaperPrevious instanceof HTMLButtonElement &&
  wallpaperNext instanceof HTMLButtonElement &&
  wallpaperStrip instanceof HTMLElement &&
  wallpaperGallery instanceof HTMLElement
) {
  const initialWallpaperIndex = Array.from(wallpaperThumbs).findIndex((thumb) => thumb.classList.contains("is-active"));
  let activeWallpaperIndex = initialWallpaperIndex >= 0 ? initialWallpaperIndex : 0;
  const wallpaperTrack = document.createElement("div");
  const wallpaperGroup = document.createElement("div");
  wallpaperTrack.className = "wallpaper-strip-track";
  wallpaperGroup.className = "wallpaper-strip-group";
  const reduceWallpaperMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let wallpaperCopy = null;
  let wallpaperOffset = 0;
  let wallpaperResumeTimer = 0;
  let wallpaperWheelFrame = 0;
  let previousWallpaperWheelFrame = 0;
  const wallpaperAnimationDuration = 58000;

  wallpaperThumbs.forEach((thumb, index) => {
    thumb.dataset.wallpaperIndex = String(index);
    wallpaperGroup.append(thumb);
  });

  const duplicateGroup = wallpaperGroup.cloneNode(true);
  if (duplicateGroup instanceof HTMLDivElement) {
    wallpaperCopy = duplicateGroup;
    duplicateGroup.setAttribute("aria-hidden", "true");
    duplicateGroup.querySelectorAll("button").forEach((thumb) => {
      thumb.tabIndex = -1;
    });
    wallpaperTrack.append(wallpaperGroup, duplicateGroup);
    wallpaperStrip.replaceChildren(wallpaperTrack);
    if (!reduceWallpaperMotion.matches) wallpaperStrip.classList.add("is-animated");
  }

  const readWallpaperAnimationOffset = () => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(wallpaperTrack).transform);
    const groupWidth = wallpaperGroup.offsetWidth;
    return groupWidth ? ((-transform.m41 % groupWidth) + groupWidth) % groupWidth : 0;
  };

  const resumeWallpaperAnimation = () => {
    if (
      reduceWallpaperMotion.matches ||
      !(wallpaperCopy instanceof HTMLDivElement)
    ) return;

    const groupWidth = wallpaperGroup.offsetWidth;
    if (wallpaperWheelFrame) window.cancelAnimationFrame(wallpaperWheelFrame);
    wallpaperWheelFrame = 0;
    previousWallpaperWheelFrame = 0;
    wallpaperOffset = groupWidth ? wallpaperStrip.scrollLeft % groupWidth : 0;
    const progress = groupWidth ? wallpaperOffset / groupWidth : 0;
    wallpaperStrip.style.setProperty(
      "--wallpaper-marquee-delay",
      `${-progress * wallpaperAnimationDuration}ms`
    );
    wallpaperStrip.scrollLeft = 0;
    wallpaperCopy.hidden = false;
    wallpaperStrip.classList.remove("is-manual", "is-dragging");
    wallpaperStrip.classList.add("is-animated");
  };

  const scheduleWallpaperAnimationResume = () => {
    if (reduceWallpaperMotion.matches) return;
    window.clearTimeout(wallpaperResumeTimer);
    wallpaperResumeTimer = window.setTimeout(resumeWallpaperAnimation, 1400);
  };

  const useManualWallpaperScroll = () => {
    if (wallpaperStrip.classList.contains("is-animated")) {
      wallpaperOffset = readWallpaperAnimationOffset();
      wallpaperStrip.scrollLeft = wallpaperOffset;
    }

    wallpaperStrip.classList.remove("is-animated");
    wallpaperStrip.classList.add("is-manual");
    if (wallpaperCopy instanceof HTMLDivElement) wallpaperCopy.hidden = false;
  };

  let wallpaperPointerStartX = 0;
  let wallpaperPointerStartScroll = 0;
  let wallpaperActivePointerId = null;
  let wallpaperIsDragging = false;
  let suppressWallpaperClick = false;
  let wallpaperWheelTarget = 0;

  const animateWallpaperWheel = (timestamp) => {
    if (!previousWallpaperWheelFrame) previousWallpaperWheelFrame = timestamp;
    const elapsed = Math.min(48, timestamp - previousWallpaperWheelFrame);
    previousWallpaperWheelFrame = timestamp;
    const remaining = wallpaperWheelTarget - wallpaperStrip.scrollLeft;
    const step = remaining * (1 - Math.exp(-elapsed / 400));

    if (Math.abs(remaining) < 0.6) {
      wallpaperStrip.scrollLeft = wallpaperWheelTarget;
      wallpaperWheelFrame = 0;
      previousWallpaperWheelFrame = 0;
      return;
    }

    wallpaperStrip.scrollLeft += step;
    wallpaperWheelFrame = window.requestAnimationFrame(animateWallpaperWheel);
  };

  wallpaperStrip.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    wallpaperActivePointerId = event.pointerId;
    wallpaperPointerStartX = event.clientX;
    wallpaperPointerStartScroll = wallpaperStrip.scrollLeft;
    wallpaperIsDragging = false;
  });

  wallpaperStrip.addEventListener("pointermove", (event) => {
    if (event.pointerId !== wallpaperActivePointerId) return;
    const deltaX = event.clientX - wallpaperPointerStartX;
    if (!wallpaperIsDragging && Math.abs(deltaX) > 6) {
      wallpaperIsDragging = true;
      useManualWallpaperScroll();
      wallpaperPointerStartScroll = wallpaperStrip.scrollLeft;
      wallpaperStrip.classList.add("is-dragging");
      wallpaperStrip.setPointerCapture(event.pointerId);
    }
    if (wallpaperIsDragging) {
      event.preventDefault();
      wallpaperStrip.scrollLeft = wallpaperPointerStartScroll - deltaX;
    }
  });

  const finishWallpaperDrag = (event) => {
    if (event.pointerId !== wallpaperActivePointerId) return;
    if (wallpaperIsDragging) {
      suppressWallpaperClick = true;
      wallpaperStrip.classList.remove("is-dragging");
      window.setTimeout(() => { suppressWallpaperClick = false; }, 0);
      scheduleWallpaperAnimationResume();
    }
    wallpaperIsDragging = false;
    wallpaperActivePointerId = null;
  };

  wallpaperStrip.addEventListener("pointerup", finishWallpaperDrag);
  wallpaperStrip.addEventListener("pointercancel", finishWallpaperDrag);
  wallpaperStrip.addEventListener("scroll", () => {
    if (!wallpaperStrip.classList.contains("is-manual")) return;
    wallpaperOffset = wallpaperStrip.scrollLeft;
    if (!wallpaperIsDragging) scheduleWallpaperAnimationResume();
  });
  wallpaperStrip.addEventListener("click", (event) => {
    if (!suppressWallpaperClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressWallpaperClick = false;
  }, true);
  wallpaperStrip.addEventListener("wheel", (event) => {
    const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? wallpaperStrip.clientWidth
        : 1;
    const delta = Math.max(-18, Math.min(18, rawDelta * unit * 0.1));
    if (!delta) return;
    useManualWallpaperScroll();
    if (!wallpaperWheelFrame) wallpaperWheelTarget = wallpaperStrip.scrollLeft;
    wallpaperWheelTarget = Math.max(
      0,
      Math.min(wallpaperStrip.scrollWidth - wallpaperStrip.clientWidth, wallpaperWheelTarget + delta)
    );
    event.preventDefault();
    if (reduceWallpaperMotion.matches) {
      wallpaperStrip.scrollLeft = wallpaperWheelTarget;
    } else if (!wallpaperWheelFrame) {
      wallpaperWheelFrame = window.requestAnimationFrame(animateWallpaperWheel);
    }
    scheduleWallpaperAnimationResume();
  }, { passive: false });

  const selectWallpaper = (index) => {
    const normalizedIndex = (index + wallpaperThumbs.length) % wallpaperThumbs.length;
    const thumb = wallpaperThumbs[normalizedIndex];
    const { src, alt, title, description, download } = thumb.dataset;
    if (!src || !alt || !title || !description || !download) {
      console.error("Faltan datos para mostrar el fondo seleccionado.");
      return;
    }

    activeWallpaperIndex = normalizedIndex;
    wallpaperStrip.querySelectorAll("[data-wallpaper-index]").forEach((item) => {
      const isSelected = Number(item.dataset.wallpaperIndex) === activeWallpaperIndex;
      item.classList.toggle("is-active", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });

    wallpaperMainImage.classList.remove("is-changing");
    void wallpaperMainImage.offsetWidth;
    wallpaperMainImage.src = src;
    wallpaperMainImage.alt = alt;
    wallpaperMainImage.classList.add("is-changing");
    wallpaperMainTitle.textContent = title;
    wallpaperMainDescription.textContent = description;
    wallpaperMainCount.textContent = `FONDO ${String(activeWallpaperIndex + 1).padStart(2, "0")} / ${String(wallpaperThumbs.length).padStart(2, "0")}`;
    wallpaperMainDownload.href = src;
    wallpaperMainDownload.download = download;
    wallpaperMainDownload.setAttribute("aria-label", `Descargar fondo ${title}`);
  };

  wallpaperStrip.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const thumb = event.target.closest("[data-wallpaper-index]");
    if (!(thumb instanceof HTMLButtonElement)) return;
    const index = Number(thumb.dataset.wallpaperIndex);
    if (Number.isInteger(index)) selectWallpaper(index);
  });

  wallpaperPrevious.addEventListener("click", () => selectWallpaper(activeWallpaperIndex - 1));
  wallpaperNext.addEventListener("click", () => selectWallpaper(activeWallpaperIndex + 1));

  wallpaperGallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectWallpaper(activeWallpaperIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      selectWallpaper(activeWallpaperIndex + 1);
    }
  });
}

const gameLaunchers = document.querySelectorAll("[data-game-launch]");
const gameDialog = document.querySelector("#sheep-game");
const gameCanvas = document.querySelector("#sheep-game-canvas");
const gameLaunchStatus = document.querySelector("#game-launch-status");
const gameStatus = document.querySelector("#sheep-game-status");
const gameScoreLabel = document.querySelector("#sheep-game-score");
const gameRestart = document.querySelector("#sheep-game-restart");
const gameSoundToggle = document.querySelector("#sheep-game-sound-toggle");
const gameJump = document.querySelector("#sheep-game-jump");
const gameClose = document.querySelector(".sheep-game-close");

if (
  gameLaunchers.length &&
  gameDialog instanceof HTMLDialogElement &&
  gameCanvas instanceof HTMLCanvasElement &&
  gameLaunchStatus &&
  gameStatus &&
  gameScoreLabel &&
  gameRestart instanceof HTMLButtonElement &&
  gameSoundToggle instanceof HTMLButtonElement &&
  gameJump instanceof HTMLButtonElement &&
  gameClose instanceof HTMLButtonElement
) {
  const context = gameCanvas.getContext("2d");
  const sheepImage = document.querySelector(".hero-logo-front");

  if (!context) {
    throw new Error("No se pudo inicializar el juego de Sheep Store.");
  }

  if (!(sheepImage instanceof HTMLImageElement)) {
    throw new Error("No se encontró el logo de la oveja para el juego.");
  }

  const groundY = 260;
  const sheepX = 105;
  const sheepSize = 64;
  const sheep = { y: groundY - sheepSize, velocity: 0 };
  const obstacles = [];
  const gameAudioUrl = new URL("assets/audio/sheep-bleat.mp3", document.baseURI);
  const AudioContextConstructor = window.AudioContext;
  let gameFrame = 0;
  let previousFrame = 0;
  let nextObstacleX = gameCanvas.width;
  let distance = 0;
  let speed = 365;
  let launchPending = false;
  let gameRunning = false;
  let jumpSoundEnabled = true;
  let audioContext = null;
  let bleatBuffer = null;

  const updateGameSoundToggle = () => {
    const label = jumpSoundEnabled ? "Silenciar sonido del salto" : "Activar sonido del salto";
    gameSoundToggle.setAttribute("aria-pressed", String(jumpSoundEnabled));
    gameSoundToggle.setAttribute("aria-label", label);
    gameSoundToggle.title = label;
    gameSoundToggle.textContent = jumpSoundEnabled ? "♪ Sonido del salto" : "× Sonido del salto";
  };

  const playJumpTone = () => {
    if (!jumpSoundEnabled || audioContext?.state !== "running") return;

    const start = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(540, start);
    oscillator.frequency.exponentialRampToValueAtTime(360, start + 0.12);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.15);
  };

  const playJumpSound = () => {
    if (!jumpSoundEnabled || audioContext?.state === "running") {
      playJumpTone();
      return;
    }

    if (typeof AudioContextConstructor !== "function") {
      console.warn("El navegador no admite el sonido del salto.");
      return;
    }

    try {
      if (!audioContext) audioContext = new AudioContextConstructor();
    } catch (error) {
      console.error("No se pudo preparar el sonido del salto.", error);
      return;
    }

    audioContext.resume().then(playJumpTone).catch((error) => {
      console.error("No se pudo reproducir el sonido del salto.", error);
    });
  };

  const jumpSheep = () => {
    if (!gameRunning || sheep.y < groundY - sheepSize) return;
    sheep.velocity = -650;
    playJumpSound();
  };

  const resizeGameCanvas = () => {
    const canvasWidth = window.matchMedia("(max-width: 680px)").matches
      ? Math.max(540, Math.min(900, Math.round(gameCanvas.clientWidth * 1.5)))
      : 900;
    if (gameCanvas.width === canvasWidth) return;
    const scale = canvasWidth / gameCanvas.width;
    gameCanvas.width = canvasWidth;
    obstacles.forEach((obstacle) => { obstacle.x *= scale; });
    nextObstacleX *= scale;
    if (gameRunning) drawScene(0);
  };

  const drawLaptop = (obstacle) => {
    const { x, y } = obstacle;
    context.fillStyle = "#d8d8d8";
    context.beginPath();
    context.roundRect(x + 7, y, 54, 39, 4);
    context.fill();
    context.fillStyle = "#292929";
    context.beginPath();
    context.roundRect(x + 11, y + 4, 46, 31, 2);
    context.fill();
    context.fillStyle = "#bdbdbd";
    context.beginPath();
    context.moveTo(x, y + 41);
    context.lineTo(x + 68, y + 41);
    context.lineTo(x + 61, y + 47);
    context.lineTo(x + 6, y + 47);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(255,255,255,.7)";
    context.fillRect(x + 20, y + 16, 29, 2);
    obstacle.width = 68;
    obstacle.height = 47;
  };

  const drawPhone = (obstacle) => {
    const { x, y } = obstacle;
    context.fillStyle = "#e5e5e5";
    context.beginPath();
    context.roundRect(x + 5, y, 31, 67, 8);
    context.fill();
    context.fillStyle = "#303030";
    context.beginPath();
    context.roundRect(x + 8, y + 4, 25, 59, 6);
    context.fill();
    context.fillStyle = "#f4f4f4";
    context.beginPath();
    context.arc(x + 20, y + 31, 5, 0, Math.PI * 2);
    context.fill();
    obstacle.width = 41;
    obstacle.height = 67;
  };

  const drawHeadphones = (obstacle) => {
    const { x, y } = obstacle;
    context.strokeStyle = "#dedede";
    context.lineWidth = 9;
    context.beginPath();
    context.arc(x + 34, y + 30, 25, Math.PI, 0);
    context.stroke();
    context.fillStyle = "#bdbdbd";
    context.beginPath();
    context.roundRect(x + 2, y + 26, 15, 29, 6);
    context.roundRect(x + 51, y + 26, 15, 29, 6);
    context.fill();
    obstacle.width = 68;
    obstacle.height = 55;
  };

  const drawObstacle = (obstacle) => {
    const dimensions = obstacle.type === "phone"
      ? { width: 41, height: 67 }
      : { width: 68, height: obstacle.type === "laptop" ? 47 : 55 };

    obstacle.width = dimensions.width;
    obstacle.height = dimensions.height;
    obstacle.y = groundY - dimensions.height;

    if (obstacle.type === "laptop") drawLaptop(obstacle);
    else if (obstacle.type === "phone") drawPhone(obstacle);
    else drawHeadphones(obstacle);
  };

  const drawScene = (timestamp) => {
    const { width, height } = gameCanvas;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#151515";
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(width * 0.26, groundY, 8, width * 0.26, groundY, 290);
    glow.addColorStop(0, "rgba(220,220,220,.13)");
    glow.addColorStop(1, "rgba(220,220,220,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(235,235,235,.16)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, groundY + 1);
    context.lineTo(width, groundY + 1);
    context.stroke();

    context.strokeStyle = "rgba(235,235,235,.25)";
    context.setLineDash([18, 19]);
    context.lineDashOffset = -(distance % 37);
    context.beginPath();
    context.moveTo(0, groundY + 19);
    context.lineTo(width, groundY + 19);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "rgba(245,245,245,.56)";
    context.font = "600 12px Segoe UI, sans-serif";
    context.fillText("SHEEP STORE RUN", 26, 35);
    context.textAlign = "right";
    context.fillStyle = "rgba(245,245,245,.82)";
    context.fillText(`PUNTOS ${Math.floor(distance / 10)}`, width - 26, 35);
    context.textAlign = "left";

    obstacles.forEach(drawObstacle);

    const airborne = sheep.y < groundY - sheepSize;
    const runCycle = Math.sin(timestamp * 0.018) * (airborne ? 0.06 : 1);
    context.fillStyle = "rgba(0,0,0,.35)";
    context.beginPath();
    context.ellipse(sheepX + sheepSize / 2, groundY + 5, airborne ? 23 : 29 + Math.abs(runCycle) * 3, 5, 0, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.translate(sheepX + sheepSize / 2, sheep.y + sheepSize / 2);
    context.rotate(airborne ? -0.07 : runCycle * 0.035);
    context.beginPath();
    context.arc(0, 0, sheepSize / 2, 0, Math.PI * 2);
    context.fillStyle = "#fff";
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = "#dedede";
    context.stroke();
    context.save();
    context.beginPath();
    context.arc(0, 0, sheepSize / 2 - 3, 0, Math.PI * 2);
    context.clip();
    context.drawImage(sheepImage, -sheepSize / 2 + 2, -sheepSize / 2 + 2, sheepSize - 4, sheepSize - 4);
    context.restore();
    context.restore();
  };

  const endGame = () => {
    gameRunning = false;
    gameStatus.textContent = `¡Buen intento! Conseguí ${Math.floor(distance / 10)} puntos.`;
    gameRestart.hidden = false;
    gameCanvas.setAttribute("aria-label", `Fin del juego. Puntuación: ${Math.floor(distance / 10)} puntos.`);
  };

  const runGameFrame = (timestamp) => {
    gameFrame = 0;
    if (!gameRunning || !gameDialog.open) return;

    const delta = previousFrame ? Math.min((timestamp - previousFrame) / 1000, 0.04) : 0;
    previousFrame = timestamp;
    distance += speed * delta * 0.12;
    speed = Math.min(speed + delta * 4, 560);
    sheep.velocity += 1750 * delta;
    sheep.y = Math.min(sheep.y + sheep.velocity * delta, groundY - sheepSize);

    if (sheep.y === groundY - sheepSize) sheep.velocity = 0;

    obstacles.forEach((obstacle) => { obstacle.x -= speed * delta; });
    while (obstacles.length && obstacles[0].x + obstacles[0].width < 0) obstacles.shift();

    if (!obstacles.length || obstacles[obstacles.length - 1].x < nextObstacleX - 390) {
      const type = ["laptop", "phone", "headphones"][Math.floor(Math.random() * 3)];
      const dimensions = type === "phone" ? { width: 41, height: 67 } : { width: 68, height: type === "laptop" ? 47 : 55 };
      obstacles.push({ type, x: nextObstacleX, y: groundY - dimensions.height, ...dimensions });
      nextObstacleX += 390 + Math.random() * 250;
    }

    const sheepHitbox = { x: sheepX + 13, y: sheep.y + 9, width: sheepSize - 24, height: sheepSize - 15 };
    const hasCollision = obstacles.some((obstacle) => {
      const obstacleHitbox = { x: obstacle.x + 5, y: obstacle.y + 4, width: obstacle.width - 10, height: obstacle.height - 4 };
      return sheepHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
        sheepHitbox.x + sheepHitbox.width > obstacleHitbox.x &&
        sheepHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
        sheepHitbox.y + sheepHitbox.height > obstacleHitbox.y;
    });

    gameScoreLabel.textContent = String(Math.floor(distance / 10));
    drawScene(timestamp);

    if (hasCollision) {
      endGame();
      return;
    }

    gameFrame = window.requestAnimationFrame(runGameFrame);
  };

  const startGame = () => {
    if (gameFrame) window.cancelAnimationFrame(gameFrame);
    resizeGameCanvas();
    gameRunning = true;
    previousFrame = 0;
    distance = 0;
    speed = 365;
    nextObstacleX = gameCanvas.width + 80;
    sheep.y = groundY - sheepSize;
    sheep.velocity = 0;
    obstacles.length = 0;
    gameStatus.textContent = "¡A correr! Salta los equipos.";
    gameScoreLabel.textContent = "0";
    gameRestart.hidden = true;
    gameCanvas.setAttribute("aria-label", "Juego de carrera en curso. Pulsa espacio o la flecha arriba para saltar.");
    drawScene(0);
    gameFrame = window.requestAnimationFrame(runGameFrame);
  };

  const openGame = (message = "") => {
    gameLaunchStatus.textContent = "";
    gameLaunchStatus.classList.remove("is-visible");
    if (!gameDialog.open) gameDialog.showModal();
    startGame();
    if (message) gameStatus.textContent = message;
    gameCanvas.focus();
  };

  const launchGame = async () => {
    if (launchPending || gameDialog.open) return;

    launchPending = true;
    gameLaunchStatus.textContent = "Escuchando el balido de la oveja...";
    gameLaunchStatus.classList.remove("is-visible");

    try {
      if (typeof AudioContextConstructor !== "function") {
        throw new Error("Este navegador no admite Web Audio.");
      }

      if (!audioContext) audioContext = new AudioContextConstructor();
      await audioContext.resume();

      if (!bleatBuffer) {
        const response = await fetch(gameAudioUrl);
        if (!response.ok) {
          throw new Error(`No se pudo cargar el audio de la oveja (${response.status}).`);
        }
        bleatBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
      }

      if (!launchPending) return;

      const source = audioContext.createBufferSource();
      const volume = audioContext.createGain();
      source.buffer = bleatBuffer;
      volume.gain.value = 2.2;
      source.connect(volume);
      volume.connect(audioContext.destination);
      source.addEventListener("ended", () => {
        if (!launchPending) return;
        launchPending = false;
        openGame();
      }, { once: true });
      source.start();
    } catch (error) {
      launchPending = false;
      console.error("No se pudo preparar o reproducir el balido de la oveja.", error);
      openGame("Audio no disponible. Comprueba que assets/audio/sheep-bleat.mp3 esté publicado; puedes jugar sin sonido.");
    }
  };

  gameLaunchers.forEach((launcher) => launcher.addEventListener("click", launchGame));
  window.addEventListener("resize", () => {
    if (gameDialog.open) resizeGameCanvas();
  });

  gameCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jumpSheep();
  });
  gameJump.addEventListener("click", jumpSheep);

  document.addEventListener("keydown", (event) => {
    if (!gameDialog.open || !["Space", "ArrowUp"].includes(event.code)) return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    event.preventDefault();
    jumpSheep();
  });

  updateGameSoundToggle();
  gameSoundToggle.addEventListener("click", () => {
    jumpSoundEnabled = !jumpSoundEnabled;
    updateGameSoundToggle();
  });

  gameRestart.addEventListener("click", startGame);
  gameClose.addEventListener("click", () => gameDialog.close());
  gameDialog.addEventListener("close", () => {
    gameRunning = false;
    if (gameFrame) window.cancelAnimationFrame(gameFrame);
    gameFrame = 0;
  });

  if (new URLSearchParams(window.location.search).get("play") === "game") {
    openGame("¡A correr! Pulsa espacio, ↑ o toca para saltar.");
  }
}

categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedCategory = tab.dataset.filter;
    window.clearTimeout(categoryMarqueeResumeTimer);
    if (
      categoryMarquee instanceof HTMLElement &&
      categoryMarquee.classList.contains("is-animated")
    ) categoryMarqueeOffset = readAnimatedCategoryOffset();
    selectedCategoryFilter = selectedCategory;

    categoryTabs.forEach((categoryTab) => {
      const isSelected = categoryTab === tab;
      categoryTab.classList.toggle("is-active", isSelected);
      categoryTab.setAttribute("aria-pressed", String(isSelected));
    });

    document.querySelectorAll(".product-marquee-group .product-card").forEach((card) => {
      card.hidden = selectedCategory !== "todos" && card.dataset.category !== selectedCategory;
    });

    if (categoryMarquee instanceof HTMLElement && categoryMarqueeCopy instanceof HTMLElement) {
      if (selectedCategory === "todos") {
        if (categoryMarquee.classList.contains("is-manual")) {
          categoryMarquee.scrollLeft = categoryMarqueeOffset;
          resumeCategoryAnimation();
        } else {
          categoryMarqueeCopy.hidden = false;
          categoryMarquee.classList.add("is-animated");
        }
      } else {
        categoryMarquee.classList.remove("is-animated", "is-dragging");
        categoryMarquee.classList.add("is-manual");
        categoryMarquee.scrollLeft = 0;
        categoryMarqueeCopy.hidden = true;
      }
    }

  });
});

const gameCategoryLink = document.querySelector("[data-game-category-link]");
const gameCategoryTab = document.querySelector('.category-tab[data-filter="juegos"]');

if (gameCategoryLink instanceof HTMLAnchorElement && gameCategoryTab instanceof HTMLButtonElement) {
  const gameStoreDialog = document.querySelector("#game-store-dialog");
  const gameStoreClose = document.querySelector(".game-store-window-close");
  const openGameStore = () => {
    if (gameStoreDialog instanceof HTMLDialogElement && !gameStoreDialog.open) {
      gameStoreDialog.showModal();
    }
  };

  gameCategoryLink.addEventListener("click", () => {
    gameCategoryTab.click();
    openGameStore();
  });
  document.querySelectorAll("[data-open-game-store]").forEach((button) => {
    button.addEventListener("click", openGameStore);
  });
  if (gameStoreDialog instanceof HTMLDialogElement && gameStoreClose instanceof HTMLButtonElement) {
    gameStoreClose.addEventListener("click", () => gameStoreDialog.close());
    gameStoreDialog.addEventListener("click", (event) => {
      if (event.target === gameStoreDialog) gameStoreDialog.close();
    });
  }
}

const programsDialog = document.querySelector("#programs-dialog");
const programsFolderButtons = document.querySelectorAll("[aria-controls='programs-dialog']");
const programsDialogClose = document.querySelector(".programs-close");

if (
  programsDialog instanceof HTMLDialogElement &&
  programsFolderButtons.length &&
  programsDialogClose instanceof HTMLButtonElement
) {
  programsFolderButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!programsDialog.open) programsDialog.showModal();
    });
  });

  programsDialogClose.addEventListener("click", () => programsDialog.close());
  programsDialog.addEventListener("click", (event) => {
    if (event.target === programsDialog) programsDialog.close();
  });
}

const storeDialog = document.querySelector("#store-dialog");
const storeOpenButtons = document.querySelectorAll("[data-open-store]");
const storeCloseButton = document.querySelector(".store-close");
const storeFilters = document.querySelectorAll("[data-store-filter]");
const storeCategoryFilters = document.querySelectorAll("[data-store-category-filter]");
const storeDistributionFilters = document.querySelectorAll("[data-store-distribution-filter]");
const storeDistributionGroup = document.querySelector(".store-distribution-filters");
const storeProducts = document.querySelectorAll(".store-product-card");
const storeCartItems = document.querySelector("#store-cart-items");
const storeCartCount = document.querySelector("#store-cart-count");
const storeCartEmpty = document.querySelector("#store-cart-empty");
const storeCartTotal = document.querySelector("#store-cart-total");
const storeEmptyState = document.querySelector("#store-empty-state");
const storeEmailOrder = document.querySelector("#store-email-order");
const storeWhatsAppOrder = document.querySelector("#store-whatsapp-order");
const storeStatus = document.querySelector("#store-status");
const officeConfigDialog = document.querySelector("#office-config-dialog");

if (
  storeDialog instanceof HTMLDialogElement &&
  officeConfigDialog instanceof HTMLDialogElement &&
  storeCloseButton instanceof HTMLButtonElement &&
  storeCartItems instanceof HTMLUListElement &&
  storeCartCount instanceof HTMLElement &&
  storeCartEmpty instanceof HTMLElement &&
  storeCartTotal instanceof HTMLElement &&
  storeEmptyState instanceof HTMLElement &&
  storeEmailOrder instanceof HTMLAnchorElement &&
  storeWhatsAppOrder instanceof HTMLAnchorElement &&
  storeStatus instanceof HTMLElement
) {
  const cart = new Map();
  const orderEmail = "ovejanegraservices@gmail.com";
  const orderWhatsApp = "51938717659";
  const officePrices = {
    "sheep-office-i3": {
      "8": { hdd500: 400, ssd240: 450 },
      "12": { hdd500: 450, ssd240: 500 },
      "16": { hdd500: 500, ssd240: 550 },
    },
    "sheep-office-i5": {
      "8": { hdd500: 450, ssd240: 500 },
      "12": { hdd500: 500, ssd240: 550 },
      "16": { hdd500: 550, ssd240: 600 },
    },
    "sheep-office-i7": {
      "8": { hdd500: 550, ssd240: 600 },
      "12": { hdd500: 600, ssd240: 650 },
      "16": { hdd500: 650, ssd240: 700 },
    },
  };
  const storageDescriptions = {
    hdd500: "500 GB HDD mecánico",
    ssd240: "240 GB SSD sólido alta velocidad",
  };
  const officeProductNames = {
    "sheep-office-i3": "Core i3 tercera generación",
    "sheep-office-i5": "Core i5 tercera generación",
    "sheep-office-i7": "Core i7 tercera generación",
  };
  const officeProductDescriptions = {
    "sheep-office-i3": "Para ofimática, navegación, clases y tareas diarias. Con gráficos integrados compatibles.",
    "sheep-office-i5": "Para ofimática, estudio, navegación y multitarea moderada. Con gráficos integrados compatibles.",
    "sheep-office-i7": "Para multitarea, trabajo y aplicaciones de oficina exigentes. Con gráficos integrados compatibles.",
  };
  let selectedOfficeProduct = null;
  let selectedOfficeRam = "8";
  let selectedOfficeStorage = "hdd500";
  let selectedCategory = "todos";
  let selectedDistribution = "todos";
  let selectedCondition = "todos";
  const formatPrice = (price) => `S/ ${price.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

  const updateStoreProducts = () => {
    let visibleCount = 0;
    storeProducts.forEach((product) => {
      const matchesCategory = selectedCategory === "todos" || product.dataset.storeCategory === selectedCategory;
      const matchesDistribution = selectedCategory !== "computacion" ||
        selectedDistribution === "todos" ||
        product.dataset.storeCategory !== "computacion" ||
        product.dataset.storeDistribution === selectedDistribution;
      const matchesCondition = selectedCondition === "todos" || product.dataset.storeCondition === selectedCondition;
      product.hidden = !matchesCategory || !matchesDistribution || !matchesCondition;
      if (!product.hidden) visibleCount += 1;
    });
    storeEmptyState.hidden = visibleCount > 0;
    if (visibleCount === 0) {
      if (selectedCategory === "laptops") {
        storeEmptyState.textContent = "Aún no has agregado laptops al catálogo.";
      } else if (selectedCategory === "accesorios") {
        storeEmptyState.textContent = "Aún no has agregado accesorios al catálogo.";
      } else if (selectedCategory === "computacion" && selectedDistribution === "gamer") {
        storeEmptyState.textContent = "Aún no has agregado PC Gamer al catálogo.";
      } else if (selectedCondition === "segunda-mano") {
        storeEmptyState.textContent = "Aún no has agregado productos de segunda mano.";
      } else {
        storeEmptyState.textContent = "No hay productos para esta selección.";
      }
    }
  };

  const selectStoreDistribution = (distribution) => {
    selectedDistribution = distribution;
    storeDistributionFilters.forEach((button) => {
      const isSelected = button.dataset.storeDistributionFilter === selectedDistribution;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    updateStoreProducts();
  };

  const selectStoreCategory = (category) => {
    selectedCategory = category;
    storeCategoryFilters.forEach((button) => {
      const isSelected = button.dataset.storeCategoryFilter === selectedCategory;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    if (storeDistributionGroup instanceof HTMLElement) {
      storeDistributionGroup.hidden = selectedCategory !== "computacion";
    }
    selectStoreDistribution("todos");
    updateStoreProducts();
  };

  const selectStoreCondition = (condition) => {
    selectedCondition = condition;
    storeFilters.forEach((button) => {
      const isSelected = button.dataset.storeFilter === selectedCondition;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    updateStoreProducts();
  };

  const officeConfigTitle = officeConfigDialog.querySelector("#office-config-title");
  const officeConfigDescription = officeConfigDialog.querySelector("#office-config-description");
  const officeConfigPrice = officeConfigDialog.querySelector("#office-config-price");
  const officeConfigSummary = officeConfigDialog.querySelector("#office-config-summary-text");
  const updateOfficeConfiguration = () => {
    if (
      !selectedOfficeProduct ||
      !(officeConfigTitle instanceof HTMLElement) ||
      !(officeConfigDescription instanceof HTMLElement) ||
      !(officeConfigPrice instanceof HTMLElement) ||
      !(officeConfigSummary instanceof HTMLElement)
    ) {
      console.error("No se pudo actualizar la configuración de la PC de oficina.");
      return null;
    }

    const productName = officeProductNames[selectedOfficeProduct];
    const productDescription = officeProductDescriptions[selectedOfficeProduct];
    const price = officePrices[selectedOfficeProduct]?.[selectedOfficeRam]?.[selectedOfficeStorage];
    const storageDescription = storageDescriptions[selectedOfficeStorage];
    if (!productName || !productDescription || !Number.isSafeInteger(price) || !storageDescription) {
      console.error("No se encontró el precio para la configuración seleccionada.");
      return null;
    }

    officeConfigTitle.textContent = productName;
    officeConfigDescription.textContent = productDescription;
    officeConfigPrice.textContent = formatPrice(price);
    officeConfigSummary.textContent = `${productName.replace(" tercera generación", "")} · ${selectedOfficeRam} GB RAM · ${storageDescription}`;
    return { productId: selectedOfficeProduct, productName, ram: selectedOfficeRam, storage: selectedOfficeStorage, price, storageDescription };
  };

  const addCartItem = (id, name, price) => {
    if (!id || !name || !Number.isFinite(price) || price < 0) {
      console.error("No se pudo agregar el producto: faltan datos válidos.");
      return false;
    }
    const existing = cart.get(id);
    if (existing) {
      if (existing.quantity >= 99) {
        storeStatus.textContent = `El máximo para ${name} es 99 unidades.`;
        return false;
      }
      existing.quantity += 1;
    }
    else cart.set(id, { name, price, quantity: 1 });
    renderCart();
    storeStatus.textContent = `${name} agregado al carrito.`;
    return true;
  };

  const downloadOrderPdf = async () => {
    const pdfText = (value) => value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[×·]/g, "-")
      .replace(/[–—]/g, "-")
      .replace(/[^\x20-\x7e]/g, "?");
    const escapePdfText = (value) => pdfText(value).replace(/([\\()])/g, "\\$1");
    const wrapPdfLine = (line, maxLength = 84) => {
      const words = pdfText(line).split(/\s+/);
      const wrapped = [];
      let current = "";
      words.forEach((word) => {
        if (current && `${current} ${word}`.length > maxLength) {
          wrapped.push(current);
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      });
      if (current) wrapped.push(current);
      return wrapped;
    };

    const letterhead = new Image();
    letterhead.src = new URL("assets/sheep-store-letterhead.png", document.baseURI).href;
    await letterhead.decode();

    const canvas = document.createElement("canvas");
    canvas.width = letterhead.naturalWidth;
    canvas.height = letterhead.naturalHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("No se pudo preparar la hoja membretada.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(letterhead, 0, 0);

    const jpegBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo convertir la hoja membretada."));
      }, "image/jpeg", 0.9);
    });
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

    let total = 0;
    const lines = [];
    cart.forEach((item) => {
      total += item.price * item.quantity;
      wrapPdfLine(item.name, 78).forEach((line, index) => {
        lines.push({ text: line, bold: index === 0, size: 10, indent: 0 });
      });
      wrapPdfLine(`Cantidad: ${item.quantity} | Precio unitario: ${formatPrice(item.price)} | Importe: ${formatPrice(item.price * item.quantity)}`, 78)
        .forEach((line) => lines.push({ text: line, bold: false, size: 9, indent: 12 }));
      lines.push({ text: "", bold: false, size: 9, indent: 0 });
    });

    [
      { text: `SUBTOTAL REFERENCIAL: ${formatPrice(total)}`, bold: true, size: 11, indent: 0 },
      { text: "", bold: false, size: 9, indent: 0 },
      { text: "DATOS DEL CLIENTE (completar al enviar el pedido)", bold: true, size: 10, indent: 0 },
      { text: "Nombre:", bold: false, size: 9, indent: 0 },
      { text: "Telefono:", bold: false, size: 9, indent: 0 },
      { text: "Direccion o forma de entrega:", bold: false, size: 9, indent: 0 },
      { text: "", bold: false, size: 9, indent: 0 },
      { text: "Pedido sujeto a confirmacion de disponibilidad. No es comprobante de pago.", bold: false, size: 8, indent: 0 },
    ].forEach((line) => lines.push(line));

    const pageLines = [[]];
    let pageContentHeight = 0;
    lines.forEach((line) => {
      const lineHeight = line.text ? 13 : 7;
      if (pageContentHeight + lineHeight > 360) {
        pageLines.push([]);
        pageContentHeight = 0;
      }
      pageLines[pageLines.length - 1].push(line);
      pageContentHeight += lineHeight;
    });

    const encoder = new TextEncoder();
    const parts = [];
    const offsets = [0];
    let byteLength = 0;
    const appendBytes = (bytes) => {
      parts.push(bytes);
      byteLength += bytes.length;
    };
    const appendText = (text) => appendBytes(encoder.encode(text));
    const writeObject = (id, chunks) => {
      offsets[id] = byteLength;
      appendText(`${id} 0 obj\n`);
      chunks.forEach((chunk) => {
        if (typeof chunk === "string") appendText(chunk);
        else appendBytes(chunk);
      });
      appendText("\nendobj\n");
    };

    appendText("%PDF-1.4\n");
    writeObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
    writeObject(2, [`<< /Type /Pages /Kids [${pageLines.map((_, index) => `${6 + index * 2} 0 R`).join(" ")}] /Count ${pageLines.length} >>`]);
    writeObject(3, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]);
    writeObject(4, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"]);
    writeObject(5, [
      `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
      jpegBytes,
      "\nendstream",
    ]);

    pageLines.forEach((page, index) => {
      const pageObjectId = 6 + index * 2;
      const contentObjectId = pageObjectId + 1;
      const textCommands = [
        "BT /F2 15 Tf 0.12 0.12 0.12 rg 55 650 Td (RESUMEN DE PEDIDO) Tj ET",
        `BT /F1 9 Tf 0.28 0.28 0.28 rg 55 633 Td (Fecha: ${escapePdfText(new Date().toLocaleString("es-PE"))}) Tj ET`,
      ];
      if (index === 0) {
        textCommands.push(`BT /F1 9 Tf 0.28 0.28 0.28 rg 55 620 Td (Contacto: ${escapePdfText(orderEmail)}) Tj ET`);
      } else {
        textCommands.push(`BT /F1 9 Tf 0.28 0.28 0.28 rg 55 620 Td (Continuacion del pedido - pagina ${index + 1}) Tj ET`);
      }
      textCommands.push("0.72 G 0.6 w 55 607 m 540 607 l S");

      let y = 575;
      page.forEach((line) => {
        if (line.text) {
          const font = line.bold ? "F2" : "F1";
          const color = line.bold ? "0.12 0.12 0.12" : "0.25 0.25 0.25";
          textCommands.push(
            `BT /${font} ${line.size} Tf ${color} rg ${55 + line.indent} ${y} Td (${escapePdfText(line.text)}) Tj ET`
          );
        }
        y -= line.text ? 13 : 7;
      });

      const stream = encoder.encode([
        "q 595 0 0 842 0 0 cm /Letterhead Do Q",
        ...textCommands,
      ].join("\n"));
      writeObject(pageObjectId, [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Letterhead 5 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      ]);
      writeObject(contentObjectId, [
        `<< /Length ${stream.length} >>\nstream\n`,
        stream,
        "\nendstream",
      ]);
    });

    const xrefOffset = byteLength;
    const objectCount = offsets.length - 1;
    appendText(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
    offsets.slice(1).forEach((offset) => {
      appendText(`${String(offset).padStart(10, "0")} 00000 n \n`);
    });
    appendText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    const blob = new Blob(parts, { type: "application/pdf" });
    const downloadLink = document.createElement("a");
    const fileDate = new Date().toISOString().slice(0, 10);
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `sheep-store-pedido-${fileDate}.pdf`;
    downloadLink.hidden = true;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadLink.href), 1000);
  };

  const renderCart = () => {
    storeCartItems.replaceChildren();
    let itemCount = 0;
    let total = 0;

    cart.forEach((item, id) => {
      itemCount += item.quantity;
      total += item.price * item.quantity;

      const row = document.createElement("li");
      row.className = "store-cart-item";
      const details = document.createElement("div");
      const name = document.createElement("strong");
      const quantityControls = document.createElement("div");
      const decreaseButton = document.createElement("button");
      const quantity = document.createElement("span");
      const increaseButton = document.createElement("button");
      const unitPrice = document.createElement("small");
      const lineTotal = document.createElement("span");
      const removeButton = document.createElement("button");

      name.textContent = item.name;
      quantityControls.className = "store-cart-quantity";
      decreaseButton.className = "store-cart-quantity-button";
      decreaseButton.type = "button";
      decreaseButton.dataset.cartQuantity = "decrease";
      decreaseButton.dataset.cartId = id;
      decreaseButton.disabled = item.quantity <= 1;
      decreaseButton.setAttribute("aria-label", `Disminuir cantidad de ${item.name}`);
      decreaseButton.textContent = "−";
      quantity.className = "store-cart-quantity-value";
      quantity.textContent = String(item.quantity);
      quantity.setAttribute("aria-label", `Cantidad: ${item.quantity}`);
      increaseButton.className = "store-cart-quantity-button";
      increaseButton.type = "button";
      increaseButton.dataset.cartQuantity = "increase";
      increaseButton.dataset.cartId = id;
      increaseButton.disabled = item.quantity >= 99;
      increaseButton.setAttribute("aria-label", `Aumentar cantidad de ${item.name}`);
      increaseButton.textContent = "+";
      quantityControls.append(decreaseButton, quantity, increaseButton);
      unitPrice.className = "store-cart-unit-price";
      unitPrice.textContent = `${formatPrice(item.price)} por unidad`;
      details.className = "store-cart-item-details";
      details.append(name, quantityControls, unitPrice);
      lineTotal.className = "store-cart-line-total";
      lineTotal.textContent = formatPrice(item.price * item.quantity);
      removeButton.className = "store-cart-remove";
      removeButton.type = "button";
      removeButton.dataset.cartRemove = id;
      removeButton.setAttribute("aria-label", `Quitar ${item.name} del carrito`);
      removeButton.textContent = "×";
      row.append(details, lineTotal, removeButton);
      storeCartItems.append(row);
    });

    storeCartCount.textContent = String(itemCount);
    storeCartCount.setAttribute("aria-label", `${itemCount} ${itemCount === 1 ? "producto" : "productos"}`);
    storeCartEmpty.hidden = itemCount > 0;
    storeCartTotal.textContent = formatPrice(total);
    if (itemCount === 0) {
      [storeEmailOrder, storeWhatsAppOrder].forEach((link) => {
        link.href = "#";
        link.setAttribute("aria-disabled", "true");
        link.tabIndex = -1;
      });
      return;
    }

    const orderLines = Array.from(cart.values(), (item) =>
      `- ${item.name} | Cantidad: ${item.quantity} | Precio unitario: ${formatPrice(item.price)} | Importe: ${formatPrice(item.price * item.quantity)}`
    );
    const subject = "Pedido de Sheep Store";
    const body = [
      "Hola Sheep Store, quisiera realizar este pedido:",
      "",
      ...orderLines,
      "",
      `Subtotal referencial: ${formatPrice(total)}`,
      "",
      "Mis datos:",
      "Nombre:",
      "Teléfono:",
      "Dirección o forma de entrega:",
      "",
      "Entiendo que los precios son referenciales y que debo confirmar disponibilidad.",
    ].join("\n");
    storeEmailOrder.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(orderEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    storeWhatsAppOrder.href = `https://wa.me/${orderWhatsApp}?text=${encodeURIComponent(body)}`;
    [storeEmailOrder, storeWhatsAppOrder].forEach((link) => {
      link.setAttribute("aria-disabled", "false");
      link.removeAttribute("tabindex");
    });
  };

  storeOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.storeCategory;
      if (category && ["computacion", "laptops", "accesorios"].includes(category)) {
        selectStoreCategory(category);
        selectStoreCondition("todos");
      }
      if (!storeDialog.open) storeDialog.showModal();
    });
  });

  storeCloseButton.addEventListener("click", () => storeDialog.close());
  storeDialog.addEventListener("click", (event) => {
    if (event.target === storeDialog) storeDialog.close();
  });

  [storeEmailOrder, storeWhatsAppOrder].forEach((link) => link.addEventListener("click", (event) => {
    if (cart.size > 0) return;
    event.preventDefault();
    storeStatus.textContent = "Agrega al menos un producto antes de preparar el pedido.";
  }));

  [storeEmailOrder, storeWhatsAppOrder].forEach((link) => link.addEventListener("click", async () => {
    if (cart.size === 0) return;
    try {
      await downloadOrderPdf();
      storeStatus.textContent = "Se descargó el resumen PDF y se abrió el pedido para enviar.";
    } catch (error) {
      console.error("No se pudo generar el PDF del pedido.", error);
      storeStatus.textContent = "No se pudo descargar el PDF. El pedido se abrirá para que puedas enviarlo igualmente.";
    }
  }));

  storeFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const condition = filter.dataset.storeFilter;
      if (!condition || !["todos", "nuevo", "segunda-mano"].includes(condition)) return;

      selectStoreCondition(condition);
    });
  });

  storeDistributionFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const distribution = filter.dataset.storeDistributionFilter;
      if (!distribution || !["todos", "gamer", "oficina"].includes(distribution)) return;
      selectStoreDistribution(distribution);
    });
  });

  storeCategoryFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const category = filter.dataset.storeCategoryFilter;
      if (!category || !["todos", "computacion", "laptops", "accesorios"].includes(category)) return;
      selectStoreCategory(category);
    });
  });

  storeDialog.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const configureButton = event.target.closest("[data-configure-office]");
    if (configureButton instanceof HTMLButtonElement) {
      const productId = configureButton.dataset.configureOffice;
      if (!productId || !officePrices[productId] || !officeProductNames[productId]) {
        console.error("No se pudo abrir la configuración: no se encontró el modelo de PC.");
        return;
      }
      selectedOfficeProduct = productId;
      selectedOfficeRam = "8";
      selectedOfficeStorage = "hdd500";
      officeConfigDialog.querySelectorAll("[data-config-ram-option]").forEach((option) => {
        const isSelected = option instanceof HTMLButtonElement && option.dataset.configRamOption === selectedOfficeRam;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
      });
      officeConfigDialog.querySelectorAll("[data-config-storage-option]").forEach((option) => {
        const isSelected = option instanceof HTMLButtonElement && option.dataset.configStorageOption === selectedOfficeStorage;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
      });
      updateOfficeConfiguration();
      officeConfigDialog.showModal();
      return;
    }

    const addButton = event.target.closest("[data-add-to-cart]");
    if (addButton instanceof HTMLButtonElement) {
      const product = addButton.closest(".store-product-card");
      if (!(product instanceof HTMLElement)) {
        console.error("No se pudo agregar el producto porque no se encontró su ficha.");
        return;
      }

      const { productId, productName } = product.dataset;
      if (!productId || !productName) {
        console.error("No se pudo agregar el producto: faltan el identificador o el nombre.");
        return;
      }
      addCartItem(productId, productName, Number(product.dataset.productPrice));
      return;
    }

    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton instanceof HTMLButtonElement) {
      const id = removeButton.dataset.cartRemove;
      const item = id ? cart.get(id) : undefined;
      if (!id || !item) return;
      cart.delete(id);
      renderCart();
      storeStatus.textContent = `${item.name} quitado del carrito.`;
      return;
    }

    const quantityButton = event.target.closest("[data-cart-quantity]");
    if (quantityButton instanceof HTMLButtonElement) {
      const id = quantityButton.dataset.cartId;
      const item = id ? cart.get(id) : undefined;
      const action = quantityButton.dataset.cartQuantity;
      if (!id || !item || !["increase", "decrease"].includes(action)) return;

      if (action === "increase") {
        if (item.quantity >= 99) return;
        item.quantity += 1;
      } else {
        if (item.quantity <= 1) return;
        item.quantity -= 1;
      }

      renderCart();
      storeStatus.textContent = `${item.name}: ${item.quantity} unidades.`;
    }
  });

  officeConfigDialog.addEventListener("click", (event) => {
    if (event.target === officeConfigDialog) {
      officeConfigDialog.close();
      return;
    }
    if (!(event.target instanceof Element)) return;
    const closeButton = event.target.closest(".office-config-close");
    if (closeButton instanceof HTMLButtonElement) {
      officeConfigDialog.close();
      return;
    }
    const ramButton = event.target.closest("[data-config-ram-option]");
    if (ramButton instanceof HTMLButtonElement) {
      selectedOfficeRam = ramButton.dataset.configRamOption || selectedOfficeRam;
      officeConfigDialog.querySelectorAll("[data-config-ram-option]").forEach((option) => {
        const isSelected = option === ramButton;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
      });
      updateOfficeConfiguration();
      return;
    }
    const storageButton = event.target.closest("[data-config-storage-option]");
    if (storageButton instanceof HTMLButtonElement) {
      selectedOfficeStorage = storageButton.dataset.configStorageOption || selectedOfficeStorage;
      officeConfigDialog.querySelectorAll("[data-config-storage-option]").forEach((option) => {
        const isSelected = option === storageButton;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
      });
      updateOfficeConfiguration();
      return;
    }
    const addConfiguredButton = event.target.closest("[data-add-configured-product]");
    if (addConfiguredButton instanceof HTMLButtonElement) {
      const configuration = updateOfficeConfiguration();
      if (!configuration) return;
      const name = `${configuration.productName} · ${configuration.ram} GB RAM · ${configuration.storageDescription} · Fuente 600 W Halion`;
      const added = addCartItem(`${configuration.productId}-${configuration.ram}-${configuration.storage}`, name, configuration.price);
      if (added) officeConfigDialog.close();
    }
  });
}

const servicesDialog = document.querySelector("#services-dialog");
const businessMaintenanceDialog = document.querySelector("#business-maintenance-dialog");
const serviceOpenButtons = document.querySelectorAll("[data-open-services]");
const serviceTabButtons = document.querySelectorAll("[data-service-tab]");
const serviceRepairPanel = document.querySelector("#service-repair-panel");
const serviceMaintenancePanel = document.querySelector("#service-maintenance-panel");
const businessMaintenanceButton = document.querySelector("#open-business-maintenance");
const serviceWhatsApp = "51978561560";
const openServiceWhatsApp = (message) => {
  const url = `https://wa.me/${serviceWhatsApp}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

if (
  servicesDialog instanceof HTMLDialogElement &&
  businessMaintenanceDialog instanceof HTMLDialogElement &&
  serviceRepairPanel instanceof HTMLElement &&
  serviceMaintenancePanel instanceof HTMLElement
) {
  const setServiceView = (view = "") => {
    const showRepair = view === "repair";
    const showMaintenance = view === "maintenance";
    serviceRepairPanel.hidden = !showRepair;
    serviceMaintenancePanel.hidden = !showMaintenance;
    serviceTabButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.serviceTab === view));
    });
  };

  serviceOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setServiceView(button.dataset.serviceView || "");
      if (!servicesDialog.open) servicesDialog.showModal();
    });
  });

  serviceTabButtons.forEach((button) => {
    button.addEventListener("click", () => setServiceView(button.dataset.serviceTab || ""));
  });

  const servicesClose = servicesDialog.querySelector(".services-close");
  servicesClose?.addEventListener("click", () => servicesDialog.close());
  servicesDialog.addEventListener("click", (event) => {
    if (event.target === servicesDialog) servicesDialog.close();
  });

  if (businessMaintenanceButton instanceof HTMLButtonElement) {
    businessMaintenanceButton.addEventListener("click", () => {
      if (!businessMaintenanceDialog.open) businessMaintenanceDialog.showModal();
    });
  }

  const businessMaintenanceClose = businessMaintenanceDialog.querySelector(".business-maintenance-close");
  businessMaintenanceClose?.addEventListener("click", () => businessMaintenanceDialog.close());
  businessMaintenanceDialog.addEventListener("click", (event) => {
    if (event.target === businessMaintenanceDialog) businessMaintenanceDialog.close();
  });

  const repairForm = document.querySelector("#repair-request-form");
  repairForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!(repairForm instanceof HTMLFormElement)) return;
    const formData = new FormData(repairForm);
    const problem = String(formData.get("problema") || "").trim();
    const phone = String(formData.get("telefono") || "").trim();
    const email = String(formData.get("correo_contacto") || "").trim();
    const body = [
      "SOLICITUD DE REPARACIÓN — SHEEP STORE",
      "",
      "Servicio que deseo:",
      problem,
      "",
      `Número de contacto: ${phone}`,
      `Correo electrónico de contacto: ${email}`,
    ].join("\n");
    openServiceWhatsApp(body);
  });

  const maintenanceQuantityInputs = [
    document.querySelector("#maintenance-laptop-quantity"),
    document.querySelector("#maintenance-pc-quantity"),
    document.querySelector("#maintenance-graphics-quantity"),
  ];
  const maintenanceQuantityNames = ["laptops", "pc", "graficas"];
  const maintenanceTotal = document.querySelector("#maintenance-total");
  const maintenancePrices = [100, 100, 75];
  const maintenanceLabels = ["Laptops", "PC", "Tarjetas gráficas"];
  const updateMaintenanceTotal = () => {
    if (
      maintenanceQuantityInputs.some((input) => !(input instanceof HTMLInputElement)) ||
      !maintenanceTotal
    ) return;
    const quantities = maintenanceQuantityInputs.map((input) =>
      input instanceof HTMLInputElement ? Number(input.value) : Number.NaN
    );
    const lineTotals = quantities.map((quantity, index) => quantity * maintenancePrices[index]);
    const total = lineTotals.reduce((sum, lineTotal) => sum + lineTotal, 0);
    maintenanceQuantityInputs.forEach((input, index) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.setCustomValidity(
        Number.isSafeInteger(quantities[index]) && quantities[index] >= 0
          ? ""
          : "Ingresa un número entero igual o mayor que cero."
      );
    });
    maintenanceTotal.textContent = Number.isSafeInteger(total)
      ? `S/ ${total.toLocaleString("es-PE")}`
      : "—";
  };

  maintenanceQuantityInputs.forEach((input) => input?.addEventListener("input", updateMaintenanceTotal));
  updateMaintenanceTotal();

  const maintenanceForm = document.querySelector("#maintenance-request-form");
  maintenanceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!(maintenanceForm instanceof HTMLFormElement)) return;
    const formData = new FormData(maintenanceForm);
    const quantities = maintenanceQuantityNames.map((name) => Number(formData.get(name)));
    const total = quantities.reduce((sum, quantity, index) => sum + quantity * maintenancePrices[index], 0);
    const phone = String(formData.get("telefono") || "").trim();
    const email = String(formData.get("correo_contacto") || "").trim();
    const body = [
      "SOLICITUD DE MANTENIMIENTO PREVENTIVO — SHEEP STORE",
      "",
      "Equipos y servicios solicitados:",
      ...quantities.map((quantity, index) =>
        `${maintenanceLabels[index]}: ${quantity} × S/ ${maintenancePrices[index]} = S/ ${(quantity * maintenancePrices[index]).toLocaleString("es-PE")}`
      ),
      "",
      `Total estimado: S/ ${total.toLocaleString("es-PE")}`,
      "",
      `Número de contacto: ${phone}`,
      `Correo electrónico de contacto: ${email}`,
    ].join("\n");
    openServiceWhatsApp(body);
  });

  const businessMaintenanceForm = document.querySelector("#business-maintenance-form");
  const businessPlan = document.querySelector("#business-plan");
  const businessQuantity = document.querySelector("#business-quantity");
  const businessPriceQuote = document.querySelector("#business-price-quote");
  const businessPlanPrices = {
    Trimestral: [450, 850, 1200, 1900],
    Semestral: [850, 1600, 2300, 3600],
    Anual: [1600, 3000, 4300, 6800],
  };
  const businessPlanFeatures = {
    Trimestral: [
      "1 mantenimiento preventivo por equipo",
      "Limpieza interna y externa",
      "Limpieza de ventiladores y sistema de refrigeración",
      "Revisión de temperaturas",
      "Optimización de Windows",
      "Informe técnico por equipo",
    ],
    Semestral: [
      "2 mantenimientos preventivos por equipo",
      "Limpieza interna y externa",
      "Limpieza de ventiladores y sistema de refrigeración",
      "Revisión de temperaturas",
      "Optimización de Windows",
      "Informe técnico por equipo",
      "Seguimiento del estado de los equipos",
    ],
    Anual: [
      "4 mantenimientos preventivos por equipo",
      "Limpieza interna y externa",
      "Limpieza de ventiladores y sistema de refrigeración",
      "Revisión de temperaturas",
      "Optimización de Windows",
      "Informe técnico por equipo",
      "Prioridad de atención técnica",
      "Historial técnico de los equipos",
      "Reporte anual del estado del parque informático",
    ],
  };
  const businessQuantityRanges = [
    { max: 10, label: "5 a 10 equipos", index: 0 },
    { max: 20, label: "11 a 20 equipos", index: 1 },
    { max: 30, label: "21 a 30 equipos", index: 2 },
    { max: 50, label: "31 a 50 equipos", index: 3 },
  ];
  const updateBusinessQuote = () => {
    if (
      !(businessPlan instanceof HTMLSelectElement) ||
      !(businessQuantity instanceof HTMLInputElement) ||
      !businessPriceQuote
    ) return;

    const quantity = Number(businessQuantity.value);
    const range = businessQuantityRanges.find((item) => quantity >= 5 && quantity <= item.max);
    const prices = businessPlanPrices[businessPlan.value];
    businessQuantity.setCustomValidity(
      businessQuantity.value !== "" && Number.isSafeInteger(quantity) && range
        ? ""
        : "Ingresa una cantidad entera entre 5 y 50 equipos."
    );

    if (!businessPlan.value || !range || !prices) {
      businessPriceQuote.textContent = businessQuantity.value && !range
        ? "Los precios disponibles aplican de 5 a 50 equipos."
        : "Selecciona un plan y la cantidad de equipos para ver el precio.";
      return;
    }

    businessPriceQuote.textContent =
      `${range.label} · Plan ${businessPlan.value}: S/ ${prices[range.index].toLocaleString("es-PE")}`;
  };

  businessPlan?.addEventListener("change", updateBusinessQuote);
  businessQuantity?.addEventListener("input", updateBusinessQuote);
  updateBusinessQuote();

  businessMaintenanceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (
      !(businessMaintenanceForm instanceof HTMLFormElement) ||
      !(businessPlan instanceof HTMLSelectElement) ||
      !(businessQuantity instanceof HTMLInputElement)
    ) return;
    const formData = new FormData(businessMaintenanceForm);
    const plan = String(formData.get("plan") || "");
    const quantity = Number(formData.get("cantidad"));
    const range = businessQuantityRanges.find((item) => quantity >= 5 && quantity <= item.max);
    const prices = businessPlanPrices[plan];
    if (!range || !prices) {
      businessPriceQuote?.scrollIntoView({ behavior: "smooth", block: "center" });
      businessPlan.focus();
      return;
    }
    const price = prices[range.index];
    const phone = String(formData.get("telefono") || "").trim();
    const email = String(formData.get("correo_contacto") || "").trim();
    const body = [
      "SOLICITUD DE MANTENIMIENTO PARA EMPRESA — SHEEP STORE",
      "",
      `Plan seleccionado: ${plan}`,
      `Cantidad de equipos: ${quantity} (${range.label})`,
      `Precio del plan seleccionado: S/ ${price.toLocaleString("es-PE")}`,
      "",
      "Características incluidas en el plan:",
      ...businessPlanFeatures[plan].map((feature) => `- ${feature}`),
      "",
      "Lo que solicito: que un asesor se comunique conmigo para coordinar el servicio y el pago del plan.",
      "",
      `Número de contacto: ${phone}`,
      `Correo electrónico de contacto: ${email}`,
    ].join("\n");
    openServiceWhatsApp(body);
  });
}

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}