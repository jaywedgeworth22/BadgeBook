import Foundation

/// MATCHING-ENGINE §2: turn a raw display name into a search-safe brand query.
public enum NameNormalizer {

    /// "Walgreens (Mason Rd / Cypress)" → "Walgreens"
    public static func clean(_ raw: String) -> String {
        var s = raw
        // strip parentheticals (location qualifiers, device models)
        while let range = s.range(of: #"\s*\([^)]*\)"#, options: .regularExpression) {
            s.removeSubrange(range)
        }
        s = s.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        s = s.trimmingCharacters(in: CharacterSet(charactersIn: " -–—,"))
        return s
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
