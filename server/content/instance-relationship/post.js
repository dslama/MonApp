const Promise = require('bluebird');
const RoutesInfo = require('@quoin/expressjs-routes-info');
const warpjsUtils = require('@warp-works/warpjs-utils');

const logger = require('./../../loggers');
const serverUtils = require('./../../utils');
const utils = require('./../utils');

module.exports = (req, res) => {
    const domain = req.params.domain;
    const type = req.params.type;
    const id = req.params.id;
    const relationship = req.params.relationship;
    const payload = req.body;

    const persistence = serverUtils.getPersistence(domain);
    const entity = serverUtils.getEntity(domain, type);
    const relationshipEntity = entity.getRelationshipByName(relationship);
    const targetEntity = relationshipEntity.getTargetEntity();

    const resource = warpjsUtils.createResource(req, {
        title: `Child for domain ${domain} - Type ${type} - Id ${id} - Relationship ${relationship}`,
        domain,
        type,
        id,
        relationship
    });

    if (targetEntity.entityType === 'Embedded') {
        // Create a new embedded
        console.log("payload=", payload);
        Promise.resolve()
            .then(() => logger(req, "Trying to add embedded", req.body))
            .then(() => entity.getInstance(persistence, id))
            .then((instance) => entity.addEmbedded(instance, payload.docLevel, 0))
            .then((instance) => entity.updateDocument(persistence, instance))
            .then(() => logger(req, "Embedded added"))
            .then(() => utils.sendHal(req, res, resource))
            .catch((err) => {
                console.log("ERROR:", err);
                logger(req, "Failed create new embedded", {err});
                res.status(500).send(err.message); // FIXME: Don't send the err.
            })
            .finally(() => persistence.close())
        ;
    } else if (payload.id && payload.type) {
        // Create a new association
        Promise.resolve()
            .then(() => logger(req, "Trying to create new association", req.body))
            .then(() => entity.getInstance(persistence, id))
            .then((instance) => relationshipEntity.addAssociation(instance, payload))
            .then((instance) => entity.updateDocument(persistence, instance))
            .then(() => logger(req, "New association added"))
            .then(() => res.status(204).send())
            .catch((err) => {
                logger(req, "Failed create new association", {err});
                res.status(500).send(err.message); // FIXME: Don't send the err.
            })
            .finally(() => persistence.close())
        ;
    } else {
        // Create a new aggregation
        Promise.resolve()
            .then(() => logger(req, "Trying to create new aggregation"))
            .then(() => entity.getInstance(persistence, id))
            .then((instance) => entity.createChildForInstance(instance, relationshipEntity))
            .then((child) => targetEntity.createDocument(persistence, child))
            .then((newDoc) => newDoc.id)
            .then((newId) => {
                logger(req, "New aggregation added");
                const redirectUrl = RoutesInfo.expand('W2:content:instance', {
                    domain,
                    type: targetEntity.name,
                    id: newId
                });

                if (req.headers['x-requested-with']) {
                    // Was ajax call. return a resource.
                    resource.link('redirect', redirectUrl);

                    utils.sendHal(req, res, resource);
                } else {
                    // Direct call.
                    res.redirect(redirectUrl);
                }
            })
            .catch((err) => {
                console.log("entity-child(): err=", err);
                resource.message = err.message;
                utils.sendHal(req, res, resource, 500);
            })
            .finally(() => persistence.close());
    }
};