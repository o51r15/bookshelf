import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import { kinds } from 'Helpers/Props';
import styles from './LibraryImportSelectFolder.css';

class LibraryImportSelectFolder extends Component {

  //
  // Render

  render() {
    const {
      isFetching,
      isPopulated,
      error,
      items,
      onRootFolderPress
    } = this.props;

    return (
      <PageContent title="Import Library">
        <PageContentBody>
          {
            isFetching && !isPopulated ?
              <LoadingIndicator /> :
              null
          }

          {
            !isFetching && error ?
              <Alert kind={kinds.DANGER}>
                Unable to load root folders
              </Alert> :
              null
          }

          {
            !error && isPopulated &&
              <div>
                <div className={styles.header}>
                  Import authors you already have
                </div>

                <div className={styles.tips}>
                  Tips:
                  <ul>
                    <li className={styles.tip}>
                      Each subfolder under a root folder should be named after an author
                    </li>
                    <li className={styles.tip}>
                      Bookshelf will look up each folder name and let you confirm or correct the match before importing
                    </li>
                    <li className={styles.tip}>
                      Files will not be moved or copied — they stay where they are
                    </li>
                  </ul>
                </div>

                {
                  items.length ?
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.tableHeader}>Path</th>
                          <th className={styles.tableHeader}>Free Space</th>
                          <th className={styles.tableHeader}>Unmapped Folders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          items.map((rootFolder) => {
                            const unmappedCount = rootFolder.unmappedFolders ?
                              rootFolder.unmappedFolders.length : 0;

                            return (
                              <tr
                                key={rootFolder.id}
                                className={styles.tableRow}
                                onClick={() => onRootFolderPress(rootFolder.id)}
                              >
                                <td className={styles.path}>
                                  {rootFolder.path}
                                </td>
                                <td className={styles.freeSpace}>
                                  {rootFolder.freeSpace != null ?
                                    formatBytes(rootFolder.freeSpace) :
                                    ''
                                  }
                                </td>
                                <td className={styles.unmappedFolders}>
                                  {unmappedCount}
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table> :
                    <Alert kind={kinds.WARNING}>
                      No root folders have been configured. Add root folders in Settings &gt; Media Management first.
                    </Alert>
                }
              </div>
          }
        </PageContentBody>
      </PageContent>
    );
  }
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

LibraryImportSelectFolder.propTypes = {
  isFetching: PropTypes.bool.isRequired,
  isPopulated: PropTypes.bool.isRequired,
  error: PropTypes.object,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRootFolderPress: PropTypes.func.isRequired
};

export default LibraryImportSelectFolder;
