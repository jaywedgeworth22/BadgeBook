package com.contactlogo.engine

import java.util.Locale

object Normalize {
    private val storeLocationRegex = Regex(
        """\s*[\(\[-]\s*(?:store|branch|location|#?\d+|mason|cypress|houston|austin|dallas|tx|usa|ave|rd|st|blvd|hwy|pkwy).*""",
        RegexOption.IGNORE_CASE
    )

    private val legalSuffixRegex = Regex(
        """\s*,?\s*\b(inc|corp|corporation|llc|ltd|limited|co|company|group|holdings|services|solutions|plc|n\.a\.|na)\b\.?""",
        RegexOption.IGNORE_CASE
    )

    fun cleanName(raw: String): String {
        var s = raw.trim()
        s = s.replace(storeLocationRegex, "").trim()
        s = s.replace(legalSuffixRegex, "").trim()
        return s
    }

    fun companyKey(raw: String): String {
        return cleanName(raw)
            .lowercase(Locale.ROOT)
            .replace(Regex("""[^a-z0-9\s&]"""), "")
            .replace(Regex("""\s+"""), " ")
            .trim()
    }

    fun brandTail(raw: String): String? {
        val trimmed = raw.trim()
        val atMatch = Regex("""\b(?:at|@)\s+([A-Za-z0-9 &.'-]+)$""", RegexOption.IGNORE_CASE).find(trimmed)
        if (atMatch != null) return atMatch.groupValues[1].trim()

        val dashMatch = Regex("""[-–—]\s*([A-Za-z0-9 &.'-]+)$""").find(trimmed)
        if (dashMatch != null) return dashMatch.groupValues[1].trim()

        return null
    }

    fun passesSimilarity(target: String, candidate: String): Boolean {
        val t = target.lowercase(Locale.ROOT).replace(Regex("""[^a-z0-9]"""), "")
        val c = candidate.lowercase(Locale.ROOT).replace(Regex("""[^a-z0-9]"""), "")
        if (t.isEmpty() || c.isEmpty()) return false
        return t.contains(c) || c.contains(t)
    }
}
