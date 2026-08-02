import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Icon from 'Components/Icon';
import MetadataProfileSelectInputConnector from 'Components/Form/MetadataProfileSelectInputConnector';
import QualityProfileSelectInputConnector from 'Components/Form/QualityProfileSelectInputConnector';
import SelectInput from 'Components/Form/SelectInput';
import SpinnerIcon from 'Components/SpinnerIcon';
import Label from 'Components/Label';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableRowCellButton from 'Components/Table/Cells/TableRowCellButton';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import TableRow from 'Components/Table/TableRow';
import { icons, kinds } from 'Helpers/Props';
import monitorOptions from 'Utilities/Author/monitorOptions';
import ImportAuthorSelectAuthor from './SelectAuthor/ImportAuthorSelectAuthor';
import styles from './LibraryImportRow.css';

class LibraryImportRow extends Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      isAuthorSelectOpen: false
    };
  }

  //
  // Listeners

  onAuthorSelectOpen = () => {
    this.setState({ isAuthorSelectOpen: true });
  };

  onAuthorSelectClose = () => {
    this.setState({ isAuthorSelectOpen: false });
  };

  onQualityProfileChange = ({ value }) => {
    this.props.onInputChange(this.props.id, 'qualityProfileId', value);
  };

  onMetadataProfileChange = ({ value }) => {
    this.props.onInputChange(this.props.id, 'metadataProfileId', value);
  };

  onMonitorChange = ({ value }) => {
    this.props.onInputChange(this.props.id, 'monitor', value);
  };

  //
  // Render

  render() {
    const {
      id,
      name,
      monitor,
      qualityProfileId,
      metadataProfileId,
      selectedAuthor,
      items,
      isPopulated,
      isFetching,
      isQueued,
      isExistingAuthor,
      isSelected,
      error,
      onSelectedChange,
      onInputChange
    } = this.props;

    const isSelectable = selectedAuthor && !isExistingAuthor;
    const { isAuthorSelectOpen } = this.state;

    return (
      <TableRow>
        <TableSelectCell
          id={id}
          isSelected={isSelected}
          isDisabled={!isSelectable}
          onSelectedChange={onSelectedChange}
        />

        <TableRowCell className={styles.folder}>
          {name}
        </TableRowCell>

        <TableRowCell className={styles.monitor}>
          <SelectInput
            name="monitor"
            value={monitor}
            values={monitorOptions}
            onChange={this.onMonitorChange}
          />
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

        <TableRowCell className={isAuthorSelectOpen ? styles.authorOpen : styles.author}>
          <ImportAuthorSelectAuthor
            id={id}
            selectedAuthor={selectedAuthor}
            items={items}
            isPopulated={isPopulated}
            isFetching={isFetching}
            isQueued={isQueued}
            isExistingAuthor={isExistingAuthor}
            error={error}
            onInputChange={onInputChange}
            onOpen={this.onAuthorSelectOpen}
            onClose={this.onAuthorSelectClose}
          />
        </TableRowCell>
      </TableRow>
    );
  }
}

LibraryImportRow.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  monitor: PropTypes.string.isRequired,
  qualityProfileId: PropTypes.number.isRequired,
  metadataProfileId: PropTypes.number.isRequired,
  selectedAuthor: PropTypes.object,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  isPopulated: PropTypes.bool.isRequired,
  isFetching: PropTypes.bool.isRequired,
  isQueued: PropTypes.bool.isRequired,
  isExistingAuthor: PropTypes.bool,
  isSelected: PropTypes.bool.isRequired,
  error: PropTypes.object,
  onSelectedChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired
};

LibraryImportRow.defaultProps = {
  monitor: 'all',
  qualityProfileId: 0,
  metadataProfileId: 0,
  items: [],
  isPopulated: false,
  isFetching: false,
  isQueued: false,
  isSelected: false
};

export default LibraryImportRow;
