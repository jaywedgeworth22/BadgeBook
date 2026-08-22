import SwiftUI
import ContactLogoKit
#if canImport(UIKit)
import UIKit
#endif

/// Three-bucket review queue (same contract as macOS and the web app).
struct ContentView: View {
    @EnvironmentObject var model: ReviewSession

    var body: some View {
        NavigationStack {
            Group {
                switch model.stage {
                case .idle:
                    idle
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
            .navigationTitle("ContactLogo")
            .toolbar {
                if model.stage == .idle || model.stage == .review {
                    Button("Scan") { Task { await model.scanAndMatch() } }
                }
            }
        }
    }

    private var idle: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Brand icons for your address book.  Review every logo before it is written.")
                .foregroundStyle(.secondary)
            Label("Ready to apply (\(model.autoAccepted.count))", systemImage: "checkmark.circle.fill")
            Label("Needs review (\(model.needsReview.count))", systemImage: "questionmark.circle")
            Label("Not found (\(model.notFound.count))", systemImage: "minus.circle")
            Button("Scan contacts") { Task { await model.scanAndMatch() } }
                .buttonStyle(.borderedProminent)
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ReviewQueueView: View {
    @EnvironmentObject var model: ReviewSession
    @State private var bucket: ReviewSession.Bucket = .auto

    var rows: [MatchResult] {
        switch bucket {
        case .auto: model.autoAccepted
        case .review: model.needsReview
        case .notFound: model.notFound
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("Bucket", selection: $bucket) {
                Text("Ready (\(model.autoAccepted.count))").tag(ReviewSession.Bucket.auto)
                Text("Review (\(model.needsReview.count))").tag(ReviewSession.Bucket.review)
                Text("Not found (\(model.notFound.count))").tag(ReviewSession.Bucket.notFound)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            HStack {
                Button("Select high") { model.selectHigh(true) }
                Button("Clear") { model.selectHigh(false) }
                Spacer()
                Button("Apply") { Task { await model.applySelected() } }
                    .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal)
            if model.lastBatchID != nil {
                Button("Undo last batch") { Task { await model.undoLast() } }
                    .padding(.horizontal)
            }
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
            .labelsHidden()
            .disabled(result.candidates.isEmpty)
            LogoThumb(url: model.chosenCandidate(for: result)?.imageURL)
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
        .frame(width: 52, height: 52)
        .background(Color.gray.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    @ViewBuilder
    private func dataImage(_ data: Data) -> some View {
        #if canImport(UIKit)
        if let ui = UIImage(data: data) {
            Image(uiImage: ui).resizable().scaledToFit()
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
