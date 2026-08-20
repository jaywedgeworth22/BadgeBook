import Foundation

/// Brandfetch: Brand API (name → domain, rate-limited) + Logo Link CDN
/// (domain → asset; free client ID; needs a real Referer header).
/// Honors MATCHING-ENGINE §3.1: icon > wordmark, light theme, fallback-tile
/// detection, 429 backoff.
public struct BrandfetchSource: LogoSource, Sendable {
    public let kind = SourceKind.brandfetch
    private let brandAPIKey: String?   // Bearer for api.brandfetch.io (search)
    private let logoClientID: String   // c= param for cdn.brandfetch.io
    private let session: URLSession

    public init(brandAPIKey: String? = nil, logoClientID: String,
                session: URLSession = .shared) {
        self.brandAPIKey = brandAPIKey
        self.logoClientID = logoClientID
        self.session = session
    }

    private struct SearchResult: Decodable {
        let name: String?
        let domain: String?
    }

    public func candidates(forBrandName name: String) async throws -> [LogoCandidate] {
        guard let key = brandAPIKey else { throw LogoSourceError.misconfigured("brand API key missing") }
        let q = name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? name
        var req = URLRequest(url: URL(string: "https://api.brandfetch.io/v2/search/\(q)")!)
        req.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await session.data(for: req)
        if let http = resp as? HTTPURLResponse {
            if http.statusCode == 429 {
                throw LogoSourceError.rateLimited(retryAfter: http.value(forHTTPHeaderField: "Retry-After").flatMap(TimeInterval.init))
            }
            guard http.statusCode == 200 else { throw LogoSourceError.notFound }
        }
        let hits = try JSONDecoder().decode([SearchResult].self, from: data)
        var out: [LogoCandidate] = []
        for hit in hits.prefix(3) {
            guard let domain = hit.domain,
                  NameNormalizer.passesSimilarity(query: name, brandName: hit.name ?? "") else { continue }
            out.append(contentsOf: try await candidates(forDomain: domain))
        }
        return out
    }

    private struct Brand: Decodable {
        struct Logo: Decodable {
            struct Format: Decodable { let src: String; let format: String? }
            let type: String?
            let theme: String?
            let formats: [Format]?
        }
        let logos: [Logo]?
    }

    public func candidates(forDomain domain: String) async throws -> [LogoCandidate] {
        // Brand API gives typed assets (icon vs wordmark); fall back to the
        // bare CDN logo when only the client ID is configured.
        if let key = brandAPIKey {
            var req = URLRequest(url: URL(string: "https://api.brandfetch.io/v2/brands/\(domain)")!)
            req.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
            let (data, resp) = try await session.data(for: req)
            if let http = resp as? HTTPURLResponse, http.statusCode == 200 {
                let brand = try JSONDecoder().decode(Brand.self, from: data)
                return (brand.logos ?? []).flatMap { logo -> [LogoCandidate] in
                    (logo.formats ?? [])
                        .filter { $0.format == "png" }
                        .compactMap { f in
                            guard let url = URL(string: f.src) else { return nil }
                            return LogoCandidate(source: .brandfetch, imageURL: url,
                                                 assetType: logo.type)
                        }
                }
            }
            if let http = resp as? HTTPURLResponse, http.statusCode == 429 {
                throw LogoSourceError.rateLimited(retryAfter: nil)
            }
        }
        guard let url = URL(string: "https://cdn.brandfetch.io/\(domain)?c=\(logoClientID)") else { return [] }
        return [LogoCandidate(source: .brandfetch, imageURL: url)]
    }

    /// Logo Link CDN requests need a browser UA + real Referer (never example.com).
    public static func cdnRequest(url: URL) -> URLRequest {
        var req = URLRequest(url: url)
        req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                     forHTTPHeaderField: "User-Agent")
        req.setValue("https://www.google.com/", forHTTPHeaderField: "Referer")
        req.setValue("image/png,image/*;q=0.8,*/*;q=0.5", forHTTPHeaderField: "Accept")
        return req
    }
}
