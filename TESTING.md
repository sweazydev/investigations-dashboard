Tests / Quickstart

1) Program.cs anpassen (falls noch nicht):

using Server.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddJsonCaseStore();

var app = builder.Build();
app.UseStaticFiles();
app.MapControllers();
app.Run();

2) App starten (Visual Studio oder dotnet run)
3) Beispiel mit curl (unter Windows PowerShell):

$files = @('C:\pfad\zu\bild1.jpg')
$boundary = [System.Guid]::NewGuid().ToString()
# einfacher: benutzen Sie curl.exe mit -F
curl -v -F "title=Test Case" -F "description=Beschreibung" -F "files=@C:\pfad\zu\bild1.jpg" http://localhost:5000/api/cases

4) GET /api/cases prüfen:
Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/cases

5) Attachment-URL: Die Response enthält StoredFileName in Attachments. Zum Herunterladen: http://localhost:5000/api/cases/{id}/attachments/{storedFileName}

Hinweis: Passen Sie Host/Port an die Laufzeitumgebung an.
