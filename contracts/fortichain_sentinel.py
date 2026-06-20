# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# =============================================================================
# FortiChain Sentinel — AI-Native Security Judgment Layer
# Network : GenLayer StudioNet  |  Token: GEN  |  Version: 2.0.0
#
# This contract accepts bundled threat signals from the FortiChain off-chain
# monitoring engine, submits them to GenLayer AI validators for independent
# consensus security analysis, and stores the risk judgment on-chain.
#
# Consensus Design (anti-undetermined-status):
#   Validators independently score signals 0–100. Consensus succeeds when all
#   validators agree on the same TIER (0-4), not the exact score. Tier bands
#   are 20 points wide, so minor validator variance never triggers undetermined.
#
#   Tier 0  Safe        0-19   Tier 1  Warning     20-39
#   Tier 2  Restricted  40-59  Tier 3  Emergency   60-79
#   Tier 4  Critical    80-100
# =============================================================================

from genlayer import *

import json
import typing


# ---------------------------------------------------------------------------
# Pure helper functions (deterministic)
# ---------------------------------------------------------------------------

def _score_to_tier(score: int) -> int:
    if score < 20:   return 0
    elif score < 40: return 1
    elif score < 60: return 2
    elif score < 80: return 3
    else:            return 4


def _tier_label(tier: int) -> str:
    return ["Safe", "Warning", "Restricted", "Emergency", "Critical"][max(0, min(4, tier))]


def _tier_color(tier: int) -> str:
    return ["#00FF88", "#FFD700", "#FF9500", "#FF4444", "#FF0000"][max(0, min(4, tier))]


def _tier_action(tier: int) -> str:
    return [
        "Continue normal operations. Maintain standard monitoring.",
        "Alert security team. Increase monitoring frequency. Prepare incident response playbook.",
        "Restrict transactions above threshold. Disable non-essential functions. Page on-call team.",
        "Pause all protocol operations. Activate incident response. Notify partners immediately.",
        "Freeze all operations. Trigger governance emergency. Contact security firms, regulators, and users.",
    ][max(0, min(4, tier))]


def _clamp(val: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, val))


def _safe_parse_json(raw: str) -> typing.Optional[dict]:
    """Try multiple strategies to extract a JSON object from an AI response."""
    # Strategy 1: direct parse
    try:
        return json.loads(raw.strip())
    except Exception:
        pass
    # Strategy 2: strip markdown fences
    try:
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)
    except Exception:
        pass
    # Strategy 3: extract outermost braces
    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        return json.loads(raw[start:end])
    except Exception:
        pass
    return None


def _validate_judgment(parsed: dict) -> dict:
    """Validate and normalise a raw AI judgment dict. Returns a guaranteed-valid dict."""
    score = _clamp(int(parsed.get("riskScore", 25)), 0, 100)
    tier = _score_to_tier(score)

    # Enforce score sits within the derived tier band
    tier_lo = [0, 20, 40, 60, 80][tier]
    tier_hi = [19, 39, 59, 79, 100][tier]
    if not (tier_lo <= score <= tier_hi):
        score = tier_lo + (tier_hi - tier_lo) // 2

    valid_sev = {"none", "low", "medium", "high", "critical", "unknown"}
    valid_cor = {"none", "weak", "moderate", "strong", "unknown"}
    valid_con = {"low", "medium", "high"}

    sig = parsed.get("signalSummary", {})
    if not isinstance(sig, dict):
        sig = {}

    def _sev(k: str) -> str:
        v = sig.get(k, "unknown")
        return v if v in valid_sev else "unknown"

    def _cor(k: str) -> str:
        v = sig.get(k, "none")
        return v if v in valid_cor else "none"

    confidence = parsed.get("confidenceLevel", "medium")
    if confidence not in valid_con:
        confidence = "medium"

    return {
        "tier": tier,
        "riskScore": score,
        "explanation": str(parsed.get("explanation", ""))[:1000],
        "keyFindings": [str(f)[:200] for f in parsed.get("keyFindings", [])[:5]],
        "signalSummary": {
            "onChainSeverity":     _sev("onChainSeverity"),
            "threatFeedSeverity":  _sev("threatFeedSeverity"),
            "socialSeverity":      _sev("socialSeverity"),
            "overallCorroboration":_cor("overallCorroboration"),
        },
        "mitigationSteps":  [str(s)[:200] for s in parsed.get("mitigationSteps", [])[:5]],
        "confidenceLevel":  confidence,
        "similarExploits":  [str(e)[:100] for e in parsed.get("similarExploits", [])[:3]],
    }


def _default_warning_judgment() -> dict:
    """Safe fallback when AI output cannot be parsed."""
    return {
        "tier": 1,
        "riskScore": 25,
        "explanation": (
            "AI output could not be parsed. Defaulting to Warning tier as a "
            "precautionary measure. Manual review is recommended."
        ),
        "keyFindings": ["AI output parse failure — manual review required"],
        "signalSummary": {
            "onChainSeverity": "unknown",
            "threatFeedSeverity": "unknown",
            "socialSeverity": "unknown",
            "overallCorroboration": "none",
        },
        "mitigationSteps": [
            "Review signal bundle manually",
            "Re-trigger analysis in 60 seconds",
            "Escalate to security team if signals persist",
        ],
        "confidenceLevel": "low",
        "similarExploits": [],
    }


def _build_analysis_prompt(protocol: dict, signals: dict) -> str:
    """Build the deterministic AI prompt for validator execution."""
    on_chain = signals.get("onChainAnomalies", [])
    threat   = signals.get("threatFeedAlerts", [])
    social   = signals.get("socialSignals", [])
    news     = signals.get("newsSignals", [])
    tx_pats  = signals.get("transactionPatterns", [])
    tvl      = signals.get("tvlChanges", [])
    history  = signals.get("historicalContext", "No historical context provided.")
    note     = signals.get("callerNote", "")

    def fmt_list(lst: list, label: str) -> str:
        if not lst:
            return f"{label}: none detected"
        items = "\n".join(f"  [{i+1}] {s}" for i, s in enumerate(lst[:10]))
        suffix = f"\n  ... and {len(lst)-10} more" if len(lst) > 10 else ""
        return f"{label}:\n{items}{suffix}"

    signal_block = "\n\n".join([
        fmt_list(on_chain, "ON-CHAIN ANOMALIES"),
        fmt_list(threat,   "THREAT FEED ALERTS (Forta, DeFiLlama, Chainalysis)"),
        fmt_list(tx_pats,  "TRANSACTION PATTERNS"),
        fmt_list(tvl,      "TVL / LIQUIDITY CHANGES"),
        fmt_list(social,   "SOCIAL SIGNALS (Twitter, Discord, Telegram)"),
        fmt_list(news,     "NEWS AND MEDIA SIGNALS"),
    ])

    total_signals = len(on_chain) + len(threat) + len(social) + len(news) + len(tx_pats) + len(tvl)
    note_block = f"\nCALLER NOTE: {note}" if note else ""

    return f"""You are an expert DeFi security analyst specialising in smart contract exploits,
flash loan attacks, reentrancy vulnerabilities, oracle manipulation, and bridge hacks.

Perform a real-time security assessment of the DeFi protocol below and determine
whether it is currently under attack or facing imminent exploit risk.

PROTOCOL UNDER ASSESSMENT
==========================
Name     : {protocol.get("name", "Unknown")}
Chain    : {protocol.get("chain", "Unknown")}
Category : {protocol.get("category", "Unknown")}
TVL      : {protocol.get("tvlUsd", "Unknown")} USD
Audit    : {protocol.get("auditStatus", "Unknown")}
Address  : {protocol.get("contractAddress", "Unknown")}

SIGNAL BUNDLE  ({total_signals} total signals)
==============================================
{signal_block}

HISTORICAL CONTEXT
==================
{history}
{note_block}

THREAT TIER CLASSIFICATION
===========================
Tier 0  SAFE        score  0-19  Normal ops, background noise only
Tier 1  WARNING     score 20-39  Minor anomalies, weak or no corroboration — USE WHEN UNCERTAIN
Tier 2  RESTRICTED  score 40-59  Multiple corroborating signals, credible threat
Tier 3  EMERGENCY   score 60-79  Active exploit highly likely, pause recommended
Tier 4  CRITICAL    score 80-100 Funds actively draining, confirmed on-chain

Analysis rules:
- Weight on-chain anomalies most heavily (hardest to fake)
- Social signals alone are NOT sufficient for Tier 3 or higher
- Tier 4 requires confirmed on-chain fund drainage
- When signals are ambiguous or contradictory, default to Tier 1
- A missed Tier 3 is far more harmful than a false Tier 1

Return ONLY a valid JSON object. No markdown, no text outside the JSON.

{{
  "tier": <integer 0, 1, 2, 3, or 4>,
  "riskScore": <integer — must match tier: tier0=0-19 tier1=20-39 tier2=40-59 tier3=60-79 tier4=80-100>,
  "explanation": "<2-3 sentences: key evidence and why this tier was chosen>",
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "signalSummary": {{
    "onChainSeverity": "<none|low|medium|high|critical>",
    "threatFeedSeverity": "<none|low|medium|high|critical>",
    "socialSeverity": "<none|low|medium|high|critical>",
    "overallCorroboration": "<none|weak|moderate|strong>"
  }},
  "mitigationSteps": ["<step 1>", "<step 2>", "<step 3>"],
  "confidenceLevel": "<low|medium|high>",
  "similarExploits": ["<name of known similar exploit, or empty string>"]
}}

IMPORTANT: tier and riskScore MUST be consistent.
If uncertain, return tier 1 with riskScore 25."""


# ---------------------------------------------------------------------------
# Main contract class
# ---------------------------------------------------------------------------

class FortiChainSentinel(gl.Contract):
    """
    FortiChain Sentinel — AI-Native Security Judgment Layer for DeFi Protection.

    Off-chain FortiChain nodes submit bundled threat signals; GenLayer validators
    independently evaluate them and reach tier-level consensus on a risk judgment.

    Storage
    -------
    protocols          TreeMap[str, str]   protocol_id  -> JSON metadata
    judgments          TreeMap[str, str]   judgment_id  -> JSON judgment
    protocol_judgments TreeMap[str, str]   protocol_id  -> latest judgment_id
    subscriptions      TreeMap[str, u256]  address_hex  -> accumulated sub seconds
    whitelist          TreeMap[str, bool]  address_hex  -> free access flag
    blacklist          TreeMap[str, bool]  address_hex  -> blocked flag
    operators          TreeMap[str, bool]  address_hex  -> operator flag
    query_price        u256                GEN wei per AI query
    sub_price          u256                GEN wei per subscription month
    total_judgments    u256                monotonic counter
    total_protocols    u256                total registered protocols
    total_revenue      u256                accumulated GEN revenue (wei)
    paused             bool                global circuit breaker
    owner              Address             contract owner
    """

    protocols:          TreeMap[str, str]
    judgments:          TreeMap[str, str]
    protocol_judgments: TreeMap[str, str]
    subscriptions:      TreeMap[str, u256]
    whitelist:          TreeMap[str, bool]
    blacklist:          TreeMap[str, bool]
    operators:          TreeMap[str, bool]
    query_price:        u256
    sub_price:          u256
    total_judgments:    u256
    total_protocols:    u256
    total_revenue:      u256
    paused:             bool
    owner:              Address

    # =========================================================================
    # Constructor
    # =========================================================================

    def __init__(self) -> None:
        self.owner          = gl.message.sender_address
        self.paused         = False
        self.total_judgments = u256(0)
        self.total_protocols = u256(0)
        self.total_revenue  = u256(0)
        self.query_price    = u256(1_000_000_000_000_000)    # 0.001 GEN
        self.sub_price      = u256(100_000_000_000_000_000)  # 0.1 GEN / month

        owner_hex = gl.message.sender_address.as_hex
        self.whitelist[owner_hex] = True
        self.operators[owner_hex] = True

    # =========================================================================
    # Internal helpers
    # =========================================================================

    def _sender_hex(self) -> str:
        return gl.message.sender_address.as_hex

    def _require_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("FortiChain: owner only")

    def _require_operator(self) -> None:
        sender = self._sender_hex()
        if (
            gl.message.sender_address != self.owner
            and not self.operators.get(sender, False)
        ):
            raise gl.vm.UserError("FortiChain: operator only")

    def _require_not_paused(self) -> None:
        if self.paused:
            raise gl.vm.UserError("FortiChain: contract is paused")

    def _require_not_blacklisted(self) -> None:
        if self.blacklist.get(self._sender_hex(), False):
            raise gl.vm.UserError("FortiChain: sender is blacklisted")

    def _protocol_exists(self, protocol_id: str) -> bool:
        try:
            _ = self.protocols[protocol_id]
            return True
        except Exception:
            return False

    def _judgment_exists(self, judgment_id: str) -> bool:
        try:
            _ = self.judgments[judgment_id]
            return True
        except Exception:
            return False

    def _has_active_sub(self, address_hex: str) -> bool:
        return self.subscriptions.get(address_hex, u256(0)) > u256(0)

    def _next_judgment_id(self, prefix: str) -> str:
        j_index = int(self.total_judgments)
        self.total_judgments = self.total_judgments + u256(1)
        pid_safe = prefix[:16].replace("/", "_").replace(" ", "_")
        return f"{prefix[:2]}-{pid_safe}-{j_index}"

    # =========================================================================
    # Protocol Registry
    # =========================================================================

    @gl.public.write
    def register_protocol(
        self,
        protocol_id:      str,
        name:             str,
        chain:            str,
        category:         str,
        contract_address: str,
        website_url:      str,
        description:      str,
        tvl_usd:          str,
        audit_status:     str,
    ) -> bool:
        """
        Register a DeFi protocol for FortiChain monitoring.

        protocol_id       Unique identifier (UUID from off-chain backend)
        name              Human-readable name  e.g. "Aave V3"
        chain             Chain identifier     e.g. "ethereum"
        category          Protocol type        e.g. "lending"
        contract_address  Primary contract address (0x...)
        website_url       Official website URL
        description       Short description of what the protocol does
        tvl_usd           Current TVL in USD as string (AI context)
        audit_status      e.g. "Audited by Trail of Bits, 2024-01"
        """
        self._require_not_paused()
        self._require_not_blacklisted()

        if len(protocol_id) == 0:
            raise gl.vm.UserError("FortiChain: protocol_id required")
        if len(protocol_id) > 64:
            raise gl.vm.UserError("FortiChain: protocol_id too long (max 64)")
        if len(name) == 0:
            raise gl.vm.UserError("FortiChain: name required")
        if len(name) > 128:
            raise gl.vm.UserError("FortiChain: name too long (max 128)")
        if len(chain) == 0:
            raise gl.vm.UserError("FortiChain: chain required")
        if len(category) == 0:
            raise gl.vm.UserError("FortiChain: category required")
        if self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol already registered")

        metadata = {
            "id":              protocol_id,
            "name":            name,
            "chain":           chain,
            "category":        category,
            "contractAddress": contract_address,
            "websiteUrl":      website_url,
            "description":     description,
            "tvlUsd":          tvl_usd,
            "auditStatus":     audit_status,
            "registeredBy":    self._sender_hex(),
            "active":          True,
            "lastRiskScore":   0,
            "lastTier":        0,
            "totalJudgments":  0,
        }
        self.protocols[protocol_id] = json.dumps(metadata)
        self.total_protocols = self.total_protocols + u256(1)
        return True

    @gl.public.write
    def update_protocol(
        self,
        protocol_id:  str,
        website_url:  str,
        description:  str,
        tvl_usd:      str,
        audit_status: str,
        active:       bool,
    ) -> bool:
        """Update mutable fields of a registered protocol."""
        self._require_not_paused()
        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")

        meta   = json.loads(self.protocols[protocol_id])
        sender = self._sender_hex()

        if (
            meta["registeredBy"] != sender
            and gl.message.sender_address != self.owner
            and not self.operators.get(sender, False)
        ):
            raise gl.vm.UserError("FortiChain: not authorized to update this protocol")

        meta["websiteUrl"]  = website_url
        meta["description"] = description
        meta["tvlUsd"]      = tvl_usd
        meta["auditStatus"] = audit_status
        meta["active"]      = active
        self.protocols[protocol_id] = json.dumps(meta)
        return True

    @gl.public.write
    def deregister_protocol(self, protocol_id: str) -> bool:
        """Soft-delete a protocol — marks it inactive but keeps history."""
        self._require_not_paused()
        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")

        meta   = json.loads(self.protocols[protocol_id])
        sender = self._sender_hex()

        if (
            meta["registeredBy"] != sender
            and gl.message.sender_address != self.owner
            and not self.operators.get(sender, False)
        ):
            raise gl.vm.UserError("FortiChain: not authorized")

        meta["active"] = False
        self.protocols[protocol_id] = json.dumps(meta)
        return True

    # =========================================================================
    # Subscription / Payment
    # =========================================================================

    @gl.public.write.payable
    def pay_for_query(self, protocol_id: str) -> bool:
        """
        Attach GEN to authorise one AI analysis query.
        Whitelisted addresses and active subscribers pay nothing.
        """
        self._require_not_paused()
        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")

        sender = self._sender_hex()
        is_free = (
            self.whitelist.get(sender, False)
            or self._has_active_sub(sender)
        )

        if not is_free:
            if gl.message.value < self.query_price:
                raise gl.vm.UserError("FortiChain: insufficient GEN — attach at least query_price wei")
            self.total_revenue = self.total_revenue + gl.message.value

        return True

    @gl.public.write.payable
    def subscribe(self, duration_months: int) -> bool:
        """
        Pay for a monthly subscription granting unlimited queries.
        duration_months  1–12
        """
        self._require_not_paused()
        if duration_months < 1:
            raise gl.vm.UserError("FortiChain: minimum 1 month")
        if duration_months > 12:
            raise gl.vm.UserError("FortiChain: maximum 12 months")

        total_cost = self.sub_price * u256(duration_months)
        if gl.message.value < total_cost:
            raise gl.vm.UserError("FortiChain: insufficient GEN for subscription")

        sender       = self._sender_hex()
        duration_sec = u256(duration_months * 30 * 24 * 3600)
        current      = self.subscriptions.get(sender, u256(0))
        self.subscriptions[sender] = current + duration_sec
        self.total_revenue = self.total_revenue + gl.message.value
        return True

    @gl.public.write
    def grant_free_subscription(self, address_hex: str, extra_seconds: int) -> bool:
        """Grant a free subscription extension to any address. Owner only."""
        self._require_owner()
        if extra_seconds <= 0:
            raise gl.vm.UserError("FortiChain: extra_seconds must be positive")
        current = self.subscriptions.get(address_hex, u256(0))
        self.subscriptions[address_hex] = current + u256(extra_seconds)
        return True

    # =========================================================================
    # Core AI Analysis — Primary Entry Point
    # =========================================================================

    @gl.public.write
    def analyze_protocol(
        self,
        protocol_id:  str,
        signals_json: str,
        caller_ref:   str,
    ) -> str:
        """
        Submit a threat signal bundle for AI validator consensus analysis.

        The FortiChain off-chain engine calls this method. Each GenLayer validator
        independently runs the AI prompt via gl.nondet.exec_prompt() and the
        gl.eq_principle.prompt_comparative() wrapper checks that all validators
        agree on the same threat TIER (not the exact score).

        This tier-level principle is intentionally wide so minor validator variance
        never causes undetermined status. Only a genuine tier disagreement (e.g.
        one validator says SAFE while another says EMERGENCY) would fail consensus.

        protocol_id   Registered protocol ID
        signals_json  JSON string:
                      {
                        "onChainAnomalies":    [...],
                        "threatFeedAlerts":    [...],
                        "socialSignals":       [...],
                        "newsSignals":         [...],
                        "transactionPatterns": [...],
                        "tvlChanges":          [...],
                        "historicalContext":   "...",
                        "callerNote":          "..."
                      }
        caller_ref    Arbitrary reference string (stored in judgment)

        Returns judgment_id — use get_judgment() to retrieve the full result.
        """
        self._require_not_paused()
        self._require_not_blacklisted()

        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")
        if len(signals_json) < 3:
            raise gl.vm.UserError("FortiChain: signals_json is empty")
        if len(caller_ref) > 128:
            raise gl.vm.UserError("FortiChain: caller_ref too long")

        proto = json.loads(self.protocols[protocol_id])
        if not proto.get("active", True):
            raise gl.vm.UserError("FortiChain: protocol is inactive")

        try:
            signals = json.loads(signals_json)
        except Exception:
            raise gl.vm.UserError("FortiChain: invalid signals_json")

        all_signals = (
            signals.get("onChainAnomalies", [])
            + signals.get("threatFeedAlerts", [])
            + signals.get("socialSignals", [])
            + signals.get("newsSignals", [])
            + signals.get("transactionPatterns", [])
            + signals.get("tvlChanges", [])
        )
        if len(all_signals) < 1:
            raise gl.vm.UserError("FortiChain: at least one signal required")

        # Build prompt deterministically before entering non-deterministic block
        prompt = _build_analysis_prompt(proto, signals)

        # ── Non-deterministic AI analysis with tier-level consensus ──────────
        #
        # get_judgment() runs independently on each GenLayer validator.
        # gl.eq_principle.prompt_comparative() then checks outputs against the
        # principle string. The principle only requires tier agreement, so minor
        # numerical differences between validators are ignored.
        #
        # Multiple parse fallbacks inside get_judgment() ensure the method never
        # crashes — worst case it returns a Tier 1 Warning default.
        #
        def get_judgment() -> str:
            raw = gl.nondet.exec_prompt(prompt)
            raw = raw.replace("```json", "").replace("```", "").strip()
            parsed = _safe_parse_json(raw)
            if parsed is None:
                return json.dumps(_default_warning_judgment())
            return json.dumps(_validate_judgment(parsed))

        result_str = gl.eq_principle.prompt_comparative(
            get_judgment,
            (
                "Two outputs are equivalent when their 'tier' field contains the same "
                "integer value (0, 1, 2, 3, or 4). The 'riskScore' integer and all text "
                "fields (explanation, keyFindings, mitigationSteps, etc.) do NOT need to "
                "match between validators — only the 'tier' value determines equivalence. "
                "If a validator returns a missing or unparseable output, treat its tier as 1."
            ),
        )

        result = json.loads(result_str)
        score  = int(result.get("riskScore", 25))
        tier   = _score_to_tier(score)

        # Assign judgment ID and persist
        j_index  = int(self.total_judgments)
        self.total_judgments = self.total_judgments + u256(1)
        pid_safe = protocol_id[:14].replace("/", "_").replace(" ", "_")
        judgment_id = f"j-{pid_safe}-{j_index}"

        judgment = {
            "id":               judgment_id,
            "type":             "ai_analysis",
            "protocolId":       protocol_id,
            "protocolName":     proto.get("name", ""),
            "protocolChain":    proto.get("chain", ""),
            "protocolCategory": proto.get("category", ""),
            "callerRef":        caller_ref,
            "triggeredBy":      self._sender_hex(),
            "riskScore":        score,
            "tier":             tier,
            "tierLabel":        _tier_label(tier),
            "tierColor":        _tier_color(tier),
            "recommendedAction":_tier_action(tier),
            "explanation":      result.get("explanation", ""),
            "keyFindings":      result.get("keyFindings", []),
            "signalSummary":    result.get("signalSummary", {}),
            "mitigationSteps":  result.get("mitigationSteps", []),
            "confidenceLevel":  result.get("confidenceLevel", "medium"),
            "similarExploits":  result.get("similarExploits", []),
            "consensusReached": True,
        }

        self.judgments[judgment_id] = json.dumps(judgment)
        self.protocol_judgments[protocol_id] = judgment_id

        proto["lastRiskScore"]  = score
        proto["lastTier"]       = tier
        proto["lastJudgmentId"] = judgment_id
        proto["totalJudgments"] = proto.get("totalJudgments", 0) + 1
        self.protocols[protocol_id] = json.dumps(proto)

        return judgment_id

    # =========================================================================
    # Batch Analysis
    # =========================================================================

    @gl.public.write
    def analyze_multiple(
        self,
        protocol_ids_json: str,
        signals_json:      str,
        caller_ref:        str,
    ) -> str:
        """
        Analyze one shared signal bundle across multiple protocols simultaneously.
        Useful for systemic threats (oracle failure, bridge exploit) that affect
        many protocols at once.

        protocol_ids_json  JSON array of protocol IDs, max 10
        signals_json       Shared signal bundle (same format as analyze_protocol)
        caller_ref         Reference string

        Returns a JSON array of judgment IDs.
        """
        self._require_not_paused()
        self._require_not_blacklisted()

        try:
            protocol_ids = json.loads(protocol_ids_json)
        except Exception:
            raise gl.vm.UserError("FortiChain: invalid protocol_ids_json")

        if not isinstance(protocol_ids, list):
            raise gl.vm.UserError("FortiChain: protocol_ids must be a JSON array")
        if len(protocol_ids) < 1 or len(protocol_ids) > 10:
            raise gl.vm.UserError("FortiChain: 1-10 protocols per batch call")

        judgment_ids = []
        for pid in protocol_ids:
            pid_str = str(pid)
            if self._protocol_exists(pid_str):
                jid = self.analyze_protocol(pid_str, signals_json, caller_ref)
                judgment_ids.append(jid)

        return json.dumps(judgment_ids)

    # =========================================================================
    # Quick Assessment — Deterministic Rule-Based (No AI, No Validator Consensus)
    # =========================================================================

    @gl.public.write
    def quick_assess(
        self,
        protocol_id:         str,
        tvl_change_pct_str:  str,
        large_tx_count:      int,
        alert_count:         int,
        caller_ref:          str,
    ) -> str:
        """
        Lightweight deterministic triage without AI validator consensus.
        Results are stored and marked type='quick_assess' to distinguish from AI runs.
        Use this for immediate first-pass triage before queueing a full analysis.

        protocol_id           Registered protocol ID
        tvl_change_pct_str    TVL change % as string e.g. "-12.5"
        large_tx_count        Large transactions observed in the monitoring window
        alert_count           Active threat feed alerts count
        caller_ref            Reference string
        """
        self._require_not_paused()
        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")

        proto = json.loads(self.protocols[protocol_id])
        if not proto.get("active", True):
            raise gl.vm.UserError("FortiChain: protocol is inactive")

        score = 0

        try:
            tvl_pct = float(tvl_change_pct_str)
        except Exception:
            tvl_pct = 0.0

        # TVL change contribution (max 50 pts)
        if tvl_pct < -50:   score += 50
        elif tvl_pct < -25: score += 35
        elif tvl_pct < -10: score += 20
        elif tvl_pct < -5:  score += 10
        elif tvl_pct < 0:   score += 5

        # Large transaction contribution (max 30 pts)
        if large_tx_count >= 20:   score += 30
        elif large_tx_count >= 10: score += 20
        elif large_tx_count >= 5:  score += 12
        elif large_tx_count >= 2:  score += 6
        elif large_tx_count >= 1:  score += 3

        # Alert count contribution (max 20 pts)
        if alert_count >= 10:   score += 20
        elif alert_count >= 5:  score += 12
        elif alert_count >= 3:  score += 8
        elif alert_count >= 1:  score += 4

        score = _clamp(score, 0, 100)
        tier  = _score_to_tier(score)

        j_index  = int(self.total_judgments)
        self.total_judgments = self.total_judgments + u256(1)
        pid_safe = protocol_id[:14].replace("/", "_").replace(" ", "_")
        judgment_id = f"qa-{pid_safe}-{j_index}"

        judgment = {
            "id":               judgment_id,
            "type":             "quick_assess",
            "protocolId":       protocol_id,
            "protocolName":     proto.get("name", ""),
            "callerRef":        caller_ref,
            "triggeredBy":      self._sender_hex(),
            "riskScore":        score,
            "tier":             tier,
            "tierLabel":        _tier_label(tier),
            "tierColor":        _tier_color(tier),
            "recommendedAction":_tier_action(tier),
            "inputs": {
                "tvlChangePct":  tvl_change_pct_str,
                "largeTxCount":  large_tx_count,
                "alertCount":    alert_count,
            },
            "explanation": (
                f"Rule-based triage. TVL change: {tvl_change_pct_str}%, "
                f"large txs: {large_tx_count}, alerts: {alert_count}."
            ),
            "consensusReached": True,
        }

        self.judgments[judgment_id]             = json.dumps(judgment)
        self.protocol_judgments[protocol_id]    = judgment_id
        proto["lastRiskScore"]                  = score
        proto["lastTier"]                       = tier
        proto["lastJudgmentId"]                 = judgment_id
        proto["totalJudgments"]                 = proto.get("totalJudgments", 0) + 1
        self.protocols[protocol_id]             = json.dumps(proto)

        return judgment_id

    # =========================================================================
    # View — Protocols
    # =========================================================================

    @gl.public.view
    def get_protocol(self, protocol_id: str) -> str:
        """Return registered protocol metadata as a JSON string."""
        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")
        return self.protocols[protocol_id]

    @gl.public.view
    def is_protocol_registered(self, protocol_id: str) -> bool:
        """Return True if the protocol is registered."""
        return self._protocol_exists(protocol_id)

    @gl.public.view
    def get_protocol_risk(self, protocol_id: str) -> str:
        """Return the current risk summary for a protocol as a JSON string."""
        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")
        meta = json.loads(self.protocols[protocol_id])
        tier = meta.get("lastTier", 0)
        return json.dumps({
            "protocolId":       protocol_id,
            "name":             meta.get("name", ""),
            "lastRiskScore":    meta.get("lastRiskScore", 0),
            "lastTier":         tier,
            "tierLabel":        _tier_label(tier),
            "tierColor":        _tier_color(tier),
            "recommendedAction":_tier_action(tier),
            "totalJudgments":   meta.get("totalJudgments", 0),
        })

    # =========================================================================
    # View — Judgments
    # =========================================================================

    @gl.public.view
    def get_judgment(self, judgment_id: str) -> str:
        """Return a stored judgment as a JSON string."""
        if not self._judgment_exists(judgment_id):
            raise gl.vm.UserError("FortiChain: judgment not found")
        return self.judgments[judgment_id]

    @gl.public.view
    def get_latest_judgment(self, protocol_id: str) -> str:
        """Return the latest judgment for a protocol as a JSON string."""
        if not self._protocol_exists(protocol_id):
            raise gl.vm.UserError("FortiChain: protocol not found")
        try:
            jid = self.protocol_judgments[protocol_id]
        except Exception:
            raise gl.vm.UserError("FortiChain: no judgment recorded yet for this protocol")
        return self.judgments[jid]

    @gl.public.view
    def get_latest_judgment_id(self, protocol_id: str) -> str:
        """Return the latest judgment ID for a protocol."""
        try:
            return self.protocol_judgments[protocol_id]
        except Exception:
            raise gl.vm.UserError("FortiChain: no judgment recorded yet for this protocol")

    @gl.public.view
    def judgment_exists(self, judgment_id: str) -> bool:
        """Return True if a judgment with this ID exists in storage."""
        return self._judgment_exists(judgment_id)

    # =========================================================================
    # View — Subscriptions & Access
    # =========================================================================

    @gl.public.view
    def is_subscribed(self, address_hex: str) -> bool:
        """Return True if the address has an active subscription."""
        return self._has_active_sub(address_hex)

    @gl.public.view
    def get_subscription_seconds(self, address_hex: str) -> int:
        """Return remaining subscription seconds for address (0 if none)."""
        return int(self.subscriptions.get(address_hex, u256(0)))

    @gl.public.view
    def is_whitelisted(self, address_hex: str) -> bool:
        """Return True if the address is whitelisted for free access."""
        return self.whitelist.get(address_hex, False)

    @gl.public.view
    def is_blacklisted(self, address_hex: str) -> bool:
        """Return True if the address is blacklisted."""
        return self.blacklist.get(address_hex, False)

    @gl.public.view
    def is_operator(self, address_hex: str) -> bool:
        """Return True if the address is an authorized operator or owner."""
        return (
            address_hex == self.owner.as_hex
            or self.operators.get(address_hex, False)
        )

    # =========================================================================
    # View — Stats & Config
    # =========================================================================

    @gl.public.view
    def get_stats(self) -> dict[str, typing.Any]:
        """Return contract-wide statistics."""
        return {
            "totalJudgments": int(self.total_judgments),
            "totalProtocols": int(self.total_protocols),
            "totalRevenue":   int(self.total_revenue),
            "owner":          self.owner.as_hex,
            "paused":         self.paused,
            "queryPrice":     int(self.query_price),
            "subPrice":       int(self.sub_price),
            "version":        "2.0.0",
        }

    @gl.public.view
    def get_query_price(self) -> int:
        """Return the GEN query price in wei."""
        return int(self.query_price)

    @gl.public.view
    def get_sub_price(self) -> int:
        """Return the monthly subscription price in GEN wei."""
        return int(self.sub_price)

    @gl.public.view
    def is_paused(self) -> bool:
        """Return True if the contract is globally paused."""
        return self.paused

    @gl.public.view
    def get_owner(self) -> str:
        """Return owner address as hex string."""
        return self.owner.as_hex

    @gl.public.view
    def tier_info(self, tier: int) -> dict[str, str]:
        """Return metadata for a tier number."""
        return {
            "tier":   str(tier),
            "label":  _tier_label(tier),
            "color":  _tier_color(tier),
            "action": _tier_action(tier),
        }

    # =========================================================================
    # Owner / Operator Admin
    # =========================================================================

    @gl.public.write
    def set_query_price(self, new_price: int) -> bool:
        """Set the GEN query price in wei. Operator or owner only."""
        self._require_operator()
        if new_price < 0:
            raise gl.vm.UserError("FortiChain: price must be non-negative")
        self.query_price = u256(new_price)
        return True

    @gl.public.write
    def set_sub_price(self, new_price: int) -> bool:
        """Set the monthly subscription price in GEN wei. Owner only."""
        self._require_owner()
        if new_price < 0:
            raise gl.vm.UserError("FortiChain: price must be non-negative")
        self.sub_price = u256(new_price)
        return True

    @gl.public.write
    def add_operator(self, address_hex: str) -> bool:
        """Add an authorized operator address. Owner only."""
        self._require_owner()
        if len(address_hex) == 0:
            raise gl.vm.UserError("FortiChain: address required")
        self.operators[address_hex] = True
        return True

    @gl.public.write
    def remove_operator(self, address_hex: str) -> bool:
        """Remove an operator. Owner only."""
        self._require_owner()
        if address_hex == self.owner.as_hex:
            raise gl.vm.UserError("FortiChain: cannot remove owner as operator")
        self.operators[address_hex] = False
        return True

    @gl.public.write
    def whitelist_add(self, address_hex: str) -> bool:
        """Whitelist an address for free analysis access. Operator or owner only."""
        self._require_operator()
        if len(address_hex) == 0:
            raise gl.vm.UserError("FortiChain: address required")
        self.whitelist[address_hex] = True
        return True

    @gl.public.write
    def whitelist_remove(self, address_hex: str) -> bool:
        """Remove an address from the whitelist. Operator or owner only."""
        self._require_operator()
        self.whitelist[address_hex] = False
        return True

    @gl.public.write
    def blacklist_add(self, address_hex: str) -> bool:
        """Blacklist an abusive address. Operator or owner only."""
        self._require_operator()
        if address_hex == self.owner.as_hex:
            raise gl.vm.UserError("FortiChain: cannot blacklist owner")
        self.blacklist[address_hex] = True
        return True

    @gl.public.write
    def blacklist_remove(self, address_hex: str) -> bool:
        """Remove an address from the blacklist. Operator or owner only."""
        self._require_operator()
        self.blacklist[address_hex] = False
        return True

    @gl.public.write
    def set_paused(self, paused: bool) -> bool:
        """Enable or disable the global circuit breaker. Owner only."""
        self._require_owner()
        self.paused = paused
        return True

    @gl.public.write
    def transfer_ownership(self, new_owner_address: str) -> bool:
        """Transfer contract ownership to a new address. Owner only."""
        self._require_owner()
        new_owner = Address(new_owner_address)
        if new_owner == self.owner:
            raise gl.vm.UserError("FortiChain: address is already the owner")
        new_hex = new_owner.as_hex
        self.operators[new_hex] = True
        self.whitelist[new_hex] = True
        self.owner = new_owner
        return True
