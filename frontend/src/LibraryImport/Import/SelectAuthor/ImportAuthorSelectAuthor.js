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
      openAbove: false,
      searchTerm: props.id || ''
    };

    this._searchTimeout = null;
    this._containerRef = React.createRef();
    this._searchRowRef = React.createRef();
  }

  componentDidUpdate(prevProps) {
    // Recalculate openAbove when opening
    if (this.props.isOpen && !prevProps.isOpen && this._containerRef.current) {
      const rect = this._containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceBelow < 280) {
        this.setState({ openAbove: true });
      } else {
        this.setState({ openAbove: false });
      }
    }
  }

  componentWillUnmount() {
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }
  }

  //
  // Listeners

  onToggle = () => {
    const willOpen = !this.props.isOpen;

    if (willOpen) {
      let openAbove = false;

      if (this._containerRef.current) {
        const rect = this._containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        openAbove = spaceBelow < 280;
      }

      this.setState({
        openAbove,
        searchTerm: this.props.id || ''
      });

      if (this.props.onOpen) {
        this.props.onOpen();
      }
    } else {
      if (this.props.onClose) {
        this.props.onClose();
      }
    }
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

    if (this.props.onClose) {
      this.props.onClose();
    }
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
      isOpen,
      error
    } = this.props;

    const {
      openAbove,
      searchTerm
    } = this.state;

    // Closed state rendering
    if (!isOpen) {
      let closedInner;

      if (isFetching || isQueued) {
        closedInner = (
          <React.Fragment>
            <SpinnerIcon
              className={styles.spinner}
              name={icons.SPINNER}
              isSpinning={true}
            />
            <span className={styles.label}>Searching...</span>
          </React.Fragment>
        );
      } else if (error) {
        closedInner = (
          <React.Fragment>
            <Icon
              className={styles.warningIcon}
              name={icons.WARNING}
              kind={kinds.WARNING}
            />
            <span className={styles.label}>Search failed, click to try again</span>
          </React.Fragment>
        );
      } else if (!selectedAuthor && isPopulated) {
        closedInner = (
          <React.Fragment>
            <Icon
              className={styles.warningIcon}
              name={icons.WARNING}
              kind={kinds.WARNING}
            />
            <span className={styles.label}>No match found!</span>
          </React.Fragment>
        );
      } else if (selectedAuthor && isExistingAuthor) {
        closedInner = (
          <React.Fragment>
            <span className={styles.label}>{selectedAuthor.authorName}</span>
            <Label kind={kinds.WARNING}>Existing</Label>
          </React.Fragment>
        );
      } else if (selectedAuthor) {
        closedInner = (
          <span className={styles.label}>{selectedAuthor.authorName}</span>
        );
      } else {
        closedInner = (
          <span className={styles.label}>&nbsp;</span>
        );
      }

      return (
        <div ref={this._containerRef} className={styles.closed} onClick={this.onToggle}>
          {closedInner}
        </div>
      );
    }

    // Open state rendering — search input + results list
    const resultsClass = openAbove ? styles.resultsAbove : styles.results;

    // Compute fixed position for dropdown
    const dropdownStyle = {};

    if (this._searchRowRef.current) {
      const rect = this._searchRowRef.current.getBoundingClientRect();

      dropdownStyle.left = rect.left;
      dropdownStyle.width = rect.width;

      if (openAbove) {
        dropdownStyle.bottom = window.innerHeight - rect.top;
      } else {
        dropdownStyle.top = rect.bottom;
      }
    }

    return (
      <div className={styles.container} ref={this._containerRef}>
        <div className={styles.searchRow} ref={this._searchRowRef}>
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

        <div className={resultsClass} style={dropdownStyle}>
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
  isOpen: PropTypes.bool.isRequired,
  error: PropTypes.object,
  onInputChange: PropTypes.func.isRequired,
  onOpen: PropTypes.func,
  onClose: PropTypes.func
};

export default ImportAuthorSelectAuthor;
