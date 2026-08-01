using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using Newtonsoft.Json.Linq;
using NLog;
using NzbDrone.Common.Http;

namespace NzbDrone.Core.MetadataSource.Providers
{
    /// <summary>
    /// A metadata provider that calls an external URL following the
    /// Audiobookshelf custom provider specification.
    /// GET /search?query=...&amp;author=... with optional AUTHORIZATION header.
    /// Response: { "matches": [ BookMetadata, ... ] }
    /// </summary>
    public class CustomMetadataProvider : IMetadataProvider
    {
        private readonly IHttpClient _httpClient;
        private readonly Logger _logger;
        private readonly string _key;
        private readonly string _displayName;
        private readonly string _baseUrl;
        private readonly string _authToken;

        public string Key => _key;
        public string DisplayName => _displayName;
        public bool RequiresAuth => false;

        public CustomMetadataProvider(
            IHttpClient httpClient,
            Logger logger,
            string key,
            string displayName,
            string baseUrl,
            string authToken)
        {
            _httpClient = httpClient;
            _logger = logger;
            _key = key;
            _displayName = displayName;
            _baseUrl = baseUrl?.TrimEnd('/') ?? string.Empty;
            _authToken = authToken;
        }

        public List<MetadataSearchResult> SearchBooks(string query)
        {
            return Search(query, null);
        }

        public List<MetadataSearchResult> SearchAuthors(string query)
        {
            return Search(null, query);
        }

        public MetadataSearchResult SearchByIsbn(string isbn)
        {
            var results = Search(isbn, null);
            return results.FirstOrDefault(r =>
                string.Equals(r.Isbn, isbn, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(r.Isbn13, isbn, StringComparison.OrdinalIgnoreCase));
        }

        public MetadataSearchResult SearchByAsin(string asin)
        {
            var results = Search(asin, null);
            return results.FirstOrDefault(r =>
                string.Equals(r.Asin, asin, StringComparison.OrdinalIgnoreCase));
        }

        public MetadataAuthorResult GetAuthorInfo(string foreignId)
        {
            // ABS custom provider spec only supports search, not direct lookups
            return null;
        }

        public MetadataBookResult GetBookInfo(string foreignId)
        {
            // ABS custom provider spec only supports search, not direct lookups
            return null;
        }

        public bool TestConnection()
        {
            try
            {
                var results = Search("test", null);
                return true;
            }
            catch (Exception ex)
            {
                _logger.Warn(ex, "Custom provider test failed for {0} at {1}", _displayName, _baseUrl);
                return false;
            }
        }

        private List<MetadataSearchResult> Search(string query, string author)
        {
            var results = new List<MetadataSearchResult>();

            if (string.IsNullOrWhiteSpace(_baseUrl))
            {
                _logger.Warn("Custom provider {0} has no base URL configured", _displayName);
                return results;
            }

            var url = $"{_baseUrl}/search?";
            var parts = new List<string>();

            if (!string.IsNullOrWhiteSpace(query))
            {
                parts.Add($"query={Uri.EscapeDataString(query)}");
            }

            if (!string.IsNullOrWhiteSpace(author))
            {
                parts.Add($"author={Uri.EscapeDataString(author)}");
            }

            url += string.Join("&", parts);

            var request = new HttpRequest(url)
            {
                AllowAutoRedirect = true,
                RequestTimeout = TimeSpan.FromSeconds(15)
            };

            if (!string.IsNullOrWhiteSpace(_authToken))
            {
                request.Headers.Add("Authorization", _authToken);
            }

            _logger.Debug("Custom provider {0}: GET {1}", _displayName, url);

            var response = _httpClient.Get(request);

            if (response.StatusCode != HttpStatusCode.OK)
            {
                _logger.Warn("Custom provider {0} returned {1}", _displayName, response.StatusCode);
                return results;
            }

            var json = JObject.Parse(response.Content);
            var matches = json["matches"] as JArray;

            if (matches == null)
            {
                _logger.Debug("Custom provider {0}: no 'matches' array in response", _displayName);
                return results;
            }

            foreach (var match in matches)
            {
                try
                {
                    var result = MapToSearchResult(match);
                    if (result != null)
                    {
                        results.Add(result);
                    }
                }
                catch (Exception ex)
                {
                    _logger.Debug(ex, "Custom provider {0}: failed to parse match", _displayName);
                }
            }

            _logger.Debug("Custom provider {0}: {1} results", _displayName, results.Count);
            return results;
        }

        private MetadataSearchResult MapToSearchResult(JToken match)
        {
            var title = match.Value<string>("title");
            if (string.IsNullOrWhiteSpace(title))
            {
                return null;
            }

            var result = new MetadataSearchResult
            {
                ForeignId = $"custom:{_key}:{title}",
                ProviderKey = _key,
                Title = title,
                Subtitle = match.Value<string>("subtitle"),
                Description = match.Value<string>("description"),
                CoverUrl = match.Value<string>("cover"),
                Isbn = match.Value<string>("isbn"),
                Asin = match.Value<string>("asin"),
                Publisher = match.Value<string>("publisher"),
                Language = match.Value<string>("language"),
                PublishedYear = match.Value<int?>("publishedYear")
            };

            // Author can be a string
            var authorStr = match.Value<string>("author");
            if (!string.IsNullOrWhiteSpace(authorStr))
            {
                result.Authors.Add(authorStr);
            }

            // Genres/tags
            var genres = match["genres"] as JArray;
            if (genres != null)
            {
                result.Genres = genres.Select(g => g.ToString()).ToList();
            }

            var tags = match["tags"] as JArray;
            if (tags != null)
            {
                foreach (var tag in tags)
                {
                    if (!result.Genres.Contains(tag.ToString()))
                    {
                        result.Genres.Add(tag.ToString());
                    }
                }
            }

            // Series info as external ID
            var series = match["series"] as JArray;
            if (series != null && series.Count > 0)
            {
                var firstSeries = series[0];
                var seriesName = firstSeries.Value<string>("series");
                var seriesSeq = firstSeries.Value<string>("sequence");
                if (!string.IsNullOrWhiteSpace(seriesName))
                {
                    result.ExternalIds["series"] = seriesName;
                    if (!string.IsNullOrWhiteSpace(seriesSeq))
                    {
                        result.ExternalIds["seriesPosition"] = seriesSeq;
                    }
                }
            }

            return result;
        }
    }
}
