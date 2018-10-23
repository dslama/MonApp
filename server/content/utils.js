// const debug = require('debug')('W2:WarpJS:utils');
const hal = require('hal');
const RoutesInfo = require('@quoin/expressjs-routes-info');
const warpjsUtils = require('@warp-works/warpjs-utils');

const constants = require('./constants');
const editionConstants = require('./../edition/constants');
const serverUtils = require('./../utils');

function createResourceFromDocument(instance) {
    // FIXME: missing domain
    const data = {
        type: instance.type
    };

    if (!instance.isRootInstance) {
        data.oid = instance._id; // FIXME: debug
        data.id = instance._id;
    }

    return warpjsUtils.createResource(RoutesInfo.expand(constants.routes.instance, data), instance);
}

function basicRender(bundles, data, req, res, isStudio) {
    const resource = (data instanceof hal.Resource) ? data : warpjsUtils.createResource(req, data);
    resource.baseUrl = req.app.get('base-url');
    resource.staticUrl = req.app.get('static-url');
    resource.isStudio = isStudio;
    resource.coreUrl = RoutesInfo.expand('W2:app:core', {});

    resource.bundles = bundles;

    if (!resource._links.warpjsUtilsJs) {
        if (isStudio) {
            resource.link('warpjsUtilsJs', editionConstants.assets.studio);
        } else {
            resource.link('warpjsUtilsJs', editionConstants.assets.content);
        }
    }

    res.render('index-edition', resource.toJSON());
}

function sendHal(req, res, resource, status) {
    resource.link('warpjsHome', RoutesInfo.expand(constants.routes.home, {}));
    if (req.params.domain) {
        resource.link('warpjsDomain', RoutesInfo.expand(constants.routes.domain, {
            domain: req.params.domain
        }));
    }

    serverUtils.sendHal(req, res, resource, status);
}

function sendErrorHal(req, res, resource, err, status) {
    const execution = new Error();
    // eslint-disable-next-line no-console
    console.error("Execution stack:", execution.stack);
    // eslint-disable-next-line no-console
    console.error("Original error:", err);
    resource.error = true;
    resource.message = err.message;
    sendHal(req, res, resource, status || 500);
}

function sendHalOnly(req, res, resource, status) {
    res.status(status || 200)
        .header('Content-Type', warpjsUtils.constants.HAL_CONTENT_TYPE)
        .send(resource.toJSON());
}

function basicRenderOld(name, data, req, res) {
    console.warn('*** DEPRECATED basicRenderOld()... ***');
    const resource = (data instanceof hal.Resource) ? data : warpjsUtils.createResource(req, data);
    resource.baseUrl = '/static';

    resource.link('w2WarpJSHome', RoutesInfo.expand(constants.routes.home, {}));
    resource.link('w2WarpJSDomain', RoutesInfo.expand(constants.routes.instances, data));

    res.render(name, resource.toJSON());
}

function sendRedirect(req, res, resource, redirectUrl) {
    if (req.headers['x-requested-with']) {
        // Was ajax call. return a resource.
        resource.link('redirect', redirectUrl);

        sendHal(req, res, resource);
    } else {
        // Direct call.
        res.redirect(redirectUrl);
    }
}

module.exports = {
    basicRender,
    basicRenderOld,
    createResourceFromDocument,
    sendErrorHal: (req, res, resource, error, status) => sendErrorHal(req, res, resource, error, status),
    sendHal: (req, res, resource, status) => sendHal(req, res, resource, status),
    sendHalOnly: (req, res, resource, status) => sendHalOnly(req, res, resource, status),
    sendRedirect: (req, res, resource, redirectUrl) => sendRedirect(req, res, resource, redirectUrl)
};
