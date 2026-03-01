import Foundation

struct CreateProductRequest: Codable {
    let name: String
    let description: String?
    let price: Double
    let stock_quantity: Int
}
