---
layout: null
---
(function () {
	function getQueryVariable(variable) {
		var query = window.location.search.substring(1),
			vars = query.split("&");

		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");

			if (pair[0] === variable) {
				return decodeURIComponent(pair[1].replace(/\+/g, '%20')).trim();
			}
		}
	}

	function getPreview(query, content, previewLength) {
		previewLength = previewLength || 170;
		content = content || "";

		var parts = query.split(" ").filter(Boolean),
			match = content.toLowerCase().indexOf(query.toLowerCase()),
			matchLength = query.length,
			preview;

		for (var i = 0; i < parts.length; i++) {
			if (match >= 0) break;
			match = content.toLowerCase().indexOf(parts[i].toLowerCase());
			matchLength = parts[i].length;
		}

		if (match >= 0) {
			var start = match - (previewLength / 2),
				end = start > 0 ? match + matchLength + (previewLength / 2) : previewLength;

			preview = content.substring(Math.max(0, start), end).trim();
			if (start > 0) preview = "..." + preview;
			if (end < content.length) preview = preview + "...";
			if (parts.length) {
				preview = preview.replace(new RegExp("(" + parts.map(function (p) {
					return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				}).join("|") + ")", "gi"), "<strong>$1</strong>");
			}
		} else {
			preview = content.substring(0, previewLength).trim() + (content.length > previewLength ? "..." : "");
		}

		return preview;
	}

	function typeLabel(type) {
		if (type === "news") return "News";
		if (type === "events") return "Event";
		if (type === "causes") return "Cause";
		if (type === "pages") return "Page";
		return "Result";
	}

	var activeType = "all";
	var lastResults = [];
	var lastQuery = "";

	function displaySearchResults(results, query) {
		var searchResultsEl = document.getElementById("search-results"),
			searchProcessEl = document.getElementById("search-process");

		lastResults = results || [];
		lastQuery = query || "";

		var filtered = lastResults.filter(function (result) {
			var item = window.data[result.ref];
			if (!item) return false;
			if (activeType === "all") return true;
			return item.type === activeType;
		});

		searchResultsEl.style.display = "";
		if (filtered.length) {
			var resultsHTML = "";
			filtered.forEach(function (result) {
				var item = window.data[result.ref],
					contentPreview = getPreview(query, item.content || item.description || "", 170),
					titlePreview = getPreview(query, item.title);

				resultsHTML +=
					"<li class='py-4 border-b border-outline-variant/40'>" +
					"<p class='label-caps mb-1'>" + typeLabel(item.type) + "</p>" +
					"<h3 class='font-display text-lg font-semibold mb-1'><a class='text-primary hover:underline' href='{{ site.baseurl }}" +
					String(item.url).trim() +
					"'>" +
					titlePreview +
					"</a></h3>" +
					"<p class='text-sm text-on-surface-variant'>" +
					contentPreview +
					"</p></li>";
			});

			searchResultsEl.innerHTML = resultsHTML;
			searchProcessEl.innerText = "Showing";
		} else {
			searchResultsEl.innerHTML = "";
			searchProcessEl.innerText = query ? "No" : "Enter a query to see";
		}
	}

	window.index = lunr(function () {
		this.field("id");
		this.field("title", { boost: 10 });
		this.field("type", { boost: 5 });
		this.field("categories");
		this.field("url");
		this.field("description");
		this.field("content");
	});

	var query = decodeURIComponent((getQueryVariable("q") || "").replace(/\+/g, "%20")),
		searchQueryContainerEl = document.getElementById("search-query-container"),
		searchQueryEl = document.getElementById("search-query"),
		searchInput = document.getElementById("search-q");

	if (searchInput && query) searchInput.value = query;
	searchQueryEl.innerText = query;
	if (query) {
		searchQueryContainerEl.classList.remove("hidden");
		searchQueryContainerEl.style.display = "inline";
	} else {
		document.getElementById("search-process").innerText = "Enter a query to see";
	}

	for (var key in window.data) {
		window.index.add(window.data[key]);
	}

	document.querySelectorAll("[data-search-type]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			activeType = btn.getAttribute("data-search-type") || "all";
			document.querySelectorAll("[data-search-type]").forEach(function (b) {
				b.setAttribute("aria-pressed", b === btn ? "true" : "false");
				b.classList.toggle("bg-ink", b === btn);
				b.classList.toggle("text-white", b === btn);
			});
			if (lastQuery) displaySearchResults(lastResults, lastQuery);
		});
	});

	if (query) {
		displaySearchResults(window.index.search(query), query);
	}
})();
