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

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}