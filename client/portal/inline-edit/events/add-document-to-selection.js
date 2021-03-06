const Promise = require('bluebird');

const selectedDocumentsItemTemplate = require('./../selected-documents-item.hbs');

function findAddedSelection($, modal, doc) {
    return $(`.warpjs-section-selected-documents .warpjs-section-item[data-warpjs-id="${doc.id}"]`, modal);
}

module.exports = ($, modal, elementToAdd) => {
    const { toast } = window.WarpJS;

    const section = $(elementToAdd).closest('.warpjs-section');

    const doc = {
        type: $(elementToAdd).data('warpjsType'),
        id: $(elementToAdd).data('warpjsId'),
        name: $(elementToAdd).data('warpjsName'),
        reference: {
            type: $(section).data('warpjsReferenceType'),
            id: $(section).data('warpjsReferenceId')
        }
    };

    return Promise.resolve()
        .then(() => findAddedSelection($, modal, doc))
        .then((addedDocument) => addedDocument.length
            ? addedDocument
            : Promise.resolve()
                .then(() => toast.warning($, "Create assocation on server", "TODO"))
                .then((res) => {
                    if (!$('.warpjs-section-selected-documents .warpjs-section-item').length) {
                        $('.warpjs-section-selected-documents .warpjs-no-documents').remove();
                    }
                    $('.warpjs-section-selected-documents', modal).append(selectedDocumentsItemTemplate({ doc }));
                })
                .then(() => findAddedSelection($, modal, doc))
        )
        .then((addedDocument) => {
            addedDocument[0].scrollIntoView();
            addedDocument.trigger('click');
        })
    ;
};
