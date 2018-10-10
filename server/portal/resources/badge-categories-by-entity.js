// const debug = require('debug')('W2:portal:resources/badge-categories-by-entity');
const Promise = require('bluebird');
const RoutesInfo = require('@quoin/expressjs-routes-info');
const warpjsUtils = require('@warp-works/warpjs-utils');

const badgeDefinitionsByRelationship = require('./badge-definitions-by-relationship');
const imagesByRelationship = require('./images-by-relationship');
const routes = require('./../../../lib/constants/routes');

function createEmptyBadgeDefinition(resource) {
    const empty = warpjsUtils.createResource(resource._links.self.href, {});
    if (resource._links && resource._links.empty) {
        empty.link('image', resource._links.empty.href);
    }
    return empty;
}

module.exports = async (persistence, entity, instance) => {
    // FIXME: Should start with I3C model and instance and drill down.
    const domainModel = entity.getDomain();
    const badgeCategoryEntity = domainModel.getEntityByName('BadgeCategory');
    const badgeDefinitionsRelationship = badgeCategoryEntity.getRelationshipByName('BadgeDefinitions');

    const badgeCategories = await badgeCategoryEntity.getDocuments(persistence);
    const badgeCategoryResources = await Promise.map(
        badgeCategories.sort(warpjsUtils.byPositionThenByName),
        async (badgeCategory) => {
            const href = RoutesInfo.expand(routes.portal.entity, badgeCategory);
            const resource = warpjsUtils.createResource(href, {
                type: badgeCategory.type,
                id: badgeCategory.id,
                name: entity.getDisplayName(badgeCategory)
            });

            const imagesRelationship = badgeCategoryEntity.getRelationshipByName('Images');
            const images = await imagesByRelationship(persistence, imagesRelationship, badgeCategory);
            if (images && images.length) {
                const image = images.find((image) => image.name === 'empty');
                if (image) {
                    resource.link('empty', image._links.self.href);
                }
            }

            const badgeDefinitions = await badgeDefinitionsByRelationship(persistence, badgeDefinitionsRelationship, badgeCategory);
            if (badgeDefinitions && badgeDefinitions.length) {
                if (badgeDefinitions.length % 2) {
                    badgeDefinitions.push(createEmptyBadgeDefinition(resource));
                }
            } else {
                // There were no badge definitions. Add 2 empty ones.
                badgeDefinitions.push(createEmptyBadgeDefinition(resource));
                badgeDefinitions.push(createEmptyBadgeDefinition(resource));
            }
            resource.embed('badgeDefinitions', badgeDefinitions);

            return resource;
        }
    );

    return badgeCategoryResources;
};
