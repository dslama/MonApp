import namespace from './namespace';

const { actionCreator, baseAttributeReducer, concatenateReducers, namespaceKeys } = window.WarpJS.ReactUtils;

//
//  Actions
//

const actions = namespaceKeys(namespace, [
    'UPDATE_EDIT_MODE'
]);

//
//  Action creators
//

const actionCreators = Object.freeze({
    setEditMode: () => actionCreator(actions.UPDATE_EDIT_MODE, { value: true }),
    unsetEditMode: () => actionCreator(actions.UPDATE_EDIT_MODE, { value: false })
});

//
//  Orchestrators
//

const IN_EDIT_MODE = 'warpjs-inline-edit-global-in-edit';
export const orchestrators = Object.freeze({
    setDirty: (dispatch) => {
    },

    setEditMode: (dispatch) => {
        $('body').addClass(IN_EDIT_MODE);
        dispatch(actionCreators.setEditMode());
    },

    unsetEditMode: (dispatch) => {
        $('body').removeClass(IN_EDIT_MODE);
        dispatch(actionCreators.unsetEditMode());
    }
});

//
//  Reducers
//

export const reducers = concatenateReducers([{
    actions: [ actions.UPDATE_EDIT_MODE ],
    reducer: (state = {}, action) => baseAttributeReducer(state, namespace, 'inEditMode', action.payload.value || false)
}]);
