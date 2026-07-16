using System;
using System.Collections.Generic;

namespace Server.Models
{
    public class CaseModel
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<AttachmentInfo> Attachments { get; set; } = new();
    }

    public class AttachmentInfo
    {
        public string FileName { get; set; }
        public string StoredFileName { get; set; }
        public string ContentType { get; set; }
    }
}
