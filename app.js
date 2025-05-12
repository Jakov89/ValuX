// === Configuration & Setup ===
const FMP_API_KEY = 'M3WCOsdd5MojVXueguoarO7fGe9Nkuba';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Application state
let isCompareMode = false;
let incomeStatementChartInstance = null;
let balanceSheetChartInstance = null;
let cashflowChartInstance = null;

// DOM Elements - Main Controls
const stockTickerInput = document.getElementById('stockTickerInput');
const searchBtn = document.getElementById('searchBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessageDiv = document.getElementById('errorMessage');
const resultsContainer = document.getElementById('resultsContainer');

// DOM Elements - Compare Mode
const compareToggle = document.getElementById('compareToggle');
const singleSearchContainer = document.getElementById('singleSearchContainer');
const compareSearchContainer = document.getElementById('compareSearchContainer');
const tickersList = document.getElementById('tickersList');
const addTickerBtn = document.getElementById('addTickerBtn');
const compareBtn = document.getElementById('compareBtn');

// DOM Elements - Content Areas
const companyProfileBody = document.getElementById('companyProfileBody');
const incomeStatementChartCanvas = document.getElementById('incomeStatementChart');
const incomeStatementTableBody = document.getElementById('incomeStatementTableBody');
const balanceSheetChartCanvas = document.getElementById('balanceSheetChart');
const balanceSheetTableBody = document.getElementById('balanceSheetTableBody');
const cashflowChartCanvas = document.getElementById('cashflowChart');
const cashflowTableBody = document.getElementById('cashflowTableBody');
const keyRatiosBody = document.getElementById('keyRatiosBody');
const growthMetricsBody = document.getElementById('growthMetricsBody');
const aiAnalysisBody = document.getElementById('aiAnalysisBody');
const dataSections = document.querySelectorAll('.data-section');

// === Helper Functions ===

// Format numbers with appropriate suffixes (K, M, B)
function formatNumber(value, isCurrency = true, decimals = 2) {
    if (value === null || value === undefined || value === 'N/A' || value === 'None') return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';

    let prefix = isCurrency ? '$' : '';
    let absNum = Math.abs(num);
    let suffix = '';

    if (absNum >= 1.0e+9) {
        absNum /= 1.0e+9; suffix = 'B';
    } else if (absNum >= 1.0e+6) {
        absNum /= 1.0e+6; suffix = 'M';
    } else if (absNum >= 1.0e+3) {
        absNum /= 1.0e+3; suffix = 'K';
    }
    const finalNum = num < 0 ? -absNum : absNum;
    return prefix + finalNum.toFixed(decimals) + suffix;
}

// Format percentages
function formatPercentage(value, decimals = 2) {
    if (value === null || value === undefined || value === 'N/A' || value === 'None') return 'N/A';
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return (num * 100).toFixed(decimals) + '%';
}

// Get color for charts with consistent palette
function getChartColor(index, alpha = 1) {
    const colors = [
        `rgba(0, 123, 255, ${alpha})`,   // Blue
        `rgba(220, 53, 69, ${alpha})`,   // Red
        `rgba(40, 167, 69, ${alpha})`,   // Green
        `rgba(255, 193, 7, ${alpha})`,   // Yellow
        `rgba(111, 66, 193, ${alpha})`,  // Purple
        `rgba(23, 162, 184, ${alpha})`,  // Cyan
        `rgba(255, 102, 0, ${alpha})`,   // Orange
        `rgba(0, 204, 153, ${alpha})`,   // Teal
        `rgba(204, 0, 102, ${alpha})`,   // Pink
        `rgba(102, 102, 102, ${alpha})`  // Gray
    ];
    return colors[index % colors.length];
}

// Show or hide loading indicator
function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
}

// Display error message
function displayError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
    resultsContainer.style.display = 'none';
    showLoading(false);
}

// Clear previous data and charts
function clearPreviousData() {
    errorMessageDiv.style.display = 'none';
    resultsContainer.style.display = 'none';
    dataSections.forEach(section => section.style.display = 'none');

    // Clear content containers
    companyProfileBody.innerHTML = '';
    incomeStatementTableBody.innerHTML = '';
    balanceSheetTableBody.innerHTML = '';
    cashflowTableBody.innerHTML = '';
    keyRatiosBody.innerHTML = '';
    growthMetricsBody.innerHTML = '';
    aiAnalysisBody.innerHTML = '<p class="text-muted"><em>Generating analysis...</em></p>';

    // Destroy chart instances
    if (incomeStatementChartInstance) incomeStatementChartInstance.destroy();
    if (balanceSheetChartInstance) balanceSheetChartInstance.destroy();
    if (cashflowChartInstance) cashflowChartInstance.destroy();
    incomeStatementChartInstance = null;
    balanceSheetChartInstance = null;
    cashflowChartInstance = null;
}

// === API Functions ===

// Generic data fetching function
async function fetchData(endpoint, params = {}) {
    try {
        const queryParams = new URLSearchParams(params);
        queryParams.append('apikey', FMP_API_KEY);
        const url = `${FMP_BASE_URL}/${endpoint}?${queryParams}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

// Fetch all data for a company
async function fetchCompanyData(symbol) {
    try {
        const profile = await fetchData(`profile/${symbol}`);
        if (!profile || profile.length === 0) {
            throw new Error(`No data found for ticker "${symbol}"`);
        }
        
        const incomeStatement = await fetchData(`income-statement/${symbol}`, { limit: 5 });
        const balanceSheet = await fetchData(`balance-sheet-statement/${symbol}`, { limit: 5 });
        const cashFlow = await fetchData(`cash-flow-statement/${symbol}`, { limit: 5 });
        const keyRatios = await fetchData(`ratios-ttm/${symbol}`);
        const growthMetrics = await fetchData(`financial-growth/${symbol}`, { limit: 5 });
        
        return {
            symbol,
            profile,
            incomeStatement,
            balanceSheet,
            cashFlow,
            keyRatios,
            growthMetrics
        };
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        throw error;
    }
}

// === Display Functions ===

// Display company profile information
function displayCompanyProfile(profileData) {
    if (!profileData || profileData.length === 0) {
        companyProfileBody.innerHTML = '<p class="text-danger">No profile data available</p>';
        return;
    }
    
    const profile = profileData[0];
    
    // Create company header with logo and basic info
    const companyHeader = `
        <div class="d-flex align-items-center mb-3">
            <img src="${profile.image}" alt="${profile.companyName} logo" class="company-logo me-3">
            <div>
                <h3>${profile.companyName} (${profile.symbol})</h3>
                <p class="mb-0">${profile.exchange} | ${profile.sector} | ${profile.industry}</p>
                <p class="mb-0">
                    <span class="me-3">Price: <strong>${formatNumber(profile.price)}</strong></span>
                    <span class="me-3">Change: <strong class="${profile.changes >= 0 ? 'text-success' : 'text-danger'}">${formatNumber(profile.changes, true, 2)} (${formatPercentage(profile.changes/profile.price)})</strong></span>
                </p>
            </div>
        </div>
    `;
    
    // Company description only
    const description = `
        <div class="mb-4">
            <p class="company-description">${profile.description}</p>
        </div>
    `;
    
    // Add back CEO, website, employees, country information
    const additionalInfo = `
        <div class="row mb-3">
            <div class="col-md-6">
                <p><strong>CEO:</strong> ${profile.ceo || 'N/A'}</p>
                <p><strong>Website:</strong> <a href="${profile.website}" target="_blank">${profile.website || 'N/A'}</a></p>
            </div>
            <div class="col-md-6">
                <p><strong>Employees:</strong> ${profile.fullTimeEmployees?.toLocaleString() || 'N/A'}</p>
                <p><strong>Country:</strong> ${profile.country || 'N/A'}</p>
            </div>
        </div>
    `;
    
    companyProfileBody.innerHTML = companyHeader + description + additionalInfo;
}

// Display company profile comparison
function displayCompanyProfileComparison(companiesData) {
    if (!companiesData || companiesData.length === 0) {
        companyProfileBody.innerHTML = '<p class="text-danger">No company data available for comparison</p>';
        return;
    }
    
    let comparisonHTML = '<div class="table-responsive"><table class="table table-bordered comparison-table">';
    
    // Header row with company names and logos
    comparisonHTML += '<thead><tr><th scope="col">Metric</th>';
    companiesData.forEach(company => {
        const profile = company.profile[0];
        comparisonHTML += `
            <th scope="col" class="text-center">
                <img src="${profile.image}" alt="${profile.companyName}" class="company-logo-sm mb-2"><br>
                ${profile.companyName} (${profile.symbol})
            </th>
        `;
    });
    comparisonHTML += '</tr></thead><tbody>';
    
    // Add rows for each metric
    const metrics = [
        { name: 'Price', key: 'price', format: (val) => formatNumber(val) },
        { name: 'Market Cap', key: 'mktCap', format: (val) => formatNumber(val) },
        { name: 'P/E Ratio', key: 'pe', format: (val) => parseFloat(val).toFixed(2) },
        { name: 'EPS', key: 'eps', format: (val) => formatNumber(val) },
        { name: 'Beta', key: 'beta', format: (val) => parseFloat(val).toFixed(2) },
        { name: 'Dividend Yield', key: 'lastDiv', format: (val) => formatPercentage(val) },
        { name: 'Sector', key: 'sector', format: (val) => val },
        { name: 'Industry', key: 'industry', format: (val) => val }
    ];
    
    metrics.forEach(metric => {
        comparisonHTML += `<tr><th scope="row">${metric.name}</th>`;
        
        companiesData.forEach(company => {
            const profile = company.profile[0];
            const value = profile[metric.key];
            comparisonHTML += `<td class="text-center">${metric.format(value)}</td>`;
        });
        
        comparisonHTML += '</tr>';
    });
    
    comparisonHTML += '</tbody></table></div>';
    companyProfileBody.innerHTML = comparisonHTML;
}

// Display income statement data
function displayIncomeStatement(incomeData) {
    if (!incomeData || incomeData.length === 0) {
        incomeStatementTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No income statement data available</td></tr>';
        return;
    }
    
    // Sort data chronologically (newest first)
    const sortedData = [...incomeData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create chart data
    const years = sortedData.map(item => item.date.substring(0, 4));
    const revenueData = sortedData.map(item => item.revenue / 1000000);
    const netIncomeData = sortedData.map(item => item.netIncome / 1000000);
    
    // Create chart
    const ctx = incomeStatementChartCanvas.getContext('2d');
    incomeStatementChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueData,
                    backgroundColor: getChartColor(0, 0.6),
                    borderColor: getChartColor(0),
                    borderWidth: 1
                },
                {
                    label: 'Net Income',
                    data: netIncomeData,
                    backgroundColor: getChartColor(1, 0.6),
                    borderColor: getChartColor(1),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Revenue vs Net Income (in Millions)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Create structured table with headers and organized sections
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Fiscal Period</th>
                        ${sortedData.map(item => `<th class="text-end">${item.date}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Revenue</strong></td>
                    </tr>
                    <tr>
                        <td>Revenue</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.revenue)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Cost of Revenue</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.costOfRevenue)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Gross Profit</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.grossProfit)}</strong></td>`).join('')}
                    </tr>
                    <tr>
                        <td>Gross Margin</td>
                        ${sortedData.map(item => {
                            const margin = item.grossProfit / item.revenue;
                            return `<td class="text-end">${formatPercentage(margin)}</td>`;
                        }).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Operating Expenses</strong></td>
                    </tr>
                    <tr>
                        <td>Research & Development</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.researchAndDevelopmentExpenses || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>SG&A Expenses</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.sellingGeneralAndAdministrativeExpenses || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Operating Expenses</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.operatingExpenses || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Operating Income</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.operatingIncome)}</strong></td>`).join('')}
                    </tr>
                    <tr>
                        <td>Operating Margin</td>
                        ${sortedData.map(item => {
                            const margin = item.operatingIncome / item.revenue;
                            return `<td class="text-end">${formatPercentage(margin)}</td>`;
                        }).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Other Income & Expenses</strong></td>
                    </tr>
                    <tr>
                        <td>Interest Expense</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.interestExpense || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Income Before Tax</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.incomeBeforeTax)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Income Tax Expense</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.incomeTaxExpense)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Effective Tax Rate</td>
                        ${sortedData.map(item => {
                            const rate = item.incomeTaxExpense / item.incomeBeforeTax;
                            return `<td class="text-end">${formatPercentage(rate)}</td>`;
                        }).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Profitability</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Net Income</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.netIncome)}</strong></td>`).join('')}
                    </tr>
                    <tr>
                        <td>Net Profit Margin</td>
                        ${sortedData.map(item => {
                            const margin = item.netIncome / item.revenue;
                            return `<td class="text-end">${formatPercentage(margin)}</td>`;
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>EPS (Basic)</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.eps, true, 2)}</strong></td>`).join('')}
                    </tr>
                    <tr>
                        <td>EPS (Diluted)</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.epsdiluted || item.eps, true, 2)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Weighted Avg Shares</td>
                        ${sortedData.map(item => `<td class="text-end">${(item.weightedAverageShsOut / 1000000).toFixed(1)}M</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    incomeStatementTableBody.innerHTML = tableHTML;
}

// Display income statement comparison
function displayIncomeStatementComparison(companiesData) {
    if (!companiesData || companiesData.length === 0) {
        incomeStatementTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No data available for comparison</td></tr>';
        return;
    }
    
    const latestYearData = companiesData.map(company => {
        if (company.incomeStatement && company.incomeStatement.length > 0) {
            return {
                symbol: company.symbol,
                data: company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            };
        }
        return null;
    }).filter(item => item !== null);
    
    if (latestYearData.length === 0) {
        incomeStatementTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No income statement data available for comparison</td></tr>';
        return;
    }
    
    // Chart data
    const symbols = latestYearData.map(item => item.symbol);
    const revenueData = latestYearData.map(item => item.data.revenue / 1000000);
    const netIncomeData = latestYearData.map(item => item.data.netIncome / 1000000);
    
    // Create chart
    const ctx = incomeStatementChartCanvas.getContext('2d');
    incomeStatementChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: symbols,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueData,
                    backgroundColor: getChartColor(0, 0.6),
                    borderColor: getChartColor(0),
                    borderWidth: 1
                },
                {
                    label: 'Net Income',
                    data: netIncomeData,
                    backgroundColor: getChartColor(1, 0.6),
                    borderColor: getChartColor(1),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Revenue vs Net Income (in Millions)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Create comparison table
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover comparison-table">
                <thead class="table-light">
                    <tr>
                        <th>Metric</th>
                        ${companiesData.map(company => `<th class="text-center">${company.symbol}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-secondary">
                        <td colspan="${companiesData.length + 1}"><strong>Revenue & Profitability</strong></td>
                    </tr>
                    <tr>
                        <td>Fiscal Period</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${latestData.date}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Revenue</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.revenue)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Gross Profit</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.grossProfit)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Gross Margin</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const margin = latestData.grossProfit / latestData.revenue;
                                return `<td class="text-center">${formatPercentage(margin)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Operating Income</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.operatingIncome)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Operating Margin</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const margin = latestData.operatingIncome / latestData.revenue;
                                return `<td class="text-center">${formatPercentage(margin)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>Net Income</strong></td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center"><strong>${formatNumber(latestData.netIncome)}</strong></td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Net Profit Margin</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const margin = latestData.netIncome / latestData.revenue;
                                return `<td class="text-center">${formatPercentage(margin)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>EPS</td>
                        ${companiesData.map(company => {
                            if (company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestData = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.eps, true, 2)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    incomeStatementTableBody.innerHTML = tableHTML;
}

// Display balance sheet data
function displayBalanceSheet(balanceSheetData) {
    if (!balanceSheetData || balanceSheetData.length === 0) {
        balanceSheetTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No balance sheet data available</td></tr>';
        return;
    }
    
    // Sort data chronologically (newest first)
    const sortedData = [...balanceSheetData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create chart data
    const years = sortedData.map(item => item.date.substring(0, 4));
    const totalAssetsData = sortedData.map(item => item.totalAssets / 1000000);
    const totalLiabilitiesData = sortedData.map(item => item.totalLiabilities / 1000000);
    const totalEquityData = sortedData.map(item => item.totalStockholdersEquity / 1000000);
    
    // Create chart
    const ctx = balanceSheetChartCanvas.getContext('2d');
    balanceSheetChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Total Assets',
                    data: totalAssetsData,
                    backgroundColor: getChartColor(0, 0.6),
                    borderColor: getChartColor(0),
                    borderWidth: 1
                },
                {
                    label: 'Total Liabilities',
                    data: totalLiabilitiesData,
                    backgroundColor: getChartColor(1, 0.6),
                    borderColor: getChartColor(1),
                    borderWidth: 1
                },
                {
                    label: 'Total Equity',
                    data: totalEquityData,
                    backgroundColor: getChartColor(2, 0.6),
                    borderColor: getChartColor(2),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Assets, Liabilities & Equity (in Millions)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Create structured table with headers and organized sections
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Fiscal Period</th>
                        ${sortedData.map(item => `<th class="text-end">${item.date}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Assets</strong></td>
                    </tr>
                    <tr>
                        <td>Cash & Equivalents</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.cashAndCashEquivalents)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Short-term Investments</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.shortTermInvestments || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Accounts Receivable</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.netReceivables || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Inventory</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.inventory || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Current Assets</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.totalCurrentAssets)}</strong></td>`).join('')}
                    </tr>
                    <tr>
                        <td>Property, Plant & Equipment</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.propertyPlantEquipmentNet || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Long-term Investments</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.longTermInvestments || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Goodwill & Intangibles</td>
                        ${sortedData.map(item => {
                            const goodwillAndIntangibles = (item.goodwill || 0) + (item.intangibleAssets || 0);
                            return `<td class="text-end">${formatNumber(goodwillAndIntangibles)}</td>`;
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Assets</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.totalAssets)}</strong></td>`).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Liabilities</strong></td>
                    </tr>
                    <tr>
                        <td>Accounts Payable</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.accountPayables || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Short-term Debt</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.shortTermDebt || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Current Liabilities</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.totalCurrentLiabilities)}</strong></td>`).join('')}
                    </tr>
                    <tr>
                        <td>Long-term Debt</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.longTermDebt || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Liabilities</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.totalLiabilities)}</strong></td>`).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Shareholders' Equity</strong></td>
                    </tr>
                    <tr>
                        <td>Common Stock</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.commonStock || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Retained Earnings</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.retainedEarnings || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Shareholders' Equity</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.totalStockholdersEquity)}</strong></td>`).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Key Metrics</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Total Debt</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.totalDebt)}</strong></td>`).join('')}
                    </tr>
                    <tr>
                        <td>Net Debt</td>
                        ${sortedData.map(item => {
                            const netDebt = item.totalDebt - item.cashAndCashEquivalents;
                            return `<td class="text-end">${formatNumber(netDebt)}</td>`;
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Working Capital</td>
                        ${sortedData.map(item => {
                            const workingCapital = item.totalCurrentAssets - item.totalCurrentLiabilities;
                            return `<td class="text-end">${formatNumber(workingCapital)}</td>`;
                        }).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    balanceSheetTableBody.innerHTML = tableHTML;
}

// Display balance sheet comparison
function displayBalanceSheetComparison(companiesData) {
    if (!companiesData || companiesData.length === 0) {
        balanceSheetTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No data available for comparison</td></tr>';
        return;
    }
    
    const latestYearData = companiesData.map(company => {
        if (company.balanceSheet && company.balanceSheet.length > 0) {
            return {
                symbol: company.symbol,
                data: company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            };
        }
        return null;
    }).filter(item => item !== null);
    
    if (latestYearData.length === 0) {
        balanceSheetTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No balance sheet data available for comparison</td></tr>';
        return;
    }
    
    // Chart data
    const symbols = latestYearData.map(item => item.symbol);
    const totalAssetsData = latestYearData.map(item => item.data.totalAssets / 1000000);
    const totalLiabilitiesData = latestYearData.map(item => item.data.totalLiabilities / 1000000);
    const totalEquityData = latestYearData.map(item => item.data.totalStockholdersEquity / 1000000);
    
    // Create chart
    const ctx = balanceSheetChartCanvas.getContext('2d');
    balanceSheetChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: symbols,
            datasets: [
                {
                    label: 'Total Assets',
                    data: totalAssetsData,
                    backgroundColor: getChartColor(0, 0.6),
                    borderColor: getChartColor(0),
                    borderWidth: 1
                },
                {
                    label: 'Total Liabilities',
                    data: totalLiabilitiesData,
                    backgroundColor: getChartColor(1, 0.6),
                    borderColor: getChartColor(1),
                    borderWidth: 1
                },
                {
                    label: 'Total Equity',
                    data: totalEquityData,
                    backgroundColor: getChartColor(2, 0.6),
                    borderColor: getChartColor(2),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Assets, Liabilities & Equity (in Millions)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Create comparison table
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover comparison-table">
                <thead class="table-light">
                    <tr>
                        <th>Metric</th>
                        ${companiesData.map(company => `<th class="text-center">${company.symbol}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-secondary">
                        <td colspan="${companiesData.length + 1}"><strong>Balance Sheet Summary</strong></td>
                    </tr>
                    <tr>
                        <td>Fiscal Period</td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${latestData.date}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Assets</strong></td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center"><strong>${formatNumber(latestData.totalAssets)}</strong></td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Liabilities</strong></td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center"><strong>${formatNumber(latestData.totalLiabilities)}</strong></td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>Total Equity</strong></td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center"><strong>${formatNumber(latestData.totalStockholdersEquity)}</strong></td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${companiesData.length + 1}"><strong>Asset Breakdown</strong></td>
                    </tr>
                    <tr>
                        <td>Cash & Equivalents</td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.cashAndCashEquivalents)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Cash to Assets Ratio</td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const ratio = latestData.cashAndCashEquivalents / latestData.totalAssets;
                                return `<td class="text-center">${formatPercentage(ratio)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Total Current Assets</td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.totalCurrentAssets)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${companiesData.length + 1}"><strong>Debt & Liquidity</strong></td>
                    </tr>
                    <tr>
                        <td>Total Debt</td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.totalDebt)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Debt to Equity Ratio</td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const ratio = latestData.totalDebt / latestData.totalStockholdersEquity;
                                return `<td class="text-center">${ratio.toFixed(2)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Current Ratio</td>
                        ${companiesData.map(company => {
                            if (company.balanceSheet && company.balanceSheet.length > 0) {
                                const latestData = company.balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const ratio = latestData.totalCurrentAssets / latestData.totalCurrentLiabilities;
                                return `<td class="text-center">${ratio.toFixed(2)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    balanceSheetTableBody.innerHTML = tableHTML;
}

// Display cash flow statement
function displayCashFlow(cashFlowData) {
    if (!cashFlowData || cashFlowData.length === 0) {
        cashflowTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No cash flow data available</td></tr>';
        return;
    }
    
    // Sort data chronologically (newest first)
    const sortedData = [...cashFlowData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create chart data
    const years = sortedData.map(item => item.date.substring(0, 4));
    const operatingCashFlowData = sortedData.map(item => item.netCashProvidedByOperatingActivities / 1000000);
    const investingCashFlowData = sortedData.map(item => item.netCashUsedForInvestingActivites / 1000000);
    const financingCashFlowData = sortedData.map(item => item.netCashUsedProvidedByFinancingActivities / 1000000);
    
    // Create chart
    const ctx = cashflowChartCanvas.getContext('2d');
    cashflowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Operating Cash Flow',
                    data: operatingCashFlowData,
                    backgroundColor: getChartColor(0, 0.6),
                    borderColor: getChartColor(0),
                    borderWidth: 1
                },
                {
                    label: 'Investing Cash Flow',
                    data: investingCashFlowData,
                    backgroundColor: getChartColor(1, 0.6),
                    borderColor: getChartColor(1),
                    borderWidth: 1
                },
                {
                    label: 'Financing Cash Flow',
                    data: financingCashFlowData,
                    backgroundColor: getChartColor(2, 0.6),
                    borderColor: getChartColor(2),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Cash Flow Components (in Millions)'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    // Create structured table with headers and organized sections
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Fiscal Period</th>
                        ${sortedData.map(item => `<th class="text-end">${item.date}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Operating Activities</strong></td>
                    </tr>
                    <tr>
                        <td>Net Income</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.netIncome)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Depreciation & Amortization</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.depreciationAndAmortization || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Change in Working Capital</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.changeInWorkingCapital || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Net Cash from Operations</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.netCashProvidedByOperatingActivities)}</strong></td>`).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Investing Activities</strong></td>
                    </tr>
                    <tr>
                        <td>Capital Expenditures</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.capitalExpenditure || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Acquisitions</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.acquisitionsNet || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Purchase of Investments</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.purchasesOfInvestments || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Sale of Investments</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.salesMaturitiesOfInvestments || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Net Cash from Investing</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.netCashUsedForInvestingActivites)}</strong></td>`).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Financing Activities</strong></td>
                    </tr>
                    <tr>
                        <td>Debt Repayment</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.debtRepayment || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Common Stock Issued</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.commonStockIssued || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Common Stock Repurchased</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.commonStockRepurchased || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Dividends Paid</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.dividendsPaid || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Net Cash from Financing</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.netCashUsedProvidedByFinancingActivities)}</strong></td>`).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${sortedData.length + 1}"><strong>Cash Flow Summary</strong></td>
                    </tr>
                    <tr>
                        <td>Net Change in Cash</td>
                        ${sortedData.map(item => `<td class="text-end">${formatNumber(item.netChangeInCash || 0)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td><strong>Free Cash Flow</strong></td>
                        ${sortedData.map(item => `<td class="text-end"><strong>${formatNumber(item.freeCashFlow)}</strong></td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    cashflowTableBody.innerHTML = tableHTML;
}

// Display cash flow comparison
function displayCashFlowComparison(companiesData) {
    if (!companiesData || companiesData.length === 0) {
        cashflowTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No data available for comparison</td></tr>';
        return;
    }
    
    const latestYearData = companiesData.map(company => {
        if (company.cashFlow && company.cashFlow.length > 0) {
            return {
                symbol: company.symbol,
                data: company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            };
        }
        return null;
    }).filter(item => item !== null);
    
    if (latestYearData.length === 0) {
        cashflowTableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No cash flow data available for comparison</td></tr>';
        return;
    }
    
    // Chart data
    const symbols = latestYearData.map(item => item.symbol);
    const operatingCashFlowData = latestYearData.map(item => item.data.netCashProvidedByOperatingActivities / 1000000);
    const freeCashFlowData = latestYearData.map(item => item.data.freeCashFlow / 1000000);
    
    // Create chart
    const ctx = cashflowChartCanvas.getContext('2d');
    cashflowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: symbols,
            datasets: [
                {
                    label: 'Operating Cash Flow',
                    data: operatingCashFlowData,
                    backgroundColor: getChartColor(0, 0.6),
                    borderColor: getChartColor(0),
                    borderWidth: 1
                },
                {
                    label: 'Free Cash Flow',
                    data: freeCashFlowData,
                    backgroundColor: getChartColor(2, 0.6),
                    borderColor: getChartColor(2),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Cash Flow Comparison (in Millions)'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    // Create comparison table
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover comparison-table">
                <thead class="table-light">
                    <tr>
                        <th>Metric</th>
                        ${companiesData.map(company => `<th class="text-center">${company.symbol}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-secondary">
                        <td colspan="${companiesData.length + 1}"><strong>Cash Flow Summary</strong></td>
                    </tr>
                    <tr>
                        <td>Fiscal Period</td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0) {
                                const latestData = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${latestData.date}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>Operating Cash Flow</strong></td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0) {
                                const latestData = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center"><strong>${formatNumber(latestData.netCashProvidedByOperatingActivities)}</strong></td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Operating Cash Flow Margin</td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0 && company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestCashFlow = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const latestIncome = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const margin = latestCashFlow.netCashProvidedByOperatingActivities / latestIncome.revenue;
                                return `<td class="text-center">${formatPercentage(margin)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Cash Flow to Net Income Ratio</td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0 && company.incomeStatement && company.incomeStatement.length > 0) {
                                const latestCashFlow = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const latestIncome = company.incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const ratio = latestCashFlow.netCashProvidedByOperatingActivities / latestIncome.netIncome;
                                return `<td class="text-center">${ratio.toFixed(2)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${companiesData.length + 1}"><strong>Investing & Capital Allocation</strong></td>
                    </tr>
                    <tr>
                        <td>Capital Expenditures</td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0) {
                                const latestData = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.capitalExpenditure || 0)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td><strong>Free Cash Flow</strong></td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0) {
                                const latestData = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center"><strong>${formatNumber(latestData.freeCashFlow)}</strong></td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>FCF Yield (approx.)</td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0 && company.profile && company.profile.length > 0) {
                                const latestCashFlow = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                const marketCap = company.profile[0].mktCap;
                                const yield = latestCashFlow.freeCashFlow / marketCap;
                                return `<td class="text-center">${formatPercentage(yield)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    
                    <tr class="table-secondary">
                        <td colspan="${companiesData.length + 1}"><strong>Shareholder Returns</strong></td>
                    </tr>
                    <tr>
                        <td>Dividends Paid</td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0) {
                                const latestData = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.dividendsPaid || 0)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                    <tr>
                        <td>Share Repurchases</td>
                        ${companiesData.map(company => {
                            if (company.cashFlow && company.cashFlow.length > 0) {
                                const latestData = company.cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                return `<td class="text-center">${formatNumber(latestData.commonStockRepurchased || 0)}</td>`;
                            }
                            return '<td class="text-center">N/A</td>';
                        }).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    cashflowTableBody.innerHTML = tableHTML;
}

// Display key ratios data
function displayKeyRatios(ratiosData) {
    if (!ratiosData || ratiosData.length === 0) {
        keyRatiosBody.innerHTML = '<p class="text-danger">No key ratios data available</p>';
        return;
    }
    
    const ratios = ratiosData[0];
    
    // Create categories of ratios
    const ratioCategories = [
        {
            title: 'Profitability',
            items: [
                { name: 'Return on Equity (ROE)', value: formatPercentage(ratios.returnOnEquityTTM) },
                { name: 'Return on Assets (ROA)', value: formatPercentage(ratios.returnOnAssetsTTM) },
                { name: 'Profit Margin', value: formatPercentage(ratios.netProfitMarginTTM) },
                { name: 'Operating Margin', value: formatPercentage(ratios.operatingProfitMarginTTM) },
                { name: 'Gross Margin', value: formatPercentage(ratios.grossProfitMarginTTM) }
            ]
        },
        {
            title: 'Valuation',
            items: [
                { name: 'P/E Ratio', value: ratios.peRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'PEG Ratio', value: ratios.pegRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Price to Book', value: ratios.priceToBookRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Price to Sales', value: ratios.priceToSalesRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Enterprise Value / EBITDA', value: ratios.enterpriseValueMultipleTTM?.toFixed(2) || 'N/A' }
            ]
        },
        {
            title: 'Liquidity',
            items: [
                { name: 'Current Ratio', value: ratios.currentRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Quick Ratio', value: ratios.quickRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Cash Ratio', value: ratios.cashRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Days of Sales Outstanding', value: ratios.daysOfSalesOutstandingTTM?.toFixed(2) || 'N/A' },
                { name: 'Days of Inventory Outstanding', value: ratios.daysOfInventoryOutstandingTTM?.toFixed(2) || 'N/A' }
            ]
        },
        {
            title: 'Debt & Coverage',
            items: [
                { name: 'Debt to Equity', value: ratios.debtEquityRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Debt to Assets', value: ratios.debtRatioTTM?.toFixed(2) || 'N/A' },
                { name: 'Interest Coverage', value: ratios.interestCoverageTTM?.toFixed(2) || 'N/A' },
                { name: 'Dividend Payout Ratio', value: formatPercentage(ratios.payoutRatioTTM) },
                { name: 'Dividend Yield', value: formatPercentage(ratios.dividendYieldTTM) }
            ]
        }
    ];
    
    // Create the HTML
    let ratiosHTML = '';
    ratioCategories.forEach(category => {
        ratiosHTML += `
            <div class="mb-4">
                <h5>${category.title}</h5>
                <div class="table-responsive">
                    <table class="table table-hover table-bordered">
                        <tbody>
        `;
        
        category.items.forEach(item => {
            ratiosHTML += `
                <tr>
                    <td width="70%">${item.name}</td>
                    <td width="30%" class="text-end"><strong>${item.value}</strong></td>
                </tr>
            `;
        });
        
        ratiosHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    keyRatiosBody.innerHTML = ratiosHTML;
}

// Display key ratios comparison
function displayKeyRatiosComparison(companiesData) {
    if (!companiesData || companiesData.length === 0) {
        keyRatiosBody.innerHTML = '<p class="text-danger">No key ratios data available for comparison</p>';
        return;
    }
    
    const companiesWithRatios = companiesData.filter(company => company.keyRatios && company.keyRatios.length > 0);
    if (companiesWithRatios.length === 0) {
        keyRatiosBody.innerHTML = '<p class="text-danger">No key ratios data available for comparison</p>';
        return;
    }
    
    // Create comparison table
    let tableHTML = '<div class="table-responsive"><table class="table table-bordered comparison-table">';
    tableHTML += '<thead><tr><th scope="col">Ratio</th>';
    
    companiesWithRatios.forEach(company => {
        tableHTML += `<th scope="col" class="text-center">${company.symbol}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Define the ratios to display
    const ratiosToDisplay = [
        { category: 'Profitability', ratios: [
            { name: 'Return on Equity (ROE)', key: 'returnOnEquityTTM', format: (val) => formatPercentage(val) },
            { name: 'Return on Assets (ROA)', key: 'returnOnAssetsTTM', format: (val) => formatPercentage(val) },
            { name: 'Profit Margin', key: 'netProfitMarginTTM', format: (val) => formatPercentage(val) },
            { name: 'Operating Margin', key: 'operatingProfitMarginTTM', format: (val) => formatPercentage(val) }
        ]},
        { category: 'Valuation', ratios: [
            { name: 'P/E Ratio', key: 'peRatioTTM', format: (val) => val?.toFixed(2) || 'N/A' },
            { name: 'PEG Ratio', key: 'pegRatioTTM', format: (val) => val?.toFixed(2) || 'N/A' },
            { name: 'Price to Book', key: 'priceToBookRatioTTM', format: (val) => val?.toFixed(2) || 'N/A' },
            { name: 'Price to Sales', key: 'priceToSalesRatioTTM', format: (val) => val?.toFixed(2) || 'N/A' }
        ]},
        { category: 'Liquidity & Debt', ratios: [
            { name: 'Current Ratio', key: 'currentRatioTTM', format: (val) => val?.toFixed(2) || 'N/A' },
            { name: 'Quick Ratio', key: 'quickRatioTTM', format: (val) => val?.toFixed(2) || 'N/A' },
            { name: 'Debt to Equity', key: 'debtEquityRatioTTM', format: (val) => val?.toFixed(2) || 'N/A' },
            { name: 'Interest Coverage', key: 'interestCoverageTTM', format: (val) => val?.toFixed(2) || 'N/A' }
        ]}
    ];
    
    // Add category headers and ratios
    ratiosToDisplay.forEach(category => {
        tableHTML += `<tr class="table-secondary"><th colspan="${companiesWithRatios.length + 1}">${category.category}</th></tr>`;
        
        category.ratios.forEach(ratio => {
            tableHTML += `<tr><th scope="row">${ratio.name}</th>`;
            
            companiesWithRatios.forEach(company => {
                const value = company.keyRatios[0][ratio.key];
                tableHTML += `<td class="text-center">${ratio.format(value)}</td>`;
            });
            
            tableHTML += '</tr>';
        });
    });
    
    tableHTML += '</tbody></table></div>';
    keyRatiosBody.innerHTML = tableHTML;
}

// Display growth metrics
function displayGrowthMetrics(growthData) {
    if (!growthData || growthData.length === 0) {
        growthMetricsBody.innerHTML = '<p class="text-danger">No growth metrics data available</p>';
        return;
    }
    
    // Sort data chronologically (newest first)
    const sortedData = [...growthData].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestData = sortedData[0];
    
    // Create categories of growth metrics
    const growthCategories = [
        {
            title: 'Revenue & Profit Growth (3yr)',
            items: [
                { name: 'Revenue Growth', value: formatPercentage(latestData.revenueGrowth) },
                { name: 'Gross Profit Growth', value: formatPercentage(latestData.grossProfitGrowth) },
                { name: 'EBITDA Growth', value: formatPercentage(latestData.ebitgrowth) },
                { name: 'Operating Income Growth', value: formatPercentage(latestData.operatingIncomeGrowth) },
                { name: 'Net Income Growth', value: formatPercentage(latestData.netIncomeGrowth) },
                { name: 'EPS Growth', value: formatPercentage(latestData.epsgrowth) }
            ]
        },
        {
            title: 'Cash Flow Growth (3yr)',
            items: [
                { name: 'Operating Cash Flow Growth', value: formatPercentage(latestData.operatingCashFlowGrowth) },
                { name: 'Free Cash Flow Growth', value: formatPercentage(latestData.freeCashFlowGrowth) },
                { name: 'Capex Growth', value: formatPercentage(latestData.capitalExpenditureGrowth) },
                { name: 'Dividend per Share Growth', value: formatPercentage(latestData.dividendsperShareGrowth) }
            ]
        },
        {
            title: 'Balance Sheet Growth (3yr)',
            items: [
                { name: 'Assets Growth', value: formatPercentage(latestData.totalAssetsGrowth) },
                { name: 'Debt Growth', value: formatPercentage(latestData.debtGrowth) },
                { name: 'Equity Growth', value: formatPercentage(latestData.stockholdersEquityGrowth) },
                { name: 'Book Value per Share Growth', value: formatPercentage(latestData.bookValueperShareGrowth) }
            ]
        }
    ];
    
    // Create the HTML
    let metricsHTML = '';
    growthCategories.forEach(category => {
        metricsHTML += `
            <div class="mb-4">
                <h5>${category.title}</h5>
                <div class="table-responsive">
                    <table class="table table-hover table-bordered">
                        <tbody>
        `;
        
        category.items.forEach(item => {
            // Determine if growth is positive or negative for color coding
            const valueClass = item.value !== 'N/A' ? (parseFloat(item.value) >= 0 ? 'text-success' : 'text-danger') : '';
            
            metricsHTML += `
                <tr>
                    <td width="70%">${item.name}</td>
                    <td width="30%" class="text-end ${valueClass}"><strong>${item.value}</strong></td>
                </tr>
            `;
        });
        
        metricsHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    growthMetricsBody.innerHTML = metricsHTML;
}

// Display growth metrics comparison
function displayGrowthMetricsComparison(companiesData) {
    if (!companiesData || companiesData.length === 0) {
        growthMetricsBody.innerHTML = '<p class="text-danger">No growth metrics data available for comparison</p>';
        return;
    }
    
    const companiesWithGrowth = companiesData.filter(company => company.growthMetrics && company.growthMetrics.length > 0);
    if (companiesWithGrowth.length === 0) {
        growthMetricsBody.innerHTML = '<p class="text-danger">No growth metrics data available for comparison</p>';
        return;
    }
    
    // Create comparison table
    let tableHTML = '<div class="table-responsive"><table class="table table-bordered comparison-table">';
    tableHTML += '<thead><tr><th scope="col">Metric</th>';
    
    companiesWithGrowth.forEach(company => {
        tableHTML += `<th scope="col" class="text-center">${company.symbol}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Define the growth metrics to display
    const metricsToDisplay = [
        { category: 'Revenue & Profit', metrics: [
            { name: 'Revenue Growth', key: 'revenueGrowth' },
            { name: 'Gross Profit Growth', key: 'grossProfitGrowth' },
            { name: 'Operating Income Growth', key: 'operatingIncomeGrowth' },
            { name: 'Net Income Growth', key: 'netIncomeGrowth' },
            { name: 'EPS Growth', key: 'epsgrowth' }
        ]},
        { category: 'Cash Flow', metrics: [
            { name: 'Operating Cash Flow Growth', key: 'operatingCashFlowGrowth' },
            { name: 'Free Cash Flow Growth', key: 'freeCashFlowGrowth' }
        ]},
        { category: 'Balance Sheet', metrics: [
            { name: 'Assets Growth', key: 'totalAssetsGrowth' },
            { name: 'Equity Growth', key: 'stockholdersEquityGrowth' }
        ]}
    ];
    
    // Add category headers and metrics
    metricsToDisplay.forEach(category => {
        tableHTML += `<tr class="table-secondary"><th colspan="${companiesWithGrowth.length + 1}">${category.category}</th></tr>`;
        
        category.metrics.forEach(metric => {
            tableHTML += `<tr><th scope="row">${metric.name}</th>`;
            
            companiesWithGrowth.forEach(company => {
                const growthData = company.growthMetrics.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                const value = growthData[metric.key];
                const formattedValue = formatPercentage(value);
                const valueClass = value !== null && !isNaN(value) ? (value >= 0 ? 'text-success' : 'text-danger') : '';
                
                tableHTML += `<td class="text-center ${valueClass}">${formattedValue}</td>`;
            });
            
            tableHTML += '</tr>';
        });
    });
    
    tableHTML += '</tbody></table></div>';
    growthMetricsBody.innerHTML = tableHTML;
}

// Generate smart AI analysis
function generateSmartAnalysis(profile, incomeStatement, balanceSheet, cashFlow, keyRatios, growthMetrics) {
    if (!profile || !incomeStatement || !balanceSheet || !cashFlow || !keyRatios || !growthMetrics) {
        aiAnalysisBody.innerHTML = '<p class="text-danger">Insufficient data for AI analysis</p>';
        return;
    }
    
    // Get necessary data
    const companyName = profile[0].companyName;
    const industry = profile[0].industry;
    const sector = profile[0].sector;
    
    // Get latest financial data
    const latestIncomeStatement = incomeStatement.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const latestBalanceSheet = balanceSheet.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const latestCashFlow = cashFlow.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const latestRatios = keyRatios[0];
    const latestGrowth = growthMetrics.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    // Initialize analysis sections
    const analysisPoints = [];
    
    // Profitability analysis
    if (latestRatios.returnOnEquityTTM > 0.15) {
        analysisPoints.push(`<li><strong>Strong Profitability:</strong> ${companyName} demonstrates excellent profitability with a Return on Equity (ROE) of ${formatPercentage(latestRatios.returnOnEquityTTM)}, indicating efficient use of shareholder equity.</li>`);
    } else if (latestRatios.returnOnEquityTTM < 0.05) {
        analysisPoints.push(`<li><strong>Profitability Concerns:</strong> ${companyName}'s Return on Equity (ROE) of ${formatPercentage(latestRatios.returnOnEquityTTM)} is relatively low, suggesting challenges in generating profits from shareholder investments.</li>`);
    }
    
    // Growth analysis
    if (latestGrowth.revenueGrowth > 0.1) {
        analysisPoints.push(`<li><strong>Solid Revenue Growth:</strong> The company has achieved impressive revenue growth of ${formatPercentage(latestGrowth.revenueGrowth)} over the past three years, outpacing many competitors in the ${industry} industry.</li>`);
    }
    
    if (latestGrowth.netIncomeGrowth > latestGrowth.revenueGrowth && latestGrowth.netIncomeGrowth > 0) {
        analysisPoints.push(`<li><strong>Improving Efficiency:</strong> Net income growth (${formatPercentage(latestGrowth.netIncomeGrowth)}) exceeds revenue growth (${formatPercentage(latestGrowth.revenueGrowth)}), indicating improving operational efficiency and cost management.</li>`);
    }
    
    // Financial health
    const debtToEquity = latestRatios.debtEquityRatioTTM;
    if (debtToEquity > 2) {
        analysisPoints.push(`<li><strong>High Leverage Risk:</strong> The debt-to-equity ratio of ${debtToEquity.toFixed(2)} is concerning and may indicate financial risk, particularly in a rising interest rate environment.</li>`);
    } else if (debtToEquity < 0.5) {
        analysisPoints.push(`<li><strong>Strong Balance Sheet:</strong> With a conservative debt-to-equity ratio of ${debtToEquity.toFixed(2)}, the company maintains financial flexibility for future investments or to weather economic downturns.</li>`);
    }
    
    // Cash flow analysis
    const freeCashFlow = latestCashFlow.freeCashFlow;
    const netIncome = latestIncomeStatement.netIncome;
    
    if (freeCashFlow > netIncome && freeCashFlow > 0) {
        analysisPoints.push(`<li><strong>Excellent Cash Generation:</strong> Free cash flow (${formatNumber(freeCashFlow)}) exceeds reported net income (${formatNumber(netIncome)}), suggesting high earnings quality and potentially conservative accounting practices.</li>`);
    } else if (freeCashFlow < 0 && netIncome > 0) {
        analysisPoints.push(`<li><strong>Cash Flow Concerns:</strong> Despite positive earnings, the company is generating negative free cash flow (${formatNumber(freeCashFlow)}), which may indicate challenges in converting profits to cash.</li>`);
    }
    
    // Valuation assessment
    const peRatio = latestRatios.peRatioTTM;
    if (peRatio > 30) {
        analysisPoints.push(`<li><strong>Premium Valuation:</strong> With a P/E ratio of ${peRatio.toFixed(2)}, ${companyName} trades at a premium valuation, suggesting high growth expectations from investors.</li>`);
    } else if (peRatio < 10 && peRatio > 0) {
        analysisPoints.push(`<li><strong>Potential Value Opportunity:</strong> The company's P/E ratio of ${peRatio.toFixed(2)} is relatively low, potentially representing a value opportunity if the company can maintain or improve its financial performance.</li>`);
    }
    
    // If we don't have enough analysis points, add generic ones
    if (analysisPoints.length < 3) {
        analysisPoints.push(`<li>${companyName} operates in the ${sector} sector, specifically in the ${industry} industry.</li>`);
        analysisPoints.push(`<li>In the most recent fiscal year, the company reported revenue of ${formatNumber(latestIncomeStatement.revenue)} and net income of ${formatNumber(latestIncomeStatement.netIncome)}.</li>`);
    }
    
    // Summary paragraph
    let summary = `<p>${companyName} presents `;
    
    // Determine overall assessment
    const isGrowthPositive = latestGrowth.revenueGrowth > 0.05 && latestGrowth.netIncomeGrowth > 0;
    const isProfitabilityGood = latestRatios.returnOnEquityTTM > 0.1;
    const isFinanciallyHealthy = debtToEquity < 1.5 && latestRatios.currentRatioTTM > 1;
    
    if (isGrowthPositive && isProfitabilityGood && isFinanciallyHealthy) {
        summary += `a strong financial profile with healthy growth, solid profitability, and a manageable debt level.`;
    } else if (isGrowthPositive && isProfitabilityGood) {
        summary += `good growth and profitability, though there are some concerns regarding its financial structure.`;
    } else if (isFinanciallyHealthy) {
        summary += `a relatively stable financial position, but faces challenges in achieving consistent growth and profitability.`;
    } else {
        summary += `a mixed financial picture with both strengths and areas for improvement.`;
    }
    
    summary += ` Investors should consider these factors in the context of industry trends and broader economic conditions.</p>`;
    
    // Compile the full analysis HTML
    const analysisHTML = `
        <div class="mb-4">
            <h5 class="mb-3">Smart Analysis Summary</h5>
            ${summary}
            <h5 class="mt-4 mb-3">Key Insights</h5>
            <ul class="analysis-points">
                ${analysisPoints.join('')}
            </ul>
            <p class="text-muted mt-4"><small><em>Note: This analysis is generated automatically and should not be considered financial advice. Always conduct your own research or consult qualified financial advisors before making investment decisions.</em></small></p>
        </div>
    `;
    
    aiAnalysisBody.innerHTML = analysisHTML;
}

// Generate comparison analysis
function generateComparisonAnalysis(companiesData) {
    if (!companiesData || companiesData.length < 2) {
        aiAnalysisBody.innerHTML = '<p class="text-danger">Insufficient data for comparison analysis</p>';
        return;
    }
    
    // Extract company names
    const companyNames = companiesData.map(company => company.profile && company.profile.length > 0 ? company.profile[0].companyName : company.symbol);
    
    // Begin constructing the analysis HTML
    let analysisHTML = `
        <h5 class="mb-3">Comparative Analysis</h5>
        <p>This analysis compares ${companyNames.join(', ')} across key financial metrics and performance indicators.</p>
    `;
    
    // Compile comparison points
    const comparisonPoints = [];
    
    // Profitability comparison
    try {
        const roeCandidates = companiesData
            .filter(company => company.keyRatios && company.keyRatios.length > 0)
            .map(company => ({
                name: company.profile[0].companyName,
                symbol: company.symbol,
                roe: company.keyRatios[0].returnOnEquityTTM
            }))
            .sort((a, b) => b.roe - a.roe);
        
        if (roeCandidates.length >= 2) {
            comparisonPoints.push(`
                <li><strong>Profitability:</strong> ${roeCandidates[0].name} (${formatPercentage(roeCandidates[0].roe)}) 
                demonstrates superior return on equity compared to ${roeCandidates[roeCandidates.length-1].name} 
                (${formatPercentage(roeCandidates[roeCandidates.length-1].roe)}), indicating more efficient use of shareholder capital.</li>
            `);
        }
    } catch (error) {
        console.error('Error analyzing profitability:', error);
    }
    
    // Growth comparison
    try {
        const revGrowthCandidates = companiesData
            .filter(company => company.growthMetrics && company.growthMetrics.length > 0)
            .map(company => {
                const latestGrowth = company.growthMetrics.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                return {
                    name: company.profile[0].companyName,
                    symbol: company.symbol,
                    revenueGrowth: latestGrowth.revenueGrowth
                };
            })
            .sort((a, b) => b.revenueGrowth - a.revenueGrowth);
        
        if (revGrowthCandidates.length >= 2) {
            comparisonPoints.push(`
                <li><strong>Revenue Growth:</strong> ${revGrowthCandidates[0].name} shows stronger revenue growth at 
                ${formatPercentage(revGrowthCandidates[0].revenueGrowth)} compared to ${revGrowthCandidates[revGrowthCandidates.length-1].name}'s 
                ${formatPercentage(revGrowthCandidates[revGrowthCandidates.length-1].revenueGrowth)}, potentially indicating better market position or product demand.</li>
            `);
        }
    } catch (error) {
        console.error('Error analyzing growth:', error);
    }
    
    // Valuation comparison
    try {
        const peCandidates = companiesData
            .filter(company => company.keyRatios && company.keyRatios.length > 0 && company.keyRatios[0].peRatioTTM > 0)
            .map(company => ({
                name: company.profile[0].companyName,
                symbol: company.symbol,
                pe: company.keyRatios[0].peRatioTTM
            }))
            .sort((a, b) => a.pe - b.pe);
        
        if (peCandidates.length >= 2) {
            comparisonPoints.push(`
                <li><strong>Valuation:</strong> ${peCandidates[0].name} trades at a lower P/E ratio of ${peCandidates[0].pe.toFixed(2)} 
                compared to ${peCandidates[peCandidates.length-1].name}'s ${peCandidates[peCandidates.length-1].pe.toFixed(2)}, 
                suggesting it may offer better value relative to current earnings.</li>
            `);
        }
    } catch (error) {
        console.error('Error analyzing valuation:', error);
    }
    
    // Financial health comparison
    try {
        const debtCandidates = companiesData
            .filter(company => company.keyRatios && company.keyRatios.length > 0)
            .map(company => ({
                name: company.profile[0].companyName,
                symbol: company.symbol,
                debtToEquity: company.keyRatios[0].debtEquityRatioTTM
            }))
            .sort((a, b) => a.debtToEquity - b.debtToEquity);
        
        if (debtCandidates.length >= 2) {
            comparisonPoints.push(`
                <li><strong>Financial Leverage:</strong> ${debtCandidates[0].name} maintains a lower debt-to-equity ratio of 
                ${debtCandidates[0].debtToEquity.toFixed(2)} versus ${debtCandidates[debtCandidates.length-1].name}'s 
                ${debtCandidates[debtCandidates.length-1].debtToEquity.toFixed(2)}, indicating less financial risk and potentially more flexibility.</li>
            `);
        }
    } catch (error) {
        console.error('Error analyzing debt:', error);
    }
    
    // Add generic point if not enough specific points
    if (comparisonPoints.length < 2) {
        comparisonPoints.push(`
            <li><strong>Industry Positioning:</strong> These companies represent different approaches within their industry, 
            with varying strengths in profitability, growth trajectory, and financial structure that investors should consider 
            based on their investment objectives.</li>
        `);
    }
    
    // Add the comparison points to the analysis
    analysisHTML += `
        <div class="mt-3 mb-4">
            <ul class="analysis-points">
                ${comparisonPoints.join('')}
            </ul>
        </div>
        <p class="text-muted mt-4"><small><em>Note: This comparison is generated automatically and should not be considered financial advice. 
        Always conduct your own research or consult qualified financial advisors before making investment decisions.</em></small></p>
    `;
    
    aiAnalysisBody.innerHTML = analysisHTML;
}

// === UI Interaction ===

// Toggle between single and compare modes
function toggleCompareMode(isCompare) {
    isCompareMode = isCompare;
    
    if (isCompare) {
        singleSearchContainer.style.display = 'none';
        compareSearchContainer.style.display = 'block';
    } else {
        singleSearchContainer.style.display = 'block';
        compareSearchContainer.style.display = 'none';
    }
    
    clearPreviousData();
    errorMessageDiv.style.display = 'none';
}

// Add a ticker field in compare mode
function addTickerField() {
    const existingInputs = document.querySelectorAll('.ticker-input-group').length;
    const newInputGroup = document.createElement('div');
    newInputGroup.className = 'input-group mb-2 ticker-input-group';
    newInputGroup.innerHTML = `
        <input type="text" class="form-control ticker-input" placeholder="Company ${existingInputs + 1} (e.g., GOOGL)" aria-label="Company ${existingInputs + 1}">
        <button class="btn btn-outline-danger remove-ticker" type="button"><i class="bi bi-x"></i></button>
    `;
    tickersList.appendChild(newInputGroup);
    
    newInputGroup.querySelector('.remove-ticker').addEventListener('click', function() {
        removeTickerField(this.parentNode);
    });
}

// Remove a ticker field in compare mode
function removeTickerField(inputGroup) {
    const inputGroups = document.querySelectorAll('.ticker-input-group');
    if (inputGroups.length <= 2) return;
    
    tickersList.removeChild(inputGroup);
    
    // Update placeholder numbers
    document.querySelectorAll('.ticker-input').forEach((input, index) => {
        const examples = ['AAPL', 'MSFT', 'GOOGL'];
        input.placeholder = `Company ${index + 1} (e.g., ${examples[index % examples.length]})`;
    });
}

// === Search & Compare Handlers ===

// Handle single company search
async function handleSearch() {
    const ticker = stockTickerInput.value.trim().toUpperCase();
    if (!ticker) {
        displayError('Please enter a stock ticker.');
        return;
    }

    clearPreviousData();
    showLoading(true);
    resultsContainer.style.display = 'block';

    try {
        const companyData = await fetchCompanyData(ticker);
        showLoading(false);

        // Display data
        displayCompanyProfile(companyData.profile);
        displayIncomeStatement(companyData.incomeStatement);
        displayBalanceSheet(companyData.balanceSheet);
        displayCashFlow(companyData.cashFlow);
        displayKeyRatios(companyData.keyRatios);
        displayGrowthMetrics(companyData.growthMetrics);
        generateSmartAnalysis(
            companyData.profile, 
            companyData.incomeStatement, 
            companyData.balanceSheet, 
            companyData.cashFlow, 
            companyData.keyRatios, 
            companyData.growthMetrics
        );

        // Show sections with content
        dataSections.forEach(section => {
            const body = section.querySelector('.card-body');
            if (body && body.innerHTML.trim() !== '' && !body.querySelector('p.text-danger')) {
                section.style.display = 'block';
            }
        });
    } catch (error) {
        displayError(`An error occurred: ${error.message}. Check API key or ticker symbol.`);
        showLoading(false);
    }
}

// Handle company comparison
async function handleCompare() {
    const tickers = Array.from(document.querySelectorAll('.ticker-input'))
        .map(input => input.value.trim().toUpperCase())
        .filter(ticker => ticker !== '');
        
    if (tickers.length < 2) {
        displayError('Please enter at least two valid stock tickers to compare.');
        return;
    }
    
    clearPreviousData();
    showLoading(true);
    resultsContainer.style.display = 'block';
    
    try {
        const companiesData = [];
        const errors = [];
        
        // Fetch data for each company
        for (const ticker of tickers) {
            try {
                const data = await fetchCompanyData(ticker);
                companiesData.push(data);
            } catch (error) {
                errors.push(`Error fetching data for ${ticker}: ${error.message}`);
            }
        }
        
        if (companiesData.length < 2) {
            displayError(`Not enough valid companies to compare. ${errors.join('. ')}`);
            showLoading(false);
            return;
        }
        
        showLoading(false);
        
        // Display comparison data
        displayCompanyProfileComparison(companiesData);
        displayIncomeStatementComparison(companiesData);
        displayBalanceSheetComparison(companiesData);
        displayCashFlowComparison(companiesData);
        displayKeyRatiosComparison(companiesData);
        displayGrowthMetricsComparison(companiesData);
        generateComparisonAnalysis(companiesData);
        
        // Show sections with content
        dataSections.forEach(section => {
            const body = section.querySelector('.card-body');
            if (body && body.innerHTML.trim() !== '' && !body.querySelector('p.text-danger')) {
                section.style.display = 'block';
            }
        });
    } catch (error) {
        displayError(`An error occurred during comparison: ${error.message}`);
        showLoading(false);
    }
}

// === Event Listeners ===
compareToggle.addEventListener('change', function() {
    toggleCompareMode(this.checked);
});
addTickerBtn.addEventListener('click', addTickerField);
document.querySelectorAll('.remove-ticker').forEach(btn => {
    btn.addEventListener('click', function() {
        removeTickerField(this.parentNode);
    });
});
searchBtn.addEventListener('click', handleSearch);
compareBtn.addEventListener('click', handleCompare);
stockTickerInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') handleSearch();
});

// Initialize with a message
console.log('ValuX Stock Analyzer Initialized with FMP API. Enter a ticker to begin.'); 