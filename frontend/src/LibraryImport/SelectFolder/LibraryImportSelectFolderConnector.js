import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { fetchRootFolders } from 'Store/Actions/Settings/rootFolders';
import LibraryImportSelectFolder from './LibraryImportSelectFolder';

function createMapStateToProps() {
  return createSelector(
    (state) => state.settings.rootFolders,
    (rootFolders) => {
      return {
        isFetching: rootFolders.isFetching,
        isPopulated: rootFolders.isPopulated,
        error: rootFolders.error,
        items: rootFolders.items
      };
    }
  );
}

const mapDispatchToProps = {
  fetchRootFolders
};

class LibraryImportSelectFolderConnector extends Component {

  //
  // Lifecycle

  componentDidMount() {
    this.props.fetchRootFolders();
  }

  //
  // Render

  render() {
    return (
      <LibraryImportSelectFolder
        {...this.props}
      />
    );
  }
}

LibraryImportSelectFolderConnector.propTypes = {
  fetchRootFolders: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(LibraryImportSelectFolderConnector);
