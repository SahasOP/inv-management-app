"use client"

import { useState, useEffect, useRef } from "react"
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Printer, Download, X, Check } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoiceHistory } from "../components/InvoiceHistory"
import { generatePdf } from "../components/PdfGenerator"

interface Product {
  id: string
  name: string
  category: string
  sku: string
  price: number
  taxRate: number
}

interface InvoiceItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

interface Invoice {
  invoiceNumber: string
  date: Timestamp
  clientName: string
  clientAddress: string
  items: InvoiceItem[]
  subTotal: number
  taxAmount: number
  totalAmount: number
  type: "GST" | "Non-GST"
  notes: string
}

export default function InvoicePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  // Invoice state
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [clientName, setClientName] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [notes, setNotes] = useState("")
  const [isGST, setIsGST] = useState(true)

  // Calculated totals
  const [subTotal, setSubTotal] = useState(0)
  const [taxAmount, setTaxAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  useEffect(() => {
    fetchProducts()
    generateInvoiceNumber()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts([])
    }
  }, [searchQuery, products])

  useEffect(() => {
    calculateTotals()
  }, [invoiceItems, isGST])

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"))
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[]

      setProducts(productsData)
    } catch (error) {
      console.error("Error fetching products: ", error)
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "invoices"))
      const count = querySnapshot.size
      const newInvoiceNumber = `INV-${(count + 1).toString().padStart(5, "0")}`
      setInvoiceNumber(newInvoiceNumber)
    } catch (error) {
      console.error("Error generating invoice number: ", error)
      setInvoiceNumber(`INV-${new Date().getTime().toString().slice(-5)}`)
    }
  }

  const addProductToInvoice = (product: Product) => {
    const existingItemIndex = invoiceItems.findIndex((item) => item.productId === product.id)

    if (existingItemIndex >= 0) {
      // If product already exists, update quantity
      const updatedItems = [...invoiceItems]
      updatedItems[existingItemIndex].quantity += 1
      updatedItems[existingItemIndex].total =
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice

      setInvoiceItems(updatedItems)
    } else {
      // Add new product
      const newItem: InvoiceItem = {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        taxRate: product.taxRate,
        total: product.price,
      }

      setInvoiceItems([...invoiceItems, newItem])
    }

    setSearchQuery("")
    setIsSearching(false)
  }

  const updateItemQuantity = (index: number, quantity: number | string) => {
    const numericQuantity = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
    if (isNaN(numericQuantity) || numericQuantity < 1) return;

    const updatedItems = [...invoiceItems];
    updatedItems[index].quantity = numericQuantity;
    updatedItems[index].total = numericQuantity * updatedItems[index].unitPrice;

    setInvoiceItems(updatedItems);
  };

  const updateItemPrice = (index: number, price: number | string) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice) || numericPrice < 0) return;

    const updatedItems = [...invoiceItems];
    updatedItems[index].unitPrice = numericPrice;
    updatedItems[index].total = updatedItems[index].quantity * numericPrice;

    setInvoiceItems(updatedItems);
  };

  const updateItemTaxRate = (index: number, taxRate: number | string) => {
    const numericTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
    if (isNaN(numericTaxRate) || numericTaxRate < 0) return;

    const updatedItems = [...invoiceItems];
    updatedItems[index].taxRate = numericTaxRate;

    setInvoiceItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = [...invoiceItems]
    updatedItems.splice(index, 1)
    setInvoiceItems(updatedItems)
  }

  const calculateTotals = () => {
    const sub = invoiceItems.reduce((sum, item) => sum + item.total, 0)
    let tax = 0

    if (isGST) {
      tax = invoiceItems.reduce((sum, item) => sum + (item.total * item.taxRate) / 100, 0)
    }

    setSubTotal(sub)
    setTaxAmount(tax)
    setTotalAmount(sub + tax)
  }

  const saveInvoice = async () => {
    if (!clientName) {
      toast({
        title: "Missing Information",
        description: "Please enter client name.",
        variant: "destructive",
      })
      return
    }

    if (invoiceItems.length === 0) {
      toast({
        title: "Empty Invoice",
        description: "Please add at least one product to the invoice.",
        variant: "destructive",
      })
      return
    }

    try {
      const invoice: Invoice = {
        invoiceNumber,
        date: Timestamp.fromDate(new Date(invoiceDate)),
        clientName,
        clientAddress,
        items: invoiceItems,
        subTotal,
        taxAmount,
        totalAmount,
        type: isGST ? "GST" : "Non-GST",
        notes,
      }

      // Save invoice to Firestore
      const docRef = await addDoc(collection(db, "invoices"), invoice)

      // Record sale
      await addDoc(collection(db, "sales"), {
        invoiceId: docRef.id,
        totalAmount,
        date: Timestamp.fromDate(new Date()),
      })

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceNumber} has been created successfully.`,
      })

      // Reset form for a new invoice
      setInvoiceItems([])
      setClientName("")
      setClientAddress("")
      setNotes("")
      generateInvoiceNumber()
    } catch (error) {
      console.error("Error saving invoice: ", error)
      toast({
        title: "Error",
        description: "Failed to save the invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  // const printInvoice = () => {
  //   if (invoiceRef.current) {
  //     window.print()
  //   }
  // }

  const downloadInvoice = () => {
    generatePdf({ invoiceRef, invoiceNumber });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Invoice</TabsTrigger>
          <TabsTrigger value="history">Invoice History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-purple-800">Invoice Builder</h1>
            <div className="flex gap-2">
              <Button onClick={saveInvoice} className="bg-purple-600 hover:bg-purple-700">
                <Check className="mr-2 h-4 w-4" /> Save Invoice
              </Button>
              {/* <Button onClick={printInvoice} variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button> */}
              <Button onClick={downloadInvoice} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-number">Invoice Number</Label>
                      <Input id="invoice-number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoice-date">Invoice Date</Label>
                      <Input
                        id="invoice-date"
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-name">Client Name</Label>
                      <Input id="client-name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-address">Client Address</Label>
                      <Input id="client-address" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="gst-toggle" checked={isGST} onCheckedChange={setIsGST} />
                        <Label htmlFor="gst-toggle">GST Invoice</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Products</Label>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsSearching(!isSearching)}>
                          <Search className="mr-2 h-4 w-4" />
                          Search Products
                        </Button>
                      </div>
                    </div>

                    {isSearching && (
                      <div className="relative">
                        <Input
                          placeholder="Search for products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="mb-2"
                        />

                        {filteredProducts.length > 0 && (
                          <div className="absolute z-10 w-full bg-white rounded-md border shadow-md max-h-60 overflow-auto">
                            {filteredProducts.map((product) => (
                              <div
                                key={product.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b flex justify-between items-center"
                                onClick={() => addProductToInvoice(product)}
                              >
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.category}</div>
                                </div>
                                <div className="text-right">
                                  <div>${product.price.toFixed(2)}</div>
                                  <div className="text-sm text-gray-500">Tax: {product.taxRate}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="w-[100px]">Quantity</TableHead>
                          <TableHead className="w-[150px]">Price</TableHead>
                          {isGST && <TableHead className="w-[120px]">Tax Rate %</TableHead>}
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isGST ? 6 : 5} className="text-center py-10 text-muted-foreground">
                              No items added yet. Search for products to add them to the invoice.
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoiceItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity || ''}
                                  onChange={(e) => updateItemQuantity(index, e.target.value)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice || ''}
                                  onChange={(e) => updateItemPrice(index, e.target.value)}
                                  className="w-24"
                                />
                              </TableCell>
                              {isGST && (
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={item.taxRate}
                                    onChange={(e) => updateItemTaxRate(index, Number.parseFloat(e.target.value))}
                                    className="w-20"
                                  />
                                </TableCell>
                              )}
                              <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="h-8 w-8 p-0 text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional notes here..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-lg font-bold border-t">
                    <span>Total:</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <InvoiceHistory />
        </TabsContent>
      </Tabs>

      {/* Invoice Preview (hidden, used for printing/PDF) */}
      <div className="hidden">
        <div ref={invoiceRef} className="p-8 max-w-4xl mx-auto bg-white">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-purple-800 mb-2">INVOICE</h1>
              <p className="text-gray-500">#{invoiceNumber}</p>
              <p className="text-gray-500 mt-2">Date: {invoiceDate}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800 mb-1">InvoiceHub</h2>
              <p className="text-gray-500">123 Business Street</p>
              <p className="text-gray-500">Business City, 12345</p>
              <p className="text-gray-500">contact@invoicehub.com</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
            <p className="font-medium">{clientName}</p>
            <p className="text-gray-600 whitespace-pre-line">{clientAddress}</p>
          </div>

          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="bg-purple-100">
                <th className="border border-gray-300 p-2 text-left">Item</th>
                <th className="border border-gray-300 p-2 text-center">Quantity</th>
                <th className="border border-gray-300 p-2 text-right">Unit Price</th>
                {isGST && <th className="border border-gray-300 p-2 text-right">Tax Rate</th>}
                <th className="border border-gray-300 p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{item.name}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-right">${item.unitPrice.toFixed(2)}</td>
                  {isGST && <td className="border border-gray-300 p-2 text-right">{item.taxRate}%</td>}
                  <td className="border border-gray-300 p-2 text-right">${item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal:</span>
                <span>${subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300">
                <span>Total:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Notes:</h3>
              <p className="text-gray-600 whitespace-pre-line">{notes}</p>
            </div>
          )}

          <div className="text-center text-gray-500 text-sm mt-16">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
