const SITE_NAME = "oasis"; // <-- SITE NAME IN ONE PLACE ONLY. Swap e.g. to "oasis-tools". See README.
const TAGLINE = "tiny free tools for local businesses";

// Inject site name everywhere (works from / and /for-xxx/ pages)
document.querySelectorAll("[data-site-name]").forEach((el) => {
  el.textContent = SITE_NAME;
});
const titleEl = document.querySelector("title[data-site-title]");
if (titleEl) titleEl.textContent = `${SITE_NAME} — ${TAGLINE}`;
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Render hub grid on index.html only
(async function renderGrid() {
  const grid = document.getElementById("builds-grid");
  if (!grid) return;
  const count = document.getElementById("builds-count");
  try {
    const res = await fetch("builds.json", { cache: "no-store" });
    const text = await res.text();
    // allow // comments in builds.json (JSONC-lite), strip before parse
    const clean = text.replace(/^[ \t]*\/\/.*$/gm, "");
    const builds = JSON.parse(clean);
    const visible = builds.filter((b) => b && b.business && b.link);
    grid.innerHTML = "";
    visible.forEach((b) => {
      const card = document.createElement("article");
      card.className = "card";
      const status = (b.status || "building").toLowerCase();
      const pillClass =
        status === "live" ? "pill-live" : status === "quiet" ? "pill-quiet" : "pill-building";
      card.innerHTML = `
        <div class="card-top">
          <span class="pill ${pillClass}">${status}</span>
          ${b.proof ? `<a class="proof" href="${b.proof}" target="_blank" rel="noopener">proof ↗</a>` : ""}
        </div>
        <h2></h2>
        <p class="problem"></p>
        <a class="btn">Open →</a>
      `;
      card.querySelector("h2").textContent = b.business;
      card.querySelector(".problem").textContent = b.problem || "";
      const a = card.querySelector("a.btn");
      a.href = b.link;
      grid.appendChild(card);
    });
    if (count) count.textContent = `${visible.length} build${visible.length === 1 ? "" : "s"} so far`;
    if (!visible.length) grid.innerHTML = `<p class="muted">Nothing live yet — check back soon.</p>`;
  } catch (e) {
    grid.innerHTML = `<p class="muted">Could not load builds.json. If opened via file://, serve the folder or deploy to Pages.</p>`;
  }
})();
