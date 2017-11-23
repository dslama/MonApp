const cookieParser = require('cookie-parser');
const debug = require('debug')('W2:WarpJS:app');
const express = require('express');
const path = require('path');
const RoutesInfo = require('@quoin/expressjs-routes-info');
const warpStudio = require('@warp-works/studio');

const config = require('./config');
const content = require('./content');
const extractAuthMiddlewares = require('./extract-auth-middlewares');
const plugins = require('./plugins');
const portal = require('./portal');
const requestToken = require('./middlewares/request-token');
const status = require('./status');

const Persistence = require(config.persistence.module);

module.exports = (baseUrl, staticUrl) => {
    const app = express();

    baseUrl = (baseUrl === '/') ? '' : baseUrl;

    app.set('base-url', baseUrl);
    app.set('static-url', staticUrl);

    RoutesInfo.staticPath('W2:app:public', app, baseUrl, '/public', path.join(config.folders.w2projects, 'public'));
    RoutesInfo.staticPath('W2:app:static', app, baseUrl, staticUrl, 'public');

    app.use(cookieParser(config.cookieSecret, {
        httpOnly: true,
        maxAge: 3 * 60 * 60, // 3 hours
        sameSite: true
    }));

    app.use(requestToken);

    const authMiddlewares = extractAuthMiddlewares(config);

    if (authMiddlewares) {
        debug(`auth middlewares detected`);
        app.use(authMiddlewares.warpjsUser);
    }

    const adminPrefix = `${baseUrl}/admin`;
    const adminParams = [adminPrefix];

    const contentPrefix = `${baseUrl}/content`;
    const contentParams = [contentPrefix];

    const portalPrefix = `${baseUrl}/portal`;
    const portalParams = [portalPrefix];

    if (authMiddlewares) {
        adminParams.push(authMiddlewares.requiresWarpjsUser);
        adminParams.push(authMiddlewares.canAccessAsAdmin);
        adminParams.push(authMiddlewares.unauthorized);

        contentParams.push(authMiddlewares.requiresWarpjsUser);
        contentParams.push(authMiddlewares.canAccessAsContentManager);
        contentParams.push(authMiddlewares.unauthorized);

        portalParams.push(authMiddlewares.requiresWarpjsUser);
        portalParams.push(authMiddlewares.unauthorized);
    }

    adminParams.push(warpStudio.app(adminPrefix, staticUrl));
    app.use.apply(app, adminParams);

    contentParams.push(content.app(contentPrefix, staticUrl));
    app.use.apply(app, contentParams);

    portalParams.push(portal.app(portalPrefix, staticUrl));
    app.use.apply(app, portalParams);

    plugins.register(app, config, Persistence, baseUrl, staticUrl);

    // Just send default to the portal.
    app.get('/', (req, res) => {
        res.redirect(RoutesInfo.expand('homepage'));
    });

    app.get('/_status', status);

    // --- DEBUG ---
    const _ = require('lodash');
    debug("RoutesInfo.all()=", _.map(RoutesInfo.all(), (route, key) => `${route.name} => ${route.pathname}`));
    // --- /DEBUG ---

    return app;
};
