import React, { Component } from 'react';
import { Route } from 'react-router-dom';
import Switch from 'Components/Router/Switch';
import LibraryImportSelectFolderConnector from './SelectFolder/LibraryImportSelectFolderConnector';
import LibraryImportTableConnector from './Import/LibraryImportTableConnector';

class LibraryImport extends Component {

  //
  // Render

  render() {
    return (
      <Switch>
        <Route
          exact={true}
          path="/import"
          component={LibraryImportSelectFolderConnector}
        />

        <Route
          path="/import/:rootFolderId"
          component={LibraryImportTableConnector}
        />
      </Switch>
    );
  }
}

export default LibraryImport;
