const express = require('express');
const app = express();
const mongoose = require('mongoose');
const axios = require('axios');

// Connect to MongoDB
mongoose.connect('mongodb://localhost/transactions', { useNewUrlParser: true, useUnifiedTopology: true });

// Define the transaction schema
const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  category: String,
  dateOfSale: Date,
  sold: Boolean
});

// Create the transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

// Initialize the database with seed data from third-party API
app.get('/api/initialize', async (req, res) => {
  const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
  const transactions = response.data;
  await Transaction.insertMany(transactions);
  res.send('Database initialized with seed data');
});

// API to list all transactions
app.get('/api/transactions', async (req, res) => {
  const month = req.query.month;
  const search = req.query.search;
  const page = req.query.page || 1;
  const perPage = 10;

  const query = { dateOfSale: { $gte: new Date(`${month}-01`), $lt: new Date(`${month}-32`) } };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { price: { $regex: search, $options: 'i' } }
    ];
  }

  const transactions = await Transaction.find(query).skip((page - 1) * perPage).limit(perPage).exec();
  res.json(transactions);
});

// API for statistics
app.get('/api/statistics', async (req, res) => {
  const month = req.query.month;
  const transactions = await Transaction.find({ dateOfSale: { $gte: new Date(`${month}-01`), $lt: new Date(`${month}-32`) } }).exec();
  const totalSaleAmount = transactions.reduce((acc, transaction) => acc + transaction.price, 0);
  const totalSoldItems = transactions.filter(transaction => transaction.sold).length;
  const totalNotSoldItems = transactions.filter(transaction => !transaction.sold).length;
  res.json({ totalSaleAmount, totalSoldItems, totalNotSoldItems });
});

// API for bar chart
app.get('/api/bar-chart', async (req, res) => {
  const month = req.query.month;
  const transactions = await Transaction.find({ dateOfSale: { $gte: new Date(`${month}-01`), $lt: new Date(`${month}-32`) } }).exec();
  const priceRanges = [
    { range: '0-100', count: 0 },
    { range: '101-200', count: 0 },
    { range: '201-300', count: 0 },
    { range: '301-400', count: 0 },
    { range: '401-500', count: 0 },
    { range: '501-600', count: 0 },
    { range: '601-700', count: 0 },
    { range: '701-800', count: 0 },
    { range: '801-900', count: 0 },
    { range:'901-above', count: 0 }
  ];

  transactions.forEach(transaction => {
    const price = transaction.price;
    if (price <= 100) {
      priceRanges[0].count++;
    } else if (price <= 200) {
      priceRanges[1].count++;
    } else if (price <= 300) {
      priceRanges[2].count++;
    } else if (price <= 400) {
      priceRanges[3].count++;
    } else if (price <= 500) {
      priceRanges[4].count++;
    } else if (price <= 600) {
      priceRanges[5].count++;
    } else if (price <= 700) {
      priceRanges[6].count++;
    } else if (price <= 800) {
      priceRanges[7].count++;
    } else if (price <= 900) {
      priceRanges[8].count++;
    } else {
      priceRanges[9].count++;
    }
  });

  res.json(priceRanges);
});

// API for pie chart
app.get('/api/pie-chart', async (req, res) => {
  const month = req.query.month;
  const transactions = await Transaction.find({ dateOfSale: { $gte: new Date(`${month}-01`), $lt: new Date(`${month}-32`) } }).exec();
  const categories = {};
  transactions.forEach(transaction => {
    const category = transaction.category;
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category]++;
  });

  res.json(categories);
});

// API to fetch combined data
app.get('/api/combined', async (req, res) => {
  const month = req.query.month;
  const transactions = await Transaction.find({ dateOfSale: { $gte: new Date(`${month}-01`), $lt: new Date(`${month}-32`) } }).exec();
  const statistics = await axios.get(`/api/statistics?month=${month}`);
  const barChart = await axios.get(`/api/bar-chart?month=${month}`);
  const pieChart = await axios.get(`/api/pie-chart?month=${month}`);

  res.json({ transactions, statistics, barChart, pieChart });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});