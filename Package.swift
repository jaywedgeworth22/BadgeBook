// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "BadgeBook",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [
        .library(name: "BadgeBookKit", targets: ["BadgeBookKit"])
    ],
    targets: [
        .target(name: "BadgeBookKit"),
        .testTarget(name: "BadgeBookKitTests", dependencies: ["BadgeBookKit"])
    ]
)
