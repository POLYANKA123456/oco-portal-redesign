<?php
// ajax-handler/logo.php
ini_set('display_errors', '0');
header('Content-Type: image/svg+xml');
$logoPath = __DIR__.'/../../../../frontend/img/logo.dyn.svg';
if (file_exists($logoPath)) {
    readfile($logoPath);
} else {
    http_response_code(404);
}
