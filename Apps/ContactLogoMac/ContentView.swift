import SwiftUI
import ContactLogoKit

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
            Text("High-confidence matches are pre-checked. Favicon fallbacks and guessed domains stay in Needs review.")
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
            VStack(alignment: .leading, spacing: 4) {
                Text(model.displayName(for: result.contactID)).font(.headline)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var detail: String {
        let source = result.candidates.first?.source.rawValue ?? "none"
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

#Preview {
    ContentView().environmentObject(ReviewSession())
}
