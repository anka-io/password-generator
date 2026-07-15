import { useEffect, useMemo, useState } from "react";
import { translations, type Language } from "./i18n";
import {
  CHROME_DEFAULT_OPTIONS,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type PasswordOptions,
} from "./passwordGenerator";
import "./App.css";

const HISTORY_LIMIT = 10;

function preferredLanguage(): Language {
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function isChromeDefault(options: PasswordOptions): boolean {
  return Object.entries(CHROME_DEFAULT_OPTIONS).every(
    ([key, value]) => options[key as keyof PasswordOptions] === value,
  );
}

function validationKey(options: PasswordOptions): "invalidNoClass" | "invalidLength" | "invalidClassCount" | null {
  if (!Number.isInteger(options.length) || options.length < MIN_PASSWORD_LENGTH || options.length > MAX_PASSWORD_LENGTH) {
    return "invalidLength";
  }
  const selectedClassCount = [options.lowercase, options.uppercase, options.digits, options.symbols].filter(Boolean).length;
  if (selectedClassCount === 0) return "invalidNoClass";
  if (selectedClassCount > options.length) return "invalidClassCount";
  return null;
}

async function writeToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Copy command failed");
}

export default function App() {
  const [language, setLanguage] = useState<Language>(preferredLanguage);
  const [options, setOptions] = useState<PasswordOptions>({ ...CHROME_DEFAULT_OPTIONS });
  const [password, setPassword] = useState(() => generatePassword({ ...CHROME_DEFAULT_OPTIONS }));
  const [history, setHistory] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const t = translations[language];
  const validationError = useMemo(() => validationKey(options), [options]);
  const chromeDefault = isChromeDefault(options);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = t.metaTitle;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = t.metaDescription;
  }, [language, t.metaDescription, t.metaTitle]);

  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setCopyStatus("idle");
  };

  const regenerate = () => {
    if (validationError) return;
    const nextPassword = generatePassword(options);
    setHistory((current) => [password, ...current].slice(0, HISTORY_LIMIT));
    setPassword(nextPassword);
    setCopyStatus("idle");
  };

  const copyPassword = async (value: string) => {
    try {
      await writeToClipboard(value);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  const resetOptions = () => {
    setOptions({ ...CHROME_DEFAULT_OPTIONS });
    setCopyStatus("idle");
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.brand}>
          <span className="brand-mark" aria-hidden="true">•••</span>
          <span>{t.brand}</span>
        </a>
        <button
          className="language-button"
          type="button"
          onClick={() => setLanguage((current) => (current === "zh" ? "en" : "zh"))}
          aria-label={t.languageName}
        >
          <span aria-hidden="true">文</span>
          {t.languageName}
        </button>
      </header>

      <main id="top">
        <section className="generator-card" aria-labelledby="password-label">
          <div className="card-intro">
            <div className="eyebrow"><span className="status-dot" />{t.badge}</div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>

          <div className="card-heading">
            <div>
              <span id="password-label" className="field-label">{t.passwordLabel}</span>
              <span className={`rule-pill ${chromeDefault ? "default" : "custom"}`}>
                {chromeDefault ? t.currentRule : t.customRule}
              </span>
            </div>
            <span className="length-chip">{password.length}</span>
          </div>

          <div className="password-surface">
            <output className="password-output" aria-live="polite" aria-labelledby="password-label">
              {password}
            </output>
          </div>

          <div className="primary-actions">
            <button className="copy-button primary" type="button" onClick={() => void copyPassword(password)}>
              {copyStatus === "success" ? t.copied : t.copy}
            </button>
            <button
              className="generate-button secondary"
              type="button"
              onClick={regenerate}
              disabled={Boolean(validationError)}
            >
              <span aria-hidden="true">↻</span>
              {t.regenerate}
            </button>
          </div>
          <p className={`copy-feedback ${copyStatus}`} role="status" aria-live="polite">
            {copyStatus === "error" ? t.copyFailed : copyStatus === "success" ? t.copied : ""}
          </p>

          <div className="divider" />

          <button
            className="advanced-toggle"
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="advanced-panel"
            aria-label={t.advanced}
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <span>{t.advanced}</span>
            <span className="advanced-hint">{t.advancedHint}</span>
            <span className={`chevron ${advancedOpen ? "open" : ""}`} aria-hidden="true">⌄</span>
          </button>

          {advancedOpen && (
            <div className="advanced-panel" id="advanced-panel">
              <div className="length-control">
                <div className="setting-label-row">
                  <label htmlFor="password-length">{t.length}</label>
                  <input
                    id="password-length-number"
                    className="number-input"
                    type="number"
                    min={MIN_PASSWORD_LENGTH}
                    max={MAX_PASSWORD_LENGTH}
                    value={options.length}
                    aria-label={t.length}
                    onChange={(event) => updateOption("length", Number(event.target.value))}
                  />
                </div>
                <input
                  id="password-length"
                  className="range-input"
                  type="range"
                  min={MIN_PASSWORD_LENGTH}
                  max={MAX_PASSWORD_LENGTH}
                  value={Math.min(MAX_PASSWORD_LENGTH, Math.max(MIN_PASSWORD_LENGTH, options.length || MIN_PASSWORD_LENGTH))}
                  onChange={(event) => updateOption("length", Number(event.target.value))}
                />
                <div className="range-limits"><span>{MIN_PASSWORD_LENGTH}</span><span>{MAX_PASSWORD_LENGTH}</span></div>
              </div>

              <div className="character-grid">
                {(["lowercase", "uppercase", "digits", "symbols"] as const).map((key) => (
                  <label className="check-card" key={key}>
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(event) => updateOption(key, event.target.checked)}
                    />
                    <span className="custom-check" aria-hidden="true">✓</span>
                    <span>
                      <strong>{t[key]}</strong>
                      {key === "symbols" && <small>{t.symbolsHint}</small>}
                    </span>
                  </label>
                ))}
              </div>

              <label className="switch-row">
                <span>
                  <strong>{t.excludeAmbiguous}</strong>
                  <small>{t.ambiguousHint}</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={options.excludeAmbiguous}
                  onChange={(event) => updateOption("excludeAmbiguous", event.target.checked)}
                />
                <span className="switch-track" aria-hidden="true" />
              </label>

              {validationError && <p className="validation-error" role="alert">{t[validationError]}</p>}

              <button className="reset-button" type="button" onClick={resetOptions}>
                {t.reset}
              </button>
            </div>
          )}
        </section>

        <section className="history-section" aria-labelledby="history-title">
          <div className="section-heading">
            <div>
              <h2 id="history-title">{t.history}</h2>
              <p>{t.historyHint}</p>
            </div>
            {history.length > 0 && (
              <button className="clear-button" type="button" onClick={() => setHistory([])}>{t.clear}</button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="empty-history">{t.emptyHistory}</p>
          ) : (
            <ol className="history-list">
              {history.map((entry, index) => (
                <li key={`${entry}-${index}`}>
                  <code>{entry}</code>
                  <button type="button" onClick={() => void copyPassword(entry)} aria-label={t.copyHistory}>
                    {t.copy}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="trust-grid" aria-label={t.privacyTitle}>
          <article>
            <span className="trust-icon" aria-hidden="true">01</span>
            <div><h2>{t.randomTitle}</h2><p>{t.randomText}</p></div>
          </article>
          <article>
            <span className="trust-icon safe" aria-hidden="true">✓</span>
            <div><h2>{t.privacyTitle}</h2><p>{t.privacyText}</p></div>
          </article>
        </section>
      </main>

      <footer><p>{t.brand} · {t.footer}</p></footer>
    </div>
  );
}
