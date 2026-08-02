import PropTypes from 'prop-types';
import React from 'react';
import SpinnerButton from 'Components/Link/SpinnerButton';
import { kinds } from 'Helpers/Props';
import styles from './LibraryImportFooter.css';

function LibraryImportFooter(props) {
  const {
    selectedCount,
    isImporting,
    isLookingUpAuthor,
    onImportPress
  } = props;

  const importLabel = selectedCount === 0 ?
    'Import' :
    `Import ${selectedCount} Author${selectedCount !== 1 ? 's' : ''}`;

  return (
    <div className={styles.footer}>
      <div className={styles.buttons}>
        {
          isLookingUpAuthor ?
            <span className={styles.lookingUp}>Looking up authors...</span> :
            null
        }

        <SpinnerButton
          className={styles.importButton}
          kind={kinds.SUCCESS}
          isSpinning={isImporting}
          isDisabled={selectedCount === 0 || isImporting}
          onPress={onImportPress}
        >
          {importLabel}
        </SpinnerButton>
      </div>
    </div>
  );
}

LibraryImportFooter.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  isImporting: PropTypes.bool.isRequired,
  isLookingUpAuthor: PropTypes.bool.isRequired,
  onImportPress: PropTypes.func.isRequired
};

export default LibraryImportFooter;
