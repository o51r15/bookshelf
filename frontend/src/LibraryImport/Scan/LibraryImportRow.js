import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MetadataProfileSelectInputConnector from 'Components/Form/MetadataProfileSelectInputConnector';
import QualityProfileSelectInputConnector from 'Components/Form/QualityProfileSelectInputConnector';
import SelectInput from 'Components/Form/SelectInput';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableRowCellButton from 'Components/Table/Cells/TableRowCellButton';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import TableRow from 'Components/Table/TableRow';
import SelectAuthorModal from 'InteractiveImport/Author/SelectAuthorModal';
import SelectBookModal from 'InteractiveImport/Book/SelectBookModal';
import monitorNewItemsOptions from 'Utilities/Author/monitorNewItemsOptions';
import translate from 'Utilities/String/translate';
import styles from './LibraryImportRow.css';

class LibraryImportRow extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      isSelectAuthorModalOpen: false,
      isSelectBookModalOpen: false
    };
  }

  //
  // Control

  selectRowAfterChange = (value) => {
    const {
      id,
      isSelected
    } = this.props;

    if (!isSelected && value === true) {
      this.props.onSelectedChange({ id, value });
    }
  };

  //
  // Listeners

  onSelectAuthorPress = () => {
    this.setState({ isSelectAuthorModalOpen: true });
  };

  onSelectBookPress = () => {
    this.setState({ isSelectBookModalOpen: true });
  };

  onSelectAuthorModalClose = (changed) => {
    this.setState({ isSelectAuthorModalOpen: false });
    this.selectRowAfterChange(changed);
  };

  onSelectBookModalClose = (changed) => {
    this.setState({ isSelectBookModalOpen: false });
    this.selectRowAfterChange(changed);
  };

  onQualityProfileChange = ({ value }) => {
    this.props.onRowOptionsChange(this.props.id, { qualityProfileId: value });
  };

  onMetadataProfileChange = ({ value }) => {
    this.props.onRowOptionsChange(this.props.id, { metadataProfileId: value });
  };

  onMonitorChange = ({ value }) => {
    this.props.onRowOptionsChange(this.props.id, { monitor: value });
  };

  //
  // Render

  render() {
    const {
      id,
      allowAuthorChange,
      path,
      relativePath,
      author,
      book,
      qualityProfileId,
      metadataProfileId,
      monitor,
      isSelected,
      onSelectedChange
    } = this.props;

    const {
      isSelectAuthorModalOpen,
      isSelectBookModalOpen
    } = this.state;

    const authorName = author ? author.authorName : '';
    let bookTitle = '';

    if (book) {
      bookTitle = book.disambiguation ? `${book.title} (${book.disambiguation})` : book.title;
    }

    const authorBookLabel = author && book ?
      `${authorName} - ${bookTitle}` :
      author ?
        authorName :
        translate('Unknown');

    return (
      <TableRow>
        <TableSelectCell
          id={id}
          isSelected={isSelected}
          onSelectedChange={onSelectedChange}
        />

        <TableRowCell
          className={styles.path}
          title={path}
        >
          {relativePath || path}
        </TableRowCell>

        <TableRowCell className={styles.qualityProfile}>
          <QualityProfileSelectInputConnector
            name="qualityProfileId"
            value={qualityProfileId}
            onChange={this.onQualityProfileChange}
          />
        </TableRowCell>

        <TableRowCell className={styles.metadataProfile}>
          <MetadataProfileSelectInputConnector
            name="metadataProfileId"
            value={metadataProfileId}
            onChange={this.onMetadataProfileChange}
          />
        </TableRowCell>

        <TableRowCell className={styles.monitor}>
          <SelectInput
            name="monitor"
            value={monitor}
            values={monitorNewItemsOptions}
            onChange={this.onMonitorChange}
          />
        </TableRowCell>

        <TableRowCellButton
          className={styles.authorBook}
          isDisabled={!allowAuthorChange}
          title={allowAuthorChange ? translate('AllowAuthorChangeClickToChangeAuthor') : undefined}
          onPress={this.onSelectAuthorPress}
        >
          {authorBookLabel}
        </TableRowCellButton>

        <SelectAuthorModal
          isOpen={isSelectAuthorModalOpen}
          ids={[id]}
          onModalClose={this.onSelectAuthorModalClose}
        />

        <SelectBookModal
          isOpen={isSelectBookModalOpen}
          ids={[id]}
          authorId={author && author.id}
          onModalClose={this.onSelectBookModalClose}
        />
      </TableRow>
    );
  }
}

LibraryImportRow.propTypes = {
  id: PropTypes.number.isRequired,
  allowAuthorChange: PropTypes.bool.isRequired,
  path: PropTypes.string.isRequired,
  relativePath: PropTypes.string,
  author: PropTypes.object,
  book: PropTypes.object,
  qualityProfileId: PropTypes.number,
  metadataProfileId: PropTypes.number,
  monitor: PropTypes.string,
  isSelected: PropTypes.bool,
  onSelectedChange: PropTypes.func.isRequired,
  onRowOptionsChange: PropTypes.func.isRequired
};

LibraryImportRow.defaultProps = {
  allowAuthorChange: true
};

export default LibraryImportRow;
