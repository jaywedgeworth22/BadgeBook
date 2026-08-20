import Foundation

/// How a brand domain was obtained. Ported from vendor/crest identity (`via`) and
/// kept as review-UI context — guessed domains never auto-apply.
public enum IdentityVia: String, Sendable {
    case website, email, catalog, phone, guess
}

public struct ResolvedIdentity: Sendable, Equatable {
    public let domain: String
    public let via: IdentityVia

    public init(domain: String, via: IdentityVia) {
        self.domain = domain
        self.via = via
    }
}

/// Fast local resolve: website → work email → company catalog → phone.
/// Last-resort `{name}.com` guess is preserved but flagged so the
/// pipeline caps it at MEDIUM (review-first).
public enum IdentityResolver {

    public static func resolve(_ c: ContactIdentity, brandName: String) -> ResolvedIdentity? {
        if let host = DomainDeriver.derive(websiteHosts: c.websiteHosts, emailDomains: []) {
            return ResolvedIdentity(domain: host, via: .website)
        }
        if let host = DomainDeriver.derive(websiteHosts: [], emailDomains: c.emailDomains) {
            return ResolvedIdentity(domain: host, via: .email)
        }
        if let catalog = CompanyCatalog.domain(forName: brandName)
            ?? c.organization.flatMap(CompanyCatalog.domain(forName:))
            ?? CompanyCatalog.domain(forName: c.displayName) {
            return ResolvedIdentity(domain: catalog, via: .catalog)
        }
        for phone in c.phoneNumbers {
            if let d = PhoneDirectory.domain(forPhone: phone) {
                return ResolvedIdentity(domain: d, via: .phone)
            }
        }
        if let guessed = guessDomain(brandName) {
            return ResolvedIdentity(domain: guessed, via: .guess)
        }
        return nil
    }

    /// Guessed domain: only when the cleaned key looks like a brand slug.
    /// Never treated as HIGH confidence by the pipeline.
    public static func guessDomain(_ name: String) -> String? {
        if let known = CompanyCatalog.domain(forName: name) { return known }
        let key = NameNormalizer.companyKey(name)
            .replacingOccurrences(of: "&", with: "and")
            .replacingOccurrences(of: #"[^a-z0-9]+"#, with: "", options: .regularExpression)
        guard (3...24).contains(key.count) else { return nil }
        return "\(key).com"
    }
}
