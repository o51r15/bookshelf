import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import SelectInput from 'Components/Form/SelectInput';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import SpinnerButton from 'Components/Link/SpinnerButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageContentFooter from 'Components/Page/PageContentFooter';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { icons, kinds } from 'Helpers/Props';
import InteractiveImportRow from 'InteractiveImport/Interactive/InteractiveImportRow';
import SelectAuthorModal from 'InteractiveImport/Author/SelectAuthorModal';
import SelectBookModal from 'InteractiveImport/Book/SelectBookModal';
import SelectEditionModal from 'InteractiveImport/Edition/SelectEditionModal';
import SelectIndexerFlagsModal from 'InteractiveImport/IndexerFlags/SelectIndexerFlagsModal';
import SelectQualityModal from 'InteractiveImport/Quality/SelectQualityModal';
import SelectReleaseGroupModal from 'InteractiveImport/ReleaseGroup/SelectReleaseGroupModal';
import ConfirmImportModal from 'InteractiveImport/Confirmation/ConfirmImportModal';
import * as commandNames from 'Commands/commandNames';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import selectAll from 'Utilities/Table/selectAll';
import toggleSelected from 'Utilities/Table/toggleSelected';
import styles from './LibraryImportScan.css';

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
    name: 'rejections',
    label: () => React.createElement(Icon, {
      name: icons.DANGER,
      kind: kinds.DANGER,
      title: () => translate('Rejections')
    }),
    isSortable: true,
    isVisible: true
  }
];

const SELECT = 'select';
const AUTHOR = 'author';
const BOOK = 'book';
const EDITION = 'edition';
const RELEASE_GROUP = 'releaseGroup';
const QUALITY = 'quality';
const INDEXER_FLAGS = 'indexerFlags';

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
      invalidRowsSelected: [],
      selectModalOpen: null,
      isConfirmImportModalOpen: false,
      booksImported: [],
      interactiveImportErrorMessage: null
    };
  }

  componentDidMount() {
    const { rootFolderPath } = this.props;

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

  onValidRowChange = (id, isValid) => {
    this.setState((state, props) => {
      const diff = _.difference(state.invalidRowsSelected, _.map(props.items, 'id'));
      const currentInvalid = _.difference(state.invalidRowsSelected, diff);
      const newstate = isValid ? _.without(currentInvalid, id) : _.union(currentInvalid, [id]);
      return { invalidRowsSelected: newstate };
    });
  };

  onSortPress = (sortKey, sortDirection) => {
    this.props.onSortPress(sortKey, sortDirection);
  };

  onSelectModalSelect = ({ value }) => {
    this.setState({ selectModalOpen: value });
  };

  onSelectModalClose = () => {
    this.setState({ selectModalOpen: null });
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
      sortDirection
    } = this.props;

    const {
      allSelected,
      allUnselected,
      selectedState,
      invalidRowsSelected,
      selectModalOpen,
      booksImported,
      isConfirmImportModalOpen,
      interactiveImportErrorMessage
    } = this.state;

    const selectedIds = this.getSelectedIds();
    const selectedItem = selectedIds.length ? _.find(items, { id: selectedIds[0] }) : null;
    const importIdsByBook = _.chain(items).filter((x) => x.book).groupBy((x) => x.book.id).mapValues((x) => x.map((y) => y.id)).value();
    const editions = _.chain(items).filter((x) => x.book).keyBy((x) => x.book.id).mapValues((x) => ({ matchedEditionId: x.foreignEditionId, book: x.book })).values().value();
    const errorMessage = getErrorMessage(error, 'Unable to load files');

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
                      return (
                        <InteractiveImportRow
                          key={item.id}
                          isSelected={selectedState[item.id]}
                          isSaving={isSaving}
                          {...item}
                          allowAuthorChange={true}
                          columns={COLUMNS}
                          onSelectedChange={this.onSelectedChange}
                          onValidRowChange={this.onValidRowChange}
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
            <PageContentFooter>
              <div className={styles.inputContainer}>
                <div className={styles.label}>
                  Bulk Actions
                </div>

                <SelectInput
                  className={styles.bulkSelect}
                  name="select"
                  value={SELECT}
                  values={bulkSelectOptions}
                  isDisabled={!selectedIds.length}
                  onChange={this.onSelectModalSelect}
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
                  kind={kinds.PRIMARY}
                  isSpinning={isSaving}
                  isDisabled={!selectedIds.length || !!invalidRowsSelected.length}
                  onPress={this.onImportSelectedPress}
                >
                  {`Import ${selectedIds.length} Book${selectedIds.length !== 1 ? 's' : ''}`}
                </SpinnerButton>
              </div>
            </PageContentFooter> :
            null
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
          onModalClose={() => this.setState({ isConfirmImportModalOpen: false })}
          onConfirmImportPress={this.onConfirmImportPress}
        />
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
  onScanPress: PropTypes.func.isRequired,
  onSortPress: PropTypes.func.isRequired,
  onClearImport: PropTypes.func.isRequired,
  onImportPress: PropTypes.func.isRequired
};

export default LibraryImportScan;
