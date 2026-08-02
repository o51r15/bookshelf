import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Icon from 'Components/Icon';
import SpinnerIcon from 'Components/SpinnerIcon';
import Label from 'Components/Label';
import TextInput from 'Components/Form/TextInput';
import { icons, kinds } from 'Helpers/Props';
import { queueLookupAuthor, setImportAuthorValue } from 'Store/Actions/importAuthorActions';
import styles from './ImportAuthorSelectAuthor.css';

class ImportAuthorSelectAuthor extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      isOpen: false,
      searchTerm: props.id || ''
    };

    this._searchTimeout = null;
  }

  componentWillUnmount() {
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }
  }

  //
  // Listeners

  onToggle = () => {
    this.setState((state) => ({
      isOpen: !state.isOpen,
      searchTerm: state.isOpen ? state.searchTerm : (this.props.id || '')
    }));
  };

  onSearchChange = ({ value }) => {
    this.setState({ searchTerm: value });

    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }

    this._searchTimeout = setTimeout(() => {
      this.props.onInputChange(this.props.id, '_lookupTerm', value);
    }, 200);
  };

  onAuthorSelect = (author) => {
    this.props.onInputChange(this.props.id, 'selectedAuthor', author);
    this.setState({ isOpen: false });
  };

  //
  // Render

  render() {
    const {
      selectedAuthor,
      items,
      isPopulated,
      isFetching,
      isQueued,
      isExistingAuthor,
      error
    } = this.props;

    const {
      isOpen,
      searchTerm
    } = this.state;

    // Closed state rendering
    if (!isOpen) {
      let closedContent;

      if (isFetching || isQueued) {
        closedContent = (
          <div className={styles.closed} onClick={this.onToggle}>
            <SpinnerIcon
              className={styles.spinner}
              name={icons.SPINNER}
              isSpinning={true}
            />
            <span className={styles.label}>Searching...</span>
          </div>
        );
      } else if (error) {
        closedContent = (
          <div className={styles.closed} onClick={this.onToggle}>
            <Icon
              className={styles.warningIcon}
              name={icons.WARNING}
              kind={kinds.WARNING}
            />
            <span className={styles.label}>Search failed, click to try again</span>
          </div>
        );
      } else if (!selectedAuthor && isPopulated) {
        closedContent = (
          <div className={styles.closed} onClick={this.onToggle}>
            <Icon
              className={styles.warningIcon}
              name={icons.WARNING}
              kind={kinds.WARNING}
            />
            <span className={styles.label}>No match found!</span>
          </div>
        );
      } else if (selectedAuthor && isExistingAuthor) {
        closedContent = (
          <div className={styles.closed} onClick={this.onToggle}>
            <span className={styles.label}>{selectedAuthor.authorName}</span>
            <Label kind={kinds.WARNING}>Existing</Label>
          </div>
        );
      } else if (selectedAuthor) {
        closedContent = (
          <div className={styles.closed} onClick={this.onToggle}>
            <span className={styles.label}>{selectedAuthor.authorName}</span>
          </div>
        );
      } else {
        closedContent = (
          <div className={styles.closed} onClick={this.onToggle}>
            <span className={styles.label}>&nbsp;</span>
          </div>
        );
      }

      return closedContent;
    }

    // Open state rendering — search input + results list
    return (
      <div className={styles.container}>
        <div className={styles.searchRow}>
          <TextInput
            className={styles.searchInput}
            name="authorSearch"
            value={searchTerm}
            onChange={this.onSearchChange}
            autoFocus={true}
          />
          <button
            className={styles.closeButton}
            onClick={this.onToggle}
          >
            <Icon name={icons.REMOVE} />
          </button>
        </div>

        <div className={styles.results}>
          {
            isFetching ?
              <div className={styles.resultItem}>
                <SpinnerIcon
                  name={icons.SPINNER}
                  isSpinning={true}
                />
                <span> Searching...</span>
              </div> :
              null
          }

          {
            !isFetching && items && items.length > 0 ?
              items.map((author) => {
                const isSelected = selectedAuthor &&
                  selectedAuthor.foreignAuthorId === author.foreignAuthorId;

                return (
                  <div
                    key={author.foreignAuthorId}
                    className={isSelected ? styles.resultItemSelected : styles.resultItem}
                    onClick={() => this.onAuthorSelect(author)}
                  >
                    <span className={styles.authorName}>{author.authorName}</span>
                    {
                      author.overview ?
                        <span className={styles.overview}>
                          {author.overview.substring(0, 100)}
                          {author.overview.length > 100 ? '...' : ''}
                        </span> :
                        null
                    }
                  </div>
                );
              }) :
              null
          }

          {
            !isFetching && isPopulated && (!items || items.length === 0) ?
              <div className={styles.resultItem}>
                No results found
              </div> :
              null
          }
        </div>
      </div>
    );
  }
}

ImportAuthorSelectAuthor.propTypes = {
  id: PropTypes.string.isRequired,
  selectedAuthor: PropTypes.object,
  items: PropTypes.arrayOf(PropTypes.object),
  isPopulated: PropTypes.bool.isRequired,
  isFetching: PropTypes.bool.isRequired,
  isQueued: PropTypes.bool.isRequired,
  isExistingAuthor: PropTypes.bool,
  error: PropTypes.object,
  onInputChange: PropTypes.func.isRequired
};

export default ImportAuthorSelectAuthor;
