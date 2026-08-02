import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import * as commandNames from 'Commands/commandNames';
import { executeCommand } from 'Store/Actions/commandActions';
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
  fetchRootFolders,
  fetchQualityProfiles,
  fetchMetadataProfiles,
  fetchInteractiveImportItems,
  setInteractiveImportSort,
  clearInteractiveImport,
  executeCommand
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

  addAuthor = (authorData, rootFolderPath, qualityProfileId, metadataProfileId, monitorNewItems) => {
    const newAuthor = {
      ...authorData,
      rootFolderPath,
      qualityProfileId,
      metadataProfileId,
      monitored: true,
      monitorNewItems: monitorNewItems || 'all',
      addOptions: {
        monitor: 'all',
        searchForMissingBooks: false
      },
      tags: []
    };

    return createAjaxRequest({
      url: '/author',
      method: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(newAuthor)
    }).request;
  };

  onImportPress = (files) => {
    const { rootFolderPath } = this.props;

    // Separate files into existing authors (have DB id) and new authors (need to be added)
    const existingAuthorFiles = files.filter((f) => f.authorId > 0 && f.bookId > 0);
    const newAuthorFiles = files.filter((f) => !f.authorId || !f.bookId);

    if (!newAuthorFiles.length) {
      // All authors exist, import directly
      this.executeImport(existingAuthorFiles);
      return;
    }

    // Group new author files by foreignAuthorId to avoid adding the same author twice
    const authorGroups = _.groupBy(newAuthorFiles, 'foreignAuthorId');
    const addPromises = [];

    _.forEach(authorGroups, (groupFiles, foreignAuthorId) => {
      const firstFile = groupFiles[0];

      const promise = this.addAuthor(
        firstFile.author,
        rootFolderPath,
        firstFile.qualityProfileId,
        firstFile.metadataProfileId,
        firstFile.monitor
      );

      addPromises.push(
        promise.then((addedAuthor) => {
          // After adding author, fetch their books to find matching book IDs
          return createAjaxRequest({
            url: `/author/${addedAuthor.id}`,
            method: 'GET',
            dataType: 'json'
          }).request.then((fullAuthor) => {
            // Also fetch the author's books
            return createAjaxRequest({
              url: `/book?authorId=${addedAuthor.id}`,
              method: 'GET',
              dataType: 'json'
            }).request.then((books) => {
              // Match each file's book by foreignEditionId or title
              groupFiles.forEach((file) => {
                file.authorId = addedAuthor.id;

                // Try to match by foreignEditionId
                const matchedBook = books.find((b) => {
                  if (b.editions && b.editions.length) {
                    return b.editions.some((e) => e.foreignEditionId === file.foreignEditionId);
                  }

                  return false;
                });

                if (matchedBook) {
                  file.bookId = matchedBook.id;
                } else {
                  // Fallback: match by title
                  const titleMatch = books.find((b) =>
                    b.title && file.book && b.title.toLowerCase() === file.book.title.toLowerCase()
                  );

                  if (titleMatch) {
                    file.bookId = titleMatch.id;
                  }
                }
              });
            });
          });
        })
      );
    });

    // Wait for all authors to be added, then import all files
    Promise.all(addPromises).then(() => {
      const allFiles = existingAuthorFiles.concat(newAuthorFiles);
      const validFiles = allFiles.filter((f) => f.authorId > 0 && f.bookId > 0);

      if (validFiles.length) {
        this.executeImport(validFiles);
      }
    }).catch((error) => {
      console.error('Failed to add authors for import:', error);
    });
  };

  executeImport = (files) => {
    // Strip extra fields that the backend doesn't need
    const importFiles = files.map((f) => ({
      path: f.path,
      authorId: f.authorId,
      bookId: f.bookId,
      foreignEditionId: f.foreignEditionId,
      quality: f.quality,
      indexerFlags: f.indexerFlags || 0,
      disableReleaseSwitching: f.disableReleaseSwitching || false
    }));

    this.props.executeCommand({
      name: commandNames.INTERACTIVE_IMPORT,
      files: importFiles,
      importMode: 'auto',
      replaceExistingFiles: false
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
  rootFoldersPopulated: PropTypes.bool.isRequired,
  fetchRootFolders: PropTypes.func.isRequired,
  fetchQualityProfiles: PropTypes.func.isRequired,
  fetchMetadataProfiles: PropTypes.func.isRequired,
  fetchInteractiveImportItems: PropTypes.func.isRequired,
  setInteractiveImportSort: PropTypes.func.isRequired,
  clearInteractiveImport: PropTypes.func.isRequired,
  executeCommand: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(LibraryImportScanConnector);
