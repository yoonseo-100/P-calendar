(function () {
    'use strict';

    var DEFAULT_SETTINGS = {
        navSelector: 'nav#appNav',
        navPath: '../../common/nav.html',
        cacheKey: '__p_calendar_nav_html__',
        loadedClass: 'is-loaded',
    };

    function getSettings() {
        var fromGlobal = window.__P_NAV_SETTINGS__;
        if (!fromGlobal || typeof fromGlobal !== 'object') return DEFAULT_SETTINGS;

        return {
            navSelector:
                typeof fromGlobal.navSelector === 'string' ? fromGlobal.navSelector : DEFAULT_SETTINGS.navSelector,
            navPath: typeof fromGlobal.navPath === 'string' ? fromGlobal.navPath : DEFAULT_SETTINGS.navPath,
            cacheKey: typeof fromGlobal.cacheKey === 'string' ? fromGlobal.cacheKey : DEFAULT_SETTINGS.cacheKey,
            loadedClass: typeof fromGlobal.loadedClass === 'string' ? fromGlobal.loadedClass : DEFAULT_SETTINGS.loadedClass,
        };
    }

    function applyActive($nav) {
        var active = $nav.data('active');
        if (!active) return;

        $nav.find('.tabItem, .act a').removeClass('NOW');
        $nav.find('[data-nav="' + active + '"]').addClass('NOW');
    }

    function bootOne($nav) {
        var settings = getSettings();
        var NAV_PATH = settings.navPath;
        var cacheKey = settings.cacheKey;
        var loadedClass = settings.loadedClass;

        // Prevent flicker: keep hidden until we paint content
        $nav.removeClass(loadedClass);

        try {
            var cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                $nav.html(cached);
                applyActive($nav);
                $nav.addClass(loadedClass);
            }
        } catch {
            // ignore cache errors
        }

        $nav.load(NAV_PATH, function () {
            try {
                sessionStorage.setItem(cacheKey, $nav.html());
            } catch {
                // ignore cache errors
            }
            applyActive($nav);
            $nav.addClass(loadedClass);
        });
    }

    function init() {
        if (!window.jQuery) return;
        var $ = window.jQuery;
        var settings = getSettings();
        $(settings.navSelector).each(function () {
            bootOne($(this));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
