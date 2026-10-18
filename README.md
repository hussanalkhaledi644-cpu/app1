# MedVault

An iPhone app (installable web app) for med school notes, pre-clinical notes and practice exams. It works offline, and everything is stored on your phone.

## Features
- **Pre-clinical** and **Clinical** sections with subjects you can edit (name, colour, icon). Upload PDFs, images, Word and PowerPoint files, take photos of handwritten notes, or write notes.
- A built-in **PDF viewer**, plus search across all notes and exams.
- **Practice exams**, one question at a time:
  - Multiple choice: pick an answer, tap *Check answer*, and the answer key and explanation appear.
  - Written answers: type your answer, reveal the model answer, tick off the marking points and mark yourself.
  - Questions can include images (tap to zoom). You can flag questions and jump between them with the question grid.
  - The app scores you, keeps your attempt history, and lets you retry only the questions you missed.
- **Backup and restore** to a single .zip file (save it to iCloud Drive).

## Put it on your iPhone
1. Host it on GitHub Pages. In the repository go to **Settings → Pages**, choose *Deploy from a branch*, pick the branch, select `/ (root)` and save. The site appears at `https://<username>.github.io/app1/`.
2. Open that link in **Safari** on your iPhone.
3. Tap **Share**, then **Add to Home Screen**.
4. Open MedVault from the home-screen icon. Data saved in the home-screen app is separate from Safari's.

## Adding practice exams
- **Exams from Claude:** these are committed to `exams/` and listed in `exams/index.json`. The app downloads them automatically, or tap *Check for new practice exams*.
- **Any exam file:** on the Exams tab, tap **+**, then either *Choose exam file* (.json) or *Paste exam text*.

The file format is described in [EXAM_FORMAT.md](EXAM_FORMAT.md).

## Development
This is plain HTML, CSS and JavaScript with no build step. To run it locally, use `python3 -m http.server` and open http://localhost:8000. PDF rendering uses a bundled copy of pdf.js (Apache-2.0) in `vendor/pdfjs`.
