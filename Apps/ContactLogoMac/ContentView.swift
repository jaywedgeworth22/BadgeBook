import SwiftUI
import ContactLogoKit
#if canImport(AppKit)
import AppKit
#endif

/// Three-bucket review layout (VISION: Auto / Review / Not-found).
/// Approve / try-another / upload / skip actions live on each row.
struct ContentView: View {
    @EnvironmentObject var model: ReviewSession

    var body: some View {
        NavigationSplitView {
            List(selection: $model.bucket) {
                Label("Ready to apply (\(model.autoAccepted.count))", systemImage: "checkmark.circle.fill")
                    .tag(ReviewSession.Bucket.auto)
                Label("Needs review (\(model.needsReview.count))", systemImage: "questionmark.circle")
                    .tag(ReviewSession.Bucket.review)
                Label("Not found (\(model.notFound.count))", systemImage: "minus.circle")
                    .tag(ReviewSession.Bucket.notFound)
            }
            .navigationTitle("ContactLogo")
        } detail: {
            VStack(alignment: .leading, spacing: 16) {
                switch model.stage {
                case .idle:
                    ContentUnavailableView("Scan your contacts",
                                           systemImage: "person.crop.square.filled.and.at.rectangle",
                                           description: Text("ContactLogo finds brand logos for the businesses in your address book — you approve every change."))
                    Button("Scan contacts") { Task { await model.scanAndMatch() } }
                        .buttonStyle(.borderedProminent)
                case .scanning:
                    ProgressView("Reading contacts…")
                case .matching(let done, let total):
                    ProgressView("Matching brands… \(done)/\(total)")
                case .review:
                    ReviewQueueView()
                case .applying:
                    ProgressView("Applying approved logos…")
                }
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

struct ReviewQueueView: View {
    @EnvironmentObject var model: ReviewSession

    var rows: [MatchResult] {
        switch model.bucket {
        case .auto: model.autoAccepted
        case .review: model.needsReview
        case .notFound: model.notFound
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Review queue").font(.title2.bold())
                Spacer()
                Button("Select high") { model.selectHigh(true) }
                Button("Clear high") { model.selectHigh(false) }
                Button("Apply selected") { Task { await model.applySelected() } }
                    .buttonStyle(.borderedProminent)
                if model.lastBatchID != nil {
                    Button("Undo last batch") { Task { await model.undoLast() } }
                }
            }
            Text("High-confidence matches are pre-checked.  Favicon fallbacks, guessed domains, and contacts that already have a photo stay in Needs review.")
                .foregroundStyle(.secondary)
            List(rows, id: \.contactID) { result in
                ReviewRow(result: result)
            }
        }
    }
}

struct ReviewRow: View {
    @EnvironmentObject var model: ReviewSession
    let result: MatchResult

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Toggle("", isOn: Binding(
                get: { model.selected.contains(result.contactID) },
                set: { model.setSelected(result.contactID, $0) }
            ))
            .disabled(result.candidates.isEmpty)
            LogoThumb(url: model.chosenCandidate(for: result)?.imageURL)
                .frame(width: 56, height: 56)
            VStack(alignment: .leading, spacing: 4) {
                Text(model.displayName(for: result.contactID)).font(.headline)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if result.candidates.count > 1 {
                    Button("Try another") { model.cycleCandidate(result.contactID) }
                        .font(.caption)
                }
            }
        }
    }

    private var detail: String {
        let source = model.chosenCandidate(for: result)?.source.rawValue ?? "none"
        let flags = result.flags.isEmpty ? "" : " · " + result.flags.joined(separator: ", ")
        return "\(label(result.confidence)) · \(source) · \(result.candidates.count) candidates\(flags)"
    }

    private func label(_ c: Confidence) -> String {
        switch c {
        case .high: "high"
        case .medium: "medium"
        case .low: "low"
        case .skip: "skip"
        }
    }
}

struct LogoThumb: View {
    let url: URL?

    var body: some View {
        Group {
            if let url {
                if url.scheme == "data", let data = try? Data(contentsOf: url) {
                    dataImage(data)
                } else {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFit()
                        case .failure:
                            placeholder
                        case .empty:
                            ProgressView()
                        @unknown default:
                            placeholder
                        }
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: 56, height: 56)
        .background(Color.gray.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    @ViewBuilder
    private func dataImage(_ data: Data) -> some View {
        #if canImport(AppKit)
        if let ns = NSImage(data: data) {
            Image(nsImage: ns).resizable().scaledToFit()
        } else {
            placeholder
        }
        #else
        placeholder
        #endif
    }

    private var placeholder: some View {
        Image(systemName: "photo")
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    ContentView().environmentObject(ReviewSession())
}
