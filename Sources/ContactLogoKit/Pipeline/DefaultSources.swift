import Foundation

/// Shared source list for the CLI, macOS, and iOS.  Order matches
/// MATCHING-ENGINE.md §3 (preferred → Simple Icons → CompaniesLogo →
/// Wikimedia → favicon; Brandfetch inserted when a client id is present).
public enum DefaultSources {
    public static func env(_ key: String) -> String? {
        let value = ProcessInfo.processInfo.environment[key]
        return (value?.isEmpty == false) ? value : nil
    }

    public static func logoSources(
        brandfetchClientID: String? = Self.env("CONTACTLOGO_BRANDFETCH_CLIENT_ID"),
        brandfetchAPIKey: String? = Self.env("CONTACTLOGO_BRANDFETCH_API_KEY")
    ) -> [any LogoSource] {
        var sources: [any LogoSource] = [
            PreferredMarksSource(),
            SimpleIconsSource(),
            CompaniesLogoSource(),
            WikimediaSource(),
            FaviconSource()
        ]
        if let id = brandfetchClientID {
            sources.insert(
                BrandfetchSource(brandAPIKey: brandfetchAPIKey, logoClientID: id),
                at: 1
            )
        }
        return sources
    }

    public static func fetchImage(_ url: URL) async throws -> Data {
        if url.scheme == "data" { return try Data(contentsOf: url) }
        let req = BrandfetchSource.cdnRequest(url: url)
        let (data, _) = try await URLSession.shared.data(for: req)
        return data
    }

    public static func makePipeline(
        brandfetchClientID: String? = Self.env("CONTACTLOGO_BRANDFETCH_CLIENT_ID"),
        brandfetchAPIKey: String? = Self.env("CONTACTLOGO_BRANDFETCH_API_KEY")
    ) -> MatchPipeline {
        MatchPipeline(
            sources: logoSources(
                brandfetchClientID: brandfetchClientID,
                brandfetchAPIKey: brandfetchAPIKey
            ),
            fetchImage: fetchImage
        )
    }
}
