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

type CopyTarget = "main" | string;
type CopyFeedback = { status: "idle" | "success" | "error"; target: CopyTarget };

function preferredLanguage(): Language {
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function isDefault(options: PasswordOptions): boolean {
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

function BrandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z" />
      <path d="m9.2 12 1.8 1.8 3.9-4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7v5h-5" />
      <path d="M18.5 15a7 7 0 1 1-.5-7.5L20 10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4 4L19 7" />
    </svg>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(preferredLanguage);
  const [options, setOptions] = useState<PasswordOptions>({ ...CHROME_DEFAULT_OPTIONS });
  const [lengthInput, setLengthInput] = useState(String(CHROME_DEFAULT_OPTIONS.length));
  const [password, setPassword] = useState(() => generatePassword({ ...CHROME_DEFAULT_OPTIONS }));
  const [history, setHistory] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>({ status: "idle", target: "main" });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const t = translations[language];
  const validationError = useMemo(() => validationKey(options), [options]);
  const defaultOptions = isDefault(options);

  const classSummary = [
    options.lowercase && t.lowercaseShort,
    options.uppercase && t.uppercaseShort,
    options.digits && t.digitsShort,
    options.symbols && t.symbolsShort,
  ].filter(Boolean).join(" · ");

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

  useEffect(() => {
    if (copyFeedback.status !== "success") return undefined;
    const timeout = window.setTimeout(
      () => setCopyFeedback({ status: "idle", target: "main" }),
      1500,
    );
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  const applyOptions = (nextOptions: PasswordOptions) => {
    setOptions(nextOptions);
    setCopyFeedback({ status: "idle", target: "main" });
    if (!validationKey(nextOptions)) setPassword(generatePassword(nextOptions));
  };

  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    applyOptions({ ...options, [key]: value });
  };

  const updateLength = (value: string) => {
    setLengthInput(value);
    applyOptions({ ...options, length: value.trim() === "" ? 0 : Number(value) });
  };

  const regenerate = () => {
    if (validationError) return;
    setHistory((current) => [password, ...current].slice(0, HISTORY_LIMIT));
    setPassword(generatePassword(options));
    setCopyFeedback({ status: "idle", target: "main" });
  };

  const copyPassword = async (value: string, target: CopyTarget) => {
    try {
      await writeToClipboard(value);
      setCopyFeedback({ status: "success", target });
    } catch {
      setCopyFeedback({ status: "error", target });
    }
  };

  const resetOptions = () => {
    const defaults = { ...CHROME_DEFAULT_OPTIONS };
    setLengthInput(String(defaults.length));
    applyOptions(defaults);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.brand}>
          <span className="brand-mark"><BrandIcon /></span>
          <span>{t.brand}</span>
        </a>
        <div className="language-switch" role="group" aria-label={t.languageSwitch}>
          <button
            className={`language-option ${language === "zh" ? "active" : ""}`}
            type="button"
            aria-pressed={language === "zh"}
            onClick={() => setLanguage("zh")}
          >
            中文
          </button>
          <button
            className={`language-option ${language === "en" ? "active" : ""}`}
            type="button"
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </header>

      <main id="top">
        <section className="generator-card" aria-labelledby="page-title">
          <div className="card-intro">
            <div className="eyebrow"><span className="status-dot" />{t.badge}</div>
            <h1 id="page-title">{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>

          <div className="result-heading">
            <div>
              <span id="password-label" className="field-label">{t.passwordLabel}</span>
              <span className={`rule-pill ${defaultOptions ? "default" : "custom"}`}>
                {defaultOptions ? t.currentRule : t.customRule}
              </span>
            </div>
            <span className="length-chip">{password.length}</span>
          </div>

          <div className="password-surface">
            <output className="password-output" aria-live="polite" aria-labelledby="password-label">
              {password}
            </output>
          </div>

          <div className="length-control primary-length-control">
            <div className="setting-label-row">
              <label htmlFor="password-length">{t.length}</label>
              <input
                id="password-length-number"
                className="number-input"
                type="number"
                min={MIN_PASSWORD_LENGTH}
                max={MAX_PASSWORD_LENGTH}
                value={lengthInput}
                aria-label={t.length}
                onChange={(event) => updateLength(event.target.value)}
              />
            </div>
            <input
              id="password-length"
              className="range-input"
              type="range"
              min={MIN_PASSWORD_LENGTH}
              max={MAX_PASSWORD_LENGTH}
              value={Math.min(MAX_PASSWORD_LENGTH, Math.max(MIN_PASSWORD_LENGTH, options.length || MIN_PASSWORD_LENGTH))}
              aria-label={t.lengthSlider}
              onChange={(event) => updateLength(event.target.value)}
            />
            <div className="range-limits"><span>{MIN_PASSWORD_LENGTH}</span><span>{MAX_PASSWORD_LENGTH}</span></div>
            {validationError && validationError !== "invalidNoClass" && (
              <p className="validation-error" role="alert">{t[validationError]}</p>
            )}
          </div>

          <div className="primary-actions">
            <button
              className={`copy-button primary ${copyFeedback.status === "success" && copyFeedback.target === "main" ? "success" : ""}`}
              type="button"
              onClick={() => void copyPassword(password, "main")}
              disabled={Boolean(validationError)}
            >
              {copyFeedback.status === "success" && copyFeedback.target === "main" ? <CheckIcon /> : <CopyIcon />}
              {copyFeedback.status === "success" && copyFeedback.target === "main" ? t.copied : t.copy}
            </button>
            <button
              className="generate-button secondary"
              type="button"
              onClick={regenerate}
              disabled={Boolean(validationError)}
            >
              <RefreshIcon />
              {t.regenerate}
            </button>
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {copyFeedback.status === "error" ? t.copyFailed : copyFeedback.status === "success" ? t.copied : ""}
          </p>

          <div className="settings-divider" />
          <button
            className="advanced-toggle"
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="advanced-panel"
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <span className="advanced-title">{t.advanced}</span>
            <span className="advanced-summary">{classSummary}</span>
            <span className={`chevron ${advancedOpen ? "open" : ""}`} aria-hidden="true">⌄</span>
          </button>

          {advancedOpen && (
            <div className="advanced-panel" id="advanced-panel">
              <fieldset className="character-fieldset">
                <legend>{t.characterTypes}</legend>
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
              </fieldset>

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

              {validationError === "invalidNoClass" && <p className="validation-error" role="alert">{t[validationError]}</p>}

              <div className="settings-footer">
                <span>{t.instantHint}</span>
                <button className="reset-button" type="button" onClick={resetOptions}>{t.reset}</button>
              </div>
            </div>
          )}
        </section>

        <aside className="trust-strip" aria-label={t.trustLabel}>
          <BrandIcon />
          <p>{t.trustText}</p>
        </aside>

        {history.length > 0 && (
          <section className="history-section" aria-labelledby="history-title">
            <div className="section-heading">
              <div>
                <h2 id="history-title">{t.history}</h2>
                <p>{t.historyHint}</p>
              </div>
              <button className="clear-button" type="button" onClick={() => setHistory([])}>{t.clear}</button>
            </div>
            <ol className="history-list">
              {history.map((entry, index) => {
                const target = `history-${index}`;
                const copied = copyFeedback.status === "success" && copyFeedback.target === target;
                return (
                  <li key={`${entry}-${index}`}>
                    <code>{entry}</code>
                    <button type="button" onClick={() => void copyPassword(entry, target)} aria-label={t.copyHistory}>
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      <span>{copied ? t.copied : t.copyShort}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </main>

      <footer><p>{t.footer}</p></footer>
    </div>
  );
}
