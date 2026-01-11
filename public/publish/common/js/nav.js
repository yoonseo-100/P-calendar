(function () {
    'use strict';

    function applyActive($nav) {
        var active = $nav.data('active');
        if (!active) return;

        $nav.find('.tabItem, .act a').removeClass('NOW');
        $nav.find('[data-nav="' + active + '"]').addClass('NOW');
    }

    function bootOne($nav) {
        var NAV_PATH = '../../common/nav.html';
        var cacheKey = '__p_calendar_nav_html__';

        // Prevent flicker: keep hidden until we paint content
        $nav.removeClass('is-loaded');

        try {
            var cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                $nav.html(cached);
                applyActive($nav);
                $nav.addClass('is-loaded');
            }
        } catch (e) {
            // ignore cache errors
        }

        $nav.load(NAV_PATH, function () {
            try {
                sessionStorage.setItem(cacheKey, $nav.html());
            } catch (e) {
                // ignore cache errors
            }
            applyActive($nav);
            $nav.addClass('is-loaded');
        });
    }

    function init() {
        if (!window.jQuery) return;
        var $ = window.jQuery;
        $('nav#appNav').each(function () {
            bootOne($(this));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
