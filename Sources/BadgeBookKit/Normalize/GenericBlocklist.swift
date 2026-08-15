import Foundation

/// MATCHING-ENGINE §1 (non-brand) + §4 (generic nouns, devices, services).
/// A wrong logo is worse than none — these never reach a logo source.
public enum GenericBlocklist {

    /// Exact (cleaned) names that are never brands.
    static let genericExact: Set<String> = [
        "hospital", "gift card", "manager", "market manager", "medico", "jerry",
        "verification", "verification code", "verification codes", "candy",
        "link", "cash", "info", "office", "reception", "front desk"
    ]

    /// Patterns that mark devices/services rather than brands.
    static let nonBrandPatterns: [String] = [
        #"(?i)\bprinter\b"#,                 // "Printer at Farm (WF-2950)"
        #"(?i)\bWF-\d{4}\b"#,                // printer model numbers
        #"(?i)\bverification\b"#,
        #"(?i)\bpassword\b|\bpasscode\b"#
    ]

    /// Homonym risk: known brand, but wrong-category matches are common.
    /// Forces MEDIUM confidence max (§4) unless an email/website domain agrees.
    static let homonymRisk: Set<String> = [
        "ibc", "mercury", "delta", "apple", "amazon", "carnival", "empower",
        "link", "jerry", "candy", "pioneer", "united", "premier"
    ]

    public static func isGeneric(_ cleanedName: String) -> Bool {
        let n = cleanedName.lowercased()
        if genericExact.contains(n) { return true }
        return nonBrandPatterns.contains { n.range(of: $0, options: .regularExpression) != nil }
    }

    public static func isHomonymRisk(_ cleanedName: String) -> Bool {
        homonymRisk.contains(cleanedName.lowercased())
    }
}
