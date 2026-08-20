import Foundation

/// CompaniesLogo slug picker from `vendor/crest/src/lib/companieslogo.ts`.
/// Network fetch of the sitemap stays optional — the picker is deterministic
/// and unit-tested against a fixture catalog.
public struct CompaniesLogoSource: LogoSource, Sendable {
    public let kind = SourceKind.companiesLogo
    private let catalog: [String]
    private let session: URLSession

    static let domainSlugs: [String: String] = [
        "delta.com": "delta-air-lines",
        "united.com": "united-airlines",
        "aa.com": "american-airlines",
        "southwest.com": "southwest-airlines",
        "homedepot.com": "home-depot",
        "chase.com": "jp-morgan-chase",
        "jpmorganchase.com": "jp-morgan-chase",
        "bankofamerica.com": "bank-of-america",
        "americanexpress.com": "american-express",
        "centerpointenergy.com": "centerpoint-energy",
        "att.com": "att",
        "t-mobile.com": "t-mobile",
        "gm.com": "general-motors",
        "ge.com": "general-electric",
        "pg.com": "procter-and-gamble",
        "jnj.com": "johnson-and-johnson",
        "abc.xyz": "alphabet-google",
        "google.com": "alphabet-google",
        "meta.com": "facebook",
        "facebook.com": "facebook"
    ]

    public init(catalog: [String] = [], session: URLSession = .shared) {
        self.catalog = catalog
        self.session = session
    }

    public static func tokens(_ value: String) -> [String] {
        NameNormalizer.companyKey(value)
            .replacingOccurrences(of: "&", with: "and")
            .split { !$0.isLetter && !$0.isNumber }
            .map(String.init)
            .filter { $0.count > 1 && $0 != "the" && $0 != "and" }
    }

    public static func pickSlug(catalog: [String], domain: String?, name: String?) -> String? {
        let domain = (domain ?? "").lowercased()
        if !domain.isEmpty, let mapped = domainSlugs[domain], catalog.contains(mapped) {
            return mapped
        }
        let label = domain.split(separator: ".").first.map(String.init) ?? ""
        let nameKey = name.map { tokens($0).joined(separator: "-") } ?? ""
        if !nameKey.isEmpty, catalog.contains(nameKey) { return nameKey }
        if !label.isEmpty, catalog.contains(label) { return label }
        if !label.isEmpty {
            let prefixed = catalog.filter { $0 == label || $0.hasPrefix("\(label)-") }
            if prefixed.count == 1 { return prefixed.first }
        }
        let q = tokens(name ?? label)
        guard !q.isEmpty else { return nil }
        var best: (slug: String, score: Int)?
        for slug in catalog {
            let st = slug.split(separator: "-").map(String.init)
            let hit = q.filter { st.contains($0) }.count
            if hit == 0 { continue }
            var score = hit * 22
            if hit == q.count { score += 28 }
            if st.first == q.first { score += 12 }
            if q.count == 1, st.first == q.first { score += 16 }
            if slug == nameKey || slug == label { score += 40 }
            score -= max(0, st.count - q.count) * 5
            if best == nil || score > best!.score { best = (slug, score) }
        }
        guard let best, best.score >= 50 else { return nil }
        return best.slug
    }

    public func candidates(forBrandName name: String) async throws -> [LogoCandidate] {
        let domain = CompanyCatalog.domain(forName: name)
        return try await candidates(domain: domain, name: name)
    }

    public func candidates(forDomain domain: String) async throws -> [LogoCandidate] {
        try await candidates(domain: domain, name: nil)
    }

    private func candidates(domain: String?, name: String?) async throws -> [LogoCandidate] {
        guard !catalog.isEmpty,
              let slug = Self.pickSlug(catalog: catalog, domain: domain, name: name),
              let url = URL(string: "https://companieslogo.com/\(slug)/logo/") else { return [] }
        return [LogoCandidate(source: .companiesLogo, imageURL: url, pageURL: url,
                              assetType: "icon", altText: slug)]
    }
}
