package com.contactlogo.engine

import java.net.URI

object MatchPipeline {

    fun match(contact: ContactIdentity): MatchResult {
        // Skip if person with photo already present and not explicitly a business
        if (contact.hasCustomPhoto && contact.organization.isBlank() && isPersonName(contact.displayName)) {
            return MatchResult(contact, null, Confidence.SKIP)
        }

        val domain = resolveDomain(contact)
        if (domain == null) {
            return MatchResult(contact, null, Confidence.SKIP)
        }

        val candidates = generateCandidates(domain, contact.organization.ifBlank { contact.displayName })
        val confidence = when {
            CompanyCatalog.domainForName(contact.organization) != null ||
            CompanyCatalog.domainForName(contact.displayName) != null -> Confidence.HIGH
            contact.phoneNumbers.any { PhoneDirectory.domainForPhone(it) != null } -> Confidence.HIGH
            candidates.isNotEmpty() -> Confidence.MEDIUM
            else -> Confidence.LOW
        }

        return MatchResult(
            contact = contact,
            matchedDomain = domain,
            confidence = confidence,
            candidates = candidates,
            selectedIndex = 0,
            approved = confidence == Confidence.HIGH
        )
    }

    private fun resolveDomain(contact: ContactIdentity): String? {
        // 1. Explicit URL
        for (u in contact.urls) {
            val d = extractRegistrableDomain(u)
            if (d != null && !isFreemailOrSocial(d)) return d
        }

        // 2. Organization Name in Catalog
        if (contact.organization.isNotBlank()) {
            CompanyCatalog.domainForName(contact.organization)?.let { return it }
        }

        // 3. Display Name in Catalog
        CompanyCatalog.domainForName(contact.displayName)?.let { return it }

        // 4. Brand tail ("Byron - Root Insurance")
        val tail = Normalize.brandTail(contact.displayName)
        if (tail != null) {
            CompanyCatalog.domainForName(tail)?.let { return it }
        }

        // 5. Phone directory
        for (p in contact.phoneNumbers) {
            PhoneDirectory.domainForPhone(p)?.let { return it }
        }

        // 6. Email domain
        for (e in contact.emailAddresses) {
            val parts = e.split("@")
            if (parts.size == 2) {
                val d = parts[1].trim().lowercase()
                if (!isFreemailOrSocial(d)) return d
            }
        }

        return null
    }

    private fun generateCandidates(domain: String, brandName: String): List<LogoCandidate> {
        val candidates = mutableListOf<LogoCandidate>()
        val baseSlug = domain.replace(Regex("""\.[a-z]{2,}$"""), "").replace(Regex("""[^a-z0-9]"""), "")

        // 1. Google Favicon high-res
        candidates.add(
            LogoCandidate(
                url = "https://www.google.com/s2/favicons?domain=$domain&sz=128",
                source = "google_favicon",
                width = 128,
                height = 128,
                isVector = false
            )
        )

        // 2. SimpleIcons SVG / PNG
        if (baseSlug.isNotBlank()) {
            candidates.add(
                LogoCandidate(
                    url = "https://cdn.simpleicons.org/$baseSlug",
                    source = "simple_icons",
                    width = 512,
                    height = 512,
                    isVector = true
                )
            )
        }

        // 3. Direct Favicon
        candidates.add(
            LogoCandidate(
                url = "https://$domain/favicon.ico",
                source = "favicon_direct",
                width = 64,
                height = 64,
                isVector = false
            )
        )

        return candidates
    }

    private fun extractRegistrableDomain(url: String): String? {
        return try {
            val normalized = if (!url.startsWith("http://") && !url.startsWith("https://")) "https://$url" else url
            val uri = URI(normalized)
            uri.host?.lowercase()?.removePrefix("www.")
        } catch (_: Exception) {
            null
        }
    }

    private fun isFreemailOrSocial(domain: String): Boolean {
        val blocked = setOf(
            "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com",
            "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com"
        )
        return blocked.contains(domain)
    }

    private fun isPersonName(name: String): Boolean {
        val parts = name.trim().split(Regex("""\s+"""))
        return parts.size == 2 && parts.all { it.firstOrNull()?.isUpperCase() == true }
    }
}
