using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Server.Models;
using Server.Services;
using System.Text.Json;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CasesController : ControllerBase
    {
        private readonly IJsonCaseStore _store;

        public CasesController(IJsonCaseStore store)
        {
            _store = store;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var all = await _store.GetAllAsync();
            return Ok(all);
        }

        [HttpPost]
        [RequestSizeLimit(50_000_000)] // allow up to ~50MB; adjust as needed
        public async Task<IActionResult> Post()
        {
            var form = await Request.ReadFormAsync();
            var title = form["title"].FirstOrDefault();
            var description = form["description"].FirstOrDefault();

            var caseModel = new CaseModel
            {
                Title = title,
                Description = description
            };

            var files = form.Files;
            var attachments = files.Select(f => (f.FileName, f.ContentType, f.OpenReadStream()));

            var created = await _store.AddAsync(caseModel, attachments);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> Put(Guid id)
        {
            // Support form uploads (files) and JSON patches
            if (Request.HasFormContentType)
            {
                var form = await Request.ReadFormAsync();
                var title = form["title"].FirstOrDefault();
                var description = form["description"].FirstOrDefault();
                var notes = form["notes"].FirstOrDefault();

                var patch = new CaseModel
                {
                    Title = title,
                    Description = description,
                    Notes = notes
                };

                var files = form.Files;
                var attachments = files.Select(f => (f.FileName, f.ContentType, f.OpenReadStream()));
                var updated = await _store.UpdateAsync(id, patch, attachments);
                if (updated == null) return NotFound();
                return Ok(updated);
            }

            try
            {
                var patch = await JsonSerializer.DeserializeAsync<CaseModel>(Request.Body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                var updated = await _store.UpdateAsync(id, patch, null);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch
            {
                return BadRequest();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _store.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("{id}/attachments/{fileName}")]
        public async Task<IActionResult> GetAttachment(Guid id, string fileName)
        {
            // find content type from stored metadata
            var all = await _store.GetAllAsync();
            var c = all.FirstOrDefault(x => x.Id == id);
            var att = c?.Attachments?.FirstOrDefault(a => a.StoredFileName == fileName);
            var stream = await _store.GetAttachmentStreamAsync(id, fileName);
            if (stream == null) return NotFound();
            var contentType = att?.ContentType ?? "application/octet-stream";
            return File(stream, contentType, att?.FileName ?? fileName);
        }
    }
}
