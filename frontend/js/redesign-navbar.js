/**
 * frontend/js/redesign-navbar.js
 * Gestion de la navigation supérieure (Top App Bar M3) et du Favicon dynamique
 */

// --- Gestion Globale de l'état Actif de la Navbar M3 ---

/**
 * Met à jour les classes actives sur les boutons de navigation en fonction de la vue actuelle
 * @param {string|null} targetUrl - URL cible optionnelle (utilisée lors de l'interception de navigation)
 */
window.updateActiveNavbarLink = function(targetUrl = null) {
    const btnComputers = document.getElementById('m3NavComputers');
    const btnStore = document.getElementById('m3NavStore');
    const btnJobs = document.getElementById('m3NavJobs');

    if (!btnComputers || !btnStore || !btnJobs) return;

    // Retirer la classe active de tous les boutons de navigation
    btnComputers.classList.remove('active');
    btnStore.classList.remove('active');
    btnJobs.classList.remove('active');

    // Déterminer l'URL ou la vue actuelle
    let currentUrl = targetUrl || window.currentExplorerContentUrl || '';

    // Si aucune URL directe n'est disponible (ex: premier chargement de page direct), extraire depuis les query params
    if (!currentUrl) {
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        if (viewParam) {
            currentUrl = `views/${viewParam}.php`;
        }
    }

    // Appliquer la classe .active sur le bouton correspondant au chemin de la vue
    if (currentUrl.includes('views/computers.php') || currentUrl.includes('views/computer-details.php')) {
        btnComputers.classList.add('active');
    } else if (currentUrl.includes('views/packages.php') || currentUrl.includes('views/package-details.php')) {
        btnStore.classList.add('active');
    } else if (currentUrl.includes('views/job-containers.php') || currentUrl.includes('views/job-container-details.php') || currentUrl.includes('views/job-container-new.php')) {
        btnJobs.classList.add('active');
    }
};

// Intercepter globalement la fonction d'AJAX navigation d'OCO pour mettre à jour la Navbar instantanément
if (typeof window.refreshContentExplorer === 'function' && !window.refreshContentExplorer.isWrapped) {
    const originalRefreshContentExplorer = window.refreshContentExplorer;
    window.refreshContentExplorer = function(url, ...args) {
        if (typeof originalRefreshContentExplorer === 'function') {
            originalRefreshContentExplorer(url, ...args);
        }
        // Intercepter l'URL et mettre à jour la Navbar
        window.updateActiveNavbarLink(url);
    };
    window.refreshContentExplorer.isWrapped = true;
}

window.initM3Favicon = function() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = 'ajax-handler/index.php/favicon.php';
};

window.translateM3Navbar = function() {
    const btnComputers = document.getElementById('m3NavComputers');
    const btnStore = document.getElementById('m3NavStore');
    const btnJobs = document.getElementById('m3NavJobs');

    if (window.OcoLangNavbar) {
        if (btnComputers) {
            btnComputers.innerHTML = '<img src="img/computer.dyn.svg" class="m3-navbar-btn-icon"> ' + (window.OcoLangNavbar.computers || 'Mes Ordinateurs');
        }
        if (btnStore) {
            btnStore.innerHTML = '<img src="img/package.dyn.svg" class="m3-navbar-btn-icon"> ' + (window.OcoLangNavbar.store || 'App Store');
        }
        if (btnJobs) {
            btnJobs.innerHTML = '<img src="img/job.dyn.svg" class="m3-navbar-btn-icon"> ' + (window.OcoLangNavbar.jobs || 'Mes Tâches');
        }
    }
};

window.initM3Navbar = function() {
    const header = document.getElementById('header');
    if (!header) return;

    // Ne pas ajouter la navigation sur la page de connexion (login.php)
    if (document.getElementById('login') || window.location.pathname.indexOf('login.php') !== -1) {
        return;
    }

    // 1. Cacher l'ancienne sidebar et forcer l'état plié via l'API OCO si dispo
    if (typeof window.toggleSidebar === 'function') {
        window.toggleSidebar(false);
    }

    // 2. Nettoyer les boutons existants inutiles
    const btnSidebar = document.getElementById('btnSidebar');
    if (btnSidebar) {
        btnSidebar.style.display = 'none';
    }
    const btnHomepage = document.getElementById('btnHomepage');
    if (btnHomepage) {
        btnHomepage.style.display = 'none';
    }

    // 3. Créer le conteneur du menu de navigation central (s'il n'existe pas déjà)
    let navLinks = document.getElementById('m3NavLinks');
    if (!navLinks) {
        navLinks = document.createElement('div');
        navLinks.id = 'm3NavLinks';
        navLinks.className = 'm3-navbar-links';

        // Bouton 1: Ordinateurs
        const btnComputers = document.createElement('button');
        btnComputers.id = 'm3NavComputers';
        btnComputers.className = 'm3-navbar-link';
        const labelComputers = window.OcoLangNavbar && window.OcoLangNavbar.computers ? window.OcoLangNavbar.computers : 'Mes Ordinateurs';
        btnComputers.innerHTML = '<img src="img/computer.dyn.svg" class="m3-navbar-btn-icon"> ' + labelComputers;
        btnComputers.onclick = (e) => {
            e.preventDefault();
            navLinks.classList.remove('show-mobile-menu');
            if (typeof window.refreshContentExplorer === 'function') {
                window.refreshContentExplorer("views/computers.php");
            }
        };

        // Bouton 2: Catalogue / App Store
        const btnStore = document.createElement('button');
        btnStore.id = 'm3NavStore';
        btnStore.className = 'm3-navbar-link';
        const labelStore = window.OcoLangNavbar && window.OcoLangNavbar.store ? window.OcoLangNavbar.store : 'App Store';
        btnStore.innerHTML = '<img src="img/package.dyn.svg" class="m3-navbar-btn-icon"> ' + labelStore;
        btnStore.onclick = (e) => {
            e.preventDefault();
            navLinks.classList.remove('show-mobile-menu');
            if (typeof window.refreshContentExplorer === 'function') {
                window.refreshContentExplorer("views/packages.php");
            }
        };

        // Bouton 3: Mes Tâches / Suivi
        const btnJobs = document.createElement('button');
        btnJobs.id = 'm3NavJobs';
        btnJobs.className = 'm3-navbar-link';
        const labelJobs = window.OcoLangNavbar && window.OcoLangNavbar.jobs ? window.OcoLangNavbar.jobs : 'Mes Tâches';
        btnJobs.innerHTML = '<img src="img/job.dyn.svg" class="m3-navbar-btn-icon"> ' + labelJobs;
        btnJobs.onclick = (e) => {
            e.preventDefault();
            navLinks.classList.remove('show-mobile-menu');
            if (typeof window.refreshContentExplorer === 'function') {
                window.refreshContentExplorer("views/job-containers.php");
            }
        };

        navLinks.appendChild(btnComputers);
        navLinks.appendChild(btnStore);
        navLinks.appendChild(btnJobs);

        // Insérer au centre : après la partie gauche (titre/logo) et avant la partie droite
        const leftSpan = header.querySelector('.left');
        if (leftSpan) {
            leftSpan.after(navLinks);
        } else {
            header.appendChild(navLinks);
        }
    }

    // Mettre à jour l'élément actif de la Navbar
    window.updateActiveNavbarLink();

    // 4. Ajouter le logo cliquable tout en haut tout à gauche, avant le titre
    let logoBtn = document.getElementById('m3NavbarLeftLogo');
    if (!logoBtn) {
        const leftSpan = header.querySelector('.left');
        if (leftSpan) {
            logoBtn = document.createElement('a');
            logoBtn.id = 'm3NavbarLeftLogo';
            logoBtn.href = '#';
            logoBtn.className = 'noprint';
            logoBtn.style.display = 'inline-flex';
            logoBtn.style.alignItems = 'center';
            logoBtn.style.justifyContent = 'center';
            logoBtn.style.marginRight = '12px';
            logoBtn.style.cursor = 'pointer';
            logoBtn.onclick = (e) => {
                e.preventDefault();
                if (typeof window.refreshContentExplorer === 'function') {
                    window.refreshContentExplorer("views/homepage.php");
                }
            };

            const logoImg = document.createElement('img');
            logoImg.src = 'ajax-handler/index.php/logo.php';
            logoImg.alt = 'Logo';
            logoImg.style.height = '32px';
            logoImg.style.borderRadius = '4px';
            logoImg.style.transition = 'all 0.2s ease';
            // Filtre blanc pur très contrasté
            logoImg.style.filter = 'brightness(0) invert(1)';
            logoImg.style.opacity = '0.9';

            logoImg.onmouseover = () => {
                logoImg.style.opacity = '1';
                logoImg.style.transform = 'scale(1.08)';
            };
            logoImg.onmouseout = () => {
                logoImg.style.opacity = '0.9';
                logoImg.style.transform = 'scale(1)';
            };

            logoBtn.appendChild(logoImg);

            // Insérer avant le lien titre
            const titleEl = leftSpan.querySelector('.title');
            if (titleEl) {
                leftSpan.insertBefore(logoBtn, titleEl);
            } else {
                leftSpan.appendChild(logoBtn);
            }
        }
    }

    // 5. Créer et injecter le bouton burger dans .right
    let burgerBtn = document.getElementById('m3BurgerBtn');
    if (!burgerBtn) {
        const rightSpan = header.querySelector('.right');
        if (rightSpan) {
            burgerBtn = document.createElement('button');
            burgerBtn.id = 'm3BurgerBtn';
            burgerBtn.className = 'm3-navbar-link m3-burger-btn noprint';
            // Utiliser une icône burger SVG blanche, propre et stylisée M3
            burgerBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="display: block;">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
            `;
            
            burgerBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const navLinks = document.getElementById('m3NavLinks');
                if (navLinks) {
                    navLinks.classList.toggle('show-mobile-menu');
                }
            };
            
            // Insérer au début de .right (avant le logout, refresh, etc.)
            rightSpan.insertBefore(burgerBtn, rightSpan.firstChild);
        }
    }

    // Fermer le menu burger lors d'un clic en dehors
    if (!window.m3BurgerOutsideClickRegistered) {
        document.addEventListener('click', (e) => {
            const navLinks = document.getElementById('m3NavLinks');
            const burgerBtn = document.getElementById('m3BurgerBtn');
            if (navLinks && navLinks.classList.contains('show-mobile-menu')) {
                if (!navLinks.contains(e.target) && (!burgerBtn || !burgerBtn.contains(e.target))) {
                    navLinks.classList.remove('show-mobile-menu');
                }
            }
        });
        window.m3BurgerOutsideClickRegistered = true;
    }

    // Traduire les boutons si les traductions sont disponibles
    window.translateM3Navbar();
};
