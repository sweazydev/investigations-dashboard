using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Server.Models;

namespace Server.Services
{
    public class JsonCaseStore : IJsonCaseStore
    {
        private readonly string _basePath;
        private readonly string _jsonFile;
        private readonly string _attachmentsFolder;
        private readonly object _lock = new();
        private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public JsonCaseStore()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            _basePath = Path.Combine(appData, "InvestigationDashboard");
            _attachmentsFolder = Path.Combine(_basePath, "attachments");
            _jsonFile = Path.Combine(_basePath, "cases.json");

            Directory.CreateDirectory(_basePath);
            Directory.CreateDirectory(_attachmentsFolder);
        }

        private List<CaseModel> LoadAll()
        {
            if (!File.Exists(_jsonFile)) return new List<CaseModel>();
            var json = File.ReadAllText(_jsonFile);
            if (string.IsNullOrWhiteSpace(json)) return new List<CaseModel>();
            var items = JsonSerializer.Deserialize<IEnumerable<CaseModel>>(json, _jsonOptions);
            return items?.ToList() ?? new List<CaseModel>();
        }

        private void SaveAll(IEnumerable<CaseModel> items)
        {
            var outJson = JsonSerializer.Serialize(items, _jsonOptions);
            File.WriteAllText(_jsonFile, outJson);
        }

        public Task<IEnumerable<CaseModel>> GetAllAsync()
        {
            lock (_lock)
            {
                return Task.FromResult<IEnumerable<CaseModel>>(LoadAll());
            }
        }

        public Task<CaseModel> AddAsync(CaseModel caseModel, IEnumerable<(string fileName, string contentType, Stream stream)> attachments)
        {
            lock (_lock)
            {
                var existing = LoadAll();

                // Save attachments
                if (attachments != null)
                {
                    foreach (var att in attachments)
                    {
                        var ext = Path.GetExtension(att.fileName);
                        if (string.IsNullOrEmpty(ext)) ext = ".bin";
                        var stored = Guid.NewGuid().ToString() + ext;
                        var target = Path.Combine(_attachmentsFolder, stored);
                        using (var fs = File.Create(target))
                        {
                            att.stream.Seek(0, SeekOrigin.Begin);
                            att.stream.CopyTo(fs);
                        }

                        caseModel.Attachments.Add(new AttachmentInfo
                        {
                            FileName = att.fileName,
                            StoredFileName = stored,
                            ContentType = att.contentType
                        });
                    }
                }

                existing.Add(caseModel);
                SaveAll(existing);
                return Task.FromResult(caseModel);
            }
        }

        public Task<CaseModel> UpdateAsync(Guid id, CaseModel patch, IEnumerable<(string fileName, string contentType, Stream stream)> attachments)
        {
            lock (_lock)
            {
                var existing = LoadAll();
                var idx = existing.FindIndex(c => c.Id == id);
                if (idx < 0) return Task.FromResult<CaseModel>(null);

                var target = existing[idx];
                // update fields if provided
                if (!string.IsNullOrEmpty(patch.Title)) target.Title = patch.Title;
                if (!string.IsNullOrEmpty(patch.Description)) target.Description = patch.Description;
                if (!string.IsNullOrEmpty(patch.Notes)) target.Notes = patch.Notes;
                target.UpdatedAt = DateTime.UtcNow;

                // save new attachments
                if (attachments != null)
                {
                    foreach (var att in attachments)
                    {
                        var ext = Path.GetExtension(att.fileName);
                        if (string.IsNullOrEmpty(ext)) ext = ".bin";
                        var stored = Guid.NewGuid().ToString() + ext;
                        var filePath = Path.Combine(_attachmentsFolder, stored);
                        using (var fs = File.Create(filePath))
                        {
                            att.stream.Seek(0, SeekOrigin.Begin);
                            att.stream.CopyTo(fs);
                        }

                        target.Attachments.Add(new AttachmentInfo
                        {
                            FileName = att.fileName,
                            StoredFileName = stored,
                            ContentType = att.contentType
                        });
                    }
                }

                existing[idx] = target;
                SaveAll(existing);
                return Task.FromResult(target);
            }
        }

        public Task DeleteAsync(Guid id)
        {
            lock (_lock)
            {
                var existing = LoadAll();
                var item = existing.FirstOrDefault(c => c.Id == id);
                if (item != null)
                {
                    // delete attachment files
                    if (item.Attachments != null)
                    {
                        foreach (var a in item.Attachments)
                        {
                            try
                            {
                                var path = Path.Combine(_attachmentsFolder, a.StoredFileName);
                                if (File.Exists(path)) File.Delete(path);
                            }
                            catch { }
                        }
                    }

                    existing.RemoveAll(c => c.Id == id);
                    SaveAll(existing);
                }

                return Task.CompletedTask;
            }
        }

        public Task<Stream> GetAttachmentStreamAsync(Guid caseId, string storedFileName)
        {
            lock (_lock)
            {
                var path = Path.Combine(_attachmentsFolder, storedFileName);
                if (!File.Exists(path)) return Task.FromResult<Stream>(null);
                Stream s = File.OpenRead(path);
                return Task.FromResult(s);
            }
        }
    }
}
