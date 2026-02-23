import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, getStatusBadgeVariant } from "@/lib/inventory";
import { InventoryRowActions } from "./inventory-row-actions";

type InventoryRow = {
  id: string;
  title: string;
  status: string;
  internal_category: string | null;
  list_price: number | null;
  unit_cost: number | null;
  qty_on_hand: number;
  qty_listed: number;
  acquisition_source: string | null;
  created_at: string;
};

type Props = {
  accountId: string;
  items: InventoryRow[];
};

function formatSubtitle(createdAt: string) {
  const d = new Date(createdAt);
  return `Added on ${d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function InventoryTable({ accountId, items }: Props) {
  if (!items.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No inventory items found.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ITEM</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>EBAY</TableHead>
          <TableHead>LOT</TableHead>
          <TableHead>CATEGORY</TableHead>
          <TableHead>UNIT COST</TableHead>
          <TableHead>LIST PRICE</TableHead>
          <TableHead>QTY</TableHead>
          <TableHead className="w-[120px]">ACTIONS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <Link
                  href={`/app/inventory/${item.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {item.title.length > 32 ? `${item.title.slice(0, 32)}...` : item.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatSubtitle(item.created_at)}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={getStatusBadgeVariant(item.status)}
                className="capitalize"
              >
                {item.status}
              </Badge>
            </TableCell>
            <TableCell>
              {item.qty_listed > 0 ? (
                <Badge variant="success">Listed</Badge>
              ) : (
                <Badge variant="secondary">Unlisted</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.acquisition_source === "lot" ? "Lot" : "—"}
            </TableCell>
            <TableCell className="max-w-[180px] truncate text-muted-foreground">
              {item.internal_category ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.unit_cost != null ? formatCurrency(item.unit_cost) : "—"}
            </TableCell>
            <TableCell>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {item.list_price != null ? formatCurrency(item.list_price) : "—"}
              </span>
            </TableCell>
            <TableCell>{item.qty_on_hand}</TableCell>
            <TableCell>
              <InventoryRowActions
                itemId={item.id}
                accountId={accountId}
                item={{
                  title: item.title,
                  qty_on_hand: item.qty_on_hand,
                  list_price: item.list_price,
                  unit_cost: item.unit_cost,
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
