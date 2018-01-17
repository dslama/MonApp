const RoutesInfo = require('@quoin/expressjs-routes-info');
const warpjsUtils = require('@warp-works/warpjs-utils');

const constants = require('./../constants');
const utils = require('./../utils');

module.exports = (req, res) => {
    const domain = req.params.domain;

    const resource = warpjsUtils.createResource(req, {
        domain,
        title: `WarpJS domain '${domain}'`
    });

    res.format({
        html() {
            utils.basicRender(
                [
                    `${RoutesInfo.expand('W2:app:static')}/app/vendor.js`,
                    `${RoutesInfo.expand('W2:app:static')}/app/domain.js`
                ],
                resource, req, res);
        },

        [warpjsUtils.constants.HAL_CONTENT_TYPE]: () => {
            resource.link('domainTypes', {
                href: RoutesInfo.expand(constants.routes.entities, {
                    domain
                }),
                title: "List of types"
            });

            utils.sendHal(req, res, resource);
        }
    });
};
