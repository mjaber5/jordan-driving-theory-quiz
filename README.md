# Jordan Driving Theory Exam — Practice App

A self-contained, offline quiz app for practicing the Jordanian theoretical driving license exam. Built from a bank of **570 verified questions** (including road-sign images), split into **10 levels of 60 questions** to match the real exam format: 60 questions per attempt, up to 5 wrong answers allowed to pass.

No install, no build step, no server required — just open `index.html`.

## Screenshots

### Home — levels overview
Tracks your last result and progress per level: pass/fail with wrong-answer count, or resume an in-progress attempt.

![Home screen](screenshots/home.png)

### Quiz — road-sign question
Road-sign questions show the actual sign image extracted from the source material.

![Quiz with image](screenshots/quiz-sign.png)

### Quiz — text question
Plain questions render cleanly with no leftover image placeholder.

![Quiz text only](screenshots/quiz-text.png)

### Results
Nothing is revealed until you finish — just like the real exam. Then you get a pass/fail verdict, your score, and a color-coded map of all 60 questions.

![Results screen](screenshots/results-fail.png)

### Review
Jump into any wrong answer to see exactly what you picked versus the correct answer.

![Review wrong answers](screenshots/review.png)

## Features

- **10 levels, 60 questions each** (last level is a 30-question bonus round) — matches the real exam's 60-question, max-5-wrong format
- **Exam-realistic flow**: answers aren't revealed until you finish the level, not question-by-question
- **Full results breakdown**: pass/fail, correct/wrong counts, and a per-question color grid
- **Answer review**: see your wrong answers next to the correct ones, with the original sign image where relevant
- **Progress saved automatically** (`localStorage`) — retake any level, resume an interrupted attempt, or review your last result anytime from the home screen
- **Light theme**, black/white/`#f3f3f3` palette, minimal shadows, RTL Arabic throughout

## Running it

Just open [`index.html`](index.html) in a browser. Everything (styles, script, question data, images) is local.

## Data

The question bank was extracted from four source Word documents (~150–160 questions each, with overlap between them). After parsing, de-duplicating, and dropping the handful of questions where the source never marked a clear correct answer, 570 unique verified questions remained:

| | |
|---|---|
| Total questions | 570 |
| Levels | 10 (9 × 60 + 1 × 30) |
| Questions with a road-sign image | 282 |
| Pass threshold | 5 wrong (scaled proportionally for the 30-question level) |

## Project structure

```
index.html          Single-page app (home / quiz / results screens)
css/style.css        Styling
js/data.js            Question bank, grouped into levels
js/app.js             App logic (quiz flow, scoring, localStorage persistence)
assets/images/        Road-sign images referenced by the question bank
screenshots/           Screenshots used in this README
```

## Tech

Vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies, no build step.
