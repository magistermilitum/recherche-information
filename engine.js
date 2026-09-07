(() => {
  "use strict";

  const SLIDE_W = 1600;
  const SLIDE_H = 900;
  const HTTP_URL = /^https?:\/\//i;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function safeJson(script) {
    if (!script) return [];
    try {
      const parsed = JSON.parse(script.textContent || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("État H illisible", error);
      return [];
    }
  }

  function setInert(element, inert) {
    if (inert) {
      element.setAttribute("inert", "");
      try { element.inert = true; } catch (_) { /* older browser */ }
    } else {
      element.removeAttribute("inert");
      try { element.inert = false; } catch (_) { /* older browser */ }
    }
  }

  function isEditableTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  class AtlasDeckController {
    constructor(root = document) {
      this.root = root;
      this.viewport = root.querySelector("[data-atlas-viewport]");
      this.canvas = root.querySelector("[data-atlas-canvas]");
      this.slides = Array.from(root.querySelectorAll(".atlas-slide"));
      this.dockH = root.querySelector("[data-dock-h]");
      this.dockZ = root.querySelector("[data-dock-z]");
      this.dockProgress = root.querySelector("[data-dock-progress]");
      this.zoomLayer = root.querySelector("[data-zoom-layer]");
      this.zoomMedia = root.querySelector("[data-zoom-media]");
      this.zoomTitle = root.querySelector("[data-zoom-title]");
      this.zoomCaption = root.querySelector("[data-zoom-caption]");
      this.zoomCredit = root.querySelector("[data-zoom-credit]");
      this.zoomLicense = root.querySelector("[data-zoom-license]");
      this.zoomLink = root.querySelector("[data-zoom-link]");
      this.zoomStep = root.querySelector("[data-zoom-step]");
      this.helpLayer = root.querySelector("[data-help-layer]");
      this.statesBySlide = new WeakMap();
      this.stateIndexBySlide = new WeakMap();
      this.motionTimerBySlide = new WeakMap();
      this.index = 0;
      this.printSnapshot = null;
      this.zoomTargetElement = null;
      this.zoomArtboard = null;
      this.zoomImage = null;
      this.zoomStates = [];
      this.zoomStateIndex = -1;

      if (!this.viewport || !this.canvas || !this.slides.length) return;

      this.slides.forEach((slide) => {
        const states = safeJson(slide.querySelector("script.state-data"));
        this.statesBySlide.set(slide, states);
        this.stateIndexBySlide.set(slide, -1);
        this.prepareScene(slide);
      });

      this.index = this.indexFromHash();
      this.bind();
      this.activate(this.index, { updateHash: false, resetState: true });
      this.fitCanvas();
    }

    indexFromHash() {
      const id = decodeURIComponent(location.hash.replace(/^#/, ""));
      if (!id) return 0;
      const found = this.slides.findIndex((slide) => slide.id === id);
      return found >= 0 ? found : 0;
    }

    bind() {
      window.addEventListener("resize", () => {
        this.fitCanvas();
        if (this.isZoomOpen()) this.layoutZoomArtboard();
      }, { passive: true });
      window.addEventListener("orientationchange", () => {
        this.fitCanvas();
        window.requestAnimationFrame(() => this.layoutZoomArtboard());
      }, { passive: true });
      window.addEventListener("hashchange", () => {
        const target = this.indexFromHash();
        if (target !== this.index) this.activate(target, { updateHash: false, resetState: true });
      });
      window.addEventListener("keydown", (event) => this.onKeyDown(event));
      window.addEventListener("beforeprint", () => this.beforePrint());
      window.addEventListener("afterprint", () => this.afterPrint());

      const close = this.root.querySelector("[data-zoom-close]");
      if (close) close.addEventListener("click", () => this.closeZoom());
      const helpClose = this.root.querySelector("[data-help-close]");
      if (helpClose) helpClose.addEventListener("click", () => this.closeHelp());
      if (this.zoomLayer) {
        this.zoomLayer.addEventListener("click", (event) => {
          if (event.target === this.zoomLayer) this.closeZoom();
        });
      }
    }

    onKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key;
      if (this.isHelpOpen()) {
        if (key === "Escape" || key === "?") {
          event.preventDefault();
          this.closeHelp();
        }
        return;
      }
      if (this.isZoomOpen()) {
        if (key === "Escape") {
          event.preventDefault();
          this.closeZoom();
        } else if (key.toLowerCase() === "z") {
          event.preventDefault();
          this.moveZoomState(event.shiftKey ? -1 : 1);
        }
        return;
      }

      if (key.toLowerCase() === "f") {
        event.preventDefault();
        this.toggleFullscreen();
        return;
      }
      if (key === "?") {
        event.preventDefault();
        this.openHelp();
        return;
      }

      if (key === "ArrowRight" || key === " ") {
        event.preventDefault();
        this.nextSlide();
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        this.previousSlide();
        return;
      }
      if (key.toLowerCase() === "h") {
        const states = this.currentStates();
        if (states.length) {
          event.preventDefault();
          this.moveState(event.shiftKey ? -1 : 1);
        }
        return;
      }
      if (key.toLowerCase() === "z") {
        const target = this.zoomTarget();
        if (target) {
          event.preventDefault();
          this.openZoom(target);
        }
      }
    }

    fitCanvas() {
      const width = window.innerWidth || document.documentElement.clientWidth;
      const height = window.innerHeight || document.documentElement.clientHeight;
      const scale = Math.min(width / SLIDE_W, height / SLIDE_H);
      const left = Math.max(0, (width - SLIDE_W * scale) / 2);
      const top = Math.max(0, (height - SLIDE_H * scale) / 2);
      this.canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    }

    activeSlide() {
      return this.slides[this.index] || null;
    }

    currentStates() {
      const slide = this.activeSlide();
      return slide ? (this.statesBySlide.get(slide) || []) : [];
    }

    nextSlide() {
      if (this.index >= this.slides.length - 1) return;
      this.activate(this.index + 1, { updateHash: true, resetState: true });
    }

    previousSlide() {
      if (this.index <= 0) return;
      this.activate(this.index - 1, { updateHash: true, resetState: true });
    }

    activate(nextIndex, { updateHash = true, resetState = true } = {}) {
      const bounded = clamp(nextIndex, 0, this.slides.length - 1);
      this.index = bounded;

      this.slides.forEach((slide, index) => {
        const active = index === bounded;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
        if (active) {
          slide.hidden = false;
          setInert(slide, false);
          slide.style.removeProperty("display");
        } else {
          slide.hidden = true;
          setInert(slide, true);
          slide.style.setProperty("display", "none", "important");
        }
      });

      const active = this.activeSlide();
      if (resetState && active) {
        const timer = this.motionTimerBySlide.get(active);
        if (timer) window.clearTimeout(timer);
        this.motionTimerBySlide.delete(active);
        active.classList.remove("is-state-motion");
        this.stateIndexBySlide.set(active, -1);
      }
      if (active) this.applyState(active, this.stateIndexBySlide.get(active) ?? -1, { animate: false });

      if (updateHash && active) {
        const nextHash = `#${encodeURIComponent(active.id)}`;
        if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
      }
      this.updateDock();
    }

    moveState(delta) {
      const slide = this.activeSlide();
      if (!slide) return;
      const states = this.statesBySlide.get(slide) || [];
      if (!states.length) return;
      const current = this.stateIndexBySlide.get(slide) ?? -1;
      const next = clamp(current + delta, -1, states.length - 1);
      if (next === current) return;
      this.stateIndexBySlide.set(slide, next);
      this.applyState(slide, next, { direction: delta > 0 ? 1 : -1, animate: true });
      this.updateDock();
    }

    prepareScene(slide) {
      const nodes = Array.from(slide.querySelectorAll("[data-node-id]"));
      nodes.forEach((node, index) => {
        node.style.setProperty("--node-order", String(index));
        node.style.setProperty("--node-delay", `${Math.min(index, 10) * 38}ms`);
        node.classList.remove(
          "is-active-node",
          "is-dimmed-node",
          "is-revealed-node",
          "is-unrevealed-node",
          "is-frontier-node",
          "is-entering-node",
          "is-exiting-node",
          "is-transform-target",
          "is-transform-context"
        );
      });
      const edges = Array.from(slide.querySelectorAll("[data-edge-from][data-edge-to]"));
      edges.forEach((edge, index) => {
        edge.style.setProperty("--edge-order", String(index));
        edge.style.setProperty("--edge-delay", `${Math.min(index, 12) * 28}ms`);
        edge.setAttribute("pathLength", "1");
        edge.classList.remove(
          "is-active-edge",
          "is-dimmed-edge",
          "is-revealed-edge",
          "is-frontier-edge",
          "is-context-edge",
          "is-exiting-edge"
        );
      });
    }

    revealedThrough(states, stateIndex) {
      const revealed = new Set();
      for (let index = 0; index <= stateIndex; index += 1) {
        const state = states[index];
        if (!state || !Array.isArray(state.show)) continue;
        state.show.forEach((id) => revealed.add(String(id)));
      }
      return revealed;
    }

    semanticOffsets(node, visualType, activeIndex, activeCount, centroid) {
      if (node.closest(".media-node-track")) return { dx: 0, dy: -7 };
      if (node.closest(".statement-node-rail")) return { dx: 18, dy: 0 };
      const styles = getComputedStyle(node);
      const x = Number.parseFloat(styles.getPropertyValue("--x")) || 50;
      const y = Number.parseFloat(styles.getPropertyValue("--y")) || 50;
      let dx = 0;
      let dy = 0;

      if (["stream", "timeline", "spectrum", "query"].includes(visualType)) {
        dy = -22;
      } else if (["stack", "table", "serp"].includes(visualType)) {
        dx = 28;
      } else if (["network", "constellation", "loop"].includes(visualType)) {
        const fallbackAngle = ((activeIndex + 1) / Math.max(1, activeCount)) * Math.PI * 2;
        const rawX = x - centroid.x;
        const rawY = y - centroid.y;
        dx = clamp(Math.abs(rawX) < 2 ? Math.cos(fallbackAngle) * 22 : rawX * 0.72, -30, 30);
        dy = clamp(Math.abs(rawY) < 2 ? Math.sin(fallbackAngle) * 18 : rawY * 0.5, -22, 22);
      } else if (visualType === "split") {
        dx = x < 50 ? 26 : -26;
      } else {
        dx = clamp((50 - x) * 0.56, -24, 24);
        dy = clamp((50 - y) * 0.34, -16, 16);
      }

      return { dx, dy };
    }

    restartMotion(slide) {
      const previousTimer = this.motionTimerBySlide.get(slide);
      if (previousTimer) window.clearTimeout(previousTimer);
      slide.classList.remove("is-state-motion");
      // A style flush restarts only transform/opacity animations; all boxes keep fixed geometry.
      void slide.offsetWidth;
      slide.classList.add("is-state-motion");
      const timer = window.setTimeout(() => {
        slide.classList.remove("is-state-motion");
        this.motionTimerBySlide.delete(slide);
      }, 940);
      this.motionTimerBySlide.set(slide, timer);
    }

    applyState(slide, stateIndex, { direction = 0, animate = false } = {}) {
      const states = this.statesBySlide.get(slide) || [];
      const state = stateIndex >= 0 ? states[stateIndex] : null;
      const scene = slide.querySelector(".atlas-scene");
      const readout = slide.querySelector(".state-readout");
      const nodes = Array.from(slide.querySelectorAll("[data-node-id]"));
      const edges = Array.from(slide.querySelectorAll("[data-edge-from][data-edge-to]"));

      const previousIndexRaw = Number.parseInt(slide.dataset.appliedStateIndex || "-1", 10);
      const previousIndex = Number.isFinite(previousIndexRaw) ? previousIndexRaw : -1;
      const previousState = previousIndex >= 0 ? states[previousIndex] : null;

      const activeIds = new Set(state && Array.isArray(state.show) ? state.show.map(String) : []);
      const previousActiveIds = new Set(previousState && Array.isArray(previousState.show) ? previousState.show.map(String) : []);
      const explicitDimIds = new Set(state && Array.isArray(state.dim) ? state.dim.map(String) : []);
      const mode = state && ["replace", "accumulate", "transform"].includes(state.mode)
        ? state.mode
        : "replace";
      const revealedIds = state && mode === "accumulate"
        ? this.revealedThrough(states, stateIndex)
        : new Set();
      const previouslyRevealedIds = state && mode === "accumulate"
        ? this.revealedThrough(states, stateIndex - 1)
        : new Set();
      const frontierIds = new Set(
        Array.from(revealedIds).filter((id) => !previouslyRevealedIds.has(id))
      );
      if (state && mode === "accumulate" && !frontierIds.size) {
        activeIds.forEach((id) => frontierIds.add(id));
      }

      const visualType = scene ? (scene.dataset.visualType || "") : "";
      const transformNodes = nodes.filter((node) => activeIds.has(String(node.dataset.nodeId || "")));
      const transformCoordinates = transformNodes.map((node) => {
        const styles = getComputedStyle(node);
        return {
          x: Number.parseFloat(styles.getPropertyValue("--x")) || 50,
          y: Number.parseFloat(styles.getPropertyValue("--y")) || 50
        };
      });
      const centroid = transformCoordinates.length
        ? {
            x: transformCoordinates.reduce((sum, point) => sum + point.x, 0) / transformCoordinates.length,
            y: transformCoordinates.reduce((sum, point) => sum + point.y, 0) / transformCoordinates.length
          }
        : { x: 50, y: 50 };

      if (scene) {
        const firstMode = states[0] && states[0].mode;
        scene.dataset.baselineMode = firstMode === "accumulate" ? "accumulate" : "neutral";
        scene.dataset.transition = state ? mode : "baseline";
        const hProgress = states.length && stateIndex >= 0
          ? ((stateIndex + 1) / states.length) * 100
          : 0;
        scene.style.setProperty("--h-progress", `${hProgress.toFixed(3)}%`);
      }
      slide.dataset.stateIndex = String(stateIndex);
      slide.dataset.stateMode = state ? mode : "baseline";
      slide.dataset.stateDirection = direction < 0 ? "backward" : "forward";
      slide.dataset.appliedStateIndex = String(stateIndex);

      let transformIndex = 0;
      nodes.forEach((node) => {
        const id = String(node.dataset.nodeId || "");
        const inCurrentSet = Boolean(state && activeIds.has(id));
        const frontier = Boolean(state && mode === "accumulate" && frontierIds.has(id));
        const active = Boolean(state && (mode === "accumulate" ? frontier : inCurrentSet));
        const revealed = Boolean(state && mode === "accumulate" && revealedIds.has(id));
        const unrevealed = Boolean(state && mode === "accumulate" && !revealedIds.has(id));
        const implicitDim = Boolean(
          state &&
          (mode === "replace" || mode === "transform") &&
          activeIds.size &&
          !inCurrentSet
        );
        const dimmed = Boolean(state && (explicitDimIds.has(id) || implicitDim || unrevealed));
        const entering = Boolean(
          state &&
          ((mode === "accumulate" && frontier) ||
            ((mode === "replace" || mode === "transform") && inCurrentSet && !previousActiveIds.has(id)))
        );
        const exiting = Boolean(
          state &&
          (mode === "replace" || mode === "transform") &&
          previousActiveIds.has(id) &&
          !inCurrentSet
        );

        node.classList.toggle("is-active-node", active);
        node.classList.toggle("is-revealed-node", revealed);
        node.classList.toggle("is-unrevealed-node", unrevealed);
        node.classList.toggle("is-frontier-node", frontier);
        node.classList.toggle("is-entering-node", entering);
        node.classList.toggle("is-exiting-node", exiting);
        node.classList.toggle("is-transform-target", Boolean(state && mode === "transform" && inCurrentSet));
        node.classList.toggle("is-transform-context", Boolean(state && mode === "transform" && !inCurrentSet));
        node.classList.toggle("is-dimmed-node", dimmed && !active && !revealed);

        if (state && mode === "transform" && inCurrentSet) {
          const offset = this.semanticOffsets(node, visualType, transformIndex, transformNodes.length, centroid);
          node.style.setProperty("--semantic-dx", `${offset.dx.toFixed(1)}px`);
          node.style.setProperty("--semantic-dy", `${offset.dy.toFixed(1)}px`);
          transformIndex += 1;
        } else {
          node.style.setProperty("--semantic-dx", "0px");
          node.style.setProperty("--semantic-dy", "0px");
        }
      });

      edges.forEach((edge) => {
        const from = String(edge.dataset.edgeFrom || "");
        const to = String(edge.dataset.edgeTo || "");
        const currentSet = mode === "accumulate" ? revealedIds : activeIds;
        const active = Boolean(state && currentSet.has(from) && currentSet.has(to));
        const previousSet = mode === "accumulate" ? previouslyRevealedIds : previousActiveIds;
        const previouslyActive = previousSet.has(from) && previousSet.has(to);
        const frontier = Boolean(
          state && mode === "accumulate" && active &&
          (frontierIds.has(from) || frontierIds.has(to))
        );
        const context = Boolean(
          state && mode === "transform" && !active &&
          (currentSet.has(from) !== currentSet.has(to))
        );
        const exiting = Boolean(
          state && (mode === "replace" || mode === "transform") && previouslyActive && !active
        );
        const dimmed = Boolean(state && !active && !context && currentSet.size);
        edge.classList.toggle("is-active-edge", active);
        edge.classList.toggle("is-dimmed-edge", dimmed);
        edge.classList.toggle("is-revealed-edge", Boolean(state && mode === "accumulate" && active));
        edge.classList.toggle("is-frontier-edge", frontier);
        edge.classList.toggle("is-context-edge", context);
        edge.classList.toggle("is-exiting-edge", exiting);
      });

      if (readout) {
        const counter = readout.querySelector("[data-state-counter]");
        const label = readout.querySelector("[data-state-label]");
        const headline = readout.querySelector("[data-state-headline]");
        const body = readout.querySelector("[data-state-body]");
        readout.classList.toggle("is-baseline", !state);
        readout.dataset.semanticMode = state ? mode : "baseline";
        if (counter) counter.textContent = state ? `${String(stateIndex + 1).padStart(2, "0")} / ${String(states.length).padStart(2, "0")}` : `00 / ${String(states.length).padStart(2, "0")}`;
        if (counter) {
          counter.dataset.modeLabel = state
            ? ({ replace: "SUBSTITUER", accumulate: "CONSTRUIRE", transform: "RECOMPOSER" }[mode] || "")
            : "";
        }
        if (label) label.textContent = state ? (state.label || "Lecture") : (readout.dataset.baselineLabel || "Vue d’ensemble");
        if (headline) headline.textContent = state ? (state.headline || state.label || "") : (readout.dataset.baselineHeadline || "Une scène, plusieurs lectures");
        if (body) body.textContent = state ? (state.body || "") : (readout.dataset.baselineBody || "Les états successifs modifient l’explication sans déplacer la composition.");
      }

      if (animate) this.restartMotion(slide);
    }

    validZoomTarget(element) {
      if (!(element instanceof HTMLElement)) return false;
      if (!element.matches("figure.document-media")) return false;
      if (element.dataset.zoomable !== "true") return false;
      const image = element.querySelector("img");
      const url = element.dataset.sourceUrl || "";
      const credit = element.dataset.sourceCredit || "";
      const license = element.dataset.sourceLicense || "";
      return Boolean(image && image.getAttribute("src") && HTTP_URL.test(url) && credit.trim() && license.trim());
    }

    zoomTarget() {
      const slide = this.activeSlide();
      if (!slide) return null;
      const preferred = slide.querySelector('figure.document-media[data-zoomable="true"].is-zoom-target');
      if (this.validZoomTarget(preferred)) return preferred;
      return Array.from(slide.querySelectorAll('figure.document-media[data-zoomable="true"]')).find((element) => this.validZoomTarget(element)) || null;
    }

    isZoomOpen() {
      return Boolean(this.zoomLayer && !this.zoomLayer.hidden);
    }

    isHelpOpen() {
      return Boolean(this.helpLayer && !this.helpLayer.hidden);
    }

    async toggleFullscreen() {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        }
      } catch (error) {
        console.warn("Mode plein écran indisponible", error);
      }
    }

    openHelp() {
      if (!this.helpLayer || this.isZoomOpen()) return;
      this.helpLayer.hidden = false;
      this.helpLayer.setAttribute("aria-hidden", "false");
      setInert(this.canvas, true);
      const close = this.root.querySelector("[data-help-close]");
      if (close) close.focus({ preventScroll: true });
    }

    closeHelp() {
      if (!this.helpLayer || this.helpLayer.hidden) return;
      this.helpLayer.hidden = true;
      this.helpLayer.setAttribute("aria-hidden", "true");
      if (!this.isZoomOpen()) setInert(this.canvas, false);
    }

    openZoom(target) {
      if (!this.zoomLayer || !this.zoomMedia || !this.validZoomTarget(target)) return;
      const sourceImage = target.querySelector("img");
      const image = document.createElement("img");
      image.src = sourceImage.currentSrc || sourceImage.src;
      image.alt = sourceImage.alt || target.dataset.sourceTitle || "Document agrandi";
      image.decoding = "async";

      const artboard = document.createElement("div");
      artboard.className = "zoom-artboard";
      artboard.append(image);

      this.zoomTargetElement = target;
      this.zoomArtboard = artboard;
      this.zoomImage = image;
      this.zoomStates = this.zoomStatesFromTarget(target);
      this.zoomStateIndex = -1;

      this.zoomStates.forEach((state, index) => {
        const highlight = document.createElement("button");
        highlight.type = "button";
        highlight.className = "zoom-highlight";
        highlight.classList.toggle("is-near-top", state.y <= 6.5);
        highlight.dataset.zoomIndex = String(index);
        highlight.dataset.zoomTone = state.tone;
        highlight.setAttribute("aria-label", `${index + 1}. ${state.headline}`);
        highlight.style.setProperty("--zoom-x", String(state.x));
        highlight.style.setProperty("--zoom-y", String(state.y));
        highlight.style.setProperty("--zoom-w", String(state.w));
        highlight.style.setProperty("--zoom-h", String(state.h));
        const badge = document.createElement("span");
        badge.className = "zoom-highlight-index";
        badge.textContent = String(index + 1).padStart(2, "0");
        highlight.append(badge);
        highlight.addEventListener("click", () => {
          this.zoomStateIndex = index;
          this.applyZoomState({ animate: true });
        });
        artboard.append(highlight);
        state.element = highlight;
      });

      this.zoomMedia.replaceChildren(artboard);

      if (this.zoomCredit) this.zoomCredit.textContent = `Crédit : ${target.dataset.sourceCredit}`;
      if (this.zoomLicense) this.zoomLicense.textContent = `Statut : ${target.dataset.sourceLicense}`;
      if (this.zoomLink) {
        this.zoomLink.href = target.dataset.sourceUrl;
        this.zoomLink.textContent = "Lien";
      }

      this.zoomLayer.hidden = false;
      this.zoomLayer.setAttribute("aria-hidden", "false");
      const slide = this.activeSlide();
      if (slide) {
        const slideStyles = getComputedStyle(slide);
        this.zoomLayer.style.setProperty("--accent", slideStyles.getPropertyValue("--accent").trim());
        this.zoomLayer.style.setProperty("--accent-on-dark", slideStyles.getPropertyValue("--accent-on-dark").trim());
      }
      setInert(this.canvas, true);
      this.applyZoomState({ animate: false });
      if (image.complete && image.naturalWidth) {
        this.layoutZoomArtboard();
      } else {
        image.addEventListener("load", () => this.layoutZoomArtboard(), { once: true });
      }
      window.requestAnimationFrame(() => this.layoutZoomArtboard());
      const close = this.root.querySelector("[data-zoom-close]");
      if (close) close.focus({ preventScroll: true });
      this.updateDock();
    }

    zoomStatesFromTarget(target) {
      return Array.from(target.querySelectorAll(".media-hotspot")).map((element, index) => {
        const value = (name) => Number.parseFloat(element.style.getPropertyValue(name));
        const x = value("--hotspot-x");
        const y = value("--hotspot-y");
        const w = value("--hotspot-w");
        const h = value("--hotspot-h");
        const label = (element.dataset.zoomLabel || element.getAttribute("aria-label") || `Détail ${index + 1}`).trim();
        return {
          id: element.dataset.zoomId || `detail-${index + 1}`,
          x,
          y,
          w,
          h,
          label,
          headline: (element.dataset.zoomHeadline || label).trim(),
          body: (element.dataset.zoomBody || "").trim(),
          mode: element.dataset.zoomMode === "accumulate" ? "accumulate" : "replace",
          tone: ["accent", "signal", "teal", "violet"].includes(element.dataset.zoomTone)
            ? element.dataset.zoomTone
            : "accent",
          element: null
        };
      }).filter((state) => (
        Number.isFinite(state.x) && Number.isFinite(state.y) &&
        Number.isFinite(state.w) && Number.isFinite(state.h) &&
        state.x >= 0 && state.y >= 0 && state.w > 0 && state.h > 0 &&
        state.x + state.w <= 100 && state.y + state.h <= 100
      ));
    }

    layoutZoomArtboard() {
      if (!this.zoomMedia || !this.zoomArtboard || !this.zoomImage) return;
      const naturalWidth = this.zoomImage.naturalWidth || 0;
      const naturalHeight = this.zoomImage.naturalHeight || 0;
      if (!naturalWidth || !naturalHeight) return;
      const styles = getComputedStyle(this.zoomMedia);
      const horizontalPadding = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
      const verticalPadding = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
      const availableWidth = Math.max(1, this.zoomMedia.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, this.zoomMedia.clientHeight - verticalPadding);
      const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
      this.zoomArtboard.style.width = `${Math.max(1, naturalWidth * scale).toFixed(2)}px`;
      this.zoomArtboard.style.height = `${Math.max(1, naturalHeight * scale).toFixed(2)}px`;
    }

    moveZoomState(delta) {
      if (!this.isZoomOpen() || !this.zoomStates.length) return;
      const next = clamp(this.zoomStateIndex + delta, -1, this.zoomStates.length - 1);
      if (next === this.zoomStateIndex) return;
      this.zoomStateIndex = next;
      this.applyZoomState({ animate: true });
    }

    applyZoomState({ animate = false } = {}) {
      if (!this.zoomTargetElement || !this.zoomImage) return;
      const active = this.zoomStateIndex >= 0 ? this.zoomStates[this.zoomStateIndex] : null;
      const accumulate = Boolean(active && active.mode === "accumulate");

      this.zoomStates.forEach((state, index) => {
        if (!state.element) return;
        const visible = Boolean(active && (index === this.zoomStateIndex || (accumulate && index <= this.zoomStateIndex)));
        state.element.classList.toggle("is-visible", visible);
        state.element.classList.toggle("is-active", index === this.zoomStateIndex);
        state.element.classList.toggle("is-context", visible && index !== this.zoomStateIndex);
        state.element.tabIndex = visible ? 0 : -1;
        state.element.setAttribute("aria-hidden", visible ? "false" : "true");
      });

      if (this.zoomArtboard) {
        this.zoomArtboard.dataset.zoomState = active ? "detail" : "overview";
        this.zoomArtboard.classList.remove("is-zoom-motion");
        if (animate) {
          void this.zoomArtboard.offsetWidth;
          this.zoomArtboard.classList.add("is-zoom-motion");
        }
      }

      if (this.zoomStep) {
        this.zoomStep.textContent = this.zoomStates.length
          ? (active
              ? `DÉTAIL ${String(this.zoomStateIndex + 1).padStart(2, "0")} / ${String(this.zoomStates.length).padStart(2, "0")}`
              : `VUE ENTIÈRE · 00 / ${String(this.zoomStates.length).padStart(2, "0")}`)
          : "VUE ENTIÈRE";
      }
      if (this.zoomTitle) {
        this.zoomTitle.textContent = active
          ? active.headline
          : (this.zoomTargetElement.dataset.sourceTitle || this.zoomImage.alt);
      }
      if (this.zoomCaption) {
        this.zoomCaption.textContent = active
          ? (active.body || active.label || this.zoomTargetElement.dataset.sourceCaption || "")
          : (this.zoomTargetElement.dataset.sourceCaption || "");
      }
    }

    closeZoom() {
      if (!this.zoomLayer || this.zoomLayer.hidden) return;
      this.zoomLayer.hidden = true;
      this.zoomLayer.setAttribute("aria-hidden", "true");
      this.zoomTargetElement = null;
      this.zoomArtboard = null;
      this.zoomImage = null;
      this.zoomStates = [];
      this.zoomStateIndex = -1;
      if (this.zoomMedia) this.zoomMedia.replaceChildren();
      if (this.zoomStep) this.zoomStep.textContent = "";
      if (!this.isHelpOpen()) setInert(this.canvas, false);
      this.updateDock();
    }

    updateDock() {
      const slide = this.activeSlide();
      const states = this.currentStates();
      const stateIndex = slide ? (this.stateIndexBySlide.get(slide) ?? -1) : -1;
      const zoomable = Boolean(this.zoomTarget());

      if (this.dockH) {
        this.dockH.classList.toggle("is-available", states.length > 0);
        this.dockH.textContent = states.length ? `H ${Math.max(0, stateIndex + 1)}/${states.length}` : "H";
      }
      if (this.dockZ) this.dockZ.classList.toggle("is-available", zoomable || this.isZoomOpen());
      if (this.dockProgress) this.dockProgress.textContent = `${String(this.index + 1).padStart(2, "0")} / ${String(this.slides.length).padStart(2, "0")}`;
    }

    beforePrint() {
      this.printSnapshot = this.slides.map((slide) => ({
        hidden: slide.hidden,
        inert: slide.hasAttribute("inert"),
        ariaHidden: slide.getAttribute("aria-hidden"),
        display: slide.style.getPropertyValue("display"),
        priority: slide.style.getPropertyPriority("display")
      }));
      this.slides.forEach((slide) => {
        slide.hidden = false;
        setInert(slide, false);
        slide.setAttribute("aria-hidden", "false");
        slide.style.removeProperty("display");
      });
    }

    afterPrint() {
      if (!this.printSnapshot) {
        this.activate(this.index, { updateHash: false, resetState: false });
        return;
      }
      this.slides.forEach((slide, index) => {
        const state = this.printSnapshot[index];
        slide.hidden = state.hidden;
        setInert(slide, state.inert);
        if (state.ariaHidden === null) slide.removeAttribute("aria-hidden");
        else slide.setAttribute("aria-hidden", state.ariaHidden);
        if (state.display) slide.style.setProperty("display", state.display, state.priority);
        else slide.style.removeProperty("display");
      });
      this.printSnapshot = null;
      this.updateDock();
    }
  }

  function boot() {
    const deck = new AtlasDeckController(document);
    window.AtlasDeck = deck;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
