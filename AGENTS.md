# Architecture
- Keep `/` as the brand and sales-channel chooser, `/merch` as the existing shop, and `/tickets` as the event page; ticket sales remain unconfigured until the organizer supplies a provider URL.
- Keep `preorders` as the order header for payment and shipping compatibility; store validated item snapshots in `order_items` so a single payment and parcel can contain multiple models and quantities.
- Use the dependency-free shared merchandise catalogue for frontend choices and authoritative server pricing; models without confirmed imagery and pricing are not purchasable.
- Calculate discounts and order totals through the shared catalogue pricing helper on both frontend and payment server, rounding to integer cents before adding shipping to prevent checkout discrepancies.
- Group admin orders by normalized customer email and retain each order's complete items when filtering, so fulfillment never loses companion products.
- Calculate admin model/color/size summaries in a pure order-summary module, separating paid quantities from unpaid and distinct order counts so procurement totals are unambiguous.
- Send order confirmations through the managed template helper from the verified payment webhook, retaining historical email audit writes and signed outcome-event records; leave standalone third-party confirmation and tracking senders unchanged.