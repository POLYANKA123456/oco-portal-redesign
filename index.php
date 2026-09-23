<?php
// extensions/oco-portal-redesign/index.php

return [
    'id' => 'oco-portal-redesign',
    'name' => 'OCO Self-Service Portal Redesign & Custom Corporate Design',
    'version' => '1.2.0',
    'author' => 'Votre Nom',
    'oco-version-min' => '1.2.0',

    # Répertoire de traduction spécifique à l'extension
    'translation-dir' => __DIR__.'/lang',

    # Surcharge CSS pour l'administration (Console Admin)
    'frontend-css' => [
        'custom-admin.css' => __DIR__.'/frontend/css/custom-admin.css',
    ],

    # Surcharge des images partagées pour l'administration et le self-service
    'frontend-img' => [
        'custom-frontend-bg.jpg' => __DIR__.'/frontend/img/custom-frontend-bg.jpg',
        'custom-self-service-bg.jpg' => __DIR__.'/frontend/img/custom-self-service-bg.png',
        'theme-moon.light.svg' => __DIR__.'/frontend/img/theme-moon.light.svg',
        'theme-sun.light.svg' => __DIR__.'/frontend/img/theme-sun.light.svg',
    ],

    # Injection automatique du CSS et JS dans le head du Self-Service
    'self-service-css' => [
        'redesign-variables.css' => __DIR__.'/frontend/css/redesign-variables.css',
        'redesign-layout.css' => __DIR__.'/frontend/css/redesign-layout.css',
        'redesign-home.css' => __DIR__.'/frontend/css/redesign-home.css',
        'redesign-computers.css' => __DIR__.'/frontend/css/redesign-computers.css',
        'redesign-store.css' => __DIR__.'/frontend/css/redesign-store.css',
        'redesign-jobs.css' => __DIR__.'/frontend/css/redesign-jobs.css',
        'redesign-isolation.css' => __DIR__.'/frontend/css/redesign-isolation.css',
        'custom-self-service.css' => __DIR__.'/frontend/css/custom-self-service.css',
    ],
    'self-service-js' => [
        'redesign-theme.js' => __DIR__.'/frontend/js/redesign-theme.js',
        'redesign-navbar.js' => __DIR__.'/frontend/js/redesign-navbar.js',
        'redesign-store.js' => __DIR__.'/frontend/js/redesign-store.js',
    ],

    # Routage des gestionnaires d'API asynchrones
    'self-service-ajax-handler' => [
        'computers.php' => __DIR__.'/frontend/ajax-handler/computers.php',
        'packages.php' => __DIR__.'/frontend/ajax-handler/packages.php',
        'job-containers.php' => __DIR__.'/frontend/ajax-handler/job-containers.php',
        'logo.php' => __DIR__.'/frontend/ajax-handler/logo.php',
        'favicon.php' => __DIR__.'/frontend/ajax-handler/favicon.php',
    ],

    # Routage des vues du portail (Actif si les fichiers d'origine sont renommés ou si les vues sont nouvelles)
    'self-service-views' => [
        'homepage.php' => __DIR__.'/frontend/views/homepage.php',
        'computers.php' => __DIR__.'/frontend/views/computers.php',
        'packages.php' => __DIR__.'/frontend/views/packages.php',
        'job-container-new.php' => __DIR__.'/frontend/views/job-container-new.php',
        'job-containers.php' => __DIR__.'/frontend/views/job-containers.php',
        'tree.php' => __DIR__.'/frontend/views/tree.php',
    ],
];
