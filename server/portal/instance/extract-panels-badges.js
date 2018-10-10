// const debug = require('debug')('W2:portal:instance/extract-panels-badges');
// const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');

const badgeCategoriesByEntity = require('./../resources/badge-categories-by-entity');
const constants = require('./../resources/constants');
// const overviewByEntity = require('./../resources/overview-by-entity');

module.exports = async (persistence, entity, instance, entityPanels) => {
    const panel = entityPanels.find((panel) => panel.name === constants.PANEL_NAMES.Badges);
    if (panel) {
        const panelResource = warpjsUtils.createResource('', {
            type: panel.type,
            id: panel.id,
            name: panel.name,
            label: panel.label || panel.name
        });

        const badgeCategories = await badgeCategoriesByEntity(persistence, entity, instance);
        if (badgeCategories && badgeCategories.length) {
            panelResource.showPanel = true;
            panelResource.embed('badgeCategories', badgeCategories);
        }

        return panelResource;
    }
};

//     .then(() => warpjsUtils.createResource('', {
//     }))
//     .then((resource) => Promise.resolve()
//         .then(() => entityPanels.find((panel) => panel.name === constants.PANEL_NAMES.Badges))
//         .then((panel) => panel
//             ? panel.getPanelItems().find((panelItem) => panelItem.name === constants.PANEL_ITEM_NAMES.Badges)
//             : null
//         )
//         .then((panelItem) => {
//             if (panelItem) {
//                 resource.id = panelItem.getRelationship().id;
//                 resource.name = panelItem.name;
//                 resource.label = panelItem.label || panelItem.name;
//                 return panelItem.getRelationship();
//             }
//         })
//         .then((relationship) => Promise.resolve()
//             .then(() => relationship
//                 ? relationship.getDocuments(persistence, instance)
//                 : []
//             )
//
//             .then((badges) => Promise.map(
//                 badges,
//                 (badge) => Promise.resolve()
//                     .then(() => RoutesInfo.expand('entity', badge))
//                     .then((href) => warpjsUtils.createResource(href, {
//                         type: badge.type,
//                         id: badge.id,
//                         name: badge.Name,
//                         label: relationship.getDisplayName(badge)
//                     }))
//                     .then((badgeResource) => Promise.resolve()
//                         .then(() => badgeResource.link('preview', RoutesInfo.expand('W2:portal:preview', badge)))
//
//                         .then(() => relationship.getTargetEntity())
//                         .then((badgeEntity) => badgeEntity.getRelationshipByName('BadgeDefinition'))
//                         .then((badgeDefinitionRelationship) => Promise.resolve()
//                             .then(() => badgeDefinitionRelationship.getDocuments(persistence, badge))
//                             .then((badgeDefinitions) => badgeDefinitions && badgeDefinitions.length ? badgeDefinitions[0] : null)
//                             .then((badgeDefinition) => badgeDefinition ? overviewByEntity(persistence, badgeDefinitionRelationship.getTargetEntity(), badgeDefinition) : null)
//                             .then((overview) => overview && overview._embedded ? overview._embedded.items : null)
//                             .then((paragraphs) => paragraphs && paragraphs.length ? paragraphs[0] : null)
//                             .then((paragraph) => {
//                                 if (paragraph) {
//                                     badgeResource.description = paragraph.description;
//                                     return paragraph._embedded ? paragraph._embedded.images : null;
//                                 }
//                             })
//                             .then((images) => images && images.length ? images[0] : null)
//                             .then((image) => image && image._links ? image._links.self : null)
//                             .then((self) => self ? self.href : null)
//                             .then((href) => {
//                                 if (href) {
//                                     badgeResource.link('image', href);
//                                 }
//                             })
//                         )
//
//                         .then(() => badgeResource)
//                     )
//             ))
//             .then((badgeResources) => resource.embed('items', badgeResources))
//             .then(() => {
//                 resource.showPanel = Boolean(resource._embedded.items.length);
//             })
//         )
//         .then(() => resource)
//     )
// ;
