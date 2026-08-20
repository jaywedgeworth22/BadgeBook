// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ContactLogo",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [
        .library(name: "ContactLogoKit", targets: ["ContactLogoKit"]),
        .executable(name: "contactlogo", targets: ["contactlogo"])
    ],
    targets: [
        .target(name: "ContactLogoKit"),
        .executableTarget(
            name: "contactlogo",
            dependencies: ["ContactLogoKit"],
            path: "Sources/contactlogo"
        ),
        .testTarget(name: "ContactLogoKitTests", dependencies: ["ContactLogoKit"])
    ]
)
