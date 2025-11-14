# 🎫 Ticketmaster Master

A browser-based game that simulates the chaotic TicketMaster experience! Race against the clock to snag the best deals on concert tickets while dealing with fluctuating prices, disappearing seats, CAPTCHA challenges, and target matching objectives. Play solo or compete with a friend in real-time multiplayer mode!

## 🎮 How to Play

1. Open `index.html` in your web browser
2. Choose **Single Player** or **Multiplayer** mode
   - **Single Player**: Race against the clock
   - **Multiplayer**: One player hosts a game and shares the code, the other joins to compete for the same seats!
3. Wait through the Ticketmaster-style "waiting room" (builds anticipation!)
4. Match the **target ticket count** shown at the top:
   - **1-3 seats**: Must be adjacent (side-by-side) in the same row
   - **4+ seats**: Can form a rectangular block spanning up to 2 rows
5. Click on available seats (blue) to add them to your cart
6. Watch as prices constantly change - grab the deals fast!
7. Can't find valid seats? Use **Skip Target** for a -50 pts penalty
8. Click "Checkout" when you have the right number of tickets
9. Complete one of 5 different **CAPTCHA challenges** (time limits vary!)
10. Maximize your savings in 2 minutes to get the highest score!

## 🎯 Game Features

### Multiplayer Mode
- **Host-Authoritative Architecture**: The host generates all game state and synchronizes with the guest
- Real-time competition using WebRTC (PeerJS)
- Both players see the same seats, prices, and availability
- **Compete for the same tickets**: Both players can select the same seats - whoever completes the CAPTCHA first wins!
- You won't know if your opponent is targeting the same seats until the CAPTCHA warning appears
- See your opponent's score in real-time

### Target Ticket System
- Each round, you're given a target number of tickets to purchase (1-4 tickets)
- **Flexible adjacency rules**:
  - **1-3 seats**: Must be adjacent (side-by-side) in the same row
  - **4+ seats**: Can form a rectangular "block" spanning up to 2 rows
  - Block seats must be touching (no gaps), forming valid rectangular shapes
  - Examples: 2×2 square, 3+2 offset, 4+2 L-shape
- Can't find valid seats? Skip the target for a -50 pts penalty
- New target appears after each successful purchase or skip

### Dynamic Pricing with Visual Indicators
- All face values are multiples of $20 for clean pricing
- Seat prices fluctuate every 3 seconds
- Prices can drop up to 30% or spike up to 30% from their base value
- **Color-coded price display** shows deal quality at a glance:
  - **Dark Green**: 20%+ discount (amazing deal!)
  - **Medium Green**: 10-19% discount (great deal)
  - **Light Green**: 5-9% discount (good deal)
  - **Very Light Green**: 0-4% discount (small savings)
  - **Light Red**: 0-5% premium (slightly overpriced)
  - **Medium Red**: 5-10% premium (overpriced)
  - **Dark Red**: 10%+ premium (very overpriced)

### Seat Availability
- Seats randomly become available or unavailable every 2 seconds
- Simulates the "someone grabbed that seat" experience
- 70% of seats start as available
- In multiplayer, claimed seats become unavailable to the opponent

### CAPTCHA Challenges (5 Different Types!)
- 60% chance of getting a CAPTCHA when checking out
- **100% chance if you're competing with opponent for the same seats!**
- **Random CAPTCHA type** selected each time - keeps you on your toes!
- Warning displayed if opponent is competing for the same seats

**CAPTCHA Types:**
1. **🔤 Text CAPTCHA** (10s timer)
   - Traditional 6-character alphanumeric code entry
   - No confusing letters (no O/0, I/1, etc.)
   - Case-insensitive

2. **⛽ Gas Pump** (3 attempts, no timer)
   - Stop the counter at the exact target amount
   - Tests reflexes and timing
   - Must be within $0.01 to succeed

3. **🧩 Puzzle Slider** (10s timer)
   - Drag slider to position puzzle piece correctly
   - ±10px tolerance for success
   - Visual feedback when aligned

4. **🎣 Fishing Game** (15s timer)
   - Keep the fish in the green zone to fill progress bar
   - Physics-based: fish bobs up and down
   - Hold button to apply upward force

5. **🏀 NBA Free Throw** (10s timer)
   - Two-stage challenge: horizontal aim + power control
   - Both stages must succeed
   - Ball trajectory animation on success

### Scoring System
- Points are earned based on how much you save below the base price
- The bigger the discount, the higher your score!
- Skip penalty: -50 pts per skipped target
- Track your total tickets purchased and total savings
- **Purchase History Review** at game end:
  - View all purchases with seat numbers sorted by row and column
  - See face value, paid price, and discount/premium percentage for each seat
  - Purchase totals showing total face value, total paid, and total savings/premium

### Game Timer
- 2 minutes to make your purchases
- Time keeps ticking even during CAPTCHA
- Final stats shown at game over including purchase breakdown

### Waiting Room Animation
- Ticketmaster-style "waiting room" before game starts
- Progress bar with animated stick figure
- Countdown with fake "fans in front of you" counter
- Builds anticipation and authenticity!

### Debug Mode
- Press backtick (`) key during gameplay to toggle debug panel
- Test all 5 CAPTCHA types independently
- Useful for practice or development
- Doesn't affect game state

## 🛠️ Technical Details

### Architecture
The game uses a **modular ES6 architecture** for maintainability:

**Core Modules:**
- `js/main.js` - Entry point and module coordination
- `js/gameState.js` - Centralized state management
- `js/gameFlow.js` - Game lifecycle (start, end, timer)
- `js/config.js` - Configuration constants
- `js/ui.js` - UI updates
- `js/eventListeners.js` - Event handling

**Feature Modules:**
- `js/seatManagement.js` - Seat rendering, selection, block validation
- `js/cartManagement.js` - Cart operations
- `js/checkout.js` - Purchase validation and CAPTCHA triggering
- `js/multiplayer.js` - PeerJS networking and host-authoritative sync

**CAPTCHA Modules:**
- `js/captcha/textCaptcha.js` - Text code entry
- `js/captcha/gasPumpCaptcha.js` - Reflex-based counter stopping
- `js/captcha/puzzleCaptcha.js` - Canvas-based puzzle slider
- `js/captcha/fishingCaptcha.js` - Physics simulation fishing game
- `js/captcha/nbaCaptcha.js` - Two-stage basketball challenge

**Other Files:**
- `index.html` - Main structure with modals for all game screens
- `styles.css` - Responsive styling
- `game.js` - Legacy monolithic version (not loaded)

### Browser Requirements
- Modern browser with JavaScript enabled
- ES6 module support
- HTML5 Canvas support (for interactive CAPTCHAs)
- WebRTC support for multiplayer mode
- Works on desktop and mobile devices

### External Dependencies
- PeerJS (v1.5.1) - WebRTC peer-to-peer networking for multiplayer (loaded via CDN)

## 🎨 Game Elements

- **Blue Seats**: Available for purchase (gradient background for better text visibility)
- **Gray Seats**: Currently unavailable
- **Pink Seats**: In your cart
- **Stage**: Located at the top (best seats are closest!)
- **Price Colors**: Green text for discounts, red text for premiums (see pricing tiers above)

## 🏆 Tips for High Scores

1. **Look for dark green prices** - those are the best deals (20%+ discount)
2. **Master block seat selection** - for 4+ tickets, use the 2-row block feature strategically
3. **Practice all CAPTCHA types** - use debug mode (`) to practice each one
4. **Use the skip button strategically** - sometimes -50 pts is better than waiting for perfect seats
5. **Watch for price drops** and act quickly before they change again (every 3 seconds!)
6. **Don't waste time on red-priced seats** unless necessary to match the target
7. **In multiplayer, be faster** than your opponent to claim the best seats
8. **Know your CAPTCHAs**:
   - Text: Type fast and accurately
   - Gas Pump: Watch the speed changes and anticipate
   - Puzzle: Use the visual alignment cues
   - Fishing: Keep steady pressure, don't overcompensate
   - NBA: Time both stages carefully, center zone is key
9. **Keep an eye on the timer** - you have 2 minutes total!

## 📝 Implemented Features

This game started as a simple single-player ticket rush simulator and has evolved to include:
- ✅ **Modular ES6 architecture** - Clean, maintainable codebase
- ✅ **5 interactive CAPTCHA types** - Text, Gas Pump, Puzzle, Fishing, NBA
- ✅ **Block seat selection** - 4+ tickets can span 2 rows as rectangular blocks
- ✅ **Multiplayer competition mode** with real-time synchronization
- ✅ **Waiting room animation** - Authentic Ticketmaster experience
- ✅ **Target ticket matching system** with flexible adjacency rules
- ✅ **Color-coded pricing** with 7-tier visual indicators
- ✅ **Purchase history review** with detailed breakdowns
- ✅ **Skip target functionality** for impossible scenarios
- ✅ **Host-authoritative multiplayer** architecture for perfect sync
- ✅ **Debug mode** for CAPTCHA practice and testing

## 📝 Future Enhancements

Potential features to add:
- 🎪 Different venue layouts and seating configurations
- 💰 Multiple price zones with varying demand (VIP, floor, balcony)
- ⚡ Power-ups (price freeze, CAPTCHA skip, time extension)
- 📊 Difficulty levels (longer/shorter timers, harder CAPTCHAs)
- 🔊 Sound effects and enhanced animations
- 🏅 Persistent leaderboard system
- 👁️ Spectator mode for multiplayer games
- 🎮 Additional CAPTCHA types (more mini-games!)
- 📱 Mobile-optimized touch controls for canvas CAPTCHAs
- 🎭 Different event types (sports, theater, concerts) with themed visuals

## 🎉 Have Fun!

Enjoy the stress-free chaos of ticket buying simulation! Remember, in this game, you can actually win. 😄
