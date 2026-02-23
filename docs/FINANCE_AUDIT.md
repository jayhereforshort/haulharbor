# Finance & Ledger Alignment Audit

This document describes how financial data stays consistent across **inventory**, **sales**, **sale_line_items**, and the **money_events** ledger. All flows were checked against the codebase and Supabase schema (Feb 2026).

---

## 1. Record a sale

**Code:** `app/(app)/app/sold/actions.ts` → `createSale()`, plus record-sale modal and new-sale form.

**Flow:**

1. **INSERT into `sales`** (account_id, channel, buyer, sale_date, status, fees, taxes, shipping).
   - **Trigger `emit_sale_money_events`** (AFTER INSERT): inserts 3 rows into `money_events` — FEE, TAX, SHIPPING_COST (sale-level amounts), with `source = 'sale'` and `external_id = 'sale_fee_<id>'` etc.

2. **INSERT into `sale_line_items`** (one or more rows).
   - **Trigger `apply_sale_line_item_inventory`** (AFTER INSERT): for each line, decrements `inventory_items.qty_on_hand` by `qty_sold`, increments `inventory_items.qty_sold`, and sets `status = 'sold'` when qty_on_hand reaches 0. Enforces qty availability.
   - **Trigger `emit_sale_line_item_money_events`** (AFTER INSERT): for each line, inserts into `money_events`:
     - SOLD_REVENUE (qty_sold × unit_price)
     - COST_BASIS_SET (if sold_unit_cost set): qty_sold × sold_unit_cost
     - FEE, TAX, SHIPPING_COST (if line_fees / line_taxes / line_shipping > 0)

**Result:** Sales and line items exist, inventory qtys and ledger (money_events) are updated. Recalc views (item_financial_totals, sale_financial_totals) derive from money_events.

---

## 2. Delete a sale

**Code:** `app/(app)/app/sold/actions.ts` → `deleteSale(saleId)`.

**Flow:**

1. **DELETE FROM sales WHERE id = saleId AND account_id = account.id.**
2. **Cascade:** `sale_line_items` rows for that sale are deleted (FK `ON DELETE CASCADE`).
   - **Trigger `reverse_sale_line_item_inventory`** (AFTER DELETE): for each deleted line, restores `inventory_items.qty_on_hand` (+ qty_sold), decrements `inventory_items.qty_sold` (floor 0).
3. **Trigger `purge_money_events_on_sale_delete`** (BEFORE DELETE on sales): deletes all rows in `money_events` where `sale_id = OLD.id`, so the ledger no longer includes that sale.
4. Sale row is then deleted. (Without the purge trigger, `money_events.sale_id` would become NULL via FK ON DELETE SET NULL and those events would still count in item_financial_summary.)

**Result:** Sale and line items are gone, inventory qtys restored, and ledger no longer includes that sale. Dashboard and item recalc stay correct.

---

## 3. Create or update an inventory item

**Code:** `app/(app)/app/inventory/inventory-form.tsx` (create/update), `item-quick-edit-form.tsx` (quick edit), `quick-add-inventory-modal.tsx` (quick add).

**Flow:**

- **INSERT/UPDATE `inventory_items`** only. No writes to `money_events`.
- Cost basis in the ledger is recorded **at sale time** via `sold_unit_cost` → COST_BASIS_SET in `emit_sale_line_item_money_events`. Setting `unit_cost` on an item does not create a ledger event (by design; ledger reflects actual money flow when the item sells).

**Result:** Inventory is correct; ledger is unchanged until a sale references the item.

---

## 4. Delete an inventory item

**Code:** `app/(app)/app/inventory/actions.ts` → `deleteInventoryItem(itemId)`.

**Flow:**

- **DELETE FROM inventory_items** where id = itemId and account_id matches.
- **FKs:** `sale_line_items.inventory_item_id` → `ON DELETE RESTRICT`, so the DB blocks delete if the item has any line items. User must remove or delete those sales first.
- **money_events.inventory_item_id** → `ON DELETE SET NULL`. If the item has no line items (e.g. never sold), delete proceeds and any money_events for that item get `inventory_item_id = NULL`; they drop out of `item_financial_summary` (which filters `WHERE inventory_item_id IS NOT NULL`).

**Result:** Item is removed; ledger events that referenced it become item-agnostic (sale_id still set if from a sale; in practice we don’t delete items that have been sold).

---

## 5. Triggers summary (Supabase)

| Table            | Trigger                              | When      | Effect |
|-----------------|--------------------------------------|-----------|--------|
| sales           | emit_sale_money_events_trigger       | AFTER INSERT | Insert sale-level FEE, TAX, SHIPPING_COST into money_events |
| sales           | purge_money_events_on_sale_delete_trigger | BEFORE DELETE | Delete money_events where sale_id = OLD.id |
| sale_line_items | apply_sale_line_item_inventory_trigger   | AFTER INSERT | Update inventory_items qty_on_hand, qty_sold, status |
| sale_line_items | reverse_sale_line_item_inventory_trigger | AFTER DELETE | Restore inventory_items qty_on_hand, qty_sold |
| sale_line_items | emit_sale_line_item_money_events_trigger | AFTER INSERT | Insert SOLD_REVENUE, COST_BASIS_SET, line-level FEE/TAX/SHIPPING_COST into money_events |
| money_events    | money_events_set_external_id_trigger | BEFORE INSERT | Set external_id to UUID when empty (for unique constraint) |

---

## 6. Idempotency

- **money_events** has unique constraint `(account_id, source, external_id, event_type)`. Sale and line-item triggers use fixed patterns for `external_id` (e.g. `sale_fee_<sale.id>`, `sli_rev_<line.id>`), so duplicate trigger runs do not insert duplicate events (ON CONFLICT DO NOTHING where used).

---

## 7. Where financial totals come from

- **Dashboard (revenue, profit, COGS, etc.):** `lib/ledger.ts` → `getDashboardMetrics()` reads from view `sale_financial_totals` and `sales.sale_date` (ledger-derived).
- **Sale detail page:** Uses `sales` + `sale_line_items` for display; profit/net are computed from those tables (same logic as ledger).
- **Item financial summary:** View `item_financial_totals` aggregates `money_events` by `inventory_item_id`.
- **Settings → Finance:** Reads `money_events` and ledger views; read-only.

All persistent financial totals that should stay in sync with “what sales exist” are either derived from `money_events` or from sales/line items; and deleting a sale now removes its money_events so ledger and recalc stay aligned.
