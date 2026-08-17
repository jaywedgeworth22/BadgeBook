import Foundation

/// DuckDuckGo + Google favicon fallbacks from Crest. Last-resort marks —
/// ranking keeps them below iconic sources so they land in Review, not Auto.
public struct FaviconSource: LogoSource, Sendable {
    public let kind = SourceKind.favicon
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func candidates(forBrandName name: String) async throws -> [LogoCandidate] {
        guard let domain = CompanyCatalog.domain(forName: name) else { return [] }
        return try await candidates(forDomain: domain)
    }

    public func candidates(forDomain domain: String) async throws -> [LogoCandidate] {
        let host = domain.lowercased()
        var out: [LogoCandidate] = []
        if let ddg = URL(string: "https://icons.duckduckgo.com/ip3/\(host).ico") {
            out.append(LogoCandidate(source: .favicon, imageURL: ddg, assetType: "icon"))
        }
        if let g = URL(string: "https://www.google.com/s2/favicons?domain=\(host)&sz=128") {
            out.append(LogoCandidate(source: .favicon, imageURL: g, assetType: "icon"))
        }
        return out
    }
}
