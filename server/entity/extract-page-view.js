const _ = require('lodash');
const debug = require('debug')('I3C:Portal:extractPageView');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const routesInfo = require('@quoin/expressjs-routes-info');
const urlTemplate = require('url-template');

const createObjResource = require('./create-obj-resource');

// FIXME: For debug only.
const RANDOM_IMAGE = urlTemplate.parse('http://lorempixel.com/{Width}/{Height}/{ImageURL}/');
const IMAGE_PATH = urlTemplate.parse('/public/iic_images/{ImageURL}');
const CONTENT_LINK_RE = /{{(.*?),(.*?),(.*?)}}/g;

function contentLinkReplacer(match, label, type, id) {
    const href = routesInfo.expand('entity', {id, type});
    return `<a href="${href}">${label}</a>`;
}

function parseLinks(overviews) {
    if (overviews) {
        return overviews.map((overview) => {
            if (overview && overview.Content && overview.Content.match(CONTENT_LINK_RE)) {
                const contentBasicProperty = _.filter(overview.basicProperties, (prop) => prop.name === 'Content');
                overview.containsHTML = contentBasicProperty.length && contentBasicProperty[0].propertyType === 'text';
                if (overview.containsHTML) {
                    overview.Content = overview.Content.replace(CONTENT_LINK_RE, contentLinkReplacer);
                }
            }
            return overview;
        });
    }
    return overviews;
}

function extractRelationship(req, resource, persistence, hsEntity, entity, isPreview) {
    const relationship = hsEntity.getRelationship();

    return Promise.resolve()
        .then(() => relationship.getDocuments(persistence, entity))
        .then((references) => {
            return Promise.map(references, (reference) => {
                const referenceResource = createObjResource(reference, true);
                if (hsEntity.style === 'Preview') {
                    const referenceEntity = hsEntity.getRelationship().getTargetEntity();
                    return referenceEntity.getOverview(persistence, reference, isPreview)
                        .then(parseLinks)
                        .then((overviews) => {
                            if (overviews && overviews.length) {
                                return overviews[0];
                            }
                            return [];
                        })
                        .then(convertToResource.bind(null, req))
                        .then((overview) => {
                            if (!_.isArray(overview)) {
                                referenceResource.embed('overview', overview);
                            }
                            return referenceResource;
                        })
                        .catch((err) => {
                            // The entity does not offer a relationship named
                            // 'Overview'?
                            debug(`Could not find overview for: reference=`, reference);
                            debug(`Could not find overview for: referenceEntity=`, referenceEntity);
                            debug(`Could not find overview: Error=`, err);
                            return referenceResource;
                        });
                }
                return referenceResource;
            });
        })
        .then((references) => {
            const relationshipResource = createObjResource(relationship, true);
            relationshipResource.embed('references', references);
            resource.embed('relationships', relationshipResource);
            return relationshipResource;
        });
}

function imagePath(req, image) {
    const filePath = path.join(req.app.get('public-folder'), 'iic_images', image.ImageURL);
    try {
        const stats = fs.lstatSync(filePath);
        if (stats.isFile()) {
            image.ImageURL = IMAGE_PATH.expand(image);
        } else if (!/^(http|\?)/.test(image.ImageURL)) {
            image.ImageURL = image.ImageURL.replace(/\W/g, '');
            image.ImageURL = RANDOM_IMAGE.expand(image);
        }
    } catch (e) {
        image.ImageURL = image.ImageURL.replace(/\W/g, '');
        image.ImageURL = RANDOM_IMAGE.expand(image);
    }
}

function customResource(req, key, item) {
    const resource = convertToResource(req, item);
    if (key === 'Target') {
        debug(`customResource(): item=${JSON.stringify(item, null, 2)}`);
        resource.link('preview', routesInfo.expand('entity', {type: item.type, id: item.id, preview: true}));
    }
    return resource;
}

function convertToResource(req, data) {
    if (!data) {
        return null;
    }

    if (_.isArray(data)) {
        return data.map(convertToResource.bind(null, req));
    }

    if (data.type === 'Image') {
        imagePath(req, data);
    }

    const basicProperties = _.reduce(
        data,
        (memo, value, key) => {
            if (!_.isArray(value)) {
                return _.extend(memo, {
                    [key]: value
                });
            }
            return memo;
        },
        {}
    );

    let propsToPick = null;
    if (data.basicProperties && data.basicProperties.length) {
        propsToPick = data.basicProperties.reduce((memo, value) => {
            memo.push(value.name);
            return memo;
        }, []);
    }

    const resource = createObjResource(basicProperties, true, propsToPick);

    _.forEach(data, (value, key) => {
        if (_.isArray(value)) {
            resource.embed(key, value.map(customResource.bind(null, req, key)));
        }
    });

    if (resource.type === 'ImageArea') {
        if (resource.HRef) {
            resource.link('target', resource.HRef);
        } else if (resource._embedded && resource._embedded.Targets && resource._embedded.Targets.length) {
            resource.link('target', resource._embedded.Targets[0]._links.self.href);
            resource.link('preview', resource._embedded.Targets[0]._links.preview.href);
        }
    }

    return resource;
}

function createOverviewPanel(req, persistence, hsCurrentEntity, currentInstance, isPreview) {
    return Promise.resolve()
        // Find the overview.
        .then(() => hsCurrentEntity.getOverview(persistence, currentInstance, isPreview))
        .then(parseLinks)
        .then(convertToResource.bind(null, req))
        .then((overviews) => {
            const resource = createObjResource({
                alternatingColors: false,
                type: 'Overview'
            });

            if (isPreview && !overviews.length) {
                let mockPreview = {
                    id: currentInstance.id,
                    type: currentInstance.type,
                    name: currentInstance.Name ? currentInstance.Name : currentInstance.name
                };

                overviews.push(mockPreview);
            }

            resource.embed('overviews', overviews);
            return resource;
        });
}

function addSeparatorPanelItems(panel, items) {
    panel.separatorPanelItems.forEach((item) => {
        items.push(createObjResource(item));
    });
    return items;
}

function addRelationshipPanelItems(req, panel, persistence, entity, isPreview, items) {
    return Promise.map(
        panel.relationshipPanelItems,
        (item) => {
            const itemResource = createObjResource(item);
            items.push(itemResource);
            return extractRelationship(req, itemResource, persistence, item, entity, isPreview);
        }
    ).then(() => items);
}

function addBasicPropertyPanelItems(panel, entity, items) {
    panel.basicPropertyPanelItems.forEach((item) => {
        item.value = entity[item.name];
        const itemResource = createObjResource(item);
        items.push(itemResource);
    });
    return items;
}

function addEnumPanelItems(panel, items) {
    panel.enumPanelItems.forEach((item) => {
        // TODO
        debug(`In panel.enumPanelItems...`);
    });
    return items;
}

function sortItems(items) {
    items.sort((a, b) => a.position - b.position);
    return items;
}

function embed(resource, key, items) {
    resource.embed(key, items);
    return resource;
}

module.exports = (req, responseResource, persistence, hsEntity, entity, isPreview) => {
    return Promise.resolve(hsEntity.getPageView('DefaultPortalView'))
        .then((pageView) => pageView.getPanels())
        .then((panels) => {
            const embeddedPanels = [];
            return Promise.map(panels,
                (panel, panelIndex) => {
                    const panelResource = createObjResource(panel);
                    embeddedPanels.push(panelResource);

                    return Promise.resolve([])
                        .then(addSeparatorPanelItems.bind(null, panel))
                        .then(addRelationshipPanelItems.bind(null, req, panel, persistence, entity, isPreview))
                        .then(addBasicPropertyPanelItems.bind(null, panel, entity))
                        .then(addEnumPanelItems.bind(null, panel))
                        .then(sortItems)
                        .then(embed.bind(null, panelResource, 'panelItems'));
                }
            )
            .then(() => createOverviewPanel(req, persistence, hsEntity, entity, isPreview))
            .then((overviewPanel) => {
                if (overviewPanel) {
                    // We increment the position becase we will add the overview at
                    // the first position of the panels.
                    embeddedPanels.forEach((panel) => {
                        // It is some time a Number, some time a String.
                        panel.position = Number(panel.position) + 1;
                    });
                    overviewPanel.position = 0;
                    embeddedPanels.unshift(overviewPanel);
                    embeddedPanels.sort((a, b) => a.position - b.position);
                }
                return embeddedPanels;
            });
        })
        .then((panels) => {
            responseResource.embed('panels', panels);
        });
};
