import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import { icons, inputTypes, kinds } from 'Helpers/Props';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import translate from 'Utilities/String/translate';

const logLevelOptions = [
  { key: 'info', value: 'Info' },
  { key: 'debug', value: 'Debug' },
  { key: 'trace', value: 'Trace' }
];

class DevelopmentSettings extends Component {

  constructor(props) {
    super(props);

    this.state = {
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

    fetch('/api/v1/config/metadatasource')
      .then((resp) => resp.json())
      .then((data) => {
        this.setState({
          metadataProviders: data,
          providersFetched: true,
          providersFetching: false
        });
      })
      .catch(() => {
        this.setState({ providersFetching: false });
      });
  };

  onProviderToggle = (key) => {
    this.setState((prevState) => {
      const providers = prevState.metadataProviders.map((p) => {
        if (p.key === key) {
          return { ...p, enabled: !p.enabled };
        }

        return p;
      });

      return { metadataProviders: providers };
    });
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

      // Update priorities to match new order
      return {
        metadataProviders: providers.map((p, i) => ({ ...p, priority: i }))
      };
    });
  };

  onProviderSettingChange = (key, settingKey, value) => {
    this.setState((prevState) => {
      const providers = prevState.metadataProviders.map((p) => {
        if (p.key === key) {
          return {
            ...p,
            settings: { ...p.settings, [settingKey]: value }
          };
        }

        return p;
      });

      return { metadataProviders: providers };
    });
  };

  onSaveProviders = () => {
    fetch('/api/v1/config/metadatasource', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.state.metadataProviders)
    })
      .then((resp) => resp.json())
      .then((data) => {
        this.setState({ metadataProviders: data });
      });
  };

  onTestProvider = (key) => {
    this.setState({ testingProvider: key });

    fetch('/api/v1/config/metadatasource/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })
      .then((resp) => resp.json())
      .then((data) => {
        this.setState((prevState) => ({
          testingProvider: null,
          testResults: { ...prevState.testResults, [key]: data.success }
        }));
      })
      .catch(() => {
        this.setState((prevState) => ({
          testingProvider: null,
          testResults: { ...prevState.testResults, [key]: false }
        }));
      });
  };

  //
  // Render

  renderProviderRow = (provider, index) => {
    const { testingProvider, testResults } = this.state;
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
            isDisabled={index === this.state.metadataProviders.length - 1}
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
      isFetching,
      error,
      settings,
      hasSettings,
      onInputChange,
      onSavePress,
      ...otherProps
    } = this.props;

    const {
      metadataProviders,
      providersFetched,
      providersFetching
    } = this.state;

    return (
      <PageContent title="Metadata Sources">
        <SettingsToolbarConnector
          {...otherProps}
          onSavePress={onSavePress}
        />

        <PageContentBody>
          <FieldSet legend="Metadata Providers">
            <Alert kind={kinds.INFO}>
              Configure which metadata sources are used when searching for books and authors.
              Providers are tried in order from top to bottom. Drag to reorder priority.
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

          {
            isFetching &&
              <LoadingIndicator />
          }

          {
            hasSettings && !isFetching && !error &&
              <Form
                id="developmentSettings"
                {...otherProps}
              >
                <FieldSet legend={translate('MetadataProviderSource')}>
                  <FormGroup>
                    <FormLabel>
                      {translate('MetadataSource')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="metadataSource"
                      helpText="Legacy rreading-glasses base URL override. Leave blank to use provider settings above."
                      onChange={onInputChange}
                      {...settings.metadataSource}
                    />
                  </FormGroup>
                </FieldSet>

                <FieldSet legend={translate('Logging')}>
                  <FormGroup>
                    <FormLabel>
                      {translate('LogRotation')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.NUMBER}
                      name="logRotate"
                      helpText={translate('LogRotateHelpText')}
                      onChange={onInputChange}
                      {...settings.logRotate}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>
                      {translate('ConsoleLogLevel')}
                    </FormLabel>
                    <FormInputGroup
                      type={inputTypes.SELECT}
                      name="consoleLogLevel"
                      values={logLevelOptions}
                      onChange={onInputChange}
                      {...settings.consoleLogLevel}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>
                      {translate('LogSQL')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.CHECK}
                      name="logSql"
                      helpText={translate('LogSqlHelpText')}
                      onChange={onInputChange}
                      {...settings.logSql}
                    />
                  </FormGroup>
                </FieldSet>
              </Form>
          }
        </PageContentBody>
      </PageContent>
    );
  }

}

DevelopmentSettings.propTypes = {
  isFetching: PropTypes.bool.isRequired,
  error: PropTypes.object,
  settings: PropTypes.object.isRequired,
  hasSettings: PropTypes.bool.isRequired,
  onSavePress: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired
};

export default DevelopmentSettings;
