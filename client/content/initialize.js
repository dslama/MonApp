const warpjsUtils = require('@warp-works/warpjs-utils');

const WarpJSClient = require('./client');
const progressBarModal = require('./progress-bar-modal');

function beforeUnload(event) {
    $warp.save(false);
}

function onSchemaSuccess(config, callback, result) {
    if (result.success) {
        progressBarModal.show($, 75);
        $warp.initialize(result.domain, config, callback);
    } else {
        warpjsUtils.trace(1, "initializeWarpJS", "Failed to get domain data - " + result.error);
    }
}

function onSchemaError(jqXHR, textStatus, errorThrown) {
    warpjsUtils.trace(1, "initializeWarpJS", "Failed to get domain data - " + textStatus);
}

function onCurrentPageSuccess(config, callback, result) {
    $warp.links = result._links;
    $warp.user = result.warpjsUser ? result.warpjsUser : "undefined";

    progressBarModal.show($, 50);

    $.ajax({
        url: $warp.links.schemaDomain.href,
        type: 'GET',
        dataType: "json",
        success: onSchemaSuccess.bind(null, config, callback),
        error: onSchemaError
    });
}

function onCurrentPageError(jqXHR, textStatus, errorThrown) {
    $warp.alert("Initialize WarpJSClient: remote connection failure!");
}

module.exports = (config, callback) => {
    // Create client + show load progress
    // eslint-disable-next-line no-global-assign
    window.$warp = new WarpJSClient();
    progressBarModal.show($, 25);

    // Event handlers
    $(window).on('beforeunload', beforeUnload);

    // Prepare remote connection
    $.ajax({
        headers: {
            Accept: warpjsUtils.constants.HAL_CONTENT_TYPE
        },
        success(result) {
            onCurrentPageSuccess(config, callback, result);
        },
        error: onCurrentPageError
    });
};
