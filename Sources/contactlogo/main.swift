import Foundation
import ContactLogoKit

/// ContactLogo CLI — Phase 1 dogfood driver (ROADMAP §Phase 1).
///
///   contactlogo scan                       classify contacts, print counts
///   contactlogo match [--limit N]          run the engine, write match-results.json + candidates/
///   contactlogo review                     export review.html from match-results.json
///   contactlogo apply <ids...|--high>      apply approved images (undo log written first)
///   contactlogo undo <batchID>             restore a previous batch
///
/// Brandfetch keys come from the environment:
///   CONTACTLOGO_BRANDFETCH_CLIENT_ID  (Logo Link CDN, required)
///   CONTACTLOGO_BRANDFETCH_API_KEY    (Brand API search, optional)

struct CLI {
    static func env(_ key: String) -> String? {
        ProcessInfo.processInfo.environment[key]
    }

    /// Local-only work directory (gitignored). Holds AddressBook-derived
    /// scan dumps; never commit `.contactlogo/` or `.badgebook/`.
    static func workDir() -> URL {
        let dir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent(".contactlogo", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static func makePipeline() -> MatchPipeline {
        DefaultSources.makePipeline()
    }
}

struct StoredResult: Codable {
    let contactID: String
    let displayName: String
    let confidence: String
    let flags: [String]
    let candidateFile: String?     // downloaded image, candidates/<id>.png
    let candidateCount: Int
}

@main
struct ContactLogoCLI {
    static func main() async {
        setvbuf(stdout, nil, _IONBF, 0) // unbuffered: progress must survive pipes
        var args = Array(CommandLine.arguments.dropFirst())
        guard let command = args.first else { usage(); return }
        args.removeFirst()

        do {
            switch command {
            case "scan": try await scan()
            case "match": try await match(args: args)
            case "review": try review()
            case "apply": try await apply(args: args)
            case "undo": try await undo(args: args)
            default: usage()
            }
        } catch {
            FileHandle.standardError.write("error: \(error.localizedDescription)\n".data(using: .utf8)!)
            Foundation.exit(1)
        }
    }

    static func usage() {
        print("""
        contactlogo scan | match [--limit N] | review | apply <ids...|--high> | undo <batchID>
        """)
    }

    // MARK: - scan

    static func scan() async throws {
        let provider = CNContactsProvider()
        guard try await provider.requestAccess() else {
            throw NSError(domain: "ContactLogo", code: 1, userInfo: [NSLocalizedDescriptionKey: "Contacts access denied"])
        }
        let contacts = try await provider.fetchCandidates()
        // classification needs no sources or keys
        let pipeline = MatchPipeline(sources: [], fetchImage: { _ in Data() })
        var counts: [String: Int] = [:]
        var classified: [(ContactIdentity, ContactClass)] = []
        for c in contacts {
            let klass = pipeline.classify(c)
            classified.append((c, klass))
            let key: String
            switch klass {
            case .person: key = c.hasImage ? "person (photo-protected)" : "person (no photo)"
            case .businessCard: key = "business card"
            case .nonBrand: key = "non-brand (skipped)"
            }
            counts[key, default: 0] += 1
        }
        print("candidates: \(contacts.count)")
        for (k, v) in counts.sorted(by: { $0.key < $1.key }) { print("  \(k): \(v)") }
        let dir = CLI.workDir()
        let ids = classified.map { ["id": $0.0.id] }
        try JSONSerialization.data(withJSONObject: ids, options: .prettyPrinted)
            .write(to: dir.appendingPathComponent("scan.json"))
        print("wrote \(dir.appendingPathComponent("scan.json").path)")
    }

    // MARK: - match

    static func match(args: [String]) async throws {
        let pipeline = CLI.makePipeline()
        let limit: Int? = args.first == "--limit" ? Int(args.dropFirst().first ?? "") : nil

        let provider = CNContactsProvider()
        guard try await provider.requestAccess() else {
            throw NSError(domain: "ContactLogo", code: 1, userInfo: [NSLocalizedDescriptionKey: "Contacts access denied"])
        }
        let contacts = try await provider.fetchCandidates()
        let pipelineTargets = contacts.filter {
            switch pipeline.classify($0) {
            case .businessCard: return true
            case .person, .nonBrand: return false
            }
        }
        let targets = limit.map { Array(pipelineTargets.prefix($0)) } ?? pipelineTargets
        print("matching \(targets.count) contacts…")

        let dir = CLI.workDir()
        let candDir = dir.appendingPathComponent("candidates", isDirectory: true)
        try FileManager.default.createDirectory(at: candDir, withIntermediateDirectories: true)

        var stored: [StoredResult] = []
        var done = 0
        for c in targets {
            print("  → \(c.id)")
            let result = await pipeline.match(c)
            var file: String? = nil
            if let best = result.candidates.first {
                let req = BrandfetchSource.cdnRequest(url: best.imageURL)
                if let (data, _) = try? await URLSession.shared.data(for: req), data.count > 300 {
                    file = "\(c.id).png"
                    try? data.write(to: candDir.appendingPathComponent(file!))
                }
            }
            let conf: String = switch result.confidence {
            case .high: "high"
            case .medium: "medium"
            case .low: "low"
            case .skip: "skip"
            }
            stored.append(StoredResult(contactID: c.id, displayName: c.displayName,
                                       confidence: conf, flags: result.flags,
                                       candidateFile: file, candidateCount: result.candidates.count))
            done += 1
            if done % 25 == 0 { print("  \(done)/\(targets.count)") }
        }
        let encoder = JSONEncoder(); encoder.outputFormatting = .prettyPrinted
        try encoder.encode(stored).write(to: dir.appendingPathComponent("match-results.json"))
        let hi = stored.filter { $0.confidence == "high" }.count
        let med = stored.filter { $0.confidence == "medium" }.count
        print("done: \(hi) high / \(med) medium / \(stored.count - hi - med) low-or-skip")
        print("wrote \(dir.appendingPathComponent("match-results.json").path)")
    }

    // MARK: - review

    static func review() throws {
        let dir = CLI.workDir()
        let data = try Data(contentsOf: dir.appendingPathComponent("match-results.json"))
        let results = try JSONDecoder().decode([StoredResult].self, from: data)
        var cards: [String] = []
        for r in results {
            let img = r.candidateFile.map { "<img src='candidates/\($0)' loading='lazy'>" } ?? "<div class='noimg'>?</div>"
            cards.append("""
            <div class='card \(r.confidence)'>
              <div class='thumb'>\(img)</div>
              <div class='meta'>
                <div class='name'>\(r.displayName)</div>
                <div class='conf'>\(r.confidence) · \(r.candidateCount) candidates \(r.flags.isEmpty ? "" : "· " + r.flags.joined(separator: ", "))</div>
                <div class='id'>\(r.contactID)</div>
              </div>
            </div>
            """)
        }
        let html = """
        <!DOCTYPE html><html><head><meta charset='utf-8'><title>ContactLogo review</title>
        <style>
        body{font-family:-apple-system,sans-serif;background:#f5f5f7;margin:24px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
        .card{display:flex;gap:12px;background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
        .card.high{outline:2px solid #34c759}.card.medium{outline:2px solid #ff9f0a}
        .thumb img{width:72px;height:72px;object-fit:contain;background:#fafafa;border-radius:8px}
        .noimg{width:72px;height:72px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:28px;background:#fafafa;border-radius:8px}
        .name{font-weight:600}.conf{font-size:12px;color:#666}.id{font-size:10px;color:#bbb;word-break:break-all}
        </style></head><body><h1>ContactLogo review — \(results.count) matches</h1>
        <div class='grid'>\(cards.joined())</div></body></html>
        """
        let out = dir.appendingPathComponent("review.html")
        try html.write(to: out, atomically: true, encoding: .utf8)
        print("wrote \(out.path)")
    }

    // MARK: - apply / undo

    static func apply(args: [String]) async throws {
        let dir = CLI.workDir()
        let data = try Data(contentsOf: dir.appendingPathComponent("match-results.json"))
        let results = try JSONDecoder().decode([StoredResult].self, from: data)
        let wanted: [StoredResult]
        if args.first == "--high" {
            wanted = results.filter { $0.confidence == "high" }
        } else {
            let ids = Set(args)
            wanted = results.filter { ids.contains($0.contactID) }
        }
        let provider = CNContactsProvider()
        guard try await provider.requestAccess() else {
            throw NSError(domain: "ContactLogo", code: 1, userInfo: [NSLocalizedDescriptionKey: "Contacts access denied"])
        }
        var entries: [ChangeSet.Entry] = []
        for r in wanted {
            guard let file = r.candidateFile else { continue }
            let img = try Data(contentsOf: dir.appendingPathComponent("candidates/\(file)"))
            let prev = try await provider.imageData(forContactID: r.contactID)
            entries.append(.init(contactID: r.contactID, newImageData: img, previousImageData: prev))
        }
        let undo = UndoLog()
        let batch = try undo.recordBatch(entries)
        for entry in entries {
            try await provider.setImage(entry.newImageData, forContactID: entry.contactID)
        }
        print("applied \(entries.count) logos (undo batch: \(batch.lastPathComponent))")
    }

    static func undo(args: [String]) async throws {
        guard let batchID = args.first else { usage(); return }
        let provider = CNContactsProvider()
        guard try await provider.requestAccess() else {
            throw NSError(domain: "ContactLogo", code: 1, userInfo: [NSLocalizedDescriptionKey: "Contacts access denied"])
        }
        try await UndoLog().restore(batchID: batchID, using: provider)
        print("restored batch \(batchID)")
    }
}
