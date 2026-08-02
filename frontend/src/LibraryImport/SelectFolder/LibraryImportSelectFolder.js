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
      <PageContent title="Library Import">
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
                  Import books that are already organized on disk
                </div>

                <div className={styles.tips}>
                  Tips:
                  <ul>
                    <li className={styles.tip}>
                      Point Bookshelf at a root folder containing your existing book files
                    </li>
                    <li className={styles.tip}>
                      Bookshelf will scan for book files, identify them using metadata, and add them to your library
                    </li>
                    <li className={styles.tip}>
                      Files will not be moved or copied — they stay where they are
                    </li>
                  </ul>
                </div>

                {
                  items.length ?
                    <div className={styles.rootFolders}>
                      {
                        items.map((rootFolder) => {
                          return (
                            <div
                              key={rootFolder.id}
                              className={styles.rootFolder}
                              onClick={() => onRootFolderPress(rootFolder.id)}
                            >
                              <div className={styles.rootFolderPath}>
                                {rootFolder.path}
                              </div>
                              <div className={styles.rootFolderInfo}>
                                {rootFolder.freeSpace != null ?
                                  `${formatBytes(rootFolder.freeSpace)} free` :
                                  ''
                                }
                              </div>
                            </div>
                          );
                        })
                      }
                    </div> :
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
