// progressive enhancement: gate reveal animations on JS so no-JS visitors still see content
document.documentElement.classList.add("js");

const reveals = document.querySelectorAll(".reveal");

// anything already in the viewport at load time: mark in-view immediately so there's no flash-of-hidden
const inViewport = (el) => {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
};
reveals.forEach((el) => { if (inViewport(el)) el.classList.add("in-view"); });

const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add("in-view");
      revealer.unobserve(e.target);
    }
  }
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

reveals.forEach((el) => {
  if (!el.classList.contains("in-view")) revealer.observe(el);
});

// failsafe: 2s after load, reveal any stragglers so content never stays hidden
window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => el.classList.add("in-view"));
  }, 2000);
});

// count-up stats
const formatNum = (n, decimals = 0, withComma = false) => {
  const fixed = n.toFixed(decimals);
  if (!withComma) return fixed;
  const [intPart, dec] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `${withCommas}.${dec}` : withCommas;
};

const animateCount = (el) => {
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  const withComma = el.dataset.format === "comma";
  const duration = 1400;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = target * eased;
    el.innerHTML = formatNum(val, decimals, withComma) + suffix;
    if (t < 1) requestAnimationFrame(step);
    else el.innerHTML = formatNum(target, decimals, withComma) + suffix;
  };
  requestAnimationFrame(step);
};

const statObs = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      animateCount(e.target);
      statObs.unobserve(e.target);
    }
  }
}, { threshold: 0.6 });

document.querySelectorAll(".stat-num").forEach((el) => statObs.observe(el));

// scroll progress bar (top tricolor)
const progressBar = document.querySelector(".scroll-progress");
if (progressBar) {
  let ticking = false;
  const updateProgress = () => {
    ticking = false;
    const docEl = document.documentElement;
    const max = docEl.scrollHeight - docEl.clientHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.transform = `scaleX(${p})`;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();
}
