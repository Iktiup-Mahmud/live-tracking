# ⚡ Lightning Tracker - Real-time Device Tracking

A professional-grade real-time GPS tracking application with environmental monitoring capabilities.

## 🚀 Features

- **Real-time GPS tracking** with high accuracy
- **Live environmental data** (temperature, humidity, wind, air quality)
- **Interactive maps** with satellite view and trail tracking
- **Speed monitoring** and distance calculation
- **Responsive design** for all devices
- **Socket.io** for real-time communication

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Iktiup-Mahmud/live-tracking.git
cd live-tracking
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit .env file and add your API keys
nano .env
```

### 4. Get OpenWeatherMap API Key

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file:

```
OPENWEATHER_API_KEY=your_actual_api_key_here
```

### 5. Run the Application

```bash
npm start
```

Visit `http://localhost:3000` to use the Lightning Tracker!

## 🔒 Security Notes

- Never commit your `.env` file to Git
- API keys are automatically loaded from environment variables
- The app falls back to mock data if no API key is provided

## 📱 Usage

1. **Start Tracking**: Click "START TRACKING" to begin GPS monitoring
2. **Map Controls**: Use satellite view, trail mode, and speed tracking
3. **Environmental Data**: Real-time weather data updates automatically
4. **Statistics**: View distance, speed, and session information

## 🌐 API Keys Required

- **OpenWeatherMap**: For real weather data (free tier: 1000 calls/day)
- **Air Quality API**: Optional for air pollution data

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📄 License

MIT License
