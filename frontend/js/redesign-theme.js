/**
 * frontend/js/redesign-theme.js
 * Gestion du Dark Mode (M3) pour le portail OCO
 */

// --- Dark Mode / Theme Toggle Management ---
(function() {
    var theme = localStorage.getItem('oco_theme') || 'auto';
    var isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(isDark ? 'theme-dark' : 'theme-light');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
})();

window.updateThemeIcon = function() {
    var btn = document.getElementById('btnThemeToggle');
    var img = document.getElementById('imgThemeToggle');
    if (!btn || !img) return;
    
    var isDark = document.documentElement.classList.contains('theme-dark');
    if (isDark) {
        img.src = 'img/theme-sun.light.svg';
        btn.title = window.OcoLangNavbar && window.OcoLangNavbar.themeLight ? window.OcoLangNavbar.themeLight : 'Basculer en thème clair';
    } else {
        img.src = 'img/theme-moon.light.svg';
        btn.title = window.OcoLangNavbar && window.OcoLangNavbar.themeDark ? window.OcoLangNavbar.themeDark : 'Basculer en thème sombre';
    }
};

var _easterEggClickCount = 0;
var _easterEggLastClick = 0;

window.toggleDarkMode = function() {
    // --- Easter Egg Logic ---
    var now = Date.now();
    if (now - _easterEggLastClick < 400) {
        _easterEggClickCount++;
    } else {
        _easterEggClickCount = 1;
    }
    _easterEggLastClick = now;

    if (_easterEggClickCount >= 15) {
        document.documentElement.style.filter = 'invert(1)';
        var btn = document.getElementById('btnThemeToggle');
        if (btn) {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
            btn.title = "Easter egg activé ! Rafraîchissez la page.";
        }
        return;
    }
    // --- End Easter Egg Logic ---

    var isCurrentlyDark = document.documentElement.classList.contains('theme-dark');
    var nextTheme = isCurrentlyDark ? 'light' : 'dark';
    
    localStorage.setItem('oco_theme', nextTheme);
    
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add('theme-' + nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
    
    window.updateThemeIcon();
};

document.addEventListener('DOMContentLoaded', function() {
    // Injecter le bouton de changement de thème s'il n'existe pas déjà
    if (!document.getElementById('btnThemeToggle')) {
        var headerRight = document.querySelector('#header .right');
        if (headerRight) {
            var separator = document.createElement('span');
            separator.className = 'separator noprint';
            
            var btn = document.createElement('button');
            btn.id = 'btnThemeToggle';
            btn.className = 'noprint';
            btn.onclick = function() {
                window.toggleDarkMode();
            };
            
            var img = document.createElement('img');
            img.id = 'imgThemeToggle';
            img.src = 'img/theme-moon.light.svg'; // Valeur par défaut
            
            btn.appendChild(img);
            
            var btnLogout = document.getElementById('btnLogout');
            if (btnLogout) {
                headerRight.insertBefore(separator, btnLogout);
                headerRight.insertBefore(btn, btnLogout);
            } else {
                headerRight.appendChild(separator);
                headerRight.appendChild(btn);
            }
            
            window.updateThemeIcon();
        }
    } else {
        window.updateThemeIcon();
    }
});
