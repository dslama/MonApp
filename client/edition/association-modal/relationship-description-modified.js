const Promise = require('bluebird');

const constants = require('./constants');
const formFeedback = require('./../form-feedback');

module.exports = ($, instanceDoc) => {
    instanceDoc.on('change', `${constants.DIALOG_SELECTOR} textarea.warpjs-relationship-description`, function() {
        const data = {
            updatePath: $(this).data('warpjsDocLevel'),
            field: $(this).data('warpjsField'),
            updateValue: $(this).val()
        };

        $(`li[data-warpjs-doc-level="${data.updatePath}"]`, instanceDoc).data('warpjsRelationshipDescription', data.updateValue);

        return Promise.resolve()
            .then(() => formFeedback.start($, this))
            .then(() => window.WarpJS.proxy.patch($, undefined, data))
            .then(() => formFeedback.success($, this))
            .catch((err) => {
                formFeedback.error($, this);
                console.error("Error updating association description:", err);
                window.WarpJS.toast.error($, err.message, "Error updating association description");
            })
        ;
    });
};
