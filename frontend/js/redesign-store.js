/**
 * frontend/js/redesign-store.js
 * Logique métier interactive pour le catalogue d'applications App Store & Panier M3
 */

window.initOcoPortalRedesign = function() {
    // 1. Toujours initialiser la Navbar M3, le favicon et cacher la sidebar sur TOUTES les pages
    if (typeof window.initM3Navbar === 'function') {
        window.initM3Navbar();
    }
    if (typeof window.initM3Favicon === 'function') {
        window.initM3Favicon();
    }

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
                const errMsg = window.OcoLang && window.OcoLang.errorLoading 
                    ? window.OcoLang.errorLoading.replace('%s', error.message)
                    : `⚠️ Impossible de charger le catalogue d'applications.<br>${error.message}`;
                dom.storeGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--m3-error);">
                        ${errMsg}
                    </div>
                `;
            }
        }
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

        // Vider la liste déroulante
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
        // Sélectionner par défaut le premier de la liste
        else if (appState.computers.length > 0) {
            targetId = appState.computers[0].id;
        }

        // Compatibilité pré-sélection
        if (window.OcoConfig.preselectedPackageId !== null && targetId !== null) {
            const preselectedPkg = appState.packages.find(p => p.id === window.OcoConfig.preselectedPackageId);
            if (preselectedPkg) {
                let activeComp = appState.computers.find(c => c.id === parseInt(targetId));
                const targetOs = getNormalizedOsName(activeComp ? activeComp.os : '');
                if (!activeComp || !isPackageCompatible(preselectedPkg, targetOs)) {
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

        // Mettre à jour visuellement les puces
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
                
                if (appState.selectedComputer) {
                    const compOs = getNormalizedOsName(appState.selectedComputer.os);
                    if (os !== compOs) {
                        const alertMsg = window.OcoLang && window.OcoLang.filterLocked 
                            ? window.OcoLang.filterLocked.replace('%s', compOs)
                            : `Filtre verrouillé sur ${compOs} car la machine cible active est sous cet OS.`;
                        alert(alertMsg);
                        return;
                    }
                }

                if (appState.activeOsFilters.has(os)) {
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

        dom.updatesOnly.checked = appState.showUpdatesOnly;

        dom.updatesOnly.addEventListener('change', (e) => {
            appState.showUpdatesOnly = e.target.checked;
            render();
        });
    }

    function setupCartEvents() {
        if (!dom.cartSummaryBtn || !dom.cartRecapPanel) return;

        dom.cartSummaryBtn.addEventListener('click', () => {
            dom.cartRecapPanel.classList.toggle('open');
            const isOpen = dom.cartRecapPanel.classList.contains('open');
            dom.cartSummaryBtn.querySelector('span:last-child').textContent = isOpen ? '▲' : '▼';
        });

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
        
        appState.selectedPackages.forEach(pkgId => {
            const pkg = appState.packages.find(p => p.id === pkgId);
            if (pkg && !isPackageCompatible(pkg, targetOs)) {
                appState.selectedPackages.delete(pkgId);
            }
        });

        updateCart();
    }

    function isPackageCompatible(pkg, osName) {
        if (!pkg.compatible_os) return true;
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

    // --- Fonctions de Rendu ---

    function render() {
        if (!dom.storeGrid) return;

        dom.storeGrid.innerHTML = '';

        const targetOs = appState.selectedComputer ? getNormalizedOsName(appState.selectedComputer.os) : null;

        const filteredPackages = appState.packages.filter(pkg => {
            if (targetOs) {
                if (!isPackageCompatible(pkg, targetOs)) {
                    return false;
                }
            } else {
                let matchesOsChip = false;
                appState.activeOsFilters.forEach(os => {
                    if (isPackageCompatible(pkg, os)) {
                        matchesOsChip = true;
                    }
                });
                if (!matchesOsChip) return false;
            }

            if (appState.searchQuery) {
                const nameMatch = pkg.fullName.toLowerCase().includes(appState.searchQuery);
                const familyMatch = pkg.name.toLowerCase().includes(appState.searchQuery);
                if (!nameMatch && !familyMatch) return false;
            }

            if (appState.showInstalledOnly) {
                if (!appState.selectedComputer) {
                    return false;
                }
                const isInstalled = appState.selectedComputer.installed_packages.includes(pkg.id);
                if (!isInstalled) return false;
            }

            if (appState.showUpdatesOnly) {
                const nameLower = pkg.fullName ? pkg.fullName.toLowerCase() : '';
                const familyLower = pkg.name ? pkg.name.toLowerCase() : '';
                if (!nameLower.includes('maj') && !familyLower.includes('maj')) {
                    return false;
                }
            }

            return true;
        });

        if (filteredPackages.length === 0) {
            const noPkgsMsg = window.OcoLang && window.OcoLang.noPackages 
                ? window.OcoLang.noPackages 
                : '📭 Aucun paquet disponible avec les filtres actuels.';
            dom.storeGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-secondary);">
                    ${noPkgsMsg}
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

            card.addEventListener('click', () => {
                togglePackageSelection(pkg.id);
            });

            dom.storeGrid.appendChild(card);
        });

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

    // --- Gestion du Panier ---

    function updateCart() {
        if (!dom.bottomDrawer || !dom.cartCount || !dom.cartTextRecap || !dom.deployBtn) return;

        const count = appState.selectedPackages.size;

        if (count > 0) {
            dom.bottomDrawer.classList.add('visible');
            dom.cartCount.textContent = count;

            const names = [];
            appState.selectedPackages.forEach(id => {
                const pkg = appState.packages.find(p => p.id === id);
                if (pkg) names.push(pkg.fullName);
            });
            const readyMsg = window.OcoLang && window.OcoLang.readyToInstall
                ? window.OcoLang.readyToInstall.replace('%s', names.join(', '))
                : `Prêt à installer : <strong>${names.join(', ')}</strong>`;
            dom.cartTextRecap.innerHTML = readyMsg;

            if (dom.cartRecapList) {
                dom.cartRecapList.innerHTML = '';
                appState.selectedPackages.forEach(id => {
                    const pkg = appState.packages.find(p => p.id === id);
                    if (pkg) {
                        const li = document.createElement('li');
                        const removeText = window.OcoLang && window.OcoLang.remove ? window.OcoLang.remove : 'Retirer';
                        li.innerHTML = `<strong>${pkg.fullName}</strong> (v${pkg.version}) - <span style="font-size:0.8rem; color:var(--text-secondary); cursor:pointer;" class="m3-remove-pkg" data-id="${pkg.id}">${removeText}</span>`;
                        dom.cartRecapList.appendChild(li);
                    }
                });

                dom.cartRecapList.querySelectorAll('.m3-remove-pkg').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = parseInt(btn.getAttribute('data-id'));
                        appState.selectedPackages.delete(id);
                        render();
                    });
                });
            }

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

    // --- Processus de Confirmation / Modale ---

    function openConfirmationModal() {
        if (!dom.confirmModal || !dom.jobName || !dom.recapTarget || !dom.modalRecapList) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString(navigator.language || 'fr-FR');
        const timeStr = now.toTimeString().substring(0, 5);
        
        if (window.OcoLang && window.OcoLang.defaultJobName) {
            dom.jobName.value = window.OcoLang.defaultJobName.replace('%s', dateStr).replace('%s', timeStr);
        } else {
            dom.jobName.value = `Installation logicielle - ${dateStr} à ${timeStr}`;
        }

        const osLogo = appState.selectedComputer.icon || 'img/computer.dyn.svg';
        const recapTargetText = window.OcoLang && window.OcoLang.recapTarget
            ? window.OcoLang.recapTarget.replace('%s', appState.selectedComputer.hostname)
            : `Machine cible : <strong>${appState.selectedComputer.hostname}</strong>`;
            
        dom.recapTarget.innerHTML = `
            <img src="${osLogo}" onerror="this.src='img/computer.dyn.svg'" alt="OS Logo">
            <span>${recapTargetText}</span>
        `;

        dom.modalRecapList.innerHTML = '';
        appState.selectedPackages.forEach(id => {
            const pkg = appState.packages.find(p => p.id === id);
            if (pkg) {
                const li = document.createElement('li');
                li.textContent = `${pkg.fullName} (version ${pkg.version})`;
                dom.modalRecapList.appendChild(li);
            }
        });

        if (dom.modalWol) {
            dom.modalWol.checked = !appState.selectedComputer.isOnline;
        }
        if (dom.modalShutdown) {
            dom.modalShutdown.checked = false;
            dom.modalShutdown.disabled = !dom.modalWol.checked;
        }
        if (dom.forceInstall) {
            dom.forceInstall.checked = false;
        }

        dom.confirmModal.classList.add('active');
    }

    function closeConfirmationModal() {
        if (dom.confirmModal) {
            dom.confirmModal.classList.remove('active');
        }
    }

    async function submitDeployment() {
        if (!appState.selectedComputer || appState.selectedPackages.size === 0) return;

        dom.confirmDeployBtn.disabled = true;
        dom.cancelDeployBtn.disabled = true;
        const deployingText = window.OcoLang && window.OcoLang.deploying ? window.OcoLang.deploying : 'Déploiement en cours...';
        dom.confirmDeployBtn.innerHTML = `<span class="m3-spinner"></span> ${deployingText}`;

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
                closeConfirmationModal();
                appState.selectedPackages.clear();
                
                if (result.job_container_id) {
                    window.location.href = `?view=job-containers&id=${result.job_container_id}`;
                } else {
                    window.location.href = '?view=job-containers';
                }
            } else {
                const unknownError = window.OcoLang && window.OcoLang.unknownError ? window.OcoLang.unknownError : 'Une erreur inconnue est survenue.';
                throw new Error(result.error || unknownError);
            }

        } catch (error) {
            const deployError = window.OcoLang && window.OcoLang.deployError 
                ? window.OcoLang.deployError.replace('%s', error.message)
                : `Erreur lors du déploiement : ${error.message}`;
            alert(deployError);
            dom.confirmDeployBtn.disabled = false;
            dom.cancelDeployBtn.disabled = false;
            dom.confirmDeployBtn.innerHTML = window.OcoLang && window.OcoLang.confirm ? window.OcoLang.confirm : 'Confirmer l\'installation';
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
