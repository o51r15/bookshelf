using System.Collections.Generic;

namespace NzbDrone.Core.MetadataSource.Providers
{
    /// <summary>
    /// Persisted configuration for a single metadata provider.
    /// Stored as part of the app's config and exposed via the settings UI.
    /// </summary>
    public class MetadataProviderConfig
    {
        /// <summary>
        /// Provider key matching IMetadataProvider.Key.
        /// </summary>
        public string Key { get; set; }

        /// <summary>
        /// Whether this provider is enabled.
        /// </summary>
        public bool Enabled { get; set; } = true;

        /// <summary>
        /// Priority order (lower = tried first). User-reorderable in settings.
        /// </summary>
        public int Priority { get; set; }

        /// <summary>
        /// Provider-specific settings (API keys, base URLs, etc.).
        /// </summary>
        public Dictionary<string, string> Settings { get; set; } = new();
    }

    /// <summary>
    /// Container for the full provider configuration list.
    /// Serialized to/from the config database.
    /// </summary>
    public class MetadataProviderConfigList
    {
        public List<MetadataProviderConfig> Providers { get; set; } = new();
    }
}
