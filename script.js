const throughputValue = document.getElementById("throughputValue");
const latencyValue = document.getElementById("latencyValue");
const stabilityValue = document.getElementById("stabilityValue");
const temperatureValue = document.getElementById("temperatureValue");
const powerValue = document.getElementById("powerValue");
const uptimeValue = document.getElementById("uptimeValue");
const systemState = document.getElementById("systemState");
const lastUpdatedValue = document.getElementById("lastUpdatedValue");

const stateCycle = [
  { text: "Active", className: "state-active" },
  { text: "Syncing", className: "state-sync" },
  { text: "Active", className: "state-active" },
  { text: "Active", className: "state-active" }
];

let statusIndex = 0;
let uptimeMinutes = 372 * 60 + 15;
let telemetryIntervalId = null;

const metrics = {
  throughput: 1.21,
  latency: 0.82,
  stability: 99.98,
  temperature: 421,
  power: 4.9
};

const formatNumber = (value, fraction = 2) => Number(value).toFixed(fraction);
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function formatLastUpdated() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function nudgeMetric(currentValue, min, max, maxStep) {
  const delta = rand(-maxStep, maxStep);
  return clamp(currentValue + delta, min, max);
}

function updateTelemetry() {
  metrics.throughput = nudgeMetric(metrics.throughput, 1.08, 1.38, 0.04);
  metrics.latency = nudgeMetric(metrics.latency, 0.54, 1.08, 0.03);
  metrics.stability = nudgeMetric(metrics.stability, 99.72, 99.99, 0.03);
  metrics.temperature = nudgeMetric(metrics.temperature, 398, 438, 3.2);
  metrics.power = nudgeMetric(metrics.power, 4.3, 5.4, 0.09);

  throughputValue.textContent = `${formatNumber(metrics.throughput, 2)} PB/s`;
  latencyValue.textContent = `${formatNumber(metrics.latency, 2)} ms`;
  stabilityValue.textContent = `${formatNumber(metrics.stability, 2)}%`;
  temperatureValue.textContent = `${Math.round(metrics.temperature)} K`;
  powerValue.textContent = `${formatNumber(metrics.power, 1)} TW`;

  uptimeMinutes += Math.round(rand(1, 3));
  const hours = Math.floor(uptimeMinutes / 60);
  const minutes = uptimeMinutes % 60;
  uptimeValue.textContent = `${hours}h ${String(minutes).padStart(2, "0")}m`;

  statusIndex = (statusIndex + 1) % stateCycle.length;
  const currentState = stateCycle[statusIndex];
  systemState.textContent = currentState.text;
  systemState.className = `value ${currentState.className}`;

  if (lastUpdatedValue) {
    lastUpdatedValue.textContent = formatLastUpdated();
  }
}

const landing = document.getElementById("landing");
const coreTilt = document.getElementById("coreTilt");
const telemetryTarget = document.getElementById("telemetry");
const telemetryButton = document.querySelector("[data-scroll='telemetry']");

const tiltState = {
  bounds: null,
  rafId: null,
  pointerX: 0,
  pointerY: 0,
  active: false
};

function cacheLandingBounds() {
  tiltState.bounds = landing.getBoundingClientRect();
}

function renderTilt() {
  if (!tiltState.bounds) {
    cacheLandingBounds();
  }

  const { left, top, width, height } = tiltState.bounds;
  const x = clamp((tiltState.pointerX - left) / width, 0, 1);
  const y = clamp((tiltState.pointerY - top) / height, 0, 1);
  const rotateY = (x - 0.5) * 16;
  const rotateX = (0.5 - y) * 12;

  coreTilt.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  tiltState.rafId = null;
}

function queueTilt(event) {
  tiltState.pointerX = event.clientX;
  tiltState.pointerY = event.clientY;

  if (tiltState.rafId) {
    return;
  }

  tiltState.rafId = requestAnimationFrame(renderTilt);
}

function resetTilt() {
  if (tiltState.rafId) {
    cancelAnimationFrame(tiltState.rafId);
    tiltState.rafId = null;
  }
  coreTilt.style.transform = "rotateX(0deg) rotateY(0deg)";
}

function startTelemetry() {
  if (telemetryIntervalId || document.hidden || reducedMotionQuery.matches) {
    return;
  }

  telemetryIntervalId = setInterval(updateTelemetry, 4000);
}

function stopTelemetry() {
  if (!telemetryIntervalId) {
    return;
  }

  clearInterval(telemetryIntervalId);
  telemetryIntervalId = null;
}

function enableTilt() {
  if (tiltState.active) {
    return;
  }

  cacheLandingBounds();
  landing.addEventListener("mouseenter", cacheLandingBounds);
  landing.addEventListener("mousemove", queueTilt);
  landing.addEventListener("mouseleave", resetTilt);
  window.addEventListener("resize", cacheLandingBounds);
  tiltState.active = true;
}

function disableTilt() {
  if (!tiltState.active) {
    return;
  }

  landing.removeEventListener("mouseenter", cacheLandingBounds);
  landing.removeEventListener("mousemove", queueTilt);
  landing.removeEventListener("mouseleave", resetTilt);
  window.removeEventListener("resize", cacheLandingBounds);
  tiltState.active = false;
  resetTilt();
}

function applyMotionPreference() {
  if (reducedMotionQuery.matches) {
    disableTilt();
    stopTelemetry();
    return;
  }

  enableTilt();
  startTelemetry();
}

if (telemetryButton && telemetryTarget) {
  telemetryButton.addEventListener("click", () => {
    const scrollBehavior = reducedMotionQuery.matches ? "auto" : "smooth";
    telemetryTarget.scrollIntoView({ behavior: scrollBehavior, block: "start" });
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden || reducedMotionQuery.matches) {
    stopTelemetry();
    return;
  }

  updateTelemetry();
  startTelemetry();
});

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", applyMotionPreference);
} else {
  reducedMotionQuery.addListener(applyMotionPreference);
}

updateTelemetry();
applyMotionPreference();
