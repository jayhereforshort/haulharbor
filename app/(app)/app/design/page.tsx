"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from "@/components/ui/toast";
import { BarChart3 } from "lucide-react";

export default function DesignPage() {
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-display">UI Patterns</h1>
        <p className="text-caption mt-1">
          Reference for buttons, inputs, tags, modal, table, cards, empty state, and skeletons.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-heading">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Inputs</h2>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="demo-email">Email</Label>
          <Input id="demo-email" type="email" placeholder="you@example.com" />
          <Label htmlFor="demo-pw">Password</Label>
          <Input id="demo-pw" type="password" placeholder="••••••••" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Tags / Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Modal</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open modal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Example modal</DialogTitle>
              <DialogDescription>
                Use this pattern for confirmations and forms. Keep content concise.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Table</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Item A</TableCell>
              <TableCell><Badge variant="success">Active</Badge></TableCell>
              <TableCell>$120.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Item B</TableCell>
              <TableCell><Badge variant="secondary">Draft</Badge></TableCell>
              <TableCell>$85.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Item C</TableCell>
              <TableCell><Badge variant="outline">Pending</Badge></TableCell>
              <TableCell>$200.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Cards</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Short description for the card.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Body content goes here. Use for KPIs, lists, or short content.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>With footer</CardTitle>
              <CardDescription>Optional footer for actions.</CardDescription>
            </CardHeader>
            <CardContent>Content</CardContent>
            <CardFooter className="gap-2">
              <Button size="sm" variant="outline">Cancel</Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>
          <Card className="border-border shadow-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Card with content only (e.g. empty state container).
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Empty state</h2>
        <Card className="border-border shadow-card">
          <CardContent className="pt-6">
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title="No items yet"
              description="Add your first item to get started. This pattern guides users when lists or data are empty."
              action={<Button size="sm">Add item</Button>}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Loading skeletons</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full max-w-[200px]" />
              <Skeleton className="h-3 w-full max-w-[120px]" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading">Toast</h2>
        <ToastProvider>
          <Button variant="outline" onClick={() => setToastOpen(true)}>
            Show toast
          </Button>
          <Toast open={toastOpen} onOpenChange={setToastOpen}>
            <ToastTitle>Notification</ToastTitle>
            <ToastDescription>This is a toast message. It auto-dismisses or can be closed.</ToastDescription>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      </section>
    </div>
  );
}
