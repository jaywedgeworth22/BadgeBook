import Foundation

/// MATCHING-ENGINE §4 (junk domains): derive a usable brand domain from a
/// contact's URLs and email addresses — or conclude there isn't one.
/// Contract: `websiteHosts` must contain hosts of http(s) URLs only; shells
/// must drop non-web schemes (`ms-outlook:`, `tel:` …) before calling.
public enum DomainDeriver {

    static let freemail: Set<String> = [
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
        "me.com", "mac.com", "aol.com", "live.com", "msn.com", "qq.com",
        "163.com", "126.com", "foxmail.com", "protonmail.com", "proton.me",
        "pm.me", "gmx.com", "mail.com", "comcast.net", "verizon.net", "att.net",
        "sbcglobal.net", "ymail.com", "googlemail.com", "hey.com", "fastmail.com",
        "zoho.com", "yandex.com", "mail.ru", "gnail.com", "hoymail.com"
    ]

    /// Profile/social hosts — a linkedin.com URL must never yield a LinkedIn logo.
    static let social: Set<String> = [
        "linkedin.com", "facebook.com", "twitter.com", "x.com", "instagram.com",
        "youtube.com", "crunchbase.com", "wikipedia.org", "yelp.com",
        "tripadvisor.com", "glassdoor.com", "tiktok.com", "pinterest.com",
        "reddit.com", "bloomberg.com", "vimeo.com", "medium.com", "github.com",
        "foursquare.com", "weibo.com", "fb.com", "apple.news"
    ]

    /// Registrable domain: strips userinfo, www., and common ccTLD second levels.
    public static func registrableDomain(of host: String) -> String? {
        var h = host.lowercased()
        if let at = h.lastIndex(of: "@") { h = String(h[h.index(after: at)...]) } // userinfo
        h = h.replacingOccurrences(of: #"%[0-9a-fA-F]{2}"#, with: "", options: .regularExpression)
        h = h.trimmingCharacters(in: CharacterSet(charactersIn: "."))
        if h.hasPrefix("www.") { h.removeFirst(4) }
        let parts = h.split(separator: ".").map(String.init).filter { !$0.isEmpty }
        guard parts.count >= 2 else { return nil }
        if parts.count > 2 {
            let last2 = parts.suffix(2).joined(separator: ".")
            if last2.range(of: #"^(com|co|org|net|gov|edu|ac)\.[a-z]{2}$"#, options: .regularExpression) != nil {
                return parts.suffix(3).joined(separator: ".")
            }
        }
        return parts.suffix(2).joined(separator: ".")
    }

    /// Priority: first usable website host, then first non-freemail email domain.
    public static func derive(websiteHosts: [String], emailDomains: [String]) -> String? {
        for host in websiteHosts {
            guard let d = registrableDomain(of: host),
                  !freemail.contains(d), !social.contains(d) else { continue }
            return d
        }
        for host in emailDomains {
            guard let d = registrableDomain(of: host), !freemail.contains(d) else { continue }
            return d
        }
        return nil
    }
}
