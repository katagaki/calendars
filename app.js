(() => {
  "use strict";

  const STORAGE_KEY = "calendars.hidden";
  const SUN = 0, FRI = 5, SAT = 6;

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
    { id: "chinese", name: "Chinese", region: "China", locale: "zh-CN", weekend: [SAT, SUN] },
    { id: "hebrew", name: "Hebrew", region: "Israel", locale: "he-IL", weekend: [SAT] },
    { id: "islamic-umalqura", name: "Islamic (Umm al-Qura)", region: "Saudi Arabia", locale: "ar-SA", weekend: [FRI, SAT], era: "AH" },
    { id: "islamic-civil", name: "Islamic (Civil)", region: "Tabular, Friday epoch", locale: "ar", weekend: [FRI], era: "AH" },
    { id: "islamic-tbla", name: "Islamic (Astronomical)", region: "Tabular, Thursday epoch", locale: "ar", weekend: [FRI], era: "AH" },
    { id: "persian", name: "Solar Hijri", region: "Iran, Afghanistan", locale: "fa-IR", weekend: [FRI] },
    { id: "indian", name: "Indian National", region: "India", locale: "hi-IN", weekend: [SUN] },
    { id: "buddhist", name: "Thai Solar", region: "Thailand", locale: "th-TH", weekend: [SAT, SUN] },
    { id: "japanese", name: "Japanese", region: "Japan", locale: "ja-JP", weekend: [SUN] },
    { id: "roc", name: "Minguo", region: "Taiwan", locale: "zh-TW", weekend: [SAT, SUN] },
    { id: "dangi", name: "Korean (Dangi)", region: "Korea", locale: "ko-KR", weekend: [SUN] },
    { id: "ethiopic", name: "Ethiopian", region: "Ethiopia, Eritrea", locale: "am-ET", weekend: [SUN], era: "EC" },
    { id: "ethioaa", name: "Ethiopian (Amete Alem)", region: "Ethiopia", locale: "am-ET", weekend: [SUN], era: "AA" },
    { id: "coptic", name: "Coptic", region: "Coptic Church", locale: "ar-EG", weekend: [SUN], era: "AM" },
    { id: "julian", name: "Julian", region: "Orthodox Churches", locale: "ru-RU", weekend: [SUN], custom: true },
  ];

  const supported = (id) => {
    try {
      return new Intl.DateTimeFormat("en-u-ca-" + id).resolvedOptions().calendar === id;
    } catch {
      return false;
    }
  };

  const available = CALENDARS.filter((c) => c.custom || supported(c.id));

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const formatEnglish = (cal, date) => {
    if (cal.id === "julian") {
      const j = julian(date);
      const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" })
        .format(new Date(Date.UTC(2000, j.month - 1, 1)));
      return `${month} ${j.day}, ${j.year}`;
    }
    const fmt = new Intl.DateTimeFormat("en-US-u-ca-" + cal.id, { year: "numeric", month: "long", day: "numeric" });
    const parts = fmt.formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    if (cal.id === "chinese" || cal.id === "dangi") {
      const yearName = get("yearName");
      return `${get("month")} ${get("day")}, ${yearName ? capitalize(yearName) + " year" : get("relatedYear")}`;
    }
    let text = fmt.format(date);
    if (cal.era) text = text.replace(/\s*(ERA\d+|AH)$/, "") + " " + cal.era;
    return text;
  };

  const formatNative = (cal, date) => {
    if (cal.id === "julian") {
      const j = julian(date);
      const month = new Intl.DateTimeFormat(cal.locale, { month: "long", day: "numeric", timeZone: "UTC" })
        .format(new Date(Date.UTC(2000, j.month - 1, j.day)));
      return `${month} ${j.year}`;
    }
    return new Intl.DateTimeFormat(cal.locale + "-u-ca-" + cal.id, { year: "numeric", month: "long", day: "numeric" })
      .format(date)
      .replace(/\s*ERA\d+$/, "");
  };

  const formatWeekday = (cal, date) => {
    const en = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
    const native = new Intl.DateTimeFormat(cal.locale, { weekday: "long" }).format(date);
    return en === native ? en : `${en} · ${native}`;
  };

  const loadHidden = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return new Set(Array.isArray(raw) ? raw : []);
    } catch {
      return new Set();
    }
  };

  const saveHidden = (hidden) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
    } catch {}
  };

  const hidden = loadHidden();
  const grid = document.getElementById("grid");
  const panel = document.getElementById("panel");
  const options = document.getElementById("options");
  const editBtn = document.getElementById("edit");
  const doneBtn = document.getElementById("done");

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const render = () => {
    const now = new Date();
    const isWeekendFor = (cal) => cal.weekend.includes(now.getDay());
    const visible = available.filter((c) => !hidden.has(c.id));
    grid.replaceChildren();

    if (!visible.length) {
      grid.append(el("p", "empty", "No calendars shown. Select Edit to choose calendars."));
      return;
    }

    for (const cal of visible) {
      const cell = el("section", "cell");
      cell.setAttribute("aria-label", cal.name);

      const label = el("h2", "label", cal.name + " ");
      label.append(el("span", "region", "· " + cal.region));

      const body = el("div");
      body.append(el("p", "date", formatEnglish(cal, now)));
      const native = el("p", "native", formatNative(cal, now));
      native.lang = cal.locale;
      native.dir = "auto";
      body.append(native);
      body.append(el("p", "weekday" + (isWeekendFor(cal) ? " weekend" : ""), formatWeekday(cal, now)));

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
      input.checked = !hidden.has(cal.id);
      input.addEventListener("change", () => {
        if (input.checked) hidden.delete(cal.id);
        else hidden.add(cal.id);
        saveHidden(hidden);
        render();
      });
      label.append(input, el("span", null, cal.name));
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

  render();
})();
