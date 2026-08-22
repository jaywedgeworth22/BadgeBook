import Foundation

/// Wikimedia Commons: great for major corporate wordmarks ("File:Exxon logo.svg").
/// Send a descriptive UA — upload.wikimedia.org rejects bot-y ones (§3.2).
public struct WikimediaSource: LogoSource, Sendable {
    public let kind = SourceKind.wikimedia
    private let session: URLSession
    private let userAgent: String

    public init(userAgent: String = "BadgeBook/1.0 (contact: support@badgebook.app)",
                session: URLSession = .shared) {
        self.userAgent = userAgent
        self.session = session
    }

    private struct SearchResponse: Decodable {
        struct Query: Decodable {
            struct Hit: Decodable { let title: String }
            let search: [Hit]
        }
        let query: Query
    }
    private struct InfoResponse: Decodable {
        struct Query: Decodable {
            struct Page: Decodable {
                struct Info: Decodable { let thumburl: String?; let url: String? }
                let imageinfo: [Info]?
            }
            let pages: [String: Page]
        }
        let query: Query
    }

    public func candidates(forDomain domain: String) async throws -> [LogoCandidate] {
        try await candidates(forBrandName: domain.replacingOccurrences(of: ".com", with: ""))
    }

    public func candidates(forBrandName name: String) async throws -> [LogoCandidate] {
        // intitle: search — plain "Walmart logo" matches photo descriptions,
        // not file titles (dogfood lesson).
        let quoted = name.replacingOccurrences(of: "\"", with: "")
        let query = "intitle:\(quoted) intitle:logo".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
        guard let searchURL = URL(string:
            "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=\(query)&srnamespace=6&format=json&srlimit=5") else { return [] }
        var req = URLRequest(url: searchURL)
        req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        let (data, _) = try await session.data(for: req)
        let hits = try JSONDecoder().decode(SearchResponse.self, from: data).query.search

        var out: [LogoCandidate] = []
        for hit in hits.prefix(3) where hit.title.hasPrefix("File:") {
            let lower = hit.title.lowercased()
            guard lower.contains("logo") || lower.contains("icon") else { continue }
            let title = hit.title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? hit.title
            guard let infoURL = URL(string:
                "https://commons.wikimedia.org/w/api.php?action=query&titles=\(title)&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json") else { continue }
            var ireq = URLRequest(url: infoURL)
            ireq.setValue(userAgent, forHTTPHeaderField: "User-Agent")
            guard let (idata, _) = try? await session.data(for: ireq),
                  let page = try? JSONDecoder().decode(InfoResponse.self, from: idata).query.pages.values.first,
                  let info = page.imageinfo?.first,
                  let thumb = info.thumburl ?? info.url,
                  let url = URL(string: thumb) else { continue }
            out.append(LogoCandidate(source: .wikimedia, imageURL: url,
                                     assetType: lower.contains("icon") ? "icon" : "logo",
                                     altText: hit.title))
        }
        return out
    }
}
