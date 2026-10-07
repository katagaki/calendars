(() => {
  "use strict";

  const SHOWN_KEY = "calendars.shown";
  const LANG_KEY = "calendars.lang";
  const DEFAULT_SHOWN = ["gregory", "japanese"];
  const SUN = 0, FRI = 5, SAT = 6;

  const STRINGS = {
    en: {
      title: "Calendars",
      edit: "Edit",
      done: "Done",
      showCalendars: "Show calendars",
      language: "Language",
      empty: "No calendars shown. Select Edit to choose calendars.",
      year: "year",
    },
    ja: {
      title: "カレンダー",
      edit: "編集",
      done: "完了",
      showCalendars: "表示する暦",
      language: "言語",
      empty: "表示中の暦はありません。「編集」から暦を選択してください。",
      year: "年",
    },
  };

  const julian = (date) => {
    const jdn = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) + 2440588;
    const c = jdn + 32082;
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    return {
      day: e - Math.floor((153 * m + 2) / 5) + 1,
      month: m + 3 - 12 * Math.floor(m / 10),
      year: d - 4800 + Math.floor(m / 10),
    };
  };

  const CALENDARS = [
    { id: "gregory", name: { en: "Gregorian", ja: "グレゴリオ暦" }, region: { en: "International", ja: "国際標準" }, weekend: [SAT, SUN] },
    { id: "japanese", name: { en: "Japanese", ja: "和暦" }, region: { en: "Japan", ja: "日本" }, locale: "ja-JP", weekend: [SUN] },
    { id: "chinese", name: { en: "Chinese", ja: "中国暦（農暦）" }, region: { en: "China", ja: "中国" }, locale: "zh-CN", weekend: [SAT, SUN] },
    { id: "hebrew", name: { en: "Hebrew", ja: "ユダヤ暦" }, region: { en: "Israel", ja: "イスラエル" }, locale: "he-IL", weekend: [SAT] },
    { id: "islamic-umalqura", name: { en: "Islamic (Umm al-Qura)", ja: "イスラム暦（ウンム・アル＝クラー）" }, region: { en: "Saudi Arabia", ja: "サウジアラビア" }, locale: "ar-SA", weekend: [FRI, SAT], era: "AH" },
    { id: "islamic-civil", name: { en: "Islamic (Civil)", ja: "イスラム暦（常用）" }, region: { en: "Tabular, Friday epoch", ja: "表式・金曜元期" }, locale: "ar", weekend: [FRI], era: "AH" },
    { id: "islamic-tbla", name: { en: "Islamic (Astronomical)", ja: "イスラム暦（天文）" }, region: { en: "Tabular, Thursday epoch", ja: "表式・木曜元期" }, locale: "ar", weekend: [FRI], era: "AH" },
    { id: "persian", name: { en: "Solar Hijri", ja: "イラン暦" }, region: { en: "Iran, Afghanistan", ja: "イラン・アフガニスタン" }, locale: "fa-IR", weekend: [FRI] },
    { id: "indian", name: { en: "Indian National", ja: "インド国定暦" }, region: { en: "India", ja: "インド" }, locale: "hi-IN", weekend: [SUN] },
    { id: "buddhist", name: { en: "Thai Solar", ja: "タイ太陽暦" }, region: { en: "Thailand", ja: "タイ" }, locale: "th-TH", weekend: [SAT, SUN] },
    { id: "roc", name: { en: "Minguo", ja: "民国紀元" }, region: { en: "Taiwan", ja: "台湾" }, locale: "zh-TW", weekend: [SAT, SUN] },
    { id: "dangi", name: { en: "Korean (Dangi)", ja: "朝鮮暦（檀紀）" }, region: { en: "Korea", ja: "韓国・朝鮮" }, locale: "ko-KR", weekend: [SUN] },
    { id: "juche", name: { en: "Juche", ja: "主体暦" }, region: { en: "North Korea", ja: "北朝鮮" }, locale: "ko-KP", weekend: [SUN], custom: true },
    { id: "ethiopic", name: { en: "Ethiopian", ja: "エチオピア暦" }, region: { en: "Ethiopia, Eritrea", ja: "エチオピア・エリトリア" }, locale: "am-ET", weekend: [SUN], era: "EC" },
    { id: "ethioaa", name: { en: "Ethiopian (Amete Alem)", ja: "エチオピア暦（世界紀元）" }, region: { en: "Ethiopia", ja: "エチオピア" }, locale: "am-ET", weekend: [SUN], era: "AA" },
    { id: "coptic", name: { en: "Coptic", ja: "コプト暦" }, region: { en: "Coptic Church", ja: "コプト正教会" }, locale: "ar-EG", weekend: [SUN], era: "AM" },
    { id: "julian", name: { en: "Julian", ja: "ユリウス暦" }, region: { en: "Orthodox Churches", ja: "正教会" }, locale: "ru-RU", weekend: [SUN], custom: true },
  ];

  const supported = (id) => {
    try {
      return new Intl.DateTimeFormat("en-u-ca-" + id).resolvedOptions().calendar === id;
    } catch {
      return false;
    }
  };

  const available = CALENDARS.filter((c) => c.custom || supported(c.id));

  const UI_LOCALE = { en: "en-US", ja: "ja-JP" };
  const DATE_OPTS = { year: "numeric", month: "long", day: "numeric" };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const formatJulian = (locale, date) => {
    const j = julian(date);
    return new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, { ...DATE_OPTS, timeZone: "UTC" })
      .format(new Date(Date.UTC(j.year, j.month - 1, j.day)));
  };

  const formatJucheKorean = (date) =>
    `주체${date.getFullYear() - 1911}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  const ERA_FIRST = new Set(["japanese", "roc", "juche"]);

  const composeYear = (cal, lang, { era, year, relatedYear, yearName }) => {
    if (yearName) {
      return lang === "ja" ? `${relatedYear}年（${yearName}）` : `${capitalize(yearName)} (${relatedYear})`;
    }
    if (lang === "ja") return `${era ?? ""}${year}年`;
    if (!era) return year;
    return ERA_FIRST.has(cal.id) ? `${era} ${year}` : `${year} ${era}`;
  };

  const dateParts = (cal, date, lang) => {
    const locale = UI_LOCALE[lang];
    let fields;
    if (cal.id === "julian" || cal.id === "juche") {
      const g = cal.id === "julian"
        ? julian(date)
        : { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
      const utc = new Date(Date.UTC(g.year, g.month - 1, g.day));
      fields = {
        era: cal.id === "juche" ? (lang === "ja" ? "主体" : "Juche") : undefined,
        year: String(cal.id === "juche" ? g.year - 1911 : g.year),
        month: new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(utc),
        day: String(g.day),
      };
    } else {
      fields = {};
      for (const p of new Intl.DateTimeFormat(`${locale}-u-ca-${cal.id}`, DATE_OPTS).formatToParts(date)) {
        if (p.type !== "literal") fields[p.type] = p.value;
      }
      if (cal.era && fields.era) fields.era = cal.era;
    }
    let { month, day } = fields;
    if (lang === "ja") {
      if (!month.endsWith("月")) month += "月";
      day += "日";
    }
    return { year: composeYear(cal, lang, fields), month, day };
  };

  const formatNative = (cal, date) => {
    if (!cal.locale) return null;
    if (cal.id === "julian") return formatJulian(cal.locale, date);
    if (cal.id === "juche") return formatJucheKorean(date);
    return new Intl.DateTimeFormat(`${cal.locale}-u-ca-${cal.id}`, DATE_OPTS)
      .formatToParts(date)
      .filter((p) => !/^ERA\d+$/.test(p.value))
      .map((p) => p.value)
      .join("")
      .trim();
  };

  const formatWeekday = (cal, date, lang) => {
    const ui = new Intl.DateTimeFormat(UI_LOCALE[lang], { weekday: "long" }).format(date);
    if (!cal.locale) return ui;
    const native = new Intl.DateTimeFormat(cal.locale, { weekday: "long" }).format(date);
    return ui === native ? ui : `${ui} · ${native}`;
  };

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch {}
    },
  };

  const loadShown = () => {
    try {
      const raw = JSON.parse(storage.get(SHOWN_KEY));
      if (Array.isArray(raw)) return new Set(raw);
    } catch {}
    return new Set(DEFAULT_SHOWN);
  };

  const detectLang = () => {
    const saved = storage.get(LANG_KEY);
    if (saved && STRINGS[saved]) return saved;
    return (navigator.languages || [navigator.language]).some((l) => /^ja\b/i.test(l)) ? "ja" : "en";
  };

  const shown = loadShown();
  let lang = detectLang();

  const grid = document.getElementById("grid");
  const panel = document.getElementById("panel");
  const options = document.getElementById("options");
  const editBtn = document.getElementById("edit");
  const doneBtn = document.getElementById("done");
  const panelTitle = document.getElementById("panel-title");
  const langLabel = document.getElementById("lang-label");
  const langButtons = document.querySelectorAll("[data-lang]");

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const applyStrings = () => {
    const t = STRINGS[lang];
    document.documentElement.lang = lang;
    document.title = t.title;
    editBtn.textContent = t.edit;
    doneBtn.textContent = t.done;
    panelTitle.textContent = t.showCalendars;
    langLabel.textContent = t.language;
    for (const btn of langButtons) {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    }
  };

  const render = () => {
    const now = new Date();
    const visible = available.filter((c) => shown.has(c.id));
    grid.replaceChildren();

    if (!visible.length) {
      grid.append(el("p", "empty", STRINGS[lang].empty));
      return;
    }

    for (const cal of visible) {
      const cell = el("section", "cell");
      cell.setAttribute("aria-label", cal.name[lang]);

      const label = el("h2", "label", cal.name[lang] + " ");
      label.append(el("span", "region", "· " + cal.region[lang]));

      const body = el("div");
      const parts = dateParts(cal, now, lang);
      const dateEl = el("p", "date");
      dateEl.append(
        el("span", "date-year", parts.year),
        el("span", "date-month", parts.month),
        el("span", "date-day", parts.day),
      );
      body.append(dateEl);
      const main = lang === "ja" ? parts.year + parts.month + parts.day : null;
      const nativeText = formatNative(cal, now);
      if (nativeText && nativeText !== main) {
        const native = el("p", "native", nativeText);
        native.lang = cal.locale;
        native.dir = "auto";
        body.append(native);
      }
      const weekend = cal.weekend.includes(now.getDay());
      body.append(el("p", "weekday" + (weekend ? " weekend" : ""), formatWeekday(cal, now, lang)));

      cell.append(label, body);
      grid.append(cell);
    }
  };

  const renderOptions = () => {
    options.replaceChildren();
    for (const cal of available) {
      const li = el("li");
      const label = el("label");
      const input = el("input");
      input.type = "checkbox";
      input.checked = shown.has(cal.id);
      input.addEventListener("change", () => {
        if (input.checked) shown.add(cal.id);
        else shown.delete(cal.id);
        storage.set(SHOWN_KEY, JSON.stringify(available.filter((c) => shown.has(c.id)).map((c) => c.id)));
        render();
      });
      label.append(input, el("span", null, cal.name[lang]));
      li.append(label);
      options.append(li);
    }
  };

  const setPanel = (open) => {
    panel.hidden = !open;
    editBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      renderOptions();
      options.querySelector("input")?.focus();
    } else {
      editBtn.focus();
    }
  };

  for (const btn of langButtons) {
    btn.addEventListener("click", () => {
      lang = btn.dataset.lang;
      storage.set(LANG_KEY, lang);
      applyStrings();
      renderOptions();
      render();
    });
  }

  editBtn.addEventListener("click", () => setPanel(panel.hidden));
  doneBtn.addEventListener("click", () => setPanel(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) setPanel(false);
  });

  let lastDay = new Date().toDateString();
  setInterval(() => {
    const today = new Date().toDateString();
    if (today !== lastDay) {
      lastDay = today;
      render();
    }
  }, 30000);

  applyStrings();
  render();
})();
