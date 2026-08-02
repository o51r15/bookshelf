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
import { fetchRootFolders } from 'Store/Actions/Settings/rootFolders';
import createClientSideCollectionSelector from 'Store/Selectors/createClientSideCollectionSelector';
import LibraryImportScan from './LibraryImportScan';

function createMapStateToProps() {
  return createSelector(
    (state, { match }) => match,
    (state) => state.settings.rootFolders,
    createClientSideCollectionSelector('interactiveImport'),
    (match, rootFolders, interactiveImport) => {
      const rootFolderId = parseInt(match.params.rootFolderId);
      const rootFolder = rootFolders.items.find((rf) => rf.id === rootFolderId);

      return {
        rootFolderId,
        rootFolderPath: rootFolder ? rootFolder.path : null,
        rootFoldersFetching: rootFolders.isFetching,
        rootFoldersPopulated: rootFolders.isPopulated,
        ...interactiveImport
      };
    }
  );
}

const mapDispatchToProps = {
  fetchRootFolders,
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

  onImportPress = (files) => {
    this.props.executeCommand({
      name: commandNames.INTERACTIVE_IMPORT,
      files,
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
  fetchInteractiveImportItems: PropTypes.func.isRequired,
  setInteractiveImportSort: PropTypes.func.isRequired,
  clearInteractiveImport: PropTypes.func.isRequired,
  executeCommand: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(LibraryImportScanConnector);
