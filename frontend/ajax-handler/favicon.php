<?php
// ajax-handler/favicon.php
ini_set('display_errors', '0');
header('Content-Type: image/svg+xml');
$favPath = __DIR__.'/../../../../frontend/img/logo.dyn.svg';
if (file_exists($favPath)) {
    readfile($favPath);
} else {
    http_response_code(404);
}
