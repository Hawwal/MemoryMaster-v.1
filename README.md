# Memory Master v1.0

<img width="277" height="146" alt="Memory Master Logo SM" src="https://github.com/user-attachments/assets/45eb54fe-0fb6-4868-8dbb-b2c1d90a30e9" />

**Memory Master** is a fast-paced pattern challenge game that combines cognitive training with competitive gaming. Built as a Farcaster Mini App with Noah AI on the CELO blockchain, it offers players an engaging way to improve their visual memory while competing on a global leaderboard.

## 🎮 About

Memory Master combines visual memory training with competitive gameplay. Players must observe randomly generated Tetris-like patterns, memorize their positions, and accurately recreate them within strict time limits. As levels progress, patterns become larger and more complex, pushing your memory to its limits.

Built as a Farcaster Mini App with CELO blockchain integration, Memory Master offers a unique blend of cognitive challenge and Web3 gaming.

---

## 🎯 How to Play

### Game Flow

1. **Payment Entry**: Pay 0.1 CELO to start a new game session (3 lives included)
2. **Memorization Phase**: 
   - A pattern of green boxes appears on an 8×8 grid
   - Memorize the shape's position (7-10 seconds depending on level)
   - Timer counts down - pay close attention!
3. **Recreation Phase**:
   - The pattern disappears
   - Click boxes to recreate the pattern you just saw (15 seconds)
   - Selected boxes turn blue
   - Submit your answer before time runs out
4. **Scoring**:
   - **100% accuracy required** to advance to the next level
   - Any mistakes = lose 1 life and retry the same level
   - Fail with 0 lives = Game Over
5. **Progression**:
   - Complete levels to increase difficulty
   - Patterns grow from 4-5 boxes to 10-15 boxes
   - Compete on the global leaderboard

### Controls

- **Click/Tap**: Select boxes during recreation phase
- **Submit Button**: Submit your answer early (if confident)
- **Menu Button**: Pause game and access settings
- **Retry**: Pay 0.1 CELO to continue from where you left off

---

## 📋 Requirements

### To Play

- **Farcaster Account**: Required for authentication
- **CELO Wallet**: 0.1 CELO per game session
- **Device**: Desktop or mobile browser
- **Connection**: Internet connection required

### Technical Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Minimum screen resolution: 375×667 (mobile) or 1024×768 (desktop)

---

## ✨ Features

### Core Gameplay
- ✅ **8×8 Grid System** with Tetris-inspired polyomino patterns
- ✅ **Progressive Difficulty** - Patterns grow from 4 to 15 boxes
- ✅ **Dynamic Timers** - Memorization time adjusts by level
- ✅ **Lives System** - 3 lives per game session
- ✅ **Perfect Accuracy Required** - 100% match needed to advance
- ✅ **Auto-Submit** - Automatic validation when timer expires

### Web3 Integration
- 🔗 **Farcaster Authentication** - Seamless login with Farcaster ID
- 💰 **CELO Payments** - 0.1 CELO per game using native wallet
- 🏆 **Global Leaderboard** - Compete with players worldwide
- 🔄 **Continue Feature** - Pay to resume at your highest level

### User Experience
- 🎨 **Dark/Light Theme** - Toggle between themes
- 🔊 **Sound Effects** - Background music and audio feedback
- ⏸️ **Pause Functionality** - Pause during gameplay without penalty
- 📱 **Mobile Responsive** - Optimized for all screen sizes
- 📊 **Profile System** - Track your highest level and stats
- 🔗 **Social Sharing** - Share scores on Farcaster, Twitter, Instagram

### Visual Feedback
- 🟢 **Green Boxes** - Pattern display during memorization
- 🔵 **Blue Boxes** - Player selections during recreation
- 🏆 **Success Pop-ups** - Trophy animation on correct answers
- ❌ **Failure Pop-ups** - Clear feedback on mistakes
- ⏱️ **Visual Timers** - Countdown with color warnings (red at ≤3 seconds)

---

## 🎮 Game Mechanics

### Difficulty Progression

| Level | Pattern Size | Memorization Time | Recreation Time |
|-------|-------------|-------------------|-----------------|
| 1-3   | 4-5 boxes   | 7 seconds         | 15 seconds      |
| 4-7   | 6-9 boxes   | 7 seconds         | 15 seconds      |
| 8+    | 10-15 boxes | 10 seconds        | 15 seconds      |

### Scoring System

- **Base Score**: Level × 100 × Accuracy
- **Speed Bonus**: Extra points for early submission
- **Streak Multiplier**: Consecutive perfect rounds increase multiplier
- **Perfect Accuracy**: Required to advance (100%)

### Lives & Game Over

- Start with **3 lives**
- Lose 1 life on any mistake (<100% accuracy)
- Lose 1 life if timer expires
- **Game Over** at 0 lives
- **Continue option**: Pay 0.1 CELO to resume with 3 lives at your current level

---

## 🛠️ Installation & Setup

### Prerequisites

```bash
Node.js >= 20.x
pnpm
```

### Clone Repository

```bash
git clone https://github.com/hawwal/MemoryMaster-v.1.git
cd MemoryMaster-v.1
```

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_FARCASTER_APP_ID=your_app_id
VITE_CELO_RPC_URL=your_rpc_url
# Add other required environment variables
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
pnpm run build
pnpm start
```

---

## 🏗️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Animations**: Framer Motion
- **Backend**: Vercel
- **Database**: Supabase (Leaderboard storage)
- **Blockchain**: CELO (Payments)
- **Web3**: wagmi, @farcaster/miniapp-wagmi-connector
- **Farcaster**: @farcaster/frame-sdk
- **UI Components**: shadcn/ui

---

## 📁 Project Structure

```
memory-master/
├── src/
│   ├── components/
│   │   ├── GameScreen.tsx       # Main game logic
│   │   ├── GameGrid.tsx         # 8×8 grid component
│   │   ├── GameHeader.tsx       # Score, lives, level display
│   │   ├── GameMenu.tsx         # Settings and navigation
│   │   └── GameOverScreen.tsx   # End screen with retry
│   ├── lib/
│   │   └── gameLogic.ts         # Pattern generation algorithms
│   ├── hooks/
│   │   └── use-mobile.ts        # Mobile detection
│   └── styles/
│       └── globals.css          # Global styles
├── public/
│   ├── music/                   # Audio files
│   └── logo.png                 # Game logo
├── README.md
└── package.json
```

---

## 🎯 Roadmap

### v1.1 (Planned)
- [ ] Power-ups and bonus items
- [ ] Daily challenges
- [ ] Achievement system
- [ ] Multi-language support

### v2.0 (Future)
- [ ] Multiplayer mode
- [ ] Custom pattern editor
- [ ] NFT rewards for top players
- [ ] Tournament system

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Website**: [memory-master-v1.vercel.app](https://memory-master-v1.vercel.app)
- **Farcaster**: [@Hawwal](https://farcaster.xyz/hawwal)
- **Discord**: [Join my community](https://discord.gg/cCypm3KWKV))

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/hawwal/MemoryMaster-v.1/issues)
- **Email**: hawwal@blaqkstereo.com
- **Farcaster DMs**: [@Hawwal](https://farcaster.xyz/hawwal)
- [@itshawwal](https://twitter.com/itshawwal)

---

## 🙏 Acknowledgments

- Design and developed on [Naoh AI](https://trynoah.ai/)
- Inspired by classic Tetris and memory training games
- Built for the Farcaster Mini Apps ecosystem
- Powered by CELO blockchain

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/MemoryMaster-v.1?style=social)
![GitHub forks](https://img.shields.io/github/forks/hawwal/MemoryMaster-v.1?style=social)
![GitHub issues](https://img.shields.io/github/issues/hawwal/MemoryMaster-v.1)
![License](https://img.shields.io/github/license/hawwal/MemoryMaster-v.1)

---

**Made with ❤️ by Hawwal**

*Test your memory. Challenge your limits. Master the patterns.*
