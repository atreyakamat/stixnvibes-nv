# Known Limitations

- The storefront is fully buildable and test-covered, and live checkout requests now persist orders into the configured Supabase backend.
- Payment processing remains optional and gated behind environment variables for Razorpay.
- The current order-tracking experience only shows data for orders that actually exist in the configured backend.
- Admin operations and fulfillment workflows are implemented but need live production configuration and operator UAT to be validated end-to-end.
