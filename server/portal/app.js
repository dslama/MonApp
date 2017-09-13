const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const routes = require('./routes');

module.exports = (baseUrl, staticUrlPath) => {
    const app = express();
    const staticPath = (staticUrlPath === '/') ? '' : staticUrlPath;

    const buildDir = path.resolve(path.join(__dirname, '..', 'build'));

    const PUBLIC_FOLDER_KEY = 'public-folder';
    const PUBLIC_FOLDER_PATH_KEY = 'public-folder-path';

    app.set('view engine', 'hbs');
    // app.set('views', path.join(__dirname, 'views'));
    app.set('sendfile-options', {root: buildDir});
    app.set('base-url', baseUrl);
    app.set('static-url', staticPath);
    app.set(PUBLIC_FOLDER_KEY, path.join(config.folders.w2projects, 'public'));
    app.set(PUBLIC_FOLDER_PATH_KEY, '/public');

    // Make sure folder exists.
    fs.lstatSync(app.get(PUBLIC_FOLDER_KEY));

    // Make sure to serve static assets first so we don't go in middlewares.
    // app.use('/static', express.static(buildDir));
    app.use(app.get(PUBLIC_FOLDER_PATH_KEY), express.static(app.get(PUBLIC_FOLDER_KEY)));

    app.use(cookieParser(config.cookieSecret, {
        httpOnly: true,
        maxAge: 60 * 60, // 1 hour
        sameSite: true
    }));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use(routes(baseUrl).router);

    return app;
};
