(function() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    const root = document.documentElement;

    function getPreferred() {
        const stored = localStorage.getItem('theme');
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    setTheme(getPreferred());

    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        const current = root.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';

        // Smooth transition
        root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTheme(next);
        setTimeout(function() { root.style.transition = ''; }, 300);
    });
})();
