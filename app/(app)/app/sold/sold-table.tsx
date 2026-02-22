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
import {
  formatCurrency,
  saleGross,
  saleNet,
  saleProfit,
  type Sale,
  type SaleLineItem,
} from "@/lib/sales";

type SaleRow = Sale & {
  line_items: SaleLineItem[];
};

type Props = {
  sales: SaleRow[];
};

function channelLabel(channel: string): string {
  if (channel === "EBAY") return "eBay";
  if (channel === "OFFLINE") return "Offline";
  if (channel === "WHOLESALE") return "Wholesale";
  return channel;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "paid") return "default";
  if (status === "pending") return "secondary";
  if (status === "refunded" || status === "cancelled") return "destructive";
  return "outline";
}

export function SoldTable({ sales }: Props) {
  if (!sales.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No sales yet. Record an offline sale or sync from a channel.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>DATE</TableHead>
          <TableHead>CHANNEL</TableHead>
          <TableHead>BUYER</TableHead>
          <TableHead className="text-right">ITEMS</TableHead>
          <TableHead className="text-right">GROSS</TableHead>
          <TableHead className="text-right">FEES</TableHead>
          <TableHead className="text-right">TAXES</TableHead>
          <TableHead className="text-right">SHIPPING</TableHead>
          <TableHead className="text-right">NET</TableHead>
          <TableHead className="text-right">PROFIT</TableHead>
          <TableHead>STATUS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => {
          const gross = saleGross(sale.line_items);
          const net = saleNet(gross, sale.fees, sale.taxes, sale.shipping);
          const profit = saleProfit(net, sale.line_items);
          const itemsCount = sale.line_items.reduce((s, l) => s + l.qty_sold, 0);
          return (
            <TableRow key={sale.id}>
              <TableCell>
                <Link
                  href={`/app/sold/${sale.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {new Date(sale.sale_date).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Link>
              </TableCell>
              <TableCell>{channelLabel(sale.channel)}</TableCell>
              <TableCell className="max-w-[140px] truncate text-muted-foreground">
                {sale.buyer ?? "—"}
              </TableCell>
              <TableCell className="text-right">{itemsCount}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(gross)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(sale.fees)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(sale.taxes)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(sale.shipping)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(net)}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    profit >= 0
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "font-medium text-destructive"
                  }
                >
                  {formatCurrency(profit)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(sale.status)} className="capitalize">
                  {sale.status.replace("_", " ")}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
