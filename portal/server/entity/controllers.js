const warpCore = require('@warp-works/core');
const Persistence = require('@warp-works/warpjs-mongo-persistence');
const Promise = require('bluebird');

const config = require('./../config');
const extractEntity = require('./extract-entity');
const utils = require('./../utils');

function entity(req, res) {
    utils.wrapWith406(res, {
        html: () => utils.sendIndex(res, 'Entity', 'entity'),

        [utils.HAL_CONTENT_TYPE]: () => {
            const persistence = new Persistence(config.persistence.host, config.domainName);

            Promise.resolve()
                .then(() => warpCore.getDomainByName(config.domainName))
                .then((domain) => domain.getEntityByName(req.params.type))
                .then((hsEntity) => {
                    return hsEntity.getInstance(persistence, req.params.id)
                        .then((instance) => {
                            const isPreview = Boolean(req.query && req.query.preview === "true");
                            const responseResource = utils.createResource(req, {
                                Name: instance.Name,
                                Desc: instance.desc,
                                Heading: instance.Heading,
                                Content: instance.Content
                            });

                            return Promise.resolve()
                            .then(extractEntity.bind(null, req, responseResource, persistence, hsEntity, instance, isPreview))
                            .then(utils.sendHal.bind(null, req, res, responseResource, null));
                        });
                })
                .finally(() => {
                    persistence.close();
                })
                .catch((err) => {
                    let message;
                    let statusCode;

                    console.error("entity():", err);

                    if (err instanceof Persistence.PersistenceError) {
                        message = "Unable to find content.";
                        statusCode = 404;
                    } else {
                        message = "Error during processing content.";
                        statusCode = 500;
                    }

                    const resource = utils.createResource(req, {
                        message
                    });
                    utils.sendHal(req, res, resource, statusCode);
                });
        }
    });
}

module.exports = {
    entity
};