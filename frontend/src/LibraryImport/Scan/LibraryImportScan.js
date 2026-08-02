import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import MetadataProfileSelectInputConnector from 'Components/Form/MetadataProfileSelectInputConnector';
import QualityProfileSelectInputConnector from 'Components/Form/QualityProfileSelectInputConnector';
import SelectInput from 'Components/Form/SelectInput';
import SpinnerButton from 'Components/Link/SpinnerButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageContentFooter from 'Components/Page/PageContentFooter';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { kinds } from 'Helpers/Props';
import LibraryImportRow from './LibraryImportRow';
import monitorNewItemsOptions from 'Utilities/Author/monitorNewItemsOptions';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import selectAll from 'Utilities/Table/selectAll';
import toggleSelected from 'Utilities/Table/toggleSelected';
import styles from './LibraryImportScan.css';

const COLUMNS = [
  {
    name: 'path',
    label: 'File',
    isSortable: true,
    isVisible: true
  },
  {
    name: 'qualityProfileId',
    label: 'Quality Profile',
    isVisible: true
  },
  {
    name: 'metadataProfileId',
    label: 'Metadata Profile',
    isVisible: true
  },
  {
    name: 'monitor',
    label: 'Monitor',
    isVisible: true
  },
  {
    name: 'authorBook',
    label: 'Author / Book',
    isVisible: true
  }
];

class LibraryImportScan extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      allSelected: false,
      allUnselected: false,
      lastToggled: null,
      selectedState: {},
      rowOptions: {},
      isConfirmImportModalOpen: false,
      booksImported: [],
      interactiveImportErrorMessage: null
    };
  }

  componentDidMount() {
    const { rootFolderPath } = this.props;

    this.props.fetchQualityProfiles();
    this.props.fetchMetadataProfiles();

    if (rootFolderPath) {
      this.props.onScanPress(rootFolderPath);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.rootFolderPath !== this.props.rootFolderPath && this.props.rootFolderPath) {
      this.props.onScanPress(this.props.rootFolderPath);
    }
  }

  componentWillUnmount() {
    this.props.onClearImport();
  }

  //
  // Control

  getSelectedIds = () => {
    return getSelectedIds(this.state.selectedState);
  };

  getRowOptions = (id) => {
    const { defaultQualityProfileId, defaultMetadataProfileId } = this.props;

    return this.state.rowOptions[id] || {
      qualityProfileId: defaultQualityProfileId,
      metadataProfileId: defaultMetadataProfileId,
      monitor: 'all'
    };
  };

  getRelativePath = (path) => {
    const { rootFolderPath } = this.props;

    if (rootFolderPath && path && path.indexOf(rootFolderPath) === 0) {
      return path.substring(rootFolderPath.length).replace(/^[/\\]/, '');
    }

    return path;
  };

  //
  // Listeners

  onSelectAllChange = ({ value }) => {
    this.setState(selectAll(this.state.selectedState, value));
  };

  onSelectedChange = ({ id, value, shiftKey = false }) => {
    this.setState((state) => {
      return toggleSelected(state, this.props.items, id, value, shiftKey);
    });
  };

  onSortPress = (sortKey, sortDirection) => {
    this.props.onSortPress(sortKey, sortDirection);
  };

  onRowOptionsChange = (id, changes) => {
    this.setState((state) => {
      const rowOptions = Object.assign({}, state.rowOptions);
      rowOptions[id] = Object.assign({}, this.getRowOptions(id), changes);

      return { rowOptions };
    });
  };

  onFooterQualityProfileChange = ({ value }) => {
    this.applyToSelected({ qualityProfileId: value });
  };

  onFooterMetadataProfileChange = ({ value }) => {
    this.applyToSelected({ metadataProfileId: value });
  };

  onFooterMonitorChange = ({ value }) => {
    this.applyToSelected({ monitor: value });
  };

  applyToSelected = (changes) => {
    const selected = this.getSelectedIds();

    this.setState((state) => {
      const rowOptions = Object.assign({}, state.rowOptions);

      selected.forEach((id) => {
        rowOptions[id] = Object.assign({}, this.getRowOptions(id), changes);
      });

      return { rowOptions };
    });
  };

  onImportSelectedPress = () => {
    this.onConfirmImportPress();
  };

  onConfirmImportPress = () => {
    const { items, onImportPress } = this.props;
    const selected = this.getSelectedIds();
    const files = [];

    _.forEach(items, (item) => {
      const isSelected = selected.indexOf(item.id) > -1;

      if (isSelected) {
        const { author, book, foreignEditionId, quality, indexerFlags, disableReleaseSwitching } = item;

        if (!author) {
          this.setState({ interactiveImportErrorMessage: 'Author must be chosen for each selected file' });
          return false;
        }

        if (!book) {
          this.setState({ interactiveImportErrorMessage: 'Book must be chosen for each selected file' });
          return false;
        }

        const { qualityProfileId, metadataProfileId, monitor } = this.getRowOptions(item.id);

        files.push({
          path: item.path,
          authorId: author.id || 0,
          bookId: book.id || 0,
          author,
          book,
          foreignAuthorId: author.foreignAuthorId,
          foreignEditionId,
          quality,
          indexerFlags,
          disableReleaseSwitching,
          qualityProfileId,
          metadataProfileId,
          monitor
        });
      }
    });

    if (!files.length) {
      return;
    }

    onImportPress(files);

    this.setState({
      isConfirmImportModalOpen: false,
      interactiveImportErrorMessage: null
    });
  };

  //
  // Render

  render() {
    const {
      rootFolderPath,
      isFetching,
      isPopulated,
      isSaving,
      error,
      items,
      sortKey,
      sortDirection,
      defaultQualityProfileId,
      defaultMetadataProfileId
    } = this.props;

    const {
      allSelected,
      allUnselected,
      selectedState,
      isConfirmImportModalOpen,
      interactiveImportErrorMessage
    } = this.state;

    const selectedIds = this.getSelectedIds();
    const errorMessage = getErrorMessage(error, 'Unable to load files');

    const footerQualityProfileId = selectedIds.length ?
      this.getRowOptions(selectedIds[0]).qualityProfileId :
      defaultQualityProfileId;

    const footerMetadataProfileId = selectedIds.length ?
      this.getRowOptions(selectedIds[0]).metadataProfileId :
      defaultMetadataProfileId;

    const footerMonitor = selectedIds.length ?
      this.getRowOptions(selectedIds[0]).monitor :
      'all';

    return (
      <PageContent title={`Library Import - ${rootFolderPath || ''}`}>
        <PageContentBody>
          {
            isFetching ?
              <LoadingIndicator /> :
              null
          }

          {
            !isFetching && error ?
              <Alert kind={kinds.DANGER}>
                {errorMessage}
              </Alert> :
              null
          }

          {
            !isFetching && isPopulated && !items.length ?
              <Alert kind={kinds.INFO}>
                All files in this root folder have already been imported.
              </Alert> :
              null
          }

          {
            !isFetching && isPopulated && !!items.length ?
              <Table
                columns={COLUMNS}
                horizontalScroll={true}
                selectAll={true}
                allSelected={allSelected}
                allUnselected={allUnselected}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortPress={this.onSortPress}
                onSelectAllChange={this.onSelectAllChange}
              >
                <TableBody>
                  {
                    items.map((item) => {
                      const rowOptions = this.getRowOptions(item.id);

                      return (
                        <LibraryImportRow
                          key={item.id}
                          isSelected={selectedState[item.id]}
                          isSaving={isSaving}
                          {...item}
                          relativePath={this.getRelativePath(item.path)}
                          qualityProfileId={rowOptions.qualityProfileId}
                          metadataProfileId={rowOptions.metadataProfileId}
                          monitor={rowOptions.monitor}
                          allowAuthorChange={true}
                          onSelectedChange={this.onSelectedChange}
                          onRowOptionsChange={this.onRowOptionsChange}
                        />
                      );
                    })
                  }
                </TableBody>
              </Table> :
              null
          }
        </PageContentBody>

        {
          !isFetching && isPopulated && !!items.length ?
            <PageContentFooter className={styles.footer}>
                <div className={styles.inputContainer}>
                  <div className={styles.label}>
                    {translate('QualityProfile')}
                  </div>

                  <QualityProfileSelectInputConnector
                    name="qualityProfileId"
                    value={footerQualityProfileId}
                    isDisabled={!selectedIds.length}
                    onChange={this.onFooterQualityProfileChange}
                  />
                </div>

                <div className={styles.inputContainer}>
                  <div className={styles.label}>
                    {translate('MetadataProfile')}
                  </div>

                  <MetadataProfileSelectInputConnector
                    name="metadataProfileId"
                    value={footerMetadataProfileId}
                    isDisabled={!selectedIds.length}
                    onChange={this.onFooterMetadataProfileChange}
                  />
                </div>

                <div className={styles.inputContainer}>
                  <div className={styles.label}>
                    Monitor
                  </div>

                  <SelectInput
                    name="monitor"
                    value={footerMonitor}
                    values={monitorNewItemsOptions}
                    isDisabled={!selectedIds.length}
                    onChange={this.onFooterMonitorChange}
                  />
                </div>

                <div className={styles.importButtonContainer}>
                  {
                    interactiveImportErrorMessage ?
                      <span className={styles.errorMessage}>
                        {interactiveImportErrorMessage}
                      </span> :
                      null
                  }

                  <SpinnerButton
                    className={styles.importButton}
                    kind={kinds.SUCCESS}
                    isSpinning={isSaving}
                    isDisabled={!selectedIds.length}
                    onPress={this.onImportSelectedPress}
                  >
                    {`Import ${selectedIds.length} Book${selectedIds.length !== 1 ? 's' : ''}`}
                  </SpinnerButton>
                </div>
            </PageContentFooter> :
            null
        }
      </PageContent>
    );
  }
}

LibraryImportScan.propTypes = {
  rootFolderPath: PropTypes.string,
  isFetching: PropTypes.bool.isRequired,
  isPopulated: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  error: PropTypes.object,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  sortKey: PropTypes.string,
  sortDirection: PropTypes.string,
  defaultQualityProfileId: PropTypes.number,
  defaultMetadataProfileId: PropTypes.number,
  onScanPress: PropTypes.func.isRequired,
  onSortPress: PropTypes.func.isRequired,
  onClearImport: PropTypes.func.isRequired,
  onImportPress: PropTypes.func.isRequired,
  fetchQualityProfiles: PropTypes.func.isRequired,
  fetchMetadataProfiles: PropTypes.func.isRequired
};

export default LibraryImportScan;
