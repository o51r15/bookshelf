import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { kinds } from 'Helpers/Props';
import LibraryImportRow from './LibraryImportRow';
import LibraryImportFooter from './LibraryImportFooter';

const columns = [
  {
    name: 'folder',
    label: 'Folder',
    isSortable: false,
    isVisible: true
  },
  {
    name: 'monitor',
    label: 'Monitor',
    isSortable: false,
    isVisible: true
  },
  {
    name: 'qualityProfileId',
    label: 'Quality Profile',
    isSortable: false,
    isVisible: true
  },
  {
    name: 'metadataProfileId',
    label: 'Metadata Profile',
    isSortable: false,
    isVisible: true
  },
  {
    name: 'author',
    label: 'Author',
    isSortable: false,
    isVisible: true
  }
];

class LibraryImportTable extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      allSelected: false,
      allUnselected: true,
      selectedState: {},
      openAuthorSelectId: null
    };
  }

  //
  // Listeners

  onSelectAllChange = ({ value }) => {
    const { items, existingAuthorIds } = this.props;
    const selectedState = {};

    items.forEach((item) => {
      const isExisting = item.selectedAuthor &&
        existingAuthorIds.has(item.selectedAuthor.foreignAuthorId);

      // Only select items that have a match and aren't existing
      if (item.selectedAuthor && !isExisting) {
        selectedState[item.id] = value;
      }
    });

    this.setState({
      allSelected: value,
      allUnselected: !value,
      selectedState
    });
  };

  onSelectedChange = ({ id, value, shiftKey = false }) => {
    this.setState((state) => {
      const selectedState = { ...state.selectedState, [id]: value };
      const selectedCount = Object.values(selectedState).filter(Boolean).length;
      const totalSelectable = this.props.items.filter((item) => {
        const isExisting = item.selectedAuthor &&
          this.props.existingAuthorIds.has(item.selectedAuthor.foreignAuthorId);
        return item.selectedAuthor && !isExisting;
      }).length;

      return {
        selectedState,
        allSelected: selectedCount === totalSelectable && totalSelectable > 0,
        allUnselected: selectedCount === 0
      };
    });
  };

  onAuthorSelectOpen = (id) => {
    this.setState({ openAuthorSelectId: id });
  };

  onAuthorSelectClose = (id) => {
    this.setState((state) => {
      if (state.openAuthorSelectId === id) {
        return { openAuthorSelectId: null };
      }
      return null;
    });
  };

  onImportPress = () => {
    const selectedIds = Object.keys(this.state.selectedState)
      .filter((id) => this.state.selectedState[id]);

    this.props.onImportPress(selectedIds);
  };

  //
  // Render

  render() {
    const {
      rootFolderPath,
      rootFoldersFetching,
      rootFoldersPopulated,
      unmappedFolders,
      items,
      isLookingUpAuthor,
      isImporting,
      existingAuthorIds,
      onInputChange
    } = this.props;

    const {
      allSelected,
      allUnselected,
      selectedState,
      openAuthorSelectId
    } = this.state;

    const selectedCount = Object.values(selectedState).filter(Boolean).length;

    if (rootFoldersFetching && !rootFoldersPopulated) {
      return (
        <PageContent title="Import Library">
          <PageContentBody>
            <LoadingIndicator />
          </PageContentBody>
        </PageContent>
      );
    }

    if (!rootFolderPath) {
      return (
        <PageContent title="Import Library">
          <PageContentBody>
            <Alert kind={kinds.WARNING}>
              Root folder not found.
            </Alert>
          </PageContentBody>
        </PageContent>
      );
    }

    return (
      <PageContent title={`Import - ${rootFolderPath}`}>
        <PageContentBody>
          {
            unmappedFolders.length === 0 ?
              <Alert kind={kinds.INFO}>
                All folders in this root folder have been imported.
              </Alert> :
              null
          }

          {
            items.length > 0 &&
              <div>
                <Table
                  columns={columns}
                  selectAll={true}
                  allSelected={allSelected}
                  allUnselected={allUnselected}
                  onSelectAllChange={this.onSelectAllChange}
                >
                  <TableBody>
                    {
                      items.map((item) => {
                        const isExistingAuthor = item.selectedAuthor &&
                          existingAuthorIds.has(item.selectedAuthor.foreignAuthorId);

                        return (
                          <LibraryImportRow
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            path={item.path}
                            monitor={item.monitor}
                            qualityProfileId={item.qualityProfileId}
                            metadataProfileId={item.metadataProfileId}
                            selectedAuthor={item.selectedAuthor}
                            items={item.items}
                            isPopulated={item.isPopulated}
                            isFetching={item.isFetching}
                            isQueued={item.isQueued}
                            isExistingAuthor={isExistingAuthor}
                            isSelected={selectedState[item.id] || false}
                            isAuthorSelectOpen={openAuthorSelectId === item.id}
                            error={item.error}
                            onSelectedChange={this.onSelectedChange}
                            onInputChange={onInputChange}
                            onAuthorSelectOpen={this.onAuthorSelectOpen}
                            onAuthorSelectClose={this.onAuthorSelectClose}
                          />
                        );
                      })
                    }
                  </TableBody>
                </Table>

                <LibraryImportFooter
                  selectedCount={selectedCount}
                  isImporting={isImporting}
                  isLookingUpAuthor={isLookingUpAuthor}
                  onImportPress={this.onImportPress}
                />
              </div>
          }
        </PageContentBody>
      </PageContent>
    );
  }
}

LibraryImportTable.propTypes = {
  rootFolderPath: PropTypes.string,
  rootFoldersFetching: PropTypes.bool.isRequired,
  rootFoldersPopulated: PropTypes.bool.isRequired,
  unmappedFolders: PropTypes.arrayOf(PropTypes.object).isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  isLookingUpAuthor: PropTypes.bool.isRequired,
  isImporting: PropTypes.bool.isRequired,
  existingAuthorIds: PropTypes.object.isRequired,
  onImportPress: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired
};

export default LibraryImportTable;
