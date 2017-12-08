const warpjsUtils = require('@warp-works/warpjs-utils');

const preview = require('./../../preview');

const template = require("./../templates/index.hbs");

const errorTemplate = warpjsUtils.requirePartial('error-portal');

(($) => $(document).ready(() => warpjsUtils.getCurrentPageHAL($)
    .then(
        (result) => {
            if (result.error) {
                $(warpjsUtils.constants.CONTENT_PLACEHOLDER).html(errorTemplate(result.data));
            } else {
                const content = template(result.data);
                if (result.data && result.data.Name) {
                    document.title = result.data.Name;
                }

                if (result.data._embedded && result.data._embedded.previews) {
                    result.data._embedded.previews.forEach((preview) => {
                        warpjsUtils.cache.set(preview._links.preview.href, {
                            title: preview.title,
                            content: preview.content
                        });
                    });
                }

                $(warpjsUtils.constants.CONTENT_PLACEHOLDER).html(content);
                warpjsUtils.documentReady($);

                preview($);
            }
        },
        (err) => warpjsUtils.toast.error($, err.message, "Error contacting server")
    )
    .catch((err) => {
        warpjsUtils.toast.error($, err.message, "Error processing response");
    })
))(jQuery);
