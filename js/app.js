(function () {
  "use strict";

  var STORAGE_KEY = "jdt_progress_v1";

  /* ---------------- storage helpers ---------------- */
  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveProgress(p) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }
  function getLevelProgress(levelId) {
    var p = loadProgress();
    return p[levelId] || { last: null, inProgress: null };
  }
  function setLevelProgress(levelId, data) {
    var p = loadProgress();
    p[levelId] = data;
    saveProgress(p);
  }

  function allowedWrong(total) {
    return Math.max(1, Math.round((total * 7) / 60));
  }

  function findLevel(id) {
    return LEVELS.find(function (l) { return l.id === id; });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function shuffleQuestions(questions) {
    return shuffle(questions);
  }

  /* ---------------- screen switching ---------------- */
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.toggle("active", s.id === id);
    });
    window.scrollTo(0, 0);
  }

  /* ---------------- HOME ---------------- */
  function renderHome() {
    var totalQuestions = LEVELS.reduce(function (sum, l) { return sum + l.questions.length; }, 0);
    var progress = loadProgress();
    var passedCount = LEVELS.filter(function (l) {
      var lp = progress[l.id];
      return lp && lp.last && lp.last.passed;
    }).length;

    var statsEl = document.getElementById("overall-stats");
    statsEl.innerHTML =
      '<div class="stat-pill"><span class="num">' + LEVELS.length + '</span><span class="label">مستوى</span></div>' +
      '<div class="stat-pill"><span class="num">' + totalQuestions + '</span><span class="label">سؤال إجمالي</span></div>' +
      '<div class="stat-pill"><span class="num">' + passedCount + '</span><span class="label">مستوى ناجح</span></div>';

    var grid = document.getElementById("levels-grid");
    grid.innerHTML = "";

    LEVELS.forEach(function (level) {
      var lp = progress[level.id] || { last: null, inProgress: null };
      var card = document.createElement("div");
      card.className = "level-card";

      var badgeHtml =
        '<div class="level-card-top">' +
          '<div class="level-badge">' + level.id + '</div>' +
          '<div class="level-count">' + level.questions.length + ' سؤال</div>' +
        '</div>' +
        '<div class="level-name">المستوى ' + level.id + '</div>';

      var statusHtml = "";
      var actionsHtml = "";

      if (lp.inProgress) {
        var answeredCount = lp.inProgress.answers.filter(function (a) { return a !== null; }).length;
        statusHtml = '<span class="status-badge progress">قيد التقدم &middot; ' + answeredCount + ' / ' + level.questions.length + '</span>';
        actionsHtml =
          '<button class="btn btn-primary" data-action="continue" data-level="' + level.id + '">متابعة</button>' +
          '<button class="btn btn-ghost" data-action="restart" data-level="' + level.id + '" style="padding:6px;font-size:13px;">البدء من جديد</button>';
      } else if (lp.last) {
        var badgeClass = lp.last.passed ? "pass" : "fail";
        var badgeText = lp.last.passed ? "ناجح" : "راسب";
        statusHtml = '<span class="status-badge ' + badgeClass + '">' + badgeText + ' &middot; ' + lp.last.wrong + ' أخطاء</span>';
        actionsHtml = '<div class="btn-row">';
        if (lp.last.wrong > 0) {
          actionsHtml += '<button class="btn btn-secondary" data-action="review-last" data-level="' + level.id + '">مراجعة الأخطاء</button>';
        }
        actionsHtml += '<button class="btn btn-primary" data-action="retake" data-level="' + level.id + '">إعادة المحاولة</button>';
        actionsHtml += '</div>';
      } else {
        statusHtml = '<span class="status-badge pending">لم تبدأ بعد</span>';
        actionsHtml = '<button class="btn btn-primary" data-action="start" data-level="' + level.id + '">ابدأ الاختبار</button>';
      }

      card.innerHTML = badgeHtml + statusHtml + actionsHtml;
      grid.appendChild(card);
    });
  }

  document.getElementById("levels-grid").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var levelId = parseInt(btn.dataset.level, 10);
    var action = btn.dataset.action;

    if (action === "start" || action === "retake") {
      beginLevel(levelId, false);
    } else if (action === "continue") {
      beginLevel(levelId, true);
    } else if (action === "restart") {
      if (confirm("سيتم حذف التقدم الحالي في هذا المستوى والبدء من جديد. متابعة؟")) {
        beginLevel(levelId, false);
      }
    } else if (action === "review-last") {
      var lp = getLevelProgress(levelId);
      if (lp.last) {
        currentLevelId = levelId;
        renderResults(levelId, lp.last);
        showScreen("screen-results");
        toggleReview(true);
      }
    }
  });

  document.getElementById("btn-reset-all").addEventListener("click", function () {
    if (confirm("سيتم حذف كل نتائجك وتقدمك في جميع المستويات. هل أنت متأكد؟")) {
      localStorage.removeItem(STORAGE_KEY);
      renderHome();
    }
  });

  /* ---------------- QUIZ ---------------- */
  var currentLevelId = null;
  var currentQuestions = null;
  var currentAnswers = null;
  var currentIndex = 0;

  function beginLevel(levelId, resume) {
    var level = findLevel(levelId);
    var lp = getLevelProgress(levelId);

    if (resume && lp.inProgress) {
      currentQuestions = lp.inProgress.questions;
      currentAnswers = lp.inProgress.answers.slice();
      currentIndex = lp.inProgress.current || 0;
    } else {
      currentQuestions = shuffleQuestions(level.questions);
      currentAnswers = new Array(currentQuestions.length).fill(null);
      currentIndex = 0;
      setLevelProgress(levelId, { last: lp.last, inProgress: { questions: currentQuestions, answers: currentAnswers, current: 0 } });
    }
    currentLevelId = levelId;
    document.getElementById("quiz-level-title").textContent = "المستوى " + levelId;
    renderQuestion();
    showScreen("screen-quiz");
  }

  function persistInProgress() {
    var lp = getLevelProgress(currentLevelId);
    setLevelProgress(currentLevelId, { last: lp.last, inProgress: { questions: currentQuestions, answers: currentAnswers, current: currentIndex } });
  }

  function renderQuestion() {
    var q = currentQuestions[currentIndex];
    var total = currentQuestions.length;

    document.getElementById("quiz-progress-text").textContent = (currentIndex + 1) + " / " + total;
    document.getElementById("progress-fill").style.width = (((currentIndex + 1) / total) * 100) + "%";
    document.getElementById("q-number").textContent = "السؤال " + (currentIndex + 1);
    document.getElementById("q-text").textContent = q.q;

    var imgWrap = document.getElementById("q-image-wrap");
    var img = document.getElementById("q-image");
    if (q.img) {
      img.onerror = function () { imgWrap.hidden = true; };
      img.src = q.img;
      imgWrap.hidden = false;
    } else {
      imgWrap.hidden = true;
      img.onerror = null;
      img.removeAttribute("src");
    }

    var list = document.getElementById("options-list");
    list.innerHTML = "";
    q.opts.forEach(function (optText, idx) {
      var div = document.createElement("div");
      div.className = "option";
      if (currentAnswers[currentIndex] === idx) div.classList.add("selected");
      div.innerHTML = '<span>' + escapeHtml(optText) + '</span><span class="opt-dot"></span>';
      div.addEventListener("click", function () {
        currentAnswers[currentIndex] = idx;
        persistInProgress();

        var allowed = allowedWrong(currentQuestions.length);
        var wrongSoFar = currentAnswers.filter(function (a, i) {
          return a !== null && a !== currentQuestions[i].correct;
        }).length;
        if (wrongSoFar > allowed) {
          finishQuiz(currentIndex + 1, true);
          return;
        }
        renderQuestion();
      });
      list.appendChild(div);
    });

    document.getElementById("btn-prev").disabled = currentIndex === 0;
    var isLast = currentIndex === total - 1;
    document.getElementById("btn-next").textContent = isLast ? "إنهاء الاختبار" : "التالي";
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  document.getElementById("btn-prev").addEventListener("click", function () {
    if (currentIndex > 0) {
      currentIndex--;
      persistInProgress();
      renderQuestion();
    }
  });

  document.getElementById("btn-next").addEventListener("click", function () {
    var isLast = currentIndex === currentQuestions.length - 1;
    if (isLast) {
      var unanswered = currentAnswers.filter(function (a) { return a === null; }).length;
      if (unanswered > 0) {
        if (!confirm("لا تزال هناك " + unanswered + " أسئلة بدون إجابة، وستُحتسب كإجابات خاطئة. هل تريد إنهاء الاختبار؟")) {
          return;
        }
      }
      finishQuiz();
    } else {
      currentIndex++;
      persistInProgress();
      renderQuestion();
    }
  });

  document.getElementById("btn-exit-quiz").addEventListener("click", function () {
    persistInProgress();
    renderHome();
    showScreen("screen-home");
  });

  document.getElementById("btn-finish-early").addEventListener("click", function () {
    var answeredCount = currentAnswers.filter(function (a) { return a !== null; }).length;
    if (answeredCount === 0) {
      alert("لم تجب على أي سؤال بعد.");
      return;
    }
    var unanswered = currentAnswers.length - answeredCount;
    var msg = unanswered > 0
      ? "لا تزال هناك " + unanswered + " أسئلة بدون إجابة، وستُحتسب كإجابات خاطئة. هل تريد إنهاء الاختبار الآن؟"
      : "هل تريد إنهاء الاختبار الآن؟";
    if (confirm(msg)) finishQuiz();
  });

  function finishQuiz(limit, stoppedEarly) {
    var total = limit || currentQuestions.length;
    var qs = currentQuestions.slice(0, total);
    var answers = currentAnswers.slice(0, total);
    var wrongIdxs = [];
    var skippedIdxs = [];
    answers.forEach(function (a, i) {
      if (a === null) { skippedIdxs.push(i); wrongIdxs.push(i); }
      else if (a !== qs[i].correct) { wrongIdxs.push(i); }
    });
    var wrong = wrongIdxs.length;
    var correct = total - wrong;
    var allowed = allowedWrong(currentQuestions.length);
    var result = {
      questions: qs,
      answers: answers,
      wrongIdxs: wrongIdxs,
      skippedIdxs: skippedIdxs,
      correct: correct,
      wrong: wrong,
      total: total,
      allowed: allowed,
      passed: wrong <= allowed,
      stoppedEarly: !!stoppedEarly,
      date: new Date().toISOString()
    };
    setLevelProgress(currentLevelId, { last: result, inProgress: null });
    renderResults(currentLevelId, result);
    showScreen("screen-results");
    toggleReview(false);
  }

  /* ---------------- RESULTS ---------------- */
  function renderResults(levelId, result) {
    var banner = document.getElementById("result-banner");
    banner.className = "result-banner " + (result.passed ? "pass" : "fail");
    document.getElementById("result-icon").textContent = result.passed ? "✓" : "✕";
    document.getElementById("result-title").textContent = result.passed ? "ناجح" : "راسب";
    document.getElementById("result-sub").textContent = result.stoppedEarly
      ? "توقف الاختبار بعد الوصول إلى الحد الأقصى من الأخطاء (" + result.wrong + " أخطاء)"
      : "المستوى " + levelId + " - " + result.correct + " من " + result.total + " إجابة صحيحة";

    document.getElementById("score-correct").textContent = result.correct;
    document.getElementById("score-wrong").textContent = result.wrong;
    document.getElementById("score-allowed").textContent = result.allowed;

    var chipGrid = document.getElementById("chip-grid");
    chipGrid.innerHTML = "";
    for (var i = 0; i < result.total; i++) {
      var chip = document.createElement("div");
      var isSkipped = result.skippedIdxs.indexOf(i) !== -1;
      var isWrong = result.wrongIdxs.indexOf(i) !== -1;
      chip.className = "chip " + (isSkipped ? "skipped" : (isWrong ? "wrong" : "correct"));
      chip.textContent = (i + 1);
      if (isWrong) {
        chip.addEventListener("click", function (qIdx) {
          return function () {
            toggleReview(true);
            var target = document.getElementById("review-q-" + qIdx);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
          };
        }(i));
      }
      chipGrid.appendChild(chip);
    }

    document.getElementById("btn-review-wrong").style.display = result.wrong > 0 ? "block" : "none";
    buildReviewList(result);

    document.getElementById("btn-retake").onclick = function () { beginLevel(levelId, false); };
  }

  function buildReviewList(result) {
    var container = document.getElementById("review-list");
    container.innerHTML = "";
    if (result.wrong === 0) return;

    result.wrongIdxs.forEach(function (qIdx) {
      var q = result.questions[qIdx];
      var userAnswer = result.answers[qIdx];
      var item = document.createElement("div");
      item.className = "review-item";
      item.id = "review-q-" + qIdx;

      var html = '<div class="q-number">السؤال ' + (qIdx + 1) + '</div>';
      html += '<div class="q-text">' + escapeHtml(q.q) + '</div>';
      if (q.img) {
        html += '<div class="q-image-wrap"><img src="' + q.img + '" alt="صورة توضيحية" onerror="this.parentElement.hidden=true"></div>';
      }
      html += '<div class="options-list">';
      q.opts.forEach(function (optText, idx) {
        var cls = "option dim";
        var icon = "";
        if (idx === q.correct) { cls = "option correct"; icon = "✓"; }
        else if (idx === userAnswer) { cls = "option wrong"; icon = "✕"; }
        html += '<div class="' + cls + '">' +
          '<span>' + escapeHtml(optText) + '</span>' +
          (icon ? '<span class="opt-icon">' + icon + '</span>' : '<span class="opt-dot"></span>') +
          '</div>';
      });
      if (userAnswer === null) {
        html += '<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);">لم تتم الإجابة على هذا السؤال</div>';
      }
      html += '</div>';
      item.innerHTML = html;
      container.appendChild(item);
    });
  }

  function toggleReview(show) {
    var section = document.getElementById("review-section");
    section.hidden = !show;
    if (show) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("btn-review-wrong").addEventListener("click", function () {
    var section = document.getElementById("review-section");
    toggleReview(section.hidden);
  });

  document.getElementById("btn-results-home").addEventListener("click", function () {
    renderHome();
    showScreen("screen-home");
  });

  /* ---------------- init ---------------- */
  renderHome();
  showScreen("screen-home");
})();
