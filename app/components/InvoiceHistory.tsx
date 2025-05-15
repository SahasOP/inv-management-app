import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Eye } from "lucide-react";

interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: Timestamp;
  clientName: string;
  clientAddress: string;
  items: InvoiceItem[];
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  type: "GST" | "Non-GST";
  notes: string;
}

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "invoices"));
      const invoicesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invoice[];

      // Sort invoices by date (newest first)
      invoicesData.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      setInvoices(invoicesData);
    } catch (error: unknown) {
      console.error("Error fetching invoices:", error instanceof Error ? error.message : error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>
                  {format(invoice.date.toDate(), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>{invoice.clientName}</TableCell>
                <TableCell>{invoice.type}</TableCell>
                <TableCell className="text-right">
                  ${invoice.totalAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    {selectedInvoice && (
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Invoice Details - {selectedInvoice.invoiceNumber}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-1">Client Details</h4>
                              <p>{selectedInvoice.clientName}</p>
                              <p className="text-sm text-gray-500 whitespace-pre-line">
                                {selectedInvoice.clientAddress}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">Invoice Details</h4>
                              <p>Date: {format(selectedInvoice.date.toDate(), "dd/MM/yyyy")}</p>
                              <p>Type: {selectedInvoice.type}</p>
                            </div>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Tax Rate</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedInvoice.items.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{item.taxRate}%</TableCell>
                                  <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>${selectedInvoice.subTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-bold border-t pt-2">
                                <span>Total:</span>
                                <span>${selectedInvoice.totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {selectedInvoice.notes && (
                            <div>
                              <h4 className="font-semibold mb-1">Notes</h4>
                              <p className="text-sm text-gray-500 whitespace-pre-line">
                                {selectedInvoice.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 