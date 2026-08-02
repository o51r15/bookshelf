import $ from 'jquery';
import { createAction } from 'redux-actions';
import { batchActions } from 'redux-batched-actions';
import { createThunk, handleThunks } from 'Store/thunks';
import getNewAuthor from 'Utilities/Author/getNewAuthor';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import getSectionState from 'Utilities/State/getSectionState';
import updateSectionState from 'Utilities/State/updateSectionState';
import { set, updateItem } from './baseActions';
import createHandleActions from './Creators/createHandleActions';

//
// Variables

export const section = 'importAuthor';

let defined = false;
let concurrentLookups = 0;
let abortCurrentLookup = null;
const lookupQueue = [];

//
// State

export const defaultState = {
  isLookingUpAuthor: false,
  isImporting: false,
  isImported: false,
  importError: null,
  items: []
};

//
// Actions Types

export const QUEUE_LOOKUP_AUTHOR = 'importAuthor/queueLookupAuthor';
export const START_LOOKUP_AUTHOR = 'importAuthor/startLookupAuthor';
export const IMPORT_AUTHOR = 'importAuthor/importAuthor';
export const SET_IMPORT_AUTHOR_VALUE = 'importAuthor/setImportAuthorValue';
export const CLEAR_IMPORT_AUTHOR = 'importAuthor/clearImportAuthor';
export const CANCEL_LOOKUP_AUTHOR = 'importAuthor/cancelLookupAuthor';

//
// Action Creators

export const queueLookupAuthor = createThunk(QUEUE_LOOKUP_AUTHOR);
export const startLookupAuthor = createThunk(START_LOOKUP_AUTHOR);
export const importAuthor = createThunk(IMPORT_AUTHOR);
export const clearImportAuthor = createAction(CLEAR_IMPORT_AUTHOR);
export const cancelLookupAuthor = createAction(CANCEL_LOOKUP_AUTHOR);
export const setImportAuthorValue = createAction(SET_IMPORT_AUTHOR_VALUE, (payload) => {
  return {
    section,
    ...payload
  };
});

//
// Action Handlers

export const actionHandlers = handleThunks({

  [QUEUE_LOOKUP_AUTHOR]: function(getState, payload, dispatch) {
    const {
      name,
      path,
      term,
      topOfQueue = false
    } = payload;

    const state = getState().importAuthor;
    const item = state.items.find((i) => i.id === name);

    if (!item) {
      // New item — add to state
      dispatch(batchActions([
        updateItem({
          section,
          id: name,
          name,
          path,
          monitor: 'all',
          qualityProfileId: 0,
          metadataProfileId: 0,
          selectedAuthor: null,
          items: [],
          isFetching: false,
          isPopulated: false,
          isQueued: true,
          error: null
        })
      ]));
    } else {
      // Existing item — mark as queued for re-lookup
      dispatch(updateItem({
        section,
        ...item,
        isFetching: false,
        isPopulated: false,
        isQueued: true,
        error: null
      }));
    }

    const queueItem = {
      id: name,
      term: term || name
    };

    if (topOfQueue) {
      lookupQueue.unshift(queueItem);
    } else {
      lookupQueue.push(queueItem);
    }

    if (!defined) {
      defined = true;
    }

    if (concurrentLookups === 0) {
      dispatch(startLookupAuthor());
    }
  },

  [START_LOOKUP_AUTHOR]: function(getState, payload, dispatch) {
    if (lookupQueue.length === 0) {
      dispatch(set({
        section,
        isLookingUpAuthor: false
      }));
      return;
    }

    dispatch(set({
      section,
      isLookingUpAuthor: true
    }));

    concurrentLookups++;

    const queueItem = lookupQueue.shift();
    const state = getState().importAuthor;
    const item = state.items.find((i) => i.id === queueItem.id);

    if (!item) {
      concurrentLookups--;
      dispatch(startLookupAuthor());
      return;
    }

    dispatch(updateItem({
      section,
      ...item,
      isFetching: true,
      isQueued: false
    }));

    const { request, abortRequest } = createAjaxRequest({
      url: '/author/lookup',
      data: {
        term: queueItem.term
      }
    });

    abortCurrentLookup = abortRequest;

    request.done((data) => {
      const selectedAuthor = data.length > 0 ? data[0] : null;

      dispatch(updateItem({
        section,
        id: queueItem.id,
        isFetching: false,
        isPopulated: true,
        error: null,
        items: data,
        selectedAuthor
      }));
    });

    request.fail((xhr) => {
      dispatch(updateItem({
        section,
        id: queueItem.id,
        isFetching: false,
        isPopulated: true,
        error: xhr.aborted ? null : xhr,
        items: [],
        selectedAuthor: null
      }));
    });

    request.always(() => {
      concurrentLookups--;
      dispatch(startLookupAuthor());
    });
  },

  [IMPORT_AUTHOR]: function(getState, payload, dispatch) {
    dispatch(set({
      section,
      isImporting: true
    }));

    const state = getState().importAuthor;
    const addedIds = {};
    const authorsToImport = [];

    payload.ids.forEach((id) => {
      const item = state.items.find((i) => i.id === id);

      if (!item || !item.selectedAuthor) {
        return;
      }

      const foreignAuthorId = item.selectedAuthor.foreignAuthorId;

      // Deduplicate
      if (addedIds[foreignAuthorId]) {
        return;
      }

      addedIds[foreignAuthorId] = true;

      const newAuthor = getNewAuthor(Object.assign({}, item.selectedAuthor), {
        rootFolderPath: payload.rootFolderPath,
        monitor: item.monitor,
        monitorNewItems: payload.monitorNewItems || 'all',
        qualityProfileId: item.qualityProfileId,
        metadataProfileId: item.metadataProfileId,
        tags: payload.tags || [],
        searchForMissingBooks: false
      });

      // Override path to the unmapped folder's path
      newAuthor.path = item.path;

      authorsToImport.push(newAuthor);
    });

    const { request } = createAjaxRequest({
      url: '/author/import',
      method: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(authorsToImport)
    });

    request.done((data) => {
      dispatch(batchActions([
        set({
          section,
          isImporting: false,
          isImported: true,
          importError: null
        })
      ]));
    });

    request.fail((xhr) => {
      dispatch(set({
        section,
        isImporting: false,
        isImported: false,
        importError: xhr
      }));
    });
  }
});

//
// Reducers

export const reducers = createHandleActions({

  [SET_IMPORT_AUTHOR_VALUE]: function(state, { payload }) {
    const newState = getSectionState(state, section);
    const items = newState.items;
    const index = items.findIndex((item) => item.id === payload.id);

    if (index >= 0) {
      const item = Object.assign({}, items[index], payload);
      newState.items = [...items];
      newState.items.splice(index, 1, item);
    }

    return updateSectionState(state, section, newState);
  },

  [CLEAR_IMPORT_AUTHOR]: function(state) {
    if (abortCurrentLookup) {
      abortCurrentLookup();
      abortCurrentLookup = null;
    }

    lookupQueue.length = 0;
    concurrentLookups = 0;

    return Object.assign({}, state, defaultState);
  },

  [CANCEL_LOOKUP_AUTHOR]: function(state) {
    if (abortCurrentLookup) {
      abortCurrentLookup();
      abortCurrentLookup = null;
    }

    lookupQueue.length = 0;
    concurrentLookups = 0;

    return Object.assign({}, state, { isLookingUpAuthor: false });
  }

}, defaultState, section);
