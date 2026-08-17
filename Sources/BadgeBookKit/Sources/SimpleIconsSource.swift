import Foundation

/// Simple Icons CDN — Crest's preferred transparent mark after curated icons.
/// Slug map ported from `vendor/crest/src/routes/api/logo.ts`.
public struct SimpleIconsSource: LogoSource, Sendable {
    public let kind = SourceKind.simpleIcons
    private let session: URLSession

    /// SI slugs that are a different brand (Delta the software company ≠ airline).
    static let skip: Set<String> = ["delta.com"]

    static let slugs: [String: String] = [
        "apple.com": "apple", "google.com": "google", "microsoft.com": "microsoft",
        "amazon.com": "amazon", "meta.com": "meta", "facebook.com": "facebook",
        "instagram.com": "instagram", "tesla.com": "tesla", "nvidia.com": "nvidia",
        "netflix.com": "netflix", "spotify.com": "spotify", "adobe.com": "adobe",
        "salesforce.com": "salesforce", "oracle.com": "oracle", "ibm.com": "ibm",
        "intel.com": "intel", "cisco.com": "cisco", "stripe.com": "stripe",
        "paypal.com": "paypal", "visa.com": "visa", "mastercard.com": "mastercard",
        "americanexpress.com": "americanexpress", "chase.com": "jpmorgan",
        "jpmorganchase.com": "jpmorgan", "bankofamerica.com": "bankofamerica",
        "wellsfargo.com": "wellsfargo", "citi.com": "citigroup", "geico.com": "geico",
        "statefarm.com": "statefarm", "verizon.com": "verizon", "att.com": "atandt",
        "t-mobile.com": "tmobile", "united.com": "unitedairlines",
        "aa.com": "americanairlines", "southwest.com": "southwestairlines",
        "fedex.com": "fedex", "ups.com": "ups", "usps.com": "usps",
        "homedepot.com": "homedepot", "lowes.com": "lowe's", "costco.com": "costco",
        "walmart.com": "walmart", "target.com": "target", "starbucks.com": "starbucks",
        "mcdonalds.com": "mcdonalds", "uber.com": "uber", "lyft.com": "lyft",
        "doordash.com": "doordash", "airbnb.com": "airbnb", "nike.com": "nike",
        "samsung.com": "samsung", "sony.com": "sony", "ford.com": "ford",
        "bmw.com": "bmw", "usaa.com": "usaa",
        "centerpointenergy.com": "centerpointenergy", "x.ai": "x",
        "squareup.com": "square"
    ]

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public static func slug(for domain: String) -> String {
        if let mapped = slugs[domain.lowercased()] { return mapped }
        return domain.split(separator: ".").first.map(String.init) ?? domain
    }

    public static func url(for domain: String) -> URL? {
        let slug = slug(for: domain)
        let encoded = slug.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? slug
        return URL(string: "https://cdn.simpleicons.org/\(encoded)")
    }

    public func candidates(forBrandName name: String) async throws -> [LogoCandidate] {
        guard let domain = CompanyCatalog.domain(forName: name) else { return [] }
        return try await candidates(forDomain: domain)
    }

    public func candidates(forDomain domain: String) async throws -> [LogoCandidate] {
        let host = domain.lowercased()
        if Self.skip.contains(host) { return [] }
        guard let url = Self.url(for: host) else { return [] }
        return [LogoCandidate(source: .simpleIcons, imageURL: url, assetType: "icon", hasAlpha: true)]
    }
}
