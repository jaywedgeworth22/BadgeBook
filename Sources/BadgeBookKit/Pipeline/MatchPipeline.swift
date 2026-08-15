import Foundation

/// Orchestrates classification → normalization → sources → ranking.
/// Deterministic for a fixed source set (ARCHITECTURE: one engine, three shells).
public struct MatchPipeline: Sendable {
    private let sources: [any LogoSource]
    private let fetchImage: @Sendable (URL) async throws -> Data

    public init(sources: [any LogoSource],
                fetchImage: @escaping @Sendable (URL) async throws -> Data) {
        self.sources = sources
        self.fetchImage = fetchImage
    }

    public func classify(_ c: ContactIdentity) -> ContactClass {
        let hasPersonName = !(c.givenName ?? "").isEmpty || !(c.familyName ?? "").isEmpty
        if hasPersonName { return .person }
        let cleaned = NameNormalizer.clean(c.organization?.isEmpty == false ? c.organization! : c.displayName)
        if GenericBlocklist.isGeneric(cleaned) { return .nonBrand }
        return .businessCard
    }

    public func match(_ c: ContactIdentity) async -> MatchResult {
        let klass = classify(c)
        guard klass != .nonBrand else {
            return MatchResult(contactID: c.id, contactClass: klass, candidates: [], confidence: .skip, flags: ["non-brand"])
        }
        if klass == .person, c.hasImage {
            return MatchResult(contactID: c.id, contactClass: klass, candidates: [], confidence: .skip, flags: ["photo-protected"])
        }

        let rawName = c.organization?.isEmpty == false ? c.organization! : c.displayName
        var query = NameNormalizer.clean(rawName)
        var flags: [String] = []
        if let tail = NameNormalizer.brandTail(rawName) { query = tail; flags.append("brand-tail") }
        if GenericBlocklist.isHomonymRisk(query) { flags.append("homonym-risk") }

        let domain = DomainDeriver.derive(websiteHosts: c.websiteHosts, emailDomains: c.emailDomains)

        var raw: [LogoCandidate] = []
        if let domain {
            for s in sources {
                if let found = try? await s.candidates(forDomain: domain) { raw.append(contentsOf: found) }
            }
        }
        if raw.isEmpty {
            for s in sources {
                if let found = try? await s.candidates(forBrandName: query) { raw.append(contentsOf: found) }
            }
        }

        // Fill in dimensions for the square rule when cheap to do so.
        var measured: [LogoCandidate] = []
        for var cand in raw {
            if cand.pixelWidth == nil, let data = try? await fetchImage(cand.imageURL),
               let (w, h) = ImageDimensions.read(data) {
                cand.pixelWidth = w; cand.pixelHeight = h
            }
            measured.append(cand)
        }

        let ranked = CandidateRanker.rank(measured)
        let best = ranked.first
        let similarityOK = best.map { NameNormalizer.passesSimilarity(query: query, brandName: $0.altText ?? query) } ?? false
        let conf = CandidateRanker.confidence(for: best,
                                              nameSimilarityPassed: similarityOK,
                                              homonymRisk: flags.contains("homonym-risk"),
                                              domainAgrees: domain != nil)
        return MatchResult(contactID: c.id, contactClass: klass, candidates: ranked,
                           confidence: conf, flags: flags)
    }
}
