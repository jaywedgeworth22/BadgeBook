import Foundation

/// Curated square/round iconic marks — Crest used these when generic sources
/// returned a wordmark (Delta's triangle, not "DELTA" lettering).
public struct PreferredMarksSource: LogoSource, Sendable {
    public let kind = SourceKind.preferred

    /// Domain → SVG. Keep this table small and hand-reviewed.
    static let marks: [String: String] = [
        "delta.com": """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 443.13 354"><polygon fill="#E31937" points="16.25,316.21 221.56,0 221.56,217.38"/><polygon fill="#E31937" points="0,354 221.56,354 221.56,260.39"/><polygon fill="#98002E" points="221.56,217.38 221.56,0 426.87,316.21"/><polygon fill="#98002E" points="221.56,260.39 221.56,354 443.13,354"/></svg>
        """
    ]

    public init() {}

    public static func svg(for domain: String) -> String? {
        marks[domain.lowercased()]
    }

    public func candidates(forBrandName name: String) async throws -> [LogoCandidate] {
        guard let domain = CompanyCatalog.domain(forName: name) else { return [] }
        return try await candidates(forDomain: domain)
    }

    public func candidates(forDomain domain: String) async throws -> [LogoCandidate] {
        guard let svg = Self.svg(for: domain) else { return [] }
        let encoded = Data(svg.utf8).base64EncodedString()
        guard let url = URL(string: "data:image/svg+xml;base64,\(encoded)") else { return [] }
        return [LogoCandidate(source: .preferred, imageURL: url, assetType: "icon",
                              altText: domain, hasAlpha: true)]
    }
}
