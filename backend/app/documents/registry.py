"""Field registry for the generic document creator (PL-7).

One DocumentSpec per non-NDA template in catalog.json. Field `name`s are the
exact variable names the templates mark with <span class="..._link"> tags —
they are load-bearing: they appear on the wire (fields dict keys), in the LLM
prompt, and in the frontend's template substitution. Labels/hints/groups are
authored here; tests/test_documents_registry.py cross-checks every name
against the actual template files and catalog.json.

The Mutual NDA (catalog entries 1-2) is NOT here: it keeps its bespoke /nda
creator, and NDA_KEY below is only a routing sentinel for the selection chat.
"""

from dataclasses import dataclass

NDA_KEY = "mutual-nda"

_GOVERNING_LAW_HINT = (
    "The jurisdiction whose law governs — a U.S. state (e.g. \"Delaware\", "
    "\"California\") or another legal system such as \"England and Wales\". "
    "Free text; don't assume U.S. law."
)
_CHOSEN_COURTS_HINT = (
    "The specific courts for disputes, usually paired with the governing law "
    "— e.g. \"the state and federal courts located in New Castle County, "
    "Delaware\" or \"the courts of England and Wales\"."
)
_DPA_REF_HINT = (
    "Reference to a separately signed Data Processing Agreement, or \"None\". "
    "prelegal can also draft a standalone DPA."
)
_ADDITIONAL_WARRANTIES_HINT = (
    "Any extra promises beyond the standard warranties, or \"None\"."
)
_GENERAL_CAP_HINT = (
    "The liability cap for ordinary claims, e.g. \"the Fees paid in the 12 "
    "months before the claim\" or a fixed amount."
)
_INCREASED_CLAIMS_HINT = (
    "Claim types subject to a higher cap (e.g. \"breaches of "
    "confidentiality\"), or \"None\"."
)
_INCREASED_CAP_HINT = (
    "The higher cap for Increased Claims, e.g. \"2x the General Cap Amount\"."
)
_UNLIMITED_CLAIMS_HINT = (
    "Claim types excluded from any cap (e.g. \"a party's gross negligence or "
    "willful misconduct\"), or \"None\"."
)


@dataclass(frozen=True)
class FieldSpec:
    name: str
    label: str
    hint: str
    group: str


@dataclass(frozen=True)
class DocumentSpec:
    key: str
    name: str
    description: str
    filename: str
    about: str
    fields: tuple[FieldSpec, ...]

    @property
    def field_names(self) -> frozenset[str]:
        return frozenset(f.name for f in self.fields)

    def grouped_fields(self) -> list[tuple[str, list[FieldSpec]]]:
        groups: dict[str, list[FieldSpec]] = {}
        for field in self.fields:
            groups.setdefault(field.group, []).append(field)
        return list(groups.items())


def _f(group: str, name: str, label: str, hint: str) -> FieldSpec:
    return FieldSpec(name=name, label=label, hint=hint, group=group)


_CSA = DocumentSpec(
    key="csa",
    name="Cloud Service Agreement",
    description=(
        "Common Paper Cloud Service Agreement (CSA) standard terms for selling "
        "subscriptions to cloud software products, covering access rights, "
        "payment, warranties, liability, and termination."
    ),
    filename="CSA.md",
    about=(
        "A Cloud Service Agreement is for selling ongoing subscription access "
        "to a hosted/cloud software product — access rights, support, payment, "
        "warranties, liability caps, and termination between a Provider and a "
        "Customer."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "Your company's legal name — the vendor providing the Cloud Service."),
        _f("Parties", "Customer", "Customer",
           "The customer's legal name — the company receiving access."),
        _f("Term", "Effective Date", "Effective Date",
           "The date the Framework Terms start, e.g. \"January 1, 2027\"."),
        _f("Term", "Order Date", "Order Date",
           "The date this Order Form / subscription starts."),
        _f("Term", "Subscription Period", "Subscription Period",
           "How long the subscription runs, e.g. \"12 months\"."),
        _f("Term", "Non-Renewal Notice Date", "Non-Renewal Notice Date",
           "The deadline for notice not to renew, e.g. \"at least 60 days "
           "before the end of the current Subscription Period\"."),
        _f("Service", "Technical Support", "Technical Support",
           "The support commitment, e.g. \"email support during business "
           "hours\" or a reference to an SLA."),
        _f("Service", "Use Limitations", "Use Limitations",
           "Usage caps such as seats, API calls, or storage — or \"None\"."),
        _f("Payment", "Payment Process", "Payment Process",
           "How and when the Customer pays, e.g. \"invoiced annually in "
           "advance, payment due within 30 days\"."),
        _f("Privacy & Security", "DPA", "Data Processing Agreement", _DPA_REF_HINT),
        _f("Warranties & Liability", "Additional Warranties",
           "Additional Warranties", _ADDITIONAL_WARRANTIES_HINT),
        _f("Warranties & Liability", "General Cap Amount",
           "Liability Cap (General)", _GENERAL_CAP_HINT),
        _f("Warranties & Liability", "Increased Claims",
           "Claims With a Higher Cap", _INCREASED_CLAIMS_HINT),
        _f("Warranties & Liability", "Increased Cap Amount",
           "Liability Cap (Increased)", _INCREASED_CAP_HINT),
        _f("Warranties & Liability", "Unlimited Claims",
           "Claims With No Cap", _UNLIMITED_CLAIMS_HINT),
        _f("Indemnification", "Provider Covered Claims",
           "Claims the Provider Indemnifies",
           "Claims the Provider defends the Customer against — typically "
           "third-party IP infringement by the Product."),
        _f("Indemnification", "Customer Covered Claims",
           "Claims the Customer Indemnifies",
           "Claims the Customer defends the Provider against — typically "
           "misuse of the Product or Customer Content."),
        _f("Governing Law", "Governing Law", "Governing Law", _GOVERNING_LAW_HINT),
        _f("Governing Law", "Chosen Courts", "Chosen Courts", _CHOSEN_COURTS_HINT),
    ),
)

_DESIGN_PARTNER = DocumentSpec(
    key="design-partner-agreement",
    name="Design Partner Agreement",
    description=(
        "Common Paper Design Partner Agreement standard terms for working with "
        "early design-partner customers to test, evaluate, and shape a "
        "pre-release product."
    ),
    filename="design-partner-agreement.md",
    about=(
        "A Design Partner Agreement gives an early partner access to a "
        "pre-release product so they can test it and shape its direction, "
        "usually free or at reduced cost in exchange for feedback."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "Your company's legal name — the one building the product."),
        _f("Parties", "Partner", "Partner",
           "The design partner's legal name — the company getting early access."),
        _f("Term", "Effective Date", "Effective Date",
           "The date the agreement starts."),
        _f("Term", "Term", "Term Length",
           "How long the partnership lasts, e.g. \"6 months\"."),
        _f("Program", "Program", "Program",
           "A short name or description of the design-partner program, e.g. "
           "\"the Early Access Beta Program\"."),
        _f("Payment", "Fees", "Fees",
           "What the Partner pays, if anything — most programs are free "
           "(\"None\")."),
        _f("Governing Law", "Governing Law", "Governing Law", _GOVERNING_LAW_HINT),
        _f("Governing Law", "Chosen Courts", "Chosen Courts", _CHOSEN_COURTS_HINT),
        _f("Notices", "Notice Address", "Notice Address",
           "The email or postal address for official notices."),
    ),
)

_SLA = DocumentSpec(
    key="sla",
    name="Service Level Agreement",
    description=(
        "Common Paper Service Level Agreement (SLA) standard terms defining "
        "availability commitments, service credits, and remedies for cloud "
        "services, typically attached to a Cloud Service Agreement."
    ),
    filename="sla.md",
    about=(
        "A Service Level Agreement adds uptime and support-response "
        "commitments (with service credits if they're missed) to an existing "
        "Cloud Service Agreement."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "The same Provider as the underlying Cloud Service Agreement."),
        _f("Parties", "Customer", "Customer",
           "The Customer receiving the service commitments."),
        _f("Term", "Subscription Period", "Subscription Period",
           "Usually mirrors the CSA's Subscription Period, e.g. \"12 months\"."),
        _f("Uptime", "Target Uptime", "Target Uptime",
           "The availability commitment, e.g. \"99.9% measured monthly\"."),
        _f("Uptime", "Scheduled Downtime", "Scheduled Downtime",
           "Planned maintenance excluded from the downtime calculation, e.g. "
           "\"up to 4 hours per month with 24 hours notice\"."),
        _f("Support", "Target Response Time", "Target Response Time",
           "How fast the Provider acknowledges support requests, e.g. \"1 "
           "business day\"."),
        _f("Support", "Support Channel", "Support Channel",
           "How the Customer submits requests, e.g. a support email address "
           "or portal URL."),
        _f("Remedies", "Uptime Credit", "Uptime Credit",
           "The credit when Target Uptime is missed, e.g. \"5% of monthly "
           "Fees for each 1% below the target\"."),
        _f("Remedies", "Response Time Credit", "Response Time Credit",
           "The credit when Target Response Time is missed, e.g. \"5% of "
           "monthly Fees\"."),
    ),
)

_PSA = DocumentSpec(
    key="psa",
    name="Professional Services Agreement",
    description=(
        "Common Paper Professional Services Agreement (PSA) standard terms for "
        "providing consulting and professional services, covering statements "
        "of work, deliverables, payment, and intellectual property."
    ),
    filename="psa.md",
    about=(
        "A Professional Services Agreement covers consulting or implementation "
        "work delivered under Statements of Work — deliverables, acceptance, "
        "payment, and who owns the resulting IP."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "The consulting firm's legal name — the one performing the services."),
        _f("Parties", "Customer", "Customer",
           "The client's legal name — the one receiving the services."),
        _f("Term", "Effective Date", "Effective Date",
           "The date the agreement starts."),
        _f("Term", "SOW Term", "SOW Term",
           "How long the current Statement of Work runs, e.g. \"3 months from "
           "the SOW start date\"."),
        _f("Scope of Work", "Deliverables", "Deliverables",
           "What the Provider delivers, e.g. \"a completed data migration and "
           "training materials\"."),
        _f("Scope of Work", "Customer Obligations", "Customer Obligations",
           "What the Customer must do to support the engagement (access, "
           "staff, systems), or \"None\"."),
        _f("Scope of Work", "Customer Policies", "Customer Policies",
           "Workplace or on-site policies the Provider's personnel must "
           "follow, or \"None\"."),
        _f("Acceptance", "Rejection Period", "Rejection Period",
           "How long the Customer has to reject a Deliverable before it is "
           "deemed accepted, e.g. \"10 business days\"."),
        _f("Acceptance", "Resubmission Period", "Resubmission Period",
           "How long the Provider has to fix and resubmit a rejected "
           "Deliverable, e.g. \"15 business days\"."),
        _f("Acceptance", "Time of Assignment", "IP Assignment Timing",
           "When ownership of Deliverables transfers to the Customer, e.g. "
           "\"upon full payment\" or \"upon delivery\"."),
        _f("Payment", "Fees", "Fees",
           "What the Customer pays, e.g. \"$10,000 fixed fee\" or an hourly "
           "rate."),
        _f("Payment", "Payment Period", "Payment Period",
           "How long the Customer has to pay an invoice, e.g. \"30 days from "
           "invoice\"."),
        _f("Privacy & Security", "DPA", "Data Processing Agreement", _DPA_REF_HINT),
        _f("Privacy & Security", "Security Policy", "Security Policy",
           "The name of or link to the Provider's security standards, or "
           "\"None\"."),
        _f("Insurance", "Insurance Minimums", "Insurance Minimums",
           "Minimum insurance coverage each party carries, e.g. \"$1M per "
           "occurrence commercial general liability\", or \"None\"."),
        _f("Warranties & Liability", "Additional Warranties",
           "Additional Warranties", _ADDITIONAL_WARRANTIES_HINT),
        _f("Warranties & Liability", "General Cap Amount",
           "Liability Cap (General)", _GENERAL_CAP_HINT),
        _f("Warranties & Liability", "Increased Claims",
           "Claims With a Higher Cap", _INCREASED_CLAIMS_HINT),
        _f("Warranties & Liability", "Increased Cap Amount",
           "Liability Cap (Increased)", _INCREASED_CAP_HINT),
        _f("Warranties & Liability", "Unlimited Claims",
           "Claims With No Cap", _UNLIMITED_CLAIMS_HINT),
        _f("Indemnification", "Provider Covered Claims",
           "Claims the Provider Indemnifies",
           "Claims the Provider defends the Customer against."),
        _f("Indemnification", "Customer Covered Claims",
           "Claims the Customer Indemnifies",
           "Claims the Customer defends the Provider against."),
        _f("Governing Law", "Governing Law", "Governing Law", _GOVERNING_LAW_HINT),
        _f("Governing Law", "Chosen Courts", "Chosen Courts", _CHOSEN_COURTS_HINT),
    ),
)

_DPA_DOC = DocumentSpec(
    key="dpa",
    name="Data Processing Agreement",
    description=(
        "Common Paper Data Processing Agreement (DPA) standard terms governing "
        "the processing of personal data on behalf of a customer, addressing "
        "data protection law compliance, security measures, and sub-processors."
    ),
    filename="DPA.md",
    about=(
        "A Data Processing Agreement governs how a vendor processes personal "
        "data on a customer's behalf — data protection compliance, "
        "international transfers, subprocessors, and breach response. It "
        "attaches to an underlying commercial agreement (like a CSA) rather "
        "than replacing it."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "The vendor processing personal data."),
        _f("Parties", "Customer", "Customer",
           "The customer whose personal data is processed."),
        _f("Parent Agreement", "Agreement", "Underlying Agreement",
           "The commercial agreement this DPA attaches to, e.g. \"the Cloud "
           "Service Agreement dated January 1, 2027\"."),
        _f("Processing Details", "Categories of Personal Data",
           "Categories of Personal Data",
           "The types of data processed, e.g. \"names, email addresses, and "
           "usage logs\"."),
        _f("Processing Details", "Categories of Data Subjects",
           "Categories of Data Subjects",
           "Whose data is processed, e.g. \"Customer's employees and end "
           "users\"."),
        _f("Processing Details", "Nature and Purpose of Processing",
           "Nature and Purpose of Processing",
           "What the processing does and why, e.g. \"hosting and providing "
           "the cloud service\"."),
        _f("Processing Details", "Duration of Processing",
           "Duration of Processing",
           "How long data is processed, e.g. \"the term of the Agreement "
           "plus 30 days for deletion\"."),
        _f("Processing Details", "Special Category Data",
           "Special Category Data",
           "Any sensitive data categories (health, biometrics, etc.) — "
           "usually \"None\"."),
        _f("Processing Details",
           "Special Category Data Restrictions or Safeguards",
           "Special Category Safeguards",
           "Extra safeguards applied to special category data, or \"None\"."),
        _f("International Transfers", "Frequency of Transfer",
           "Frequency of Transfer",
           "How often data is transferred, e.g. \"on a continuous basis\"."),
        _f("International Transfers", "Governing Member State",
           "Governing Member State",
           "The EEA member state whose law governs the SCCs, e.g. "
           "\"Ireland\" — relevant only for EEA transfers."),
        _f("Subprocessors", "Approved Subprocessors", "Approved Subprocessors",
           "The authorized subprocessors, e.g. a link to the Provider's "
           "subprocessor list."),
        _f("Security", "Security Policy", "Security Policy",
           "The name of or link to the security standards, e.g. \"Provider's "
           "SOC 2 Type II report\"."),
        _f("Security", "Provider Security Contact", "Security Contact",
           "The email address for security questions and notices."),
    ),
)

_SOFTWARE_LICENSE = DocumentSpec(
    key="software-license-agreement",
    name="Software License Agreement",
    description=(
        "Common Paper Software License Agreement standard terms for licensing "
        "software that is delivered to and run by the customer (rather than "
        "accessed as a cloud service)."
    ),
    filename="Software-License-Agreement.md",
    about=(
        "A Software License Agreement licenses software the customer installs "
        "and runs itself (not hosted by the vendor) — license scope, term, "
        "payment, warranties, and liability."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "The vendor licensing the Software."),
        _f("Parties", "Customer", "Customer",
           "The company installing and running the Software."),
        _f("Term", "Effective Date", "Effective Date",
           "The date the Framework Terms start."),
        _f("Term", "Order Date", "Order Date",
           "The date this Order Form starts."),
        _f("Term", "Subscription Period", "License Term",
           "How long the license runs, e.g. \"12 months\"."),
        _f("Term", "Non-Renewal Notice Date", "Non-Renewal Notice Date",
           "The deadline for notice not to renew, e.g. \"at least 60 days "
           "before the end of the current period\"."),
        _f("License", "Permitted Uses", "Permitted Uses",
           "What the Customer may use the Software for, e.g. \"internal use "
           "on up to 50 workstations\"."),
        _f("License", "License Limits", "License Limits",
           "Caps such as seats, servers, or volume — or \"None\"."),
        _f("License", "Deletion Procedure", "Deletion Procedure",
           "What the Customer does with the Software when the license ends, "
           "e.g. \"uninstall all copies and certify destruction in writing\"."),
        _f("Payment", "Payment Process", "Payment Process",
           "How and when the Customer pays, e.g. \"invoiced annually in "
           "advance, payment due within 30 days\"."),
        _f("Warranties & Liability", "Warranty Period", "Warranty Period",
           "How long the Software is warranted to match its documentation, "
           "e.g. \"90 days from delivery\"."),
        _f("Warranties & Liability", "Additional Warranties",
           "Additional Warranties", _ADDITIONAL_WARRANTIES_HINT),
        _f("Warranties & Liability", "General Cap Amount",
           "Liability Cap (General)", _GENERAL_CAP_HINT),
        _f("Warranties & Liability", "Increased Claims",
           "Claims With a Higher Cap", _INCREASED_CLAIMS_HINT),
        _f("Warranties & Liability", "Increased Cap Amount",
           "Liability Cap (Increased)", _INCREASED_CAP_HINT),
        _f("Warranties & Liability", "Unlimited Claims",
           "Claims With No Cap", _UNLIMITED_CLAIMS_HINT),
        _f("Indemnification", "Provider Covered Claims",
           "Claims the Provider Indemnifies",
           "Claims the Provider defends the Customer against — typically IP "
           "infringement by the Software."),
        _f("Indemnification", "Customer Covered Claims",
           "Claims the Customer Indemnifies",
           "Claims the Customer defends the Provider against — typically "
           "misuse of the Software."),
        _f("Governing Law", "Governing Law", "Governing Law", _GOVERNING_LAW_HINT),
        _f("Governing Law", "Chosen Courts", "Chosen Courts", _CHOSEN_COURTS_HINT),
    ),
)

_PARTNERSHIP = DocumentSpec(
    key="partnership-agreement",
    name="Partnership Agreement",
    description=(
        "Common Paper Partnership Agreement standard terms for commercial "
        "partnerships such as reseller and referral relationships between a "
        "vendor and its partners."
    ),
    filename="Partnership-Agreement.md",
    about=(
        "A Partnership Agreement sets up a commercial partnership — reseller "
        "or referral relationships — between a vendor (the Company) and a "
        "partner, covering obligations, payment, and brand usage."
    ),
    fields=(
        _f("Parties", "Company", "Company",
           "Your company's legal name — the vendor whose product is being "
           "resold or referred."),
        _f("Parties", "Partner", "Partner",
           "The partner's legal name — the reseller or referral partner."),
        _f("Term", "Effective Date", "Effective Date",
           "The date the partnership starts."),
        _f("Term", "End Date", "End Date",
           "When the partnership ends, or \"None\" for open-ended."),
        _f("Scope", "Obligations", "Obligations",
           "What each party must do, e.g. \"Partner promotes and resells "
           "Company's product to its customer base\"."),
        _f("Trademark License", "Territory", "Territory",
           "Where the Partner may use the Company's brand, e.g. \"North "
           "America\" or \"worldwide\"."),
        _f("Trademark License", "Brand Guidelines", "Brand Guidelines",
           "The name of or link to brand usage guidelines, or \"None\"."),
        _f("Payment", "Payment Process", "Payment Process",
           "How fees or commissions are invoiced and paid, if any."),
        _f("Payment", "Payment Schedule", "Payment Schedule",
           "How often payments happen, e.g. \"monthly in arrears\"."),
        _f("Privacy", "DPA", "Data Processing Agreement", _DPA_REF_HINT),
        _f("Warranties & Liability", "Additional Warranties",
           "Additional Warranties", _ADDITIONAL_WARRANTIES_HINT),
        _f("Warranties & Liability", "General Cap Amount",
           "Liability Cap (General)", _GENERAL_CAP_HINT),
        _f("Warranties & Liability", "Increased Claims",
           "Claims With a Higher Cap", _INCREASED_CLAIMS_HINT),
        _f("Warranties & Liability", "Increased Cap Amount",
           "Liability Cap (Increased)", _INCREASED_CAP_HINT),
        _f("Warranties & Liability", "Unlimited Claims",
           "Claims With No Cap", _UNLIMITED_CLAIMS_HINT),
        _f("Indemnification", "Company Covered Claims",
           "Claims the Company Indemnifies",
           "Claims the Company defends the Partner against."),
        _f("Indemnification", "Partner Covered Claims",
           "Claims the Partner Indemnifies",
           "Claims the Partner defends the Company against."),
        _f("Governing Law", "Governing Law", "Governing Law", _GOVERNING_LAW_HINT),
        _f("Governing Law", "Chosen Courts", "Chosen Courts", _CHOSEN_COURTS_HINT),
    ),
)

_BAA = DocumentSpec(
    key="baa",
    name="Business Associate Agreement",
    description=(
        "Common Paper Business Associate Agreement (BAA) standard terms for "
        "HIPAA compliance when a vendor creates, receives, maintains, or "
        "transmits protected health information on behalf of a covered entity."
    ),
    filename="BAA.md",
    about=(
        "A Business Associate Agreement is required by HIPAA when a vendor "
        "handles protected health information (PHI) on behalf of a healthcare "
        "customer; it attaches to the underlying services agreement."
    ),
    fields=(
        _f("Parties", "Provider", "Provider (Business Associate)",
           "The vendor handling PHI on the Company's behalf."),
        _f("Parties", "Company", "Company (Covered Entity)",
           "The healthcare customer disclosing PHI."),
        _f("Term", "BAA Effective Date", "BAA Effective Date",
           "The date this BAA starts."),
        _f("Parent Agreement", "Agreement", "Underlying Agreement",
           "The commercial agreement this BAA attaches to, e.g. \"the Cloud "
           "Service Agreement dated January 1, 2027\"."),
        _f("Data Rights & Restrictions", "Limitations", "Limitations",
           "Restrictions on offshoring, de-identifying, or aggregating PHI — "
           "or \"None\" (which allows all three)."),
        _f("Breach Notification", "Breach Notification Period",
           "Breach Notification Period",
           "How quickly the Provider must report a breach involving PHI, "
           "e.g. \"5 business days\"."),
    ),
)

_PILOT = DocumentSpec(
    key="pilot-agreement",
    name="Pilot Agreement",
    description=(
        "Common Paper Pilot Agreement standard terms for short-term pilots, "
        "trials, or evaluations that let a prospective customer test a product "
        "before committing to a full commercial agreement."
    ),
    filename="Pilot-Agreement.md",
    about=(
        "A Pilot Agreement covers a short trial that lets a prospective "
        "customer evaluate a product before committing — as-is product, short "
        "term, simple liability cap."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "The vendor running the pilot."),
        _f("Parties", "Customer", "Customer",
           "The prospective customer evaluating the product."),
        _f("Term", "Effective Date", "Effective Date",
           "The date the pilot starts."),
        _f("Term", "Pilot Period", "Pilot Period",
           "How long the pilot lasts, e.g. \"60 days from the Effective "
           "Date\"."),
        _f("Liability", "General Cap Amount", "Liability Cap",
           "The liability cap for the pilot — typically a small fixed amount "
           "or \"the Fees paid\"."),
        _f("Governing Law", "Governing Law", "Governing Law", _GOVERNING_LAW_HINT),
        _f("Governing Law", "Chosen Courts", "Chosen Courts", _CHOSEN_COURTS_HINT),
        _f("Notices", "Notice Address", "Notice Address",
           "The email or postal address for official notices."),
    ),
)

_AI_ADDENDUM = DocumentSpec(
    key="ai-addendum",
    name="AI Addendum",
    description=(
        "Common Paper AI Addendum standard terms adding AI-specific provisions "
        "(such as inputs, outputs, and model training) to an underlying "
        "commercial agreement like a Cloud Service Agreement."
    ),
    filename="AI-Addendum.md",
    about=(
        "An AI Addendum adds AI-specific terms — inputs, outputs, and whether "
        "customer data may train models — as a supplement to an existing "
        "commercial agreement such as a CSA."
    ),
    fields=(
        _f("Parties", "Provider", "Provider",
           "The vendor operating the AI Services."),
        _f("Parties", "Customer", "Customer",
           "The customer using the AI Services."),
        _f("Model Training", "Training Data", "Training Data",
           "The data (if any) the Provider may use to train models, e.g. "
           "\"de-identified Usage Data\" — or \"None\" (the default: no "
           "training on customer data)."),
        _f("Model Training", "Training Purposes", "Training Purposes",
           "Why the data may be used, e.g. \"to improve the accuracy of the "
           "AI Services\"."),
        _f("Model Training", "Training Restrictions", "Training Restrictions",
           "Conditions on training, e.g. \"data must be de-identified and "
           "aggregated first\"."),
        _f("Model Training", "Improvement Restrictions",
           "Improvement Restrictions",
           "Limits on using inputs/outputs for non-training product "
           "improvement, or \"None\"."),
    ),
)

DOCUMENT_ORDER: tuple[str, ...] = (
    "csa",
    "design-partner-agreement",
    "sla",
    "psa",
    "dpa",
    "software-license-agreement",
    "partnership-agreement",
    "baa",
    "pilot-agreement",
    "ai-addendum",
)

REGISTRY: dict[str, DocumentSpec] = {
    spec.key: spec
    for spec in (
        _CSA,
        _DESIGN_PARTNER,
        _SLA,
        _PSA,
        _DPA_DOC,
        _SOFTWARE_LICENSE,
        _PARTNERSHIP,
        _BAA,
        _PILOT,
        _AI_ADDENDUM,
    )
}
