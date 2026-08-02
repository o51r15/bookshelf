import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'connected-react-router';
import { createSelector } from 'reselect';
import {
  queueLookupAuthor,
  importAuthor,
  clearImportAuthor,
  cancelLookupAuthor,
  setImportAuthorValue
} from 'Store/Actions/importAuthorActions';
import { fetchRootFolders } from 'Store/Actions/Settings/rootFolders';
import { fetchQualityProfiles } from 'Store/Actions/Settings/qualityProfiles';
import { fetchMetadataProfiles } from 'Store/Actions/Settings/metadataProfiles';
import LibraryImportTable from './LibraryImportTable';

function createMapStateToProps() {
  return createSelector(
    (state, { match }) => match,
    (state) => state.settings.rootFolders,
    (state) => state.settings.qualityProfiles,
    (state) => state.settings.metadataProfiles,
    (state) => state.importAuthor,
    (state) => state.authors,
    (match, rootFolders, qualityProfiles, metadataProfiles, importAuthorState, authors) => {
      const rootFolderId = parseInt(match.params.rootFolderId);
      const rootFolder = rootFolders.items.find((rf) => rf.id === rootFolderId);

      const defaultQualityProfileId = qualityProfiles.items.length ? qualityProfiles.items[0].id : 0;
      const defaultMetadataProfileId = metadataProfiles.items.length ? metadataProfiles.items[0].id : 0;

      // Build set of existing author foreignAuthorIds for "Existing" badge
      const existingAuthorIds = new Set();
      if (authors && authors.items) {
        authors.items.forEach((a) => {
          if (a.foreignAuthorId) {
            existingAuthorIds.add(a.foreignAuthorId);
          }
        });
      }

      return {
        rootFolderId,
        rootFolder,
        rootFolderPath: rootFolder ? rootFolder.path : null,
        unmappedFolders: rootFolder && rootFolder.unmappedFolders ? rootFolder.unmappedFolders : [],
        rootFoldersFetching: rootFolders.isFetching,
        rootFoldersPopulated: rootFolders.isPopulated,
        defaultQualityProfileId,
        defaultMetadataProfileId,
        qualityProfilesPopulated: qualityProfiles.isPopulated,
        metadataProfilesPopulated: metadataProfiles.isPopulated,
        items: importAuthorState.items,
        isLookingUpAuthor: importAuthorState.isLookingUpAuthor,
        isImporting: importAuthorState.isImporting,
        isImported: importAuthorState.isImported,
        importError: importAuthorState.importError,
        existingAuthorIds
      };
    }
  );
}

const mapDispatchToProps = {
  push,
  fetchRootFolders,
  fetchQualityProfiles,
  fetchMetadataProfiles,
  queueLookupAuthor,
  importAuthor,
  clearImportAuthor,
  cancelLookupAuthor,
  setImportAuthorValue
};

class LibraryImportTableConnector extends Component {

  //
  // Lifecycle

  componentDidMount() {
    this.props.fetchRootFolders();
    this.props.fetchQualityProfiles();
    this.props.fetchMetadataProfiles();
  }

  componentDidUpdate(prevProps) {
    const {
      unmappedFolders,
      rootFoldersPopulated,
      qualityProfilesPopulated,
      metadataProfilesPopulated,
      defaultQualityProfileId,
      defaultMetadataProfileId,
      isImported
    } = this.props;

    // Once all data is loaded and we have unmapped folders, queue lookups
    if (
      rootFoldersPopulated &&
      qualityProfilesPopulated &&
      metadataProfilesPopulated &&
      unmappedFolders.length > 0 &&
      this.props.items.length === 0
    ) {
      unmappedFolders.forEach((folder) => {
        this.props.queueLookupAuthor({
          name: folder.name,
          path: folder.path,
          term: folder.name
        });
      });

      // Apply defaults to all queued items
      unmappedFolders.forEach((folder) => {
        this.props.setImportAuthorValue({
          id: folder.name,
          qualityProfileId: defaultQualityProfileId,
          metadataProfileId: defaultMetadataProfileId
        });
      });
    }

    if (isImported && !prevProps.isImported) {
      this.props.push(`${window.Readarr.urlBase}/`);
    }
  }

  componentWillUnmount() {
    this.props.cancelLookupAuthor();
    this.props.clearImportAuthor();
  }

  //
  // Listeners

  onImportPress = (selectedIds) => {
    this.props.importAuthor({
      ids: selectedIds,
      rootFolderPath: this.props.rootFolderPath
    });
  };

  onInputChange = (id, name, value) => {
    if (name === '_lookupTerm') {
      // Manual search from the author selector dropdown
      this.props.queueLookupAuthor({
        name: id,
        path: this.props.items.find((i) => i.id === id)?.path || '',
        term: value,
        topOfQueue: true
      });
      return;
    }

    this.props.setImportAuthorValue({
      id,
      [name]: value
    });
  };

  //
  // Render

  render() {
    return (
      <LibraryImportTable
        {...this.props}
        onImportPress={this.onImportPress}
        onInputChange={this.onInputChange}
      />
    );
  }
}

LibraryImportTableConnector.propTypes = {
  match: PropTypes.object.isRequired,
  rootFolderPath: PropTypes.string,
  unmappedFolders: PropTypes.arrayOf(PropTypes.object).isRequired,
  rootFoldersPopulated: PropTypes.bool.isRequired,
  qualityProfilesPopulated: PropTypes.bool.isRequired,
  metadataProfilesPopulated: PropTypes.bool.isRequired,
  defaultQualityProfileId: PropTypes.number.isRequired,
  defaultMetadataProfileId: PropTypes.number.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  isImported: PropTypes.bool.isRequired,
  push: PropTypes.func.isRequired,
  fetchRootFolders: PropTypes.func.isRequired,
  fetchQualityProfiles: PropTypes.func.isRequired,
  fetchMetadataProfiles: PropTypes.func.isRequired,
  queueLookupAuthor: PropTypes.func.isRequired,
  importAuthor: PropTypes.func.isRequired,
  clearImportAuthor: PropTypes.func.isRequired,
  cancelLookupAuthor: PropTypes.func.isRequired,
  setImportAuthorValue: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(LibraryImportTableConnector);
