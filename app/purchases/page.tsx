"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, Timestamp, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { DollarSign, PlusCircle, TrendingUp, TrendingDown } from "lucide-react"

interface Product {
  id: string
  name: string
}

interface Purchase {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalCost: number
  purchaseDate: Timestamp
  supplierName: string
}

interface Sale {
  id: string
  invoiceId: string
  invoiceNumber: string
  totalAmount: number
  date: Timestamp
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false)

  // Purchase form state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedProductName, setSelectedProductName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [totalCost, setTotalCost] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [supplierName, setSupplierName] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (quantity && unitPrice) {
      const total = Number.parseFloat(quantity) * Number.parseFloat(unitPrice)
      setTotalCost(total.toFixed(2))
    } else {
      setTotalCost("")
    }
  }, [quantity, unitPrice])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch products
      const productsSnapshot = await getDocs(collection(db, "products"))
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }))
      setProducts(productsData)

      // Fetch purchases
      const purchasesQuery = query(collection(db, "purchases"), orderBy("purchaseDate", "desc"))
      const purchasesSnapshot = await getDocs(purchasesQuery)
      const purchasesData = purchasesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Purchase[]
      setPurchases(purchasesData)

      // Fetch sales and join with invoice data to get invoice numbers
      const salesQuery = query(collection(db, "sales"), orderBy("date", "desc"))
      const salesSnapshot = await getDocs(salesQuery)

      const salesPromises = salesSnapshot.docs.map(async (doc) => {
        const sale = doc.data()
        // Fetch the associated invoice to get its number
        const invoiceSnapshot = await getDocs(collection(db, "invoices"))
        let invoiceNumber = "Unknown"

        invoiceSnapshot.docs.forEach((invDoc) => {
          if (invDoc.id === sale.invoiceId) {
            invoiceNumber = invDoc.data().invoiceNumber
          }
        })

        return {
          id: doc.id,
          ...sale,
          invoiceNumber,
        }
      })

      const salesData = (await Promise.all(salesPromises)) as Sale[]
      setSales(salesData)
    } catch (error) {
      console.error("Error fetching data: ", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPurchase = async () => {
    if (!selectedProductId || !quantity || !unitPrice || !purchaseDate || !supplierName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const newPurchase = {
        productId: selectedProductId,
        productName: selectedProductName,
        quantity: Number.parseFloat(quantity),
        unitPrice: Number.parseFloat(unitPrice),
        totalCost: Number.parseFloat(totalCost),
        purchaseDate: Timestamp.fromDate(new Date(purchaseDate)),
        supplierName,
      }

      await addDoc(collection(db, "purchases"), newPurchase)
      resetPurchaseForm()
      setIsAddPurchaseOpen(false)
      fetchData()

      toast({
        title: "Purchase Added",
        description: `Purchase for ${selectedProductName} has been recorded.`,
      })
    } catch (error) {
      console.error("Error adding purchase: ", error)
      toast({
        title: "Error",
        description: "Failed to record the purchase. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetPurchaseForm = () => {
    setSelectedProductId("")
    setSelectedProductName("")
    setQuantity("")
    setUnitPrice("")
    setTotalCost("")
    setPurchaseDate(format(new Date(), "yyyy-MM-dd"))
    setSupplierName("")
  }

  // Calculate totals
  const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const totalPurchasesAmount = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0)
  const netProfit = totalSalesAmount - totalPurchasesAmount

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-purple-800">Sales & Purchases</h1>
        <Button onClick={() => setIsAddPurchaseOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Purchase
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <DollarSign className="h-6 w-6 opacity-80" />
              <div className="text-2xl font-bold">${totalSalesAmount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <DollarSign className="h-6 w-6 opacity-80" />
              <div className="text-2xl font-bold">${totalPurchasesAmount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`bg-gradient-to-br ${netProfit >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"} text-white`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {netProfit >= 0 ? (
                <TrendingUp className="h-6 w-6 opacity-80" />
              ) : (
                <TrendingDown className="h-6 w-6 opacity-80" />
              )}
              <div className="text-2xl font-bold">${Math.abs(netProfit).toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10">
                        Loading sales data...
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10">
                        No sales recorded yet. Create an invoice to record a sale.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{format(sale.date.toDate(), "PPP")}</TableCell>
                        <TableCell>{sale.invoiceNumber}</TableCell>
                        <TableCell className="text-right font-medium">${sale.totalAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        Loading purchase data...
                      </TableCell>
                    </TableRow>
                  ) : purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        No purchases recorded yet. Add a purchase to track your inventory costs.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>{format(purchase.purchaseDate.toDate(), "PPP")}</TableCell>
                        <TableCell>{purchase.supplierName}</TableCell>
                        <TableCell>{purchase.productName}</TableCell>
                        <TableCell>{purchase.quantity}</TableCell>
                        <TableCell>${purchase.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${purchase.totalCost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddPurchaseOpen} onOpenChange={setIsAddPurchaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Purchase</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product" className="text-right">
                Product
              </Label>
              <div className="col-span-3">
                <Select
                  value={selectedProductId}
                  onValueChange={(value) => {
                    setSelectedProductId(value)
                    const product = products.find((p) => p.id === value)
                    if (product) {
                      setSelectedProductName(product.name)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unitPrice" className="text-right">
                Unit Price
              </Label>
              <Input
                id="unitPrice"
                type="number"
                min="0.01"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="totalCost" className="text-right">
                Total Cost
              </Label>
              <Input
                id="totalCost"
                type="number"
                step="0.01"
                value={totalCost}
                readOnly
                className="col-span-3 bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchaseDate" className="text-right">
                Purchase Date
              </Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplierName" className="text-right">
                Supplier
              </Label>
              <Input
                id="supplierName"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPurchaseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPurchase} className="bg-purple-600 hover:bg-purple-700">
              Add Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
