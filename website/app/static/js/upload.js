(function() {
    var titleInput = document.getElementById('title');
    var descInput = document.getElementById('description');
    var preview = document.getElementById('preview');
    var form = document.getElementById('upload-form');
    var dnaTextarea = document.getElementById('dna_content');
    var cssTextarea = document.getElementById('css_content');

    function parseFrontmatter(text) {
        var normalized = text.replace(/\r\n/g, '\n');
        var match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

        if (!match) {
            var headingMatch = normalized.match(/^#\s+(.+)(?:\n|$)/);
            return {
                meta: {
                    name: headingMatch ? headingMatch[1].trim() : '',
                    description: ''
                },
                body: text.trim()
            };
        }

        var frontmatter = match[1];
        var body = match[2].trim();
        var meta = {};

        frontmatter.split('\n').forEach(function(line) {
            var colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                var key = line.substring(0, colonIndex).trim();
                var value = line.substring(colonIndex + 1).trim();
                meta[key] = value;
            }
        });

        return { meta: meta, body: body };
    }

    function updatePreview() {
        if (!preview) return;

        var dnaContent = (dnaTextarea.value || '').trim();
        var cssContent = (cssTextarea.value || '').trim();

        if (!dnaContent && !cssContent) {
            preview.innerHTML = '<p class="preview-empty">Paste content above to see a preview</p>';
            return;
        }

        var html = '';

        if (dnaContent) {
            var parsed = parseFrontmatter(dnaContent);
            var name = parsed.meta.name || '(no name in frontmatter)';
            var desc = parsed.meta.description || '';

            if (!titleInput.value.trim() && name) {
                titleInput.value = name;
            }
            if (!descInput.value.trim() && desc) {
                descInput.value = desc;
            }

            html += '<div class="preview-section">';
            html += '<div class="preview-label">Style DNA</div>';
            html += '<div class="preview-title">' + escapeHtml(name) + '</div>';
            html += '<div class="preview-desc">' + escapeHtml(desc) + '</div>';
            html += '<pre style="max-height:150px;overflow:auto;font-size:0.8rem;background:#282c34;color:#abb2bf;padding:0.75rem;border-radius:8px;">' +
                escapeHtml(dnaContent.substring(0, 500)) +
                (dnaContent.length > 500 ? '\n...' : '') +
                '</pre>';
            html += '</div>';
        }

        if (cssContent) {
            html += '<div class="preview-section">';
            html += '<div class="preview-label">CSS Snippet</div>';
            html += '<pre style="max-height:200px;overflow:auto;font-size:0.85rem;background:#282c34;color:#abb2bf;padding:0.75rem;border-radius:8px;">' +
                escapeHtml(cssContent.substring(0, 1000)) +
                (cssContent.length > 1000 ? '\n...' : '') +
                '</pre>';
            html += '</div>';
        }

        preview.innerHTML = html;
    }

    form.addEventListener('submit', function(e) {
        var dna = (dnaTextarea.value || '').trim();
        var css = (cssTextarea.value || '').trim();

        if (!dna && !css) {
            e.preventDefault();
            dnaTextarea.focus();
            return;
        }
    });

    if (dnaTextarea) {
        dnaTextarea.addEventListener('input', debounce(updatePreview, 500));
    }
    if (cssTextarea) {
        cssTextarea.addEventListener('input', debounce(updatePreview, 500));
    }

    function debounce(fn, delay) {
        var timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    updatePreview();
})();
