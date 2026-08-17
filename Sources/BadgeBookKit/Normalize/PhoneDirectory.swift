import Foundation

/// Published customer-service numbers → official domain.
/// Ported from Crest (`vendor/crest/src/lib/phones.ts`).
public enum PhoneDirectory {

    static let domains: [String: String] = [
        "8002211212": "delta.com", "8003232323": "delta.com",
        "8004337300": "aa.com", "8008648331": "united.com",
        "8004359792": "southwest.com", "8005382583": "jetblue.com",
        "8002527522": "alaskaair.com", "8557283555": "spirit.com",
        "8002479297": "britishairways.com", "8006453880": "lufthansa.com",
        "8002372747": "airfrance.com", "8007773999": "emirates.com",
        "8008727245": "amtrak.com", "8002752273": "apple.com",
        "8882804331": "amazon.com", "8009256278": "walmart.com",
        "8004400680": "target.com", "8004663337": "homedepot.com",
        "8004456937": "lowes.com", "8007742678": "costco.com",
        "8009220204": "verizon.com", "8003310500": "att.com",
        "8009378997": "t-mobile.com", "8009346489": "xfinity.com",
        "8332677463": "spectrum.com", "8004633339": "fedex.com",
        "8007425877": "ups.com", "8002758777": "usps.com",
        "8008618380": "geico.com", "8007828332": "statefarm.com",
        "8002557828": "allstate.com", "8005318722": "usaa.com",
        "8007764737": "progressive.com", "8883276335": "farmers.com",
        "8776696877": "nationwide.com", "8002905366": "libertymutual.com",
        "8009359935": "chase.com", "8004321000": "bankofamerica.com",
        "8008693557": "wellsfargo.com", "8003749700": "citi.com",
        "8002274825": "capitalone.com", "8005284800": "americanexpress.com",
        "8003472683": "discover.com", "8882211161": "paypal.com",
        "8007827282": "starbucks.com", "8002446227": "mcdonalds.com",
        "8662322040": "chick-fil-a.com", "8775477272": "papajohns.com",
        "8009488488": "pizzahut.com", "8777983752": "tesla.com",
        "8003923673": "ford.com", "8002221020": "gm.com",
        "8003327143": "centerpointenergy.com", "8662222538": "reliant.com",
        "8007435000": "pge.com", "8007779898": "duke-energy.com",
        "8882275732": "constellation.com", "8008291040": "irs.gov",
        "8007721213": "ssa.gov", "8007467287": "cvs.com",
        "8009254733": "walgreens.com", "8882378289": "bestbuy.com",
        "8002896229": "macys.com", "8008066453": "nike.com",
        "8554247262": "airbnb.com", "8006543131": "hertz.com",
        "8552669289": "enterprise.com", "8003527900": "avis.com",
        "8002187992": "budget.com", "8004458667": "hilton.com",
        "8005354028": "marriott.com", "8002331234": "hyatt.com",
        "8003433548": "fidelity.com", "8776627447": "vanguard.com",
        "8004354000": "schwab.com", "8004725625": "hrblock.com",
        "8004468848": "intuit.com", "8665797172": "netflix.com",
        "8558124430": "venmo.com", "6502530000": "google.com",
        "8006427676": "microsoft.com", "8889087930": "coinbase.com",
        "8558654938": "lyft.com", "8554310459": "doordash.com"
    ]

    static let tollFree: Set<String> = ["800", "888", "877", "866", "855", "844", "833"]

    public static func digits(from phone: String?) -> String? {
        guard let phone else { return nil }
        let d = phone.filter(\.isNumber)
        if d.count == 11, d.hasPrefix("1") { return String(d.dropFirst()) }
        if d.count == 10 { return d }
        if d.count > 10, d.hasPrefix("1") { return String(d.dropFirst().prefix(10)) }
        if d.count >= 7 { return d }
        return nil
    }

    public static func isBusinessPhone(_ phone: String?) -> Bool {
        guard let d = digits(from: phone), d.count >= 10 else { return false }
        return tollFree.contains(String(d.prefix(3)))
    }

    public static func domain(forPhone phone: String?) -> String? {
        guard let d = digits(from: phone) else { return nil }
        if let hit = domains[d] { return hit }
        if d.count > 10 { return domains[String(d.suffix(10))] }
        return nil
    }
}
