import React, { Component } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import { icons, kinds } from 'Helpers/Props';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import translate from 'Utilities/String/translate';
// import MetadatasConnector from './Metadata/MetadatasConnector';
import MetadataProviderConnector from './MetadataProvider/MetadataProviderConnector';

class MetadataSettings extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this._saveCallback = null;

    this.state = {
      isSaving: false,
      hasPendingChanges: false,
      metadataProviders: [],
      providersFetched: false,
      providersFetching: false,
      testingProvider: null,
      testResults: {}
    };
  }

  componentDidMount() {
    this.fetchProviders();
  }

  fetchProviders = () => {
    this.setState({ providersFetching: true });

    const { request } = createAjaxRequest({
      url: '/config/metadatasource',
      dataType: 'json'
    });

    request.then((data) => {
      this.setState({
        metadataProviders: data,
        providersFetched: true,
        providersFetching: false
      });
    }).fail(() => {
      this.setState({ providersFetching: false });
    });
  };

  onProviderToggle = (key) => {
    this.setState((prevState) => ({
      metadataProviders: prevState.metadataProviders.map((p) =>
        p.key === key ? { ...p, enabled: !p.enabled } : p
      )
    }));
  };

  onProviderMove = (index, direction) => {
    this.setState((prevState) => {
      const providers = [...prevState.metadataProviders];
      const newIndex = index + direction;

      if (newIndex < 0 || newIndex >= providers.length) {
        return prevState;
      }

      const temp = providers[index];
      providers[index] = providers[newIndex];
      providers[newIndex] = temp;

      return {
        metadataProviders: providers.map((p, i) => ({ ...p, priority: i }))
      };
    });
  };

  onProviderSettingChange = (key, settingKey, value) => {
    this.setState((prevState) => ({
      metadataProviders: prevState.metadataProviders.map((p) =>
        p.key === key
          ? { ...p, settings: { ...p.settings, [settingKey]: value } }
          : p
      )
    }));
  };

  onSaveProviders = () => {
    const { request } = createAjaxRequest({
      url: '/config/metadatasource',
      method: 'PUT',
      dataType: 'json',
      data: JSON.stringify(this.state.metadataProviders)
    });

    request.then((data) => {
      this.setState({ metadataProviders: data });
    });
  };

  onTestProvider = (key) => {
    this.setState({ testingProvider: key });

    const { request } = createAjaxRequest({
      url: '/config/metadatasource/test',
      method: 'POST',
      dataType: 'json',
      data: JSON.stringify({ key })
    });

    request.then((data) => {
      this.setState((prevState) => ({
        testingProvider: null,
        testResults: { ...prevState.testResults, [key]: data.success }
      }));
    }).fail(() => {
      this.setState((prevState) => ({
        testingProvider: null,
        testResults: { ...prevState.testResults, [key]: false }
      }));
    });
  };

  //
  // Listeners

  onChildMounted = (saveCallback) => {
    this._saveCallback = saveCallback;
  };

  onChildStateChange = (payload) => {
    this.setState(payload);
  };

  onSavePress = () => {
    if (this._saveCallback) {
      this._saveCallback();
    }
  };

  //
  // Render

  renderProviderRow = (provider, index) => {
    const { testingProvider, testResults, metadataProviders } = this.state;
    const isTesting = testingProvider === provider.key;
    const testResult = testResults[provider.key];

    return (
      <div
        key={provider.key}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          marginBottom: '5px',
          backgroundColor: provider.enabled ? 'var(--tableBackgroundColor)' : 'var(--disabledBackgroundColor)',
          borderRadius: '4px',
          border: '1px solid var(--borderColor)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '10px' }}>
          <Button
            kind={kinds.DEFAULT}
            size="small"
            isDisabled={index === 0}
            onPress={() => this.onProviderMove(index, -1)}
          >
            <Icon name={icons.ARROW_UP} />
          </Button>

          <Button
            kind={kinds.DEFAULT}
            size="small"
            isDisabled={index === metadataProviders.length - 1}
            onPress={() => this.onProviderMove(index, 1)}
          >
            <Icon name={icons.ARROW_DOWN} />
          </Button>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <strong style={{ marginRight: '10px' }}>
              {provider.displayName}
            </strong>

            {provider.requiresAuth &&
              <span style={{
                fontSize: '11px',
                padding: '2px 6px',
                backgroundColor: 'var(--warningColor)',
                borderRadius: '3px',
                color: 'white'
              }}>
                Requires API Key
              </span>
            }

            {testResult === true &&
              <Icon
                name={icons.CHECK}
                kind={kinds.SUCCESS}
                style={{ marginLeft: '10px' }}
              />
            }

            {testResult === false &&
              <Icon
                name={icons.DANGER}
                kind={kinds.DANGER}
                style={{ marginLeft: '10px' }}
              />
            }
          </div>

          {provider.key === 'hardcover' && provider.enabled &&
            <div style={{ marginTop: '5px' }}>
              <label style={{ fontSize: '12px', marginRight: '5px' }}>
                API Token:
              </label>
              <input
                type="text"
                value={(provider.settings && provider.settings.apiToken) || ''}
                onChange={(e) => this.onProviderSettingChange(provider.key, 'apiToken', e.target.value)}
                placeholder="Enter your Hardcover API token"
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--borderColor)',
                  borderRadius: '3px',
                  width: '300px',
                  backgroundColor: 'var(--inputBackgroundColor)',
                  color: 'var(--textColor)'
                }}
              />
            </div>
          }

          {provider.key === 'rreadingglasses' && provider.enabled &&
            <div style={{ marginTop: '5px' }}>
              <label style={{ fontSize: '12px', marginRight: '5px' }}>
                Base URL:
              </label>
              <input
                type="text"
                value={(provider.settings && provider.settings.baseUrl) || ''}
                onChange={(e) => this.onProviderSettingChange(provider.key, 'baseUrl', e.target.value)}
                placeholder="https://api.bookinfo.pro (default)"
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--borderColor)',
                  borderRadius: '3px',
                  width: '300px',
                  backgroundColor: 'var(--inputBackgroundColor)',
                  color: 'var(--textColor)'
                }}
              />
            </div>
          }
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            kind={kinds.DEFAULT}
            size="small"
            isDisabled={isTesting}
            onPress={() => this.onTestProvider(provider.key)}
          >
            {isTesting ? 'Testing...' : 'Test'}
          </Button>

          <Button
            kind={provider.enabled ? kinds.SUCCESS : kinds.DANGER}
            size="small"
            onPress={() => this.onProviderToggle(provider.key)}
          >
            {provider.enabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </div>
    );
  };

  render() {
    const {
      isSaving,
      hasPendingChanges,
      metadataProviders,
      providersFetched,
      providersFetching
    } = this.state;

    return (
      <PageContent title="Metadata Sources">
        <SettingsToolbarConnector
          isSaving={isSaving}
          hasPendingChanges={hasPendingChanges}
          onSavePress={this.onSavePress}
        />

        <PageContentBody>
          <FieldSet legend="Metadata Search Providers">
            <Alert kind={kinds.INFO}>
              Configure which metadata sources are used when searching for books and authors.
              Providers are tried in order from top to bottom.
              Google Books and Open Library work out of the box with no configuration.
            </Alert>

            {providersFetching &&
              <LoadingIndicator />
            }

            {providersFetched &&
              <div style={{ marginTop: '15px' }}>
                {metadataProviders.map((provider, index) =>
                  this.renderProviderRow(provider, index)
                )}

                <div style={{ marginTop: '15px' }}>
                  <Button
                    kind={kinds.PRIMARY}
                    onPress={this.onSaveProviders}
                  >
                    Save Provider Settings
                  </Button>
                </div>
              </div>
            }
          </FieldSet>

          <MetadataProviderConnector
            onChildMounted={this.onChildMounted}
            onChildStateChange={this.onChildStateChange}
          />
          {/* <MetadatasConnector /> */}
        </PageContentBody>
      </PageContent>
    );
  }
}

export default MetadataSettings;
