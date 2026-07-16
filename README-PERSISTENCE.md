Anleitung: Persistente Cases + Anhänge

1) Registrieren Sie den Service in Program.cs (oder Startup):

// using Server.Extensions;
builder.Services.AddControllers();
builder.Services.AddJsonCaseStore();

// in der Pipeline
app.UseStaticFiles();
app.MapControllers();

2) Endpunkte
- GET /api/cases -> listet alle Cases
- POST /api/cases -> erwartet ein multipart/form-data mit Feldern `title`, `description` und 0..n Dateien
- GET /api/cases/{id}/attachments/{storedFileName} -> lädt das Attachment

3) Speicherung
- Metadaten: %APPDATA%\\InvestigationDashboard\\cases.json
- Anhänge: %APPDATA%\\InvestigationDashboard\\attachments\\{guid}.{ext}

4) Frontend
Siehe wwwroot/js/case-upload.js Beispiel. Passen Sie bei Bedarf die Pfade an.

5) Sicherheit
- Diese Implementierung speichert Dateien unverschlüsselt im Benutzerprofil.
- Prüfen Sie Dateigrößen, erlaubte Mime-Types und Zugriffsrechte für produktive Nutzung.
