const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');

const convertCustomLinks = require('./convert-custom-links');
const iframesByParagraph = require('./iframes-by-paragraph');
const imagesByParagraph = require('./images-by-paragraph');

module.exports = (persistence, relationship, instance) => Promise.resolve()
    .then(() => relationship ? relationship.getDocuments(persistence, instance) : [])
    .then((paragraphs) => paragraphs.sort(warpjsUtils.byPositionThenName))
    .then((paragraphs) => Promise.map(paragraphs, (paragraph) => Promise.resolve()
        .then(() => warpjsUtils.createResource('', {
            showItem: true,
            documentStyle: true,
            name: paragraph.Heading,
            description: convertCustomLinks(paragraph.Content)
        }))
        .then((paragraphResource) => Promise.resolve()
            .then(() => imagesByParagraph(persistence, relationship.getTargetEntity(), paragraph))
            .then((images) => {
                if (images && images.length) {
                    paragraphResource.embed('images', images);
                }
            })

            .then(() => iframesByParagraph(persistence, relationship.getTargetEntity(), paragraph))
            .then((iframes) => {
                if (iframes && iframes.length) {
                    paragraphResource.embed('iframes', iframes);
                }
            })
            .then(() => paragraphResource)
        )
    ))
;
