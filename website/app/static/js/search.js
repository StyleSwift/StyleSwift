(function() {
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown) return;

    let debounceTimer = null;

    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const q = input.value.trim();

        if (q.length < 2) {
            dropdown.hidden = true;
            return;
        }

        debounceTimer = setTimeout(function() {
            fetch('/api/search?q=' + encodeURIComponent(q) + '&per_page=5')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!data.skills || data.skills.length === 0) {
                        dropdown.hidden = true;
                        return;
                    }

                    dropdown.innerHTML = data.skills.map(function(s) {
                        return '<a href="/skill/' + s.slug + '" class="search-dropdown-item">' +
                            '<div class="search-dropdown-title">' + escapeHtml(s.title) + '</div>' +
                            '<div class="search-dropdown-desc">' + escapeHtml(s.description.substring(0, 80)) + '</div>' +
                            '</a>';
                    }).join('');

                    dropdown.hidden = false;
                })
                .catch(function() {
                    dropdown.hidden = true;
                });
        }, 300);
    });

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.hidden = true;
        }
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdown.hidden = true;
        }
    });

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
})();
