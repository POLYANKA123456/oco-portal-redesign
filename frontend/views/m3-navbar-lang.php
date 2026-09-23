<?php
// extensions/oco-portal-redesign/frontend/views/m3-navbar-lang.php
?>
<script>
window.OcoLangNavbar = {
    computers: <?php echo json_encode(LANG('portal_redesign_nav_computers') ?? 'Mes Ordinateurs'); ?>,
    store: <?php echo json_encode(LANG('portal_redesign_nav_store') ?? 'App Store'); ?>,
    jobs: <?php echo json_encode(LANG('portal_redesign_nav_jobs') ?? 'Mes Tâches'); ?>,
    themeLight: <?php echo json_encode(LANG('portal_redesign_theme_light') ?? 'Basculer en thème clair'); ?>,
    themeDark: <?php echo json_encode(LANG('portal_redesign_theme_dark') ?? 'Basculer en thème sombre'); ?>
};
if (typeof window.translateM3Navbar === 'function') {
    window.translateM3Navbar();
}
</script>
