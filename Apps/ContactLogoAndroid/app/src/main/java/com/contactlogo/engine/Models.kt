package com.contactlogo.engine

enum class Confidence {
    HIGH,
    MEDIUM,
    LOW,
    SKIP
}

data class ContactIdentity(
    val id: String,
    val displayName: String,
    val givenName: String = "",
    val familyName: String = "",
    val organization: String = "",
    val jobTitle: String = "",
    val phoneNumbers: List<String> = emptyList(),
    val emailAddresses: List<String> = emptyList(),
    val urls: List<String> = emptyList(),
    val hasCustomPhoto: Boolean = false,
    val photoUri: String? = null
)

data class LogoCandidate(
    val url: String,
    val source: String,
    val width: Int = 512,
    val height: Int = 512,
    val isVector: Boolean = false,
    val hasAlpha: Boolean = true
)

data class MatchResult(
    val contact: ContactIdentity,
    val matchedDomain: String?,
    val confidence: Confidence,
    val candidates: List<LogoCandidate> = emptyList(),
    val selectedIndex: Int = 0,
    val approved: Boolean = false
) {
    val selectedLogo: LogoCandidate?
        get() = candidates.getOrNull(selectedIndex) ?: candidates.firstOrNull()
}

data class UndoEntry(
    val contactId: String,
    val previousPhotoBytes: ByteArray?,
    val timestamp: Long = System.currentTimeMillis()
)
