<?php
// ajax-handler/job-containers.php

ini_set('display_errors', '0');

require_once(__DIR__.'/../../../../loader.inc.php');
require_once(__DIR__.'/../../../../self-service/session.inc.php');

if (!isset($_SESSION['oco_self_service_user_id']) || empty($_SESSION['oco_self_service_user_id'])) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(['error' => LANG('portal_redesign_api_unauthorized') ?? 'Non autorisé']);
    exit();
}

session_write_close();

header('Content-Type: application/json');


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $name = isset($input['name']) ? trim($input['name']) : '';
    $computers = isset($input['computers']) ? $input['computers'] : [];
    $packages = isset($input['packages']) ? $input['packages'] : [];
    $wol = isset($input['wol']) ? (bool)$input['wol'] : false;
    $shutdown = isset($input['shutdown']) ? (bool)$input['shutdown'] : false;
    // Comportement par défaut : la réinstallation est systématiquement forcée
    $forceInstall = true;

    // Garde-fou robuste : si l'extension PHP 'sockets' n'est pas installée sur le serveur,
    // on désactive silencieusement le Wake-on-LAN pour empêcher un crash fatal sur socket_create()
    if ($wol && !function_exists('socket_create')) {
        $wol = false;
    }

    if (empty($name)) {
        $name = (LANG('portal_redesign_api_default_job_name') ?? 'Installation logicielle - ') . date('d/m/Y H:i');
    }

    if (is_string($computers)) {
        $computers = array_filter(array_map('intval', explode(',', $computers)));
    }
    if (is_string($packages)) {
        $packages = array_filter(array_map('intval', explode(',', $packages)));
    }

    if (empty($computers) || empty($packages)) {
        throw new Exception(LANG('portal_redesign_api_missing_params') ?? 'Ordinateur ou paquet non spécifié.');
    }

    $deployed = false;
    $containerId = null;

    // 1. Essayer d'utiliser les méthodes existantes du client OCO
    if (method_exists($cl, 'deploySelfService')) {
        $res = $cl->deploySelfService(
            $name,
            $computers,
            $packages,
            date('Y-m-d H:i:s'),
            null,
            $wol ? 1 : 0,
            $shutdown ? 1 : 0,
            5, // restart_timeout
            $forceInstall ? 1 : 0, // force_install_same_version
            0  // sequence_mode
        );
        $deployed = true;
        if (is_numeric($res)) {
            $containerId = intval($res);
        } elseif (is_object($res) && isset($res->id)) {
            $containerId = intval($res->id);
        }
    } else {
        $methodsToTry = ['deploy', 'createJobContainer', 'submitDeployment'];
        foreach ($methodsToTry as $method) {
            if (method_exists($cl, $method)) {
                $res = $cl->$method($name, $computers, $packages, $wol, $shutdown);
                $deployed = true;
                if (is_numeric($res)) {
                    $containerId = intval($res);
                } elseif (is_object($res) && isset($res->id)) {
                    $containerId = intval($res->id);
                }
                break;
            }
        }
    }

    // 2. Si aucune méthode directe, création manuelle robuste
    if (!$deployed) {
        $permissionCreate = $cl->checkPermission(new Models\JobContainer(), SelfService\PermissionManager::METHOD_CREATE, false);
        if (!$permissionCreate) {
            throw new Exception(LANG('portal_redesign_api_permission_denied') ?? 'Permission refusée pour créer une tâche de déploiement.');
        }

        $jc = new Models\JobContainer();
        $jc->name = $name;
        $jc->enabled = 1;
        $jc->sequence_mode = Models\JobContainer::SEQUENCE_MODE_IGNORE_FAILED;
        $jc->priority = 50;
        $jc->start_time = date('Y-m-d H:i:s');
        $jc->wol_sent = $wol ? 1 : 0;
        $jc->shutdown_waked_after_completion = $shutdown ? 1 : 0;
        
        if (isset($_SESSION['oco_self_service_user_id'])) {
            $jc->created_by_domain_user_id = intval($_SESSION['oco_self_service_user_id']);
        }

        if (method_exists($db, 'insertJobContainer')) {
            $containerId = $db->insertJobContainer($jc);
        } elseif (method_exists($jc, 'save')) {
            $jc->save($db);
            $containerId = $jc->id;
        } else {
            $db->query("INSERT INTO job_containers (name, enabled, sequence_mode, priority, start_time, wol_sent, shutdown_waked_after_completion, created_by_domain_user_id, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                $jc->name, $jc->enabled, $jc->sequence_mode, $jc->priority, $jc->start_time, $jc->wol_sent, $jc->shutdown_waked_after_completion, $jc->created_by_domain_user_id ?? null, date('Y-m-d H:i:s')
            ]);
            $containerId = $db->lastInsertId();
        }

        if (!$containerId) {
            throw new Exception(LANG('portal_redesign_api_creation_failed') ?? 'Impossible de créer le Job Container.');
        }

        foreach ($computers as $compId) {
            $comp = $db->selectComputer($compId);
            if (!$comp) continue;
            
            foreach ($packages as $pkgId) {
                $pkg = $db->selectPackage($pkgId);
                if (!$pkg) continue;

                $job = new Models\StaticJob();
                $job->job_container_id = $containerId;
                $job->computer_id = $compId;
                $job->package_id = $pkgId;
                $job->state = Models\Job::STATE_PENDING;
                $job->is_uninstall = 0;
                $job->sequence = 1;
                $job->procedure = $pkg->install_procedure ?? '';

                if (method_exists($db, 'insertStaticJob')) {
                    $db->insertStaticJob($job);
                } elseif (method_exists($job, 'save')) {
                    $job->save($db);
                } else {
                    $db->query("INSERT INTO jobs (job_container_id, computer_id, package_id, state, is_uninstall, sequence, procedure, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                        $job->job_container_id, $job->computer_id, $job->package_id, $job->state, $job->is_uninstall, $job->sequence, $job->procedure, date('Y-m-d H:i:s')
                    ]);
                }
            }
        }
        $deployed = true;
    }

    echo json_encode([
        'success' => true,
        'message' => LANG('portal_redesign_api_success') ?? 'Tâche de déploiement créée avec succès.',
        'job_container_id' => $containerId
    ]);

} catch (\Throwable $e) {
    error_log('OCO Portal Redesign API Error (job-containers.php): ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => LANG('portal_redesign_api_deploy_error') ?? 'Une erreur interne du serveur est survenue lors de la création du déploiement.'
    ]);
}
