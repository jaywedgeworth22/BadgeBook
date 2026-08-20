import Foundation

/// MATCHING-ENGINE §2: turn a raw display name into a search-safe brand query.
public enum NameNormalizer {

    /// Legal suffixes stripped before catalog lookup ("Apple Inc" → "Apple").
    static let legalSuffix = try! NSRegularExpression(
        pattern: #"\s*,?\s*(inc\.?|incorporated|llc|l\.l\.c\.?|ltd\.?|limited|corp\.?|corporation|co\.?|company|gmbh|ag|plc|holdings|group|llc\.|p\.c\.|llp)\s*$"#,
        options: .caseInsensitive
    )

    /// "Walgreens (Mason Rd / Cypress)" → "Walgreens"
    public static func clean(_ raw: String) -> String {
        var s = raw
        // Drop store locations in (), [], {}
        s = s.replacingOccurrences(of: #"\s*[\(\[\{][^)\]\}]*[\)\]\}]"#, with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        s = s.trimmingCharacters(in: CharacterSet(charactersIn: " -–—,"))
        return s
    }

    /// Catalog key: cleaned, legal-suffix-stripped, lowercased.
    public static func companyKey(_ raw: String) -> String {
        var s = clean(raw)
        let range = NSRange(s.startIndex..., in: s)
        s = legalSuffix.stringByReplacingMatches(in: s, options: [], range: range, withTemplate: "")
        s = s.replacingOccurrences(of: ".", with: "")
        s = s.replacingOccurrences(of: ",", with: "")
        s = s.replacingOccurrences(of: "'", with: "")
        s = s.replacingOccurrences(of: "’", with: "")
        s = s.replacingOccurrences(of: "\"", with: "")
        s = s.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        return s.lowercased().trimmingCharacters(in: .whitespaces)
    }

    /// Brand-tail detection: "Byron Goode Jr - Root Insurance" → "Root Insurance",
    /// "Chris At NTB" → "NTB" (MATCHING-ENGINE §5 rule 8).
    /// Returns nil when there is no usable tail.
    public static func brandTail(_ raw: String) -> String? {
        let head: String, tail: String
        if let dash = raw.range(of: #"\s+[-–—]\s+"#, options: .regularExpression) {
            head = String(raw[raw.startIndex..<dash.lowerBound]).trimmingCharacters(in: CharacterSet.whitespaces)
            tail = String(raw[dash.upperBound...]).trimmingCharacters(in: CharacterSet.whitespaces)
            guard !tail.contains(" - ") else { return nil }
        } else if let at = raw.range(of: #"\s+[Aa]t\s+"#, options: .regularExpression) {
            head = String(raw[raw.startIndex..<at.lowerBound]).trimmingCharacters(in: CharacterSet.whitespaces)
            tail = String(raw[at.upperBound...]).trimmingCharacters(in: CharacterSet.whitespaces)
        } else {
            return nil
        }
        // head looks like a person ("Chris At", "Byron Goode Jr") → trust the tail
        let headWords = head.split(separator: " ").count
        guard (1...4).contains(headWords), tail.split(separator: " ").count <= 5 else { return nil }
        return tail
    }

    /// Similarity gate (§5.5): normalized brand must share a token with the query.
    public static func passesSimilarity(query: String, brandName: String) -> Bool {
        func norm(_ s: String) -> String {
            s.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted).joined()
        }
        let q = norm(query), b = norm(brandName)
        if !q.isEmpty, !b.isEmpty, q.contains(b) || b.contains(q) { return true }
        let qw = Set(query.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty })
        let bw = Set(brandName.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty })
        return !qw.isDisjoint(with: bw)
    }
}
