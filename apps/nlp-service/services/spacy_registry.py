from __future__ import annotations
import json
import threading
from pathlib import Path

try:
    import spacy
    import spacy.util
except Exception:
    spacy = None

MODELS_DIR = Path.home() / ".hackmanite" / "models"
SETTINGS_FILE = MODELS_DIR / "settings.json"

# lang → [lg, md, sm] ordered by priority
SUPPORTED_MODELS: dict[str, dict] = {
    f"{lang}_core_{kind}_{sz}": {"name": f"{label} ({size})", "lang": lang}
    for lang, kind, label in [
        ("en", "web",  "English"),   ("zh", "web",  "Chinese"),
        ("fr", "news", "French"),    ("ru", "news", "Russian"),
        ("es", "news", "Spanish"),   ("de", "news", "German"),
        ("ja", "news", "Japanese"),  ("pt", "news", "Portuguese"),
        ("it", "news", "Italian"),   ("nl", "news", "Dutch"),
        ("pl", "news", "Polish"),    ("el", "news", "Greek"),
        ("ro", "news", "Romanian"),  ("ca", "news", "Catalan"),
        ("hr", "news", "Croatian"),  ("da", "news", "Danish"),
        ("fi", "news", "Finnish"),   ("ko", "news", "Korean"),
        ("nb", "news", "Norwegian"), ("sv", "news", "Swedish"),
        ("uk", "news", "Ukrainian"),
    ]
    for sz, size in [("lg", "Large"), ("md", "Medium"), ("sm", "Small")]
}

# lang → ordered candidate model names
CANDIDATES: dict[str, list[str]] = {}
for model_id, info in SUPPORTED_MODELS.items():
    CANDIDATES.setdefault(info["lang"], []).append(model_id)

_lock = threading.Lock()
_cache: dict[str, any] = {}


def get_selected() -> str:
    try:
        return json.loads(SETTINGS_FILE.read_text()).get("selected", "auto") if SETTINGS_FILE.exists() else "auto"
    except Exception:
        return "auto"


def set_selected(model_name: str) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps({"selected": model_name}))


def _load_local(model_name: str) -> any:
    if not MODELS_DIR.exists():
        return None
    for p in MODELS_DIR.glob(f"**/{model_name}*"):
        if (p / "config.cfg").exists():
            return spacy.load(p)
        for sub in p.glob("**/config.cfg"):
            return spacy.load(sub.parent)
    return None


def _load_into_cache(key: str, model_name: str) -> any:
    local = _load_local(model_name)
    if local:
        _cache[key] = local
        return local
    try:
        _cache[key] = spacy.load(model_name)
        return _cache[key]
    except Exception:
        return None


def get_configured_model() -> any:
    if spacy is None:
        return None
    selected = get_selected()
    if selected == "auto":
        return None
    if selected in _cache:
        return _cache[selected]
    with _lock:
        if selected not in _cache:
            _load_into_cache(selected, selected)
    return _cache.get(selected)


def get_model_for_lang(lang: str) -> any:
    if spacy is None or lang not in CANDIDATES:
        return None
    if lang in _cache:
        return _cache[lang]
    with _lock:
        if lang not in _cache:
            for candidate in CANDIDATES[lang]:
                if _load_into_cache(lang, candidate):
                    break
    return _cache.get(lang)


def is_installed(model_name: str) -> bool:
    try:
        if spacy and spacy.util.is_package(model_name):
            return True
    except Exception:
        pass
    if not MODELS_DIR.exists():
        return False
    for p in MODELS_DIR.glob(f"**/{model_name}*"):
        if (p / "config.cfg").exists() or any(p.glob("**/config.cfg")):
            return True
    return False


def evict(model_name: str) -> None:
    _cache.pop(model_name, None)
    for lang, candidates in CANDIDATES.items():
        if model_name in candidates and _cache.get(lang) is not None:
            _cache.pop(lang, None)
