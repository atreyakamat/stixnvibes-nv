# Stix N Vibes — Commerce Operating System Architecture

## Architecture Vision

Stix N Vibes should be designed as a commerce operating system rather than as a storefront with an attached administrator panel. The storefront is the customer-facing presentation layer, while the Admin application is the operational control plane through which products, catalog configuration, customers, orders, production, inventory, content, shipping, and business settings are managed. PostgreSQL should remain the durable source of truth for business state, while application services enforce validation, authorization, pricing, workflow transitions, and transactional integrity.

## System Design Principles

Every business action should follow a predictable path from interface to validated server operation to persistent database mutation and then back to the relevant user interfaces. The frontend should never be authoritative for prices, inventory, permissions, order status, or other sensitive business state. The backend should calculate and validate those values from authoritative records. Admin mutations should propagate back to the storefront through deliberate cache invalidation or revalidation rather than requiring code changes or redeployment.

The architecture should separate presentation, application services, data access, infrastructure integrations, and persistent models. React and Next.js components should primarily handle presentation and interaction, route handlers should handle HTTP concerns, application services should own business rules, repositories or Prisma data access should own persistence concerns, and integration modules should isolate external systems such as payments, WhatsApp, media storage, and shipping.

## Frontend Architecture

The storefront should be organized around a shared design system and consistent application shell. The shell should own branding, navigation, announcement messaging, responsive behavior, footer content, customer account access, and cart access. Individual pages should consume configuration and business data rather than hardcoding catalog assumptions.

The customer frontend should treat product discovery, product configuration, cart, checkout, tracking, and account management as one connected journey. Product pages should receive only currently active catalog entities. The customizer can provide immediate visual feedback, but every submitted configuration must be revalidated on the server before an order is created.

The Admin frontend should be a workspace rather than a collection of isolated pages. The dashboard should answer what needs attention now, while individual modules provide deeper operational control. Tables should support search, filtering, sorting, pagination, and bulk operations where useful. Every mutation should expose clear success or failure feedback.

## Application API Boundary

All customer and Admin mutations should pass through a controlled server-side API boundary. Each endpoint should authenticate the caller when required, validate the request payload, authorize the operation, call the relevant application service, persist the transaction, and return a stable response shape. Error handling should be centralized so validation, authentication, authorization, not-found, conflict, and internal failures behave consistently.

The API must never accept a client-calculated total as authoritative. Product prices, variant modifiers, material modifiers, size modifiers, taxes, discounts, shipping charges, and inventory availability must be resolved from current server-side records. The same principle applies to order status, inventory changes, production status, QC outcomes, and shipment state.

## Authentication and Authorization

Supabase Auth should provide identity and session management, while the application should maintain an Admin authorization model that determines which authenticated users can access operational functions. Middleware should provide an early protection layer, but route handlers and services must still enforce authorization because middleware alone is not a sufficient security boundary.

Customer identity and Admin identity should remain logically distinct even when they use the same underlying authentication provider. Customers should only access their permitted resources, while Admin users should receive operational permissions according to their role. Authorization decisions should come from server-side identity and role data rather than client-controlled flags.

## Product Catalog

Products should be the central commercial entity connecting content, pricing, variants, inventory, customization, and storefront visibility. A product should contain customer-facing content, internal identifiers, SEO information, category and collection relationships, tags, gallery assets, visibility state, and customization rules. The Admin product editor should expose the complete product lifecycle without requiring database access or code changes.

Product visibility should be explicit and separate from deletion. Draft, published, hidden, and archived states should have predictable meanings throughout the system. The storefront should only expose products satisfying configured publication and visibility rules. Archiving should preserve historical order references.

## Variants, Materials, Papers, and Sizes

Variants should represent purchasable combinations of product options and hold SKU, barcode, cost, weight, pricing, and inventory information. Materials, papers, and sizes should be first-class catalog configuration because they affect customer customization and operational pricing.

Material and size modifiers must participate in server-side pricing. A disabled material, paper, or size should not merely disappear visually; the backend must reject submitted configurations that reference unavailable options.

## Pricing Engine

Pricing should have one authoritative server-side calculation path. The calculation should resolve product base price, selected variant, material and size modifiers, quantity pricing, applicable discounts, tax, and shipping according to business rules. The client may display an estimate, but checkout must recalculate the amount from authoritative records.

Pricing rules should be explicit business logic rather than scattered arithmetic. Historical orders should preserve the actual prices used at purchase time so later catalog changes cannot rewrite historical financial data.

## Inventory

Inventory should be treated as a transactional resource rather than a number displayed on a product page. The system should distinguish available stock, reserved stock, and consumed stock where necessary. Reservations should occur within controlled transactions, and inventory changes should produce ledger-style inventory log entries.

The inventory system should support finished goods and operational materials where required. Checkout or order approval should reserve stock atomically, production should consume relevant materials, cancellation should release reservations when appropriate, and returns should follow an explicit policy. Concurrency protection must prevent simultaneous purchases from consuming the same unit.

## Collections, Categories, and Tags

Categories should represent navigational classification, collections should represent curated commercial groupings, and tags should support lightweight filtering and merchandising. Each should have clear active or inactive state and be manageable from Admin.

Disabling a collection or category should affect homepage modules, navigation, search, filters, and relevant product presentation consistently. Existing relationships should remain intact so re-enabling restores the catalog.

## Media Library

The Media Library should be a central asset-management layer for product imagery, homepage assets, page content, and other supported media. Assets should have stable identifiers, storage URLs, metadata, alternative text, and usage relationships. The system should prevent accidental deletion of assets still referenced by active content.

Media operations should be abstracted behind a storage service so the application is not tightly coupled to one provider. Cloudinary or another configured provider should handle physical storage while PostgreSQL retains application-level metadata and references.

## Homepage Builder

The Homepage Builder should provide controlled content composition rather than a free-form editor. Each section should have a defined component type, content configuration, ordering, and visibility state. Admin should be able to reorder and enable or disable sections while the storefront renders the resulting configuration through shared components.

Content changes should be persisted and invalidate the relevant storefront cache. Invalid section configurations should be rejected by the backend rather than causing storefront failures.

## Page Builder

The Page Builder should manage informational pages such as About, policies, FAQ, contact information, and merchant-created pages. Each page should have a stable slug, publication state, title, content, and SEO metadata. Draft and published states should be distinct.

Updating a page should invalidate its public route so changes become visible without deployment. Unpublished pages should not be publicly accessible unless intentionally previewed.

## Navigation Builder

Navigation should be configuration-driven and control header links, footer columns, policy links, and social destinations. Links should support ordering, visibility, and destination validation. The storefront shell should render navigation from current configuration rather than maintaining hardcoded menus.

Navigation changes should propagate immediately across desktop and mobile layouts from the same source of truth.

## Theme and Branding

Theme configuration should centralize store identity including logo, brand colors, typography choices where supported, announcement bar content, and approved visual tokens. The Admin interface should expose safe configurable values rather than arbitrary CSS or code injection.

Theme changes should persist and reflect without redeployment. Invalid colors, URLs, or unsupported configuration values should be rejected before persistence.

## Customer CRM

Customer records should provide a unified operational view of the relationship. A profile should connect identity, contact information, addresses, order history, notes, lifetime value, favourite products, discounts, and operational flags such as VIP or blacklist status. Financial metrics should derive from orders rather than independently editable totals.

Customer privacy must be enforced server-side. A customer must never access another customer's private information. WhatsApp shortcuts should use centralized contact configuration.

## Order Management

Orders should be the central operational record connecting checkout, payment, inventory, production, QC, packing, and shipment. An order should preserve the commercial snapshot required to fulfill and audit the purchase, including products, variants, prices, taxes, discounts, customer information, address, customization, and fulfillment state.

The Admin order view should present the complete operational timeline. Every important state change should record who performed it, when it occurred, and what changed. The UI should expose only valid next actions while the backend independently validates transitions.

## Order State Machine

The order lifecycle should be implemented as a strict server-side state machine. States should represent real operational stages, and valid transitions should be explicitly defined. Exceptional paths such as cancellation, payment failure, and return should be modeled explicitly where required.

A client must never jump directly from an early state to a terminal state by submitting a manipulated status. Every transition should be validated against persisted state, required conditions, and caller authorization. State history should remain auditable.

## Production Operations

Production should transform an approved order into actionable work for printing, cutting, preparation, and fulfillment. Production jobs should contain the information required by the production team and remain linked to the originating order and items.

The production queue should support grouping and batching where useful. Completion of a production job should update operational state and create required inventory or production records rather than merely changing a visual status.

## Quality Control

QC should be a formal operational checkpoint. A QC record should capture inspection result, operator, timestamp, and failure reason where applicable. Failed QC should enter a controlled corrective workflow rather than silently proceeding to packing.

The Admin QC interface should make pending inspections visible and provide fast pass, fail, and rework decisions. Backend rules must prevent shipment or packing when successful QC is required.

## Packing

Packing represents the transition from verified production output to shipment-ready package. The interface should expose order contents, fulfillment information, packaging requirements, invoice actions, and label actions. Completion should persist packing state and record operator and time.

The backend should require necessary production and QC conditions before an order becomes ready for shipment.

## Shipping

Shipping should connect a packed order to a courier and tracking identity. The system should support AWB or tracking creation, label generation, dispatch recording, tracking updates, delivery confirmation, and returns where configured.

External shipping integrations should be isolated behind adapters so providers can change without rewriting order logic. Shipment events should be stored independently of current status to preserve an auditable tracking timeline.

## Payments

Payments should be treated as an external financial integration whose authoritative state is verified server-side. The system should create provider orders using server-calculated amounts, verify signatures and webhooks, handle retries, and prevent duplicate processing.

Payment events should be idempotent so provider retries cannot create duplicate orders or inventory reservations. Browser payment success must never be sufficient evidence that an order is paid.

## WhatsApp Integration

WhatsApp should be treated as a communication channel rather than the order database. Checkout or Admin actions can construct controlled messages containing order details, confirmations, or tracking information, while order state remains in PostgreSQL.

The WhatsApp number and message configuration should have one authoritative source. The application should never claim message delivery merely because a message URL or payload was generated.

## Analytics and Dashboard

The Admin dashboard should be an operational command center rather than decorative charts. It should prioritize pending approvals, production work, QC, packing, shipments, low stock, and today's commercial performance. Actionable metrics should link directly to operational modules.

Analytics should derive from authoritative transactional data. Revenue, orders, customers, inventory, best sellers, collections, margins, profit, repeat customers, conversion, and abandoned carts should have defined calculation rules.

## Settings

Settings should centralize store-level configuration such as store information, currency, tax, payment configuration, shipping configuration, communication settings, branding, feature flags, and operational preferences. Sensitive credentials should remain deployment secrets rather than ordinary editable settings.

The Admin Settings interface should distinguish merchant-editable business configuration from infrastructure configuration. Merchants should operate the store without touching environment variables.

## Feature Flags and Visibility

Feature flags should provide controlled activation of optional capabilities without scattering boolean checks throughout the application. Visibility rules should be evaluated consistently at backend and frontend levels. Hiding something should change customer-facing behavior without destroying the underlying database record.

## Cache and Storefront Synchronization

Caching is part of the architecture because the storefront consumes database-backed configuration. Every Admin mutation affecting public content should have an explicit invalidation strategy. Server rendering, client caching, and revalidation should be designed together so successful Admin mutations cannot leave customers viewing obsolete configuration.

The preferred flow is Admin mutation, server validation, database transaction, cache invalidation, and fresh storefront rendering. This should be standardized across products, catalog configuration, homepage content, navigation, pages, and theme settings.

## Data and Transaction Architecture

PostgreSQL should be the durable source of truth for transactional business state. Prisma or the chosen data-access layer should provide typed schema access, while transaction boundaries should be defined around operations that must succeed or fail together. Inventory reservation, order creation, and payment-related state changes should be designed around atomicity and idempotency.

Database constraints should enforce important invariants wherever practical, including unique identifiers, relationships, and valid operational values. Application validation should provide user-friendly errors while database constraints provide a final integrity boundary.

## External Integration Layer

External systems should be isolated behind provider interfaces. Payment, media storage, WhatsApp, and shipping should not be called directly throughout the application. Business services should call internal abstractions while provider implementations handle authentication, formatting, response mapping, retries, and provider-specific errors.

This allows the business system to remain stable when an external provider changes and makes local tests possible without pretending mocks are production integrations.

## Observability and Error Handling

The application should produce structured server-side logs containing enough information to diagnose failures without exposing credentials or sensitive customer data. Production API responses should remain sanitized and should never return raw stack traces, SQL errors, or environment values.

Operational errors should be distinguishable from validation and authorization failures. The Admin interface should provide actionable messages while secure server logs retain diagnostic context.

## Testing Architecture

Testing should be divided into unit, integration, transactional, and end-to-end layers. Unit tests should cover deterministic business rules such as pricing and state transitions. Integration tests should verify services against the database layer. Transactional tests should cover inventory, checkout, and order persistence. End-to-end tests should exercise real Admin and storefront journeys.

The acceptance suite should focus on business outcomes. A green suite should prove that an administrator can perform an intended operation and that resulting state is persisted and visible where expected. Tests should never be weakened merely to obtain a passing build.

## Deployment Architecture

Production should use Netlify for the Next.js application and Supabase for managed PostgreSQL, authentication, and configured supporting services. Production environment variables should be injected securely through deployment configuration, while migrations should be applied deterministically rather than through development-oriented schema push commands.

Production configuration should fail fast when dangerous development values such as localhost database endpoints or mock payment/storage configuration are detected. Accidental production misconfiguration should therefore become a deployment failure.

## Security Architecture

Security should follow defense in depth. Middleware should reject obviously unauthorized requests early, route handlers should authenticate and authorize again, application services should enforce business permissions, and database policies or constraints should protect persistent state.

Sensitive operations including pricing, inventory, order status, payment verification, and customer data access must always be validated server-side. Secrets must never reach browser bundles, logs, or client responses.

## Merchant Operating Model

The completed system should allow a non-technical merchant to start at the dashboard, resolve pending customer actions, manage catalog changes, process orders through production, perform QC, pack shipments, dispatch deliveries, answer customer questions, and review business performance without opening a database console or editing code.

The Admin application should therefore be organized around the merchant's workflow rather than the database schema. Every important business action should have a clear owner, valid states, persistent history, and an obvious place in the interface.

## Final Architecture Goal

The final Stix N Vibes architecture should behave as one coherent system in which the storefront is the customer experience, the Admin panel is the merchant operating system, PostgreSQL is the business source of truth, Supabase provides managed infrastructure and identity, application services enforce business rules, and external providers are isolated integrations.

The most important rule is that every visible capability must have a complete lifecycle from frontend interaction through authenticated server validation, business-rule enforcement, durable persistence, cache or state propagation, and observable result. If a merchant can change something in Admin, that change must have a defined database representation, a defined storefront or operational effect, a defined authorization boundary, and a defined testable outcome. This principle should govern every future feature added to Stix N Vibes.
