# Anime Summary & Taste Profile Analyzer

Mathematical anime taste extraction, Bayesian affinity modeling, and steerable LLM recommendation profiler.

**Live Application**: [https://brunowb.github.io/anime-summary/](https://brunowb.github.io/anime-summary/)

## Features

- **Mathematical Taste Extraction**: Analyzes complete AniList watchlists with Bayesian score smoothing, commitment ratios, drop-rate analysis, and score distribution percentiles (P10, P50, P90).
- **Steerable Affinities**: Modulate Genre, Trope, Release Era, Studio, and Source Material biases in real time with interactive steppers and drag-and-drop landing zones.
- **Trope & Micro-Theme Salience**: Identifies signature trope affinities and drop-trigger patterns with 1:1 granular modulation.
- **Base Bias Modes**: Toggle between Unweighted and Recency-weighted decay ($T_{half} = 2.0\text{ years}$, $20\%$ floor) to adapt to evolving viewing tastes.
- **Contrarian & Hidden Gem Analysis**: Highlights polarizing favorites and hidden gems rated significantly higher than the AniList global community average.
- **LLM-Optimized Compression**: One-click serialization into high-density Markdown and compressed anime DSL tokens ready for prompt injection into ChatGPT, Claude, and Gemini.
- **Local Persistence & Deep Linking**: Automatically persists steering configurations locally and provides clean `/user/:username` shareable URLs.

## Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Data Source**: AniList GraphQL API with IndexedDB caching

## Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build
```

## License

MIT
