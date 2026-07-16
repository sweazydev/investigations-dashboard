// Einfaches Beispiel: FormData-Upload an POST /api/cases
async function uploadCase(formElement) {
	const form = new FormData(formElement);
	const response = await fetch('/api/cases', {
		method: 'POST',
		body: form
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error('Upload fehlgeschlagen: ' + response.status + ' ' + text);
	}
	return await response.json();
}

// Beispiel: HTML
// <form id="caseForm" onsubmit="submitCase(event)">
//   <input name="title" />
//   <textarea name="description"></textarea>
//   <input type="file" name="files" multiple />
//   <button type="submit">Erstellen</button>
// </form>
// <script>
// async function submitCase(e){
//   e.preventDefault();
//   try{ const res = await uploadCase(e.target); console.log('created', res);}catch(err){console.error(err)}
// }
// </script>
