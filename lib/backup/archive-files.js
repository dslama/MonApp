const debug = require('debug')('W2:backup:archive-files');
const path = require('path');
const Promise = require('bluebird');
const shelljs = require('shelljs');

const serverUtils = require('./../../server/utils');
const WarpWorksError = require('./../core/error');

const config = serverUtils.getConfig();

const DEST_DIR = path.resolve(config.folders.w2projects, 'backups');

function compress(src, dest) {
    return new Promise((resolve, reject) => {
        shelljs.exec(`tar zcf "${dest}" -C "${src}" "."`, (code, stdout, stderr) => {
            if (code) {
                reject(new WarpWorksError("Failed archiving", {
                    code,
                    stdout,
                    stderr
                }));
            } else {
                resolve();
            }
        });
    });
}

module.exports = (outputDir) => {
    const dest = path.resolve(DEST_DIR, `${path.basename(outputDir)}.tgz`);

    return Promise.resolve()
        .then(() => debug(`Archiving files to "${dest}"...`))
        .then(() => shelljs.mkdir('-p', DEST_DIR))
        .then(() => compress(outputDir, dest))
        .then(() => debug(`...archiving done.`))
    ;
};