# LoveLens 💘

> Discover the magic in your WhatsApp chats with AI-powered relationship insights

LoveLens is a privacy-first web application that analyzes your WhatsApp chat exports to provide meaningful insights about your relationships. Using advanced algorithms and optional AI enhancement, it reveals special moments, calculates relationship metrics, and presents beautiful visualizations of your digital connections.

## ✨ Features

### 🔍 **Chat Analysis**
- **Love Score Calculation**: Get a playful metric of your relationship strength (0-100)
- **Relationship Metrics**: Affection density, reply speed, reciprocity, and more
- **Participant Statistics**: Individual message counts, emoji usage, and love words

### 🤖 **AI-Powered Highlights** (Optional)
- **Google Gemini Integration**: Intelligent extraction of special moments
- **Smart Categorization**: Love & affection, commitments, gratitude, support, humor
- **Contextual Insights**: AI explains why each moment is special

### 📊 **Beautiful Visualizations**
- **Hello Kitty Aesthetic**: Cute, pink-themed design with floating animations
- **Interactive Stats Cards**: Hover effects and smooth transitions
- **Responsive Design**: Works perfectly on mobile and desktop

### 🔒 **Privacy First**
- **Local Processing**: All basic analysis happens in your browser
- **No Data Storage**: Your chats are never saved or transmitted (except for optional AI features)
- **Transparent AI Usage**: Clear opt-in for Google Gemini API calls

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- A modern web browser
- (Optional) Google Gemini API key for AI features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pinakkk/lovelens.git
   cd lovelens
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp .env.example .env
   # Add your Google Gemini API key to .env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📱 How to Use

### Step 1: Export Your WhatsApp Chat
1. Open WhatsApp on your phone
2. Go to the chat you want to analyze
3. Tap on the contact/group name at the top
4. Select "Export Chat"
5. Choose "Without Media"
6. Save the `.txt` file

### Step 2: Upload and Analyze
1. Open LoveLens in your browser
2. Upload your exported chat file
3. Choose whether to use AI enhancement or skip
4. View your beautiful relationship insights!

### Step 3: Explore Your Results
- **Love Score**: See your relationship strength
- **Statistics**: Explore detailed metrics
- **Special Moments**: Discover highlighted conversations
- **Participant Breakdown**: Individual chat patterns

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Framer Motion** for smooth animations
- **Tailwind CSS** for styling
- **Vite** for build tooling

### AI Integration
- **Google Gemini API** for intelligent highlights
- **Vercel Serverless Functions** for API proxy
- **Custom parsing algorithms** for chat analysis

### Deployment
- **Vercel** for hosting
- **Edge Functions** for API calls
- **Static Generation** for optimal performance

## 📊 Metrics Explained

### Love Score (0-100)
A playful composite score based on:
- **Affection Density** (35%): Frequency of love words and emojis
- **Reciprocity** (20%): Balance of conversation turns
- **Reply Speed** (20%): How quickly you respond to each other
- **Consistency** (15%): Regular chat activity
- **Positivity** (10%): Gratitude and positive expressions

### Individual Metrics
- **Affection**: Percentage of messages containing love words
- **Reply Speed**: Median response time between messages
- **Reciprocity**: Balance between monologues and conversations
- **Consistency**: Percentage of days with chat activity
- **Positivity**: Frequency of gratitude and positive words

## 🔧 Configuration

### Environment Variables
```env
# Google Gemini API Key (optional)
VITE_GEMINI_API_KEY=your_gemini_api_key

# API Configuration
GEMINI_API_TIMEOUT=30000
MAX_CONTENT_LENGTH=12000
```

### Customization
The app includes several customizable aspects:
- **Love words lexicon**: Modify `LOVE_WORDS` array in `App.tsx`
- **Scoring weights**: Adjust weights in `scoreLove()` function
- **Theme colors**: Update Tailwind config for different color schemes
- **Animation timings**: Modify Framer Motion transition values

## 📈 Supported Chat Formats

LoveLens supports multiple WhatsApp export formats:

### Android Format
```
12/08/23, 10:15 pm - John: Hello there!
```

### iOS Format
```
[12/08/23, 10:15:22 pm] John: Hello there!
```

### Alternative Format
```
12 Aug 2023, 22:15 - John: Hello there!
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use semantic commit messages
- Add tests for new features
- Update documentation for API changes

## 🐛 Troubleshooting

### Common Issues

**Chat not parsing correctly?**
- Ensure you exported "Without Media"
- Check that the file is in .txt format
- Verify the chat contains actual messages (not just system notifications)

**AI features not working?**
- Verify your Gemini API key is correct
- Check your API quota hasn't been exceeded
- Ensure you have internet connectivity

**Performance issues?**
- Large chats (>10k messages) may take longer to process
- Consider using AI features for better performance on large datasets
- Close other browser tabs for better memory usage

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini** for AI capabilities
- **Framer Motion** for beautiful animations
- **Tailwind CSS** for rapid styling
- **React community** for excellent ecosystem
- **All contributors** who make this project better

---

Made with 💕 by Pinak Kundu

*LoveLens helps you discover the magic in your digital relationships. Every message tells a story - let us help you find yours.*
