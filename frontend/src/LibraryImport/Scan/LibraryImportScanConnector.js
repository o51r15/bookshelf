import $ from 'jquery';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'connected-react-router';
import { createSelector } from 'reselect';
import {
  clearInteractiveImport,
  fetchInteractiveImportItems,
  setInteractiveImportSort
} from 'Store/Actions/interactiveImportActions';
import { fetchMetadataProfiles } from 'Store/Actions/Settings/metadataProfiles';
import { fetchQualityProfiles } from 'Store/Actions/Settings/qualityProfiles';
import { fetchRootFolders } from 'Store/Actions/Settings/rootFolders';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import createClientSideCollectionSelector from 'Store/Selectors/createClientSideCollectionSelector';
import LibraryImportScan from './LibraryImportScan';

function createMapStateToProps() {
  return createSelector(
    (state, { match }) => match,
    (state) => state.settings.rootFolders,
    (state) => state.settings.qualityProfiles,
    (state) => state.settings.metadataProfiles,
    createClientSideCollectionSelector('interactiveImport'),
    (match, rootFolders, qualityProfiles, metadataProfiles, interactiveImport) => {
      const rootFolderId = parseInt(match.params.rootFolderId);
      const rootFolder = rootFolders.items.find((rf) => rf.id === rootFolderId);

      const defaultQualityProfileId = qualityProfiles.items.length ? qualityProfiles.items[0].id : 0;
      const defaultMetadataProfileId = metadataProfiles.items.length ? metadataProfiles.items[0].id : 0;

      return {
        rootFolderId,
        rootFolderPath: rootFolder ? rootFolder.path : null,
        rootFoldersFetching: rootFolders.isFetching,
        rootFoldersPopulated: rootFolders.isPopulated,
        defaultQualityProfileId,
        defaultMetadataProfileId,
        ...interactiveImport
      };
    }
  );
}

const mapDispatchToProps = {
  push,
  fetchRootFolders,
  fetchQualityProfiles,
  fetchMetadataProfiles,
  fetchInteractiveImportItems,
  setInteractiveImportSort,
  clearInteractiveImport
};

class LibraryImportScanConnector extends Component {

  //
  // Lifecycle

  componentDidMount() {
    if (!this.props.rootFoldersPopulated) {
      this.props.fetchRootFolders();
    }
  }

  //
  // Listeners

  onScanPress = (folder) => {
    this.props.fetchInteractiveImportItems({
      folder,
      filterExistingFiles: true,
      replaceExistingFiles: false,
      addNewAuthors: true
    });
  };

  onSortPress = (sortKey, sortDirection) => {
    this.props.setInteractiveImportSort({ sortKey, sortDirection });
  };

  onClearImport = () => {
    this.props.clearInteractiveImport();
  };

  onImportPress = (files) => {
    const { rootFolderPath } = this.props;

    // Like Sonarr: just add each new author to the DB with the root folder path.
    // The backend's RefreshAuthor task scans the folder and imports files automatically.
    const authorGroups = _.groupBy(files, 'foreignAuthorId');
    const addPromises = [];

    _.forEach(authorGroups, (groupFiles) => {
      const firstFile = groupFiles[0];

      // Skip authors that already exist in the DB
      if (firstFile.authorId > 0) {
        return;
      }

      const newAuthor = {
        ...firstFile.author,
        rootFolderPath,
        qualityProfileId: firstFile.qualityProfileId,
        metadataProfileId: firstFile.metadataProfileId,
        monitored: true,
        monitorNewItems: firstFile.monitor || 'all',
        addOptions: {
          monitor: firstFile.monitor || 'all',
          searchForMissingBooks: false
        },
        tags: []
      };

      const { request } = createAjaxRequest({
        url: '/author',
        method: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify(newAuthor)
      });

      addPromises.push(request);
    });

    if (!addPromises.length) {
      return;
    }

    // jQuery deferreds don't work with Promise.all — use $.when
    $.when(...addPromises).done(() => {
      this.props.push(`${window.Readarr.urlBase}/`);
    }).fail((error) => {
      console.error('Failed to add authors for import:', error);
    });
  };

  //
  // Render

  render() {
    return (
      <LibraryImportScan
        {...this.props}
        onScanPress={this.onScanPress}
        onSortPress={this.onSortPress}
        onClearImport={this.onClearImport}
        onImportPress={this.onImportPress}
      />
    );
  }
}

LibraryImportScanConnector.propTypes = {
  match: PropTypes.object.isRequired,
  rootFolderPath: PropTypes.string,
  rootFoldersPopulated: PropTypes.bool.isRequired,
  push: PropTypes.func.isRequired,
  fetchRootFolders: PropTypes.func.isRequired,
  fetchQualityProfiles: PropTypes.func.isRequired,
  fetchMetadataProfiles: PropTypes.func.isRequired,
  fetchInteractiveImportItems: PropTypes.func.isRequired,
  setInteractiveImportSort: PropTypes.func.isRequired,
  clearInteractiveImport: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(LibraryImportScanConnector);
