import Foundation

struct OrderItemModel: Codable {
    let id: String
    let order_id: String
    let product_id: String
    let quantity: Int
    let unit_price: String
    let product: OrderItemProduct?

    var unitPriceValue: Double {
        Double(unit_price) ?? 0.0
    }
}

struct OrderItemProduct: Codable {
    let id: String
    let name: String
}
