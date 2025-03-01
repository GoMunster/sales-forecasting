// Start of SalesForecastingTool.js
// Use global variables instead of import statements
const { useState, useEffect } = React;
const { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

// Add a console log to debug
console.log("SalesForecastingTool script loaded");

const SalesForecastingTool = () => {
  console.log("SalesForecastingTool component started rendering");
  const [salesPeriod, setSalesPeriod] = useState("");
  const [xValue, setXValue] = useState("");
  const [yValue, setYValue] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [historicalData, setHistoricalData] = useState(() => {
    // Load from localStorage if available
    const savedData = localStorage.getItem("historicalData");
    return savedData ? JSON.parse(savedData) : [];
  });
  const [regressionResult, setRegressionResult] = useState(null);

  // State for future forecasting
  const [futurePeriods, setFuturePeriods] = useState(() => {
    // Load from localStorage if available
    const savedPeriods = localStorage.getItem("futurePeriods");
    return savedPeriods ? JSON.parse(savedPeriods) : [];
  });
  const [forecasts, setForecasts] = useState([]);
  const [showForecasts, setShowForecasts] = useState(false);

  // State for budget calculator
  const [budgetTarget, setBudgetTarget] = useState("");
  const [salesTarget, setSalesTarget] = useState("");
  const [budgetForecast, setBudgetForecast] = useState(null);
  const [salesForecast, setSalesForecast] = useState(null);

  // Load regression result from localStorage
  useEffect(() => {
    const savedRegression = localStorage.getItem("regressionResult");
    if (savedRegression) {
      setRegressionResult(JSON.parse(savedRegression));
    }

    // If we have enough data, calculate regression
    if (historicalData.length >= 2) {
      calculateRegression(historicalData);
    }
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("historicalData", JSON.stringify(historicalData));
    if (regressionResult) {
      localStorage.setItem(
        "regressionResult",
        JSON.stringify(regressionResult)
      );
    }
  }, [historicalData, regressionResult]);

  useEffect(() => {
    localStorage.setItem("futurePeriods", JSON.stringify(futurePeriods));
  }, [futurePeriods]);

  // Add historical data point
  const addDataPoint = () => {
    if (salesPeriod && xValue && yValue && adSpend) {
      const newDataPoint = {
        period: salesPeriod,
        x: parseFloat(xValue),
        y: parseFloat(yValue),
        adSpend: parseFloat(adSpend),
        cpl: parseFloat(adSpend) / parseFloat(xValue),
        cpa: parseFloat(adSpend) / parseFloat(yValue),
        conversionRate: (parseFloat(yValue) / parseFloat(xValue)) * 100,
      };

      const updatedData = [...historicalData, newDataPoint];
      setHistoricalData(updatedData);
      setSalesPeriod("");
      setXValue("");
      setYValue("");
      setAdSpend("");

      // Calculate regression
      calculateRegression(updatedData);
    }
  };

  // Calculate linear regression
  const calculateRegression = (data) => {
    if (data.length < 2) return;

    try {
      // Extract x and y values
      const xValues = data.map((item) => item.x);
      const yValues = data.map((item) => item.y);

      // Calculate means
      const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
      const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;

      // Calculate slope and intercept
      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < xValues.length; i++) {
        numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
        denominator += Math.pow(xValues[i] - xMean, 2);
      }

      const slope = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - slope * xMean;

      // Calculate R-squared
      const predictions = xValues.map((x) => slope * x + intercept);
      const residualSumOfSquares = predictions.reduce(
        (sum, pred, i) => sum + Math.pow(pred - yValues[i], 2),
        0
      );
      const totalSumOfSquares = yValues.reduce(
        (sum, y) => sum + Math.pow(y - yMean, 2),
        0
      );
      const r2 = 1 - residualSumOfSquares / totalSumOfSquares;

      setRegressionResult({ slope, intercept, r2 });
    } catch (error) {
      console.error("Error calculating regression:", error);
    }
  };

  // Calculate forecast based on budget
  const calculateBudgetForecast = () => {
    if (!regressionResult || !budgetTarget || historicalData.length === 0)
      return;

    const budget = parseFloat(budgetTarget);
    const avgCPL = getAvgCPL();

    // How many leads can we get with this budget
    const leads = budget / avgCPL;

    // How many sales will that generate
    const { slope, intercept } = regressionResult;
    const sales = slope * leads + intercept;

    setBudgetForecast({
      budget: budget,
      leads: leads,
      sales: sales,
      cpl: avgCPL,
      cpa: budget / sales,
    });
  };

  // Calculate budget needed for sales target
  const calculateSalesForecast = () => {
    if (!regressionResult || !salesTarget || historicalData.length === 0)
      return;

    const target = parseFloat(salesTarget);
    const { slope, intercept } = regressionResult;
    const avgCPL = getAvgCPL();

    // How many leads needed to reach the target sales
    const leads = (target - intercept) / slope;

    // How much budget is needed to get those leads
    const budget = leads * avgCPL;

    setSalesForecast({
      target: target,
      leads: leads,
      budget: budget,
      cpl: avgCPL,
      cpa: budget / target,
    });
  };

  // Add forecast point
  const addForecastPoint = () => {
    if (salesPeriod && xValue) {
      const newForecast = {
        period: salesPeriod,
        xValue: parseFloat(xValue),
      };

      setFuturePeriods([...futurePeriods, newForecast]);
      setSalesPeriod("");
      setXValue("");
    }
  };

  // Generate forecasts
  const generateForecasts = () => {
    if (!regressionResult || futurePeriods.length === 0) return;

    const { slope, intercept } = regressionResult;
    const avgCPL = getAvgCPL();

    const results = futurePeriods.map((period) => {
      const x = period.xValue;
      const y = slope * x + intercept;
      const adSpend = x * avgCPL;

      return {
        period: period.period,
        x: x,
        y: y,
        adSpend: adSpend,
        cpl: avgCPL,
        cpa: adSpend / y,
        conversionRate: (y / x) * 100,
      };
    });

    setForecasts(results);
    setShowForecasts(true);
  };

  // Calculate average cost per lead
  const getAvgCPL = () => {
    if (historicalData.length === 0) return 0;
    return (
      historicalData.reduce((sum, item) => sum + item.cpl, 0) /
      historicalData.length
    );
  };

  // Calculate average cost per acquisition
  const getAvgCPA = () => {
    if (historicalData.length === 0) return 0;
    return (
      historicalData.reduce((sum, item) => sum + item.cpa, 0) /
      historicalData.length
    );
  };

  // Calculate average conversion rate
  const getAvgConversionRate = () => {
    if (historicalData.length === 0) return 0;
    return (
      historicalData.reduce((sum, item) => sum + item.conversionRate, 0) /
      historicalData.length
    );
  };

  // Export data to CSV
  const exportToCSV = () => {
    // Combine historical and forecast data
    const exportData = [
      // Header row
      [
        "Period",
        "Leads",
        "Sales",
        "Ad Spend",
        "Cost Per Lead",
        "Cost Per Sale",
        "Conversion Rate",
        "Type",
      ],
      // Historical data
      ...historicalData.map((item) => [
        item.period,
        item.x,
        item.y,
        item.adSpend,
        item.cpl,
        item.cpa,
        item.conversionRate,
        "Historical",
      ]),
      // Forecast data
      ...forecasts.map((item) => [
        item.period,
        item.x,
        item.y,
        item.adSpend,
        item.cpl,
        item.cpa,
        item.conversionRate,
        "Forecast",
      ]),
    ];

    // Convert to CSV
    const csvContent = exportData.map((row) => row.join(",")).join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sales_forecast.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear all data
  const clearData = () => {
    setHistoricalData([]);
    setRegressionResult(null);
    setForecasts([]);
    setShowForecasts(false);
    setFuturePeriods([]);
    setSalesPeriod("");
    setXValue("");
    setYValue("");
    setAdSpend("");
    setBudgetTarget("");
    setSalesTarget("");
    setBudgetForecast(null);
    setSalesForecast(null);

    // Clear localStorage
    localStorage.removeItem("historicalData");
    localStorage.removeItem("regressionResult");
    localStorage.removeItem("futurePeriods");
  };

  // Remove historical data point
  const removeHistoricalPoint = (index) => {
    const updated = [...historicalData];
    updated.splice(index, 1);
    setHistoricalData(updated);

    // Recalculate regression if we still have data
    if (updated.length >= 2) {
      calculateRegression(updated);
    } else {
      setRegressionResult(null);
    }
  };

  // Remove forecast point
  const removeForecastPoint = (index) => {
    const updated = [...futurePeriods];
    updated.splice(index, 1);
    setFuturePeriods(updated);
  };

  return (
    <div className="forecasting-app">
      <div className="app-header">
        <h1 className="app-title">Sales Forecasting Tool</h1>
        <p className="app-subtitle">
          Predict your sales performance based on historical data and marketing
          spend
        </p>
      </div>

      {/* Historical Data Input Section */}
      <div className="section fade-in">
        <div className="section-header">
          <div className="section-number">1</div>
          <h2 className="section-title">Enter Historical Sales Data</h2>
        </div>

        <div className="input-container">
          <div className="input-group">
            <label className="input-label">Sales Period</label>
            <input
              type="text"
              className="text-input"
              placeholder="e.g., Jan 2023"
              value={salesPeriod}
              onChange={(e) => setSalesPeriod(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">
              Leads (X)
              <span className="tooltip">
                <span className="tooltip-icon">ⓘ</span>
                <span className="tooltip-text">
                  The number of leads generated in this period
                </span>
              </span>
            </label>
            <input
              type="number"
              className="text-input"
              placeholder="e.g., 120"
              value={xValue}
              onChange={(e) => setXValue(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">
              Sales (Y)
              <span className="tooltip">
                <span className="tooltip-icon">ⓘ</span>
                <span className="tooltip-text">
                  The number of sales/conversions in this period
                </span>
              </span>
            </label>
            <input
              type="number"
              className="text-input"
              placeholder="e.g., 25"
              value={yValue}
              onChange={(e) => setYValue(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">
              Ad Spend ($)
              <span className="tooltip">
                <span className="tooltip-icon">ⓘ</span>
                <span className="tooltip-text">
                  Total marketing spend for this period
                </span>
              </span>
            </label>
            <input
              type="number"
              className="text-input"
              placeholder="e.g., 5000"
              value={adSpend}
              onChange={(e) => setAdSpend(e.target.value)}
            />
          </div>
        </div>

        <div className="button-container">
          <button
            className="button primary-button"
            onClick={addDataPoint}
            disabled={!salesPeriod || !xValue || !yValue || !adSpend}
          >
            Add Data Point
          </button>
        </div>

        {/* Display historical data */}
        {historicalData.length > 0 && (
          <div className="mt-4 overflow-x-auto fade-in delay-1">
            <h3 className="font-medium mb-2">Historical Data Points</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Leads</th>
                  <th>Sales</th>
                  <th>Ad Spend</th>
                  <th>Cost/Lead</th>
                  <th>Cost/Sale</th>
                  <th>Conv. Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historicalData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.period}</td>
                    <td>{item.x}</td>
                    <td>{item.y}</td>
                    <td>${item.adSpend.toFixed(2)}</td>
                    <td>${item.cpl.toFixed(2)}</td>
                    <td>${item.cpa.toFixed(2)}</td>
                    <td>{item.conversionRate.toFixed(2)}%</td>
                    <td>
                      <button
                        className="button danger-button"
                        onClick={() => removeHistoricalPoint(index)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historicalData.length < 2 && (
          <div className="warning-box fade-in delay-2">
            <p>
              Please add at least 2 data points to enable regression analysis.
            </p>
          </div>
        )}
      </div>

      {/* Regression Analysis */}
      {historicalData.length >= 2 && regressionResult && (
        <div className="section fade-in">
          <div className="section-header">
            <div className="section-number">2</div>
            <h2 className="section-title">Regression Analysis</h2>
          </div>

          <div className="stats-grid">
            <div className="stats-card blue-gradient">
              <p className="stats-label">Regression Equation</p>
              <p className="stats-value">
                y = {regressionResult.slope.toFixed(4)}x +{" "}
                {regressionResult.intercept.toFixed(4)}
              </p>
            </div>
            <div className="stats-card green-gradient">
              <p className="stats-label">Correlation (R²)</p>
              <p className="stats-value">{regressionResult.r2.toFixed(4)}</p>
              <p className="text-xs mt-1 text-gray-500">
                {regressionResult.r2 > 0.7
                  ? "Strong correlation"
                  : regressionResult.r2 > 0.5
                  ? "Moderate correlation"
                  : "Weak correlation"}
              </p>
            </div>
            <div className="stats-card purple-gradient">
              <p className="stats-label">Avg. Cost Per Lead</p>
              <p className="stats-value">${getAvgCPL().toFixed(2)}</p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Leads" />
                <YAxis type="number" dataKey="y" name="Sales" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Legend />
                <Scatter
                  name="Data Points"
                  data={historicalData}
                  fill="#3b82f6"
                />
                <Line
                  name="Trend Line"
                  type="monotone"
                  dataKey="y"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  data={[
                    {
                      x: Math.min(...historicalData.map((d) => d.x)),
                      y:
                        regressionResult.slope *
                          Math.min(...historicalData.map((d) => d.x)) +
                        regressionResult.intercept,
                    },
                    {
                      x: Math.max(...historicalData.map((d) => d.x)),
                      y:
                        regressionResult.slope *
                          Math.max(...historicalData.map((d) => d.x)) +
                        regressionResult.intercept,
                    },
                  ]}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Budget & Sales Target Calculator */}
      {historicalData.length >= 2 && regressionResult && (
        <div className="section fade-in">
          <div className="section-header">
            <div className="section-number">3</div>
            <h2 className="section-title">Budget & Sales Target Calculator</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div className="stats-card blue-gradient">
              <h3 className="text-lg font-medium mb-3 text-blue-700">
                Budget-Based Forecast
              </h3>
              <p className="mb-3 text-gray-600">
                Enter your available ad budget to see how many leads and sales
                you can expect.
              </p>

              <div className="mb-4">
                <label className="input-label">Available Budget ($)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="text-input"
                    placeholder="e.g., 10000"
                    value={budgetTarget}
                    onChange={(e) => setBudgetTarget(e.target.value)}
                  />
                  <button
                    className="button primary-button"
                    onClick={calculateBudgetForecast}
                    disabled={!budgetTarget}
                  >
                    Calculate
                  </button>
                </div>
              </div>

              {budgetForecast && (
                <div className="info-box">
                  <div className="stats-grid">
                    <div className="stats-card">
                      <p className="stats-label">Estimated Leads</p>
                      <p className="stats-value">
                        {budgetForecast.leads.toFixed(0)}
                      </p>
                    </div>
                    <div className="stats-card">
                      <p className="stats-label">Estimated Sales</p>
                      <p className="stats-value">
                        {budgetForecast.sales.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">
                    With a budget of{" "}
                    <span className="font-semibold">
                      ${parseFloat(budgetTarget).toLocaleString()}
                    </span>
                    , you can expect approximately{" "}
                    <span className="font-semibold">
                      {budgetForecast.leads.toFixed(0)}
                    </span>{" "}
                    leads and
                    <span className="font-semibold">
                      {" "}
                      {budgetForecast.sales.toFixed(2)}
                    </span>{" "}
                    sales.
                  </p>
                </div>
              )}
            </div>

            <div className="stats-card green-gradient">
              <h3 className="text-lg font-medium mb-3 text-green-700">
                Sales-Based Budget
              </h3>
              <p className="mb-3 text-gray-600">
                Enter your target number of sales to see the budget you'll need.
              </p>

              <div className="mb-4">
                <label className="input-label">Sales Target</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="text-input"
                    placeholder="e.g., 50"
                    value={salesTarget}
                    onChange={(e) => setSalesTarget(e.target.value)}
                  />
                  <button
                    className="button success-button"
                    onClick={calculateSalesForecast}
                    disabled={!salesTarget}
                  >
                    Calculate
                  </button>
                </div>
              </div>

              {salesForecast && (
                <div className="info-box">
                  <div className="stats-grid">
                    <div className="stats-card">
                      <p className="stats-label">Required Leads</p>
                      <p className="stats-value">
                        {salesForecast.leads.toFixed(0)}
                      </p>
                    </div>
                    <div className="stats-card">
                      <p className="stats-label">Required Budget</p>
                      <p className="stats-value">
                        $
                        {salesForecast.budget.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">
                    To achieve{" "}
                    <span className="font-semibold">
                      {parseFloat(salesTarget).toFixed(0)}
                    </span>{" "}
                    sales, you'll need approximately{" "}
                    <span className="font-semibold">
                      {salesForecast.leads.toFixed(0)}
                    </span>{" "}
                    leads with a budget of{" "}
                    <span className="font-semibold">
                      $
                      {salesForecast.budget.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="info-box">
            <h4 className="font-medium mb-1 text-gray-700">
              How this calculator works
            </h4>
            <p className="text-sm text-gray-600">
              This calculator uses your historical data to build predictive
              models connecting ad spend to leads and sales. Based on your
              average cost per lead (${getAvgCPL().toFixed(2)}) and the
              relationship between leads and sales (y ={" "}
              {regressionResult.slope.toFixed(4)}x +{" "}
              {regressionResult.intercept.toFixed(4)}), we can predict future
              performance from either a budget constraint or a sales target.
            </p>
          </div>
        </div>
      )}

      {/* Future Forecasting */}
      {historicalData.length >= 2 && regressionResult && (
        <div className="section fade-in">
          <div className="section-header">
            <div className="section-number">4</div>
            <h2 className="section-title">Forecast Future Sales</h2>
          </div>

          <div className="input-container">
            <div className="input-group">
              <label className="input-label">Future Period</label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g., Aug 2023"
                value={salesPeriod}
                onChange={(e) => setSalesPeriod(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">
                Expected Leads
                <span className="tooltip">
                  <span className="tooltip-icon">ⓘ</span>
                  <span className="tooltip-text">
                    Your predicted number of leads for this future period
                  </span>
                </span>
              </label>
              <input
                type="number"
                className="text-input"
                placeholder="e.g., 150"
                value={xValue}
                onChange={(e) => setXValue(e.target.value)}
              />
            </div>
            <div className="input-group flex items-end">
              <button
                className="button primary-button w-full"
                onClick={addForecastPoint}
                disabled={!salesPeriod || !xValue}
              >
                Add Forecast Point
              </button>
            </div>
          </div>

          {/* Display forecast points */}
          {futurePeriods.length > 0 && (
            <div className="mt-4 mb-4 fade-in delay-1">
              <h3 className="font-medium mb-2">Future Data Points</h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Expected Leads</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futurePeriods.map((item, index) => (
                      <tr key={index}>
                        <td>{item.period}</td>
                        <td>{item.xValue}</td>
                        <td>
                          <button
                            className="button danger-button"
                            onClick={() => removeForecastPoint(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="button-container">
            <button
              className="button success-button"
              onClick={generateForecasts}
              disabled={!futurePeriods.length}
            >
              Generate Forecasts
            </button>
            <button
              className="button primary-button"
              onClick={exportToCSV}
              disabled={!(historicalData.length > 0 || forecasts.length > 0)}
            >
              Export Data
            </button>
            <button className="button secondary-button" onClick={clearData}>
              Clear All Data
            </button>
          </div>
        </div>
      )}

      {/* Display Forecasting Results */}
      {showForecasts && forecasts.length > 0 && (
        <div className="section fade-in">
          <div className="section-header">
            <div className="section-number">5</div>
            <h2 className="section-title">Sales Forecasting Results</h2>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Projected Leads</th>
                  <th>Forecasted Sales</th>
                  <th>Est. Ad Spend</th>
                  <th>Est. CPA</th>
                  <th>Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((item, index) => (
                  <tr key={index}>
                    <td>{item.period}</td>
                    <td>{item.x}</td>
                    <td className="font-medium text-blue-700">
                      {item.y.toFixed(2)}
                    </td>
                    <td>${item.adSpend.toFixed(2)}</td>
                    <td>${item.cpa.toFixed(2)}</td>
                    <td>{item.conversionRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  name="Forecasted Sales"
                  data={forecasts}
                  type="monotone"
                  dataKey="y"
                  stroke="#f97316"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="stats-grid mt-6">
            <div className="stats-card blue-gradient">
              <h3 className="stats-label">Total Ad Spend (Forecasted)</h3>
              <p className="stats-value">
                $
                {forecasts
                  .reduce((sum, item) => sum + item.adSpend, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="stats-card green-gradient">
              <h3 className="stats-label">Average Cost Per Lead</h3>
              <p className="stats-value">
                $
                {(
                  forecasts.reduce((sum, item) => sum + item.cpl, 0) /
                  forecasts.length
                ).toFixed(2)}
              </p>
            </div>
            <div className="stats-card purple-gradient">
              <h3 className="stats-label">Average Cost Per Acquisition</h3>
              <p className="stats-value">
                $
                {(
                  forecasts.reduce((sum, item) => sum + item.cpa, 0) /
                  forecasts.length
                ).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer with tips */}
      <div className="section fade-in delay-3">
        <div className="section-header">
          <h2 className="section-title">Tips for Using This Tool</h2>
        </div>

        <ul className="tips-list">
          <li>Add at least 2 historical data points for basic analysis</li>
          <li>More data points (6+) will give you more accurate predictions</li>
          <li>
            Your data is saved in your browser - you won't lose it if you
            refresh
          </li>
          <li>
            Export your data to CSV for further analysis in spreadsheet software
          </li>
          <li>Clear all data if you want to start a new analysis</li>
        </ul>
      </div>
    </div>
  );
};

export default SalesForecastingTool;
