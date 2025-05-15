"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { DollarSign, Package, FileText } from "lucide-react"

export default function Dashboard() {
  const [salesData, setSalesData] = useState([])
  const [purchasesData, setPurchasesData] = useState([])
  const [productsCount, setProductsCount] = useState(0)
  const [invoicesCount, setInvoicesCount] = useState(0)
  const [totalSales, setTotalSales] = useState(0)
  const [totalPurchases, setTotalPurchases] = useState(0)
  const [categoryData, setCategoryData] = useState([])
  const [profitData, setProfitData] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get products count
        const productsSnapshot = await getDocs(collection(db, "products"))
        setProductsCount(productsSnapshot.size)

        // Get invoices count
        const invoicesSnapshot = await getDocs(collection(db, "invoices"))
        setInvoicesCount(invoicesSnapshot.size)

        // Get total sales
        const salesSnapshot = await getDocs(collection(db, "sales"))
        let totalSalesAmount = 0
        const salesByMonth = {}

        salesSnapshot.forEach((doc) => {
          const sale = doc.data()
          totalSalesAmount += sale.totalAmount

          // Group by month for chart
          const date = sale.date.toDate()
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

          if (!salesByMonth[monthYear]) {
            salesByMonth[monthYear] = 0
          }
          salesByMonth[monthYear] += sale.totalAmount
        })

        setTotalSales(totalSalesAmount)

        // Convert to array for charts
        const salesDataArray = Object.keys(salesByMonth).map((key) => ({
          month: key,
          sales: salesByMonth[key],
        }))

        setSalesData(salesDataArray)

        // Get total purchases
        const purchasesSnapshot = await getDocs(collection(db, "purchases"))
        let totalPurchasesAmount = 0
        const purchasesByMonth = {}

        purchasesSnapshot.forEach((doc) => {
          const purchase = doc.data()
          totalPurchasesAmount += purchase.totalCost

          // Group by month for chart
          const date = purchase.purchaseDate.toDate()
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

          if (!purchasesByMonth[monthYear]) {
            purchasesByMonth[monthYear] = 0
          }
          purchasesByMonth[monthYear] += purchase.totalCost
        })

        setTotalPurchases(totalPurchasesAmount)

        // Convert to array for charts
        const purchasesDataArray = Object.keys(purchasesByMonth).map((key) => ({
          month: key,
          purchases: purchasesByMonth[key],
        }))

        setPurchasesData(purchasesDataArray)

        // Create profit data
        const allMonths = new Set([...Object.keys(salesByMonth), ...Object.keys(purchasesByMonth)])
        const profitByMonth = Array.from(allMonths).map((month) => ({
          month,
          profit: (salesByMonth[month] || 0) - (purchasesByMonth[month] || 0),
        }))

        setProfitData(profitByMonth)

        // Get category data
        const categoryMap = {}
        const salesByCategory = {}

        // First collect all products by category
        productsSnapshot.forEach((doc) => {
          const product = doc.data()
          if (!categoryMap[product.category]) {
            categoryMap[product.category] = []
          }
          categoryMap[product.category].push(doc.id)
        })

        // Then collect sales by category from invoices
        const invoiceItemsSnapshot = await getDocs(collection(db, "invoices"))

        invoiceItemsSnapshot.forEach((doc) => {
          const invoice = doc.data()
          invoice.items.forEach((item) => {
            // Find which category this product belongs to
            for (const [category, productIds] of Object.entries(categoryMap)) {
              if (productIds.includes(item.productId)) {
                if (!salesByCategory[category]) {
                  salesByCategory[category] = 0
                }
                salesByCategory[category] += item.total
                break
              }
            }
          })
        })

        // Convert to array for pie chart
        const categoryDataArray = Object.keys(salesByCategory).map((category) => ({
          name: category,
          value: salesByCategory[category],
        }))

        setCategoryData(categoryDataArray)
      } catch (error) {
        console.error("Error fetching data: ", error)
      }
    }

    fetchData()
  }, [])

  // Placeholder data if we don't have real data yet
  const placeholderSalesData = [
    { month: "1/2023", sales: 4000 },
    { month: "2/2023", sales: 3000 },
    { month: "3/2023", sales: 2000 },
    { month: "4/2023", sales: 2780 },
    { month: "5/2023", sales: 1890 },
    { month: "6/2023", sales: 2390 },
  ]

  const placeholderPurchasesData = [
    { month: "1/2023", purchases: 2400 },
    { month: "2/2023", purchases: 1398 },
    { month: "3/2023", purchases: 9800 },
    { month: "4/2023", purchases: 3908 },
    { month: "5/2023", purchases: 4800 },
    { month: "6/2023", purchases: 3800 },
  ]

  const placeholderProfitData = [
    { month: "1/2023", profit: 1600 },
    { month: "2/2023", profit: 1602 },
    { month: "3/2023", profit: -7800 },
    { month: "4/2023", profit: -1128 },
    { month: "5/2023", profit: -2910 },
    { month: "6/2023", profit: -1410 },
  ]

  const placeholderCategoryData = [
    { name: "Electronics", value: 400 },
    { name: "Books", value: 300 },
    { name: "Clothing", value: 300 },
    { name: "Food", value: 200 },
  ]

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE", "#00C49F"]

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-purple-800">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <DollarSign className="h-6 w-6 opacity-80" />
              <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
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
              <div className="text-2xl font-bold">${totalPurchases.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Package className="h-6 w-6 opacity-80" />
              <div className="text-2xl font-bold">{productsCount}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <FileText className="h-6 w-6 opacity-80" />
              <div className="text-2xl font-bold">{invoicesCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-purple-800">Monthly Sales & Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData.length ? salesData : placeholderSalesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-purple-800">Category Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.length ? categoryData : placeholderCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(categoryData.length ? categoryData : placeholderCategoryData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-purple-800">Profit vs Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={profitData.length ? profitData : placeholderProfitData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="profit" name="Profit/Loss" stroke="#82ca9d" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
