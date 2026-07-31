# Production Runbook

1. Populate the environment variables from [.env.example](.env.example).
2. Configure Supabase and ensure the required tables exist.
3. Start the app with `npm run dev` or the production server with `npm run start`.
4. Verify the health endpoint at `/api/health`.
5. Test order creation and tracking with a real customer record.
6. Review admin operations and fulfillment screens for real data.
7. If Razorpay is required for production, provide valid test/live credentials before enabling payment proof.
8. Monitor payment, order, and inventory flows after deploy.
