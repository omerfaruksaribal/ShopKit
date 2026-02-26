/**
 * Dummy payment service.
 * Simulates a payment gateway that randomly succeeds or fails.
 *
 * @param {number} amount - The amount to charge
 * @returns {{ success: boolean, provider: string }}
 */
const processPayment = (amount) => {
    // 70% success rate by default
    const success = Math.random() < 0.7;

    return {
        success,
        provider: 'DummyPay',
        amount,
    };
};

/**
 * Deterministic version for testing.
 * Pass an explicit outcome.
 */
const processPaymentWithOutcome = (amount, outcome) => {
    return {
        success: outcome,
        provider: 'DummyPay',
        amount,
    };
};

module.exports = { processPayment, processPaymentWithOutcome };
