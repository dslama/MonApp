const warpjsUtils = require('@warp-works/warpjs-utils');

const HoverPreview = require('./utilities/image-map-hover.js');

const errorTemplate = require('./../../common/templates/_error.hbs');
const template = require("./../templates/index.hbs");

(($) => {
    $(document).ready(() => {
        warpjsUtils.getCurrentPageHAL($)
            .then((result) => {
                const content = (result.error) ? errorTemplate(result.data) : template(result.data);
                if (!result.error && result.data && result.data.Name) {
                    document.title = result.data.Name;
                }

                $('#warpjs-content-placeholder').html(content);

                const hoverPreview = new HoverPreview();

                $('.overview-image-container')
                    .on('mouseenter', '.map-hover-area', hoverPreview.onFocus.bind(hoverPreview, $))
                    .on('mouseleave', '.map-hover-area', hoverPreview.onBlur.bind(hoverPreview, $));
            });
    });
})(jQuery);
