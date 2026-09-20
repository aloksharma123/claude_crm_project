require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/companies");
const contactRoutes = require("./routes/contacts");
const dealRoutes = require("./routes/deals");
const activityRoutes = require("./routes/activities");
const dashboardRoutes = require("./routes/dashboard");
const leadRoutes = require("./routes/leads");
const productRoutes = require("./routes/products");
const caseRoutes = require("./routes/cases");
const forecastRoutes = require("./routes/forecast");
const teamRoutes = require("./routes/team");
const billingRoutes = require("./routes/billing");
const reportsRoutes = require("./routes/reports");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/reports", reportsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`CRM API listening on port ${port}`));

// A safety net: an unhandled async error anywhere should never take the
// whole server down. Log it and keep serving other requests.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
