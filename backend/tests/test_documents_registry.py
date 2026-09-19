"""Registry integrity: every DocumentSpec must exactly cover the variables its
template actually marks, and mirror catalog.json. This is the drift alarm —
if Common Paper template wording changes, this fails loudly."""

import re

from app import paths
from app.documents.registry import DOCUMENT_ORDER, NDA_KEY, REGISTRY

VARIABLE_CLASSES = {
    "coverpage_link",
    "orderform_link",
    "keyterms_link",
    "sow_link",
    "businessterms_link",
}

SPAN_RE = re.compile(r"<span\b([^>]*)>([^<]*)</span>")
CLASS_RE = re.compile(r'class="([^"]+)"')


def canonical(name: str) -> str:
    """Case/possessive/plural-insensitive form, applied to BOTH sides so
    "Customer's"/"Subscription Periods" match "Customer"/"Subscription
    Period" without a per-document alias table."""
    text = name.strip()
    text = re.sub(r"['’]s$", "", text)
    text = re.sub(r"s$", "", text)
    return text.lower()


def extract_template_variables(markdown: str) -> set[str]:
    names: set[str] = set()
    for attrs, inner in SPAN_RE.findall(markdown):
        match = CLASS_RE.search(attrs)
        if match and match.group(1) in VARIABLE_CLASSES and inner.strip():
            names.add(canonical(inner))
    return names


def test_registry_covers_exactly_the_template_variables() -> None:
    for key, spec in REGISTRY.items():
        template_vars = extract_template_variables(paths.read_template(spec.filename))
        registry_vars = {canonical(f.name) for f in spec.fields}
        missing = template_vars - registry_vars
        extra = registry_vars - template_vars
        assert not missing and not extra, (
            f"{key}: registry drift vs {spec.filename} — "
            f"missing from registry: {sorted(missing)}; "
            f"not in template: {sorted(extra)}"
        )


def test_registry_keys_and_order_consistent() -> None:
    assert set(DOCUMENT_ORDER) == set(REGISTRY)
    assert len(DOCUMENT_ORDER) == 10
    for key, spec in REGISTRY.items():
        assert spec.key == key
    assert NDA_KEY not in REGISTRY


def test_registry_matches_catalog() -> None:
    catalog = {entry["filename"]: entry for entry in paths.read_catalog()}
    nda_files = {"Mutual-NDA.md", "Mutual-NDA-coverpage.md"}
    assert {spec.filename for spec in REGISTRY.values()} == set(catalog) - nda_files
    for spec in REGISTRY.values():
        assert spec.name == catalog[spec.filename]["name"]
        assert spec.description == catalog[spec.filename]["description"]
    # The selection prompt's NDA line depends on the NDA being in the catalog.
    assert any(e["filename"] == "Mutual-NDA.md" for e in paths.read_catalog())


def test_field_names_unique_per_document() -> None:
    for spec in REGISTRY.values():
        names = [f.name for f in spec.fields]
        assert len(names) == len(set(names)), f"{spec.key}: duplicate field names"
        canonicals = {canonical(n) for n in names}
        assert len(canonicals) == len(names), f"{spec.key}: canonical collision"
