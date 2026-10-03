# GitRepoVision Frontend

A modern React dashboard for analyzing GitHub repository quality, structure, and security.

## Tech Stack

- **React 18** - UI Framework
- **Tailwind CSS** - Styling
- **Axios** - HTTP Client
- **Recharts** - Data Visualization

## Features

✨ **Modern Dashboard**
- Clean, responsive card-based layout
- Real-time repository analysis
- Professional gradient design

📊 **Visual Analytics**
- Risk score metric display
- Category breakdown (Pie chart)
- Severity distribution (Bar chart)
- Top risky files table
- Detailed issues list with filtering

🔍 **Analysis Insights**
- Structural Risk Score (0-100)
- Risk classification (Low/Moderate/High/Critical)
- Issue counts by severity
- Issues grouped by category (Maintainability/Security/Code Smell)
- Per-file risk metrics

## Setup & Installation

### Prerequisites

- Node.js 14+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Configuration

Create a `.env` file in the frontend directory:

```bash
cp src/.env.example .env
```

Update the API URL if needed:

```env
REACT_APP_API_URL=http://localhost:5000
```

### Running the App

```bash
npm start
```

The dashboard will open at `http://localhost:3000`

## Usage

1. **Enter Repository URL**
   - Paste a GitHub repository URL (e.g., https://github.com/kennethreitz/requests)
   - Click "Analyze" button

2. **View Results**
   - Summary cards with key metrics
   - Charts showing category and severity breakdowns
   - Top risky files ranked by issue count
   - Detailed issues table with file, rule, severity, line, and function info

3. **Interpret Results**
   - **Green Badge** - Low Risk issues
   - **Yellow Badge** - Medium Risk issues
   - **Red Badge** - High Risk issues

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML entry point
├── src/
│   ├── components/
│   │   ├── Header.jsx       # App title and subtitle
│   │   ├── RepoInput.jsx    # URL input form
│   │   ├── SummaryCards.jsx # Key metrics cards
│   │   ├── Charts.jsx       # Pie and bar charts
│   │   ├── TopFiles.jsx     # Risky files table
│   │   └── IssuesTable.jsx  # Detailed issues list
│   ├── utils/
│   │   └── axios.js         # API client configuration
│   ├── App.jsx              # Main app component
│   ├── index.js             # React entry point
│   └── index.css            # Global styles
├── package.json             # Dependencies
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
└── README.md                # This file
```

## API Integration

The frontend expects the backend API at `http://localhost:5000/analyze` with POST requests.

### Expected Response Format

```json
{
  "structural_risk_score": 47.15,
  "risk_level": "High Risk",
  "total_issues": 31,
  "total_files": 19,
  "severity_breakdown": {
    "High": 6,
    "Medium": 20,
    "Low": 5
  },
  "category_breakdown": {
    "Maintainability": 28,
    "Security": 2,
    "Code Smell": 1
  },
  "top_risky_files": [
    {"file": "requests/auth.py", "issue_count": 8}
  ],
  "issues": [
    {
      "file": "requests/auth.py",
      "rule": "Long Function",
      "severity": "Medium",
      "line": 126,
      "function": "build_digest_header"
    }
  ]
}
```

## Styling

- **Color Scheme**: Teal/Blue gradients with accent colors
- **Shadows**: Soft shadows for depth
- **Spacing**: Consistent padding and margins
- **Responsiveness**: Mobile-first design with breakpoints for tablet and desktop

## Error Handling

- Input validation for GitHub URLs
- Network error messages with guidance
- Graceful fallbacks for missing data
- Loading states during analysis

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Lazy loading of charts
- Optimized re-renders with React hooks
- Responsive grid layouts
- Smooth animations and transitions

## Contributing

Feel free to improve the dashboard by:
- Adding more chart types
- Improving accessibility
- Enhancing mobile responsiveness
- Adding export functionality

## License

MIT

---

Made with ❤️ by GitRepoVision Team
