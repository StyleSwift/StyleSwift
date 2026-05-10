(function() {
    var installBtn = document.getElementById('install-btn');
    var copyBtn = document.getElementById('copy-btn');

    if (installBtn) {
        installBtn.addEventListener('click', function() {
            var slug = this.getAttribute('data-slug');

            // Increment download counter
            fetch('/api/skill/' + slug + '/install', { method: 'POST' });

            // Open install page in a small popup
            var width = 420;
            var height = 400;
            var left = (screen.width - width) / 2;
            var top = (screen.height - height) / 2;
            window.open(
                '/install/' + slug,
                'styleswift_install',
                'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes'
            );
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            var slug = this.getAttribute('data-slug');
            var btn = this;

            fetch('/api/skill/' + slug + '/raw')
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var parts = [];
                    if (data.content) parts.push(data.content);
                    if (data.css_content) parts.push('/* CSS Snippet */\n' + data.css_content);
                    return navigator.clipboard.writeText(parts.join('\n\n'));
                })
                .then(function() {
                    btn.innerHTML = '<span class="icon icon-check" style="width:16px;height:16px"></span> Copied!';
                    setTimeout(function() {
                        btn.innerHTML = '<span class="icon icon-copy" style="width:16px;height:16px"></span> Copy to Clipboard';
                    }, 2000);
                })
                .catch(function() {
                    btn.textContent = 'Failed to copy';
                    setTimeout(function() {
                        btn.innerHTML = '<span class="icon icon-copy" style="width:16px;height:16px"></span> Copy to Clipboard';
                    }, 2000);
                });
        });
    }
})();
