const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const categoryTabs = document.querySelectorAll(".category-tab");
const productCards = document.querySelectorAll(".product-card");
const currentYear = document.querySelector("#current-year");

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

  wallpaperThumbs.forEach((thumb, index) => {
    thumb.dataset.wallpaperIndex = String(index);
    wallpaperGroup.append(thumb);
  });

  const duplicateGroup = wallpaperGroup.cloneNode(true);
  if (duplicateGroup instanceof HTMLDivElement) {
    duplicateGroup.setAttribute("aria-hidden", "true");
    duplicateGroup.querySelectorAll("button").forEach((thumb) => {
      thumb.tabIndex = -1;
    });
    wallpaperTrack.append(wallpaperGroup, duplicateGroup);
    wallpaperStrip.replaceChildren(wallpaperTrack);
  }

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
const gameClose = document.querySelector(".sheep-game-close");

if (
  gameLaunchers.length &&
  gameDialog instanceof HTMLDialogElement &&
  gameCanvas instanceof HTMLCanvasElement &&
  gameLaunchStatus &&
  gameStatus &&
  gameScoreLabel &&
  gameRestart instanceof HTMLButtonElement &&
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
  let audioContext = null;
  let bleatBuffer = null;

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

  gameCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (gameRunning && sheep.y >= groundY - sheepSize) sheep.velocity = -650;
  });

  document.addEventListener("keydown", (event) => {
    if (!gameDialog.open || !["Space", "ArrowUp"].includes(event.code)) return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    event.preventDefault();
    if (gameRunning && sheep.y >= groundY - sheepSize) sheep.velocity = -650;
  });

  gameRestart.addEventListener("click", startGame);
  gameClose.addEventListener("click", () => gameDialog.close());
  gameDialog.addEventListener("close", () => {
    gameRunning = false;
    if (gameFrame) window.cancelAnimationFrame(gameFrame);
    gameFrame = 0;
  });
}

categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedCategory = tab.dataset.filter;

    categoryTabs.forEach((categoryTab) => {
      const isSelected = categoryTab === tab;
      categoryTab.classList.toggle("is-active", isSelected);
      categoryTab.setAttribute("aria-pressed", String(isSelected));
    });

    productCards.forEach((card) => {
      card.hidden = selectedCategory !== "todos" && card.dataset.category !== selectedCategory;
    });
  });
});

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

const servicesDialog = document.querySelector("#services-dialog");
const businessMaintenanceDialog = document.querySelector("#business-maintenance-dialog");
const serviceOpenButtons = document.querySelectorAll("[data-open-services]");
const serviceTabButtons = document.querySelectorAll("[data-service-tab]");
const serviceRepairPanel = document.querySelector("#service-repair-panel");
const serviceMaintenancePanel = document.querySelector("#service-maintenance-panel");
const businessMaintenanceButton = document.querySelector("#open-business-maintenance");
const serviceEmail = "ovejanegraservices@gmail.com";
const serviceFormEndpoint = `https://formsubmit.co/ajax/${serviceEmail}`;

const submitServiceRequest = async (form, subject, message, onSuccess = () => {}) => {
  const status = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector("button[type='submit']");
  if (!(status instanceof HTMLElement) || !(submitButton instanceof HTMLButtonElement)) {
    throw new Error("No se encontró el estado del formulario o su botón de envío.");
  }

  status.hidden = false;
  status.textContent = "Enviando tu solicitud…";
  status.classList.remove("is-error");
  submitButton.disabled = true;

  try {
    const response = await fetch(serviceFormEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ _subject: subject, message }),
    });
    const result = await response.json();

    if (!response.ok || String(result.success).toLowerCase() !== "true") {
      throw new Error(
        typeof result.message === "string"
          ? result.message
          : "El servicio de correo no aceptó la solicitud."
      );
    }

    status.textContent = "FormSubmit aceptó la solicitud. Si es el primer envío, confirma el correo de activación enviado al negocio.";
    onSuccess();
  } catch (error) {
    status.classList.add("is-error");
    status.textContent = error instanceof Error
      ? `No se pudo enviar la solicitud: ${error.message} Revisa tu conexión e inténtalo nuevamente.`
      : "No se pudo enviar la solicitud. Revisa tu conexión e inténtalo nuevamente.";
  } finally {
    submitButton.disabled = false;
  }
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
      "Solicitud de reparación",
      "",
      `Problema: ${problem}`,
      `Número de contacto: ${phone}`,
      `Correo electrónico de contacto: ${email}`,
    ].join("\n");
    void submitServiceRequest(repairForm, "Solicitud de reparación - Sheep Store", body);
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
      "Solicitud de mantenimiento preventivo",
      "",
      ...quantities.map((quantity, index) =>
        `${maintenanceLabels[index]}: ${quantity} × S/ ${maintenancePrices[index]} = S/ ${(quantity * maintenancePrices[index]).toLocaleString("es-PE")}`
      ),
      `Total estimado: S/ ${total.toLocaleString("es-PE")}`,
      `Número de contacto: ${phone}`,
      `Correo electrónico de contacto: ${email}`,
    ].join("\n");
    void submitServiceRequest(
      maintenanceForm,
      "Solicitud de mantenimiento - Sheep Store",
      body,
      () => {
        maintenanceForm.reset();
        updateMaintenanceTotal();
      }
    );
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
      "Solicitud de mantenimiento por equipos para empresa",
      "",
      `Plan de interés: ${plan}`,
      `Cantidad de equipos: ${quantity} (${range.label})`,
      `Precio del plan: S/ ${price.toLocaleString("es-PE")}`,
      "Solicito contactarme con un asesor para coordinar el pago del plan de mantenimiento.",
      `Número de contacto: ${phone}`,
      `Correo electrónico de contacto: ${email}`,
    ].join("\n");
    void submitServiceRequest(
      businessMaintenanceForm,
      "Mantenimiento por equipos para empresa - Sheep Store",
      body
    );
  });
}

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}