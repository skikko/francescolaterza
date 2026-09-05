(() => {
  "use strict";

  const PROXY_URL =
    "https://script.google.com/macros/s/AKfycbxYWL2I_qAjHc8vxJh0zHV0qgsM5mUnswNwTtUh7Ns-UgXh_-ZPF2JG7Ixly63SoTDf/exec";
  const PROFILE =
    "Francesco Laterza is a management engineer, creative technologist and CTO based in Rome. His portfolio covers web development, GenAI and automation, VR/AR, digital fabrication (3D printing, scanning, CAD), STEM education, workshops and technology leadership. His listed experience includes EIIS, ENGILAB, Italia Camp / Luiss Hub, and Impactscool. Contact: francescolaterza@gmail.com, linkedin.com/in/flat3/. Use only this context and the configured system prompt; do not invent projects or results.";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionPaused = motionQuery.matches;
  let toastTimer;
  const discovered = new Set();
  const engines = [];

  function notify(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4500);
  }

  function updateMotion() {
    document.body.classList.toggle("motion-paused", motionPaused);
    $("#motion-toggle").textContent = motionPaused
      ? "Motion: off"
      : "Motion: on";
    $("#motion-toggle").setAttribute("aria-pressed", String(motionPaused));
    engines.forEach((engine) => engine.refresh());
  }

  $("#motion-toggle").addEventListener("click", () => {
    motionPaused = !motionPaused;
    updateMotion();
  });
  motionQuery.addEventListener("change", (event) => {
    motionPaused = event.matches;
    updateMotion();
  });

  const menuButton = $(".menu-button");
  function closeMenu() {
    $("#navigation").classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Menu";
  }
  menuButton.addEventListener("click", () => {
    const open = $("#navigation").classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "Close" : "Menu";
  });
  $$("#navigation a").forEach((link) =>
    link.addEventListener("click", closeMenu),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  // Le animazioni vengono abilitate solo dopo aver predisposto il rilevamento degli elementi.
  const reveals = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          reveals.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  $$(".reveal").forEach((element) => reveals.observe(element));
  document.documentElement.classList.add("js");

  const statement = $("[data-word-reveal]");
  const statementText = statement.textContent;
  statement.setAttribute("aria-label", statementText);
  statement.replaceChildren(
    ...statementText.split(" ").map((word, index) => {
      const span = document.createElement("span");
      span.textContent = (index ? " " : "") + word;
      span.className = "word";
      span.setAttribute("aria-hidden", "true");
      return span;
    }),
  );
  const words = $$(".word", statement);
  const disciplines = $$(".discipline");
  const disciplineLinks = $$(".discipline-nav a");
  let scrollFrame = 0;

  // Gli anchor delle schede sticky usano la posizione nel flusso, non quella sovrapposta a schermo.
  disciplineLinks.forEach((link, index) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const stack = $(".discipline-stack");
      const gap = parseFloat(getComputedStyle(stack).rowGap) || 0;
      const offset = disciplines
        .slice(0, index)
        .reduce((total, article) => total + article.offsetHeight + gap, 0);
      const top =
        stack.getBoundingClientRect().top + window.scrollY + offset - 70;
      window.scrollTo({ top, behavior: motionPaused ? "instant" : "smooth" });
      if (location.protocol !== "file:")
        history.replaceState(null, "", link.getAttribute("href"));
    }),
  );

  function updateScroll() {
    scrollFrame = 0;
    const viewport = window.innerHeight;
    const rect = statement.getBoundingClientRect();
    const progress = clamp(
      (viewport * 0.85 - rect.top) / (viewport * 0.58),
      0,
      1,
    );
    words.forEach((word, index) =>
      word.classList.toggle(
        "is-lit",
        motionPaused || index < Math.ceil(progress * words.length),
      ),
    );
    let active = 0;
    disciplines.forEach((article, index) => {
      const bounds = article.getBoundingClientRect();
      if (bounds.top < viewport * 0.52) active = index;
      const next = disciplines[index + 1];
      if (next && window.innerWidth > 760 && !motionPaused) {
        const overlap = clamp(
          1 - (next.getBoundingClientRect().top - 65) / (viewport * 0.65),
          0,
          1,
        );
        article.style.transform = `scale(${1 - overlap * 0.035})`;
      } else {
        article.style.transform = "";
      }
    });
    disciplineLinks.forEach((link, index) => {
      link.classList.toggle("is-active", index === active);
      if (index === active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }
  function requestScrollUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  const inView = new IntersectionObserver((entries) => {
    entries.forEach((entry) =>
      entry.target.classList.toggle("in-view", entry.isIntersecting),
    );
  });
  disciplines.forEach((article) => inView.observe(article));
  updateScroll();

  // Ogni canvas si ferma fuori schermo, nelle schede nascoste e quando il movimento e' disattivato.
  function canvasEngine(canvas, render) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return { refresh() {} };
    let width = 1;
    let height = 1;
    let frame = 0;
    let visible = false;
    let lastTime = 0;
    let elapsed = 0;
    function draw(time) {
      frame = 0;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      if (!motionPaused && !document.hidden) elapsed += delta;
      lastTime = time;
      render(context, width, height, elapsed, motionPaused ? 0 : delta);
      if (visible && !motionPaused && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    function refresh() {
      cancelAnimationFrame(frame);
      lastTime = 0;
      frame = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    }
    const resize = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const density = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      context.setTransform(density, 0, 0, density, 0, 0);
      refresh();
    });
    resize.observe(canvas);
    const visibility = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      refresh();
    });
    visibility.observe(canvas);
    const engine = { refresh };
    engines.push(engine);
    return engine;
  }

  function setupSculpture() {
    const canvas = $("#sculpture");
    const rings = 112;
    const sides = 18;
    const fullTurn = Math.PI * 2;
    let targetShape = 0;
    let current = [];
    let pointerX = 0;
    let pointerY = 0;
    let rotation = 0;
    let dragStart = null;
    const palettes = {
      normal: [180, 245, 135],
      blueprint: [188, 229, 239],
      coffee: [246, 184, 120],
    };

    function center(t, shape) {
      if (shape === 1) return [1.7 * Math.cos(t), 1.7 * Math.sin(t), 0];
      if (shape === 2) {
        const radius = 1.6 + 0.45 * Math.cos(5 * t);
        return [
          radius * Math.cos(t),
          radius * Math.sin(t),
          0.4 * Math.sin(3 * t),
        ];
      }
      const radius = 1.6 + 0.6 * Math.cos(3 * t);
      return [
        radius * Math.cos(2 * t),
        radius * Math.sin(2 * t),
        0.8 * Math.sin(3 * t),
      ];
    }
    function cross(a, b) {
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
    }
    function unit(vector) {
      const length = Math.hypot(...vector) || 1;
      return vector.map((value) => value / length);
    }
    function mesh(shape) {
      const vertices = [];
      for (let i = 0; i < rings; i++) {
        const t = (i / rings) * fullTurn;
        const point = center(t, shape);
        const next = center(t + 0.001, shape);
        const tangent = unit(next.map((value, index) => value - point[index]));
        const normal = unit(cross(tangent, [0, 0, 1]));
        const binormal = cross(tangent, normal);
        const tube = shape === 1 ? 0.6 : 0.3;
        for (let j = 0; j < sides; j++) {
          const angle = (j / sides) * fullTurn;
          vertices.push(
            point.map(
              (value, axis) =>
                value +
                tube *
                  (Math.cos(angle) * normal[axis] +
                    Math.sin(angle) * binormal[axis]),
            ),
          );
        }
      }
      return vertices;
    }
    const meshes = [mesh(0), mesh(1), mesh(2)];
    current = meshes[0].map((vertex) => vertex.slice());
    const faces = [];
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < sides; j++) {
        faces.push([
          i * sides + j,
          ((i + 1) % rings) * sides + j,
          ((i + 1) % rings) * sides + ((j + 1) % sides),
          i * sides + ((j + 1) % sides),
        ]);
      }
    }
    function selectShape(shape) {
      targetShape = shape;
      if (motionPaused) current = meshes[shape].map((vertex) => vertex.slice());
      $$("[data-shape]").forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.shape) === shape),
        ),
      );
      engine.refresh();
    }
    const engine = canvasEngine(canvas, (ctx, width, height, time, delta) => {
      ctx.clearRect(0, 0, width, height);
      const spin = document.body.dataset.overclock === "true" ? 1.8 : 1;
      const ax = -0.3 + pointerY * 0.22;
      const ay = -0.5 + time * 0.16 * spin + rotation + pointerX * 0.18;
      const az = -0.5;
      const scale = Math.min(width, height) * 0.184;
      const cx = Math.cos(ax),
        sx = Math.sin(ax),
        cy = Math.cos(ay),
        sy = Math.sin(ay),
        cz = Math.cos(az),
        sz = Math.sin(az);
      const mix = motionPaused ? 1 : 1 - Math.exp(-delta * 5);
      const points = current.map((vertex, index) => {
        for (let k = 0; k < 3; k++)
          vertex[k] += (meshes[targetShape][index][k] - vertex[k]) * mix;
        const y1 = vertex[1] * cx - vertex[2] * sx;
        const z1 = vertex[1] * sx + vertex[2] * cx;
        const x2 = vertex[0] * cy + z1 * sy;
        const z2 = -vertex[0] * sy + z1 * cy;
        const x3 = x2 * cz - y1 * sz;
        const y3 = x2 * sz + y1 * cz;
        const perspective = 7 / (7 - z2);
        return [
          width * 0.5 + x3 * scale * perspective,
          height * 0.51 + y3 * scale * perspective,
          z2,
        ];
      });
      let color = palettes.normal;
      if (document.body.dataset.theme === "blueprint")
        color = palettes.blueprint;
      if (document.body.dataset.overclock === "true") color = palettes.coffee;
      const sortedFaces = faces
        .map((face) => ({
          face,
          z: face.reduce((sum, index) => sum + points[index][2], 0) / 4,
        }))
        .sort((a, b) => a.z - b.z);
      ctx.lineWidth = 0.55;
      for (const { face, z } of sortedFaces) {
        const light = clamp((z + 2.8) / 5.5, 0, 1);
        ctx.beginPath();
        face.forEach((index, step) => {
          if (!step) ctx.moveTo(points[index][0], points[index][1]);
          else ctx.lineTo(points[index][0], points[index][1]);
        });
        ctx.closePath();
        ctx.fillStyle = `rgb(${Math.round(13 + light * 10)},${Math.round(23 + light * 18)},${Math.round(13 + light * 9)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${color.join(",")},${0.16 + light * 0.65})`;
        ctx.stroke();
      }
    });
    $$("[data-shape]").forEach((button) =>
      button.addEventListener("click", () =>
        selectShape(Number(button.dataset.shape)),
      ),
    );
    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      pointerY = (event.clientY - rect.top) / rect.height - 0.5;
      if (dragStart !== null) {
        rotation += (event.clientX - dragStart) * 0.008;
        dragStart = event.clientX;
      }
      if (motionPaused) engine.refresh();
    });
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      dragStart = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
      canvas.addEventListener(name, () => {
        dragStart = null;
      }),
    );
    canvas.addEventListener("pointerleave", () => {
      pointerX = 0;
      pointerY = 0;
    });
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        rotation += event.key === "ArrowLeft" ? -0.25 : 0.25;
        engine.refresh();
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        selectShape((targetShape + 1) % 3);
      }
    });
  }

  function setupGrid() {
    const canvas = $("#elastic-grid");
    const pointer = { x: -1000, y: -1000 };
    let ripples = [];
    let clock = 0;
    let phase = 0;
    let touched = false;
    const engine = canvasEngine(canvas, (ctx, width, height, time) => {
      clock = time;
      ctx.clearRect(0, 0, width, height);
      const spacing = width < 600 ? 26 : 32;
      const columns = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const points = [];
      for (let y = 0; y <= rows; y++) {
        const row = [];
        for (let x = 0; x <= columns; x++) {
          const px = x * spacing,
            py = y * spacing;
          const dx = px - pointer.x,
            dy = py - pointer.y;
          const distance = Math.hypot(dx, dy);
          const force = Math.exp((-distance * distance) / 14000) * 30;
          let offset = 0;
          ripples.forEach((ripple) => {
            const radius = Math.hypot(px - ripple.x, py - ripple.y);
            const age = time - ripple.time;
            offset +=
              Math.sin(radius * 0.035 - age * 5) *
              Math.exp(-Math.abs(radius - age * 170) / 100) *
              24 *
              Math.max(0, 1 - age / 3);
          });
          const wave = motionPaused
            ? 0
            : Math.sin(px * 0.012 + time * 0.5 + phase) *
              Math.cos(py * 0.018 - time * 0.3) *
              4;
          row.push([
            px + (dx / (distance || 1)) * force,
            py + (dy / (distance || 1)) * force + offset + wave,
          ]);
        }
        points.push(row);
      }
      ctx.lineWidth = 0.7;
      for (let y = 0; y <= rows; y++) {
        ctx.strokeStyle = `rgba(180,245,135,${0.12 + 0.16 * Math.sin((y / rows) * Math.PI)})`;
        ctx.beginPath();
        points[y].forEach((point, index) =>
          index ? ctx.lineTo(...point) : ctx.moveTo(...point),
        );
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(180,245,135,.23)";
      for (let x = 0; x <= columns; x++) {
        ctx.beginPath();
        for (let y = 0; y <= rows; y++) {
          if (!y) ctx.moveTo(...points[y][x]);
          else ctx.lineTo(...points[y][x]);
        }
        ctx.stroke();
      }
      ripples = ripples.filter((ripple) => time - ripple.time < 3);
    });
    function placePointer(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      if (!touched) {
        $("#grid-state").textContent = "System: playing";
        touched = true;
      }
      if (motionPaused) engine.refresh();
    }
    function ripple(x, y) {
      ripples.push({ x, y, time: clock });
      if (ripples.length > 6) ripples.shift();
      engine.refresh();
    }
    canvas.addEventListener("pointermove", placePointer);
    canvas.addEventListener("pointerdown", (event) => {
      placePointer(event);
      ripple(pointer.x, pointer.y);
    });
    canvas.addEventListener("pointerleave", () => {
      pointer.x = -1000;
      pointer.y = -1000;
      if (motionPaused) engine.refresh();
    });
    canvas.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        ripple(rect.width / 2, rect.height / 2);
        $("#grid-state").textContent = "System: playing";
      }
    });
    $("#grid-reset").addEventListener("click", () => {
      ripples = [];
      phase = 0;
      pointer.x = -1000;
      pointer.y = -1000;
      touched = false;
      $("#grid-state").textContent = "System: curious";
      engine.refresh();
    });
    $("#surprise-button").addEventListener("click", () => {
      const rect = canvas.getBoundingClientRect();
      phase += Math.PI;
      ripple(rect.width * 0.5, rect.height * 0.5);
      discover(
        "rulebreaker",
        "Rulebreaker found. Good things happen when you question the instructions.",
      );
      $("#grid-state").textContent = "System: delightfully disobedient";
    });
  }

  function discover(secret, message) {
    if (!discovered.has(secret)) {
      discovered.add(secret);
      $$("[data-secret-count]").forEach((node) => {
        node.textContent = `${discovered.size} / 3`;
      });
    }
    notify(message);
  }

  const dialogs = $$("dialog");
  function openDialog(dialog) {
    dialogs.forEach((item) => {
      if (item.open) item.close();
    });
    dialog.showModal();
    document.body.style.overflow = "hidden";
  }
  dialogs.forEach((dialog) => {
    $("[data-close]", dialog).addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      document.body.style.overflow = dialogs.some((item) => item.open)
        ? "hidden"
        : "";
    });
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom)
      )
        dialog.close();
    });
  });
  $$("[data-console-open]").forEach((button) =>
    button.addEventListener("click", () => {
      openDialog($("#console-dialog"));
      $("#console-input").focus();
    }),
  );
  $("#privacy-open").addEventListener("click", () =>
    openDialog($("#privacy-dialog")),
  );
  $("#chat-open").addEventListener("click", () =>
    openDialog($("#chat-dialog")),
  );

  function logConsole(text) {
    const line = document.createElement("p");
    line.textContent = text;
    const log = $("#console-log");
    log.append(line);
    while (log.children.length > 35) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function coffee() {
    const active = document.body.dataset.overclock !== "true";
    document.body.dataset.overclock = String(active);
    discover(
      "coffee",
      active
        ? "Espresso mode. Curiosity levels: unreasonable."
        : "Back to a sensible caffeine level.",
    );
    engines.forEach((engine) => engine.refresh());
    return active
      ? "OK / Espresso mode activated. Still human, just faster."
      : "OK / Espresso mode deactivated.";
  }
  function blueprint() {
    const active = document.body.dataset.theme !== "blueprint";
    document.body.dataset.theme = active ? "blueprint" : "";
    delete document.body.dataset.overclock;
    discover(
      "blueprint",
      active
        ? "Blueprint found. Every good idea starts with a sketch."
        : "Original palette restored.",
    );
    engines.forEach((engine) => engine.refresh());
    return active
      ? "OK / Blueprint mode activated."
      : "OK / Original palette restored.";
  }
  function runCommand(raw) {
    const command = raw.trim().toLowerCase();
    if (!command) return;
    logConsole("guest@curiosity:~$ " + raw.trim());
    const answers = {
      help: "Available commands: whoami, skills, contact, coffee, blueprint, reset, clear.\nOne more secret is hiding in the playground.\nKeyboard shortcut: Ctrl/Cmd + K.",
      whoami:
        "Francesco Laterza. Creative technologist. CTO. Engineer. Maker.\nHuman first. Always curious.",
      skills:
        "Web + AI / VR + AR / Digital fabrication / Leadership + learning.",
      contact:
        "Email: francescolaterza@gmail.com\nLinkedIn: linkedin.com/in/flat3/\nPhone: +39 328 055 886",
    };
    if (Object.hasOwn(answers, command)) logConsole(answers[command]);
    else if (command === "coffee") logConsole(coffee());
    else if (command === "blueprint") logConsole(blueprint());
    else if (command === "reset") {
      delete document.body.dataset.theme;
      delete document.body.dataset.overclock;
      engines.forEach((engine) => engine.refresh());
      logConsole(
        "OK / Visual settings restored. Discoveries are yours to keep.",
      );
    } else if (command === "clear") $("#console-log").replaceChildren();
    else logConsole("Command not found. Try help.");
  }
  $("#console-form").addEventListener("submit", (event) => {
    event.preventDefault();
    runCommand($("#console-input").value);
    $("#console-input").value = "";
  });
  $$("[data-command]").forEach((button) =>
    button.addEventListener("click", () => runCommand(button.dataset.command)),
  );
  $("#coffee-button").addEventListener("click", coffee);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if ($("#console-dialog").open) $("#console-dialog").close();
      else {
        openDialog($("#console-dialog"));
        $("#console-input").focus();
      }
    }
  });

  function setupChat() {
    const messages = $("#chat-messages");
    const form = $("#chat-form");
    const input = $("#chat-input");
    const history = [];
    const sessionId = createId("landing2026");
    let busy = false;
    const loaderLines = [
      "Connecting the curious dots...",
      "Consulting the human behind the code...",
      "Turning caffeine into a reply...",
    ];
    function appendMessage(text, role) {
      const message = document.createElement("p");
      message.className = "chat-message";
      message.dataset.role = role;
      message.textContent = text;
      messages.append(message);
      messages.scrollTop = messages.scrollHeight;
    }
    async function sendMessage(text, repeat = false) {
      if (busy || !text.trim()) return;
      busy = true;
      $(".chat-suggestions", messages)?.remove();
      $$(".retry-button", messages).forEach((button) => button.remove());
      if (!repeat) appendMessage(text, "user");
      $$("button,input", form).forEach((element) => {
        element.disabled = true;
      });
      const loader = document.createElement("div");
      loader.className = "chat-loader";
      loader.setAttribute("role", "status");
      const loaderText = document.createElement("span");
      loaderText.textContent = loaderLines[0];
      const track = document.createElement("div");
      track.className = "loader-track";
      track.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 3; i++) track.append(document.createElement("i"));
      loader.append(loaderText, track);
      messages.append(loader);
      messages.scrollTop = messages.scrollHeight;
      let loaderIndex = 0;
      const loaderTimer = setInterval(() => {
        loaderText.textContent =
          loaderLines[++loaderIndex % loaderLines.length];
      }, 3200);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);
      try {
        const response = await fetch(PROXY_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          credentials: "omit",
          signal: controller.signal,
          body: JSON.stringify({
            message: text,
            history: history.slice(-20),
            sessionId,
            turnId: createId("turn"),
            section: "landing2026",
            sectionContext: PROFILE,
            language:
              /[\u00e0\u00e8\u00e9\u00ec\u00f2\u00f9]|\b(ciao|come|grazie|cosa|chi|progetto|lavoro|puoi|vorrei)\b/i.test(
                text,
              )
                ? "it"
                : "en",
            pageUrl: location.origin + location.pathname,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok || typeof data.reply !== "string")
          throw new Error(data.error || "Invalid chat response");
        history.push(
          { role: "user", parts: [{ text }] },
          { role: "model", parts: [{ text: data.reply }] },
        );
        if (history.length > 20) history.splice(0, history.length - 20);
        appendMessage(data.reply, "assistant");
      } catch (error) {
        let message =
          "The connection did not complete. Please try again, or reach Francesco by email.";
        if (/429|503|high demand|quota|busy|temporar/i.test(error.message))
          message =
            "The assistant is busy right now. Please try again in a moment.";
        if (error.name === "AbortError")
          message =
            "The assistant is taking longer than expected. You can try again shortly.";
        appendMessage(message, "assistant");
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "retry-button";
        retry.textContent = "Try again";
        retry.addEventListener("click", () => sendMessage(text, true));
        messages.append(retry);
      } finally {
        clearInterval(loaderTimer);
        clearTimeout(timeout);
        loader.remove();
        busy = false;
        $$("button,input", form).forEach((element) => {
          element.disabled = false;
        });
        messages.scrollTop = messages.scrollHeight;
      }
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      input.value = "";
      sendMessage(text);
    });
    $$("[data-question]").forEach((button) =>
      button.addEventListener("click", () => sendMessage(button.textContent)),
    );
  }
  function createId(prefix) {
    if (globalThis.crypto?.randomUUID)
      return prefix + "-" + crypto.randomUUID();
    return (
      prefix +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }

  // Il contatore si attiva soltanto sul dominio pubblico esistente, senza identificatori del visitatore.
  function trackVisit() {
    if (
      location.hostname !== "skikko.github.io" ||
      document.visibilityState !== "visible" ||
      navigator.doNotTrack === "1" ||
      navigator.globalPrivacyControl === true
    )
      return;
    let referrerBucket = "direct";
    try {
      if (document.referrer) {
        const host = new URL(document.referrer).hostname;
        if (host !== location.hostname) {
          referrerBucket = "other";
          if (
            /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org)$/.test(
              host,
            )
          )
            referrerBucket = "search";
          if (
            /(^|\.)(linkedin\.com|instagram\.com|facebook\.com|x\.com|twitter\.com|t\.co)$/.test(
              host,
            )
          )
            referrerBucket = "social";
        }
      }
    } catch {
      referrerBucket = "other";
    }
    const lang = (navigator.language || "en").slice(0, 2).toLowerCase();
    fetch(PROXY_URL, {
      method: "POST",
      mode: "no-cors",
      credentials: "omit",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        type: "pageview",
        host: location.hostname,
        path: location.pathname,
        language: ["it", "en"].includes(lang) ? lang : "other",
        deviceType: matchMedia("(max-width: 900px), (pointer: coarse)").matches
          ? "mobile"
          : "desktop",
        referrerBucket,
      }),
    }).catch(() => {});
  }
  let counted = false;
  function onVisibility() {
    document.body.classList.toggle("page-hidden", document.hidden);
    engines.forEach((engine) => engine.refresh());
    if (!document.hidden && !counted) {
      counted = true;
      trackVisit();
    }
  }
  function updateClock() {
    $("#rome-time").textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  }
  $("#year").textContent = new Date().getFullYear();
  setupSculpture();
  setupGrid();
  setupChat();
  updateMotion();
  updateClock();
  setInterval(updateClock, 60000);
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();
})();
