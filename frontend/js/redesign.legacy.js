/**
 * frontend/js/redesign.legacy.js - COPIE DE SAUVEGARDE HISTORIQUE (MONOLITHE)
 * Logique dynamique originale pour l'extension OCO Self-Service Portal Redesign (Material Design 3)
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
        btn.title = 'Basculer en thème clair';
    } else {
        img.src = 'img/theme-moon.light.svg';
        btn.title = 'Basculer en thème sombre';
    }
};

window.toggleDarkMode = function() {
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

window.initOcoPortalRedesign = function() {
    // 1. Toujours initialiser la Navbar M3, le favicon et cacher la sidebar sur TOUTES les pages
    initM3Navbar();
    initM3Favicon();

    // 2. S'assurer que les configurations OCO sont disponibles avant d'initialiser le catalogue packages
    if (typeof window.OcoConfig === 'undefined') {
        return;
    }

    // --- Variables d'État ---
    let appState = {
        computers: [],
        packages: [],
        selectedComputer: null,
        selectedPackages: new Set(),
        activeOsFilters: new Set(['windows', 'macos', 'linux']), // tous activés par défaut
        searchQuery: '',
        showInstalledOnly: false,
        showUpdatesOnly: window.OcoConfig.preselectedUpdatesOnly ? true : false
    };

    // --- Sélecteurs du DOM ---
    const dom = {
        osChips: document.getElementById('m3OsChips'),
        targetComputer: document.getElementById('m3TargetComputer'),
        storeSearch: document.getElementById('m3StoreSearch'),
        installedOnly: document.getElementById('m3InstalledOnly'),
        updatesOnly: document.getElementById('m3UpdatesOnly'),
        storeGrid: document.getElementById('m3StoreGrid'),
        
        // Cart / Bottom Drawer
        bottomDrawer: document.getElementById('m3BottomDrawer'),
        cartCount: document.getElementById('m3CartCount'),
        cartTextRecap: document.getElementById('m3CartTextRecap'),
        cartSummaryBtn: document.getElementById('m3CartSummaryBtn'),
        cartRecapPanel: document.getElementById('m3CartRecapPanel'),
        cartRecapList: document.getElementById('m3CartRecapList'),
        deployBtn: document.getElementById('m3DeployBtn'),
        deployTooltip: document.getElementById('m3DeployTooltip'),
        
        // Modal
        confirmModal: document.getElementById('m3ConfirmModal'),
        jobName: document.getElementById('m3JobName'),
        recapTarget: document.getElementById('m3RecapTarget'),
        modalRecapList: document.getElementById('m3ModalRecapList'),
        modalWol: document.getElementById('m3ModalWol'),
        modalShutdown: document.getElementById('m3Shutdown'),
        modalShutdownRow: document.getElementById('m3ShutdownRow'),
        cancelDeployBtn: document.getElementById('m3CancelDeployBtn'),
        confirmDeployBtn: document.getElementById('m3ConfirmDeployBtn'),
        forceInstall: document.getElementById('m3ForceInstall')
    };

    // --- Initialisation ---
    init();

    async function init() {
        try {
            // Charger les ordinateurs et paquets en parallèle
            const [computersRes, packagesRes] = await Promise.all([
                fetch(window.OcoConfig.ajaxUrlComputers),
                fetch(window.OcoConfig.ajaxUrlPackages)
            ]);

            if (!computersRes.ok || !packagesRes.ok) {
                throw new Error('Erreur lors du chargement des données API.');
            }

            appState.computers = await computersRes.json();
            appState.packages = await packagesRes.json();

            // S'il y a un paquet pré-sélectionné dans l'URL, l'ajouter à l'état
            if (window.OcoConfig.preselectedPackageId !== null) {
                appState.selectedPackages.add(window.OcoConfig.preselectedPackageId);
            }

            // Configurer les écouteurs d'événements et remplir les sélecteurs
            setupTargetComputerSelect();
            setupOsFilters();
            setupSearch();
            setupInstalledOnlySwitch();
            setupUpdatesOnlySwitch();
            setupCartEvents();
            setupModalEvents();

            // Premier rendu du catalogue
            render();

        } catch (error) {
            console.error('Erreur d\'initialisation:', error);
            if (dom.storeGrid) {
                dom.storeGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--m3-error);">
                        ⚠️ Impossible de charger le catalogue d'applications.<br>${error.message}
                    </div>
                `;
            }
        }
    }

    function initM3Favicon() {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = 'ajax-handler/index.php/favicon.php';
    }

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

    function initM3Navbar() {
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

        window.translateM3Navbar();
    }

    // --- Configuration des Éléments de l'Interface ---

    function getSimplifiedOsName(osString) {
        if (!osString) return '';
        const lower = osString.toLowerCase();
        if (lower.includes('win')) return 'Windows';
        if (lower.includes('mac') || lower.includes('darwin')) return 'MacOS';
        if (lower.includes('debian')) return 'Debian';
        if (lower.includes('ubuntu')) return 'Ubuntu';
        if (lower.includes('linux')) return 'Linux';
        return osString; // fallback: le nom complet s'affiche
    }

    function setupTargetComputerSelect() {
        if (!dom.targetComputer) return;

        // Trier les ordinateurs par nombre de paquets installés (le plus utilisé en premier)
        appState.computers.sort((a, b) => {
            const countA = a.installed_packages ? a.installed_packages.length : 0;
            const countB = b.installed_packages ? b.installed_packages.length : 0;
            return countB - countA; // Tri décroissant
        });

        // Vider la liste déroulante (on supprime l'option "Sélectionnez une machine...")
        dom.targetComputer.innerHTML = '';

        appState.computers.forEach(comp => {
            const opt = document.createElement('option');
            opt.value = comp.id;
            const simplifiedOs = getSimplifiedOsName(comp.os);
            opt.textContent = `${comp.hostname} (${simplifiedOs})`;
            dom.targetComputer.appendChild(opt);
        });

        // Appliquer les règles de sélection
        let targetId = null;

        // Règle B : Pré-sélection depuis l'URL (?computer_id=X)
        if (window.OcoConfig.preselectedComputerId !== null) {
            targetId = window.OcoConfig.preselectedComputerId;
        }
        // NOUVELLE RÈGLE : Sélectionner par défaut le premier ordinateur de la liste (s'il y en a) qui est maintenant le plus utilisé
        else if (appState.computers.length > 0) {
            targetId = appState.computers[0].id;
        }

        // Si on a un paquet pré-sélectionné dans l'URL, on s'assure d'avoir un ordinateur compatible
        if (window.OcoConfig.preselectedPackageId !== null && targetId !== null) {
            const preselectedPkg = appState.packages.find(p => p.id === window.OcoConfig.preselectedPackageId);
            if (preselectedPkg) {
                let activeComp = appState.computers.find(c => c.id === parseInt(targetId));
                const targetOs = getNormalizedOsName(activeComp ? activeComp.os : '');
                if (!activeComp || !isPackageCompatible(preselectedPkg, targetOs)) {
                    // Trouver la première machine de l'utilisateur compatible with ce paquet
                    const compatibleComp = appState.computers.find(c => {
                        const osName = getNormalizedOsName(c.os);
                        return isPackageCompatible(preselectedPkg, osName);
                    });
                    if (compatibleComp) {
                        targetId = compatibleComp.id;
                    }
                }
            }
        }

        if (targetId) {
            dom.targetComputer.value = targetId;
            const selectedComp = appState.computers.find(c => c.id === parseInt(targetId));
            if (selectedComp) {
                appState.selectedComputer = selectedComp;
                
                // Règle métier critique : Activer par défaut l'OS de la machine sélectionnée
                setOsFilterFromComputer(selectedComp);
            }
        }

        // Écouteur de changement de cible
        dom.targetComputer.addEventListener('change', (e) => {
            const compId = parseInt(e.target.value);
            if (isNaN(compId)) return;
            const comp = appState.computers.find(c => c.id === compId);
            appState.selectedComputer = comp || null;
            
            if (comp) {
                setOsFilterFromComputer(comp);
            }
            
            // Réinitialiser les sélections incompatibles si nécessaire
            validateSelectedPackagesCompatibility();
            
            render();
        });
    }

    function setOsFilterFromComputer(comp) {
        if (!comp) return;
        let targetOs = getNormalizedOsName(comp.os);
        if (targetOs === 'other') {
            targetOs = 'linux';
        }

        appState.activeOsFilters.clear();
        appState.activeOsFilters.add(targetOs);

        // Mettre à jour l'état visuel des puces OS
        if (dom.osChips) {
            const chips = dom.osChips.querySelectorAll('.m3-os-chip');
            chips.forEach(chip => {
                const os = chip.getAttribute('data-os');
                if (os === targetOs) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
        }
    }

    function setupOsFilters() {
        if (!dom.osChips) return;

        const chips = dom.osChips.querySelectorAll('.m3-os-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const os = chip.getAttribute('data-os');
                
                // Si un ordinateur cible est sélectionné, on ne peut pas forcer un filtre OS différent
                if (appState.selectedComputer) {
                    const compOs = getNormalizedOsName(appState.selectedComputer.os);
                    if (os !== compOs) {
                        // Empêcher l'action car l'ordinateur cible restreint l'OS
                        const alertMsg = window.OcoLang && window.OcoLang.filterLocked 
                            ? window.OcoLang.filterLocked.replace('%s', compOs)
                            : `Filtre verrouillé sur ${compOs} car la machine cible active est sous cet OS.`;
                        alert(alertMsg);
                        return;
                    }
                }

                // Toggling standard
                if (appState.activeOsFilters.has(os)) {
                    // S'assurer qu'au moins un filtre reste actif
                    if (appState.activeOsFilters.size > 1) {
                        appState.activeOsFilters.delete(os);
                        chip.classList.remove('active');
                    }
                } else {
                    appState.activeOsFilters.add(os);
                    chip.classList.add('active');
                }

                render();
            });
        });
    }

    function setupSearch() {
        if (!dom.storeSearch) return;

        dom.storeSearch.addEventListener('input', (e) => {
            appState.searchQuery = e.target.value.toLowerCase().trim();
            render();
        });
    }

    function setupInstalledOnlySwitch() {
        if (!dom.installedOnly) return;

        dom.installedOnly.addEventListener('change', (e) => {
            appState.showInstalledOnly = e.target.checked;
            render();
        });
    }

    function setupUpdatesOnlySwitch() {
        if (!dom.updatesOnly) return;

        // Synchroniser visuellement la case à cocher avec l'état par défaut (si activé via URL)
        dom.updatesOnly.checked = appState.showUpdatesOnly;

        dom.updatesOnly.addEventListener('change', (e) => {
            appState.showUpdatesOnly = e.target.checked;
            render();
        });
    }

    function setupCartEvents() {
        if (!dom.cartSummaryBtn || !dom.cartRecapPanel) return;

        // Toggle du panneau récapitulatif du panier
        dom.cartSummaryBtn.addEventListener('click', () => {
            dom.cartRecapPanel.classList.toggle('open');
            const isOpen = dom.cartRecapPanel.classList.contains('open');
            dom.cartSummaryBtn.querySelector('span:last-child').textContent = isOpen ? '▲' : '▼';
        });

        // Ouvrir la modale au clic sur déployer
        if (dom.deployBtn) {
            dom.deployBtn.addEventListener('click', () => {
                if (appState.selectedComputer && appState.selectedPackages.size > 0) {
                    openConfirmationModal();
                }
            });
        }
    }

    function setupModalEvents() {
        if (!dom.cancelDeployBtn || !dom.confirmDeployBtn) return;

        dom.cancelDeployBtn.addEventListener('click', closeConfirmationModal);
        
        dom.confirmDeployBtn.addEventListener('click', submitDeployment);

        // Gérer le toggle WOL et état du bouton d'extinction
        if (dom.modalWol && dom.modalShutdown) {
            dom.modalWol.addEventListener('change', (e) => {
                dom.modalShutdown.disabled = !e.target.checked;
                if (!e.target.checked) {
                    dom.modalShutdown.checked = false;
                }
            });
        }
    }

    // --- Fonctions de Filtrage et Validation ---

    function getNormalizedOsName(osString) {
        if (!osString) return 'other';
        const lower = osString.toLowerCase();
        if (lower.includes('win')) return 'windows';
        if (lower.includes('mac') || lower.includes('darwin')) return 'macos';
        if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('debian') || lower.includes('mint') || lower.includes('fedora') || lower.includes('suse') || lower.includes('redhat') || lower.includes('centos') || lower.includes('arch')) return 'linux';
        return 'other';
    }

    function validateSelectedPackagesCompatibility() {
        if (!appState.selectedComputer) return;

        const targetOs = getNormalizedOsName(appState.selectedComputer.os);
        
        // Retirer les paquets sélectionnés qui ne sont pas compatibles avec le nouvel ordinateur
        appState.selectedPackages.forEach(pkgId => {
            const pkg = appState.packages.find(p => p.id === pkgId);
            if (pkg && !isPackageCompatible(pkg, targetOs)) {
                appState.selectedPackages.delete(pkgId);
            }
        });

        updateCart();
    }

    function isPackageCompatible(pkg, osName) {
        if (!pkg.compatible_os) return true; // Si vide, considéré compatible
        const compatLower = pkg.compatible_os.toLowerCase();
        
        // Validation générique par catégorie d'OS
        if (osName === 'windows' && (compatLower.includes('win') || compatLower.includes('microsoft'))) return true;
        if (osName === 'macos' && (compatLower.includes('mac') || compatLower.includes('darwin') || compatLower.includes('apple'))) return true;
        if (osName === 'linux' && (compatLower.includes('linux') || compatLower.includes('ubuntu') || compatLower.includes('debian') || compatLower.includes('mint') || compatLower.includes('fedora') || compatLower.includes('suse') || compatLower.includes('redhat') || compatLower.includes('centos') || compatLower.includes('arch'))) return true;
        
        // De plus, si l'un des OS compatibles spécifiés correspond précisément à l'OS brut rapporté par l'ordinateur
        if (appState.selectedComputer && appState.selectedComputer.os) {
            const rawOs = appState.selectedComputer.os.trim().toLowerCase();
            const lines = pkg.compatible_os.split('\n');
            for (let line of lines) {
                const trimmedLine = line.trim().toLowerCase();
                if (trimmedLine === rawOs || rawOs.includes(trimmedLine) || trimmedLine.includes(rawOs)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // --- Fonctions de Rendu (Rendu des cartes de paquets) ---

    function render() {
        if (!dom.storeGrid) return;

        dom.storeGrid.innerHTML = '';

        // Déterminer l'OS cible s'il y en a un
        const targetOs = appState.selectedComputer ? getNormalizedOsName(appState.selectedComputer.os) : null;

        // Filtrer les paquets
        const filteredPackages = appState.packages.filter(pkg => {
            // Filtre par OS de la machine cible (Règle métier C : Un ordinateur sélectionné filtre immédiatement le catalogue)
            if (targetOs) {
                if (!isPackageCompatible(pkg, targetOs)) {
                    return false;
                }
            } else {
                // Sinon, filtrer par puces OS actives
                let matchesOsChip = false;
                appState.activeOsFilters.forEach(os => {
                    if (isPackageCompatible(pkg, os)) {
                        matchesOsChip = true;
                    }
                });
                if (!matchesOsChip) return false;
            }

            // Filtre par recherche textuelle (Nom ou famille d'applications)
            if (appState.searchQuery) {
                const nameMatch = pkg.fullName.toLowerCase().includes(appState.searchQuery);
                const familyMatch = pkg.name.toLowerCase().includes(appState.searchQuery);
                if (!nameMatch && !familyMatch) return false;
            }

            // Filtre "Installés uniquement"
            if (appState.showInstalledOnly) {
                if (!appState.selectedComputer) {
                    return false; // Impossible de savoir s'il est installé sans machine sélectionnée
                }
                const isInstalled = appState.selectedComputer.installed_packages.includes(pkg.id);
                if (!isInstalled) return false;
            }

            // Filtre "MAJ uniquement"
            if (appState.showUpdatesOnly) {
                const nameLower = pkg.fullName ? pkg.fullName.toLowerCase() : '';
                const familyLower = pkg.name ? pkg.name.toLowerCase() : '';
                if (!nameLower.includes('maj') && !familyLower.includes('maj')) {
                    return false;
                }
            }

            return true;
        });

        // Rendu des cartes de paquets
        if (filteredPackages.length === 0) {
            dom.storeGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-secondary);">
                    📭 Aucun paquet disponible avec les filtres actuels.
                </div>
            `;
            return;
        }

        filteredPackages.forEach(pkg => {
            const card = document.createElement('div');
            card.className = 'm3-package-card';
            
            const isSelected = appState.selectedPackages.has(pkg.id);
            const isInstalled = appState.selectedComputer && appState.selectedComputer.installed_packages.includes(pkg.id);

            if (isSelected) card.classList.add('selected');
            if (isInstalled) card.classList.add('installed');

            // Formater la taille proprement
            const niceSize = pkg.size ? formatBytes(pkg.size) : (window.OcoLang && window.OcoLang.unknownSize ? window.OcoLang.unknownSize : 'Taille inconnue');

            // Macarons de compatibilité OS de la carte
            let compatChipsHtml = '';
            if (pkg.compatible_os) {
                const compatLower = pkg.compatible_os.toLowerCase();
                if (compatLower.includes('win')) {
                    compatChipsHtml += `
                        <div class="m3-compat-badge win" title="Windows">
                            <img src="img/windows.dyn.svg" class="m3-compat-icon" alt="Windows">
                        </div>
                    `;
                }
                if (compatLower.includes('mac') || compatLower.includes('darwin')) {
                    compatChipsHtml += `
                        <div class="m3-compat-badge mac" title="MacOS">
                            <img src="img/apple.dyn.svg" class="m3-compat-icon" alt="MacOS">
                        </div>
                    `;
                }
                if (compatLower.includes('debian')) {
                    compatChipsHtml += `
                        <div class="m3-compat-badge debian" title="Debian">
                            <img src="img/linux.dyn.svg" class="m3-compat-icon" alt="Debian">
                        </div>
                    `;
                }
                if (compatLower.includes('ubuntu')) {
                    compatChipsHtml += `
                        <div class="m3-compat-badge ubuntu" title="Ubuntu">
                            <img src="img/linux.dyn.svg" class="m3-compat-icon" alt="Ubuntu">
                        </div>
                    `;
                }
                if (compatLower.includes('linux') && !compatLower.includes('debian') && !compatLower.includes('ubuntu')) {
                    compatChipsHtml += `
                        <div class="m3-compat-badge linux" title="Linux">
                            <img src="img/linux.dyn.svg" class="m3-compat-icon" alt="Linux">
                        </div>
                    `;
                }
            }

            // Statuts Badge / Checkmark
            let badgesHtml = '';
            if (isSelected) {
                badgesHtml += `
                    <div class="m3-card-checkmark" title="Sélectionné pour installation">
                        ✓
                    </div>
                `;
            }

            card.innerHTML = `
                ${badgesHtml}
                <div class="m3-package-top">
                    <div class="m3-package-top-left">
                        <img src="${pkg.icon || 'img/package.dyn.svg'}" onerror="this.src='img/package.dyn.svg'" class="m3-package-logo" alt="${pkg.fullName}">
                        <div class="m3-package-identity">
                            <h3 class="m3-package-name" title="${pkg.fullName}">${pkg.fullName}</h3>
                            <span class="m3-package-version">${pkg.version}</span>
                        </div>
                    </div>
                    <div class="m3-package-compat">
                        ${compatChipsHtml}
                    </div>
                </div>
            `;

            // Sélectionner par clic sur la carte
            card.addEventListener('click', () => {
                togglePackageSelection(pkg.id);
            });

            dom.storeGrid.appendChild(card);
        });

        // Mettre à jour l'état du panier
        updateCart();
    }

    function togglePackageSelection(pkgId) {
        if (appState.selectedPackages.has(pkgId)) {
            appState.selectedPackages.delete(pkgId);
        } else {
            appState.selectedPackages.add(pkgId);
        }
        render();
    }

    // --- Gestion du Panier (Basket) ---

    function updateCart() {
        if (!dom.bottomDrawer || !dom.cartCount || !dom.cartTextRecap || !dom.deployBtn) return;

        const count = appState.selectedPackages.size;

        if (count > 0) {
            dom.bottomDrawer.classList.add('visible');
            dom.cartCount.textContent = count;

            // Mettre à jour le texte récapitulatif
            const names = [];
            appState.selectedPackages.forEach(id => {
                const pkg = appState.packages.find(p => p.id === id);
                if (pkg) names.push(pkg.fullName);
            });
            dom.cartTextRecap.innerHTML = `Prêt à installer : <strong>${names.join(', ')}</strong>`;

            // Remplir la liste déroulante récapitulative
            if (dom.cartRecapList) {
                dom.cartRecapList.innerHTML = '';
                appState.selectedPackages.forEach(id => {
                    const pkg = appState.packages.find(p => p.id === id);
                    if (pkg) {
                        const li = document.createElement('li');
                        li.innerHTML = `<strong>${pkg.fullName}</strong> (v${pkg.version}) - <span style="font-size:0.8rem; color:var(--text-secondary); cursor:pointer;" class="m3-remove-pkg" data-id="${pkg.id}">Retirer</span>`;
                        dom.cartRecapList.appendChild(li);
                    }
                });

                // Événements pour retirer un paquet du panier déroulant
                dom.cartRecapList.querySelectorAll('.m3-remove-pkg').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = parseInt(btn.getAttribute('data-id'));
                        appState.selectedPackages.delete(id);
                        render();
                    });
                });
            }

            // Activer ou désactiver le bouton déployer en fonction de la machine cible (Règle critique)
            if (appState.selectedComputer) {
                dom.deployBtn.disabled = false;
                if (dom.deployTooltip) dom.deployTooltip.style.visibility = 'hidden';
            } else {
                dom.deployBtn.disabled = true;
                if (dom.deployTooltip) dom.deployTooltip.style.visibility = 'visible';
            }

        } else {
            dom.bottomDrawer.classList.remove('visible');
            dom.cartRecapPanel.classList.remove('open');
        }
    }

    // --- Processus de Confirmation / Modale (Étape 4) ---

    function openConfirmationModal() {
        if (!dom.confirmModal || !dom.jobName || !dom.recapTarget || !dom.modalRecapList) return;

        // Générer le nom automatique : "Installation logicielle - DD/MM/YYYY HH:MM"
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR');
        const timeStr = now.toTimeString().substring(0, 5);
        dom.jobName.value = `Installation logicielle - ${dateStr} à ${timeStr}`;

        // Remplir l'ordinateur cible dans la modale
        const osLogo = appState.selectedComputer.icon || 'img/computer.dyn.svg';
        dom.recapTarget.innerHTML = `
            <img src="${osLogo}" onerror="this.src='img/computer.dyn.svg'" alt="OS Logo">
            <span>Machine cible : <strong>${appState.selectedComputer.hostname}</strong></span>
        `;

        // Remplir les paquets sélectionnés
        dom.modalRecapList.innerHTML = '';
        appState.selectedPackages.forEach(id => {
            const pkg = appState.packages.find(p => p.id === id);
            if (pkg) {
                const li = document.createElement('li');
                li.textContent = `${pkg.fullName} (version ${pkg.version})`;
                dom.modalRecapList.appendChild(li);
            }
        });

        // Gérer l'état initial des cases à cocher
        if (dom.modalWol) {
            dom.modalWol.checked = !appState.selectedComputer.isOnline; // suggérer le réveil s'il est hors ligne
        }
        if (dom.modalShutdown) {
            dom.modalShutdown.checked = false;
            dom.modalShutdown.disabled = !dom.modalWol.checked;
        }
        if (dom.forceInstall) {
            dom.forceInstall.checked = false;
        }

        // Afficher la modale avec animation M3
        dom.confirmModal.classList.add('active');
    }

    function closeConfirmationModal() {
        if (dom.confirmModal) {
            dom.confirmModal.classList.remove('active');
        }
    }

    async function submitDeployment() {
        if (!appState.selectedComputer || appState.selectedPackages.size === 0) return;

        // Activer l'état de chargement
        dom.confirmDeployBtn.disabled = true;
        dom.cancelDeployBtn.disabled = true;
        dom.confirmDeployBtn.textContent = 'Déploiement en cours...';

        const payload = {
            name: dom.jobName.value.trim(),
            computers: [appState.selectedComputer.id],
            packages: Array.from(appState.selectedPackages),
            wol: dom.modalWol ? dom.modalWol.checked : false,
            shutdown: dom.modalShutdown ? dom.modalShutdown.checked : false,
            force_install: true
        };

        try {
            const response = await fetch(window.OcoConfig.ajaxUrlDeploy, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Fermer la modale et vider le panier
                closeConfirmationModal();
                appState.selectedPackages.clear();
                
                // Rediriger vers le détail du Job Container qui vient d'être créé
                if (result.job_container_id) {
                    window.location.href = `?view=job-containers&id=${result.job_container_id}`;
                } else {
                    window.location.href = '?view=job-containers';
                }
            } else {
                throw new Error(result.error || 'Une erreur inconnue est survenue.');
            }

        } catch (error) {
            alert(`Erreur lors du déploiement : ${error.message}`);
            // Restaurer les boutons de la modale
            dom.confirmDeployBtn.disabled = false;
            dom.cancelDeployBtn.disabled = false;
            dom.confirmDeployBtn.textContent = 'Confirmer l\'installation';
        }
    }

    // --- Utilitaires de Formatage ---

    function formatBytes(bytes, decimals = 2) {
        const labels = window.OcoLang ? {
            bytes: window.OcoLang.bytes || 'Octets',
            kb: window.OcoLang.kb || 'Ko',
            mb: window.OcoLang.mb || 'Mo',
            gb: window.OcoLang.gb || 'Go',
            tb: window.OcoLang.tb || 'To'
        } : { bytes: 'Octets', kb: 'Ko', mb: 'Mo', gb: 'Go', tb: 'To' };

        if (bytes === 0) return '0 ' + labels.bytes;
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = [labels.bytes, labels.kb, labels.mb, labels.gb, labels.tb];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
};

// Fallback pour exécution directe si le document est déjà chargé
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.initOcoPortalRedesign();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        window.initOcoPortalRedesign();
    });
}
