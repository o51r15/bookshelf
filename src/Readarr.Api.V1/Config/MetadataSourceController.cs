using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.MetadataSource.Providers;
using Readarr.Http;

namespace Readarr.Api.V1.Config
{
    [V1ApiController("config/metadatasource")]
    public class MetadataSourceController : Controller
    {
        private readonly IConfigService _configService;
        private readonly IEnumerable<IMetadataProvider> _providers;

        public MetadataSourceController(IConfigService configService,
            IEnumerable<IMetadataProvider> providers)
        {
            _configService = configService;
            _providers = providers;
        }

        [HttpGet]
        public List<MetadataSourceResource> GetAll()
        {
            var configs = _configService.GetMetadataProviderConfigs();
            var available = _providers.ToList();

            return configs.Select(c =>
            {
                var provider = available.FirstOrDefault(p =>
                    p.Key.Equals(c.Key, global::System.StringComparison.OrdinalIgnoreCase));

                return new MetadataSourceResource
                {
                    Key = c.Key,
                    DisplayName = provider?.DisplayName ?? c.Key,
                    Enabled = c.Enabled,
                    Priority = c.Priority,
                    RequiresAuth = provider?.RequiresAuth ?? false,
                    Settings = c.Settings ?? new Dictionary<string, string>()
                };
            }).OrderBy(r => r.Priority).ToList();
        }

        [HttpPut]
        public IActionResult SaveAll([FromBody] List<MetadataSourceResource> resources)
        {
            var configs = resources.Select(r => new MetadataProviderConfig
            {
                Key = r.Key,
                Enabled = r.Enabled,
                Priority = r.Priority,
                Settings = r.Settings
            }).ToList();

            _configService.SaveMetadataProviderConfigs(configs);
            return Ok(GetAll());
        }

        [HttpPost("test")]
        public IActionResult TestProvider([FromBody] MetadataSourceTestRequest request)
        {
            var provider = _providers.FirstOrDefault(p =>
                p.Key.Equals(request.Key, global::System.StringComparison.OrdinalIgnoreCase));

            if (provider == null)
            {
                return NotFound(new { message = $"Provider '{request.Key}' not found" });
            }

            var success = provider.TestConnection();
            return Ok(new { success, key = request.Key });
        }
    }

    public class MetadataSourceResource
    {
        public string Key { get; set; }
        public string DisplayName { get; set; }
        public bool Enabled { get; set; }
        public int Priority { get; set; }
        public bool RequiresAuth { get; set; }
        public Dictionary<string, string> Settings { get; set; }
    }

    public class MetadataSourceTestRequest
    {
        public string Key { get; set; }
    }
}
