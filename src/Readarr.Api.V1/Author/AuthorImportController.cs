using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using NzbDrone.Core.Books;
using Readarr.Http;

namespace Readarr.Api.V1.Author
{
    [V1ApiController("author/import")]
    public class AuthorImportController : Controller
    {
        private readonly IAddAuthorService _addAuthorService;

        public AuthorImportController(IAddAuthorService addAuthorService)
        {
            _addAuthorService = addAuthorService;
        }

        [HttpPost]
        public object Import([FromBody] List<AuthorResource> resource)
        {
            var newAuthors = resource.ToModel();

            foreach (var author in newAuthors)
            {
                author.AddOptions = new AddAuthorOptions
                {
                    SearchForMissingBooks = false
                };
            }

            return _addAuthorService.AddAuthors(newAuthors, true).ToResource();
        }
    }
}
