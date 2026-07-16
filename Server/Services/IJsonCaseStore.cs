using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Server.Models;

namespace Server.Services
{
    public interface IJsonCaseStore
    {
        Task<IEnumerable<CaseModel>> GetAllAsync();
        Task<CaseModel> AddAsync(CaseModel caseModel, IEnumerable<(string fileName, string contentType, Stream stream)> attachments);
        Task<CaseModel> UpdateAsync(Guid id, CaseModel patch, IEnumerable<(string fileName, string contentType, Stream stream)> attachments);
        Task DeleteAsync(Guid id);
        Task<Stream> GetAttachmentStreamAsync(Guid caseId, string storedFileName);
    }
}
