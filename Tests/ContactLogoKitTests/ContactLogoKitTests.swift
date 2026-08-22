import XCTest
@testable import ContactLogoKit

final class NameNormalizerTests: XCTestCase {
    func testStripsParentheticals() {
        XCTAssertEqual(NameNormalizer.clean("Walgreens (Mason Rd / Cypress)"), "Walgreens")
        XCTAssertEqual(NameNormalizer.clean("H-E-B Pharmacy (Bridgeland)"), "H-E-B Pharmacy")
        XCTAssertEqual(NameNormalizer.clean("Printer at Farm (WF-2950)"), "Printer at Farm")
    }
    func testBrandTail() {
        XCTAssertEqual(NameNormalizer.brandTail("Chris At NTB"), "NTB")
        XCTAssertEqual(NameNormalizer.brandTail("Byron Goode Jr - Root Insurance"), "Root Insurance")
        XCTAssertNil(NameNormalizer.brandTail("FedEx"))
    }
    func testSimilarityGate() {
        XCTAssertTrue(NameNormalizer.passesSimilarity(query: "Cash App", brandName: "Cash App"))
        XCTAssertFalse(NameNormalizer.passesSimilarity(query: "Cash App", brandName: "Bread Zine"))
    }
}

final class DomainDeriverTests: XCTestCase {
    func testSkipsFreemailAndSocial() {
        XCTAssertNil(DomainDeriver.derive(websiteHosts: ["linkedin.com"], emailDomains: ["gmail.com"]))
        XCTAssertNil(DomainDeriver.derive(websiteHosts: ["people"], emailDomains: [])) // ms-outlook://people/... junk
        XCTAssertEqual(DomainDeriver.derive(websiteHosts: ["people"], emailDomains: ["frostbank.com"]), "frostbank.com")
        XCTAssertEqual(DomainDeriver.derive(websiteHosts: ["www.h-e-b.com"], emailDomains: []), "h-e-b.com")
    }
    func testRegistrable() {
        XCTAssertEqual(DomainDeriver.registrableDomain(of: "mail.utexas.edu"), "utexas.edu")
        XCTAssertEqual(DomainDeriver.registrableDomain(of: "doug@texasdescon.com"), "texasdescon.com")
        XCTAssertEqual(DomainDeriver.registrableDomain(of: "shop.example.co.uk"), "example.co.uk")
    }
}

final class RankerTests: XCTestCase {
    private func cand(w: Int, h: Int, type: String? = nil, source: SourceKind = .brandfetch) -> LogoCandidate {
        LogoCandidate(source: source, imageURL: URL(string: "https://cdn.example.com/x.png")!,
                      pixelWidth: w, pixelHeight: h, assetType: type)
    }
    func testSquareIconWins() {
        let wideWordmark = cand(w: 731, h: 208, type: "logo")   // the Walgreens trap
        let squareIcon = cand(w: 400, h: 400, type: "icon")
        let ranked = CandidateRanker.rank([wideWordmark, squareIcon])
        XCTAssertEqual(ranked.first?.pixelWidth, 400)
    }
    func testConfidenceHomonymCap() {
        let icon = cand(w: 400, h: 400, type: "icon")
        XCTAssertEqual(CandidateRanker.confidence(for: icon, nameSimilarityPassed: true,
                                                  homonymRisk: true, domainAgrees: false), .medium)
        XCTAssertEqual(CandidateRanker.confidence(for: icon, nameSimilarityPassed: true,
                                                  homonymRisk: true, domainAgrees: true), .high)
    }
}

final class BlocklistTests: XCTestCase {
    func testGenericAndDevices() {
        XCTAssertTrue(GenericBlocklist.isGeneric("Hospital"))
        XCTAssertTrue(GenericBlocklist.isGeneric("Verification Code"))
        XCTAssertTrue(GenericBlocklist.isGeneric("Printer at Farm"))
        XCTAssertFalse(GenericBlocklist.isGeneric("Walgreens"))
    }
}

final class CompanyCatalogTests: XCTestCase {
    func testKnownBrands() {
        XCTAssertEqual(CompanyCatalog.domain(forName: "Walgreens"), "walgreens.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Apple Inc"), "apple.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "H-E-B"), "heb.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "The Home Depot"), "homedepot.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Charles Schwab"), "schwab.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Kroger"), "kroger.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Kaiser Permanente"), "kp.org")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Buc-ee's"), "buc-ees.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Spectrum"), "spectrum.com")
    }
    func testLocationTail() {
        XCTAssertEqual(CompanyCatalog.domain(forName: "Walgreens Mason Rd"), "walgreens.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Walgreens (Mason Rd in Cypress)"), "walgreens.com")
        XCTAssertEqual(CompanyCatalog.domain(forName: "Kroger Marketplace Cypress"), "kroger.com")
    }
    func testUnknown() {
        XCTAssertNil(CompanyCatalog.domain(forName: "Maya Chen"))
    }
}

final class PhoneDirectoryTests: XCTestCase {
    func testPublishedNumbers() {
        XCTAssertEqual(PhoneDirectory.domain(forPhone: "1-800-221-1212"), "delta.com")
        XCTAssertEqual(PhoneDirectory.domain(forPhone: "(800) 925-4733"), "walgreens.com")
        XCTAssertTrue(PhoneDirectory.isBusinessPhone("800-463-3339"))
        XCTAssertFalse(PhoneDirectory.isBusinessPhone("(713) 555-0142"))
    }
}

final class IdentityResolverTests: XCTestCase {
    func testWebsiteBeatsCatalog() {
        let c = ContactIdentity(id: "1", displayName: "Delta", websiteHosts: ["delta.com"])
        let hit = IdentityResolver.resolve(c, brandName: "Delta")
        XCTAssertEqual(hit?.via, .website)
        XCTAssertEqual(hit?.domain, "delta.com")
    }
    func testCatalogWhenNoSite() {
        let c = ContactIdentity(id: "1", displayName: "FedEx")
        let hit = IdentityResolver.resolve(c, brandName: "FedEx")
        XCTAssertEqual(hit?.via, .catalog)
        XCTAssertEqual(hit?.domain, "fedex.com")
    }
    func testPhoneWhenNoName() {
        let c = ContactIdentity(id: "1", displayName: "Customer Service",
                                phoneNumbers: ["800-463-3339"])
        let hit = IdentityResolver.resolve(c, brandName: "Customer Service")
        XCTAssertEqual(hit?.via, .phone)
        XCTAssertEqual(hit?.domain, "fedex.com")
    }
    func testGuessIsFlagged() {
        let c = ContactIdentity(id: "1", displayName: "Acme Widgets LLC")
        let hit = IdentityResolver.resolve(c, brandName: "Acme Widgets")
        XCTAssertEqual(hit?.via, .guess)
        XCTAssertEqual(hit?.domain, "acmewidgets.com")
    }
}

final class ClassificationTests: XCTestCase {
    let pipeline = MatchPipeline(sources: [], fetchImage: { _ in Data() })

    func testPersonStaysPerson() {
        let c = ContactIdentity(id: "1", displayName: "Maya Chen",
                                givenName: "Maya", familyName: "Chen",
                                organization: "Apple", emailDomains: ["hey.com"])
        XCTAssertEqual(pipeline.classify(c), .person)
    }
    func testLoneGivenNameThatIsAFirm() {
        let c = ContactIdentity(id: "1", displayName: "Walgreens",
                                givenName: "Walgreens")
        XCTAssertEqual(pipeline.classify(c), .businessCard)
    }
    func testGenericStillSkipped() {
        let c = ContactIdentity(id: "1", displayName: "Hospital")
        XCTAssertEqual(pipeline.classify(c), .nonBrand)
    }
    func testPersonIsSkippedEvenWithOrg() async {
        let c = ContactIdentity(id: "1", displayName: "Maya Chen",
                                givenName: "Maya", familyName: "Chen",
                                organization: "Apple")
        let result = await pipeline.match(c)
        XCTAssertEqual(result.confidence, .skip)
        XCTAssertTrue(result.flags.contains("person"))
    }
}

final class SimpleIconsTests: XCTestCase {
    func testSlugMapAndDeltaSkip() {
        XCTAssertEqual(SimpleIconsSource.slug(for: "chase.com"), "jpmorgan")
        XCTAssertEqual(SimpleIconsSource.slug(for: "att.com"), "atandt")
        XCTAssertNotNil(SimpleIconsSource.url(for: "fedex.com"))
    }
}

final class CompaniesLogoPickerTests: XCTestCase {
    func testPicksMappedAndNamedSlugs() {
        let catalog = ["delta-air-lines", "walgreens", "home-depot", "jp-morgan-chase"]
        XCTAssertEqual(
            CompaniesLogoSource.pickSlug(catalog: catalog, domain: "delta.com", name: "Delta"),
            "delta-air-lines"
        )
        XCTAssertEqual(
            CompaniesLogoSource.pickSlug(catalog: catalog, domain: nil, name: "Walgreens"),
            "walgreens"
        )
        XCTAssertEqual(
            CompaniesLogoSource.pickSlug(catalog: catalog, domain: "homedepot.com", name: "Home Depot"),
            "home-depot"
        )
    }
    func testPickIconHrefPrefersSvg() {
        let html = """
        <img src="/img/orig/Walgreens_big.png"><img src="/img/orig/Walgreens.svg">
        """
        XCTAssertEqual(
            CompaniesLogoSource.pickIconHref(html),
            "https://companieslogo.com/img/orig/Walgreens.svg"
        )
    }
}

final class ImageFlagsTests: XCTestCase {
    func testPNGColorType6HasAlpha() {
        // Minimal IHDR: color type 6 (RGBA) at byte 25.
        var png = Data([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
        png.append(contentsOf: [0, 0, 0, 13]) // length
        png.append(contentsOf: Array("IHDR".utf8))
        png.append(contentsOf: [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])
        XCTAssertTrue(ImageFlags.pngHasAlpha(png))
    }
    func testTinyFileRejected() {
        XCTAssertTrue(ImageFlags.isTooSmall(Data(repeating: 0, count: 20)))
        XCTAssertFalse(ImageFlags.isTooSmall(Data(repeating: 1, count: 200)))
    }
}

final class RankerIconicSourcesTests: XCTestCase {
    func testPreferredBeatsFavicon() {
        let fav = LogoCandidate(source: .favicon, imageURL: URL(string: "https://x/f.ico")!,
                                pixelWidth: 128, pixelHeight: 128, assetType: "icon")
        let pref = LogoCandidate(source: .preferred, imageURL: URL(string: "https://x/p.svg")!,
                                 pixelWidth: 400, pixelHeight: 400, assetType: "icon", hasAlpha: true)
        XCTAssertEqual(CandidateRanker.rank([fav, pref]).first?.source, .preferred)
    }
}

final class DefaultSourcesTests: XCTestCase {
    func testNativeSourceOrder() {
        let kinds = DefaultSources.logoSources(brandfetchClientID: nil).map(\.kind)
        XCTAssertEqual(kinds.first, .preferred)
        XCTAssertTrue(kinds.contains(.companiesLogo))
        XCTAssertTrue(kinds.contains(.simpleIcons))
        XCTAssertEqual(kinds.last, .favicon)
        XCTAssertFalse(kinds.contains(.brandfetch))
        let withBrand = DefaultSources.logoSources(brandfetchClientID: "test").map(\.kind)
        XCTAssertEqual(withBrand[1], .brandfetch)
    }
}
