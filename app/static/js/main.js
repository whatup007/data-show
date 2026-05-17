document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const cursorGlow = document.getElementById("cursorGlow");

  let lastScroll = 0;

  // ---- Scroll effect for navbar ----
  window.addEventListener("scroll", function () {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
    lastScroll = currentScroll;
  });

  // ---- Mobile menu toggle ----
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      navToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    document.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.classList.remove("active");
        navMenu.classList.remove("active");
      });
    });
  }

  // ---- Cursor glow effect ----
  if (cursorGlow) {
    let mouseX = 0,
      mouseY = 0;
    let glowX = 0,
      glowY = 0;

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateGlow() {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      cursorGlow.style.left = glowX + "px";
      cursorGlow.style.top = glowY + "px";
      requestAnimationFrame(animateGlow);
    }
    animateGlow();

    document.addEventListener("mouseenter", function () {
      cursorGlow.style.opacity = "1";
    });
    document.addEventListener("mouseleave", function () {
      cursorGlow.style.opacity = "0";
    });
  }

  // ---- Active nav link ----
  const currentPath = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach(function (link) {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "/" && href === "/")) {
      link.classList.add("active");
    } else if (currentPath.startsWith(href) && href !== "/") {
      link.classList.add("active");
    }
  });

  // ---- Particle System ----
  var canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var particles = [];
  var particleCount = 60;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  for (var i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      size: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.3 + 0.05,
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(129, 140, 248, " + p.opacity + ")";
      ctx.fill();
    }
    /* Connection lines between nearby particles */
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = "rgba(129, 140, 248, " + (0.03 * (1 - dist / 120)) + ")";
          ctx.lineWidth = 0.3;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(drawParticles);
  }
  drawParticles();
});
