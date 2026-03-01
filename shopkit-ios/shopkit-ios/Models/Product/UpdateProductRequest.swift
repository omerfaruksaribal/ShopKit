import Foundation

struct UpdateProductRequest: Codable {
    let name: String?
    let description: String?
    let price: Double?
    let stock_quantity: Int?
}
