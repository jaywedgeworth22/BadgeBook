import SwiftUI
import BadgeBookKit

/// Three-bucket review layout (VISION: Auto / Review / Not-found).
/// Visual polish lands in Phase 1; the interaction contract is already here:
/// multi-candidate picker, per-contact override, select all/none.
struct ContentView: View {
    @EnvironmentObject var model: ScanViewModel

    var body: some View {
        NavigationSplitView {
            List {
                Label("Ready to apply (\(model.autoAccepted.count))", systemImage: "checkmark.circle.fill")
                Label("Needs review (\(model.needsReview.count))", systemImage: "questionmark.circle")
                Label("Not found (\(model.notFound.count))", systemImage: "minus.circle")
            }
            .navigationTitle("BadgeBook")
        } detail: {
            switch model.stage {
            case .idle:
                ContentUnavailableView("Scan your contacts",
                                       systemImage: "person.crop.square.filled.and.at.rectangle",
                                       description: Text("BadgeBook finds brand logos for the businesses in your address book — you approve every change."))
            case .scanning:
                ProgressView("Reading contacts…")
            case .matching(let done, let total):
                ProgressView("Matching brands… \(done)/\(total)")
            case .review:
                Text("Review queue")
            case .applying:
                ProgressView("Applying approved logos…")
            }
        }
    }
}

#Preview {
    ContentView().environmentObject(ScanViewModel())
}
