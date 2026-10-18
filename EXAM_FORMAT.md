# MedVault exam format

An exam is one JSON file:

```json
{
  "title": "Renal Physiology: Practice Exam 1",
  "subject": "Renal",
  "description": "Optional text shown on the exam page.",
  "questions": [
    {
      "type": "mcq",
      "stem": "Which segment reabsorbs the most sodium?",
      "image": "img/nephron.png",
      "imageCaption": "Optional caption",
      "options": ["Proximal tubule", "Loop of Henle", "Distal tubule", "Collecting duct"],
      "answer": "A",
      "explanation": "About 65% of filtered sodium is reabsorbed in the **proximal tubule**.",
      "reference": "Guyton and Hall"
    },
    {
      "type": "short",
      "stem": "Describe the countercurrent multiplier.",
      "modelAnswer": "Full model answer…",
      "markingPoints": ["Point 1", "Point 2"],
      "explanation": "Optional extra teaching point."
    }
  ]
}
```

## Fields
- `subject` groups exams under the filter chips.
- `type` is `mcq` (single best answer) or `short` (written answer). If you leave it out, the type is guessed from whether `options` exists.
- `answer` (multiple choice only) can be a letter (`"B"`), a zero-based number (`1`) or the exact option text.
- `image` can be a path relative to the exam file, a web link, or a `data:` URI. Images are saved inside the app so they work offline.
- `markingPoints` (written only) appear as a checklist. Ticking them suggests a mark of Got it, Partly or Missed it.
- A file can hold several exams as `{ "exams": [ {...}, {...} ] }`.

## Formatting inside text
| Write | Shows |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `Ca^2+^` | Ca²⁺ |
| `CO~2~` | CO₂ |
| `- item` | bullet list |
| `1. item` | numbered list |
| `# Heading` | heading |
| blank line | paragraph gap |

Don't use `~` or `^` as ordinary characters. Write "about" instead of "~".

## Publishing to the built-in library
1. Put the file in `exams/`.
2. Add an entry to `exams/index.json`: `{ "id": "renal-1", "file": "renal-1.json", "version": 1 }`.
3. To push a corrected version to phones that already have the exam, increase `version`.
