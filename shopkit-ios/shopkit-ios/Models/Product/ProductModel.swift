import Foundation

struct ProductModel: Codable {
    let id: String
    let seller_id: String
    let name: String
    let description: String?
    let price: String
    let stock_quantity: Int
    let created_at: String
    let updated_at: String
    let seller: SellerModel?

    var priceValue: Double {
        Double(price) ?? 0.0
    }
}

struct SellerModel: Codable {
    let id: String
    let email: String
}
