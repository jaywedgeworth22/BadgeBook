import XCTest
@testable import BadgeBookKit

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
