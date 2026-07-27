(function () {
  var cards = document.querySelectorAll(".brandkit-card");
  var filters = document.querySelectorAll(".brandkit-filter");
  var heading = document.getElementById("brandkit-heading");
  var countEl = document.getElementById("brandkit-count");
  var emptyEl = document.getElementById("brandkit-empty");
  var gallery = document.getElementById("brandkit-gallery");
  if (!cards.length || !filters.length) return;

  var labelByKey = {};
  filters.forEach(function (btn) {
    var key = btn.getAttribute("data-filter");
    var label = btn.getAttribute("data-label");
    if (key && label) labelByKey[key] = label;
  });
  if (!labelByKey.all) labelByKey.all = "All assets";

  function setActive(key) {
    filters.forEach(function (b) {
      var on = b.getAttribute("data-filter") === key;
      b.classList.toggle("is-active", on);
      b.classList.toggle("bg-primary-container", on);
      b.classList.toggle("text-on-primary-container", on);
      b.classList.toggle("btn-outline", !on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function applyFilter(key) {
    var visible = 0;
    cards.forEach(function (card) {
      var show = key === "all" || card.getAttribute("data-group") === key;
      card.classList.toggle("hidden", !show);
      if (show) visible += 1;
    });
    setActive(key);
    if (heading) heading.textContent = labelByKey[key] || "Assets";
    if (countEl) countEl.textContent = "Showing " + visible;
    if (emptyEl) emptyEl.classList.toggle("hidden", visible > 0);
    if (gallery) gallery.classList.toggle("hidden", visible === 0);
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyFilter(btn.getAttribute("data-filter") || "all");
    });
  });

  applyFilter("all");
})();
