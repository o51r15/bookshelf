import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import SelectInput from 'Components/Form/SelectInput';
import PathInputConnector from 'Components/Form/PathInputConnector';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Menu from 'Components/Menu/Menu';
import MenuButton from 'Components/Menu/MenuButton';
import MenuContent from 'Components/Menu/MenuContent';
import SelectedMenuItem from 'Components/Menu/SelectedMenuItem';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { align, icons, kinds, scrollDirections } from 'Helpers/Props';
import * as commandNames from 'Commands/commandNames';
import { executeCommand } from 'Store/Actions/commandActions';
import {
  addRecentFolder,
  clearInteractiveImport,
  fetchInteractiveImportItems,
  removeRecentFolder,
  saveInteractiveImportItem,
  setInteractiveImportMode,
  setInteractiveImportSort,
  updateInteractiveImportItem
} from 'Store/Actions/interactiveImportActions';
import createClientSideCollectionSelector from 'Store/Selectors/createClientSideCollectionSelector';
import SelectAuthorModal from 'InteractiveImport/Author/SelectAuthorModal';
import SelectBookModal from 'InteractiveImport/Book/SelectBookModal';
import ConfirmImportModal from 'InteractiveImport/Confirmation/ConfirmImportModal';
import SelectEditionModal from 'InteractiveImport/Edition/SelectEditionModal';
import SelectIndexerFlagsModal from 'InteractiveImport/IndexerFlags/SelectIndexerFlagsModal';
import SelectQualityModal from 'InteractiveImport/Quality/SelectQualityModal';
import SelectReleaseGroupModal from 'InteractiveImport/ReleaseGroup/SelectReleaseGroupModal';
import InteractiveImportRow from 'InteractiveImport/Interactive/InteractiveImportRow';
import RecentFolderRow from 'InteractiveImport/Folder/RecentFolderRow';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import selectAll from 'Utilities/Table/selectAll';
import toggleSelected from 'Utilities/Table/toggleSelected';
import styles from './LibraryImport.css';

const COLUMNS = [
  {
    name: 'path',
    label: 'Path',
    isSortable: true,
    isVisible: true
  },
  {
    name: 'author',
    label: 'Author',
    isSortable: true,
    isVisible: true
  },
  {
    name: 'book',
    label: 'Book',
    isVisible: true
  },
  {
    name: 'releaseGroup',
    label: 'Release Group',
    isVisible: true
  },
  {
    name: 'quality',
    label: 'Quality',
    isSortable: true,
    isVisible: true
  },
  {
    name: 'size',
    label: 'Size',
    isSortable: true,
    isVisible: true
  },
  {
    name: 'customFormats',
    label: React.createElement(Icon, {
      name: icons.INTERACTIVE,
      title: () => translate('CustomFormat')
    }),
    isSortable: true,
    isVisible: true
  },
  {
    name: 'indexerFlags',
    label: React.createElement(Icon, {
      name: icons.FLAG,
      title: () => translate('IndexerFlags')
    }),
    isSortable: true,
    isVisible: true
  },
  {
    name: 'rejections',
    label: React.createElement(Icon, {
      name: icons.DANGER,
      kind: kinds.DANGER,
      title: () => translate('Rejections')
    }),
    isSortable: true,
    isVisible: true
  }
];

const filterExistingFilesOptions = {
  ALL: 'all',
  NEW: 'new'
};

const importModeOptions = [
  { key: 'chooseImportMode', value: () => translate('ChooseImportMethod'), disabled: true },
  { key: 'move', value: () => translate('MoveFiles') },
  { key: 'copy', value: () => translate('HardlinkCopyFiles') }
];

const SELECT = 'select';
const AUTHOR = 'author';
const BOOK = 'book';
const EDITION = 'edition';
const RELEASE_GROUP = 'releaseGroup';
const QUALITY = 'quality';
const INDEXER_FLAGS = 'indexerFlags';

const replaceExistingFilesOptions = {
  COMBINE: 'combine',
  DELETE: 'delete'
};

const recentFoldersColumns = [
  {
    name: 'folder',
    label: 'Folder'
  },
  {
    name: 'lastUsed',
    label: 'Last Used'
  },
  {
    name: 'actions',
    label: ''
  }
];

function createMapStateToProps() {
  return createSelector(
    createClientSideCollectionSelector('interactiveImport'),
    (interactiveImport) => {
      return interactiveImport;
    }
  );
}

const mapDispatchToProps = {
  fetchInteractiveImportItems,
  setInteractiveImportSort,
  setInteractiveImportMode,
  clearInteractiveImport,
  updateInteractiveImportItem,
  saveInteractiveImportItem,
  addRecentFolder,
  removeRecentFolder,
  executeCommand
};

class LibraryImport extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      folder: '',
      isScanned: false,
      filterExistingFiles: true,
      replaceExistingFiles: false,
      allSelected: false,
      allUnselected: false,
      lastToggled: null,
      selectedState: {},
      invalidRowsSelected: [],
      selectModalOpen: null,
      booksImported: [],
      isConfirmImportModalOpen: false,
      inconsistentBookReleases: false,
      interactiveImportErrorMessage: null
    };
  }

  componentDidUpdate(prevProps) {
    const selectedIds = this.getSelectedIds();
    const selectedItems = _.filter(this.props.items, (x) => _.includes(selectedIds, x.id));

    const inconsistent = _(selectedItems)
      .map((x) => ({ bookId: x.book ? x.book.id : 0, foreignEditionId: x.ForeignEditionId }))
      .groupBy('bookId')
      .mapValues((book) => _(book).groupBy((x) => x.foreignEditionId).values().value().length)
      .values()
      .some((x) => x !== undefined && x > 1);

    if (inconsistent !== this.state.inconsistentBookReleases) {
      this.setState({ inconsistentBookReleases: inconsistent });
    }
  }

  componentWillUnmount() {
    this.props.clearInteractiveImport();
  }

  //
  // Control

  getSelectedIds = () => {
    return getSelectedIds(this.state.selectedState);
  };

  //
  // Listeners

  onPathChange = ({ value }) => {
    this.setState({ folder: value });
  };

  onRecentPathPress = (folder) => {
    this.setState({ folder }, () => {
      this.onScanPress();
    });
  };

  onRemoveRecentFolderPress = (folder) => {
    this.props.removeRecentFolder({ folder });
  };

  onScanPress = () => {
    const { folder, filterExistingFiles, replaceExistingFiles } = this.state;

    if (!folder) {
      return;
    }

    this.props.addRecentFolder({ folder });

    this.props.fetchInteractiveImportItems({
      folder,
      filterExistingFiles,
      replaceExistingFiles,
      addNewAuthors: true
    });

    this.setState({
      isScanned: true,
      selectedState: {},
      allSelected: false,
      allUnselected: false
    });
  };

  onSelectAllChange = ({ value }) => {
    this.setState(selectAll(this.state.selectedState, value));
  };

  onSelectedChange = ({ id, value, shiftKey = false }) => {
    this.setState((state) => {
      return toggleSelected(state, this.props.items, id, value, shiftKey);
    });
  };

  onValidRowChange = (id, isValid) => {
    this.setState((state, props) => {
      const diff = _.difference(state.invalidRowsSelected, _.map(props.items, 'id'));
      const currentInvalid = _.difference(state.invalidRowsSelected, diff);
      const newstate = isValid ? _.without(currentInvalid, id) : _.union(currentInvalid, [id]);
      return { invalidRowsSelected: newstate };
    });
  };

  onSortPress = (sortKey, sortDirection) => {
    this.props.setInteractiveImportSort({ sortKey, sortDirection });
  };

  onFilterExistingFilesChange = (value) => {
    const filterExistingFiles = value !== filterExistingFilesOptions.ALL;

    this.setState({ filterExistingFiles }, () => {
      if (this.state.isScanned) {
        this.onScanPress();
      }
    });
  };

  onReplaceExistingFilesChange = (value) => {
    const replaceExistingFiles = value === replaceExistingFilesOptions.DELETE;

    this.setState({ replaceExistingFiles }, () => {
      if (this.state.isScanned) {
        this.onScanPress();
      }
    });
  };

  onImportModeChange = ({ value }) => {
    this.props.setInteractiveImportMode({ importMode: value });
  };

  onSelectModalSelect = ({ value }) => {
    this.setState({ selectModalOpen: value });
  };

  onSelectModalClose = () => {
    this.setState({ selectModalOpen: null });
  };

  onClearBookMappingPress = () => {
    const selectedIds = this.getSelectedIds();

    selectedIds.forEach((id) => {
      this.props.updateInteractiveImportItem({
        id,
        rejections: []
      });
    });
  };

  onGetBookMappingPress = () => {
    this.props.saveInteractiveImportItem({ id: this.getSelectedIds() });
  };

  onImportSelectedPress = () => {
    const { replaceExistingFiles } = this.state;

    if (replaceExistingFiles) {
      const selectedIds = this.getSelectedIds();
      const booksImported = _(this.props.items)
        .filter((x) => _.includes(selectedIds, x.id))
        .keyBy((x) => x.book.id)
        .map((x) => x.book)
        .value();

      this.setState({
        booksImported,
        isConfirmImportModalOpen: true
      });
      return;
    }

    this.onConfirmImportPress();
  };

  onConfirmImportPress = () => {
    const { importMode, items } = this.props;
    const selected = this.getSelectedIds();
    const finalImportMode = importMode === 'chooseImportMode' ? null : importMode;
    const files = [];

    if (!finalImportMode) {
      this.setState({ interactiveImportErrorMessage: 'An import mode must be selected' });
      return;
    }

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

        if (!quality) {
          this.setState({ interactiveImportErrorMessage: 'Quality must be chosen for each selected file' });
          return false;
        }

        files.push({
          path: item.path,
          authorId: author.id,
          bookId: book.id,
          foreignEditionId,
          quality,
          indexerFlags,
          disableReleaseSwitching
        });
      }
    });

    if (!files.length) {
      return;
    }

    this.props.executeCommand({
      name: commandNames.INTERACTIVE_IMPORT,
      files,
      importMode: finalImportMode,
      replaceExistingFiles: this.state.replaceExistingFiles
    });

    this.setState({
      isConfirmImportModalOpen: false,
      interactiveImportErrorMessage: null
    });
  };

  onConfirmImportModalClose = () => {
    this.setState({ isConfirmImportModalOpen: false });
  };

  //
  // Render

  render() {
    const {
      isFetching,
      isPopulated,
      isSaving,
      error,
      items,
      sortKey,
      sortDirection,
      importMode,
      recentFolders
    } = this.props;

    const {
      folder,
      isScanned,
      allSelected,
      allUnselected,
      selectedState,
      invalidRowsSelected,
      selectModalOpen,
      booksImported,
      isConfirmImportModalOpen,
      inconsistentBookReleases,
      interactiveImportErrorMessage,
      filterExistingFiles,
      replaceExistingFiles
    } = this.state;

    const allColumns = _.cloneDeep(COLUMNS);
    const columns = allColumns.map((column) => {
      const showIndexerFlags = items.some((item) => item.indexerFlags);

      if (!showIndexerFlags) {
        const indexerFlagsColumn = allColumns.find((c) => c.name === 'indexerFlags');

        if (indexerFlagsColumn) {
          indexerFlagsColumn.isVisible = false;
        }
      }

      return column;
    });

    const selectedIds = this.getSelectedIds();
    const selectedItem = selectedIds.length ? _.find(items, { id: selectedIds[0] }) : null;
    const importIdsByBook = _.chain(items).filter((x) => x.book).groupBy((x) => x.book.id).mapValues((x) => x.map((y) => y.id)).value();
    const editions = _.chain(items).filter((x) => x.book).keyBy((x) => x.book.id).mapValues((x) => ({ matchedEditionId: x.foreignEditionId, book: x.book })).values().value();
    const errorMessage = getErrorMessage(error, 'Unable to load manual import items');

    const bulkSelectOptions = [
      { key: SELECT, value: translate('SelectDropdown'), disabled: true },
      { key: AUTHOR, value: 'Select Author' },
      { key: BOOK, value: translate('SelectBook') },
      { key: EDITION, value: translate('SelectEdition') },
      { key: QUALITY, value: translate('SelectQuality') },
      { key: RELEASE_GROUP, value: translate('SelectReleaseGroup') },
      { key: INDEXER_FLAGS, value: translate('SelectIndexerFlags') }
    ];

    return (
      <PageContent title={`Library Import${isScanned && folder ? ` - ${folder}` : ''}`}>
        <PageContentBody>
          {/* Folder selection */}
          <div className={styles.folderPathInputContainer}>
            <PathInputConnector
              name="folder"
              value={folder}
              onChange={this.onPathChange}
            />

            <Button
              className={styles.scanButton}
              kind={kinds.PRIMARY}
              isDisabled={!folder}
              onPress={this.onScanPress}
            >
              <Icon name={icons.REFRESH} />
              &nbsp;
              Scan
            </Button>
          </div>

          {/* Recent folders when no scan active */}
          {
            !!recentFolders.length && !isScanned &&
              <div className={styles.recentFoldersContainer}>
                <Table columns={recentFoldersColumns}>
                  <TableBody>
                    {
                      recentFolders.slice(0).reverse().map((recentFolder) => {
                        return (
                          <RecentFolderRow
                            key={recentFolder.folder}
                            folder={recentFolder.folder}
                            lastUsed={recentFolder.lastUsed}
                            onPress={this.onRecentPathPress}
                            onRemoveRecentFolderPress={this.onRemoveRecentFolderPress}
                          />
                        );
                      })
                    }
                  </TableBody>
                </Table>
              </div>
          }

          {/* Filters - Sonarr style, inline above table */}
          {
            isScanned &&
              <div className={styles.filterContainer}>
                <Menu alignMenu={align.RIGHT}>
                  <MenuButton>
                    <Icon
                      name={icons.FILTER}
                      size={22}
                    />

                    <div className={styles.filterText}>
                      {
                        filterExistingFiles ? 'Unmapped Files Only' : 'All Files'
                      }
                    </div>
                  </MenuButton>

                  <MenuContent>
                    <SelectedMenuItem
                      name={filterExistingFilesOptions.ALL}
                      isSelected={!filterExistingFiles}
                      onPress={this.onFilterExistingFilesChange}
                    >
                      All Files
                    </SelectedMenuItem>

                    <SelectedMenuItem
                      name={filterExistingFilesOptions.NEW}
                      isSelected={filterExistingFiles}
                      onPress={this.onFilterExistingFilesChange}
                    >
                      Unmapped Files Only
                    </SelectedMenuItem>
                  </MenuContent>
                </Menu>

                <Menu alignMenu={align.RIGHT}>
                  <MenuButton>
                    <Icon
                      name={icons.CLONE}
                      size={22}
                    />

                    <div className={styles.filterText}>
                      {
                        replaceExistingFiles ? 'Replace existing files' : 'Combine with existing files'
                      }
                    </div>
                  </MenuButton>

                  <MenuContent>
                    <SelectedMenuItem
                      name={replaceExistingFilesOptions.COMBINE}
                      isSelected={!replaceExistingFiles}
                      onPress={this.onReplaceExistingFilesChange}
                    >
                      Combine With Existing Files
                    </SelectedMenuItem>

                    <SelectedMenuItem
                      name={replaceExistingFilesOptions.DELETE}
                      isSelected={replaceExistingFiles}
                      onPress={this.onReplaceExistingFilesChange}
                    >
                      Replace Existing Files
                    </SelectedMenuItem>
                  </MenuContent>
                </Menu>
              </div>
          }

          {/* Loading */}
          {
            isFetching &&
              <LoadingIndicator />
          }

          {/* Error */}
          {
            error &&
              <div>{errorMessage}</div>
          }

          {/* Import table */}
          {
            isPopulated && isScanned && !!items.length && !isFetching &&
              <Table
                columns={columns}
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
                      return (
                        <InteractiveImportRow
                          key={item.id}
                          isSelected={selectedState[item.id]}
                          isSaving={isSaving}
                          {...item}
                          allowAuthorChange={true}
                          columns={columns}
                          onSelectedChange={this.onSelectedChange}
                          onValidRowChange={this.onValidRowChange}
                        />
                      );
                    })
                  }
                </TableBody>
              </Table>
          }

          {/* No results */}
          {
            isPopulated && isScanned && !items.length && !isFetching &&
              <div className={styles.noResults}>
                No book files were found in the selected folder
              </div>
          }
        </PageContentBody>

        {/* Sonarr-style sticky footer with controls */}
        {
          isScanned && isPopulated && !!items.length && !isFetching &&
            <div className={styles.footer}>
              <div className={styles.leftButtons}>
                <SelectInput
                  className={styles.importMode}
                  name="importMode"
                  value={importMode}
                  values={importModeOptions}
                  onChange={this.onImportModeChange}
                />

                <SelectInput
                  className={styles.bulkSelect}
                  name="select"
                  value={SELECT}
                  values={bulkSelectOptions}
                  isDisabled={!selectedIds.length}
                  onChange={this.onSelectModalSelect}
                />
              </div>

              <div className={styles.rightButtons}>
                {
                  interactiveImportErrorMessage &&
                    <span className={styles.errorMessage}>{interactiveImportErrorMessage}</span>
                }

                <Button
                  kind={kinds.SUCCESS}
                  isDisabled={isSaving || !selectedIds.length || !!invalidRowsSelected.length || inconsistentBookReleases}
                  onPress={this.onImportSelectedPress}
                >
                  Import
                </Button>
              </div>
            </div>
        }

        <SelectAuthorModal
          isOpen={selectModalOpen === AUTHOR}
          ids={selectedIds}
          onModalClose={this.onSelectModalClose}
        />

        <SelectBookModal
          isOpen={selectModalOpen === BOOK}
          ids={selectedIds}
          authorId={selectedItem && selectedItem.author && selectedItem.author.id}
          onModalClose={this.onSelectModalClose}
        />

        <SelectEditionModal
          isOpen={selectModalOpen === EDITION}
          importIdsByBook={importIdsByBook}
          books={editions}
          onModalClose={this.onSelectModalClose}
        />

        <SelectReleaseGroupModal
          isOpen={selectModalOpen === RELEASE_GROUP}
          ids={selectedIds}
          releaseGroup=""
          onModalClose={this.onSelectModalClose}
        />

        <SelectQualityModal
          isOpen={selectModalOpen === QUALITY}
          ids={selectedIds}
          qualityId={0}
          proper={false}
          real={false}
          onModalClose={this.onSelectModalClose}
        />

        <SelectIndexerFlagsModal
          isOpen={selectModalOpen === INDEXER_FLAGS}
          ids={selectedIds}
          indexerFlags={0}
          onModalClose={this.onSelectModalClose}
        />

        <ConfirmImportModal
          isOpen={isConfirmImportModalOpen}
          books={booksImported}
          onModalClose={this.onConfirmImportModalClose}
          onConfirmImportPress={this.onConfirmImportPress}
        />
      </PageContent>
    );
  }
}

LibraryImport.propTypes = {
  isFetching: PropTypes.bool.isRequired,
  isPopulated: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  error: PropTypes.object,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  sortKey: PropTypes.string,
  sortDirection: PropTypes.string,
  importMode: PropTypes.string.isRequired,
  recentFolders: PropTypes.arrayOf(PropTypes.object).isRequired,
  fetchInteractiveImportItems: PropTypes.func.isRequired,
  setInteractiveImportSort: PropTypes.func.isRequired,
  setInteractiveImportMode: PropTypes.func.isRequired,
  clearInteractiveImport: PropTypes.func.isRequired,
  updateInteractiveImportItem: PropTypes.func.isRequired,
  saveInteractiveImportItem: PropTypes.func.isRequired,
  addRecentFolder: PropTypes.func.isRequired,
  removeRecentFolder: PropTypes.func.isRequired,
  executeCommand: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(LibraryImport);
